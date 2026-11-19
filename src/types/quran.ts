export type AppScreen =
  | 'reader'
  | 'surahs'
  | 'khatmah'
  | 'topics'
  | 'hifz'
  | 'salah'
  | 'duas'
  | 'hadiths'
  | 'tajweed'
  | 'bookmarks'
  | 'drive';
export type TranslationLanguage =
  | 'en'
  | 'hi'
  | 'ur'
  | 'bn'
  | 'ms'
  | 'ha'
  | 'ff'
  | 'fa'
  | 'tr'
  | 'ru'
  | 'zh'
  | 'es'
  | 'fr';
export type WordHighlightStyle = 'pill' | 'wave' | 'box' | 'glow';
export type RiwayahId = 'hafs' | 'warsh';
export type QariVoiceProfile =
  | 'recorded'
  | 'male-gulf'
  | 'male-egypt'
  | 'male-maghreb'
  | 'female-warm';
export type MufassirId = 'ibn-kathir' | 'qurtubi' | 'sadi' | 'tabari' | 'jalalayn';

export type TajweedRuleType =
  | 'ghunnah'
  | 'qalqalah'
  | 'idgham'
  | 'ikhfa'
  | 'madd'
  | 'tafkhim';

export interface WordFootnote {
  id: string;
  term: string;
  arabicTerm: string;
  literalGloss: string;
  category:
    | 'Theology & Divine Name'
    | 'Spiritual Concept'
    | 'Grammar & Definite "The"'
    | 'Classical Arabic Nuance';
  explanation: string;
  root?: string;
}

export interface WordToken {
  id: string;
  arabic: string;
  arabicWarsh?: string;
  transliteration: string;
  meaning: string;
  meaningHi?: string;
  meaningUr?: string;
  meanings?: Partial<Record<TranslationLanguage, string>>;
  root?: string;
  partOfSpeech?: string;
  tajweed?: TajweedRuleType;
  tajweedNote?: string;
  footnote?: WordFootnote;
}

export interface TranslationSegment {
  text: string;
  wordIndex: number; // 0-based index into ayah.words
}

export interface Ayah {
  number: number; // Ayah number within Surah
  verseKey: string; // e.g. "1:1"
  juz: number;
  arabic: string;
  arabicWarsh?: string;
  transliteration: string;
  translation: string;
  translationHi?: string;
  translationUr?: string;
  translations?: Partial<Record<TranslationLanguage, string>>;
  translationSegments?: TranslationSegment[];
  translationSegmentsHi?: TranslationSegment[];
  translationSegmentsUr?: TranslationSegment[];
  translationSegmentsByLang?: Partial<Record<TranslationLanguage, TranslationSegment[]>>;
  tafsirBrief: string;
  words: WordToken[];
  durationSec: number; // Estimated recitation duration for waveform & fallback sync
  waveform: number[]; // Normalized amplitude bars (0.15 - 1.0)
}

export interface Surah {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameMeaning: string;
  revelationPlace: 'Meccan' | 'Medinan';
  juz: number;
  totalAyahs: number;
  hasBismillah: boolean;
  estimatedMinutes: number;
  featured: boolean;
  ayahs: Ayah[];
}

export interface SurahDirectoryEntry {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameMeaning: string;
  revelationPlace: 'Meccan' | 'Medinan';
  juz: number;
  totalAyahs: number;
  featured: boolean;
}

export type OpenerPhase = 'istiadhah' | 'basmalah';

export interface SurahOpenerLine {
  phase: OpenerPhase;
  label: string;
  arabic: string;
  transliteration: string;
  translation: string;
  translationHi: string;
  translationUr: string;
  translations?: Partial<Record<TranslationLanguage, string>>;
  translationSegments: TranslationSegment[];
  translationSegmentsHi: TranslationSegment[];
  translationSegmentsUr: TranslationSegment[];
  translationSegmentsByLang?: Partial<Record<TranslationLanguage, TranslationSegment[]>>;
  words: WordToken[];
  durationSec: number;
  waveform: number[];
}

