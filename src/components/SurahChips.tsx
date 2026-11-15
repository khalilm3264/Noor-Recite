import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { SurahDirectoryEntry } from '../types/quran';

interface SurahChipsProps {
  directory: SurahDirectoryEntry[];
  activeSurahId: number;
  loadingSurahId: number | null;
  onSelectSurah: (entry: SurahDirectoryEntry) => void;
}

export const SurahChips: React.FC<SurahChipsProps> = ({
  directory,
  activeSurahId,
  loadingSurahId,
  onSelectSurah,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    const container = containerRef.current;
    const activeBtn = buttonRefs.current[activeSurahId];
    if (!container || !activeBtn) return;

    const targetLeft =
      activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
  }, [activeSurahId]);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 min-w-max">
        {directory.map((entry) => {
          const isSelected = entry.id === activeSurahId;
          const isLoading = entry.id === loadingSurahId;
          return (
            <button
              key={entry.id}
              ref={(el) => {
                buttonRefs.current[entry.id] = el;
              }}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectSurah(entry)}
              className={`min-h-[42px] px-3.5 py-2 rounded-full border text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                isSelected
                  ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-sm dark:bg-emerald-500 dark:text-[#022C22] dark:border-emerald-500'
                  : 'bg-white/90 text-[#022C22] border-[#064E3B]/12 hover:border-[#064E3B]/35 hover:bg-[#E6FFF4]/50 dark:bg-[#0A2921] dark:text-[#E6FFF4] dark:border-emerald-300/15 dark:hover:border-emerald-300/35'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D97706] shrink-0" />
              ) : (
                isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#D97706] dark:bg-[#022C22] shrink-0"
                    aria-hidden="true"
                  />
                )
              )}
              <span className="font-semibold">
                {entry.id}. {entry.nameSimple}
              </span>
              <span
                dir="rtl"
                className={`font-quran-amiri text-sm leading-none ${
                  isSelected
                    ? 'text-[#FFDCC3] dark:text-[#022C22]/85'
                    : 'text-[#0F766E] dark:text-emerald-300/80'
                }`}
              >
                {entry.nameArabic.replace('سُورَةُ ', '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
