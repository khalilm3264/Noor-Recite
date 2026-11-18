import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  Pause,
  Play,
  Repeat1,
  RotateCcw,
  ScrollText,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import {
  DuaCategory,
  DuaOrKalimaItem,
  QariVoiceProfile,
  ReaderSettings,
  Reciter,
  TranslationLanguage,
} from '../types/quran';
import { DUAS_AND_KALIMAS } from '../data/duasAndKalimas';
import { getEveryAyahUrl } from '../data/quranData';
import { ensureAudioCached, getCachedAudioSrc } from '../utils/audioCache';
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
import { getArabicVerseWeightRanges } from '../utils/arabicWordSync';
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

interface DuasKalimasViewProps {
  settings: ReaderSettings;
  reciter: Reciter;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  onSelectVoiceProfile?: (profile: QariVoiceProfile) => void;
  onToggleAutoplayQueue?: () => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

const CATEGORY_TABS: { id: 'all' | DuaCategory; label: string }[] = [
  { id: 'all', label: 'All Essentials' },
  { id: 'kalimas', label: '6 Kalimas' },
  { id: 'daily', label: 'Daily Duas' },
  { id: 'quranic', label: "Qur'anic Duas" },
  { id: 'adhkar', label: 'Adhkar & Salawat' },
  { id: 'rare', label: 'Nature & Obscure' },
];

function resolveEffectiveDuaItem(
  item: DuaOrKalimaItem,
  variantId?: string
): DuaOrKalimaItem {
  if (!variantId || variantId === 'primary' || !item.alternates?.length) {
    return item;
  }
  const alt = item.alternates.find((v) => v.id === variantId);
  if (!alt) return item;
  return {
    ...item,
    badge: alt.badge ?? item.badge,
    arabic: alt.arabic,
    transliteration: alt.transliteration,
    translationEn: alt.translationEn,
    translationHi: alt.translationHi,
    translationUr: alt.translationUr,
    reference: alt.reference,
    note: alt.note ?? item.note,
    audioUrl: alt.audioUrl,
    fallbackAudioUrl: alt.fallbackAudioUrl,
    quranRef: alt.quranRef,
    quranRange: alt.quranRange,
    wordTimings: alt.wordTimings,
  };
}

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
  onSelectVoiceProfile,
  onToggleAutoplayQueue,
  onPracticeInReader,
  onPauseReaderAudio,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | DuaCategory>('all');
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAiVoice, setIsAiVoice] = useState(false);
  const [isFallbackAudioSource, setIsFallbackAudioSource] = useState(false);
  const [isSpeechFallback, setIsSpeechFallback] = useState(false);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [loopActiveItem, setLoopActiveItem] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeVerseIndex, setActiveVerseIndex] = useState(0);
  const [speechCharIndex, setSpeechCharIndex] = useState<number | null>(null);
  const [activeSpeechBounds, setActiveSpeechBounds] = useState<SpeechBounds | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [audioErrorId, setAudioErrorId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const activeVerseIndexRef = useRef(0);
  const rangeDurationsRef = useRef<Record<number, number>>({});
  const pendingSeekSecRef = useRef<number | null>(null);
  const fallbackAttemptedRef = useRef<Set<string>>(new Set());
  const externalAttemptedRef = useRef<Set<string>>(new Set());
  const aiAttemptedRef = useRef<Set<string>>(new Set());
  const activeItemRef = useRef<DuaOrKalimaItem | null>(null);
  const queueFlagRef = useRef(false);
  const loopFlagRef = useRef(false);
  const filteredRef = useRef<DuaOrKalimaItem[]>([]);
  const playbackSessionRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const keepaliveHeldRef = useRef(false);

  loopFlagRef.current = loopActiveItem;

  const activeLang: TranslationLanguage = settings.translationLanguage ?? 'en';
  const translationEntries = useMemo(() => {
    const entries: { key: string; text: string; arabic: string }[] = [];
    for (const item of DUAS_AND_KALIMAS) {
      entries.push({
        key: `dua-tr-${item.id}`,
        text: item.translationEn,
        arabic: item.arabic,
      });
      if (item.alternates) {
        for (const alt of item.alternates) {
          entries.push({
            key: `dua-tr-${item.id}-${alt.id}`,
            text: alt.translationEn,
            arabic: alt.arabic,
          });
        }
      }
    }
    return entries;
  }, []);
  const { resolve: resolveDynamicText, isTranslating } = useBatchTranslations(
    activeLang,
    translationEntries
  );

  const fontClass =
    settings.arabicFont === 'scheherazade'
      ? 'font-quran-scheherazade'
      : 'font-quran-amiri';

  // Explicit audioUrl (Kalimas, Duas, and exact-excerpt Qari clips) takes priority; full-verse Qur'anic duas stream from active reciter
  const getPrimaryAudioUrl = useCallback(
    (item: DuaOrKalimaItem, verseOffset = 0): string | null => {
      if (item.audioUrl) {
        return item.audioUrl;
      }
      if (item.quranRange) {
        const ayahNum = Math.min(
          item.quranRange.endAyah,
          item.quranRange.startAyah + Math.max(0, verseOffset)
        );
        return getEveryAyahUrl(
          reciter.everyAyahFolder,
          item.quranRange.surahId,
          ayahNum
        );
      }
      if (item.quranRef) {
        return getEveryAyahUrl(
          reciter.everyAyahFolder,
          item.quranRef.surahId,
          item.quranRef.ayahNumber
        );
      }
      return null;
    },
    [reciter.everyAyahFolder]
  );

  const getActiveVariantId = useCallback(
    (item: DuaOrKalimaItem): string => {
      const explicit = selectedVariants[item.id];
      if (explicit) return explicit;
      const q = query.trim().toLowerCase();
      if (q && item.alternates?.length) {
        const primaryMatch =
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          item.arabic.includes(q) ||
          item.transliteration.toLowerCase().includes(q) ||
          item.translationEn.toLowerCase().includes(q) ||
          item.translationHi.toLowerCase().includes(q) ||
          item.translationUr.toLowerCase().includes(q) ||
          resolveDynamicText(item.translationEn).toLowerCase().includes(q) ||
          item.reference.toLowerCase().includes(q);
        if (!primaryMatch) {
          const matchedAlt = item.alternates.find(
            (alt) =>
              alt.label.toLowerCase().includes(q) ||
              (alt.badge && alt.badge.toLowerCase().includes(q)) ||
              alt.arabic.includes(q) ||
              alt.transliteration.toLowerCase().includes(q) ||
              alt.translationEn.toLowerCase().includes(q) ||
              alt.translationHi.toLowerCase().includes(q) ||
              alt.translationUr.toLowerCase().includes(q) ||
              resolveDynamicText(alt.translationEn).toLowerCase().includes(q) ||
              alt.reference.toLowerCase().includes(q) ||
              (alt.note && alt.note.toLowerCase().includes(q))
          );
          if (matchedAlt) return matchedAlt.id;
        }
      }
      return 'primary';
    },
    [query, resolveDynamicText, selectedVariants]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUAS_AND_KALIMAS.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const primaryMatch =
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.arabic.includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.translationEn.toLowerCase().includes(q) ||
        item.translationHi.toLowerCase().includes(q) ||
        item.translationUr.toLowerCase().includes(q) ||
        resolveDynamicText(item.translationEn).toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q);
      if (primaryMatch) return true;
      return Boolean(
        item.alternates?.some(
          (alt) =>
            alt.label.toLowerCase().includes(q) ||
            (alt.badge && alt.badge.toLowerCase().includes(q)) ||
            alt.arabic.includes(q) ||
            alt.transliteration.toLowerCase().includes(q) ||
            alt.translationEn.toLowerCase().includes(q) ||
            alt.translationHi.toLowerCase().includes(q) ||
            alt.translationUr.toLowerCase().includes(q) ||
            resolveDynamicText(alt.translationEn).toLowerCase().includes(q) ||
            alt.reference.toLowerCase().includes(q) ||
            (alt.note && alt.note.toLowerCase().includes(q))
        )
      );
    });
  }, [activeCategory, query, resolveDynamicText]);

  filteredRef.current = filteredItems;
  const getActiveVariantIdRef = useRef(getActiveVariantId);
  getActiveVariantIdRef.current = getActiveVariantId;

  const stopSpeech = useCallback(() => {
    playbackSessionRef.current += 1;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Pre-warm human EveryAyah / Dua / Kalima MP3s and local Qari audio files into CacheStorage
  useEffect(() => {
    const controller = new AbortController();
    const urlSet = new Set<string>();
    const enqueueSource = (src: Pick<DuaOrKalimaItem, 'audioUrl' | 'fallbackAudioUrl' | 'quranRange' | 'quranRef'>) => {
      if (src.audioUrl) {
        urlSet.add(src.audioUrl);
      } else if (src.quranRange) {
        for (let a = src.quranRange.startAyah; a <= src.quranRange.endAyah; a++) {
          urlSet.add(getEveryAyahUrl(reciter.everyAyahFolder, src.quranRange.surahId, a));
        }
      } else if (src.quranRef) {
        urlSet.add(
          getEveryAyahUrl(
            reciter.everyAyahFolder,
            src.quranRef.surahId,
            src.quranRef.ayahNumber
          )
        );
      }
      if (src.fallbackAudioUrl) urlSet.add(src.fallbackAudioUrl);
    };

    for (const item of filteredItems) {
      enqueueSource(item);
      if (item.alternates) {
        for (const alt of item.alternates) {
          enqueueSource(alt);
        }
      }
    }
    const audioUrls = Array.from(urlSet);

    let cursor = 0;
    const worker = async () => {
      while (!controller.signal.aborted) {
        const idx = cursor++;
        if (idx >= audioUrls.length) return;
        const url = audioUrls[idx];
        const cached = await ensureAudioCached(url, controller.signal);
        if (cached && !controller.signal.aborted) {
          void analyzeSpeechBounds(url);
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(3, audioUrls.length) }, () => worker())
    );

    const localQariItems = filteredItems.filter((item) => !getPrimaryAudioUrl(item));
    if (localQariItems.length > 0) {
      void prefetchAiTtsAudio(
        localQariItems.map((item) => ({
          text: item.arabic,
          voiceName: 'Charon',
          style: QARI_TTS_STYLES.dua,
        })),
        { signal: controller.signal, concurrency: 2, delayMs: 0 }
      );
    }

    return () => controller.abort();
  }, [filteredItems, getPrimaryAudioUrl, reciter.everyAyahFolder]);

  // Smooth auto-scroll active item into clear safe view during playback
  useEffect(() => {
    if (!activeId || !isPlaying || !autoScrollEnabled) return;
    const runScroll = () => scrollTargetIntoCenter(`dua-card-${activeId}`);
    const raf = window.requestAnimationFrame(runScroll);
    const timer = window.setTimeout(runScroll, 120);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [activeId, isPlaying, autoScrollEnabled]);

  // Keep OS audio pipeline alive across sequential Dua/Kalima transitions
  useEffect(() => {
    if (isPlaying && !keepaliveHeldRef.current) {
      keepaliveHeldRef.current = true;
      startBackgroundAudioKeepalive();
    } else if (!isPlaying && keepaliveHeldRef.current) {
      keepaliveHeldRef.current = false;
      stopBackgroundAudioKeepalive();
    }
  }, [isPlaying]);

  // Keep playbackRate synced with ReaderSettings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  // Keep Web Audio Voice Tone DSP synced with ReaderSettings
  useEffect(() => {
    if (audioRef.current) {
      applyVoiceTimbreProfile(
        audioRef.current,
        settings.qariVoiceProfile ?? 'recorded'
      );
    }
  }, [settings.qariVoiceProfile]);

  // Clean up audio & speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (keepaliveHeldRef.current) {
        keepaliveHeldRef.current = false;
        stopBackgroundAudioKeepalive();
      }
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
        const { voice: arabicVoice, pitch } = selectRegionalArabicVoice(
          voices,
          settings.qariVoiceProfile ?? 'recorded'
        );

        const utterance = new SpeechSynthesisUtterance(
          normalizeArabicForSpeech(item.arabic)
        );
        utterance.lang = arabicVoice?.lang || 'ar-SA';
        if (arabicVoice) utterance.voice = arabicVoice;
        utterance.pitch = pitch;
        utterance.rate = Math.max(0.65, Math.min(1.3, settings.playbackSpeed * 0.9));
        setSpeechCharIndex(null);
        utterance.onboundary = (ev) => {
          if (typeof ev.charIndex === 'number') {
            setSpeechCharIndex(ev.charIndex);
          }
        };

        utterance.onend = () => {
          setIsSpeechFallback(false);
          setSpeechCharIndex(null);
          if (queueFlagRef.current) {
            const list = filteredRef.current;
            const idx = list.findIndex((d) => d.id === item.id);
            if (idx >= 0 && idx < list.length - 1) {
              const nextBase = list[idx + 1];
              const nextResolved = resolveEffectiveDuaItem(
                nextBase,
                getActiveVariantIdRef.current(nextBase)
              );
              startPlaybackRef.current(nextResolved, true);
              return;
            }
          }
          setIsQueuePlaying(false);
          setIsPlaying(false);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setIsSpeechFallback(false);
          setSpeechCharIndex(null);
          setIsQueuePlaying(false);
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
    [settings.playbackSpeed, settings.qariVoiceProfile]
  );

  const attachUrlAndAnalyze = useCallback(
    (audio: HTMLAudioElement, url: string, verseIndexForRange?: number) => {
      activeAudioUrlRef.current = url;
      clearAudioUnlockFlag(audio);
      audio.muted = false;
      void analyzeSpeechBounds(url).then((bounds) => {
        if (bounds && typeof verseIndexForRange === 'number' && bounds.durationSec > 0) {
          rangeDurationsRef.current[verseIndexForRange] = bounds.durationSec;
        }
        if (activeAudioUrlRef.current === url) {
          setActiveSpeechBounds(bounds);
        }
      });
    },
    []
  );

  const tryExternalOrSpeechFallback = useCallback(
    (item: DuaOrKalimaItem) => {
      const audio = audioRef.current;
      if (audio && item.audioUrl && !externalAttemptedRef.current.has(item.id)) {
        externalAttemptedRef.current.add(item.id);
        const extSrc = getCachedAudioSrc(item.audioUrl);
        attachUrlAndAnalyze(audio, extSrc);
        audio.src = extSrc;
        audio.load();
        applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
        audio.playbackRate = settings.playbackSpeed;
        setIsAiVoice(false);
        setIsFallbackAudioSource(false);
        setIsBuffering(true);
        setIsPlaying(true);
        audio.play().catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          setIsBuffering(false);
          if (!tryArabicSpeechFallback(item)) {
            setIsPlaying(false);
            setIsQueuePlaying(false);
            setAudioErrorId(item.id);
          }
        });
        return;
      }

      if (!tryArabicSpeechFallback(item)) {
        setIsPlaying(false);
        setIsQueuePlaying(false);
        setAudioErrorId(item.id);
      }
    },
    [attachUrlAndAnalyze, settings.playbackSpeed, settings.qariVoiceProfile, tryArabicSpeechFallback]
  );

  const synthesizeAndPlayAiVoice = useCallback(
    async (item: DuaOrKalimaItem, session: number, asFallback = false) => {
      const audio = audioRef.current;
      aiAttemptedRef.current.add(item.id);

      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;

      const cachedUrl = getCachedAiTtsUrl(item.arabic, {
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.dua,
      });
      if (audio && cachedUrl) {
        attachUrlAndAnalyze(audio, cachedUrl);
        if (audio.src !== cachedUrl) {
          audio.src = cachedUrl;
          audio.load();
        } else {
          audio.currentTime = 0;
        }
        applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
        audio.playbackRate = settings.playbackSpeed;
        setIsAiVoice(true);
        setIsFallbackAudioSource(asFallback);
        setIsBuffering(false);
        setIsPlaying(true);
        audio.play().catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          setIsAiVoice(false);
          tryExternalOrSpeechFallback(item);
        });
        return;
      }

      unlockAudioElement(audio);
      setIsAiVoice(true);
      setIsFallbackAudioSource(asFallback);
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

        attachUrlAndAnalyze(audio, blobUrl);
        audio.src = blobUrl;
        audio.load();
        applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
        audio.playbackRate = settings.playbackSpeed;
        setIsBuffering(false);
        await audio.play();
      } catch (err) {
        if (ctrl.signal.aborted || playbackSessionRef.current !== session) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsBuffering(false);
        setIsAiVoice(false);
        tryExternalOrSpeechFallback(item);
      }
    },
    [attachUrlAndAnalyze, settings.playbackSpeed, settings.qariVoiceProfile, tryExternalOrSpeechFallback]
  );

  const playQuranRangeVerseAt = useCallback(
    (item: DuaOrKalimaItem, verseOffset: number, seekSec = 0) => {
      const audio = audioRef.current;
      const quranUrl = getPrimaryAudioUrl(item, verseOffset);
      if (!audio || !quranUrl) return;

      activeVerseIndexRef.current = verseOffset;
      setActiveVerseIndex(verseOffset);
      setActiveSpeechBounds(null);
      setIsFallbackAudioSource(false);
      pendingSeekSecRef.current = seekSec > 0 ? seekSec : null;
      setCurrentTime(seekSec);
      setDuration(rangeDurationsRef.current[verseOffset] ?? 0);

      const playableSrc = getCachedAudioSrc(quranUrl);
      attachUrlAndAnalyze(
        audio,
        playableSrc,
        item.quranRange && !item.audioUrl ? verseOffset : undefined
      );
      if (audio.src !== playableSrc) {
        audio.src = playableSrc;
        audio.load();
      } else {
        audio.currentTime = seekSec;
        pendingSeekSecRef.current = null;
      }
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      setIsBuffering(true);
      setIsPlaying(true);

      if (item.quranRange && !item.audioUrl) {
        const total = item.quranRange.endAyah - item.quranRange.startAyah + 1;
        for (let look = 1; look <= 2; look++) {
          if (verseOffset + look < total) {
            const nextUrl = getPrimaryAudioUrl(item, verseOffset + look);
            if (nextUrl) {
              void ensureAudioCached(nextUrl).then((cached) => {
                if (cached) void analyzeSpeechBounds(nextUrl);
              });
            }
          }
        }
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          setIsBuffering(false);
          if (item.fallbackAudioUrl && !fallbackAttemptedRef.current.has(item.id)) {
            fallbackAttemptedRef.current.add(item.id);
            setIsFallbackAudioSource(true);
            const fbSrc = getCachedAudioSrc(item.fallbackAudioUrl);
            attachUrlAndAnalyze(audio, fbSrc);
            audio.src = fbSrc;
            audio.load();
            applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
            audio.playbackRate = settings.playbackSpeed;
            audio.play().catch((fbErr) => {
              if (fbErr?.name === 'AbortError' || audio.error) return;
              if (!aiAttemptedRef.current.has(item.id)) {
                void synthesizeAndPlayAiVoice(item, playbackSessionRef.current, true);
              } else {
                tryExternalOrSpeechFallback(item);
              }
            });
            return;
          }
          if (!aiAttemptedRef.current.has(item.id)) {
            void synthesizeAndPlayAiVoice(item, playbackSessionRef.current, true);
          } else {
            tryExternalOrSpeechFallback(item);
          }
        });
      }
    },
    [
      attachUrlAndAnalyze,
      getPrimaryAudioUrl,
      settings.playbackSpeed,
      settings.qariVoiceProfile,
      synthesizeAndPlayAiVoice,
      tryExternalOrSpeechFallback,
    ]
  );

  const startPlaybackForItem = useCallback(
    (item: DuaOrKalimaItem, preserveQueue = false) => {
      const audio = audioRef.current;
      stopSpeech();
      const session = playbackSessionRef.current;
      onPauseReaderAudio?.();
      setAudioErrorId(null);
      setIsSpeechFallback(false);
      setSpeechCharIndex(null);
      setIsAiVoice(false);
      setIsFallbackAudioSource(false);
      setActiveSpeechBounds(null);
      activeAudioUrlRef.current = null;
      activeVerseIndexRef.current = 0;
      setActiveVerseIndex(0);
      rangeDurationsRef.current = {};
      pendingSeekSecRef.current = null;
      queueFlagRef.current = preserveQueue;
      setIsQueuePlaying(preserveQueue);

      activeItemRef.current = item;
      setActiveId(item.id);
      fallbackAttemptedRef.current.delete(item.id);
      externalAttemptedRef.current.delete(item.id);
      aiAttemptedRef.current.delete(item.id);
      setCurrentTime(0);
      setDuration(0);

      const primaryUrl = getPrimaryAudioUrl(item, 0);
      if (!audio || !primaryUrl) {
        void synthesizeAndPlayAiVoice(item, session, false);
        return;
      }

      if (primaryUrl === item.audioUrl) {
        externalAttemptedRef.current.add(item.id);
      }

      playQuranRangeVerseAt(item, 0, 0);
    },
    [
      getPrimaryAudioUrl,
      onPauseReaderAudio,
      playQuranRangeVerseAt,
      stopSpeech,
      synthesizeAndPlayAiVoice,
    ]
  );

  const startPlaybackRef = useRef(startPlaybackForItem);
  startPlaybackRef.current = startPlaybackForItem;

  const handleToggleRecite = (item: DuaOrKalimaItem) => {
    const audio = audioRef.current;
    const shouldAutoplay = settings.autoplayQueue !== false;

    if (activeId === item.id && isPlaying) {
      stopSpeech();
      if (audio && !audio.paused) {
        audio.pause();
      }
      queueFlagRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      setIsSpeechFallback(false);
      setIsQueuePlaying(false);
      return;
    }

    // Resume paused item smoothly if same audio source is still loaded mid-recitation
    if (
      activeId === item.id &&
      !isPlaying &&
      !isSpeechFallback &&
      audio &&
      audio.src &&
      !audio.ended &&
      audio.readyState >= 1
    ) {
      onPauseReaderAudio?.();
      setAudioErrorId(null);
      queueFlagRef.current = shouldAutoplay;
      setIsQueuePlaying(shouldAutoplay);
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      setIsPlaying(true);
      audio.play().catch(() => {
        startPlaybackForItem(item, shouldAutoplay);
      });
      return;
    }

    startPlaybackForItem(item, shouldAutoplay);
  };

  const handleTogglePlayAll = () => {
    if (isQueuePlaying && isPlaying) {
      stopSpeech();
      audioRef.current?.pause();
      queueFlagRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      setIsQueuePlaying(false);
      return;
    }
    if (!filteredItems.length) return;
    setLoopActiveItem(false);
    setAutoScrollEnabled(true);
    queueFlagRef.current = true;
    setIsQueuePlaying(true);
    const rawStart =
      (activeId && filteredItems.find((d) => d.id === activeId)) ||
      filteredItems[0];
    const resolvedStart = resolveEffectiveDuaItem(rawStart, getActiveVariantId(rawStart));
    startPlaybackForItem(resolvedStart, true);
  };

  const handleStepQueue = useCallback(
    (dir: -1 | 1) => {
      if (!filteredItems.length) return;
      const idx = activeId
        ? filteredItems.findIndex((d) => d.id === activeId)
        : 0;
      const nextIdx =
        idx < 0
          ? 0
          : Math.min(filteredItems.length - 1, Math.max(0, idx + dir));
      const target = filteredItems[nextIdx];
      if (target) {
        const resolved = resolveEffectiveDuaItem(target, getActiveVariantId(target));
        startPlaybackForItem(resolved, isQueuePlaying || isPlaying);
      }
    },
    [filteredItems, activeId, startPlaybackForItem, isQueuePlaying, isPlaying, getActiveVariantId]
  );

  const handleSelectVariant = useCallback(
    (baseItem: DuaOrKalimaItem, variantId: string) => {
      setSelectedVariants((prev) => ({ ...prev, [baseItem.id]: variantId }));
      if (activeId === baseItem.id) {
        const nextResolved = resolveEffectiveDuaItem(baseItem, variantId);
        if (isPlaying) {
          startPlaybackForItem(nextResolved, queueFlagRef.current);
        } else {
          stopSpeech();
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          }
          activeItemRef.current = nextResolved;
          setActiveId(null);
          setCurrentTime(0);
          setDuration(0);
          setActiveSpeechBounds(null);
          setAudioErrorId(null);
        }
      }
    },
    [activeId, isPlaying, startPlaybackForItem, stopSpeech]
  );

  const activeDuaItem = useMemo(() => {
    if (!activeId) return null;
    const base = DUAS_AND_KALIMAS.find((d) => d.id === activeId);
    if (!base) return null;
    return resolveEffectiveDuaItem(base, getActiveVariantId(base));
  }, [activeId, getActiveVariantId]);

  const arabicVerseRanges = useMemo(
    () => (activeDuaItem ? getArabicVerseWeightRanges(activeDuaItem.arabic) : []),
    [activeDuaItem]
  );

  const activeRangeBounds = useMemo(() => {
    if (
      !activeDuaItem?.quranRange ||
      activeDuaItem.audioUrl ||
      arabicVerseRanges.length <= 1 ||
      isAiVoice ||
      isSpeechFallback
    ) {
      return { startRatio: 0, endRatio: 1 };
    }
    const found = arabicVerseRanges[activeVerseIndex];
    return found
      ? { startRatio: found.startRatio, endRatio: found.endRatio }
      : { startRatio: 0, endRatio: 1 };
  }, [activeDuaItem, arabicVerseRanges, activeVerseIndex, isAiVoice, isSpeechFallback]);

  const isEveryAyahMultiVerse = Boolean(
    activeDuaItem?.quranRange && !activeDuaItem.audioUrl && !isAiVoice && !isSpeechFallback
  );
  const canUseWordTimings = Boolean(
    activeDuaItem?.wordTimings?.length &&
      !isSpeechFallback &&
      !isFallbackAudioSource &&
      !isEveryAyahMultiVerse
  );

  const smoothProgress = useSmoothAudioProgress({
    audioRef,
    isPlaying,
    isBuffering,
    isSpeechFallback,
    fallbackTextLength: activeDuaItem?.arabic.length ?? 50,
    playbackSpeed: settings.playbackSpeed,
    currentTime,
    duration,
    speechBounds: activeSpeechBounds,
    wordTimings: canUseWordTimings ? activeDuaItem?.wordTimings ?? null : null,
    arabicText: activeDuaItem?.arabic ?? '',
    rangeStart: activeRangeBounds.startRatio,
    rangeEnd: activeRangeBounds.endRatio,
  });

  // Follow active highlighted Arabic word inside tall Dua cards
  useEffect(() => {
    if (!activeId || !isPlaying || isBuffering || !autoScrollEnabled) return;
    scrollActiveWordIntoView(`dua-card-${activeId}`);
  }, [activeId, isPlaying, isBuffering, autoScrollEnabled, smoothProgress]);

  useEffect(() => {
    if (!activeDuaItem) return;
    updateBackgroundMediaSession({
      title: activeDuaItem.title,
      artist: activeDuaItem.reference,
      album: 'Noor Recite · Duas & Adhkar Reading Mode',
      isPlaying,
      onPlay: () => {
        if (!isPlaying) startPlaybackRef.current(activeDuaItem, queueFlagRef.current);
      },
      onPause: () => {
        if (isPlaying) {
          stopSpeech();
          audioRef.current?.pause();
          setIsPlaying(false);
        }
      },
      onNext: () => handleStepQueue(1),
      onPrev: () => handleStepQueue(-1),
    });
  }, [activeDuaItem, isPlaying, handleStepQueue, stopSpeech]);

  const getMultiVerseTotalAndOffset = useCallback(() => {
    if (!activeDuaItem?.quranRange || activeDuaItem.audioUrl) {
      return {
        totalVerses: 1,
        aggregateTime: currentTime,
        aggregateDuration: duration,
      };
    }
    const totalVerses =
      activeDuaItem.quranRange.endAyah - activeDuaItem.quranRange.startAyah + 1;
    const weights =
      arabicVerseRanges.length === totalVerses
        ? arabicVerseRanges.map((r) => Math.max(1, r.totalWeight))
        : Array.from({ length: totalVerses }, () => 1);
    const activeW = weights[activeVerseIndex] ?? 1;
    const activeDur =
      duration > 0 ? duration : rangeDurationsRef.current[activeVerseIndex] ?? 4.5;
    const secPerWeight = activeDur / Math.max(1, activeW);

    let aggregateDuration = 0;
    let aggregateTime = 0;
    for (let i = 0; i < totalVerses; i++) {
      const est = rangeDurationsRef.current[i] ?? Math.max(1.8, weights[i] * secPerWeight);
      aggregateDuration += est;
      if (i < activeVerseIndex) {
        aggregateTime += est;
      } else if (i === activeVerseIndex) {
        aggregateTime += Math.min(currentTime, est);
      }
    }
    return { totalVerses, aggregateTime, aggregateDuration, weights, secPerWeight };
  }, [activeDuaItem, arabicVerseRanges, activeVerseIndex, currentTime, duration]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || isSpeechFallback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width))
    );

    if (activeDuaItem?.quranRange && !activeDuaItem.audioUrl && !isAiVoice) {
      const info = getMultiVerseTotalAndOffset();
      const targetSec = ratio * info.aggregateDuration;
      let acc = 0;
      for (let i = 0; i < info.totalVerses; i++) {
        const est =
          rangeDurationsRef.current[i] ??
          Math.max(1.8, (info.weights?.[i] ?? 1) * (info.secPerWeight ?? 1));
        if (targetSec <= acc + est || i === info.totalVerses - 1) {
          const localSec = Math.max(0, Math.min(est - 0.1, targetSec - acc));
          if (i === activeVerseIndexRef.current && audio.readyState >= 1) {
            audio.currentTime = localSec;
            setCurrentTime(localSec);
          } else {
            playQuranRangeVerseAt(activeDuaItem, i, localSec);
          }
          return;
        }
        acc += est;
      }
      return;
    }

    if (!duration) return;
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

    // Advance sequentially through all verses when streaming a multi-verse quranRange
    if (currentItem.quranRange && !currentItem.audioUrl && !isAiVoice && !isSpeechFallback) {
      const totalVerses =
        currentItem.quranRange.endAyah - currentItem.quranRange.startAyah + 1;
      const d = audioRef.current?.duration;
      if (d && Number.isFinite(d) && d > 0) {
        rangeDurationsRef.current[activeVerseIndexRef.current] = d;
      }
      const nextVerseIdx = activeVerseIndexRef.current + 1;
      if (nextVerseIdx < totalVerses) {
        playQuranRangeVerseAt(currentItem, nextVerseIdx, 0);
        return;
      }
    }

    // Auto-increment dhikr counter cleanly when full recitation finishes
    if (currentItem.recommendedCount) {
      setCounts((prev) => ({
        ...prev,
        [currentItem.id]: (prev[currentItem.id] ?? 0) + 1,
      }));
    }

    if (loopFlagRef.current) {
      if (currentItem.quranRange && !currentItem.audioUrl && !isAiVoice) {
        playQuranRangeVerseAt(currentItem, 0, 0);
        return;
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        applyVoiceTimbreProfile(
          audioRef.current,
          settings.qariVoiceProfile ?? 'recorded'
        );
        audioRef.current.playbackRate = settings.playbackSpeed;
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
        return;
      }
    }

    if (queueFlagRef.current) {
      const idx = filteredRef.current.findIndex((d) => d.id === currentItem.id);
      if (idx >= 0 && idx < filteredRef.current.length - 1) {
        const nextItem = filteredRef.current[idx + 1];
        const nextResolved = resolveEffectiveDuaItem(
          nextItem,
          getActiveVariantIdRef.current(nextItem)
        );
        startPlaybackForItem(nextResolved, true);
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

    if (item.audioUrl && !externalAttemptedRef.current.has(item.id)) {
      externalAttemptedRef.current.add(item.id);
      const extSrc = getCachedAudioSrc(item.audioUrl);
      attachUrlAndAnalyze(audio, extSrc);
      audio.src = extSrc;
      audio.load();
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      audio.play().catch((err) => {
        if (err?.name === 'AbortError' || audio.error) return;
        setIsBuffering(false);
        if (!tryArabicSpeechFallback(item)) {
          setIsPlaying(false);
          setIsQueuePlaying(false);
          setAudioErrorId(item.id);
        }
      });
      return;
    }

    if (item.fallbackAudioUrl && !fallbackAttemptedRef.current.has(item.id)) {
      fallbackAttemptedRef.current.add(item.id);
      setIsFallbackAudioSource(true);
      const fbSrc = getCachedAudioSrc(item.fallbackAudioUrl);
      attachUrlAndAnalyze(audio, fbSrc);
      audio.src = fbSrc;
      audio.load();
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      audio.play().catch((err) => {
        if (err?.name === 'AbortError' || audio.error) return;
        setIsBuffering(false);
        if (!aiAttemptedRef.current.has(item.id)) {
          void synthesizeAndPlayAiVoice(item, playbackSessionRef.current, true);
        } else if (!tryArabicSpeechFallback(item)) {
          setIsPlaying(false);
          setIsQueuePlaying(false);
          setAudioErrorId(item.id);
        }
      });
      return;
    }

    if (!aiAttemptedRef.current.has(item.id)) {
      void synthesizeAndPlayAiVoice(item, playbackSessionRef.current, true);
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
        crossOrigin="anonymous"
        preload="auto"
        onLoadedMetadata={(e) => {
          if (isUnlockingAudioEvent(e.currentTarget)) return;
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
            if (activeItemRef.current?.quranRange && !activeItemRef.current.audioUrl) {
              rangeDurationsRef.current[activeVerseIndexRef.current] = d;
            }
          }
          if (pendingSeekSecRef.current !== null) {
            e.currentTarget.currentTime = pendingSeekSecRef.current;
            pendingSeekSecRef.current = null;
          }
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
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
            if (activeItemRef.current?.quranRange && !activeItemRef.current.audioUrl) {
              rangeDurationsRef.current[activeVerseIndexRef.current] = d;
            }
          }
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

      {/* Header + Inline Language & Voice Switchers */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Duas &amp; Six Kalimas
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Essential daily duas, the Six Kalimas, Qur&apos;anic prayers, and Prophetic adhkar with Arabic audio, word highlighting, transliteration, and translations in 13 languages.
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
          {onToggleAutoplayQueue && (
            <button
              type="button"
              onClick={onToggleAutoplayQueue}
              aria-pressed={settings.autoplayQueue !== false}
              title="Automatically advance to the next Dua or Kalima when playback finishes"
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
                isQueuePlaying && isPlaying
                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  : 'bg-[#064E3B] text-[#FEF3C7] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22]'
              }`}
            >
              {isQueuePlaying && isPlaying ? (
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
              placeholder="Search duas or kalimas..."
              aria-label="Search duas and kalimas"
              className="w-full min-h-[38px] pl-9 pr-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs font-medium text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
            />
          </div>
        </div>
      </div>

      {/* Active Reading Mode Control Strip */}
      {(isQueuePlaying || (isPlaying && activeDuaItem)) && activeDuaItem && (
        <div
          data-reading-strip="true"
          className="sticky top-2 z-20 rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-[#FFFFFF]/95 dark:bg-[#041D17]/95 backdrop-blur-md px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ScrollText className="w-4 h-4 text-[#D97706] dark:text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                Reading Mode · {activeDuaItem.title}
              </p>
              <p className="text-[11px] text-[#0F766E] dark:text-emerald-300/85 truncate">
                {activeDuaItem.reference}
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
              aria-label="Previous Dua or Kalima"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4]"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleTogglePlayAll}
              aria-label={isPlaying ? 'Pause Reading Mode' : 'Resume Reading Mode'}
              className="w-8 h-8 rounded-full bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22] flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleStepQueue(1)}
              aria-label="Next Dua or Kalima"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4]"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
          {filteredItems.map((baseItem, idx) => {
            const activeVariantId = getActiveVariantId(baseItem);
            const item = resolveEffectiveDuaItem(baseItem, activeVariantId);
            const count = counts[baseItem.id] ?? 0;
            const target = baseItem.recommendedCount;
            const isSelectedItem = activeId === baseItem.id;
            const isPlayingThis = isSelectedItem && isPlaying;
            const isBufferingThis = isSelectedItem && isBuffering && isPlaying;
            const multiInfo =
              isSelectedItem && item.quranRange && !item.audioUrl && !isAiVoice
                ? getMultiVerseTotalAndOffset()
                : null;
            const displayTime = multiInfo ? multiInfo.aggregateTime : currentTime;
            const displayDuration = multiInfo ? multiInfo.aggregateDuration : duration;
            const progressRatio =
              isSelectedItem && displayDuration > 0
                ? Math.min(1, Math.max(0, displayTime / displayDuration))
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
                id={`dua-card-${baseItem.id}`}
                key={baseItem.id}
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
                        {baseItem.title}
                      </h2>
                      <p className="text-xs text-[#0F766E] dark:text-emerald-300/85">
                        {baseItem.subtitle}
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

                {/* Alternate Authentic Narrations Switcher */}
                {baseItem.alternates && baseItem.alternates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300/85 mr-1">
                      Narrations ({baseItem.alternates.length + 1}):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectVariant(baseItem, 'primary')}
                      className={`min-h-[30px] px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        activeVariantId === 'primary'
                          ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'bg-[#064E3B]/6 text-[#404944] hover:text-[#022C22] dark:bg-emerald-400/10 dark:text-emerald-200/80 dark:hover:text-white'
                      }`}
                    >
                      {baseItem.primaryVariantLabel ?? 'Standard Narration'}
                    </button>
                    {baseItem.alternates.map((alt) => {
                      const isVarActive = activeVariantId === alt.id;
                      return (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => handleSelectVariant(baseItem, alt.id)}
                          className={`min-h-[30px] px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                            isVarActive
                              ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                              : 'bg-[#064E3B]/6 text-[#404944] hover:text-[#022C22] dark:bg-emerald-400/10 dark:text-emerald-200/80 dark:hover:text-white'
                          }`}
                        >
                          {alt.label}
                        </button>
                      );
                    })}
                  </div>
                )}

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
                        {multiInfo && (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200 shrink-0">
                            Verse {activeVerseIndex + 1}/{multiInfo.totalVerses}
                          </span>
                        )}
                        <div
                          onClick={handleSeek}
                          role="slider"
                          aria-label={`Seek ${item.title} recitation`}
                          aria-valuemin={0}
                          aria-valuemax={Math.round(displayDuration || 1)}
                          aria-valuenow={Math.round(displayTime)}
                          tabIndex={0}
                          className="relative flex-1 h-2 rounded-full bg-[#064E3B]/15 dark:bg-emerald-300/20 cursor-pointer overflow-hidden"
                        >
                          <span
                            className="block h-full rounded-full bg-[#D97706] dark:bg-amber-400 transition-[width] duration-75"
                            style={{ width: `${progressRatio * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85 shrink-0">
                          {formatDuration(displayTime)} / {formatDuration(displayDuration)}
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

                {/* Arabic Script with Word-by-Word Highlighting */}
                <HighlightedArabicText
                  text={item.arabic}
                  isActive={isPlayingThis && !isBufferingThis}
                  progressRatio={isSelectedItem ? smoothProgress : 0}
                  highlightStyle={settings.highlightStyle}
                  speechCharIndex={
                    isSelectedItem && isSpeechFallback ? speechCharIndex : null
                  }
                  fontClass={fontClass}
                  fontSize={Math.max(24, Math.min(36, settings.arabicFontSize))}
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
                        isActive={isPlayingThis && !isBufferingThis}
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
                        isActive={isPlayingThis && !isBufferingThis}
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
