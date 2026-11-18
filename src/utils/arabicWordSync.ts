export interface ArabicDisplayToken {
  text: string;
  isSpokenWord: boolean;
  spokenIndex: number; // -1 if pure punctuation/marker
  charStart: number;
  charEnd: number;
  weight: number;
}

const ARABIC_LETTER_RE = /[\u0621-\u064A\u066E-\u06D3\u06EE-\u06EF\u06FA-\u06FC]/;
const LONG_VOWEL_OR_MADDA_RE = /[\u0622\u0627\u0648\u0649\u064A\u0670\u0671\u0653]/g;
const SHADDA_RE = /\u0651/g;
const PUNCT_PAUSE_RE = /[،؛.؟!۝]/;

function measureSpokenWordWeight(token: string): number {
  const lettersOnly = token
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[^\u0621-\u064A\u066E-\u06D3]/g, '');
  const baseLetters = Math.max(1, lettersOnly.length);
  const longVowels = (token.match(LONG_VOWEL_OR_MADDA_RE) || []).length * 0.65;
  const shaddas = (token.match(SHADDA_RE) || []).length * 0.45;
  const pauseBonus = PUNCT_PAUSE_RE.test(token) ? 1.15 : 0;
  return baseLetters + longVowels + shaddas + pauseBonus + 0.5;
}

export function tokenizeArabicForSync(text: string): ArabicDisplayToken[] {
  const tokens: ArabicDisplayToken[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  let spokenCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const isSpokenWord = ARABIC_LETTER_RE.test(raw);
    const spokenIndex = isSpokenWord ? spokenCounter++ : -1;
    tokens.push({
      text: raw,
      isSpokenWord,
      spokenIndex,
      charStart: match.index,
      charEnd: match.index + raw.length,
      weight: isSpokenWord ? measureSpokenWordWeight(raw) : 0,
    });
  }

  return tokens;
}

export function getArabicCharSyncRatio(
  text: string,
  speechCharIndex: number,
  fallbackRatio: number
): number {
  const tokens = tokenizeArabicForSync(text).filter((t) => t.isSpokenWord);
  if (tokens.length === 0 || speechCharIndex <= 0) {
    return Math.min(0.9999, Math.max(0, fallbackRatio));
  }
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (speechCharIndex >= tokens[i].charStart) {
      return Math.min(0.9999, (i + 0.5) / tokens.length);
    }
  }
  return Math.min(0.9999, Math.max(0, fallbackRatio));
}

export function getActiveArabicWordIndex(
  tokens: ArabicDisplayToken[],
  progressRatio: number,
  speechCharIndex?: number | null
): number | null {
  const spokenTokens = tokens.filter((t) => t.isSpokenWord);
  if (spokenTokens.length === 0) return null;

  if (typeof speechCharIndex === 'number' && speechCharIndex > 0) {
    for (let i = spokenTokens.length - 1; i >= 0; i--) {
      if (speechCharIndex >= spokenTokens[i].charStart) {
        return spokenTokens[i].spokenIndex;
      }
    }
    return 0;
  }

  const clamped = Math.min(0.9999, Math.max(0, progressRatio));
  const totalWeight = spokenTokens.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight <= 0) return 0;

  const targetWeight = clamped * totalWeight;
  let cumulative = 0;
  for (const t of spokenTokens) {
    cumulative += t.weight;
    if (targetWeight <= cumulative) {
      return t.spokenIndex;
    }
  }
  return spokenTokens[spokenTokens.length - 1].spokenIndex;
}

/**
 * Resolves a continuous 0..1 reading progress anchored to the exact active Arabic spoken word
 * and its intra-word position, keeping transliteration and translations locked to the Arabic cadence.
 */
export function getActiveArabicWordProgress(
  arabicText: string,
  progressRatio: number,
  speechCharIndex?: number | null
): number {
  const tokens = tokenizeArabicForSync(arabicText).filter((t) => t.isSpokenWord);
  if (tokens.length === 0) {
    return Math.min(0.9999, Math.max(0, progressRatio));
  }

  if (typeof speechCharIndex === 'number' && speechCharIndex > 0) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (speechCharIndex >= tokens[i].charStart) {
        return Math.min(0.9999, (i + 0.5) / tokens.length);
      }
    }
    return Math.min(0.9999, 0.5 / tokens.length);
  }

  const clamped = Math.min(0.9999, Math.max(0, progressRatio));
  const totalWeight = tokens.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight <= 0) return clamped;

  const targetWeight = clamped * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < tokens.length; i++) {
    const w = Math.max(0.01, tokens[i].weight);
    if (targetWeight <= cumulative + w) {
      const intra = Math.min(0.999, Math.max(0, (targetWeight - cumulative) / w));
      return Math.min(0.9999, (i + intra) / tokens.length);
    }
    cumulative += w;
  }

  return 0.9999;
}

