import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpenCheck,
  Check,
  Copy,
  Heart,
  Loader2,
  Pause,
  Play,
  Repeat1,
  Search,
  Volume2,
} from 'lucide-react';
import {
  FavoriteItem,
  HadithCategory,
  HadithItem,
  HadithTradition,
  QariVoiceProfile,
  ReaderSettings,
  TranslationLanguage,
} from '../types/quran';
import { POPULAR_HADITHS } from '../data/hadithData';
import {
  QARI_TTS_STYLES,
  clearAudioUnlockFlag,
  getAiTtsAudioUrl,
  getCachedAiTtsUrl,
  isUnlockingAudioEvent,
  prefetchAiTtsAudio,
  unlockAudioElement,
} from '../utils/aiTts';
import { SpeechBounds, analyzeSpeechBounds } from '../utils/speechBounds';
import {
  applyVoiceTimbreProfile,
  scrollActiveWordIntoView,
  scrollTargetIntoCenter,
  selectRegionalArabicVoice,
  startBackgroundAudioKeepalive,
  stopBackgroundAudioKeepalive,
  updateBackgroundMediaSession,
  useSmoothAudioProgress,
} from '../utils/useSmoothReadingPlayback';
import { HighlightedArabicText } from './HighlightedArabicText';
import { HighlightedSyncText } from './HighlightedSyncText';
import { RubElHizbBadge } from './RubElHizbIcon';
import { LanguagePillSelector } from './LanguagePillSelector';
import { VoiceProfilePillSelector } from './VoiceProfilePillSelector';
import { useBatchTranslations } from '../utils/localizedText';
import { getTranslationTextClass, isRtlTranslationLang } from '../utils/translationConfig';
import { formatFavoriteSavedDate, getHadithFavoriteId } from '../utils/favorites';
import { ScrollText, SkipBack, SkipForward } from 'lucide-react';

