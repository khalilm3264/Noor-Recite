import {
  ChapterAudioData,
  OpenerPhase,
  Reciter,
  Surah,
  SurahDirectoryEntry,
  SurahOpenerLine,
  TranslationLanguage,
  TranslationSegment,
  VerseTiming,
  WordSegment,
  WordToken,
} from '../types/quran';
import { getWordMeaningText } from '../utils/translationConfig';
import { translateTextsBatch } from '../utils/localizedText';

export const RECITERS: Reciter[] = [
  {
    id: 'ghamdi',
    name: 'Saad Al-Ghamdi',
    style: 'Murattal · Ḥafṣ ‘an ‘Āṣim',
    everyAyahFolder: 'Ghamadi_40kbps',
    riwayah: 'hafs',
    hasAudhubillah: true,
    hasBismillahFile: true,
  },
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    style: 'Murattal · Exact Word-Sync · Ḥafṣ',
    everyAyahFolder: 'Alafasy_128kbps',
    riwayah: 'hafs',
    quranComId: 7,
    hasAudhubillah: true,
    hasBismillahFile: true,
  },
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    style: 'Mujawwad Study · Exact Word-Sync · Ḥafṣ',
    everyAyahFolder: 'Husary_128kbps',
    riwayah: 'hafs',
    quranComId: 6,
    hasAudhubillah: true,
    hasBismillahFile: true,
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit Abdus Samad',
    style: 'Murattal · Exact Word-Sync · Ḥafṣ',
    everyAyahFolder: 'Abdul_Basit_Murattal_192kbps',
    riwayah: 'hafs',
    quranComId: 2,
    hasAudhubillah: false,
    hasBismillahFile: false,
  },
  {
    id: 'minshawi',
    name: 'Muhammad Siddiq Al-Minshawi',
    style: 'Murattal · Exact Word-Sync · Ḥafṣ',
    everyAyahFolder: 'Minshawy_Murattal_128kbps',
    riwayah: 'hafs',
    quranComId: 9,
    hasAudhubillah: false,
    hasBismillahFile: false,
  },
  {
    id: 'shatri',
    name: 'Abu Bakr Al-Shatri',
    style: 'Murattal · Exact Word-Sync · Ḥafṣ',
    everyAyahFolder: 'Abu_Bakr_Ash-Shaatree_128kbps',
    riwayah: 'hafs',
    quranComId: 4,
    hasAudhubillah: true,
    hasBismillahFile: true,
  },
  {
    id: 'yassin-warsh',
    name: 'Yassin Al-Jazaery (Warsh)',
    style: 'Murattal · Warsh ‘an Nāfi‘',
    everyAyahFolder: 'warsh/warsh_Yassin_Al_Jazaery_64kbps',
    riwayah: 'warsh',
    hasAudhubillah: false,
    hasBismillahFile: false,
  },
  {
    id: 'dosary-warsh',
    name: 'Ibrahim Al-Dosary (Warsh)',
    style: 'Murattal · Warsh ‘an Nāfi‘',
    everyAyahFolder: 'warsh/warsh_ibrahim_aldosary_128kbps',
    riwayah: 'warsh',
    hasAudhubillah: false,
    hasBismillahFile: false,
  },
  {
    id: 'abdulbasit-warsh',
    name: 'Abdul Basit Abdus Samad (Warsh)',
    style: 'Murattal · Warsh ‘an Nāfi‘',
    everyAyahFolder: 'warsh/warsh_Abdul_Basit_128kbps',
    riwayah: 'warsh',
    hasAudhubillah: false,
    hasBismillahFile: false,
  },
];

function makeWave(seed: number, length = 40): number[] {
  const bars: number[] = [];
  for (let i = 0; i < length; i++) {
    const angle = (i + 1) * 0.42 + seed * 1.7;
    const envelope = Math.sin(((i + 0.5) / length) * Math.PI);
    const val = 0.25 + 0.65 * Math.abs(Math.sin(angle) * Math.cos(angle * 0.55)) * (0.55 + 0.45 * envelope);
    bars.push(Number(Math.min(0.98, Math.max(0.18, val)).toFixed(2)));
  }
  return bars;
}

export const ISTIADHAH_OPENER: SurahOpenerLine = {
  phase: 'istiadhah',
  label: "Al-Isti‘adhah · Seeking Refuge",
  arabic: 'أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَـٰنِ ٱلرَّجِيمِ',
  transliteration: 'A‘ūdhu billāhi mina sh-shayṭāni r-rajīm',
  translation: 'I seek refuge in Allah from Satan, the accursed.',
  translationHi: 'मैं पनाह माँगता हूँ अल्लाह की धुतकारे हुए शैतान से।',
  translationUr: 'میں پناہ مانگتا ہوں اللہ کی شیطان مردود سے۔',
  translations: {
    bn: 'আমি বিতাড়িত শয়তান থেকে আল্লাহর কাছে আশ্রয় প্রার্থনা করছি।',
    ms: 'Aku berlindung dengan Allah daripada syaitan yang direjam.',
    ha: 'Ina neman tsari da Allah daga Shaiɗan jefaffe.',
    ff: 'Miɗo mooloo e Alla e Seyɗaane mo riiwaa oo.',
  },
  translationSegments: [
    { text: 'I seek refuge', wordIndex: 0 },
    { text: 'in Allah', wordIndex: 1 },
    { text: 'from', wordIndex: 2 },
    { text: 'Satan,', wordIndex: 3 },
    { text: 'the accursed.', wordIndex: 4 },
  ],
  translationSegmentsHi: [
    { text: 'मैं पनाह माँगता हूँ', wordIndex: 0 },
    { text: 'अल्लाह की', wordIndex: 1 },
    { text: 'धुतकारे हुए', wordIndex: 4 },
    { text: 'शैतान', wordIndex: 3 },
    { text: 'से।', wordIndex: 2 },
  ],
  translationSegmentsUr: [
    { text: 'میں پناہ مانگتا ہوں', wordIndex: 0 },
    { text: 'اللہ کی', wordIndex: 1 },
    { text: 'شیطان', wordIndex: 3 },
    { text: 'مردود', wordIndex: 4 },
    { text: 'سے۔', wordIndex: 2 },
  ],
  words: [
    {
      id: 'opener-ist-1',
      arabic: 'أَعُوذُ',
      transliteration: 'A‘ūdhu',
      meaning: 'I seek refuge',
      meaningHi: 'मैं पनाह माँगता हूँ',
      meaningUr: 'میں پناہ مانگتا ہوں',
      meanings: {
        bn: 'আমি আশ্রয় চাই',
        ms: 'Aku berlindung',
        ha: 'Ina neman tsari',
        ff: 'Miɗo mooloo',
      },
    },
    {
      id: 'opener-ist-2',
      arabic: 'بِٱللَّهِ',
      transliteration: 'billāhi',
      meaning: 'in Allah',
      meaningHi: 'अल्लाह की',
      meaningUr: 'اللہ کی',
      meanings: {
        bn: 'আল্লাহর কাছে',
        ms: 'dengan Allah',
        ha: 'da Allah',
        ff: 'e Alla',
      },
    },
    {
      id: 'opener-ist-3',
      arabic: 'مِنَ',
      transliteration: 'mina',
      meaning: 'from',
      meaningHi: 'से',
      meaningUr: 'سے',
      meanings: {
        bn: 'থেকে',
        ms: 'daripada',
        ha: 'daga',
        ff: 'e',
      },
    },
    {
      id: 'opener-ist-4',
      arabic: 'ٱلشَّيْطَـٰنِ',
      transliteration: 'sh-shayṭāni',
      meaning: 'Satan',
      meaningHi: 'शैतान',
      meaningUr: 'شیطان',
      meanings: {
        bn: 'শয়তান',
        ms: 'syaitan',
        ha: 'Shaiɗan',
        ff: 'Seyɗaane',
      },
    },
    {
      id: 'opener-ist-5',
      arabic: 'ٱلرَّجِيمِ',
      transliteration: 'r-rajīm',
      meaning: 'the accursed',
      meaningHi: 'धुतकारा हुआ',
      meaningUr: 'مردود',
      meanings: {
        bn: 'বিতাড়িত',
        ms: 'yang direjam',
        ha: 'jefaffe',
        ff: 'mo riiwaa oo',
      },
    },
  ],
  durationSec: 4.4,
  waveform: makeWave(7),
};

export const BASMALAH_OPENER: SurahOpenerLine = {
  phase: 'basmalah',
  label: 'Al-Basmalah · Opening Invocation',
  arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  transliteration: 'Bismillāhi r-Raḥmāni r-Raḥīm',
  translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
  translationHi: 'अल्लाह के नाम से, जो अत्यंत दयावान्, असीम दया वाला है।',
  translationUr: 'شروع اللہ کا نام لے کر جو بڑا مہربان نہایت رحم والا ہے',
  translations: {
    bn: 'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে (শুরু করছি)।',
    ms: 'Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani.',
    ha: 'Da sũnan Allah, Mai rahama, Mai jin ƙai.',
    ff: 'E innde Alla, Jurmorgol, Jom yurmeende.',
  },
  translationSegments: [
    { text: 'In the name of', wordIndex: 0 },
    { text: 'Allah,', wordIndex: 1 },
    { text: 'the Entirely Merciful,', wordIndex: 2 },
    { text: 'the Especially Merciful.', wordIndex: 3 },
  ],
  translationSegmentsHi: [
    { text: 'अल्लाह के', wordIndex: 1 },
    { text: 'नाम से,', wordIndex: 0 },
    { text: 'जो अत्यंत दयावान्,', wordIndex: 2 },
    { text: 'असीम दया वाला है।', wordIndex: 3 },
  ],
  translationSegmentsUr: [
    { text: 'شروع', wordIndex: 0 },
    { text: 'اللہ کا', wordIndex: 1 },
    { text: 'نام لے کر', wordIndex: 0 },
    { text: 'جو بڑا مہربان', wordIndex: 2 },
    { text: 'نہایت رحم والا ہے', wordIndex: 3 },
  ],
  words: [
    {
      id: 'opener-bas-1',
      arabic: 'بِسْمِ',
      transliteration: 'Bismi',
      meaning: 'In the name of',
      meaningHi: 'नाम से',
      meaningUr: 'نام سے',
      meanings: {
        bn: 'নামে',
        ms: 'Dengan nama',
        ha: 'Da sũnan',
        ff: 'E innde',
      },
    },
    {
      id: 'opener-bas-2',
      arabic: 'ٱللَّهِ',
      transliteration: 'Allāhi',
      meaning: 'Allah',
      meaningHi: 'अल्लाह के',
      meaningUr: 'اللہ کے',
      meanings: {
        bn: 'আল্লাহর',
        ms: 'Allah',
        ha: 'Allah',
        ff: 'Alla',
      },
    },
    {
      id: 'opener-bas-3',
      arabic: 'ٱلرَّحْمَـٰنِ',
      transliteration: 'r-Raḥmāni',
      meaning: 'the Entirely Merciful',
      meaningHi: 'अत्यंत दयावान्',
      meaningUr: 'بڑا مہربان',
      meanings: {
        bn: 'পরম করুণাময়',
        ms: 'Yang Maha Pemurah',
        ha: 'Mai rahama',
        ff: 'Jurmorgol',
      },
    },
    {
      id: 'opener-bas-4',
      arabic: 'ٱلرَّحِيمِ',
      transliteration: 'r-Raḥīm',
      meaning: 'the Especially Merciful',
      meaningHi: 'असीम दया वाला',
      meaningUr: 'نہایت رحم والا',
      meanings: {
        bn: 'অসীম দয়ালু',
        ms: 'Maha Mengasihani',
        ha: 'Mai jin ƙai',
        ff: 'Jom yurmeende',
      },
    },
  ],
  durationSec: 4.8,
  waveform: makeWave(11),
};