export interface Reciter {
  id: string;
  name: string;
  style: string;
  everyAyahFolder: string;
  riwayah?: RiwayahId;
  quranComId?: number;
  hasAudhubillah?: boolean;
  hasBismillahFile?: boolean;
}

export interface WordSegment {
  wordIndex: number; // 0-based index into ayah.words
  startMs: number;
  endMs: number;
}

export interface VerseTiming {
  verseKey: string;
  timestampFromMs: number;
  timestampToMs: number;
  segments: WordSegment[];
}

export interface ChapterAudioData {
  audioUrl: string;
  versesByKey: Record<string, VerseTiming>;
}

export interface TajweedRuleSpec {
  type: TajweedRuleType;
  name: string;
  arabicName: string;
  tagline: string;
  description: string;
  makhraj: string;
  harakatCount: string;
  letters: string[];
  colorName: string;
  exampleVerseKey: string;
  exampleSurahId: number;
  exampleAyahNumber: number;
  exampleArabic: string;
  exampleTransliteration: string;
  exampleFocus: string;
}

export interface BookmarkItem {
  verseKey: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  translationLanguage?: TranslationLanguage;
  note: string;
  savedAt: string;
  collectionId?: string;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export type FavoriteItemType = 'verse' | 'dua' | 'hadith' | 'salah';

export interface FavoriteItem {
  id: string;
  type: FavoriteItemType;
  title: string;
  subtitle?: string;
  arabic: string;
  transliteration?: string;
  translation: string;
  reference?: string;
  savedAt: string;
  surahId?: number;
  ayahNumber?: number;
  verseKey?: string;
  duaId?: string;
  duaVariantId?: string;
  duaVariantLabel?: string;
  hadithId?: string;
  salahStepId?: string;
  salahTab?: 'guides' | 'steps' | 'wudu';
}

export interface HifzSpacedItem {
  id: string;
  verseKey: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  stage: 1 | 2 | 3 | 4 | 5;
  intervalLabel: string;
  source: 'khatmah' | 'topic' | 'manual';
  lastScore?: number;
  updatedAt: number;
}

export interface KhatmahSlotProgress {
  id: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  label: string;
  arabicLabel: string;
  surahId: number;
  surahName: string;
  startAyah: number;
  pageStart: number;
  pageEnd: number;
  completed: boolean;
}

export interface KhatmahPlanState {
  targetDays: 30 | 60 | 90;
  currentDay: number;
  pagesCompleted: number;
  totalPages: number;
  juzNumber: number;
  scheduleStyle: 'five-prayers' | 'two-sessions' | 'single-session';
  hifzSyncEnabled: boolean;
  salahRemindersEnabled: boolean;
  streakDays: number[];
  slots: KhatmahSlotProgress[];
}

export interface HifzWeakWord {
  id: string;
  verseKey: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  transliteration: string;
  meaning: string;
  tajweedNote?: string;
  addedAt: number;
  reviewCount: number;
}

export interface ReaderSettings {
  arabicFont: 'amiri' | 'scheherazade';
  arabicFontSize: number; // px, e.g. 26 to 38
  translationLanguage: TranslationLanguage;
  showTransliteration: boolean;
  showTranslation: boolean;
  showTajweedColors: boolean;
  alwaysShowFootnotes: boolean;
  reciterId: string;
  playbackSpeed: 0.75 | 1 | 1.25;
  repeatMode: 'off' | 'ayah' | 'surah';
  syncOffsetSec: number; // -0.5 to +0.5 fine-tune offset
  highlightStyle?: WordHighlightStyle;
  reflectionDelaySec?: 0 | 1 | 2;
  wordRepeatCount?: 1 | 3 | 5;
  riwayah?: RiwayahId;
  maghrebiOrthography?: boolean;
  readingMode?: boolean;
  qariVoiceProfile?: QariVoiceProfile;
  autoplayQueue?: boolean;
  playAllDuaVariations?: boolean;
  playEntireJuz?: boolean;
  activeJuzNumber?: number;
}

export type DuaCategory = 'kalimas' | 'daily' | 'quranic' | 'adhkar' | 'rare';

export interface DuaAlternateVariant {
  id: string;
  label: string;
  badge?: string;
  arabic: string;
  transliteration: string;
  translationEn: string;
  translationHi: string;
  translationUr: string;
  reference: string;
  note?: string;
  audioUrl?: string;
  fallbackAudioUrl?: string;
  quranRef?: {
    surahId: number;
    ayahNumber: number;
  };
  quranRange?: {
    surahId: number;
    startAyah: number;
    endAyah: number;
  };
  wordTimings?: Array<{
    startMs: number;
    endMs: number;
  }>;
}

export interface DuaOrKalimaItem {
  id: string;
  category: DuaCategory;
  badge: string;
  title: string;
  subtitle: string;
  arabic: string;
  transliteration: string;
  translationEn: string;
  translationHi: string;
  translationUr: string;
  reference: string;
  note: string;
  recommendedCount?: number;
  audioUrl?: string;
  fallbackAudioUrl?: string;
  quranRef?: {
    surahId: number;
    ayahNumber: number;
  };
  quranRange?: {
    surahId: number;
    startAyah: number;
    endAyah: number;
  };
  wordTimings?: Array<{
    startMs: number;
    endMs: number;
  }>;
  primaryVariantLabel?: string;
  alternates?: DuaAlternateVariant[];
}

export type PrayerCategory = 'daily' | 'eid' | 'special';

export interface RakaatBreakdown {
  label: string;
  rakaat: number;
  emphasis: 'fard' | 'wajib' | 'sunnah' | 'nafl' | 'witr';
}

export interface PrayerGuideItem {
  id: string;
  category: PrayerCategory;
  badge: string;
  title: string;
  arabicTitle: string;
  subtitle: string;
  timing: string;
  totalSummary: string;
  rakaats: RakaatBreakdown[];
  niyyahArabic: string;
  niyyahTranslit: string;
  niyyahEn: string;
  niyyahHi: string;
  niyyahUr: string;
  niyyahWordTimings?: Array<{
    startMs: number;
    endMs: number;
  }>;
  stepsEn: string[];
  stepsHi: string[];
  stepsUr: string[];
  note: string;
  specialAudio?: {
    title: string;
    arabic: string;
    transliteration: string;
    translationEn: string;
    translationHi: string;
    translationUr: string;
    audioUrl?: string;
    fallbackAudioUrl?: string;
    wordTimings?: Array<{
      startMs: number;
      endMs: number;
    }>;
  };
}

export interface SalahPostureStep {
  id: string;
  stepNumber: number;
  posture: string;
  badge: string;
  title: string;
  repeatLabel: string;
  arabic: string;
  transliteration: string;
  translationEn: string;
  translationHi: string;
  translationUr: string;
  note: string;
  audioUrl?: string;
  fallbackAudioUrl?: string;
  wordTimings?: Array<{
    startMs: number;
    endMs: number;
  }>;
  quranRef?: {
    surahId: number;
    ayahNumber: number;
  };
  quranRange?: {
    surahId: number;
    startAyah: number;
    endAyah: number;
  };
}

export interface WuduStep {
  stepNumber: number;
  title: string;
  detailEn: string;
  detailHi: string;
  detailUr: string;
  arabic?: string;
  transliteration?: string;
  audioUrl?: string;
  wordTimings?: Array<{
    startMs: number;
    endMs: number;
  }>;
}

export type HadithCategory = 'faith' | 'character' | 'worship' | 'knowledge';
export type HadithTradition = 'shared' | 'sunni' | 'shia';

export interface HadithItem {
  id: string;
  category: HadithCategory;
  tradition: HadithTradition;
  badge: string;
  title: string;
  narrator: string;
  arabic: string;
  transliteration: string;
  translationEn: string;
  translationHi: string;
  translationUr: string;
  reference: string;
  grading: string;
  lessonEn: string;
  lessonHi: string;
  lessonUr: string;
  quranRef?: {
    label: string;
    surahId: number;
    ayahNumber: number;
  };
  audioUrl?: string;
  wordTimings?: Array<{
    startMs: number;
    endMs: number;
  }>;
}
