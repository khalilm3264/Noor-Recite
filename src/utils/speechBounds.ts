import { ensureAudioCached } from './audioCache';

export interface SpeechBounds {
  speechStartSec: number;
  speechEndSec: number;
  durationSec: number;
  /**
   * 64-bin normalized cumulative voiced energy LUT (0..1) across [speechStartSec, speechEndSec].
   * Used to glide smoothly through mid-recitation breath pauses without racing ahead of the Qari.
   */
  voicedProfile?: number[];
}

const PROFILE_BINS = 64;
const MAX_BOUNDS_CACHE = 180;
const boundsCache = new Map<string, SpeechBounds | null>();
const inFlightBounds = new Map<string, Promise<SpeechBounds | null>>();

let sharedDecodeCtx: AudioContext | null = null;

function getDecodeContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedDecodeCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      sharedDecodeCtx = new AudioCtx();
    }
  }
  return sharedDecodeCtx;
}

function setBoundedCache(url: string, value: SpeechBounds | null) {
  if (boundsCache.has(url)) {
    boundsCache.delete(url);
  } else if (boundsCache.size >= MAX_BOUNDS_CACHE) {
    const oldest = boundsCache.keys().next().value;
    if (oldest) boundsCache.delete(oldest);
  }
  boundsCache.set(url, value);
}

export function getCachedSpeechBounds(url: string): SpeechBounds | null | undefined {
  return boundsCache.get(url);
}

/**
 * Returns a gentle lead-in trim (seconds) so multi-syllable opening consonants
 * like Alif/Ha/Sad are never clipped when jumping into a verse MP3.
 */
export function getSafeLeadTrimSec(bounds?: SpeechBounds | null): number {
  if (!bounds || bounds.speechStartSec <= 0.24) return 0;
  return Math.max(0, Number((bounds.speechStartSec - 0.14).toFixed(3)));
}

/**
 * Computes SpeechBounds and a 64-bin cumulative voiced-energy LUT from an audio URL.
 * Safe for blob/object URLs and remote EveryAyah MP3s (via ensureAudioCached).
 */