export const FEATURED_SURAHS: Surah[] = [
  {
    id: 1,
    nameArabic: 'سُورَةُ ٱلْفَاتِحَةِ',
    nameSimple: 'Al-Fatiha',
    nameMeaning: 'The Opening',
    revelationPlace: 'Meccan',
    juz: 1,
    totalAyahs: 7,
    hasBismillah: false,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '1:1',
        juz: 1,
        arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
        transliteration: 'Bismillaahir-Rahmaanir-Raheem',
        translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
        translationHi: 'अल्लाह के नाम से, जो अत्यंत दयावान्, असीम दया वाला है।',
        translationUr: 'شروع اللہ کا نام لے کر جو بڑا مہربان نہایت رحم والا ہے',
        translationSegments: [
          { text: 'In the name of', wordIndex: 0 },
          { text: 'Allah,', wordIndex: 1 },
          { text: 'the Entirely Merciful,', wordIndex: 2 },
          { text: 'the Especially Merciful.', wordIndex: 3 },
        ],
        translationSegmentsHi: [
          { text: 'अल्लाह के', wordIndex: 1 },
          { text: 'नाम से,', wordIndex: 0 },
          { text: 'जो अत्यंत दयावान्,', wordIndex: 2 },
          { text: 'असीम दया वाला है।', wordIndex: 3 },
        ],
        translationSegmentsUr: [
          { text: 'شروع', wordIndex: 0 },
          { text: 'اللہ کا', wordIndex: 1 },
          { text: 'نام لے کر', wordIndex: 0 },
          { text: 'جو بڑا مہربان', wordIndex: 2 },
          { text: 'نہایت رحم والا ہے', wordIndex: 3 },
        ],
        tafsirBrief:
          'Every consecrated action begins by invoking the Divine Name paired with two complementary dimensions of Mercy: Ar-Rahman (all-encompassing grace) and Ar-Raheem (intimate, enduring compassion).',
        durationSec: 5.5,
        waveform: makeWave(11),
        words: [
          { id: '1-1-1', arabic: 'بِسْمِ', transliteration: 'Bismi', meaning: 'In the name of', meaningHi: 'साथ नाम', meaningUr: 'ساتھ نام', root: 'س م و', partOfSpeech: 'Preposition + Noun' },
          { id: '1-1-2', arabic: 'ٱللَّهِ', transliteration: 'Allāhi', meaning: 'Allah', meaningHi: 'अल्लाह के', meaningUr: 'اللہ کے', root: 'أ ل ه', partOfSpeech: 'Proper Noun', tajweed: 'tafkhim', tajweedNote: 'Laam of Majesty pronounced lightly after a Kasrah' },
          { id: '1-1-3', arabic: 'ٱلرَّحْمَـٰنِ', transliteration: 'Ar-Raḥmāni', meaning: 'the Entirely Merciful', meaningHi: 'जो बहुत मेहरबान', meaningUr: 'جو بے حد مہربان ہے', root: 'ر ح م', partOfSpeech: 'Intensive Adjective', tajweed: 'madd', tajweedNote: 'Natural 2-count elongation on the dagger Alif (ٰ)' },
          { id: '1-1-4', arabic: 'ٱلرَّحِيمِ', transliteration: 'Ar-Raḥīm', meaning: 'the Especially Merciful', meaningHi: 'निहायत रहम करने वाला है', meaningUr: 'بار بار رحم فرمانے والا ہے', root: 'ر ح م', partOfSpeech: 'Permanent Adjective', tajweed: 'madd', tajweedNote: 'Madd Arid lis-Sukoon (2, 4, or 6 counts upon pause)' },
        ],
      },
      {
        number: 2,
        verseKey: '1:2',
        juz: 1,
        arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
        transliteration: 'Al-hamdu lillaahi Rabbil-aalameen',
        translation: 'All praise and gratitude belong to Allah, Lord of all the worlds.',
        translationHi: 'हर प्रकार की प्रशंसा उस अल्लाह के लिए है, जो सारे संसारों का पालनहार है।',
        translationUr: 'سب طرح کی تعریف خدا ہی کو (سزاوار) ہے جو تمام مخلوقات کا پروردگار ہے',
        translationSegments: [
          { text: 'All praise and gratitude', wordIndex: 0 },
          { text: 'belong to Allah,', wordIndex: 1 },
          { text: 'Lord of', wordIndex: 2 },
          { text: 'all the worlds.', wordIndex: 3 },
        ],
        translationSegmentsHi: [
          { text: 'हर प्रकार की प्रशंसा', wordIndex: 0 },
          { text: 'उस अल्लाह के लिए है,', wordIndex: 1 },
          { text: 'जो सारे संसारों का', wordIndex: 3 },
          { text: 'पालनहार है।', wordIndex: 2 },
        ],
        translationSegmentsUr: [
          { text: 'سب طرح کی تعریف', wordIndex: 0 },
          { text: 'خدا ہی کو (سزاوار) ہے', wordIndex: 1 },
          { text: 'جو تمام مخلوقات کا', wordIndex: 3 },
          { text: 'پروردگار ہے', wordIndex: 2 },
        ],
        tafsirBrief:
          'Al-Hamd combines both praise for perfection and gratitude for continuous providence across every realm of creation.',
        durationSec: 5.2,
        waveform: makeWave(12),
        words: [
          { id: '1-2-1', arabic: 'ٱلْحَمْدُ', transliteration: 'Al-ḥamdu', meaning: 'All praise', meaningHi: 'सब तारीफ़', meaningUr: 'سب تعریف', root: 'ح م د', partOfSpeech: 'Noun' },
          { id: '1-2-2', arabic: 'لِلَّهِ', transliteration: 'lillāhi', meaning: 'belongs to Allah', meaningHi: 'अल्लाह के लिए है', meaningUr: 'اللہ کے لیے ہے', root: 'أ ل ه', partOfSpeech: 'Preposition + Noun' },
          { id: '1-2-3', arabic: 'رَبِّ', transliteration: 'Rabbi', meaning: 'Lord (Sustainer) of', meaningHi: 'जो रब है', meaningUr: 'جو رب ہے', root: 'ر ب ب', partOfSpeech: 'Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Raa due to Fathah' },
          { id: '1-2-4', arabic: 'ٱلْعَـٰلَمِينَ', transliteration: 'al-ʿālamīn', meaning: 'all the worlds', meaningHi: 'तमाम जहानों का', meaningUr: 'تمام جہانوں کا', root: 'ع ل م', partOfSpeech: 'Plural Noun', tajweed: 'madd', tajweedNote: 'Dagger Alif 2 counts; ending Ya elongates 2–6 counts on stop' },
        ],
      },
      {
        number: 3,
        verseKey: '1:3',
        juz: 1,
        arabic: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
        transliteration: 'Ar-Rahmaanir-Raheem',
        translation: 'The Entirely Merciful, the Especially Merciful,',
        translationHi: 'जो अत्यंत दयावान्, असीम दया वाला है।',
        translationUr: 'بڑا مہربان نہایت رحم والا',
        translationSegments: [
          { text: 'The Entirely Merciful,', wordIndex: 0 },
          { text: 'the Especially Merciful,', wordIndex: 1 },
        ],
        translationSegmentsHi: [
          { text: 'जो अत्यंत दयावान्,', wordIndex: 0 },
          { text: 'असीम दया वाला है।', wordIndex: 1 },
        ],
        translationSegmentsUr: [
          { text: 'بڑا مہربان', wordIndex: 0 },
          { text: 'نہایت رحم والا', wordIndex: 1 },
        ],
        tafsirBrief:
          'Reiterating Divine Mercy right after Lordship reminds the reciter that Divine sovereignty is rooted in compassion rather than tyranny.',
        durationSec: 4.2,
        waveform: makeWave(13),
        words: [
          { id: '1-3-1', arabic: 'ٱلرَّحْمَـٰنِ', transliteration: 'Ar-Raḥmāni', meaning: 'The Entirely Merciful', meaningHi: 'बहुत मेहरबान है', meaningUr: 'جو بہت مہربان', root: 'ر ح م', partOfSpeech: 'Adjective', tajweed: 'tafkhim', tajweedNote: 'Heavy Raa with Shaddah' },
          { id: '1-3-2', arabic: 'ٱلرَّحِيمِ', transliteration: 'Ar-Raḥīm', meaning: 'the Especially Merciful', meaningHi: 'निहायत रहम करने वाला है', meaningUr: 'بار بار رحم فرمانے والا ہے', root: 'ر ح م', partOfSpeech: 'Adjective', tajweed: 'madd', tajweedNote: 'Madd Arid lis-Sukoon upon stopping' },
        ],
      },
      {
        number: 4,
        verseKey: '1:4',
        juz: 1,
        arabic: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
        transliteration: 'Maaliki yawmid-deen',
        translation: 'Sovereign Master of the Day of Recompense.',
        translationHi: 'जो बदले के दिन का मालिक है।',
        translationUr: 'انصاف کے دن کا حاکم',
        translationSegments: [
          { text: 'Sovereign Master of', wordIndex: 0 },
          { text: 'the Day of', wordIndex: 1 },
          { text: 'Recompense.', wordIndex: 2 },
        ],
        translationSegmentsHi: [
          { text: 'जो बदले के', wordIndex: 2 },
          { text: 'दिन का', wordIndex: 1 },
          { text: 'मालिक है।', wordIndex: 0 },
        ],
        translationSegmentsUr: [
          { text: 'انصاف کے', wordIndex: 2 },
          { text: 'دن کا', wordIndex: 1 },
          { text: 'حاکم', wordIndex: 0 },
        ],
        tafsirBrief:
          'Balances hope with moral accountability: mercy governs the present, and absolute justice awaits on the Day of Judgment.',
        durationSec: 4.5,
        waveform: makeWave(14),
        words: [
          { id: '1-4-1', arabic: 'مَـٰلِكِ', transliteration: 'Māliki', meaning: 'Master / Sovereign of', meaningHi: 'मालिक है', meaningUr: 'مالک ہے', root: 'م ل ك', partOfSpeech: 'Active Participle', tajweed: 'madd', tajweedNote: 'Natural 2-count elongation on Meem' },
          { id: '1-4-2', arabic: 'يَوْمِ', transliteration: 'yawmi', meaning: 'the Day of', meaningHi: 'दिन का', meaningUr: 'دن کا', root: 'ي و م', partOfSpeech: 'Noun' },
          { id: '1-4-3', arabic: 'ٱلدِّينِ', transliteration: 'ad-dīn', meaning: 'Recompense', meaningHi: 'बदले के', meaningUr: 'بدلے کے', root: 'د ي ن', partOfSpeech: 'Noun', tajweed: 'madd', tajweedNote: 'Solar Laam assimilates into Daal; 2–6 count ending Madd' },
        ],
      },
      {
        number: 5,
        verseKey: '1:5',
        juz: 1,
        arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
        transliteration: "Iyyaaka na'budu wa iyyaaka nasta'een",
        translation: 'You alone we worship, and You alone we ask for help.',
        translationHi: '(ऐ अल्लाह!) हम तेरी ही इबादत करते हैं और तुझी से सहायता माँगते हैं।',
        translationUr: '(اے پروردگار) ہم تیری ہی عبادت کرتے ہیں اور تجھ ہی سے مدد مانگتے ہیں',
        translationSegments: [
          { text: 'You alone', wordIndex: 0 },
          { text: 'we worship,', wordIndex: 1 },
          { text: 'and You alone', wordIndex: 2 },
          { text: 'we ask for help.', wordIndex: 3 },
        ],
        translationSegmentsHi: [
          { text: '(ऐ अल्लाह!) हम तेरी ही', wordIndex: 0 },
          { text: 'इबादत करते हैं', wordIndex: 1 },
          { text: 'और तुझी से', wordIndex: 2 },
          { text: 'सहायता माँगते हैं।', wordIndex: 3 },
        ],
        translationSegmentsUr: [
          { text: '(اے پروردگار) ہم تیری ہی', wordIndex: 0 },
          { text: 'عبادت کرتے ہیں', wordIndex: 1 },
          { text: 'اور تجھ ہی سے', wordIndex: 2 },
          { text: 'مدد مانگتے ہیں', wordIndex: 3 },
        ],
        tafsirBrief:
          'The grammatical pivot of Al-Fatiha: shifting from third-person praise to intimate second-person address ("You alone").',
        durationSec: 5.8,
        waveform: makeWave(15),
        words: [
          { id: '1-5-1', arabic: 'إِيَّاكَ', transliteration: 'Iyyāka', meaning: 'You alone', meaningHi: 'सिर्फ़ तेरी ही', meaningUr: 'صرف تیری', partOfSpeech: 'Object Pronoun' },
          { id: '1-5-2', arabic: 'نَعْبُدُ', transliteration: 'naʿbudu', meaning: 'we worship', meaningHi: 'हम इबादत करते हैं', meaningUr: 'ہم عبادت کرتے ہیں', root: 'ع ب د', partOfSpeech: 'Imperfect Verb' },
          { id: '1-5-3', arabic: 'وَإِيَّاكَ', transliteration: 'wa iyyāka', meaning: 'and You alone', meaningHi: 'और सिर्फ़ तेरी ही', meaningUr: 'اور صرف تجھ سے', partOfSpeech: 'Conjunction + Pronoun' },
          { id: '1-5-4', arabic: 'نَسْتَعِينُ', transliteration: 'nastaʿīn', meaning: 'we ask for help', meaningHi: 'हम मदद चाहते हैं', meaningUr: 'ہم مدد چاہتے ہیں', root: 'ع و ن', partOfSpeech: 'Imperfect Verb', tajweed: 'madd', tajweedNote: 'Elongate Ya for 2, 4, or 6 counts when pausing' },
        ],
      },
      {
        number: 6,
        verseKey: '1:6',
        juz: 1,
        arabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
        transliteration: 'Ihdinas-siraatal-mustaqeem',
        translation: 'Guide us to the straight path,',
        translationHi: 'हमें सीधे मार्ग पर चला।',
        translationUr: 'ہم کو سیدھے رستے چلا',
        translationSegments: [
          { text: 'Guide us to', wordIndex: 0 },
          { text: 'the', wordIndex: 1 },
          { text: 'straight', wordIndex: 2 },
          { text: 'path,', wordIndex: 1 },
        ],
        translationSegmentsHi: [
          { text: 'हमें', wordIndex: 0 },
          { text: 'सीधे', wordIndex: 2 },
          { text: 'मार्ग पर', wordIndex: 1 },
          { text: 'चला।', wordIndex: 0 },
        ],
        translationSegmentsUr: [
          { text: 'ہم کو', wordIndex: 0 },
          { text: 'سیدھے', wordIndex: 2 },
          { text: 'رستے', wordIndex: 1 },
          { text: 'چلا', wordIndex: 0 },
        ],
        tafsirBrief:
          'A continuous prayer not merely to find the straight path once, but to deepen steadiness and clarity upon it at every stage of life.',
        durationSec: 4.8,
        waveform: makeWave(16),
        words: [
          { id: '1-6-1', arabic: 'ٱهْدِنَا', transliteration: 'Ihdinā', meaning: 'Guide us to', meaningHi: 'हिदायत दे हमें', meaningUr: 'دکھا ہم کو', root: 'ه د ي', partOfSpeech: 'Imperative Verb' },
          { id: '1-6-2', arabic: 'ٱلصِّرَٰطَ', transliteration: 'aṣ-ṣirāṭa', meaning: 'the Path', meaningHi: 'रास्ते', meaningUr: 'راستہ', root: 'ص ر ط', partOfSpeech: 'Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy articulation on Saad (ص), Raa (ر), and Taa (ط)' },
          { id: '1-6-3', arabic: 'ٱلْمُسْتَقِيمَ', transliteration: 'al-mustaqīm', meaning: 'the Straight', meaningHi: 'सीधे की', meaningUr: 'سیدھا', root: 'ق و م', partOfSpeech: 'Adjective', tajweed: 'tafkhim', tajweedNote: 'Elevated Qaf followed by Madd Arid lis-Sukoon' },
        ],
      },
      {
        number: 7,
        verseKey: '1:7',
        juz: 1,
        arabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
        transliteration: "Siraatallatheena an'amta 'alayhim ghayril-maghdoobi 'alayhim wa lad-daaaalleen",
        translation:
          'The path of those upon whom You have bestowed favor, not of those upon whom [Your] anger fell, nor of those who are astray.',
        translationHi:
          'उन लोगों का मार्ग, जिनपर तूने अनुग्रह किया। उनका नहीं, जिनपर तेरा प्रकोप हुआ और न ही उनका, जो गुमराह हैं।',
        translationUr:
          'ان لوگوں کے رستے جن پر تو اپنا فضل وکرم کرتا رہا نہ ان کے جن پر غصے ہوتا رہا اور نہ گمراہوں کے',
        translationSegments: [
          { text: 'The path of', wordIndex: 0 },
          { text: 'those', wordIndex: 1 },
          { text: 'upon whom', wordIndex: 3 },
          { text: 'You have bestowed favor,', wordIndex: 2 },
          { text: 'not of', wordIndex: 4 },
          { text: 'those upon whom', wordIndex: 6 },
          { text: '[Your] anger fell,', wordIndex: 5 },
          { text: 'nor', wordIndex: 7 },
          { text: 'of those who are astray.', wordIndex: 8 },
        ],
        translationSegmentsHi: [
          { text: 'उन लोगों का', wordIndex: 1 },
          { text: 'मार्ग,', wordIndex: 0 },
          { text: 'जिनपर', wordIndex: 3 },
          { text: 'तूने अनुग्रह किया।', wordIndex: 2 },
          { text: 'उनका नहीं,', wordIndex: 4 },
          { text: 'जिनपर', wordIndex: 6 },
          { text: 'तेरा प्रकोप हुआ', wordIndex: 5 },
          { text: 'और न ही', wordIndex: 7 },
          { text: 'उनका, जो गुमराह हैं।', wordIndex: 8 },
        ],
        translationSegmentsUr: [
          { text: 'ان لوگوں کے', wordIndex: 1 },
          { text: 'رستے', wordIndex: 0 },
          { text: 'جن پر', wordIndex: 3 },
          { text: 'تو اپنا فضل وکرم کرتا رہا', wordIndex: 2 },
          { text: 'نہ ان کے', wordIndex: 4 },
          { text: 'جن پر', wordIndex: 6 },
          { text: 'غصے ہوتا رہا', wordIndex: 5 },
          { text: 'اور نہ', wordIndex: 7 },
          { text: 'گمراہوں کے', wordIndex: 8 },
        ],
        tafsirBrief:
          'Defines spiritual clarity through living exemplars: those blessed with wisdom and integrity, avoiding both willful arrogance and heedless wandering.',
        durationSec: 9.8,
        waveform: makeWave(17),
        words: [
          { id: '1-7-1', arabic: 'صِرَٰطَ', transliteration: 'Ṣirāṭa', meaning: 'The path of', meaningHi: 'रास्ता', meaningUr: 'راستہ', root: 'ص ر ط', partOfSpeech: 'Noun', tajweed: 'tafkhim', tajweedNote: 'Saad and Taa maintain elevated tongue posture' },
          { id: '1-7-2', arabic: 'ٱلَّذِينَ', transliteration: 'alladhīna', meaning: 'those whom', meaningHi: 'उनका', meaningUr: 'ان لوگوں کا', partOfSpeech: 'Relative Pronoun' },
          { id: '1-7-3', arabic: 'أَنْعَمْتَ', transliteration: 'anʿamta', meaning: 'You bestowed favor', meaningHi: 'इनाम किया तूने', meaningUr: 'انعام کیا تو نے', root: 'ن ع م', partOfSpeech: 'Past Verb' },
          { id: '1-7-4', arabic: 'عَلَيْهِمْ', transliteration: 'ʿalayhim', meaning: 'upon them', meaningHi: 'जिन पर', meaningUr: 'اوپر ان کے', partOfSpeech: 'Preposition + Pronoun' },
          { id: '1-7-5', arabic: 'غَيْرِ', transliteration: 'ghayri', meaning: 'not (the path) of', meaningHi: 'ना', meaningUr: 'نہ ان (لوگوں) کا', root: 'غ ي ر', partOfSpeech: 'Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Ghayn followed by soft Raa' },
          { id: '1-7-6', arabic: 'ٱلْمَغْضُوبِ', transliteration: 'al-maghḍūbi', meaning: 'those angered upon', meaningHi: 'उनका जो ग़ज़ब किया गया', meaningUr: 'غضب کیا گیا', root: 'غ ض ب', partOfSpeech: 'Passive Participle', tajweed: 'tafkhim', tajweedNote: 'Ghayn and Daad are elevated heavy letters' },
          { id: '1-7-7', arabic: 'عَلَيْهِمْ', transliteration: 'ʿalayhim', meaning: 'upon them', meaningHi: 'जिन पर', meaningUr: 'اوپر ان کے', partOfSpeech: 'Preposition + Pronoun' },
          { id: '1-7-8', arabic: 'وَلَا', transliteration: 'wa lā', meaning: 'and not', meaningHi: 'और ना', meaningUr: 'اور نہ', partOfSpeech: 'Conjunction + Negation' },
          { id: '1-7-9', arabic: 'ٱلضَّآلِّينَ', transliteration: 'aḍ-ḍāāāllīn', meaning: 'those who go astray', meaningHi: 'उनका जो गुमराह हैं', meaningUr: 'ان (لوگوں) کا جو گمراہ ہیں', root: 'ض ل ل', partOfSpeech: 'Active Participle', tajweed: 'madd', tajweedNote: 'Madd Lazim: hold full 6 counts before doubled Laam' },
        ],
      },
    ],
  },
  {
    id: 93,
    nameArabic: 'سُورَةُ ٱلضُّحَىٰ',
    nameSimple: 'Ad-Duha',
    nameMeaning: 'The Morning Brightness',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 11,
    hasBismillah: true,
    estimatedMinutes: 2,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '93:1',
        juz: 30,
        arabic: 'وَٱلضُّحَىٰ',
        transliteration: 'Wad-duhaa',
        translation: 'By the morning brightness,',
        tafsirBrief: 'Revealed after a pause in revelation to console the heart: light always returns with morning clarity.',
        durationSec: 3.1,
        waveform: makeWave(21),
        words: [
          { id: '93-1-1', arabic: 'وَٱلضُّحَىٰ', transliteration: 'Waḍ-ḍuḥā', meaning: 'By the morning brightness', root: 'ض ح و', partOfSpeech: 'Oath + Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Daad followed by natural 2-count Madd' },
        ],
      },
      {
        number: 2,
        verseKey: '93:2',
        juz: 30,
        arabic: 'وَٱلَّيْلِ إِذَا سَجَىٰ',
        transliteration: 'Wal-layli idhaa sajaa',
        translation: 'And by the night when it grows still and tranquil,',
        translationSegments: [
          { text: 'And by the night', wordIndex: 0 },
          { text: 'when', wordIndex: 1 },
          { text: 'it grows still and tranquil,', wordIndex: 2 },
        ],
        tafsirBrief: 'Night stillness is not abandonment, but a restorative sanctuary paired with daylight.',
        durationSec: 3.8,
        waveform: makeWave(22),
        words: [
          { id: '93-2-1', arabic: 'وَٱلَّيْلِ', transliteration: 'Wal-layli', meaning: 'And by the night', root: 'ل ي ل', partOfSpeech: 'Oath + Noun' },
          { id: '93-2-2', arabic: 'إِذَا', transliteration: 'idhā', meaning: 'when', partOfSpeech: 'Time Particle', tajweed: 'madd', tajweedNote: 'Natural 2-count Alif elongation' },
          { id: '93-2-3', arabic: 'سَجَىٰ', transliteration: 'sajā', meaning: 'it settles calmly', root: 'س ج و', partOfSpeech: 'Past Verb' },
        ],
      },
      {
        number: 3,
        verseKey: '93:3',
        juz: 30,
        arabic: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ',
        transliteration: 'Maa wadda‘aka Rabbuka wa maa qalaa',
        translation: 'Your Lord has neither forsaken you, nor is He displeased.',
        translationSegments: [
          { text: 'Your Lord', wordIndex: 2 },
          { text: 'has neither', wordIndex: 0 },
          { text: 'forsaken you,', wordIndex: 1 },
          { text: 'nor is He', wordIndex: 3 },
          { text: 'displeased.', wordIndex: 4 },
        ],
        tafsirBrief: 'Direct reassurance dispelling loneliness during silent spiritual intervals.',
        durationSec: 4.9,
        waveform: makeWave(23),
        words: [
          { id: '93-3-1', arabic: 'مَا', transliteration: 'Mā', meaning: 'Not', partOfSpeech: 'Negation' },
          { id: '93-3-2', arabic: 'وَدَّعَكَ', transliteration: 'waddaʿaka', meaning: 'has forsaken you', root: 'و د ع', partOfSpeech: 'Past Verb' },
          { id: '93-3-3', arabic: 'رَبُّكَ', transliteration: 'Rabbuka', meaning: 'your Lord', root: 'ر ب ب', partOfSpeech: 'Noun' },
          { id: '93-3-4', arabic: 'وَمَا', transliteration: 'wa mā', meaning: 'and not', partOfSpeech: 'Conjunction + Negation' },
          { id: '93-3-5', arabic: 'قَلَىٰ', transliteration: 'qalā', meaning: 'is He displeased', root: 'ق ل ي', partOfSpeech: 'Past Verb', tajweed: 'tafkhim', tajweedNote: 'Heavy Qaf before natural Alif Maqsurah' },
        ],
      },
      {
        number: 4,
        verseKey: '93:4',
        juz: 30,
        arabic: 'وَلَلْـَٔاخِرَةُ خَيْرٌ لَّكَ مِنَ ٱلْأُولَىٰ',
        transliteration: 'Wa lal-aakhiratu khayrul-laka minal-oolaa',
        translation: 'And surely the Hereafter will be far better for you than the present.',
        translationSegments: [
          { text: 'And surely the Hereafter', wordIndex: 0 },
          { text: 'will be far better', wordIndex: 1 },
          { text: 'for you', wordIndex: 2 },
          { text: 'than', wordIndex: 3 },
          { text: 'the present.', wordIndex: 4 },
        ],
        tafsirBrief: 'Promises upward trajectory: every future chapter carries greater peace and fulfillment than what has passed.',
        durationSec: 5.4,
        waveform: makeWave(24),
        words: [
          { id: '93-4-1', arabic: 'وَلَلْـَٔاخِرَةُ', transliteration: 'Wa lal-ākhiratu', meaning: 'And surely the Hereafter', root: 'أ خ ر', partOfSpeech: 'Noun' },
          { id: '93-4-2', arabic: 'خَيْرٌ', transliteration: 'khayrul', meaning: 'is better', root: 'خ ي ر', partOfSpeech: 'Noun', tajweed: 'idgham', tajweedNote: 'Tanween merges cleanly into Laam (Idgham Bila Ghunnah)' },
          { id: '93-4-3', arabic: 'لَّكَ', transliteration: 'laka', meaning: 'for you', partOfSpeech: 'Preposition + Pronoun' },
          { id: '93-4-4', arabic: 'مِنَ', transliteration: 'mina', meaning: 'than', partOfSpeech: 'Preposition' },
          { id: '93-4-5', arabic: 'ٱلْأُولَىٰ', transliteration: 'al-ūlā', meaning: 'the first (world)', root: 'أ و ل', partOfSpeech: 'Noun', tajweed: 'madd', tajweedNote: '2-count natural elongation' },
        ],
      },
      {
        number: 5,
        verseKey: '93:5',
        juz: 30,
        arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ',
        transliteration: 'Wa lasawfa yu‘teeka Rabbuka fatardaa',
        translation: 'And soon your Lord will give you until you are deeply satisfied.',
        translationSegments: [
          { text: 'And soon', wordIndex: 0 },
          { text: 'your Lord', wordIndex: 2 },
          { text: 'will give you', wordIndex: 1 },
          { text: 'until you are deeply satisfied.', wordIndex: 3 },
        ],
        tafsirBrief: 'Generosity tailored to complete contentment of the heart.',
        durationSec: 4.8,
        waveform: makeWave(25),
        words: [
          { id: '93-5-1', arabic: 'وَلَسَوْفَ', transliteration: 'Wa lasawfa', meaning: 'And soon', partOfSpeech: 'Future Particle' },
          { id: '93-5-2', arabic: 'يُعْطِيكَ', transliteration: 'yuʿṭīka', meaning: 'will give you', root: 'ع ط و', partOfSpeech: 'Imperfect Verb', tajweed: 'tafkhim', tajweedNote: 'Heavy Taa followed by 2-count Ya' },
          { id: '93-5-3', arabic: 'رَبُّكَ', transliteration: 'Rabbuka', meaning: 'your Lord', root: 'ر ب ب', partOfSpeech: 'Noun' },
          { id: '93-5-4', arabic: 'فَتَرْضَىٰ', transliteration: 'fatarḍā', meaning: 'so you will be pleased', root: 'ر ض و', partOfSpeech: 'Imperfect Verb', tajweed: 'tafkhim', tajweedNote: 'Heavy Raa and Daad' },
        ],
      },
      {
        number: 6,
        verseKey: '93:6',
        juz: 30,
        arabic: 'أَلَمْ يَجِدْكَ يَتِيمًا فَـَٔاوَىٰ',
        transliteration: 'Alam yajidka yateeman fa-aawaa',
        translation: 'Did He not find you an orphan and shelter you?',
        translationSegments: [
          { text: 'Did', wordIndex: 0 },
          { text: 'He', wordIndex: 1 },
          { text: 'not', wordIndex: 0 },
          { text: 'find you', wordIndex: 1 },
          { text: 'an orphan', wordIndex: 2 },
          { text: 'and shelter you?', wordIndex: 3 },
        ],
        tafsirBrief: 'Recounts three past mercies as proof of ongoing Divine care.',
        durationSec: 4.7,
        waveform: makeWave(26),
        words: [
          { id: '93-6-1', arabic: 'أَلَمْ', transliteration: 'Alam', meaning: 'Did not', partOfSpeech: 'Interrogative' },
          { id: '93-6-2', arabic: 'يَجِدْكَ', transliteration: 'yajidka', meaning: 'He find you', root: 'و ج د', partOfSpeech: 'Jussive Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Sughra bounce on silent Daal (دْ)' },
          { id: '93-6-3', arabic: 'يَتِيمًا', transliteration: 'yatīman', meaning: 'an orphan', root: 'ي ت م', partOfSpeech: 'Noun', tajweed: 'ikhfa', tajweedNote: 'Ikhfa nasal concealment of Tanween before Faa' },
          { id: '93-6-4', arabic: 'فَـَٔاوَىٰ', transliteration: 'fa-āwā', meaning: 'and gave shelter', root: 'أ و ي', partOfSpeech: 'Past Verb' },
        ],
      },
      {
        number: 7,
        verseKey: '93:7',
        juz: 30,
        arabic: 'وَوَجَدَكَ ضَآلًّا فَهَدَىٰ',
        transliteration: 'Wa wajadaka daaaallan fahadaa',
        translation: 'And He found you lost [unaware of the way] and guided you,',
        translationSegments: [
          { text: 'And He found you', wordIndex: 0 },
          { text: 'lost [unaware of the way]', wordIndex: 1 },
          { text: 'and guided you,', wordIndex: 2 },
        ],
        tafsirBrief: 'Honors the earnest seeker with illuminating direction.',
        durationSec: 4.5,
        waveform: makeWave(27),
        words: [
          { id: '93-7-1', arabic: 'وَوَجَدَكَ', transliteration: 'Wa wajadaka', meaning: 'And He found you', root: 'و ج د', partOfSpeech: 'Past Verb' },
          { id: '93-7-2', arabic: 'ضَآلًّا', transliteration: 'ḍāāāllan', meaning: 'lost / unaware (of the way)', root: 'ض ل ل', partOfSpeech: 'Active Participle', tajweed: 'madd', tajweedNote: 'Madd Lazim (6 counts) + Ikhfa before Faa' },
          { id: '93-7-3', arabic: 'فَهَدَىٰ', transliteration: 'fahadā', meaning: 'and guided you', root: 'ه د ي', partOfSpeech: 'Past Verb' },
        ],
      },
      {
        number: 8,
        verseKey: '93:8',
        juz: 30,
        arabic: 'وَوَجَدَكَ عَآئِلًا فَأَغْنَىٰ',
        transliteration: 'Wa wajadaka ‘aaa’ilan fa-aghnaa',
        translation: 'And He found you in need and enriched you.',
        translationSegments: [
          { text: 'And He found you', wordIndex: 0 },
          { text: 'in need', wordIndex: 1 },
          { text: 'and enriched you.', wordIndex: 2 },
        ],
        tafsirBrief: 'True enrichment (ghina) encompasses both outer provision and inner sufficiency of spirit.',
        durationSec: 4.5,
        waveform: makeWave(28),
        words: [
          { id: '93-8-1', arabic: 'وَوَجَدَكَ', transliteration: 'Wa wajadaka', meaning: 'And He found you', root: 'و ج د', partOfSpeech: 'Past Verb' },
          { id: '93-8-2', arabic: 'عَآئِلًا', transliteration: 'ʿāʾilan', meaning: 'in need', root: 'ع ي ل', partOfSpeech: 'Active Participle', tajweed: 'madd', tajweedNote: 'Madd Muttasil (4–5 counts) + Ikhfa before Faa' },
          { id: '93-8-3', arabic: 'فَأَغْنَىٰ', transliteration: 'fa-aghnā', meaning: 'and made self-sufficient', root: 'غ ن ي', partOfSpeech: 'Past Verb' },
        ],
      },
      {
        number: 9,
        verseKey: '93:9',
        juz: 30,
        arabic: 'فَأَمَّا ٱلْيَتِيمَ فَلَا تَقْهَرْ',
        transliteration: 'Fa-ammal-yateema falaa taqhar',
        translation: 'Therefore, as for the orphan, do not oppress him.',
        translationSegments: [
          { text: 'Therefore, as for', wordIndex: 0 },
          { text: 'the orphan,', wordIndex: 1 },
          { text: 'do not', wordIndex: 2 },
          { text: 'oppress him.', wordIndex: 3 },
        ],
        tafsirBrief: 'Gratitude for past shelter translates immediately into gentle stewardship over the vulnerable.',
        durationSec: 4.2,
        waveform: makeWave(29),
        words: [
          { id: '93-9-1', arabic: 'فَأَمَّا', transliteration: 'Fa-ammā', meaning: 'So as for', partOfSpeech: 'Particle', tajweed: 'ghunnah', tajweedNote: '2-count nasal Ghunnah on Meem Mushaddadah (مّ)' },
          { id: '93-9-2', arabic: 'ٱلْيَتِيمَ', transliteration: 'al-yatīma', meaning: 'the orphan', root: 'ي ت م', partOfSpeech: 'Noun' },
          { id: '93-9-3', arabic: 'فَلَا', transliteration: 'falā', meaning: 'do not', partOfSpeech: 'Prohibition' },
          { id: '93-9-4', arabic: 'تَقْهَرْ', transliteration: 'taqhar', meaning: 'oppress', root: 'ق ه ر', partOfSpeech: 'Jussive Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah bounce on silent Qaf (قْ)' },
        ],
      },
      {
        number: 10,
        verseKey: '93:10',
        juz: 30,
        arabic: 'وَأَمَّا ٱلسَّآئِلَ فَلَا تَنْهَرْ',
        transliteration: 'Wa ammas-saaa’ila falaa tanhar',
        translation: 'And as for the one who asks, do not turn him away harshly.',
        translationSegments: [
          { text: 'And as for', wordIndex: 0 },
          { text: 'the one who asks,', wordIndex: 1 },
          { text: 'do not', wordIndex: 2 },
          { text: 'turn him away harshly.', wordIndex: 3 },
        ],
        tafsirBrief: 'Kindness in speech preserves dignity even when one cannot fulfill every request.',
        durationSec: 4.4,
        waveform: makeWave(30),
        words: [
          { id: '93-10-1', arabic: 'وَأَمَّا', transliteration: 'Wa ammā', meaning: 'And as for', partOfSpeech: 'Particle', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Meem (مّ)' },
          { id: '93-10-2', arabic: 'ٱلسَّآئِلَ', transliteration: 'as-sāʾila', meaning: 'the petitioner', root: 'س أ ل', partOfSpeech: 'Active Participle', tajweed: 'madd', tajweedNote: 'Madd Muttasil (4–5 counts)' },
          { id: '93-10-3', arabic: 'فَلَا', transliteration: 'falā', meaning: 'do not', partOfSpeech: 'Prohibition' },
          { id: '93-10-4', arabic: 'تَنْهَرْ', transliteration: 'tanhar', meaning: 'repel harshly', root: 'ن ه ر', partOfSpeech: 'Jussive Verb' },
        ],
      },
      {
        number: 11,
        verseKey: '93:11',
        juz: 30,
        arabic: 'وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ',
        transliteration: 'Wa ammaa bini‘mati Rabbika fahaddith',
        translation: 'And as for the favor of your Lord, proclaim it in gratitude.',
        translationSegments: [
          { text: 'And as for', wordIndex: 0 },
          { text: 'the favor of', wordIndex: 1 },
          { text: 'your Lord,', wordIndex: 2 },
          { text: 'proclaim it in gratitude.', wordIndex: 3 },
        ],
        tafsirBrief: 'Closes the chapter by turning remembered blessings into spoken thankfulness and generosity.',
        durationSec: 4.6,
        waveform: makeWave(31),
        words: [
          { id: '93-11-1', arabic: 'وَأَمَّا', transliteration: 'Wa ammā', meaning: 'And as for', partOfSpeech: 'Particle', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Meem (مّ)' },
          { id: '93-11-2', arabic: 'بِنِعْمَةِ', transliteration: 'biniʿmati', meaning: 'the favor of', root: 'ن ع م', partOfSpeech: 'Preposition + Noun' },
          { id: '93-11-3', arabic: 'رَبِّكَ', transliteration: 'Rabbika', meaning: 'your Lord', root: 'ر ب ب', partOfSpeech: 'Noun' },
          { id: '93-11-4', arabic: 'فَحَدِّثْ', transliteration: 'faḥaddith', meaning: 'proclaim / share', root: 'ح د ث', partOfSpeech: 'Imperative Verb' },
        ],
      },
    ],
  },
  {
    id: 94,
    nameArabic: 'سُورَةُ ٱلشَّرْحِ',
    nameSimple: 'Ash-Sharh',
    nameMeaning: 'The Relief',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 8,
    hasBismillah: true,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '94:1',
        juz: 30,
        arabic: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ',
        transliteration: 'Alam nashrah laka sadrak',
        translation: 'Did We not expand for you your breast,',
        translationSegments: [
          { text: 'Did', wordIndex: 0 },
          { text: 'We', wordIndex: 1 },
          { text: 'not', wordIndex: 0 },
          { text: 'expand', wordIndex: 1 },
          { text: 'for you', wordIndex: 2 },
          { text: 'your breast,', wordIndex: 3 },
        ],
        tafsirBrief: 'Expanding the heart means granting inner spaciousness capable of holding trials with poise.',
        durationSec: 3.6,
        waveform: makeWave(41),
        words: [
          { id: '94-1-1', arabic: 'أَلَمْ', transliteration: 'Alam', meaning: 'Did not', partOfSpeech: 'Interrogative' },
          { id: '94-1-2', arabic: 'نَشْرَحْ', transliteration: 'nashraḥ', meaning: 'We expand', root: 'ش ر ح', partOfSpeech: 'Jussive Verb' },
          { id: '94-1-3', arabic: 'لَكَ', transliteration: 'laka', meaning: 'for you', partOfSpeech: 'Preposition + Pronoun' },
          { id: '94-1-4', arabic: 'صَدْرَكَ', transliteration: 'ṣadrak', meaning: 'your chest / heart', root: 'ص د ر', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah on silent Daal (دْ)' },
        ],
      },
      {
        number: 2,
        verseKey: '94:2',
        juz: 30,
        arabic: 'وَوَضَعْنَا عَنكَ وِزْرَكَ',
        transliteration: 'Wa wada‘naa ‘anka wizrak',
        translation: 'And We removed from you your burden,',
        translationSegments: [
          { text: 'And We removed', wordIndex: 0 },
          { text: 'from you', wordIndex: 1 },
          { text: 'your burden,', wordIndex: 2 },
        ],
        tafsirBrief: 'Relief from spiritual and emotional weight through Divine mercy.',
        durationSec: 3.7,
        waveform: makeWave(42),
        words: [
          { id: '94-2-1', arabic: 'وَوَضَعْنَا', transliteration: 'Wa waḍaʿnā', meaning: 'And We removed', root: 'و ض ع', partOfSpeech: 'Past Verb' },
          { id: '94-2-2', arabic: 'عَنكَ', transliteration: 'ʿanka', meaning: 'from you', partOfSpeech: 'Preposition + Pronoun', tajweed: 'ikhfa', tajweedNote: 'Ikhfa nasalization on Noon before Kaaf' },
          { id: '94-2-3', arabic: 'وِزْرَكَ', transliteration: 'wizrak', meaning: 'your burden', root: 'و ز ر', partOfSpeech: 'Noun' },
        ],
      },
      {
        number: 3,
        verseKey: '94:3',
        juz: 30,
        arabic: 'ٱلَّذِىٓ أَنقَضَ ظَهْرَكَ',
        transliteration: 'Alladhee anqada thahrak',
        translation: 'Which had weighed heavily upon your back,',
        translationSegments: [
          { text: 'Which', wordIndex: 0 },
          { text: 'had weighed heavily upon', wordIndex: 1 },
          { text: 'your back,', wordIndex: 2 },
        ],
        tafsirBrief: 'Acknowledges the genuine weight of responsibility before relieving it.',
        durationSec: 3.9,
        waveform: makeWave(43),
        words: [
          { id: '94-3-1', arabic: 'ٱلَّذِىٓ', transliteration: 'Alladhī', meaning: 'Which', partOfSpeech: 'Relative Pronoun', tajweed: 'madd', tajweedNote: 'Madd Munfasil (4–5 counts)' },
          { id: '94-3-2', arabic: 'أَنقَضَ', transliteration: 'anqaḍa', meaning: 'weighed down', root: 'ن ق ض', partOfSpeech: 'Past Verb', tajweed: 'ikhfa', tajweedNote: 'Heavy Ikhfa before Qaf' },
          { id: '94-3-3', arabic: 'ظَهْرَكَ', transliteration: 'ẓahrak', meaning: 'your back', root: 'ظ ه ر', partOfSpeech: 'Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Dhaa (ظ)' },
        ],
      },
      {
        number: 4,
        verseKey: '94:4',
        juz: 30,
        arabic: 'وَرَفَعْنَا لَكَ ذِكْرَكَ',
        transliteration: 'Wa rafa‘naa laka dhikrak',
        translation: 'And raised high for you your renown?',
        translationSegments: [
          { text: 'And raised high', wordIndex: 0 },
          { text: 'for you', wordIndex: 1 },
          { text: 'your renown?', wordIndex: 2 },
        ],
        tafsirBrief: 'Honored mention enduring across generations whenever the call to prayer is heard.',
        durationSec: 3.6,
        waveform: makeWave(44),
        words: [
          { id: '94-4-1', arabic: 'وَرَفَعْنَا', transliteration: 'Wa rafaʿnā', meaning: 'And We raised', root: 'ر ف ع', partOfSpeech: 'Past Verb' },
          { id: '94-4-2', arabic: 'لَكَ', transliteration: 'laka', meaning: 'for you', partOfSpeech: 'Preposition + Pronoun' },
          { id: '94-4-3', arabic: 'ذِكْرَكَ', transliteration: 'dhikrak', meaning: 'your remembrance', root: 'ذ ك ر', partOfSpeech: 'Noun' },
        ],
      },
      {
        number: 5,
        verseKey: '94:5',
        juz: 30,
        arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
        transliteration: 'Fa-inna ma‘al-‘usri yusraa',
        translation: 'For indeed, with hardship comes ease.',
        translationSegments: [
          { text: 'For indeed,', wordIndex: 0 },
          { text: 'with', wordIndex: 1 },
          { text: 'hardship', wordIndex: 2 },
          { text: 'comes ease.', wordIndex: 3 },
        ],
        tafsirBrief: 'Notice it says "with" (ma‘a), not merely "after." Relief accompanies the hardship itself.',
        durationSec: 4.1,
        waveform: makeWave(45),
        words: [
          { id: '94-5-1', arabic: 'فَإِنَّ', transliteration: 'Fa-inna', meaning: 'So indeed', partOfSpeech: 'Emphasis', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah (نّ)' },
          { id: '94-5-2', arabic: 'مَعَ', transliteration: 'maʿa', meaning: 'with', partOfSpeech: 'Preposition' },
          { id: '94-5-3', arabic: 'ٱلْعُسْرِ', transliteration: 'al-ʿusri', meaning: 'the hardship', root: 'ع س ر', partOfSpeech: 'Definite Noun' },
          { id: '94-5-4', arabic: 'يُسْرًا', transliteration: 'yusrā', meaning: 'is ease', root: 'ي س ر', partOfSpeech: 'Indefinite Noun', tajweed: 'madd', tajweedNote: 'Madd Iwad (2 counts on stopping)' },
        ],
      },
      {
        number: 6,
        verseKey: '94:6',
        juz: 30,
        arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
        transliteration: 'Inna ma‘al-‘usri yusraa',
        translation: 'Indeed, with hardship comes ease.',
        translationSegments: [
          { text: 'Indeed,', wordIndex: 0 },
          { text: 'with', wordIndex: 1 },
          { text: 'hardship', wordIndex: 2 },
          { text: 'comes ease.', wordIndex: 3 },
        ],
        tafsirBrief: 'Classical scholars noted: one definite hardship ("al-usr") can never overcome two indefinite forms of ease ("yusra").',
        durationSec: 3.9,
        waveform: makeWave(46),
        words: [
          { id: '94-6-1', arabic: 'إِنَّ', transliteration: 'Inna', meaning: 'Indeed', partOfSpeech: 'Emphasis', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon (نّ)' },
          { id: '94-6-2', arabic: 'مَعَ', transliteration: 'maʿa', meaning: 'with', partOfSpeech: 'Preposition' },
          { id: '94-6-3', arabic: 'ٱلْعُسْرِ', transliteration: 'al-ʿusri', meaning: 'the hardship', root: 'ع س ر', partOfSpeech: 'Definite Noun' },
          { id: '94-6-4', arabic: 'يُسْرًا', transliteration: 'yusrā', meaning: 'is ease', root: 'ي س ر', partOfSpeech: 'Indefinite Noun' },
        ],
      },
      {
        number: 7,
        verseKey: '94:7',
        juz: 30,
        arabic: 'فَإِذَا فَرَغْتَ فَٱنصَبْ',
        transliteration: 'Fa-idhaa faraghta fansab',
        translation: 'So when you have finished your duties, devote yourself earnestly,',
        translationSegments: [
          { text: 'So when', wordIndex: 0 },
          { text: 'you have finished your duties,', wordIndex: 1 },
          { text: 'devote yourself earnestly,', wordIndex: 2 },
        ],
        tafsirBrief: 'Transition from outer obligations straight into focused spiritual devotion.',
        durationSec: 3.8,
        waveform: makeWave(47),
        words: [
          { id: '94-7-1', arabic: 'فَإِذَا', transliteration: 'Fa-idhā', meaning: 'So when', partOfSpeech: 'Particle' },
          { id: '94-7-2', arabic: 'فَرَغْتَ', transliteration: 'faraghta', meaning: 'you have finished', root: 'ف ر غ', partOfSpeech: 'Past Verb' },
          { id: '94-7-3', arabic: 'فَٱنصَبْ', transliteration: 'fanṣab', meaning: 'stand in devotion', root: 'ن ص ب', partOfSpeech: 'Imperative Verb', tajweed: 'ikhfa', tajweedNote: 'Heavy Ikhfa before Saad + Qalqalah on Baa' },
        ],
      },
      {
        number: 8,
        verseKey: '94:8',
        juz: 30,
        arabic: 'وَإِلَىٰ رَبِّكَ فَٱرْغَب',
        transliteration: 'Wa ilaa Rabbika farghab',
        translation: 'And to your Lord alone direct your longing.',
        translationSegments: [
          { text: 'And to', wordIndex: 0 },
          { text: 'your Lord alone', wordIndex: 1 },
          { text: 'direct your longing.', wordIndex: 2 },
        ],
        tafsirBrief: 'Anchors all hope, aspiration, and yearning in the Creator.',
        durationSec: 3.6,
        waveform: makeWave(48),
        words: [
          { id: '94-8-1', arabic: 'وَإِلَىٰ', transliteration: 'Wa ilā', meaning: 'And toward', partOfSpeech: 'Preposition' },
          { id: '94-8-2', arabic: 'رَبِّكَ', transliteration: 'Rabbika', meaning: 'your Lord', root: 'ر ب ب', partOfSpeech: 'Noun' },
          { id: '94-8-3', arabic: 'فَٱرْغَب', transliteration: 'farghab', meaning: 'turn with longing', root: 'ر غ ب', partOfSpeech: 'Imperative Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah bounce on final Baa (ب)' },
        ],
      },
    ],
  },
  {
    id: 97,
    nameArabic: 'سُورَةُ ٱلْقَدْرِ',
    nameSimple: 'Al-Qadr',
    nameMeaning: 'The Night of Decree',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 5,
    hasBismillah: true,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '97:1',
        juz: 30,
        arabic: 'إِنَّآ أَنزَلْنَـٰهُ فِى لَيْلَةِ ٱلْقَدْرِ',
        transliteration: 'Innaaa anzalnaahu fee laylatil-qadr',
        translation: "Indeed, We sent it [the Qur'an] down during the Night of Decree.",
        translationSegments: [
          { text: 'Indeed, We', wordIndex: 0 },
          { text: "sent it [the Qur'an] down", wordIndex: 1 },
          { text: 'during', wordIndex: 2 },
          { text: 'the Night of', wordIndex: 3 },
          { text: 'Decree.', wordIndex: 4 },
        ],
        tafsirBrief: 'Marks the descent of revelation into the world as a night of immeasurable spiritual gravity.',
        durationSec: 4.8,
        waveform: makeWave(51),
        words: [
          { id: '97-1-1', arabic: 'إِنَّآ', transliteration: 'Innā', meaning: 'Indeed We', partOfSpeech: 'Emphasis + Pronoun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon + 4-count Madd Munfasil' },
          { id: '97-1-2', arabic: 'أَنزَلْنَـٰهُ', transliteration: 'anzalnāhu', meaning: 'revealed it', root: 'ن ز ل', partOfSpeech: 'Past Verb', tajweed: 'ikhfa', tajweedNote: 'Ikhfa nasalization before Zay' },
          { id: '97-1-3', arabic: 'فِى', transliteration: 'fī', meaning: 'during', partOfSpeech: 'Preposition' },
          { id: '97-1-4', arabic: 'لَيْلَةِ', transliteration: 'laylati', meaning: 'the Night of', root: 'ل ي ل', partOfSpeech: 'Noun' },
          { id: '97-1-5', arabic: 'ٱلْقَدْرِ', transliteration: 'al-qadr', meaning: 'Decree / Honor', root: 'ق د ر', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah on silent Daal (دْ)' },
        ],
      },
      {
        number: 2,
        verseKey: '97:2',
        juz: 30,
        arabic: 'وَمَآ أَدْرَىٰكَ مَا لَيْلَةُ ٱلْقَدْرِ',
        transliteration: 'Wa maaa adraaka maa laylatul-qadr',
        translation: 'And what can make you know what the Night of Decree is?',
        translationSegments: [
          { text: 'And what', wordIndex: 0 },
          { text: 'can make you know', wordIndex: 1 },
          { text: 'what', wordIndex: 2 },
          { text: 'the Night of', wordIndex: 3 },
          { text: 'Decree', wordIndex: 4 },
          { text: 'is?', wordIndex: 2 },
        ],
        tafsirBrief: 'A rhetorical question inviting awe beyond ordinary human measurement of time.',
        durationSec: 4.9,
        waveform: makeWave(52),
        words: [
          { id: '97-2-1', arabic: 'وَمَآ', transliteration: 'Wa mā', meaning: 'And what', partOfSpeech: 'Interrogative', tajweed: 'madd', tajweedNote: 'Madd Munfasil (4–5 counts)' },
          { id: '97-2-2', arabic: 'أَدْرَىٰكَ', transliteration: 'adrāka', meaning: 'will make you know', root: 'د ر ي', partOfSpeech: 'Past Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Sughra on silent Daal (دْ)' },
          { id: '97-2-3', arabic: 'مَا', transliteration: 'mā', meaning: 'what', partOfSpeech: 'Interrogative' },
          { id: '97-2-4', arabic: 'لَيْلَةُ', transliteration: 'laylatu', meaning: 'is the Night of', root: 'ل ي ل', partOfSpeech: 'Noun' },
          { id: '97-2-5', arabic: 'ٱلْقَدْرِ', transliteration: 'al-qadr', meaning: 'Decree', root: 'ق د ر', partOfSpeech: 'Noun' },
        ],
      },
      {
        number: 3,
        verseKey: '97:3',
        juz: 30,
        arabic: 'لَيْلَةُ ٱلْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ',
        transliteration: 'Laylatul-qadri khayrum-min alfi shahr',
        translation: 'The Night of Decree is better than a thousand months.',
        translationSegments: [
          { text: 'The Night of', wordIndex: 0 },
          { text: 'Decree', wordIndex: 1 },
          { text: 'is better', wordIndex: 2 },
          { text: 'than', wordIndex: 3 },
          { text: 'a thousand', wordIndex: 4 },
          { text: 'months.', wordIndex: 5 },
        ],
        tafsirBrief: 'Sincere worship in one sacred night surpasses over eighty-three years of routine devotion.',
        durationSec: 5.0,
        waveform: makeWave(53),
        words: [
          { id: '97-3-1', arabic: 'لَيْلَةُ', transliteration: 'Laylatu', meaning: 'The Night of', root: 'ل ي ل', partOfSpeech: 'Noun' },
          { id: '97-3-2', arabic: 'ٱلْقَدْرِ', transliteration: 'al-qadri', meaning: 'Decree', root: 'ق د ر', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Sughra on Daal' },
          { id: '97-3-3', arabic: 'خَيْرٌ', transliteration: 'khayrum', meaning: 'is better', root: 'خ ي ر', partOfSpeech: 'Noun', tajweed: 'idgham', tajweedNote: 'Idgham with Ghunnah into Meem (2 counts)' },
          { id: '97-3-4', arabic: 'مِّنْ', transliteration: 'min', meaning: 'than', partOfSpeech: 'Preposition' },
          { id: '97-3-5', arabic: 'أَلْفِ', transliteration: 'alfi', meaning: 'a thousand', root: 'أ ل ف', partOfSpeech: 'Number' },
          { id: '97-3-6', arabic: 'شَهْرٍ', transliteration: 'shahr', meaning: 'months', root: 'ش ه ر', partOfSpeech: 'Noun' },
        ],
      },
      {
        number: 4,
        verseKey: '97:4',
        juz: 30,
        arabic: 'تَنَزَّلُ ٱلْمَلَـٰٓئِكَةُ وَٱلرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍ',
        transliteration: 'Tanazzalul-malaaa’ikatu war-Roohu feehaa bi-idhni Rabbihim-min kulli amr',
        translation: 'The angels and the Spirit descend therein by permission of their Lord for every matter.',
        translationSegments: [
          { text: 'The angels', wordIndex: 1 },
          { text: 'and the Spirit', wordIndex: 2 },
          { text: 'descend', wordIndex: 0 },
          { text: 'therein', wordIndex: 3 },
          { text: 'by permission of', wordIndex: 4 },
          { text: 'their Lord', wordIndex: 5 },
          { text: 'for', wordIndex: 6 },
          { text: 'every', wordIndex: 7 },
          { text: 'matter.', wordIndex: 8 },
        ],
        tafsirBrief: 'Earth and heaven converge in quiet serenity as Gabriel (Ar-Ruh) and the angels descend.',
        durationSec: 7.4,
        waveform: makeWave(54),
        words: [
          { id: '97-4-1', arabic: 'تَنَزَّلُ', transliteration: 'Tanazzalu', meaning: 'Descend', root: 'ن ز ل', partOfSpeech: 'Imperfect Verb' },
          { id: '97-4-2', arabic: 'ٱلْمَلَـٰٓئِكَةُ', transliteration: 'al-malāʾikatu', meaning: 'the angels', root: 'م ل ك', partOfSpeech: 'Plural Noun', tajweed: 'madd', tajweedNote: 'Madd Muttasil (4–5 counts)' },
          { id: '97-4-3', arabic: 'وَٱلرُّوحُ', transliteration: 'war-Rūḥu', meaning: 'and the Spirit (Jibril)', root: 'ر و ح', partOfSpeech: 'Noun' },
          { id: '97-4-4', arabic: 'فِيهَا', transliteration: 'fīhā', meaning: 'therein', partOfSpeech: 'Preposition + Pronoun' },
          { id: '97-4-5', arabic: 'بِإِذْنِ', transliteration: 'bi-idhni', meaning: 'by permission of', root: 'أ ذ ن', partOfSpeech: 'Preposition + Noun' },
          { id: '97-4-6', arabic: 'رَبِّهِم', transliteration: 'Rabbihim', meaning: 'their Lord', root: 'ر ب ب', partOfSpeech: 'Noun', tajweed: 'idgham', tajweedNote: 'Idgham Shafawi (Meem into Meem with Ghunnah)' },
          { id: '97-4-7', arabic: 'مِّن', transliteration: 'min', meaning: 'for', partOfSpeech: 'Preposition', tajweed: 'ikhfa', tajweedNote: 'Ikhfa before Kaaf' },
          { id: '97-4-8', arabic: 'كُلِّ', transliteration: 'kulli', meaning: 'every', root: 'ك ل ل', partOfSpeech: 'Noun' },
          { id: '97-4-9', arabic: 'أَمْرٍ', transliteration: 'amr', meaning: 'decree / matter', root: 'أ م ر', partOfSpeech: 'Noun' },
        ],
      },
      {
        number: 5,
        verseKey: '97:5',
        juz: 30,
        arabic: 'سَلَـٰمٌ هِىَ حَتَّىٰ مَطْلَعِ ٱلْفَجْرِ',
        transliteration: 'Salaamun hiya hattaa matla‘il-fajr',
        translation: 'Peace it is until the emergence of dawn.',
        translationSegments: [
          { text: 'Peace', wordIndex: 0 },
          { text: 'it is', wordIndex: 1 },
          { text: 'until', wordIndex: 2 },
          { text: 'the emergence of', wordIndex: 3 },
          { text: 'dawn.', wordIndex: 4 },
        ],
        tafsirBrief: 'Ends with the word Salam, describing quiet safety and peace until daybreak.',
        durationSec: 4.5,
        waveform: makeWave(55),
        words: [
          { id: '97-5-1', arabic: 'سَلَـٰمٌ', transliteration: 'Salāmun', meaning: 'Peace', root: 'س ل م', partOfSpeech: 'Noun', tajweed: 'madd', tajweedNote: 'Natural 2-count dagger Alif' },
          { id: '97-5-2', arabic: 'هِىَ', transliteration: 'hiya', meaning: 'it is', partOfSpeech: 'Pronoun' },
          { id: '97-5-3', arabic: 'حَتَّىٰ', transliteration: 'ḥattā', meaning: 'until', partOfSpeech: 'Preposition' },
          { id: '97-5-4', arabic: 'مَطْلَعِ', transliteration: 'maṭlaʿi', meaning: 'the rising of', root: 'ط ل ع', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah bounce on silent Taa (طْ)' },
          { id: '97-5-5', arabic: 'ٱلْفَجْرِ', transliteration: 'al-fajr', meaning: 'the dawn', root: 'ف ج ر', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah on Jeem (جْ)' },
        ],
      },
    ],
  },
  {
    id: 103,
    nameArabic: 'سُورَةُ ٱلْعَصْرِ',
    nameSimple: 'Al-Asr',
    nameMeaning: 'The Declining Day',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 3,
    hasBismillah: true,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '103:1',
        juz: 30,
        arabic: 'وَٱلْعَصْرِ',
        transliteration: 'Wal-‘asr',
        translation: 'By the passage of time,',
        tafsirBrief: 'Swearing by declining afternoon light calls human attention to the precious brevity of life.',
        durationSec: 2.8,
        waveform: makeWave(61),
        words: [
          { id: '103-1-1', arabic: 'وَٱلْعَصْرِ', transliteration: 'Wal-ʿaṣr', meaning: 'By time', root: 'ع ص ر', partOfSpeech: 'Oath + Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Saad (ص) before closing Raa' },
        ],
      },
      {
        number: 2,
        verseKey: '103:2',
        juz: 30,
        arabic: 'إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ',
        transliteration: 'Innal-insaana lafee khusr',
        translation: 'Indeed, humankind is in a state of loss,',
        translationSegments: [
          { text: 'Indeed,', wordIndex: 0 },
          { text: 'humankind', wordIndex: 1 },
          { text: 'is in a state of', wordIndex: 2 },
          { text: 'loss,', wordIndex: 3 },
        ],
        tafsirBrief: 'Without mindful purpose, passing hours slip away unredeemed.',
        durationSec: 4.1,
        waveform: makeWave(62),
        words: [
          { id: '103-2-1', arabic: 'إِنَّ', transliteration: 'Inna', meaning: 'Indeed', partOfSpeech: 'Emphasis', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
          { id: '103-2-2', arabic: 'ٱلْإِنسَـٰنَ', transliteration: 'al-insāna', meaning: 'humankind', root: 'أ ن س', partOfSpeech: 'Noun', tajweed: 'ikhfa', tajweedNote: 'Ikhfa nasal transition on Noon before Seen' },
          { id: '103-2-3', arabic: 'لَفِى', transliteration: 'lafī', meaning: 'is surely in', partOfSpeech: 'Preposition' },
          { id: '103-2-4', arabic: 'خُسْرٍ', transliteration: 'khusr', meaning: 'loss', root: 'خ س ر', partOfSpeech: 'Noun' },
        ],
      },
      {
        number: 3,
        verseKey: '103:3',
        juz: 30,
        arabic: 'إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ',
        transliteration: 'Illallatheena aamanoo wa ‘amilus-saalihaati wa tawaasaw bil-haqqi wa tawaasaw bis-sabr',
        translation:
          'Except for those who have believed, and done righteous deeds, and advised one another to truth and advised one another to steadfast patience.',
        translationSegments: [
          { text: 'Except for', wordIndex: 0 },
          { text: 'those who', wordIndex: 1 },
          { text: 'have believed,', wordIndex: 2 },
          { text: 'and done', wordIndex: 3 },
          { text: 'righteous deeds,', wordIndex: 4 },
          { text: 'and advised one another', wordIndex: 5 },
          { text: 'to truth', wordIndex: 6 },
          { text: 'and advised one another', wordIndex: 7 },
          { text: 'to steadfast patience.', wordIndex: 8 },
        ],
        tafsirBrief: 'Four pillars turn fleeting time into enduring legacy: faith, beneficial action, mutual counsel in truth, and shared perseverance.',
        durationSec: 8.6,
        waveform: makeWave(63),
        words: [
          { id: '103-3-1', arabic: 'إِلَّا', transliteration: 'Illā', meaning: 'Except', partOfSpeech: 'Exception Particle' },
          { id: '103-3-2', arabic: 'ٱلَّذِينَ', transliteration: 'alladhīna', meaning: 'those who', partOfSpeech: 'Relative Pronoun' },
          { id: '103-3-3', arabic: 'ءَامَنُوا۟', transliteration: 'āmanū', meaning: 'believed', root: 'أ م ن', partOfSpeech: 'Past Verb', tajweed: 'madd', tajweedNote: 'Madd Badal (2 counts)' },
          { id: '103-3-4', arabic: 'وَعَمِلُوا۟', transliteration: 'wa ʿamilū', meaning: 'and did', root: 'ع م ل', partOfSpeech: 'Past Verb' },
          { id: '103-3-5', arabic: 'ٱلصَّـٰلِحَـٰتِ', transliteration: 'aṣ-ṣāliḥāti', meaning: 'righteous deeds', root: 'ص ل ح', partOfSpeech: 'Plural Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Saad with 2-count dagger Alif' },
          { id: '103-3-6', arabic: 'وَتَوَاصَوْا۟', transliteration: 'wa tawāṣaw', meaning: 'and advised each other', root: 'و ص ي', partOfSpeech: 'Past Verb' },
          { id: '103-3-7', arabic: 'بِٱلْحَقِّ', transliteration: 'bil-ḥaqqi', meaning: 'to truth', root: 'ح ق ق', partOfSpeech: 'Preposition + Noun', tajweed: 'tafkhim', tajweedNote: 'Doubled Qaf' },
          { id: '103-3-8', arabic: 'وَتَوَاصَوْا۟', transliteration: 'wa tawāṣaw', meaning: 'and advised each other', root: 'و ص ي', partOfSpeech: 'Past Verb' },
          { id: '103-3-9', arabic: 'بِٱلصَّبْرِ', transliteration: 'biṣ-ṣabr', meaning: 'to patience', root: 'ص ب ر', partOfSpeech: 'Preposition + Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah bounce on Baa (بْ) before closing Raa' },
        ],
      },
    ],
  },
  {
    id: 112,
    nameArabic: 'سُورَةُ ٱلْإِخْلَاصِ',
    nameSimple: 'Al-Ikhlas',
    nameMeaning: 'Sincerity of Faith',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 4,
    hasBismillah: true,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '112:1',
        juz: 30,
        arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
        transliteration: 'Qul Huwallaahu Ahad',
        translation: 'Say, "He is Allah, [who is] One,',
        translationSegments: [
          { text: 'Say,', wordIndex: 0 },
          { text: '"He is', wordIndex: 1 },
          { text: 'Allah,', wordIndex: 2 },
          { text: '[who is] One,', wordIndex: 3 },
        ],
        tafsirBrief: 'Distills pure monotheism (Tawhid): absolute, indivisible oneness beyond comparison.',
        durationSec: 3.4,
        waveform: makeWave(71),
        words: [
          { id: '112-1-1', arabic: 'قُلْ', transliteration: 'Qul', meaning: 'Say', root: 'ق و ل', partOfSpeech: 'Imperative Verb', tajweed: 'tafkhim', tajweedNote: 'Heavy Qaf' },
          { id: '112-1-2', arabic: 'هُوَ', transliteration: 'Huwa', meaning: 'He is', partOfSpeech: 'Pronoun' },
          { id: '112-1-3', arabic: 'ٱللَّهُ', transliteration: 'Allāhu', meaning: 'Allah', root: 'أ ل ه', partOfSpeech: 'Proper Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Laam of Majesty after Fathah' },
          { id: '112-1-4', arabic: 'أَحَدٌ', transliteration: 'Aḥad', meaning: 'One', root: 'أ ح د', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Kubra bounce upon stopping on Daal' },
        ],
      },
      {
        number: 2,
        verseKey: '112:2',
        juz: 30,
        arabic: 'ٱللَّهُ ٱلصَّمَدُ',
        transliteration: 'Allaahus-Samad',
        translation: 'Allah, the Eternal Refuge.',
        translationSegments: [
          { text: 'Allah,', wordIndex: 0 },
          { text: 'the Eternal Refuge.', wordIndex: 1 },
        ],
        tafsirBrief: 'As-Samad means the Self-Sufficient Anchor upon whom all creation depends while He depends on none.',
        durationSec: 3.2,
        waveform: makeWave(72),
        words: [
          { id: '112-2-1', arabic: 'ٱللَّهُ', transliteration: 'Allāhu', meaning: 'Allah', root: 'أ ل ه', partOfSpeech: 'Proper Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Laam of Majesty' },
          { id: '112-2-2', arabic: 'ٱلصَّمَدُ', transliteration: 'aṣ-Ṣamad', meaning: 'the Eternal Refuge', root: 'ص م د', partOfSpeech: 'Divine Attribute', tajweed: 'qalqalah', tajweedNote: 'Heavy Saad + Qalqalah bounce on closing Daal' },
        ],
      },
      {
        number: 3,
        verseKey: '112:3',
        juz: 30,
        arabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
        transliteration: 'Lam yalid wa lam yoolad',
        translation: 'He neither begets nor is born,',
        translationSegments: [
          { text: 'He neither', wordIndex: 0 },
          { text: 'begets', wordIndex: 1 },
          { text: 'nor', wordIndex: 2 },
          { text: 'is born,', wordIndex: 3 },
        ],
        tafsirBrief: 'Transcends biological lineage, beginning, or temporal dependency.',
        durationSec: 3.6,
        waveform: makeWave(73),
        words: [
          { id: '112-3-1', arabic: 'لَمْ', transliteration: 'Lam', meaning: 'Not', partOfSpeech: 'Negation' },
          { id: '112-3-2', arabic: 'يَلِدْ', transliteration: 'yalid', meaning: 'does He beget', root: 'و ل د', partOfSpeech: 'Jussive Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Sughra on Daal (دْ)' },
          { id: '112-3-3', arabic: 'وَلَمْ', transliteration: 'wa lam', meaning: 'and not', partOfSpeech: 'Conjunction + Negation' },
          { id: '112-3-4', arabic: 'يُولَدْ', transliteration: 'yūlad', meaning: 'is He born', root: 'و ل د', partOfSpeech: 'Passive Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Kubra on final Daal' },
        ],
      },
      {
        number: 4,
        verseKey: '112:4',
        juz: 30,
        arabic: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
        transliteration: 'Wa lam yakul-lahu kufuwan ahad',
        translation: 'Nor is there to Him any equivalent."',
        translationSegments: [
          { text: 'Nor', wordIndex: 0 },
          { text: 'is there', wordIndex: 1 },
          { text: 'to Him', wordIndex: 2 },
          { text: 'any', wordIndex: 4 },
          { text: 'equivalent."', wordIndex: 3 },
        ],
        tafsirBrief: 'Completes the declaration of absolute transcendence and uniqueness.',
        durationSec: 4.4,
        waveform: makeWave(74),
        words: [
          { id: '112-4-1', arabic: 'وَلَمْ', transliteration: 'Wa lam', meaning: 'And not', partOfSpeech: 'Negation' },
          { id: '112-4-2', arabic: 'يَكُن', transliteration: 'yakul', meaning: 'is there', root: 'ك و ن', partOfSpeech: 'Jussive Verb', tajweed: 'idgham', tajweedNote: 'Idgham Bila Ghunnah: Noon merges completely into Laam' },
          { id: '112-4-3', arabic: 'لَّهُۥ', transliteration: 'lahū', meaning: 'to Him', partOfSpeech: 'Preposition + Pronoun' },
          { id: '112-4-4', arabic: 'كُفُوًا', transliteration: 'kufuwan', meaning: 'equivalent / equal', root: 'ك ف أ', partOfSpeech: 'Noun' },
          { id: '112-4-5', arabic: 'أَحَدٌۢ', transliteration: 'aḥad', meaning: 'anyone', root: 'أ ح د', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Kubra on final Daal' },
        ],
      },
    ],
  },
  {
    id: 113,
    nameArabic: 'سُورَةُ ٱلْفَلَقِ',
    nameSimple: 'Al-Falaq',
    nameMeaning: 'The Daybreak',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 5,
    hasBismillah: true,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '113:1',
        juz: 30,
        arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
        transliteration: 'Qul a‘oodhu bi-Rabbil-falaq',
        translation: 'Say, "I seek refuge in the Lord of daybreak',
        translationSegments: [
          { text: 'Say,', wordIndex: 0 },
          { text: '"I seek refuge', wordIndex: 1 },
          { text: 'in the Lord of', wordIndex: 2 },
          { text: 'daybreak', wordIndex: 3 },
        ],
        tafsirBrief: 'Invokes the Lord who splits open dawn out of darkness, symbolizing rescue from every unseen distress.',
        durationSec: 3.8,
        waveform: makeWave(81),
        words: [
          { id: '113-1-1', arabic: 'قُلْ', transliteration: 'Qul', meaning: 'Say', root: 'ق و ل', partOfSpeech: 'Imperative' },
          { id: '113-1-2', arabic: 'أَعُوذُ', transliteration: 'aʿūdhu', meaning: 'I seek refuge', root: 'ع و ذ', partOfSpeech: 'Imperfect Verb' },
          { id: '113-1-3', arabic: 'بِرَبِّ', transliteration: 'bi-Rabbi', meaning: 'in the Lord of', root: 'ر ب ب', partOfSpeech: 'Preposition + Noun' },
          { id: '113-1-4', arabic: 'ٱلْفَلَقِ', transliteration: 'al-falaq', meaning: 'the daybreak', root: 'ف ل ق', partOfSpeech: 'Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah Kubra on closing Qaf' },
        ],
      },
      {
        number: 2,
        verseKey: '113:2',
        juz: 30,
        arabic: 'مِن شَرِّ مَا خَلَقَ',
        transliteration: 'Min sharri maa khalaq',
        translation: 'From the evil of that which He created,',
        translationSegments: [
          { text: 'From', wordIndex: 0 },
          { text: 'the evil of', wordIndex: 1 },
          { text: 'that which', wordIndex: 2 },
          { text: 'He created,', wordIndex: 3 },
        ],
        tafsirBrief: 'Seeks shelter not from creation itself, but from harm arising within created things.',
        durationSec: 3.4,
        waveform: makeWave(82),
        words: [
          { id: '113-2-1', arabic: 'مِن', transliteration: 'Min', meaning: 'From', partOfSpeech: 'Preposition', tajweed: 'ikhfa', tajweedNote: 'Ikhfa nasalization on Noon Sakinah before Sheen' },
          { id: '113-2-2', arabic: 'شَرِّ', transliteration: 'sharri', meaning: 'the evil of', root: 'ش ر ر', partOfSpeech: 'Noun' },
          { id: '113-2-3', arabic: 'مَا', transliteration: 'mā', meaning: 'what', partOfSpeech: 'Relative Pronoun' },
          { id: '113-2-4', arabic: 'خَلَقَ', transliteration: 'khalaq', meaning: 'He created', root: 'خ ل ق', partOfSpeech: 'Past Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah on closing Qaf' },
        ],
      },
      {
        number: 3,
        verseKey: '113:3',
        juz: 30,
        arabic: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
        transliteration: 'Wa min sharri ghaasiqin idhaa waqab',
        translation: 'And from the evil of darkness when it settles,',
        translationSegments: [
          { text: 'And from', wordIndex: 0 },
          { text: 'the evil of', wordIndex: 1 },
          { text: 'darkness', wordIndex: 2 },
          { text: 'when', wordIndex: 3 },
          { text: 'it settles,', wordIndex: 4 },
        ],
        tafsirBrief: 'Protection through vulnerable hours of night and obscurity.',
        durationSec: 4.1,
        waveform: makeWave(83),
        words: [
          { id: '113-3-1', arabic: 'وَمِن', transliteration: 'Wa min', meaning: 'And from', partOfSpeech: 'Preposition', tajweed: 'ikhfa', tajweedNote: 'Ikhfa before Sheen' },
          { id: '113-3-2', arabic: 'شَرِّ', transliteration: 'sharri', meaning: 'the evil of', root: 'ش ر ر', partOfSpeech: 'Noun' },
          { id: '113-3-3', arabic: 'غَاسِقٍ', transliteration: 'ghāsiqin', meaning: 'darkness', root: 'غ س ق', partOfSpeech: 'Active Participle', tajweed: 'tafkhim', tajweedNote: 'Heavy Ghayn' },
          { id: '113-3-4', arabic: 'إِذَا', transliteration: 'idhā', meaning: 'when', partOfSpeech: 'Time Particle' },
          { id: '113-3-5', arabic: 'وَقَبَ', transliteration: 'waqab', meaning: 'it deepens', root: 'و ق ب', partOfSpeech: 'Past Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah bounce on final Baa' },
        ],
      },
      {
        number: 4,
        verseKey: '113:4',
        juz: 30,
        arabic: 'وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ',
        transliteration: 'Wa min sharrin-naffaathaati fil-‘uqad',
        translation: 'And from the evil of those who blow on knots,',
        translationSegments: [
          { text: 'And from', wordIndex: 0 },
          { text: 'the evil of', wordIndex: 1 },
          { text: 'those who blow', wordIndex: 2 },
          { text: 'on', wordIndex: 3 },
          { text: 'knots,', wordIndex: 4 },
        ],
        tafsirBrief: 'Refuge against covert malice, divisiveness, and harmful whisperings.',
        durationSec: 4.5,
        waveform: makeWave(84),
        words: [
          { id: '113-4-1', arabic: 'وَمِن', transliteration: 'Wa min', meaning: 'And from', partOfSpeech: 'Preposition', tajweed: 'ikhfa', tajweedNote: 'Ikhfa before Sheen' },
          { id: '113-4-2', arabic: 'شَرِّ', transliteration: 'sharri', meaning: 'the evil of', root: 'ش ر ر', partOfSpeech: 'Noun' },
          { id: '113-4-3', arabic: 'ٱلنَّفَّـٰثَـٰتِ', transliteration: 'an-naffāthāti', meaning: 'the blowers (in knots)', root: 'ن ف ث', partOfSpeech: 'Plural Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah (نّ)' },
          { id: '113-4-4', arabic: 'فِى', transliteration: 'fī', meaning: 'upon', partOfSpeech: 'Preposition' },
          { id: '113-4-5', arabic: 'ٱلْعُقَدِ', transliteration: 'al-ʿuqad', meaning: 'the knots', root: 'ع ق د', partOfSpeech: 'Plural Noun', tajweed: 'qalqalah', tajweedNote: 'Qalqalah on closing Daal' },
        ],
      },
      {
        number: 5,
        verseKey: '113:5',
        juz: 30,
        arabic: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
        transliteration: 'Wa min sharri haasidin idhaa hasad',
        translation: 'And from the evil of an envier when he envies."',
        translationSegments: [
          { text: 'And from', wordIndex: 0 },
          { text: 'the evil of', wordIndex: 1 },
          { text: 'an envier', wordIndex: 2 },
          { text: 'when', wordIndex: 3 },
          { text: 'he envies."', wordIndex: 4 },
        ],
        tafsirBrief: 'Guards the heart and blessings from the destructive impulse of envy.',
        durationSec: 4.0,
        waveform: makeWave(85),
        words: [
          { id: '113-5-1', arabic: 'وَمِن', transliteration: 'Wa min', meaning: 'And from', partOfSpeech: 'Preposition', tajweed: 'ikhfa', tajweedNote: 'Ikhfa before Sheen' },
          { id: '113-5-2', arabic: 'شَرِّ', transliteration: 'sharri', meaning: 'the evil of', root: 'ش ر ر', partOfSpeech: 'Noun' },
          { id: '113-5-3', arabic: 'حَاسِدٍ', transliteration: 'ḥāsidin', meaning: 'an envier', root: 'ح س د', partOfSpeech: 'Active Participle' },
          { id: '113-5-4', arabic: 'إِذَا', transliteration: 'idhā', meaning: 'when', partOfSpeech: 'Time Particle' },
          { id: '113-5-5', arabic: 'حَسَدَ', transliteration: 'ḥasad', meaning: 'he envies', root: 'ح س د', partOfSpeech: 'Past Verb', tajweed: 'qalqalah', tajweedNote: 'Qalqalah on closing Daal' },
        ],
      },
    ],
  },
  {
    id: 114,
    nameArabic: 'سُورَةُ ٱلنَّاسِ',
    nameSimple: 'An-Nas',
    nameMeaning: 'Mankind',
    revelationPlace: 'Meccan',
    juz: 30,
    totalAyahs: 6,
    hasBismillah: true,
    estimatedMinutes: 1,
    featured: true,
    ayahs: [
      {
        number: 1,
        verseKey: '114:1',
        juz: 30,
        arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
        transliteration: 'Qul a‘oodhu bi-Rabbin-naas',
        translation: 'Say, "I seek refuge in the Lord of humankind,',
        translationSegments: [
          { text: 'Say,', wordIndex: 0 },
          { text: '"I seek refuge', wordIndex: 1 },
          { text: 'in the Lord of', wordIndex: 2 },
          { text: 'humankind,', wordIndex: 3 },
        ],
        tafsirBrief: 'Calls upon the Nurturer and Protector of all humanity.',
        durationSec: 3.7,
        waveform: makeWave(91),
        words: [
          { id: '114-1-1', arabic: 'قُلْ', transliteration: 'Qul', meaning: 'Say', root: 'ق و ل', partOfSpeech: 'Imperative' },
          { id: '114-1-2', arabic: 'أَعُوذُ', transliteration: 'aʿūdhu', meaning: 'I seek refuge', root: 'ع و ذ', partOfSpeech: 'Imperfect Verb' },
          { id: '114-1-3', arabic: 'بِرَبِّ', transliteration: 'bi-Rabbi', meaning: 'in the Lord of', root: 'ر ب ب', partOfSpeech: 'Preposition + Noun' },
          { id: '114-1-4', arabic: 'ٱلنَّاسِ', transliteration: 'an-nās', meaning: 'humankind', root: 'ن و س', partOfSpeech: 'Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah (نّ)' },
        ],
      },
      {
        number: 2,
        verseKey: '114:2',
        juz: 30,
        arabic: 'مَلِكِ ٱلنَّاسِ',
        transliteration: 'Malikin-naas',
        translation: 'The Sovereign of humankind,',
        translationSegments: [
          { text: 'The Sovereign of', wordIndex: 0 },
          { text: 'humankind,', wordIndex: 1 },
        ],
        tafsirBrief: 'Ultimate authority over all earthly powers.',
        durationSec: 2.9,
        waveform: makeWave(92),
        words: [
          { id: '114-2-1', arabic: 'مَلِكِ', transliteration: 'Maliki', meaning: 'The Sovereign of', root: 'م ل ك', partOfSpeech: 'Noun' },
          { id: '114-2-2', arabic: 'ٱلنَّاسِ', transliteration: 'an-nās', meaning: 'humankind', root: 'ن و س', partOfSpeech: 'Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
        ],
      },
      {
        number: 3,
        verseKey: '114:3',
        juz: 30,
        arabic: 'إِلَـٰهِ ٱلنَّاسِ',
        transliteration: 'Ilaahin-naas',
        translation: 'The God of humankind,',
        translationSegments: [
          { text: 'The God of', wordIndex: 0 },
          { text: 'humankind,', wordIndex: 1 },
        ],
        tafsirBrief: 'The sole worthy object of devotion, love, and trust.',
        durationSec: 3.0,
        waveform: makeWave(93),
        words: [
          { id: '114-3-1', arabic: 'إِلَـٰهِ', transliteration: 'Ilāhi', meaning: 'The God of', root: 'أ ل ه', partOfSpeech: 'Noun', tajweed: 'madd', tajweedNote: '2-count dagger Alif' },
          { id: '114-3-2', arabic: 'ٱلنَّاسِ', transliteration: 'an-nās', meaning: 'humankind', root: 'ن و س', partOfSpeech: 'Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
        ],
      },
      {
        number: 4,
        verseKey: '114:4',
        juz: 30,
        arabic: 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ',
        transliteration: 'Min sharril-waswaasil-khannaas',
        translation: 'From the evil of the whisperer who retreats,',
        translationSegments: [
          { text: 'From', wordIndex: 0 },
          { text: 'the evil of', wordIndex: 1 },
          { text: 'the whisperer', wordIndex: 2 },
          { text: 'who retreats,', wordIndex: 3 },
        ],
        tafsirBrief: 'Al-Khannas: the whisper of doubt that shrinks and retreats the moment the heart remembers Allah.',
        durationSec: 4.3,
        waveform: makeWave(94),
        words: [
          { id: '114-4-1', arabic: 'مِن', transliteration: 'Min', meaning: 'From', partOfSpeech: 'Preposition', tajweed: 'ikhfa', tajweedNote: 'Ikhfa before Sheen' },
          { id: '114-4-2', arabic: 'شَرِّ', transliteration: 'sharri', meaning: 'the evil of', root: 'ش ر ر', partOfSpeech: 'Noun' },
          { id: '114-4-3', arabic: 'ٱلْوَسْوَاسِ', transliteration: 'al-waswāsi', meaning: 'the whisperer', root: 'و س و س', partOfSpeech: 'Noun' },
          { id: '114-4-4', arabic: 'ٱلْخَنَّاسِ', transliteration: 'al-khannās', meaning: 'who retreats', root: 'خ ن س', partOfSpeech: 'Intensive Adjective', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
        ],
      },
      {
        number: 5,
        verseKey: '114:5',
        juz: 30,
        arabic: 'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ',
        transliteration: 'Alladhee yuwaswisu fee sudoorin-naas',
        translation: 'Who whispers into the breasts of humankind,',
        translationSegments: [
          { text: 'Who', wordIndex: 0 },
          { text: 'whispers', wordIndex: 1 },
          { text: 'into', wordIndex: 2 },
          { text: 'the breasts of', wordIndex: 3 },
          { text: 'humankind,', wordIndex: 4 },
        ],
        tafsirBrief: 'Recognizes inner psychological turbulence and guards the clarity of the heart.',
        durationSec: 4.5,
        waveform: makeWave(95),
        words: [
          { id: '114-5-1', arabic: 'ٱلَّذِى', transliteration: 'Alladhī', meaning: 'Who', partOfSpeech: 'Relative Pronoun' },
          { id: '114-5-2', arabic: 'يُوَسْوِسُ', transliteration: 'yuwaswisu', meaning: 'whispers', root: 'و س و س', partOfSpeech: 'Imperfect Verb' },
          { id: '114-5-3', arabic: 'فِى', transliteration: 'fī', meaning: 'into', partOfSpeech: 'Preposition' },
          { id: '114-5-4', arabic: 'صُدُورِ', transliteration: 'ṣudūri', meaning: 'the breasts of', root: 'ص د ر', partOfSpeech: 'Plural Noun', tajweed: 'tafkhim', tajweedNote: 'Heavy Saad (ص)' },
          { id: '114-5-5', arabic: 'ٱلنَّاسِ', transliteration: 'an-nās', meaning: 'humankind', root: 'ن و س', partOfSpeech: 'Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
        ],
      },
      {
        number: 6,
        verseKey: '114:6',
        juz: 30,
        arabic: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
        transliteration: 'Minal-jinnati wan-naas',
        translation: 'From among the jinn and humankind."',
        translationSegments: [
          { text: 'From among', wordIndex: 0 },
          { text: 'the jinn', wordIndex: 1 },
          { text: 'and humankind."', wordIndex: 2 },
        ],
        tafsirBrief: 'Completes the Quranic refuge with holistic protection from both unseen and human temptations.',
        durationSec: 3.9,
        waveform: makeWave(96),
        words: [
          { id: '114-6-1', arabic: 'مِنَ', transliteration: 'Mina', meaning: 'From among', partOfSpeech: 'Preposition' },
          { id: '114-6-2', arabic: 'ٱلْجِنَّةِ', transliteration: 'al-jinnati', meaning: 'the jinn', root: 'ج ن ن', partOfSpeech: 'Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
          { id: '114-6-3', arabic: 'وَٱلنَّاسِ', transliteration: 'wan-nās', meaning: 'and humankind', root: 'ن و س', partOfSpeech: 'Noun', tajweed: 'ghunnah', tajweedNote: '2-count Ghunnah on Noon Mushaddadah' },
        ],
      },
    ],
  },
];

// Full 114-Surah directory; featured Surahs are bundled offline with full Tajweed & Tafsir, and all remaining chapters hydrate dynamically on selection
export const SURAH_DIRECTORY: SurahDirectoryEntry[] = [
  { id: 1, nameArabic: 'الفاتحة', nameSimple: 'Al-Fatiha', nameMeaning: 'The Opening', revelationPlace: 'Meccan', juz: 1, totalAyahs: 7, featured: true },
  { id: 2, nameArabic: 'البقرة', nameSimple: 'Al-Baqarah', nameMeaning: 'The Cow', revelationPlace: 'Medinan', juz: 1, totalAyahs: 286, featured: false },
  { id: 3, nameArabic: 'آل عمران', nameSimple: "Ali 'Imran", nameMeaning: 'Family of Imran', revelationPlace: 'Medinan', juz: 3, totalAyahs: 200, featured: false },
  { id: 4, nameArabic: 'النساء', nameSimple: 'An-Nisa', nameMeaning: 'The Women', revelationPlace: 'Medinan', juz: 4, totalAyahs: 176, featured: false },
  { id: 5, nameArabic: 'المائدة', nameSimple: "Al-Ma'idah", nameMeaning: 'The Table Spread', revelationPlace: 'Medinan', juz: 6, totalAyahs: 120, featured: false },
  { id: 6, nameArabic: 'الأنعام', nameSimple: "Al-An'am", nameMeaning: 'The Cattle', revelationPlace: 'Meccan', juz: 7, totalAyahs: 165, featured: false },
  { id: 7, nameArabic: 'الأعراف', nameSimple: "Al-A'raf", nameMeaning: 'The Heights', revelationPlace: 'Meccan', juz: 8, totalAyahs: 206, featured: false },
  { id: 8, nameArabic: 'الأنفال', nameSimple: 'Al-Anfal', nameMeaning: 'The Spoils of War', revelationPlace: 'Medinan', juz: 9, totalAyahs: 75, featured: false },
  { id: 9, nameArabic: 'التوبة', nameSimple: 'At-Tawbah', nameMeaning: 'The Repentance', revelationPlace: 'Medinan', juz: 10, totalAyahs: 129, featured: false },
  { id: 10, nameArabic: 'يونس', nameSimple: 'Yunus', nameMeaning: 'Jonah', revelationPlace: 'Meccan', juz: 11, totalAyahs: 109, featured: false },
  { id: 11, nameArabic: 'هود', nameSimple: 'Hud', nameMeaning: 'Hud', revelationPlace: 'Meccan', juz: 11, totalAyahs: 123, featured: false },
  { id: 12, nameArabic: 'يوسف', nameSimple: 'Yusuf', nameMeaning: 'Joseph', revelationPlace: 'Meccan', juz: 12, totalAyahs: 111, featured: false },
  { id: 13, nameArabic: 'الرعد', nameSimple: "Ar-Ra'd", nameMeaning: 'The Thunder', revelationPlace: 'Medinan', juz: 13, totalAyahs: 43, featured: false },
  { id: 14, nameArabic: 'ابراهيم', nameSimple: 'Ibrahim', nameMeaning: 'Abraham', revelationPlace: 'Meccan', juz: 13, totalAyahs: 52, featured: false },
  { id: 15, nameArabic: 'الحجر', nameSimple: 'Al-Hijr', nameMeaning: 'The Rocky Tract', revelationPlace: 'Meccan', juz: 14, totalAyahs: 99, featured: false },
  { id: 16, nameArabic: 'النحل', nameSimple: 'An-Nahl', nameMeaning: 'The Bee', revelationPlace: 'Meccan', juz: 14, totalAyahs: 128, featured: false },
  { id: 17, nameArabic: 'الإسراء', nameSimple: 'Al-Isra', nameMeaning: 'The Night Journey', revelationPlace: 'Meccan', juz: 15, totalAyahs: 111, featured: false },
  { id: 18, nameArabic: 'الكهف', nameSimple: 'Al-Kahf', nameMeaning: 'The Cave', revelationPlace: 'Meccan', juz: 15, totalAyahs: 110, featured: false },
  { id: 19, nameArabic: 'مريم', nameSimple: 'Maryam', nameMeaning: 'Mary', revelationPlace: 'Meccan', juz: 16, totalAyahs: 98, featured: false },
  { id: 20, nameArabic: 'طه', nameSimple: 'Taha', nameMeaning: 'Ta-Ha', revelationPlace: 'Meccan', juz: 16, totalAyahs: 135, featured: false },
  { id: 21, nameArabic: 'الأنبياء', nameSimple: 'Al-Anbya', nameMeaning: 'The Prophets', revelationPlace: 'Meccan', juz: 17, totalAyahs: 112, featured: false },
  { id: 22, nameArabic: 'الحج', nameSimple: 'Al-Hajj', nameMeaning: 'The Pilgrimage', revelationPlace: 'Medinan', juz: 17, totalAyahs: 78, featured: false },
  { id: 23, nameArabic: 'المؤمنون', nameSimple: "Al-Mu'minun", nameMeaning: 'The Believers', revelationPlace: 'Meccan', juz: 18, totalAyahs: 118, featured: false },
  { id: 24, nameArabic: 'النور', nameSimple: 'An-Nur', nameMeaning: 'The Light', revelationPlace: 'Medinan', juz: 18, totalAyahs: 64, featured: false },
  { id: 25, nameArabic: 'الفرقان', nameSimple: 'Al-Furqan', nameMeaning: 'The Criterion', revelationPlace: 'Meccan', juz: 18, totalAyahs: 77, featured: false },
  { id: 26, nameArabic: 'الشعراء', nameSimple: "Ash-Shu'ara", nameMeaning: 'The Poets', revelationPlace: 'Meccan', juz: 19, totalAyahs: 227, featured: false },
  { id: 27, nameArabic: 'النمل', nameSimple: 'An-Naml', nameMeaning: 'The Ant', revelationPlace: 'Meccan', juz: 19, totalAyahs: 93, featured: false },
  { id: 28, nameArabic: 'القصص', nameSimple: 'Al-Qasas', nameMeaning: 'The Stories', revelationPlace: 'Meccan', juz: 20, totalAyahs: 88, featured: false },
  { id: 29, nameArabic: 'العنكبوت', nameSimple: "Al-'Ankabut", nameMeaning: 'The Spider', revelationPlace: 'Meccan', juz: 20, totalAyahs: 69, featured: false },
  { id: 30, nameArabic: 'الروم', nameSimple: 'Ar-Rum', nameMeaning: 'The Romans', revelationPlace: 'Meccan', juz: 21, totalAyahs: 60, featured: false },
  { id: 31, nameArabic: 'لقمان', nameSimple: 'Luqman', nameMeaning: 'Luqman', revelationPlace: 'Meccan', juz: 21, totalAyahs: 34, featured: false },
  { id: 32, nameArabic: 'السجدة', nameSimple: 'As-Sajdah', nameMeaning: 'The Prostration', revelationPlace: 'Meccan', juz: 21, totalAyahs: 30, featured: false },
  { id: 33, nameArabic: 'الأحزاب', nameSimple: 'Al-Ahzab', nameMeaning: 'The Combined Forces', revelationPlace: 'Medinan', juz: 21, totalAyahs: 73, featured: false },
  { id: 34, nameArabic: 'سبإ', nameSimple: 'Saba', nameMeaning: 'Sheba', revelationPlace: 'Meccan', juz: 22, totalAyahs: 54, featured: false },
  { id: 35, nameArabic: 'فاطر', nameSimple: 'Fatir', nameMeaning: 'Originator', revelationPlace: 'Meccan', juz: 22, totalAyahs: 45, featured: false },
  { id: 36, nameArabic: 'يس', nameSimple: 'Ya-Sin', nameMeaning: 'Ya Sin', revelationPlace: 'Meccan', juz: 22, totalAyahs: 83, featured: false },
  { id: 37, nameArabic: 'الصافات', nameSimple: 'As-Saffat', nameMeaning: 'Those who set the Ranks', revelationPlace: 'Meccan', juz: 23, totalAyahs: 182, featured: false },
  { id: 38, nameArabic: 'ص', nameSimple: 'Sad', nameMeaning: 'The Letter "Saad"', revelationPlace: 'Meccan', juz: 23, totalAyahs: 88, featured: false },
  { id: 39, nameArabic: 'الزمر', nameSimple: 'Az-Zumar', nameMeaning: 'The Troops', revelationPlace: 'Meccan', juz: 23, totalAyahs: 75, featured: false },
  { id: 40, nameArabic: 'غافر', nameSimple: 'Ghafir', nameMeaning: 'The Forgiver', revelationPlace: 'Meccan', juz: 24, totalAyahs: 85, featured: false },
  { id: 41, nameArabic: 'فصلت', nameSimple: 'Fussilat', nameMeaning: 'Explained in Detail', revelationPlace: 'Meccan', juz: 24, totalAyahs: 54, featured: false },
  { id: 42, nameArabic: 'الشورى', nameSimple: 'Ash-Shuraa', nameMeaning: 'The Consultation', revelationPlace: 'Meccan', juz: 25, totalAyahs: 53, featured: false },
  { id: 43, nameArabic: 'الزخرف', nameSimple: 'Az-Zukhruf', nameMeaning: 'The Ornaments of Gold', revelationPlace: 'Meccan', juz: 25, totalAyahs: 89, featured: false },
  { id: 44, nameArabic: 'الدخان', nameSimple: 'Ad-Dukhan', nameMeaning: 'The Smoke', revelationPlace: 'Meccan', juz: 25, totalAyahs: 59, featured: false },
  { id: 45, nameArabic: 'الجاثية', nameSimple: 'Al-Jathiyah', nameMeaning: 'The Crouching', revelationPlace: 'Meccan', juz: 25, totalAyahs: 37, featured: false },
  { id: 46, nameArabic: 'الأحقاف', nameSimple: 'Al-Ahqaf', nameMeaning: 'The Wind-Curved Sandhills', revelationPlace: 'Meccan', juz: 26, totalAyahs: 35, featured: false },
  { id: 47, nameArabic: 'محمد', nameSimple: 'Muhammad', nameMeaning: 'Muhammad', revelationPlace: 'Medinan', juz: 26, totalAyahs: 38, featured: false },
  { id: 48, nameArabic: 'الفتح', nameSimple: 'Al-Fath', nameMeaning: 'The Victory', revelationPlace: 'Medinan', juz: 26, totalAyahs: 29, featured: false },
  { id: 49, nameArabic: 'الحجرات', nameSimple: 'Al-Hujurat', nameMeaning: 'The Rooms', revelationPlace: 'Medinan', juz: 26, totalAyahs: 18, featured: false },
  { id: 50, nameArabic: 'ق', nameSimple: 'Qaf', nameMeaning: 'The Letter "Qaf"', revelationPlace: 'Meccan', juz: 26, totalAyahs: 45, featured: false },
  { id: 51, nameArabic: 'الذاريات', nameSimple: 'Adh-Dhariyat', nameMeaning: 'The Winnowing Winds', revelationPlace: 'Meccan', juz: 26, totalAyahs: 60, featured: false },
  { id: 52, nameArabic: 'الطور', nameSimple: 'At-Tur', nameMeaning: 'The Mount', revelationPlace: 'Meccan', juz: 27, totalAyahs: 49, featured: false },
  { id: 53, nameArabic: 'النجم', nameSimple: 'An-Najm', nameMeaning: 'The Star', revelationPlace: 'Meccan', juz: 27, totalAyahs: 62, featured: false },
  { id: 54, nameArabic: 'القمر', nameSimple: 'Al-Qamar', nameMeaning: 'The Moon', revelationPlace: 'Meccan', juz: 27, totalAyahs: 55, featured: false },
  { id: 55, nameArabic: 'الرحمن', nameSimple: 'Ar-Rahman', nameMeaning: 'The Most Merciful', revelationPlace: 'Medinan', juz: 27, totalAyahs: 78, featured: false },
  { id: 56, nameArabic: 'الواقعة', nameSimple: "Al-Waqi'ah", nameMeaning: 'The Inevitable', revelationPlace: 'Meccan', juz: 27, totalAyahs: 96, featured: false },
  { id: 57, nameArabic: 'الحديد', nameSimple: 'Al-Hadid', nameMeaning: 'The Iron', revelationPlace: 'Medinan', juz: 27, totalAyahs: 29, featured: false },
  { id: 58, nameArabic: 'المجادلة', nameSimple: 'Al-Mujadila', nameMeaning: 'The Pleading Woman', revelationPlace: 'Medinan', juz: 28, totalAyahs: 22, featured: false },
  { id: 59, nameArabic: 'الحشر', nameSimple: 'Al-Hashr', nameMeaning: 'The Exile', revelationPlace: 'Medinan', juz: 28, totalAyahs: 24, featured: false },
  { id: 60, nameArabic: 'الممتحنة', nameSimple: 'Al-Mumtahanah', nameMeaning: 'She that is to be examined', revelationPlace: 'Medinan', juz: 28, totalAyahs: 13, featured: false },
  { id: 61, nameArabic: 'الصف', nameSimple: 'As-Saf', nameMeaning: 'The Ranks', revelationPlace: 'Medinan', juz: 28, totalAyahs: 14, featured: false },
  { id: 62, nameArabic: 'الجمعة', nameSimple: "Al-Jumu'ah", nameMeaning: 'The Congregation, Friday', revelationPlace: 'Medinan', juz: 28, totalAyahs: 11, featured: false },
  { id: 63, nameArabic: 'المنافقون', nameSimple: 'Al-Munafiqun', nameMeaning: 'The Hypocrites', revelationPlace: 'Medinan', juz: 28, totalAyahs: 11, featured: false },
  { id: 64, nameArabic: 'التغابن', nameSimple: 'At-Taghabun', nameMeaning: 'The Mutual Disillusion', revelationPlace: 'Medinan', juz: 28, totalAyahs: 18, featured: false },
  { id: 65, nameArabic: 'الطلاق', nameSimple: 'At-Talaq', nameMeaning: 'The Divorce', revelationPlace: 'Medinan', juz: 28, totalAyahs: 12, featured: false },
  { id: 66, nameArabic: 'التحريم', nameSimple: 'At-Tahrim', nameMeaning: 'The Prohibition', revelationPlace: 'Medinan', juz: 28, totalAyahs: 12, featured: false },
  { id: 67, nameArabic: 'الملك', nameSimple: 'Al-Mulk', nameMeaning: 'The Sovereignty', revelationPlace: 'Meccan', juz: 29, totalAyahs: 30, featured: false },
  { id: 68, nameArabic: 'القلم', nameSimple: 'Al-Qalam', nameMeaning: 'The Pen', revelationPlace: 'Meccan', juz: 29, totalAyahs: 52, featured: false },
  { id: 69, nameArabic: 'الحاقة', nameSimple: 'Al-Haqqah', nameMeaning: 'The Reality', revelationPlace: 'Meccan', juz: 29, totalAyahs: 52, featured: false },
  { id: 70, nameArabic: 'المعارج', nameSimple: "Al-Ma'arij", nameMeaning: 'The Ascending Stairways', revelationPlace: 'Meccan', juz: 29, totalAyahs: 44, featured: false },
  { id: 71, nameArabic: 'نوح', nameSimple: 'Nuh', nameMeaning: 'Noah', revelationPlace: 'Meccan', juz: 29, totalAyahs: 28, featured: false },
  { id: 72, nameArabic: 'الجن', nameSimple: 'Al-Jinn', nameMeaning: 'The Jinn', revelationPlace: 'Meccan', juz: 29, totalAyahs: 28, featured: false },
  { id: 73, nameArabic: 'المزمل', nameSimple: 'Al-Muzzammil', nameMeaning: 'The Enshrouded One', revelationPlace: 'Meccan', juz: 29, totalAyahs: 20, featured: false },
  { id: 74, nameArabic: 'المدثر', nameSimple: 'Al-Muddaththir', nameMeaning: 'The Cloaked One', revelationPlace: 'Meccan', juz: 29, totalAyahs: 56, featured: false },
  { id: 75, nameArabic: 'القيامة', nameSimple: 'Al-Qiyamah', nameMeaning: 'The Resurrection', revelationPlace: 'Meccan', juz: 29, totalAyahs: 40, featured: false },
  { id: 76, nameArabic: 'الانسان', nameSimple: 'Al-Insan', nameMeaning: 'The Man', revelationPlace: 'Medinan', juz: 29, totalAyahs: 31, featured: false },
  { id: 77, nameArabic: 'المرسلات', nameSimple: 'Al-Mursalat', nameMeaning: 'The Emissaries', revelationPlace: 'Meccan', juz: 29, totalAyahs: 50, featured: false },
  { id: 78, nameArabic: 'النبإ', nameSimple: 'An-Naba', nameMeaning: 'The Tidings', revelationPlace: 'Meccan', juz: 30, totalAyahs: 40, featured: false },
  { id: 79, nameArabic: 'النازعات', nameSimple: "An-Nazi'at", nameMeaning: 'Those who drag forth', revelationPlace: 'Meccan', juz: 30, totalAyahs: 46, featured: false },
  { id: 80, nameArabic: 'عبس', nameSimple: "'Abasa", nameMeaning: 'He Frowned', revelationPlace: 'Meccan', juz: 30, totalAyahs: 42, featured: false },
  { id: 81, nameArabic: 'التكوير', nameSimple: 'At-Takwir', nameMeaning: 'The Overthrowing', revelationPlace: 'Meccan', juz: 30, totalAyahs: 29, featured: false },
  { id: 82, nameArabic: 'الإنفطار', nameSimple: 'Al-Infitar', nameMeaning: 'The Cleaving', revelationPlace: 'Meccan', juz: 30, totalAyahs: 19, featured: false },
  { id: 83, nameArabic: 'المطففين', nameSimple: 'Al-Mutaffifin', nameMeaning: 'The Defrauding', revelationPlace: 'Meccan', juz: 30, totalAyahs: 36, featured: false },
  { id: 84, nameArabic: 'الإنشقاق', nameSimple: 'Al-Inshiqaq', nameMeaning: 'The Sundering', revelationPlace: 'Meccan', juz: 30, totalAyahs: 25, featured: false },
  { id: 85, nameArabic: 'البروج', nameSimple: 'Al-Buruj', nameMeaning: 'The Mansions of the Stars', revelationPlace: 'Meccan', juz: 30, totalAyahs: 22, featured: false },
  { id: 86, nameArabic: 'الطارق', nameSimple: 'At-Tariq', nameMeaning: 'The Nightcommer', revelationPlace: 'Meccan', juz: 30, totalAyahs: 17, featured: false },
  { id: 87, nameArabic: 'الأعلى', nameSimple: "Al-A'la", nameMeaning: 'The Most High', revelationPlace: 'Meccan', juz: 30, totalAyahs: 19, featured: false },
  { id: 88, nameArabic: 'الغاشية', nameSimple: 'Al-Ghashiyah', nameMeaning: 'The Overwhelming', revelationPlace: 'Meccan', juz: 30, totalAyahs: 26, featured: false },
  { id: 89, nameArabic: 'الفجر', nameSimple: 'Al-Fajr', nameMeaning: 'The Dawn', revelationPlace: 'Meccan', juz: 30, totalAyahs: 30, featured: false },
  { id: 90, nameArabic: 'البلد', nameSimple: 'Al-Balad', nameMeaning: 'The City', revelationPlace: 'Meccan', juz: 30, totalAyahs: 20, featured: false },
  { id: 91, nameArabic: 'الشمس', nameSimple: 'Ash-Shams', nameMeaning: 'The Sun', revelationPlace: 'Meccan', juz: 30, totalAyahs: 15, featured: false },
  { id: 92, nameArabic: 'الليل', nameSimple: 'Al-Layl', nameMeaning: 'The Night', revelationPlace: 'Meccan', juz: 30, totalAyahs: 21, featured: false },
  { id: 93, nameArabic: 'الضحى', nameSimple: 'Ad-Duha', nameMeaning: 'The Morning Brightness', revelationPlace: 'Meccan', juz: 30, totalAyahs: 11, featured: true },
  { id: 94, nameArabic: 'الشرح', nameSimple: 'Ash-Sharh', nameMeaning: 'The Relief', revelationPlace: 'Meccan', juz: 30, totalAyahs: 8, featured: true },
  { id: 95, nameArabic: 'التين', nameSimple: 'At-Tin', nameMeaning: 'The Fig', revelationPlace: 'Meccan', juz: 30, totalAyahs: 8, featured: false },
  { id: 96, nameArabic: 'العلق', nameSimple: "Al-'Alaq", nameMeaning: 'The Clot', revelationPlace: 'Meccan', juz: 30, totalAyahs: 19, featured: false },
  { id: 97, nameArabic: 'القدر', nameSimple: 'Al-Qadr', nameMeaning: 'The Night of Decree', revelationPlace: 'Meccan', juz: 30, totalAyahs: 5, featured: true },
  { id: 98, nameArabic: 'البينة', nameSimple: 'Al-Bayyinah', nameMeaning: 'The Clear Proof', revelationPlace: 'Medinan', juz: 30, totalAyahs: 8, featured: false },
  { id: 99, nameArabic: 'الزلزلة', nameSimple: 'Az-Zalzalah', nameMeaning: 'The Earthquake', revelationPlace: 'Medinan', juz: 30, totalAyahs: 8, featured: false },
  { id: 100, nameArabic: 'العاديات', nameSimple: "Al-'Adiyat", nameMeaning: 'The Courser', revelationPlace: 'Meccan', juz: 30, totalAyahs: 11, featured: false },
  { id: 101, nameArabic: 'القارعة', nameSimple: "Al-Qari'ah", nameMeaning: 'The Calamity', revelationPlace: 'Meccan', juz: 30, totalAyahs: 11, featured: false },
  { id: 102, nameArabic: 'التكاثر', nameSimple: 'At-Takathur', nameMeaning: 'The Rivalry in world increase', revelationPlace: 'Meccan', juz: 30, totalAyahs: 8, featured: false },
  { id: 103, nameArabic: 'العصر', nameSimple: 'Al-Asr', nameMeaning: 'The Declining Day', revelationPlace: 'Meccan', juz: 30, totalAyahs: 3, featured: true },
  { id: 104, nameArabic: 'الهمزة', nameSimple: 'Al-Humazah', nameMeaning: 'The Traducer', revelationPlace: 'Meccan', juz: 30, totalAyahs: 9, featured: false },
  { id: 105, nameArabic: 'الفيل', nameSimple: 'Al-Fil', nameMeaning: 'The Elephant', revelationPlace: 'Meccan', juz: 30, totalAyahs: 5, featured: false },
  { id: 106, nameArabic: 'قريش', nameSimple: 'Quraysh', nameMeaning: 'Quraysh', revelationPlace: 'Meccan', juz: 30, totalAyahs: 4, featured: false },
  { id: 107, nameArabic: 'الماعون', nameSimple: "Al-Ma'un", nameMeaning: 'The Small kindnesses', revelationPlace: 'Meccan', juz: 30, totalAyahs: 7, featured: false },
  { id: 108, nameArabic: 'الكوثر', nameSimple: 'Al-Kawthar', nameMeaning: 'The Abundance', revelationPlace: 'Meccan', juz: 30, totalAyahs: 3, featured: false },
  { id: 109, nameArabic: 'الكافرون', nameSimple: 'Al-Kafirun', nameMeaning: 'The Disbelievers', revelationPlace: 'Meccan', juz: 30, totalAyahs: 6, featured: false },
  { id: 110, nameArabic: 'النصر', nameSimple: 'An-Nasr', nameMeaning: 'The Divine Support', revelationPlace: 'Medinan', juz: 30, totalAyahs: 3, featured: false },
  { id: 111, nameArabic: 'المسد', nameSimple: 'Al-Masad', nameMeaning: 'The Palm Fiber', revelationPlace: 'Meccan', juz: 30, totalAyahs: 5, featured: false },
  { id: 112, nameArabic: 'الإخلاص', nameSimple: 'Al-Ikhlas', nameMeaning: 'Sincerity of Faith', revelationPlace: 'Meccan', juz: 30, totalAyahs: 4, featured: true },
  { id: 113, nameArabic: 'الفلق', nameSimple: 'Al-Falaq', nameMeaning: 'The Daybreak', revelationPlace: 'Meccan', juz: 30, totalAyahs: 5, featured: true },
  { id: 114, nameArabic: 'الناس', nameSimple: 'An-Nas', nameMeaning: 'Mankind', revelationPlace: 'Meccan', juz: 30, totalAyahs: 6, featured: true },
];

export function getEveryAyahUrl(folder: string, surahId: number, ayahNumber: number): string {
  const s = String(surahId).padStart(3, '0');
  const a = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${folder}/${s}${a}.mp3`;
}

export function getOpenerAudioUrl(reciter: Reciter, phase: OpenerPhase): string {
  if (phase === 'istiadhah') {
    const folder = reciter.hasAudhubillah ? reciter.everyAyahFolder : 'Ghamadi_40kbps';
    return `https://everyayah.com/data/${folder}/audhubillah.mp3`;
  }
  if (reciter.hasBismillahFile) {
    return `https://everyayah.com/data/${reciter.everyAyahFolder}/bismillah.mp3`;
  }
  return getEveryAyahUrl(reciter.everyAyahFolder, 1, 1);
}

const DATA_CACHE_NAME = 'noor-surah-data-v1';

async function readDataCache<T>(cacheKey: string): Promise<T | null> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const match = await cache.match(cacheKey);
      if (match) {
        return (await match.json()) as T;
      }
    }
  } catch {
    // Ignore Cache Storage restrictions
  }
  return null;
}

