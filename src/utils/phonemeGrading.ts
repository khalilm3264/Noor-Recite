import type { ArabicPhonemeSpec } from '../data/arabicPhonemes';
import {
  type MicAcousticSample,
  type SpokenVerificationResult,
} from './pitchAnalysis';

export interface PhonemeMicSample extends MicAcousticSample {
  fullness: number | null; // 0..1 ratio of low-mid resonance vs bright high-mid energy
}

export type PhonemePracticeTarget = 'letter' | 'word';

export interface PhonemeToneReport {
  overallScore: number;
  toneStabilityScore: number;
  weightMatchScore: number;
  breathClarityScore: number;
  spokenMatchScore: number | null;
  spokenVerified: boolean;
  isMatchedSpeech: boolean;
  heardTranscript?: string;
  ratingLabel: string;
  ratingArabic: string;
  summary: string;
  coachTip: string;
  avgPitchHz: number;
  avgFullnessPercent: number;
  voicedSec: number;
  totalSec: number;
  referenceContour: number[]; // 24 normalized points (0..1)
  userContour: number[]; // 24 normalized points (0..1)
}

export function getPhonemeAudioUrl(phonemeId: string): string {
  return `/audio/phonemes/${phonemeId}.mp3`;
}

export function buildPhonemePracticePrompt(
  phoneme: ArabicPhonemeSpec,
  target: PhonemePracticeTarget
): string {
  if (target === 'word') {
    return phoneme.quranExample.word;
  }
  if (phoneme.id === 'hamzah') return 'أَ إِ أُ';
  if (phoneme.id === 'alif-madd') return 'آ بَا';
  if (phoneme.id === 'haa-light') return 'هَ أَهْ';
  return `${phoneme.letter}َ أَ${phoneme.letter}ْ`;
}

/**
 * Estimates vocal tract depth/darkness (0 = very bright/light, 1 = deep/heavy Tafkhim)
 * from Web Audio AnalyserNode frequency bins (dB scale).
 */
export function computeSpectralFullness(
  freqDb: Float32Array,
  sampleRate: number
): number | null {
  if (!freqDb.length || !sampleRate) return null;
  const binHz = sampleRate / (freqDb.length * 2);
  if (!Number.isFinite(binHz) || binHz <= 0) return null;

  let lowEnergy = 0;
  let lowCount = 0;
  let highEnergy = 0;
  let highCount = 0;

  for (let i = 0; i < freqDb.length; i++) {
    const hz = i * binHz;
    const db = freqDb[i];
    if (!Number.isFinite(db) || db < -115) continue;
    const mag = Math.pow(10, db / 20);
    if (hz >= 180 && hz <= 950) {
      lowEnergy += mag;
      lowCount += 1;
    } else if (hz >= 1500 && hz <= 4200) {
      highEnergy += mag;
      highCount += 1;
    }
  }

  if (lowCount === 0 || highCount === 0) return null;
  const avgLow = lowEnergy / lowCount;
  const avgHigh = highEnergy / highCount;
  const total = avgLow + avgHigh;
  if (total <= 1e-7) return null;

  return Math.max(0, Math.min(1, avgLow / total));
}

function clamp(n: number, min = 0, max = 99): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Generates an ideal 24-point pitch/tone reference shape tailored to each Arabic phoneme:
 * - Heavy (Tafkhim) consonants anchor lower and deeper into vocal resonance
 * - Nasal (Ghunnah) and Madd letters hold steady sustained contours
 * - Stops (Qalqalah / plosives) feature a crisp release peak before settling
 */
