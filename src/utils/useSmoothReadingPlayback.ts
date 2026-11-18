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
    label: 'Authentic Recorded Qari',
    desc: 'Natural original recitation (unmodified)',
    pitchRateBias: 1,
  },
  {
    id: 'male-gulf',
    label: 'Gulf Male · Deep Hijazi',
    desc: 'Deep baritone Hijazi warmth & lowered vocal register',
    pitchRateBias: 1,
  },
  {
    id: 'male-egypt',
    label: 'Egyptian Male · Classical',
    desc: 'Rich Azhari classical chest & mid vocal presence',
    pitchRateBias: 1,
  },
  {
    id: 'male-maghreb',
    label: 'Maghrebi Voice · Crisp',
    desc: 'Lighter tenor lift & articulate upper clarity',
    pitchRateBias: 1,
  },
  {
    id: 'female-warm',
    label: 'Warm Elder Female · Gentle',
    desc: 'Gentle elder female vocal register & soft melodic tone',
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

interface VoicePresetParams {
  semitones: number;
  preType: BiquadFilterType;
  preFreq: number;
  preGain: number;
  f1Freq: number;
  f1Gain: number;
  f1Q: number;
  f2Freq: number;
  f2Gain: number;
  f2Q: number;
  postLpFreq: number;
}

const VOICE_DSP_PRESETS: Record<Exclude<QariVoiceProfile, 'recorded'>, VoicePresetParams> = {
  'male-gulf': {
    semitones: -2.6,
    preType: 'lowshelf',
    preFreq: 165,
    preGain: 4.2,
    f1Freq: 620,
    f1Gain: 1.8,
    f1Q: 1.0,
    f2Freq: 2100,
    f2Gain: -2.2,
    f2Q: 0.9,
    postLpFreq: 8500,
  },
  'male-egypt': {
    semitones: -1.1,
    preType: 'lowshelf',
    preFreq: 185,
    preGain: 1.8,
    f1Freq: 880,
    f1Gain: 3.8,
    f1Q: 1.1,
    f2Freq: 1800,
    f2Gain: 1.4,
    f2Q: 1.0,
    postLpFreq: 9500,
  },
  'male-maghreb': {
    semitones: 1.8,
    preType: 'highpass',
    preFreq: 95,
    preGain: 0,
    f1Freq: 1450,
    f1Gain: 2.5,
    f1Q: 1.0,
    f2Freq: 2700,
    f2Gain: 3.4,
    f2Q: 1.0,
    postLpFreq: 10500,
  },
  'female-warm': {
    semitones: 5.0,
    preType: 'highpass',
    preFreq: 145,
    preGain: 0,
    f1Freq: 390,
    f1Gain: 2.6,
    f1Q: 1.1,
    f2Freq: 1550,
    f2Gain: 3.8,
    f2Q: 1.0,
    postLpFreq: 6200,
  },
};

interface ElementVoiceDspChain {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  dryGain: GainNode;
  wetGain: GainNode;
  pitchInput: GainNode;
  delayA: DelayNode;
  delayB: DelayNode;
  tapAGain: GainNode;
  tapBGain: GainNode;
  preFilter: BiquadFilterNode;
  formant1: BiquadFilterNode;
  formant2: BiquadFilterNode;
  postLp: BiquadFilterNode;
  activeSemitones: number;
  modSources: AudioBufferSourceNode[];
}

const elementDspMap = new WeakMap<HTMLAudioElement, ElementVoiceDspChain>();

function isCorsSafeAudioSrc(audio: HTMLAudioElement, src: string): boolean {
  if (!src) return false;
  if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/')) {
    return true;
  }
  if (typeof window !== 'undefined' && src.startsWith(window.location.origin)) {
    return true;
  }
  return audio.crossOrigin === 'anonymous';
}

function stopPitchModulators(chain: ElementVoiceDspChain): void {
  for (const src of chain.modSources) {
    try {
      src.stop();
      src.disconnect();
    } catch {
      // Ignore already stopped buffer source
    }
  }
  chain.modSources = [];
}

