import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Lightbulb,
  Loader2,
  Mic,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  Ayah,
  HifzSpacedItem,
  HifzWeakWord,
  ReaderSettings,
  Reciter,
  RiwayahId,
  Surah,
  TranslationLanguage,
  WordToken,
} from '../types/quran';
import { getEveryAyahUrl } from '../data/quranData';
import {
  formatAyahByRiwayah,
  getAyahDisplayArabic,
  getWordDisplayArabic,
} from '../data/qiraatData';
import { TAJWEED_RULES, TAJWEED_STYLE_MAP } from '../data/tajweedRules';
import { FiligreeDivider, RubElHizbBadge } from './RubElHizbIcon';
import { HifzProgressStatus } from '../utils/hifzProgress';
import {
  getAyahTranslationText,
  getTranslationTextClass,
  getWordMeaningText,
  isRtlTranslationLang,
} from '../utils/translationConfig';
import { SpokenVerificationResult } from '../utils/pitchAnalysis';

type DrillMode = 'word-fill' | 'blind-recall' | 'next-ayah' | 'voice-tartil';

const SRS_STAGES: { stage: 1 | 2 | 3 | 4 | 5; name: string; interval: string }[] = [
  { stage: 1, name: 'Imprint', interval: '+12h' },
  { stage: 2, name: 'Reinforce', interval: '+24h' },
  { stage: 3, name: 'Stabilize', interval: '+3d' },
  { stage: 4, name: 'Deepen', interval: '+5d' },
  { stage: 5, name: 'Solidified', interval: '+7d' },
];

interface QuizOption {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  isCorrect: boolean;
  sourceVerseKey: string;
  sourceSurahId: number;
  sourceAyahNumber: number;
  tajweedNote?: string;
}

interface HifzQuestion {
  id: string;
  surah: Surah;
  ayah: Ayah;
  targetWord: WordToken;
  targetWordIdx: number;
  nextAyah?: Ayah;
  options: QuizOption[];
  nextAyahOptions: QuizOption[];
}

interface HifzStats {
  streak: number;
  bestStreak: number;
  totalAnswered: number;
  totalCorrect: number;
  xp: number;
}

interface HifzQuizViewProps {
  surahs: Surah[];
  activeSurahId: number;
  reciter: Reciter;
  settings: ReaderSettings;
  weakWords: HifzWeakWord[];
  spacedQueue?: HifzSpacedItem[];
  onAdvanceSpacedStage?: (
    verseKey: string,
    surahId: number,
    surahName: string,
    ayahNumber: number,
    score?: number
  ) => void;
  onAddWeakWord: (word: HifzWeakWord) => void;
  onRemoveWeakWord: (id: string) => void;
  onOpenSurah: (surahId: number, ayahNumber: number, autoPlay?: boolean) => void;
  onOpenVoiceGrader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
  onRecordQuizPractice?: (
    surahId: number,
    surahName: string,
    verseKey: string,
    durationSec: number
  ) => void;
  onRecordHifzProgress?: (
    verseKey: string,
    surahId: number,
    status: HifzProgressStatus,
    stage: 1 | 2 | 3 | 4 | 5
  ) => void;
}

const STATS_STORAGE_KEY = 'noor_hifz_stats_v1';

function loadHifzStats(): HifzStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HifzStats>;
      return {
        streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
        bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
        totalAnswered: typeof parsed.totalAnswered === 'number' ? parsed.totalAnswered : 0,
        totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : 0,
        xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      };
    }
  } catch {
    // ignore
  }
  return { streak: 0, bestStreak: 0, totalAnswered: 0, totalCorrect: 0, xp: 0 };
}

function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed + 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickSupportedRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function toArabicIndicDigits(n: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n)
    .split('')
    .map((d) => digits[Number(d)] ?? d)
    .join('');
}