export interface ArabicVerseWeightRange {
  verseIndex: number;
  startRatio: number;
  endRatio: number;
  totalWeight: number;
}

/**
 * Splits multi-verse Arabic text (e.g. Surah Al-Fatiha delimited by End-of-Ayah marker ۝)
 * into sequential phonetic weight ranges [startRatio, endRatio] within 0..1.
 */
export function getArabicVerseWeightRanges(arabicText: string): ArabicVerseWeightRange[] {
  const parts = arabicText
    .split(/\u06DD[\u0660-\u0669]*/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && ARABIC_LETTER_RE.test(part));

  if (parts.length <= 1) {
    return [{ verseIndex: 0, startRatio: 0, endRatio: 1, totalWeight: 1 }];
  }

  const partWeights = parts.map((part) =>
    tokenizeArabicForSync(part)
      .filter((t) => t.isSpokenWord)
      .reduce((sum, t) => sum + t.weight, 0)
  );
  const grandTotal = partWeights.reduce((sum, w) => sum + w, 0);
  if (grandTotal <= 0) {
    return parts.map((_, idx) => ({
      verseIndex: idx,
      startRatio: idx / parts.length,
      endRatio: (idx + 1) / parts.length,
      totalWeight: 1,
    }));
  }

  let acc = 0;
  return partWeights.map((w, idx) => {
    const startRatio = acc / grandTotal;
    acc += w;
    const endRatio = idx === partWeights.length - 1 ? 1 : acc / grandTotal;
    return {
      verseIndex: idx,
      startRatio,
      endRatio,
      totalWeight: w,
    };
  });
}

export interface ArabicWordTiming {
  startMs: number;
  endMs: number;
}

/**
 * Maps an exact playback timestamp (ms) using per-word timing segments onto the calibrated
 * phonetic-weight progress ratio (0..1) so both HighlightedArabicText and HighlightedSyncText
 * track the exact spoken word and intra-word position in lockstep.
 */
export function mapTimeToWordTimingProgress(
  currentTimeMs: number,
  wordTimings: ArabicWordTiming[],
  arabicText: string
): number {
  if (!wordTimings.length) return 0;
  const spoken = tokenizeArabicForSync(arabicText).filter((t) => t.isSpokenWord);
  const count = Math.min(spoken.length, wordTimings.length);
  if (count <= 0) return 0;

  const weights = spoken.slice(0, count).map((t) => Math.max(0.1, t.weight));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return 0;

  let activeIdx = count - 1;
  let intra = 0.99;

  if (currentTimeMs <= wordTimings[0].startMs) {
    activeIdx = 0;
    intra = 0.01;
  } else if (currentTimeMs >= wordTimings[count - 1].endMs) {
    activeIdx = count - 1;
    intra = 0.99;
  } else {
    for (let i = 0; i < count; i++) {
      const seg = wordTimings[i];
      if (currentTimeMs >= seg.startMs && currentTimeMs <= seg.endMs) {
        activeIdx = i;
        const span = Math.max(1, seg.endMs - seg.startMs);
        intra = Math.min(0.99, Math.max(0.01, (currentTimeMs - seg.startMs) / span));
        break;
      }
      const next = wordTimings[i + 1];
      if (next && currentTimeMs > seg.endMs && currentTimeMs < next.startMs) {
        if (currentTimeMs >= next.startMs - 25) {
          activeIdx = i + 1;
          intra = 0.02;
        } else {
          activeIdx = i;
          intra = 0.96;
        }
        break;
      }
    }
  }

  let before = 0;
  for (let i = 0; i < activeIdx; i++) {
    before += weights[i];
  }
  return Math.min(0.9999, Math.max(0, (before + intra * weights[activeIdx]) / totalWeight));
}