async function writeDataCache(cacheKey: string, value: unknown): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(value), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  } catch {
    // Ignore quota/storage errors
  }
}

export async function fetchChapterTimingData(
  quranComId: number,
  surahId: number
): Promise<ChapterAudioData> {
  const apiUrl = `https://api.quran.com/api/v4/chapter_recitations/${quranComId}/${surahId}?segments=true`;
  const cached = await readDataCache<ChapterAudioData>(apiUrl);
  if (cached && cached.audioUrl && cached.versesByKey) {
    return cached;
  }

  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error('Unable to load word timing segments.');
  }
  const json = await res.json();
  const audioFile = json?.audio_file;
  if (!audioFile || !audioFile.audio_url || !Array.isArray(audioFile.timestamps)) {
    throw new Error('Invalid chapter timing response.');
  }

  const versesByKey: Record<string, VerseTiming> = {};
  for (const t of audioFile.timestamps) {
    if (!t.verse_key) continue;
    const rawSegs: unknown[] = Array.isArray(t.segments) ? t.segments : [];
    const parsedMap = new Map<number, WordSegment>();

    for (const seg of rawSegs) {
      if (
        Array.isArray(seg) &&
        seg.length >= 3 &&
        typeof seg[0] === 'number' &&
        typeof seg[1] === 'number' &&
        typeof seg[2] === 'number' &&
        seg[2] >= seg[1]
      ) {
        const wordIndex = Math.max(0, seg[0] - 1);
        const startMs = seg[1];
        const endMs = seg[2];
        const existing = parsedMap.get(wordIndex);
        if (existing) {
          existing.startMs = Math.min(existing.startMs, startMs);
          existing.endMs = Math.max(existing.endMs, endMs);
        } else {
          parsedMap.set(wordIndex, { wordIndex, startMs, endMs });
        }
      }
    }

    const segments = Array.from(parsedMap.values()).sort(
      (a, b) => a.startMs - b.startMs
    );

    versesByKey[t.verse_key] = {
      verseKey: t.verse_key,
      timestampFromMs: Number(t.timestamp_from) || 0,
      timestampToMs: Number(t.timestamp_to) || 0,
      segments,
    };
  }

  const result: ChapterAudioData = {
    audioUrl: audioFile.audio_url,
    versesByKey,
  };
  void writeDataCache(apiUrl, result);
  return result;
}

