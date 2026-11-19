import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookOpenText, Check, ChevronDown, ChevronUp, Copy, Heart, Pause, Play } from 'lucide-react';
import { Ayah, ReaderSettings, TranslationLanguage, WordToken } from '../types/quran';
import { TAJWEED_STYLE_MAP } from '../data/tajweedRules';
import { getWordDisplayArabic } from '../data/qiraatData';
import { getAyahFootnotes } from '../data/wordFootnotes';
import { copyTextToClipboard, formatAyahClipboardText } from '../utils/clipboard';
import {
  getAyahTranslationSegments,
  getAyahTranslationText,
  getTranslationTextClass,
  getWordMeaningText,
  hasLocalizedWordMeaning,
  isRtlTranslationLang,
  resolveEffectiveSyncedWordIndex,
} from '../utils/translationConfig';
import { joinTranslationTokens, tokenizeTranslationForAlignment } from '../data/quranData';
import { RubElHizbBadge } from './RubElHizbIcon';

interface AyahCardProps {
  ayah: Ayah;
  isActive: boolean;
  isPlaying: boolean;
  activeWordIndex: number | null;
  selectedWordId: string | null;
  isBookmarked: boolean;
  isFavorited?: boolean;
  settings: ReaderSettings;
  onPlayAyah: (ayahNumber: number) => void;
  onSelectWord: (ayah: Ayah, word: WordToken, wordIndex: number) => void;
  onInspectAyah: (ayah: Ayah) => void;
  onToggleBookmark: (ayah: Ayah) => void;
  onToggleFavorite?: (ayah: Ayah) => void;
}

function toArabicIndicDigits(n: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n)
    .split('')
    .map((d) => digits[Number(d)] ?? d)
    .join('');
}

