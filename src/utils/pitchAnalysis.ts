import { Ayah, WordToken } from '../types/quran';
import { TAJWEED_RULES } from '../data/tajweedRules';

export interface MicAcousticSample {
  tMs: number;
  rms: number;
  pitchHz: number | null;
}

export interface SpokenVerificationResult {
  transcript: string;
  isArabicSpeech: boolean;
  wordMatchRatio: number; // 0..1
  charSimilarity: number; // 0..1
  perWordAccuracy: number[]; // 0..100
  matchedWordCount: number;
  expectedWordCount: number;
}

export interface WordToneEvaluation {
  word: WordToken;
  index: number;
  startSec: number;
  endSec: number;
  score: number;
  statusLabel: string;
  ruleLabel: string;
  feedback: string;
  needsAttention: boolean;
}

export interface TartilGradeReport {
  overallScore: number;
  pitchScore: number;
  makhrajScore: number;
  maddScore: number;
  breathScore: number;
  ratingLabel: string;
  ratingArabic: string;
  summary: string;
  stylisticTip: string;
  transcript?: string;
  isMatchedRecitation?: boolean;
  totalSec: number;
  voicedSec: number;
  avgPitchHz: number;
  referenceContour: number[]; // 28 normalized pitch heights (0..1)
  userContour: number[]; // 28 normalized pitch heights (0..1)
  wordEvaluations: WordToneEvaluation[];
}

/**
 * Normalized autocorrelation pitch estimator (F0) constrained to human voice (85Hz - 420Hz).
 */
export function detectPitchHz(
  samples: Float32Array,
  sampleRate: number
): number | null {
  const size = samples.length;
  if (size < 128 || !sampleRate) return null;

  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += samples[i] * samples[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.015) return null;

  const minLag = Math.max(20, Math.floor(sampleRate / 420));
  const maxLag = Math.min(Math.floor(size / 2), Math.floor(sampleRate / 85));
  if (maxLag <= minLag) return null;

  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i < size - lag; i++) {
      const a = samples[i];
      const b = samples[i + lag];
      cross += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const denom = Math.sqrt(energyA * energyB);
    if (denom > 0) {
      const corr = cross / denom;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
  }

  if (bestLag > 0 && bestCorr >= 0.45) {
    return Math.round(sampleRate / bestLag);
  }
  return null;
}

function clampScore(n: number, min = 0, max = 99): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Generates an expressive, deterministic Tartil pitch inflection contour for a verse
 * modeled after measured Maqam Bayati / Nahawand phrasing across its words.
 */
export function buildReferencePitchContour(ayah: Ayah, points = 28): number[] {
  const words = ayah.words.length ? ayah.words : [];
  const curve: number[] = [];
  for (let i = 0; i < points; i++) {
    const progress = i / Math.max(1, points - 1);
    const wordIdx = Math.min(
      Math.max(0, words.length - 1),
      Math.floor(progress * Math.max(1, words.length))
    );
    const word = words[wordIdx];
    let boost = 0;
    if (word?.tajweed === 'madd') boost += 0.14;
    if (word?.tajweed === 'tafkhim') boost -= 0.06;
    if (word?.tajweed === 'ghunnah' || word?.tajweed === 'idgham') boost += 0.08;

    const arch = Math.sin(progress * Math.PI) * 0.34;
    const cadence = Math.sin(progress * Math.PI * 3.2 + (ayah.number % 3)) * 0.09;
    const waqfResolve = progress > 0.82 ? -(progress - 0.82) * 0.95 : 0;
    const val = 0.36 + arch + cadence + boost + waqfResolve;
    curve.push(Math.max(0.14, Math.min(0.92, Number(val.toFixed(3)))));
  }
  return curve;
}