interface QuranComWord {
  char_type_name?: string;
  text_uthmani?: string;
  text?: string;
  translation?: { text?: string | null };
  transliteration?: { text?: string | null };
}

interface QuranComVerse {
  verse_number: number;
  verse_key: string;
  juz_number: number;
  words?: QuranComWord[];
  translations?: Array<{ resource_id?: number; text?: string }>;
}

const TRANSLATION_RESOURCE_IDS: Record<TranslationLanguage, number> = {
  en: 20, // Sahih International
  hi: 122, // Maulana Azizul Haque al-Umari
  ur: 234, // Fatah Muhammad Jalandhari
  bn: 161, // Taisirul Quran (Bengali)
  ms: 39, // Abdullah Muhammad Basmeih (Malay / Indo)
  ha: 32, // Abubakar Mahmoud Gumi (Pan-Hausa)
  ff: 20, // Base Sahih Intl translated cleanly into Fulfulde via /api/translate-batch
};

const ALQURAN_CLOUD_EDITION_IDS: Partial<Record<TranslationLanguage, string>> = {
  hi: 'hi.hindi',
  ur: 'ur.jalandhry',
  bn: 'bn.bengali',
  ms: 'ms.basmeih',
  ha: 'ha.gumi',
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, ' ');
}

function stripHtmlTags(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

const ENGLISH_GLUE_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'from',
  'by',
  'with',
  'and',
  'or',
  'nor',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'has',
  'have',
  'had',
  'will',
  'shall',
  'not',
  'that',
  'this',
  'those',
  'these',
  'who',
  'whom',
  'which',
  'it',
  'he',
  'she',
  'they',
  'we',
  'you',
  'i',
  'his',
  'her',
  'their',
  'our',
  'your',
  'my',
  'him',
  'them',
  'us',
  'as',
  'so',
  'if',
  'into',
  'upon',
]);

function normalizeScriptTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Aligns a verse's full translation (English, Hindi, or Urdu) back to individual Arabic words
 * using per-word glosses from the API, preserving non-linear word order across SVO & SOV languages.
 */
export function alignTranslationSegments(
  translation: string,
  words: WordToken[],
  lang: TranslationLanguage = 'en'
): TranslationSegment[] | undefined {
  const tokens = translation.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length || !words.length) return undefined;
  if (words.length === 1) {
    return [{ text: translation.trim(), wordIndex: 0 }];
  }

  const wordLexicons = words.map((w) => {
    const gloss = getWordMeaningText(w, lang);
    return new Set(normalizeScriptTokens(gloss || ''));
  });

  const assigned: (number | null)[] = new Array(tokens.length).fill(null);

  for (let i = 0; i < tokens.length; i++) {
    const rawTok = tokens[i];
    const cleanList = normalizeScriptTokens(rawTok);
    if (cleanList.length === 0) continue;
    const cleanTok = cleanList[0];
    const approxArabicPos = (i / tokens.length) * (words.length - 1);

    let bestScore = 0;
    let bestWordIdx: number | null = null;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const lex = wordLexicons[wIdx];
      if (!lex.size) continue;

      let matchStrength = 0;
      if (lex.has(cleanTok)) {
        matchStrength = lang === 'en' && ENGLISH_GLUE_WORDS.has(cleanTok) ? 1.1 : 3.2;
      } else if (cleanTok.length >= 3) {
        const prefixLen = Math.min(4, cleanTok.length);
        for (const glossTok of lex) {
          if (
            glossTok.length >= 3 &&
            (glossTok.startsWith(cleanTok.slice(0, prefixLen)) ||
              cleanTok.startsWith(glossTok.slice(0, Math.min(4, glossTok.length))))
          ) {
            matchStrength = 2.1;
            break;
          }
        }
      }

      if (matchStrength > 0) {
        const distPenalty = Math.abs(wIdx - approxArabicPos) * 0.08;
        const score = matchStrength - distPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestWordIdx = wIdx;
        }
      }
    }

    if (bestWordIdx !== null) {
      assigned[i] = bestWordIdx;
    }
  }

  // Fill any unmatched tokens (e.g. bracketed notes, postpositions, or helper verbs) smoothly from neighbors
  let lastSeen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (assigned[i] !== null) {
      lastSeen = assigned[i] as number;
    } else {
      let nextFound: number | null = null;
      for (let j = i + 1; j < tokens.length; j++) {
        if (assigned[j] !== null) {
          nextFound = assigned[j];
          break;
        }
      }
      const fallbackPos = Math.min(
        words.length - 1,
        Math.round((i / Math.max(1, tokens.length - 1)) * (words.length - 1))
      );
      assigned[i] =
        nextFound !== null && Math.abs(nextFound - lastSeen) <= 1
          ? nextFound
          : Math.min(words.length - 1, Math.max(0, lastSeen || fallbackPos));
    }
  }

  const segments: TranslationSegment[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const wIdx = assigned[i] ?? 0;
    const prev = segments[segments.length - 1];
    if (prev && prev.wordIndex === wIdx) {
      prev.text = `${prev.text} ${tokens[i]}`;
    } else {
      segments.push({ text: tokens[i], wordIndex: wIdx });
    }
  }

  return segments.length > 0 ? segments : undefined;
}

