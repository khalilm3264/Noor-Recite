import React from 'react';
import { HeartHandshake, MoonStar } from 'lucide-react';

export type WorshipSection = 'salah' | 'duas';

interface WorshipSubNavProps {
  active: WorshipSection;
  onSelect: (section: WorshipSection) => void;
}

export const WorshipSubNav: React.FC<WorshipSubNavProps> = ({
  active,
  onSelect,
}) => {
  return (
    <div
      role="navigation"
      aria-label="Salah and Duas switcher"
      className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15 w-full sm:w-auto"
    >
      <button
        type="button"
        onClick={() => onSelect('salah')}
        aria-current={active === 'salah' ? 'page' : undefined}
        className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
          active === 'salah'
            ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
            : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
        }`}
      >
        <MoonStar className="w-4 h-4 shrink-0" />
        <span>Salah &amp; Prayers</span>
      </button>

      <button
        type="button"
        onClick={() => onSelect('duas')}
        aria-current={active === 'duas' ? 'page' : undefined}
        className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
          active === 'duas'
            ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
            : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
        }`}
      >
        <HeartHandshake className="w-4 h-4 shrink-0" />
        <span>Duas &amp; Kalimas</span>
      </button>
    </div>
  );
};
