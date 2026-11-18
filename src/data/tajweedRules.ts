import { TajweedRuleSpec, TajweedRuleType } from '../types/quran';

export const TAJWEED_RULES: TajweedRuleSpec[] = [
  {
    type: 'ghunnah',
    name: 'Ghunnah',
    arabicName: 'غُنَّة',
    tagline: 'Resonant Nasalization',
    description:
      'Sustained nasal resonance held for two counts on doubled Noon (نّ) or Meem (مّ).',
    makhraj: 'Al-Khayshum (Nasal Passage)',
    harakatCount: '2 Harakat',
    letters: ['نّ', 'مّ'],
    colorName: 'Crimson',
    exampleVerseKey: '114:1',
    exampleSurahId: 114,
    exampleAyahNumber: 1,
    exampleArabic: 'بِرَبِّ ٱلنَّاسِ',
    exampleTransliteration: 'bi-rabbin-naas',
    exampleFocus: 'Hold the doubled Noon (نّ) gently through the nose for two counts.',
  },
  {
    type: 'qalqalah',
    name: 'Qalqalah',
    arabicName: 'قَلْقَلَة',
    tagline: 'Echoing Articulation Bounce',
    description:
      'Brief echoing release when any of the five Qalqalah letters carries a Sukoon or ends a verse.',
    makhraj: 'Throat, Tongue & Lips (Released Stop)',
    harakatCount: 'Crisp Release',
    letters: ['ق', 'ط', 'ب', 'ج', 'د'],
    colorName: 'Cobalt',
    exampleVerseKey: '112:1',
    exampleSurahId: 112,
    exampleAyahNumber: 1,
    exampleArabic: 'ٱللَّهُ أَحَدٌ',
    exampleTransliteration: 'Allaahu Ahad',
    exampleFocus: 'Release Daal (دٌ) cleanly with a light bounce when stopping.',
  },
  {
    type: 'idgham',
    name: 'Idgham',
    arabicName: 'إِدْغَام',
    tagline: 'Harmonic Letter Merging',
    description:
      'Merges silent Noon (نْ) or Tanween into the six Yarmaloon letters for smooth flow between words.',
    makhraj: 'Merged Articulation Point',
    harakatCount: '2 Harakat (with Ghunnah)',
    letters: ['ي', 'ر', 'م', 'ل', 'و', 'ن'],
    colorName: 'Amber',
    exampleVerseKey: '112:4',
    exampleSurahId: 112,
    exampleAyahNumber: 4,
    exampleArabic: 'كُفُوًا أَحَدٌ / وَلَمْ يَكُن لَّهُۥ',
    exampleTransliteration: 'wa lam yakul-lahu',
    exampleFocus: 'Noon Sakinah before Laam (ل) merges completely without nasalization.',
  },
  {
    type: 'ikhfa',
    name: 'Ikhfa',
    arabicName: 'إِخْفَاء',
    tagline: 'Veiled Nasal Transition',
    description:
      'Softly veils Noon Sakinah or Tanween with a two-count nasal hum before 15 letters.',
    makhraj: 'Al-Khayshum + Approaching Letter',
    harakatCount: '2 Harakat',
    letters: ['ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك'],
    colorName: 'Persian Teal',
    exampleVerseKey: '113:2',
    exampleSurahId: 113,
    exampleAyahNumber: 2,
    exampleArabic: 'مِن شَرِّ مَا خَلَقَ',
    exampleTransliteration: 'min sharri maa khalaq',
    exampleFocus: 'Hover near Sheen (ش) while holding a soft two-count nasal tone.',
  },
  {
    type: 'madd',
    name: 'Madd',
    arabicName: 'مَدّ',
    tagline: 'Measured Vowel Elongation',
    description:
      'Extends long vowels (Alif, Waw, Ya) from 2 natural counts up to 4, 5, or 6 counts before Hamza or Sukoon.',
    makhraj: 'Al-Jawf (Oral & Throat Cavity)',
    harakatCount: '2 to 6 Harakat',
    letters: ['ا', 'و', 'ي'],
    colorName: 'Emerald',
    exampleVerseKey: '1:7',
    exampleSurahId: 1,
    exampleAyahNumber: 7,
    exampleArabic: 'وَلَا ٱلضَّآلِّينَ',
    exampleTransliteration: 'wa lad-daaaalleen',
    exampleFocus: 'Extend the Alif for 6 steady counts before the doubled Laam.',
  },
  {
    type: 'tafkhim',
    name: 'Tafkhim',
    arabicName: 'تَفْخِيم',
    tagline: 'Elevated Resonance (Heavy Letters)',
    description:
      'Full, heavy articulation produced by raising the back of the tongue for the seven heavy letters.',
    makhraj: 'Elevated Posterior Tongue',
    harakatCount: 'Full Resonance',
    letters: ['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ'],
    colorName: 'Deep Gold',
    exampleVerseKey: '1:6',
    exampleSurahId: 1,
    exampleAyahNumber: 6,
    exampleArabic: 'ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    exampleTransliteration: 'as-siraatal-mustaqeem',
    exampleFocus: 'Give Saad (ص), Raa (ر), and Taa (ط) deep resonance without rounding the lips.',
  },
];

export const TAJWEED_STYLE_MAP: Record<
  TajweedRuleType,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    wordTint: string;
    dotColor: string;
  }
> = {
  ghunnah: {
    label: 'Ghunnah',
    badgeBg: 'bg-rose-500/12 border-rose-600/25 dark:bg-rose-400/15 dark:border-rose-400/30',
    badgeText: 'text-rose-800 dark:text-rose-200',
    wordTint: 'text-rose-800 dark:text-rose-300',
    dotColor: 'bg-rose-600 dark:bg-rose-400',
  },
  qalqalah: {
    label: 'Qalqalah',
    badgeBg: 'bg-sky-500/12 border-sky-600/25 dark:bg-sky-400/15 dark:border-sky-400/30',
    badgeText: 'text-sky-800 dark:text-sky-200',
    wordTint: 'text-sky-800 dark:text-sky-300',
    dotColor: 'bg-sky-600 dark:bg-sky-400',
  },
  idgham: {
    label: 'Idgham',
    badgeBg: 'bg-amber-500/15 border-amber-600/30 dark:bg-amber-400/15 dark:border-amber-400/30',
    badgeText: 'text-amber-800 dark:text-amber-200',
    wordTint: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
  },
  ikhfa: {
    label: 'Ikhfa',
    badgeBg: 'bg-teal-500/12 border-teal-600/25 dark:bg-teal-400/15 dark:border-teal-400/30',
    badgeText: 'text-teal-800 dark:text-teal-200',
    wordTint: 'text-teal-800 dark:text-teal-300',
    dotColor: 'bg-teal-600 dark:bg-teal-400',
  },
  madd: {
    label: 'Madd',
    badgeBg: 'bg-emerald-600/12 border-emerald-700/25 dark:bg-emerald-400/15 dark:border-emerald-400/30',
    badgeText: 'text-emerald-900 dark:text-emerald-200',
    wordTint: 'text-emerald-800 dark:text-emerald-300',
    dotColor: 'bg-emerald-700 dark:bg-emerald-400',
  },
  tafkhim: {
    label: 'Tafkhim',
    badgeBg: 'bg-orange-500/12 border-orange-600/25 dark:bg-orange-400/15 dark:border-orange-400/30',
    badgeText: 'text-orange-900 dark:text-orange-200',
    wordTint: 'text-orange-800 dark:text-orange-300',
    dotColor: 'bg-orange-600 dark:bg-orange-400',
  },
};