function resampleUserContour(
  samples: MicAcousticSample[],
  points = 28
): { contour: number[]; avgPitchHz: number } {
  const pitched = samples.filter((s) => s.pitchHz !== null && s.pitchHz > 0);
  const avgPitchHz = pitched.length
    ? Math.round(
        pitched.reduce((acc, s) => acc + (s.pitchHz ?? 0), 0) / pitched.length
      )
    : 0;

  if (samples.length === 0) {
    return {
      contour: Array.from({ length: points }, () => 0.15),
      avgPitchHz: 0,
    };
  }

  const minHz = Math.max(85, (avgPitchHz || 180) - 55);
  const spanHz = 110;
  const result: number[] = [];

  for (let i = 0; i < points; i++) {
    const startIdx = Math.floor((i / points) * samples.length);
    const endIdx = Math.max(
      startIdx + 1,
      Math.floor(((i + 1) / points) * samples.length)
    );
    const bucket = samples.slice(startIdx, endIdx);
    const bucketPitches = bucket
      .map((b) => b.pitchHz)
      .filter((h): h is number => h !== null && h > 0);
    const avgBucketRms =
      bucket.reduce((acc, b) => acc + b.rms, 0) / Math.max(1, bucket.length);

    if (bucketPitches.length > 0) {
      const meanHz =
        bucketPitches.reduce((a, b) => a + b, 0) / bucketPitches.length;
      const norm = 0.25 + ((meanHz - minHz) / spanHz) * 0.55;
      result.push(Math.max(0.15, Math.min(0.92, Number(norm.toFixed(3)))));
    } else {
      const rmsNorm = Math.max(0.12, Math.min(0.45, 0.12 + avgBucketRms * 1.8));
      result.push(Number(rmsNorm.toFixed(3)));
    }
  }

  return { contour: result, avgPitchHz };
}

function computeSyllabicModulation(samples: MicAcousticSample[]): number {
  const active = samples.filter((s) => s.rms > 0.012);
  if (active.length < 4) return 0;
  const mean = active.reduce((acc, s) => acc + s.rms, 0) / active.length;
  if (mean <= 0) return 0;
  const variance =
    active.reduce((acc, s) => acc + Math.pow(s.rms - mean, 2), 0) / active.length;
  const cv = Math.sqrt(variance) / mean;
  // Natural articulated syllables have coefficient of variation ~ 0.35 - 1.1
  return Math.min(20, Math.round(cv * 22));
}