export interface SurahLanguageOverlay {
  versesByNumber: Record<
    number,
    {
      translation?: string;
      translationHi?: string;
      translationUr?: string;
      wordMeanings?: string[];
    }
  >;
}

export async function fetchSurahLanguageOverlay(
  surahId: number,
  targetLang: Exclude<TranslationLanguage, 'en'>,
  sourceVerses?: Array<{ number: number; arabic: string; translation: string; words: WordToken[] }>
): Promise<SurahLanguageOverlay> {
  const cacheKey = `https://noor-recite.local/surah-lang/v2/${surahId}/${targetLang}`;
  const cached = await readDataCache<SurahLanguageOverlay>(cacheKey);
  if (cached && cached.versesByNumber && Object.keys(cached.versesByNumber).length > 0) {
    return cached;
  }

  const versesByNumber: SurahLanguageOverlay['versesByNumber'] = {};

  if (targetLang === 'ff') {
    let baseVerses = sourceVerses;
    if (!baseVerses || baseVerses.length === 0) {
      const enRes = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?words=false&translations=20&per_page=50&page=1`
      );
      if (enRes.ok) {
        const enJson = await enRes.json();
        const totalPages = Math.max(1, Number(enJson?.pagination?.total_pages || 1));
        const allEn: QuranComVerse[] = Array.isArray(enJson?.verses) ? [...enJson.verses] : [];
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              fetch(
                `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?words=false&translations=20&per_page=50&page=${i + 2}`
              ).then((r) => (r.ok ? r.json() : { verses: [] }))
            )
          );
          for (const pj of rest) {
            if (Array.isArray(pj?.verses)) allEn.push(...pj.verses);
          }
        }
        baseVerses = allEn.map((v) => ({
          number: v.verse_number,
          arabic: '',
          translation: stripHtmlTags(v.translations?.[0]?.text || ''),
          words: [],
        }));
      }
    }

    if (!baseVerses || baseVerses.length === 0) {
      throw new Error('Unable to load base verses for Fulfulde translation.');
    }

    const translatedMap = await translateTextsBatch(
      'ff',
      baseVerses.map((v) => ({
        id: String(v.number),
        text: v.translation,
        arabic: v.arabic,
      }))
    );

    for (const v of baseVerses) {
      const ffText = translatedMap[String(v.number)];
      if (ffText) {
        versesByNumber[v.number] = { translation: ffText };
      }
    }

    const overlay: SurahLanguageOverlay = { versesByNumber };
    if (Object.keys(versesByNumber).length > 0) {
      void writeDataCache(cacheKey, overlay);
    }
    return overlay;
  }

  const resourceId = TRANSLATION_RESOURCE_IDS[targetLang];
  const wordApiLang =
    targetLang === 'ms' ? 'id' : targetLang === 'ha' ? 'en' : targetLang;

  try {
    const firstRes = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?words=true&translations=${resourceId}&language=${wordApiLang}&per_page=50&page=1`
    );
    if (firstRes.ok) {
      const firstJson = await firstRes.json();
      const totalPages = Math.max(1, Number(firstJson?.pagination?.total_pages || 1));
      const allVerses: QuranComVerse[] = Array.isArray(firstJson?.verses)
        ? [...firstJson.verses]
        : [];

      if (totalPages > 1) {
        const restPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetch(
              `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?words=true&translations=${resourceId}&language=${wordApiLang}&per_page=50&page=${i + 2}`
            ).then((r) => (r.ok ? r.json() : { verses: [] }))
          )
        );
        for (const pageJson of restPages) {
          if (Array.isArray(pageJson?.verses)) {
            allVerses.push(...pageJson.verses);
          }
        }
      }

      for (const v of allVerses) {
        const rawText = v.translations?.find((t) => t.resource_id === resourceId)?.text
          ?? v.translations?.[0]?.text;
        const cleanText = rawText ? stripHtmlTags(rawText) : undefined;
        const wordMeanings =
          targetLang === 'ha'
            ? undefined
            : (v.words || [])
                .filter((w) => w.char_type_name === 'word')
                .map((w) => decodeHtmlEntities((w.translation?.text || '').trim()));

        versesByNumber[v.verse_number] = {
          translation: cleanText,
          ...(targetLang === 'hi' ? { translationHi: cleanText } : {}),
          ...(targetLang === 'ur' ? { translationUr: cleanText } : {}),
          wordMeanings,
        };
      }

      if (Object.keys(versesByNumber).length > 0) {
        const overlay: SurahLanguageOverlay = { versesByNumber };
        void writeDataCache(cacheKey, overlay);
        return overlay;
      }
    }
  } catch {
    // Fall through to AlQuran.cloud backup
  }

  const edition = ALQURAN_CLOUD_EDITION_IDS[targetLang];
  if (edition) {
    const cloudRes = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahId}/${edition}`
    );
    if (cloudRes.ok) {
      const cloudJson = await cloudRes.json();
      const cloudAyahs = cloudJson?.data?.ayahs;
      if (Array.isArray(cloudAyahs)) {
        for (const item of cloudAyahs) {
          const num = Number(item.numberInSurah);
          const clean = stripHtmlTags(String(item.text || ''));
          if (num && clean) {
            versesByNumber[num] = {
              translation: clean,
              ...(targetLang === 'hi' ? { translationHi: clean } : {}),
              ...(targetLang === 'ur' ? { translationUr: clean } : {}),
            };
          }
        }
      }
    }
  }

  if (Object.keys(versesByNumber).length === 0) {
    throw new Error(`Unable to fetch ${targetLang} translations.`);
  }

  const overlay: SurahLanguageOverlay = { versesByNumber };
  void writeDataCache(cacheKey, overlay);
  return overlay;
}

export interface SurahWarshOverlay {
  versesByNumber: Record<number, string>;
}

export function alignWarshWordsToHafs(
  warshArabic: string,
  hafsWords: WordToken[]
): string[] {
  const tokens = warshArabic.trim().split(/\s+/).filter(Boolean);
  const n = hafsWords.length;
  const m = tokens.length;
  if (n === 0) return [];
  if (m === 0) return hafsWords.map((w) => w.arabic);
  if (m === n) return tokens;

  const aligned: string[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.floor((i * m) / n);
    const end = Math.floor(((i + 1) * m) / n);
    if (end > start) {
      aligned.push(tokens.slice(start, end).join(' '));
    } else {
      aligned.push('');
    }
  }
  return aligned;
}

export async function fetchSurahWarshOverlay(
  surahId: number
): Promise<SurahWarshOverlay> {
  const cacheKey = `https://noor-recite.local/warsh/v1/${surahId}`;
  const cached = await readDataCache<SurahWarshOverlay>(cacheKey);
  if (cached && cached.versesByNumber && Object.keys(cached.versesByNumber).length > 0) {
    return cached;
  }

  const urls = [
    `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranwarsh/${surahId}.json`,
    `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranwarsh/${surahId}.min.json`,
  ];

  let chapterList: Array<{ chapter?: number; verse?: number; text?: string }> = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          chapter?: Array<{ chapter?: number; verse?: number; text?: string }>;
        };
        if (Array.isArray(json?.chapter) && json.chapter.length > 0) {
          chapterList = json.chapter;
          break;
        }
      }
    } catch {
      // try next mirror
    }
  }

  if (chapterList.length === 0) {
    throw new Error(`Unable to load Warsh text for Surah ${surahId}.`);
  }

  const versesByNumber: Record<number, string> = {};
  for (const item of chapterList) {
    const verseNum = Number(item.verse);
    const text = String(item.text || '').trim();
    if (verseNum > 0 && text) {
      versesByNumber[verseNum] = text;
    }
  }

  const overlay: SurahWarshOverlay = { versesByNumber };
  if (Object.keys(versesByNumber).length > 0) {
    void writeDataCache(cacheKey, overlay);
  }
  return overlay;
}

