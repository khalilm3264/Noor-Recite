import { WARSH_PREVIEW_NOTICE } from './data/qiraatData';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AppScreen,
  Ayah,
  BookmarkCollection,
  BookmarkItem,
  ChapterAudioData,
  HifzSpacedItem,
  HifzWeakWord,
  KhatmahPlanState,
  KhatmahSlotProgress,
  OpenerPhase,
  ReaderSettings,
  Surah,
  SurahDirectoryEntry,
  TranslationLanguage,
  VerseTiming,
  WordSegment,
  WordToken,
} from './types/quran';
import {
  BASMALAH_OPENER,
  FEATURED_SURAHS,
  ISTIADHAH_OPENER,
  RECITERS,
  SURAH_DIRECTORY,
  alignTranslationSegments,
  alignWarshWordsToHafs,
  fetchChapterTimingData,
  fetchSurahFromApi,
  fetchSurahLanguageOverlay,
  fetchSurahWarshOverlay,
  getEveryAyahUrl,
  getOpenerAudioUrl,
} from './data/quranData';
import { QuranTopicCollection } from './data/topicsData';
import {
  ensureAudioCached,
  getCachedAudioSrc,
  isAudioCached,
  prefetchSurahAudio,
} from './utils/audioCache';
import { getLocalDateKey } from './utils/dailyStreak';
import {
  getAyahTranslationSegments,
  getAyahTranslationText,
  hasLocalizedWordMeaning,
} from './utils/translationConfig';
import {
  RecitationHistoryEntry,
  readRecitationHistory,
  saveRecitationHistory,
} from './utils/recitationHistory';
import {
  HifzProgressEvent,
  HifzProgressStatus,
  readHifzProgressEvents,
  saveHifzProgressEvents,
} from './utils/hifzProgress';
import { MobileBottomNav, TopNav } from './components/TopNav';
import { SurahChips } from './components/SurahChips';
import { SurahHeaderBanner } from './components/SurahHeaderBanner';
import { DailyGoalProgressBar } from './components/DailyGoalProgressBar';
import { DailyGoalReminderToast } from './components/DailyGoalReminderToast';
import { AyahCard } from './components/AyahCard';
import { FloatingPlayerDeck } from './components/FloatingPlayerDeck';
import { LexiconDrawer } from './components/LexiconDrawer';
import { SettingsModal } from './components/SettingsModal';
import { SurahIndexView } from './components/SurahIndexView';
import { KhatmahPlannerView } from './components/KhatmahPlannerView';
import { TopicsExplorerView } from './components/TopicsExplorerView';
import { HifzQuizView } from './components/HifzQuizView';
import { DuasKalimasView } from './components/DuasKalimasView';
import { HadithsView } from './components/HadithsView';
import { SalahView } from './components/SalahView';
import { TajweedStudioView } from './components/TajweedStudioView';
import { BookmarksView } from './components/BookmarksView';
import { GoogleDriveView } from './components/GoogleDriveView';
import { NoorDriveBackupPayload } from './utils/googleDriveApi';
import {
  clearDriveAccessToken,
  googleDriveSignIn,
  googleDriveSignOut,
  initDriveAuth,
} from './utils/googleDriveAuth';

const DEFAULT_SETTINGS: ReaderSettings = {
  arabicFont: 'amiri',
  arabicFontSize: 34,
  translationLanguage: 'en',
  showTransliteration: true,
  showTranslation: true,
  showTajweedColors: true,
  alwaysShowFootnotes: true,
  highlightStyle: 'pill',
  reflectionDelaySec: 0,
  wordRepeatCount: 1,
  reciterId: 'ghamdi',
  playbackSpeed: 1,
  repeatMode: 'off',
  syncOffsetSec: 0,
  riwayah: 'hafs',
  maghrebiOrthography: false,
};

const DEFAULT_BOOKMARK_COLLECTIONS: BookmarkCollection[] = [
  {
    id: 'col-heart',
    name: 'Heart & Steadfastness',
    description: 'Verses of solace, inner calm, and reliance upon Allah',
    createdAt: 'Preset',
  },
  {
    id: 'col-friday',
    name: 'Friday & Nightly Wird',
    description: 'Key anchors from Al-Kahf, Yā-Sīn, and Al-Mulk',
    createdAt: 'Preset',
  },
];

const DEFAULT_KHATMAH_PLAN: KhatmahPlanState = {
  targetDays: 30,
  currentDay: 1,
  pagesCompleted: 12,
  totalPages: 604,
  juzNumber: 1,
  scheduleStyle: 'five-prayers',
  hifzSyncEnabled: true,
  salahRemindersEnabled: true,
  streakDays: [1, 1, 1, 1, 1, 0, 0],
  slots: [
    {
      id: 'fajr',
      label: 'Post-Fajr Dawn Wird',
      arabicLabel: 'بَعْدَ الفَجْرِ',
      surahId: 1,
      surahName: 'Al-Fatiha',
      startAyah: 1,
      pageStart: 1,
      pageEnd: 4,
      completed: true,
    },
    {
      id: 'dhuhr',
      label: 'Post-Dhuhr Midday Wird',
      arabicLabel: 'بَعْدَ الظُّهْرِ',
      surahId: 2,
      surahName: 'Al-Baqarah',
      startAyah: 1,
      pageStart: 5,
      pageEnd: 8,
      completed: true,
    },
    {
      id: 'asr',
      label: 'Post-‘Aṣr Afternoon Wird',
      arabicLabel: 'بَعْدَ العَصْرِ',
      surahId: 18,
      surahName: 'Al-Kahf',
      startAyah: 1,
      pageStart: 293,
      pageEnd: 296,
      completed: true,
    },
    {
      id: 'maghrib',
      label: 'Post-Maghrib Sunset Wird',
      arabicLabel: 'بَعْدَ المَغْرِبِ',
      surahId: 36,
      surahName: 'Ya-Sin',
      startAyah: 1,
      pageStart: 440,
      pageEnd: 443,
      completed: false,
    },
    {
      id: 'isha',
      label: 'Post-‘Ishā’ Nightly Wird',
      arabicLabel: 'بَعْدَ العِشَاءِ',
      surahId: 67,
      surahName: 'Al-Mulk',
      startAyah: 1,
      pageStart: 562,
      pageEnd: 564,
      completed: false,
    },
  ],
};

const STAGE_INTERVALS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '+12h Imprint',
  2: '+24h Reinforce',
  3: '+3d Stabilize',
  4: '+5d Deepen',
  5: '+7d Solidified',
};

const INITIAL_BOOKMARKS: BookmarkItem[] = [
  {
    verseKey: '1:5',
    surahId: 1,
    surahName: 'Al-Fatiha',
    ayahNumber: 5,
    arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    translation: 'You alone we worship, and You alone we ask for help.',
    note: 'The pivot of the prayer: turning all reliance toward Allah before asking for guidance.',
    savedAt: 'Today',
  },
  {
    verseKey: '94:5',
    surahId: 94,
    surahName: 'Ash-Sharh',
    ayahNumber: 5,
    arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
    translation: 'For indeed, with hardship comes ease.',
    note: 'Notice "ma‘a" (with) — ease accompanies hardship concurrently.',
    savedAt: 'Today',
  },
];

interface SpeechBounds {
  speechStartSec: number;
  speechEndSec: number;
  durationSec: number;
}

const STREAM_ANTICIPATION_SEC = 0.08;
const CHAPTER_ANTICIPATION_MS = 75;

const ISTIADHAH_TEMPLATE: VerseTiming = {
  verseKey: 'opener:istiadhah',
  timestampFromMs: 0,
  timestampToMs: 6500,
  segments: [
    { wordIndex: 0, startMs: 0, endMs: 1380 },
    { wordIndex: 1, startMs: 1380, endMs: 2650 },
    { wordIndex: 2, startMs: 2950, endMs: 3450 },
    { wordIndex: 3, startMs: 3450, endMs: 4700 },
    { wordIndex: 4, startMs: 4700, endMs: 6500 },
  ],
};

const BASMALAH_FALLBACK_TEMPLATE: VerseTiming = {
  verseKey: 'opener:basmalah',
  timestampFromMs: 0,
  timestampToMs: 6090,
  segments: [
    { wordIndex: 0, startMs: 0, endMs: 580 },
    { wordIndex: 1, startMs: 580, endMs: 1409 },
    { wordIndex: 2, startMs: 1409, endMs: 2502 },
    { wordIndex: 3, startMs: 2502, endMs: 5840 },
  ],
};

let sharedDecodeCtx: AudioContext | null = null;
function getDecodeContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedDecodeCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      sharedDecodeCtx = new AudioCtx();
    }
  }
  return sharedDecodeCtx;
}

function getSafeLeadTrimSec(bounds?: SpeechBounds): number {
  if (!bounds || bounds.speechStartSec <= 0.18) return 0;
  return Math.max(0, Number((bounds.speechStartSec - 0.09).toFixed(3)));
}

async function analyzeSpeechBounds(url: string): Promise<SpeechBounds | null> {
  try {
    const ctx = getDecodeContext();
    if (!ctx) return null;
    const cachedSrc = (await ensureAudioCached(url)) ?? url;
    const res = await fetch(cachedSrc);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(buf);
    const data = audioBuf.getChannelData(0);
    const sr = audioBuf.sampleRate;
    const winSamples = Math.max(1, Math.floor(sr * 0.02));
    const rmsList: number[] = [];
    let peak = 0;

    for (let i = 0; i < data.length; i += winSamples) {
      const end = Math.min(data.length, i + winSamples);
      let sum = 0;
      for (let j = i; j < end; j++) {
        const s = data[j];
        sum += s * s;
      }
      const rms = Math.sqrt(sum / Math.max(1, end - i));
      rmsList.push(rms);
      if (rms > peak) peak = rms;
    }

    const startThresh = Math.max(0.004, peak * 0.025);
    const endThresh = Math.max(0.002, peak * 0.012);
    let firstWin = 0;
    while (firstWin < rmsList.length && rmsList[firstWin] < startThresh) {
      firstWin++;
    }
    let lastWin = rmsList.length - 1;
    while (lastWin > firstWin && rmsList[lastWin] < endThresh) {
      lastWin--;
    }

    const speechStartSec = firstWin < rmsList.length ? firstWin * 0.02 : 0;
    const speechEndSec = Math.min(
      audioBuf.duration,
      Math.max(speechStartSec + 0.35, (lastWin + 1) * 0.02)
    );

    return {
      speechStartSec,
      speechEndSec,
      durationSec: audioBuf.duration,
    };
  } catch {
    return null;
  }
}

function clampWordIndex(idx: number, wordCount: number): number {
  return Math.min(Math.max(0, wordCount - 1), Math.max(0, idx));
}

function findSegmentWordIndex(
  segments: WordSegment[],
  lookupMs: number,
  wordCount: number
): number {
  if (!segments.length || !wordCount) return 0;
  if (lookupMs <= segments[0].startMs) {
    return clampWordIndex(segments[0].wordIndex, wordCount);
  }
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (lookupMs >= seg.startMs && lookupMs <= seg.endMs) {
      return clampWordIndex(seg.wordIndex, wordCount);
    }
    const next = segments[i + 1];
    if (next && lookupMs > seg.endMs && lookupMs < next.startMs) {
      // Snap cleanly into next word during micro-pauses
      if (lookupMs >= next.startMs - 30) {
        return clampWordIndex(next.wordIndex, wordCount);
      }
      return clampWordIndex(seg.wordIndex, wordCount);
    }
  }
  return clampWordIndex(segments[segments.length - 1].wordIndex, wordCount);
}

function getPhoneticWordWeight(word: WordToken, isLastWord: boolean): number {
  const baseLetters = word.arabic
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .trim();
  let weight = Math.max(2, baseLetters.length);

  const shaddahCount = (word.arabic.match(/\u0651/g) || []).length;
  weight += shaddahCount * 0.85;

  if (word.arabic.includes('آ') || word.arabic.includes('\u0653')) {
    weight += 3.0;
  } else if (word.tajweed === 'madd' || word.arabic.includes('\u0670')) {
    weight += 1.5;
  }

  if (word.tajweed === 'ghunnah') {
    weight += 1.3;
  }

  // Final word typically carries Madd Arid lis-Sukoon or natural pause extension
  if (isLastWord) {
    weight += 2.2;
  }

  return weight;
}

function computeWordIndexFromTemplate(
  ayah: { words: WordToken[] },
  template: VerseTiming,
  currentTime: number,
  duration: number,
  syncOffsetSec: number,
  speechBounds?: SpeechBounds,
  anticipationSec = STREAM_ANTICIPATION_SEC
): number {
  const segs = template.segments;
  if (!segs.length || !ayah.words.length) return 0;
  const safeDur = Math.max(0.5, speechBounds?.durationSec ?? duration);
  const leadPad = speechBounds
    ? speechBounds.speechStartSec
    : Math.min(0.14, safeDur * 0.04);
  const activeEnd = speechBounds
    ? Math.max(leadPad + 0.35, speechBounds.speechEndSec)
    : Math.max(leadPad + 0.35, safeDur - Math.min(0.45, safeDur * 0.11));
  const activeSpan = Math.max(0.35, activeEnd - leadPad);
  const adjustedTime = currentTime + anticipationSec - syncOffsetSec;
  const progress = Math.max(
    0,
    Math.min(0.9999, (adjustedTime - leadPad) / activeSpan)
  );

  const firstStart = segs[0].startMs;
  const lastEnd = segs[segs.length - 1].endMs;
  const spanMs = Math.max(1, lastEnd - firstStart);
  const virtualMs = firstStart + progress * spanMs;

  return findSegmentWordIndex(segs, virtualMs, ayah.words.length);
}

function computeWordIndexFallback(
  ayah: { words: WordToken[] },
  currentTime: number,
  duration: number,
  syncOffsetSec: number,
  speechBounds?: SpeechBounds,
  anticipationSec = STREAM_ANTICIPATION_SEC
): number {
  if (!ayah.words.length) return 0;
  const safeDur = Math.max(0.5, speechBounds?.durationSec ?? duration);
  const leadPad = speechBounds
    ? speechBounds.speechStartSec
    : Math.min(0.14, safeDur * 0.04);
  const activeEnd = speechBounds
    ? Math.max(leadPad + 0.35, speechBounds.speechEndSec)
    : Math.max(leadPad + 0.35, safeDur - Math.min(0.45, safeDur * 0.11));
  const activeSpan = Math.max(0.35, activeEnd - leadPad);
  const adjustedTime = Math.max(
    0,
    currentTime + anticipationSec - syncOffsetSec - leadPad
  );
  const progress = Math.min(0.999, adjustedTime / activeSpan);

  const weights = ayah.words.map((w, idx) =>
    getPhoneticWordWeight(w, idx === ayah.words.length - 1)
  );
  const totalWeight = weights.reduce((acc, v) => acc + v, 0);
  const target = progress * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (target <= cumulative) return i;
  }
  return ayah.words.length - 1;
}

