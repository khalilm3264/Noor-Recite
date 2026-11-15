import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Bookmark,
  Check,
  Sparkles,
  BookOpen,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Mic,
  Eye,
  EyeOff,
  Loader2,
  Pause,
  Play,
  Volume2,
} from 'lucide-react';
import { Ayah, MufassirId, TranslationLanguage, WordToken } from '../types/quran';
import { TAJWEED_STYLE_MAP, TAJWEED_RULES } from '../data/tajweedRules';
import { getAyahFootnotes, getWordFootnote } from '../data/wordFootnotes';
import { MUFASSIRUN_LIST, getScholarlyExegesis } from '../data/tafsirData';
import {
  QARI_TTS_STYLES,
  getAiTtsAudioUrl,
  getCachedAiTtsUrl,
  unlockAudioElement,
} from '../utils/aiTts';
import { FiligreeDivider } from './RubElHizbIcon';
import {
  getTranslationFontClass,
  getWordMeaningText,
  hasLocalizedWordMeaning,
  isRtlTranslationLang,
} from '../utils/translationConfig';

interface LexiconDrawerProps {
  ayah: Ayah;
  selectedWord: WordToken | null;
  surahName: string;
  translationLanguage?: TranslationLanguage;
  isBookmarked: boolean;
  existingNote: string;
  isMobileSheetOpen: boolean;
  hideDesktopAside?: boolean;
  onCloseMobileSheet: () => void;
  onSelectWord: (word: WordToken) => void;
  onSaveReflection: (ayah: Ayah, note: string) => void;
  onOpenVoiceGrader?: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

export const LexiconDrawerContent: React.FC<
  Omit<LexiconDrawerProps, 'isMobileSheetOpen' | 'onCloseMobileSheet'> & {
    onClose?: () => void;
  }
> = ({
  ayah,
  selectedWord,
  surahName,
  translationLanguage = 'en',
  isBookmarked,
  existingNote,
  onSelectWord,
  onSaveReflection,
  onOpenVoiceGrader,
  onPauseReaderAudio,
  onClose,
}) => {
  const [drawerTab, setDrawerTab] = useState<'lexicon' | 'tafsir'>('lexicon');
  const [selectedMufassir, setSelectedMufassir] = useState<MufassirId>('ibn-kathir');
  const [showArabicMatn, setShowArabicMatn] = useState(true);
  const [tafsirFontPx, setTafsirFontPx] = useState(13);
  const [noteDraft, setNoteDraft] = useState(existingNote);
  const [savedNotice, setSavedNotice] = useState(false);

  const [ttsActiveKey, setTtsActiveKey] = useState<string | null>(null);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsBuffering, setIsTtsBuffering] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsSessionRef = useRef(0);

  const stopTts = useCallback(() => {
    ttsSessionRef.current += 1;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (ttsAudioRef.current && !ttsAudioRef.current.paused) {
      ttsAudioRef.current.pause();
    }
    setIsTtsPlaying(false);
    setIsTtsBuffering(false);
  }, []);

