import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  Droplets,
  HandHeart,
  ListMusic,
  Loader2,
  MoonStar,
  Pause,
  Play,
  Repeat1,
  RotateCcw,
  ScrollText,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  PrayerCategory,
  PrayerGuideItem,
  QariVoiceProfile,
  RakaatBreakdown,
  ReaderSettings,
  Reciter,
  SalahPostureStep,
  TranslationLanguage,
} from '../types/quran';
import {
  PRAYER_GUIDES,
  SALAH_POSTURE_STEPS,
  WUDU_STEPS,
} from '../data/salahData';
import { SALAH_WORD_TIMINGS, expandWordTimings } from '../data/salahWordTimings';
import { getEveryAyahUrl } from '../data/quranData';
import { ensureAudioCached, getCachedAudioSrc } from '../utils/audioCache';
import {
  clearAudioUnlockFlag,
  getAiTtsAudioUrl,
  getCachedAiTtsUrl,
  isUnlockingAudioEvent,
  prefetchAiTtsAudio,
  QARI_TTS_STYLES,
  unlockAudioElement,
} from '../utils/aiTts';
import { SpeechBounds, analyzeSpeechBounds } from '../utils/speechBounds';
import { ArabicWordTiming, getArabicVerseWeightRanges } from '../utils/arabicWordSync';
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

interface SalahViewProps {
  settings: ReaderSettings;
  reciter: Reciter;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  onSelectVoiceProfile?: (profile: QariVoiceProfile) => void;
  onToggleAutoplayQueue?: () => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

type SalahTab = 'guides' | 'steps' | 'wudu';

interface AudioTarget {
  id: string;
  title: string;
  arabic: string;
  audioUrl?: string;
  fallbackAudioUrl?: string;
  wordTimings?: ArabicWordTiming[];
  quranRef?: { surahId: number; ayahNumber: number };
  quranRange?: { surahId: number; startAyah: number; endAyah: number };
  scrollElementId?: string;
}

const GUIDE_FILTER_TABS: { id: 'all' | PrayerCategory; label: string }[] = [
  { id: 'all', label: 'All Prayers' },
  { id: 'daily', label: '5 Daily + Witr' },
  { id: 'eid', label: 'Jumu’ah & Eid' },
  { id: 'special', label: 'Janazah & Nafl' },
];

const EMPHASIS_STYLES: Record<RakaatBreakdown['emphasis'], string> = {
  fard: 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]',
  wajib: 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]',
  witr: 'bg-[#0F766E] text-white dark:bg-teal-400 dark:text-[#022C22]',
  sunnah:
    'bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200',
  nafl: 'border border-[#064E3B]/20 text-[#404944] dark:border-emerald-300/25 dark:text-emerald-200/85',
};

const TASBIH_STAGES = [
  {
    key: 'subhanallah',
    target: 33,
    arabic: 'سُبْحَانَ ٱللَّهِ',
    transliteration: 'Subḥānallāh',
    meaningEn: 'Glory be to Allah',
    meaningHi: 'अल्लाह पाक है',
    meaningUr: 'اللہ پاک ہے',
  },
  {
    key: 'alhamdulillah',
    target: 33,
    arabic: 'ٱلْحَمْدُ لِلَّهِ',
    transliteration: 'Al-ḥamdulillāh',
    meaningEn: 'All praise is for Allah',
    meaningHi: 'सब तारीफ़ अल्लाह के लिए है',
    meaningUr: 'تمام تعریفیں اللہ کے لیے ہیں',
  },
  {
    key: 'allahuakbar',
    target: 34,
    arabic: 'ٱللَّهُ أَكْبَرُ',
    transliteration: 'Allāhu Akbar',
    meaningEn: 'Allah is the Greatest',
    meaningHi: 'अल्लाह सबसे बड़ा है',
    meaningUr: 'اللہ سب سے بڑا ہے',
  },
] as const;

function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function normalizeArabicForSpeech(text: string): string {
  return text
    .replace(/\u0671/g, '\u0627')
    .replace(/[\u06D6-\u06ED]/g, '')
    .replace(/[\u06DF\u06E0]/g, '')
    .replace(/[۝١٢٣٤٥٦٧٨٩٠()]/g, ' ')
    .trim();
}