function buildTranslationSpans(
  translation: string,
  words: WordToken[],
  lang: TranslationLanguage = 'en'
): string[] {
  const tokens = tokenizeTranslationForAlignment(translation, lang);
  if (words.length === 0 || tokens.length === 0) {
    return [translation];
  }
  if (words.length === 1) {
    return [joinTranslationTokens(tokens, lang)];
  }

  // Weight each Arabic word by its localized gloss word count (or Arabic length when unglossed)
  const weights = words.map((w) => {
    if (!hasLocalizedWordMeaning(w, lang)) {
      return Math.max(1, w.arabic.replace(/[\u064B-\u065F\u0670]/g, '').length);
    }
    const rawGloss = getWordMeaningText(w, lang);
    const cleanMeaning = (rawGloss || '').replace(/\//g, ' ').trim();
    if (!cleanMeaning || cleanMeaning.startsWith('Tap Ayah')) {
      return Math.max(1, w.arabic.length);
    }
    return Math.max(1, tokenizeTranslationForAlignment(cleanMeaning, lang).length);
  });

  const totalWeight = weights.reduce((sum, val) => sum + val, 0);
  const spans: string[] = [];
  let cursor = 0;
  let cumulativeWeight = 0;

  for (let i = 0; i < words.length; i++) {
    cumulativeWeight += weights[i];
    const targetEnd =
      i === words.length - 1
        ? tokens.length
        : Math.min(
            tokens.length,
            Math.max(cursor, Math.round((cumulativeWeight / totalWeight) * tokens.length))
          );
    spans.push(joinTranslationTokens(tokens.slice(cursor, targetEnd), lang));
    cursor = targetEnd;
  }

  return spans;
}

export const AyahCard: React.FC<AyahCardProps> = React.memo(({
  ayah,
  isActive,
  isPlaying,
  activeWordIndex,
  selectedWordId,
  isBookmarked,
  isFavorited = false,
  settings,
  onPlayAyah,
  onSelectWord,
  onInspectAyah,
  onToggleBookmark,
  onToggleFavorite,
}) => {
  const [focusedFootnoteNum, setFocusedFootnoteNum] = useState<number | null>(null);
  const [localExpandOverride, setLocalExpandOverride] = useState<boolean | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalExpandOverride(null);
  }, [settings.alwaysShowFootnotes]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyAyah = async () => {
    const payload = formatAyahClipboardText(ayah, settings);
    const ok = await copyTextToClipboard(payload);
    if (!ok) return;
    setCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 2000);
  };

  const highlightStyle = settings.highlightStyle ?? 'pill';
  const activeWordClasses =
    highlightStyle === 'wave'
      ? 'transition-none rounded-none border-[1.5px] border-transparent underline decoration-wavy decoration-[#D97706] dark:decoration-amber-400 decoration-2 underline-offset-8 text-[#003527] dark:text-amber-200 font-bold'
      : highlightStyle === 'box'
      ? 'transition-none rounded-xl bg-[#064E3B]/[0.12] dark:bg-emerald-400/20 border-[1.5px] border-[#064E3B]/30 dark:border-emerald-300/40 text-[#003527] dark:text-[#E6FFF4]'
      : highlightStyle === 'glow'
      ? 'transition-none rounded-full border-[1.5px] border-transparent text-[#B45309] dark:text-amber-300 font-bold [text-shadow:0_0_16px_rgba(217,119,6,0.45)]'
      : 'transition-none rounded-full bg-[#064E3B]/[0.08] dark:bg-amber-400/15 border-[1.5px] border-[#D97706] dark:border-amber-400 text-[#003527] dark:text-amber-100 word-glow-active';

  const areAllFootnotesOpen =
    localExpandOverride !== null ? localExpandOverride : settings.alwaysShowFootnotes;

  const fontClass =
    settings.arabicFont === 'scheherazade' ? 'font-quran-scheherazade' : 'font-quran-amiri';

  const ayahFootnotes = useMemo(() => getAyahFootnotes(ayah.words), [ayah.words]);
  const footnoteByWordIndex = useMemo(() => {
    const map = new Map<number, (typeof ayahFootnotes)[number]>();
    for (const item of ayahFootnotes) {
      map.set(item.wordIndex, item);
    }
    return map;
  }, [ayahFootnotes]);

  const selectedWordIdx = isActive && selectedWordId
    ? ayah.words.findIndex((w) => w.id === selectedWordId)
    : -1;
  const syncedIndex =
    isActive && activeWordIndex !== null
      ? activeWordIndex
      : isActive && selectedWordIdx >= 0
      ? selectedWordIdx
      : null;

  const hasWordTranslit =
    ayah.words.length > 0 && ayah.words.every((w) => Boolean(w.transliteration?.trim()));

  const requestedLang: TranslationLanguage = settings.translationLanguage ?? 'en';
  const { text: activeTranslation, resolvedLang: displayedLang } =
    getAyahTranslationText(ayah, requestedLang);

  const resolvedTranslationSegments = useMemo(() => {
    const precomputed = getAyahTranslationSegments(ayah, displayedLang);
    if (precomputed && precomputed.length > 0) {
      return precomputed;
    }
    return buildTranslationSpans(activeTranslation, ayah.words, displayedLang)
      .map((text, wordIndex) => ({ text, wordIndex }))
      .filter((s) => Boolean(s.text));
  }, [
    displayedLang,
    activeTranslation,
    ayah,
  ]);

  const effectiveTranslationWordIdx = useMemo(
    () => resolveEffectiveSyncedWordIndex(syncedIndex, resolvedTranslationSegments),
    [syncedIndex, resolvedTranslationSegments]
  );

  // Place each footnote superscript once on the final segment mapped to that word
  const lastSegmentIdxForWord = useMemo(() => {
    const map = new Map<number, number>();
    resolvedTranslationSegments.forEach((seg, idx) => {
      map.set(seg.wordIndex, idx);
    });
    return map;
  }, [resolvedTranslationSegments]);

  const visibleFootnotes = areAllFootnotesOpen
    ? ayahFootnotes
    : focusedFootnoteNum !== null
    ? ayahFootnotes.filter((f) => f.number === focusedFootnoteNum)
    : [];

  return (
    <article
      id={`ayah-${ayah.number}`}
      className={`scroll-mt-6 rounded-2xl p-4 sm:p-7 transition-all duration-300 ease-out ${
        isActive
          ? 'ayah-card-active border-[1.5px] border-[#D97706]/45 dark:border-amber-400/50 bg-gradient-to-b from-[#064E3B]/[0.025] to-[#D97706]/[0.045] dark:from-emerald-950/70 dark:to-amber-950/25'
          : 'ayah-card-resting border border-[#064E3B]/8 dark:border-emerald-300/12 bg-white dark:bg-[#0A2921]/90 hover:border-[#064E3B]/18 dark:hover:border-emerald-300/24'
      }`}
    >
      {/* Card Header: Verse Badge + Unboxed Meta + Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 pb-3.5 sm:pb-4 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <RubElHizbBadge className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" label={ayah.number} active={isActive} />
          <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-xs font-medium text-[#404944] dark:text-emerald-200/80 min-w-0">
            <span className="font-semibold text-[#022C22] dark:text-[#E6FFF4] tabular-nums">
              {ayah.verseKey}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Juz {ayah.juz}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{Math.round(ayah.durationSec)}s</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onInspectAyah(ayah)}
            title="Study Tajweed & Lexicon"
            aria-label={`Study Tajweed and Lexicon for verse ${ayah.verseKey}`}
            className="min-h-[40px] px-2.5 rounded-lg text-xs font-medium text-[#0F766E] hover:bg-[#064E3B]/6 dark:text-emerald-300 dark:hover:bg-emerald-400/10 transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            <BookOpenText className="w-4 h-4" />
            <span className="hidden sm:inline">Lexicon</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyAyah()}
            aria-label={copied ? `Copied verse ${ayah.verseKey}` : `Copy verse ${ayah.verseKey} to clipboard`}
            title={copied ? 'Copied!' : 'Copy Arabic & translation'}
            className={`min-h-[40px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              copied
                ? 'text-[#064E3B] bg-[#064E3B]/10 dark:text-emerald-300 dark:bg-emerald-400/15'
                : 'text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200/75 dark:hover:text-emerald-200 dark:hover:bg-emerald-400/10'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(ayah)}
              aria-pressed={isFavorited}
              aria-label={isFavorited ? `Remove verse ${ayah.verseKey} from favorites` : `Favorite verse ${ayah.verseKey}`}
              title={isFavorited ? 'Favorited' : 'Favorite Verse'}
              className={`min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                isFavorited
                  ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-400/15'
                  : 'text-[#404944] hover:text-rose-600 hover:bg-rose-500/6 dark:text-emerald-200/75 dark:hover:text-rose-300 dark:hover:bg-rose-400/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleBookmark(ayah)}
            aria-label={isBookmarked ? `Remove bookmark for ${ayah.verseKey}` : `Bookmark ${ayah.verseKey}`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark Verse'}
            className={`min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              isBookmarked
                ? 'text-[#D97706] bg-[#D97706]/10 dark:text-amber-400 dark:bg-amber-400/15'
                : 'text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200/75 dark:hover:text-emerald-200 dark:hover:bg-emerald-400/10'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onPlayAyah(ayah.number)}
            aria-label={isActive && isPlaying ? `Pause verse ${ayah.verseKey}` : `Recite verse ${ayah.verseKey}`}
            title={isActive && isPlaying ? 'Pause' : 'Recite Verse'}
            className={`min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              isActive && isPlaying
                ? 'bg-[#D97706] text-white shadow-sm dark:bg-amber-400 dark:text-[#022C22]'
                : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-400 dark:hover:text-[#022C22]'
            }`}
          >
            {isActive && isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Sacred Arabic Text Block with Synchronized Word Pills */}
      <div
        dir="rtl"
        className={`pt-6 pb-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 ${fontClass}`}
        style={{
          fontSize: `${settings.arabicFontSize}px`,
          lineHeight: 2.0,
        }}
      >
        {ayah.words.map((word, idx) => {
          const isWordVocalized = isActive && activeWordIndex === idx;
          const isWordSelected = selectedWordId === word.id;
          const tajweedStyle =
            settings.showTajweedColors && word.tajweed
              ? TAJWEED_STYLE_MAP[word.tajweed]
              : null;

          const localizedMeaning = getWordMeaningText(word, requestedLang);

              const displayedArabic = getWordDisplayArabic(
                ayah,
                word,
                settings.riwayah,
                settings.maghrebiOrthography
              );
              if (settings.riwayah === 'warsh' && word.arabicWarsh === '') {
                return null;
              }
              return (
                <button
                  key={word.id}
                  type="button"
                  data-active-word={isWordVocalized ? 'true' : undefined}
                  onClick={() => onSelectWord(ayah, word, idx)}
                  title={`${word.transliteration} · ${localizedMeaning}`}
                  className={`min-h-[44px] px-2.5 py-0.5 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    isWordVocalized
                      ? activeWordClasses
                      : isWordSelected
                      ? 'rounded-full bg-[#0F766E]/10 dark:bg-emerald-400/15 border border-[#0F766E]/40 dark:border-emerald-300/40 text-[#022C22] dark:text-[#E6FFF4]'
                      : 'rounded-full border-[1.5px] border-transparent hover:bg-[#064E3B]/[0.05] dark:hover:bg-emerald-400/10 ' +
                        (tajweedStyle
                          ? tajweedStyle.wordTint
                          : 'text-[#022C22] dark:text-[#E6FFF4]')
                  }`}
                >
                  <span>{displayedArabic}</span>
                </button>
              );
            })}

        {/* Ornate Ayah Number Terminal */}
        <span
          className={`inline-flex items-center justify-center px-1.5 text-[0.78em] select-none ${
            isActive
              ? 'text-[#D97706] dark:text-amber-300'
              : 'text-[#0F766E]/75 dark:text-emerald-300/70'
          }`}
          aria-hidden="true"
        >
          ﴿{toArabicIndicDigits(ayah.number)}﴾
        </span>
      </div>

      {/* Synchronized Transliteration & Non-Linear English Translation */}
      {(settings.showTransliteration || settings.showTranslation) && (
        <div className="space-y-2.5 pt-2 min-w-0 break-words">
          {settings.showTransliteration && (
            <p className="text-[14px] font-medium italic leading-[24px] tracking-[0.01em] break-words">
              {hasWordTranslit ? (
                ayah.words.map((word, idx) => {
                  const isSynced = syncedIndex === idx;
                  const isPast = syncedIndex !== null && idx < syncedIndex;
                  return (
                    <React.Fragment key={word.id}>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectWord(ayah, word, idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectWord(ayah, word, idx);
                          }
                        }}
                        className={`cursor-pointer rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                          isSynced
                            ? 'transition-none bg-[#D97706]/16 text-[#904D00] dark:bg-amber-400/22 dark:text-amber-200 underline decoration-[#D97706] dark:decoration-amber-400 decoration-2 underline-offset-4 font-semibold not-italic'
                            : isPast
                            ? 'text-[#064E3B] dark:text-emerald-200'
                            : syncedIndex !== null
                            ? 'text-[#0F766E]/55 dark:text-emerald-300/50 hover:text-[#0F766E] dark:hover:text-emerald-300'
                            : 'text-[#0F766E] dark:text-emerald-300/90 hover:bg-[#064E3B]/5 dark:hover:bg-emerald-400/10'
                        }`}
                      >
                        {word.transliteration}
                      </span>
                      {idx < ayah.words.length - 1 ? ' ' : ''}
                    </React.Fragment>
                  );
                })
              ) : (
                <span className="text-[#0F766E] dark:text-emerald-300/90">
                  {ayah.transliteration}
                </span>
              )}
            </p>
          )}

          {settings.showTranslation && (
            <p
              dir={isRtlTranslationLang(displayedLang) ? 'rtl' : 'ltr'}
              className={getTranslationTextClass(displayedLang, 'ayah')}
            >
              {resolvedTranslationSegments.map((seg, segIdx) => {
                const word = ayah.words[seg.wordIndex];
                const isSynced = effectiveTranslationWordIdx === seg.wordIndex;
                const isPast =
                  effectiveTranslationWordIdx !== null &&
                  seg.wordIndex < effectiveTranslationWordIdx;
                const fnItem = footnoteByWordIndex.get(seg.wordIndex);
                const showSuperscript =
                  Boolean(fnItem) &&
                  lastSegmentIdxForWord.get(seg.wordIndex) === segIdx;
                const isFnOpen =
                  fnItem !== undefined &&
                  (areAllFootnotesOpen || focusedFootnoteNum === fnItem.number);
                const isFnFocused =
                  fnItem !== undefined && focusedFootnoteNum === fnItem.number;

                return (
                  <React.Fragment key={`${seg.wordIndex}-${segIdx}`}>
                    <span
                      role={word ? 'button' : undefined}
                      tabIndex={word ? 0 : undefined}
                      onClick={() => word && onSelectWord(ayah, word, seg.wordIndex)}
                      onKeyDown={(e) => {
                        if (word && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSelectWord(ayah, word, seg.wordIndex);
                        }
                      }}
                      className={`rounded ${displayedLang === 'zh' && !isSynced ? 'px-0' : 'px-0.5'} py-0.5 ${
                        word ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]' : ''
                      } ${
                        isSynced
                          ? 'transition-none bg-[#D97706]/16 text-[#003527] dark:bg-amber-400/20 dark:text-amber-100 underline decoration-[#D97706]/85 dark:decoration-amber-400/85 decoration-2 underline-offset-4 font-semibold'
                          : isPast
                          ? 'text-[#022C22] dark:text-[#E6FFF4]'
                          : syncedIndex !== null
                          ? 'text-[#022C22]/55 dark:text-[#D0FAEA]/55 hover:text-[#022C22]/85 dark:hover:text-[#D0FAEA]/85'
                          : 'text-[#022C22]/90 dark:text-[#D0FAEA]/90 hover:bg-[#064E3B]/[0.04] dark:hover:bg-emerald-400/10'
                      }`}
                    >
                      {seg.text}
                    </span>
                    {showSuperscript && fnItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedFootnoteNum((prev) =>
                            prev === fnItem.number ? null : fnItem.number
                          );
                        }}
                        aria-expanded={isFnOpen}
                        aria-label={`Read linguistic footnote ${fnItem.number}: ${fnItem.footnote.term}`}
                        title={`Footnote ${fnItem.number}: ${fnItem.footnote.term}`}
                        className={`inline-flex items-center justify-center align-super text-[10px] font-bold leading-none ml-0.5 px-1 py-0.5 rounded tabular-nums cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                          isFnFocused
                            ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                            : 'text-[#0F766E] hover:text-[#D97706] hover:bg-[#064E3B]/8 dark:text-amber-300 dark:hover:bg-amber-400/15'
                        }`}
                      >
                        {fnItem.number}
                      </button>
                    )}
                    {segIdx < resolvedTranslationSegments.length - 1 &&
                    displayedLang !== 'zh'
                      ? ' '
                      : ''}
                  </React.Fragment>
                );
              })}
            </p>
          )}
        </div>
      )}

      {/* Inline Read Tafsir Toggle & Drawer */}
      {ayah.tafsirBrief && (
        <div className="mt-3 pt-2.5 border-t border-[#064E3B]/6 dark:border-emerald-300/10">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowTafsir((v) => !v)}
              aria-expanded={showTafsir}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-200 transition-colors cursor-pointer py-1"
            >
              <BookOpenText className="w-3.5 h-3.5" />
              <span>{showTafsir ? 'Hide Tafsir' : 'Read Tafsir'}</span>
              {showTafsir ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {showTafsir && (
            <div className="mt-2 rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#064E3B]/[0.03] dark:bg-[#041D17]/75 px-3.5 py-3 text-xs sm:text-[13px] leading-relaxed text-[#022C22]/90 dark:text-emerald-100/90">
              {ayah.tafsirBrief}
            </div>
          )}
        </div>
      )}

      {/* Editorial Linguistic Footnotes Footer */}
      {ayahFootnotes.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#064E3B]/8 dark:border-emerald-300/12">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs">
            <span className="order-1 font-semibold text-[#0F766E] dark:text-emerald-300 shrink-0">
              Footnotes
            </span>

            <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#404944] dark:text-emerald-200/80">
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              {ayahFootnotes.map((item, idx) => {
                const isFocused = focusedFootnoteNum === item.number;
                const isOpen = areAllFootnotesOpen || isFocused;
                return (
                  <React.Fragment key={item.footnote.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedFootnoteNum((prev) =>
                          prev === item.number ? null : item.number
                        );
                      }}
                      aria-expanded={isOpen}
                      className={`inline-flex items-baseline gap-1 py-0.5 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        isFocused
                          ? 'text-[#B45309] dark:text-amber-300 font-semibold underline decoration-[#D97706]/70 underline-offset-4'
                          : 'text-[#404944] hover:text-[#064E3B] dark:text-emerald-200/80 dark:hover:text-amber-200'
                      }`}
                    >
                      <sup className="text-[10px] font-bold text-[#0F766E] dark:text-amber-300 tabular-nums">
                        {item.number}
                      </sup>
                      <span>{item.word.transliteration || item.word.meaning}</span>
                    </button>
                    {idx < ayahFootnotes.length - 1 && (
                      <span aria-hidden="true" className="text-[#064E3B]/25 dark:text-emerald-300/25">
                        ·
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                if (areAllFootnotesOpen) {
                  setLocalExpandOverride(false);
                  setFocusedFootnoteNum(null);
                } else {
                  setLocalExpandOverride(true);
                  setFocusedFootnoteNum(null);
                }
              }}
              className="order-2 sm:order-3 text-[11px] font-semibold text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 py-1 px-2 rounded-lg bg-[#064E3B]/[0.04] sm:bg-transparent dark:bg-emerald-400/8 sm:dark:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <span>
                {areAllFootnotesOpen
                  ? 'Hide notes'
                  : `Read all (${ayahFootnotes.length})`}
              </span>
              {areAllFootnotesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {visibleFootnotes.length > 0 && (
            <div className="mt-2.5 space-y-2.5 pt-2.5 border-t border-[#064E3B]/6 dark:border-emerald-300/8">
              {visibleFootnotes.map((item) => {
                const isHighlighted = focusedFootnoteNum === item.number;
                return (
                  <div
                    key={item.footnote.id}
                    className={`text-[13px] leading-relaxed rounded-xl transition-colors break-words ${
                      isHighlighted
                        ? 'bg-[#D97706]/[0.07] dark:bg-amber-400/10 px-2.5 py-2 -mx-1 sm:-mx-2.5'
                        : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-bold text-[#0F766E] dark:text-amber-300 tabular-nums">
                        {item.number}.
                      </span>
                      <span className="font-semibold text-[#022C22] dark:text-white">
                        {item.footnote.term}
                      </span>
                      <span
                        dir="rtl"
                        className="font-quran-amiri text-[17px] leading-none text-[#064E3B] dark:text-emerald-200"
                      >
                        {item.footnote.arabicTerm}
                      </span>
                      <span className="text-[11.5px] text-[#404944] dark:text-emerald-300/75">
                        · {item.footnote.category}
                        {item.footnote.root ? ` · Root ${item.footnote.root}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 pl-3 sm:pl-4 text-[12.5px] leading-[1.65] text-[#404944] dark:text-emerald-100/85">
                      <span className="font-medium text-[#022C22]/85 dark:text-emerald-100">
                        Literally: &ldquo;{item.footnote.literalGloss}.&rdquo;{' '}
                      </span>
                      {item.footnote.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
});
