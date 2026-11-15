import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Edit3,
  FolderPlus,
  Layers,
  Play,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BookmarkCollection, BookmarkItem, TranslationLanguage } from '../types/quran';
import { TAJWEED_RULES } from '../data/tajweedRules';
import { RubElHizbBadge } from './RubElHizbIcon';
import { getTranslationTextClass, isRtlTranslationLang } from '../utils/translationConfig';

interface BookmarksViewProps {
  bookmarks: BookmarkItem[];
  versesRecitedCount: number;
  dailyGoal: number;
  collections?: BookmarkCollection[];
  onCreateCollection?: (name: string, description: string) => void;
  onUpdateBookmark?: (verseKey: string, patch: Partial<BookmarkItem>) => void;
  onJumpToTopic?: () => void;
  lastReadInfo?: { surahId: number; surahName: string; ayahNumber: number };
  onChangeDailyGoal: (goal: number) => void;
  onJumpToVerse: (surahId: number, ayahNumber: number, autoPlay?: boolean) => void;
  onRemoveBookmark: (verseKey: string) => void;
}

type HubTab = 'saved' | 'collections' | 'rules';

const QUICK_JUMP_PILLS = [
  { label: 'Al-Fātiḥah 1:1', surahId: 1, ayahNumber: 1 },
  { label: 'Āyat al-Kursī 2:255', surahId: 2, ayahNumber: 255 },
  { label: 'Ash-Sharḥ 94:5', surahId: 94, ayahNumber: 5 },
  { label: 'Al-Ikhlāṣ 112:1', surahId: 112, ayahNumber: 1 },
] as const;

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  bookmarks,
  versesRecitedCount,
  dailyGoal,
  collections = [],
  onCreateCollection,
  onUpdateBookmark,
  onJumpToTopic,
  lastReadInfo,
  onChangeDailyGoal,
  onJumpToVerse,
  onRemoveBookmark,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string>('all');
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const ratio = Math.min(1, versesRecitedCount / Math.max(1, dailyGoal));
  const circumference = 2 * Math.PI * 26;
  const strokeOffset = circumference * (1 - ratio);

  const filteredBookmarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookmarks.filter((bm) => {
      if (selectedCollectionFilter !== 'all' && bm.collectionId !== selectedCollectionFilter) {
        return false;
      }
      if (!q) return true;
      return (
        bm.surahName.toLowerCase().includes(q) ||
        bm.verseKey.toLowerCase().includes(q) ||
        bm.translation.toLowerCase().includes(q) ||
        bm.note.toLowerCase().includes(q) ||
        bm.arabic.includes(q)
      );
    });
  }, [bookmarks, searchQuery, selectedCollectionFilter]);

  const handleSaveInlineNote = (verseKey: string) => {
    onUpdateBookmark?.(verseKey, { note: draftNote.trim() });
    setEditingNoteKey(null);
  };

  const handleCreateColSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || !onCreateCollection) return;
    onCreateCollection(newColName.trim(), newColDesc.trim() || 'Curated verses & reflection list');
    setNewColName('');
    setNewColDesc('');
    setShowNewCollectionForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      {/* Header + Session Cadence Ring */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Search &amp; Bookmarks Hub
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80">
            Search saved verses, organize thematic playlists, edit contemplation notes, and pin core Tajweed rules.
          </p>
        </div>

        <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] px-4 py-3 flex items-center gap-4 ayah-card-resting shrink-0">
          <svg className="w-16 h-16 -rotate-90 shrink-0" viewBox="0 0 64 64" aria-hidden="true">
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              className="stroke-[#064E3B]/12 dark:stroke-emerald-300/15"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              className="stroke-[#D97706] dark:stroke-amber-400 transition-all duration-300"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#404944] dark:text-emerald-200/80">
              Session Recitation
            </p>
            <p className="text-lg font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
              {versesRecitedCount} / {dailyGoal} verses
            </p>
            <div className="flex items-center gap-1.5">
              {[10, 20, 30].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChangeDailyGoal(g)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums transition-colors ${
                    dailyGoal === g
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'bg-[#064E3B]/8 text-[#404944] dark:bg-emerald-400/10 dark:text-emerald-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Reading Resume Pin Banner */}
      {lastReadInfo && (
        <section className="rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-gradient-to-r from-[#064E3B]/[0.04] via-[#FEF3C7]/40 to-white dark:from-[#0A2921] dark:via-amber-950/20 dark:to-[#07261E] px-5 py-4 flex flex-wrap items-center justify-between gap-3 ayah-card-resting">
          <div className="flex items-center gap-3">
            <RubElHizbBadge className="w-9 h-9" label={lastReadInfo.ayahNumber} active />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#904D00] dark:text-amber-300">
                Active Resume Pin
              </p>
              <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Continue Reciting: {lastReadInfo.surahName} · Ayah {lastReadInfo.ayahNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJumpToVerse(lastReadInfo.surahId, lastReadInfo.ayahNumber, false)}
              className="min-h-[38px] px-3.5 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5"
            >
              Open Muṣḥaf
            </button>
            <button
              type="button"
              onClick={() => onJumpToVerse(lastReadInfo.surahId, lastReadInfo.ayahNumber, true)}
              className="min-h-[38px] px-4 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22] text-[#FEF3C7] text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Audio</span>
            </button>
          </div>
        </section>
      )}

      {/* Search Bar + Quick Jump Tags */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#707974] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved verses, surah names, or your personal contemplation notes..."
            aria-label="Search bookmarks and notes"
            className="w-full min-h-[46px] pl-11 pr-4 rounded-2xl border border-[#064E3B]/14 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-sm text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#404944] dark:text-emerald-200/75 mr-1">
            Quick Jump:
          </span>
          {QUICK_JUMP_PILLS.map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => onJumpToVerse(pill.surahId, pill.ayahNumber, false)}
              className="px-2.5 py-1 rounded-full border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-[11px] font-semibold text-[#0F766E] dark:text-emerald-300 hover:border-[#D97706] hover:text-[#904D00] dark:hover:text-amber-300 transition-colors"
            >
              {pill.label}
            </button>
          ))}
          {onJumpToTopic && (
            <button
              type="button"
              onClick={onJumpToTopic}
              className="ml-auto px-3 py-1 rounded-full bg-[#D97706]/12 text-[#904D00] dark:bg-amber-400/15 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-[#D97706]/20 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Browse Topics</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Hub Switcher */}
      <div
        role="tablist"
        aria-label="Bookmarks hub sections"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15"
      >
        {(
          [
            { id: 'saved', label: `Saved Ayahs (${bookmarks.length})` },
            { id: 'collections', label: `Collections (${collections.length})` },
            { id: 'rules', label: 'Tajweed & Quick Rules' },
          ] as { id: HubTab; label: string }[]
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                  : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'collections' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E] dark:text-emerald-300" />
              <span>Recitation Collections &amp; Playlists</span>
            </h2>
            {onCreateCollection && (
              <button
                type="button"
                onClick={() => setShowNewCollectionForm((s) => !s)}
                className="min-h-[36px] px-3.5 rounded-xl bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{showNewCollectionForm ? 'Cancel' : 'New Collection'}</span>
              </button>
            )}
          </div>

          {showNewCollectionForm && (
            <form
              onSubmit={handleCreateColSubmit}
              className="rounded-2xl border border-[#D97706]/35 bg-white dark:bg-[#0A2921] p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Collection name (e.g. Friday Night Wird)"
                  className="min-h-[40px] px-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#F5FFFA] dark:bg-[#041D17] text-xs text-[#022C22] dark:text-[#E6FFF4]"
                />
                <input
                  type="text"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Brief focus note (optional)"
                  className="min-h-[40px] px-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#F5FFFA] dark:bg-[#041D17] text-xs text-[#022C22] dark:text-[#E6FFF4]"
                />
              </div>
              <button
                type="submit"
                className="min-h-[38px] px-4 rounded-xl bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] text-xs font-bold"
              >
                Save Collection
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {collections.map((col) => {
              const count = bookmarks.filter((b) => b.collectionId === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setSelectedCollectionFilter(col.id);
                    setActiveTab('saved');
                  }}
                  className="text-left rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-4 space-y-2 hover:border-[#D97706] transition-colors ayah-card-resting"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                      {col.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#064E3B]/8 dark:bg-emerald-400/12 text-[11px] font-bold text-[#0F766E] dark:text-emerald-300 tabular-nums shrink-0">
                      {count} verses
                    </span>
                  </div>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/80 line-clamp-2">
                    {col.description}
                  </p>
                  <p className="text-[10.5px] font-medium text-[#D97706] dark:text-amber-300">
                    Open filtered playlist &rarr;
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {TAJWEED_RULES.map((rule) => (
            <div
              key={rule.type}
              className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-4 space-y-2 ayah-card-resting"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  {rule.name}
                </h3>
                <span dir="rtl" className="font-quran-amiri text-lg font-bold text-[#D97706] dark:text-amber-300">
                  {rule.arabicName}
                </span>
              </div>
              <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                {rule.tagline} · <strong className="text-[#064E3B] dark:text-emerald-300">{rule.harakatCount}</strong>
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-medium text-[#0F766E] dark:text-emerald-300">
                  {rule.exampleFocus} ({rule.exampleVerseKey})
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToVerse(rule.exampleSurahId, rule.exampleAyahNumber, true)}
                  className="px-2.5 py-1 rounded-lg bg-[#064E3B]/8 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200 text-[11px] font-bold hover:bg-[#064E3B] hover:text-white transition-colors"
                >
                  Hear Example
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-4">
          {selectedCollectionFilter !== 'all' && (
            <div className="flex items-center justify-between rounded-xl bg-[#064E3B]/6 dark:bg-emerald-400/10 px-3.5 py-2 text-xs">
              <span className="font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                Filtering by collection:{' '}
                {collections.find((c) => c.id === selectedCollectionFilter)?.name ?? 'Custom'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCollectionFilter('all')}
                className="font-bold text-[#D97706] dark:text-amber-300 hover:underline"
              >
                Show All Saved
              </button>
            </div>
          )}

          {filteredBookmarks.length === 0 ? (
            <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-12 text-center space-y-3 ayah-card-resting">
              <RubElHizbBadge className="w-12 h-12 mx-auto" active />
              <h2 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                {searchQuery.trim() ? `No matches for "${searchQuery}"` : 'No Saved Verses Yet'}
              </h2>
              <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-md mx-auto">
                Tap the bookmark icon on any Ayah card or save a personal reflection inside the Lexicon panel to build your study journal.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookmarks.map((bm) => {
                const isEditing = editingNoteKey === bm.verseKey;
                const inferredLang: TranslationLanguage =
                  bm.translationLanguage ??
                  (/[\u0600-\u06FF]/.test(bm.translation) && !/[A-Za-z]/.test(bm.translation)
                    ? 'ur'
                    : /[\u0900-\u097F]/.test(bm.translation)
                    ? 'hi'
                    : /[\u0980-\u09FF]/.test(bm.translation)
                    ? 'bn'
                    : /[ɓɗƙƴŋƁƊƘƳŊ]/.test(bm.translation)
                    ? 'ha'
                    : 'en');

                return (
                  <article
                    key={bm.verseKey}
                    className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 sm:p-6 ayah-card-resting space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
                      <div className="flex items-center gap-3">
                        <RubElHizbBadge className="w-8 h-8" label={bm.ayahNumber} active />
                        <div>
                          <h2 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                            {bm.surahName} · {bm.verseKey}
                          </h2>
                          <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                            Saved {bm.savedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {collections.length > 0 && onUpdateBookmark && (
                          <select
                            aria-label={`Assign collection for ${bm.verseKey}`}
                            value={bm.collectionId ?? ''}
                            onChange={(e) =>
                              onUpdateBookmark(bm.verseKey, {
                                collectionId: e.target.value || undefined,
                              })
                            }
                            className="min-h-[36px] px-2.5 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#F5FFFA] dark:bg-[#041D17] text-[11px] font-semibold text-[#022C22] dark:text-[#E6FFF4]"
                          >
                            <option value="">No Playlist</option>
                            {collections.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => onJumpToVerse(bm.surahId, bm.ayahNumber, true)}
                          className="min-h-[38px] px-3 rounded-lg bg-[#064E3B]/8 hover:bg-[#064E3B] text-[#064E3B] hover:text-white dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Recite</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onJumpToVerse(bm.surahId, bm.ayahNumber, false)}
                          className="min-h-[38px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 dark:hover:bg-emerald-400/10 flex items-center gap-1.5 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveBookmark(bm.verseKey)}
                          aria-label={`Delete bookmark ${bm.verseKey}`}
                          className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center text-[#707974] hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p
                      dir="rtl"
                      className="font-quran-amiri text-2xl sm:text-3xl leading-[2.0] text-[#022C22] dark:text-[#E6FFF4]"
                    >
                      {bm.arabic}
                    </p>

                    <p
                      dir={isRtlTranslationLang(inferredLang) ? 'rtl' : 'ltr'}
                      className={`text-[#022C22]/85 dark:text-[#D0FAEA]/90 ${getTranslationTextClass(
                        inferredLang,
                        'card'
                      )}`}
                    >
                      {bm.translation}
                    </p>

                    <div className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#0F766E] dark:text-emerald-300">
                          Personal Reflection
                        </p>
                        {onUpdateBookmark && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraftNote(bm.note);
                              setEditingNoteKey(bm.verseKey);
                            }}
                            className="text-[11px] font-semibold text-[#D97706] dark:text-amber-300 inline-flex items-center gap-1 hover:underline"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{bm.note ? 'Edit Note' : 'Add Note'}</span>
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="Write your Tadabbur reflection..."
                            className="w-full rounded-xl border border-[#064E3B]/20 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] px-3 py-2 text-xs text-[#022C22] dark:text-[#E6FFF4]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveInlineNote(bm.verseKey)}
                              className="px-3 py-1 rounded-lg bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-bold inline-flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save Note</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNoteKey(null)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#404944] dark:text-emerald-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : bm.note ? (
                        <p className="text-sm text-[#022C22] dark:text-[#E6FFF4] whitespace-pre-wrap">
                          {bm.note}
                        </p>
                      ) : (
                        <p className="text-xs italic text-[#404944]/70 dark:text-emerald-200/60">
                          No personal note added yet.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
