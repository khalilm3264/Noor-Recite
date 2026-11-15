import React, { useMemo, useState } from 'react';
import { Search, ArrowRight, Loader2, Bookmark, Sparkles, Clock, Compass, Calendar, Heart } from 'lucide-react';
import { AppScreen, BookmarkItem, HifzWeakWord, SurahDirectoryEntry } from '../types/quran';
import { RecitationHistoryEntry } from '../utils/recitationHistory';
import { RubElHizbBadge } from './RubElHizbIcon';

interface SurahIndexViewProps {
  directory: SurahDirectoryEntry[];
  activeSurahId: number;
  loadingSurahId: number | null;
  loadError: string | null;
  bookmarks?: BookmarkItem[];
  weakWords?: HifzWeakWord[];
  recitationHistory?: RecitationHistoryEntry[];
  onOpenSurah: (entry: SurahDirectoryEntry) => void;
  onNavigateHub?: (screen: AppScreen) => void;
}

type IndexFilter = 'all' | 'juz' | 'saved' | 'recent' | 'featured' | 'Meccan' | 'Medinan';

export const SurahIndexView: React.FC<SurahIndexViewProps> = ({
  directory,
  activeSurahId,
  loadingSurahId,
  loadError,
  bookmarks = [],
  weakWords = [],
  recitationHistory = [],
  onOpenSurah,
  onNavigateHub,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<IndexFilter>('all');

  const savedSurahIds = useMemo(() => {
    const ids = new Set<number>();
    bookmarks.forEach((b) => ids.add(b.surahId));
    weakWords.forEach((w) => ids.add(w.surahId));
    return ids;
  }, [bookmarks, weakWords]);

  const recentSurahOrder = useMemo(() => {
    const map = new Map<number, number>();
    recitationHistory.forEach((entry) => {
      const prev = map.get(entry.surahId) ?? 0;
      if (entry.timestamp > prev) map.set(entry.surahId, entry.timestamp);
    });
    return map;
  }, [recitationHistory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = directory.filter((item) => {
      if (filter === 'featured' && !item.featured) return false;
      if (filter === 'Meccan' && item.revelationPlace !== 'Meccan') return false;
      if (filter === 'Medinan' && item.revelationPlace !== 'Medinan') return false;
      if (filter === 'saved' && !savedSurahIds.has(item.id)) return false;
      if (filter === 'recent' && !recentSurahOrder.has(item.id)) return false;
      if (!q) return true;
      return (
        item.nameSimple.toLowerCase().includes(q) ||
        item.nameMeaning.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        `juz ${item.juz}`.includes(q) ||
        item.nameArabic.includes(q)
      );
    });

    if (filter === 'recent') {
      return [...list].sort(
        (a, b) => (recentSurahOrder.get(b.id) ?? 0) - (recentSurahOrder.get(a.id) ?? 0)
      );
    }
    if (filter === 'juz') {
      return [...list].sort((a, b) => a.juz - b.juz || a.id - b.id);
    }
    return list;
  }, [directory, filter, query, savedSurahIds, recentSurahOrder]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      {onNavigateHub && (
        <div
          role="navigation"
          aria-label="Qur'an Discovery Hub"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15"
        >
          <button
            type="button"
            className="min-h-[36px] px-3.5 rounded-xl bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>114 Surahs &amp; Juz</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateHub('khatmah')}
            className="min-h-[36px] px-3.5 rounded-xl text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Khatmah Planner</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateHub('topics')}
            className="min-h-[36px] px-3.5 rounded-xl text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Thematic Topics &amp; Heart</span>
          </button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Surah &amp; Juz Directory
          </h1>
          <span className="text-xs font-medium text-[#0F766E] dark:text-emerald-300/85 tabular-nums">
            Showing {filtered.length} of {directory.length} Chapters
          </span>
        </div>
        <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
          Browse all 114 chapters of the Noble Qur&apos;an across 30 Juz with synchronized word-by-word recitation, transliteration, and verse contemplation.
        </p>
      </div>

      {/* Search + Segmented Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#707974] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Surah name, meaning, Juz, or 1–114..."
            aria-label="Search Surahs"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-sm text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
          />
        </div>

        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/8 dark:border-emerald-300/12 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Filter Surahs"
        >
          {(
            [
              { id: 'all', label: `Surahs (${directory.length})` },
              { id: 'juz', label: 'Juz (30)' },
              { id: 'saved', label: `Saved & Hifz (${savedSurahIds.size})` },
              { id: 'recent', label: `Recent (${recentSurahOrder.size})` },
              { id: 'featured', label: 'Full Tajweed' },
              { id: 'Meccan', label: 'Meccan' },
              { id: 'Medinan', label: 'Medinan' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#064E3B] shadow-xs dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/75 dark:hover:text-[#E6FFF4]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-[#BA1A1A]/25 bg-[#FFDAD6]/50 dark:bg-rose-950/50 dark:border-rose-400/30 px-4 py-3 text-xs font-medium text-[#93000A] dark:text-rose-200"
        >
          {loadError}
        </div>
      )}

      {/* Surah Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-10 text-center space-y-2">
          <p className="text-base font-semibold text-[#022C22] dark:text-[#E6FFF4]">
            {query.trim()
              ? `No chapters match “${query}”`
              : filter === 'recent'
              ? 'No recently recited chapters yet'
              : filter === 'saved'
              ? 'No saved chapters or weak Hifz words yet'
              : 'No matching chapters found'}
          </p>
          <p className="text-sm text-[#404944] dark:text-emerald-200/75">
            {query.trim()
              ? 'Try searching by Surah number (1–114) or clear your filter.'
              : filter === 'recent'
              ? 'Play any Surah in the Reader to see your recent recitation history here.'
              : filter === 'saved'
              ? 'Bookmark verses or flag words in the Hifz Quiz to review them here.'
              : 'Select All Surahs to browse all 114 chapters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => {
            const isCurrent = entry.id === activeSurahId;
            const isLoading = entry.id === loadingSurahId;
            const hasBookmark = bookmarks.some((b) => b.surahId === entry.id);
            const weakCount = weakWords.filter((w) => w.surahId === entry.id).length;
            const isRecent = recentSurahOrder.has(entry.id);

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenSurah(entry)}
                disabled={isLoading}
                className={`text-left rounded-2xl p-5 border transition-all flex items-center justify-between gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                  isCurrent
                    ? 'border-[#D97706]/50 bg-gradient-to-b from-[#064E3B]/[0.03] to-[#D97706]/[0.05] dark:border-amber-400/50 dark:from-emerald-950/60 dark:to-amber-950/25 ayah-card-active'
                    : 'border-[#064E3B]/10 dark:border-emerald-300/12 bg-white dark:bg-[#0A2921]/90 hover:border-[#064E3B]/30 dark:hover:border-emerald-300/30 ayah-card-resting'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <RubElHizbBadge className="w-10 h-10" label={entry.id} active={isCurrent} />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                        {entry.nameSimple}
                      </h2>
                      {hasBookmark && (
                        <Bookmark className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-300 fill-current shrink-0" />
                      )}
                      {weakCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#B45309] dark:text-amber-300 shrink-0">
                          <Sparkles className="w-3 h-3" />
                          {weakCount}
                        </span>
                      )}
                      {filter === 'recent' && isRecent && !hasBookmark && weakCount === 0 && (
                        <Clock className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#404944] dark:text-emerald-200/80 truncate">
                      {entry.nameMeaning}
                    </p>
                    <p className="text-[11px] font-medium text-[#0F766E] dark:text-emerald-300/80 tabular-nums">
                      Juz {entry.juz} · {entry.revelationPlace} · {entry.totalAyahs} Verses
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    dir="rtl"
                    className="font-quran-amiri text-xl font-bold text-[#003527] dark:text-amber-200"
                  >
                    {entry.nameArabic}
                  </span>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D97706]" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-[#064E3B]/45 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition-all dark:text-emerald-300/50 dark:group-hover:text-amber-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