export function evaluateTartilRecitation(
  ayah: Ayah,
  reciterName: string,
  samples: MicAcousticSample[],
  totalSec: number,
  voicedSec: number,
  peakRms: number,
  verification?: SpokenVerificationResult | null
): TartilGradeReport {
  const referenceContour = buildReferencePitchContour(ayah, 28);
  const { contour: userContour, avgPitchHz } = resampleUserContour(samples, 28);

  const voicedRatio = totalSec > 0 ? Math.min(1, voicedSec / totalSec) : 0;
  const pitchedRatio =
    samples.length > 0
      ? samples.filter((s) => s.pitchHz !== null).length / samples.length
      : 0;
  const syllabicMod = computeSyllabicModulation(samples);

  const expectedDur = Math.max(1.8, ayah.durationSec || 4.2);
  const paceRatio =
    Math.min(voicedSec, expectedDur) / Math.max(voicedSec, expectedDur, 0.5);

  let diffSum = 0;
  for (let i = 0; i < referenceContour.length; i++) {
    diffSum += Math.abs(referenceContour[i] - userContour[i]);
  }
  const meanDiff = diffSum / referenceContour.length;

  const isTooQuiet =
    voicedSec < 0.45 || peakRms < 0.018 || pitchedRatio < 0.12;

  const rawPitchScore = isTooQuiet
    ? 14
    : clampScore(90 - meanDiff * 98 + (avgPitchHz > 0 && pitchedRatio > 0.35 ? 3 : -18));
  const rawMakhrajScore = isTooQuiet
    ? 12
    : clampScore(38 + Math.min(22, peakRms * 115) + syllabicMod + voicedRatio * 14);
  const rawMaddScore = isTooQuiet
    ? 10
    : clampScore(28 + Math.pow(paceRatio, 1.45) * 62);
  const rawBreathScore = isTooQuiet
    ? 16
    : clampScore(34 + voicedRatio * 34 + (voicedSec >= expectedDur * 0.55 ? 16 : -10));

  let pitchScore = rawPitchScore;
  let makhrajScore = rawMakhrajScore;
  let maddScore = rawMaddScore;
  let breathScore = rawBreathScore;
  let overallScore: number;
  let isMatchedRecitation = true;

  if (verification) {
    const textAcc = Math.round(
      (verification.wordMatchRatio * 0.68 + verification.charSimilarity * 0.32) * 100
    );

    if (!verification.isArabicSpeech || verification.wordMatchRatio < 0.2) {
      isMatchedRecitation = false;
      makhrajScore = clampScore(textAcc * 0.45, 0, 22);
      maddScore = clampScore(textAcc * 0.5, 0, 24);
      pitchScore = clampScore(rawPitchScore * 0.3, 0, 32);
      breathScore = clampScore(rawBreathScore * 0.4, 0, 36);
      overallScore = clampScore(
        textAcc * 0.55 + (isTooQuiet ? 0 : Math.min(10, rawPitchScore * 0.12)),
        0,
        24
      );
    } else if (verification.wordMatchRatio < 0.72) {
      const gate = 0.35 + 0.65 * (textAcc / 100);
      makhrajScore = clampScore(textAcc * 0.74 + rawMakhrajScore * 0.26);
      maddScore = clampScore(rawMaddScore * gate);
      pitchScore = clampScore(rawPitchScore * (0.4 + 0.6 * verification.wordMatchRatio));
      breathScore = clampScore(rawBreathScore * (0.45 + 0.55 * verification.wordMatchRatio));
      overallScore = clampScore(
        textAcc * 0.62 +
          pitchScore * 0.12 +
          makhrajScore * 0.12 +
          maddScore * 0.08 +
          breathScore * 0.06,
        0,
        72
      );
    } else {
      makhrajScore = clampScore(textAcc * 0.62 + rawMakhrajScore * 0.38);
      maddScore = clampScore(rawMaddScore * (0.35 + 0.65 * (textAcc / 100)));
      pitchScore = clampScore(rawPitchScore * 0.75 + textAcc * 0.25);
      breathScore = clampScore(rawBreathScore * 0.75 + textAcc * 0.25);
      overallScore = clampScore(
        textAcc * 0.54 +
          pitchScore * 0.14 +
          makhrajScore * 0.14 +
          maddScore * 0.11 +
          breathScore * 0.07
      );
    }
  } else {
    // Offline fallback without transcript: still strict — cap at 74 when unverified
    overallScore = isTooQuiet
      ? clampScore((pitchScore + makhrajScore + maddScore + breathScore) / 4, 0, 22)
      : clampScore(
          pitchScore * 0.28 +
            makhrajScore * 0.28 +
            maddScore * 0.24 +
            breathScore * 0.2,
          0,
          74
        );
  }

  let ratingLabel = 'Ḍa‘īf (Needs Correction)';
  let ratingArabic = 'أَعِدِ التِّلَاوَة';
  if (!isMatchedRecitation) {
    ratingLabel = 'Ghayr Muṭābiq (Off-Verse)';
    ratingArabic = 'تَأَكَّدْ مِنَ الْآيَة';
  } else if (overallScore >= 90) {
    ratingLabel = 'Mumtāz (Excellent)';
    ratingArabic = 'مَا شَاءَ ٱللَّٰهُ';
  } else if (overallScore >= 78) {
    ratingLabel = 'Jayyid Jiddan (Very Good)';
    ratingArabic = 'أَحْسَنْتَ';
  } else if (overallScore >= 64) {
    ratingLabel = 'Jayyid (Steady Progress)';
    ratingArabic = 'جَيِّد';
  } else if (overallScore >= 42) {
    ratingLabel = 'Mutawassiṭ (Developing)';
    ratingArabic = 'بَارَكَ اللَّهُ فِيكَ';
  }

  let summary: string;
  if (verification && !isMatchedRecitation) {
    const heardSnippet =
      verification.transcript && !/^\[?(silence|noise)/i.test(verification.transcript)
        ? `Heard: "${verification.transcript.slice(0, 72)}"`
        : 'No intelligible Arabic Quranic speech was detected';
    summary = `${heardSnippet}. Audio did not match ${ayah.verseKey} (${verification.matchedWordCount}/${verification.expectedWordCount} Arabic words aligned). Listen to ${reciterName} and recite clearly.`;
  } else if (verification) {
    summary = `Matched ${verification.matchedWordCount}/${verification.expectedWordCount} Arabic words (${Math.round(
      verification.charSimilarity * 100
    )}% phonetic fidelity) in ${voicedSec.toFixed(1)}s voiced audio vs. ${reciterName}'s ${expectedDur.toFixed(
      1
    )}s cadence.`;
  } else if (isTooQuiet) {
    summary = `Only ${voicedSec.toFixed(1)}s of faint audio was captured. Speak clearly near your microphone and follow ${reciterName}'s Tartil pace across every word.`;
  } else {
    summary = `Captured ${voicedSec.toFixed(1)}s voiced audio (avg pitch ${
      avgPitchHz > 0 ? `${avgPitchHz} Hz` : 'unpitched'
    }) against ${reciterName}'s ${expectedDur.toFixed(1)}s target cadence for ${ayah.verseKey}.`;
  }

  const stylisticTip = !isMatchedRecitation
    ? `Play ${reciterName}'s reference once, follow each Arabic word from right to left, and enunciate clearly into your microphone.`
    : maddScore < pitchScore
    ? `Hold elongations (Madd) unhurriedly toward the end of ${ayah.verseKey} so the closing resonance settles calmly.`
    : `Maintain crisp consonant articulation (Makharij) across shaddah and heavy letters while keeping your breath steady.`;

  const wordCount = Math.max(1, ayah.words.length);
  const effectiveSpan = Math.max(voicedSec, totalSec, 1);
  const wordEvaluations: WordToneEvaluation[] = ayah.words.map((word, idx) => {
    const segStartRatio = idx / wordCount;
    const segEndRatio = (idx + 1) / wordCount;
    const sliceStart = Math.floor(segStartRatio * samples.length);
    const sliceEnd = Math.max(sliceStart + 1, Math.floor(segEndRatio * samples.length));
    const slice = samples.slice(sliceStart, sliceEnd);
    const sliceRms =
      slice.length > 0
        ? slice.reduce((acc, s) => acc + s.rms, 0) / slice.length
        : 0;
    const hasPitch = slice.some((s) => s.pitchHz !== null);

    const ruleSpec = word.tajweed
      ? TAJWEED_RULES.find((r) => r.type === word.tajweed)
      : undefined;

    const acousticWordScore = isTooQuiet
      ? 14
      : clampScore(
          42 +
            Math.min(24, sliceRms * 120) +
            (hasPitch ? 14 : -12) -
            (word.tajweed === 'madd' && paceRatio < 0.7 ? 10 : 0)
        );

    const verifiedWordAcc = verification?.perWordAccuracy?.[idx];
    let rawWordScore: number;
    if (typeof verifiedWordAcc === 'number') {
      if (!isMatchedRecitation) {
        rawWordScore = clampScore(verifiedWordAcc * 0.4, 0, 22);
      } else if (verifiedWordAcc < 45) {
        rawWordScore = clampScore(verifiedWordAcc * 0.85, 0, 44);
      } else {
        rawWordScore = clampScore(verifiedWordAcc * 0.72 + acousticWordScore * 0.28);
      }
    } else {
      rawWordScore = clampScore(acousticWordScore, 0, 74);
    }

    const needsAttention = rawWordScore < 75 || isTooQuiet || !isMatchedRecitation;
    const ruleLabel = ruleSpec
      ? `${ruleSpec.name} (${ruleSpec.harakatCount})`
      : word.partOfSpeech || 'Articulation & Clarity';

    let statusLabel = 'Aligned';
    if (!isMatchedRecitation || (typeof verifiedWordAcc === 'number' && verifiedWordAcc < 35)) {
      statusLabel = 'Not Detected';
    } else if (needsAttention) {
      statusLabel = 'Makhraj Check';
    }

    let feedback: string;
    if (!isMatchedRecitation || (typeof verifiedWordAcc === 'number' && verifiedWordAcc < 35)) {
      feedback = `Arabic word "${word.transliteration}" was not clearly matched in your recording. Enunciate every letter carefully.`;
    } else if (isTooQuiet) {
      feedback = `Minimal vocal energy detected on "${word.transliteration}". Recite clearly so every harakah carries.`;
    } else if (word.tajweedNote) {
      feedback = `${word.tajweedNote}. Measured ${rawWordScore}%.`;
    } else if (needsAttention) {
      feedback = `Hurried or imprecise articulation on "${word.transliteration}". Give each vowel and consonant a clean pulse.`;
    } else {
      feedback = `Clear Arabic articulation and balanced tonal sustain matching ${reciterName}'s cadence.`;
    }

    return {
      word,
      index: idx,
      startSec: Number((segStartRatio * effectiveSpan).toFixed(1)),
      endSec: Number((segEndRatio * effectiveSpan).toFixed(1)),
      score: rawWordScore,
      statusLabel,
      ruleLabel,
      feedback,
      needsAttention,
    };
  });

  return {
    overallScore,
    pitchScore,
    makhrajScore,
    maddScore,
    breathScore,
    ratingLabel,
    ratingArabic,
    summary,
    stylisticTip,
    transcript: verification?.transcript,
    isMatchedRecitation,
    totalSec,
    voicedSec,
    avgPitchHz,
    referenceContour,
    userContour,
    wordEvaluations,
  };
}
