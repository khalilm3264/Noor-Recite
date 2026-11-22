import 'dotenv/config';
import { AiCallBudget, createAiRequestLimits, positiveInteger, sameOriginOnly } from './server/aiProtection.ts';
import { precompressedStatic, staticCacheHeaders } from './server/staticAssets.ts';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedPort = Number(process.env.PORT);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        apiVersion: 'v1beta',
        // Retries are explicit below so every attempt consumes the shared budget.
        retryOptions: { attempts: 1 },
        timeout: 120_000,
        headers: { 'User-Agent': 'aistudio-build' },
      },
    })
  : null;

const aiCallBudget = new AiCallBudget(
  positiveInteger(process.env.AI_DAILY_CALL_LIMIT, 300),
  positiveInteger(process.env.AI_CONCURRENT_CALL_LIMIT, 3),
);

function generateAiContent(request: Parameters<GoogleGenAI['models']['generateContent']>[0]) {
  if (!ai) throw Object.assign(new Error('AI service is not configured.'), { status: 503 });
  return aiCallBudget.run(() => ai.models.generateContent(request));
}

const translationCache = new Map<string, string>();
const MAX_TRANSLATION_CACHE = 800;

function setCachedTranslation(key: string, value: string) {
  if (translationCache.has(key)) {
    translationCache.delete(key);
  } else if (translationCache.size >= MAX_TRANSLATION_CACHE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, value);
}

function normalizeArabicText(raw: string): string {
  return raw
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - levenshtein(a, b) / maxLen);
}

function evaluateSpokenTranscript(
  transcriptRaw: string,
  expectedArabic: string,
  expectedWords: string[]
) {
  const cleanedTranscript = transcriptRaw.trim();
  const isSilentMarker =
    !cleanedTranscript ||
    /^\[?(silence|noise|unintelligible|music|inaudible|background noise)\]?$/i.test(
      cleanedTranscript
    );

  const lettersOnly = cleanedTranscript.replace(/[^\p{L}]/gu, '');
  const arabicLetters = (cleanedTranscript.match(/[\u0621-\u064A]/g) || []).length;
  const arabicLetterRatio =
    lettersOnly.length > 0 ? arabicLetters / lettersOnly.length : 0;

  const normExpected = normalizeArabicText(expectedArabic);
  const normTranscript = normalizeArabicText(cleanedTranscript);
  const transcriptTokens = normTranscript ? normTranscript.split(' ') : [];

  const targetWords = (
    expectedWords.length > 0 ? expectedWords : expectedArabic.split(/\s+/)
  )
    .map((w) => normalizeArabicText(w))
    .filter(Boolean);

  const isArabicSpeech =
    !isSilentMarker && arabicLetters >= 2 && arabicLetterRatio >= 0.38;

  if (!isArabicSpeech || targetWords.length === 0 || transcriptTokens.length === 0) {
    return {
      transcript: cleanedTranscript,
      isArabicSpeech: false,
      wordMatchRatio: 0,
      charSimilarity: 0,
      perWordAccuracy: targetWords.map(() => 0),
      matchedWordCount: 0,
      expectedWordCount: targetWords.length,
    };
  }

  // Monotonic ordered alignment from expected words into spoken Arabic tokens
  const perWordAccuracy: number[] = [];
  let cursor = 0;
  let matchedWordCount = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const target = targetWords[i];
    let bestSim = 0;
    let bestIdx = -1;

    // Prefer forward match within window, then fallback across remaining/nearby tokens
    const windowEnd = Math.min(transcriptTokens.length, cursor + 4);
    for (let j = cursor; j < windowEnd; j++) {
      const sim = tokenSimilarity(target, transcriptTokens[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
      // Also test merged adjacent spoken tokens (e.g. separated prefix "ال" or "ب")
      if (j + 1 < transcriptTokens.length) {
        const mergedSim = tokenSimilarity(
          target,
          `${transcriptTokens[j]}${transcriptTokens[j + 1]}`
        );
        if (mergedSim > bestSim) {
          bestSim = mergedSim;
          bestIdx = j + 1;
        }
      }
    }

    // Also allow splitting if ASR merged two short words into one token
    if (bestSim < 0.55) {
      for (let j = Math.max(0, cursor - 1); j < transcriptTokens.length; j++) {
        const sim = tokenSimilarity(target, transcriptTokens[j]);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = j;
        }
      }
    }

    if (bestIdx >= cursor && bestSim >= 0.5) {
      cursor = Math.min(transcriptTokens.length, bestIdx + 1);
    }
    if (bestSim >= 0.55) {
      matchedWordCount += 1;
    }
    perWordAccuracy.push(Math.round(bestSim * 100));
  }

  const wordMatchRatio = matchedWordCount / Math.max(1, targetWords.length);
  const rawCharSim = tokenSimilarity(
    normExpected.replace(/\s+/g, ''),
    normTranscript.replace(/\s+/g, '')
  );

  // Penalize rambling extra unrelated words beyond target verse length
  const lengthRatioPenalty =
    normTranscript.length > normExpected.length * 1.45
      ? Math.max(0.4, (normExpected.length * 1.25) / normTranscript.length)
      : 1;

  const charSimilarity = Number((rawCharSim * lengthRatioPenalty).toFixed(3));

  return {
    transcript: cleanedTranscript,
    isArabicSpeech: true,
    wordMatchRatio: Number(wordMatchRatio.toFixed(3)),
    charSimilarity,
    perWordAccuracy,
    matchedWordCount,
    expectedWordCount: targetWords.length,
  };
}

