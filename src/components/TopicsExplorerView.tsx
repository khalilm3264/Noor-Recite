import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Heart,
  Loader2,
  Pause,
  Play,
  PlusCircle,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AppScreen, Reciter, TranslationLanguage } from '../types/quran';
import {
  HEART_STATES,
  QURAN_TOPICS,
  QuranTopicCollection,
  TopicAyahEntry,
} from '../data/topicsData';
import { getEveryAyahUrl } from '../data/quranData';
import { FiligreeDivider, RubElHizbBadge } from './RubElHizbIcon';
import { useBatchTranslations } from '../utils/localizedText';
import { getTranslationTextClass, isRtlTranslationLang } from '../utils/translationConfig';
import { scrollTargetIntoCenter } from '../utils/useSmoothReadingPlayback';

interface TopicsExplorerViewProps {
  reciter: Reciter;
  translationLanguage: TranslationLanguage;
  autoplayQueue?: boolean;
  onPracticeInReader: (surahId: number, ayahNumber: number, autoPlay?: boolean) => void;
  onPauseReaderAudio?: () => void;
  onAddTopicToHifzQueue: (topic: QuranTopicCollection) => number;
  onNavigateHub?: (screen: AppScreen) => void;
}

const TOPIC_CATEGORIES = [
  'All',
  'Trials & Steadfastness',
  'Heart & Character',
  'Mercy & Hope',
  'Worship & Du‘ā’',
] as const;