export function buildPhonemeReferenceContour(
  phoneme: ArabicPhonemeSpec,
  points = 24
): number[] {
  const curve: number[] = [];
  for (let i = 0; i < points; i++) {
    const p = i / Math.max(1, points - 1);
    let base = phoneme.emphatic ? 0.42 : 0.58;

    if (phoneme.mannerOfArticulation === 'stop') {
      // Crisp onset + pause + clean Makhraj closure & release
      const firstPulse = Math.exp(-Math.pow((p - 0.22) / 0.14, 2)) * 0.24;
      const secondPulse = Math.exp(-Math.pow((p - 0.72) / 0.14, 2)) * 0.18;
      base = (phoneme.emphatic ? 0.34 : 0.46) + firstPulse + secondPulse;
    } else if (phoneme.nasal || phoneme.mannerOfArticulation === 'vowel') {
      // Smooth steady resonance arch
      base += Math.sin(p * Math.PI) * 0.16;
    } else {
      // Clear open syllable followed by steady consonant hold
      const openBump = Math.sin(Math.min(1, p * 2.1) * Math.PI) * 0.14;
      const holdLine = phoneme.emphatic ? -0.06 * p : 0.04 * (1 - p);
      base += openBump + holdLine;
    }

    curve.push(Math.max(0.16, Math.min(0.9, Number(base.toFixed(3)))));
  }
  return curve;
}

function resamplePhonemeUserContour(
  samples: PhonemeMicSample[],
  points = 24
): { contour: number[]; avgPitchHz: number; avgFullness: number } {
  const pitched = samples.filter((s) => s.pitchHz !== null && s.pitchHz > 0);
  const avgPitchHz = pitched.length
    ? Math.round(
        pitched.reduce((acc, s) => acc + (s.pitchHz ?? 0), 0) / pitched.length
      )
    : 0;

  const fullSamples = samples.filter(
    (s) => s.fullness !== null && s.rms > 0.015
  );
  const avgFullness = fullSamples.length
    ? fullSamples.reduce((acc, s) => acc + (s.fullness ?? 0.5), 0) /
      fullSamples.length
    : 0.5;

  if (samples.length === 0) {
    return {
      contour: Array.from({ length: points }, () => 0.14),
      avgPitchHz: 0,
      avgFullness: 0.5,
    };
  }

  const minHz = Math.max(85, (avgPitchHz || 175) - 55);
  const spanHz = 110;
  const contour: number[] = [];

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
    const avgRms =
      bucket.reduce((acc, b) => acc + b.rms, 0) / Math.max(1, bucket.length);

    if (bucketPitches.length > 0) {
      const meanHz =
        bucketPitches.reduce((a, b) => a + b, 0) / bucketPitches.length;
      const norm = 0.28 + ((meanHz - minHz) / spanHz) * 0.52;
      contour.push(Math.max(0.15, Math.min(0.9, Number(norm.toFixed(3)))));
    } else {
      const energyHeight = Math.max(0.12, Math.min(0.55, 0.12 + avgRms * 2.1));
      contour.push(Number(energyHeight.toFixed(3)));
    }
  }

  return { contour, avgPitchHz, avgFullness };
}