function formatTimer(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

function buildQuestionsForSurah(
  targetSurah: Surah,
  allSurahs: Surah[],
  weakOnly: boolean,
  weakWords: HifzWeakWord[],
  lang: TranslationLanguage,
  riwayah: RiwayahId = 'hafs',
  maghrebiOrthography = false
): HifzQuestion[] {
  const poolWords: {
    word: WordToken;
    surah: Surah;
    ayah: Ayah;
    displayArabic: string;
  }[] = [];

  for (const s of allSurahs) {
    for (const a of s.ayahs) {
      for (const w of a.words) {
        const displayArabic = getWordDisplayArabic(a, w, riwayah, maghrebiOrthography);
        if (displayArabic.trim().length > 1) {
          poolWords.push({ word: w, surah: s, ayah: a, displayArabic });
        }
      }
    }
  }

  const getWordMeaning = (w: WordToken) => getWordMeaningText(w, lang);

  const candidateAyahs: Ayah[] = weakOnly
    ? targetSurah.ayahs.filter((a) =>
        weakWords.some((ww) => ww.verseKey === a.verseKey)
      )
    : targetSurah.ayahs;

  const sourceAyahs =
    candidateAyahs.length > 0 ? candidateAyahs : targetSurah.ayahs;

  const questions: HifzQuestion[] = [];
  const stepLimit = Math.min(7, sourceAyahs.length);

  for (let i = 0; i < stepLimit; i++) {
    const ayah = sourceAyahs[i];
    if (!ayah.words.length) continue;

    // Pick a memorable word: prefer ending word or tajweed word so it feels meaningful for Hifz
    const weakMatch = weakWords.find((w) => w.verseKey === ayah.verseKey);
    let targetIdx = ayah.words.length - 1;
    if (weakMatch) {
      const idx = ayah.words.findIndex((w) => w.arabic === weakMatch.arabic);
      if (idx >= 0) targetIdx = idx;
    } else if (ayah.words.length >= 3 && i % 2 === 1) {
      const tajweedIdx = ayah.words.findIndex((w, wIdx) => wIdx > 0 && Boolean(w.tajweed));
      targetIdx = tajweedIdx >= 0 ? tajweedIdx : ayah.words.length - 1;
    }

    if (!getWordDisplayArabic(ayah, ayah.words[targetIdx], riwayah, maghrebiOrthography)) {
      const fallbackIdx = ayah.words.findIndex((w) =>
        Boolean(getWordDisplayArabic(ayah, w, riwayah, maghrebiOrthography))
      );
      if (fallbackIdx >= 0) targetIdx = fallbackIdx;
    }

    const targetWord = ayah.words[targetIdx];
    const targetDisplayArabic = getWordDisplayArabic(
      ayah,
      targetWord,
      riwayah,
      maghrebiOrthography
    );
    const nextAyah = targetSurah.ayahs.find((a) => a.number === ayah.number + 1);

    // Build 3 distinct Arabic distractors prioritizing neighboring ayahs (classic Hifz jump trap!)
    const distractorCandidates = poolWords.filter(
      (p) =>
        p.displayArabic !== targetDisplayArabic &&
        p.word.transliteration !== targetWord.transliteration
    );
    const sameSurahDistractors = distractorCandidates.filter(
      (p) => p.surah.id === targetSurah.id
    );
    const otherDistractors = distractorCandidates.filter(
      (p) => p.surah.id !== targetSurah.id
    );
    const orderedDistractors = [
      ...sameSurahDistractors,
      ...deterministicShuffle(otherDistractors, ayah.number * 13 + targetSurah.id),
    ];

    const pickedDistractors: typeof orderedDistractors = [];
    const seenArabic = new Set<string>([targetDisplayArabic]);
    for (const item of orderedDistractors) {
      if (seenArabic.has(item.displayArabic)) continue;
      seenArabic.add(item.displayArabic);
      pickedDistractors.push(item);
      if (pickedDistractors.length === 3) break;
    }

    const wordOptions: QuizOption[] = deterministicShuffle(
      [
        {
          id: `opt-correct-${ayah.verseKey}`,
          arabic: targetDisplayArabic,
          transliteration: targetWord.transliteration,
          meaning: getWordMeaning(targetWord),
          isCorrect: true,
          sourceVerseKey: ayah.verseKey,
          sourceSurahId: targetSurah.id,
          sourceAyahNumber: ayah.number,
          tajweedNote: targetWord.tajweedNote,
        },
        ...pickedDistractors.map((d, dIdx) => ({
          id: `opt-dist-${ayah.verseKey}-${dIdx}`,
          arabic: d.displayArabic,
          transliteration: d.word.transliteration,
          meaning: getWordMeaning(d.word),
          isCorrect: false,
          sourceVerseKey: d.ayah.verseKey,
          sourceSurahId: d.surah.id,
          sourceAyahNumber: d.ayah.number,
          tajweedNote: d.word.tajweedNote,
        })),
      ],
      targetSurah.id * 31 + ayah.number * 7
    );

    // Next Ayah mode options
    const targetNext = nextAyah ?? targetSurah.ayahs[0];
    const otherAyahsPool = allSurahs
      .flatMap((s) => s.ayahs.map((a) => ({ surah: s, ayah: a })))
      .filter((item) => item.ayah.verseKey !== targetNext.verseKey && item.ayah.verseKey !== ayah.verseKey);
    const sameSurahOtherAyahs = otherAyahsPool.filter(
      (item) => item.surah.id === targetSurah.id
    );
    const fallbackOtherAyahs = otherAyahsPool.filter(
      (item) => item.surah.id !== targetSurah.id
    );
    const nextDistractors = [
      ...deterministicShuffle(sameSurahOtherAyahs, ayah.number * 17),
      ...deterministicShuffle(fallbackOtherAyahs, ayah.number * 29),
    ].slice(0, 3);

    const nextAyahOptions: QuizOption[] = deterministicShuffle(
      [
        {
          id: `next-correct-${ayah.verseKey}`,
          arabic: getAyahDisplayArabic(targetNext, riwayah, maghrebiOrthography),
          transliteration: targetNext.transliteration,
          meaning: getAyahTranslationText(targetNext, lang).text,
          isCorrect: true,
          sourceVerseKey: targetNext.verseKey,
          sourceSurahId: targetSurah.id,
          sourceAyahNumber: targetNext.number,
        },
        ...nextDistractors.map((item, idx) => ({
          id: `next-dist-${ayah.verseKey}-${idx}`,
          arabic: getAyahDisplayArabic(item.ayah, riwayah, maghrebiOrthography),
          transliteration: item.ayah.transliteration,
          meaning: getAyahTranslationText(item.ayah, lang).text,
          isCorrect: false,
          sourceVerseKey: item.ayah.verseKey,
          sourceSurahId: item.surah.id,
          sourceAyahNumber: item.ayah.number,
        })),
      ],
      targetSurah.id * 19 + ayah.number * 11
    );

    questions.push({
      id: `${targetSurah.id}-${ayah.verseKey}-${targetWord.id}`,
      surah: targetSurah,
      ayah,
      targetWord,
      targetWordIdx: targetIdx,
      nextAyah,
      options: wordOptions,
      nextAyahOptions,
    });
  }

  return questions;
}

export const HifzQuizView: React.FC<HifzQuizViewProps> = ({
  surahs,
  activeSurahId,
  reciter,
  settings,
  weakWords,
  spacedQueue = [],
  onAdvanceSpacedStage,
  onAddWeakWord,
  onRemoveWeakWord,
  onOpenSurah,
  onOpenVoiceGrader,
  onPauseReaderAudio,
  onRecordQuizPractice,
  onRecordHifzProgress,
}) => {
  const [selectedSurahId, setSelectedSurahId] = useState<number>(activeSurahId);
  const [drillMode, setDrillMode] = useState<DrillMode>('word-fill');
  const [weakQueueOnly, setWeakQueueOnly] = useState<boolean>(false);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [promptSpeed, setPromptSpeed] = useState<0.75 | 1 | 1.25>(1);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [stats, setStats] = useState<HifzStats>(() => loadHifzStats());

  // Blind Recall (Mode 2) state
  const [blindPeekSec, setBlindPeekSec] = useState<number>(0);
  const [blindFullReveal, setBlindFullReveal] = useState<boolean>(false);
  const [blindMeaningVisible, setBlindMeaningVisible] = useState<boolean>(false);
  const [blindStepRecited, setBlindStepRecited] = useState<boolean>(false);
  const [blindStepVerified, setBlindStepVerified] = useState<boolean>(false);
  const cueStopTimerRef = useRef<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);
  const [stageAdvanceMsg, setStageAdvanceMsg] = useState<string | null>(null);

  // Audio playback state
  const promptAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const [playingSampleTag, setPlayingSampleTag] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Voice Tartil recording state
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const maxRecordTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartMsRef = useRef<number>(0);
  const voicedMsRef = useRef<number>(0);
  const peakRmsRef = useRef<number>(0);
  const lastSampleMsRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsedSec, setRecordElapsedSec] = useState(0);
  const [micLevels, setMicLevels] = useState<number[]>(() =>
    Array.from({ length: 14 }, () => 0.16)
  );
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingMine, setIsPlayingMine] = useState(false);
  const [isEvaluatingVoice, setIsEvaluatingVoice] = useState(false);
  const [voiceCheckResult, setVoiceCheckResult] = useState<{
    passed: boolean;
    voicedSec: number;
    clarityPct: number;
    makhrajScore: number;
    maddScore: number;
    ghunnahScore: number;
    breathScore: number;
    overallScore: number;
    message: string;
  } | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const lang: TranslationLanguage = settings.translationLanguage ?? 'en';

  const selectedSurah = useMemo(
    () => surahs.find((s) => s.id === selectedSurahId) ?? surahs[0],
    [surahs, selectedSurahId]
  );

  const riwayah: RiwayahId = settings.riwayah ?? 'hafs';
  const maghrebiOrthography = Boolean(settings.maghrebiOrthography);

  const questions = useMemo(
    () =>
      selectedSurah
        ? buildQuestionsForSurah(
            selectedSurah,
            surahs,
            weakQueueOnly,
            weakWords,
            lang,
            riwayah,
            maghrebiOrthography
          )
        : [],
    [selectedSurah, surahs, weakQueueOnly, weakWords, lang, riwayah, maghrebiOrthography]
  );

  const activeQuestion =
    questions[Math.min(questionIndex, Math.max(0, questions.length - 1))] ??
    null;

  // Persist stats
  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }, [stats]);

  // Live session timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const stopPromptAudio = useCallback(() => {
    if (cueStopTimerRef.current !== null) {
      window.clearTimeout(cueStopTimerRef.current);
      cueStopTimerRef.current = null;
    }
    if (promptAudioRef.current) {
      promptAudioRef.current.pause();
      promptAudioRef.current.currentTime = 0;
    }
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
    }
    setIsPlayingPrompt(false);
    setPlayingSampleTag(null);
    setIsPlayingMine(false);
    setAudioProgress(0);
  }, []);

  const cleanupMicHardware = useCallback(() => {
    if (meterTimerRef.current !== null) {
      window.clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
    if (maxRecordTimerRef.current !== null) {
      window.clearTimeout(maxRecordTimerRef.current);
      maxRecordTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Reset per-question interaction when switching question or surah
  useEffect(() => {
    if (peekTimerRef.current !== null) {
      window.clearInterval(peekTimerRef.current);
      peekTimerRef.current = null;
    }
    setSelectedOptionId(null);
    setIsChecked(false);
    setShowHint(false);
    setBlindPeekSec(0);
    setBlindFullReveal(false);
    setBlindMeaningVisible(false);
    setBlindStepRecited(false);
    setBlindStepVerified(false);
    setStageAdvanceMsg(null);
    setAudioError(null);
    setMicError(null);
    setVoiceCheckResult(null);
    stopPromptAudio();
    setUserAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [activeQuestion?.id, drillMode, stopPromptAudio]);

  useEffect(() => {
    return () => {
      if (peekTimerRef.current !== null) window.clearInterval(peekTimerRef.current);
      stopPromptAudio();
      cleanupMicHardware();
    };
  }, [stopPromptAudio, cleanupMicHardware]);

  const currentOptions = useMemo(() => {
    if (!activeQuestion) return [];
    return drillMode === 'next-ayah'
      ? activeQuestion.nextAyahOptions
      : activeQuestion.options;
  }, [activeQuestion, drillMode]);

  const chosenOption = currentOptions.find((o) => o.id === selectedOptionId) ?? null;
  const correctOption = currentOptions.find((o) => o.isCorrect) ?? null;

  const isCurrentWeak = useMemo(() => {
    if (!activeQuestion) return false;
    return weakWords.some(
      (w) =>
        w.verseKey === activeQuestion.ayah.verseKey &&
        w.arabic === activeQuestion.targetWord.arabic
    );
  }, [activeQuestion, weakWords]);

  const retentionPct =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 100;

  const playVerseSample = (
    surahId: number,
    ayahNumber: number,
    tag: string,
    speed: 0.75 | 1 | 1.25 = promptSpeed
  ) => {
    setAudioError(null);
    if (playingSampleTag === tag && (isPlayingPrompt || !promptAudioRef.current?.paused)) {
      stopPromptAudio();
      return;
    }
    onPauseReaderAudio?.();
    stopPromptAudio();

    const audio = promptAudioRef.current;
    if (!audio) return;
    const url = getEveryAyahUrl(reciter.everyAyahFolder, surahId, ayahNumber);
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    audio.playbackRate = speed;
    setPlayingSampleTag(tag);
    audio
      .play()
      .then(() => {
        if (tag === 'prompt') setIsPlayingPrompt(true);
      })
      .catch(() => {
        setIsPlayingPrompt(false);
        setPlayingSampleTag(null);
        setAudioError('Unable to stream Qari audio prompt right now.');
      });
  };

  const handleSelectOption = (option: QuizOption) => {
    if (isChecked || !activeQuestion) return;
    setSelectedOptionId(option.id);
    setIsChecked(true);

    const passed = option.isCorrect;
    setStats((prev) => {
      const nextStreak = passed ? prev.streak + 1 : 0;
      return {
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (passed ? 1 : 0),
        xp: prev.xp + (passed ? 25 : 5),
      };
    });

    onRecordQuizPractice?.(
      activeQuestion.surah.id,
      activeQuestion.surah.nameSimple,
      activeQuestion.ayah.verseKey,
      activeQuestion.ayah.durationSec || 5
    );

    if (passed) {
      const currentQueueItem = spacedQueue.find(
        (q) => q.verseKey === activeQuestion.ayah.verseKey
      );
      const stage = (currentQueueItem?.stage ?? 1) as 1 | 2 | 3 | 4 | 5;
      onRecordHifzProgress?.(
        activeQuestion.ayah.verseKey,
        activeQuestion.surah.id,
        stage >= 4 ? 'mastered' : 'memorized',
        stage
      );
    }
  };

  const handleToggleWeakWord = () => {
    if (!activeQuestion) return;
    const existing = weakWords.find(
      (w) =>
        w.verseKey === activeQuestion.ayah.verseKey &&
        w.arabic === activeQuestion.targetWord.arabic
    );
    if (existing) {
      onRemoveWeakWord(existing.id);
      return;
    }
    const localizedMeaning = getWordMeaningText(activeQuestion.targetWord, lang);

    onAddWeakWord({
      id: `${activeQuestion.ayah.verseKey}-${activeQuestion.targetWord.id}`,
      verseKey: activeQuestion.ayah.verseKey,
      surahId: activeQuestion.surah.id,
      surahName: activeQuestion.surah.nameSimple,
      ayahNumber: activeQuestion.ayah.number,
      arabic: activeQuestion.targetWord.arabic,
      transliteration: activeQuestion.targetWord.transliteration,
      meaning: localizedMeaning,
      tajweedNote: activeQuestion.targetWord.tajweedNote,
      addedAt: Date.now(),
      reviewCount: 1,
    });
  };

  const handleNextQuestion = () => {
    if (questions.length === 0) return;
    setQuestionIndex((prev) => (prev + 1) % questions.length);
  };

  const handleRetryQuestion = () => {
    setSelectedOptionId(null);
    setIsChecked(false);
    setShowHint(false);
    setVoiceCheckResult(null);
  };

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupMicHardware();
  }, [cleanupMicHardware]);

  const handleToggleVoiceRecord = async () => {
    if (!activeQuestion) return;
    setMicError(null);
    if (isRecording) {
      stopRecording();
      return;
    }

    onPauseReaderAudio?.();
    stopPromptAudio();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicError('Microphone recording is unavailable in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;

      const mimeType = pickSupportedRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recordStartMsRef.current = performance.now();
      lastSampleMsRef.current = performance.now();
      voicedMsRef.current = 0;
      peakRmsRef.current = 0;
      setRecordElapsedSec(0);
      setVoiceCheckResult(null);

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);

        meterTimerRef.current = window.setInterval(() => {
          const now = performance.now();
          const dt = now - lastSampleMsRef.current;
          lastSampleMsRef.current = now;

          analyser.getByteTimeDomainData(buf);
          let sumSq = 0;
          for (let i = 0; i < buf.length; i++) {
            const c = (buf[i] - 128) / 128;
            sumSq += c * c;
          }
          const rms = Math.sqrt(sumSq / buf.length);
          if (rms > peakRmsRef.current) peakRmsRef.current = rms;
          if (rms > 0.02) voicedMsRef.current += dt;

          setRecordElapsedSec((now - recordStartMsRef.current) / 1000);
          setMicLevels((prev) => [
            ...prev.slice(1),
            Math.min(1, Math.max(0.14, rms * 5.2)),
          ]);
        }, 70);
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const voicedSec = voicedMsRef.current / 1000;
        const clarityPct = Math.min(100, Math.round(peakRmsRef.current * 240));
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const nextUrl = URL.createObjectURL(blob);
        setUserAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        cleanupMicHardware();

        const hasAudioSignal = voicedSec >= 0.55 && peakRmsRef.current >= 0.022;
        if (!hasAudioSignal) {
          setVoiceCheckResult({
            passed: false,
            voicedSec,
            clarityPct,
            makhrajScore: Math.round(clarityPct * 0.35),
            maddScore: 10,
            ghunnahScore: 10,
            breathScore: 12,
            overallScore: Math.min(24, Math.round(clarityPct * 0.25)),
            message: `Very soft or short signal (${voicedSec.toFixed(1)}s). Speak aloud near the mic and recite the full verse clearly in Arabic.`,
          });
          return;
        }

        setIsEvaluatingVoice(true);
        let verification: SpokenVerificationResult | null = null;
        try {
          if (blob.size >= 400) {
            const audioBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const res = typeof reader.result === 'string' ? reader.result : '';
                const idx = res.indexOf(',');
                resolve(idx >= 0 ? res.slice(idx + 1) : res);
              };
              reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
              reader.readAsDataURL(blob);
            });
            const resp = await fetch('/api/grade-recitation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64,
                mimeType: blob.type || 'audio/webm',
                expectedArabic: getAyahDisplayArabic(
                  activeQuestion.ayah,
                  riwayah,
                  maghrebiOrthography
                ),
                words: activeQuestion.ayah.words
                  .map((w) =>
                    getWordDisplayArabic(activeQuestion.ayah, w, riwayah, maghrebiOrthography)
                  )
                  .filter(Boolean),
              }),
            });
            if (resp.ok) {
              verification = (await resp.json()) as SpokenVerificationResult;
            }
          }
        } catch {
          // Handled safely via strict fallback below
        } finally {
          setIsEvaluatingVoice(false);
        }

        const targetDur = Math.max(2.2, activeQuestion.ayah.durationSec || 5);
        const pacingRatio = Math.min(1, voicedSec / Math.max(1.4, targetDur * 0.72));
        const matchPct = verification
          ? Math.round((verification.wordMatchRatio * 0.75 + verification.charSimilarity * 0.25) * 100)
          : null;

        let passed = false;
        let makhrajScore = 0;
        let maddScore = 0;
        let ghunnahScore = 0;
        let breathScore = 0;
        let overallScore = 0;
        let message = '';

        if (verification) {
          if (!verification.isArabicSpeech || verification.wordMatchRatio < 0.25) {
            passed = false;
            const wrongCap = Math.max(4, Math.round((matchPct ?? 0) * 0.45));
            makhrajScore = Math.min(22, wrongCap + 4);
            maddScore = Math.min(24, Math.round(pacingRatio * 20));
            ghunnahScore = Math.min(18, wrongCap + 2);
            breathScore = Math.min(26, Math.round(pacingRatio * 24));
            overallScore = Math.min(22, Math.round((makhrajScore + maddScore + ghunnahScore + breathScore) / 4));
            const heardNote =
              verification.transcript && !/^\[?(silence|noise)/i.test(verification.transcript)
                ? `Heard "${verification.transcript.slice(0, 55)}" — `
                : '';
            message = `${heardNote}Spoken audio did not match Ayah ${activeQuestion.ayah.verseKey} (${verification.matchedWordCount}/${verification.expectedWordCount} Arabic words matched). Recite the exact Arabic verse clearly.`;
          } else if (verification.wordMatchRatio < 0.65) {
            passed = false;
            const partialPct = matchPct ?? 45;
            makhrajScore = Math.min(68, Math.round(partialPct * 0.92));
            maddScore = Math.min(68, Math.round((pacingRatio * 60 + partialPct * 0.4) * 0.75));
            ghunnahScore = Math.min(65, Math.round(partialPct * 0.88));
            breathScore = Math.min(70, Math.round(pacingRatio * 55 + 15));
            overallScore = Math.min(68, Math.round((makhrajScore + maddScore + ghunnahScore + breathScore) / 4));
            message = `Partial Arabic match (${verification.matchedWordCount}/${verification.expectedWordCount} words · ${overallScore}%). Recite the complete verse steadily from memory.`;
          } else {
            passed = true;
            const verifiedBase = matchPct ?? 82;
            makhrajScore = Math.min(98, Math.max(66, Math.round(verifiedBase * 0.72 + clarityPct * 0.28)));
            maddScore = Math.min(97, Math.max(65, Math.round(pacingRatio * 55 + verifiedBase * 0.42)));
            ghunnahScore = Math.min(98, Math.max(66, Math.round(verifiedBase * 0.68 + pacingRatio * 30)));
            breathScore = Math.min(97, Math.max(66, Math.round(pacingRatio * 62 + clarityPct * 0.34)));
            overallScore = Math.round((makhrajScore + maddScore + ghunnahScore + breathScore) / 4);
            message = `Masha'Allah! Verified Arabic recitation (${verification.matchedWordCount}/${verification.expectedWordCount} words · ${overallScore}% match). Review your 4-metric breakdown or advance your SRS stage.`;
          }
        } else {
          // Strict offline fallback: cannot pass without spoken-word verification
          passed = false;
          makhrajScore = Math.min(58, Math.round(clarityPct * 0.55));
          maddScore = Math.min(58, Math.round(pacingRatio * 56));
          ghunnahScore = Math.min(55, Math.round(clarityPct * 0.52));
          breathScore = Math.min(60, Math.round(pacingRatio * 58));
          overallScore = Math.min(58, Math.round((makhrajScore + maddScore + ghunnahScore + breathScore) / 4));
          message = `Acoustic cadence captured (${voicedSec.toFixed(1)}s), but live Arabic word verification is temporarily unreachable. Please retry in a moment to record a verified score.`;
        }

        setVoiceCheckResult({
          passed,
          voicedSec,
          clarityPct,
          makhrajScore,
          maddScore,
          ghunnahScore,
          breathScore,
          overallScore,
          message,
        });

        if (passed && !isChecked) {
          setIsChecked(true);
          setStats((prev) => {
            const nextStreak = prev.streak + 1;
            return {
              streak: nextStreak,
              bestStreak: Math.max(prev.bestStreak, nextStreak),
              totalAnswered: prev.totalAnswered + 1,
              totalCorrect: prev.totalCorrect + 1,
              xp: prev.xp + 30,
            };
          });
          onAdvanceSpacedStage?.(
            activeQuestion.ayah.verseKey,
            activeQuestion.surah.id,
            activeQuestion.surah.nameSimple,
            activeQuestion.ayah.number,
            overallScore
          );
          const currentQueueItem = spacedQueue.find(
            (q) => q.verseKey === activeQuestion.ayah.verseKey
          );
          const nextStage = Math.min(5, (currentQueueItem?.stage ?? 1) + 1) as 1 | 2 | 3 | 4 | 5;
          onRecordHifzProgress?.(
            activeQuestion.ayah.verseKey,
            activeQuestion.surah.id,
            overallScore >= 85 || nextStage >= 4 ? 'mastered' : 'memorized',
            nextStage
          );
        }
      };

      recorder.start(100);
      setIsRecording(true);
      maxRecordTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch {
      cleanupMicHardware();
      setIsRecording(false);
      setMicError('Could not access microphone. Please check browser audio permissions.');
    }
  };

  if (!activeQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center space-y-3">
        <p className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
          No Hifz quiz items match the current filter.
        </p>
        <button
          type="button"
          onClick={() => setWeakQueueOnly(false)}
          className="px-4 py-2 rounded-xl bg-[#064E3B] text-white text-xs font-semibold"
        >
          Show All Surah Drills
        </button>
      </div>
    );
  }

  const ruleSpec = activeQuestion.targetWord.tajweed
    ? TAJWEED_RULES.find((r) => r.type === activeQuestion.targetWord.tajweed)
    : undefined;

  const localizedAyahTranslation = getAyahTranslationText(activeQuestion.ayah, lang);
  const ayahTranslation = localizedAyahTranslation.text;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      <audio
        ref={promptAudioRef}
        preload="none"
        onTimeUpdate={(e) => {
          setAudioProgress(e.currentTarget.currentTime);
          if (Number.isFinite(e.currentTarget.duration)) {
            setAudioDuration(e.currentTarget.duration);
          }
        }}
        onEnded={() => {
          setIsPlayingPrompt(false);
          setPlayingSampleTag(null);
          setAudioProgress(0);
        }}
        onError={() => {
          setIsPlayingPrompt(false);
          setPlayingSampleTag(null);
          setAudioError('Could not load Qari recitation clip.');
        }}
      />
      <audio
        ref={userAudioRef}
        preload="none"
        onEnded={() => setIsPlayingMine(false)}
      />

      {/* Page Header + HUD Stats */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
              Hifz Memorization Drill
            </span>
            <span className="text-xs text-[#404944] dark:text-emerald-200/75">
              · {activeQuestion.surah.nameSimple} ({activeQuestion.ayah.verseKey})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Memorization &amp; Recall Quiz
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Train sequence retention, avoid verse-jump slips, and compare Qari Tajweed pauses across complete Quranic chapters.
          </p>
        </div>

        {/* Live Session Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15 text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] shadow-xs">
            <Flame className="w-4 h-4 text-[#D97706] dark:text-amber-400" />
            <span className="tabular-nums">{stats.streak} Streak</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15 text-xs font-bold text-[#0F766E] dark:text-emerald-300 shadow-xs">
            <Award className="w-4 h-4" />
            <span className="tabular-nums">{stats.xp} Hifz XP</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15 text-xs font-semibold text-[#404944] dark:text-emerald-200 shadow-xs tabular-nums">
            <Timer className="w-4 h-4 text-[#064E3B] dark:text-emerald-300" />
            <span>{formatTimer(elapsedSec)}</span>
          </div>
        </div>
      </div>

      {/* Surah Selector + Drill Mode Bar */}
      <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-4 sm:p-5 ayah-card-resting space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Surah Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {surahs.map((s) => {
              const active = s.id === selectedSurah?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSurahId(s.id);
                    setQuestionIndex(0);
                    setWeakQueueOnly(false);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'bg-[#064E3B]/[0.05] text-[#404944] hover:text-[#022C22] dark:bg-[#041D17] dark:text-emerald-200/80 dark:hover:text-white'
                  }`}
                >
                  {s.id}. {s.nameSimple}
                </button>
              );
            })}
            {weakWords.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeakQueueOnly((w) => !w);
                  setQuestionIndex(0);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  weakQueueOnly
                    ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                    : 'bg-[#D97706]/12 text-[#904D00] dark:bg-amber-400/15 dark:text-amber-300'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Weak Words ({weakWords.length})</span>
              </button>
            )}
          </div>

          {/* Drill Mode Segmented Switch */}
          <div
            role="tablist"
            aria-label="Hifz drill mode"
            className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-[#064E3B]/[0.05] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 shrink-0"
          >
            {(
              [
                { id: 'word-fill', label: 'Word Fill' },
                { id: 'blind-recall', label: 'Blind Recall' },
                { id: 'next-ayah', label: 'Next Ayah' },
                { id: 'voice-tartil', label: 'Tartīl Match' },
              ] as { id: DrillMode; label: string }[]
            ).map((m) => {
              const active = drillMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDrillMode(m.id)}
                  className={`min-h-[36px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                      : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Stage Spaced Repetition Stepper & Synchronized Queue */}
        {(() => {
          const currentQueueItem = spacedQueue.find(
            (q) => q.verseKey === activeQuestion.ayah.verseKey
          );
          const currentStage = currentQueueItem?.stage ?? 1;
          return (
            <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#F5FFFA]/80 dark:bg-[#041D17]/75 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                    5-Stage Spaced Repetition ({activeQuestion.ayah.verseKey})
                  </span>
                </div>
                {onAdvanceSpacedStage && (
                  <button
                    type="button"
                    onClick={() => {
                      onAdvanceSpacedStage(
                        activeQuestion.ayah.verseKey,
                        activeQuestion.surah.id,
                        activeQuestion.surah.nameSimple,
                        activeQuestion.ayah.number,
                        voiceCheckResult?.overallScore
                      );
                      setStageAdvanceMsg(
                        currentStage < 5
                          ? `Promoted ${activeQuestion.ayah.verseKey} to Stage ${currentStage + 1} (${SRS_STAGES[currentStage].interval})`
                          : `${activeQuestion.ayah.verseKey} solidified in long-term Hifz!`
                      );
                    }}
                    className="min-h-[28px] px-2.5 rounded-lg bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      {currentStage >= 5 ? 'Stage 5 Solidified' : `Promote to Stage ${currentStage + 1}`}
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {SRS_STAGES.map((st) => {
                  const isDone = st.stage < currentStage;
                  const isNow = st.stage === currentStage;
                  return (
                    <div
                      key={st.stage}
                      className={`rounded-lg px-2 py-1.5 text-center border text-[10px] sm:text-[11px] transition-colors ${
                        isNow
                          ? 'border-[#D97706] bg-[#D97706]/12 text-[#904D00] dark:border-amber-400 dark:bg-amber-400/18 dark:text-amber-200 font-bold'
                          : isDone
                          ? 'border-[#064E3B]/25 bg-[#064E3B]/10 text-[#064E3B] dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200 font-semibold'
                          : 'border-[#064E3B]/8 bg-white/70 dark:bg-[#0A2921]/70 dark:border-emerald-300/10 text-[#404944] dark:text-emerald-200/65'
                      }`}
                    >
                      <p className="truncate">
                        {st.stage}. {st.name}
                      </p>
                      <p className="text-[9.5px] opacity-80 tabular-nums">{st.interval}</p>
                    </div>
                  );
                })}
              </div>

              {stageAdvanceMsg && (
                <p className="text-[11px] font-semibold text-[#064E3B] dark:text-emerald-300">
                  {stageAdvanceMsg}
                </p>
              )}

              {spacedQueue.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[10.5px] font-semibold text-[#404944] dark:text-emerald-200/75 shrink-0">
                    Synced Queue ({spacedQueue.length}):
                  </span>
                  {spacedQueue.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedSurahId(item.surahId);
                        setWeakQueueOnly(false);
                        setQuestionIndex(Math.max(0, item.ayahNumber - 1));
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                        item.verseKey === activeQuestion.ayah.verseKey
                          ? 'bg-[#D97706] text-white border-[#D97706] dark:bg-amber-400 dark:text-[#022C22]'
                          : 'bg-white dark:bg-[#0A2921] border-[#064E3B]/12 dark:border-emerald-300/15 text-[#022C22] dark:text-[#E6FFF4]'
                      }`}
                    >
                      {item.surahName} {item.verseKey} · S{item.stage}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Segmented Progress Stepper */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#022C22] dark:text-[#E6FFF4] tabular-nums">
              Question {questionIndex + 1} of {questions.length}
            </span>
            <span className="font-medium text-[#404944] dark:text-emerald-200/80 tabular-nums">
              Retention Accuracy:{' '}
              <strong className="text-[#064E3B] dark:text-amber-300">
                {retentionPct}%
              </strong>
            </span>
          </div>
          <div
            className="grid gap-1.5 h-2 w-full"
            style={{ gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))` }}
          >
            {questions.map((q, idx) => {
              const isPast = idx < questionIndex;
              const isCurrent = idx === questionIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuestionIndex(idx)}
                  aria-label={`Jump to question ${idx + 1}`}
                  className={`h-full rounded-full transition-all ${
                    isCurrent
                      ? 'bg-[#D97706] dark:bg-amber-400'
                      : isPast
                      ? 'bg-[#064E3B] dark:bg-emerald-400'
                      : 'bg-[#064E3B]/15 dark:bg-emerald-300/20 hover:bg-[#064E3B]/30'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 2-Column Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Audio Prompt + Challenge Verse Canvas */}
        <div className="lg:col-span-7 space-y-4">
          {/* Lead Reciter Audio Prompt Card */}
          <section className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                    {reciter.name}
                  </p>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                    Lead Qari audio prompt · {activeQuestion.ayah.verseKey}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {([0.75, 1, 1.25] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPromptSpeed(spd)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                      promptSpeed === spd
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'bg-[#064E3B]/8 text-[#404944] dark:bg-emerald-400/10 dark:text-emerald-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
              {drillMode === 'next-ayah'
                ? 'Listen closely to the current verse and recall which Ayah immediately follows it in order.'
                : drillMode === 'blind-recall'
                ? 'The Arabic script is veiled for active recall. Use a 2-second peek or play the opening acoustic cue before reciting aloud.'
                : drillMode === 'voice-tartil'
                ? 'Listen once if needed, then recite aloud to generate your 4-metric Makhraj, Madd, Ghunnah, and Breath scorecard.'
                : 'Listen to the cadence and recall the exact Arabic word that completes this verse.'}
            </p>

            {/* Interactive Playback Strip */}
            <div className="flex items-center gap-3 rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-2.5">
              <button
                type="button"
                onClick={() =>
                  playVerseSample(
                    activeQuestion.surah.id,
                    activeQuestion.ayah.number,
                    'prompt',
                    promptSpeed
                  )
                }
                aria-label={isPlayingPrompt ? 'Pause audio prompt' : 'Play audio prompt'}
                className="w-11 h-11 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
              >
                {isPlayingPrompt ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex-1 flex items-center gap-1 h-7 px-1 overflow-hidden">
                {activeQuestion.ayah.waveform.slice(0, 22).map((amp, i) => {
                  const pct =
                    audioDuration > 0 ? audioProgress / audioDuration : 0;
                  const activeBar = i / 22 <= pct && isPlayingPrompt;
                  return (
                    <span
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${
                        activeBar
                          ? 'bg-[#D97706] dark:bg-amber-400'
                          : 'bg-[#064E3B]/20 dark:bg-emerald-300/20'
                      }`}
                      style={{ height: `${Math.max(5, Math.round(amp * 24))}px` }}
                    />
                  );
                })}
              </div>

              <span className="text-[11px] font-mono font-semibold text-[#404944] dark:text-emerald-200/85 tabular-nums shrink-0">
                {formatTimer(audioProgress)} /{' '}
                {formatTimer(audioDuration || activeQuestion.ayah.durationSec)}
              </span>
            </div>

            {audioError && (
              <p className="text-xs text-rose-700 dark:text-rose-300">{audioError}</p>
            )}
          </section>

          {/* Sacred Arabic Challenge Canvas */}
          <section className="rounded-2xl border border-[#D97706]/30 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-5 sm:p-7 ayah-card-resting space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <RubElHizbBadge
                  className="w-8 h-8"
                  label={activeQuestion.ayah.number}
                  active
                />
                <div>
                  <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    {activeQuestion.surah.nameSimple} · Ayah{' '}
                    {activeQuestion.ayah.verseKey}
                  </p>
                  <p className="text-[11px] text-[#0F766E] dark:text-emerald-300/85">
                    Juz {activeQuestion.ayah.juz} · {activeQuestion.surah.revelationPlace}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHint((h) => !h)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  showHint
                    ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                    : 'bg-[#D97706]/10 text-[#904D00] hover:bg-[#D97706]/20 dark:bg-amber-400/15 dark:text-amber-300'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide Hint' : 'Tajweed Hint'}</span>
              </button>
            </div>

            <FiligreeDivider />

            {/* Arabic Display */}
            {drillMode === 'blind-recall' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (peekTimerRef.current !== null) window.clearInterval(peekTimerRef.current);
                        setBlindPeekSec(2.0);
                        peekTimerRef.current = window.setInterval(() => {
                          setBlindPeekSec((prev) => {
                            if (prev <= 0.1) {
                              if (peekTimerRef.current !== null) {
                                window.clearInterval(peekTimerRef.current);
                                peekTimerRef.current = null;
                              }
                              return 0;
                            }
                            return Number((prev - 0.1).toFixed(1));
                          });
                        }, 100);
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-[#D97706]/12 hover:bg-[#D97706]/20 text-[#904D00] dark:bg-amber-400/15 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors tabular-nums"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {blindPeekSec > 0
                          ? `Peeking (${blindPeekSec.toFixed(1)}s)`
                          : 'Tap for 2s Peek'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onPauseReaderAudio?.();
                        stopPromptAudio();
                        const audio = promptAudioRef.current;
                        if (!audio) return;
                        const url = getEveryAyahUrl(
                          reciter.everyAyahFolder,
                          activeQuestion.surah.id,
                          activeQuestion.ayah.number
                        );
                        if (audio.src !== url) {
                          audio.src = url;
                          audio.load();
                        }
                        audio.currentTime = 0;
                        audio.playbackRate = promptSpeed;
                        setPlayingSampleTag('cue');
                        audio
                          .play()
                          .then(() => {
                            setIsPlayingPrompt(true);
                            cueStopTimerRef.current = window.setTimeout(() => {
                              stopPromptAudio();
                            }, 1850);
                          })
                          .catch(() => {
                            setAudioError('Unable to play opening acoustic cue.');
                          });
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-[#064E3B]/10 hover:bg-[#064E3B]/18 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>First Acoustic Cue (1.8s)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBlindFullReveal((r) => !r)}
                    className="min-h-[36px] px-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] inline-flex items-center gap-1.5"
                  >
                    {blindFullReveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{blindFullReveal ? 'Veil Script' : 'Reveal Script'}</span>
                  </button>
                </div>

                {/* Veiled / Unmasked Word Canvas */}
                <div
                  dir="rtl"
                  className="font-quran-amiri text-[30px] sm:text-[36px] leading-[2.1] flex flex-wrap items-center gap-x-2.5 gap-y-2.5 rounded-2xl border border-dashed border-[#064E3B]/20 dark:border-emerald-300/25 bg-[#F5FFFA]/70 dark:bg-[#041D17]/65 p-4 sm:p-5 text-[#022C22] dark:text-[#E6FFF4]"
                >
                  {activeQuestion.ayah.words.map((word) => {
                    const displayWord = getWordDisplayArabic(
                      activeQuestion.ayah,
                      word,
                      riwayah,
                      maghrebiOrthography
                    );
                    if (!displayWord) return null;
                    const visible = blindFullReveal || blindPeekSec > 0 || isChecked;
                    return visible ? (
                      <span key={word.id} className="px-1">
                        {displayWord}
                      </span>
                    ) : (
                      <span
                        key={word.id}
                        aria-label="Veiled Arabic word"
                        className="inline-flex items-center justify-center min-w-[74px] h-10 px-3 rounded-xl bg-[#064E3B]/10 dark:bg-emerald-400/12 border border-[#064E3B]/15 dark:border-emerald-300/20 text-sm tracking-widest text-[#0F766E]/60 dark:text-emerald-300/50 select-none"
                      >
                        ••••••
                      </span>
                    );
                  })}
                  <span className="text-[#D97706] dark:text-amber-300 text-[0.75em] px-1">
                    ﴿{toArabicIndicDigits(activeQuestion.ayah.number)}﴾
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setBlindMeaningVisible((v) => !v)}
                    className="text-xs font-semibold text-[#0F766E] dark:text-emerald-300 hover:underline"
                  >
                    {blindMeaningVisible ? 'Hide Meaning Hint' : 'Reveal Meaning Cue'}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleWeakWord}
                    className="text-xs font-semibold text-[#904D00] dark:text-amber-300 hover:underline"
                  >
                    {isCurrentWeak ? 'Saved in Weak Words' : 'Flag Ayah to Weak Words'}
                  </button>
                </div>
              </div>
            ) : drillMode === 'next-ayah' ? (
              <div className="space-y-4">
                <div
                  dir="rtl"
                  className="font-quran-amiri text-3xl sm:text-4xl leading-[2.0] text-right text-[#022C22] dark:text-[#E6FFF4]"
                >
                  {getAyahDisplayArabic(activeQuestion.ayah, riwayah, maghrebiOrthography)}{' '}
                  <span className="text-[#D97706] dark:text-amber-300 text-[0.75em]">
                    ﴿{toArabicIndicDigits(activeQuestion.ayah.number)}﴾
                  </span>
                </div>
                <div className="rounded-xl border border-dashed border-[#D97706]/50 dark:border-amber-400/45 bg-[#D97706]/[0.05] dark:bg-amber-400/10 p-4 text-center space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#904D00] dark:text-amber-300">
                    Next Ayah Prompt ({activeQuestion.nextAyah?.verseKey ?? `${activeQuestion.surah.id}:1`})
                  </p>
                  {isChecked && chosenOption ? (
                    <p
                      dir="rtl"
                      className={`font-quran-amiri text-2xl sm:text-3xl leading-[1.9] ${
                        chosenOption.isCorrect
                          ? 'text-[#064E3B] dark:text-emerald-200'
                          : 'text-[#BA1A1A] dark:text-rose-300'
                      }`}
                    >
                      {correctOption?.arabic}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-[#404944] dark:text-emerald-200/80">
                      Select the continuation verse from the options panel
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                dir="rtl"
                className="font-quran-amiri text-[30px] sm:text-[36px] leading-[2.1] flex flex-wrap items-center gap-x-2 gap-y-2 text-[#022C22] dark:text-[#E6FFF4]"
              >
                {activeQuestion.ayah.words.map((word, idx) => {
                  const isBlankSlot = idx === activeQuestion.targetWordIdx;
                  const displayWord = getWordDisplayArabic(
                    activeQuestion.ayah,
                    word,
                    riwayah,
                    maghrebiOrthography
                  );
                  if (!isBlankSlot) {
                    if (!displayWord) return null;
                    const style =
                      settings.showTajweedColors && word.tajweed
                        ? TAJWEED_STYLE_MAP[word.tajweed]
                        : null;
                    return (
                      <span
                        key={word.id}
                        className={style ? style.wordTint : undefined}
                      >
                        {displayWord}
                      </span>
                    );
                  }

                  // Blank slot pill
                  const revealCorrect = isChecked || (drillMode === 'voice-tartil' && voiceCheckResult?.passed);
                  const isWrongPick = isChecked && chosenOption && !chosenOption.isCorrect;

                  return (
                    <span
                      key={word.id}
                      className={`inline-flex items-center justify-center gap-2 min-w-[115px] min-h-[46px] px-3.5 py-0.5 rounded-xl border-2 transition-all ${
                        revealCorrect && !isWrongPick
                          ? 'bg-[#064E3B]/10 border-[#064E3B] text-[#064E3B] dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-100'
                          : isWrongPick
                          ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:border-rose-400 dark:text-rose-200'
                          : 'border-dashed border-[#D97706] bg-[#D97706]/10 text-[#904D00] dark:border-amber-400 dark:bg-amber-400/15 dark:text-amber-200'
                      }`}
                    >
                      {isWrongPick && chosenOption && (
                        <span className="line-through opacity-75 text-[0.78em]">
                          {chosenOption.arabic}
                        </span>
                      )}
                      <span>
                        {revealCorrect
                          ? getWordDisplayArabic(
                              activeQuestion.ayah,
                              activeQuestion.targetWord,
                              riwayah,
                              maghrebiOrthography
                            )
                          : '؟  •••••'}
                      </span>
                    </span>
                  );
                })}
                <span className="text-[#D97706] dark:text-amber-300 text-[0.75em] px-1">
                  ﴿{toArabicIndicDigits(activeQuestion.ayah.number)}﴾
                </span>
              </div>
            )}

            {/* Hint Popover Box */}
            {showHint && (
              <div className="rounded-xl border border-[#D97706]/30 bg-[#FEF3C7]/45 dark:bg-amber-950/30 dark:border-amber-400/30 px-4 py-3 text-xs space-y-1">
                <p className="font-bold text-[#904D00] dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tajweed &amp; First-Letter Clue</span>
                </p>
                <p className="text-[#022C22]/85 dark:text-amber-100/90 leading-relaxed">
                  Starts with Arabic letter{' '}
                  <strong dir="rtl" className="font-quran-amiri text-base px-1">
                    {getWordDisplayArabic(
                      activeQuestion.ayah,
                      activeQuestion.targetWord,
                      riwayah,
                      maghrebiOrthography
                    ).slice(0, 2)}
                  </strong>{' '}
                  ({activeQuestion.targetWord.transliteration.slice(0, 3)}…).{' '}
                  {ruleSpec
                    ? `Rule: ${ruleSpec.name} (${ruleSpec.harakatCount}) — ${ruleSpec.makhraj}.`
                    : activeQuestion.targetWord.tajweedNote ||
                      'Meaning cue: "' + getWordMeaningText(activeQuestion.targetWord, lang) + '".'}
                </p>
              </div>
            )}

            {/* Translation Context (masked in blind-recall unless meaning cue or verified is toggled) */}
            {(drillMode !== 'blind-recall' || blindMeaningVisible || blindFullReveal || isChecked) && (
              <div
                dir={isRtlTranslationLang(localizedAyahTranslation.resolvedLang) ? 'rtl' : 'ltr'}
                className={`rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 px-4 py-3 text-[#022C22]/90 dark:text-[#D0FAEA]/90 ${getTranslationTextClass(
                  localizedAyahTranslation.resolvedLang,
                  'card'
                )}`}
              >
                &ldquo;{ayahTranslation}&rdquo;
              </div>
            )}

            {/* Voice Drill Section (Available in all modes, prominent in Voice Tartil) */}
            <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[#D97706] dark:text-amber-400" />
                  <span className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Recite From Memory (Microphone Test)
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#0F766E] dark:text-emerald-300">
                  Qārī Tartil Match
                </span>
              </div>

              {isRecording && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#064E3B]/5 dark:bg-emerald-400/10 px-3 py-2">
                  <div className="flex items-center gap-1 flex-1 h-7">
                    {micLevels.map((lvl, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-full bg-[#D97706] dark:bg-amber-400 transition-all duration-75"
                        style={{ height: `${Math.round(lvl * 24)}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D97706] dark:text-amber-300 tabular-nums">
                    {recordElapsedSec.toFixed(1)}s
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleToggleVoiceRecord}
                  className={`flex-1 min-w-[180px] min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isRecording
                      ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                      : 'bg-[#064E3B] hover:bg-[#003527] text-[#FEF3C7] dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-[#022C22]'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>
                        {userAudioUrl ? 'Recite Again' : 'Tap to Recite Aloud'}
                      </span>
                    </>
                  )}
                </button>

                {userAudioUrl && !isRecording && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!userAudioRef.current || !userAudioUrl) return;
                      if (isPlayingMine) {
                        userAudioRef.current.pause();
                        setIsPlayingMine(false);
                        return;
                      }
                      stopPromptAudio();
                      userAudioRef.current.src = userAudioUrl;
                      userAudioRef.current.play().then(() => setIsPlayingMine(true)).catch(() => {});
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#064E3B]/20 dark:border-emerald-300/25 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] flex items-center gap-1.5"
                  >
                    {isPlayingMine ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingMine ? 'Stop Mine' : 'Play Mine'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onOpenVoiceGrader(
                      activeQuestion.surah.id,
                      activeQuestion.ayah.number
                    )
                  }
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D97706]/35 text-xs font-semibold text-[#904D00] dark:text-amber-300 hover:bg-[#D97706]/10 flex items-center gap-1.5"
                >
                  <span>Full Tone Grader</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {micError && (
                <p className="text-xs text-rose-700 dark:text-rose-300">{micError}</p>
              )}

              {isEvaluatingVoice && !isRecording && (
                <div className="rounded-xl border border-[#064E3B]/20 bg-[#064E3B]/5 dark:bg-emerald-400/10 px-3.5 py-2.5 text-xs font-medium text-[#0F766E] dark:text-emerald-200 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Verifying Arabic recitation &amp; pronunciation...</span>
                </div>
              )}

              {voiceCheckResult && !isRecording && !isEvaluatingVoice && (
                <div
                  className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                    voiceCheckResult.passed
                      ? 'border-emerald-600/25 bg-emerald-500/10 text-[#022C22] dark:text-emerald-100'
                      : 'border-[#D97706]/35 bg-[#D97706]/10 text-[#022C22] dark:text-amber-100'
                  }`}
                >
                  {voiceCheckResult.message}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Multiple Choice / Self-Verification / Tartil Scorecard + Guidance */}
        <div className="lg:col-span-5 space-y-4">
          {drillMode === 'blind-recall' && (
            <section className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  Blind Recall Self-Verification
                </p>
                <span className="text-[11px] font-semibold text-[#0F766E] dark:text-emerald-300">
                  Stage Checklist
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setBlindStepRecited((v) => !v)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                    blindStepRecited
                      ? 'border-[#064E3B] bg-[#064E3B]/8 dark:border-emerald-400 dark:bg-emerald-500/15'
                      : 'border-[#064E3B]/12 dark:border-emerald-300/18'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      blindStepRecited
                        ? 'bg-[#064E3B] border-[#064E3B] text-white dark:bg-emerald-400 dark:text-[#022C22]'
                        : 'border-[#064E3B]/30 dark:border-emerald-300/30'
                    }`}
                  >
                    {blindStepRecited && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                      1. Recited Ayah {activeQuestion.ayah.verseKey} aloud without looking
                    </p>
                    <p className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                      Use the mic above or recite directly from memory
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBlindStepVerified((v) => !v);
                    setBlindFullReveal(true);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                    blindStepVerified
                      ? 'border-[#064E3B] bg-[#064E3B]/8 dark:border-emerald-400 dark:bg-emerald-500/15'
                      : 'border-[#064E3B]/12 dark:border-emerald-300/18'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      blindStepVerified
                        ? 'bg-[#064E3B] border-[#064E3B] text-white dark:bg-emerald-400 dark:text-[#022C22]'
                        : 'border-[#064E3B]/30 dark:border-emerald-300/30'
                    }`}
                  >
                    {blindStepVerified && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                      2. Revealed &amp; verified Arabic vowels &amp; endings
                    </p>
                    <p className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                      Confirm ḥarakāt and stops match the Muṣḥaf cleanly
                    </p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                disabled={!blindStepRecited || !blindStepVerified || isChecked}
                onClick={() => {
                  setIsChecked(true);
                  setBlindFullReveal(true);
                  setStats((prev) => ({
                    streak: prev.streak + 1,
                    bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
                    totalAnswered: prev.totalAnswered + 1,
                    totalCorrect: prev.totalCorrect + 1,
                    xp: prev.xp + 40,
                  }));
                  onRecordQuizPractice?.(
                    activeQuestion.surah.id,
                    activeQuestion.surah.nameSimple,
                    activeQuestion.ayah.verseKey,
                    activeQuestion.ayah.durationSec || 6
                  );
                  onAdvanceSpacedStage?.(
                    activeQuestion.ayah.verseKey,
                    activeQuestion.surah.id,
                    activeQuestion.surah.nameSimple,
                    activeQuestion.ayah.number,
                    95
                  );
                  const currentQueueItem = spacedQueue.find(
                    (q) => q.verseKey === activeQuestion.ayah.verseKey
                  );
                  const anchoredStage = Math.max(4, currentQueueItem?.stage ?? 4) as 4 | 5;
                  onRecordHifzProgress?.(
                    activeQuestion.ayah.verseKey,
                    activeQuestion.surah.id,
                    'mastered',
                    anchoredStage
                  );
                }}
                className="w-full min-h-[44px] rounded-xl bg-[#064E3B] hover:bg-[#003527] disabled:opacity-45 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isChecked ? 'Blind Recall Anchored (+40 XP)' : 'Confirm Recall & Advance SRS Stage'}</span>
              </button>
            </section>
          )}

          {(drillMode === 'word-fill' || drillMode === 'next-ayah') && (
            <section className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  {drillMode === 'next-ayah'
                    ? 'Choose the correct next Ayah:'
                    : 'Select the missing recitation word:'}
                </p>
                <span className="text-[11px] font-semibold text-[#0F766E] dark:text-emerald-300">
                  {settings.riwayah === 'warsh' ? "Warsh 'an Nāfi'" : 'Ḥafṣ ‘an ‘Āṣim'}
                </span>
              </div>

              <div className="space-y-2.5">
                {currentOptions.map((opt, idx) => {
                  const isPicked = selectedOptionId === opt.id;
                  const showAsCorrect = isChecked && opt.isCorrect;
                  const showAsWrong = isChecked && isPicked && !opt.isCorrect;
                  const letterBadge = ['A', 'B', 'C', 'D'][idx] ?? String(idx + 1);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isChecked}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        showAsCorrect
                          ? 'border-[#064E3B] bg-[#064E3B]/10 dark:border-emerald-400 dark:bg-emerald-500/18'
                          : showAsWrong
                          ? 'border-rose-500 bg-rose-500/10 dark:border-rose-400 dark:bg-rose-950/40'
                          : isChecked
                          ? 'border-[#064E3B]/10 dark:border-emerald-300/10 opacity-50'
                          : 'border-[#064E3B]/12 dark:border-emerald-300/18 hover:border-[#D97706] hover:bg-[#064E3B]/[0.03] dark:hover:bg-emerald-400/8'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            showAsCorrect
                              ? 'bg-[#064E3B] text-white dark:bg-emerald-400 dark:text-[#022C22]'
                              : showAsWrong
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#064E3B]/8 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200'
                          }`}
                        >
                          {showAsCorrect ? (
                            <Check className="w-4 h-4" />
                          ) : showAsWrong ? (
                            <X className="w-4 h-4" />
                          ) : (
                            letterBadge
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                            {opt.transliteration}
                          </p>
                          <p className="text-[11px] text-[#404944] dark:text-emerald-200/80 line-clamp-2">
                            {opt.meaning}
                          </p>
                        </div>
                      </div>

                      <span
                        dir="rtl"
                        className={`font-quran-amiri font-bold shrink-0 ${
                          drillMode === 'next-ayah'
                            ? 'text-lg max-w-[150px] truncate'
                            : 'text-2xl'
                        } ${
                          showAsWrong
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-[#003527] dark:text-amber-200'
                        }`}
                      >
                        {opt.arabic}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Mode 3 Acoustic 4-Metric Tartil Match Scorecard */}
          {drillMode === 'voice-tartil' && voiceCheckResult && (
            <section className="rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#064E3B]/10 dark:border-emerald-300/12">
                <div>
                  <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Qārī Tartīl Match Scorecard
                  </p>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/80">
                    Measured acoustic pacing vs {reciter.name.split(' ').slice(0, 2).join(' ')}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] text-xs font-bold tabular-nums">
                  {voiceCheckResult.overallScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Makhraj Clarity', val: voiceCheckResult.makhrajScore },
                  { label: 'Madd Elongation', val: voiceCheckResult.maddScore },
                  { label: 'Ghunnah Nasal', val: voiceCheckResult.ghunnahScore },
                  { label: 'Breath & Waqf', val: voiceCheckResult.breathScore },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#404944] dark:text-emerald-200/80">
                        {metric.label}
                      </span>
                      <span className="font-bold tabular-nums text-[#064E3B] dark:text-amber-300">
                        {metric.val}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#064E3B]/10 dark:bg-emerald-300/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#D97706] dark:bg-amber-400"
                        style={{ width: `${metric.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dual Qari vs Recorded Contour Preview + Word Matrix */}
              <div className="rounded-xl bg-[#064E3B]/[0.03] dark:bg-[#041D17]/80 border border-[#064E3B]/10 dark:border-emerald-300/15 p-3 space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-semibold text-[#404944] dark:text-emerald-200/75">
                  <span className="text-[#064E3B] dark:text-emerald-300">● Reference Qārī Contour</span>
                  <span className="text-[#D97706] dark:text-amber-300">● Your Voice Cadence</span>
                </div>
                <svg viewBox="0 0 260 54" className="w-full h-12" aria-hidden="true">
                  <path
                    d="M 4 38 C 40 12, 80 42, 130 18 C 180 6, 220 36, 256 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    className="text-[#064E3B] dark:text-emerald-400"
                  />
                  <path
                    d={`M 4 40 C 42 ${voiceCheckResult.passed ? 16 : 30}, 84 44, 130 ${voiceCheckResult.passed ? 20 : 32} C 178 ${voiceCheckResult.passed ? 10 : 28}, 220 38, 256 22`}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </svg>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeQuestion.ayah.words.slice(0, 5).map((w, idx) => {
                    const displayW = getWordDisplayArabic(
                      activeQuestion.ayah,
                      w,
                      riwayah,
                      maghrebiOrthography
                    );
                    if (!displayW) return null;
                    return (
                      <span
                        key={w.id}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          w.tajweed
                            ? 'border-[#D97706]/35 bg-[#D97706]/10 text-[#904D00] dark:text-amber-200'
                            : 'border-[#064E3B]/15 bg-white dark:bg-[#0A2921] text-[#064E3B] dark:text-emerald-200'
                        }`}
                      >
                        <span dir="rtl" className="font-quran-amiri text-xs mr-1">
                          {displayW}
                        </span>
                        {w.tajweed ? 'Check' : idx === 0 ? 'Active' : 'Clear'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Tajweed Correction & Qārī Guidance Drawer */}
          {(isChecked || (drillMode === 'voice-tartil' && voiceCheckResult)) && (
            <section className="rounded-2xl border border-[#D97706]/35 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-5 ayah-card-resting space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#064E3B]/10 dark:border-emerald-300/12">
                <div>
                  <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Tajweed Correction &amp; Qārī Guidance
                  </p>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/80">
                    {chosenOption?.isCorrect || voiceCheckResult?.passed || drillMode === 'blind-recall'
                      ? `Masha'Allah — Ayah ${activeQuestion.ayah.verseKey} anchored!`
                      : `Compare ${activeQuestion.ayah.verseKey} with selection (${chosenOption?.sourceVerseKey ?? ''})`}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    chosenOption?.isCorrect || voiceCheckResult?.passed || drillMode === 'blind-recall'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {chosenOption?.isCorrect || voiceCheckResult?.passed || drillMode === 'blind-recall'
                    ? 'Verified'
                    : 'Review Jump'}
                </span>
              </div>

              {/* Audio Comparison Rows */}
              <div className="space-y-2 rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] p-3 border border-[#064E3B]/8 dark:border-emerald-300/12">
                <p className="text-[11px] font-bold text-[#0F766E] dark:text-emerald-300">
                  Compare Recitations ({reciter.name.split(' ').slice(0, 2).join(' ')})
                </p>

                {/* Target Audio */}
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0A2921] px-3 py-2 rounded-lg border border-[#064E3B]/10 dark:border-emerald-300/15">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        playVerseSample(
                          activeQuestion.surah.id,
                          activeQuestion.ayah.number,
                          'compare-target'
                        )
                      }
                      aria-label="Play correct verse sample"
                      className="w-8 h-8 rounded-full bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] flex items-center justify-center shrink-0"
                    >
                      {playingSampleTag === 'compare-target' ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                        Target ({activeQuestion.ayah.verseKey}):{' '}
                        <span dir="rtl" className="font-quran-amiri text-sm">
                          {getWordDisplayArabic(
                            activeQuestion.ayah,
                            activeQuestion.targetWord,
                            riwayah,
                            maghrebiOrthography
                          )}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                        {ruleSpec
                          ? `${ruleSpec.name} · ${ruleSpec.harakatCount}`
                          : 'Canonical Qari pacing'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Distractor Audio when wrong */}
                {chosenOption && !chosenOption.isCorrect && (
                  <div className="flex items-center justify-between gap-2 bg-rose-500/8 px-3 py-2 rounded-lg border border-rose-500/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          playVerseSample(
                            chosenOption.sourceSurahId,
                            chosenOption.sourceAyahNumber,
                            'compare-choice'
                          )
                        }
                        aria-label="Play chosen distractor verse sample"
                        className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0"
                      >
                        {playingSampleTag === 'compare-choice' ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300 truncate">
                          Your Pick (from {chosenOption.sourceVerseKey}):{' '}
                          <span dir="rtl" className="font-quran-amiri text-sm">
                            {chosenOption.arabic}
                          </span>
                        </p>
                        <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                          Hear how this belongs to verse {chosenOption.sourceVerseKey}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tajweed / Waqf Explanation */}
              <div className="rounded-xl bg-[#064E3B]/[0.04] dark:bg-emerald-400/10 p-3 space-y-1 text-xs">
                <p className="font-bold text-[#022C22] dark:text-[#E6FFF4] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300" />
                  <span>
                    {ruleSpec
                      ? `${ruleSpec.name} (${ruleSpec.arabicName})`
                      : 'Waqf Sunnah at Head of Ayah'}
                  </span>
                </p>
                <p className="text-[#404944] dark:text-emerald-100/85 leading-relaxed">
                  {activeQuestion.targetWord.tajweedNote ||
                    ruleSpec?.description ||
                    'Pause cleanly on each Ayah head with a steady breath so the opening transition into the next verse stays unhurried.'}
                </p>
              </div>

              {/* SRS Interval & Weak Words Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-[#404944] dark:text-emerald-200/80">
                  <span className="font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    {chosenOption?.isCorrect || voiceCheckResult?.passed
                      ? 'Next Review: 3 Days'
                      : 'Next Review: Today (Priority)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleWeakWord}
                  className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                    isCurrentWeak
                      ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                      : 'bg-[#D97706]/12 text-[#904D00] hover:bg-[#D97706]/20 dark:bg-amber-400/15 dark:text-amber-300'
                  }`}
                >
                  {isCurrentWeak ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>In Weak Words</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add to Weak Words</span>
                    </>
                  )}
                </button>
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetryQuestion}
                  className="min-h-[42px] px-3.5 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenSurah(
                      activeQuestion.surah.id,
                      activeQuestion.ayah.number,
                      false
                    )
                  }
                  className="min-h-[42px] px-3.5 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#0F766E] dark:text-emerald-300 inline-flex items-center gap-1.5"
                >
                  <span>Reader</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* Weak Words Queue Preview */}
          {weakWords.length > 0 && (
            <section className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-4 ayah-card-resting space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  Weak Words Review Queue ({weakWords.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWeakQueueOnly((w) => !w);
                    setQuestionIndex(0);
                  }}
                  className="text-[11px] font-semibold text-[#D97706] dark:text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{weakQueueOnly ? 'Show Full Surah' : 'Drill Queue'}</span>
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {weakWords.map((ww) => (
                  <div
                    key={ww.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] px-3 py-2 border border-[#064E3B]/8 dark:border-emerald-300/12"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSurahId(ww.surahId);
                        setWeakQueueOnly(false);
                        setQuestionIndex(Math.max(0, ww.ayahNumber - 1));
                      }}
                      className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                    >
                      <span
                        dir="rtl"
                        className="font-quran-amiri text-xl font-bold text-[#064E3B] dark:text-amber-200 shrink-0"
                      >
                        {formatAyahByRiwayah(ww.verseKey, ww.arabic, riwayah, maghrebiOrthography)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] truncate">
                          {ww.transliteration} · {ww.verseKey}
                        </p>
                        <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                          {ww.meaning}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveWeakWord(ww.id)}
                      aria-label={`Remove ${ww.transliteration} from weak words`}
                      className="p-1.5 rounded-lg text-[#707974] hover:text-rose-600 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
