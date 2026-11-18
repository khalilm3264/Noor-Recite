export type MakhrajGroup = 'throat' | 'tongue' | 'lips' | 'cavity';

export type IpaPlace =
  | 'bilabial'
  | 'labiodental'
  | 'interdental'
  | 'alveolar'
  | 'palatal'
  | 'velar-uvular'
  | 'pharyngeal'
  | 'glottal';

export type IpaManner =
  | 'stop'
  | 'fricative'
  | 'nasal'
  | 'lateral'
  | 'trill'
  | 'approximant'
  | 'vowel';

export type TonguePoseId =
  | 'interdental-heavy'
  | 'interdental-light'
  | 'alveolar-tip'
  | 'alveolar-heavy'
  | 'alveolar-trill'
  | 'palatal-mid'
  | 'tongue-side-heavy'
  | 'velar'
  | 'uvular'
  | 'throat-pharynx'
  | 'throat-glottal'
  | 'lips-closed'
  | 'lips-dental'
  | 'lips-round'
  | 'open-jaw';

export interface ArabicPhonemeSpec {
  id: string;
  letter: string;
  displayForm: string;
  name: string;
  arabicName: string;
  transliteration: string;
  ipa: string;
  makhrajGroup: MakhrajGroup;
  makhrajArabic: string;
  makhrajEnglish: string;
  subZoneLabel: string;
  placeOfArticulation: IpaPlace;
  mannerOfArticulation: IpaManner;
  voiced: boolean;
  emphatic: boolean;
  nasal?: boolean;
  tonguePose: TonguePoseId;
  contactMarker: {
    x: number;
    y: number;
    label: string;
  };
  howToPronounce: string;
  tongueStep: string;
  englishAnchor: string;
  commonMistake: string;
  similarLetters: string[];
  quranExample: {
    word: string;
    transliteration: string;
    meaning: string;
    verseKey: string;
    surahId: number;
    ayahNumber: number;
  };
}

export const MAKHRAJ_GROUPS: {
  id: MakhrajGroup;
  title: string;
  arabicTitle: string;
  description: string;
}[] = [
  {
    id: 'tongue',
    title: 'Al-Lisān (Tongue)',
    arabicTitle: 'اللِّسَان',
    description:
      '18 letters articulated across the back, middle, side edges, and tip of the tongue against the palate, gum ridge, and teeth.',
  },
  {
    id: 'throat',
    title: 'Al-Ḥalq (Throat)',
    arabicTitle: 'الْحَلْق',
    description:
      '6 guttural letters spanning the deepest vocal cords, middle pharynx, and upper uvular throat.',
  },
  {
    id: 'lips',
    title: 'Ash-Shafatān (Lips)',
    arabicTitle: 'الشَّفَتَان',
    description:
      '4 letters formed by upper teeth meeting lower lip, closing both lips, or rounding them forward.',
  },
  {
    id: 'cavity',
    title: 'Al-Jawf (Open Cavity)',
    arabicTitle: 'الْجَوْف',
    description:
      'Pure sustained vowel resonance flowing unimpeded through the open throat and mouth.',
  },
];

export const IPA_PLACES: { id: IpaPlace; label: string; shortLabel: string }[] = [
  { id: 'bilabial', label: 'Bilabial (Both Lips)', shortLabel: 'Lips' },
  { id: 'labiodental', label: 'Labiodental (Lip + Teeth)', shortLabel: 'Lip-Teeth' },
  { id: 'interdental', label: 'Interdental (Between Teeth)', shortLabel: 'Between Teeth' },
  { id: 'alveolar', label: 'Dental / Alveolar (Gum Ridge)', shortLabel: 'Gum Ridge' },
  { id: 'palatal', label: 'Palatal (Hard Palate)', shortLabel: 'Hard Palate' },
  { id: 'velar-uvular', label: 'Velar & Uvular (Soft Palate)', shortLabel: 'Back / Uvula' },
  { id: 'pharyngeal', label: 'Pharyngeal (Mid Throat)', shortLabel: 'Mid Throat' },
  { id: 'glottal', label: 'Glottal (Vocal Cords)', shortLabel: 'Deep Throat' },
];

export const IPA_MANNERS: { id: IpaManner; label: string }[] = [
  { id: 'stop', label: 'Stop / Plosive' },
  { id: 'fricative', label: 'Fricative (Airflow)' },
  { id: 'nasal', label: 'Nasal (Al-Khayshūm)' },
  { id: 'trill', label: 'Tap / Light Trill' },
  { id: 'lateral', label: 'Lateral (Side Edge)' },
  { id: 'approximant', label: 'Glide / Semivowel' },
  { id: 'vowel', label: 'Open Long Vowel' },
];

