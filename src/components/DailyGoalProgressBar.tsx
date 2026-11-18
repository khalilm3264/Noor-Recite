import React, { useEffect, useState } from 'react';
import { Award, Calendar, Check, Flame, Plus } from 'lucide-react';
import {
  DailyStreakData,
  getLocalDateKey,
  readStoredStreak,
  syncDailyStreak,
} from '../utils/dailyStreak';

interface DailyGoalProgressBarProps {
  versesRecitedCount: number;
  dailyGoal: number;
  onChangeDailyGoal: (goal: number) => void;
  onMarkVerseRead?: () => void;
  onOpenKhatmah?: () => void;
}

const GOAL_PRESETS = [10, 20, 30] as const;

export const DailyGoalProgressBar: React.FC<DailyGoalProgressBarProps> = ({
  versesRecitedCount,
  dailyGoal,
  onChangeDailyGoal,
  onMarkVerseRead,
  onOpenKhatmah,
}) => {
  const safeGoal = Math.max(1, dailyGoal);
  const rawPct = Math.round((versesRecitedCount / safeGoal) * 100);
  const clampedPct = Math.min(100, Math.max(0, rawPct));
  const goalReached = versesRecitedCount >= safeGoal;
  const remaining = Math.max(0, safeGoal - versesRecitedCount);

  const [streakData, setStreakData] = useState<DailyStreakData>(() =>
    readStoredStreak()
  );

  useEffect(() => {
    setStreakData(syncDailyStreak(goalReached));
  }, [goalReached]);

  const todayKey = getLocalDateKey();
  const completedToday = streakData.lastCompletedDate === todayKey;
  const streakDays = streakData.streakCount;
  const dayUnit = streakDays === 1 ? 'day' : 'days';

  const encouragement = goalReached
    ? `Goal complete · ${versesRecitedCount} verses recited today`
    : versesRecitedCount === 0
    ? `Recite ${safeGoal} verses to complete today's goal`
    : remaining === 1
    ? '1 verse away from your daily goal'
    : clampedPct >= 75
    ? `Almost there · ${remaining} verses left`
    : clampedPct >= 50
    ? `Halfway there · ${remaining} verses remaining`
    : `${remaining} verses to go today`;

  return (
    <section
      aria-label="Daily recitation goal progress"
      className={`rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4 transition-colors duration-200 ayah-card-resting ${
        goalReached
          ? 'border-[#D97706]/45 dark:border-amber-400/45 bg-gradient-to-r from-[#064E3B]/[0.03] via-[#FEF3C7]/35 to-[#D97706]/[0.06] dark:from-[#0A2921] dark:via-amber-950/20 dark:to-emerald-950/50'
          : 'border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              goalReached
                ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                : 'bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200'
            }`}
            aria-hidden="true"
          >
            {goalReached ? (
              <Award className="w-4 h-4" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-xs sm:text-[13px] font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Daily Recitation Goal
              </h2>
              <span className="text-xs font-bold tabular-nums text-[#0F766E] dark:text-amber-300">
                {versesRecitedCount} / {safeGoal} verses ({clampedPct}%)
              </span>

              {/* Consecutive-Day Streak Indicator */}
              <span
                aria-label={`Current daily goal streak: ${streakDays} consecutive ${dayUnit}`}
                title={
                  completedToday
                    ? `Today's goal completed · ${streakDays} consecutive ${dayUnit}`
                    : streakDays > 0
                    ? `Reach today's goal to extend your ${streakDays}-${dayUnit} streak`
                    : 'Reach your daily goal to start a streak'
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums transition-colors ${
                  completedToday
                    ? 'bg-[#D97706]/15 text-[#B45309] border border-[#D97706]/30 dark:bg-amber-400/20 dark:text-amber-200 dark:border-amber-400/35'
                    : streakDays > 0
                    ? 'bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 dark:bg-teal-400/15 dark:text-teal-200 dark:border-teal-400/25'
                    : 'bg-[#064E3B]/[0.06] text-[#404944] border border-transparent dark:bg-emerald-400/10 dark:text-emerald-200/75'
                }`}
              >
                <Flame
                  className={`w-3 h-3 shrink-0 ${
                    completedToday
                      ? 'text-[#D97706] dark:text-amber-300 fill-current'
                      : streakDays > 0
                      ? 'text-[#D97706] dark:text-amber-300'
                      : 'text-[#404944]/70 dark:text-emerald-200/60'
                  }`}
                />
                <span>
                  Streak: {streakDays} {dayUnit}
                </span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#404944] dark:text-emerald-200/80 break-words">
              {encouragement}
            </p>
          </div>
        </div>

        {/* Interactive Goal Presets + Manual Verse Check */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Set daily verse goal"
            className="inline-flex items-center gap-0.5 rounded-full bg-[#064E3B]/[0.06] dark:bg-emerald-400/10 p-0.5"
          >
            {GOAL_PRESETS.map((preset) => {
              const selected = dailyGoal === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeDailyGoal(preset)}
                  aria-pressed={selected}
                  title={`Set daily goal to ${preset} verses`}
                  className={`min-h-[26px] px-2.5 rounded-full text-[11px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    selected
                      ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {onMarkVerseRead && (
            <button
              type="button"
              onClick={onMarkVerseRead}
              title="Log 1 verse read silently"
              className="min-h-[28px] px-2.5 rounded-full border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white/80 dark:bg-[#041D17]/70 hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:hover:bg-emerald-500 dark:hover:text-[#022C22] text-[11px] font-semibold text-[#064E3B] dark:text-emerald-200 inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              {goalReached ? (
                <Check className="w-3 h-3" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              <span>Log Verse</span>
            </button>
          )}

          {onOpenKhatmah && (
            <button
              type="button"
              onClick={onOpenKhatmah}
              title="Open Daily Khatmah & Tilawah Planner"
              className="min-h-[28px] px-2.5 rounded-full bg-[#D97706]/12 hover:bg-[#D97706] text-[#904D00] hover:text-white dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400 dark:hover:text-[#022C22] text-[11px] font-semibold inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <Calendar className="w-3 h-3" />
              <span>Khatmah Planner</span>
            </button>
          )}
        </div>
      </div>

      {/* Smooth Progress Track with Milestone Ticks */}
      <div className="mt-3 space-y-1.5">
        <div
          role="progressbar"
          aria-label="Daily verse recitation progress"
          aria-valuemin={0}
          aria-valuemax={safeGoal}
          aria-valuenow={Math.min(versesRecitedCount, safeGoal)}
          className="relative h-2.5 w-full rounded-full bg-[#064E3B]/10 dark:bg-emerald-300/15 overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${
              goalReached
                ? 'bg-gradient-to-r from-[#0F766E] via-[#D97706] to-[#F59E0B] dark:from-emerald-400 dark:to-amber-400'
                : 'bg-gradient-to-r from-[#064E3B] via-[#0F766E] to-[#D97706] dark:from-emerald-500 dark:to-amber-400'
            }`}
            style={{ width: `${clampedPct}%` }}
          />
          {/* Subtle quartile dividers at 25%, 50%, 75% */}
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-1/4 w-px bg-white/45 dark:bg-[#041D17]/40 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-1/2 w-px bg-white/45 dark:bg-[#041D17]/40 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-3/4 w-px bg-white/45 dark:bg-[#041D17]/40 pointer-events-none"
          />
        </div>
      </div>
    </section>
  );
};