export function evaluatePhonemeTone(
  phoneme: ArabicPhonemeSpec,
  practiceTarget: PhonemePracticeTarget,
  samples: PhonemeMicSample[],
  totalSec: number,
  voicedSec: number,
  peakRms: number,
  verification?: SpokenVerificationResult | null
): PhonemeToneReport {
  const referenceContour = buildPhonemeReferenceContour(phoneme, 24);
  const { contour: userContour, avgPitchHz, avgFullness } =
    resamplePhonemeUserContour(samples, 24);

  const avgFullnessPercent = Math.round(avgFullness * 100);
  const pitchedSamples = samples.filter((s) => s.pitchHz !== null);
  const pitchedRatio =
    samples.length > 0 ? pitchedSamples.length / samples.length : 0;

  // Quiet or empty recording
  if (voicedSec < 0.25 || peakRms < 0.015) {
    return {
      overallScore: 18,
      toneStabilityScore: 15,
      weightMatchScore: 20,
      breathClarityScore: 16,
      spokenMatchScore: verification ? 0 : null,
      spokenVerified: Boolean(verification),
      isMatchedSpeech: false,
      heardTranscript: verification?.transcript,
      ratingLabel: 'Too Faint',
      ratingArabic: 'أَعِدْ بِصَوْتٍ أَوْضَح',
      summary: `Very little sound captured (${voicedSec.toFixed(1)}s voiced). Speak closer to your microphone and articulate ${phoneme.letter} (${phoneme.name}) clearly.`,
      coachTip: phoneme.tongueStep,
      avgPitchHz,
      avgFullnessPercent,
      voicedSec,
      totalSec,
      referenceContour,
      userContour,
    };
  }

  // Tone stability: low pitch jitter across voiced windows + contour similarity
  let pitchVariance = 0;
  if (pitchedSamples.length >= 3 && avgPitchHz > 0) {
    const diffs = pitchedSamples.map((s) =>
      Math.abs((s.pitchHz ?? avgPitchHz) - avgPitchHz)
    );
    pitchVariance = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  }
  const jitterPenalty = Math.min(35, pitchVariance * 0.75);

  let contourDiff = 0;
  for (let i = 0; i < referenceContour.length; i++) {
    contourDiff += Math.abs(referenceContour[i] - userContour[i]);
  }
  const meanContourDiff = contourDiff / referenceContour.length;

  const toneStabilityScore = phoneme.voiced
    ? clamp(
        88 - jitterPenalty - meanContourDiff * 62 + (pitchedRatio >= 0.25 ? 6 : -14)
      )
    : clamp(
        84 - meanContourDiff * 50 + (peakRms >= 0.04 ? 8 : -8)
      );

  // Makhraj Weight Match: heavy letters (Tafkhim) benefit from fuller low-mid spectral depth (>= 0.56)
  // Light letters (Tarqiq) benefit from crisp, lighter balance (< 0.72)
  let weightMatchScore: number;
  if (phoneme.emphatic) {
    if (avgFullness >= 0.56) {
      weightMatchScore = clamp(78 + (avgFullness - 0.56) * 52);
    } else {
      weightMatchScore = clamp(46 + avgFullness * 55);
    }
  } else {
    if (avgFullness <= 0.74) {
      weightMatchScore = clamp(82 + (0.74 - Math.max(0.32, avgFullness)) * 35);
    } else {
      weightMatchScore = clamp(72 - (avgFullness - 0.74) * 80);
    }
  }

  // Breath & clarity: healthy voiced window + clean volume without mic clipping
  const targetDuration = practiceTarget === 'word' ? 1.1 : 0.75;
  const durRatio = Math.min(1, voicedSec / targetDuration);
  const clipPenalty = peakRms > 0.72 ? 12 : 0;
  const breathClarityScore = clamp(
    44 + durRatio * 34 + Math.min(20, peakRms * 120) - clipPenalty
  );

  // Optional spoken verification via ASR
  let spokenMatchScore: number | null = null;
  let isMatchedSpeech = true;
  const spokenVerified = Boolean(verification);

  if (verification) {
    const baseAcc = Math.round(
      (verification.wordMatchRatio * 0.55 + verification.charSimilarity * 0.45) * 100
    );
    // Single Arabic letter syllables often transcribe with base letter alone or short variation
    const containsTargetLetter = verification.transcript.includes(phoneme.letter);
    if (practiceTarget === 'letter' && verification.isArabicSpeech && containsTargetLetter) {
      spokenMatchScore = Math.max(baseAcc, 86);
    } else {
      spokenMatchScore = verification.isArabicSpeech ? baseAcc : Math.min(25, baseAcc);
    }

    isMatchedSpeech =
      verification.isArabicSpeech &&
      (spokenMatchScore >= 42 ||
        verification.matchedWordCount >= 1 ||
        (practiceTarget === 'letter' && containsTargetLetter));
  }

  let overallScore: number;
  if (verification && !isMatchedSpeech) {
    overallScore = clamp(
      Math.min(
        48,
        Math.round(
          toneStabilityScore * 0.25 +
            weightMatchScore * 0.25 +
            breathClarityScore * 0.2 +
            (spokenMatchScore ?? 0) * 0.3
        )
      )
    );
  } else if (spokenMatchScore !== null) {
    overallScore = clamp(
      toneStabilityScore * 0.3 +
        weightMatchScore * 0.3 +
        breathClarityScore * 0.15 +
        spokenMatchScore * 0.25
    );
  } else {
    overallScore = clamp(
      toneStabilityScore * 0.38 +
        weightMatchScore * 0.37 +
        breathClarityScore * 0.25
    );
  }

  let ratingLabel = 'Keep Practicing';
  let ratingArabic = 'تَدَرَّبْ أَكْثَر';
  if (overallScore >= 88) {
    ratingLabel = 'Mumtāz (Excellent)';
    ratingArabic = 'مُمْتَاز';
  } else if (overallScore >= 75) {
    ratingLabel = 'Jayyid Jiddan (Very Good)';
    ratingArabic = 'جَيِّد جِدًّا';
  } else if (overallScore >= 60) {
    ratingLabel = 'Jayyid (Good)';
    ratingArabic = 'جَيِّد';
  }

  let coachTip = phoneme.tongueStep;
  if (verification && !isMatchedSpeech) {
    coachTip = `Try listening to "Hear Letter" first, then clearly say ${
      practiceTarget === 'word'
        ? phoneme.quranExample.transliteration
        : `"${phoneme.letter}َ — أَ${phoneme.letter}ْ"`
    } in Arabic.`;
  } else if (phoneme.emphatic && avgFullness < 0.56) {
    coachTip = `Your tone sounded slightly light/thin. Lift the back of your tongue toward the soft palate so ${phoneme.letter} (${phoneme.name}) resonates deeply instead of sounding like its light counterpart.`;
  } else if (!phoneme.emphatic && avgFullness > 0.76) {
    coachTip = `Your tone sounded heavy — relax and flatten the back of your tongue so ${phoneme.letter} (${phoneme.name}) stays crisp and light (Tarqīq).`;
  } else if (toneStabilityScore < 65) {
    coachTip = `Hold a steadier pitch as you release ${phoneme.letter} (${phoneme.name}) and avoid rushing the syllable.`;
  }

  let summary: string;
  if (verification && !isMatchedSpeech) {
    const heard =
      verification.transcript && !/^\[?(silence|noise)/i.test(verification.transcript)
        ? `Heard "${verification.transcript.slice(0, 50)}"`
        : 'Unclear speech detected';
    summary = `${heard} — did not clearly match ${phoneme.letter} (${phoneme.name}). Compare with the sample audio and try again.`;
  } else if (spokenVerified) {
    summary = `Verified Arabic pronunciation (${voicedSec.toFixed(1)}s voiced · ${
      avgPitchHz > 0 ? `${avgPitchHz} Hz avg pitch · ` : ''
    }${phoneme.emphatic ? 'Tafkhīm depth' : 'Tarqīq clarity'} ${weightMatchScore}%).`;
  } else {
    summary = `Acoustic tone & ${
      phoneme.emphatic ? 'Tafkhīm weight' : 'Tarqīq clarity'
    } graded (${voicedSec.toFixed(1)}s voiced${
      avgPitchHz > 0 ? ` · ${avgPitchHz} Hz avg pitch` : ''
    }). Use Compare to hear yours beside the model audio.`;
  }

  return {
    overallScore,
    toneStabilityScore,
    weightMatchScore,
    breathClarityScore,
    spokenMatchScore,
    spokenVerified,
    isMatchedSpeech,
    heardTranscript: verification?.transcript,
    ratingLabel,
    ratingArabic,
    summary,
    coachTip,
    avgPitchHz,
    avgFullnessPercent,
    voicedSec,
    totalSec,
    referenceContour,
    userContour,
  };
}
