import React from 'react';

interface RubElHizbProps {
  className?: string;
  label?: string | number;
  active?: boolean;
}

export const RubElHizbBadge: React.FC<RubElHizbProps> = ({
  className = 'w-9 h-9',
  label,
  active = false,
}) => {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="8"
          width="24"
          height="24"
          rx="2"
          className={
            active
              ? 'stroke-[#D97706] fill-[#D97706]/10 dark:stroke-amber-400 dark:fill-amber-400/15'
              : 'stroke-[#064E3B]/45 fill-[#064E3B]/[0.03] dark:stroke-emerald-400/45 dark:fill-emerald-400/5'
          }
          strokeWidth="1.5"
        />
        <rect
          x="8"
          y="8"
          width="24"
          height="24"
          rx="2"
          transform="rotate(45 20 20)"
          className={
            active
              ? 'stroke-[#D97706] fill-[#D97706]/10 dark:stroke-amber-400 dark:fill-amber-400/15'
              : 'stroke-[#064E3B]/45 fill-[#064E3B]/[0.03] dark:stroke-emerald-400/45 dark:fill-emerald-400/5'
          }
          strokeWidth="1.5"
        />
      </svg>
      {label !== undefined && (
        <span
          className={`absolute text-[11px] font-semibold tabular-nums leading-none ${
            active
              ? 'text-[#904D00] dark:text-amber-300'
              : 'text-[#064E3B] dark:text-emerald-200'
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );
};

export const FiligreeDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 my-2 ${className}`} aria-hidden="true">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#064E3B]/15 to-[#064E3B]/30 dark:via-emerald-300/15 dark:to-emerald-300/30" />
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#D97706] dark:text-amber-400 shrink-0" fill="none">
      <rect x="5" y="5" width="14" height="14" stroke="currentColor" strokeWidth="1.4" />
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        transform="rotate(45 12 12)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#064E3B]/15 to-[#064E3B]/30 dark:via-emerald-300/15 dark:to-emerald-300/30" />
  </div>
);
