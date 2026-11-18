import { useEffect, useMemo, useState } from 'react';
import { TranslationLanguage } from '../types/quran';

export interface TranslatableEntry {
  key: string;
  text: string;
  arabic?: string;
}

const STORAGE_KEY_PREFIX = 'noor_tr_cache_v1_';
const memoryCache = new Map<string, string>();
const loadedLangs = new Set<string>();
const inflightRequests = new Map<string, Promise<void>>();

function loadLangCache(lang: TranslationLanguage) {
  if (loadedLangs.has(lang) || typeof window === 'undefined') return;
  loadedLangs.add(lang);
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${lang}`);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim()) {
        memoryCache.set(`${lang}::${k}`, v);
      }
    }
  } catch {
    // Ignore corrupt cache entries
  }
}

function persistLangCache(lang: TranslationLanguage) {
  if (typeof window === 'undefined') return;
  try {
    const prefix = `${lang}::`;
    const entries: Array<[string, string]> = [];
    for (const [k, v] of memoryCache.entries()) {
      if (k.startsWith(prefix)) {
        entries.push([k.slice(prefix.length), v]);
      }
    }
    const trimmed = entries.slice(-600);
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${lang}`,
      JSON.stringify(Object.fromEntries(trimmed))
    );
  } catch {
    // Storage quota exceeded - keep working via in-memory cache
  }
}

export function getCachedLocalizedText(
  lang: TranslationLanguage,
  sourceText: string
): string | null {
  if (lang === 'en' || !sourceText.trim()) return sourceText;
  loadLangCache(lang);
  return memoryCache.get(`${lang}::${sourceText.trim()}`) ?? null;
}

export async function translateTextsBatch(
  targetLang: Exclude<TranslationLanguage, 'en'>,
  items: Array<{ id: string; text: string; arabic?: string }>,
  signal?: AbortSignal
): Promise<Record<string, string>> {
  loadLangCache(targetLang);

  const out: Record<string, string> = {};
  const missing: Array<{ id: string; text: string; arabic?: string }> = [];

  for (const item of items) {
    const trimmed = item.text.trim();
    if (!trimmed) continue;
    const cached = memoryCache.get(`${targetLang}::${trimmed}`);
    if (cached) {
      out[item.id] = cached;
    } else {
      missing.push({ ...item, text: trimmed });
    }
  }

  if (missing.length === 0) return out;

  const CHUNK_SIZE = 35;
  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    if (signal?.aborted) break;
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    const sigKey = `${targetLang}::${chunk.map((c) => c.id).join(',')}`;

    let job = inflightRequests.get(sigKey);
    if (!job) {
      job = (async () => {
        const res = await fetch('/api/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLang, items: chunk }),
          signal,
        });
        if (!res.ok) {
          throw new Error('Translation batch failed');
        }
        const json = (await res.json()) as {
          translations?: Record<string, string>;
        };
        const returned = json.translations ?? {};
        const byId = new Map(chunk.map((c) => [c.id, c.text]));
        for (const [id, translated] of Object.entries(returned)) {
          if (typeof translated === 'string' && translated.trim()) {
            const orig = byId.get(id);
            if (orig) {
              memoryCache.set(`${targetLang}::${orig}`, translated.trim());
            }
          }
        }
        persistLangCache(targetLang);
      })().finally(() => {
        inflightRequests.delete(sigKey);
      });
      inflightRequests.set(sigKey, job);
    }

    try {
      await job;
    } catch {
      // Non-fatal: fallback to English cleanly
    }

    for (const c of chunk) {
      const hit = memoryCache.get(`${targetLang}::${c.text}`);
      if (hit) {
        out[c.id] = hit;
      }
    }
  }

  return out;
}

const DYNAMIC_LANGS = new Set<TranslationLanguage>([
  'bn',
  'ms',
  'ha',
  'ff',
  'fa',
  'tr',
  'ru',
  'zh',
  'es',
  'fr',
]);

export function useBatchTranslations(
  lang: TranslationLanguage,
  entries: TranslatableEntry[]
): {
  resolve: (fallbackText: string) => string;
  isTranslating: boolean;
} {
  const [tick, setTick] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  const signature = useMemo(
    () =>
      DYNAMIC_LANGS.has(lang)
        ? `${lang}:${entries.length}:${entries
            .slice(0, 6)
            .map((e) => e.key)
            .join('|')}`
        : lang,
    [lang, entries]
  );

  useEffect(() => {
    if (!DYNAMIC_LANGS.has(lang) || entries.length === 0) {
      setIsTranslating(false);
      return;
    }

    loadLangCache(lang);
    const missing = entries.filter((e) => {
      const t = e.text.trim();
      return t.length > 0 && !memoryCache.has(`${lang}::${t}`);
    });

    if (missing.length === 0) {
      setIsTranslating(false);
      return;
    }

    const ctrl = new AbortController();
    setIsTranslating(true);

    void translateTextsBatch(
      lang as Exclude<TranslationLanguage, 'en'>,
      missing.map((m) => ({ id: m.key, text: m.text, arabic: m.arabic })),
      ctrl.signal
    )
      .then(() => {
        if (!ctrl.signal.aborted) {
          setTick((t) => t + 1);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setIsTranslating(false);
        }
      });

    return () => ctrl.abort();
  }, [signature, lang, entries]);

  const resolve = useMemo(() => {
    void tick;
    return (fallbackText: string): string => {
      if (!DYNAMIC_LANGS.has(lang) || !fallbackText.trim()) return fallbackText;
      return getCachedLocalizedText(lang, fallbackText) ?? fallbackText;
    };
  }, [lang, tick]);

  return { resolve, isTranslating };
}
