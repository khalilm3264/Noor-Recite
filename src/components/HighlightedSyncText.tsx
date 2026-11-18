import React, { useMemo } from 'react';
import { TranslationLanguage } from '../types/quran';
import { tokenizeTranslationForAlignment } from '../data/quranData';
import { getActiveArabicWordProgress } from '../utils/arabicWordSync';

interface HighlightedSyncTextProps {
  text: string;
  arabicText?: string;
  isActive: boolean;
  progressRatio: number;
  speechCharIndex?: number | null;
  variant?: 'translation' | 'transliteration';
  lang?: TranslationLanguage;
  dir?: 'ltr' | 'rtl';
  className?: string;
}

export const HighlightedSyncText: React.FC<HighlightedSyncTextProps> = ({
  text,
  arabicText,
  isActive,
  progressRatio,
  speechCharIndex = null,
  variant = 'translation',
  lang = 'en',
  dir = 'ltr',
  className = '',
}) => {
  const effectiveLang: TranslationLanguage =
    variant === 'transliteration' ? 'en' : lang;

  const tokens = useMemo(
    () => tokenizeTranslationForAlignment(text, effectiveLang),
    [text, effectiveLang]
  );

  const activeIndex = useMemo(() => {
    if (!isActive || tokens.length === 0) return null;

    const ratio = arabicText
      ? getActiveArabicWordProgress(arabicText, progressRatio, speechCharIndex)
      : Math.min(0.9999, Math.max(0, progressRatio));

    const weights = tokens.map((tok) => Math.max(1, tok.length) + 0.5);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return 0;

    const target = ratio * totalWeight;
    let cumulative = 0;
    for (let i = 0; i < tokens.length; i++) {
      cumulative += weights[i];
      if (target <= cumulative) {
        return i;
      }
    }
    return tokens.length - 1;
  }, [isActive, tokens, arabicText, speechCharIndex, progressRatio]);

  if (tokens.length === 0) {
    return (
      <p dir={dir} className={className}>
        {text}
      </p>
    );
  }

  return (
    <p dir={dir} className={className}>
      {tokens.map((tok, idx) => {
        const isSynced = activeIndex === idx;
        const isPast = activeIndex !== null && idx < activeIndex;
        const nextTok = tokens[idx + 1];
        const needsTrailingSpace =
          idx < tokens.length - 1 &&
          (effectiveLang !== 'zh' ||
            (/[A-Za-z0-9]$/.test(tok) && /^[A-Za-z0-9]/.test(nextTok ?? '')));

        const spanClass =
          variant === 'transliteration'
            ? isSynced
              ? 'transition-none rounded px-1 py-0.5 bg-[#D97706]/16 text-[#904D00] dark:bg-amber-400/22 dark:text-amber-200 underline decoration-[#D97706] dark:decoration-amber-400 decoration-2 underline-offset-4 font-semibold not-italic'
              : isPast
              ? 'text-[#064E3B] dark:text-emerald-200'
              : activeIndex !== null
              ? 'text-[#0F766E]/55 dark:text-emerald-300/55'
              : ''
            : isSynced
            ? 'transition-none rounded px-0.5 py-0.5 bg-[#D97706]/16 text-[#003527] dark:bg-amber-400/20 dark:text-amber-100 underline decoration-[#D97706]/85 dark:decoration-amber-400/85 decoration-2 underline-offset-4 font-semibold'
            : isPast
            ? 'rounded text-[#022C22] dark:text-[#E6FFF4]'
            : activeIndex !== null
            ? 'rounded text-[#022C22]/55 dark:text-[#D0FAEA]/55'
            : '';

        return (
          <React.Fragment key={idx}>
            <span className={spanClass}>{tok}</span>
            {needsTrailingSpace ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </p>
  );
};
