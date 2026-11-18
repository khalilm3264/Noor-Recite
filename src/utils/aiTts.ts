import { ALL_LOCAL_QARI_URLS, LOCAL_QARI_AUDIO_MAP } from '../data/localQariAudio';
import { ensureAudioCached, getCachedAudioSrc } from './audioCache';

export type AiVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface AiTtsOptions {
  voiceName?: AiVoiceName;
  style?: string;
  signal?: AbortSignal;
}

export interface AiTtsPrefetchItem {
  text: string;
  voiceName?: AiVoiceName;
  style?: string;
}

export interface AiTtsPrefetchOptions {
  signal?: AbortSignal;
  concurrency?: number;
  delayMs?: number;
  maxNetworkFetches?: number;
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

const PROTECTED_LOCAL_QARI_URLS = new Set<string>(ALL_LOCAL_QARI_URLS);

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

export function getLocalQariAudioPath(text: string): string | null {
  const normalized = normalizeArabicForTts(text);
  if (!normalized) return null;
  return LOCAL_QARI_AUDIO_MAP[normalized] ?? null;
}

export function getCachedAiTtsUrl(text: string, _options: AiTtsOptions = {}): string | null {
  const localPath = getLocalQariAudioPath(text);
  if (!localPath) return null;
  return getCachedAudioSrc(localPath);
}

export function clearAudioUnlockFlag(audio: HTMLAudioElement | null) {
  if (!audio) return;
  if (audio.dataset.unlocking) {
    delete audio.dataset.unlocking;
  }
}

export function isUnlockingAudioEvent(audio: HTMLAudioElement | null): boolean {
  if (!audio) return false;
  return (
    audio.dataset.unlocking === '1' ||
    audio.src === SILENT_WAV_DATA_URI ||
    audio.currentSrc === SILENT_WAV_DATA_URI
  );
}

export function unlockAudioElement(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.dataset.unlocking = '1';
    audio.muted = true;
    audio.src = SILENT_WAV_DATA_URI;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        audio.pause();
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
        clearAudioUnlockFlag(audio);
      });
    } else {
      audio.muted = false;
    }
  } catch {
    audio.muted = false;
    clearAudioUnlockFlag(audio);
  }
}

export async function getAiTtsAudioUrl(
  text: string,
  options: AiTtsOptions = {}
): Promise<string> {
  const localPath = getLocalQariAudioPath(text);
  if (!localPath) {
    throw new Error('No local Qari recording available for this phrase.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const cachedBlobUrl = await ensureAudioCached(
    localPath,
    options.signal,
    PROTECTED_LOCAL_QARI_URLS
  );

  if (options.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  return cachedBlobUrl ?? localPath;
}

export async function prefetchAiTtsAudio(
  items: AiTtsPrefetchItem[],
  options: AiTtsPrefetchOptions = {}
): Promise<void> {
  const { signal, concurrency = 4 } = options;
  if (items.length === 0 || signal?.aborted) return;

  const uniquePaths: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const localPath = getLocalQariAudioPath(item.text);
    if (!localPath || seen.has(localPath)) continue;
    seen.add(localPath);
    uniquePaths.push(localPath);
  }

  if (uniquePaths.length === 0) return;

  let cursor = 0;
  const worker = async () => {
    while (!signal?.aborted) {
      const idx = cursor++;
      if (idx >= uniquePaths.length) return;
      await ensureAudioCached(uniquePaths[idx], signal, PROTECTED_LOCAL_QARI_URLS);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, uniquePaths.length) }, () => worker())
  );
}

export async function prefetchAllLocalQariAudio(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted || ALL_LOCAL_QARI_URLS.length === 0) return;

  let cursor = 0;
  const concurrency = 4;
  const worker = async () => {
    while (!signal?.aborted) {
      const idx = cursor++;
      if (idx >= ALL_LOCAL_QARI_URLS.length) return;
      await ensureAudioCached(
        ALL_LOCAL_QARI_URLS[idx],
        signal,
        PROTECTED_LOCAL_QARI_URLS
      );
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ALL_LOCAL_QARI_URLS.length) }, () => worker())
  );
}
