import { buildRuleFeedback, type AcousticAnalysis } from '../utils/ruleFeedback';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bookmark,
  CheckCircle2,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  Wind,
} from 'lucide-react';
import { TAJWEED_RULES, TAJWEED_STYLE_MAP } from '../data/tajweedRules';
import { FEATURED_SURAHS, getEveryAyahUrl } from '../data/quranData';
import { Ayah, Reciter, RiwayahId, Surah, TajweedRuleType } from '../types/quran';
import {
  MicAcousticSample,
  SpokenVerificationResult,
  TartilGradeReport,
  buildReferencePitchContour,
  detectPitchHz,
  evaluateTartilRecitation,
} from '../utils/pitchAnalysis';
import { FiligreeDivider } from './RubElHizbIcon';
import { QiraatExplorerView } from './QiraatExplorerView';

interface TajweedStudioViewProps {
  reciter: Reciter;
  surahs?: Surah[];
  initialTab?: 'rules' | 'grader' | 'qiraat';
  initialGraderTarget?: { surahId: number; ayahNumber: number } | null;
  bookmarkedKeys?: Set<string>;
  activeRiwayah?: RiwayahId;
  maghrebiOrthography?: boolean;
  onSetGlobalRiwayah?: (riwayah: RiwayahId) => void;
  onToggleMaghrebiOrthography?: (enabled: boolean) => void;
  onBookmarkAyah?: (surah: Surah, ayah: Ayah) => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}


type StudioTab = 'rules' | 'grader' | 'qiraat';

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

function buildSmoothSvgPath(values: number[], width = 500, height = 120): string {
  if (!values.length) return '';
  const padX = 12;
  const usableW = width - padX * 2;
  const pts = values.map((v, idx) => {
    const x = padX + (idx / Math.max(1, values.length - 1)) * usableW;
    // Higher pitch -> higher visually (smaller y)
    const y = Math.round(108 - v * 92);
    return { x: Number(x.toFixed(1)), y };
  });

  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const midX = Number(((prev.x + curr.x) / 2).toFixed(1));
    d += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(blob);
  });
}

