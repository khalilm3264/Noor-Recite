import { useEffect, useRef, useState } from 'react';
import { QariVoiceProfile } from '../types/quran';
import { SpeechBounds, mapTimeToSpeechProgress } from './speechBounds';
import { ArabicWordTiming, mapTimeToWordTimingProgress } from './arabicWordSync';

export const QARI_VOICE_PROFILES: {
  id: QariVoiceProfile;
  label: string;
  desc: string;
  pitchRateBias: number;
}[] = [
  {
    id: 'recorded',
    label: 'Natural Arabic · Standard',
    desc: 'Original unmodified recording & natural Arabic reading',
    pitchRateBias: 1,
  },
  {
    id: 'male-gulf',
    label: 'Gulf Arabic · Natural',
    desc: 'Clean natural playback (prefers Gulf Arabic TTS voice)',
    pitchRateBias: 1,
  },
  {
    id: 'male-egypt',
    label: 'Egyptian Arabic · Natural',
    desc: 'Clean natural playback (prefers Egyptian Arabic TTS voice)',
    pitchRateBias: 1,
  },
  {
    id: 'male-maghreb',
    label: 'Maghrebi Arabic · Natural',
    desc: 'Clean natural playback (prefers Maghrebi Arabic TTS voice)',
    pitchRateBias: 1,
  },
  {
    id: 'female-warm',
    label: 'Female Arabic · Natural',
    desc: 'Clean natural playback (prefers female Arabic TTS voice)',
    pitchRateBias: 1,
  },
];

// Silent Web Audio keepalive prevents OS/browser suspension during track gaps when switching apps
let keepaliveCtx: AudioContext | null = null;
let keepaliveOsc: OscillatorNode | null = null;
let keepaliveGain: GainNode | null = null;
let keepaliveUsers = 0;

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function startBackgroundAudioKeepalive(): void {
  if (typeof window === 'undefined') return;
  keepaliveUsers += 1;
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    if (!keepaliveCtx || keepaliveCtx.state === 'closed') {
      keepaliveCtx = new Ctor();
    }
    if (keepaliveCtx.state === 'suspended') {
      void keepaliveCtx.resume().catch(() => {});
    }
    if (!keepaliveOsc || !keepaliveGain) {
      const osc = keepaliveCtx.createOscillator();
      const gain = keepaliveCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 32;
      gain.gain.value = 0.00001; // Sub-audible heartbeat to keep media pipeline alive
      osc.connect(gain);
      gain.connect(keepaliveCtx.destination);
      osc.start();
      keepaliveOsc = osc;
      keepaliveGain = gain;
    }
  } catch {
    // Ignore restricted autoplay environments until gesture unlocks audio
  }
}

