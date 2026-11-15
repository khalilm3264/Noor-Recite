export interface RecitationHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD local date key
  surahId: number;
  surahName: string;
  verseKey: string;
  durationSec: number;
  timestamp: number;
}

export interface SurahRecitationStat {
  surahId: number;
  surahName: string;
  count: number;
  totalTimeSec: number;
}

export interface RecitationInsights {
  totalTimeSec: number;
  totalVerses: number;
  activeDays: number;
  avgDailyVerses: number;
  mostRecitedSurah: SurahRecitationStat | null;
  topSurahs: SurahRecitationStat[];
}

const HISTORY_STORAGE_KEY = 'noor_recitation_history_v1';
const MAX_HISTORY_ENTRIES = 5000;

export function readRecitationHistory(): RecitationHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecitationHistoryEntry =>
        Boolean(item) &&
        typeof item.date === 'string' &&
        typeof item.surahId === 'number' &&
        typeof item.surahName === 'string' &&
        typeof item.verseKey === 'string' &&
        typeof item.durationSec === 'number'
    );
  } catch {
    return [];
  }
}

export function saveRecitationHistory(entries: RecitationHistoryEntry[]): void {
  try {
    const trimmed =
      entries.length > MAX_HISTORY_ENTRIES
        ? entries.slice(entries.length - MAX_HISTORY_ENTRIES)
        : entries;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota errors
  }
}

export function computeRecitationInsights(
  history: RecitationHistoryEntry[]
): RecitationInsights {
  if (!history.length) {
    return {
      totalTimeSec: 0,
      totalVerses: 0,
      activeDays: 0,
      avgDailyVerses: 0,
      mostRecitedSurah: null,
      topSurahs: [],
    };
  }

  let totalTimeSec = 0;
  const uniqueDates = new Set<string>();
  const surahMap = new Map<number, SurahRecitationStat>();

  for (const entry of history) {
    const dur = Number.isFinite(entry.durationSec) && entry.durationSec > 0 ? entry.durationSec : 1;
    totalTimeSec += dur;
    uniqueDates.add(entry.date);

    const existing = surahMap.get(entry.surahId);
    if (existing) {
      existing.count += 1;
      existing.totalTimeSec += dur;
    } else {
      surahMap.set(entry.surahId, {
        surahId: entry.surahId,
        surahName: entry.surahName,
        count: 1,
        totalTimeSec: dur,
      });
    }
  }

  const activeDays = uniqueDates.size;
  const totalVerses = history.length;
  const avgDailyVerses =
    activeDays > 0 ? Number((totalVerses / activeDays).toFixed(1)) : 0;

  const sortedSurahs = Array.from(surahMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.totalTimeSec - a.totalTimeSec;
  });

  return {
    totalTimeSec,
    totalVerses,
    activeDays,
    avgDailyVerses,
    mostRecitedSurah: sortedSurahs[0] ?? null,
    topSurahs: sortedSurahs.slice(0, 3),
  };
}

export function formatRecitationDuration(totalSec: number): string {
  const safe = Math.max(0, Math.round(totalSec));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