function startPitchModulators(chain: ElementVoiceDspChain, semitones: number): void {
  if (chain.activeSemitones === semitones && chain.modSources.length > 0) {
    return;
  }
  stopPitchModulators(chain);
  chain.activeSemitones = semitones;

  if (Math.abs(semitones) < 0.05) {
    return;
  }

  const { ctx } = chain;
  const sr = ctx.sampleRate || 48000;
  const alpha = Math.pow(2, semitones / 12);
  const windowSec = 0.068;
  const baseDelaySec = 0.004;
  const rateDelta = Math.abs(1 - alpha);
  const cycleSec = windowSec / Math.max(0.01, rateDelta);
  const numSamples = Math.max(256, Math.round(sr * cycleSec));

  const dBufA = ctx.createBuffer(1, numSamples, sr);
  const dBufB = ctx.createBuffer(1, numSamples, sr);
  const gBufA = ctx.createBuffer(1, numSamples, sr);
  const gBufB = ctx.createBuffer(1, numSamples, sr);

  const dA = dBufA.getChannelData(0);
  const dB = dBufB.getChannelData(0);
  const gA = gBufA.getChannelData(0);
  const gB = gBufB.getChannelData(0);

  const pitchUp = alpha > 1;
  for (let i = 0; i < numSamples; i++) {
    const phiA = i / numSamples;
    const phiB = (phiA + 0.5) % 1;
    // Negative delay slope raises pitch; positive delay slope lowers pitch
    dA[i] = baseDelaySec + windowSec * (pitchUp ? 1 - phiA : phiA);
    dB[i] = baseDelaySec + windowSec * (pitchUp ? 1 - phiB : phiB);
    // Raised-cosine sin^2/cos^2 crossfade has exact unity sum and reaches 0 at sawtooth reset
    gA[i] = 0.5 * (1 - Math.cos(2 * Math.PI * phiA));
    gB[i] = 0.5 * (1 - Math.cos(2 * Math.PI * phiB));
  }

  const makeLoop = (buf: AudioBuffer, param: AudioParam, t0: number) => {
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    node.connect(param);
    node.start(t0);
    return node;
  };

  chain.delayA.delayTime.value = 0;
  chain.delayB.delayTime.value = 0;
  chain.tapAGain.gain.value = 0;
  chain.tapBGain.gain.value = 0;

  const t0 = ctx.currentTime + 0.008;
  chain.modSources = [
    makeLoop(dBufA, chain.delayA.delayTime, t0),
    makeLoop(dBufB, chain.delayB.delayTime, t0),
    makeLoop(gBufA, chain.tapAGain.gain, t0),
    makeLoop(gBufB, chain.tapBGain.gain, t0),
  ];
}

/**
 * Applies real-time Web Audio Jungle pitch-shifting + vocal tract formant shaping
 * to an <audio> element without altering playbackRate or audio.currentTime.
 */
