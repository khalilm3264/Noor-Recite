import React from 'react';
import { Loader2 } from 'lucide-react';
import { TranslationLanguage } from '../types/quran';
import { TRANSLATION_LANGUAGE_OPTIONS } from '../utils/translationConfig';

interface LanguagePillSelectorProps {
  activeLang: TranslationLanguage;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  isTranslating?: boolean;
  className?: string;
}

export const LanguagePillSelector: React.FC<LanguagePillSelectorProps> = ({
  activeLang,
  onSelectLanguage,
  isTranslating = false,
  className = '',
}) => {
  return (
    <div className={`inline-flex flex-col items-start sm:items-end gap-1 max-w-full ${className}`}>
      <div
        role="group"
        aria-label="Translation language"
        className="inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white/90 dark:bg-[#0A2921]/95 p-1 shadow-xs"
      >
        {TRANSLATION_LANGUAGE_OPTIONS.map((opt) => {
          const selected = activeLang === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectLanguage(opt.id)}
              aria-pressed={selected}
              title={opt.sub}
              dir={opt.dir}
              className={`min-h-[32px] px-2.5 sm:px-3 py-1 rounded-xl text-[11.5px] sm:text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${opt.pillClass} ${
                selected
                  ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                  : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
              }`}
            >
              {opt.shortLabel}
            </button>
          );
        })}
      </div>
      {isTranslating && (
        <span className="inline-flex items-center gap-1.5 px-2 text-[11px] font-medium text-[#0F766E] dark:text-emerald-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading translation...</span>
        </span>
      )}
    </div>
  );
};
