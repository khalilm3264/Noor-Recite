import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  BookmarkCollection,
  BookmarkItem,
  ReaderSettings,
  Surah,
  TranslationLanguage,
} from '../types/quran';
import { TRANSLATION_LANGUAGE_OPTIONS } from '../utils/translationConfig';
import {
  PdfExportOptions,
  PdfExportScope,
  PdfPageFormat,
  PdfPaperTheme,
  buildDefaultPdfExportOptions,
  buildPdfDocumentEntries,
  generateStyledPdfBlob,
  printStyledPdfCanvases,
  renderPdfPageCanvases,
  triggerPdfDownload,
} from '../utils/pdfExport';

interface PdfExportModalProps {
  isOpen: boolean;
  initialScope: PdfExportScope;
  surah: Surah;
  bookmarks: BookmarkItem[];
  collections: BookmarkCollection[];
  settings: ReaderSettings;
  knownSurahsById?: Record<number, Surah>;
  preselectedBookmarkKeys?: string[];
  initialCollectionFilter?: string;
  onEnsureSurahLanguage?: (lang: TranslationLanguage) => Promise<void>;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  initialScope,
  surah,
  bookmarks,
  collections,
  settings,
  knownSurahsById = {},
  preselectedBookmarkKeys,
  initialCollectionFilter = 'all',
  onEnsureSurahLanguage,
  onClose,
}) => {
  const [options, setOptions] = useState<PdfExportOptions>(() =>
    buildDefaultPdfExportOptions({
      scope: initialScope,
      surah,
      bookmarks,
      settings,
      preselectedBookmarkKeys,
    })
  );
  const [collectionFilter, setCollectionFilter] = useState<string>(initialCollectionFilter);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isHydratingLang, setIsHydratingLang] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewSeqRef = useRef(0);

  const minAyahNum = surah.ayahs[0]?.number ?? 1;
  const maxAyahNum = surah.ayahs[surah.ayahs.length - 1]?.number ?? Math.max(1, surah.totalAyahs);

  // Reset modal options whenever opened or target scope/surah changes on open
  useEffect(() => {
    if (!isOpen) return;
    setOptions(
      buildDefaultPdfExportOptions({
        scope: initialScope,
        surah,
        bookmarks,
        settings,
        preselectedBookmarkKeys,
      })
    );
    setCollectionFilter(initialCollectionFilter);
    setStatusMessage(null);
    setErrorMessage(null);
    setProgressLabel(null);
  }, [
    isOpen,
    initialScope,
    surah.id,
    initialCollectionFilter,
    preselectedBookmarkKeys,
  ]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const visibleBookmarks = useMemo(() => {
    if (collectionFilter === 'all') return bookmarks;
    return bookmarks.filter((b) => b.collectionId === collectionFilter);
  }, [bookmarks, collectionFilter]);

  const activeCollectionName = useMemo(() => {
    if (collectionFilter === 'all') return undefined;
    return collections.find((c) => c.id === collectionFilter)?.name;
  }, [collections, collectionFilter]);

  const prepared = useMemo(
    () =>
      buildPdfDocumentEntries({
        surah,
        bookmarks,
        collections,
        options,
        knownSurahsById,
        activeCollectionFilterName: activeCollectionName,
      }),
    [surah, bookmarks, collections, options, knownSurahsById, activeCollectionName]
  );

  // Render live Page 1 preview
  useEffect(() => {
    if (!isOpen) return;
    if (prepared.entries.length === 0) {
      setPreviewDataUrl(null);
      return;
    }

    const seq = ++previewSeqRef.current;
    setIsPreviewLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const previewDoc = {
          ...prepared,
          // Only measure first few verses for instant Page 1 preview
          entries: prepared.entries.slice(0, 6),
        };
        const canvases = await renderPdfPageCanvases(previewDoc, options, undefined, 1);
        if (previewSeqRef.current !== seq) return;
        const first = canvases[0];
        if (first) {
          setPreviewDataUrl(first.toDataURL('image/jpeg', 0.84));
        }
      } catch {
        if (previewSeqRef.current === seq) {
          setPreviewDataUrl(null);
        }
      } finally {
        if (previewSeqRef.current === seq) {
          setIsPreviewLoading(false);
        }
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isOpen, prepared, options]);

  if (!isOpen) return null;

  const selectedBookmarkSet = new Set(options.selectedBookmarkKeys);

  const handleToggleBookmarkKey = (verseKey: string) => {
    setOptions((prev) => {
      const next = new Set(prev.selectedBookmarkKeys);
      if (next.has(verseKey)) {
        next.delete(verseKey);
      } else {
        next.add(verseKey);
      }
      return { ...prev, selectedBookmarkKeys: Array.from(next) };
    });
  };

  const handleSelectVisibleBookmarks = () => {
    setOptions((prev) => {
      const next = new Set(prev.selectedBookmarkKeys);
      for (const bm of visibleBookmarks) {
        next.add(bm.verseKey);
      }
      return { ...prev, selectedBookmarkKeys: Array.from(next) };
    });
  };

  const handleClearVisibleBookmarks = () => {
    const visibleSet = new Set(visibleBookmarks.map((b) => b.verseKey));
    setOptions((prev) => ({
      ...prev,
      selectedBookmarkKeys: prev.selectedBookmarkKeys.filter((k) => !visibleSet.has(k)),
    }));
  };

  const handleCollectionFilterChange = (colId: string) => {
    setCollectionFilter(colId);
    const matching =
      colId === 'all'
        ? bookmarks.map((b) => b.verseKey)
        : bookmarks.filter((b) => b.collectionId === colId).map((b) => b.verseKey);
    setOptions((prev) => ({
      ...prev,
      selectedBookmarkKeys: matching,
    }));
  };

  const handleLanguageChange = async (lang: TranslationLanguage) => {
    setOptions((prev) => ({ ...prev, translationLanguage: lang }));
    if (onEnsureSurahLanguage) {
      setIsHydratingLang(true);
      try {
        await onEnsureSurahLanguage(lang);
      } finally {
        setIsHydratingLang(false);
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (prepared.entries.length === 0 || isExporting || isPrinting) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsExporting(true);
    try {
      const result = await generateStyledPdfBlob(prepared, options, (label) => {
        setProgressLabel(label);
      });
      triggerPdfDownload(result.blob, result.filename);
      setStatusMessage(
        `Saved ${result.filename} (${result.pageCount} ${result.pageCount === 1 ? 'page' : 'pages'}).`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to generate PDF document.'
      );
    } finally {
      setIsExporting(false);
      setProgressLabel(null);
    }
  };

  const handlePrintPdf = async () => {
    if (prepared.entries.length === 0 || isExporting || isPrinting) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsPrinting(true);
    try {
      await printStyledPdfCanvases(prepared, options, (label) => {
        setProgressLabel(label);
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to prepare print document.'
      );
    } finally {
      setIsPrinting(false);
      setProgressLabel(null);
    }
  };

  const isRangeModified =
    options.scope === 'surah' &&
    (options.ayahStart !== minAyahNum || options.ayahEnd !== maxAyahNum);

  const visibleSelectedCount = visibleBookmarks.filter((b) =>
    selectedBookmarkSet.has(b.verseKey)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#022C22]/55 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-export-modal-title"
        className="w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] text-[#022C22] dark:text-[#E6FFF4] shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#064E3B]/10 dark:bg-emerald-400/15 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="pdf-export-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight truncate"
              >
                Export Styled PDF Document
              </h2>
              <p className="text-xs text-[#404944] dark:text-emerald-200/80 truncate">
                Typeset Arabic script, localized translation, and study notes into a printable PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-[#404944] hover:bg-[#064E3B]/8 hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:bg-emerald-400/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Two-Column Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          {/* Left Column: Scope, Selection & Styling Controls */}
          <div className="space-y-5">
            {/* Scope Switcher */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/85">
                Export Source
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15">
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, scope: 'surah' }))}
                  className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    options.scope === 'surah'
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                      : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
                  }`}
                >
                  Surah {surah.nameSimple} ({surah.ayahs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, scope: 'bookmarks' }))}
                  className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    options.scope === 'bookmarks'
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                      : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
                  }`}
                >
                  Bookmarked Verses ({bookmarks.length})
                </button>
              </div>
            </div>

            {/* Scope-Specific Range or Bookmark Picker */}
            {options.scope === 'surah' ? (
              <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                      Surah {surah.id}: {surah.nameSimple}
                    </p>
                    <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                      {surah.nameMeaning} · {surah.revelationPlace} · {surah.ayahs.length} Verses
                    </p>
                  </div>
                  {isRangeModified && (
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          ayahStart: minAyahNum,
                          ayahEnd: maxAyahNum,
                        }))
                      }
                      className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold text-[#0F766E] dark:text-emerald-300 hover:bg-[#064E3B]/8 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Full Surah</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs">
                    <span className="font-medium text-[#404944] dark:text-emerald-200/80">
                      From Ayah
                    </span>
                    <input
                      type="number"
                      min={minAyahNum}
                      max={maxAyahNum}
                      value={options.ayahStart}
                      onChange={(e) => {
                        const val = Number(e.target.value) || minAyahNum;
                        setOptions((prev) => ({
                          ...prev,
                          ayahStart: Math.max(minAyahNum, Math.min(maxAyahNum, val)),
                        }));
                      }}
                      className="w-full min-h-[40px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    <span className="font-medium text-[#404944] dark:text-emerald-200/80">
                      To Ayah
                    </span>
                    <input
                      type="number"
                      min={minAyahNum}
                      max={maxAyahNum}
                      value={options.ayahEnd}
                      onChange={(e) => {
                        const val = Number(e.target.value) || maxAyahNum;
                        setOptions((prev) => ({
                          ...prev,
                          ayahEnd: Math.max(minAyahNum, Math.min(maxAyahNum, val)),
                        }));
                      }}
                      className="w-full min-h-[40px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#D97706] dark:text-amber-400" />
                    <span className="text-xs font-bold tabular-nums">
                      {visibleSelectedCount} of {visibleBookmarks.length} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {collections.length > 0 && (
                      <select
                        aria-label="Filter bookmarks by collection"
                        value={collectionFilter}
                        onChange={(e) => handleCollectionFilterChange(e.target.value)}
                        className="min-h-[34px] px-2.5 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                      >
                        <option value="all">All Bookmarks</option>
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={handleSelectVisibleBookmarks}
                      className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold text-[#0F766E] dark:text-emerald-300 hover:bg-[#064E3B]/8 whitespace-nowrap"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearVisibleBookmarks}
                      className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold text-[#404944] dark:text-emerald-200/75 hover:bg-[#064E3B]/8 whitespace-nowrap"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {visibleBookmarks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#404944] dark:text-emerald-200/75">
                    No bookmarked verses found in this view. Tap the bookmark icon on any Ayah while reading to save verses here.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#064E3B]/8 dark:divide-emerald-300/10 pr-1">
                    {visibleBookmarks.map((bm) => {
                      const checked = selectedBookmarkSet.has(bm.verseKey);
                      return (
                        <label
                          key={bm.verseKey}
                          className="flex items-start gap-3 py-2.5 cursor-pointer hover:bg-[#064E3B]/[0.03] dark:hover:bg-emerald-400/5 px-1.5 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleBookmarkKey(bm.verseKey)}
                            className="mt-1 h-4 w-4 rounded border-[#064E3B]/30 text-[#064E3B] focus:ring-[#D97706] accent-[#064E3B]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                                {bm.surahName} · {bm.verseKey}
                              </span>
                              {bm.note?.trim() && (
                                <span className="text-[11px] font-medium text-[#B45309] dark:text-amber-300 shrink-0">
                                  Has reflection
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#404944] dark:text-emerald-200/75 line-clamp-1 mt-0.5">
                              {bm.translation}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Content Inclusions */}
            <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-4 space-y-3">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Included Sections
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeTransliteration}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeTransliteration: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#064E3B]"
                  />
                  <span>Transliteration</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeTranslation}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeTranslation: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#064E3B]"
                  />
                  <span>Translation</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeTafsirOrNotes}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeTafsirOrNotes: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#064E3B]"
                  />
                  <span>
                    {options.scope === 'bookmarks'
                      ? 'Personal Reflections & Notes'
                      : 'Tafsir & Study Notes'}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeTajweedSummary}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        includeTajweedSummary: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#064E3B]"
                  />
                  <span>Tajweed Rule Summary</span>
                </label>

                {options.scope === 'surah' && (
                  <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={options.includeBismillah}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          includeBismillah: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#064E3B]"
                    />
                    <span>Opening Al-Isti&apos;ādhah &amp; Bismillah</span>
                  </label>
                )}
              </div>

              {options.includeTranslation && (
                <div className="pt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/10 flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="pdf-translation-lang"
                    className="text-xs font-medium text-[#404944] dark:text-emerald-200/80 flex items-center gap-2"
                  >
                    <span>Translation Language</span>
                    {isHydratingLang && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D97706]" />
                    )}
                  </label>
                  <select
                    id="pdf-translation-lang"
                    value={options.translationLanguage}
                    onChange={(e) =>
                      void handleLanguageChange(e.target.value as TranslationLanguage)
                    }
                    className="min-h-[38px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                  >
                    {TRANSLATION_LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.sub})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Paper Theme & Page Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                  Document Style
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15">
                  {(
                    [
                      { id: 'parchment', label: 'Parchment' },
                      { id: 'minimal', label: 'Clean Print' },
                    ] as { id: PdfPaperTheme; label: string }[]
                  ).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({ ...prev, paperTheme: theme.id }))
                      }
                      className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        options.paperTheme === theme.id
                          ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'text-[#404944] dark:text-emerald-200/80'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                  Page Size
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15">
                  {(
                    [
                      { id: 'a4', label: 'A4' },
                      { id: 'letter', label: 'US Letter' },
                    ] as { id: PdfPageFormat; label: string }[]
                  ).map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({ ...prev, pageFormat: fmt.id }))
                      }
                      className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        options.pageFormat === fmt.id
                          ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'text-[#404944] dark:text-emerald-200/80'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Document Preview */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-[#404944] dark:text-emerald-200/80">
              <span className="font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                Page 1 Preview
              </span>
              <span className="tabular-nums">
                {prepared.entries.length}{' '}
                {prepared.entries.length === 1 ? 'verse' : 'verses'} ·{' '}
                {options.pageFormat === 'a4' ? 'A4' : 'Letter'}
              </span>
            </div>

            <div className="flex-1 min-h-[340px] rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#EEF4F1] dark:bg-[#021510] p-4 flex items-center justify-center overflow-hidden">
              {prepared.entries.length === 0 ? (
                <div className="text-center space-y-2 max-w-xs">
                  <FileText className="w-8 h-8 mx-auto text-[#0F766E]/50 dark:text-emerald-300/50" />
                  <p className="text-xs font-medium text-[#404944] dark:text-emerald-200/75">
                    Select at least one verse on the left to preview and export your styled PDF document.
                  </p>
                </div>
              ) : isPreviewLoading && !previewDataUrl ? (
                <div className="flex flex-col items-center gap-2 text-xs text-[#404944] dark:text-emerald-200/80">
                  <Loader2 className="w-5 h-5 animate-spin text-[#064E3B] dark:text-emerald-300" />
                  <span>Rendering document preview...</span>
                </div>
              ) : previewDataUrl ? (
                <div className="relative w-full max-w-[320px] shadow-lg rounded-md overflow-hidden border border-[#064E3B]/15 bg-white">
                  <img
                    src={previewDataUrl}
                    alt={`Preview of ${prepared.meta.title}`}
                    className="w-full h-auto block"
                  />
                  {isPreviewLoading && (
                    <div className="absolute top-2 right-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#064E3B] shadow-xs flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Updating</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
              File: <span className="font-mono">{prepared.meta.suggestedFilename}</span>
            </p>
          </div>
        </div>

        {/* Status / Error Feedback & Footer Action Bar */}
        <div className="px-5 py-4 border-t border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1 text-xs">
            {errorMessage ? (
              <p role="alert" className="font-medium text-[#BA1A1A] dark:text-rose-300">
                {errorMessage}
              </p>
            ) : progressLabel ? (
              <p className="font-medium text-[#0F766E] dark:text-emerald-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="truncate">{progressLabel}</span>
              </p>
            ) : statusMessage ? (
              <p className="font-medium text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                <span className="truncate">{statusMessage}</span>
              </p>
            ) : (
              <p className="text-[#404944] dark:text-emerald-200/75 truncate">
                {options.scope === 'surah'
                  ? `Ready to export ${prepared.entries.length} verses from Surah ${surah.nameSimple}`
                  : `Ready to export ${prepared.entries.length} bookmarked verses`}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#404944] dark:text-emerald-200 hover:bg-[#064E3B]/5 transition-colors whitespace-nowrap shrink-0"
            >
              Close
            </button>

            <button
              type="button"
              disabled={prepared.entries.length === 0 || isExporting || isPrinting}
              onClick={() => void handlePrintPdf()}
              className="min-h-[42px] px-4 rounded-xl border border-[#064E3B]/20 dark:border-emerald-300/25 bg-white dark:bg-[#041D17] text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Print</span>
            </button>

            <button
              type="button"
              disabled={prepared.entries.length === 0 || isExporting || isPrinting}
              onClick={() => void handleDownloadPdf()}
              className="min-h-[42px] px-5 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-bold disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors shadow-xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