async function verifySpokenAudio(
  blob: Blob,
  expectedArabic: string,
  words: string[]
): Promise<SpokenVerificationResult | null> {
  try {
    if (blob.size < 400) return null;
    const audioBase64 = await blobToBase64(blob);
    const res = await fetch('/api/grade-recitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: blob.type || 'audio/webm',
        expectedArabic,
        words,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SpokenVerificationResult;
  } catch {
    return null;
  }
}


export const TajweedStudioView: React.FC<TajweedStudioViewProps> = ({
  reciter,
  surahs = FEATURED_SURAHS,
  initialTab = 'rules',
  initialGraderTarget = null,
  bookmarkedKeys,
  activeRiwayah = 'hafs',
  maghrebiOrthography = false,
  onSetGlobalRiwayah,
  onToggleMaghrebiOrthography,
  onBookmarkAyah,
  onPracticeInReader,
  onPauseReaderAudio,
}) => {
  const [studioTab, setStudioTab] = useState<StudioTab>(initialTab);
  const [selectedRuleType, setSelectedRuleType] =
    useState<TajweedRuleType>('ghunnah');
  const activeRule =
    TAJWEED_RULES.find((r) => r.type === selectedRuleType) ?? TAJWEED_RULES[0];
  const activeStyle = TAJWEED_STYLE_MAP[activeRule.type];

  // Voice Tone Grader verse target (defaults to Al-Fatiha 1:2)
  const [graderSurahId, setGraderSurahId] = useState<number>(
    initialGraderTarget?.surahId ?? 1
  );
  const [graderAyahNum, setGraderAyahNum] = useState<number>(
    initialGraderTarget?.ayahNumber ?? 2
  );

  useEffect(() => {
    setStudioTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialGraderTarget) {
      setGraderSurahId(initialGraderTarget.surahId);
      setGraderAyahNum(initialGraderTarget.ayahNumber);
      setStudioTab('grader');
    }
  }, [initialGraderTarget]);

  const graderSurah = useMemo(
    () => surahs.find((s) => s.id === graderSurahId) ?? surahs[0],
    [surahs, graderSurahId]
  );
  const graderAyah = useMemo(
    () =>
      graderSurah?.ayahs.find((a) => a.number === graderAyahNum) ??
      graderSurah?.ayahs[0],
    [graderSurah, graderAyahNum]
  );

  // Qari example audio state
  const qariAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingQari, setIsPlayingQari] = useState(false);
  const [slowStudyMode, setSlowStudyMode] = useState(false);
  const [qariError, setQariError] = useState<string | null>(null);
  const [playheadRatio, setPlayheadRatio] = useState<number>(0);

  // User pronunciation recording state
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
  const acousticSamplesRef = useRef<MicAcousticSample[]>([]);
  const compareActiveRef = useRef<boolean>(false);
  const activeRecordingModeRef = useRef<StudioTab>('rules');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [micLevels, setMicLevels] = useState<number[]>(() =>
    Array.from({ length: 16 }, () => 0.14)
  );
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingMine, setIsPlayingMine] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const evaluationSeqRef = useRef(0);
  const [analysis, setAnalysis] = useState<AcousticAnalysis | null>(null);
  const [gradeReport, setGradeReport] = useState<TartilGradeReport | null>(null);
  const [focusedWordIdx, setFocusedWordIdx] = useState<number | null>(null);

  const cleanupRecordingHardware = useCallback(() => {
    if (meterTimerRef.current !== null) {
      window.clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
    if (maxRecordTimerRef.current !== null) {
      window.clearTimeout(maxRecordTimerRef.current);
      maxRecordTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const stopAllPlayback = useCallback(() => {
    compareActiveRef.current = false;
    setIsComparing(false);
    setPlayheadRatio(0);
    if (qariAudioRef.current) {
      qariAudioRef.current.pause();
      qariAudioRef.current.currentTime = 0;
    }
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
    }
    setIsPlayingQari(false);
    setIsPlayingMine(false);
  }, []);

  // Reset audio & recording cleanly when switching rule, target ayah, or tab
  useEffect(() => {
    stopAllPlayback();
    evaluationSeqRef.current += 1;
    setIsEvaluating(false);
    setQariError(null);
    setMicError(null);
    setAnalysis(null);
    setGradeReport(null);
    setFocusedWordIdx(null);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupRecordingHardware();
    setUserAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [
    selectedRuleType,
    graderSurahId,
    graderAyahNum,
    studioTab,
    stopAllPlayback,
    cleanupRecordingHardware,
  ]);

  const userAudioUrlRef = useRef<string | null>(null);
  useEffect(() => {
    userAudioUrlRef.current = userAudioUrl;
  }, [userAudioUrl]);

  useEffect(() => {
    return () => {
      stopAllPlayback();
      cleanupRecordingHardware();
      if (userAudioUrlRef.current) {
        URL.revokeObjectURL(userAudioUrlRef.current);
      }
    };
  }, [stopAllPlayback, cleanupRecordingHardware]);

  useEffect(() => {
    if (qariAudioRef.current) {
      qariAudioRef.current.playbackRate = slowStudyMode ? 0.75 : 1;
    }
  }, [slowStudyMode]);

  const targetVerseForCurrentTab = useMemo(() => {
    if (studioTab === 'grader' && graderSurah && graderAyah) {
      return {
        surahId: graderSurah.id,
        ayahNumber: graderAyah.number,
      };
    }
    return {
      surahId: activeRule.exampleSurahId,
      ayahNumber: activeRule.exampleAyahNumber,
    };
  }, [studioTab, graderSurah, graderAyah, activeRule]);

  const handleTogglePlayQari = () => {
    setQariError(null);
    if (isPlayingQari) {
      stopAllPlayback();
      return;
    }
    if (isRecording) {
      stopRecording();
    }
    onPauseReaderAudio?.();
    stopAllPlayback();

    const audio = qariAudioRef.current;
    if (!audio) return;
    const url = getEveryAyahUrl(
      reciter.everyAyahFolder,
      targetVerseForCurrentTab.surahId,
      targetVerseForCurrentTab.ayahNumber
    );
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    audio.playbackRate = slowStudyMode ? 0.75 : 1;
    audio
      .play()
      .then(() => {
        setIsPlayingQari(true);
      })
      .catch(() => {
        setIsPlayingQari(false);
        setQariError(
          'Unable to play audio stream right now. Check your connection or try opening the verse in the Reader.'
        );
      });
  };

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupRecordingHardware();
  }, [cleanupRecordingHardware]);

  const handleToggleRecording = async (mode: StudioTab = studioTab) => {
    setMicError(null);
    if (isRecording) {
      stopRecording();
      return;
    }

    onPauseReaderAudio?.();
    stopAllPlayback();
    activeRecordingModeRef.current = mode;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicError(
        'Microphone recording is not supported in this browser. You can still listen to the Qari example or open the verse in the Reader.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = pickSupportedRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      acousticSamplesRef.current = [];
      recordStartMsRef.current = performance.now();
      lastSampleMsRef.current = performance.now();
      voicedMsRef.current = 0;
      peakRmsRef.current = 0;
      setRecordingElapsedSec(0);
      setAnalysis(null);
      if (mode === 'grader') {
        setGradeReport(null);
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const floatBuf = new Float32Array(analyser.fftSize);

        meterTimerRef.current = window.setInterval(() => {
          const now = performance.now();
          const dt = now - lastSampleMsRef.current;
          lastSampleMsRef.current = now;

          analyser.getFloatTimeDomainData(floatBuf);
          let sumSq = 0;
          for (let i = 0; i < floatBuf.length; i++) {
            sumSq += floatBuf[i] * floatBuf[i];
          }
          const rms = Math.sqrt(sumSq / floatBuf.length);
          if (rms > peakRmsRef.current) peakRmsRef.current = rms;
          if (rms > 0.02) voicedMsRef.current += dt;

          const pitchHz =
            rms > 0.018 ? detectPitchHz(floatBuf, ctx.sampleRate) : null;
          acousticSamplesRef.current.push({
            tMs: now - recordStartMsRef.current,
            rms,
            pitchHz,
          });

          setRecordingElapsedSec((now - recordStartMsRef.current) / 1000);
          const normLevel = Math.min(1, Math.max(0.12, rms * 5.5));
          setMicLevels((prev) => [...prev.slice(1), normLevel]);
        }, 65);
      } else {
        meterTimerRef.current = window.setInterval(() => {
          setRecordingElapsedSec(
            (performance.now() - recordStartMsRef.current) / 1000
          );
        }, 100);
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const totalSec = Math.max(
          0.2,
          (performance.now() - recordStartMsRef.current) / 1000
        );
        const voicedSec = voicedMsRef.current / 1000;
        const capturedPeakRms = peakRmsRef.current;
        const capturedSamples = [...acousticSamplesRef.current];
        const modeAtStop = activeRecordingModeRef.current;
        const targetAyah = graderAyah;
        const targetRule = activeRule;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const nextUrl = URL.createObjectURL(blob);
        setUserAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        cleanupRecordingHardware();

        const seq = ++evaluationSeqRef.current;
        setIsEvaluating(true);

        void (async () => {
          try {
            if (modeAtStop === 'grader' && targetAyah) {
              const verification =
                voicedSec >= 0.4 && capturedPeakRms >= 0.015
                  ? await verifySpokenAudio(
                      blob,
                      targetAyah.arabic,
                      targetAyah.words.map((w) => w.arabic)
                    )
                  : null;
              if (evaluationSeqRef.current !== seq) return;
              setGradeReport(
                evaluateTartilRecitation(
                  targetAyah,
                  reciter.name,
                  capturedSamples,
                  totalSec,
                  voicedSec,
                  capturedPeakRms,
                  verification
                )
              );
            } else {
              const exampleWords = targetRule.exampleArabic
                .split(/\s+/)
                .filter(Boolean);
              const verification =
                voicedSec >= 0.35 && capturedPeakRms >= 0.015
                  ? await verifySpokenAudio(
                      blob,
                      targetRule.exampleArabic,
                      exampleWords
                    )
                  : null;
              if (evaluationSeqRef.current !== seq) return;
              setAnalysis(
                buildRuleFeedback(
                  targetRule.type,
                  voicedSec,
                  totalSec,
                  capturedPeakRms,
                  verification
                )
              );
            }
          } finally {
            if (evaluationSeqRef.current === seq) {
              setIsEvaluating(false);
            }
          }
        })();
      };

      recorder.start(100);
      setIsRecording(true);

      maxRecordTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 15000);
    } catch (err) {
      cleanupRecordingHardware();
      setIsRecording(false);
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicError(
          'Microphone permission was denied. Allow microphone access in your browser settings to test your pronunciation.'
        );
      } else if (name === 'NotFoundError') {
        setMicError('No microphone device was found on this system.');
      } else {
        setMicError(
          'Could not start microphone recording. Please check your browser audio permissions.'
        );
      }
    }
  };

  const handleTogglePlayMine = () => {
    if (!userAudioUrl || !userAudioRef.current) return;
    if (isPlayingMine) {
      stopAllPlayback();
      return;
    }
    stopAllPlayback();
    const audio = userAudioRef.current;
    if (audio.src !== userAudioUrl) {
      audio.src = userAudioUrl;
      audio.load();
    }
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setIsPlayingMine(true))
      .catch(() => setIsPlayingMine(false));
  };

  const handleCompareWithQari = () => {
    if (!userAudioUrl || !qariAudioRef.current) return;
    if (isComparing) {
      stopAllPlayback();
      return;
    }
    onPauseReaderAudio?.();
    stopAllPlayback();
    compareActiveRef.current = true;
    setIsComparing(true);

    const qariAudio = qariAudioRef.current;
    const url = getEveryAyahUrl(
      reciter.everyAyahFolder,
      targetVerseForCurrentTab.surahId,
      targetVerseForCurrentTab.ayahNumber
    );
    if (qariAudio.src !== url) {
      qariAudio.src = url;
      qariAudio.load();
    }
    qariAudio.currentTime = 0;
    qariAudio.playbackRate = slowStudyMode ? 0.75 : 1;
    qariAudio
      .play()
      .then(() => setIsPlayingQari(true))
      .catch(() => {
        compareActiveRef.current = false;
        setIsComparing(false);
      });
  };

  const previewRefContour = useMemo(() => {
    if (!graderAyah) return [];
    return buildReferencePitchContour(graderAyah, 28);
  }, [graderAyah]);

  const refPath = useMemo(
    () =>
      buildSmoothSvgPath(
        gradeReport ? gradeReport.referenceContour : previewRefContour
      ),
    [gradeReport, previewRefContour]
  );

  const userPath = useMemo(
    () => (gradeReport ? buildSmoothSvgPath(gradeReport.userContour) : ''),
    [gradeReport]
  );

  const playheadX = 12 + playheadRatio * 476;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      {/* Studio Audio Elements */}
      <audio
        ref={qariAudioRef}
        preload="none"
        onTimeUpdate={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setPlayheadRatio(Math.min(1, e.currentTarget.currentTime / d));
          }
        }}
        onEnded={() => {
          setIsPlayingQari(false);
          setPlayheadRatio(0);
          if (compareActiveRef.current && userAudioUrl && userAudioRef.current) {
            const mine = userAudioRef.current;
            if (mine.src !== userAudioUrl) {
              mine.src = userAudioUrl;
              mine.load();
            }
            mine.currentTime = 0;
            mine
              .play()
              .then(() => setIsPlayingMine(true))
              .catch(() => {
                compareActiveRef.current = false;
                setIsComparing(false);
              });
          } else {
            compareActiveRef.current = false;
            setIsComparing(false);
          }
        }}
        onError={() => {
          setIsPlayingQari(false);
          compareActiveRef.current = false;
          setIsComparing(false);
          setQariError('Could not load Qari recitation sample.');
        }}
      />
      <audio
        ref={userAudioRef}
        preload="none"
        onTimeUpdate={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setPlayheadRatio(Math.min(1, e.currentTarget.currentTime / d));
          }
        }}
        onEnded={() => {
          setIsPlayingMine(false);
          setPlayheadRatio(0);
          compareActiveRef.current = false;
          setIsComparing(false);
        }}
      />

      {/* Page Header + Studio Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Tajweed &amp; Voice Grading Studio
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Master classical Quranic phonetics, compare your live vocal pitch contour against {reciter.name}, and measure Makhraj &amp; Madd precision.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tajweed Studio modes"
          className="inline-grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'rules'}
            onClick={() => setStudioTab('rules')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              studioTab === 'rules'
                ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
            }`}
          >
            Tajweed &amp; Makharij
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'grader'}
            onClick={() => setStudioTab('grader')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              studioTab === 'grader'
                ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Tone Grading</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'qiraat'}
            onClick={() => setStudioTab('qiraat')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              studioTab === 'qiraat'
                ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>10 Qirā&apos;āt &amp; Riwāyah</span>
          </button>
        </div>
      </div>

      {studioTab === 'qiraat' ? (
        <QiraatExplorerView
          activeRiwayah={activeRiwayah}
          maghrebiOrthography={maghrebiOrthography}
          onSetGlobalRiwayah={onSetGlobalRiwayah ?? (() => {})}
          onToggleMaghrebiOrthography={onToggleMaghrebiOrthography ?? (() => {})}
          onPracticeInReader={onPracticeInReader}
          onPauseReaderAudio={onPauseReaderAudio}
        />
      ) : studioTab === 'rules' ? (
        <>
          {/* Rule Selector Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {TAJWEED_RULES.map((rule) => {
              const style = TAJWEED_STYLE_MAP[rule.type];
              const isSelected = rule.type === activeRule.type;
              return (
                <button
                  key={rule.type}
                  type="button"
                  onClick={() => setSelectedRuleType(rule.type)}
                  className={`min-h-[68px] p-3 rounded-2xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    isSelected
                      ? 'border-[#D97706] bg-white dark:bg-[#0A2921] ayah-card-active'
                      : 'border-[#064E3B]/10 dark:border-emerald-300/12 bg-white/80 dark:bg-[#0A2921]/60 hover:border-[#064E3B]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${style.dotColor}`}
                      aria-hidden="true"
                    />
                    <span
                      dir="rtl"
                      className="font-quran-amiri text-base text-[#0F766E] dark:text-amber-200"
                    >
                      {rule.arabicName}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] mt-1">
                    {rule.name}
                  </p>
                  <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                    {rule.harakatCount}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Interactive Tajweed Stage */}
          <section className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-6 sm:p-8 ayah-card-resting space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${activeStyle.badgeBg} ${activeStyle.badgeText}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${activeStyle.dotColor}`} />
                    {activeRule.name}
                  </span>
                  <span className="text-xs font-medium text-[#404944] dark:text-emerald-200/80">
                    {activeRule.tagline} · {activeRule.harakatCount}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#022C22] dark:text-white">
                  {activeRule.name} · {activeRule.makhraj}
                </h2>
                <p className="text-sm sm:text-base leading-relaxed text-[#022C22]/85 dark:text-[#D0FAEA]/90">
                  {activeRule.description}
                </p>
              </div>

              <div
                dir="rtl"
                className="font-quran-amiri text-4xl sm:text-5xl font-bold text-[#003527] dark:text-amber-200 shrink-0"
              >
                {activeRule.arabicName}
              </div>
            </div>

            <FiligreeDivider />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Governing Letters & Articulation Cue */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                  Governing Arabic Letters ({activeRule.letters.length})
                </p>
                <div dir="rtl" className="flex flex-wrap gap-2">
                  {activeRule.letters.map((letter) => (
                    <span
                      key={letter}
                      className="w-11 h-11 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-[#F5FFFA] dark:bg-[#041D17] font-quran-amiri text-2xl font-bold text-[#064E3B] dark:text-emerald-200 flex items-center justify-center"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/80 pt-1">
                  <strong>Articulation cue:</strong> {activeRule.exampleFocus}
                </p>

                {/* Pronunciation Self-Test Panel */}
                <div className="mt-4 rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        Pronunciation Self-Test
                      </p>
                      <p className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                        Record the phrase aloud, then compare with {reciter.name}
                      </p>
                    </div>
                    {isRecording && (
                      <span className="text-xs font-bold tabular-nums text-[#D97706] dark:text-amber-300">
                        {recordingElapsedSec.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  {isRecording && (
                    <div
                      className="h-9 flex items-center justify-center gap-1 px-2 rounded-xl bg-[#064E3B]/5 dark:bg-emerald-400/10"
                      aria-label="Live microphone input level"
                    >
                      {micLevels.map((lvl, i) => (
                        <span
                          key={i}
                          className="w-1.5 rounded-full bg-[#D97706] dark:bg-amber-400 transition-all duration-75"
                          style={{ height: `${Math.round(lvl * 28)}px` }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleRecording('rules')}
                      className={`flex-1 min-w-[160px] min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        isRecording
                          ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                          : 'border border-[#064E3B]/20 dark:border-emerald-300/25 bg-white dark:bg-[#0A2921] text-[#022C22] dark:text-[#E6FFF4] hover:border-[#D97706]'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Recording</span>
                        </>
                      ) : (
                        <>
                          {userAudioUrl ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Mic className="w-4 h-4 text-[#D97706] dark:text-amber-300" />
                          )}
                          <span>
                            {userAudioUrl ? 'Record Again' : 'Test Pronunciation'}
                          </span>
                        </>
                      )}
                    </button>

                    {userAudioUrl && !isRecording && (
                      <>
                        <button
                          type="button"
                          onClick={handleTogglePlayMine}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#064E3B]/20 dark:border-emerald-300/25 bg-white dark:bg-[#0A2921] text-[#022C22] dark:text-[#E6FFF4] text-xs font-semibold flex items-center gap-1.5 hover:border-[#064E3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                        >
                          {isPlayingMine && !isComparing ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Stop Mine</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play Mine</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleCompareWithQari}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0B5D56] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                        >
                          {isComparing ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop Compare</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Compare Qari → Mine</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {micError && (
                    <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                      {micError}
                    </p>
                  )}

                  {isEvaluating && !isRecording && (
                    <div className="rounded-xl border border-[#064E3B]/15 bg-[#064E3B]/[0.04] dark:bg-emerald-400/10 px-3.5 py-2.5 text-xs font-medium text-[#0F766E] dark:text-emerald-200 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Verifying Arabic pronunciation...</span>
                    </div>
                  )}

                  {analysis && !isRecording && !isEvaluating && (
                    <div
                      className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                        analysis.passed
                          ? 'border-emerald-600/25 bg-emerald-500/8 text-[#022C22] dark:text-emerald-100'
                          : 'border-[#D97706]/35 bg-[#D97706]/8 text-[#022C22] dark:text-amber-100'
                      }`}
                    >
                      {analysis.summary}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Example Verse Card */}
              <div className="rounded-2xl border border-[#D97706]/30 dark:border-amber-400/35 bg-gradient-to-b from-[#064E3B]/[0.02] to-[#D97706]/[0.05] dark:from-[#063529]/70 dark:to-amber-950/30 p-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-[#404944] dark:text-emerald-200/80">
                  <span>Quranic Example · Verse {activeRule.exampleVerseKey}</span>
                  <span className="font-semibold text-[#904D00] dark:text-amber-300">
                    {activeRule.harakatCount}
                  </span>
                </div>

                <p
                  dir="rtl"
                  className={`font-quran-amiri text-3xl sm:text-4xl leading-[1.9] text-center ${activeStyle.wordTint}`}
                >
                  {activeRule.exampleArabic}
                </p>

                <p className="text-sm italic font-medium text-center text-[#0F766E] dark:text-emerald-300">
                  {activeRule.exampleTransliteration}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlayQari}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                  >
                    {isPlayingQari ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Qari ({reciter.name.split(' ')[0]})</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Listen to Qari ({reciter.name.split(' ')[0]})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlowStudyMode((s) => !s)}
                    aria-pressed={slowStudyMode}
                    title="Toggle 0.75x slow articulation speed"
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                      slowStudyMode
                        ? 'border-[#D97706] bg-[#D97706]/12 text-[#904D00] dark:text-amber-300'
                        : 'border-[#064E3B]/15 dark:border-emerald-300/20 text-[#404944] dark:text-emerald-200 hover:border-[#D97706]'
                    }`}
                  >
                    {slowStudyMode ? '0.75x Slow' : '1.0x'}
                  </button>
                </div>

                {qariError && (
                  <p className="text-xs text-rose-700 dark:text-rose-300 text-center">
                    {qariError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onPracticeInReader(
                      activeRule.exampleSurahId,
                      activeRule.exampleAyahNumber
                    )
                  }
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#064E3B]/20 dark:border-emerald-300/25 bg-white/80 dark:bg-[#041D17]/80 hover:border-[#D97706] text-[#022C22] dark:text-[#E6FFF4] text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-[#064E3B] dark:text-emerald-300" />
                  <span>Open &amp; Recite Verse {activeRule.exampleVerseKey} in Reader</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Qārī Tartil Voice Tone Grading View (Screen 6 Prototype) */
        graderSurah &&
        graderAyah && (
          <div className="space-y-5">
            {/* Target Verse Context & Selector Bar */}
            <section className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-4 sm:p-5 ayah-card-resting flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                      Surah {graderSurah.nameSimple} · Ayah {graderAyah.verseKey}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300">
                      Qārī Tartil Grader
                    </span>
                  </div>
                  <p className="text-xs italic text-[#0F766E] dark:text-emerald-300 truncate">
                    {graderAyah.transliteration} · vs. {reciter.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  aria-label="Select Surah for Tartil grading"
                  value={graderSurah.id}
                  onChange={(e) => {
                    const nextId = Number(e.target.value);
                    const nextS = surahs.find((s) => s.id === nextId);
                    setGraderSurahId(nextId);
                    setGraderAyahNum(nextS?.ayahs[0]?.number ?? 1);
                  }}
                  className="min-h-[40px] rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#F5FFFA] dark:bg-[#041D17] px-3 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4]"
                >
                  {surahs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id}. {s.nameSimple}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Select Ayah for Tartil grading"
                  value={graderAyah.number}
                  onChange={(e) => setGraderAyahNum(Number(e.target.value))}
                  className="min-h-[40px] rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#F5FFFA] dark:bg-[#041D17] px-3 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4]"
                >
                  {graderSurah.ayahs.map((a) => (
                    <option key={a.verseKey} value={a.number}>
                      Ayah {a.number}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Target Arabic Phrase + Record Action Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 5 cols: Grade Dial Card + Recording Deck */}
              <div className="lg:col-span-5 space-y-5">
                <section className="rounded-3xl border border-[#D97706]/30 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-6 ayah-card-resting space-y-5">
                  <div
                    dir="rtl"
                    className="font-quran-amiri text-3xl sm:text-4xl leading-[2.0] text-center text-[#022C22] dark:text-[#E6FFF4]"
                  >
                    {graderAyah.arabic}
                  </div>

                  {/* Overall Grade Dial or Prompt */}
                  {isEvaluating ? (
                    <div className="rounded-2xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/12 dark:border-emerald-300/20 p-6 text-center space-y-2.5">
                      <Loader2 className="w-7 h-7 text-[#D97706] dark:text-amber-300 mx-auto animate-spin" />
                      <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        Evaluating Recitation &amp; Makhraj...
                      </p>
                      <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                        Checking spoken Arabic words, phonetic clarity, and Tartil contour against Ayah {graderAyah.verseKey}.
                      </p>
                    </div>
                  ) : gradeReport ? (
                    <>
                      <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 pt-2">
                        <div className="relative flex items-center justify-center shrink-0">
                          <svg
                            className="w-36 h-36 -rotate-90"
                            viewBox="0 0 120 120"
                            aria-hidden="true"
                          >
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              strokeWidth="9"
                              className="stroke-[#064E3B]/10 dark:stroke-emerald-300/15"
                            />
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              strokeWidth="9"
                              strokeLinecap="round"
                              strokeDasharray={314.16}
                              strokeDashoffset={
                                314.16 * (1 - gradeReport.overallScore / 100)
                              }
                              className="stroke-[#D97706] dark:stroke-amber-400 transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center text-center">
                            <span className="text-3xl font-extrabold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                              {gradeReport.overallScore}%
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#404944] dark:text-emerald-200/75">
                              Tartil Grade
                            </span>
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D97706] dark:text-amber-300">
                            <Award className="w-4 h-4" />
                            <span>Acoustic Match Report</span>
                          </div>
                          <h3 className="text-lg font-bold text-[#022C22] dark:text-white flex items-center justify-center gap-2 flex-wrap">
                            <span>{gradeReport.ratingLabel}</span>
                            <span dir="rtl" className="font-quran-amiri text-xl text-[#D97706] dark:text-amber-300">
                              {gradeReport.ratingArabic}
                            </span>
                          </h3>
                          <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                            {gradeReport.summary}
                          </p>
                        </div>
                      </div>

                      {/* 4 Sub-metrics Grid */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        {[
                          {
                            label: 'Pitch & Cadence',
                            score: gradeReport.pitchScore,
                          },
                          {
                            label: 'Makhraj Clarity',
                            score: gradeReport.makhrajScore,
                          },
                          {
                            label: 'Madd & Ghunnah',
                            score: gradeReport.maddScore,
                          },
                          {
                            label: 'Breath & Waqf',
                            score: gradeReport.breathScore,
                          },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#404944] dark:text-emerald-200/80 truncate">
                                {m.label}
                              </span>
                              <span className="font-bold text-[#022C22] dark:text-amber-300 tabular-nums">
                                {m.score}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#064E3B]/10 dark:bg-emerald-300/15 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#064E3B] dark:bg-emerald-400 transition-all duration-300"
                                style={{ width: `${m.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-5 text-center space-y-2">
                      <Sparkles className="w-6 h-6 text-[#D97706] dark:text-amber-300 mx-auto" />
                      <p className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        Ready to Grade Ayah {graderAyah.verseKey}
                      </p>
                      <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                        Listen to {reciter.name} once if needed, then tap Recite &amp; Grade below. Real pitch (Hz), sustain, and articulation cadence are measured live from your microphone.
                      </p>
                    </div>
                  )}

                  {isRecording && (
                    <div className="rounded-xl bg-[#064E3B]/5 dark:bg-emerald-400/10 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 flex-1 h-8">
                        {micLevels.map((lvl, i) => (
                          <span
                            key={i}
                            className="flex-1 rounded-full bg-[#D97706] dark:bg-amber-400 transition-all duration-75"
                            style={{ height: `${Math.round(lvl * 28)}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-mono font-bold text-[#D97706] dark:text-amber-300 tabular-nums">
                        {recordingElapsedSec.toFixed(1)}s
                      </span>
                    </div>
                  )}

                  {/* Primary Record + Save / Next Controls */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={isEvaluating}
                      onClick={() => void handleToggleRecording('grader')}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 ${
                        isRecording
                          ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                          : 'bg-[#064E3B] hover:bg-[#003527] text-[#FEF3C7] dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-[#022C22]'
                      }`}
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing Recording...</span>
                        </>
                      ) : isRecording ? (
                        <>
                          <Square className="w-4 h-4 fill-current" />
                          <span>Finish &amp; Compute Tartil Grade</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>
                            {gradeReport
                              ? 'Re-record Ayah (Aim Higher)'
                              : 'Recite Ayah & Grade Tartil'}
                          </span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {onBookmarkAyah && (
                        <button
                          type="button"
                          onClick={() => onBookmarkAyah(graderSurah, graderAyah)}
                          className={`flex-1 min-h-[42px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                            bookmarkedKeys?.has(graderAyah.verseKey)
                              ? 'border-[#D97706] bg-[#D97706]/10 text-[#904D00] dark:text-amber-300'
                              : 'border-[#064E3B]/15 dark:border-emerald-300/20 text-[#022C22] dark:text-[#E6FFF4]'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>
                            {bookmarkedKeys?.has(graderAyah.verseKey)
                              ? 'Saved'
                              : 'Save Ayah'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const idx = graderSurah.ayahs.findIndex(
                            (a) => a.number === graderAyah.number
                          );
                          const nextAyah =
                            graderSurah.ayahs[
                              (idx + 1) % graderSurah.ayahs.length
                            ];
                          if (nextAyah) setGraderAyahNum(nextAyah.number);
                        }}
                        className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-200 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <span>Next Ayah</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {micError && (
                    <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                      {micError}
                    </p>
                  )}
                </section>
              </div>

              {/* Right 7 cols: Acoustic Pitch Contour Graph + Word-by-Word Scorecards */}
              <div className="lg:col-span-7 space-y-5">
                {/* Acoustic & Pitch Contour SVG Graph */}
                <section className="rounded-3xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 sm:p-6 ayah-card-resting space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        Acoustic &amp; Pitch Contour
                      </h3>
                      <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                        Tartil vocal inflection curve ({reciter.name} reference vs. your mic track)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#404944] dark:text-emerald-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] dark:bg-amber-400" />
                        Reference Qari
                      </span>
                      {gradeReport && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#064E3B] dark:text-emerald-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#064E3B] dark:bg-emerald-400" />
                          Your Voice
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SVG Graph Box */}
                  <div className="relative rounded-2xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-4 overflow-hidden">
                    <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col justify-between pointer-events-none opacity-40 text-[10px] font-medium text-[#404944] dark:text-emerald-200/70">
                      <div className="flex items-center gap-2">
                        <span>High Pitch (C4 · 261Hz)</span>
                        <div className="flex-1 border-t border-dashed border-[#064E3B]/25 dark:border-emerald-300/25" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Tone Baseline (A3 · 220Hz)</span>
                        <div className="flex-1 border-t border-dashed border-[#064E3B]/25 dark:border-emerald-300/25" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Low Resonance (F3 · 174Hz)</span>
                        <div className="flex-1 border-t border-dashed border-[#064E3B]/25 dark:border-emerald-300/25" />
                      </div>
                    </div>

                    <svg
                      className="relative w-full h-36 overflow-visible"
                      viewBox="0 0 500 120"
                      preserveAspectRatio="none"
                      aria-label="Acoustic pitch comparison contour"
                    >
                      <defs>
                        <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D97706" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="usrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#064E3B" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {refPath && (
                        <>
                          <path
                            d={`${refPath} L 488,118 L 12,118 Z`}
                            fill="url(#refGrad)"
                          />
                          <path
                            d={refPath}
                            fill="none"
                            stroke="#D97706"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </>
                      )}

                      {userPath && (
                        <>
                          <path
                            d={`${userPath} L 488,118 L 12,118 Z`}
                            fill="url(#usrGrad)"
                          />
                          <path
                            d={userPath}
                            fill="none"
                            stroke="#064E3B"
                            className="dark:stroke-emerald-400"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                        </>
                      )}

                      {(isPlayingQari || isPlayingMine) && (
                        <line
                          x1={playheadX}
                          x2={playheadX}
                          y1="8"
                          y2="116"
                          stroke="#904D00"
                          strokeDasharray="3 3"
                          strokeWidth="2"
                        />
                      )}
                    </svg>
                  </div>

                  {/* Comparative Playback Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleTogglePlayQari}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-colors ${
                        isPlayingQari
                          ? 'border-[#D97706] bg-[#D97706]/12'
                          : 'border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#F5FFFA] dark:bg-[#041D17] hover:border-[#D97706]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center shrink-0">
                          {isPlayingQari ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                            {reciter.name}
                          </p>
                          <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                            Reference Tartil (~{graderAyah.durationSec.toFixed(1)}s)
                          </p>
                        </div>
                      </div>
                      <Volume2 className="w-4 h-4 text-[#D97706] shrink-0" />
                    </button>

                    <button
                      type="button"
                      disabled={!userAudioUrl}
                      onClick={handleTogglePlayMine}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-colors disabled:opacity-50 ${
                        isPlayingMine
                          ? 'border-[#064E3B] bg-[#064E3B]/10 dark:border-emerald-400'
                          : 'border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#F5FFFA] dark:bg-[#041D17]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] flex items-center justify-center shrink-0">
                          {isPlayingMine ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                            My Voice Track
                          </p>
                          <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                            {gradeReport
                              ? `Recorded ${gradeReport.totalSec.toFixed(1)}s (${gradeReport.voicedSec.toFixed(1)}s voiced)`
                              : 'Record above to inspect playback'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {qariError && (
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {qariError}
                    </p>
                  )}
                </section>

                {/* Word-by-Word Scorecards + Qārī Acoustic Guidance */}
                {gradeReport && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        Word-by-Word Makhraj &amp; Pitch Breakdown
                      </h3>
                      <span className="text-xs text-[#404944] dark:text-emerald-200/75">
                        {gradeReport.wordEvaluations.length} Words
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {gradeReport.wordEvaluations.map((ev) => {
                        const isFocused = focusedWordIdx === ev.index;
                        return (
                          <div
                            key={ev.word.id}
                            onClick={() =>
                              setFocusedWordIdx(isFocused ? null : ev.index)
                            }
                            className={`rounded-2xl border p-4 transition-all cursor-pointer bg-white dark:bg-[#0A2921] ${
                              ev.needsAttention
                                ? 'border-[#D97706]/50 dark:border-amber-400/50'
                                : 'border-[#064E3B]/10 dark:border-emerald-300/15'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                    ev.needsAttention
                                      ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300'
                                      : 'bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200'
                                  }`}
                                >
                                  {ev.index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      dir="rtl"
                                      className="font-quran-amiri text-2xl font-bold text-[#003527] dark:text-amber-200"
                                    >
                                      {ev.word.arabic}
                                    </span>
                                    <span className="text-xs text-[#0F766E] dark:text-emerald-300 font-medium">
                                      /{ev.word.transliteration}/
                                    </span>
                                    <span className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                                      ({ev.startSec}s – {ev.endSec}s)
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-medium text-[#404944] dark:text-emerald-200/80">
                                    {ev.ruleLabel}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                                    ev.needsAttention
                                      ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300'
                                      : 'bg-emerald-500/15 text-[#064E3B] dark:text-emerald-300'
                                  }`}
                                >
                                  {ev.needsAttention ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  {ev.score}%
                                </span>
                                <p className="text-[10px] font-semibold text-[#404944] dark:text-emerald-200/70 mt-0.5">
                                  {ev.statusLabel}
                                </p>
                              </div>
                            </div>

                            <p className="mt-2.5 pt-2.5 border-t border-[#064E3B]/8 dark:border-emerald-300/12 text-xs text-[#404944] dark:text-emerald-100/85 leading-relaxed">
                              {ev.feedback}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Qārī Stylistic Nuance Guidance Card (Zero "AI") */}
                    <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#F5FFFA] dark:bg-[#041D17] p-5 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22] flex items-center justify-center shrink-0">
                          <Wind className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                            {reciter.name} · Qārī Stylistic Guidance
                          </h4>
                          <p className="text-[11px] text-[#0F766E] dark:text-emerald-300">
                            Master reciter Tartil acoustic note
                          </p>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-100/85">
                        {gradeReport.stylisticTip}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