export async function fetchSurahFromApi(entry: SurahDirectoryEntry): Promise<Surah> {
  const cacheKey = `https://noor-recite.local/surah/v3/${entry.id}`;
  const cachedSurah = await readDataCache<Surah>(cacheKey);
  if (cachedSurah && Array.isArray(cachedSurah.ayahs) && cachedSurah.ayahs.length > 0) {
    return cachedSurah;
  }

  try {
    const firstRes = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${entry.id}?words=true&translations=${TRANSLATION_RESOURCE_IDS.en},${TRANSLATION_RESOURCE_IDS.hi},${TRANSLATION_RESOURCE_IDS.ur}&word_fields=text_uthmani&per_page=50&page=1`
    );
    if (firstRes.ok) {
      const firstJson = await firstRes.json();
      const totalPages = Math.max(1, Number(firstJson?.pagination?.total_pages || 1));
      const allVerses: QuranComVerse[] = Array.isArray(firstJson?.verses)
        ? [...firstJson.verses]
        : [];

      if (totalPages > 1) {
        const restPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetch(
              `https://api.quran.com/api/v4/verses/by_chapter/${entry.id}?words=true&translations=${TRANSLATION_RESOURCE_IDS.en},${TRANSLATION_RESOURCE_IDS.hi},${TRANSLATION_RESOURCE_IDS.ur}&word_fields=text_uthmani&per_page=50&page=${i + 2}`
            ).then((r) => (r.ok ? r.json() : { verses: [] }))
          )
        );
        for (const pageJson of restPages) {
          if (Array.isArray(pageJson?.verses)) {
            allVerses.push(...pageJson.verses);
          }
        }
      }

      if (allVerses.length > 0) {
        const ayahs = allVerses.map((v) => {
          const wordItems = (v.words || []).filter(
            (w) => w.char_type_name === 'word'
          );
          const words: WordToken[] = wordItems.map((w, wIdx) => ({
            id: `${entry.id}-${v.verse_number}-${wIdx + 1}`,
            arabic: (w.text_uthmani || w.text || '').trim(),
            transliteration: (w.transliteration?.text || '').trim(),
            meaning:
              decodeHtmlEntities((w.translation?.text || '').trim()) ||
              'Word reflection',
          }));

          const arabic = words.map((w) => w.arabic).join(' ');
          const transliteration = words
            .map((w) => w.transliteration)
            .filter(Boolean)
            .join(' ');
          const enRaw =
            v.translations?.find((t) => t.resource_id === TRANSLATION_RESOURCE_IDS.en)
              ?.text ??
            v.translations?.[0]?.text ??
            '';
          const hiRaw =
            v.translations?.find((t) => t.resource_id === TRANSLATION_RESOURCE_IDS.hi)
              ?.text ?? '';
          const urRaw =
            v.translations?.find((t) => t.resource_id === TRANSLATION_RESOURCE_IDS.ur)
              ?.text ?? '';

          const translation = stripHtmlTags(enRaw);
          const translationHi = hiRaw ? stripHtmlTags(hiRaw) : undefined;
          const translationUr = urRaw ? stripHtmlTags(urRaw) : undefined;
          const translationSegments = alignTranslationSegments(translation, words, 'en');

          return {
            number: v.verse_number,
            verseKey: v.verse_key || `${entry.id}:${v.verse_number}`,
            juz: v.juz_number || entry.juz,
            arabic,
            transliteration,
            translation,
            translationHi,
            translationUr,
            translationSegments,
            tafsirBrief: `Surah ${entry.nameSimple}, Verse ${v.verse_number}. Reflect on the rhythmic cadence and clarity of the Uthmani script.`,
            words,
            durationSec: Math.max(3.2, Number((words.length * 0.85).toFixed(1))),
            waveform: makeWave(entry.id * 10 + v.verse_number),
          };
        });

        const builtSurah: Surah = {
          id: entry.id,
          nameArabic: entry.nameArabic,
          nameSimple: entry.nameSimple,
          nameMeaning: entry.nameMeaning,
          revelationPlace: entry.revelationPlace,
          juz: entry.juz,
          totalAyahs: entry.totalAyahs,
          hasBismillah: entry.id !== 1 && entry.id !== 9,
          estimatedMinutes: Math.max(1, Math.round(ayahs.length * 0.18)),
          featured: entry.featured,
          ayahs,
        };
        void writeDataCache(cacheKey, builtSurah);
        return builtSurah;
      }
    }
  } catch {
    // Fall through to AlQuran Cloud backup
  }

  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${entry.id}/editions/quran-uthmani,en.sahih,en.transliteration`
  );
  if (!res.ok) {
    throw new Error('Unable to reach Quran text service.');
  }
  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data) || json.data.length < 3) {
    throw new Error('Unexpected response from Quran service.');
  }

  const [arEdition, enEdition, trEdition] = json.data;
  const arAyahs = arEdition.ayahs || [];
  const enAyahs = enEdition.ayahs || [];
  const trAyahs = trEdition.ayahs || [];
  const bismillahPrefix = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ';

  const ayahs = arAyahs.map((arItem: { numberInSurah: number; text: string; juz: number }, idx: number) => {
    const num = arItem.numberInSurah;
    let rawArabic = arItem.text;
    if (num === 1 && entry.id !== 1 && entry.id !== 9 && rawArabic.startsWith(bismillahPrefix)) {
      rawArabic = rawArabic.slice(bismillahPrefix.length).trim();
    }
    const tokens = rawArabic.split(/\s+/).filter(Boolean);
    const enText = enAyahs[idx]?.text || '';
    const trText = trAyahs[idx]?.text || '';
    const trTokens = trText.split(/\s+/).filter(Boolean);

    const words: WordToken[] = tokens.map((w: string, wIdx: number) => ({
      id: `${entry.id}-${num}-${wIdx + 1}`,
      arabic: w,
      transliteration: trTokens[wIdx] || '',
      meaning: 'Tap Ayah translation for full phrasing',
    }));

    return {
      number: num,
      verseKey: `${entry.id}:${num}`,
      juz: arItem.juz || entry.juz,
      arabic: rawArabic,
      transliteration: trText,
      translation: enText,
      tafsirBrief: `Surah ${entry.nameSimple}, Verse ${num}. Reflect on the rhythmic cadence and clarity of the Uthmani script.`,
      words,
      durationSec: Math.max(3.5, Number((tokens.length * 0.85).toFixed(1))),
      waveform: makeWave(entry.id * 10 + num),
    };
  });

  return {
    id: entry.id,
    nameArabic: entry.nameArabic,
    nameSimple: entry.nameSimple,
    nameMeaning: entry.nameMeaning,
    revelationPlace: entry.revelationPlace,
    juz: entry.juz,
    totalAyahs: entry.totalAyahs,
    hasBismillah: entry.id !== 1 && entry.id !== 9,
    estimatedMinutes: Math.max(1, Math.round(ayahs.length * 0.18)),
    featured: entry.featured,
    ayahs,
  };
}
