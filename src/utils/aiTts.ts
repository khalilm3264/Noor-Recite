export type AiVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface AiTtsOptions {
  voiceName?: AiVoiceName;
  style?: string;
  signal?: AbortSignal;
}

export const QARI_TTS_STYLES = {
  hadith:
    'warm, clear, reverent classical Arabic Hadith narration with measured Qari pacing',
  dua: 'calm, reverent, melodious classical Arabic supplication recitation with gentle pauses',
  salah: 'calm, reverent, clear classical Arabic prayer recitation with balanced pacing',
  word: 'slow, crisp, clear classical Arabic single-word Qari articulation pronouncing every vowel and letter clearly',
  tafsir: 'scholarly, calm, articulate classical Arabic exegesis recitation with poised pacing',
} as const;

// 1-sample silent PCM WAV so browsers unlock <audio> playback synchronously inside click handlers
export const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const MAX_CLIENT_CACHE = 80;
const blobUrlCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

function setClientCachedUrl(key: string, objectUrl: string) {
  if (blobUrlCache.has(key)) {
    blobUrlCache.delete(key);
  } else if (blobUrlCache.size >= MAX_CLIENT_CACHE) {
    const oldest = blobUrlCache.entries().next().value;
    if (oldest) {
      blobUrlCache.delete(oldest[0]);
      URL.revokeObjectURL(oldest[1]);
    }
  }
  blobUrlCache.set(key, objectUrl);
}

export function normalizeArabicForTts(text: string): string {
  return text
    .replace(/ﷺ/g, 'صلى الله عليه وسلم')
    .replace(/عليه السلام/g, 'عليه السلام')
    .replace(/\u0640/g, '') // Remove tatweel elongation bar so Dagger Alif sits cleanly on base letter
    .replace(/\u0671/g, '\u0627') // Alef Wasla -> plain Alef for clearer synthesis
    .replace(/[\u06D6-\u06ED]/g, '') // Remove Quranic waqf/tajweed pause marks
    .replace(/[\u06DF\u06E0]/g, '')
    .replace(/\([٣٤]+\)/g, '،') // Turn repeated count annotations like (٣٣) into natural brief pause
    .replace(/[۝١٢٣٤٥٦٧٨٩٠«»()·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCacheKey(normalizedText: string, voiceName: AiVoiceName, style: string): string {
  return `${voiceName}::${style}::${normalizedText}`;
}

export function getCachedAiTtsUrl(text: string, options: AiTtsOptions = {}): string | null {
  const normalized = normalizeArabicForTts(text);
  const voiceName = options.voiceName ?? 'Charon';
  const style =
    options.style ??
    QARI_TTS_STYLES.salah;
  const key = buildCacheKey(normalized, voiceName, style);
  const found = blobUrlCache.get(key) ?? null;
  if (found) {
    // Touch LRU order
    blobUrlCache.delete(key);
    blobUrlCache.set(key, found);
  }
  return found;
}

export function unlockAudioElement(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.muted = true;
    audio.src = SILENT_WAV_DATA_URI;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        audio.pause();
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    } else {
      audio.muted = false;
    }
  } catch {
    audio.muted = false;
  }
}

export async function getAiTtsAudioUrl(
  text: string,
  options: AiTtsOptions = {}
): Promise<string> {
  const normalized = normalizeArabicForTts(text);
  if (!normalized) {
    throw new Error('Cannot synthesize empty text.');
  }

  const voiceName = options.voiceName ?? 'Charon';
  const style =
    options.style ??
    QARI_TTS_STYLES.salah;
  const key = buildCacheKey(normalized, voiceName, style);

  const cached = blobUrlCache.get(key);
  if (cached) {
    blobUrlCache.delete(key);
    blobUrlCache.set(key, cached);
    return cached;
  }

  const existingInFlight = inFlightRequests.get(key);
  if (existingInFlight && !options.signal) {
    return existingInFlight;
  }

  const reqPromise = (async () => {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalized, voiceName, style }),
      signal: options.signal,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `TTS HTTP ${res.status}`);
    }

    const blob = await res.blob();
    if (!blob.size) {
      throw new Error('Empty audio payload received from Qari Voice service.');
    }

    const objectUrl = URL.createObjectURL(blob);
    setClientCachedUrl(key, objectUrl);
    return objectUrl;
  })();

  if (!options.signal) {
    inFlightRequests.set(key, reqPromise);
  }

  try {
    return await reqPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}