const TARGET_LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  bn: 'Bengali (Bangla) using natural, reverent Islamic scholarly Bengali script (বাংলা).',
  ms: 'Bahasa Melayu / Bahasa Indonesia (standard Nusantara Islamic phrasing understood in both Malaysia and Indonesia).',
  ha: "Pan-Hausa (standard Boko orthography using hooked letters ɓ, ɗ, ƙ, 'y as appropriate, natural West African Islamic register).",
  ff: 'Fulfulde / Pulaar (standard West African Fula orthography using ɓ, ɗ, ƴ, ŋ accurately, natural Islamic scholarly register).',
  hi: 'Hindi (Devanagari script, clear Hindustani Islamic register).',
  ur: 'Urdu (Nastaliq-compatible Urdu script, natural Islamic register).',
  fa: 'Persian (Fārsī) in clean, reverent, fluent Iranian/classical Islamic scholarly Persian script (فارسی).',
  tr: 'Turkish (standard modern Türkçe, clear reverent Islamic register).',
  ru: 'Russian (Cyrillic script, clear reverent Islamic scholarly register).',
  zh: 'Simplified Chinese (简体中文) in clear, reverent Islamic scholarly phrasing.',
  es: 'Spanish (Español) in clear, reverent Islamic scholarly phrasing.',
  fr: 'French (Français) in clear, reverent Islamic scholarly phrasing.',
};

