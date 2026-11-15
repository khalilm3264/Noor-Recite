import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  Copy,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat1,
  Search,
  Volume2,
} from 'lucide-react';
import {
  HadithCategory,
  HadithItem,
  HadithTradition,
  ReaderSettings,
  TranslationLanguage,
} from '../types/quran';
import { POPULAR_HADITHS } from '../data/hadithData';
import {
  QARI_TTS_STYLES,
  getAiTtsAudioUrl,
  getCachedAiTtsUrl,
  unlockAudioElement,
} from '../utils/aiTts';
import { RubElHizbBadge } from './RubElHizbIcon';
import { LanguagePillSelector } from './LanguagePillSelector';
import { useBatchTranslations } from '../utils/localizedText';
import { getTranslationTextClass, isRtlTranslationLang } from '../utils/translationConfig';

interface HadithsViewProps {
  settings: ReaderSettings;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

const TRADITION_TABS: { id: 'all' | HadithTradition; label: string }[] = [
  { id: 'all', label: 'All Traditions' },
  { id: 'shared', label: 'Shared (Sunni & Shia)' },
  { id: 'sunni', label: 'Sunni Collections' },
  { id: 'shia', label: 'Shia Collections' },
];

const TRADITION_META: Record<
  HadithTradition,
  { label: string; className: string }
> = {
  shared: {
    label: 'Shared · Sunni & Shia',
    className: 'text-[#0F766E] dark:text-teal-300',
  },
  sunni: {
    label: 'Sunni Sources',
    className: 'text-[#064E3B] dark:text-emerald-300',
  },
  shia: {
    label: 'Shia Sources',
    className: 'text-[#B45309] dark:text-amber-300',
  },
};

const CATEGORY_TABS: { id: 'all' | HadithCategory; label: string }[] = [
  { id: 'all', label: 'All Topics' },
  { id: 'faith', label: 'Faith & Sincerity' },
  { id: 'character', label: 'Character & Mercy' },
  { id: 'worship', label: 'Worship & Heart' },
  { id: 'knowledge', label: 'Knowledge & Service' },
];

function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function normalizeArabicHadithForSpeech(text: string): string {
  return text
    .replace(/ﷺ/g, 'صلى الله عليه وسلم')
    .replace(/\u0671/g, '\u0627')
    .replace(/[\u06D6-\u06ED]/g, '')
    .replace(/[\u06DF\u06E0]/g, '')
    .replace(/[«»]/g, ' ')
    .trim();
}

export const HadithsView: React.FC<HadithsViewProps> = ({
  settings,
  onSelectLanguage,
  onPracticeInReader,
  onPauseReaderAudio,
}) => {
  const [activeTradition, setActiveTradition] = useState<'all' | HadithTradition>('all');
  const [activeCategory, setActiveCategory] = useState<'all' | HadithCategory>('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSpeechFallback, setIsSpeechFallback] = useState(false);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [loopActiveItem, setLoopActiveItem] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speechUnavailableId, setSpeechUnavailableId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeItemRef = useRef<HadithItem | null>(null);
  const queueFlagRef = useRef(false);
  const loopFlagRef = useRef(false);
  const filteredRef = useRef<HadithItem[]>([]);
  const playbackSessionRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);

  loopFlagRef.current = loopActiveItem;

  const activeLang: TranslationLanguage = settings.translationLanguage ?? 'en';
  const translationEntries = useMemo(
    () =>
      POPULAR_HADITHS.flatMap((item) => [
        { key: `hadith-tr-${item.id}`, text: item.translationEn, arabic: item.arabic },
        { key: `hadith-lesson-${item.id}`, text: item.lessonEn },
      ]),
    []
  );
  const { resolve: resolveDynamicText, isTranslating } = useBatchTranslations(
    activeLang,
    translationEntries
  );

  const fontClass =
    settings.arabicFont === 'scheherazade'
      ? 'font-quran-scheherazade'
      : 'font-quran-amiri';

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POPULAR_HADITHS.filter((item) => {
      if (activeTradition !== 'all' && item.tradition !== activeTradition) {
        return false;
      }
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.narrator.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.grading.toLowerCase().includes(q) ||
        item.tradition.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.translationEn.toLowerCase().includes(q) ||
        item.translationHi.toLowerCase().includes(q) ||
        item.translationUr.toLowerCase().includes(q) ||
        resolveDynamicText(item.translationEn).toLowerCase().includes(q) ||
        item.lessonEn.toLowerCase().includes(q)
      );
    });
  }, [activeTradition, activeCategory, query, resolveDynamicText]);

  filteredRef.current = filteredItems;

  const stopSpeech = useCallback(() => {
    playbackSessionRef.current += 1;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    queueFlagRef.current = false;
    setIsQueuePlaying(false);
    setIsBuffering(false);
    setIsSpeechFallback(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const tryBrowserSpeechFallback = useCallback(
    (item: HadithItem, continueQueue: boolean): boolean => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return false;
      }
      try {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null;

        const utterance = new SpeechSynthesisUtterance(
          normalizeArabicHadithForSpeech(item.arabic)
        );
        utterance.lang = arabicVoice?.lang || 'ar-SA';
        if (arabicVoice) utterance.voice = arabicVoice;
        utterance.rate = Math.max(
          0.65,
          Math.min(1.25, settings.playbackSpeed * 0.9)
        );

        utterance.onend = () => {
          setIsSpeechFallback(false);
          if (queueFlagRef.current && continueQueue) {
            const list = filteredRef.current;
            const idx = list.findIndex((h) => h.id === item.id);
            if (idx >= 0 && idx < list.length - 1) {
              const next = list[idx + 1];
              void startAiPlaybackRef.current(next, true);
              const el = document.getElementById(`hadith-card-${next.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return;
            }
          }
          queueFlagRef.current = false;
          setIsQueuePlaying(false);
          setIsSpeaking(false);
        };

        utterance.onerror = (ev) => {
          if (ev.error === 'interrupted' || ev.error === 'canceled') return;
          queueFlagRef.current = false;
          setIsQueuePlaying(false);
          setIsSpeaking(false);
          setIsSpeechFallback(false);
          setSpeechUnavailableId(item.id);
        };

        setIsSpeechFallback(true);
        setIsBuffering(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        return false;
      }
    },
    [settings.playbackSpeed]
  );

  const startAiPlayback = useCallback(
    async (item: HadithItem, continueQueue: boolean) => {
      const audio = audioRef.current;
      const session = ++playbackSessionRef.current;
      abortCtrlRef.current?.abort();
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      onPauseReaderAudio?.();
      setSpeechUnavailableId(null);
      setIsSpeechFallback(false);

      queueFlagRef.current = continueQueue;
      setIsQueuePlaying(continueQueue);
      activeItemRef.current = item;
      setActiveId(item.id);
      setCurrentTime(0);
      setDuration(0);

      const cachedUrl = getCachedAiTtsUrl(item.arabic, {
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.hadith,
      });
      if (audio && cachedUrl) {
        if (audio.src !== cachedUrl) {
          audio.src = cachedUrl;
          audio.load();
        } else {
          audio.currentTime = 0;
        }
        audio.playbackRate = settings.playbackSpeed;
        setIsBuffering(false);
        setIsSpeaking(true);
        audio.play().catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          if (!tryBrowserSpeechFallback(item, continueQueue)) {
            setIsSpeaking(false);
            setIsQueuePlaying(false);
            setSpeechUnavailableId(item.id);
          }
        });
        return;
      }

      unlockAudioElement(audio);
      setIsBuffering(true);
      setIsSpeaking(true);

      try {
        const blobUrl = await getAiTtsAudioUrl(item.arabic, {
          voiceName: 'Charon',
          style: QARI_TTS_STYLES.hadith,
          signal: ctrl.signal,
        });

        if (playbackSessionRef.current !== session || ctrl.signal.aborted) return;

        if (!audio) {
          throw new Error('No audio element available');
        }

        audio.src = blobUrl;
        audio.load();
        audio.playbackRate = settings.playbackSpeed;
        setIsBuffering(false);

        await audio.play();
      } catch (err) {
        if (ctrl.signal.aborted || playbackSessionRef.current !== session) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsBuffering(false);
        if (!tryBrowserSpeechFallback(item, continueQueue)) {
          queueFlagRef.current = false;
          setIsQueuePlaying(false);
          setIsSpeaking(false);
          setSpeechUnavailableId(item.id);
        }
      }
    },
    [onPauseReaderAudio, settings.playbackSpeed, tryBrowserSpeechFallback]
  );

  const startAiPlaybackRef = useRef(startAiPlayback);
  startAiPlaybackRef.current = startAiPlayback;

  const handleToggleListen = (item: HadithItem) => {
    const audio = audioRef.current;

    if (activeId === item.id && isSpeaking) {
      stopSpeech();
      return;
    }

    if (
      activeId === item.id &&
      !isSpeaking &&
      !isSpeechFallback &&
      audio &&
      audio.src &&
      audio.readyState >= 1
    ) {
      onPauseReaderAudio?.();
      setSpeechUnavailableId(null);
      audio.playbackRate = settings.playbackSpeed;
      setIsSpeaking(true);
      audio.play().catch(() => {
        void startAiPlayback(item, false);
      });
      return;
    }

    void startAiPlayback(item, false);
  };

  const handleTogglePlayAll = () => {
    if (isQueuePlaying && isSpeaking) {
      stopSpeech();
      return;
    }
    if (!filteredItems.length) return;
    setLoopActiveItem(false);
    const startItem =
      (activeId && filteredItems.find((h) => h.id === activeId)) ||
      filteredItems[0];
    void startAiPlayback(startItem, true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration || isSpeechFallback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width))
    );
    const nextSec = ratio * duration;
    audio.currentTime = nextSec;
    setCurrentTime(nextSec);
  };

  const handleTrackEnded = () => {
    setIsBuffering(false);
    const currentItem = activeItemRef.current;
    if (!currentItem) {
      setIsSpeaking(false);
      return;
    }

    if (loopFlagRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = settings.playbackSpeed;
      audioRef.current.play().catch(() => {
        setIsSpeaking(false);
      });
      return;
    }

    if (queueFlagRef.current) {
      const list = filteredRef.current;
      const idx = list.findIndex((h) => h.id === currentItem.id);
      if (idx >= 0 && idx < list.length - 1) {
        const next = list[idx + 1];
        void startAiPlayback(next, true);
        const el = document.getElementById(`hadith-card-${next.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      queueFlagRef.current = false;
      setIsQueuePlaying(false);
    }

    setIsSpeaking(false);
    setCurrentTime(0);
  };

  const handleTrackError = () => {
    const item = activeItemRef.current;
    if (!item || !isSpeaking) {
      setIsBuffering(false);
      return;
    }
    setIsBuffering(false);
    if (!tryBrowserSpeechFallback(item, queueFlagRef.current)) {
      queueFlagRef.current = false;
      setIsQueuePlaying(false);
      setIsSpeaking(false);
      setSpeechUnavailableId(item.id);
    }
  };

  const handleCopy = async (item: HadithItem) => {
    const tr =
      activeLang === 'hi'
        ? item.translationHi
        : activeLang === 'ur'
        ? item.translationUr
        : activeLang === 'en'
        ? item.translationEn
        : resolveDynamicText(item.translationEn);
    const text = `${item.title}\n${item.narrator}\n${item.arabic}\n${item.transliteration}\n${tr}\n— ${item.reference} (${item.grading})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 1800);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      <audio
        ref={audioRef}
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onPlaying={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onEnded={handleTrackEnded}
        onError={handleTrackError}
      />

      {/* Page Header + Inline Language Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Popular Authentic Hadiths
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Treasured narrations from Sunni, Shia, and shared Islamic traditions—spanning Sahih al-Bukhari, Sahih Muslim, Al-Kāfī, Nahj al-Balāghah, and Nawawi’s 40 Hadith—with Arabic script, transliteration, translations in 7 languages, and practical wisdom.
          </p>
        </div>

        <LanguagePillSelector
          activeLang={activeLang}
          onSelectLanguage={onSelectLanguage}
          isTranslating={isTranslating}
          className="self-start md:self-auto shrink-0"
        />
      </div>

      {/* Tradition Filter Tabs (All · Shared · Sunni · Shia) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#064E3B]/10 dark:border-emerald-300/15 pb-3">
        {TRADITION_TABS.map((tab) => {
          const active = activeTradition === tab.id;
          const count =
            tab.id === 'all'
              ? POPULAR_HADITHS.length
              : POPULAR_HADITHS.filter((h) => h.tradition === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTradition(tab.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                active
                  ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                  : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/15 text-[#404944] hover:text-[#022C22] dark:text-emerald-200/85 dark:hover:text-white'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Category Filters + Listen Sequence + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            const scoped =
              activeTradition === 'all'
                ? POPULAR_HADITHS
                : POPULAR_HADITHS.filter((h) => h.tradition === activeTradition);
            const count =
              tab.id === 'all'
                ? scoped.length
                : scoped.filter((h) => h.category === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                  active
                    ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/15 text-[#404944] hover:text-[#022C22] dark:text-emerald-200/85 dark:hover:text-white'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={handleTogglePlayAll}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                isQueuePlaying && isSpeaking
                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
              }`}
            >
              {isQueuePlaying && isSpeaking ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Sequence</span>
                </>
              ) : (
                <>
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Listen All ({filteredItems.length})</span>
                </>
              )}
            </button>
          )}

          <div className="relative flex-1 sm:w-56 sm:flex-none min-w-[180px]">
            <Search className="w-4 h-4 text-[#404944] dark:text-emerald-300/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Al-Kafi, Bukhari, Nahj..."
              aria-label="Search popular hadiths"
              className="w-full min-h-[38px] pl-9 pr-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs font-medium text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
            />
          </div>
        </div>
      </div>

      {/* Hadith Cards */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-10 text-center space-y-2 ayah-card-resting">
          <p className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
            No Matching Hadiths Found
          </p>
          <p className="text-xs text-[#404944] dark:text-emerald-200/75">
            Try clearing your search or selecting another category tab.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => {
            const isSelectedItem = activeId === item.id;
            const isSpeakingThis = isSelectedItem && isSpeaking;
            const isBufferingThis = isSelectedItem && isBuffering && isSpeaking;
            const progressRatio =
              isSelectedItem && duration > 0
                ? Math.min(1, Math.max(0, currentTime / duration))
                : 0;
            const localizedTranslation =
              activeLang === 'hi'
                ? item.translationHi
                : activeLang === 'ur'
                ? item.translationUr
                : activeLang === 'en'
                ? item.translationEn
                : resolveDynamicText(item.translationEn);
            const localizedLesson =
              activeLang === 'hi'
                ? item.lessonHi
                : activeLang === 'ur'
                ? item.lessonUr
                : activeLang === 'en'
                ? item.lessonEn
                : resolveDynamicText(item.lessonEn);

            return (
              <article
                id={`hadith-card-${item.id}`}
                key={item.id}
                className={`rounded-2xl border p-5 sm:p-7 transition-all duration-200 space-y-4 ${
                  isSpeakingThis
                    ? 'ayah-card-active border-[1.5px] border-[#D97706]/45 dark:border-amber-400/50 bg-gradient-to-b from-[#064E3B]/[0.025] to-[#D97706]/[0.045] dark:from-emerald-950/70 dark:to-amber-950/25'
                    : 'ayah-card-resting border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
                  <div className="flex items-start gap-3 min-w-0">
                    <RubElHizbBadge
                      className="w-9 h-9 shrink-0 mt-0.5"
                      label={idx + 1}
                      active={isSpeakingThis || !activeId}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]">
                        <span className={`font-bold ${TRADITION_META[item.tradition].className}`}>
                          {TRADITION_META[item.tradition].label}
                        </span>
                        <span aria-hidden="true" className="text-[#064E3B]/25 dark:text-emerald-300/25">
                          ·
                        </span>
                        <span className="font-semibold text-[#022C22]/80 dark:text-emerald-200/90">
                          {item.badge}
                        </span>
                        <span aria-hidden="true" className="text-[#064E3B]/25 dark:text-emerald-300/25">
                          ·
                        </span>
                        <span className="text-[#404944] dark:text-emerald-200/75">
                          {item.reference} · {item.grading}
                        </span>
                      </div>
                      <h2 className="mt-1 text-base sm:text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        {item.title}
                      </h2>
                      <p className="text-xs text-[#0F766E] dark:text-emerald-300/85">
                        {item.narrator}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions: Listen (Qari Voice), Qur'an Link, Copy */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleListen(item)}
                      aria-label={
                        isSpeakingThis
                          ? `Pause ${item.title}`
                          : `Listen to ${item.title} in Arabic`
                      }
                      className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        isSpeakingThis
                          ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                          : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
                      }`}
                    >
                      {isBufferingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading</span>
                        </>
                      ) : isSpeakingThis ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    {item.quranRef && (
                      <button
                        type="button"
                        onClick={() =>
                          item.quranRef &&
                          onPracticeInReader(
                            item.quranRef.surahId,
                            item.quranRef.ayahNumber
                          )
                        }
                        className="min-h-[36px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#0F766E] hover:bg-[#064E3B]/5 dark:text-emerald-200 dark:hover:bg-emerald-400/10 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                      >
                        <span>{item.quranRef.label}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleCopy(item)}
                      aria-label={`Copy ${item.title}`}
                      className="min-h-[36px] px-2.5 rounded-lg border border-[#064E3B]/12 dark:border-emerald-300/18 text-xs font-medium text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/5 dark:text-emerald-200/80 dark:hover:bg-emerald-400/10 flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Inline Audio Scrubber for Selected Hadith */}
                {isSelectedItem && (
                  <div className="rounded-xl bg-[#064E3B]/[0.045] dark:bg-emerald-400/10 px-3.5 py-2.5 flex items-center gap-2.5 sm:gap-3">
                    <Volume2 className="w-4 h-4 text-[#0F766E] dark:text-emerald-300 shrink-0" />
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200 shrink-0">
                      Qari Voice
                    </span>
                    {isSpeechFallback ? (
                      <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
                        Speaking Arabic narration ({settings.playbackSpeed}x)...
                      </div>
                    ) : isBufferingThis ? (
                      <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
                        Preparing Qari Voice narration...
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={handleSeek}
                          role="slider"
                          aria-label={`Seek ${item.title} audio`}
                          aria-valuemin={0}
                          aria-valuemax={Math.round(duration || 1)}
                          aria-valuenow={Math.round(currentTime)}
                          tabIndex={0}
                          className="relative flex-1 h-2 rounded-full bg-[#064E3B]/15 dark:bg-emerald-300/20 cursor-pointer overflow-hidden"
                        >
                          <span
                            className="block h-full rounded-full bg-[#D97706] dark:bg-amber-400 transition-[width] duration-75"
                            style={{ width: `${progressRatio * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85 shrink-0">
                          {formatDuration(currentTime)} / {formatDuration(duration)}
                        </span>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setLoopActiveItem((prev) => !prev)}
                      aria-label={loopActiveItem ? 'Disable repeat' : 'Repeat this Hadith'}
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-colors shrink-0 ${
                        loopActiveItem
                          ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                          : 'text-[#404944] hover:bg-[#064E3B]/10 dark:text-emerald-200/80 dark:hover:bg-emerald-400/15'
                      }`}
                    >
                      <Repeat1 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Loop</span>
                    </button>
                  </div>
                )}

                {speechUnavailableId === item.id && (
                  <p className="text-xs text-[#BA1A1A] dark:text-rose-300">
                    Arabic audio is unavailable right now. Please try again.
                  </p>
                )}

                {/* Arabic Hadith Matn */}
                <p
                  dir="rtl"
                  className={`${fontClass} text-right leading-[2.1] text-[#022C22] dark:text-[#E6FFF4] pt-1`}
                  style={{
                    fontSize: `${Math.max(22, Math.min(34, settings.arabicFontSize - 2))}px`,
                  }}
                >
                  {item.arabic}
                </p>

                {/* Transliteration & Translation */}
                {(settings.showTransliteration || settings.showTranslation) && (
                  <div className="space-y-2.5 min-w-0 break-words">
                    {settings.showTransliteration && (
                      <p className="text-[14px] font-medium italic leading-relaxed text-[#0F766E] dark:text-emerald-300/90 break-words">
                        {item.transliteration}
                      </p>
                    )}

                    {settings.showTranslation && (
                      <p
                        dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
                        className={`text-[#022C22]/90 dark:text-[#D0FAEA]/95 break-words ${getTranslationTextClass(
                          activeLang,
                          'card'
                        )}`}
                      >
                        {localizedTranslation}
                      </p>
                    )}
                  </div>
                )}

                {/* Practical Lesson Takeaway */}
                <div className="pt-3 border-t border-[#064E3B]/8 dark:border-emerald-300/10 flex items-start gap-2">
                  <BookOpenCheck className="w-4 h-4 text-[#0F766E] dark:text-emerald-300 shrink-0 mt-0.5" />
                  <p
                    dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
                    className={`min-w-0 flex-1 text-[#404944] dark:text-emerald-200/85 break-words ${getTranslationTextClass(
                      activeLang,
                      'compact'
                    )}`}
                  >
                    {localizedLesson}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