export const SalahView: React.FC<SalahViewProps> = ({
  settings,
  reciter,
  onSelectLanguage,
  onSelectVoiceProfile,
  onToggleAutoplayQueue,
  onPracticeInReader,
  onPauseReaderAudio,
}) => {
  const [activeTab, setActiveTab] = useState<SalahTab>('guides');
  const [guideFilter, setGuideFilter] = useState<'all' | PrayerCategory>('all');
  const [query, setQuery] = useState('');
  const [tasbihTotal, setTasbihTotal] = useState(0);

  // Audio playback state shared cleanly across all Salah recitations
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAiVoice, setIsAiVoice] = useState(false);
  const [isFallbackAudioSource, setIsFallbackAudioSource] = useState(false);
  const [isSpeechFallback, setIsSpeechFallback] = useState(false);
  const [isStepQueuePlaying, setIsStepQueuePlaying] = useState(false);
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
  const activeTargetRef = useRef<AudioTarget | null>(null);
  const queueFlagRef = useRef(false);
  const loopFlagRef = useRef(false);
  const activeTabQueueRef = useRef<AudioTarget[]>([]);
  const playbackSessionRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const keepaliveHeldRef = useRef(false);

  loopFlagRef.current = loopActiveItem;

  const activeLang: TranslationLanguage = settings.translationLanguage ?? 'en';
  const translationEntries = useMemo(() => {
    const entries: Array<{ key: string; text: string; arabic?: string }> = [];
    for (const g of PRAYER_GUIDES) {
      entries.push({ key: `salah-niyyah-${g.id}`, text: g.niyyahEn, arabic: g.niyyahArabic });
      g.stepsEn.forEach((stepText, idx) => {
        entries.push({ key: `salah-guide-${g.id}-step-${idx}`, text: stepText });
      });
      if (g.specialAudio) {
        entries.push({
          key: `salah-special-${g.id}`,
          text: g.specialAudio.translationEn,
          arabic: g.specialAudio.arabic,
        });
      }
    }
    for (const s of SALAH_POSTURE_STEPS) {
      entries.push({ key: `salah-posture-${s.id}`, text: s.translationEn, arabic: s.arabic });
    }
    for (const st of TASBIH_STAGES) {
      entries.push({ key: `salah-tasbih-${st.key}`, text: st.meaningEn, arabic: st.arabic });
    }
    for (const w of WUDU_STEPS) {
      entries.push({ key: `salah-wudu-${w.stepNumber}`, text: w.detailEn, arabic: w.arabic });
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

  // Direct EveryAyah audio applies strictly to Qur'anic targets (external Hisn Muslim MP3s include spoken intros that mismatch word sync)
  const getPrimaryQuranUrl = useCallback(
    (target: AudioTarget, verseOffset = 0): string | null => {
      if (target.quranRange) {
        const ayahNum = Math.min(
          target.quranRange.endAyah,
          target.quranRange.startAyah + Math.max(0, verseOffset)
        );
        return getEveryAyahUrl(
          reciter.everyAyahFolder,
          target.quranRange.surahId,
          ayahNum
        );
      }
      if (target.quranRef) {
        return getEveryAyahUrl(
          reciter.everyAyahFolder,
          target.quranRef.surahId,
          target.quranRef.ayahNumber
        );
      }
      return null;
    },
    [reciter.everyAyahFolder]
  );

  const filteredGuides = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRAYER_GUIDES.filter((g) => {
      if (guideFilter !== 'all' && g.category !== guideFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.badge.toLowerCase().includes(q) ||
        g.timing.toLowerCase().includes(q) ||
        g.totalSummary.toLowerCase().includes(q) ||
        g.niyyahEn.toLowerCase().includes(q) ||
        g.niyyahHi.toLowerCase().includes(q) ||
        g.niyyahUr.toLowerCase().includes(q) ||
        (g.specialAudio?.title.toLowerCase().includes(q) ?? false)
      );
    });
  }, [guideFilter, query]);

  const stepToTarget = useCallback(
    (step: SalahPostureStep): AudioTarget => ({
      id: step.id,
      title: step.title,
      arabic: step.arabic,
      audioUrl: step.audioUrl,
      fallbackAudioUrl: step.fallbackAudioUrl,
      wordTimings: step.wordTimings,
      quranRef: step.quranRef,
      quranRange: step.quranRange,
      scrollElementId: `salah-step-${step.id}`,
    }),
    []
  );

  const guidesTargets = useMemo<AudioTarget[]>(() => {
    const targets: AudioTarget[] = [];
    for (const guide of filteredGuides) {
      targets.push({
        id: `${guide.id}-niyyah`,
        title: `${guide.title} Niyyah`,
        arabic: guide.niyyahArabic,
        wordTimings: guide.niyyahWordTimings,
        scrollElementId: `salah-niyyah-${guide.id}`,
      });
      if (guide.specialAudio) {
        targets.push({
          id: `${guide.id}-special`,
          title: `${guide.title} · ${guide.specialAudio.title}`,
          arabic: guide.specialAudio.arabic,
          audioUrl: guide.specialAudio.audioUrl,
          fallbackAudioUrl: guide.specialAudio.fallbackAudioUrl,
          wordTimings: guide.specialAudio.wordTimings,
          scrollElementId: `salah-special-${guide.id}`,
        });
      }
    }
    return targets;
  }, [filteredGuides]);

  const stepsTargets = useMemo<AudioTarget[]>(
    () => SALAH_POSTURE_STEPS.map(stepToTarget),
    [stepToTarget]
  );

  const wuduTargets = useMemo<AudioTarget[]>(
    () => [
      {
        id: 'tasbih-fatimah-audio',
        title: 'Tasbih Fatimah Dhikr',
        arabic:
          'سُبْحَانَ ٱللَّهِ، ٱلْحَمْدُ لِلَّهِ، ٱللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/69.mp3',
        wordTimings: SALAH_WORD_TIMINGS['tasbih-fatimah-audio']
          ? expandWordTimings(SALAH_WORD_TIMINGS['tasbih-fatimah-audio'])
          : undefined,
        scrollElementId: 'salah-tasbih-section',
      },
      ...TASBIH_STAGES.map((st) => {
        const tuples = SALAH_WORD_TIMINGS[`tasbih-stage-${st.key}`];
        return {
          id: `tasbih-stage-${st.key}`,
          title: st.transliteration,
          arabic: st.arabic,
          wordTimings: tuples ? expandWordTimings(tuples) : undefined,
          scrollElementId: 'salah-tasbih-section',
        };
      }),
      ...WUDU_STEPS.filter((w) => Boolean(w.audioUrl || w.arabic)).map((w) => ({
        id: `wudu-${w.stepNumber}`,
        title: w.title,
        arabic: w.arabic ?? w.title,
        audioUrl: w.audioUrl,
        wordTimings: w.wordTimings,
        scrollElementId: `salah-wudu-${w.stepNumber}`,
      })),
    ],
    []
  );

  const activeTabQueue = useMemo<AudioTarget[]>(() => {
    if (activeTab === 'guides') return guidesTargets;
    if (activeTab === 'steps') return stepsTargets;
    return wuduTargets;
  }, [activeTab, guidesTargets, stepsTargets, wuduTargets]);

  activeTabQueueRef.current = activeTabQueue;

  const activeTarget = useMemo<AudioTarget | null>(() => {
    if (!activeAudioId) return null;
    return (
      guidesTargets.find((t) => t.id === activeAudioId) ||
      stepsTargets.find((t) => t.id === activeAudioId) ||
      wuduTargets.find((t) => t.id === activeAudioId) ||
      activeTargetRef.current
    );
  }, [activeAudioId, guidesTargets, stepsTargets, wuduTargets]);

  const stopSpeech = useCallback(() => {
    playbackSessionRef.current += 1;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    setSpeechCharIndex(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Pre-warm Qur'anic EveryAyah verses (including all 7 verses of Al-Fatiha) and human Salah MP3s in background
  useEffect(() => {
    const controller = new AbortController();
    const urls = new Set<string>();
    for (const step of SALAH_POSTURE_STEPS) {
      if (step.quranRange) {
        for (let a = step.quranRange.startAyah; a <= step.quranRange.endAyah; a++) {
          urls.add(getEveryAyahUrl(reciter.everyAyahFolder, step.quranRange.surahId, a));
        }
      } else if (step.quranRef) {
        urls.add(
          getEveryAyahUrl(
            reciter.everyAyahFolder,
            step.quranRef.surahId,
            step.quranRef.ayahNumber
          )
        );
      }
      if (step.audioUrl) urls.add(step.audioUrl);
      if (step.fallbackAudioUrl) urls.add(step.fallbackAudioUrl);
    }
    for (const guide of PRAYER_GUIDES) {
      if (guide.specialAudio?.audioUrl) urls.add(guide.specialAudio.audioUrl);
      if (guide.specialAudio?.fallbackAudioUrl) urls.add(guide.specialAudio.fallbackAudioUrl);
    }
    for (const w of WUDU_STEPS) {
      if (w.audioUrl) urls.add(w.audioUrl);
    }
    urls.add('https://www.hisnmuslim.com/audio/ar/69.mp3');

    const urlList = Array.from(urls);
    let cursor = 0;
    const worker = async () => {
      while (!controller.signal.aborted) {
        const idx = cursor++;
        if (idx >= urlList.length) return;
        const url = urlList[idx];
        const cached = await ensureAudioCached(url, controller.signal);
        if (cached && !controller.signal.aborted) {
          void analyzeSpeechBounds(url);
        }
      }
    };
    void Promise.all(
      Array.from({ length: Math.min(3, urlList.length) }, () => worker())
    );

    return () => controller.abort();
  }, [reciter.everyAyahFolder]);

  // Preload local static Qari MP3 clips for targets without EveryAyah or external human MP3
  useEffect(() => {
    const controller = new AbortController();
    const localCandidates = activeTabQueue.filter(
      (t) => !t.quranRef && !t.quranRange && !t.audioUrl && t.arabic.trim().length > 0
    );

    if (localCandidates.length > 0) {
      void prefetchAiTtsAudio(
        localCandidates.map((t) => ({
          text: t.arabic,
          voiceName: 'Charon',
          style: QARI_TTS_STYLES.salah,
        })),
        { signal: controller.signal, concurrency: 3, delayMs: 0 }
      );
    }

    return () => controller.abort();
  }, [activeTabQueue]);

  // Smooth auto-scroll active Salah card/section into clear safe view during playback / Reading Mode
  useEffect(() => {
    if (!activeTarget?.scrollElementId || !isPlaying || !autoScrollEnabled) return;
    const targetScrollId = activeTarget.scrollElementId;
    const runScroll = () => scrollTargetIntoCenter(targetScrollId);
    const raf = window.requestAnimationFrame(runScroll);
    const timer = window.setTimeout(runScroll, 120);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [activeTarget, isPlaying, autoScrollEnabled]);

  useEffect(() => {
    if (isPlaying && !keepaliveHeldRef.current) {
      keepaliveHeldRef.current = true;
      startBackgroundAudioKeepalive();
    } else if (!isPlaying && keepaliveHeldRef.current) {
      keepaliveHeldRef.current = false;
      stopBackgroundAudioKeepalive();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      applyVoiceTimbreProfile(
        audioRef.current,
        settings.qariVoiceProfile ?? 'recorded'
      );
    }
  }, [settings.qariVoiceProfile]);

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

  const startPlaybackRef = useRef<
    (target: AudioTarget, preserveQueue?: boolean) => void
  >(() => {});

  const tryArabicSpeechFallback = useCallback(
    (target: AudioTarget, continueQueue = false): boolean => {
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
          normalizeArabicForSpeech(target.arabic)
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
            const queue = activeTabQueueRef.current;
            const idx = queue.findIndex((t) => t.id === target.id);
            if (idx >= 0 && idx < queue.length - 1) {
              startPlaybackRef.current(queue[idx + 1], true);
              return;
            }
          }
          queueFlagRef.current = false;
          setIsStepQueuePlaying(false);
          setIsPlaying(false);
        };
        utterance.onerror = (ev) => {
          if (ev.error === 'interrupted' || ev.error === 'canceled') return;
          queueFlagRef.current = false;
          setIsStepQueuePlaying(false);
          setIsPlaying(false);
          setIsSpeechFallback(false);
          setSpeechCharIndex(null);
          setAudioErrorId(target.id);
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
    (target: AudioTarget, preserveQueue: boolean) => {
      const audio = audioRef.current;
      if (audio && target.audioUrl && !externalAttemptedRef.current.has(target.id)) {
        externalAttemptedRef.current.add(target.id);
        const extSrc = getCachedAudioSrc(target.audioUrl);
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
          if (!tryArabicSpeechFallback(target, preserveQueue)) {
            queueFlagRef.current = false;
            setIsPlaying(false);
            setIsStepQueuePlaying(false);
            setAudioErrorId(target.id);
          }
        });
        return;
      }

      if (!tryArabicSpeechFallback(target, preserveQueue)) {
        queueFlagRef.current = false;
        setIsPlaying(false);
        setIsStepQueuePlaying(false);
        setAudioErrorId(target.id);
      }
    },
    [attachUrlAndAnalyze, settings.playbackSpeed, settings.qariVoiceProfile, tryArabicSpeechFallback]
  );

  const synthesizeAndPlayAiVoice = useCallback(
    async (
      target: AudioTarget,
      session: number,
      preserveQueue: boolean,
      asFallback = false
    ) => {
      const audio = audioRef.current;
      aiAttemptedRef.current.add(target.id);

      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;

      const cachedUrl = getCachedAiTtsUrl(target.arabic, {
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.salah,
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
          tryExternalOrSpeechFallback(target, preserveQueue);
        });
        return;
      }

      unlockAudioElement(audio);
      setIsAiVoice(true);
      setIsFallbackAudioSource(asFallback);
      setIsBuffering(true);
      setIsPlaying(true);

      try {
        const blobUrl = await getAiTtsAudioUrl(target.arabic, {
          voiceName: 'Charon',
          style: QARI_TTS_STYLES.salah,
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
        tryExternalOrSpeechFallback(target, preserveQueue);
      }
    },
    [attachUrlAndAnalyze, settings.playbackSpeed, settings.qariVoiceProfile, tryExternalOrSpeechFallback]
  );

  const playQuranVerseAt = useCallback(
    (target: AudioTarget, verseOffset: number, seekSec = 0) => {
      const audio = audioRef.current;
      const quranUrl = getPrimaryQuranUrl(target, verseOffset);
      if (!audio || !quranUrl) return;

      activeVerseIndexRef.current = verseOffset;
      setActiveVerseIndex(verseOffset);
      setActiveSpeechBounds(null);
      setIsFallbackAudioSource(false);
      pendingSeekSecRef.current = seekSec > 0 ? seekSec : null;
      setCurrentTime(seekSec);
      setDuration(rangeDurationsRef.current[verseOffset] ?? 0);

      const playableSrc = getCachedAudioSrc(quranUrl);
      attachUrlAndAnalyze(audio, playableSrc, target.quranRange ? verseOffset : undefined);
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

      // Keep the next 2 verses pre-warmed for gapless Al-Fatiha playback
      if (target.quranRange) {
        const total = target.quranRange.endAyah - target.quranRange.startAyah + 1;
        for (let look = 1; look <= 2; look++) {
          if (verseOffset + look < total) {
            const nextUrl = getPrimaryQuranUrl(target, verseOffset + look);
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
          if (!aiAttemptedRef.current.has(target.id)) {
            void synthesizeAndPlayAiVoice(
              target,
              playbackSessionRef.current,
              queueFlagRef.current,
              true
            );
          } else {
            tryExternalOrSpeechFallback(target, queueFlagRef.current);
          }
        });
      }
    },
    [
      attachUrlAndAnalyze,
      getPrimaryQuranUrl,
      settings.playbackSpeed,
      settings.qariVoiceProfile,
      synthesizeAndPlayAiVoice,
      tryExternalOrSpeechFallback,
    ]
  );

  const startPlaybackForTarget = useCallback(
    (target: AudioTarget, preserveQueue = false) => {
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
      setIsStepQueuePlaying(preserveQueue);

      activeTargetRef.current = target;
      setActiveAudioId(target.id);
      fallbackAttemptedRef.current.delete(target.id);
      externalAttemptedRef.current.delete(target.id);
      aiAttemptedRef.current.delete(target.id);
      setCurrentTime(0);
      setDuration(0);

      const quranUrl = getPrimaryQuranUrl(target, 0);
      if (audio && quranUrl) {
        playQuranVerseAt(target, 0, 0);
        return;
      }

      if (audio && target.audioUrl) {
        externalAttemptedRef.current.add(target.id);
        const playableSrc = getCachedAudioSrc(target.audioUrl);
        attachUrlAndAnalyze(audio, playableSrc);
        if (audio.src !== playableSrc) {
          audio.src = playableSrc;
          audio.load();
        } else {
          audio.currentTime = 0;
        }
        applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
        audio.playbackRate = settings.playbackSpeed;
        setIsBuffering(true);
        setIsPlaying(true);
        audio.play().catch((err) => {
          if (err?.name === 'AbortError' || audio.error) return;
          setIsBuffering(false);
          if (target.fallbackAudioUrl && !fallbackAttemptedRef.current.has(target.id)) {
            fallbackAttemptedRef.current.add(target.id);
            setIsFallbackAudioSource(true);
            const fbSrc = getCachedAudioSrc(target.fallbackAudioUrl);
            attachUrlAndAnalyze(audio, fbSrc);
            audio.src = fbSrc;
            audio.load();
            applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
            audio.playbackRate = settings.playbackSpeed;
            audio.play().catch((fbErr) => {
              if (fbErr?.name === 'AbortError' || audio.error) return;
              if (!aiAttemptedRef.current.has(target.id)) {
                void synthesizeAndPlayAiVoice(target, session, preserveQueue, true);
              } else {
                tryExternalOrSpeechFallback(target, preserveQueue);
              }
            });
            return;
          }
          if (!aiAttemptedRef.current.has(target.id)) {
            void synthesizeAndPlayAiVoice(target, session, preserveQueue, true);
          } else {
            tryExternalOrSpeechFallback(target, preserveQueue);
          }
        });
        return;
      }

      void synthesizeAndPlayAiVoice(target, session, preserveQueue, false);
    },
    [
      attachUrlAndAnalyze,
      getPrimaryQuranUrl,
      onPauseReaderAudio,
      playQuranVerseAt,
      settings.playbackSpeed,
      settings.qariVoiceProfile,
      stopSpeech,
      synthesizeAndPlayAiVoice,
      tryExternalOrSpeechFallback,
    ]
  );

  startPlaybackRef.current = startPlaybackForTarget;

  const handleToggleTargetAudio = (target: AudioTarget) => {
    const audio = audioRef.current;
    const shouldAutoplay = settings.autoplayQueue !== false;

    if (activeAudioId === target.id && isPlaying) {
      stopSpeech();
      if (audio && !audio.paused) {
        audio.pause();
      }
      queueFlagRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      setIsSpeechFallback(false);
      setIsStepQueuePlaying(false);
      return;
    }

    if (
      activeAudioId === target.id &&
      !isPlaying &&
      !isSpeechFallback &&
      audio &&
      audio.src &&
      audio.readyState >= 1
    ) {
      onPauseReaderAudio?.();
      setAudioErrorId(null);
      queueFlagRef.current = shouldAutoplay;
      setIsStepQueuePlaying(shouldAutoplay);
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      setIsPlaying(true);
      audio.play().catch(() => {
        startPlaybackForTarget(target, shouldAutoplay);
      });
      return;
    }

    startPlaybackForTarget(target, shouldAutoplay);
  };

  const handleToggleReadingMode = useCallback(() => {
    if (isStepQueuePlaying && isPlaying) {
      stopSpeech();
      audioRef.current?.pause();
      queueFlagRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      setIsStepQueuePlaying(false);
      return;
    }
    const queue = activeTabQueueRef.current;
    if (!queue.length) return;
    setLoopActiveItem(false);
    setAutoScrollEnabled(true);
    const startTarget =
      (activeAudioId && queue.find((t) => t.id === activeAudioId)) || queue[0];
    startPlaybackForTarget(startTarget, true);
  }, [activeAudioId, isPlaying, isStepQueuePlaying, startPlaybackForTarget, stopSpeech]);

  const handleStepQueue = useCallback(
    (dir: -1 | 1) => {
      const queue = activeTabQueueRef.current;
      if (!queue.length) return;
      const idx = activeAudioId
        ? queue.findIndex((t) => t.id === activeAudioId)
        : 0;
      const nextIdx =
        idx < 0 ? 0 : Math.min(queue.length - 1, Math.max(0, idx + dir));
      const target = queue[nextIdx];
      if (target) {
        startPlaybackForTarget(target, isStepQueuePlaying || isPlaying);
      }
    },
    [activeAudioId, isPlaying, isStepQueuePlaying, startPlaybackForTarget]
  );

  const arabicVerseRanges = useMemo(
    () => (activeTarget ? getArabicVerseWeightRanges(activeTarget.arabic) : []),
    [activeTarget]
  );

  const activeRangeBounds = useMemo(() => {
    if (!activeTarget?.quranRange || arabicVerseRanges.length <= 1 || isAiVoice || isSpeechFallback) {
      return { startRatio: 0, endRatio: 1 };
    }
    const found = arabicVerseRanges[activeVerseIndex];
    return found ? { startRatio: found.startRatio, endRatio: found.endRatio } : { startRatio: 0, endRatio: 1 };
  }, [activeTarget, arabicVerseRanges, activeVerseIndex, isAiVoice, isSpeechFallback]);

  const isQuranStreamTarget = Boolean(
    (activeTarget?.quranRange || activeTarget?.quranRef) && !isAiVoice && !isSpeechFallback
  );
  const canUseWordTimings = Boolean(
    activeTarget?.wordTimings?.length &&
      !isSpeechFallback &&
      !isFallbackAudioSource &&
      !isQuranStreamTarget
  );

  const smoothProgress = useSmoothAudioProgress({
    audioRef,
    isPlaying,
    isBuffering,
    isSpeechFallback,
    fallbackTextLength: activeTarget?.arabic.length ?? 48,
    playbackSpeed: settings.playbackSpeed,
    currentTime,
    duration,
    speechBounds: activeSpeechBounds,
    wordTimings: canUseWordTimings ? activeTarget?.wordTimings ?? null : null,
    arabicText: activeTarget?.arabic ?? '',
    rangeStart: activeRangeBounds.startRatio,
    rangeEnd: activeRangeBounds.endRatio,
  });

  // Keep active Arabic word scrolled into safe view on tall Salah cards
  useEffect(() => {
    if (!activeTarget?.scrollElementId || !isPlaying || isBuffering || !autoScrollEnabled) return;
    scrollActiveWordIntoView(activeTarget.scrollElementId);
  }, [activeTarget, isPlaying, isBuffering, autoScrollEnabled, smoothProgress]);

  useEffect(() => {
    if (!activeTarget) return;
    updateBackgroundMediaSession({
      title: activeTarget.title,
      artist: 'Noor Recite · Qari Voice',
      album: 'Noor Recite · Salah Reading Mode',
      isPlaying,
      onPlay: () => {
        if (!isPlaying) startPlaybackForTarget(activeTarget, isStepQueuePlaying);
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
  }, [
    activeTarget,
    isPlaying,
    isStepQueuePlaying,
    startPlaybackForTarget,
    stopSpeech,
    handleStepQueue,
  ]);

  const getMultiVerseTotalAndOffset = useCallback(() => {
    if (!activeTarget?.quranRange) {
      return {
        totalVerses: 1,
        aggregateTime: currentTime,
        aggregateDuration: duration,
      };
    }
    const totalVerses = activeTarget.quranRange.endAyah - activeTarget.quranRange.startAyah + 1;
    const weights =
      arabicVerseRanges.length === totalVerses
        ? arabicVerseRanges.map((r) => Math.max(1, r.totalWeight))
        : Array.from({ length: totalVerses }, () => 1);
    const activeW = weights[activeVerseIndex] ?? 1;
    const activeDur = duration > 0 ? duration : rangeDurationsRef.current[activeVerseIndex] ?? 4.5;
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
  }, [activeTarget, arabicVerseRanges, activeVerseIndex, currentTime, duration]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || isSpeechFallback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width))
    );

    if (activeTarget?.quranRange && !isAiVoice) {
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
            playQuranVerseAt(activeTarget, i, localSec);
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
    const current = activeTargetRef.current;
    if (!current) {
      setIsPlaying(false);
      return;
    }

    if (current.quranRange && !isAiVoice && !isSpeechFallback) {
      const totalVerses = current.quranRange.endAyah - current.quranRange.startAyah + 1;
      const d = audioRef.current?.duration;
      if (d && Number.isFinite(d) && d > 0) {
        rangeDurationsRef.current[activeVerseIndexRef.current] = d;
      }
      const nextVerseIdx = activeVerseIndexRef.current + 1;
      if (nextVerseIdx < totalVerses) {
        playQuranVerseAt(current, nextVerseIdx, 0);
        return;
      }
      if (loopFlagRef.current) {
        playQuranVerseAt(current, 0, 0);
        return;
      }
    }

    if (loopFlagRef.current && audioRef.current) {
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

    if (queueFlagRef.current) {
      const queue = activeTabQueueRef.current;
      const idx = queue.findIndex((t) => t.id === current.id);
      if (idx >= 0 && idx < queue.length - 1) {
        const nextTarget = queue[idx + 1];
        startPlaybackForTarget(nextTarget, true);
        return;
      }
      queueFlagRef.current = false;
      setIsStepQueuePlaying(false);
    }

    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTrackError = () => {
    const audio = audioRef.current;
    const target = activeTargetRef.current;
    if (!target || !audio) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    if (target.audioUrl && !externalAttemptedRef.current.has(target.id)) {
      externalAttemptedRef.current.add(target.id);
      const extSrc = getCachedAudioSrc(target.audioUrl);
      attachUrlAndAnalyze(audio, extSrc);
      audio.src = extSrc;
      audio.load();
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      audio.play().catch((err) => {
        if (err?.name === 'AbortError' || audio.error) return;
        setIsBuffering(false);
        if (!tryArabicSpeechFallback(target, queueFlagRef.current)) {
          queueFlagRef.current = false;
          setIsPlaying(false);
          setIsStepQueuePlaying(false);
          setAudioErrorId(target.id);
        }
      });
      return;
    }

    if (target.fallbackAudioUrl && !fallbackAttemptedRef.current.has(target.id)) {
      fallbackAttemptedRef.current.add(target.id);
      setIsFallbackAudioSource(true);
      const fbSrc = getCachedAudioSrc(target.fallbackAudioUrl);
      attachUrlAndAnalyze(audio, fbSrc);
      audio.src = fbSrc;
      audio.load();
      applyVoiceTimbreProfile(audio, settings.qariVoiceProfile ?? 'recorded');
      audio.playbackRate = settings.playbackSpeed;
      audio.play().catch((err) => {
        if (err?.name === 'AbortError' || audio.error) return;
        setIsBuffering(false);
        if (!aiAttemptedRef.current.has(target.id)) {
          void synthesizeAndPlayAiVoice(
            target,
            playbackSessionRef.current,
            queueFlagRef.current,
            true
          );
        } else if (!tryArabicSpeechFallback(target, queueFlagRef.current)) {
          queueFlagRef.current = false;
          setIsPlaying(false);
          setIsStepQueuePlaying(false);
          setAudioErrorId(target.id);
        }
      });
      return;
    }

    if (!aiAttemptedRef.current.has(target.id)) {
      void synthesizeAndPlayAiVoice(
        target,
        playbackSessionRef.current,
        queueFlagRef.current,
        true
      );
      return;
    }

    setIsBuffering(false);
    setIsAiVoice(false);
    if (!tryArabicSpeechFallback(target, queueFlagRef.current)) {
      queueFlagRef.current = false;
      setAudioErrorId(target.id);
      setIsPlaying(false);
      setIsStepQueuePlaying(false);
    }
  };

  // Tasbih 33 / 33 / 34 state calculation
  const tasbihCycleCount = tasbihTotal % 100;
  const activeTasbihStage =
    tasbihCycleCount < 33
      ? { stage: TASBIH_STAGES[0], localCount: tasbihCycleCount }
      : tasbihCycleCount < 66
      ? { stage: TASBIH_STAGES[1], localCount: tasbihCycleCount - 33 }
      : { stage: TASBIH_STAGES[2], localCount: tasbihCycleCount - 66 };
  const completedTasbihRounds = Math.floor(tasbihTotal / 100);

  const renderInlineScrubber = (targetId: string, label: string) => {
    if (activeAudioId !== targetId) return null;
    const isMultiVerse = Boolean(activeTarget?.quranRange && !isAiVoice && !isSpeechFallback);
    const mv = isMultiVerse ? getMultiVerseTotalAndOffset() : null;
    const displayCurrent = mv ? mv.aggregateTime : currentTime;
    const displayDuration = mv ? mv.aggregateDuration : duration;
    const ratio =
      displayDuration > 0
        ? Math.min(1, Math.max(0, displayCurrent / displayDuration))
        : 0;

    return (
      <div className="rounded-xl bg-[#064E3B]/[0.045] dark:bg-emerald-400/10 px-3.5 py-2.5 flex items-center gap-2.5 sm:gap-3">
        <Volume2 className="w-4 h-4 text-[#0F766E] dark:text-emerald-300 shrink-0" />
        {isAiVoice && (
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200 shrink-0">
            Qari Voice
          </span>
        )}
        {mv && (
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200 shrink-0 tabular-nums">
            Verse {activeVerseIndex + 1}/{mv.totalVerses}
          </span>
        )}
        {isSpeechFallback ? (
          <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
            Speaking Arabic recitation ({settings.playbackSpeed}x)...
          </div>
        ) : isBuffering && isAiVoice ? (
          <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
            Preparing Qari Voice recitation...
          </div>
        ) : (
          <>
            <div
              onClick={handleSeek}
              role="slider"
              aria-label={`Seek ${label}`}
              aria-valuemin={0}
              aria-valuemax={Math.round(displayDuration || 1)}
              aria-valuenow={Math.round(displayCurrent)}
              tabIndex={0}
              className="relative flex-1 h-2 rounded-full bg-[#064E3B]/15 dark:bg-emerald-300/20 cursor-pointer overflow-hidden"
            >
              <span
                className="block h-full rounded-full bg-[#D97706] dark:bg-amber-400 transition-[width] duration-75"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85 shrink-0">
              {formatDuration(displayCurrent)} / {formatDuration(displayDuration)}
            </span>
          </>
        )}

        <button
          type="button"
          onClick={() => setLoopActiveItem((prev) => !prev)}
          aria-label={loopActiveItem ? 'Disable repeat' : 'Repeat this recitation'}
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
    );
  };

  const renderGuideSpecialAudio = (guide: PrayerGuideItem) => {
    const special = guide.specialAudio;
    if (!special) return null;
    const targetId = `${guide.id}-special`;
    const isPlayingThis = activeAudioId === targetId && isPlaying;
    const isBufferingThis = activeAudioId === targetId && isBuffering && isPlaying;

    const target: AudioTarget = {
      id: targetId,
      title: special.title,
      arabic: special.arabic,
      audioUrl: special.audioUrl,
      fallbackAudioUrl: special.fallbackAudioUrl,
      wordTimings: special.wordTimings,
      scrollElementId: `salah-special-${guide.id}`,
    };

    const localizedSpecialTr =
      activeLang === 'hi'
        ? special.translationHi
        : activeLang === 'ur'
        ? special.translationUr
        : activeLang === 'en'
        ? special.translationEn
        : resolveDynamicText(special.translationEn);

    return (
      <div
        id={`salah-special-${guide.id}`}
        className="rounded-xl border border-[#D97706]/30 dark:border-amber-400/30 bg-[#FEF3C7]/25 dark:bg-amber-950/20 p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#D97706] dark:text-amber-300 shrink-0" />
            <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
              {special.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleToggleTargetAudio(target)}
            className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              isPlayingThis
                ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                : 'bg-[#064E3B] text-[#FEF3C7] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22]'
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
                <span>Pause Audio</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Recite Audio</span>
              </>
            )}
          </button>
        </div>

        {renderInlineScrubber(targetId, special.title)}

        <HighlightedArabicText
          text={special.arabic}
          isActive={isPlayingThis && !isBufferingThis}
          progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
          highlightStyle={settings.highlightStyle ?? 'pill'}
          speechCharIndex={isPlayingThis && isSpeechFallback ? speechCharIndex : null}
          fontClass={fontClass}
          fontSize={Math.max(22, Math.min(32, settings.arabicFontSize - 2))}
          lineHeight={2.1}
        />

        {settings.showTransliteration && (
          <HighlightedSyncText
            text={special.transliteration}
            arabicText={special.arabic}
            isActive={isPlayingThis && !isBufferingThis}
            progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
            speechCharIndex={isPlayingThis && isSpeechFallback ? speechCharIndex : null}
            variant="transliteration"
            className="text-[13.5px] font-medium italic leading-relaxed text-[#0F766E] dark:text-emerald-300/90 break-words"
          />
        )}

        {settings.showTranslation && (
          <HighlightedSyncText
            text={localizedSpecialTr}
            arabicText={special.arabic}
            isActive={isPlayingThis && !isBufferingThis}
            progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
            speechCharIndex={isPlayingThis && isSpeechFallback ? speechCharIndex : null}
            variant="translation"
            lang={activeLang}
            dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
            className={`text-[#022C22]/90 dark:text-[#D0FAEA]/95 break-words ${getTranslationTextClass(
              activeLang,
              'card'
            )}`}
          />
        )}

        {audioErrorId === targetId && (
          <p className="text-xs text-[#BA1A1A] dark:text-rose-300">
            Audio stream unavailable right now. Please try again.
          </p>
        )}
      </div>
    );
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
            if (activeTargetRef.current?.quranRange) {
              rangeDurationsRef.current[activeVerseIndexRef.current] = d;
            }
          }
          if (pendingSeekSecRef.current !== null && e.currentTarget.readyState >= 1) {
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
            Salah, Eid Nimaz &amp; Prayers
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Rakaat breakdowns, niyyah, posture recitations, and Wudu with synchronized word highlighting and Qari Voice.
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

      {/* Primary Section Tabs: Prayers & Eid | Step-by-Step Salah | Wudu & Tasbih */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#064E3B]/10 dark:border-emerald-300/15 pb-3">
        {(
          [
            {
              id: 'guides',
              label: `Prayers & Eid Nimaz (${PRAYER_GUIDES.length})`,
              icon: MoonStar,
            },
            {
              id: 'steps',
              label: `Step-by-Step Salah (${SALAH_POSTURE_STEPS.length})`,
              icon: ListMusic,
            },
            {
              id: 'wudu',
              label: 'Wudu & Tasbih',
              icon: Droplets,
            },
          ] as { id: SalahTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[40px] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                active
                  ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                  : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/15 text-[#404944] hover:text-[#022C22] dark:text-emerald-200/85 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onToggleAutoplayQueue && (
            <button
              type="button"
              onClick={onToggleAutoplayQueue}
              aria-pressed={settings.autoplayQueue !== false}
              title="Automatically advance to the next Salah recitation when playback finishes"
              className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                settings.autoplayQueue !== false
                  ? 'border-[#064E3B]/25 bg-[#064E3B]/8 text-[#064E3B] dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-200'
                  : 'border-[#064E3B]/15 bg-white text-[#404944] dark:border-emerald-300/15 dark:bg-[#0A2921] dark:text-emerald-200/70'
              }`}
            >
              Autoplay: {settings.autoplayQueue !== false ? 'On' : 'Off'}
            </button>
          )}
          {activeTabQueue.length > 0 && (
            <button
              type="button"
              onClick={handleToggleReadingMode}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                isStepQueuePlaying && isPlaying
                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  : 'bg-[#064E3B] text-[#FEF3C7] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22]'
              }`}
            >
              {isStepQueuePlaying && isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Reading Mode</span>
                </>
              ) : (
                <>
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Reading Mode ({activeTabQueue.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Active Reading Mode Control Strip */}
      {(isStepQueuePlaying || (isPlaying && activeTarget)) && activeTarget && (
        <div
          data-reading-strip="true"
          className="sticky top-2 z-20 rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-[#FFFFFF]/95 dark:bg-[#041D17]/95 backdrop-blur-md px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ScrollText className="w-4 h-4 text-[#D97706] dark:text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                Reading Mode · {activeTarget.title}
              </p>
              <p className="text-[11px] text-[#0F766E] dark:text-emerald-300/85 truncate">
                {autoScrollEnabled ? 'Auto-scrolling & background playback active' : 'Continuous background playback'}
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
              aria-label="Previous Salah Recitation"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4]"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleReadingMode}
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
              aria-label="Next Salah Recitation"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4]"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: PRAYERS & EID NIMAZ */}
      {activeTab === 'guides' && (
        <div className="space-y-5">
          {/* Filters & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              {GUIDE_FILTER_TABS.map((tab) => {
                const active = guideFilter === tab.id;
                const count =
                  tab.id === 'all'
                    ? PRAYER_GUIDES.length
                    : PRAYER_GUIDES.filter((g) => g.category === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setGuideFilter(tab.id)}
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

            <div className="relative flex-1 sm:w-64 sm:flex-none min-w-[200px]">
              <Search className="w-4 h-4 text-[#404944] dark:text-emerald-300/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Fajr, Eid, Janazah..."
                aria-label="Search prayers and Eid nimaz"
                className="w-full min-h-[38px] pl-9 pr-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs font-medium text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
              />
            </div>
          </div>

          {filteredGuides.length === 0 ? (
            <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-10 text-center space-y-2 ayah-card-resting">
              <p className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                No Matching Prayers Found
              </p>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                Try clearing your search or choosing another filter above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGuides.map((guide, idx) => {
                const localizedNiyyah =
                  activeLang === 'hi'
                    ? guide.niyyahHi
                    : activeLang === 'ur'
                    ? guide.niyyahUr
                    : activeLang === 'en'
                    ? guide.niyyahEn
                    : resolveDynamicText(guide.niyyahEn);
                const localizedSteps =
                  activeLang === 'hi'
                    ? guide.stepsHi
                    : activeLang === 'ur'
                    ? guide.stepsUr
                    : activeLang === 'en'
                    ? guide.stepsEn
                    : guide.stepsEn.map((stepText) => resolveDynamicText(stepText));

                return (
                  <article
                    id={`salah-guide-${guide.id}`}
                    key={guide.id}
                    className={`rounded-2xl border p-5 sm:p-7 space-y-5 transition-all duration-200 ${
                      (activeAudioId === `${guide.id}-niyyah` ||
                        activeAudioId === `${guide.id}-special`) &&
                      isPlaying
                        ? 'ayah-card-active border-[1.5px] border-[#D97706]/45 dark:border-amber-400/50 bg-gradient-to-b from-[#064E3B]/[0.025] to-[#D97706]/[0.045] dark:from-emerald-950/70 dark:to-amber-950/25'
                        : 'ayah-card-resting border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
                      <div className="flex items-start gap-3 min-w-0">
                        <RubElHizbBadge
                          className="w-9 h-9 shrink-0 mt-0.5"
                          label={idx + 1}
                          active={guide.category === 'eid'}
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                            <span className="font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                              {guide.badge}
                            </span>
                            <span className="text-[#707974] dark:text-emerald-400/50" aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[#404944] dark:text-emerald-200/75">
                              <Clock className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300 shrink-0" />
                              <span>{guide.timing}</span>
                            </span>
                          </div>
                          <h2 className="text-lg sm:text-xl font-bold text-[#022C22] dark:text-[#E6FFF4]">
                            {guide.title}
                          </h2>
                          <p className="text-xs text-[#0F766E] dark:text-emerald-300/85">
                            {guide.subtitle}
                          </p>
                        </div>
                      </div>

                      <p
                        dir="rtl"
                        className={`${fontClass} text-2xl sm:text-3xl text-[#064E3B] dark:text-emerald-200 shrink-0 self-end sm:self-start`}
                      >
                        {guide.arabicTitle}
                      </p>
                    </div>

                    {/* Rakaat Breakdown */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#404944] dark:text-emerald-300/80">
                        Rakaat Structure · {guide.totalSummary}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {guide.rakaats.map((r, rIdx) => (
                          <span
                            key={`${guide.id}-r-${rIdx}`}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${EMPHASIS_STYLES[r.emphasis]}`}
                          >
                            <span className="font-bold tabular-nums">{r.rakaat}</span>
                            <span>{r.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Niyyah (Intention) */}
                    <div
                      id={`salah-niyyah-${guide.id}`}
                      className="rounded-xl bg-[#064E3B]/[0.035] dark:bg-emerald-400/8 p-4 space-y-2.5 border border-[#064E3B]/8 dark:border-emerald-300/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                          Niyyah (Intention)
                        </p>
                        {(() => {
                          const niyyahId = `${guide.id}-niyyah`;
                          const isNiyyahPlaying = activeAudioId === niyyahId && isPlaying;
                          const isNiyyahBuffering = activeAudioId === niyyahId && isBuffering && isPlaying;
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleTargetAudio({
                                  id: niyyahId,
                                  title: `${guide.title} Niyyah`,
                                  arabic: guide.niyyahArabic,
                                  wordTimings: guide.niyyahWordTimings,
                                  scrollElementId: `salah-niyyah-${guide.id}`,
                                })
                              }
                              className={`min-h-[30px] px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                                isNiyyahPlaying
                                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                                  : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200'
                              }`}
                            >
                              {isNiyyahBuffering ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Loading</span>
                                </>
                              ) : isNiyyahPlaying ? (
                                <>
                                  <Pause className="w-3 h-3 fill-current" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Recite</span>
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                      {renderInlineScrubber(`${guide.id}-niyyah`, `${guide.title} Niyyah`)}
                      <HighlightedArabicText
                        text={guide.niyyahArabic}
                        isActive={activeAudioId === `${guide.id}-niyyah` && isPlaying && !isBuffering}
                        progressRatio={
                          activeAudioId === `${guide.id}-niyyah` && isPlaying && !isBuffering
                            ? smoothProgress
                            : 0
                        }
                        highlightStyle={settings.highlightStyle ?? 'pill'}
                        speechCharIndex={
                          activeAudioId === `${guide.id}-niyyah` &&
                          isPlaying &&
                          isSpeechFallback
                            ? speechCharIndex
                            : null
                        }
                        fontClass={fontClass}
                        fontSize={Math.max(20, Math.min(28, settings.arabicFontSize - 6))}
                        lineHeight={2}
                      />
                      {settings.showTransliteration && (
                        <HighlightedSyncText
                          text={guide.niyyahTranslit}
                          arabicText={guide.niyyahArabic}
                          isActive={activeAudioId === `${guide.id}-niyyah` && isPlaying && !isBuffering}
                          progressRatio={
                            activeAudioId === `${guide.id}-niyyah` && isPlaying && !isBuffering
                              ? smoothProgress
                              : 0
                          }
                          speechCharIndex={
                            activeAudioId === `${guide.id}-niyyah` &&
                            isPlaying &&
                            isSpeechFallback
                              ? speechCharIndex
                              : null
                          }
                          variant="transliteration"
                          className="text-[13px] font-medium italic text-[#0F766E] dark:text-emerald-300/90 break-words"
                        />
                      )}
                      {settings.showTranslation && (
                        <HighlightedSyncText
                          text={localizedNiyyah}
                          arabicText={guide.niyyahArabic}
                          isActive={activeAudioId === `${guide.id}-niyyah` && isPlaying && !isBuffering}
                          progressRatio={
                            activeAudioId === `${guide.id}-niyyah` && isPlaying && !isBuffering
                              ? smoothProgress
                              : 0
                          }
                          speechCharIndex={
                            activeAudioId === `${guide.id}-niyyah` &&
                            isPlaying &&
                            isSpeechFallback
                              ? speechCharIndex
                              : null
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

                    {/* How to Perform */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#404944] dark:text-emerald-300/80">
                        How to Offer {guide.title}
                      </p>
                      <ol className="space-y-2.5">
                        {localizedSteps.map((stepText, sIdx) => (
                          <li
                            key={`${guide.id}-s-${sIdx}`}
                            dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
                            className={`flex items-start gap-2.5 text-[#022C22]/90 dark:text-[#D0FAEA]/95 ${getTranslationTextClass(
                              activeLang,
                              'card'
                            )}`}
                          >
                            <span
                              dir="ltr"
                              className="mt-1 w-5 h-5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200 text-[11px] font-bold inline-flex items-center justify-center shrink-0 tabular-nums"
                            >
                              {sIdx + 1}
                            </span>
                            <span className="min-w-0 flex-1 break-words">{stepText}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Optional Special Audio Section (Takbeerat / Qunoot / Janazah / Istikhara) */}
                    {renderGuideSpecialAudio(guide)}

                    {/* Context Note + Link to Step-by-Step Recitations */}
                    <div className="pt-3 border-t border-[#064E3B]/8 dark:border-emerald-300/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/80">
                        {guide.note}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('steps')}
                        className="self-start sm:self-auto shrink-0 min-h-[34px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#0F766E] hover:bg-[#064E3B]/5 dark:text-emerald-200 dark:hover:bg-emerald-400/10 inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Learn Posture Words</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STEP-BY-STEP SALAH POSTURE RECITATIONS */}
      {activeTab === 'steps' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ayah-card-resting">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                What to Recite in Every Posture of Salah
              </h2>
              <p className="text-xs text-[#404944] dark:text-emerald-200/80">
                Follow along in order from opening Takbeer to closing Salam and post-prayer dhikr.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleReadingMode}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                isStepQueuePlaying && isPlaying
                  ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  : 'bg-[#064E3B] text-[#FEF3C7] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22]'
              }`}
            >
              {isStepQueuePlaying && isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Reading Mode</span>
                </>
              ) : (
                <>
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Reading Mode ({SALAH_POSTURE_STEPS.length})</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {SALAH_POSTURE_STEPS.map((step) => {
              const target = stepToTarget(step);
              const isSelected = activeAudioId === step.id;
              const isPlayingThis = isSelected && isPlaying;
              const isBufferingThis = isSelected && isBuffering && isPlaying;
              const localizedTr =
                activeLang === 'hi'
                  ? step.translationHi
                  : activeLang === 'ur'
                  ? step.translationUr
                  : activeLang === 'en'
                  ? step.translationEn
                  : resolveDynamicText(step.translationEn);

              return (
                <article
                  id={`salah-step-${step.id}`}
                  key={step.id}
                  className={`rounded-2xl border p-5 sm:p-7 space-y-4 transition-all duration-200 ${
                    isPlayingThis
                      ? 'ayah-card-active border-[1.5px] border-[#D97706]/45 dark:border-amber-400/50 bg-gradient-to-b from-[#064E3B]/[0.025] to-[#D97706]/[0.045] dark:from-emerald-950/70 dark:to-amber-950/25'
                      : 'ayah-card-resting border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
                    <div className="flex items-start gap-3 min-w-0">
                      <RubElHizbBadge
                        className="w-9 h-9 shrink-0 mt-0.5"
                        label={step.stepNumber}
                        active={isPlayingThis}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold uppercase tracking-wider">
                          <span className="text-[#0F766E] dark:text-emerald-300">
                            {step.posture}
                          </span>
                          <span className="text-[#707974] dark:text-emerald-400/50" aria-hidden="true">·</span>
                          <span className="text-[#B45309] dark:text-amber-300">
                            {step.repeatLabel}
                          </span>
                        </div>
                        <h3 className="mt-1 text-base sm:text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTargetAudio(target)}
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

                      {step.quranRef && (
                        <button
                          type="button"
                          onClick={() =>
                            step.quranRef &&
                            onPracticeInReader(
                              step.quranRef.surahId,
                              step.quranRef.ayahNumber
                            )
                          }
                          className="min-h-[36px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#0F766E] hover:bg-[#064E3B]/5 dark:text-emerald-200 dark:hover:bg-emerald-400/10 flex items-center gap-1 transition-colors"
                        >
                          <span>Al-Fatiha in Reader</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {renderInlineScrubber(step.id, step.title)}

                  <HighlightedArabicText
                    text={step.arabic}
                    isActive={isPlayingThis && !isBufferingThis}
                    progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
                    highlightStyle={settings.highlightStyle ?? 'pill'}
                    speechCharIndex={
                      isPlayingThis && isSpeechFallback ? speechCharIndex : null
                    }
                    fontClass={fontClass}
                    fontSize={Math.max(24, Math.min(34, settings.arabicFontSize))}
                    lineHeight={2.1}
                  />

                  {(settings.showTransliteration || settings.showTranslation) && (
                    <div className="space-y-2.5 min-w-0 break-words">
                      {settings.showTransliteration && (
                        <HighlightedSyncText
                          text={step.transliteration}
                          arabicText={step.arabic}
                          isActive={isPlayingThis && !isBufferingThis}
                          progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
                          speechCharIndex={
                            isPlayingThis && isSpeechFallback ? speechCharIndex : null
                          }
                          variant="transliteration"
                          className="text-[14px] font-medium italic leading-relaxed text-[#0F766E] dark:text-emerald-300/90 break-words"
                        />
                      )}
                      {settings.showTranslation && (
                        <HighlightedSyncText
                          text={localizedTr}
                          arabicText={step.arabic}
                          isActive={isPlayingThis && !isBufferingThis}
                          progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
                          speechCharIndex={
                            isPlayingThis && isSpeechFallback ? speechCharIndex : null
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

                  {audioErrorId === step.id && (
                    <p className="text-xs text-[#BA1A1A] dark:text-rose-300">
                      Audio stream unavailable right now. Please try again.
                    </p>
                  )}

                  <p className="pt-3 border-t border-[#064E3B]/8 dark:border-emerald-300/10 text-xs leading-relaxed text-[#404944] dark:text-emerald-200/80">
                    {step.note}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: WUDU GUIDE & INTERACTIVE TASBIH FATIMAH */}
      {activeTab === 'wudu' && (
        <div className="space-y-6">
          {/* Interactive Post-Salah Tasbih Fatimah Counter */}
          <section
            id="salah-tasbih-section"
            className="rounded-2xl border border-[#D97706]/30 dark:border-amber-400/30 bg-white dark:bg-[#0A2921]/95 p-5 sm:p-7 space-y-5 ayah-card-resting"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#064E3B]/8 dark:border-emerald-300/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D97706]/12 dark:bg-amber-400/15 flex items-center justify-center text-[#D97706] dark:text-amber-300 shrink-0">
                  <HandHeart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Tasbih Fatimah · Post-Salah Counter (33 · 33 · 34)
                  </h2>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/80">
                    Tap the counter button after every obligatory prayer; it automatically advances through Subḥānallāh (33), Alḥamdulillāh (33), and Allāhu Akbar (34).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleTargetAudio({
                      id: 'tasbih-fatimah-audio',
                      title: 'Tasbih Fatimah Dhikr',
                      arabic:
                        'سُبْحَانَ ٱللَّهِ، ٱلْحَمْدُ لِلَّهِ، ٱللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
                      audioUrl: 'https://www.hisnmuslim.com/audio/ar/69.mp3',
                      wordTimings: SALAH_WORD_TIMINGS['tasbih-fatimah-audio']
                        ? expandWordTimings(SALAH_WORD_TIMINGS['tasbih-fatimah-audio'])
                        : undefined,
                      scrollElementId: 'salah-tasbih-section',
                    })
                  }
                  className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeAudioId === 'tasbih-fatimah-audio' && isPlaying
                      ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                      : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200'
                  }`}
                >
                  {activeAudioId === 'tasbih-fatimah-audio' && isBuffering && isPlaying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading</span>
                    </>
                  ) : activeAudioId === 'tasbih-fatimah-audio' && isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Recite Audio</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onPracticeInReader(2, 255)}
                  className="min-h-[36px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#0F766E] hover:bg-[#064E3B]/5 dark:text-emerald-200 inline-flex items-center gap-1"
                >
                  <span>Ayatul Kursi</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {renderInlineScrubber('tasbih-fatimah-audio', 'Tasbih Fatimah')}

            {activeAudioId === 'tasbih-fatimah-audio' && isPlaying && (
              <div className="rounded-xl bg-[#064E3B]/[0.035] dark:bg-emerald-400/10 p-3.5 border border-[#064E3B]/10 dark:border-emerald-300/15">
                <HighlightedArabicText
                  text="سُبْحَانَ ٱللَّهِ، ٱلْحَمْدُ لِلَّهِ، ٱللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ"
                  isActive={isPlaying && !isBuffering}
                  progressRatio={isPlaying && !isBuffering ? smoothProgress : 0}
                  highlightStyle={settings.highlightStyle ?? 'pill'}
                  speechCharIndex={isSpeechFallback ? speechCharIndex : null}
                  fontClass={fontClass}
                  fontSize={22}
                  lineHeight={1.95}
                  align="center"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TASBIH_STAGES.map((st, idx) => {
                const isCurrentStage = activeTasbihStage.stage.key === st.key;
                const stageCompleted =
                  (idx === 0 && tasbihCycleCount >= 33) ||
                  (idx === 1 && tasbihCycleCount >= 66);
                const stageAudioId = `tasbih-stage-${st.key}`;
                const isStagePlaying = activeAudioId === stageAudioId && isPlaying;
                const isStageBuffering =
                  activeAudioId === stageAudioId && isBuffering && isPlaying;
                return (
                  <div
                    key={st.key}
                    className={`rounded-xl border p-3.5 text-center space-y-1.5 transition-colors flex flex-col justify-between ${
                      isCurrentStage
                        ? 'border-[#D97706] bg-[#FEF3C7]/40 dark:border-amber-400 dark:bg-amber-400/10'
                        : stageCompleted
                        ? 'border-[#064E3B]/25 bg-[#064E3B]/6 dark:border-emerald-400/30 dark:bg-emerald-400/10'
                        : 'border-[#064E3B]/10 dark:border-emerald-300/15'
                    }`}
                  >
                    <div className="space-y-1">
                      <HighlightedArabicText
                        text={st.arabic}
                        isActive={isStagePlaying && !isStageBuffering}
                        progressRatio={isStagePlaying && !isStageBuffering ? smoothProgress : 0}
                        highlightStyle={settings.highlightStyle ?? 'pill'}
                        speechCharIndex={
                          isStagePlaying && isSpeechFallback
                            ? speechCharIndex
                            : null
                        }
                        fontClass={fontClass}
                        fontSize={22}
                        lineHeight={1.85}
                        align="center"
                      />
                      <p className="text-xs font-bold text-[#0F766E] dark:text-emerald-300">
                        {st.transliteration} ({st.target}x)
                      </p>
                      <p
                        dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
                        className={`text-[#404944] dark:text-emerald-200/80 ${getTranslationTextClass(
                          activeLang,
                          'compact'
                        )}`}
                      >
                        {activeLang === 'hi'
                          ? st.meaningHi
                          : activeLang === 'ur'
                          ? st.meaningUr
                          : activeLang === 'en'
                          ? st.meaningEn
                          : resolveDynamicText(st.meaningEn)}
                      </p>
                    </div>

                    <div className="pt-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleTargetAudio({
                            id: stageAudioId,
                            title: st.transliteration,
                            arabic: st.arabic,
                            wordTimings: SALAH_WORD_TIMINGS[stageAudioId]
                              ? expandWordTimings(SALAH_WORD_TIMINGS[stageAudioId])
                              : undefined,
                            scrollElementId: 'salah-tasbih-section',
                          })
                        }
                        aria-label={`${isStagePlaying ? 'Pause' : 'Listen'} ${st.transliteration}`}
                        className={`min-h-[28px] px-2.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                          isStagePlaying
                            ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                            : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
                        }`}
                      >
                        {isStageBuffering ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Loading</span>
                          </>
                        ) : isStagePlaying ? (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Qari Voice</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {TASBIH_STAGES.map((st) =>
              renderInlineScrubber(`tasbih-stage-${st.key}`, st.transliteration)
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-[#064E3B]/[0.04] dark:bg-emerald-400/10 p-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                  Current Phrase · {activeTasbihStage.localCount} /{' '}
                  {activeTasbihStage.stage.target}
                </p>
                <p className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  {activeTasbihStage.stage.transliteration}
                </p>
                <p className="text-xs text-[#404944] dark:text-emerald-200/80 tabular-nums">
                  Cycle Progress: {tasbihCycleCount}/100
                  {completedTasbihRounds > 0
                    ? ` · Completed Rounds: ${completedTasbihRounds}`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTasbihTotal((c) => c + 1)}
                  className="min-h-[44px] px-6 rounded-full bg-[#064E3B] hover:bg-[#003527] text-[#FEF3C7] dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-[#022C22] text-sm font-bold shadow-xs transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                >
                  Tap to Count ({tasbihTotal})
                </button>
                {tasbihTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => setTasbihTotal(0)}
                    aria-label="Reset Tasbih counter"
                    className="w-10 h-10 rounded-full border border-[#064E3B]/15 dark:border-emerald-300/20 flex items-center justify-center text-[#404944] hover:text-[#064E3B] dark:text-emerald-200/80 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 6-Step Wudu (Ablution) Guide */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Step-by-Step Wudu (Ablution Before Salah)
              </h2>
              <p className="text-xs sm:text-sm text-[#404944] dark:text-emerald-200/80">
                Clean, calm sequence from Bismillah and washing hands through feet and the Shahadah after Wudu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WUDU_STEPS.map((wudu) => {
                const detail =
                  activeLang === 'hi'
                    ? wudu.detailHi
                    : activeLang === 'ur'
                    ? wudu.detailUr
                    : activeLang === 'en'
                    ? wudu.detailEn
                    : resolveDynamicText(wudu.detailEn);
                const wuduAudioId = `wudu-${wudu.stepNumber}`;
                const isPlayingThis = activeAudioId === wuduAudioId && isPlaying;
                const isBufferingThis =
                  activeAudioId === wuduAudioId && isBuffering && isPlaying;

                return (
                  <article
                    id={`salah-wudu-${wudu.stepNumber}`}
                    key={wudu.stepNumber}
                    className={`rounded-2xl border p-5 space-y-3 flex flex-col justify-between transition-all duration-200 ${
                      isPlayingThis
                        ? 'ayah-card-active border-[1.5px] border-[#D97706]/45 dark:border-amber-400/50 bg-gradient-to-b from-[#064E3B]/[0.025] to-[#D97706]/[0.045] dark:from-emerald-950/70 dark:to-amber-950/25'
                        : 'ayah-card-resting border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/95'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <RubElHizbBadge
                            className="w-8 h-8 shrink-0"
                            label={wudu.stepNumber}
                            active={wudu.stepNumber === 6}
                          />
                          <h3 className="text-sm sm:text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                            {wudu.title}
                          </h3>
                        </div>

                        {(wudu.audioUrl || wudu.arabic) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleTargetAudio({
                                id: wuduAudioId,
                                title: wudu.title,
                                arabic: wudu.arabic ?? wudu.title,
                                audioUrl: wudu.audioUrl,
                                wordTimings: wudu.wordTimings,
                                scrollElementId: `salah-wudu-${wudu.stepNumber}`,
                              })
                            }
                            className={`min-h-[32px] px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                              isPlayingThis
                                ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                                : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200'
                            }`}
                          >
                            {isBufferingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isPlayingThis ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            <span>{isPlayingThis ? 'Pause' : 'Recite'}</span>
                          </button>
                        )}
                      </div>

                      {renderInlineScrubber(wuduAudioId, wudu.title)}

                      <p
                        dir={isRtlTranslationLang(activeLang) ? 'rtl' : 'ltr'}
                        className={`text-[#022C22]/90 dark:text-[#D0FAEA]/95 break-words ${getTranslationTextClass(
                          activeLang,
                          'card'
                        )}`}
                      >
                        {detail}
                      </p>
                    </div>

                    {wudu.arabic && (
                      <div className="pt-3 border-t border-[#064E3B]/8 dark:border-emerald-300/10 space-y-1">
                        <HighlightedArabicText
                          text={wudu.arabic}
                          isActive={isPlayingThis && !isBufferingThis}
                          progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
                          highlightStyle={settings.highlightStyle ?? 'pill'}
                          speechCharIndex={
                            isPlayingThis && isSpeechFallback
                              ? speechCharIndex
                              : null
                          }
                          fontClass={fontClass}
                          fontSize={21}
                          lineHeight={1.95}
                        />
                        {settings.showTransliteration && wudu.transliteration && (
                          <HighlightedSyncText
                            text={wudu.transliteration}
                            arabicText={wudu.arabic}
                            isActive={isPlayingThis && !isBufferingThis}
                            progressRatio={isPlayingThis && !isBufferingThis ? smoothProgress : 0}
                            speechCharIndex={
                              isPlayingThis && isSpeechFallback ? speechCharIndex : null
                            }
                            variant="transliteration"
                            className="text-xs font-medium italic text-[#0F766E] dark:text-emerald-300/90"
                          />
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