async function startServer() {
  const app = express();
  // Trust explicitly configured proxy CIDRs, or the single reverse-proxy hop in Cloud Run / hosted environments.
  if (process.env.TRUSTED_PROXY_CIDRS) {
    app.set('trust proxy', process.env.TRUSTED_PROXY_CIDRS.split(',').map((value) => value.trim()).filter(Boolean));
  } else {
    app.set('trust proxy', 1);
  }
  const aiPaths = ['/api/grade-recitation', '/api/translate-batch'];
  let configuredAppUrl: string | undefined;
  const rawAppUrl = process.env.APP_URL?.trim();
  if (rawAppUrl && rawAppUrl !== 'MY_APP_URL') {
    try {
      const parsedUrl = new URL(rawAppUrl);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        configuredAppUrl = parsedUrl.origin;
      }
    } catch {
      console.warn('Ignoring invalid APP_URL environment variable.');
    }
  }
  app.post(
    aiPaths,
    sameOriginOnly(configuredAppUrl),
    ...createAiRequestLimits(
      positiveInteger(process.env.AI_REQUESTS_PER_MINUTE, 30),
      positiveInteger(process.env.AI_REQUESTS_PER_DAY, 200),
    ),
  );
  app.use(express.json({ limit: '6mb' }));

  // Strict spoken-word verification for the Voice Grader & Tajweed Self-Test
  app.post('/api/grade-recitation', async (req, res) => {
    try {
      const audioBase64 =
        typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const rawMime =
        typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : 'audio/webm';
      const cleanMimeType = rawMime.split(';')[0].trim() || 'audio/webm';
      const expectedArabic =
        typeof req.body?.expectedArabic === 'string' ? req.body.expectedArabic.trim() : '';
      const expectedWords = Array.isArray(req.body?.words)
        ? req.body.words.filter((w: unknown): w is string => typeof w === 'string')
        : [];

      if (!audioBase64 || !expectedArabic) {
        return res
          .status(400)
          .json({ error: 'Audio data and expected Arabic text are required.' });
      }

      if (expectedArabic.length > 4000 || expectedWords.length > 300 || expectedWords.some((word: string) => word.length > 150)) {
        return res.status(400).json({ error: 'The recitation passage is too long. Please submit a shorter passage.' });
      }

      if (!ai) {
        return res.status(503).json({ error: 'Voice evaluation service unavailable.' });
      }

      let transcript = '';
      try {
        const transcribeResponse = await generateAiContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe the spoken words in this audio verbatim in their original language and script.',
              },
            ],
          },
        });
        transcript = (transcribeResponse.text ?? '').trim();
      } catch (asrErr) {
        console.warn('gemini-3.5-transcribe fallback triggered:', asrErr);
      }

      if (!transcript) {
        const multimodalResponse = await generateAiContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Listen carefully to this audio and transcribe verbatim ONLY what is clearly spoken. Keep the original spoken language and script (write Arabic words in Arabic script if Arabic is spoken; write English or other speech in its own script without translating to Arabic). If the audio is silent, humming, breathing, tone/beeps, or unintelligible noise, respond only with "[silence]". Never guess or autocomplete expected text that was not spoken.',
              },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
        transcript = (multimodalResponse.text ?? '').trim();
      }

      const result = evaluateSpokenTranscript(transcript, expectedArabic, expectedWords);
      return res.json(result);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 500;
      const message =
        err instanceof Error ? err.message : 'Unable to evaluate spoken audio.';
      console.error('Recitation grade error:', status, message);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  // Batch translation endpoint for Fulfulde (Fula) and multi-screen scholarly translations
  app.post('/api/translate-batch', async (req, res) => {
    try {
      const targetLang =
        typeof req.body?.targetLang === 'string' ? req.body.targetLang.trim() : '';
      const langDesc = TARGET_LANGUAGE_INSTRUCTIONS[targetLang];
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

      if (!langDesc) {
        return res.status(400).json({ error: 'Unsupported target translation language.' });
      }
      if (!rawItems.length || rawItems.length > 45) {
        return res
          .status(400)
          .json({ error: 'Provide between 1 and 45 items to translate.' });
      }

      const items = rawItems
        .filter(
          (it: unknown): it is { id: string; text: string; arabic?: string } =>
            typeof it === 'object' &&
            it !== null &&
            typeof (it as { id?: unknown }).id === 'string' &&
            typeof (it as { text?: unknown }).text === 'string' &&
            (it as { text: string }).text.trim().length > 0
        )
        .slice(0, 45);

      if (items.some((item: { text: string; arabic?: unknown }) =>
        item.text.length > 6000 ||
        (item.arabic !== undefined && (typeof item.arabic !== 'string' || item.arabic.length > 6000))
      ) || items.reduce((total: number, item: { text: string; arabic?: string }) =>
        total + item.text.length + (item.arabic?.length ?? 0), 0) > 40_000) {
        return res.status(400).json({ error: 'Translation content is too long or has invalid Arabic context.' });
      }

      const resolved: Record<string, string> = {};
      const missing: Array<{ id: string; text: string; arabic?: string }> = [];

      for (const item of items) {
        const key = `${targetLang}::${item.text.trim()}`;
        const hit = translationCache.get(key);
        if (hit) {
          resolved[item.id] = hit;
        } else {
          missing.push(item);
        }
      }

      if (missing.length > 0) {
        if (!ai) {
          return res.status(503).json({ error: 'Translation service unavailable.' });
        }

        const promptPayload = missing.map((m) => ({
          id: m.id,
          source: m.text.trim(),
          ...(m.arabic ? { arabicContext: m.arabic.trim() } : {}),
        }));

        const response = await generateAiContent({
          model: 'gemini-4-hydrogen',
          contents: `Translate each JSON item's "source" text into ${langDesc}\nPreserve proper Islamic names (Allah, Muhammad, Jibril, etc.) and keep formatting concise and accurate. Return a JSON array matching every input "id".\n\n${JSON.stringify(
            promptPayload
          )}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are an Islamic scholar and linguistic translator specializing in accurate, reverent translations of the Qur’an, Hadith, Duas, and Salah manuals across Bangla, Bahasa Melayu/Indonesia, Hausa, Fulfulde (Fula), Persian (Fārsī), Turkish (Türkçe), Russian (Русский), Simplified Chinese (中文), Spanish (Español), and French (Français).',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  translation: { type: Type.STRING },
                },
                required: ['id', 'translation'],
              },
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
          id?: string;
          translation?: string;
        }>;

        const textById = new Map(missing.map((m) => [m.id, m.text.trim()]));
        for (const entry of parsed) {
          if (entry?.id && typeof entry.translation === 'string' && entry.translation.trim()) {
            const clean = entry.translation.trim();
            resolved[entry.id] = clean;
            const orig = textById.get(entry.id);
            if (orig) {
              setCachedTranslation(`${targetLang}::${orig}`, clean);
            }
          }
        }
      }

      return res.json({ translations: resolved });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Batch translation failed.';
      console.error('Translate batch error:', message);
      return res.status(500).json({ error: message });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.join(distDir, 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && hasDistBuild);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const disableClientWsPlugin = {
      name: 'disable-vite-client-ws',
      enforce: 'post' as const,
      transform(code: string, id: string) {
        const cleanId = id.split('?')[0].replace(/\\/g, '/');
        if (cleanId.endsWith('/vite/dist/client/client.mjs')) {
          return {
            code: code.replace(
              'transport.connect(createHMRHandler(handleMessage));',
              '/* WebSocket transport disabled while HMR/WS are disabled */'
            ),
            map: null,
          };
        }
        return null;
      },
    };

    const vite = await createViteServer({
      plugins: [disableClientWsPlugin],
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(precompressedStatic(distDir));
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => staticCacheHeaders(res, filePath, distDir),
      })
    );
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Noor Recite server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