function getSafeViewportBounds(container?: HTMLElement | null) {
  if (container) {
    const cRect = container.getBoundingClientRect();
    const safeTop = cRect.top + 12;
    const safeBottom = cRect.bottom - 12;
    return {
      safeTop,
      safeBottom: Math.max(safeTop + 80, safeBottom),
    };
  }
  const barEl = document.querySelector('[data-docked-bottom-bar="true"]');
  const barTop = barEl ? barEl.getBoundingClientRect().top : window.innerHeight;
  const safeTop = 12;
  const safeBottom = Math.max(safeTop + 80, Math.min(window.innerHeight, barTop) - 12);
  return { safeTop, safeBottom };
}

function scrollElementIntoSafeView(
  el: HTMLElement,
  container?: HTMLElement | null,
  mode: 'auto' | 'focus' = 'auto'
) {
  if (!container || container.scrollHeight <= container.clientHeight + 2) {
    return;
  }
  const rect = el.getBoundingClientRect();
  const { safeTop, safeBottom } = getSafeViewportBounds(container);
  const safeHeight = Math.max(80, safeBottom - safeTop);

  if (mode === 'auto' && rect.top >= safeTop && rect.bottom <= safeBottom) {
    return;
  }

  let delta: number;
  if (rect.height <= safeHeight) {
    const comfortTopOffset = Math.min(
      24,
      Math.max(8, (safeHeight - rect.height) * 0.22)
    );
    delta = rect.top - (safeTop + comfortTopOffset);
  } else {
    delta = rect.top - safeTop;
  }

  container.scrollTo({
    top: Math.max(0, Math.round(container.scrollTop + delta)),
    behavior: 'smooth',
  });
}

