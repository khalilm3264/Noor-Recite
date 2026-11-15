export const DAILY_STREAK_STORAGE_KEY = 'noor_daily_streak_v1';

export interface DailyStreakData {
  streakCount: number;
  lastCompletedDate: string | null;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(now = new Date()): string {
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );
  return getLocalDateKey(yesterday);
}

export function readStoredStreak(now = new Date()): DailyStreakData {
  const today = getLocalDateKey(now);
  const yesterday = getYesterdayDateKey(now);

  try {
    const raw = localStorage.getItem(DAILY_STREAK_STORAGE_KEY);
    if (!raw) return { streakCount: 0, lastCompletedDate: null };
    const parsed = JSON.parse(raw) as Partial<DailyStreakData>;
    const count =
      typeof parsed.streakCount === 'number' && Number.isFinite(parsed.streakCount)
        ? Math.max(0, Math.floor(parsed.streakCount))
        : 0;
    const lastDate =
      typeof parsed.lastCompletedDate === 'string'
        ? parsed.lastCompletedDate
        : null;

    if (lastDate === today || lastDate === yesterday) {
      return { streakCount: count, lastCompletedDate: lastDate };
    }

    // Streak expired if last completed day was older than yesterday
    return { streakCount: 0, lastCompletedDate: lastDate };
  } catch {
    return { streakCount: 0, lastCompletedDate: null };
  }
}

export function syncDailyStreak(
  goalReachedToday: boolean,
  now = new Date()
): DailyStreakData {
  const today = getLocalDateKey(now);
  const yesterday = getYesterdayDateKey(now);
  const current = readStoredStreak(now);

  if (!goalReachedToday) {
    return current;
  }

  // Already recorded completion for today
  if (current.lastCompletedDate === today) {
    const safeCount = Math.max(1, current.streakCount);
    if (safeCount !== current.streakCount) {
      const updated = { streakCount: safeCount, lastCompletedDate: today };
      try {
        localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    }
    return current;
  }

  const nextCount =
    current.lastCompletedDate === yesterday ? current.streakCount + 1 : 1;
  const updated: DailyStreakData = {
    streakCount: nextCount,
    lastCompletedDate: today,
  };

  try {
    localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }

  return updated;
}