export const TopicsExplorerView: React.FC<TopicsExplorerViewProps> = ({
  reciter,
  translationLanguage,
  autoplayQueue = true,
  onPracticeInReader,
  onPauseReaderAudio,
  onAddTopicToHifzQueue,
  onNavigateHub,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeSubFilter, setActiveSubFilter] = useState<string>('All');
  const [expandFeaturedTajweed, setExpandFeaturedTajweed] = useState(false);
  const [hifzSyncMsg, setHifzSyncMsg] = useState<string | null>(null);

  // Continuous Qari Topic Playlist state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeEntryRef = useRef<TopicAyahEntry | null>(null);
  const continuousRef = useRef(false);
  const activeEntryIdRef = useRef<string | null>(null);
  const detailAyahsRef = useRef<TopicAyahEntry[]>([]);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const qariFallbackAttemptedRef = useRef<Set<string>>(new Set());
  const [playingEntryId, setPlayingEntryId] = useState<string | null>(null);
  const [isBufferingEntryId, setIsBufferingEntryId] = useState<string | null>(null);
  const [, setIsContinuousPlay] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const selectedTopic = useMemo(
    () => QURAN_TOPICS.find((t) => t.id === selectedTopicId) ?? null,
    [selectedTopicId]
  );

  const topicTranslationEntries = useMemo(
    () =>
      selectedTopic
        ? selectedTopic.ayahs.map((a) => ({
            key: `topic-${selectedTopic.id}-${a.id}`,
            text: a.translationEn,
            arabic: a.arabic,
          }))
        : [],
    [selectedTopic]
  );
  const { resolve: resolveDynamicText, isTranslating } = useBatchTranslations(
    translationLanguage,
    topicTranslationEntries
  );

  const featuredTopic = useMemo(
    () => QURAN_TOPICS.find((t) => t.featured) ?? QURAN_TOPICS[0],
    []
  );

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return QURAN_TOPICS.filter((t) => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.arabicTitle.includes(q) ||
        t.ayahs.some(
          (a) =>
            a.translationEn.toLowerCase().includes(q) ||
            a.surahName.toLowerCase().includes(q)
        )
      );
    });
  }, [searchQuery, selectedCategory]);

  const detailAyahs = useMemo(() => {
    if (!selectedTopic) return [];
    if (activeSubFilter === 'All') return selectedTopic.ayahs;
    return selectedTopic.ayahs.filter((a) => a.subCategory === activeSubFilter);
  }, [selectedTopic, activeSubFilter]);

  detailAyahsRef.current = detailAyahs;

  useEffect(() => {
    setActiveSubFilter('All');
    setHifzSyncMsg(null);
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    activeEntryIdRef.current = null;
    continuousRef.current = false;
    setPlayingEntryId(null);
    setIsBufferingEntryId(null);
    setIsContinuousPlay(false);
  }, [selectedTopicId]);

  useEffect(() => {
    if (!playingEntryId) return;
    const runScroll = () => scrollTargetIntoCenter(`topic-ayah-${playingEntryId}`);
    const raf = window.requestAnimationFrame(runScroll);
    const timer = window.setTimeout(runScroll, 120);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [playingEntryId]);

  useEffect(() => {
    return () => {
      ttsAbortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fallbackToQariVoice = async (entry: TopicAyahEntry) => {
    const audio = audioRef.current;
    if (!audio || qariFallbackAttemptedRef.current.has(entry.id)) {
      setPlayingEntryId(null);
      setIsBufferingEntryId(null);
      setIsContinuousPlay(false);
      setAudioError('Unable to stream recitation clip right now.');
      return;
    }

    qariFallbackAttemptedRef.current.add(entry.id);
    ttsAbortRef.current?.abort();
    setIsBufferingEntryId(entry.id);

    const backupFolder =
      reciter.everyAyahFolder === 'Husary_128kbps'
        ? 'Alafasy_128kbps'
        : 'Husary_128kbps';
    const backupUrl = getEveryAyahUrl(backupFolder, entry.surahId, entry.ayahNumber);

    try {
      audio.src = backupUrl;
      audio.load();
      await audio.play();
      setIsBufferingEntryId(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsBufferingEntryId(null);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const voices = window.speechSynthesis.getVoices();
          const arabicVoice =
            voices.find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null;
          const utter = new SpeechSynthesisUtterance(entry.arabic);
          utter.lang = arabicVoice?.lang || 'ar-SA';
          if (arabicVoice) utter.voice = arabicVoice;
          utter.onend = () => handleAudioEnded();
          utter.onerror = () => {
            setPlayingEntryId(null);
            setIsContinuousPlay(false);
            setAudioError('Unable to play recitation clip right now.');
          };
          window.speechSynthesis.speak(utter);
          return;
        } catch {
          // Fall through to error message
        }
      }
      setPlayingEntryId(null);
      activeEntryIdRef.current = null;
      continuousRef.current = false;
      setIsContinuousPlay(false);
      setAudioError('Unable to play recitation clip right now.');
    }
  };

  const playEntry = (entry: TopicAyahEntry, continuous = autoplayQueue) => {
    setAudioError(null);
    const audio = audioRef.current;
    if (!audio) return;

    if (playingEntryId === entry.id && !audio.paused) {
      ttsAbortRef.current?.abort();
      audio.pause();
      activeEntryIdRef.current = null;
      continuousRef.current = false;
      setPlayingEntryId(null);
      setIsBufferingEntryId(null);
      setIsContinuousPlay(false);
      return;
    }

    onPauseReaderAudio?.();
    ttsAbortRef.current?.abort();
    qariFallbackAttemptedRef.current.delete(entry.id);
    activeEntryRef.current = entry;
    activeEntryIdRef.current = entry.id;
    continuousRef.current = continuous;

    const url = getEveryAyahUrl(reciter.everyAyahFolder, entry.surahId, entry.ayahNumber);
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    setPlayingEntryId(entry.id);
    setIsBufferingEntryId(entry.id);
    setIsContinuousPlay(continuous);
    audio.play().catch((err) => {
      if (err?.name === 'AbortError' || audio.error) return;
      void fallbackToQariVoice(entry);
    });
  };

  const handleAudioEnded = () => {
    setIsBufferingEntryId(null);
    const list = detailAyahsRef.current;
    const currentId = activeEntryIdRef.current;
    if (!continuousRef.current || !list.length || !currentId) {
      activeEntryIdRef.current = null;
      setPlayingEntryId(null);
      return;
    }
    const idx = list.findIndex((a) => a.id === currentId);
    if (idx >= 0 && idx < list.length - 1) {
      playEntry(list[idx + 1], true);
    } else {
      activeEntryIdRef.current = null;
      continuousRef.current = false;
      setPlayingEntryId(null);
      setIsContinuousPlay(false);
    }
  };

  const getLocalizedTranslation = (entry: TopicAyahEntry) =>
    translationLanguage === 'hi'
      ? entry.translationHi
      : translationLanguage === 'ur'
      ? entry.translationUr
      : translationLanguage === 'en'
      ? entry.translationEn
      : resolveDynamicText(entry.translationEn, entry.arabic);

  // Detail View for Selected Topic
  if (selectedTopic) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
        <audio
          ref={audioRef}
          preload="none"
          onPlaying={() => setIsBufferingEntryId(null)}
          onEnded={handleAudioEnded}
          onError={() => {
            const current = activeEntryRef.current;
            if (current) {
              void fallbackToQariVoice(current);
            } else {
              setIsBufferingEntryId(null);
              setPlayingEntryId(null);
              setIsContinuousPlay(false);
            }
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedTopicId(null)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] inline-flex items-center gap-1.5 hover:border-[#D97706] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Topics</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const added = onAddTopicToHifzQueue(selectedTopic);
              setHifzSyncMsg(
                added > 0
                  ? `Added ${added} verses from "${selectedTopic.title}" to your Hifz Spaced Review Queue.`
                  : `All verses from "${selectedTopic.title}" are already in your Hifz Queue.`
              );
            }}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Topic to Hifz Spaced Review</span>
          </button>
        </div>

        {hifzSyncMsg && (
          <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-[#064E3B] dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{hifzSyncMsg}</span>
          </div>
        )}

        {/* Topic Hero Banner + Continuous Tartīl Player */}
        <section className="rounded-3xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-gradient-to-br from-[#064E3B] to-[#022C22] text-[#F5FFFA] p-6 sm:p-8 space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/12 text-amber-300 text-[11px] font-bold">
                <Sparkles className="w-3 h-3" />
                <span>{selectedTopic.category} · {selectedTopic.ayahs.length} Curated Ayahs</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {selectedTopic.title}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
                {selectedTopic.description}
              </p>
            </div>
            <p dir="rtl" className="font-quran-amiri text-3xl sm:text-4xl font-bold text-amber-200 shrink-0">
              {selectedTopic.arabicTitle}
            </p>
          </div>

          {/* Continuous Topic Playlist Controller */}
          <div className="rounded-2xl bg-black/25 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (playingEntryId) {
                    audioRef.current?.pause();
                    setPlayingEntryId(null);
                    setIsContinuousPlay(false);
                  } else if (detailAyahs[0]) {
                    playEntry(detailAyahs[0], true);
                  }
                }}
                className="w-11 h-11 rounded-full bg-[#D97706] hover:bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md"
              >
                {playingEntryId ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Continuous Thematic Recitation · {reciter.name}
                </p>
                <p className="text-[11px] text-emerald-200/80">
                  {playingEntryId
                    ? `Playing Ayah ${detailAyahs.find((a) => a.id === playingEntryId)?.verseKey ?? ''}`
                    : `Listen sequentially through all ${detailAyahs.length} verses in this collection`}
                </p>
              </div>
            </div>
          </div>

          {audioError && <p className="text-xs text-rose-200">{audioError}</p>}
        </section>

        {/* Sub-Theme Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {selectedTopic.subFilters.map((sf) => {
              const active = activeSubFilter === sf;
              return (
                <button
                  key={sf}
                  type="button"
                  onClick={() => setActiveSubFilter(sf)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/18 text-[#404944] dark:text-emerald-200/80'
                  }`}
                >
                  {sf}
                </button>
              );
            })}
          </div>
          {isTranslating && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#0F766E] dark:text-emerald-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading translation...</span>
            </span>
          )}
        </div>

        {/* Ayah Cards List */}
        <div className="space-y-4">
          {detailAyahs.map((entry) => {
            const isPlayingThis = playingEntryId === entry.id;
            const text = getLocalizedTranslation(entry);
            return (
              <article
                id={`topic-ayah-${entry.id}`}
                key={entry.id}
                className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all ayah-card-resting ${
                  isPlayingThis
                    ? 'border-[#D97706] bg-[#FEF3C7]/20 dark:border-amber-400 dark:bg-amber-950/20'
                    : 'border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#064E3B]/8 dark:border-emerald-300/12">
                  <div className="flex items-center gap-3">
                    <RubElHizbBadge className="w-8 h-8" label={entry.ayahNumber} active={isPlayingThis} />
                    <div>
                      <h2 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        {entry.surahName} · {entry.verseKey}
                      </h2>
                      <p className="text-[11px] font-medium text-[#0F766E] dark:text-emerald-300/85">
                        {entry.subCategory} · {entry.tajweedRule}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playEntry(entry, autoplayQueue)}
                      className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        isPlayingThis
                          ? 'bg-[#D97706] text-white'
                          : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-white dark:bg-emerald-400/15 dark:text-emerald-200'
                      }`}
                    >
                      {isBufferingEntryId === entry.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isPlayingThis ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isBufferingEntryId === entry.id
                          ? 'Loading'
                          : isPlayingThis
                          ? 'Pause'
                          : 'Listen'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPracticeInReader(entry.surahId, entry.ayahNumber, true)}
                      className="min-h-[36px] px-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:border-[#D97706] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open in Reader</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p dir="rtl" className="font-quran-amiri text-2xl sm:text-3xl leading-[2.0] text-[#003527] dark:text-[#E6FFF4]">
                  {entry.arabic}
                </p>

                <p className="text-xs italic font-medium text-[#0F766E] dark:text-emerald-300">
                  {entry.transliteration}
                </p>

                <p
                  dir={isRtlTranslationLang(translationLanguage) ? 'rtl' : 'ltr'}
                  className={`text-[#022C22]/90 dark:text-[#D0FAEA]/90 ${getTranslationTextClass(
                    translationLanguage,
                    'card'
                  )}`}
                >
                  {text}
                </p>

                <div className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/12 px-4 py-3 text-xs leading-relaxed text-[#404944] dark:text-emerald-200/85">
                  <strong className="text-[#064E3B] dark:text-emerald-300">Scholarly Note: </strong>
                  {entry.reflectionNote}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      {/* Unified Hub Sub-Bar */}
      {onNavigateHub && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateHub('surahs')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-xs font-semibold text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 inline-flex items-center gap-1.5 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>114 Surahs &amp; Juz</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateHub('khatmah')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-xs font-semibold text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 inline-flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Khatmah Planner</span>
          </button>
          <button
            type="button"
            aria-current="page"
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thematic Topics &amp; Heart</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
          Curated Qur’ānic Reflections
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
          How Is Your Heart Today?
        </h1>
        <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
          Verses selected for your spiritual needs with continuous Qari recitation, Tajweed highlights, and classical commentary.
        </p>
      </div>

      {/* Horizontal Heart-State Mood Carousel */}
      <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {HEART_STATES.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => setSelectedTopicId(mood.topicId)}
            className="shrink-0 min-w-[175px] rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] hover:border-[#D97706] p-3.5 text-left transition-all ayah-card-resting group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#064E3B]/8 dark:bg-emerald-400/12 text-[#064E3B] dark:text-amber-300 flex items-center justify-center group-hover:bg-[#D97706] group-hover:text-white transition-colors">
                <Heart className="w-4 h-4" />
              </span>
              <span dir="rtl" className="font-quran-amiri text-xl font-bold text-[#D97706] dark:text-amber-300">
                {mood.arabicWord}
              </span>
            </div>
            <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] mt-2.5">
              {mood.moodLabel}
            </p>
            <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 mt-0.5">
              {mood.subtitle} · {mood.ayahCount} Ayahs
            </p>
          </button>
        ))}
      </div>

      {/* Featured Topic of the Week with Expandable Tajweed Highlight */}
      <section className="rounded-3xl border border-[#D97706]/30 dark:border-amber-400/35 bg-gradient-to-br from-[#FFFFFF] via-[#F5FFFA] to-[#FEF3C7]/35 dark:from-[#0A2921] dark:via-[#07261E] dark:to-amber-950/25 p-5 sm:p-7 ayah-card-resting space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300 text-[11px] font-bold">
              <Sparkles className="w-3 h-3" />
              <span>Featured Study Path · {featuredTopic.ayahs.length} Key Ayahs</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#022C22] dark:text-white">
              {featuredTopic.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#404944] dark:text-emerald-200/80">
              {featuredTopic.tagline}
            </p>
          </div>
          <p dir="rtl" className="font-quran-amiri text-3xl font-bold text-[#003527] dark:text-amber-200 shrink-0">
            {featuredTopic.arabicTitle}
          </p>
        </div>

        <FiligreeDivider />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpandFeaturedTajweed((e) => !e)}
            className="text-xs font-semibold text-[#0F766E] dark:text-emerald-300 inline-flex items-center gap-1.5 hover:underline"
          >
            <span>
              Tajweed Rule Spotlight: {featuredTopic.featuredAyahFocus?.highlightWord}
            </span>
            {expandFeaturedTajweed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedTopicId(featuredTopic.id)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Explore Topic &amp; Listen</span>
          </button>
        </div>

        {expandFeaturedTajweed && featuredTopic.featuredAyahFocus && (
          <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white/80 dark:bg-[#041D17] p-4 space-y-1">
            <p className="text-xs font-bold text-[#064E3B] dark:text-amber-300">
              {featuredTopic.featuredAyahFocus.tajweedFocus} ({featuredTopic.featuredAyahFocus.verseKey})
            </p>
            <p className="text-xs text-[#404944] dark:text-emerald-200/85 leading-relaxed">
              {featuredTopic.featuredAyahFocus.tajweedRuleDetail}
            </p>
          </div>
        )}
      </section>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#707974] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search themes, heart states, or verses..."
            aria-label="Search Thematic Topics"
            className="w-full min-h-[42px] pl-10 pr-4 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-sm text-[#022C22] dark:text-[#E6FFF4]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TOPIC_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[36px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/18 text-[#404944] dark:text-emerald-200/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Curated Topics Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTopics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => setSelectedTopicId(topic.id)}
            className="text-left rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] hover:border-[#D97706] p-5 sm:p-6 space-y-3 transition-all ayah-card-resting group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                  {topic.category}
                </span>
                <h3 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4] mt-0.5 group-hover:text-[#D97706] dark:group-hover:text-amber-300 transition-colors">
                  {topic.title}
                </h3>
              </div>
              <span dir="rtl" className="font-quran-amiri text-2xl font-bold text-[#003527] dark:text-amber-200 shrink-0">
                {topic.arabicTitle}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#404944] dark:text-emerald-200/80 leading-relaxed">
              {topic.tagline}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/12 text-xs font-semibold text-[#064E3B] dark:text-emerald-200">
              <span>{topic.ayahs.length} Verified Verses · Audio Playlist</span>
              <span className="inline-flex items-center gap-1 text-[#D97706] dark:text-amber-300">
                Study Path <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