export async function analyzeSpeechBounds(url: string): Promise<SpeechBounds | null> {
  if (!url || url.startsWith('data:')) return null;
  if (boundsCache.has(url)) {
    return boundsCache.get(url) ?? null;
  }
  const existing = inFlightBounds.get(url);
  if (existing) return existing;

  const task = (async (): Promise<SpeechBounds | null> => {
    try {
      const ctx = getDecodeContext();
      if (!ctx) return null;

      const isLocalBlob = url.startsWith('blob:');
      const cachedSrc = isLocalBlob ? url : (await ensureAudioCached(url)) ?? url;
      const res = await fetch(cachedSrc);
      if (!res.ok) {
        setBoundedCache(url, null);
        return null;
      }
      const buf = await res.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(buf);
      const data = audioBuf.getChannelData(0);
      const sr = audioBuf.sampleRate;
      const winSec = 0.02;
      const winSamples = Math.max(1, Math.floor(sr * winSec));
      const rmsList: number[] = [];
      let peak = 0;

      for (let i = 0; i < data.length; i += winSamples) {
        const end = Math.min(data.length, i + winSamples);
        let sum = 0;
        for (let j = i; j < end; j++) {
          const s = data[j];
          sum += s * s;
        }
        const rms = Math.sqrt(sum / Math.max(1, end - i));
        rmsList.push(rms);
        if (rms > peak) peak = rms;
      }

      if (rmsList.length === 0 || peak <= 0.0005) {
        const empty: SpeechBounds = {
          speechStartSec: 0,
          speechEndSec: audioBuf.duration,
          durationSec: audioBuf.duration,
        };
        setBoundedCache(url, empty);
        return empty;
      }

      // Soft thresholds preserve quiet initial letters and trailing madd/ghunnah tails
      const startThresh = Math.max(0.0025, peak * 0.012);
      const endThresh = Math.max(0.0018, peak * 0.008);

      let firstWin = 0;
      while (firstWin < rmsList.length && rmsList[firstWin] < startThresh) {
        firstWin++;
      }
      let lastWin = rmsList.length - 1;
      while (lastWin > firstWin && rmsList[lastWin] < endThresh) {
        lastWin--;
      }

      const speechStartSec = firstWin < rmsList.length ? firstWin * winSec : 0;
      const speechEndSec = Math.min(
        audioBuf.duration,
        Math.max(speechStartSec + 0.35, (lastWin + 1) * winSec)
      );

      // Build cumulative voiced-energy LUT across [firstWin .. lastWin]
      const activeSpan = Math.max(1, lastWin - firstWin + 1);
      const binSums = new Float64Array(PROFILE_BINS);
      const voiceGate = Math.max(0.003, peak * 0.035);

      for (let idx = 0; idx < activeSpan; idx++) {
        const rms = rmsList[firstWin + idx];
        const bin = Math.min(PROFILE_BINS - 1, Math.floor((idx / activeSpan) * PROFILE_BINS));
        // Soft floor inside silent breath pauses (0.12) vs articulated speech (1.0..1.4)
        const activity = rms >= voiceGate ? 1.0 + Math.min(0.4, rms / peak) : 0.12;
        binSums[bin] += activity;
      }

      const cumulative = new Array<number>(PROFILE_BINS + 1);
      cumulative[0] = 0;
      let running = 0;
      for (let b = 0; b < PROFILE_BINS; b++) {
        running += binSums[b] > 0 ? binSums[b] : 0.05;
        cumulative[b + 1] = running;
      }
      const voicedProfile = cumulative.map((v) =>
        running > 0 ? Number((v / running).toFixed(4)) : 0
      );

      const bounds: SpeechBounds = {
        speechStartSec,
        speechEndSec,
        durationSec: audioBuf.duration,
        voicedProfile,
      };
      setBoundedCache(url, bounds);
      return bounds;
    } catch {
      setBoundedCache(url, null);
      return null;
    }
  })();

  inFlightBounds.set(url, task);
  try {
    return await task;
  } finally {
    inFlightBounds.delete(url);
  }
}

/**
 * Maps an audio clock timestamp (seconds) onto 0..1 reading progress,
 * accounting for leading/trailing silence and optional voiced-energy pause shaping.
 */
export function mapTimeToSpeechProgress(
  currentTime: number,
  duration: number,
  bounds?: SpeechBounds | null
): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const safeTime = Math.max(0, Math.min(duration, Number.isFinite(currentTime) ? currentTime : 0));

  if (!bounds || bounds.speechEndSec <= bounds.speechStartSec + 0.12) {
    return Math.min(1, Math.max(0, safeTime / duration));
  }

  // Scale bounds gently if HTMLAudioElement.duration differs slightly from decoded duration
  const scale =
    bounds.durationSec > 0 && Math.abs(bounds.durationSec - duration) > 0.05
      ? duration / bounds.durationSec
      : 1;

  const start = Math.max(0, bounds.speechStartSec * scale);
  const end = Math.min(duration, bounds.speechEndSec * scale);
  const span = end - start;

  if (span <= 0.12) {
    return Math.min(1, Math.max(0, safeTime / duration));
  }

  if (safeTime <= start) return 0;
  if (safeTime >= end) return 1;

  const uniform = Math.min(1, Math.max(0, (safeTime - start) / span));
  const profile = bounds.voicedProfile;
  if (!profile || profile.length < 2) {
    return uniform;
  }

  const lastIdx = profile.length - 1;
  const scaled = uniform * lastIdx;
  const lo = Math.floor(scaled);
  const hi = Math.min(lastIdx, lo + 1);
  const frac = scaled - lo;
  const voiced = profile[lo] + (profile[hi] - profile[lo]) * frac;

  // Blend uniform time (50%) and cumulative voiced activity (50%) for steady tracking
  return Math.min(1, Math.max(0, uniform * 0.5 + voiced * 0.5));
}
