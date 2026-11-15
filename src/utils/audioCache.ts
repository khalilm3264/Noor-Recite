const AUDIO_CACHE_NAME = 'noor-audio-v1';
const MAX_CHAPTER_CACHE_BYTES = 48 * 1024 * 1024; // 48 MB cap per single chapter MP3
const MAX_RAM_CACHE_BYTES = 120 * 1024 * 1024; // 120 MB cap for in-memory blob URLs

interface CachedBlobEntry {
  blobUrl: string;
  sizeBytes: number;
  lastUsedAt: number;
}

const ramBlobCache = new Map<string, CachedBlobEntry>();
const inFlightCache = new Map<string, Promise<string | null>>();
let totalRamBytes = 0;

function evictRamIfNeeded(protectedUrls: Set<string>) {
  if (totalRamBytes <= MAX_RAM_CACHE_BYTES) return;
  const entries = Array.from(ramBlobCache.entries())
    .filter(([url]) => !protectedUrls.has(url))
    .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);

  for (const [url, entry] of entries) {
    if (totalRamBytes <= MAX_RAM_CACHE_BYTES * 0.75) break;
    URL.revokeObjectURL(entry.blobUrl);
    ramBlobCache.delete(url);
    totalRamBytes = Math.max(0, totalRamBytes - entry.sizeBytes);
  }
}

export function isAudioCached(remoteUrl: string): boolean {
  return ramBlobCache.has(remoteUrl);
}

export function getCachedAudioSrc(remoteUrl: string): string {
  const entry = ramBlobCache.get(remoteUrl);
  if (entry) {
    entry.lastUsedAt = Date.now();
    return entry.blobUrl;
  }
  return remoteUrl;
}

async function openAudioCacheStorage(): Promise<Cache | null> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      return await window.caches.open(AUDIO_CACHE_NAME);
    }
  } catch {
    // Cache Storage may be disabled in private/restricted contexts
  }
  return null;
}

export async function ensureAudioCached(
  remoteUrl: string,
  signal?: AbortSignal,
  protectedUrls: Set<string> = new Set()
): Promise<string | null> {
  if (!remoteUrl) return null;

  const existing = ramBlobCache.get(remoteUrl);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.blobUrl;
  }

  const pending = inFlightCache.get(remoteUrl);
  if (pending) {
    return pending;
  }

  const task = (async (): Promise<string | null> => {
    try {
      const cache = await openAudioCacheStorage();
      if (cache) {
        const cachedResp = await cache.match(remoteUrl);
        if (cachedResp) {
          const rawBlob = await cachedResp.blob();
          if (rawBlob.size > 0) {
            const safeBlob =
              rawBlob.type && rawBlob.type.startsWith('audio/')
                ? rawBlob
                : new Blob([rawBlob], { type: 'audio/mpeg' });
            const blobUrl = URL.createObjectURL(safeBlob);
            ramBlobCache.set(remoteUrl, {
              blobUrl,
              sizeBytes: safeBlob.size,
              lastUsedAt: Date.now(),
            });
            totalRamBytes += safeBlob.size;
            evictRamIfNeeded(protectedUrls);
            return blobUrl;
          }
        }
      }

      if (signal?.aborted) return null;

      const res = await fetch(remoteUrl, { signal, mode: 'cors' });
      if (!res.ok) return null;

      const contentLen = Number(res.headers.get('content-length') || 0);
      if (contentLen > MAX_CHAPTER_CACHE_BYTES) {
        try {
          await res.body?.cancel();
        } catch {
          // ignore
        }
        return null;
      }

      const rawBlob = await res.blob();
      if (signal?.aborted || rawBlob.size === 0 || rawBlob.size > MAX_CHAPTER_CACHE_BYTES) {
        return null;
      }

      const blob =
        rawBlob.type && rawBlob.type.startsWith('audio/')
          ? rawBlob
          : new Blob([rawBlob], { type: 'audio/mpeg' });

      if (cache) {
        try {
          const storeResp = new Response(blob, {
            status: 200,
            headers: {
              'Content-Type': blob.type || 'audio/mpeg',
              'Content-Length': String(blob.size),
            },
          });
          await cache.put(remoteUrl, storeResp);
        } catch {
          // Ignore Cache Storage quota errors cleanly; RAM blob still accelerates playback
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      ramBlobCache.set(remoteUrl, {
        blobUrl,
        sizeBytes: blob.size,
        lastUsedAt: Date.now(),
      });
      totalRamBytes += blob.size;
      evictRamIfNeeded(protectedUrls);
      return blobUrl;
    } catch {
      return null;
    } finally {
      inFlightCache.delete(remoteUrl);
    }
  })();

  inFlightCache.set(remoteUrl, task);
  return task;
}

export interface PrefetchSurahAudioOptions {
  openerUrls: string[];
  chapterAudioUrl?: string;
  ayahUrls: string[];
  priorityAyahIndex: number;
  signal: AbortSignal;
}

export async function prefetchSurahAudio({
  openerUrls,
  chapterAudioUrl,
  ayahUrls,
  priorityAyahIndex,
  signal,
}: PrefetchSurahAudioOptions): Promise<void> {
  const protectedUrls = new Set<string>([
    ...openerUrls,
    ...(chapterAudioUrl ? [chapterAudioUrl] : []),
    ...ayahUrls,
  ]);

  // 1. Always warm openers first so starting any Surah is instant
  for (const url of openerUrls) {
    if (signal.aborted) return;
    await ensureAudioCached(url, signal, protectedUrls);
  }

  if (signal.aborted) return;

  // 2. If reciter has a single continuous chapter MP3, cache it whole (up to 48 MB)
  if (chapterAudioUrl) {
    await ensureAudioCached(chapterAudioUrl, signal, protectedUrls);
    return;
  }

  // 3. For per-verse reciters (e.g. Saad Al-Ghamdi), cache verses from active ayah forward, then wrap around
  const ordered: string[] = [];
  const startIdx = Math.max(0, Math.min(ayahUrls.length - 1, priorityAyahIndex));
  for (let i = startIdx; i < ayahUrls.length; i++) {
    ordered.push(ayahUrls[i]);
  }
  for (let i = 0; i < startIdx; i++) {
    ordered.push(ayahUrls[i]);
  }

  const concurrency = 4;
  let cursor = 0;

  const worker = async () => {
    while (!signal.aborted) {
      const idx = cursor++;
      if (idx >= ordered.length) return;
      await ensureAudioCached(ordered[idx], signal, protectedUrls);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ordered.length) }, () => worker())
  );
}
