import React, { useEffect, useState } from 'react';
import { Play, Sparkles, X } from 'lucide-react';
import { readStoredStreak } from '../utils/dailyStreak';

interface DailyGoalReminderToastProps {
  isVisible: boolean;
  dailyGoal: number;
  onStartReciting: () => void;
  onDismiss: () => void;
}

export const DailyGoalReminderToast: React.FC<DailyGoalReminderToastProps> = ({
  isVisible,
  dailyGoal,
  onStartReciting,
  onDismiss,
}) => {
  const [streakCount, setStreakCount] = useState<number>(() => {
    return readStoredStreak().streakCount;
  });

  useEffect(() => {
    if (!isVisible) return;
    setStreakCount(readStoredStreak().streakCount);
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  const dayUnit = streakCount === 1 ? 'day' : 'days';
  const subtitle =
    streakCount > 0
      ? `Keep your ${streakCount}-${dayUnit} streak going — begin your ${dailyGoal} verses today.`
      : `Settle in for a quiet moment — start your ${dailyGoal}-verse goal today.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-14 sm:top-16 right-3 left-3 sm:left-auto sm:w-[390px] z-50 pointer-events-none flex justify-end"
    >
      <div className="pointer-events-auto w-full rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-[#FFFFFF]/96 dark:bg-[#0A2921]/96 backdrop-blur-md px-3.5 py-3 shadow-lg ayah-card-active flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-xl bg-[#D97706]/12 dark:bg-amber-400/20 text-[#D97706] dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Daily Recitation Reminder
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#404944] dark:text-emerald-200/85">
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss daily goal reminder"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[#707974] hover:text-[#022C22] hover:bg-[#064E3B]/8 dark:text-emerald-200/70 dark:hover:text-white dark:hover:bg-emerald-400/15 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStartReciting}
              className="min-h-[30px] px-3 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Begin Reciting</span>
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[30px] px-2.5 rounded-full text-[11px] font-medium text-[#404944] hover:text-[#022C22] dark:text-emerald-200/75 dark:hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
