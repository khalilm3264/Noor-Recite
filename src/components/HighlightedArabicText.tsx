import React, { useMemo } from 'react';
import { WordHighlightStyle } from '../types/quran';
import {
  getActiveArabicWordIndex,
  tokenizeArabicForSync,
} from '../utils/arabicWordSync';

interface HighlightedArabicTextProps {
  text: string;
  isActive: boolean;
  progressRatio: number;
  highlightStyle?: WordHighlightStyle;
  speechCharIndex?: number | null;
  fontClass?: string;
  fontSize?: number;
  lineHeight?: number;
  align?: 'right' | 'center';
  className?: string;
}

export const HighlightedArabicText: React.FC<HighlightedArabicTextProps> = ({
  text,
  isActive,
  progressRatio,
  highlightStyle = 'pill',
  speechCharIndex = null,
  fontClass = 'font-quran-amiri',
  fontSize = 28,
  lineHeight = 2.05,
  align = 'right',
  className = '',
}) => {
  const tokens = useMemo(() => tokenizeArabicForSync(text), [text]);

  const activeWordIndex = useMemo(() => {
    if (!isActive) return null;
    return getActiveArabicWordIndex(tokens, progressRatio, speechCharIndex);
  }, [isActive, tokens, progressRatio, speechCharIndex]);

  const activeWordClasses =
    highlightStyle === 'wave'
      ? 'transition-none rounded-none border-[1.5px] border-transparent underline decoration-wavy decoration-[#D97706] dark:decoration-amber-400 decoration-2 underline-offset-8 text-[#003527] dark:text-amber-200 font-bold'
      : highlightStyle === 'box'
      ? 'transition-none rounded-xl bg-[#064E3B]/[0.12] dark:bg-emerald-400/20 border-[1.5px] border-[#064E3B]/30 dark:border-emerald-300/40 text-[#003527] dark:text-[#E6FFF4]'
      : highlightStyle === 'glow'
      ? 'transition-none rounded-full border-[1.5px] border-transparent text-[#B45309] dark:text-amber-300 font-bold [text-shadow:0_0_16px_rgba(217,119,6,0.45)]'
      : 'transition-none rounded-full bg-[#064E3B]/[0.08] dark:bg-amber-400/15 border-[1.5px] border-[#D97706] dark:border-amber-400 text-[#003527] dark:text-amber-100 word-glow-active';

  return (
    <div
      dir="rtl"
      className={`flex flex-wrap items-center gap-x-1 gap-y-1.5 ${
        align === 'center' ? 'justify-center text-center' : 'justify-start text-right'
      } ${fontClass} ${className}`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight,
      }}
    >
      {tokens.map((tok, idx) => {
        if (!tok.isSpokenWord) {
          return (
            <span
              key={idx}
              className="inline-flex items-center px-0.5 text-[0.82em] text-[#0F766E]/80 dark:text-emerald-300/75 select-none"
            >
              {tok.text}
            </span>
          );
        }

        const isWordActive =
          activeWordIndex !== null && tok.spokenIndex === activeWordIndex;
        const isPast =
          activeWordIndex !== null && tok.spokenIndex < activeWordIndex;

        return (
          <span
            key={idx}
            data-active-word={isWordActive ? 'true' : undefined}
            className={`inline-flex items-center px-1.5 py-0.5 ${
              isWordActive
                ? activeWordClasses
                : isPast
                ? 'rounded-full border-[1.5px] border-transparent text-[#022C22] dark:text-[#E6FFF4]'
                : activeWordIndex !== null
                ? 'rounded-full border-[1.5px] border-transparent text-[#022C22]/65 dark:text-[#E6FFF4]/70'
                : 'rounded-full border-[1.5px] border-transparent text-[#022C22] dark:text-[#E6FFF4]'
            }`}
          >
            {tok.text}
          </span>
        );
      })}
    </div>
  );
};
