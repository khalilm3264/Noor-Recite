import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Loader2 } from 'lucide-react';
import { TranslationLanguage } from '../types/quran';
import { TRANSLATION_LANGUAGE_OPTIONS } from '../utils/translationConfig';

interface LanguagePillSelectorProps {
  activeLang: TranslationLanguage;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  isTranslating?: boolean;
  className?: string;
  align?: 'left' | 'right';
  fullWidth?: boolean;
}

export const LanguagePillSelector: React.FC<LanguagePillSelectorProps> = ({
  activeLang,
  onSelectLanguage,
  isTranslating = false,
  className = '',
  align = 'right',
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentOpt =
    TRANSLATION_LANGUAGE_OPTIONS.find((opt) => opt.id === activeLang) ??
    TRANSLATION_LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col ${
        fullWidth ? 'w-full' : 'items-start sm:items-end'
      } gap-1 max-w-full ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Translation language: ${currentOpt.label} (${currentOpt.sub})`}
        className={`${
          fullWidth ? 'w-full justify-between' : ''
        } min-h-[40px] px-3.5 py-2 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white/95 dark:bg-[#0A2921] text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:border-[#064E3B]/35 dark:hover:border-emerald-300/40 shadow-xs inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]`}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          {isTranslating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F766E] dark:text-emerald-300 shrink-0" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300 shrink-0" />
          )}
          <span
            dir={currentOpt.dir}
            className={`truncate font-bold ${currentOpt.fontClass}`}
          >
            {currentOpt.label}
          </span>
          <span className="text-[11px] font-normal text-[#404944] dark:text-emerald-200/75 truncate hidden sm:inline">
            · {currentOpt.sub}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#404944] dark:text-emerald-200/75 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select translation language"
          className={`absolute top-full mt-1.5 z-50 ${
            fullWidth ? 'w-full min-w-[240px]' : 'w-64 max-w-[calc(100vw-2rem)]'
          } ${
            align === 'left' ? 'left-0' : 'right-0'
          } rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] shadow-2xl p-1.5`}
        >
          <p className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300/80">
            Translation Language (13)
          </p>
          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
            {TRANSLATION_LANGUAGE_OPTIONS.map((opt) => {
              const selected = activeLang === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelectLanguage(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    selected
                      ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'text-[#022C22] hover:bg-[#064E3B]/6 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/10'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                    <span
                      dir={opt.dir}
                      className={`text-xs font-bold truncate ${opt.fontClass}`}
                    >
                      {opt.label}
                    </span>
                    <span
                      dir={opt.dir}
                      className={`text-[10.5px] truncate ${opt.fontClass} ${
                        selected
                          ? 'text-[#FEF3C7]/85 dark:text-[#022C22]/80'
                          : 'text-[#404944] dark:text-emerald-200/75'
                      }`}
                    >
                      {opt.sub}
                    </span>
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

