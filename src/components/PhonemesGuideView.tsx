import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Check,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Search,
  Square,
  Volume2,
  Wind,
} from 'lucide-react';
import {
  ARABIC_PHONEMES,
  ArabicPhonemeSpec,
  IPA_MANNERS,
  IPA_PLACES,
  MAKHRAJ_GROUPS,
  MakhrajGroup,
  PHONEME_BY_ID,
  TonguePoseId,
} from '../data/arabicPhonemes';
import { Reciter } from '../types/quran';
import { getEveryAyahUrl } from '../data/quranData';
import { detectPitchHz, type SpokenVerificationResult } from '../utils/pitchAnalysis';
import {
  buildPhonemePracticePrompt,
  computeSpectralFullness,
  evaluatePhonemeTone,
  getPhonemeAudioUrl,
  type PhonemeMicSample,
  type PhonemePracticeTarget,
  type PhonemeToneReport,
} from '../utils/phonemeGrading';

interface PhonemesGuideViewProps {
  reciter: Reciter;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onOpenVerseToneGrader?: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

function buildCompactContourPath(values: number[], width = 360, height = 84): string {
  if (!values.length) return '';
  const padX = 8;
  const usableW = width - padX * 2;
  const pts = values.map((v, idx) => {
    const x = padX + (idx / Math.max(1, values.length - 1)) * usableW;
    const y = Math.round(74 - v * 60);
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

function pickPhonemeRecorderMime(): string | undefined {
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

async function blobToBase64String(blob: Blob): Promise<string> {
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

async function verifyPhonemeSpokenAudio(
  blob: Blob,
  expectedArabic: string,
  words: string[]
): Promise<SpokenVerificationResult | null> {
  try {
    if (blob.size < 300) return null;
    const audioBase64 = await blobToBase64String(blob);
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

const TONGUE_SVG_PATHS: Record<TonguePoseId, string> = {
  // Tip pokes forward between upper (y~136) and lower (y~158) teeth AND back arches high (Tafkhim)
  'interdental-heavy':
    'M 78,148 C 90,141 114,145 144,132 C 174,119 200,115 218,136 C 232,152 232,190 220,224 L 146,224 C 134,196 112,175 82,158 C 75,154 74,150 78,148 Z',
  // Tip pokes forward between teeth; back stays flat/low (Tarqiq)
  'interdental-light':
    'M 78,148 C 92,143 118,150 148,150 C 178,150 202,156 218,172 C 230,185 232,202 220,224 L 146,224 C 134,196 112,175 82,158 C 75,154 74,150 78,148 Z',
  // Tip touches upper alveolar gum ridge; back relaxed
  'alveolar-tip':
    'M 98,125 C 106,122 126,144 156,148 C 184,152 206,158 219,174 C 230,188 232,204 220,224 L 146,224 C 132,194 114,172 98,144 C 93,134 94,127 98,125 Z',
  // Tip touches teeth/alveolar ridge AND posterior tongue rises strongly
  'alveolar-heavy':
    'M 96,130 C 108,128 128,144 152,130 C 178,116 202,115 218,136 C 232,152 232,190 220,224 L 146,224 C 132,194 112,172 95,146 C 91,139 92,132 96,130 Z',
  // Light curved tap at upper gum ridge
  'alveolar-trill':
    'M 102,123 C 110,121 124,142 152,147 C 180,152 204,158 218,174 C 230,188 232,204 220,224 L 146,224 C 132,194 115,172 102,142 C 97,132 98,125 102,123 Z',
  // Middle tongue blade presses up against hard palate
  'palatal-mid':
    'M 104,156 C 116,136 134,110 156,110 C 180,110 202,132 218,158 C 230,178 232,202 220,224 L 146,224 C 132,196 116,178 104,164 C 100,160 101,158 104,156 Z',
  // Wide lateral tongue hugs upper molars + back raised (Dad)
  'tongue-side-heavy':
    'M 100,144 C 112,132 134,122 158,120 C 184,118 206,120 220,138 C 232,154 232,190 220,224 L 146,224 C 132,194 114,174 99,154 C 96,149 97,146 100,144 Z',
  // Back tongue meets hard-soft palate junction (Kaf)
  velar:
    'M 106,162 C 122,154 148,136 176,115 C 194,108 210,124 222,152 C 232,174 232,200 220,224 L 146,224 C 132,196 118,180 105,170 C 102,167 102,164 106,162 Z',
  // Extreme back tongue seals/narrows against uvula & soft palate (Qaf/Ghayn/Kha)
  uvular:
    'M 108,165 C 126,158 158,144 192,126 C 210,118 224,132 232,158 C 238,180 232,204 220,224 L 146,224 C 132,196 118,182 106,172 C 103,169 104,167 108,165 Z',
  // Tongue root shifts back toward middle pharynx wall (Ayn/Ha)
  'throat-pharynx':
    'M 106,164 C 128,158 162,156 196,160 C 222,164 242,174 242,192 C 242,208 232,216 222,224 L 146,224 C 134,198 118,182 105,172 C 102,169 103,166 106,164 Z',
  // Neutral relaxed tongue, open airway down to glottis
  'throat-glottal':
    'M 106,166 C 130,158 166,156 198,164 C 216,169 226,184 226,204 C 226,214 224,220 220,224 L 146,224 C 134,198 118,182 105,173 C 102,170 103,167 106,166 Z',
  // Neutral low tongue inside mouth while lips close (Ba/Mim)
  'lips-closed':
    'M 106,164 C 130,156 166,154 198,162 C 216,167 226,182 226,204 L 220,224 L 146,224 C 134,198 118,182 105,172 C 102,169 103,166 106,164 Z',
  'lips-dental':
    'M 106,164 C 130,156 166,154 198,162 C 216,167 226,182 226,204 L 220,224 L 146,224 C 134,198 118,182 105,172 C 102,169 103,166 106,164 Z',
  // Slight back-tongue lift for rounded Waw
  'lips-round':
    'M 108,166 C 128,160 162,146 192,138 C 212,134 224,152 228,178 L 220,224 L 146,224 C 134,198 118,182 105,173 C 103,170 104,168 108,166 Z',
  // Wide open jaw with completely flat floor-resting tongue (Alif Madd)
  'open-jaw':
    'M 106,174 C 132,170 168,170 198,174 C 216,177 224,190 224,208 L 220,224 L 146,224 C 134,202 118,190 105,182 C 102,179 103,175 106,174 Z',
};

type FilterChip = 'all' | MakhrajGroup | 'heavy' | 'interdental';

export const PhonemesGuideView: React.FC<PhonemesGuideViewProps> = ({
  reciter,
  onPracticeInReader,
  onOpenVerseToneGrader,
  onPauseReaderAudio,
}) => {
  const [selectedId, setSelectedId] = useState<string>('zaa-heavy');
  const [filterMode, setFilterMode] = useState<FilterChip>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const [isSpeakingLetter, setIsSpeakingLetter] = useState(false);
  const [audioStatusMsg, setAudioStatusMsg] = useState<string | null>(null);
  const exampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const letterAudioRef = useRef<HTMLAudioElement | null>(null);

  // Phoneme Tone & Pronunciation Grader State
  const [practiceTarget, setPracticeTarget] = useState<PhonemePracticeTarget>('letter');
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [micLevels, setMicLevels] = useState<number[]>(() => Array(12).fill(0.14));
  const [micError, setMicError] = useState<string | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingMine, setIsPlayingMine] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [toneReport, setToneReport] = useState<PhonemeToneReport | null>(null);

  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioUrlRef = useRef<string | null>(null);
  const compareActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const maxRecordTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const samplesRef = useRef<PhonemeMicSample[]>([]);
  const recordStartMsRef = useRef(0);
  const lastSampleMsRef = useRef(0);
  const voicedMsRef = useRef(0);
  const peakRmsRef = useRef(0);
  const evalSeqRef = useRef(0);
  const practiceTargetRef = useRef<PhonemePracticeTarget>('letter');

  useEffect(() => {
    practiceTargetRef.current = practiceTarget;
  }, [practiceTarget]);

  useEffect(() => {
    userAudioUrlRef.current = userAudioUrl;
  }, [userAudioUrl]);

  const selectedPhoneme: ArabicPhonemeSpec = useMemo(
    () => PHONEME_BY_ID.get(selectedId) ?? ARABIC_PHONEMES[0],
    [selectedId]
  );

  const filteredPhonemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ARABIC_PHONEMES.filter((item) => {
      if (filterMode === 'heavy' && !item.emphatic) return false;
      if (filterMode === 'interdental' && item.placeOfArticulation !== 'interdental') {
        return false;
      }
      if (
        (filterMode === 'tongue' ||
          filterMode === 'throat' ||
          filterMode === 'lips' ||
          filterMode === 'cavity') &&
        item.makhrajGroup !== filterMode
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.letter.includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.transliteration.toLowerCase().includes(q) ||
        item.ipa.toLowerCase().includes(q) ||
        item.howToPronounce.toLowerCase().includes(q) ||
        item.englishAnchor.toLowerCase().includes(q)
      );
    });
  }, [filterMode, searchQuery]);

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
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setMicLevels(Array(12).fill(0.14));
  }, []);

  const stopPhonemeAudio = useCallback(() => {
    compareActiveRef.current = false;
    setIsComparing(false);
    if (exampleAudioRef.current) {
      exampleAudioRef.current.pause();
      exampleAudioRef.current.currentTime = 0;
    }
    setIsPlayingExample(false);
    if (letterAudioRef.current) {
      letterAudioRef.current.pause();
      letterAudioRef.current.currentTime = 0;
    }
    setIsSpeakingLetter(false);
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
    }
    setIsPlayingMine(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

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

  useEffect(() => {
    return () => {
      stopPhonemeAudio();
      cleanupRecordingHardware();
      if (userAudioUrlRef.current) {
        URL.revokeObjectURL(userAudioUrlRef.current);
      }
    };
  }, [stopPhonemeAudio, cleanupRecordingHardware]);

  const handleSelectPhoneme = (id: string) => {
    setSelectedId(id);
    setAudioStatusMsg(null);
    setMicError(null);
    setToneReport(null);
    evalSeqRef.current += 1;
    setIsEvaluating(false);
    if (isRecording) stopRecording();
    stopPhonemeAudio();
    setUserAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const speakLetterWithBrowserFallback = (phoneme: ArabicPhonemeSpec) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioStatusMsg('Use "Hear in Verse" to listen with your selected Qari.');
      return;
    }
    try {
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      const arabicVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
      if (!arabicVoice) {
        setAudioStatusMsg('Letter audio file unavailable — use "Hear in Verse" for Qari audio.');
        return;
      }
      const utter = new SpeechSynthesisUtterance(`${phoneme.letter}َ`);
      utter.lang = arabicVoice.lang;
      utter.voice = arabicVoice;
      utter.rate = 0.72;
      utter.onstart = () => setIsSpeakingLetter(true);
      utter.onend = () => setIsSpeakingLetter(false);
      utter.onerror = () => {
        setIsSpeakingLetter(false);
        setAudioStatusMsg('Use "Hear in Verse" for authentic Qari recitation.');
      };
      synth.speak(utter);
    } catch {
      setIsSpeakingLetter(false);
    }
  };

  const playIsolatedLetterAudio = (chainMineAfter = false) => {
    onPauseReaderAudio?.();
    stopPhonemeAudio();
    setAudioStatusMsg(null);

    if (chainMineAfter) {
      compareActiveRef.current = true;
      setIsComparing(true);
    }

    if (!letterAudioRef.current) {
      letterAudioRef.current = new Audio();
      letterAudioRef.current.onended = () => {
        setIsSpeakingLetter(false);
        if (compareActiveRef.current && userAudioUrlRef.current) {
          if (!userAudioRef.current) userAudioRef.current = new Audio();
          const mine = userAudioRef.current;
          mine.onended = () => {
            setIsPlayingMine(false);
            compareActiveRef.current = false;
            setIsComparing(false);
          };
          if (mine.src !== userAudioUrlRef.current) {
            mine.src = userAudioUrlRef.current;
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
      };
      letterAudioRef.current.onerror = () => {
        setIsSpeakingLetter(false);
        compareActiveRef.current = false;
        setIsComparing(false);
        speakLetterWithBrowserFallback(selectedPhoneme);
      };
    }

    const audio = letterAudioRef.current;
    const url = getPhonemeAudioUrl(selectedPhoneme.id);
    if (!audio.src.endsWith(url)) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    audio.playbackRate = 0.95;
    audio
      .play()
      .then(() => setIsSpeakingLetter(true))
      .catch(() => {
        setIsSpeakingLetter(false);
        compareActiveRef.current = false;
        setIsComparing(false);
        speakLetterWithBrowserFallback(selectedPhoneme);
      });
  };

  const handleHearIsolatedLetter = () => {
    if (isSpeakingLetter) {
      stopPhonemeAudio();
      return;
    }
    if (isRecording) stopRecording();
    playIsolatedLetterAudio(false);
  };

  const handleTogglePlayExample = (chainMineAfter = false) => {
    if (isPlayingExample && !chainMineAfter) {
      stopPhonemeAudio();
      return;
    }
    if (isRecording) stopRecording();
    onPauseReaderAudio?.();
    stopPhonemeAudio();
    setAudioStatusMsg(null);

    if (chainMineAfter) {
      compareActiveRef.current = true;
      setIsComparing(true);
    }

    if (!exampleAudioRef.current) {
      exampleAudioRef.current = new Audio();
      exampleAudioRef.current.onended = () => {
        setIsPlayingExample(false);
        if (compareActiveRef.current && userAudioUrlRef.current) {
          if (!userAudioRef.current) userAudioRef.current = new Audio();
          const mine = userAudioRef.current;
          mine.onended = () => {
            setIsPlayingMine(false);
            compareActiveRef.current = false;
            setIsComparing(false);
          };
          if (mine.src !== userAudioUrlRef.current) {
            mine.src = userAudioUrlRef.current;
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
      };
      exampleAudioRef.current.onerror = () => {
        setIsPlayingExample(false);
        compareActiveRef.current = false;
        setIsComparing(false);
        setAudioStatusMsg('Audio file unavailable offline — try opening this verse in the reader.');
      };
    }

    const audio = exampleAudioRef.current;
    const url = getEveryAyahUrl(
      reciter.everyAyahFolder,
      selectedPhoneme.quranExample.surahId,
      selectedPhoneme.quranExample.ayahNumber
    );
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    audio.playbackRate = 0.9;
    audio
      .play()
      .then(() => setIsPlayingExample(true))
      .catch(() => {
        setIsPlayingExample(false);
        compareActiveRef.current = false;
        setIsComparing(false);
        setAudioStatusMsg('Tap again or open the verse in the Reader to hear recitation.');
      });
  };

  const handleToggleRecording = async () => {
    setMicError(null);
    if (isRecording) {
      stopRecording();
      return;
    }

    onPauseReaderAudio?.();
    stopPhonemeAudio();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicError(
        'Microphone recording is not supported in this browser. Listen to "Hear Letter" or "Hear in Verse" above.'
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

      const mimeType = pickPhonemeRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      samplesRef.current = [];
      recordStartMsRef.current = performance.now();
      lastSampleMsRef.current = performance.now();
      voicedMsRef.current = 0;
      peakRmsRef.current = 0;
      setRecordingSec(0);
      setToneReport(null);

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
        const freqBuf = new Float32Array(analyser.frequencyBinCount);

        meterTimerRef.current = window.setInterval(() => {
          const now = performance.now();
          const dt = now - lastSampleMsRef.current;
          lastSampleMsRef.current = now;

          analyser.getFloatTimeDomainData(floatBuf);
          analyser.getFloatFrequencyData(freqBuf);
          let sumSq = 0;
          for (let i = 0; i < floatBuf.length; i++) {
            sumSq += floatBuf[i] * floatBuf[i];
          }
          const rms = Math.sqrt(sumSq / floatBuf.length);
          if (rms > peakRmsRef.current) peakRmsRef.current = rms;
          if (rms > 0.018) voicedMsRef.current += dt;

          const pitchHz =
            rms > 0.016 ? detectPitchHz(floatBuf, ctx.sampleRate) : null;
          const fullness =
            rms > 0.016 ? computeSpectralFullness(freqBuf, ctx.sampleRate) : null;

          samplesRef.current.push({
            tMs: now - recordStartMsRef.current,
            rms,
            pitchHz,
            fullness,
          });

          setRecordingSec((now - recordStartMsRef.current) / 1000);
          const normLevel = Math.min(1, Math.max(0.14, rms * 5.8));
          setMicLevels((prev) => [...prev.slice(1), normLevel]);
        }, 65);
      } else {
        meterTimerRef.current = window.setInterval(() => {
          setRecordingSec((performance.now() - recordStartMsRef.current) / 1000);
        }, 100);
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      const targetPhonemeAtStart = selectedPhoneme;
      const targetModeAtStart = practiceTargetRef.current;

      recorder.onstop = () => {
        const totalSec = Math.max(
          0.2,
          (performance.now() - recordStartMsRef.current) / 1000
        );
        const voicedSec = voicedMsRef.current / 1000;
        const capturedPeakRms = peakRmsRef.current;
        const capturedSamples = [...samplesRef.current];

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const nextUrl = URL.createObjectURL(blob);
        setUserAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        cleanupRecordingHardware();

        const seq = ++evalSeqRef.current;
        setIsEvaluating(true);

        void (async () => {
          try {
            const expectedText = buildPhonemePracticePrompt(
              targetPhonemeAtStart,
              targetModeAtStart
            );
            const expectedWords = expectedText.split(/\s+/).filter(Boolean);
            const verification =
              voicedSec >= 0.25 && capturedPeakRms >= 0.015
                ? await verifyPhonemeSpokenAudio(blob, expectedText, expectedWords)
                : null;
            if (evalSeqRef.current !== seq) return;
            setToneReport(
              evaluatePhonemeTone(
                targetPhonemeAtStart,
                targetModeAtStart,
                capturedSamples,
                totalSec,
                voicedSec,
                capturedPeakRms,
                verification
              )
            );
          } finally {
            if (evalSeqRef.current === seq) {
              setIsEvaluating(false);
            }
          }
        })();
      };

      recorder.start(100);
      setIsRecording(true);
      maxRecordTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 8000);
    } catch (err) {
      cleanupRecordingHardware();
      setIsRecording(false);
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicError(
          'Microphone permission was denied. Enable microphone access in browser settings to grade your pronunciation.'
        );
      } else if (name === 'NotFoundError') {
        setMicError('No microphone device was found on this system.');
      } else {
        setMicError('Could not start microphone recording.');
      }
    }
  };

  const handleTogglePlayMine = () => {
    if (!userAudioUrl) return;
    if (isPlayingMine) {
      stopPhonemeAudio();
      return;
    }
    stopPhonemeAudio();
    if (!userAudioRef.current) userAudioRef.current = new Audio();
    const audio = userAudioRef.current;
    audio.onended = () => setIsPlayingMine(false);
    audio.onerror = () => setIsPlayingMine(false);
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

  const handleCompareTone = () => {
    if (!userAudioUrl) return;
    if (isComparing) {
      stopPhonemeAudio();
      return;
    }
    if (practiceTarget === 'word') {
      handleTogglePlayExample(true);
    } else {
      playIsolatedLetterAudio(true);
    }
  };

  const refTonePath = useMemo(
    () =>
      toneReport
        ? buildCompactContourPath(toneReport.referenceContour)
        : '',
    [toneReport]
  );

  const userTonePath = useMemo(
    () =>
      toneReport
        ? buildCompactContourPath(toneReport.userContour)
        : '',
    [toneReport]
  );

  const isLipsActive = selectedPhoneme.makhrajGroup === 'lips';
  const isInterdental = selectedPhoneme.placeOfArticulation === 'interdental';
  const isNasal = Boolean(selectedPhoneme.nasal);
  const tonguePath = TONGUE_SVG_PATHS[selectedPhoneme.tonguePose];

  const jumpToPlace = (placeId: string) => {
    const firstMatch = ARABIC_PHONEMES.find((p) => p.placeOfArticulation === placeId);
    if (firstMatch) handleSelectPhoneme(firstMatch.id);
  };

  return (
    <div className="space-y-6">
      {/* Intro + Search & Filter Bar */}
      <div className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-5 sm:p-6 space-y-4 ayah-card-resting">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-[#022C22] dark:text-[#E6FFF4]">
              Arabic Letter Phonemes &amp; IPA Tongue Chart (Makhārij al-Ḥurūf)
            </h2>
            <p className="text-xs sm:text-sm text-[#404944] dark:text-emerald-200/80 max-w-3xl">
              Tap any Arabic letter or IPA symbol to see exact tongue, teeth, lip, and throat placement on the vocal tract diagram, compare light vs. heavy letters, and hear real Qur&apos;anic examples.
            </p>
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-[#707974] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search letter, IPA, or "th"...'
              aria-label="Search Arabic phonemes"
              className="w-full min-h-[42px] pl-10 pr-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] text-xs sm:text-sm text-[#022C22] dark:text-[#E6FFF4] placeholder:text-[#707974] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All Letters (${ARABIC_PHONEMES.length})` },
              { id: 'interdental', label: 'Between Teeth (ظ ذ ث)' },
              { id: 'heavy', label: 'Heavy / Tafkhīm (7)' },
              ...MAKHRAJ_GROUPS.map((g) => ({ id: g.id as FilterChip, label: g.title })),
            ] as { id: FilterChip; label: string }[]
          ).map((chip) => {
            const active = filterMode === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterMode(chip.id)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                  active
                    ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'bg-[#064E3B]/[0.06] text-[#404944] hover:text-[#022C22] dark:bg-[#041D17] dark:text-emerald-200/80 dark:hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Letter Strip */}
        <div className="flex flex-wrap gap-2 pt-1">
          {filteredPhonemes.length === 0 ? (
            <p className="text-xs text-[#404944] dark:text-emerald-200/75 py-2">
              No Arabic letters match &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            filteredPhonemes.map((item) => {
              const isSelected = item.id === selectedPhoneme.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPhoneme(item.id)}
                  className={`min-w-[56px] min-h-[58px] px-2.5 py-1.5 rounded-xl border flex flex-col items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    isSelected
                      ? 'border-[#D97706] bg-[#D97706]/10 dark:border-amber-400 dark:bg-amber-400/15 shadow-xs'
                      : 'border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFB] dark:bg-[#041D17] hover:border-[#064E3B]/35'
                  }`}
                >
                  <span
                    dir="rtl"
                    className={`font-quran-amiri text-2xl leading-none ${
                      isSelected
                        ? 'text-[#003527] dark:text-amber-200 font-bold'
                        : 'text-[#022C22] dark:text-[#E6FFF4]'
                    }`}
                  >
                    {item.letter}
                  </span>
                  <span className="mt-1 text-[10.5px] font-mono tabular-nums text-[#0F766E] dark:text-emerald-300">
                    {item.ipa}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Two-Zone Sandbox Stage: Sagittal Vocal Tract Diagram + Letter Pronunciation Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5 items-stretch">
        {/* Left Zone: Interactive Vocal Tract & Tongue Articulation SVG */}
        <section
          aria-label="Interactive vocal tract and tongue position diagram"
          className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-5 sm:p-6 ayah-card-resting flex flex-col justify-between space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Sagittal Tongue &amp; Mouth Diagram
              </h3>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                {selectedPhoneme.subZoneLabel}
              </p>
            </div>
            <div className="text-xs font-semibold text-[#0F766E] dark:text-amber-300">
              {selectedPhoneme.emphatic ? '▲ Heavy (Tafkhīm)' : '● Light (Tarqīq)'}
            </div>
          </div>

          <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FAF8F2] dark:bg-[#041D17] p-3 flex items-center justify-center">
            <svg
              viewBox="0 0 360 280"
              className="w-full max-w-[430px] h-auto select-none"
              role="img"
              aria-label={`Vocal tract diagram showing tongue position for ${selectedPhoneme.name} (${selectedPhoneme.ipa})`}
            >
              {/* Soft Facial Profile & Head Contour */}
              <path
                d="M 88,26 C 145,14 235,20 296,60 C 325,80 335,130 330,262 L 265,262 L 265,220 C 265,175 262,140 245,112 C 232,90 198,74 152,74 C 118,74 92,90 80,108 L 76,120 C 64,126 56,133 56,138 C 56,143 66,145 73,147 C 64,151 56,154 57,160 C 58,166 72,167 74,174 C 76,184 68,200 78,214 C 90,228 118,236 146,238 L 146,262 L 60,262"
                fill="none"
                className="stroke-[#064E3B]/25 dark:stroke-emerald-300/25"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Nasal Cavity (Al-Khayshum) */}
              <path
                d="M 84,104 C 110,80 162,74 208,88 C 232,96 244,116 242,132 C 218,116 178,108 134,108 C 112,108 94,114 84,116 Z"
                className={
                  isNasal
                    ? 'fill-[#059669]/22 stroke-[#059669] dark:fill-emerald-400/25 dark:stroke-emerald-400 transition-colors duration-300'
                    : 'fill-[#064E3B]/[0.04] stroke-[#064E3B]/20 dark:fill-emerald-300/5 dark:stroke-emerald-300/20 transition-colors duration-300'
                }
                strokeWidth="1.5"
              />
              {isNasal && (
                <path
                  d="M 102,104 C 135,90 185,90 218,108"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Oral & Pharyngeal Airway Backdrop */}
              <path
                d="M 74,147 L 94,132 C 112,112 146,104 188,108 C 218,112 246,132 256,174 L 258,262 L 222,262 L 222,216 C 222,190 202,174 166,174 C 132,174 102,166 74,158 Z"
                className="fill-white/80 dark:fill-[#0A2921]/85"
              />

              {/* Hard Palate + Alveolar Ridge Roof */}
              <path
                d="M 92,136 C 102,126 112,116 132,110 C 154,104 176,104 192,110"
                fill="none"
                className="stroke-[#064E3B]/65 dark:stroke-emerald-300/65"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Soft Palate (Velum) & Uvula */}
              <path
                d="M 192,110 C 212,114 224,124 228,142 C 230,150 223,154 220,146 C 217,138 208,128 192,124"
                className="fill-[#D97706]/20 stroke-[#B45309] dark:fill-amber-400/20 dark:stroke-amber-300"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Upper & Lower Front Teeth (Incisors) */}
              <path
                d="M 80,126 L 90,126 L 88,143 L 80,143 Z"
                className={
                  isInterdental || selectedPhoneme.id === 'faa'
                    ? 'fill-white stroke-[#D97706] dark:fill-emerald-50 dark:stroke-amber-300'
                    : 'fill-white stroke-[#064E3B]/55 dark:fill-emerald-50/90 dark:stroke-emerald-300/60'
                }
                strokeWidth="1.6"
              />
              <path
                d="M 81,155 L 89,155 L 91,170 L 82,170 Z"
                className={
                  isInterdental
                    ? 'fill-white stroke-[#D97706] dark:fill-emerald-50 dark:stroke-amber-300'
                    : 'fill-white stroke-[#064E3B]/55 dark:fill-emerald-50/90 dark:stroke-emerald-300/60'
                }
                strokeWidth="1.6"
              />

              {/* Upper & Lower Lips */}
              <path
                d={
                  selectedPhoneme.tonguePose === 'lips-round'
                    ? 'M 64,132 C 56,138 56,144 65,146'
                    : 'M 70,130 C 62,136 63,144 72,146'
                }
                fill="none"
                className={
                  isLipsActive
                    ? 'stroke-[#D97706] dark:stroke-amber-300'
                    : 'stroke-[#064E3B]/65 dark:stroke-emerald-300/65'
                }
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d={
                  selectedPhoneme.tonguePose === 'lips-round'
                    ? 'M 64,154 C 56,158 57,166 67,169'
                    : 'M 71,153 C 63,157 64,166 74,170'
                }
                fill="none"
                className={
                  isLipsActive
                    ? 'stroke-[#D97706] dark:stroke-amber-300'
                    : 'stroke-[#064E3B]/65 dark:stroke-emerald-300/65'
                }
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Dynamic Tongue Body */}
              <path
                d={tonguePath}
                style={{ transition: 'd 260ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                className={
                  selectedPhoneme.emphatic
                    ? 'fill-[#D97706]/32 stroke-[#B45309] dark:fill-amber-400/28 dark:stroke-amber-300'
                    : 'fill-[#0F766E]/26 stroke-[#064E3B] dark:fill-emerald-400/25 dark:stroke-emerald-300'
                }
                strokeWidth="2.4"
                strokeLinejoin="round"
              />

              {/* Heavy Back-Tongue Lift Arrow for Tafkhim letters */}
              {selectedPhoneme.emphatic && (
                <g>
                  <line
                    x1="184"
                    y1="158"
                    x2="184"
                    y2="128"
                    stroke="#B45309"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <polygon points="184,122 179,130 189,130" fill="#B45309" />
                  <text
                    x="184"
                    y="171"
                    textAnchor="middle"
                    className="fill-[#904D00] dark:fill-amber-300 text-[8.5px] font-bold"
                  >
                    Back Lift
                  </text>
                </g>
              )}

              {/* Clickable Anatomical Zone Hotspots */}
              {[
                { place: 'bilabial', x: 64, y: 150, label: 'Lips' },
                { place: 'interdental', x: 84, y: 148, label: 'Teeth' },
                { place: 'alveolar', x: 102, y: 122, label: 'Gum' },
                { place: 'palatal', x: 148, y: 103, label: 'Palate' },
                { place: 'velar-uvular', x: 204, y: 112, label: 'Uvula' },
                { place: 'pharyngeal', x: 254, y: 184, label: 'Throat' },
                { place: 'glottal', x: 254, y: 238, label: 'Glottis' },
              ].map((zone) => {
                const isZoneActive = selectedPhoneme.placeOfArticulation === zone.place;
                return (
                  <g
                    key={zone.place}
                    onClick={() => jumpToPlace(zone.place)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={zone.x}
                      cy={zone.y}
                      r={isZoneActive ? 8 : 5}
                      className={
                        isZoneActive
                          ? 'fill-[#D97706]/30 stroke-[#D97706] dark:fill-amber-400/30 dark:stroke-amber-300'
                          : 'fill-[#064E3B]/10 stroke-[#064E3B]/35 hover:fill-[#064E3B]/25 dark:fill-emerald-300/15 dark:stroke-emerald-300/40'
                      }
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Primary Contact Target Indicator */}
              <g>
                <circle
                  cx={selectedPhoneme.contactMarker.x}
                  cy={selectedPhoneme.contactMarker.y}
                  r="11"
                  fill="none"
                  className="stroke-[#D97706]/45 dark:stroke-amber-300/50 animate-ping"
                  strokeWidth="1.5"
                />
                <circle
                  cx={selectedPhoneme.contactMarker.x}
                  cy={selectedPhoneme.contactMarker.y}
                  r="4.5"
                  className="fill-[#D97706] dark:fill-amber-400"
                />
              </g>

              {/* Static Anatomical Callout Labels */}
              <text
                x="156"
                y="94"
                textAnchor="middle"
                className="fill-[#404944] dark:fill-emerald-200/70 text-[9px] font-medium"
              >
                Nasal (Al-Khayshūm)
              </text>
              <text
                x="35"
                y="152"
                textAnchor="middle"
                className="fill-[#404944] dark:fill-emerald-200/70 text-[9px] font-medium"
              >
                Lips &amp; Teeth
              </text>
              <text
                x="294"
                y="186"
                textAnchor="start"
                className="fill-[#404944] dark:fill-emerald-200/70 text-[9px] font-medium"
              >
                Mid Throat
              </text>
              <text
                x="294"
                y="240"
                textAnchor="start"
                className="fill-[#404944] dark:fill-emerald-200/70 text-[9px] font-medium"
              >
                Vocal Cords
              </text>
            </svg>
          </div>

          {/* Active Contact Point & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#404944] dark:text-emerald-200/80 pt-1">
            <span>
              Focus: <strong className="text-[#022C22] dark:text-[#E6FFF4]">{selectedPhoneme.contactMarker.label}</strong>
            </span>
            <span>
              {selectedPhoneme.voiced ? 'Voiced (Jahr)' : 'Voiceless / Breath (Hams)'}
              {isNasal ? ' · Nasal (Ghunnah)' : ''}
            </span>
          </div>
        </section>

        {/* Right Zone: Plain-English Pronunciation Coach & Audio Examples */}
        <section
          aria-label="Letter pronunciation instructions"
          className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-5 sm:p-6 ayah-card-resting flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            {/* Spotlight Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#064E3B]/10 dark:border-emerald-300/12">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#0F766E] dark:text-emerald-300">
                  <span className="font-mono font-bold text-[#B45309] dark:text-amber-300">
                    IPA {selectedPhoneme.ipa}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPhoneme.makhrajEnglish}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#022C22] dark:text-white">
                  {selectedPhoneme.name}{' '}
                  <span className="text-base font-normal text-[#404944] dark:text-emerald-200/80">
                    (&ldquo;{selectedPhoneme.transliteration}&rdquo;)
                  </span>
                </h3>
                <p
                  dir="rtl"
                  className="font-quran-amiri text-sm text-[#404944] dark:text-emerald-200/75"
                >
                  {selectedPhoneme.makhrajArabic}
                </p>
              </div>

              <div
                dir="rtl"
                className="w-20 h-20 rounded-2xl border border-[#D97706]/35 dark:border-amber-400/40 bg-[#FAF7F0] dark:bg-[#041D17] flex items-center justify-center shrink-0"
              >
                <span className="font-quran-amiri text-5xl font-bold text-[#003527] dark:text-amber-200 leading-none">
                  {selectedPhoneme.letter}
                </span>
              </div>
            </div>

            {/* Plain-English Pronunciation Steps */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                How to Pronounce
              </p>
              <p className="text-sm sm:text-[15px] leading-relaxed text-[#022C22] dark:text-[#E6FFF4]">
                {selectedPhoneme.howToPronounce}
              </p>
            </div>

            {/* Structured Mouth / Comparison / Mistake Details */}
            <div className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#F7FBF9] dark:bg-[#041D17]/80 p-4 space-y-2.5 text-xs sm:text-[13px]">
              <p className="text-[#022C22]/90 dark:text-emerald-100/90">
                <strong className="text-[#064E3B] dark:text-emerald-300">Tongue &amp; Air: </strong>
                {selectedPhoneme.tongueStep}
              </p>
              <p className="text-[#022C22]/90 dark:text-emerald-100/90">
                <strong className="text-[#064E3B] dark:text-emerald-300">Closest Sound: </strong>
                {selectedPhoneme.englishAnchor}
              </p>
              <p className="text-[#022C22]/90 dark:text-emerald-100/90">
                <strong className="text-[#B45309] dark:text-amber-300">Watch Out For: </strong>
                {selectedPhoneme.commonMistake}
              </p>
            </div>

            {/* Compare Similar Letters */}
            {selectedPhoneme.similarLetters.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                  Compare Similar Letters (tap to see tongue difference):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPhoneme.similarLetters.map((otherId) => {
                    const other = PHONEME_BY_ID.get(otherId);
                    if (!other) return null;
                    return (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => handleSelectPhoneme(other.id)}
                        className="min-h-[38px] px-3 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-[#FBFBFB] dark:bg-[#041D17] hover:border-[#D97706] text-xs font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                      >
                        <span
                          dir="rtl"
                          className="font-quran-amiri text-lg text-[#003527] dark:text-amber-200"
                        >
                          {other.letter}
                        </span>
                        <span className="text-[#022C22] dark:text-[#E6FFF4]">{other.name}</span>
                        <span className="font-mono text-[11px] text-[#0F766E] dark:text-emerald-300">
                          {other.ipa}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Audio Practice & Quran Example Strip */}
          <div className="pt-4 border-t border-[#064E3B]/10 dark:border-emerald-300/12 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#404944] dark:text-emerald-200/80">
                  Qur&apos;anic Example ({selectedPhoneme.quranExample.verseKey})
                </p>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span
                    dir="rtl"
                    className="font-quran-amiri text-2xl font-bold text-[#003527] dark:text-amber-200"
                  >
                    {selectedPhoneme.quranExample.word}
                  </span>
                  <span className="text-xs italic text-[#0F766E] dark:text-emerald-300">
                    {selectedPhoneme.quranExample.transliteration}
                  </span>
                  <span className="text-xs text-[#404944] dark:text-emerald-200/75">
                    — {selectedPhoneme.quranExample.meaning}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleHearIsolatedLetter}
                  className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isSpeakingLetter
                      ? 'border-[#D97706] bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                      : 'border-[#064E3B]/18 dark:border-emerald-300/20 bg-white dark:bg-[#041D17] text-[#022C22] dark:text-[#E6FFF4] hover:border-[#D97706]'
                  }`}
                >
                  {isSpeakingLetter ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300" />
                  )}
                  <span>{isSpeakingLetter ? 'Stop Letter' : 'Hear Letter'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePlayExample(false)}
                  className={`min-h-[40px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isPlayingExample
                      ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                      : 'bg-[#064E3B] text-[#FEF3C7] hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22]'
                  }`}
                >
                  {isPlayingExample ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isPlayingExample ? 'Pause Verse' : 'Hear in Verse'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onPracticeInReader(
                      selectedPhoneme.quranExample.surahId,
                      selectedPhoneme.quranExample.ayahNumber
                    )
                  }
                  className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-[#0F766E] dark:text-emerald-300 hover:bg-[#064E3B]/6 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Open {selectedPhoneme.quranExample.verseKey}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {audioStatusMsg && (
              <p className="text-xs text-[#904D00] dark:text-amber-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 shrink-0" />
                <span>{audioStatusMsg}</span>
              </p>
            )}
          </div>

          {/* Interactive Phoneme Tone & Articulation Grader */}
          <div className="pt-4 border-t border-[#064E3B]/10 dark:border-emerald-300/12 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0F766E] dark:text-emerald-300 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#022C22] dark:text-[#E6FFF4]">
                  Pronunciation &amp; Tone Grading
                </h4>
              </div>

              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#064E3B]/[0.06] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15">
                <button
                  type="button"
                  onClick={() => {
                    setPracticeTarget('letter');
                    setToneReport(null);
                  }}
                  className={`min-h-[30px] px-2.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    practiceTarget === 'letter'
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'text-[#404944] dark:text-emerald-200/80'
                  }`}
                >
                  Letter Sound ({selectedPhoneme.letter}َ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPracticeTarget('word');
                    setToneReport(null);
                  }}
                  className={`min-h-[30px] px-2.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    practiceTarget === 'word'
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'text-[#404944] dark:text-emerald-200/80'
                  }`}
                >
                  Qur&apos;an Word
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFB] dark:bg-[#041D17] p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-xs text-[#404944] dark:text-emerald-200/85">
                  <span>Say aloud: </span>
                  <span
                    dir="rtl"
                    className="font-quran-amiri text-lg font-bold text-[#003527] dark:text-amber-200 mx-1"
                  >
                    {buildPhonemePracticePrompt(selectedPhoneme, practiceTarget)}
                  </span>
                  <span className="text-[11px] text-[#707974] dark:text-emerald-300/70">
                    {practiceTarget === 'letter'
                      ? `(${selectedPhoneme.ipa} open + held)`
                      : `(${selectedPhoneme.quranExample.transliteration})`}
                  </span>
                </div>

                {/* Live Mic Level Bars */}
                <div
                  className="flex items-end gap-1 h-6 px-2 rounded-lg bg-[#064E3B]/[0.05] dark:bg-[#0A2921]"
                  aria-hidden="true"
                >
                  {micLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isRecording
                          ? 'bg-[#D97706] dark:bg-amber-400'
                          : 'bg-[#064E3B]/25 dark:bg-emerald-400/30'
                      }`}
                      style={{ height: `${Math.round(lvl * 20)}px` }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`min-h-[40px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-[#D97706] hover:bg-[#B45309] text-white dark:bg-amber-400 dark:text-[#022C22]'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop ({recordingSec.toFixed(1)}s)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Record &amp; Grade</span>
                    </>
                  )}
                </button>

                {userAudioUrl && !isRecording && (
                  <>
                    <button
                      type="button"
                      onClick={handleTogglePlayMine}
                      className="min-h-[40px] px-3 rounded-xl border border-[#064E3B]/18 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:border-[#D97706] inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isPlayingMine ? (
                        <Pause className="w-3.5 h-3.5 text-[#D97706]" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#0F766E] dark:text-emerald-300" />
                      )}
                      <span>{isPlayingMine ? 'Pause Mine' : 'Play Mine'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompareTone}
                      className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                        isComparing
                          ? 'border-[#D97706] bg-[#D97706]/12 text-[#904D00] dark:text-amber-300'
                          : 'border-[#064E3B]/18 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] text-[#022C22] dark:text-[#E6FFF4] hover:border-[#D97706]'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isComparing ? 'Comparing...' : 'Compare A/B'}</span>
                    </button>
                  </>
                )}

                {onOpenVerseToneGrader && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenVerseToneGrader(
                        selectedPhoneme.quranExample.surahId,
                        selectedPhoneme.quranExample.ayahNumber
                      )
                    }
                    className="ml-auto min-h-[38px] px-2.5 rounded-lg text-[11.5px] font-semibold text-[#0F766E] dark:text-emerald-300 hover:bg-[#064E3B]/6 inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>Full Verse Tone Grader</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {micError && (
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {micError}
                </p>
              )}

              {isEvaluating && !isRecording && (
                <div className="rounded-lg border border-[#064E3B]/12 bg-[#064E3B]/[0.04] dark:bg-emerald-400/10 px-3 py-2 text-xs font-medium text-[#0F766E] dark:text-emerald-200 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Analyzing pitch contour, Makhraj weight, and articulation...</span>
                </div>
              )}

              {toneReport && !isRecording && !isEvaluating && (
                <div className="space-y-3 pt-1">
                  {/* Overall Score Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#064E3B]/10 dark:border-emerald-300/12">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl font-bold tabular-nums text-[#003527] dark:text-amber-300">
                        {toneReport.overallScore}%
                      </span>
                      <span className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                        {toneReport.ratingLabel}
                      </span>
                      <span
                        dir="rtl"
                        className="font-quran-amiri text-sm font-bold text-[#904D00] dark:text-amber-300"
                      >
                        {toneReport.ratingArabic}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium tabular-nums text-[#404944] dark:text-emerald-200/80">
                      {toneReport.avgPitchHz > 0
                        ? `${toneReport.avgPitchHz} Hz avg pitch`
                        : 'Voiceless / Consonant focus'}{' '}
                      · Depth {toneReport.avgFullnessPercent}%
                    </span>
                  </div>

                  {/* Metric Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/12 px-2.5 py-2">
                      <span className="block text-[10.5px] text-[#707974] dark:text-emerald-300/75">
                        Tone Stability
                      </span>
                      <span className="font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                        {toneReport.toneStabilityScore}%
                      </span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/12 px-2.5 py-2">
                      <span className="block text-[10.5px] text-[#707974] dark:text-emerald-300/75">
                        {selectedPhoneme.emphatic ? 'Tafkhīm Depth' : 'Tarqīq Lightness'}
                      </span>
                      <span className="font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                        {toneReport.weightMatchScore}%
                      </span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/12 px-2.5 py-2">
                      <span className="block text-[10.5px] text-[#707974] dark:text-emerald-300/75">
                        Breath &amp; Clarity
                      </span>
                      <span className="font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                        {toneReport.breathClarityScore}%
                      </span>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/12 px-2.5 py-2">
                      <span className="block text-[10.5px] text-[#707974] dark:text-emerald-300/75">
                        Spoken Match
                      </span>
                      <span className="font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                        {toneReport.spokenMatchScore !== null
                          ? `${toneReport.spokenMatchScore}%`
                          : 'Acoustic'}
                      </span>
                    </div>
                  </div>

                  {/* Pitch & Tone Contour Comparison */}
                  <div className="rounded-lg bg-white dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/12 p-2.5">
                    <div className="flex items-center justify-between text-[10.5px] font-medium text-[#404944] dark:text-emerald-200/80 mb-1">
                      <span>Pitch &amp; Tone Contour</span>
                      <span>
                        <span className="text-[#D97706]">--- Model</span> ·{' '}
                        <span className="text-[#064E3B] dark:text-emerald-300 font-semibold">
                          — Your Voice
                        </span>
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 360 84"
                      className="w-full h-16 overflow-visible"
                      role="img"
                      aria-label="Phoneme tone pitch contour comparison"
                    >
                      <line
                        x1="8"
                        y1="44"
                        x2="352"
                        y2="44"
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeDasharray="3 3"
                      />
                      <path
                        d={refTonePath}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <path
                        d={userTonePath}
                        fill="none"
                        stroke="#0F766E"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Summary & Coaching Feedback */}
                  <div className="space-y-1 text-xs leading-relaxed">
                    <p className="font-medium text-[#022C22] dark:text-[#E6FFF4]">
                      {toneReport.summary}
                    </p>
                    <p className="text-[#904D00] dark:text-amber-300">
                      Tip: {toneReport.coachTip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Full IPA Consonant & Tongue Articulation Matrix */}
      <section
        aria-label="IPA consonant and tongue articulation chart"
        className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-5 sm:p-6 ayah-card-resting space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
              IPA Articulation Matrix (Front of Mouth &rarr; Deep Throat)
            </h3>
            <p className="text-xs text-[#404944] dark:text-emerald-200/80">
              Ordered left-to-right by tongue &amp; vocal tract position. Amber symbols indicate heavy (Tafkhīm) raised-back letters.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#404944] dark:text-emerald-200/80">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-[#064E3B] dark:text-emerald-300" />
              <span>Light (Tarqīq)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[#B45309] dark:text-amber-300 font-semibold">
              <span>▲ Heavy (Tafkhīm)</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#064E3B]/12 dark:border-emerald-300/15 text-[#404944] dark:text-emerald-200/80">
                <th className="py-2.5 pr-3 font-semibold w-36">Manner</th>
                {IPA_PLACES.map((place) => (
                  <th key={place.id} className="py-2.5 px-2 font-semibold text-center">
                    <span className="block text-[#022C22] dark:text-[#E6FFF4]">
                      {place.shortLabel}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#064E3B]/8 dark:divide-emerald-300/10">
              {IPA_MANNERS.map((manner) => {
                const rowItems = ARABIC_PHONEMES.filter(
                  (p) => p.mannerOfArticulation === manner.id
                );
                if (rowItems.length === 0) return null;
                return (
                  <tr key={manner.id}>
                    <td className="py-2.5 pr-3 font-semibold text-[#0F766E] dark:text-emerald-300 whitespace-nowrap">
                      {manner.label}
                    </td>
                    {IPA_PLACES.map((place) => {
                      const matches = rowItems.filter(
                        (p) => p.placeOfArticulation === place.id
                      );
                      return (
                        <td key={place.id} className="py-2 px-1.5 text-center align-middle">
                          {matches.length === 0 ? (
                            <span className="text-[#404944]/25 dark:text-emerald-300/20">
                              —
                            </span>
                          ) : (
                            <div className="inline-flex flex-wrap items-center justify-center gap-1">
                              {matches.map((p) => {
                                const active = p.id === selectedPhoneme.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectPhoneme(p.id)}
                                    title={`${p.name} (${p.ipa}) — ${p.englishAnchor}`}
                                    className={`px-2 py-1 rounded-lg border transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                                      active
                                        ? 'border-[#D97706] bg-[#D97706]/15 dark:border-amber-400 dark:bg-amber-400/20 font-bold'
                                        : p.emphatic
                                        ? 'border-[#B45309]/25 bg-[#FEF3C7]/45 hover:border-[#D97706] dark:border-amber-400/25 dark:bg-amber-950/30'
                                        : 'border-[#064E3B]/12 bg-[#FBFBFB] hover:border-[#064E3B]/35 dark:border-emerald-300/15 dark:bg-[#041D17]'
                                    }`}
                                  >
                                    <span
                                      dir="rtl"
                                      className="font-quran-amiri text-base leading-none text-[#022C22] dark:text-[#E6FFF4]"
                                    >
                                      {p.letter}
                                    </span>
                                    <span
                                      className={`font-mono text-[10.5px] ${
                                        p.emphatic
                                          ? 'text-[#B45309] dark:text-amber-300 font-semibold'
                                          : 'text-[#0F766E] dark:text-emerald-300'
                                      }`}
                                    >
                                      {p.ipa.replace(/\//g, '')}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