export function stopBackgroundAudioKeepalive(): void {
  keepaliveUsers = Math.max(0, keepaliveUsers - 1);
  if (keepaliveUsers > 0) return;
  try {
    if (keepaliveOsc) {
      keepaliveOsc.stop();
      keepaliveOsc.disconnect();
      keepaliveOsc = null;
    }
    if (keepaliveGain) {
      keepaliveGain.disconnect();
      keepaliveGain = null;
    }
    if (keepaliveCtx && keepaliveCtx.state === 'running') {
      void keepaliveCtx.suspend().catch(() => {});
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Keeps recorded human and spoken Arabic <audio> completely clean and unmodified
 * (no synthetic pitch shifting, delay-line modulation, or formant distortion).
 */
export function applyVoiceTimbreProfile(
  audio: HTMLAudioElement | null,
  _profile: QariVoiceProfile = 'recorded'
): void {
  if (!audio) return;
  if ('preservesPitch' in audio) {
    (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  }
}

export function selectRegionalArabicVoice(
  voices: SpeechSynthesisVoice[],
  profile: QariVoiceProfile = 'recorded'
): { voice: SpeechSynthesisVoice | null; pitch: number } {
  const arVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
  if (arVoices.length === 0) {
    return { voice: null, pitch: 1 };
  }

  const pickByPatterns = (patterns: RegExp[]): SpeechSynthesisVoice | null => {
    for (const pat of patterns) {
      const match = arVoices.find((v) => pat.test(`${v.name} ${v.lang}`));
      if (match) return match;
    }
    return null;
  };

  if (profile === 'female-warm') {
    const female = pickByPatterns([
      /hoda|salma|laila|mariam|amina|fatima|zaynab|noura|rani|female|woman/i,
    ]);
    return { voice: female ?? arVoices[0], pitch: 1 };
  }
  if (profile === 'male-egypt') {
    const egypt = pickByPatterns([/ar-eg/i, /egypt|shakir|tarek|maged|hani/i]);
    return { voice: egypt ?? arVoices[0], pitch: 1 };
  }
  if (profile === 'male-maghreb') {
    const maghreb = pickByPatterns([/ar-(ma|tn|dz)/i, /morocco|tunisia|algeria/i]);
    return { voice: maghreb ?? arVoices[0], pitch: 1 };
  }
  if (profile === 'male-gulf') {
    const gulf = pickByPatterns([/ar-(sa|ae|kw|qa|om|bh)/i, /naayf|zayed|hamdan|majed/i]);
    return { voice: gulf ?? arVoices[0], pitch: 1 };
  }
  return { voice: arVoices[0], pitch: 1 };
}

function findScrollableContainer(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight + 4
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function getContainerSafeBounds(container: HTMLElement | null): {
  safeTop: number;
  safeBottom: number;
} {
  const topEdge = container ? container.getBoundingClientRect().top : 0;
  const bottomEdge = container
    ? container.getBoundingClientRect().bottom
    : window.innerHeight || document.documentElement.clientHeight || 800;

  let safeTop = topEdge + 12;
  const stripScope: ParentNode = container ?? document;
  const stickyStrip = stripScope.querySelector('[data-reading-strip="true"]') as HTMLElement | null;
  if (stickyStrip) {
    const r = stickyStrip.getBoundingClientRect();
    if (r.height > 0 && r.bottom > topEdge && r.bottom < bottomEdge) {
      safeTop = Math.max(safeTop, r.bottom + 10);
    }
  }

  let safeBottom = bottomEdge - 16;
  const dockedBar = document.querySelector('[data-docked-bottom-bar="true"]') as HTMLElement | null;
  if (dockedBar) {
    const r = dockedBar.getBoundingClientRect();
    if (r.height > 0 && r.top < safeBottom) {
      safeBottom = Math.max(safeTop + 120, r.top - 12);
    }
  }

  return { safeTop, safeBottom };
}

export function scrollTargetIntoCenter(elementId: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(elementId);
  if (!el) return;

  const container = findScrollableContainer(el);
  const { safeTop, safeBottom } = getContainerSafeBounds(container);
  const safeHeight = Math.max(160, safeBottom - safeTop);
  const rect = el.getBoundingClientRect();

  // If tall card doesn't fit cleanly in safe viewport, align its top just below sticky strip
  let delta: number;
  if (rect.height > safeHeight * 0.88) {
    delta = rect.top - (safeTop + 8);
  } else {
    const cardCenter = rect.top + rect.height / 2;
    const targetCenter = safeTop + safeHeight * 0.44;
    delta = cardCenter - targetCenter;
  }

  if (Math.abs(delta) < 10) return;

  if (container) {
    container.scrollTo({
      top: Math.max(0, Math.round(container.scrollTop + delta)),
      behavior: 'smooth',
    });
  } else {
    window.scrollTo({
      top: Math.max(0, Math.round(window.scrollY + delta)),
      behavior: 'smooth',
    });
  }
}

export function scrollActiveWordIntoView(cardElementId: string) {
  if (typeof document === 'undefined') return;
  const cardEl = document.getElementById(cardElementId);
  if (!cardEl) return;

  const container = findScrollableContainer(cardEl);
  const { safeTop, safeBottom } = getContainerSafeBounds(container);
  const cardRect = cardEl.getBoundingClientRect();

  // Only adjust word-level scroll if card extends beyond visible safe band
  if (cardRect.top >= safeTop && cardRect.bottom <= safeBottom) {
    return;
  }

  const wordEl = cardEl.querySelector('[data-active-word="true"]') as HTMLElement | null;
  if (!wordEl) return;
  const wordRect = wordEl.getBoundingClientRect();
  const safeHeight = Math.max(140, safeBottom - safeTop);

  let delta = 0;
  if (wordRect.bottom > safeBottom - 12) {
    delta = wordRect.top - (safeTop + safeHeight * 0.34);
  } else if (wordRect.top < safeTop + 8) {
    delta = wordRect.top - (safeTop + 18);
  }

  if (Math.abs(delta) < 12) return;

  if (container) {
    container.scrollTo({
      top: Math.max(0, Math.round(container.scrollTop + delta)),
      behavior: 'smooth',
    });
  } else {
    window.scrollTo({
      top: Math.max(0, Math.round(window.scrollY + delta)),
      behavior: 'smooth',
    });
  }
}

export function updateBackgroundMediaSession(meta: {
  title: string;
  artist?: string;
  album?: string;
  isPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta.title,
        artist: meta.artist ?? 'Noor Recite · Qari Voice',
        album: meta.album ?? 'Noor Recite',
      });
    }
    navigator.mediaSession.playbackState = meta.isPlaying ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', meta.onPlay ?? null);
    navigator.mediaSession.setActionHandler('pause', meta.onPause ?? null);
    navigator.mediaSession.setActionHandler('nexttrack', meta.onNext ?? null);
    navigator.mediaSession.setActionHandler('previoustrack', meta.onPrev ?? null);
  } catch {
    // Ignore unsupported MediaSession actions
  }
}

/**
 * Provides smooth 60fps progressRatio (0..1) while <audio> or SpeechSynthesis is active,
 * trimming leading/trailing silence and shaping mid-recitation breath pauses via SpeechBounds,
 * or locking directly onto exact per-word timings when provided.
 */
export function useSmoothAudioProgress(options: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  isBuffering: boolean;
  isSpeechFallback: boolean;
  fallbackTextLength: number;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
  speechBounds?: SpeechBounds | null;
  wordTimings?: ArabicWordTiming[] | null;
  arabicText?: string;
  rangeStart?: number;
  rangeEnd?: number;
}): number {
  const {
    audioRef,
    isPlaying,
    isBuffering,
    isSpeechFallback,
    fallbackTextLength,
    playbackSpeed,
    currentTime,
    duration,
    speechBounds = null,
    wordTimings = null,
    arabicText = '',
    rangeStart = 0,
    rangeEnd = 1,
  } = options;

  const [smoothRatio, setSmoothRatio] = useState(0);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  currentTimeRef.current = currentTime;
  durationRef.current = duration;

  useEffect(() => {
    const hasWordTimings = Boolean(wordTimings && wordTimings.length > 0 && arabicText);
    const computeProgress = (t: number, d: number) => {
      if (hasWordTimings && wordTimings) {
        return mapTimeToWordTimingProgress(t * 1000, wordTimings, arabicText);
      }
      const mapped = mapTimeToSpeechProgress(t, d, speechBounds);
      return Math.min(1, Math.max(0, rangeStart + (rangeEnd - rangeStart) * mapped));
    };

    if (!isPlaying || isBuffering) {
      if (duration <= 0) {
        setSmoothRatio(rangeStart > 0 ? rangeStart : 0);
      } else {
        setSmoothRatio(computeProgress(currentTime, duration));
      }
      return;
    }

    if (isSpeechFallback) {
      const estimatedMs = Math.max(
        2200,
        (Math.max(8, fallbackTextLength) * 65) / Math.max(0.5, playbackSpeed)
      );
      const startedAt = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const localRatio = Math.min(0.98, (now - startedAt) / estimatedMs);
        setSmoothRatio(
          Math.min(1, Math.max(0, rangeStart + (rangeEnd - rangeStart) * localRatio))
        );
        if (localRatio < 0.98) {
          raf = window.requestAnimationFrame(tick);
        }
      };
      raf = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(raf);
    }

    let raf = 0;
    const syncFromAudio = () => {
      const audio = audioRef.current;
      const d =
        audio && Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : durationRef.current;
      const t = audio ? audio.currentTime : currentTimeRef.current;
      setSmoothRatio(computeProgress(t, d));
    };

    const tick = () => {
      syncFromAudio();
      raf = window.requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        syncFromAudio();
      }
    };

    raf = window.requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    audioRef,
    isPlaying,
    isBuffering,
    isSpeechFallback,
    fallbackTextLength,
    playbackSpeed,
    speechBounds,
    wordTimings,
    arabicText,
    rangeStart,
    rangeEnd,
  ]);

  // Keep paused/seeked scrubbers immediately synced without restarting active rAF loops
  useEffect(() => {
    if (isPlaying && !isBuffering) return;
    if (duration <= 0) {
      setSmoothRatio(rangeStart > 0 ? rangeStart : 0);
      return;
    }
    if (wordTimings && wordTimings.length > 0 && arabicText) {
      setSmoothRatio(mapTimeToWordTimingProgress(currentTime * 1000, wordTimings, arabicText));
      return;
    }
    const localRatio = mapTimeToSpeechProgress(currentTime, duration, speechBounds);
    setSmoothRatio(
      Math.min(1, Math.max(0, rangeStart + (rangeEnd - rangeStart) * localRatio))
    );
  }, [
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    speechBounds,
    wordTimings,
    arabicText,
    rangeStart,
    rangeEnd,
  ]);

  return smoothRatio;
}