export const ARABIC_PHONEMES: ArabicPhonemeSpec[] = [
  // ================= INTERDENTAL (BETWEEN TEETH) =================
  {
    id: 'zaa-heavy',
    letter: 'ظ',
    displayForm: 'ظ',
    name: 'Ẓāʾ',
    arabicName: 'ظَاء',
    transliteration: 'ẓ',
    ipa: '/ðˤ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَأَطْرَافُ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Interdental + Raised Back Tongue (Al-Lathawiyyah)',
    subZoneLabel: 'Tip between teeth · Back tongue high',
    placeOfArticulation: 'interdental',
    mannerOfArticulation: 'fricative',
    voiced: true,
    emphatic: true,
    tonguePose: 'interdental-heavy',
    contactMarker: { x: 84, y: 147, label: 'Tip between front teeth' },
    howToPronounce:
      'Make a voiced "th" sound (like "the" or "this") by gently placing the tip of your tongue between your upper and lower front teeth, while simultaneously lifting the back of your tongue toward the soft palate to give it deep, heavy resonance.',
    tongueStep: 'Tip rests lightly between upper & lower incisors; rear tongue arches upward.',
    englishAnchor: 'Heavy voiced "th" (as in "the") with a deep hollow mouth cavity',
    commonMistake:
      'Avoid pulling the tongue inside and saying a heavy "z" (ز) or "d" (د). Your tongue tip must touch the front teeth edge.',
    similarLetters: ['dhal', 'thaa', 'dad', 'zay'],
    quranExample: {
      word: 'عَظِيمٍ',
      transliteration: '‘aẓīm',
      meaning: 'supreme / immense',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },
  {
    id: 'dhal',
    letter: 'ذ',
    displayForm: 'ذ',
    name: 'Dhāl',
    arabicName: 'ذَال',
    transliteration: 'dh',
    ipa: '/ð/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَأَطْرَافُ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Interdental · Light (Tarqīq)',
    subZoneLabel: 'Tip between teeth · Back tongue flat',
    placeOfArticulation: 'interdental',
    mannerOfArticulation: 'fricative',
    voiced: true,
    emphatic: false,
    tonguePose: 'interdental-light',
    contactMarker: { x: 84, y: 147, label: 'Tip between front teeth' },
    howToPronounce:
      'Make the exact voiced "th" sound in English "this", "that", or "brother". Place the tip of your tongue lightly between your upper and lower front teeth while keeping the back of your tongue flat and relaxed.',
    tongueStep: 'Tip gently meets the edge of upper front teeth; body of tongue stays low.',
    englishAnchor: 'Exact "th" in "this" or "father"',
    commonMistake:
      'Do not turn ذ into a buzzing "z" (ز) behind the teeth or lift the back of the tongue like ظ.',
    similarLetters: ['zaa-heavy', 'thaa', 'zay'],
    quranExample: {
      word: 'ٱلَّذِينَ',
      transliteration: 'alladhīna',
      meaning: 'those who',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },
  {
    id: 'thaa',
    letter: 'ث',
    displayForm: 'ث',
    name: 'Thāʾ',
    arabicName: 'ثَاء',
    transliteration: 'th',
    ipa: '/θ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَأَطْرَافُ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Interdental · Voiceless Breath',
    subZoneLabel: 'Tip between teeth · Soft breath',
    placeOfArticulation: 'interdental',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: false,
    tonguePose: 'interdental-light',
    contactMarker: { x: 84, y: 147, label: 'Tip between front teeth' },
    howToPronounce:
      'Make the voiceless "th" sound in English "think" or "three". Put the tip of your tongue gently between your upper and lower front teeth and let soft air flow past without vibrating your vocal cords.',
    tongueStep: 'Relaxed tongue tip rests between teeth; gentle continuous breath.',
    englishAnchor: 'Exact "th" in "think" or "thank"',
    commonMistake:
      'Avoid sliding into an "s" (س) or hard "t" (ت); keep the tip lightly visible between the teeth.',
    similarLetters: ['dhal', 'zaa-heavy', 'seen'],
    quranExample: {
      word: 'ٱلْكَوْثَرَ',
      transliteration: 'al-kawthar',
      meaning: 'abundance',
      verseKey: '108:1',
      surahId: 108,
      ayahNumber: 1,
    },
  },

  // ================= THROAT (AL-HALQ) =================
  {
    id: 'hamzah',
    letter: 'ء',
    displayForm: 'ء / أ',
    name: 'Hamzah',
    arabicName: 'هَمْزَة',
    transliteration: 'ʾ',
    ipa: '/ʔ/',
    makhrajGroup: 'throat',
    makhrajArabic: 'أَقْصَى الحَلْقِ',
    makhrajEnglish: 'Deepest Throat · Glottal Stop',
    subZoneLabel: 'Vocal folds close & release cleanly',
    placeOfArticulation: 'glottal',
    mannerOfArticulation: 'stop',
    voiced: false,
    emphatic: false,
    tonguePose: 'throat-glottal',
    contactMarker: { x: 252, y: 238, label: 'Glottis / vocal cords' },
    howToPronounce:
      'Briefly close your vocal cords together deep in the throat and release them cleanly with the vowel—just like the crisp break in the middle of English "uh-oh".',
    tongueStep: 'Tongue stays completely relaxed; closure happens solely at the vocal cords.',
    englishAnchor: 'The brief catch in "uh-oh"',
    commonMistake:
      'Avoid slurring Hamzah when it carries a sukūn (like يُؤْمِنُونَ) or adding an unintended bounce.',
    similarLetters: ['haa-light', 'ayn', 'alif-madd'],
    quranExample: {
      word: 'أَنْعَمْتَ',
      transliteration: 'an‘amta',
      meaning: 'You bestowed favor',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },
  {
    id: 'haa-light',
    letter: 'ه',
    displayForm: 'هـ',
    name: 'Hāʾ',
    arabicName: 'هَاء',
    transliteration: 'h',
    ipa: '/h/',
    makhrajGroup: 'throat',
    makhrajArabic: 'أَقْصَى الحَلْقِ',
    makhrajEnglish: 'Deepest Throat · Soft Breath',
    subZoneLabel: 'Open chest breath from vocal cords',
    placeOfArticulation: 'glottal',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: false,
    tonguePose: 'throat-glottal',
    contactMarker: { x: 252, y: 232, label: 'Deep glottal airflow' },
    howToPronounce:
      'Exhale a light, effortless "h" from deep in your chest/vocal cords, like the "h" in "house". Keep the middle throat wide open so it never sounds scratchy.',
    tongueStep: 'Tongue rests flat and neutral while smooth breath passes through open vocal cords.',
    englishAnchor: 'Soft "h" in "hello" or "ahead"',
    commonMistake:
      'Do not drop final silent هـ (such as ٱللَّهِ or عَلَيْهِ) at the end of a verse, and do not tighten the mid-throat like ح.',
    similarLetters: ['haa-throat', 'hamzah'],
    quranExample: {
      word: 'ٱهْدِنَا',
      transliteration: 'ihdinā',
      meaning: 'guide us',
      verseKey: '1:6',
      surahId: 1,
      ayahNumber: 6,
    },
  },
  {
    id: 'ayn',
    letter: 'ع',
    displayForm: 'ع',
    name: '‘Ayn',
    arabicName: 'عَيْن',
    transliteration: '‘',
    ipa: '/ʕ/',
    makhrajGroup: 'throat',
    makhrajArabic: 'وَسَطُ الحَلْقِ',
    makhrajEnglish: 'Middle Throat · Voiced Pharyngeal',
    subZoneLabel: 'Gentle squeeze at middle pharynx',
    placeOfArticulation: 'pharyngeal',
    mannerOfArticulation: 'fricative',
    voiced: true,
    emphatic: false,
    tonguePose: 'throat-pharynx',
    contactMarker: { x: 248, y: 186, label: 'Middle pharynx constriction' },
    howToPronounce:
      'Gently pull the root of your tongue slightly back to narrow the middle of your throat while humming your voice smoothly—similar to the gentle throat tightening you feel right before swallowing, without closing off airflow.',
    tongueStep: 'Tip stays down; tongue root shifts slightly back into the mid-pharynx.',
    englishAnchor: 'Deep voiced throat resonance (no direct English match)',
    commonMistake:
      'Do not replace ع with a simple vowel "a" (Hamzah) or send the sound through your nose.',
    similarLetters: ['haa-throat', 'hamzah', 'ghayn'],
    quranExample: {
      word: 'نَعْبُدُ',
      transliteration: 'na‘budu',
      meaning: 'we worship',
      verseKey: '1:5',
      surahId: 1,
      ayahNumber: 5,
    },
  },
  {
    id: 'haa-throat',
    letter: 'ح',
    displayForm: 'ح',
    name: 'Ḥāʾ',
    arabicName: 'حَاء',
    transliteration: 'ḥ',
    ipa: '/ħ/',
    makhrajGroup: 'throat',
    makhrajArabic: 'وَسَطُ الحَلْقِ',
    makhrajEnglish: 'Middle Throat · Voiceless Mist Breath',
    subZoneLabel: 'Crisp warm air from mid-pharynx',
    placeOfArticulation: 'pharyngeal',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: false,
    tonguePose: 'throat-pharynx',
    contactMarker: { x: 246, y: 184, label: 'Middle pharynx narrow airway' },
    howToPronounce:
      'Gently constrict the middle of your throat (same spot as ع) and blow warm, voiceless air—exactly like fogging up eyeglasses or blowing warm mist on cold hands.',
    tongueStep: 'Front tongue stays low; mid-throat narrows to create a smooth crisp whisper.',
    englishAnchor: 'Breathing warm mist onto cold glasses',
    commonMistake:
      'Avoid scraping the upper throat (which turns ح into خ) or relaxing completely into soft هـ.',
    similarLetters: ['ayn', 'haa-light', 'khaa'],
    quranExample: {
      word: 'ٱلرَّحْمَـٰنِ',
      transliteration: 'ar-Raḥmān',
      meaning: 'the Entirely Merciful',
      verseKey: '1:1',
      surahId: 1,
      ayahNumber: 1,
    },
  },
  {
    id: 'ghayn',
    letter: 'غ',
    displayForm: 'غ',
    name: 'Ghayn',
    arabicName: 'غَيْن',
    transliteration: 'gh',
    ipa: '/ʁ/',
    makhrajGroup: 'throat',
    makhrajArabic: 'أَدْنَى الحَلْقِ',
    makhrajEnglish: 'Upper Throat (Uvular) · Heavy Voiced',
    subZoneLabel: 'Soft voiced vibration near uvula',
    placeOfArticulation: 'velar-uvular',
    mannerOfArticulation: 'fricative',
    voiced: true,
    emphatic: true,
    tonguePose: 'uvular',
    contactMarker: { x: 224, y: 142, label: 'Upper throat / uvula' },
    howToPronounce:
      'Raise the back of your tongue gently toward the uvula (top of your throat) and hum your voice softly, like a very light, gentle gargle or a soft French "r" in "Paris". Keep it smooth without hard friction.',
    tongueStep: 'Rear tongue rises near the uvula without sealing airflow shut.',
    englishAnchor: 'Soft French "r" in "Paris" or gentle gargling hum',
    commonMistake:
      'Do not turn غ into a hard stop "g" (as in "go") or over-gargle violently.',
    similarLetters: ['khaa', 'ayn', 'qaf'],
    quranExample: {
      word: 'غَيْرِ',
      transliteration: 'ghayri',
      meaning: 'not of',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },
  {
    id: 'khaa',
    letter: 'خ',
    displayForm: 'خ',
    name: 'Khāʾ',
    arabicName: 'خَاء',
    transliteration: 'kh',
    ipa: '/χ/',
    makhrajGroup: 'throat',
    makhrajArabic: 'أَدْنَى الحَلْقِ',
    makhrajEnglish: 'Upper Throat (Uvular) · Heavy Breath',
    subZoneLabel: 'Airy friction at soft palate & uvula',
    placeOfArticulation: 'velar-uvular',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: true,
    tonguePose: 'uvular',
    contactMarker: { x: 222, y: 140, label: 'Uvula / upper throat edge' },
    howToPronounce:
      'Lift the back of your tongue near the uvula at the very top of your throat and pass steady breath across it—like "ch" in Scottish "loch" or German "Bach". Keep the sound full and heavy (Tafkhīm) without raspy snoring.',
    tongueStep: 'Back of tongue approaches uvula; vocal cords stay off.',
    englishAnchor: '"ch" in Scottish "loch" or composer "Bach"',
    commonMistake:
      'Avoid pronouncing خ as a hard "k" or excessively scraping the throat.',
    similarLetters: ['ghayn', 'haa-throat', 'qaf'],
    quranExample: {
      word: 'خَلَقَ',
      transliteration: 'khalaqa',
      meaning: 'He created',
      verseKey: '113:2',
      surahId: 113,
      ayahNumber: 2,
    },
  },

  // ================= BACK & MIDDLE TONGUE =================
  {
    id: 'qaf',
    letter: 'ق',
    displayForm: 'ق',
    name: 'Qāf',
    arabicName: 'قَاف',
    transliteration: 'q',
    ipa: '/q/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'أَقْصَى اللِّسَانِ مَعَ الحَنَكِ اللَّحْمِيِّ',
    makhrajEnglish: 'Deep Back Tongue & Soft Palate (Uvular Stop)',
    subZoneLabel: 'Deep back tongue seals against soft palate',
    placeOfArticulation: 'velar-uvular',
    mannerOfArticulation: 'stop',
    voiced: false,
    emphatic: true,
    tonguePose: 'uvular',
    contactMarker: { x: 205, y: 126, label: 'Soft palate & deep tongue back' },
    howToPronounce:
      'Press the farthest back part of your tongue firmly up against the soft, fleshy palate near your uvula (much deeper than English "k"), then release crisply with full, deep resonance (and a Qalqalah bounce when carrying sukūn).',
    tongueStep: 'Extreme rear of tongue touches soft palate; tongue tip rests behind lower teeth.',
    englishAnchor: 'Very deep "k" from the back of the mouth (like "cough" spoken deeply)',
    commonMistake:
      'Do not push ق forward into an English "k" (ك) or soften it into "g".',
    similarLetters: ['kaf', 'ghayn', 'khaa'],
    quranExample: {
      word: 'ٱلْمُسْتَقِيمَ',
      transliteration: 'al-mustaqīm',
      meaning: 'the straight',
      verseKey: '1:6',
      surahId: 1,
      ayahNumber: 6,
    },
  },
  {
    id: 'kaf',
    letter: 'ك',
    displayForm: 'ك',
    name: 'Kāf',
    arabicName: 'كَاف',
    transliteration: 'k',
    ipa: '/k/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'أَقْصَى اللِّسَانِ أَسْفَلَ مِنَ القَافِ',
    makhrajEnglish: 'Back Tongue & Hard-Soft Palate Junction',
    subZoneLabel: 'Slightly forward of Qāf · Light puff',
    placeOfArticulation: 'velar-uvular',
    mannerOfArticulation: 'stop',
    voiced: false,
    emphatic: false,
    tonguePose: 'velar',
    contactMarker: { x: 184, y: 112, label: 'Hard-soft palate junction' },
    howToPronounce:
      'Touch the back of your tongue to the roof where the hard palate meets the soft palate (slightly forward of ق) and release with a crisp, light puff of air (hams) like "k" in "key".',
    tongueStep: 'Rear-mid tongue makes crisp seal at velum; front tongue remains relaxed.',
    englishAnchor: 'Clean "k" in "king" or "book"',
    commonMistake:
      'Keep ك light (never heavy like ق) and include a gentle puff of breath when paused with sukūn.',
    similarLetters: ['qaf', 'taa-light'],
    quranExample: {
      word: 'مَـٰلِكِ',
      transliteration: 'Māliki',
      meaning: 'Sovereign / Master',
      verseKey: '1:4',
      surahId: 1,
      ayahNumber: 4,
    },
  },
  {
    id: 'jeem',
    letter: 'ج',
    displayForm: 'ج',
    name: 'Jīm',
    arabicName: 'جِيم',
    transliteration: 'j',
    ipa: '/dʒ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'وَسَطُ اللِّسَانِ مَعَ الحَنَكِ الأَعْلَى',
    makhrajEnglish: 'Middle Tongue & Hard Palate',
    subZoneLabel: 'Center tongue presses hard palate firmly',
    placeOfArticulation: 'palatal',
    mannerOfArticulation: 'stop',
    voiced: true,
    emphatic: false,
    tonguePose: 'palatal-mid',
    contactMarker: { x: 146, y: 108, label: 'Hard palate & center tongue' },
    howToPronounce:
      'Press the middle surface of your tongue firmly up against the middle roof of your mouth (hard palate) to stop airflow, then release cleanly like "j" in "jam" without excessive hissing air.',
    tongueStep: 'Middle blade of tongue rises flatly to seal against the hard palate.',
    englishAnchor: 'Crisp "j" in "jam" or "joy"',
    commonMistake:
      'Avoid turning classical Tajwīd ج into a soft French "zh" (measure) or leaking airy "sh".',
    similarLetters: ['sheen', 'yaa', 'dal'],
    quranExample: {
      word: 'ٱلْبُرُوجِ',
      transliteration: 'al-burūj',
      meaning: 'the constellations',
      verseKey: '85:1',
      surahId: 85,
      ayahNumber: 1,
    },
  },
  {
    id: 'sheen',
    letter: 'ش',
    displayForm: 'ش',
    name: 'Shīn',
    arabicName: 'شِين',
    transliteration: 'sh',
    ipa: '/ʃ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'وَسَطُ اللِّسَانِ مَعَ الحَنَكِ الأَعْلَى',
    makhrajEnglish: 'Middle Tongue · Spread Airflow (Tafashshī)',
    subZoneLabel: 'Wide air spreads across hard palate',
    placeOfArticulation: 'palatal',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: false,
    tonguePose: 'palatal-mid',
    contactMarker: { x: 142, y: 112, label: 'Middle palate narrow channel' },
    howToPronounce:
      'Raise the middle of your tongue close to the hard palate without sealing it shut, allowing wide, gentle "sh" air (like "ship") to spread through the mouth.',
    tongueStep: 'Middle tongue hovers near hard palate; sides seal lightly while air spreads centrally.',
    englishAnchor: '"sh" in "shine" or "wish"',
    commonMistake:
      'Do not round or protrude the lips too tightly; let the resonance come from the center tongue.',
    similarLetters: ['jeem', 'seen', 'yaa'],
    quranExample: {
      word: 'شَرِّ',
      transliteration: 'sharri',
      meaning: 'evil of',
      verseKey: '113:2',
      surahId: 113,
      ayahNumber: 2,
    },
  },
  {
    id: 'yaa',
    letter: 'ي',
    displayForm: 'ي',
    name: 'Yāʾ',
    arabicName: 'يَاء',
    transliteration: 'y',
    ipa: '/j/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'وَسَطُ اللِّسَانِ (وَالجَوْفُ لِلمَدِّ)',
    makhrajEnglish: 'Middle Tongue Glide (Palatal)',
    subZoneLabel: 'Center tongue arches smoothly toward palate',
    placeOfArticulation: 'palatal',
    mannerOfArticulation: 'approximant',
    voiced: true,
    emphatic: false,
    tonguePose: 'palatal-mid',
    contactMarker: { x: 148, y: 116, label: 'Palatal glide channel' },
    howToPronounce:
      'Arch the middle of your tongue smoothly toward the hard palate without touching it—just like "y" in "yes". When lengthened as a vowel (ي Madd), flow smoothly through the open cavity for "ee".',
    tongueStep: 'Mid-tongue arches gently upward leaving clear space for voiced glide.',
    englishAnchor: '"y" in "yes" (or long "ee" as vowel)',
    commonMistake:
      'Avoid squeezing too tightly (which creates friction) when doubling يّ (e.g., إِيَّاكَ).',
    similarLetters: ['jeem', 'sheen', 'waw'],
    quranExample: {
      word: 'إِيَّاكَ',
      transliteration: 'iyyāka',
      meaning: 'You alone',
      verseKey: '1:5',
      surahId: 1,
      ayahNumber: 5,
    },
  },

  // ================= TONGUE EDGES (HAFAT AL-LISAN) =================
  {
    id: 'dad',
    letter: 'ض',
    displayForm: 'ض',
    name: 'Ḍād',
    arabicName: 'ضَاد',
    transliteration: 'ḍ',
    ipa: '/dˤ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'حَافَةُ اللِّسَانِ مَعَ الأَضْرَاسِ العُلْيَا',
    makhrajEnglish: 'Tongue Side Edge & Upper Molars · Heavy',
    subZoneLabel: 'Side edge hugs upper molars · Back tongue high',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'stop',
    voiced: true,
    emphatic: true,
    tonguePose: 'tongue-side-heavy',
    contactMarker: { x: 132, y: 128, label: 'Side edge against upper molars' },
    howToPronounce:
      'Press the side edge (left, right, or both) of your tongue firmly against the inner wall of your upper back molars while lifting the back of the tongue high. Release with a deep, full, slightly cushioned heavy "d" sound (with istīṭālah stretch, never a Qalqalah bounce).',
    tongueStep: 'Tongue side edge seals against upper molars; tip stays softly behind front gum.',
    englishAnchor: 'Deep emphatic "d" pressed from the side molars (unique to Arabic)',
    commonMistake:
      'Do not pronounce ض like ظ (by sticking your tongue between your teeth) or like a light flat English "d".',
    similarLetters: ['zaa-heavy', 'taa-heavy', 'dal'],
    quranExample: {
      word: 'ٱلضَّآلِّينَ',
      transliteration: 'aḍ-ḍāllīn',
      meaning: 'those astray',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },
  {
    id: 'lam',
    letter: 'ل',
    displayForm: 'ل',
    name: 'Lām',
    arabicName: 'لَام',
    transliteration: 'l',
    ipa: '/l/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'أَدْنَى حَافَةِ اللِّسَانِ إِلَى مُنْتَهَى طَرَفِهِ',
    makhrajEnglish: 'Front Tongue Edge & Upper Gum Ridge',
    subZoneLabel: 'Front edge meets upper alveolar gum',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'lateral',
    voiced: true,
    emphatic: false,
    tonguePose: 'alveolar-tip',
    contactMarker: { x: 102, y: 124, label: 'Front edge on upper gum' },
    howToPronounce:
      'Place the front rim and tip of your tongue lightly against the gum ridge right behind your upper front teeth, letting your voice flow around the sides like "l" in "light". (Pronounce heavily as in ٱللَّهُ after fatḥah/ḍammah.)',
    tongueStep: 'Front margin touches gum ridge while side channels let voiced air pass freely.',
    englishAnchor: 'Clear "l" in "leaf" (heavy "l" in "wall" for ٱللَّهُ)',
    commonMistake:
      'Avoid making every ل heavy—keep it light and crisp in words like لِلَّهِ and ٱلْحَمْدُ.',
    similarLetters: ['noon', 'raa', 'dad'],
    quranExample: {
      word: 'ٱلْحَمْدُ',
      transliteration: 'al-ḥamdu',
      meaning: 'all praise',
      verseKey: '1:2',
      surahId: 1,
      ayahNumber: 2,
    },
  },

  // ================= TONGUE TIP & GUM RIDGE (ALVEOLAR / DENTAL) =================
  {
    id: 'noon',
    letter: 'ن',
    displayForm: 'ن',
    name: 'Nūn',
    arabicName: 'نُون',
    transliteration: 'n',
    ipa: '/n/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ مَعَ لِثَةِ الثَّنَايَا العُلْيَا + الخَيْشُومُ',
    makhrajEnglish: 'Tongue Tip & Gum Ridge + Nasal Passage',
    subZoneLabel: 'Tip seals upper gum · Hum flows through nose',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'nasal',
    voiced: true,
    emphatic: false,
    nasal: true,
    tonguePose: 'alveolar-tip',
    contactMarker: { x: 100, y: 124, label: 'Gum ridge + nasal resonance' },
    howToPronounce:
      'Press the tip of your tongue gently against the gum ridge behind your upper front teeth while letting your voice hum smoothly out through your nose (Al-Khayshūm), like "n" in "noon".',
    tongueStep: 'Tip seals the upper alveolar ridge; soft palate lowers so sound exits the nose.',
    englishAnchor: 'Clean "n" in "sun" or "noon"',
    commonMistake:
      'Keep the tongue tip touching the gum ridge cleanly when articulated clearly (iẓhār), or hover smoothly for ikhfāʾ.',
    similarLetters: ['meem', 'lam', 'raa'],
    quranExample: {
      word: 'نَسْتَعِينُ',
      transliteration: 'nasta‘īn',
      meaning: 'we seek help',
      verseKey: '1:5',
      surahId: 1,
      ayahNumber: 5,
    },
  },
  {
    id: 'raa',
    letter: 'ر',
    displayForm: 'ر',
    name: 'Rāʾ',
    arabicName: 'رَاء',
    transliteration: 'r',
    ipa: '/r/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ مَعَ لِثَةِ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Tongue Tip Tap Behind Upper Gum',
    subZoneLabel: 'Single light tap on gum ridge · Never roll',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'trill',
    voiced: true,
    emphatic: false,
    tonguePose: 'alveolar-trill',
    contactMarker: { x: 104, y: 122, label: 'Single tap behind upper gum' },
    howToPronounce:
      'Tap the tip of your tongue lightly once against the gum ridge just behind your upper front teeth (like a soft Spanish "r" in "caro" or quick "tt" in American "butter"). Keep a tiny breath gap so it never trills repeatedly.',
    tongueStep: 'Tip curves slightly upward to tap the ridge once cleanly; back raises when heavy.',
    englishAnchor: 'Single tapped "r" in Spanish "pero" (not curled American "r")',
    commonMistake:
      'Avoid curling the tongue tip backward like an English/American "r" or rolling into 4–5 rapid trills (takrīr).',
    similarLetters: ['lam', 'noon', 'ghayn'],
    quranExample: {
      word: 'رَبِّ',
      transliteration: 'Rabbi',
      meaning: 'Lord of',
      verseKey: '1:2',
      surahId: 1,
      ayahNumber: 2,
    },
  },
  {
    id: 'taa-heavy',
    letter: 'ط',
    displayForm: 'ط',
    name: 'Ṭāʾ',
    arabicName: 'طَاء',
    transliteration: 'ṭ',
    ipa: '/tˤ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَأُصُولُ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Upper Teeth Roots + Raised Back Tongue (Heavy Stop)',
    subZoneLabel: 'Tip at teeth base · Back tongue raised high',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'stop',
    voiced: true,
    emphatic: true,
    tonguePose: 'alveolar-heavy',
    contactMarker: { x: 96, y: 132, label: 'Upper teeth base + high back tongue' },
    howToPronounce:
      'Press the tip of your tongue against the roots of your upper front teeth while lifting the back of your tongue high toward the soft palate. Release sharply without an airy hiss—creating the deepest, strongest heavy stop in Arabic.',
    tongueStep: 'Front tip seals teeth base; rear tongue rises to cup the palate.',
    englishAnchor: 'Heavy emphatic "t" spoken from a cupped, hollow mouth (no breath puff)',
    commonMistake:
      'Do not round your lips or blow extra "h" air after ط like English "top".',
    similarLetters: ['taa-light', 'dal', 'dad'],
    quranExample: {
      word: 'ٱلصِّرَٰطَ',
      transliteration: 'aṣ-ṣirāṭ',
      meaning: 'the path',
      verseKey: '1:6',
      surahId: 1,
      ayahNumber: 6,
    },
  },
  {
    id: 'dal',
    letter: 'د',
    displayForm: 'د',
    name: 'Dāl',
    arabicName: 'دَال',
    transliteration: 'd',
    ipa: '/d/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَأُصُولُ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Upper Teeth Roots · Light Voiced Stop',
    subZoneLabel: 'Tip meets upper teeth base · Tongue flat',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'stop',
    voiced: true,
    emphatic: false,
    tonguePose: 'alveolar-tip',
    contactMarker: { x: 96, y: 132, label: 'Upper teeth roots' },
    howToPronounce:
      'Touch the tip of your tongue cleanly to the base of your upper front teeth (slightly lower than English "d") while keeping the back of your tongue low, and release with voice (adding a crisp Qalqalah bounce on sukūn).',
    tongueStep: 'Tongue tip meets inner teeth roots; back of tongue stays relaxed.',
    englishAnchor: 'Crisp dental "d" in "day"',
    commonMistake:
      'Do not make د heavy like ض or ط, and avoid blowing airy breath like ت.',
    similarLetters: ['taa-light', 'taa-heavy', 'dad'],
    quranExample: {
      word: 'ٱلدِّينِ',
      transliteration: 'ad-dīn',
      meaning: 'the Recompense',
      verseKey: '1:4',
      surahId: 1,
      ayahNumber: 4,
    },
  },
  {
    id: 'taa-light',
    letter: 'ت',
    displayForm: 'ت',
    name: 'Tāʾ',
    arabicName: 'تَاء',
    transliteration: 't',
    ipa: '/t/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَأُصُولُ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Upper Teeth Roots · Light Voiceless Stop',
    subZoneLabel: 'Tip touches upper teeth base · Gentle breath',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'stop',
    voiced: false,
    emphatic: false,
    tonguePose: 'alveolar-tip',
    contactMarker: { x: 96, y: 132, label: 'Upper teeth roots' },
    howToPronounce:
      'Touch your tongue tip to the base of your upper front teeth (softer and farther forward than English "t") and release with a gentle, delicate puff of breath (hams)—never heavy.',
    tongueStep: 'Tip lightly seals teeth base; gentle air release at separation.',
    englishAnchor: 'Soft dental "t" (as in Spanish/French "tu")',
    commonMistake:
      'Keep ت light so it never sounds like heavy ط, and avoid excessive "ts" hissing.',
    similarLetters: ['taa-heavy', 'dal', 'thaa'],
    quranExample: {
      word: 'أَنْعَمْتَ',
      transliteration: 'an‘amta',
      meaning: 'You bestowed favor',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },
  {
    id: 'sad',
    letter: 'ص',
    displayForm: 'ص',
    name: 'Ṣād',
    arabicName: 'صَاد',
    transliteration: 'ṣ',
    ipa: '/sˤ/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَفُوَيْقَ الثَّنَايَا السُّفْلَى',
    makhrajEnglish: 'Lower Teeth Rim + Raised Back Tongue (Heavy Whistle)',
    subZoneLabel: 'Tip behind lower teeth · Back tongue high',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: true,
    tonguePose: 'alveolar-heavy',
    contactMarker: { x: 94, y: 152, label: 'Lower teeth rim + high back tongue' },
    howToPronounce:
      'Place the tip of your tongue behind your lower front teeth to hiss a crisp "s", while simultaneously lifting the back of your tongue high toward the soft palate—producing a deep, resonant, whistling "s" without puckering your lips.',
    tongueStep: 'Tip hovers near lower incisors; rear tongue rises high into the velar arch.',
    englishAnchor: 'Heavy deep "s" (like saying "saw" with the tongue back raised)',
    commonMistake:
      'Never round or push out your lips to fake heaviness—keep lips neutral and lift only the back of the tongue.',
    similarLetters: ['seen', 'zay', 'taa-heavy'],
    quranExample: {
      word: 'ٱلصِّرَٰطَ',
      transliteration: 'aṣ-ṣirāṭ',
      meaning: 'the path',
      verseKey: '1:6',
      surahId: 1,
      ayahNumber: 6,
    },
  },
  {
    id: 'seen',
    letter: 'س',
    displayForm: 'س',
    name: 'Sīn',
    arabicName: 'سِين',
    transliteration: 's',
    ipa: '/s/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَفُوَيْقَ الثَّنَايَا السُّفْلَى',
    makhrajEnglish: 'Lower Teeth Rim · Crisp Light Whistle',
    subZoneLabel: 'Tip behind lower teeth · Tongue relaxed',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: false,
    tonguePose: 'alveolar-tip',
    contactMarker: { x: 94, y: 152, label: 'Lower teeth edge' },
    howToPronounce:
      'Hover your tongue tip gently behind your lower front teeth with the rest of your tongue relaxed and flat, sending a clean whistling stream of air like English "s" in "sun".',
    tongueStep: 'Tip sits softly behind lower teeth; back tongue remains completely flat.',
    englishAnchor: 'Exact "s" in "sun" or "peace"',
    commonMistake:
      'Avoid sticking the tongue between the teeth (which makes ث) or raising the back (which turns it into ص).',
    similarLetters: ['sad', 'zay', 'thaa'],
    quranExample: {
      word: 'نَسْتَعِينُ',
      transliteration: 'nasta‘īn',
      meaning: 'we ask for help',
      verseKey: '1:5',
      surahId: 1,
      ayahNumber: 5,
    },
  },
  {
    id: 'zay',
    letter: 'ز',
    displayForm: 'ز',
    name: 'Zāy',
    arabicName: 'زَاي',
    transliteration: 'z',
    ipa: '/z/',
    makhrajGroup: 'tongue',
    makhrajArabic: 'طَرَفُ اللِّسَانِ وَفُوَيْقَ الثَّنَايَا السُّفْلَى',
    makhrajEnglish: 'Lower Teeth Rim · Voiced Buzz',
    subZoneLabel: 'Same spot as Sīn · Vocal cords vibrate',
    placeOfArticulation: 'alveolar',
    mannerOfArticulation: 'fricative',
    voiced: true,
    emphatic: false,
    tonguePose: 'alveolar-tip',
    contactMarker: { x: 94, y: 152, label: 'Lower teeth edge (voiced)' },
    howToPronounce:
      'Keep your tongue in the exact same spot as س (tip behind lower front teeth, tongue flat) and turn on your vocal cords for a crisp, buzzing "z" as in "zoo".',
    tongueStep: 'Tip hovers behind lower front teeth; clear voiced whistle.',
    englishAnchor: 'Exact "z" in "zoo" or "breeze"',
    commonMistake:
      'Do not poke your tongue between your teeth—that produces ذ ("th") instead of ز ("z").',
    similarLetters: ['seen', 'dhal', 'zaa-heavy'],
    quranExample: {
      word: 'ٱلْعَزِيزُ',
      transliteration: 'al-‘Azīz',
      meaning: 'the Almighty',
      verseKey: '59:23',
      surahId: 59,
      ayahNumber: 23,
    },
  },

  // ================= LIPS (ASH-SHAFATAN) =================
  {
    id: 'faa',
    letter: 'ف',
    displayForm: 'ف',
    name: 'Fāʾ',
    arabicName: 'فَاء',
    transliteration: 'f',
    ipa: '/f/',
    makhrajGroup: 'lips',
    makhrajArabic: 'بَطْنُ الشَّفَةِ السُّفْلَى مَعَ أَطْرَافِ الثَّنَايَا العُلْيَا',
    makhrajEnglish: 'Lower Lip Inner Edge & Upper Front Teeth',
    subZoneLabel: 'Upper teeth touch moist inner lower lip',
    placeOfArticulation: 'labiodental',
    mannerOfArticulation: 'fricative',
    voiced: false,
    emphatic: false,
    tonguePose: 'lips-dental',
    contactMarker: { x: 74, y: 154, label: 'Upper teeth on inner lower lip' },
    howToPronounce:
      'Touch the edges of your upper front teeth lightly against the soft inner rim of your lower lip and let steady air pass through—just like English "f" in "faith".',
    tongueStep: 'Tongue stays relaxed; contact happens strictly between upper teeth & lower lip.',
    englishAnchor: 'Exact "f" in "fair" or "leaf"',
    commonMistake:
      'Keep airflow steady when ف has sukūn so it stays clearly audible without turning into a bilabial puff.',
    similarLetters: ['baa', 'thaa'],
    quranExample: {
      word: 'ٱلْفَلَقِ',
      transliteration: 'al-falaq',
      meaning: 'the daybreak',
      verseKey: '113:1',
      surahId: 113,
      ayahNumber: 1,
    },
  },
  {
    id: 'baa',
    letter: 'ب',
    displayForm: 'ب',
    name: 'Bāʾ',
    arabicName: 'بَاء',
    transliteration: 'b',
    ipa: '/b/',
    makhrajGroup: 'lips',
    makhrajArabic: 'ٱنْطِبَاقُ الشَّفَتَيْنِ',
    makhrajEnglish: 'Both Lips (Bilabial Stop)',
    subZoneLabel: 'Lips seal gently & release cleanly',
    placeOfArticulation: 'bilabial',
    mannerOfArticulation: 'stop',
    voiced: true,
    emphatic: false,
    tonguePose: 'lips-closed',
    contactMarker: { x: 64, y: 150, label: 'Closed lips seal' },
    howToPronounce:
      'Press both lips gently together (using the moist inner part of the lips) and release cleanly with voice, like "b" in "book". When paused or carrying sukūn, give a crisp Qalqalah bounce.',
    tongueStep: 'Tongue remains completely neutral inside the mouth; lips close and release.',
    englishAnchor: 'Exact "b" in "book" or "bright"',
    commonMistake:
      'Avoid clamping the outer dry edges too tightly, and never let the sound leak through the nose like م.',
    similarLetters: ['meem', 'waw', 'faa'],
    quranExample: {
      word: 'بِسْمِ',
      transliteration: 'bismi',
      meaning: 'in the name of',
      verseKey: '1:1',
      surahId: 1,
      ayahNumber: 1,
    },
  },
  {
    id: 'meem',
    letter: 'م',
    displayForm: 'م',
    name: 'Mīm',
    arabicName: 'مِيم',
    transliteration: 'm',
    ipa: '/m/',
    makhrajGroup: 'lips',
    makhrajArabic: 'ٱنْطِبَاقُ الشَّفَتَيْنِ + الخَيْشُومُ',
    makhrajEnglish: 'Both Lips + Nasal Passage (Bilabial Nasal)',
    subZoneLabel: 'Lips close lightly · Voice hums through nose',
    placeOfArticulation: 'bilabial',
    mannerOfArticulation: 'nasal',
    voiced: true,
    emphatic: false,
    nasal: true,
    tonguePose: 'lips-closed',
    contactMarker: { x: 64, y: 150, label: 'Closed lips + nasal hum' },
    howToPronounce:
      'Close both lips softly together without squeezing hard and let the voiced resonance flow smoothly out through your nose, like "m" in "mercy". Hold for two full counts when doubled (مّ).',
    tongueStep: 'Lips touch softly; soft palate opens airway into the nasal cavity.',
    englishAnchor: 'Exact "m" in "moon" or "mercy"',
    commonMistake:
      'Avoid pressing the lips inward tightly during Ikhfāʾ Shafawī or cutting off the 2-count Ghunnah on مّ.',
    similarLetters: ['noon', 'baa', 'waw'],
    quranExample: {
      word: 'ٱلْمُسْتَقِيمَ',
      transliteration: 'al-mustaqīm',
      meaning: 'the straight',
      verseKey: '1:6',
      surahId: 1,
      ayahNumber: 6,
    },
  },
  {
    id: 'waw',
    letter: 'و',
    displayForm: 'و',
    name: 'Wāw',
    arabicName: 'وَاو',
    transliteration: 'w',
    ipa: '/w/',
    makhrajGroup: 'lips',
    makhrajArabic: 'ٱسْتِدَارَةُ الشَّفَتَيْنِ (وَالجَوْفُ لِلمَدِّ)',
    makhrajEnglish: 'Rounded Lips Glide (Bilabial)',
    subZoneLabel: 'Lips form small circle without touching',
    placeOfArticulation: 'bilabial',
    mannerOfArticulation: 'approximant',
    voiced: true,
    emphatic: false,
    tonguePose: 'lips-round',
    contactMarker: { x: 62, y: 150, label: 'Rounded lip aperture' },
    howToPronounce:
      'Round both lips forward into a small circle leaving an open center channel (never biting the lower lip) and glide smoothly like "w" in "water". As a long vowel (و Madd), sustain a pure "oo".',
    tongueStep: 'Back of tongue rises slightly while lips shape a clean forward circle.',
    englishAnchor: 'Clean "w" in "water" (never "v")',
    commonMistake:
      'Be careful not to touch your upper teeth to your lower lip—that turns و into an English "v"!',
    similarLetters: ['baa', 'yaa', 'faa'],
    quranExample: {
      word: 'وَلَا',
      transliteration: 'wa lā',
      meaning: 'and not',
      verseKey: '1:7',
      surahId: 1,
      ayahNumber: 7,
    },
  },

  // ================= OPEN CAVITY (AL-JAWF) =================
  {
    id: 'alif-madd',
    letter: 'ا',
    displayForm: 'ا / آ',
    name: 'Alif Madd',
    arabicName: 'أَلِف مَدِّيَّة',
    transliteration: 'ā',
    ipa: '/aː/',
    makhrajGroup: 'cavity',
    makhrajArabic: 'الجَوْفُ (خَلَاءُ الحَلْقِ وَالفَمِ)',
    makhrajEnglish: 'Open Throat & Oral Cavity (Al-Jawf)',
    subZoneLabel: 'Unobstructed open jaw · No nasal hum',
    placeOfArticulation: 'glottal',
    mannerOfArticulation: 'vowel',
    voiced: true,
    emphatic: false,
    tonguePose: 'open-jaw',
    contactMarker: { x: 168, y: 160, label: 'Open oral & throat cavity' },
    howToPronounce:
      'Drop your jaw naturally and keep your tongue flat and relaxed so your voice flows effortlessly through the open mouth as a pure, steady "aa" (never nasalized through the nose). Takes on light sound after light letters and heavy sound after heavy letters.',
    tongueStep: 'Tongue lies completely relaxed at the floor of the mouth; soft palate seals nose.',
    englishAnchor: 'Open "a" in "father" (held 2–6 counts)',
    commonMistake:
      'Watch out for nasalizing long Alif (let air exit purely from the mouth, not the nose) or closing it into "oh".',
    similarLetters: ['hamzah', 'waw', 'yaa'],
    quranExample: {
      word: 'ٱلْعَـٰلَمِينَ',
      transliteration: 'al-‘ālamīn',
      meaning: 'all the worlds',
      verseKey: '1:2',
      surahId: 1,
      ayahNumber: 2,
    },
  },
];

export const PHONEME_BY_ID = new Map(
  ARABIC_PHONEMES.map((item) => [item.id, item] as const)
);
