import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat1,
  RotateCcw,
  Search,
  Volume2,
} from 'lucide-react';
import {
  DuaCategory,
  DuaOrKalimaItem,
  ReaderSettings,
  Reciter,
  TranslationLanguage,
} from '../types/quran';
import { DUAS_AND_KALIMAS } from '../data/duasAndKalimas';
import { getEveryAyahUrl } from '../data/quranData';
import { ensureAudioCached, getCachedAudioSrc } from '../utils/audioCache';
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

interface DuasKalimasViewProps {
  settings: ReaderSettings;
  reciter: Reciter;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

const CATEGORY_TABS: { id: 'all' | DuaCategory; label: string }[] = [
  { id: 'all', label: 'All Essentials' },
  { id: 'kalimas', label: '6 Kalimas' },
  { id: 'daily', label: 'Daily Duas' },
  { id: 'quranic', label: "Qur'anic Duas" },
  { id: 'adhkar', label: 'Adhkar & Salawat' },
];

function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function normalizeArabicForSpeech(text: string): string {
  return text
    .replace(/\u0671/g, '\u0627') // Alef Wasla -> Alef
    .replace(/[\u06D6-\u06ED]/g, '') // Remove Quranic pause/annotation marks
    .replace(/[\u06DF\u06E0]/g, '')
    .trim();
}

export const DuasKalimasView: React.FC<DuasKalimasViewProps> = ({
  settings,
  reciter,
  onSelectLanguage,
  onPracticeInReader,
  onPauseReaderAudio,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | DuaCategory>('all');
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAiVoice, setIsAiVoice] = useState(false);
  const [isSpeechFallback, setIsSpeechFallback] = useState(false);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [loopActiveItem, setLoopActiveItem] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioErrorId, setAudioErrorId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackAttemptedRef = useRef<Set<string>>(new Set());
  const aiAttemptedRef = useRef<Set<string>>(new Set());
  const activeItemRef = useRef<DuaOrKalimaItem | null>(null);
  const playbackSessionRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const activeLang: TranslationLanguage = settings.translationLanguage ?? 'en';
  const translationEntries = useMemo(
    () =>
      DUAS_AND_KALIMAS.map((item) => ({
        key: `dua-tr-${item.id}`,
        text: item.translationEn,
        arabic: item.arabic,
      })),
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

  const getPrimaryAudioUrl = useCallback(
    (item: DuaOrKalimaItem): string | null => {
      if (item.quranRef) {
        return getEveryAyahUrl(
          reciter.everyAyahFolder,
          item.quranRef.surahId,
          item.quranRef.ayahNumber
        );
      }
      return item.audioUrl ?? null;
    },
    [reciter.everyAyahFolder]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUAS_AND_KALIMAS.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.translationEn.toLowerCase().includes(q) ||
        item.translationHi.toLowerCase().includes(q) ||
        item.translationUr.toLowerCase().includes(q) ||
        resolveDynamicText(item.translationEn).toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, query, resolveDynamicText]);

  const stopSpeech = useCallback(() => {
    playbackSessionRef.current += 1;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Pre-warm visible Dua & Kalima audio files in background for instant playback
  useEffect(() => {
    const controller = new AbortController();
    const urls = filteredItems
      .map((item) => getPrimaryAudioUrl(item))
      .filter((u): u is string => Boolean(u));

    let cursor = 0;
    const worker = async () => {
      while (!controller.signal.aborted) {
        const idx = cursor++;
        if (idx >= urls.length) return;
        await ensureAudioCached(urls[idx], controller.signal);
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(3, urls.length) }, () => worker())
    );

    return () => controller.abort();
  }, [filteredItems, getPrimaryAudioUrl]);

  // Keep playbackRate synced with ReaderSettings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  // Clean up audio & speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [stopSpeech]);

  const tryArabicSpeechFallback = useCallback(
    (item: DuaOrKalimaItem): boolean => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return false;
      }
      try {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null;

        const utterance = new SpeechSynthesisUtterance(
          normalizeArabicForSpeech(item.arabic)
        );
        utterance.lang = arabicVoice?.lang || 'ar-SA';
        if (arabicVoice) utterance.voice = arabicVoice;
        utterance.rate = Math.max(0.65, Math.min(1.3, settings.playbackSpeed * 0.9));

        utterance.onend = () => {
          setIsPlaying(false);
          setIsSpeechFallback(false);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setIsSpeechFallback(false);
          setAudioErrorId(item.id);
        };

        setIsSpeechFallback(true);
        setIsBuffering(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        return false;
      }
    },
    [settings.playbackSpeed]
  );

  const synthesizeAndPlayAiVoice = useCallback(
    async (item: DuaOrKalimaItem, session: number) => {
      const audio = audioRef.current;
      aiAttemptedRef.current.add(item.id);

      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;

      const cachedUrl = getCachedAiTtsUrl(item.arabic, {
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.dua,
      });
      if (audio && cachedUrl) {
        if (audio.src !== cachedUrl) {
          audio.src = cachedUrl;
          audio.load();
        } else {
          audio.currentTime = 0;
        }
        audio.playbackRate = settings.playbackSpeed;
        setIsAiVoice(true);
        setIsBuffering(false);
        setIsPlaying(true);
        audio.play().catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          if (!tryArabicSpeechFallback(item)) {
            setIsPlaying(false);
            setIsQueuePlaying(false);
            setAudioErrorId(item.id);
          }
        });
        return;
      }

      unlockAudioElement(audio);
      setIsAiVoice(true);
      setIsBuffering(true);
      setIsPlaying(true);

      try {
        const blobUrl = await getAiTtsAudioUrl(item.arabic, {
          voiceName: 'Charon',
          style: QARI_TTS_STYLES.dua,
          signal: ctrl.signal,
        });

        if (playbackSessionRef.current !== session || ctrl.signal.aborted) return;
        if (!audio) throw new Error('Audio element missing');

        audio.src = blobUrl;
        audio.load();
        audio.playbackRate = settings.playbackSpeed;
        setIsBuffering(false);
        await audio.play();
      } catch (err) {
        if (ctrl.signal.aborted || playbackSessionRef.current !== session) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsBuffering(false);
        setIsAiVoice(false);
        if (!tryArabicSpeechFallback(item)) {
          setIsPlaying(false);
          setIsQueuePlaying(false);
          setAudioErrorId(item.id);
        }
      }
    },
    [settings.playbackSpeed, tryArabicSpeechFallback]
  );

  const startPlaybackForItem = useCallback(
    (item: DuaOrKalimaItem, preserveQueue = false) => {
      const audio = audioRef.current;
      stopSpeech();
      const session = playbackSessionRef.current;
      onPauseReaderAudio?.();
      setAudioErrorId(null);
      setIsSpeechFallback(false);
      setIsAiVoice(false);
      if (!preserveQueue) {
        setIsQueuePlaying(false);
      }

      activeItemRef.current = item;
      setActiveId(item.id);
      fallbackAttemptedRef.current.delete(item.id);
      aiAttemptedRef.current.delete(item.id);

      const primaryUrl = getPrimaryAudioUrl(item);
      if (!audio || !primaryUrl) {
        setCurrentTime(0);
        setDuration(0);
        void synthesizeAndPlayAiVoice(item, session);
        return;
      }

      const playableSrc = getCachedAudioSrc(primaryUrl);
      if (audio.src !== playableSrc) {
        audio.src = playableSrc;
        audio.load();
      } else {
        audio.currentTime = 0;
      }
      setCurrentTime(0);
      setDuration(0);
      audio.playbackRate = settings.playbackSpeed;
      setIsBuffering(true);
      setIsPlaying(true);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          setIsBuffering(false);
          if (!aiAttemptedRef.current.has(item.id)) {
            void synthesizeAndPlayAiVoice(item, session);
          } else if (!tryArabicSpeechFallback(item)) {
            setIsPlaying(false);
            setIsQueuePlaying(false);
            setAudioErrorId(item.id);
          }
        });
      }
    },
    [
      getPrimaryAudioUrl,
      onPauseReaderAudio,
      settings.playbackSpeed,
      stopSpeech,
      synthesizeAndPlayAiVoice,
      tryArabicSpeechFallback,
    ]
  );

  const handleToggleRecite = (item: DuaOrKalimaItem) => {
    const audio = audioRef.current;

    if (activeId === item.id && isPlaying) {
      stopSpeech();
      if (audio && !audio.paused) {
        audio.pause();
      }
      setIsPlaying(false);
      setIsBuffering(false);
      setIsSpeechFallback(false);
      setIsQueuePlaying(false);
      return;
    }

    // Resume paused item smoothly if same audio source is loaded
    if (
      activeId === item.id &&
      !isPlaying &&
      !isSpeechFallback &&
      audio &&
      audio.src &&
      audio.readyState >= 1
    ) {
      onPauseReaderAudio?.();
      setAudioErrorId(null);
      audio.playbackRate = settings.playbackSpeed;
      setIsPlaying(true);
      audio.play().catch(() => {
        startPlaybackForItem(item, false);
      });
      return;
    }

    startPlaybackForItem(item, false);
  };

  const handleTogglePlayAll = () => {
    if (isQueuePlaying && isPlaying) {
      stopSpeech();
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsBuffering(false);
      setIsQueuePlaying(false);
      return;
    }
    if (!filteredItems.length) return;
    setLoopActiveItem(false);
    setIsQueuePlaying(true);
    const startItem =
      (activeId && filteredItems.find((d) => d.id === activeId)) ||
      filteredItems[0];
    startPlaybackForItem(startItem, true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration || isSpeechFallback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const nextSec = ratio * duration;
    audio.currentTime = nextSec;
    setCurrentTime(nextSec);
  };

  const handleTrackEnded = () => {
    setIsBuffering(false);
    const currentItem = activeItemRef.current;
    if (!currentItem) {
      setIsPlaying(false);
      return;
    }

    // Auto-increment dhikr counter cleanly when recitation finishes
    if (currentItem.recommendedCount) {
      setCounts((prev) => ({
        ...prev,
        [currentItem.id]: (prev[currentItem.id] ?? 0) + 1,
      }));
    }

    if (loopActiveItem && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = settings.playbackSpeed;
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    if (isQueuePlaying) {
      const idx = filteredItems.findIndex((d) => d.id === currentItem.id);
      if (idx >= 0 && idx < filteredItems.length - 1) {
        const nextItem = filteredItems[idx + 1];
        startPlaybackForItem(nextItem, true);
        const cardEl = document.getElementById(`dua-card-${nextItem.id}`);
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      setIsQueuePlaying(false);
    }

    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTrackError = () => {
    const audio = audioRef.current;
    const item = activeItemRef.current;
    if (!item || !audio) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    if (item.fallbackAudioUrl && !fallbackAttemptedRef.current.has(item.id)) {
      fallbackAttemptedRef.current.add(item.id);
      const fbSrc = getCachedAudioSrc(item.fallbackAudioUrl);
      audio.src = fbSrc;
      audio.load();
      audio.playbackRate = settings.playbackSpeed;
      audio.play().catch((err) => {
        if (err?.name === 'AbortError' || audio.error) return;
        setIsBuffering(false);
        if (!aiAttemptedRef.current.has(item.id)) {
          void synthesizeAndPlayAiVoice(item, playbackSessionRef.current);
        } else if (!tryArabicSpeechFallback(item)) {
          setIsPlaying(false);
          setIsQueuePlaying(false);
          setAudioErrorId(item.id);
        }
      });
      return;
    }

    if (!aiAttemptedRef.current.has(item.id)) {
      void synthesizeAndPlayAiVoice(item, playbackSessionRef.current);
      return;
    }

    setIsBuffering(false);
    setIsAiVoice(false);
    if (!tryArabicSpeechFallback(item)) {
      setAudioErrorId(item.id);
      setIsPlaying(false);
      setIsQueuePlaying(false);
    }
  };

  const handleCopy = async (item: DuaOrKalimaItem) => {
    const tr =
      activeLang === 'hi'
        ? item.translationHi
        : activeLang === 'ur'
        ? item.translationUr
        : activeLang === 'en'
        ? item.translationEn
        : resolveDynamicText(item.translationEn);
    const text = `${item.title} (${item.reference})\n${item.arabic}\n${item.transliteration}\n${tr}`;
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

  const incrementCount = (id: string) => {
    setCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const resetCount = (id: string) => {
    setCounts((prev) => ({ ...prev, [id]: 0 }));
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

      {/* Header + Inline Language Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Duas &amp; Six Kalimas
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Essential daily supplications, the Six Kalimas, Qur&apos;anic Rabbana prayers, Ayatul Kursi, and Prophetic adhkar with audio recitation, Arabic script, transliteration, and translations in 7 languages.
          </p>
        </div>

        <LanguagePillSelector
          activeLang={activeLang}
          onSelectLanguage={onSelectLanguage}
          isTranslating={isTranslating}
          className="self-start md:self-auto shrink-0"
        />
      </div>

      {/* Category Filters + Recite All + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            const count =
              tab.id === 'all'
                ? DUAS_AND_KALIMAS.length
                : DUAS_AND_KALIMAS.filter((d) => d.category === tab.id).length;
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
                isQueuePlaying && isPlaying
                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
              }`}
            >
              {isQueuePlaying && isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Sequence</span>
                </>
              ) : (
                <>
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Recite All ({filteredItems.length})</span>
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
              placeholder="Search duas or kalimas..."
              aria-label="Search duas and kalimas"
              className="w-full min-h-[38px] pl-9 pr-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs font-medium text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-10 text-center space-y-2 ayah-card-resting">
          <p className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
            No Matching Duas or Kalimas
          </p>
          <p className="text-xs text-[#404944] dark:text-emerald-200/75">
            Try clearing your search or selecting another category tab.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => {
            const count = counts[item.id] ?? 0;
            const target = item.recommendedCount;
            const isSelectedItem = activeId === item.id;
            const isPlayingThis = isSelectedItem && isPlaying;
            const isBufferingThis = isSelectedItem && isBuffering && isPlaying;
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

            return (
              <article
                id={`dua-card-${item.id}`}
                key={item.id}
                className={`rounded-2xl border p-5 sm:p-7 transition-all duration-200 space-y-4 ${
                  isPlayingThis
                    ? 'ayah-card-active border-[1.5px] border-[#D97706]/45 dark:border-amber-400/50 bg-gradient-to-b from-[#064E3B]/[0.025] to-[#D97706]/[0.045] dark:from-emerald-950/70 dark:to-amber-950/25'
                    : 'ayah-card-resting border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95'
                }`}
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
                  <div className="flex items-start gap-3 min-w-0">
                    <RubElHizbBadge
                      className="w-9 h-9 shrink-0 mt-0.5"
                      label={idx + 1}
                      active={isPlayingThis || !activeId}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]">
                        <span className="font-bold text-[#0F766E] dark:text-emerald-300">
                          {item.badge}
                        </span>
                        <span aria-hidden="true" className="text-[#064E3B]/25 dark:text-emerald-300/25">
                          ·
                        </span>
                        <span className="text-[#404944] dark:text-emerald-200/75">
                          {item.reference}
                        </span>
                      </div>
                      <h2 className="mt-1 text-base sm:text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        {item.title}
                      </h2>
                      <p className="text-xs text-[#0F766E] dark:text-emerald-300/85">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions: Recite Audio, Open in Reader (if Qur'anic), Copy */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRecite(item)}
                      aria-label={
                        isPlayingThis
                          ? `Pause ${item.title}`
                          : `Recite ${item.title}`
                      }
                      className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        isPlayingThis
                          ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                          : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
                      }`}
                    >
                      {isBufferingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading</span>
                        </>
                      ) : isPlayingThis ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Recite</span>
                        </>
                      )}
                    </button>

                    {item.quranRef && (
                      <button
                        type="button"
                        onClick={() =>
                          item.quranRef &&
                          onPracticeInReader(item.quranRef.surahId, item.quranRef.ayahNumber)
                        }
                        className="min-h-[36px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#0F766E] hover:bg-[#064E3B]/5 dark:text-emerald-200 dark:hover:bg-emerald-400/10 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                      >
                        <span>In Reader</span>
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

                {/* Inline Audio Scrubber for Actively Selected Dua / Kalima */}
                {isSelectedItem && (
                  <div className="rounded-xl bg-[#064E3B]/[0.04] dark:bg-emerald-400/10 px-3.5 py-2.5 flex items-center gap-2.5 sm:gap-3">
                    <Volume2 className="w-4 h-4 text-[#0F766E] dark:text-emerald-300 shrink-0" />
                    {isAiVoice && (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200 shrink-0">
                        Qari Voice
                      </span>
                    )}
                    {isSpeechFallback ? (
                      <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
                        Speaking Arabic recitation ({settings.playbackSpeed}x)...
                      </div>
                    ) : isBufferingThis && isAiVoice ? (
                      <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
                        Preparing Qari Voice recitation...
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={handleSeek}
                          role="slider"
                          aria-label={`Seek ${item.title} recitation`}
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
                      aria-label={loopActiveItem ? 'Disable repeat' : 'Repeat this recitation'}
                      title={loopActiveItem ? 'Looping enabled' : 'Loop this recitation'}
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

                {/* Arabic Script */}
                <p
                  dir="rtl"
                  className={`${fontClass} text-right leading-[2.1] text-[#022C22] dark:text-[#E6FFF4] pt-1`}
                  style={{
                    fontSize: `${Math.max(24, Math.min(36, settings.arabicFontSize))}px`,
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

                {audioErrorId === item.id && (
                  <p className="text-xs text-[#BA1A1A] dark:text-rose-300">
                    Audio stream unavailable right now. Please check your connection and try again.
                  </p>
                )}

                {/* Footer: Context Note + Dhikr Tap Counter */}
                <div className="pt-3 border-t border-[#064E3B]/8 dark:border-emerald-300/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/80">
                    {item.note}
                  </p>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => incrementCount(item.id)}
                      className={`min-h-[34px] px-3 rounded-full text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        target && count >= target
                          ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                          : 'bg-[#064E3B]/8 hover:bg-[#064E3B]/15 text-[#064E3B] dark:bg-emerald-400/12 dark:hover:bg-emerald-400/20 dark:text-emerald-200'
                      }`}
                    >
                      {target ? `Recited ${count}/${target}` : `Count: ${count}`}
                    </button>
                    {count > 0 && (
                      <button
                        type="button"
                        onClick={() => resetCount(item.id)}
                        aria-label={`Reset counter for ${item.title}`}
                        title="Reset count"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200/75 dark:hover:bg-emerald-400/10 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