interface HadithsViewProps {
  settings: ReaderSettings;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  onSelectVoiceProfile?: (profile: QariVoiceProfile) => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
  onToggleAutoplayQueue?: () => void;
  favoriteIds?: ReadonlySet<string>;
  onToggleFavorite?: (item: FavoriteItem) => void;
  initialFocusHadithId?: string | null;
  onClearFocusTarget?: () => void;
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

type HadithFilterTab = 'all' | 'favorites' | HadithCategory;

const CATEGORY_TABS: { id: HadithFilterTab; label: string }[] = [
  { id: 'all', label: 'All Topics' },
  { id: 'favorites', label: 'Favorites' },
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
  onSelectVoiceProfile,
  onPracticeInReader,
  onPauseReaderAudio,
  onToggleAutoplayQueue,
  favoriteIds,
  onToggleFavorite,
  initialFocusHadithId,
  onClearFocusTarget,
}) => {
  const [activeTradition, setActiveTradition] = useState<'all' | HadithTradition>('all');
  const [activeCategory, setActiveCategory] = useState<HadithFilterTab>('all');
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
  const [speechCharIndex, setSpeechCharIndex] = useState<number | null>(null);
  const [activeSpeechBounds, setActiveSpeechBounds] = useState<SpeechBounds | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [speechUnavailableId, setSpeechUnavailableId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeItemRef = useRef<HadithItem | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const queueFlagRef = useRef(false);
  const loopFlagRef = useRef(false);
  const autoScrollRef = useRef(true);
  const filteredRef = useRef<HadithItem[]>([]);
  const playbackSessionRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const keepaliveHeldRef = useRef(false);

  autoScrollRef.current = autoScrollEnabled;
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

  // Kept in a ref so a new callback identity on each parent render (several times a second while
  // Qur'an audio plays) doesn't restart the timer and keep resetting the filters.
  const clearFocusTargetRef = useRef(onClearFocusTarget);
  clearFocusTargetRef.current = onClearFocusTarget;

  useEffect(() => {
    if (!initialFocusHadithId) return;
    setActiveTradition('all');
    setActiveCategory('all');
    setQuery('');
    const timer = window.setTimeout(() => {
      scrollTargetIntoCenter(`hadith-card-${initialFocusHadithId}`);
      clearFocusTargetRef.current?.();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [initialFocusHadithId]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POPULAR_HADITHS.filter((item) => {
      if (activeTradition !== 'all' && item.tradition !== activeTradition) {
        return false;
      }
      if (activeCategory === 'favorites') {
        if (!favoriteIds?.has(getHadithFavoriteId(item.id))) return false;
      } else if (activeCategory !== 'all' && item.category !== activeCategory) {
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
  }, [activeTradition, activeCategory, favoriteIds, query, resolveDynamicText]);

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
    if (audioRef.current) {
      applyVoiceTimbreProfile(audioRef.current, settings.qariVoiceProfile ?? 'recorded');
    }
  }, [settings.qariVoiceProfile]);

  useEffect(() => {
    if (isSpeaking && !keepaliveHeldRef.current) {
      keepaliveHeldRef.current = true;
      startBackgroundAudioKeepalive();
    } else if (!isSpeaking && keepaliveHeldRef.current) {
      keepaliveHeldRef.current = false;
      stopBackgroundAudioKeepalive();
    }
  }, [isSpeaking]);

  // Snap UI clock immediately when returning from backgrounded app
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        const d = audioRef.current.duration;
        if (Number.isFinite(d) && d > 0) setDuration(d);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Early warm-up of visible Hadiths into local Disk/RAM cache from bundled static MP3s
  useEffect(() => {
    if (filteredItems.length === 0) return;
    const ctrl = new AbortController();
    const activeIdx = activeId
      ? filteredItems.findIndex((h) => h.id === activeId)
      : -1;
    const ordered =
      activeIdx >= 0
        ? [
            ...filteredItems.slice(activeIdx + 1),
            ...filteredItems.slice(0, activeIdx),
          ]
        : filteredItems;

    void prefetchAiTtsAudio(
      ordered.map((h) => ({
        text: h.arabic,
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.hadith,
      })),
      {
        signal: ctrl.signal,
        concurrency: 3,
        delayMs: 0,
      }
    );

    return () => ctrl.abort();
  }, [filteredItems, activeId]);

  // Smooth auto-scroll active card into clear safe view when playing or advancing
  useEffect(() => {
    if (!activeId || !isSpeaking || !autoScrollEnabled) return;
    const runScroll = () => scrollTargetIntoCenter(`hadith-card-${activeId}`);
    const raf = window.requestAnimationFrame(runScroll);
    const timer = window.setTimeout(runScroll, 120);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [activeId, isSpeaking, autoScrollEnabled]);

  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
      if (keepaliveHeldRef.current) {
        keepaliveHeldRef.current = false;
        stopBackgroundAudioKeepalive();
      }
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
        const { voice: arabicVoice, pitch } = selectRegionalArabicVoice(
          voices,
          settings.qariVoiceProfile ?? 'recorded'
        );

        const utterance = new SpeechSynthesisUtterance(
          normalizeArabicHadithForSpeech(item.arabic)
        );
        utterance.lang = arabicVoice?.lang || 'ar-SA';
        if (arabicVoice) utterance.voice = arabicVoice;
        utterance.pitch = pitch;
        utterance.rate = Math.max(
          0.65,
          Math.min(1.25, settings.playbackSpeed * 0.9)
        );
        setSpeechCharIndex(null);
        utterance.onboundary = (ev) => {
          if (typeof ev.charIndex === 'number') {
            setSpeechCharIndex(ev.charIndex);
          }
        };

        utterance.onend = () => {
          setIsSpeechFallback(false);
          setSpeechCharIndex(null);
          if (queueFlagRef.current && continueQueue) {
            const list = filteredRef.current;
            const idx = list.findIndex((h) => h.id === item.id);
            if (idx >= 0 && idx < list.length - 1) {
              const next = list[idx + 1];
              void startAiPlaybackRef.current(next, true);
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
          setSpeechCharIndex(null);
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
    [settings.playbackSpeed, settings.qariVoiceProfile]
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
      setSpeechCharIndex(null);

      queueFlagRef.current = continueQueue;
      setIsQueuePlaying(continueQueue);
      activeItemRef.current = item;
      activeAudioUrlRef.current = null;
      setActiveId(item.id);
      setActiveSpeechBounds(null);
      setCurrentTime(0);
      setDuration(0);

      // Keep the next 3 upcoming queue items hot in RAM so background onEnded transitions remain zero-gap
      if (continueQueue) {
        const list = filteredRef.current;
        const curIdx = list.findIndex((h) => h.id === item.id);
        if (curIdx >= 0) {
          const lookahead = list.slice(curIdx + 1, curIdx + 4);
          if (lookahead.length > 0) {
            void prefetchAiTtsAudio(
              lookahead.map((h) => ({
                text: h.arabic,
                voiceName: 'Charon',
                style: QARI_TTS_STYLES.hadith,
              })),
              { concurrency: 3, delayMs: 0 }
            );
          }
        }
      }

      const attachAndAnalyze = (audioEl: HTMLAudioElement, url: string) => {
        activeAudioUrlRef.current = url;
        clearAudioUnlockFlag(audioEl);
        audioEl.muted = false;
        void analyzeSpeechBounds(url).then((bounds) => {
          if (activeAudioUrlRef.current === url) {
            setActiveSpeechBounds(bounds);
          }
        });
      };

      const cachedUrl = getCachedAiTtsUrl(item.arabic, {
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.hadith,
      });
      if (audio && cachedUrl) {
        attachAndAnalyze(audio, cachedUrl);
        if (audio.src !== cachedUrl) {
          audio.src = cachedUrl;
        } else {
          audio.currentTime = 0;
        }
        applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
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

        attachAndAnalyze(audio, blobUrl);
        audio.src = blobUrl;
        applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
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
    [
      onPauseReaderAudio,
      settings.playbackSpeed,
      settings.qariVoiceProfile,
      tryBrowserSpeechFallback,
    ]
  );

  const startAiPlaybackRef = useRef(startAiPlayback);
  startAiPlaybackRef.current = startAiPlayback;

  const handleToggleListen = (item: HadithItem) => {
    const audio = audioRef.current;
    const shouldAutoplay = settings.autoplayQueue !== false;

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
      queueFlagRef.current = shouldAutoplay;
      setIsQueuePlaying(shouldAutoplay);
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      setIsSpeaking(true);
      audio.play().catch(() => {
        void startAiPlayback(item, shouldAutoplay);
      });
      return;
    }

    void startAiPlayback(item, shouldAutoplay);
  };

  const handleTogglePlayAll = () => {
    if (isQueuePlaying && isSpeaking) {
      stopSpeech();
      return;
    }
    if (!filteredItems.length) return;
    setLoopActiveItem(false);
    setAutoScrollEnabled(true);
    const startItem =
      (activeId && filteredItems.find((h) => h.id === activeId)) ||
      filteredItems[0];
    void startAiPlayback(startItem, true);
  };

  const handleStepQueue = useCallback(
    (dir: -1 | 1) => {
      if (!filteredItems.length) return;
      const idx = activeId
        ? filteredItems.findIndex((h) => h.id === activeId)
        : 0;
      const nextIdx =
        idx < 0
          ? 0
          : Math.min(filteredItems.length - 1, Math.max(0, idx + dir));
      const target = filteredItems[nextIdx];
      if (target) {
        void startAiPlayback(target, isQueuePlaying || isSpeaking);
      }
    },
    [filteredItems, activeId, startAiPlayback, isQueuePlaying, isSpeaking]
  );

  const activeHadithItem = useMemo(
    () => (activeId ? POPULAR_HADITHS.find((h) => h.id === activeId) ?? null : null),
    [activeId]
  );

  const smoothProgress = useSmoothAudioProgress({
    audioRef,
    isPlaying: isSpeaking,
    isBuffering,
    isSpeechFallback,
    fallbackTextLength: activeHadithItem?.arabic.length ?? 60,
    playbackSpeed: settings.playbackSpeed,
    currentTime,
    duration,
    speechBounds: activeSpeechBounds,
    wordTimings:
      activeHadithItem && !isSpeechFallback
        ? activeHadithItem.wordTimings ?? null
        : null,
    arabicText: activeHadithItem?.arabic ?? '',
  });

  // Follow active highlighted Arabic word inside tall Hadith cards
  useEffect(() => {
    if (!activeId || !isSpeaking || isBuffering || !autoScrollEnabled) return;
    scrollActiveWordIntoView(`hadith-card-${activeId}`);
  }, [activeId, isSpeaking, isBuffering, autoScrollEnabled, smoothProgress]);

  useEffect(() => {
    if (!activeHadithItem) return;
    updateBackgroundMediaSession({
      title: activeHadithItem.title,
      artist: activeHadithItem.reference,
      album: 'Noor Recite · Hadiths Reading Mode',
      isPlaying: isSpeaking,
      onPlay: () => {
        if (!isSpeaking) void startAiPlaybackRef.current(activeHadithItem, isQueuePlaying);
      },
      onPause: () => {
        if (isSpeaking) stopSpeech();
      },
      onNext: () => handleStepQueue(1),
      onPrev: () => handleStepQueue(-1),
    });
  }, [activeHadithItem, isSpeaking, isQueuePlaying, stopSpeech, handleStepQueue]);

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
      applyVoiceTimbreProfile(
        audioRef.current,
        settings.qariVoiceProfile ?? 'recorded'
      );
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
    const text = `${item.title}\n${item.narrator}\n${item.arabic}\n${item.transliteration}\n${tr}\n(${item.reference}, ${item.grading})`;
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
        crossOrigin="anonymous"
        preload="auto"
        onLoadedMetadata={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onPlaying={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          applyVoiceTimbreProfile(
            e.currentTarget,
            settings.qariVoiceProfile ?? 'recorded'
          );
          setIsBuffering(false);
        }}
        onWaiting={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          setIsBuffering(true);
        }}
        onTimeUpdate={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          setCurrentTime(e.currentTarget.currentTime);
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onEnded={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          handleTrackEnded();
        }}
        onError={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          handleTrackError();
        }}
      />

      {/* Page Header + Inline Language & Voice Switchers */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Popular Authentic Hadiths
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Treasured narrations from Sunni, Shia, and shared collections with Arabic Qari Voice narration, word highlighting, transliteration, and translations in 13 languages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {onSelectVoiceProfile && (
            <VoiceProfilePillSelector
              activeProfile={settings.qariVoiceProfile ?? 'recorded'}
              onSelectProfile={onSelectVoiceProfile}
              align="left"
            />
          )}
          <LanguagePillSelector
            activeLang={activeLang}
            onSelectLanguage={onSelectLanguage}
            isTranslating={isTranslating}
          />
        </div>
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
                : tab.id === 'favorites'
                ? scoped.filter((h) => favoriteIds?.has(getHadithFavoriteId(h.id))).length
                : scoped.filter((h) => h.category === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                  active
                    ? tab.id === 'favorites'
                      ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white'
                      : 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/15 text-[#404944] hover:text-[#022C22] dark:text-emerald-200/85 dark:hover:text-white'
                }`}
              >
                {tab.id === 'favorites' && (
                  <Heart className={`w-3.5 h-3.5 ${active || count > 0 ? 'fill-current' : ''} ${active ? '' : 'text-rose-500 dark:text-rose-400'}`} />
                )}
                <span>{tab.label} ({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {onToggleAutoplayQueue && (
            <button
              type="button"
              onClick={onToggleAutoplayQueue}
              aria-pressed={settings.autoplayQueue !== false}
              title="Automatically advance to the next Hadith when playback finishes"
              className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                settings.autoplayQueue !== false
                  ? 'border-[#064E3B]/25 bg-[#064E3B]/8 text-[#064E3B] dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-200'
                  : 'border-[#064E3B]/15 bg-white text-[#404944] dark:border-emerald-300/15 dark:bg-[#0A2921] dark:text-emerald-200/70'
              }`}
            >
              Autoplay: {settings.autoplayQueue !== false ? 'On' : 'Off'}
            </button>
          )}
          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={handleTogglePlayAll}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                isQueuePlaying && isSpeaking
                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  : 'bg-[#064E3B] text-[#FEF3C7] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22]'
              }`}
            >
              {isQueuePlaying && isSpeaking ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Reading Mode</span>
                </>
              ) : (
                <>
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Reading Mode ({filteredItems.length})</span>
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

      {/* Active Reading Mode Control Strip */}
      {(isQueuePlaying || (isSpeaking && activeHadithItem)) && activeHadithItem && (
        <div
          data-reading-strip="true"
          className="sticky top-2 z-20 rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-[#FFFFFF]/95 dark:bg-[#041D17]/95 backdrop-blur-md px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ScrollText className="w-4 h-4 text-[#D97706] dark:text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                Reading Mode · {activeHadithItem.title}
              </p>
              <p className="text-[11px] text-[#0F766E] dark:text-emerald-300/85 truncate">
                {activeHadithItem.reference}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoScrollEnabled((v) => !v)}
              aria-pressed={autoScrollEnabled}
              className={`min-h-[32px] px-2.5 rounded-full text-[11px] font-semibold transition-colors ${
                autoScrollEnabled
                  ? 'bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200'
                  : 'text-[#404944] hover:bg-[#064E3B]/6 dark:text-emerald-200/70'
              }`}
            >
              {autoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off'}
            </button>
            <button
              type="button"
              onClick={() => handleStepQueue(-1)}
              aria-label="Previous Hadith"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4]"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleTogglePlayAll}
              aria-label={isSpeaking ? 'Pause Reading Mode' : 'Resume Reading Mode'}
              className="w-8 h-8 rounded-full bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22] flex items-center justify-center"
            >
              {isSpeaking ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleStepQueue(1)}
              aria-label="Next Hadith"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4]"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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

                    {onToggleFavorite && (() => {
                      const favId = getHadithFavoriteId(item.id);
                      const isFav = Boolean(favoriteIds?.has(favId));
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleFavorite({
                              id: favId,
                              type: 'hadith',
                              title: item.title,
                              subtitle: item.narrator,
                              arabic: item.arabic,
                              transliteration: item.transliteration,
                              translation: localizedTranslation,
                              reference: `${item.reference} · ${item.grading}`,
                              savedAt: formatFavoriteSavedDate(),
                              hadithId: item.id,
                            })
                          }
                          aria-pressed={isFav}
                          aria-label={
                            isFav
                              ? `Remove ${item.title} from favorites`
                              : `Favorite ${item.title}`
                          }
                          title={isFav ? 'Favorited' : 'Favorite Hadith'}
                          className={`min-h-[36px] min-w-[36px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                            isFav
                              ? 'border-rose-500/35 bg-rose-500/10 text-rose-600 dark:border-rose-400/35 dark:bg-rose-400/15 dark:text-rose-300'
                              : 'border-[#064E3B]/12 dark:border-emerald-300/18 text-[#404944] hover:text-rose-600 hover:border-rose-400/30 hover:bg-rose-500/5 dark:text-emerald-200/80 dark:hover:text-rose-300'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                          <span className="hidden sm:inline">{isFav ? 'Saved' : 'Favorite'}</span>
                        </button>
                      );
                    })()}

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

                {/* Arabic Hadith Matn with Word-by-Word Highlighting */}
                <HighlightedArabicText
                  text={item.arabic}
                  isActive={isSpeakingThis && !isBufferingThis}
                  progressRatio={isSelectedItem ? smoothProgress : 0}
                  highlightStyle={settings.highlightStyle}
                  speechCharIndex={
                    isSelectedItem && isSpeechFallback ? speechCharIndex : null
                  }
                  fontClass={fontClass}
                  fontSize={Math.max(22, Math.min(34, settings.arabicFontSize - 2))}
                  lineHeight={2.1}
                  className="pt-1"
                />

                {/* Synchronized Transliteration & Translation */}
                {(settings.showTransliteration || settings.showTranslation) && (
                  <div className="space-y-2.5 min-w-0 break-words">
                    {settings.showTransliteration && (
                      <HighlightedSyncText
                        text={item.transliteration}
                        arabicText={item.arabic}
                        isActive={isSpeakingThis && !isBufferingThis}
                        progressRatio={isSelectedItem ? smoothProgress : 0}
                        speechCharIndex={
                          isSelectedItem && isSpeechFallback ? speechCharIndex : null
                        }
                        variant="transliteration"
                        className="text-[14px] font-medium italic leading-relaxed text-[#0F766E] dark:text-emerald-300/90 break-words"
                      />
                    )}

                    {settings.showTranslation && (
                      <HighlightedSyncText
                        text={localizedTranslation}
                        arabicText={item.arabic}
                        isActive={isSpeakingThis && !isBufferingThis}
                        progressRatio={isSelectedItem ? smoothProgress : 0}
                        speechCharIndex={
                          isSelectedItem && isSpeechFallback ? speechCharIndex : null
                        }
                        variant="translation"
                        lang={activeLang}
                        dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
                        className={`text-[#022C22]/90 dark:text-[#D0FAEA]/95 break-words ${getTranslationTextClass(
                          activeLang,
                          'card'
                        )}`}
                      />
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
