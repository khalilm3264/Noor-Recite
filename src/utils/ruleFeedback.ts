import type { TajweedRuleType } from '../types/quran';
import type { SpokenVerificationResult } from './pitchAnalysis';

export interface AcousticAnalysis {
  totalSec: number;
  voicedSec: number;
  peakPercent: number;
  passed: boolean;
  summary: string;
}


export function buildRuleFeedback(
  ruleType: TajweedRuleType,
  voicedSec: number,
  totalSec: number,
  peakRms: number,
  verification?: SpokenVerificationResult | null
): AcousticAnalysis {
  const peakPercent = Math.min(100, Math.round(peakRms * 260));

  if (voicedSec < 0.35 || peakRms < 0.018) {
    return {
      totalSec,
      voicedSec,
      peakPercent,
      passed: false,
      summary: `Very faint or brief audio detected (${voicedSec.toFixed(1)}s voiced). Move closer to your microphone and recite the example phrase aloud.`,
    };
  }

  if (!verification ||
      !Number.isFinite(verification.wordMatchRatio) ||
      verification.wordMatchRatio < 0 || verification.wordMatchRatio > 1 ||
      !Number.isInteger(verification.matchedWordCount) ||
      !Number.isInteger(verification.expectedWordCount) ||
      verification.expectedWordCount <= 0) {
    return {
      totalSec,
      voicedSec,
      peakPercent,
      passed: false,
      summary: 'Speech verification is unavailable. Your recording was captured, but Arabic speech and phrase accuracy could not be verified. Please try again when the service is available.',
    };
  }

  if (verification.isArabicSpeech !== true || verification.wordMatchRatio < 0.45 || verification.matchedWordCount < 1) {
    const heard =
      verification.transcript && !/^\[?(silence|noise)/i.test(verification.transcript)
        ? `Heard "${verification.transcript.slice(0, 60)}"`
        : 'No clear Arabic example words detected';
    return {
      totalSec,
      voicedSec,
      peakPercent,
      passed: false,
      summary: `${heard}. Spoken phrase did not match the Arabic example (${verification.matchedWordCount}/${verification.expectedWordCount} words matched). Listen to the Qari and try again.`,
    };
  }

  switch (ruleType) {
    case 'madd': {
      const strongHold = voicedSec >= 1.5;
      return {
        totalSec,
        voicedSec,
        peakPercent,
        passed: strongHold,
        summary: strongHold
          ? `Verified Arabic recitation (${voicedSec.toFixed(1)}s voiced). Strong vowel sustain; compare side-by-side with the Qari to verify the full 6-count Madd hold.`
          : `Measured ${voicedSec.toFixed(1)}s of voiced audio, which may rush the elongation. Try extending the vowel smoothly for a full 6 counts before the doubled Laam.`,
      };
    }
    case 'ghunnah':
    case 'ikhfa':
    case 'idgham': {
      const steadyResonance = voicedSec >= 1.0;
      return {
        totalSec,
        voicedSec,
        peakPercent,
        passed: steadyResonance,
        summary: steadyResonance
          ? `Verified ${voicedSec.toFixed(1)}s of Arabic vocalization. Play yours back alongside the Qari to check the 2-count nasal resonance.`
          : `Captured ${voicedSec.toFixed(1)}s. Keep the transition unhurried so the 2-count nasalization settles cleanly.`,
      };
    }
    case 'qalqalah':
      return {
        totalSec,
        voicedSec,
        peakPercent,
        passed: true,
        summary: `Verified Arabic recitation (${voicedSec.toFixed(1)}s, ${peakPercent}% peak level). Listen back to confirm a crisp echoing release on the final stop.`,
      };
    case 'tafkhim':
      return {
        totalSec,
        voicedSec,
        peakPercent,
        passed: true,
        summary: `Verified Arabic recitation (${voicedSec.toFixed(1)}s, ${peakPercent}% peak level). Compare with the Qari to confirm deep resonance on heavy letters.`,
      };
  }
}