export function applyVoiceTimbreProfile(
  audio: HTMLAudioElement | null,
  profile: QariVoiceProfile = 'recorded'
): void {
  if (!audio) return;
  const existing = elementDspMap.get(audio);
  const effectiveSrc = audio.currentSrc || audio.src || '';
  const canProcess = isCorsSafeAudioSrc(audio, effectiveSrc);

  // Keep default 'recorded' profile on native <audio> output unless DSP graph was already attached
  if (!existing && (profile === 'recorded' || !canProcess)) {
    return;
  }

  try {
    let chain = existing;
    if (!chain) {
      const Ctor = getAudioContextCtor();
      if (!Ctor) return;
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(audio);

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const pitchInput = ctx.createGain();
      const delayA = ctx.createDelay(0.25);
      const delayB = ctx.createDelay(0.25);
      const tapAGain = ctx.createGain();
      const tapBGain = ctx.createGain();

      const preFilter = ctx.createBiquadFilter();
      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'peaking';
      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'peaking';
      const postLp = ctx.createBiquadFilter();
      postLp.type = 'lowpass';
      postLp.Q.value = 0.65;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 12;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.12;

      // Dry path
      source.connect(dryGain);
      dryGain.connect(ctx.destination);

      // Wet pitch-shifted + formant-shaped path
      source.connect(pitchInput);
      pitchInput.connect(delayA);
      pitchInput.connect(delayB);
      delayA.connect(tapAGain);
      delayB.connect(tapBGain);
      tapAGain.connect(preFilter);
      tapBGain.connect(preFilter);
      preFilter.connect(formant1);
      formant1.connect(formant2);
      formant2.connect(postLp);
      postLp.connect(compressor);
      compressor.connect(wetGain);
      wetGain.connect(ctx.destination);

      chain = {
        ctx,
        source,
        dryGain,
        wetGain,
        pitchInput,
        delayA,
        delayB,
        tapAGain,
        tapBGain,
        preFilter,
        formant1,
        formant2,
        postLp,
        activeSemitones: 0,
        modSources: [],
      };
      elementDspMap.set(audio, chain);
    }

    if (chain.ctx.state === 'suspended') {
      void chain.ctx.resume().catch(() => {});
    }

    const activeProfile: QariVoiceProfile = canProcess ? profile : 'recorded';
    const now = chain.ctx.currentTime;

    if (activeProfile === 'recorded') {
      chain.dryGain.gain.setTargetAtTime(1, now, 0.02);
      chain.wetGain.gain.setTargetAtTime(0, now, 0.02);
      stopPitchModulators(chain);
      chain.activeSemitones = 0;
      return;
    }

    const preset = VOICE_DSP_PRESETS[activeProfile];
    chain.preFilter.type = preset.preType;
    chain.preFilter.frequency.setTargetAtTime(preset.preFreq, now, 0.02);
    chain.preFilter.gain.setTargetAtTime(preset.preGain, now, 0.02);

    chain.formant1.frequency.setTargetAtTime(preset.f1Freq, now, 0.02);
    chain.formant1.gain.setTargetAtTime(preset.f1Gain, now, 0.02);
    chain.formant1.Q.setTargetAtTime(preset.f1Q, now, 0.02);

    chain.formant2.frequency.setTargetAtTime(preset.f2Freq, now, 0.02);
    chain.formant2.gain.setTargetAtTime(preset.f2Gain, now, 0.02);
    chain.formant2.Q.setTargetAtTime(preset.f2Q, now, 0.02);

    chain.postLp.frequency.setTargetAtTime(preset.postLpFreq, now, 0.02);

    startPitchModulators(chain, preset.semitones);
    chain.dryGain.gain.setTargetAtTime(0, now, 0.02);
    chain.wetGain.gain.setTargetAtTime(1, now, 0.02);
  } catch {
    // Graceful no-op on browsers restricting MediaElementAudioSourceNode
  }
}

export function selectRegionalArabicVoice(
  voices: SpeechSynthesisVoice[],
  profile: QariVoiceProfile = 'recorded'
): { voice: SpeechSynthesisVoice | null; pitch: number } {
  const arVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
  if (arVoices.length === 0) {
    return {
      voice: null,
      pitch: profile === 'female-warm' ? 1.15 : profile === 'male-gulf' ? 0.88 : 1,
    };
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
    return { voice: female ?? arVoices[0], pitch: female ? 1.04 : 1.18 };
  }
  if (profile === 'male-egypt') {
    const egypt = pickByPatterns([/ar-eg/i, /egypt|shakir|tarek|maged|hani/i]);
    return { voice: egypt ?? arVoices[0], pitch: 0.98 };
  }
  if (profile === 'male-maghreb') {
    const maghreb = pickByPatterns([/ar-(ma|tn|dz)/i, /morocco|tunisia|algeria/i]);
    return { voice: maghreb ?? arVoices[0], pitch: 1.02 };
  }
  if (profile === 'male-gulf') {
    const gulf = pickByPatterns([/ar-(sa|ae|kw|qa|om|bh)/i, /naayf|zayed|hamdan|majed/i]);
    return { voice: gulf ?? arVoices[0], pitch: 0.9 };
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