export default function App() {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('reader');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('noor_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const raw = localStorage.getItem('noor_settings');
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const raw = localStorage.getItem('noor_bookmarks');
      return raw ? JSON.parse(raw) : INITIAL_BOOKMARKS;
    } catch {
      return INITIAL_BOOKMARKS;
    }
  });

  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('noor_daily_goal');
      return raw ? Number(raw) : 10;
    } catch {
      return 10;
    }
  });

  const [versesRecitedCount, setVersesRecitedCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('noor_daily_progress_v1');
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { date?: string; count?: number };
      if (parsed.date === getLocalDateKey() && typeof parsed.count === 'number') {
        return Math.max(0, parsed.count);
      }
      return 0;
    } catch {
      return 0;
    }
  });

  const [recitationHistory, setRecitationHistory] = useState<RecitationHistoryEntry[]>(
    () => readRecitationHistory()
  );

  const [weakWords, setWeakWords] = useState<HifzWeakWord[]>(() => {
    try {
      const raw = localStorage.getItem('noor_hifz_weak_words_v1');
      return raw ? (JSON.parse(raw) as HifzWeakWord[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('noor_hifz_weak_words_v1', JSON.stringify(weakWords));
    } catch {
      // ignore storage quota errors
    }
  }, [weakWords]);

  const [khatmahPlan, setKhatmahPlan] = useState<KhatmahPlanState>(() => {
    try {
      const raw = localStorage.getItem('noor_khatmah_plan_v1');
      return raw ? { ...DEFAULT_KHATMAH_PLAN, ...JSON.parse(raw) } : DEFAULT_KHATMAH_PLAN;
    } catch {
      return DEFAULT_KHATMAH_PLAN;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('noor_khatmah_plan_v1', JSON.stringify(khatmahPlan));
    } catch {
      // ignore
    }
  }, [khatmahPlan]);

  const [hifzSpacedQueue, setHifzSpacedQueue] = useState<HifzSpacedItem[]>(() => {
    try {
      const raw = localStorage.getItem('noor_hifz_spaced_v1');
      return raw ? (JSON.parse(raw) as HifzSpacedItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('noor_hifz_spaced_v1', JSON.stringify(hifzSpacedQueue));
    } catch {
      // ignore
    }
  }, [hifzSpacedQueue]);

  const [hifzProgressEvents, setHifzProgressEvents] = useState<HifzProgressEvent[]>(
    () => readHifzProgressEvents()
  );

  useEffect(() => {
    saveHifzProgressEvents(hifzProgressEvents);
  }, [hifzProgressEvents]);

  const [bookmarkCollections, setBookmarkCollections] = useState<BookmarkCollection[]>(() => {
    try {
      const raw = localStorage.getItem('noor_bookmark_collections_v1');
      return raw ? (JSON.parse(raw) as BookmarkCollection[]) : DEFAULT_BOOKMARK_COLLECTIONS;
    } catch {
      return DEFAULT_BOOKMARK_COLLECTIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('noor_bookmark_collections_v1', JSON.stringify(bookmarkCollections));
    } catch {
      // ignore
    }
  }, [bookmarkCollections]);

  // Google Drive Auth & Study Backup State (access token stays in memory only)
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState<boolean>(true);
  const [isDriveSigningIn, setIsDriveSigningIn] = useState<boolean>(false);
  const [driveAuthError, setDriveAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveAccessToken(token);
        setNeedsDriveAuth(false);
        setDriveAuthError(null);
      },
      (existingUser) => {
        setDriveUser(existingUser);
        setDriveAccessToken(null);
        setNeedsDriveAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleDriveSignIn = useCallback(async () => {
    setIsDriveSigningIn(true);
    setDriveAuthError(null);
    try {
      const result = await googleDriveSignIn();
      if (result) {
        setDriveUser(result.user);
        setDriveAccessToken(result.accessToken);
        setNeedsDriveAuth(false);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or could not complete.';
      setDriveAuthError(msg);
      setNeedsDriveAuth(true);
    } finally {
      setIsDriveSigningIn(false);
    }
  }, []);

  const handleDriveTokenExpired = useCallback(() => {
    clearDriveAccessToken();
    setDriveAccessToken(null);
    setNeedsDriveAuth(true);
  }, []);

  const handleDriveSignOut = useCallback(async () => {
    await googleDriveSignOut();
    setDriveUser(null);
    setDriveAccessToken(null);
    setNeedsDriveAuth(true);
    setDriveAuthError(null);
  }, []);

  const driveBackupPayload = useMemo<NoorDriveBackupPayload>(
    () => ({
      app: 'Noor Recite',
      version: 1,
      exportedAt: new Date().toISOString(),
      accountEmail: driveUser?.email || undefined,
      settings,
      darkMode,
      dailyGoal,
      bookmarks,
      bookmarkCollections,
      khatmahPlan,
      hifzSpacedQueue,
      hifzWeakWords: weakWords,
      recitationHistory,
      hifzProgressEvents,
    }),
    [
      driveUser,
      settings,
      darkMode,
      dailyGoal,
      bookmarks,
      bookmarkCollections,
      khatmahPlan,
      hifzSpacedQueue,
      weakWords,
      recitationHistory,
      hifzProgressEvents,
    ]
  );

  const handleRestoreDriveBackup = useCallback(
    (payload: NoorDriveBackupPayload) => {
      if (payload.settings) {
        failedLangOverlayRef.current.clear();
        setSettings({ ...DEFAULT_SETTINGS, ...payload.settings });
      }
      if (typeof payload.darkMode === 'boolean') {
        setDarkMode(payload.darkMode);
      }
      if (typeof payload.dailyGoal === 'number' && payload.dailyGoal > 0) {
        setDailyGoal(payload.dailyGoal);
      }
      if (Array.isArray(payload.bookmarks)) {
        setBookmarks(payload.bookmarks);
      }
      if (Array.isArray(payload.bookmarkCollections)) {
        setBookmarkCollections(payload.bookmarkCollections);
      }
      if (payload.khatmahPlan) {
        setKhatmahPlan({ ...DEFAULT_KHATMAH_PLAN, ...payload.khatmahPlan });
      }
      if (Array.isArray(payload.hifzSpacedQueue)) {
        setHifzSpacedQueue(payload.hifzSpacedQueue);
      }
      if (Array.isArray(payload.hifzWeakWords)) {
        setWeakWords(payload.hifzWeakWords);
      }
      if (Array.isArray(payload.recitationHistory)) {
        setRecitationHistory(payload.recitationHistory);
        saveRecitationHistory(payload.recitationHistory);
      }
      if (Array.isArray(payload.hifzProgressEvents)) {
        setHifzProgressEvents(payload.hifzProgressEvents);
      }
    },
    []
  );

  const [tajweedInitialTab, setTajweedInitialTab] = useState<'rules' | 'grader' | 'qiraat'>('rules');
  const [tajweedInitialTarget, setTajweedInitialTarget] = useState<{
    surahId: number;
    ayahNumber: number;
  } | null>(null);

  const bookmarkedKeys = useMemo(
    () => new Set(bookmarks.map((b) => b.verseKey)),
    [bookmarks]
  );

  // Surah Cache (starts with all bundled featured surahs, expands dynamically if user picks from full directory)
  const [surahCache, setSurahCache] = useState<Record<number, Surah>>(() => {
    const map: Record<number, Surah> = {};
    for (const s of FEATURED_SURAHS) map[s.id] = s;
    return map;
  });

  const cachedSurahsList = useMemo(() => Object.values(surahCache), [surahCache]);

  // Real millisecond word-timing segments cache keyed by `${quranComId}-${surahId}`
  const [chapterTimingCache, setChapterTimingCache] = useState<
    Record<string, ChapterAudioData>
  >({});
  const fetchingTimingsRef = useRef<Set<string>>(new Set());

  const [activeSurahId, setActiveSurahId] = useState<number>(1);
  const [activeAyahNumber, setActiveAyahNumber] = useState<number>(1);
  const [selectedWordId, setSelectedWordId] = useState<string | null>('1-1-3');
  const [inspectedAyahNumber, setInspectedAyahNumber] = useState<number>(1);

  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loadingSurahId, setLoadingSurahId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDailyReminder, setShowDailyReminder] = useState<boolean>(() => {
    if (versesRecitedCount > 0) return false;
    try {
      return sessionStorage.getItem('noor_reminder_dismissed_v1') !== '1';
    } catch {
      return true;
    }
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [openerPhase, setOpenerPhase] = useState<OpenerPhase | null>(null);
  const [audioMode, setAudioMode] = useState<'stream' | 'study-sync'>('stream');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5.5);
  const [syncedWordIndex, setSyncedWordIndex] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const verseTransitionDelayMsRef = useRef<number>(0);
  const countedVersesRef = useRef<Set<string>>(
    (() => {
      try {
        const raw = localStorage.getItem('noor_daily_progress_v1');
        if (!raw) return new Set<string>();
        const parsed = JSON.parse(raw) as { date?: string; verseKeys?: string[] };
        if (parsed.date === getLocalDateKey() && Array.isArray(parsed.verseKeys)) {
          return new Set<string>(parsed.verseKeys);
        }
        return new Set<string>();
      } catch {
        return new Set<string>();
      }
    })()
  );
  const loadedSourceTagRef = useRef<string>('');
  const lastAyahTagRef = useRef<string>('');
  const pendingSeekSecRef = useRef<number | null>(null);
  const latestRelTimeRef = useRef<number>(0);
  const completionLockKeyRef = useRef<string | null>(null);
  const playbackSessionRef = useRef<number>(0);
  const lastSyncedWordRef = useRef<number | null>(null);
  const lastUiClockUpdateRef = useRef<number>(0);
  const speechBoundsMapRef = useRef<Record<string, SpeechBounds>>({});
  const fetchingBoundsRef = useRef<Set<string>>(new Set());
  const fetchingLangOverlayRef = useRef<Set<string>>(new Set());
  const failedLangOverlayRef = useRef<Set<string>>(new Set());
  const fetchingWarshRef = useRef<Set<number>>(new Set());
  const failedWarshRef = useRef<Set<number>>(new Set());

  const activeTranslationLang: TranslationLanguage = settings.translationLanguage ?? 'en';

  const activeSurah = surahCache[activeSurahId] ?? FEATURED_SURAHS[0];
  const activeAyah = useMemo(
    () =>
      activeSurah.ayahs.find((a) => a.number === activeAyahNumber) ??
      activeSurah.ayahs[0],
    [activeSurah, activeAyahNumber]
  );

  const inspectedAyah = useMemo(
    () =>
      activeSurah.ayahs.find((a) => a.number === inspectedAyahNumber) ??
      activeAyah,
    [activeSurah, inspectedAyahNumber, activeAyah]
  );

  const selectedWord = useMemo(() => {
    if (!selectedWordId) return null;
    for (const a of activeSurah.ayahs) {
      const found = a.words.find((w) => w.id === selectedWordId);
      if (found) return found;
    }
    return null;
  }, [activeSurah, selectedWordId]);

  const activeReciter = useMemo(
    () => RECITERS.find((r) => r.id === settings.reciterId) ?? RECITERS[0],
    [settings.reciterId]
  );

  // Fetch exact Quran.com word timing segments for active surah + reciter (or reciter 7 Murattal template for Saad Al-Ghamdi)
  useEffect(() => {
    const targetQuranComId = activeReciter.quranComId ?? 7;
    const cacheKey = `${targetQuranComId}-${activeSurah.id}`;
    if (chapterTimingCache[cacheKey] || fetchingTimingsRef.current.has(cacheKey)) {
      return;
    }

    let cancelled = false;
    fetchingTimingsRef.current.add(cacheKey);
    fetchChapterTimingData(targetQuranComId, activeSurah.id)
      .then((data) => {
        if (!cancelled) {
          setChapterTimingCache((prev) => ({ ...prev, [cacheKey]: data }));
        }
      })
      .catch(() => {
        // Fallback to phonetic weights cleanly if offline or API unavailable
      })
      .finally(() => {
        fetchingTimingsRef.current.delete(cacheKey);
      });

    return () => {
      cancelled = true;
    };
  }, [activeReciter.quranComId, activeSurah.id, chapterTimingCache]);

  // Hydrate localized verse translations, word glosses, and aligned segments without interrupting playback
  useEffect(() => {
    if (activeTranslationLang === 'en') return;
    const surahId = activeSurah.id;
    const targetLang = activeTranslationLang;
    const needsHydration = activeSurah.ayahs.some((a) => {
      const hasVerseText =
        Boolean(a.translations?.[targetLang]) ||
        (targetLang === 'hi' && Boolean(a.translationHi)) ||
        (targetLang === 'ur' && Boolean(a.translationUr));
      const hasSegs = Boolean(getAyahTranslationSegments(a, targetLang)?.length);
      const needsWordGloss =
        targetLang !== 'ff' &&
        targetLang !== 'ha' &&
        a.words.some((w) => !hasLocalizedWordMeaning(w, targetLang));
      return !hasVerseText || !hasSegs || needsWordGloss;
    });
    if (!needsHydration) return;

    const reqKey = `${surahId}:${targetLang}`;
    if (
      fetchingLangOverlayRef.current.has(reqKey) ||
      failedLangOverlayRef.current.has(reqKey)
    ) {
      return;
    }

    let cancelled = false;
    fetchingLangOverlayRef.current.add(reqKey);

    fetchSurahLanguageOverlay(surahId, targetLang, activeSurah.ayahs)
      .then((overlay) => {
        if (cancelled) return;
        setSurahCache((prev) => {
          const current = prev[surahId];
          if (!current) return prev;
          const updatedAyahs = current.ayahs.map((a) => {
            const vData = overlay.versesByNumber[a.number];
            if (!vData) return a;
            const updatedWords = a.words.map((w, wIdx) => {
              const gloss = vData.wordMeanings?.[wIdx];
              if (!gloss) return w;
              return {
                ...w,
                ...(targetLang === 'hi' ? { meaningHi: w.meaningHi || gloss } : {}),
                ...(targetLang === 'ur' ? { meaningUr: w.meaningUr || gloss } : {}),
                meanings: {
                  ...w.meanings,
                  [targetLang]: w.meanings?.[targetLang] || gloss,
                },
              };
            });

            const existingText =
              a.translations?.[targetLang] ||
              (targetLang === 'hi' ? a.translationHi : targetLang === 'ur' ? a.translationUr : undefined);
            const resolvedText =
              existingText ||
              vData.translation ||
              (targetLang === 'hi' ? vData.translationHi : targetLang === 'ur' ? vData.translationUr : undefined);

            const existingSegs = getAyahTranslationSegments(a, targetLang);
            const computedSegs =
              existingSegs && existingSegs.length > 0
                ? existingSegs
                : resolvedText
                ? alignTranslationSegments(resolvedText, updatedWords, targetLang)
                : undefined;

            return {
              ...a,
              words: updatedWords,
              ...(targetLang === 'hi' && resolvedText ? { translationHi: resolvedText } : {}),
              ...(targetLang === 'ur' && resolvedText ? { translationUr: resolvedText } : {}),
              translations: resolvedText
                ? { ...a.translations, [targetLang]: resolvedText }
                : a.translations,
              ...(targetLang === 'hi' && computedSegs ? { translationSegmentsHi: computedSegs } : {}),
              ...(targetLang === 'ur' && computedSegs ? { translationSegmentsUr: computedSegs } : {}),
              translationSegmentsByLang: computedSegs
                ? { ...a.translationSegmentsByLang, [targetLang]: computedSegs }
                : a.translationSegmentsByLang,
            };
          });
          return {
            ...prev,
            [surahId]: {
              ...current,
              ayahs: updatedAyahs,
            },
          };
        });
      })
      .catch(() => {
        failedLangOverlayRef.current.add(reqKey);
      })
      .finally(() => {
        fetchingLangOverlayRef.current.delete(reqKey);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSurah, activeTranslationLang]);

  // Hydrate authentic Warsh 'an Nafi' text across all 114 surahs when Warsh Riwayah is active
  useEffect(() => {
    if ((settings.riwayah ?? 'hafs') !== 'warsh') return;

    const candidateSurahs =
      activeScreen === 'hifz' || activeScreen === 'tajweed'
        ? [activeSurah, ...Object.values(surahCache).filter((s) => s.id !== activeSurah.id)]
        : [activeSurah];

    const targets = candidateSurahs.filter(
      (s) =>
        s.ayahs.some((a) => !a.arabicWarsh) &&
        !fetchingWarshRef.current.has(s.id) &&
        !failedWarshRef.current.has(s.id)
    );
    if (targets.length === 0) return;

    let cancelled = false;
    for (const target of targets) {
      const surahId = target.id;
      fetchingWarshRef.current.add(surahId);
      fetchSurahWarshOverlay(surahId)
        .then((overlay) => {
          if (cancelled) return;
          setSurahCache((prev) => {
            const current = prev[surahId];
            if (!current) return prev;
            const updatedAyahs = current.ayahs.map((a) => {
              const warshArabic = overlay.versesByNumber[a.number];
              if (!warshArabic) return a;
              const alignedWords = alignWarshWordsToHafs(warshArabic, a.words);
              return {
                ...a,
                arabicWarsh: warshArabic,
                words: a.words.map((w, wIdx) => ({
                  ...w,
                  arabicWarsh: alignedWords[wIdx] ?? w.arabic,
                })),
              };
            });
            return {
              ...prev,
              [surahId]: {
                ...current,
                ayahs: updatedAyahs,
              },
            };
          });
        })
        .catch(() => {
          failedWarshRef.current.add(surahId);
        })
        .finally(() => {
          fetchingWarshRef.current.delete(surahId);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [settings.riwayah, activeSurah, activeScreen, surahCache]);

  const reciterChapterData = activeReciter.quranComId
    ? chapterTimingCache[`${activeReciter.quranComId}-${activeSurah.id}`]
    : undefined;
  const activeVerseTiming = reciterChapterData?.versesByKey[activeAyah.verseKey];
  const activeAyahIdx = useMemo(
    () => activeSurah.ayahs.findIndex((a) => a.number === activeAyah.number),
    [activeSurah.ayahs, activeAyah.number]
  );
  const nextAyahObj =
    activeAyahIdx >= 0 && activeAyahIdx < activeSurah.ayahs.length - 1
      ? activeSurah.ayahs[activeAyahIdx + 1]
      : null;
  const isChapterAudioMode = Boolean(
    activeReciter.quranComId &&
      reciterChapterData &&
      activeVerseTiming &&
      activeVerseTiming.segments.length > 0
  );
  const murattalTemplateTiming =
    chapterTimingCache[`7-${activeSurah.id}`]?.versesByKey[activeAyah.verseKey];
  const murattalBasmalahTiming =
    chapterTimingCache['7-1']?.versesByKey['1:1'] ?? BASMALAH_FALLBACK_TEMPLATE;

  // Ensure exact chapter 1 timings are available for Basmalah opener proportions
  useEffect(() => {
    const key = '7-1';
    if (chapterTimingCache[key] || fetchingTimingsRef.current.has(key)) return;
    fetchingTimingsRef.current.add(key);
    fetchChapterTimingData(7, 1)
      .then((data) => {
        setChapterTimingCache((prev) => ({ ...prev, [key]: data }));
      })
      .catch(() => {})
      .finally(() => {
        fetchingTimingsRef.current.delete(key);
      });
  }, [chapterTimingCache]);

  const activeEveryAyahUrl = useMemo(() => {
    if (openerPhase !== null) {
      return getOpenerAudioUrl(activeReciter, openerPhase);
    }
    return getEveryAyahUrl(
      activeReciter.everyAyahFolder,
      activeSurah.id,
      activeAyah.number
    );
  }, [openerPhase, activeReciter, activeSurah.id, activeAyah.number]);

  // Pre-detect exact speech onset & end silence of standalone MP3s (Saad Al-Ghamdi & openers)
  useEffect(() => {
    const urlsToWarm: string[] = [
      getOpenerAudioUrl(activeReciter, 'istiadhah'),
    ];
    if (activeSurah.hasBismillah) {
      urlsToWarm.push(getOpenerAudioUrl(activeReciter, 'basmalah'));
    }

    if (openerPhase !== null || !isChapterAudioMode) {
      urlsToWarm.push(activeEveryAyahUrl);
      if (openerPhase !== null) {
        urlsToWarm.push(
          getEveryAyahUrl(activeReciter.everyAyahFolder, activeSurah.id, 1)
        );
      } else {
        const idx = activeSurah.ayahs.findIndex(
          (a) => a.number === activeAyah.number
        );
        if (idx >= 0 && idx < activeSurah.ayahs.length - 1) {
          urlsToWarm.push(
            getEveryAyahUrl(
              activeReciter.everyAyahFolder,
              activeSurah.id,
              activeSurah.ayahs[idx + 1].number
            )
          );
        }
      }
    }

    for (const url of urlsToWarm) {
      if (speechBoundsMapRef.current[url] || fetchingBoundsRef.current.has(url)) {
        continue;
      }
      fetchingBoundsRef.current.add(url);
      void analyzeSpeechBounds(url)
        .then((bounds) => {
          if (bounds) {
            speechBoundsMapRef.current[url] = bounds;
          }
        })
        .finally(() => {
          fetchingBoundsRef.current.delete(url);
        });
    }
  }, [
    openerPhase,
    isChapterAudioMode,
    activeEveryAyahUrl,
    activeReciter,
    activeSurah,
    activeAyah.number,
  ]);

  // Pre-cache the whole Surah audio (openers + full chapter MP3 or all EveryAyah verse MP3s) in RAM + Cache Storage
  useEffect(() => {
    const controller = new AbortController();
    const openerUrls: string[] = [
      getOpenerAudioUrl(activeReciter, 'istiadhah'),
    ];
    if (activeSurah.hasBismillah) {
      openerUrls.push(getOpenerAudioUrl(activeReciter, 'basmalah'));
    }

    // Wait briefly if this reciter uses Quran.com chapter audio and chapter data is still loading
    if (activeReciter.quranComId && !reciterChapterData) {
      void prefetchSurahAudio({
        openerUrls,
        ayahUrls: [],
        priorityAyahIndex: 0,
        signal: controller.signal,
      });
      return () => controller.abort();
    }

    const chapterAudioUrl =
      activeReciter.quranComId && reciterChapterData?.audioUrl
        ? reciterChapterData.audioUrl
        : undefined;

    const ayahUrls = chapterAudioUrl
      ? []
      : activeSurah.ayahs.map((a) =>
          getEveryAyahUrl(activeReciter.everyAyahFolder, activeSurah.id, a.number)
        );

    const priorityIdx = Math.max(
      0,
      activeSurah.ayahs.findIndex((a) => a.number === activeAyah.number)
    );

    void prefetchSurahAudio({
      openerUrls,
      chapterAudioUrl,
      ayahUrls,
      priorityAyahIndex: priorityIdx,
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [
    activeReciter,
    activeSurah.id,
    activeSurah.hasBismillah,
    activeSurah.ayahs,
    reciterChapterData,
    activeAyah.number,
  ]);

  // Preload the next uncached verse / opener audio file via secondary <audio> element
  useEffect(() => {
    const preloader = preloadAudioRef.current;
    if (!preloader) return;

    let nextUrl = '';
    if (openerPhase === 'istiadhah') {
      nextUrl = activeSurah.hasBismillah
        ? getOpenerAudioUrl(activeReciter, 'basmalah')
        : reciterChapterData?.audioUrl ??
          getEveryAyahUrl(activeReciter.everyAyahFolder, activeSurah.id, 1);
    } else if (openerPhase === 'basmalah') {
      nextUrl =
        reciterChapterData?.audioUrl ??
        getEveryAyahUrl(activeReciter.everyAyahFolder, activeSurah.id, 1);
    } else if (!isChapterAudioMode && nextAyahObj) {
      nextUrl = getEveryAyahUrl(
        activeReciter.everyAyahFolder,
        activeSurah.id,
        nextAyahObj.number
      );
    }

    if (nextUrl && !isAudioCached(nextUrl) && preloader.src !== nextUrl) {
      preloader.src = nextUrl;
    }
  }, [
    openerPhase,
    activeSurah.id,
    activeSurah.hasBismillah,
    activeReciter,
    reciterChapterData?.audioUrl,
    isChapterAudioMode,
    nextAyahObj,
  ]);

  // Clear completion lock whenever active Surah, Ayah, or Opener changes
  useEffect(() => {
    completionLockKeyRef.current = null;
  }, [activeSurah.id, activeAyah.verseKey, openerPhase]);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('noor_dark_mode', String(darkMode));
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('noor_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('noor_bookmarks', JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem('noor_daily_goal', String(dailyGoal));
    } catch {
      // ignore
    }
  }, [dailyGoal]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'noor_daily_progress_v1',
        JSON.stringify({
          date: getLocalDateKey(),
          count: versesRecitedCount,
          verseKeys: Array.from(countedVersesRef.current),
        })
      );
    } catch {
      // ignore
    }
  }, [versesRecitedCount]);

  useEffect(() => {
    saveRecitationHistory(recitationHistory);
  }, [recitationHistory]);

  const recordVerseRecitation = useCallback(
    (surahId: number, surahName: string, verseKey: string, durationSec: number) => {
      const safeDur = Math.max(1, Math.round(durationSec));
      const entry: RecitationHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: getLocalDateKey(),
        surahId,
        surahName,
        verseKey,
        durationSec: safeDur,
        timestamp: Date.now(),
      };
      setRecitationHistory((prev) => {
        const next = [...prev, entry];
        return next.length > 5000 ? next.slice(next.length - 5000) : next;
      });
    },
    []
  );

  const recordHifzProgress = useCallback(
    (
      verseKey: string,
      surahId: number,
      status: HifzProgressStatus,
      stage: 1 | 2 | 3 | 4 | 5
    ) => {
      const todayKey = getLocalDateKey();
      setHifzProgressEvents((prev) => {
        const alreadyLogged = prev.some(
          (ev) =>
            ev.date === todayKey &&
            ev.verseKey === verseKey &&
            ev.status === status &&
            ev.stage >= stage
        );
        if (alreadyLogged) return prev;
        const entry: HifzProgressEvent = {
          id: `hifz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: todayKey,
          verseKey,
          surahId,
          status,
          stage,
          timestamp: Date.now(),
        };
        const next = [...prev, entry];
        return next.length > 4000 ? next.slice(next.length - 4000) : next;
      });
    },
    []
  );

  const dismissDailyReminder = useCallback(() => {
    setShowDailyReminder(false);
    try {
      sessionStorage.setItem('noor_reminder_dismissed_v1', '1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (showDailyReminder && (versesRecitedCount > 0 || isPlaying)) {
      dismissDailyReminder();
    }
  }, [showDailyReminder, versesRecitedCount, isPlaying, dismissDailyReminder]);

  // Clear fallback study timer
  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    verseTransitionDelayMsRef.current = 0;
    if (audioRef.current) {
      audioRef.current.volume = 1;
    }
  }, []);

  // Synchronously prime & start <audio> inside user gesture handlers so browsers never block playback
  const primeAudioForVerse = useCallback(
    (surahId: number, ayahNumber: number, seekRelSec = 0) => {
      clearTransitionTimer();
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = 1;

      const chData = activeReciter.quranComId
        ? chapterTimingCache[`${activeReciter.quranComId}-${surahId}`]
        : undefined;
      const vTiming = chData?.versesByKey[`${surahId}:${ayahNumber}`];
      const useChapter = Boolean(
        activeReciter.quranComId &&
          chData &&
          vTiming &&
          vTiming.segments.length > 0
      );

      if (useChapter && chData && vTiming) {
        const targetAbsSec =
          vTiming.timestampFromMs / 1000 + Math.max(0, seekRelSec);
        const sourceTag = `chapter:${activeReciter.id}:${surahId}`;
        const playableSrc = getCachedAudioSrc(chData.audioUrl);
        if (loadedSourceTagRef.current !== sourceTag || !audio.src) {
          pendingSeekSecRef.current = targetAbsSec;
          audio.src = playableSrc;
          loadedSourceTagRef.current = sourceTag;
          audio.load();
        } else if (audio.readyState >= 1) {
          audio.currentTime = targetAbsSec;
          pendingSeekSecRef.current = null;
        } else {
          pendingSeekSecRef.current = targetAbsSec;
        }
        lastAyahTagRef.current = `ch:${activeReciter.id}:${surahId}:${ayahNumber}`;
      } else {
        const remoteUrl = getEveryAyahUrl(
          activeReciter.everyAyahFolder,
          surahId,
          ayahNumber
        );
        const playableSrc = getCachedAudioSrc(remoteUrl);
        const sourceTag = `ayah:${activeReciter.id}:${surahId}:${ayahNumber}`;
        const startSec =
          seekRelSec > 0
            ? seekRelSec
            : getSafeLeadTrimSec(speechBoundsMapRef.current[remoteUrl]);
        if (loadedSourceTagRef.current !== sourceTag || !audio.src) {
          pendingSeekSecRef.current = startSec > 0 ? startSec : null;
          audio.src = playableSrc;
          loadedSourceTagRef.current = sourceTag;
          audio.load();
        } else if (audio.readyState >= 1) {
          audio.currentTime = startSec;
          pendingSeekSecRef.current = null;
        } else {
          pendingSeekSecRef.current = startSec > 0 ? startSec : null;
        }
        lastAyahTagRef.current = `ea:${activeReciter.id}:${surahId}:${ayahNumber}`;
      }

      audio.playbackRate = settings.playbackSpeed;
      setAudioMode('stream');
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setAudioMode('stream');
          })
          .catch(() => {
            // useEffect handles fallback cleanly if playback cannot start
          });
      }
    },
    [
      clearTransitionTimer,
      activeReciter.id,
      activeReciter.quranComId,
      activeReciter.everyAyahFolder,
      chapterTimingCache,
      settings.playbackSpeed,
    ]
  );

  const activeOpener =
    openerPhase === 'istiadhah'
      ? ISTIADHAH_OPENER
      : openerPhase === 'basmalah'
      ? BASMALAH_OPENER
      : null;

  const primeAudioForOpener = useCallback(
    (phase: OpenerPhase, seekRelSec = 0) => {
      clearTransitionTimer();
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = 1;

      const remoteUrl = getOpenerAudioUrl(activeReciter, phase);
      const playableSrc = getCachedAudioSrc(remoteUrl);
      const sourceTag = `opener:${activeReciter.id}:${phase}`;
      const startSec =
        seekRelSec > 0
          ? seekRelSec
          : getSafeLeadTrimSec(speechBoundsMapRef.current[remoteUrl]);
      if (loadedSourceTagRef.current !== sourceTag || !audio.src) {
        pendingSeekSecRef.current = startSec > 0 ? startSec : null;
        audio.src = playableSrc;
        loadedSourceTagRef.current = sourceTag;
        audio.load();
      } else if (audio.readyState >= 1) {
        audio.currentTime = startSec;
        pendingSeekSecRef.current = null;
      } else {
        pendingSeekSecRef.current = startSec > 0 ? startSec : null;
      }
      lastAyahTagRef.current = `op:${activeReciter.id}:${phase}`;
      audio.playbackRate = settings.playbackSpeed;
      setAudioMode('stream');
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setAudioMode('stream'))
          .catch(() => {});
      }
    },
    [clearTransitionTimer, activeReciter, settings.playbackSpeed]
  );

  // Advance through Opener (Isti'adhah -> Basmalah) -> Ayah 1 -> ... or repeat on completion
  const handleAyahCompleted = useCallback(() => {
    if (openerPhase === 'istiadhah') {
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = 0;
      pendingSeekSecRef.current = null;
      setSyncedWordIndex(0);
      setCurrentTime(0);
      verseTransitionDelayMsRef.current = 80;
      if (activeSurah.hasBismillah) {
        setOpenerPhase('basmalah');
        setDuration(BASMALAH_OPENER.durationSec);
      } else {
        const firstAyah = activeSurah.ayahs[0];
        setOpenerPhase(null);
        setActiveAyahNumber(firstAyah.number);
        setInspectedAyahNumber(firstAyah.number);
        setSelectedWordId(firstAyah.words[0]?.id ?? null);
        setDuration(firstAyah.durationSec);
      }
      return;
    }

    if (openerPhase === 'basmalah') {
      const firstAyah = activeSurah.ayahs[0];
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = 0;
      pendingSeekSecRef.current = null;
      setSyncedWordIndex(0);
      setCurrentTime(0);
      verseTransitionDelayMsRef.current = 80;
      setOpenerPhase(null);
      setActiveAyahNumber(firstAyah.number);
      setInspectedAyahNumber(firstAyah.number);
      setSelectedWordId(firstAyah.words[0]?.id ?? null);
      setDuration(firstAyah.durationSec);
      return;
    }

    const key = `${activeSurah.id}:${activeAyah.number}`;
    if (!countedVersesRef.current.has(key)) {
      countedVersesRef.current.add(key);
      setVersesRecitedCount((c) => c + 1);
    }
    const recitedDurSec =
      isChapterAudioMode && activeVerseTiming
        ? Math.max(
            1,
            (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
              1000
          )
        : audioRef.current &&
          Number.isFinite(audioRef.current.duration) &&
          audioRef.current.duration > 0
        ? audioRef.current.duration
        : activeAyah.durationSec || duration;
    recordVerseRecitation(
      activeSurah.id,
      activeSurah.nameSimple,
      activeAyah.verseKey,
      recitedDurSec
    );

    if (settings.repeatMode === 'ayah') {
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = 0;
      setSyncedWordIndex(0);
      setCurrentTime(0);
      if (audioRef.current && audioMode === 'stream') {
        const audio = audioRef.current;
        const usingChapter =
          isChapterAudioMode &&
          loadedSourceTagRef.current === `chapter:${activeReciter.id}:${activeSurah.id}`;
        const everyAyahRemoteUrl = getEveryAyahUrl(
          activeReciter.everyAyahFolder,
          activeSurah.id,
          activeAyah.number
        );
        const restartSec =
          usingChapter && activeVerseTiming
            ? activeVerseTiming.timestampFromMs / 1000
            : getSafeLeadTrimSec(speechBoundsMapRef.current[everyAyahRemoteUrl]);
        clearTransitionTimer();
        audio.pause();
        audio.volume = 1;
        transitionTimerRef.current = window.setTimeout(() => {
          transitionTimerRef.current = null;
          if (restartSec > 0) {
            pendingSeekSecRef.current = restartSec;
          }
          if (audio.readyState >= 1) {
            audio.currentTime = restartSec;
            pendingSeekSecRef.current = null;
          }
          completionLockKeyRef.current = null;
          audio.playbackRate = settings.playbackSpeed;
          audio
            .play()
            .then(() => {
              audio.playbackRate = settings.playbackSpeed;
              audio.volume = 1;
            })
            .catch(() => {
              audio.volume = 1;
              setAudioMode('study-sync');
            });
        }, Math.max(120, (settings.reflectionDelaySec ?? 0) * 1000));
      } else {
        completionLockKeyRef.current = null;
      }
      return;
    }

    const currentIdx = activeSurah.ayahs.findIndex(
      (a) => a.number === activeAyah.number
    );
    if (currentIdx >= 0 && currentIdx < activeSurah.ayahs.length - 1) {
      const nextAyah = activeSurah.ayahs[currentIdx + 1];
      const alreadyStreamingChapter =
        isChapterAudioMode &&
        loadedSourceTagRef.current === `chapter:${activeReciter.id}:${activeSurah.id}`;
      pendingSeekSecRef.current = null;
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = 0;
      setActiveAyahNumber(nextAyah.number);
      setInspectedAyahNumber(nextAyah.number);
      setSelectedWordId(nextAyah.words[0]?.id ?? null);
      setSyncedWordIndex(0);
      setCurrentTime(0);
      const reflectionMs = (settings.reflectionDelaySec ?? 0) * 1000;
      if (alreadyStreamingChapter) {
        // Continuous chapter MP3 flows seamlessly unless user enabled a reflection pause between Ayahs
        verseTransitionDelayMsRef.current = reflectionMs;
      } else {
        const nextRemoteUrl = getEveryAyahUrl(
          activeReciter.everyAyahFolder,
          activeSurah.id,
          nextAyah.number
        );
        // Cached Blob URLs need only a minimal breath pause (35ms); fallback slightly higher if still fetching
        verseTransitionDelayMsRef.current =
          reflectionMs > 0 ? reflectionMs : isAudioCached(nextRemoteUrl) ? 35 : 70;
        setDuration(nextAyah.durationSec);
      }
    } else if (settings.repeatMode === 'surah') {
      const firstAyah = activeSurah.ayahs[0];
      pendingSeekSecRef.current = null;
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = 0;
      setSyncedWordIndex(0);
      setCurrentTime(0);
      verseTransitionDelayMsRef.current = 150;
      setOpenerPhase('istiadhah');
      setActiveAyahNumber(firstAyah.number);
      setInspectedAyahNumber(firstAyah.number);
      setSelectedWordId(firstAyah.words[0]?.id ?? null);
      setDuration(ISTIADHAH_OPENER.durationSec);
    } else {
      clearTransitionTimer();
      setIsPlaying(false);
      setOpenerPhase(null);
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = null;
      setSyncedWordIndex(null);
      setCurrentTime(0);
    }
  }, [
    openerPhase,
    activeSurah,
    activeAyah,
    activeReciter.id,
    activeReciter.everyAyahFolder,
    settings.repeatMode,
    settings.playbackSpeed,
    settings.reflectionDelaySec,
    audioMode,
    isChapterAudioMode,
    activeVerseTiming,
    duration,
    recordVerseRecitation,
    clearTransitionTimer,
  ]);

  // Keep a ref to latest completion handler so intervals/listeners don't go stale
  const completionRef = useRef(handleAyahCompleted);
  useEffect(() => {
    completionRef.current = handleAyahCompleted;
  }, [handleAyahCompleted]);

  // Autoscroll active Ayah or opener card cleanly inside the unobstructed <main> pane above the bottom bar
  useEffect(() => {
    if (!isPlaying || activeScreen !== 'reader') return;
    const container = mainScrollRef.current;
    const runScroll = () => {
      if (openerPhase !== null) {
        const openerEl = document.getElementById(`opener-${openerPhase}`);
        if (openerEl) {
          scrollElementIntoSafeView(openerEl, container, 'auto');
        } else if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      const el = document.getElementById(`ayah-${activeAyah.number}`);
      if (el) {
        scrollElementIntoSafeView(el, container, 'auto');
      }
    };
    const raf = window.requestAnimationFrame(runScroll);
    const settleTimer = window.setTimeout(runScroll, 90);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
    };
  }, [activeAyah.number, openerPhase, isPlaying, activeScreen]);

  // For extra-long verses that exceed the visible <main> height, keep the active word clear inside <main>
  useEffect(() => {
    if (
      !isPlaying ||
      activeScreen !== 'reader' ||
      openerPhase !== null ||
      syncedWordIndex === null
    ) {
      return;
    }
    const container = mainScrollRef.current;
    const cardEl = document.getElementById(`ayah-${activeAyah.number}`);
    if (!cardEl || !container || container.scrollHeight <= container.clientHeight + 2) return;
    const { safeTop, safeBottom } = getSafeViewportBounds(container);
    const cardRect = cardEl.getBoundingClientRect();
    if (cardRect.top >= safeTop && cardRect.bottom <= safeBottom) {
      return;
    }
    const wordEl = cardEl.querySelector('[data-active-word="true"]') as HTMLElement | null;
    if (!wordEl) return;
    const wordRect = wordEl.getBoundingClientRect();
    if (wordRect.bottom > safeBottom - 10) {
      const delta = wordRect.top - (safeTop + (safeBottom - safeTop) * 0.38);
      container.scrollTo({
        top: Math.max(0, Math.round(container.scrollTop + delta)),
        behavior: 'smooth',
      });
    } else if (wordRect.top < safeTop + 6) {
      const delta = wordRect.top - (safeTop + 18);
      container.scrollTo({
        top: Math.max(0, Math.round(container.scrollTop + delta)),
        behavior: 'smooth',
      });
    }
  }, [isPlaying, activeScreen, openerPhase, activeAyah.number, syncedWordIndex]);

  // Pure synchronous word-index computation called at 60fps with zero extra React renders
  const computeWordAtClock = useCallback(
    (relTimeSec: number, durSec: number, anticipationScale = 1): number => {
      const streamAnt = STREAM_ANTICIPATION_SEC * anticipationScale;
      const chapterAntMs = CHAPTER_ANTICIPATION_MS * anticipationScale;
      const speechBounds = speechBoundsMapRef.current[activeEveryAyahUrl];

      if (openerPhase === 'istiadhah') {
        return computeWordIndexFromTemplate(
          ISTIADHAH_OPENER,
          ISTIADHAH_TEMPLATE,
          relTimeSec,
          durSec || ISTIADHAH_OPENER.durationSec,
          settings.syncOffsetSec,
          speechBounds,
          streamAnt
        );
      }

      if (openerPhase === 'basmalah') {
        return computeWordIndexFromTemplate(
          BASMALAH_OPENER,
          murattalBasmalahTiming,
          relTimeSec,
          durSec || BASMALAH_OPENER.durationSec,
          settings.syncOffsetSec,
          speechBounds,
          streamAnt
        );
      }

      if (
        isChapterAudioMode &&
        activeVerseTiming &&
        loadedSourceTagRef.current !==
          `ayah:${activeReciter.id}:${activeSurah.id}:${activeAyah.number}`
      ) {
        const segs = activeVerseTiming.segments;
        if (segs.length > 0) {
          const firstSegStart = segs[0].startMs;
          const lastSegEnd = segs[segs.length - 1].endMs;
          const segmentsAligned =
            firstSegStart >= activeVerseTiming.timestampFromMs - 140 &&
            lastSegEnd <= activeVerseTiming.timestampToMs + 140;

          if (segmentsAligned) {
            const absMs = activeVerseTiming.timestampFromMs + relTimeSec * 1000;
            const lookupMs = absMs + chapterAntMs - settings.syncOffsetSec * 1000;
            return findSegmentWordIndex(segs, lookupMs, activeAyah.words.length);
          }

          // Some Quran.com chapters (e.g. Alafasy Surah 93) have shifted segments relative to real timestamps;
          // proportionally map word spans inside [timestampFromMs .. timestampToMs].
          const verseDurSec = Math.max(
            0.5,
            (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
              1000
          );
          const effectiveSpanSec = Math.max(0.4, verseDurSec - 0.14);
          const adjustedRel = Math.max(
            0,
            relTimeSec + chapterAntMs / 1000 - settings.syncOffsetSec
          );
          const progress = Math.min(0.9999, adjustedRel / effectiveSpanSec);
          const lookupMs =
            firstSegStart + progress * Math.max(1, lastSegEnd - firstSegStart);
          return findSegmentWordIndex(segs, lookupMs, activeAyah.words.length);
        }
      }

      if (murattalTemplateTiming && murattalTemplateTiming.segments.length > 0) {
        return computeWordIndexFromTemplate(
          activeAyah,
          murattalTemplateTiming,
          relTimeSec,
          durSec || activeAyah.durationSec,
          settings.syncOffsetSec,
          speechBounds,
          streamAnt
        );
      }

      return computeWordIndexFallback(
        activeAyah,
        relTimeSec,
        durSec || activeAyah.durationSec,
        settings.syncOffsetSec,
        speechBounds,
        streamAnt
      );
    },
    [
      activeEveryAyahUrl,
      activeReciter.id,
      activeSurah.id,
      openerPhase,
      murattalBasmalahTiming,
      isChapterAudioMode,
      activeVerseTiming,
      activeAyah,
      murattalTemplateTiming,
      settings.syncOffsetSec,
    ]
  );

  const computeWordAtClockRef = useRef(computeWordAtClock);
  useEffect(() => {
    computeWordAtClockRef.current = computeWordAtClock;
  }, [computeWordAtClock]);

  // Sync word index immediately when idle/paused state resets to 0
  useEffect(() => {
    if (!isPlaying && currentTime === 0) {
      lastSyncedWordRef.current = null;
      setSyncedWordIndex(null);
    }
  }, [isPlaying, currentTime]);

  // Audio Element + Study-Sync Engine
  useEffect(() => {
    clearFallbackTimer();
    const audio = audioRef.current;

    if (!isPlaying) {
      clearTransitionTimer();
      if (audio) audio.pause();
      return;
    }

    let cancelled = false;
    const transitionDelayMs = verseTransitionDelayMsRef.current;
    verseTransitionDelayMsRef.current = 0;

    const activeVerseDur =
      openerPhase !== null && activeOpener
        ? activeOpener.durationSec
        : isChapterAudioMode && activeVerseTiming
        ? Math.max(
            0.5,
            (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
              1000
          )
        : activeAyah.durationSec;

    const startTimerFallback = () => {
      if (cancelled) return;
      setAudioMode('study-sync');
      clearFallbackTimer();
      const stepMs = 50;
      fallbackTimerRef.current = window.setInterval(() => {
        const next =
          latestRelTimeRef.current + (stepMs / 1000) * settings.playbackSpeed;
        if (next >= activeVerseDur) {
          latestRelTimeRef.current = 0;
          lastSyncedWordRef.current = null;
          setSyncedWordIndex(null);
          setCurrentTime(0);
          completionRef.current();
        } else {
          latestRelTimeRef.current = next;
          const idx = computeWordAtClockRef.current(next, activeVerseDur, 0.5);
          if (idx !== lastSyncedWordRef.current) {
            lastSyncedWordRef.current = idx;
            setSyncedWordIndex(idx);
          }
          setCurrentTime(next);
        }
      }, stepMs);
    };

    if (audio) {
      const keepActiveEveryAyah =
        openerPhase === null &&
        isChapterAudioMode &&
        loadedSourceTagRef.current ===
          `ayah:${activeReciter.id}:${activeSurah.id}:${activeAyah.number}` &&
        !audio.ended &&
        (!audio.paused || audio.currentTime > 0.05);

      if (openerPhase !== null) {
        const remoteUrl = getOpenerAudioUrl(activeReciter, openerPhase);
        const playableSrc = getCachedAudioSrc(remoteUrl);
        const sourceTag = `opener:${activeReciter.id}:${openerPhase}`;
        const openerTag = `op:${activeReciter.id}:${openerPhase}`;

        if (loadedSourceTagRef.current !== sourceTag || !audio.src) {
          if (pendingSeekSecRef.current === null) {
            const leadTrim = getSafeLeadTrimSec(speechBoundsMapRef.current[remoteUrl]);
            if (leadTrim > 0) pendingSeekSecRef.current = leadTrim;
          }
          audio.src = playableSrc;
          audio.load();
          loadedSourceTagRef.current = sourceTag;
        }
        lastAyahTagRef.current = openerTag;
        if (pendingSeekSecRef.current !== null && audio.readyState >= 1) {
          audio.currentTime = pendingSeekSecRef.current;
          pendingSeekSecRef.current = null;
        }
        setDuration(activeVerseDur);
      } else if (
        isChapterAudioMode &&
        reciterChapterData &&
        activeVerseTiming &&
        !keepActiveEveryAyah
      ) {
        const remoteUrl = reciterChapterData.audioUrl;
        const playableSrc = getCachedAudioSrc(remoteUrl);
        const verseStartSec = activeVerseTiming.timestampFromMs / 1000;
        const verseEndSec = activeVerseTiming.timestampToMs / 1000;
        const sourceTag = `chapter:${activeReciter.id}:${activeSurah.id}`;
        const ayahTag = `ch:${activeReciter.id}:${activeSurah.id}:${activeAyah.number}`;

        if (loadedSourceTagRef.current !== sourceTag || !audio.src) {
          if (pendingSeekSecRef.current === null) {
            pendingSeekSecRef.current = verseStartSec;
          }
          audio.src = playableSrc;
          audio.load();
          loadedSourceTagRef.current = sourceTag;
        } else if (lastAyahTagRef.current !== ayahTag) {
          if (pendingSeekSecRef.current === null) {
            // Never seek while continuous chapter playback is rolling through a natural inter-verse silence
            const isContinuingNaturally =
              !audio.paused &&
              transitionDelayMs === 0 &&
              audio.currentTime >= verseStartSec - 2.0 &&
              audio.currentTime <= verseEndSec - 0.1;
            if (!isContinuingNaturally) {
              pendingSeekSecRef.current = verseStartSec;
            }
          }
        }

        lastAyahTagRef.current = ayahTag;
        if (pendingSeekSecRef.current !== null && audio.readyState >= 1) {
          audio.currentTime = pendingSeekSecRef.current;
          pendingSeekSecRef.current = null;
        }
        setDuration(activeVerseDur);
      } else {
        const remoteUrl = getEveryAyahUrl(
          activeReciter.everyAyahFolder,
          activeSurah.id,
          activeAyah.number
        );
        const playableSrc = getCachedAudioSrc(remoteUrl);
        const sourceTag = `ayah:${activeReciter.id}:${activeSurah.id}:${activeAyah.number}`;
        const ayahTag = `ea:${activeReciter.id}:${activeSurah.id}:${activeAyah.number}`;

        if (loadedSourceTagRef.current !== sourceTag || !audio.src) {
          if (pendingSeekSecRef.current === null) {
            const leadTrim = getSafeLeadTrimSec(speechBoundsMapRef.current[remoteUrl]);
            if (leadTrim > 0) pendingSeekSecRef.current = leadTrim;
          }
          audio.src = playableSrc;
          audio.load();
          loadedSourceTagRef.current = sourceTag;
        }
        lastAyahTagRef.current = ayahTag;
        if (pendingSeekSecRef.current !== null && audio.readyState >= 1) {
          audio.currentTime = pendingSeekSecRef.current;
          pendingSeekSecRef.current = null;
        }
      }

      audio.playbackRate = settings.playbackSpeed;

      const beginPlayback = () => {
        if (cancelled) return;
        if (pendingSeekSecRef.current !== null && audio.readyState >= 1) {
          audio.currentTime = pendingSeekSecRef.current;
          pendingSeekSecRef.current = null;
        }
        audio.playbackRate = settings.playbackSpeed;
        const waitingInitialSeek =
          pendingSeekSecRef.current !== null &&
          pendingSeekSecRef.current > 0.25 &&
          audio.readyState < 1;

        if (!audio.paused && transitionDelayMs === 0 && !waitingInitialSeek) {
          audio.volume = 1;
          setAudioMode('stream');
          return;
        }

        audio.volume = waitingInitialSeek ? 0 : 1;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (!cancelled) {
                audio.playbackRate = settings.playbackSpeed;
                setAudioMode('stream');
                if (
                  pendingSeekSecRef.current !== null &&
                  audio.readyState >= 1
                ) {
                  audio.currentTime = pendingSeekSecRef.current;
                  pendingSeekSecRef.current = null;
                }
                if (pendingSeekSecRef.current === null) {
                  audio.volume = 1;
                }
              }
            })
            .catch((err: unknown) => {
              if (cancelled) return;
              audio.volume = 1;
              if (err instanceof DOMException && err.name === 'AbortError') {
                return;
              }
              startTimerFallback();
            });
        }
      };

      if (transitionDelayMs > 0) {
        audio.pause();
        audio.volume = 1;
        if (transitionTimerRef.current !== null) {
          window.clearTimeout(transitionTimerRef.current);
        }
        transitionTimerRef.current = window.setTimeout(() => {
          transitionTimerRef.current = null;
          beginPlayback();
        }, transitionDelayMs);
      } else {
        beginPlayback();
      }
    }

    return () => {
      cancelled = true;
      clearFallbackTimer();
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [
    isPlaying,
    openerPhase,
    activeOpener,
    activeSurah.id,
    activeAyah.number,
    activeAyah.durationSec,
    activeReciter,
    isChapterAudioMode,
    reciterChapterData,
    activeVerseTiming?.timestampFromMs,
    activeVerseTiming?.timestampToMs,
    settings.playbackSpeed,
    clearFallbackTimer,
    clearTransitionTimer,
  ]);

  // If audio errors mid-stream, switch cleanly to synchronized study-sync timer
  const handleAudioError = () => {
    if (!isPlaying) return;
    clearTransitionTimer();
    setAudioMode('study-sync');
    clearFallbackTimer();
    const fallbackDur =
      openerPhase !== null && activeOpener
        ? activeOpener.durationSec
        : isChapterAudioMode && activeVerseTiming
        ? Math.max(
            0.5,
            (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
              1000
          )
        : activeAyah.durationSec;
    const stepMs = 50;
    fallbackTimerRef.current = window.setInterval(() => {
      const next =
        latestRelTimeRef.current + (stepMs / 1000) * settings.playbackSpeed;
      if (next >= fallbackDur) {
        latestRelTimeRef.current = 0;
        lastSyncedWordRef.current = null;
        setSyncedWordIndex(null);
        setCurrentTime(0);
        completionRef.current();
      } else {
        latestRelTimeRef.current = next;
        const idx = computeWordAtClockRef.current(next, fallbackDur, 0.5);
        if (idx !== lastSyncedWordRef.current) {
          lastSyncedWordRef.current = idx;
          setSyncedWordIndex(idx);
        }
        setCurrentTime(next);
      }
    }, stepMs);
  };

  // High-precision 60fps audio clock sync: updates word highlight instantaneously on change, throttles scrubber UI to ~12fps
  useEffect(() => {
    if (!isPlaying || audioMode !== 'stream') return;
    let rafId = 0;

    const tick = (now: number) => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const usingChapterStream =
          openerPhase === null &&
          isChapterAudioMode &&
          Boolean(activeVerseTiming) &&
          loadedSourceTagRef.current === `chapter:${activeReciter.id}:${activeSurah.id}`;

        if (usingChapterStream && activeVerseTiming) {
          if (pendingSeekSecRef.current !== null) {
            if (audio.readyState >= 1) {
              audio.currentTime = pendingSeekSecRef.current;
              pendingSeekSecRef.current = null;
              audio.volume = 1;
            }
          } else if (!audio.seeking) {
            const absMs = audio.currentTime * 1000;
            const verseDurSec = Math.max(
              0.5,
              (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
                1000
            );
            const relTime = Math.max(
              0,
              Math.min(
                verseDurSec,
                (absMs - activeVerseTiming.timestampFromMs) / 1000
              )
            );
            latestRelTimeRef.current = relTime;

            const nextWord = computeWordAtClockRef.current(relTime, verseDurSec, 1);
            if (nextWord !== lastSyncedWordRef.current) {
              lastSyncedWordRef.current = nextWord;
              setSyncedWordIndex(nextWord);
            }

            if (now - lastUiClockUpdateRef.current >= 85) {
              lastUiClockUpdateRef.current = now;
              setCurrentTime(relTime);
              setDuration(verseDurSec);
            }

            const rawTriggerMs = activeVerseTiming.timestampToMs;
            const completionTriggerMs =
              Number.isFinite(audio.duration) && audio.duration > 0
                ? Math.min(
                    rawTriggerMs,
                    Math.max(
                      activeVerseTiming.timestampFromMs + 250,
                      audio.duration * 1000 - 40
                    )
                  )
                : rawTriggerMs;

            if (
              absMs >= completionTriggerMs &&
              completionLockKeyRef.current !== activeAyah.verseKey
            ) {
              completionLockKeyRef.current = activeAyah.verseKey;
              if (settings.repeatMode === 'ayah') {
                audio.pause();
              }
              completionRef.current();
            }
          }
        } else {
          if (pendingSeekSecRef.current !== null) {
            if (audio.readyState >= 1) {
              audio.currentTime = pendingSeekSecRef.current;
              pendingSeekSecRef.current = null;
              audio.volume = 1;
            }
          } else if (!audio.seeking) {
            const relTime = audio.currentTime;
            const fileDur =
              Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration
                : openerPhase !== null && activeOpener
                ? activeOpener.durationSec
                : activeAyah.durationSec;

            latestRelTimeRef.current = relTime;

            const nextWord = computeWordAtClockRef.current(relTime, fileDur, 1);
            if (nextWord !== lastSyncedWordRef.current) {
              lastSyncedWordRef.current = nextWord;
              setSyncedWordIndex(nextWord);
            }

            if (now - lastUiClockUpdateRef.current >= 85) {
              lastUiClockUpdateRef.current = now;
              setCurrentTime(relTime);
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration);
              }
            }
          }
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    isPlaying,
    audioMode,
    openerPhase,
    activeOpener,
    isChapterAudioMode,
    activeVerseTiming,
    activeSurah.id,
    activeReciter.id,
    activeAyah.verseKey,
    activeAyah.durationSec,
    settings.repeatMode,
  ]);

  const openerWordIndex = openerPhase !== null ? syncedWordIndex : null;
  const activeWordIndex = openerPhase === null ? syncedWordIndex : null;

  // Handlers
  const selectSurah = useCallback(
    (
      surahId: number,
      ayahNum = 1,
      autoPlay = false,
      targetScreen: AppScreen | null = 'reader'
    ) => {
      const target = surahCache[surahId] ?? FEATURED_SURAHS[0];
      const firstAyah =
        target.ayahs.find((a) => a.number === ayahNum) ?? target.ayahs[0];
      const startWithOpener = autoPlay && firstAyah.number === 1;
      pendingSeekSecRef.current = null;
      latestRelTimeRef.current = 0;
      completionLockKeyRef.current = null;
      setLoadError(null);
      setActiveSurahId(target.id);
      setActiveAyahNumber(firstAyah.number);
      setInspectedAyahNumber(firstAyah.number);
      setSelectedWordId(firstAyah.words[0]?.id ?? null);
      setOpenerPhase(startWithOpener ? 'istiadhah' : null);
      setCurrentTime(0);
      setDuration(
        startWithOpener ? ISTIADHAH_OPENER.durationSec : firstAyah.durationSec
      );
      if (autoPlay) {
        if (startWithOpener) {
          primeAudioForOpener('istiadhah', 0);
        } else {
          primeAudioForVerse(target.id, firstAyah.number, 0);
        }
      } else if (audioRef.current) {
        clearTransitionTimer();
        audioRef.current.pause();
        clearFallbackTimer();
      }
      setIsPlaying(autoPlay);
      if (targetScreen) {
        setActiveScreen(targetScreen);
      }
      if (firstAyah.number > 1) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            const el = document.getElementById(`ayah-${firstAyah.number}`);
            if (el) {
              scrollElementIntoSafeView(el, mainScrollRef.current, 'focus');
            }
          });
        });
      } else {
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [
      surahCache,
      clearTransitionTimer,
      primeAudioForOpener,
      primeAudioForVerse,
      clearFallbackTimer,
    ]
  );

  const openOrHydrateSurah = useCallback(
    async (
      entry: SurahDirectoryEntry,
      ayahNum = 1,
      autoPlay = false,
      targetScreen: AppScreen | null = 'reader'
    ) => {
      setLoadError(null);
      if (surahCache[entry.id]) {
        selectSurah(entry.id, ayahNum, autoPlay, targetScreen);
        return;
      }

      const session = ++playbackSessionRef.current;
      clearTransitionTimer();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      clearFallbackTimer();
      setIsPlaying(false);
      setOpenerPhase(null);
      setLoadingSurahId(entry.id);

      try {
        const fetchedRaw = await fetchSurahFromApi(entry);
        if (playbackSessionRef.current !== session) return;

        let fetched = fetchedRaw;
        if ((settings.riwayah ?? 'hafs') === 'warsh') {
          try {
            const warshOverlay = await fetchSurahWarshOverlay(entry.id);
            if (playbackSessionRef.current !== session) return;
            fetched = {
              ...fetchedRaw,
              ayahs: fetchedRaw.ayahs.map((a) => {
                const warshArabic = warshOverlay.versesByNumber[a.number];
                if (!warshArabic) return a;
                const alignedWords = alignWarshWordsToHafs(warshArabic, a.words);
                return {
                  ...a,
                  arabicWarsh: warshArabic,
                  words: a.words.map((w, wIdx) => ({
                    ...w,
                    arabicWarsh: alignedWords[wIdx] ?? w.arabic,
                  })),
                };
              }),
            };
          } catch {
            // Non-blocking: universal Warsh orthography rules still apply cleanly
          }
        }

        const targetAyah =
          fetched.ayahs.find((a) => a.number === ayahNum) ?? fetched.ayahs[0];
        const startWithOpener = autoPlay && targetAyah.number === 1;
        setSurahCache((prev) => ({ ...prev, [entry.id]: fetched }));
        setLoadingSurahId(null);
        pendingSeekSecRef.current = null;
        latestRelTimeRef.current = 0;
        completionLockKeyRef.current = null;
        setActiveSurahId(fetched.id);
        setActiveAyahNumber(targetAyah.number);
        setInspectedAyahNumber(targetAyah.number);
        setSelectedWordId(targetAyah.words[0]?.id ?? null);
        setOpenerPhase(startWithOpener ? 'istiadhah' : null);
        setCurrentTime(0);
        setDuration(
          startWithOpener
            ? ISTIADHAH_OPENER.durationSec
            : targetAyah.durationSec ?? 5
        );
        if (autoPlay) {
          if (startWithOpener) {
            primeAudioForOpener('istiadhah', 0);
          } else {
            primeAudioForVerse(fetched.id, targetAyah.number, 0);
          }
        }
        setIsPlaying(autoPlay);
        if (targetScreen) {
          setActiveScreen(targetScreen);
        }
        if (targetAyah.number > 1) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              const el = document.getElementById(`ayah-${targetAyah.number}`);
              if (el) {
                scrollElementIntoSafeView(el, mainScrollRef.current, 'focus');
              }
            });
          });
        } else {
          mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch {
        if (playbackSessionRef.current !== session) return;
        setLoadingSurahId(null);
        setLoadError(
          `Could not download Surah ${entry.nameSimple} right now. All featured Word-Sync chapters remain available offline.`
        );
      }
    },
    [
      surahCache,
      selectSurah,
      clearTransitionTimer,
      clearFallbackTimer,
      primeAudioForOpener,
      primeAudioForVerse,
      settings.riwayah,
    ]
  );

  const handleApplySettingsPatch = useCallback(
    (patch: Partial<ReaderSettings>) => {
      if (patch.translationLanguage) {
        failedLangOverlayRef.current.clear();
      }
      if (patch.riwayah === 'warsh') {
        failedWarshRef.current.clear();
      }
      setSettings((prev) => {
        const next: ReaderSettings = { ...prev, ...patch };
        if (patch.riwayah && !patch.reciterId) {
          const currentReciter = RECITERS.find((r) => r.id === prev.reciterId);
          const currentReciterRiwayah = currentReciter?.riwayah ?? 'hafs';
          if (currentReciterRiwayah !== patch.riwayah) {
            next.reciterId = patch.riwayah === 'warsh' ? 'yassin-warsh' : 'ghamdi';
          }
        } else if (patch.reciterId && !patch.riwayah) {
          const pickedReciter = RECITERS.find((r) => r.id === patch.reciterId);
          if (pickedReciter?.riwayah) {
            next.riwayah = pickedReciter.riwayah;
          }
        }
        if (next.reciterId !== prev.reciterId) {
          clearTransitionTimer();
          pendingSeekSecRef.current = null;
          latestRelTimeRef.current = 0;
          completionLockKeyRef.current = null;
          setCurrentTime(0);
        }
        return next;
      });
    },
    [clearTransitionTimer]
  );

  const handleOpenSurahFromDirectory = (entry: SurahDirectoryEntry) => {
    void openOrHydrateSurah(entry, 1, false, 'reader');
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      clearTransitionTimer();
      if (audioRef.current) audioRef.current.pause();
      clearFallbackTimer();
      setIsPlaying(false);
      return;
    }
    if (openerPhase !== null) {
      if (latestRelTimeRef.current < 0.05) {
        lastSyncedWordRef.current = 0;
        setSyncedWordIndex(0);
      }
      primeAudioForOpener(openerPhase, latestRelTimeRef.current);
      setIsPlaying(true);
      return;
    }
    // Starting a Surah from its beginning opens with Isti'adhah (+ Basmalah except Surah 9 & 1:1)
    if (activeAyah.number === 1 && latestRelTimeRef.current < 0.15) {
      setOpenerPhase('istiadhah');
      latestRelTimeRef.current = 0;
      lastSyncedWordRef.current = 0;
      setSyncedWordIndex(0);
      setCurrentTime(0);
      setDuration(ISTIADHAH_OPENER.durationSec);
      completionLockKeyRef.current = null;
      pendingSeekSecRef.current = null;
      primeAudioForOpener('istiadhah', 0);
      setIsPlaying(true);
      return;
    }
    if (latestRelTimeRef.current < 0.05) {
      lastSyncedWordRef.current = 0;
      setSyncedWordIndex(0);
    }
    primeAudioForVerse(activeSurah.id, activeAyah.number, latestRelTimeRef.current);
    setIsPlaying(true);
  };

  const handlePlayOpener = (phase: OpenerPhase) => {
    if (openerPhase === phase) {
      handleTogglePlay();
      return;
    }
    pendingSeekSecRef.current = null;
    latestRelTimeRef.current = 0;
    lastSyncedWordRef.current = 0;
    setSyncedWordIndex(0);
    completionLockKeyRef.current = null;
    setOpenerPhase(phase);
    setCurrentTime(0);
    setDuration(
      phase === 'istiadhah'
        ? ISTIADHAH_OPENER.durationSec
        : BASMALAH_OPENER.durationSec
    );
    primeAudioForOpener(phase, 0);
    setIsPlaying(true);
  };

  const handleReciteSurah = () => {
    if (isPlaying) {
      clearTransitionTimer();
      if (audioRef.current) audioRef.current.pause();
      clearFallbackTimer();
      setIsPlaying(false);
      return;
    }
    if (openerPhase !== null) {
      if (latestRelTimeRef.current < 0.05) {
        lastSyncedWordRef.current = 0;
        setSyncedWordIndex(0);
      }
      primeAudioForOpener(openerPhase, latestRelTimeRef.current);
      setIsPlaying(true);
      return;
    }
    const firstAyah = activeSurah.ayahs[0];
    pendingSeekSecRef.current = null;
    latestRelTimeRef.current = 0;
    lastSyncedWordRef.current = 0;
    setSyncedWordIndex(0);
    completionLockKeyRef.current = null;
    setActiveAyahNumber(firstAyah.number);
    setInspectedAyahNumber(firstAyah.number);
    setSelectedWordId(firstAyah.words[0]?.id ?? null);
    setOpenerPhase('istiadhah');
    setCurrentTime(0);
    setDuration(ISTIADHAH_OPENER.durationSec);
    primeAudioForOpener('istiadhah', 0);
    setIsPlaying(true);
  };

  const handlePlayAyah = (ayahNumber: number) => {
    if (openerPhase === null && activeAyahNumber === ayahNumber) {
      handleTogglePlay();
      return;
    }
    const target = activeSurah.ayahs.find((a) => a.number === ayahNumber);
    pendingSeekSecRef.current = null;
    latestRelTimeRef.current = 0;
    lastSyncedWordRef.current = 0;
    setSyncedWordIndex(0);
    completionLockKeyRef.current = null;
    setOpenerPhase(null);
    setActiveAyahNumber(ayahNumber);
    setInspectedAyahNumber(ayahNumber);
    setSelectedWordId(target?.words[0]?.id ?? null);
    setCurrentTime(0);
    setDuration(target?.durationSec ?? 5);
    primeAudioForVerse(activeSurah.id, ayahNumber, 0);
    setIsPlaying(true);
  };

  const handleSelectWord = (ayah: Ayah, word: WordToken, wordIndex: number) => {
    clearTransitionTimer();
    setOpenerPhase(null);
    setInspectedAyahNumber(ayah.number);
    setSelectedWordId(word.id);
    lastSyncedWordRef.current = wordIndex;
    setSyncedWordIndex(wordIndex);

    const reciterVerseTiming = activeReciter.quranComId
      ? chapterTimingCache[`${activeReciter.quranComId}-${activeSurah.id}`]
          ?.versesByKey[ayah.verseKey]
      : undefined;
    const templateVerseTiming =
      chapterTimingCache[`7-${activeSurah.id}`]?.versesByKey[ayah.verseKey];

    if (
      activeReciter.quranComId &&
      reciterVerseTiming &&
      reciterVerseTiming.segments.length > 0
    ) {
      const segs = reciterVerseTiming.segments;
      const seg =
        segs.find((s) => s.wordIndex === wordIndex) ??
        segs[Math.min(wordIndex, segs.length - 1)];
      const verseStartSec = reciterVerseTiming.timestampFromMs / 1000;
      const verseDurSec = Math.max(
        0.5,
        (reciterVerseTiming.timestampToMs - reciterVerseTiming.timestampFromMs) /
          1000
      );
      const firstSegStart = segs[0]?.startMs ?? reciterVerseTiming.timestampFromMs;
      const lastSegEnd =
        segs[segs.length - 1]?.endMs ?? reciterVerseTiming.timestampToMs;
      const segmentsAligned =
        firstSegStart >= reciterVerseTiming.timestampFromMs - 140 &&
        lastSegEnd <= reciterVerseTiming.timestampToMs + 140;

      let targetAbsSec = verseStartSec;
      if (seg) {
        if (segmentsAligned) {
          targetAbsSec = seg.startMs / 1000;
        } else {
          const spanMs = Math.max(1, lastSegEnd - firstSegStart);
          const ratio = Math.max(0, Math.min(0.99, (seg.startMs - firstSegStart) / spanMs));
          targetAbsSec = verseStartSec + ratio * Math.max(0.4, verseDurSec - 0.14);
        }
      }
      const relSec = Math.max(0, targetAbsSec - verseStartSec);

      setActiveAyahNumber(ayah.number);
      setDuration(verseDurSec);
      setCurrentTime(relSec);
      latestRelTimeRef.current = relSec;
      pendingSeekSecRef.current = targetAbsSec;

      if (
        ayah.number === activeAyahNumber &&
        audioRef.current &&
        audioMode === 'stream' &&
        isPlaying &&
        audioRef.current.readyState >= 1
      ) {
        audioRef.current.currentTime = targetAbsSec;
        pendingSeekSecRef.current = null;
      }
    } else {
      const url = getEveryAyahUrl(
        activeReciter.everyAyahFolder,
        activeSurah.id,
        ayah.number
      );
      const bounds = speechBoundsMapRef.current[url];
      const targetDur =
        bounds?.durationSec ??
        (ayah.number === activeAyahNumber
          ? duration || ayah.durationSec
          : ayah.durationSec);
      const leadPad = bounds
        ? bounds.speechStartSec
        : Math.min(0.14, targetDur * 0.04);
      const activeEnd = bounds
        ? Math.max(leadPad + 0.35, bounds.speechEndSec)
        : Math.max(leadPad + 0.35, targetDur - Math.min(0.45, targetDur * 0.11));
      const activeSpan = Math.max(0.35, activeEnd - leadPad);

      let seekSec = 0;
      if (templateVerseTiming && templateVerseTiming.segments.length > 0) {
        const segs = templateVerseTiming.segments;
        const firstStart = segs[0].startMs;
        const lastEnd = segs[segs.length - 1].endMs;
        const spanMs = Math.max(1, lastEnd - firstStart);
        const seg =
          segs.find((s) => s.wordIndex === wordIndex) ??
          segs[Math.min(wordIndex, segs.length - 1)];
        const ratio = seg
          ? Math.max(0, Math.min(0.99, (seg.startMs - firstStart) / spanMs))
          : wordIndex / Math.max(1, ayah.words.length);
        seekSec = leadPad + ratio * activeSpan;
      } else {
        const weights = ayah.words.map((w, idx) =>
          getPhoneticWordWeight(w, idx === ayah.words.length - 1)
        );
        const totalWeight = Math.max(
          1,
          weights.reduce((acc, v) => acc + v, 0)
        );
        const weightBefore = weights
          .slice(0, wordIndex)
          .reduce((acc, v) => acc + v, 0);
        seekSec = leadPad + (weightBefore / totalWeight) * activeSpan;
      }

      setActiveAyahNumber(ayah.number);
      setDuration(targetDur);
      setCurrentTime(seekSec);
      latestRelTimeRef.current = seekSec;
      pendingSeekSecRef.current = ayah.number === activeAyahNumber ? null : seekSec;

      if (
        ayah.number === activeAyahNumber &&
        audioRef.current &&
        audioMode === 'stream' &&
        isPlaying
      ) {
        audioRef.current.currentTime = seekSec;
      }
    }

    // Open mobile lexicon bottom sheet on smaller viewports where right rail is hidden
    if (window.innerWidth < 900) {
      setIsMobileSheetOpen(true);
    }
  };

  const handleInspectAyah = (ayah: Ayah) => {
    setInspectedAyahNumber(ayah.number);
    setSelectedWordId(ayah.words[0]?.id ?? null);
    if (window.innerWidth < 900) {
      setIsMobileSheetOpen(true);
    }
  };

  const getLocalizedAyahTranslation = (ayah: Ayah): { text: string; lang: TranslationLanguage } => {
    const res = getAyahTranslationText(ayah, activeTranslationLang);
    return { text: res.text, lang: res.resolvedLang };
  };

  const handleToggleBookmark = (ayah: Ayah) => {
    const localized = getLocalizedAyahTranslation(ayah);
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.verseKey === ayah.verseKey);
      if (exists) {
        return prev.filter((b) => b.verseKey !== ayah.verseKey);
      }
      const next: BookmarkItem = {
        verseKey: ayah.verseKey,
        surahId: activeSurah.id,
        surahName: activeSurah.nameSimple,
        ayahNumber: ayah.number,
        arabic: ayah.arabic,
        translation: localized.text,
        translationLanguage: localized.lang,
        note: '',
        savedAt: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      };
      return [next, ...prev];
    });
  };

  const handleSaveReflection = (ayah: Ayah, note: string) => {
    const localized = getLocalizedAyahTranslation(ayah);
    setBookmarks((prev) => {
      const idx = prev.findIndex((b) => b.verseKey === ayah.verseKey);
      const dateStr = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], note: note.trim(), savedAt: dateStr };
        return updated;
      }
      return [
        {
          verseKey: ayah.verseKey,
          surahId: activeSurah.id,
          surahName: activeSurah.nameSimple,
          ayahNumber: ayah.number,
          arabic: ayah.arabic,
          translation: localized.text,
          translationLanguage: localized.lang,
          note: note.trim(),
          savedAt: dateStr,
        },
        ...prev,
      ];
    });
  };

  const handleUpdateBookmark = (verseKey: string, patch: Partial<BookmarkItem>) => {
    setBookmarks((prev) =>
      prev.map((bm) => (bm.verseKey === verseKey ? { ...bm, ...patch } : bm))
    );
  };

  const handleCreateCollection = (name: string, description: string) => {
    setBookmarkCollections((prev) => [
      {
        id: `col-${Date.now()}`,
        name,
        description,
        createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      },
      ...prev,
    ]);
  };

  const handleSyncKhatmahToHifz = (slots: KhatmahSlotProgress[]): number => {
    let addedCount = 0;
    setHifzSpacedQueue((prev) => {
      const existingKeys = new Set(prev.map((q) => q.verseKey));
      const newItems: HifzSpacedItem[] = [];
      for (const s of slots) {
        const verseKey = `${s.surahId}:${s.startAyah}`;
        if (!existingKeys.has(verseKey)) {
          existingKeys.add(verseKey);
          newItems.push({
            id: `srs-${verseKey}`,
            verseKey,
            surahId: s.surahId,
            surahName: s.surahName,
            ayahNumber: s.startAyah,
            stage: 1,
            intervalLabel: STAGE_INTERVALS[1],
            source: 'khatmah',
            updatedAt: Date.now(),
          });
        }
      }
      addedCount = newItems.length;
      return newItems.length > 0 ? [...newItems, ...prev] : prev;
    });
    return addedCount;
  };

  const handleAddTopicToHifzQueue = (topic: QuranTopicCollection): number => {
    let addedCount = 0;
    setHifzSpacedQueue((prev) => {
      const existingKeys = new Set(prev.map((q) => q.verseKey));
      const newItems: HifzSpacedItem[] = [];
      for (const a of topic.ayahs) {
        if (!existingKeys.has(a.verseKey)) {
          existingKeys.add(a.verseKey);
          newItems.push({
            id: `srs-${a.verseKey}`,
            verseKey: a.verseKey,
            surahId: a.surahId,
            surahName: a.surahName,
            ayahNumber: a.ayahNumber,
            stage: 1,
            intervalLabel: STAGE_INTERVALS[1],
            source: 'topic',
            updatedAt: Date.now(),
          });
        }
      }
      addedCount = newItems.length;
      return newItems.length > 0 ? [...newItems, ...prev] : prev;
    });
    return addedCount;
  };

  const handleAdvanceHifzStage = (
    verseKey: string,
    surahId: number,
    surahName: string,
    ayahNumber: number,
    score?: number
  ) => {
    const existingItem = hifzSpacedQueue.find((item) => item.verseKey === verseKey);
    const nextStage = existingItem
      ? ((existingItem.stage < 5 ? existingItem.stage + 1 : 5) as 1 | 2 | 3 | 4 | 5)
      : (2 as const);

    setHifzSpacedQueue((prev) => {
      const idx = prev.findIndex((item) => item.verseKey === verseKey);
      if (idx >= 0) {
        const next = [...prev];
        const curr = next[idx];
        const updatedStage = (curr.stage < 5 ? curr.stage + 1 : 5) as 1 | 2 | 3 | 4 | 5;
        next[idx] = {
          ...curr,
          stage: updatedStage,
          intervalLabel: STAGE_INTERVALS[updatedStage],
          lastScore: score ?? curr.lastScore,
          updatedAt: Date.now(),
        };
        return next;
      }
      return [
        {
          id: `srs-${verseKey}`,
          verseKey,
          surahId,
          surahName,
          ayahNumber,
          stage: 2,
          intervalLabel: STAGE_INTERVALS[2],
          source: 'manual',
          lastScore: score,
          updatedAt: Date.now(),
        },
        ...prev,
      ];
    });

    recordHifzProgress(
      verseKey,
      surahId,
      nextStage >= 4 ? 'mastered' : 'memorized',
      nextStage
    );
  };

  const handleSeekRatio = (ratio: number) => {
    clearTransitionTimer();
    if (openerPhase === null && isChapterAudioMode && activeVerseTiming) {
      const verseStartSec = activeVerseTiming.timestampFromMs / 1000;
      const verseDurSec = Math.max(
        0.5,
        (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
          1000
      );
      const targetRel = ratio * verseDurSec;
      latestRelTimeRef.current = targetRel;
      const nextWord = computeWordAtClock(targetRel, verseDurSec, 0.5);
      lastSyncedWordRef.current = nextWord;
      setSyncedWordIndex(nextWord);
      setCurrentTime(targetRel);
      if (audioRef.current && audioMode === 'stream') {
        audioRef.current.volume = 1;
        audioRef.current.currentTime = verseStartSec + targetRel;
      }
      return;
    }

    const fallbackDur = activeOpener ? activeOpener.durationSec : activeAyah.durationSec;
    const safeDur = Math.max(1, duration || fallbackDur);
    const targetTime = ratio * safeDur;
    latestRelTimeRef.current = targetTime;
    const nextWord = computeWordAtClock(targetTime, safeDur, 0.5);
    lastSyncedWordRef.current = nextWord;
    setSyncedWordIndex(nextWord);
    setCurrentTime(targetTime);
    if (audioRef.current && audioMode === 'stream') {
      audioRef.current.volume = 1;
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleRewind5s = () => {
    clearTransitionTimer();
    const targetRel = Math.max(0, currentTime - 5);
    latestRelTimeRef.current = targetRel;
    const safeDur =
      openerPhase === null && isChapterAudioMode && activeVerseTiming
        ? Math.max(
            0.5,
            (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
              1000
          )
        : Math.max(1, duration || (activeOpener ? activeOpener.durationSec : activeAyah.durationSec));
    const nextWord = computeWordAtClock(targetRel, safeDur, 0.5);
    lastSyncedWordRef.current = nextWord;
    setSyncedWordIndex(nextWord);
    setCurrentTime(targetRel);
    if (audioRef.current && audioMode === 'stream') {
      audioRef.current.volume = 1;
      if (openerPhase === null && isChapterAudioMode && activeVerseTiming) {
        audioRef.current.currentTime =
          activeVerseTiming.timestampFromMs / 1000 + targetRel;
      } else {
        audioRef.current.currentTime = targetRel;
      }
    }
  };

  const handlePrevChapter = () => {
    const prevId = activeSurah.id <= 1 ? SURAH_DIRECTORY.length : activeSurah.id - 1;
    const entry = SURAH_DIRECTORY.find((d) => d.id === prevId);
    if (!entry) return;
    void openOrHydrateSurah(entry, 1, isPlaying, null);
  };

  const handleNextChapter = () => {
    const nextId = activeSurah.id >= SURAH_DIRECTORY.length ? 1 : activeSurah.id + 1;
    const entry = SURAH_DIRECTORY.find((d) => d.id === nextId);
    if (!entry) return;
    void openOrHydrateSurah(entry, 1, isPlaying, null);
  };

  const handlePrevAyah = () => {
    clearTransitionTimer();
    pendingSeekSecRef.current = null;
    latestRelTimeRef.current = 0;
    completionLockKeyRef.current = null;
    const nextSynced = isPlaying ? 0 : null;
    lastSyncedWordRef.current = nextSynced;
    setSyncedWordIndex(nextSynced);

    if (openerPhase === 'basmalah') {
      setOpenerPhase('istiadhah');
      setCurrentTime(0);
      setDuration(ISTIADHAH_OPENER.durationSec);
      if (isPlaying) primeAudioForOpener('istiadhah', 0);
      return;
    }
    if (openerPhase === 'istiadhah') {
      setCurrentTime(0);
      if (audioRef.current && audioMode === 'stream') {
        audioRef.current.currentTime = 0;
      }
      return;
    }

    const idx = activeSurah.ayahs.findIndex((a) => a.number === activeAyah.number);
    if (idx > 0) {
      const prev = activeSurah.ayahs[idx - 1];
      setActiveAyahNumber(prev.number);
      setInspectedAyahNumber(prev.number);
      setSelectedWordId(prev.words[0]?.id ?? null);
      setCurrentTime(0);
      setDuration(prev.durationSec);
      if (isPlaying) {
        primeAudioForVerse(activeSurah.id, prev.number, 0);
      }
    } else {
      setCurrentTime(0);
      if (audioRef.current && audioMode === 'stream') {
        audioRef.current.currentTime =
          isChapterAudioMode && activeVerseTiming
            ? activeVerseTiming.timestampFromMs / 1000
            : 0;
      }
    }
  };

  const handleNextAyah = () => {
    clearTransitionTimer();
    pendingSeekSecRef.current = null;
    latestRelTimeRef.current = 0;
    completionLockKeyRef.current = null;
    const nextSynced = isPlaying ? 0 : null;
    lastSyncedWordRef.current = nextSynced;
    setSyncedWordIndex(nextSynced);

    if (openerPhase === 'istiadhah') {
      if (activeSurah.hasBismillah) {
        setOpenerPhase('basmalah');
        setCurrentTime(0);
        setDuration(BASMALAH_OPENER.durationSec);
        if (isPlaying) primeAudioForOpener('basmalah', 0);
      } else {
        const first = activeSurah.ayahs[0];
        setOpenerPhase(null);
        setActiveAyahNumber(first.number);
        setInspectedAyahNumber(first.number);
        setSelectedWordId(first.words[0]?.id ?? null);
        setCurrentTime(0);
        setDuration(first.durationSec);
        if (isPlaying) primeAudioForVerse(activeSurah.id, first.number, 0);
      }
      return;
    }

    if (openerPhase === 'basmalah') {
      const first = activeSurah.ayahs[0];
      setOpenerPhase(null);
      setActiveAyahNumber(first.number);
      setInspectedAyahNumber(first.number);
      setSelectedWordId(first.words[0]?.id ?? null);
      setCurrentTime(0);
      setDuration(first.durationSec);
      if (isPlaying) primeAudioForVerse(activeSurah.id, first.number, 0);
      return;
    }

    const idx = activeSurah.ayahs.findIndex((a) => a.number === activeAyah.number);
    if (idx >= 0 && idx < activeSurah.ayahs.length - 1) {
      const next = activeSurah.ayahs[idx + 1];
      setActiveAyahNumber(next.number);
      setInspectedAyahNumber(next.number);
      setSelectedWordId(next.words[0]?.id ?? null);
      setCurrentTime(0);
      setDuration(next.durationSec);
      if (isPlaying) {
        primeAudioForVerse(activeSurah.id, next.number, 0);
      }
    } else if (settings.repeatMode === 'surah') {
      const first = activeSurah.ayahs[0];
      setOpenerPhase('istiadhah');
      setActiveAyahNumber(first.number);
      setInspectedAyahNumber(first.number);
      setSelectedWordId(first.words[0]?.id ?? null);
      setCurrentTime(0);
      setDuration(ISTIADHAH_OPENER.durationSec);
      if (isPlaying) {
        primeAudioForOpener('istiadhah', 0);
      }
    } else {
      handleNextChapter();
    }
  };

  const handleCycleSpeed = () => {
    const order: (0.75 | 1 | 1.25)[] = [0.75, 1, 1.25];
    const next = order[(order.indexOf(settings.playbackSpeed) + 1) % order.length];
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
    setSettings((s) => ({ ...s, playbackSpeed: next }));
  };

  const handleCycleRepeat = () => {
    const order: ('off' | 'ayah' | 'surah')[] = ['off', 'ayah', 'surah'];
    const next = order[(order.indexOf(settings.repeatMode) + 1) % order.length];
    setSettings((s) => ({ ...s, repeatMode: next }));
  };

  const inspectedBookmark = bookmarks.find(
    (b) => b.verseKey === inspectedAyah.verseKey
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--noor-canvas)]">
      {/* Hidden Real Audio Element */}
      <audio
        ref={audioRef}
        preload="auto"
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = settings.playbackSpeed;
          if (pendingSeekSecRef.current !== null) {
            e.currentTarget.currentTime = pendingSeekSecRef.current;
            pendingSeekSecRef.current = null;
          }
          e.currentTarget.volume = 1;
          if (openerPhase !== null || !isChapterAudioMode) {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }
        }}
        onCanPlay={(e) => {
          e.currentTarget.playbackRate = settings.playbackSpeed;
          if (pendingSeekSecRef.current !== null) {
            e.currentTarget.currentTime = pendingSeekSecRef.current;
            pendingSeekSecRef.current = null;
          }
          if (pendingSeekSecRef.current === null) {
            e.currentTarget.volume = 1;
          }
        }}
        onSeeked={(e) => {
          if (pendingSeekSecRef.current === null) {
            e.currentTarget.volume = 1;
          }
        }}
        onTimeUpdate={(e) => {
          if (isPlaying || audioMode !== 'stream' || pendingSeekSecRef.current !== null) {
            return;
          }
          if (
            openerPhase === null &&
            isChapterAudioMode &&
            activeVerseTiming &&
            loadedSourceTagRef.current === `chapter:${activeReciter.id}:${activeSurah.id}`
          ) {
            const verseDurSec = Math.max(
              0.5,
              (activeVerseTiming.timestampToMs - activeVerseTiming.timestampFromMs) /
                1000
            );
            const rel = Math.max(
              0,
              Math.min(
                verseDurSec,
                (e.currentTarget.currentTime * 1000 -
                  activeVerseTiming.timestampFromMs) /
                  1000
              )
            );
            latestRelTimeRef.current = rel;
            setCurrentTime(rel);
          } else {
            latestRelTimeRef.current = e.currentTarget.currentTime;
            setCurrentTime(e.currentTarget.currentTime);
          }
        }}
        onEnded={() => {
          const lockId = openerPhase !== null ? `op:${openerPhase}` : activeAyah.verseKey;
          if (completionLockKeyRef.current === lockId) return;
          completionLockKeyRef.current = lockId;
          completionRef.current();
        }}
        onError={handleAudioError}
      />
      <audio
        ref={preloadAudioRef}
        preload="auto"
        muted
        className="hidden"
        aria-hidden="true"
      />

      <TopNav
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          setActiveScreen(screen);
          mainScrollRef.current?.scrollTo({ top: 0 });
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        bookmarkCount={bookmarks.length}
        isDriveConnected={Boolean(driveAccessToken && !needsDriveAuth)}
      />

      <main ref={mainScrollRef} className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-clip">
        {activeScreen === 'reader' && (
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 sm:pb-12">
            {/* All 114 Surahs Quick Navigation Chips */}
            <div className="mb-5">
              <SurahChips
                directory={SURAH_DIRECTORY}
                activeSurahId={activeSurah.id}
                loadingSurahId={loadingSurahId}
                onSelectSurah={handleOpenSurahFromDirectory}
              />
            </div>

            {loadError && (
              <div
                role="alert"
                className="mb-5 w-full rounded-xl border border-[#BA1A1A]/25 bg-[#FFDAD6]/50 dark:bg-rose-950/50 dark:border-rose-400/30 px-4 py-3 text-xs font-medium text-[#93000A] dark:text-rose-200 flex items-center justify-between gap-3"
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={() => setLoadError(null)}
                  className="text-[11px] font-semibold underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Wide Reading Column + Dedicated Right Lexicon & Tajweed Studio */}
            <div className="flex flex-col min-[900px]:flex-row items-stretch gap-5 lg:gap-7 xl:gap-8">
              <div className="w-full flex-1 min-w-0 space-y-5">
                <SurahHeaderBanner
                  surah={activeSurah}
                  settings={settings}
                  isPlayingCurrentSurah={isPlaying}
                  openerPhase={openerPhase}
                  openerWordIndex={openerWordIndex}
                  onTogglePlaySurah={handleReciteSurah}
                  onPlayOpener={handlePlayOpener}
                  onSelectLanguage={(lang) => {
                    failedLangOverlayRef.current.clear();
                    setSettings((s) => ({ ...s, translationLanguage: lang }));
                  }}
                  onOpenQiraatExplorer={() => {
                    setTajweedInitialTab('qiraat');
                    setActiveScreen('tajweed');
                    mainScrollRef.current?.scrollTo({ top: 0 });
                  }}
                />

                {settings.riwayah === 'warsh' && (
                  <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
                    {WARSH_PREVIEW_NOTICE}
                  </p>
                )}

                <DailyGoalProgressBar
                  versesRecitedCount={versesRecitedCount}
                  dailyGoal={dailyGoal}
                  onChangeDailyGoal={setDailyGoal}
                  onMarkVerseRead={() => {
                    setVersesRecitedCount((c) => c + 1);
                    recordVerseRecitation(
                      activeSurah.id,
                      activeSurah.nameSimple,
                      activeAyah.verseKey,
                      activeAyah.durationSec || duration
                    );
                  }}
                  onOpenKhatmah={() => {
                    setActiveScreen('khatmah');
                    mainScrollRef.current?.scrollTo({ top: 0 });
                  }}
                />

                <div className="space-y-4">
                  {activeSurah.ayahs.map((ayah) => {
                    const isAyahActive =
                      openerPhase === null && ayah.number === activeAyah.number;
                    const isBookmarked = bookmarks.some(
                      (b) => b.verseKey === ayah.verseKey
                    );
                    return (
                      <AyahCard
                        key={ayah.verseKey}
                        ayah={ayah}
                        isActive={isAyahActive}
                        isPlaying={isPlaying}
                        activeWordIndex={isAyahActive ? activeWordIndex : null}
                        selectedWordId={selectedWordId}
                        isBookmarked={isBookmarked}
                        settings={settings}
                        onPlayAyah={handlePlayAyah}
                        onSelectWord={handleSelectWord}
                        onInspectAyah={handleInspectAyah}
                        onToggleBookmark={handleToggleBookmark}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Desktop Sticky Right Lexicon & Tajweed Studio (>=900px) + Mobile Bottom Sheet */}
              <LexiconDrawer
                ayah={inspectedAyah}
                selectedWord={selectedWord}
                surahName={activeSurah.nameSimple}
                translationLanguage={activeTranslationLang}
                riwayah={settings.riwayah ?? 'hafs'}
                maghrebiOrthography={Boolean(settings.maghrebiOrthography)}
                isBookmarked={Boolean(inspectedBookmark)}
                existingNote={inspectedBookmark?.note ?? ''}
                isMobileSheetOpen={isMobileSheetOpen}
                onCloseMobileSheet={() => setIsMobileSheetOpen(false)}
                onSelectWord={(w) => setSelectedWordId(w.id)}
                onSaveReflection={handleSaveReflection}
                onPauseReaderAudio={() => {
                  clearTransitionTimer();
                  if (audioRef.current) audioRef.current.pause();
                  clearFallbackTimer();
                  setIsPlaying(false);
                }}
                onOpenVoiceGrader={(surahId, ayahNum) => {
                  setIsMobileSheetOpen(false);
                  setTajweedInitialTab('grader');
                  setTajweedInitialTarget({ surahId, ayahNumber: ayahNum });
                  setActiveScreen('tajweed');
                  mainScrollRef.current?.scrollTo({ top: 0 });
                }}
              />
            </div>
          </div>
        )}

        {activeScreen === 'surahs' && (
          <SurahIndexView
            directory={SURAH_DIRECTORY}
            activeSurahId={activeSurah.id}
            loadingSurahId={loadingSurahId}
            loadError={loadError}
            bookmarks={bookmarks}
            weakWords={weakWords}
            recitationHistory={recitationHistory}
            onOpenSurah={handleOpenSurahFromDirectory}
            onNavigateHub={(screen) => {
              setActiveScreen(screen);
              mainScrollRef.current?.scrollTo({ top: 0 });
            }}
          />
        )}

        {activeScreen === 'khatmah' && (
          <KhatmahPlannerView
            plan={khatmahPlan}
            onUpdatePlan={setKhatmahPlan}
            onJumpToSurah={(surahId, ayahNum, autoPlay) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, Boolean(autoPlay), 'reader');
              } else {
                selectSurah(surahId, ayahNum, Boolean(autoPlay), 'reader');
              }
            }}
            onSyncPagesToHifz={handleSyncKhatmahToHifz}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onNavigateHub={(screen) => {
              setActiveScreen(screen);
              mainScrollRef.current?.scrollTo({ top: 0 });
            }}
          />
        )}

        {activeScreen === 'topics' && (
          <TopicsExplorerView
            reciter={activeReciter}
            translationLanguage={activeTranslationLang}
            onPracticeInReader={(surahId, ayahNum, autoPlay) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, Boolean(autoPlay), 'reader');
              } else {
                selectSurah(surahId, ayahNum, Boolean(autoPlay), 'reader');
              }
            }}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onAddTopicToHifzQueue={handleAddTopicToHifzQueue}
            onNavigateHub={(screen) => {
              setActiveScreen(screen);
              mainScrollRef.current?.scrollTo({ top: 0 });
            }}
          />
        )}

        {activeScreen === 'hifz' && (
          <HifzQuizView
            surahs={cachedSurahsList}
            activeSurahId={activeSurah.id}
            reciter={activeReciter}
            settings={settings}
            weakWords={weakWords}
            spacedQueue={hifzSpacedQueue}
            onAdvanceSpacedStage={handleAdvanceHifzStage}
            onAddWeakWord={(word) =>
              setWeakWords((prev) =>
                prev.some((w) => w.id === word.id)
                  ? prev
                  : [word, ...prev]
              )
            }
            onRemoveWeakWord={(id) =>
              setWeakWords((prev) => prev.filter((w) => w.id !== id))
            }
            onOpenSurah={(surahId, ayahNum, autoPlay) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, Boolean(autoPlay), 'reader');
              } else {
                selectSurah(surahId, ayahNum, Boolean(autoPlay), 'reader');
              }
            }}
            onOpenVoiceGrader={(surahId, ayahNum) => {
              setTajweedInitialTab('grader');
              setTajweedInitialTarget({ surahId, ayahNumber: ayahNum });
              setActiveScreen('tajweed');
              mainScrollRef.current?.scrollTo({ top: 0 });
            }}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onRecordQuizPractice={recordVerseRecitation}
            onRecordHifzProgress={recordHifzProgress}
          />
        )}

        {activeScreen === 'salah' && (
          <SalahView
            settings={settings}
            reciter={activeReciter}
            onSelectLanguage={(lang) => {
              failedLangOverlayRef.current.clear();
              setSettings((s) => ({ ...s, translationLanguage: lang }));
            }}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onPracticeInReader={(surahId, ayahNum) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, true, 'reader');
              } else {
                selectSurah(surahId, ayahNum, true, 'reader');
              }
            }}
          />
        )}

        {activeScreen === 'duas' && (
          <DuasKalimasView
            settings={settings}
            reciter={activeReciter}
            onSelectLanguage={(lang) => {
              failedLangOverlayRef.current.clear();
              setSettings((s) => ({ ...s, translationLanguage: lang }));
            }}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onPracticeInReader={(surahId, ayahNum) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, true, 'reader');
              } else {
                selectSurah(surahId, ayahNum, true, 'reader');
              }
            }}
          />
        )}

        {activeScreen === 'hadiths' && (
          <HadithsView
            settings={settings}
            onSelectLanguage={(lang) => {
              failedLangOverlayRef.current.clear();
              setSettings((s) => ({ ...s, translationLanguage: lang }));
            }}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onPracticeInReader={(surahId, ayahNum) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, true, 'reader');
              } else {
                selectSurah(surahId, ayahNum, true, 'reader');
              }
            }}
          />
        )}

        {activeScreen === 'tajweed' && (
          <TajweedStudioView
            reciter={activeReciter}
            surahs={cachedSurahsList}
            initialTab={tajweedInitialTab}
            initialGraderTarget={tajweedInitialTarget}
            bookmarkedKeys={bookmarkedKeys}
            activeRiwayah={settings.riwayah ?? 'hafs'}
            maghrebiOrthography={Boolean(settings.maghrebiOrthography)}
            onSetGlobalRiwayah={(r) => handleApplySettingsPatch({ riwayah: r })}
            onToggleMaghrebiOrthography={(enabled) =>
              handleApplySettingsPatch({ maghrebiOrthography: enabled })
            }
            onBookmarkAyah={(surah, ayah) => {
              const localized = getLocalizedAyahTranslation(ayah);
              setBookmarks((prev) => {
                if (prev.some((b) => b.verseKey === ayah.verseKey)) {
                  return prev.filter((b) => b.verseKey !== ayah.verseKey);
                }
                return [
                  {
                    verseKey: ayah.verseKey,
                    surahId: surah.id,
                    surahName: surah.nameSimple,
                    ayahNumber: ayah.number,
                    arabic: ayah.arabic,
                    translation: localized.text,
                    translationLanguage: localized.lang,
                    note: '',
                    savedAt: new Date().toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    }),
                  },
                  ...prev,
                ];
              });
            }}
            onPauseReaderAudio={() => {
              clearTransitionTimer();
              if (audioRef.current) audioRef.current.pause();
              clearFallbackTimer();
              setIsPlaying(false);
            }}
            onPracticeInReader={(surahId, ayahNum) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, true, 'reader');
              } else {
                selectSurah(surahId, ayahNum, true, 'reader');
              }
            }}
          />
        )}

        {activeScreen === 'bookmarks' && (
          <BookmarksView
            bookmarks={bookmarks}
            versesRecitedCount={versesRecitedCount}
            dailyGoal={dailyGoal}
            collections={bookmarkCollections}
            onCreateCollection={handleCreateCollection}
            onUpdateBookmark={handleUpdateBookmark}
            onJumpToTopic={() => {
              setActiveScreen('topics');
              mainScrollRef.current?.scrollTo({ top: 0 });
            }}
            lastReadInfo={{
              surahId: activeSurah.id,
              surahName: activeSurah.nameSimple,
              ayahNumber: activeAyah.number,
            }}
            onChangeDailyGoal={setDailyGoal}
            onJumpToVerse={(surahId, ayahNum, autoPlay) => {
              const entry = SURAH_DIRECTORY.find((d) => d.id === surahId);
              if (entry) {
                void openOrHydrateSurah(entry, ayahNum, Boolean(autoPlay), 'reader');
              } else {
                selectSurah(surahId, ayahNum, Boolean(autoPlay), 'reader');
              }
            }}
            onRemoveBookmark={(key) =>
              setBookmarks((prev) => prev.filter((b) => b.verseKey !== key))
            }
            riwayah={settings.riwayah ?? 'hafs'}
            maghrebiOrthography={Boolean(settings.maghrebiOrthography)}
          />
        )}

        {activeScreen === 'drive' && (
          <GoogleDriveView
            user={driveUser}
            accessToken={driveAccessToken}
            needsAuth={needsDriveAuth}
            isSigningIn={isDriveSigningIn}
            authError={driveAuthError}
            onSignIn={() => void handleDriveSignIn()}
            onSignOut={() => void handleDriveSignOut()}
            onTokenExpired={handleDriveTokenExpired}
            backupPayload={driveBackupPayload}
            onRestoreBackup={handleRestoreDriveBackup}
          />
        )}

        <footer className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-2 text-center">
          <p className="text-xs text-[#404944]/80 dark:text-emerald-200/60 tracking-wide">
            &copy; 2026 Muhmmad Khalil &middot; Noor Recite. All rights reserved.
          </p>
        </footer>
      </main>

      {/* Full-Width Docked Bottom Player Bar — resides cleanly outside <main> so verse text is never blocked */}
      {(activeScreen === 'reader' || isPlaying) && (
        <FloatingPlayerDeck
          variant="bottom-bar"
          surah={activeSurah}
          activeAyah={activeAyah}
          openerPhase={openerPhase}
          reciter={activeReciter}
          reciters={RECITERS}
          isPlaying={isPlaying}
          isLoadingChapter={loadingSurahId !== null}
          audioMode={audioMode}
          currentTime={currentTime}
          duration={duration}
          settings={settings}
          onTogglePlay={handleTogglePlay}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onPrevAyah={handlePrevAyah}
          onNextAyah={handleNextAyah}
          onRewind5s={handleRewind5s}
          onSeekRatio={handleSeekRatio}
          onCycleSpeed={handleCycleSpeed}
          onCycleRepeat={handleCycleRepeat}
          onSelectReciter={(reciterId) => {
            handleApplySettingsPatch({ reciterId });
          }}
        />
      )}

      {/* Mobile Bottom Tab Bar — stacked outside <main> cleanly below Player Bar */}
      <MobileBottomNav
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          setActiveScreen(screen);
          mainScrollRef.current?.scrollTo({ top: 0 });
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        darkMode={darkMode}
        recitationHistory={recitationHistory}
        hifzProgressEvents={hifzProgressEvents}
        hifzSpacedQueue={hifzSpacedQueue}
        onClearRecitationHistory={() => {
          setRecitationHistory([]);
          setHifzProgressEvents([]);
        }}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onUpdateSettings={handleApplySettingsPatch}
        onClose={() => setIsSettingsOpen(false)}
        driveConnected={Boolean(driveAccessToken && !needsDriveAuth)}
        driveUserEmail={driveUser?.email ?? null}
        driveSigningIn={isDriveSigningIn}
        onDriveSignIn={() => void handleDriveSignIn()}
        onOpenDriveHub={() => {
          setActiveScreen('drive');
          mainScrollRef.current?.scrollTo({ top: 0 });
        }}
      />

      <DailyGoalReminderToast
        isVisible={showDailyReminder && versesRecitedCount === 0}
        dailyGoal={dailyGoal}
        onStartReciting={() => {
          dismissDailyReminder();
          if (activeScreen !== 'reader') {
            setActiveScreen('reader');
            mainScrollRef.current?.scrollTo({ top: 0 });
          }
          if (!isPlaying) {
            handleReciteSurah();
          }
        }}
        onDismiss={dismissDailyReminder}
      />
    </div>
  );
}
