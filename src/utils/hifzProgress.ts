import { HifzSpacedItem } from '../types/quran';
import { getLocalDateKey } from './dailyStreak';

export const HIFZ_PROGRESS_LOG_STORAGE_KEY = 'noor_hifz_progress_log_v1';

export type HifzProgressStatus = 'memorized' | 'mastered';

export interface HifzProgressEvent {
  id: string;
  date: string; // YYYY-MM-DD (local date)
  verseKey: string;
  surahId: number;
  status: HifzProgressStatus;
  stage: 1 | 2 | 3 | 4 | 5;
  timestamp: number;
}

export interface HifzDailyPoint {
  dateKey: string;
  label: string; // e.g. "Nov 15"
  shortLabel: string; // e.g. "15"
  memorized: number;
  mastered: number;
  total: number;
  cumulative: number;
}

export interface HifzProgressSummary {
  totalMemorized30d: number;
  totalMastered30d: number;
  totalCombined30d: number;
  activeHifzDays30d: number;
  solidifiedCount: number;
}

export function readHifzProgressEvents(): HifzProgressEvent[] {
  try {
    const raw = localStorage.getItem(HIFZ_PROGRESS_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HifzProgressEvent =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as HifzProgressEvent).date === 'string' &&
        typeof (item as HifzProgressEvent).verseKey === 'string' &&
        typeof (item as HifzProgressEvent).surahId === 'number' &&
        ((item as HifzProgressEvent).status === 'memorized' ||
          (item as HifzProgressEvent).status === 'mastered')
    );
  } catch {
    return [];
  }
}

export function saveHifzProgressEvents(events: HifzProgressEvent[]): void {
  try {
    localStorage.setItem(
      HIFZ_PROGRESS_LOG_STORAGE_KEY,
      JSON.stringify(events.slice(-4000))
    );
  } catch {
    // ignore storage quota errors
  }
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function build30DayHifzSeries(
  events: HifzProgressEvent[],
  spacedQueue: HifzSpacedItem[] = [],
  now = new Date()
): HifzDailyPoint[] {
  const days: {
    dateKey: string;
    label: string;
    shortLabel: string;
    memorizedKeys: Set<string>;
    masteredKeys: Set<string>;
  }[] = [];

  const dayMap = new Map<
    string,
    {
      dateKey: string;
      label: string;
      shortLabel: string;
      memorizedKeys: Set<string>;
      masteredKeys: Set<string>;
    }
  >();

  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateKey = getLocalDateKey(d);
    const label = `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
    const shortLabel =
      d.getDate() === 1 || offset === 29 || offset === 0
        ? label
        : String(d.getDate());
    const bucket = {
      dateKey,
      label,
      shortLabel,
      memorizedKeys: new Set<string>(),
      masteredKeys: new Set<string>(),
    };
    days.push(bucket);
    dayMap.set(dateKey, bucket);
  }

  for (const ev of events) {
    const bucket = dayMap.get(ev.date);
    if (!bucket) continue;
    if (ev.status === 'mastered') {
      bucket.masteredKeys.add(ev.verseKey);
      bucket.memorizedKeys.delete(ev.verseKey);
    } else if (!bucket.masteredKeys.has(ev.verseKey)) {
      bucket.memorizedKeys.add(ev.verseKey);
    }
  }

  // Reconcile any Hifz spaced-repetition items updated in the last 30 days
  for (const item of spacedQueue) {
    if (!item.updatedAt || !Number.isFinite(item.updatedAt)) continue;
    const itemDateKey = getLocalDateKey(new Date(item.updatedAt));
    const bucket = dayMap.get(itemDateKey);
    if (!bucket) continue;
    if (item.stage >= 4) {
      bucket.masteredKeys.add(item.verseKey);
      bucket.memorizedKeys.delete(item.verseKey);
    } else if (!bucket.masteredKeys.has(item.verseKey)) {
      bucket.memorizedKeys.add(item.verseKey);
    }
  }

  const seenCumulativeKeys = new Set<string>();
  return days.map((bucket) => {
    for (const key of bucket.memorizedKeys) seenCumulativeKeys.add(key);
    for (const key of bucket.masteredKeys) seenCumulativeKeys.add(key);
    const memorized = bucket.memorizedKeys.size;
    const mastered = bucket.masteredKeys.size;
    return {
      dateKey: bucket.dateKey,
      label: bucket.label,
      shortLabel: bucket.shortLabel,
      memorized,
      mastered,
      total: memorized + mastered,
      cumulative: seenCumulativeKeys.size,
    };
  });
}

export function computeHifzSummary(
  series: HifzDailyPoint[],
  spacedQueue: HifzSpacedItem[] = []
): HifzProgressSummary {
  let totalMemorized30d = 0;
  let totalMastered30d = 0;
  let activeHifzDays30d = 0;

  for (const day of series) {
    totalMemorized30d += day.memorized;
    totalMastered30d += day.mastered;
    if (day.total > 0) activeHifzDays30d++;
  }

  const solidifiedCount = spacedQueue.filter((item) => item.stage >= 4).length;

  return {
    totalMemorized30d,
    totalMastered30d,
    totalCombined30d: totalMemorized30d + totalMastered30d,
    activeHifzDays30d,
    solidifiedCount,
  };
}