  useEffect(() => {
    return () => {
      stopTts();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = '';
      }
    };
  }, [stopTts]);

  useEffect(() => {
    setNoteDraft(existingNote);
    setSavedNotice(false);
    stopTts();
    setTtsError(null);
  }, [ayah.verseKey, existingNote, stopTts]);

  const activeWord = selectedWord ?? ayah.words[0] ?? null;
  const activeWordIdx = activeWord
    ? Math.max(0, ayah.words.findIndex((w) => w.id === activeWord.id))
    : 0;
  const surahIdFromKey = Number(ayah.verseKey.split(':')[0]) || 1;
  const wordFootnote = useMemo(
    () => (activeWord ? getWordFootnote(activeWord) : null),
    [activeWord]
  );
  const ayahFootnotes = useMemo(() => getAyahFootnotes(ayah.words), [ayah.words]);

  const activeMufassirMeta =
    MUFASSIRUN_LIST.find((m) => m.id === selectedMufassir) ?? MUFASSIRUN_LIST[0];
  const scholarlyExegesis = useMemo(
    () => getScholarlyExegesis(ayah, selectedMufassir, surahName),
    [ayah, selectedMufassir, surahName]
  );

  const tajweedSpec = activeWord?.tajweed
    ? TAJWEED_RULES.find((r) => r.type === activeWord.tajweed)
    : undefined;
  const tajweedBadge = activeWord?.tajweed
    ? TAJWEED_STYLE_MAP[activeWord.tajweed]
    : undefined;

  const tajweedWordsInAyah = ayah.words.filter((w) => Boolean(w.tajweed));

  const handleSave = () => {
    onSaveReflection(ayah, noteDraft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleToggleTts = async (
    key: string,
    arabicText: string,
    style: string
  ) => {
    if (ttsActiveKey === key && isTtsPlaying) {
      stopTts();
      return;
    }

    const audio = ttsAudioRef.current;
    onPauseReaderAudio?.();
    setTtsError(null);
    stopTts();
    const session = ttsSessionRef.current;
    const ctrl = new AbortController();
    ttsAbortRef.current = ctrl;
    setTtsActiveKey(key);

    const cached = getCachedAiTtsUrl(arabicText, {
      voiceName: 'Charon',
      style,
    });
    if (audio && cached) {
      if (audio.src !== cached) {
        audio.src = cached;
        audio.load();
      } else {
        audio.currentTime = 0;
      }
      setIsTtsBuffering(false);
      setIsTtsPlaying(true);
      audio.play().catch(() => {
        setIsTtsPlaying(false);
        setTtsError('Qari Voice playback is unavailable right now.');
      });
      return;
    }

    unlockAudioElement(audio);
    setIsTtsBuffering(true);
    setIsTtsPlaying(true);

    try {
      const url = await getAiTtsAudioUrl(arabicText, {
        voiceName: 'Charon',
        style,
        signal: ctrl.signal,
      });
      if (ttsSessionRef.current !== session || ctrl.signal.aborted) return;
      if (!audio) throw new Error('Audio element unavailable');
      audio.src = url;
      audio.load();
      setIsTtsBuffering(false);
      await audio.play();
    } catch (err) {
      if (ctrl.signal.aborted || ttsSessionRef.current !== session) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsTtsBuffering(false);
      setIsTtsPlaying(false);
      setTtsError('Qari Voice playback is unavailable right now.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <audio
        ref={ttsAudioRef}
        preload="none"
        onPlaying={() => setIsTtsBuffering(false)}
        onEnded={() => {
          setIsTtsPlaying(false);
          setIsTtsBuffering(false);
        }}
        onError={() => {
          setIsTtsPlaying(false);
          setIsTtsBuffering(false);
        }}
      />
      {/* Drawer Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#0F766E] dark:text-emerald-300">
            Lexicon, Tajweed &amp; Tafsīr
          </p>
          <h2 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
            {surahName} · {ayah.verseKey}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lexicon sheet"
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-[#404944] hover:bg-[#064E3B]/8 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Switcher: Word Lexicon | Tafsīr & Tahqīq */}
      <div
        role="tablist"
        aria-label="Drawer study view"
        className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#064E3B]/[0.05] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15"
      >
        <button
          type="button"
          role="tab"
          aria-selected={drawerTab === 'lexicon'}
          onClick={() => setDrawerTab('lexicon')}
          className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold transition-colors ${
            drawerTab === 'lexicon'
              ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
              : 'text-[#404944] dark:text-emerald-200/80'
          }`}
        >
          Word &amp; Tajweed
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={drawerTab === 'tafsir'}
          onClick={() => setDrawerTab('tafsir')}
          className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold transition-colors ${
            drawerTab === 'tafsir'
              ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
              : 'text-[#404944] dark:text-emerald-200/80'
          }`}
        >
          Tafsīr &amp; Tahqīq
        </button>
      </div>

      {drawerTab === 'tafsir' ? (
        <div className="space-y-4">
          {/* Authentic Mufassirūn Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {MUFASSIRUN_LIST.map((m) => {
              const active = selectedMufassir === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMufassir(m.id)}
                  className={`min-h-[32px] px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                      : 'bg-[#064E3B]/8 text-[#404944] dark:bg-[#041D17] dark:text-emerald-200/80'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>

          {/* Scholar Metadata + Matn & Font Controls */}
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                {activeMufassirMeta.name} ({activeMufassirMeta.era})
              </p>
              <p className="text-[10.5px] text-[#0F766E] dark:text-emerald-300 truncate">
                {activeMufassirMeta.methodology}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowArabicMatn((v) => !v)}
                title={showArabicMatn ? 'Hide Arabic Matn' : 'Show Arabic Matn'}
                className="min-h-[28px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-[11px] font-semibold text-[#064E3B] dark:text-emerald-200 inline-flex items-center gap-1"
              >
                {showArabicMatn ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>Matn</span>
              </button>
              <button
                type="button"
                onClick={() => setTafsirFontPx((p) => Math.max(11, p - 1))}
                aria-label="Decrease commentary size"
                className="w-7 h-7 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setTafsirFontPx((p) => Math.min(18, p + 1))}
                aria-label="Increase commentary size"
                className="w-7 h-7 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]"
              >
                A+
              </button>
            </div>
          </div>

          {showArabicMatn && (() => {
            const matnKey = `matn-${ayah.verseKey}-${selectedMufassir}`;
            const isMatnPlaying = ttsActiveKey === matnKey && isTtsPlaying;
            const isMatnBuffering = ttsActiveKey === matnKey && isTtsBuffering && isTtsPlaying;
            return (
              <div className="rounded-xl bg-[#FEF3C7]/25 dark:bg-amber-950/25 border border-[#D97706]/25 px-3.5 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] dark:text-amber-300">
                    Classical Arabic Text ({activeMufassirMeta.arabicName})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      void handleToggleTts(
                        matnKey,
                        scholarlyExegesis.arabicMatn,
                        QARI_TTS_STYLES.tafsir
                      )
                    }
                    className={`min-h-[26px] px-2.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors ${
                      isMatnPlaying
                        ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                        : 'bg-[#064E3B]/10 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/15 dark:text-emerald-200'
                    }`}
                  >
                    {isMatnBuffering ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isMatnPlaying ? (
                      <Pause className="w-3 h-3 fill-current" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                    <span>{isMatnPlaying ? 'Pause' : 'Qari Voice'}</span>
                  </button>
                </div>
                <p dir="rtl" className="font-quran-amiri text-xl leading-[1.9] text-[#003527] dark:text-amber-100">
                  {scholarlyExegesis.arabicMatn}
                </p>
                {ttsError && ttsActiveKey === matnKey && (
                  <p className="text-[11px] text-[#BA1A1A] dark:text-rose-300">{ttsError}</p>
                )}
              </div>
            );
          })()}

          <div className="space-y-3" style={{ fontSize: `${tafsirFontPx}px` }}>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                Scholarly Exegesis
              </p>
              <p className="leading-[1.7] text-[#022C22]/90 dark:text-[#D0FAEA]/90">
                {scholarlyExegesis.commentary}
              </p>
            </div>

            <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-3 space-y-1">
              <p className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-300">
                Asbāb an-Nuzūl &amp; Context
              </p>
              <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/85">
                {scholarlyExegesis.asbabAnNuzul}
              </p>
            </div>

            <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-3 space-y-1">
              <p className="text-[11px] font-bold text-[#B45309] dark:text-amber-300">
                Linguistic Nuance &amp; I‘rāb
              </p>
              <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/85">
                {scholarlyExegesis.irabAndBalaghah}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-600/20 bg-emerald-500/8 p-3 space-y-1">
              <p className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-200">
                Tadabbur &amp; Daily Practice
              </p>
              <p className="text-xs leading-relaxed text-[#022C22] dark:text-emerald-100">
                {scholarlyExegesis.tadabburAction}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Selected Word Breakdown */}
          {activeWord && (() => {
            const localizedGloss = getWordMeaningText(activeWord, translationLanguage);
            const hasLocalized = hasLocalizedWordMeaning(activeWord, translationLanguage);
            const resolvedGlossLang: TranslationLanguage = hasLocalized
              ? translationLanguage
              : 'en';
            const glossFontClass = getTranslationFontClass(resolvedGlossLang);
            const isRtlGloss = isRtlTranslationLang(resolvedGlossLang);
            const hasDistinctFallback =
              resolvedGlossLang !== 'en' &&
              Boolean(activeWord.meaning) &&
              localizedGloss !== activeWord.meaning;

            return (
              <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#F5FFFA]/80 dark:bg-[#063529]/55 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-[#022C22] dark:text-white">
                      {activeWord.transliteration || 'Word Analysis'}
                    </p>
                    <p
                      dir={isRtlGloss ? 'rtl' : 'ltr'}
                      className={
                        isRtlGloss
                          ? `${glossFontClass} text-base leading-[2.1] text-[#022C22] dark:text-emerald-100`
                          : resolvedGlossLang === 'hi' || resolvedGlossLang === 'bn'
                          ? `${glossFontClass} text-sm leading-[1.7] text-[#022C22] dark:text-emerald-100`
                          : `${glossFontClass} text-sm text-[#404944] dark:text-emerald-100/85`.trim()
                      }
                    >
                      {localizedGloss}
                    </p>
                    {hasDistinctFallback && (
                      <p className="text-xs text-[#404944]/85 dark:text-emerald-200/75">
                        {activeWord.meaning}
                      </p>
                    )}
                  </div>
                  <span
                    dir="rtl"
                    className="font-quran-amiri text-[34px] leading-[1.7] text-[#003527] dark:text-amber-200 shrink-0"
                  >
                    {activeWord.arabic}
                  </span>
                </div>

                {(activeWord.root || activeWord.partOfSpeech) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#404944] dark:text-emerald-200/80 pt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/12">
                    {activeWord.root && (
                      <span>
                        Root:{' '}
                        <strong dir="rtl" className="font-quran-amiri text-sm text-[#064E3B] dark:text-emerald-200">
                          {activeWord.root}
                        </strong>
                      </span>
                    )}
                    {activeWord.root && activeWord.partOfSpeech && <span aria-hidden="true">·</span>}
                    {activeWord.partOfSpeech && <span>{activeWord.partOfSpeech}</span>}
                  </div>
                )}

                {tajweedBadge && tajweedSpec && (
                  <div className="pt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/12 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${tajweedBadge.badgeBg} ${tajweedBadge.badgeText}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tajweedBadge.dotColor}`} />
                        {tajweedSpec.name} ({tajweedSpec.arabicName})
                      </span>
                      <span className="text-xs text-[#404944] dark:text-emerald-200/75">
                        {tajweedSpec.harakatCount}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#022C22]/85 dark:text-[#D0FAEA]/85">
                      {activeWord.tajweedNote || tajweedSpec.description}
                    </p>
                  </div>
                )}

                {wordFootnote && (
                  <div className="pt-2.5 border-t border-[#064E3B]/8 dark:border-emerald-300/12 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#B45309] dark:text-amber-300 flex items-center gap-1.5">
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>Linguistic Footnote</span>
                      </p>
                      <span className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                        {wordFootnote.category}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#022C22] dark:text-white">
                      Lit. &ldquo;{wordFootnote.literalGloss}&rdquo;
                    </p>
                    <p className="text-xs leading-[1.65] text-[#404944] dark:text-emerald-100/85">
                      {wordFootnote.explanation}
                    </p>
                  </div>
                )}

                <div className="pt-2.5 border-t border-[#064E3B]/8 dark:border-emerald-300/12 flex flex-wrap items-center justify-between gap-2">
                  {ayah.words.length > 1 ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={activeWordIdx <= 0}
                        onClick={() => {
                          const prev = ayah.words[activeWordIdx - 1];
                          if (prev) onSelectWord(prev);
                        }}
                        aria-label="Previous word in verse"
                        className="min-h-[32px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#064E3B] dark:text-emerald-200 disabled:opacity-40 hover:bg-[#064E3B]/6 inline-flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <span className="px-1.5 text-[11px] font-bold tabular-nums text-[#404944] dark:text-emerald-200/75">
                        {activeWordIdx + 1}/{ayah.words.length}
                      </span>
                      <button
                        type="button"
                        disabled={activeWordIdx >= ayah.words.length - 1}
                        onClick={() => {
                          const next = ayah.words[activeWordIdx + 1];
                          if (next) onSelectWord(next);
                        }}
                        aria-label="Next word in verse"
                        className="min-h-[32px] px-2 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#064E3B] dark:text-emerald-200 disabled:opacity-40 hover:bg-[#064E3B]/6 inline-flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium text-[#404944] dark:text-emerald-200/75">
                      Word 1/1
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      const wordKey = `word-${ayah.verseKey}-${activeWord.id}`;
                      const isWordPlaying = ttsActiveKey === wordKey && isTtsPlaying;
                      const isWordBuffering =
                        ttsActiveKey === wordKey && isTtsBuffering && isTtsPlaying;
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            void handleToggleTts(
                              wordKey,
                              activeWord.arabic,
                              QARI_TTS_STYLES.word
                            )
                          }
                          title="Hear isolated Arabic word articulation via Qari Voice"
                          className={`min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                            isWordPlaying
                              ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                              : 'bg-[#064E3B]/10 hover:bg-[#064E3B] text-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
                          }`}
                        >
                          {isWordBuffering ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isWordPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>{isWordPlaying ? 'Pause' : 'Qari Voice'}</span>
                        </button>
                      );
                    })()}

                    {onOpenVoiceGrader && (
                      <button
                        type="button"
                        onClick={() => onOpenVoiceGrader(surahIdFromKey, ayah.number)}
                        className="min-h-[32px] px-2.5 rounded-lg bg-[#D97706]/12 hover:bg-[#D97706]/20 dark:bg-amber-400/15 text-[#B45309] dark:text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Grade Tone</span>
                      </button>
                    )}
                  </div>
                </div>
                {ttsError && ttsActiveKey === `word-${ayah.verseKey}-${activeWord.id}` && (
                  <p className="text-[11px] text-[#BA1A1A] dark:text-rose-300">{ttsError}</p>
                )}
              </div>
            );
          })()}

          {ayahFootnotes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300" />
                <span>Footnoted Terms in {ayah.verseKey}</span>
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {ayahFootnotes.map((fn, idx) => {
                  const isCurrent = activeWord?.id === fn.word.id;
                  return (
                    <React.Fragment key={fn.footnote.id}>
                      <button
                        type="button"
                        onClick={() => onSelectWord(fn.word)}
                        className={`inline-flex items-baseline gap-1 py-0.5 rounded cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                          isCurrent
                            ? 'text-[#B45309] dark:text-amber-300 font-semibold underline decoration-[#D97706]/70 underline-offset-4'
                            : 'text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-200'
                        }`}
                      >
                        <sup className="text-[10px] font-bold tabular-nums">{fn.number}</sup>
                        <span>{fn.word.transliteration || fn.word.meaning}</span>
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
            </div>
          )}

          {tajweedWordsInAyah.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-400" />
                <span>Tajweed Points in {ayah.verseKey}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tajweedWordsInAyah.map((w) => {
                  const badge = w.tajweed ? TAJWEED_STYLE_MAP[w.tajweed] : null;
                  if (!badge) return null;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onSelectWord(w)}
                      className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-transform active:scale-95 ${badge.badgeBg} ${badge.badgeText}`}
                    >
                      <span dir="rtl" className="font-quran-amiri text-sm">
                        {w.arabic}
                      </span>
                      <span>· {badge.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <FiligreeDivider />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#0F766E] dark:text-emerald-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Contemplation Note</span>
            </p>
            <p className="text-sm leading-relaxed text-[#022C22]/90 dark:text-[#D0FAEA]/90">
              {ayah.tafsirBrief}
            </p>
          </div>
        </>
      )}

      {/* Personal Reflection & Bookmark */}
      <div className="space-y-2 pt-2 border-t border-[#064E3B]/10 dark:border-emerald-300/12">
        <label
          htmlFor={`reflection-${ayah.verseKey}`}
          className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80"
        >
          Personal Reflection ({ayah.verseKey})
        </label>
        <textarea
          id={`reflection-${ayah.verseKey}`}
          rows={3}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Write a personal contemplation or memorization cue for this verse..."
          className="w-full rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#041D17] px-3.5 py-2.5 text-sm text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
        />
        <button
          type="button"
          onClick={handleSave}
          className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-[#022C22] text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
        >
          {savedNotice ? (
            <>
              <Check className="w-4 h-4" />
              <span>Saved to Bookmarks</span>
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4" />
              <span>{isBookmarked ? 'Update Saved Reflection' : 'Bookmark & Save Reflection'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const LexiconDrawer: React.FC<LexiconDrawerProps> = (props) => {
  const { isMobileSheetOpen, hideDesktopAside = false, onCloseMobileSheet, ...rest } = props;

  useEffect(() => {
    if (!isMobileSheetOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobileSheet();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMobileSheetOpen, onCloseMobileSheet]);

  return (
    <>
      {/* Desktop Sticky Auxiliary Panel (>=900px) */}
      {!hideDesktopAside && (
        <aside className="hidden min-[900px]:block min-[900px]:self-stretch w-[320px] lg:w-[355px] xl:w-[380px] shrink-0">
          <div className="sticky top-5 rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95 p-5 lg:p-6 ayah-card-resting max-h-[calc(100dvh-9rem)] [@media(max-height:540px)]:max-h-[calc(100dvh-6.5rem)] overflow-y-auto">
            <LexiconDrawerContent {...rest} />
          </div>
        </aside>
      )}

      {/* Narrow / Mobile Slide-Up Bottom Sheet */}
      {isMobileSheetOpen && (
        <div
          className="min-[900px]:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs"
          onClick={onCloseMobileSheet}
        >
          <div
            className="w-full max-w-xl rounded-t-3xl border-t border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] px-5 pt-3 pb-8 max-h-[84vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Lexicon and Tajweed details"
          >
            <div
              className="w-10 h-1.5 rounded-full bg-[#064E3B]/20 dark:bg-emerald-200/25 mx-auto mb-4"
              aria-hidden="true"
            />
            <LexiconDrawerContent {...rest} onClose={onCloseMobileSheet} />
          </div>
        </div>
      )}
    </>
  );
};
