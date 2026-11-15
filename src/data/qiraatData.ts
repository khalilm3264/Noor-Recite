import { RiwayahId } from '../types/quran';

export const WARSH_PREVIEW_NOTICE = 'Limited Warsh text preview: only 1:4 and 2:9 are adjusted. Other verses retain the base Ḥafṣ text, and reader audio uses your selected reciter. This is not a complete Warsh Muṣḥaf.';

export interface RiwayahProfile {
  id: RiwayahId;
  name: string;
  arabicName: string;
  imam: string;
  tariq: string;
  region: string;
  sampleReciterName: string;
  everyAyahFolder: string;
  sampleSurahId: number;
  sampleAyahNumber: number;
  highlightSummary: string;
  keyRules: {
    id: string;
    title: string;
    arabicTitle: string;
    summary: string;
    exampleArabic: string;
  }[];
}

export interface CanonicalQari {
  number: number;
  name: string;
  arabicName: string;
  region: 'Madīnah' | 'Makkah' | 'Baṣrah' | 'Damascus' | 'Kūfah';
  diedHijri: string;
  category: 'Saba‘ah (Seven)' | 'Thalāthah Mutammimah (3 Completing)';
  rawis: [
    { name: string; arabic: string; highlight: string },
    { name: string; arabic: string; highlight: string }
  ];
  signatureRule: string;
  sampleTestVerseKey: string;
}

export interface FarshComparisonItem {
  id: string;
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  ruleCategory: string;
  hafsArabic: string;
  hafsTranslit: string;
  warshArabic: string;
  warshTranslit: string;
  qalunArabic?: string;
  abusAmrArabic?: string;
  note: string;
}

export interface SanadNode {
  id: string;
  tier: string;
  title: string;
  arabicTitle: string;
  era: string;
  location: string;
  chains: ('hafs' | 'warsh')[];
  bio: string;
  methodology: string;
}

export const RIWAYAH_PROFILES: Record<RiwayahId, RiwayahProfile> = {
  hafs: {
    id: 'hafs',
    name: "Ḥafṣ 'an 'Āṣim",
    arabicName: 'حَفْص عَنْ عَاصِم',
    imam: "Imām 'Āṣim ibn Abī al-Najūd al-Kūfī (d. 127 AH)",
    tariq: 'Ṭarīq al-Shāṭibiyyah',
    region: 'Kūfah · Levant · Egypt · Haramain · South Asia',
    sampleReciterName: "Shaykh Sa'd al-Ghāmidī",
    everyAyahFolder: 'Ghamadi_40kbps',
    sampleSurahId: 1,
    sampleAyahNumber: 4,
    highlightSummary:
      'Preserves full alif elongation in مَـٰلِكِ يَوْمِ ٱلدِّينِ (1:4), crisp hamzah articulation without naql, and 4–5 count madd munfaṣil/muttaṣil cadence.',
    keyRules: [
      {
        id: 'hafs-malik',
        title: 'Full Alif in Mālik (1:4)',
        arabicTitle: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
        summary: 'Pronounces the dagger alif ("Owner of the Day of Recompense").',
        exampleArabic: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
      },
      {
        id: 'hafs-sakt',
        title: 'Brief Breathless Pause (Sakt)',
        arabicTitle: 'سَكْتَة لَطِيفَة',
        summary: 'Observed in 4 signature locations including Al-Kahf 18:1–2 and Yā-Sīn 36:52.',
        exampleArabic: 'عِوَجَا ۜ قَيِّمًا',
      },
      {
        id: 'hafs-tashil',
        title: 'Singular Tashīl in Fuṣṣilat 41:44',
        arabicTitle: 'ءَا۬عْجَمِىٌّ',
        summary: 'Softens only the second hamzah in ءَا۬عْجَمِيٌّ وَعَرَبِيٌّ.',
        exampleArabic: 'ءَا۬عْجَمِىٌّ وَعَرَبِىٌّ',
      },
    ],
  },
  warsh: {
    id: 'warsh',
    name: "Warsh 'an Nāfi'",
    arabicName: 'وَرْش عَنْ نَافِع',
    imam: 'Imām Nāfi‘ ibn ‘Abd al-Raḥmān al-Madanī (d. 169 AH)',
    tariq: 'Ṭarīq al-Azraq',
    region: 'Madīnah · Maghrib (Morocco, Algeria, Tunisia) · West Africa',
    sampleReciterName: 'Shaykh Maḥmūd Khalīl al-Ḥuṣarī (Warsh Reference)',
    everyAyahFolder: 'Husary_128kbps',
    sampleSurahId: 1,
    sampleAyahNumber: 4,
    highlightSummary:
      'Features Naql al-Ḥarakah (vowel transfer onto preceding sākin), 2/4/6-count Madd Badal, Taghlīẓ al-Lām before open letters, and Taqlīl on alif maqṣūrah.',
    keyRules: [
      {
        id: 'warsh-badal',
        title: 'Madd al-Badal (2 / 4 / 6 Counts)',
        arabicTitle: 'مَدُّ الْبَدَل',
        summary:
          'Permits lengthening after hamzah in words like آمَنُوا and ءَايَاتُنَا across three graded lengths.',
        exampleArabic: 'ءَامَنُوا۟ وَءَاتَوُا۟',
      },
      {
        id: 'warsh-naql',
        title: 'Naql al-Ḥarakah (Vowel Transfer)',
        arabicTitle: 'نَقْلُ الْحَرَكَة',
        summary:
          'Drops a following hamzah and shifts its vowel onto the preceding quiescent letter (e.g. قَدَ اَفْلَحَ).',
        exampleArabic: 'قَدَ اَفْلَحَ الْمُومِنُونَ',
      },
      {
        id: 'warsh-taghliz',
        title: 'Taghlīẓ al-Lām & Tarqīq al-Rā’',
        arabicTitle: 'تَغْلِيظُ اللَّامِ وَتَرْقِيقُ الرَّاء',
        summary:
          'Thickens Lām when preceded by ص، ط، ظ with fatḥah (e.g. ٱلصَّلَاةَ), while softening Rā’ after kasrah or yā’ sākinah.',
        exampleArabic: 'وَيُقِيمُونَ ٱلصَّلَوٰةَ',
      },
    ],
  },
};

export const CANONICAL_TEN_QURRA: CanonicalQari[] = [
  {
    number: 1,
    name: 'Nāfi‘ al-Madanī',
    arabicName: 'نَافِع المَدَنِيّ',
    region: 'Madīnah',
    diedHijri: '169 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Qālūn', arabic: 'قَالُون', highlight: 'Optional Ṣilah on Mīm al-Jam‘, moderate Madd Munfaṣil (2/4)' },
      { name: 'Warsh', arabic: 'وَرْش', highlight: 'Naql al-Ḥarakah, 6-count Madd Munfaṣil, Taghlīẓ al-Lām' },
    ],
    signatureRule: 'Al-Madīnah consensus chain · Basis of Maghrebi & North African Muṣḥafs',
    sampleTestVerseKey: '1:4',
  },
  {
    number: 2,
    name: 'Ibn Kathīr al-Makkī',
    arabicName: 'ابْن كَثِير المَكِّيّ',
    region: 'Makkah',
    diedHijri: '120 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Al-Bazzī', arabic: 'البَزِّي', highlight: 'Full Ṣilah on Hā’ al-Kināyah & plural Mīm (عَلَيْهِمُو)' },
      { name: 'Qunbul', arabic: 'قُنْبُل', highlight: 'Preserves Ṣīrāṭ with Sīn (سِرَاط) & Hā’ elongation' },
    ],
    signatureRule: 'Uniform Ṣilah of plural Mīm al-Jam‘ before any letter',
    sampleTestVerseKey: '1:6',
  },
  {
    number: 3,
    name: 'Abū ‘Amr al-Baṣrī',
    arabicName: 'أَبُو عَمْرٍو البَصْرِيّ',
    region: 'Baṣrah',
    diedHijri: '154 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Al-Dūrī', arabic: 'الدُّورِي', highlight: 'Moderate Imālah on Dhāt al-Rā’ words; foundational in East Africa' },
      { name: 'Al-Sūsī', arabic: 'السُّوسِي', highlight: 'Idghām Kabīr: assimilating adjacent voweled identical consonants' },
    ],
    signatureRule: 'Known for Idghām Kabīr (Major Assimilation) between two voweled letters',
    sampleTestVerseKey: '2:85',
  },
  {
    number: 4,
    name: 'Ibn ‘Āmir al-Shāmī',
    arabicName: 'ابْن عَامِر الشَّامِيّ',
    region: 'Damascus',
    diedHijri: '118 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Hishām', arabic: 'هِشَام', highlight: 'End-of-word hamzah ease (Waqf ‘alā al-Hamz)' },
      { name: 'Ibn Dhakwān', arabic: 'ابْن ذَكْوَان', highlight: 'Subtle Imālah on جَاءَ، شَاءَ، زَادَ' },
    ],
    signatureRule: 'Elder Tābi‘ī Imām of Damascus · Studied under ‘Uthmān ibn ‘Affān (r.a.)',
    sampleTestVerseKey: '1:4',
  },
  {
    number: 5,
    name: '‘Āṣim ibn Abī al-Najūd',
    arabicName: 'عَاصِم بن أَبِي النَّجُود',
    region: 'Kūfah',
    diedHijri: '127 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Shu‘bah', arabic: 'شُعْبَة', highlight: 'Reads بِـيُوت / رَضُوَان / explicit Ikhfā’ nuances' },
      { name: 'Ḥafṣ', arabic: 'حَفْص', highlight: 'Most widely printed worldwide; 4 Saktahs & clear Taḥqīq' },
    ],
    signatureRule: 'Chain ascending through ‘Alī ibn Abī Ṭālib (a.s.) & ‘Abdullāh ibn Mas‘ūd (r.a.)',
    sampleTestVerseKey: '1:4',
  },
  {
    number: 6,
    name: 'Ḥamzah al-Zayyāt',
    arabicName: 'حَمْزَة الزَّيَّات الكُوفِيّ',
    region: 'Kūfah',
    diedHijri: '156 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Khalaf', arabic: 'خَلَف', highlight: 'Tark al-Ghunnah on Nūn + Wāw/Yā’; full 6-count Madd' },
      { name: 'Khallād', arabic: 'خَلَّاد', highlight: 'Sakt before al-Hamzah and systematic Imālah Kubrā' },
    ],
    signatureRule: '6-count Madd Muttaṣil/Munfaṣil & systematic Waqf easing on hamzah',
    sampleTestVerseKey: '19:19',
  },
  {
    number: 7,
    name: 'Al-Kisā’ī al-Kūfī',
    arabicName: 'الكِسَائِي الكُوفِيّ',
    region: 'Kūfah',
    diedHijri: '189 AH',
    category: 'Saba‘ah (Seven)',
    rawis: [
      { name: 'Abū al-Ḥārith', arabic: 'أَبُو الحَارِث', highlight: 'Consistent Imālah Kubrā & feminine Hā’ al-Ta’nīth inclination' },
      { name: 'Al-Dūrī ‘an al-Kisā’ī', arabic: 'الدُّورِي', highlight: 'Precision grammar alignment of Kūfah school' },
    ],
    signatureRule: 'Master Arab grammarian renowned for Hā’ al-Ta’nīth Imālah at stops',
    sampleTestVerseKey: '93:1',
  },
  {
    number: 8,
    name: 'Abū Ja‘far al-Madanī',
    arabicName: 'أَبُو جَعْفَر المَدَنِيّ',
    region: 'Madīnah',
    diedHijri: '130 AH',
    category: 'Thalāthah Mutammimah (3 Completing)',
    rawis: [
      { name: 'Ibn Wardān', arabic: 'ابْن وَرْدَان', highlight: 'Ibdāl of silent hamzah + gentle Sakt on Ḥurūf Muqaṭṭa‘āt' },
      { name: 'Ibn Jammāz', arabic: 'ابْن جَمَّاز', highlight: 'Full Ṣilah of Mīm al-Jam‘' },
    ],
    signatureRule: 'Distinguished by pausing lightly (Sakt) between isolated opening letters (الٓمٓ)',
    sampleTestVerseKey: '2:1',
  },
  {
    number: 9,
    name: 'Ya‘qūb al-Ḥaḍramī',
    arabicName: 'يَعْقُوب الحَضْرَمِيّ',
    region: 'Baṣrah',
    diedHijri: '205 AH',
    category: 'Thalāthah Mutammimah (3 Completing)',
    rawis: [
      { name: 'Ruways', arabic: 'رُوَيْس', highlight: 'Clear Yā’ al-Iḍāfah restoration & Hā’ al-Sakt at pauses' },
      { name: 'Rawḥ', arabic: 'رَوْح', highlight: 'Preserves Ḍammah on plural Hā’ after Yā’ Sākinah (عَلَيْهُم)' },
    ],
    signatureRule: 'Known for Hā’ al-Sakt on feminine and interrogative endings in Baṣran tradition',
    sampleTestVerseKey: '1:7',
  },
  {
    number: 10,
    name: 'Khalaf al-‘Āshir',
    arabicName: 'خَلَف العَاشِر البَغْدَادِيّ',
    region: 'Kūfah',
    diedHijri: '229 AH',
    category: 'Thalāthah Mutammimah (3 Completing)',
    rawis: [
      { name: 'Isḥāq al-Warrāq', arabic: 'إِسْحَاق الوَرَّاق', highlight: 'Balanced Kūfī blend preserving Ghunnah in Idghām' },
      { name: 'Idrīs al-Ḥaddād', arabic: 'إِدْرِيس الحَدَّاد', highlight: 'Optional Sakt on Al-Ta‘rīf; independent tenth methodology' },
    ],
    signatureRule: 'Synthesizes Ḥamzah & al-Kisā’ī while retaining full Ghunnah on Wāw and Yā’',
    sampleTestVerseKey: '1:4',
  },
];

export const FARSH_COMPARISONS: FarshComparisonItem[] = [
  {
    id: 'fatiha-1-4',
    verseKey: '1:4',
    surahId: 1,
    ayahNumber: 4,
    surahName: 'Al-Fātiḥah',
    ruleCategory: 'Farsh al-Ḥurūf · Alif Deletion',
    hafsArabic: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
    hafsTranslit: 'Māliki yawmi d-dīn',
    warshArabic: 'مَلِكِ يَوْمِ ٱلدِّينِ',
    warshTranslit: 'Maliki yawmi d-dīn',
    qalunArabic: 'مَلِكِ يَوْمِ ٱلدِّينِ',
    abusAmrArabic: 'مَلِكِ يَوْمِ ٱلدِّينِ',
    note: 'Ḥafṣ & Al-Kisā’ī read "Māliki" (Owner/Master); Warsh, Qālūn & the majority of Madīnah/Baṣrah read "Maliki" (Sovereign King). Both meanings complement one another harmoniously.',
  },
  {
    id: 'baqarah-2-9',
    verseKey: '2:9',
    surahId: 2,
    ayahNumber: 9,
    surahName: 'Al-Baqarah',
    ruleCategory: 'Form III vs Form I Verb',
    hafsArabic: 'يُخَـٰدِعُونَ ٱللَّهَ وَٱلَّذِينَ ءَامَنُوا۟',
    hafsTranslit: 'Yukhādi‘ūna llāha...',
    warshArabic: 'يَخْدَعُونَ ٱللَّهَ وَٱلَّذِينَ ءَامَنُوا۟',
    warshTranslit: 'Yakhda‘ūna llāha (2/4/6 Badal)...',
    qalunArabic: 'يَخْدَعُونَ ٱللَّهَ وَٱلَّذِينَ ءَامَنُوا۟',
    note: 'Warsh and Nāfi‘ pronounce "Yakhda‘ūna" matching the second clause, while elongating the hamzah of ءَامَنُوا (Madd al-Badal).',
  },
  {
    id: 'maryam-19-19',
    verseKey: '19:19',
    surahId: 19,
    ayahNumber: 19,
    surahName: 'Maryam',
    ruleCategory: 'Hamzah vs Yā’ Letter Variation',
    hafsArabic: 'لِأَهَبَ لَكِ غُلَـٰمًا زَكِيًّا',
    hafsTranslit: 'Li-ahaba laki ghulāman zakiyyā',
    warshArabic: 'لِيَهَبَ لَكِ غُلَـٰمًا زَكِيًّا',
    warshTranslit: 'Li-yahaba laki ghulāman zakiyyā',
    note: 'Ḥafṣ attributes the speech directly to the angel ("so I may gift"), whereas Warsh reads "li-yahaba" ("so He [Allah] may gift a pure son").',
  },
  {
    id: 'duha-93-1',
    verseKey: '93:1–2',
    surahId: 93,
    ayahNumber: 1,
    surahName: 'Aḍ-Ḍuḥā',
    ruleCategory: 'Taqlīl (Minor Inclination) vs Fatḥ',
    hafsArabic: 'وَٱلضُّحَىٰ ۝ وَٱلَّيْلِ إِذَا سَجَىٰ',
    hafsTranslit: 'Wa-ḍ-ḍuḥā · Wa-l-layli idhā sajā',
    warshArabic: 'وَٱلضُّحَىٰٜ ۝ وَٱلَّيْلِ إِذَا سَجَىٰٜ',
    warshTranslit: 'Wa-ḍ-ḍuḥē (Taqlīl) · Wa-l-layli idhā sajē',
    note: 'Warsh applies consistent Taqlīl (half-way vowel inclination toward kasrah) on verse endings ending in alif maqṣūrah throughout Sūrah Aḍ-Ḍuḥā.',
  },
];

export const SANAD_LINEAGE_NODES: SanadNode[] = [
  {
    id: 'node-allah',
    tier: 'Tier 1 · Divine Origin',
    title: 'Allāh ﷻ (Rabbul-‘Ālamīn)',
    arabicTitle: 'اللَّهُ جَلَّ جَلَالُهُ',
    era: 'Pre-Eternal',
    location: 'Preserved Tablet (al-Lawḥ al-Maḥfūẓ)',
    chains: ['hafs', 'warsh'],
    bio: 'The Noble Qur’ān is the uncreated Speech of Allāh ﷻ revealed as a mercy and clear criterion.',
    methodology: 'Revealed gradually over 23 years in 7 canonical Aḥruf matching the dialects of Arabia.',
  },
  {
    id: 'node-jibril',
    tier: 'Tier 2 · Angelic Envoy',
    title: 'Jibrīl al-Amīn (عليه السلام)',
    arabicTitle: 'جِبْرِيلُ الأَمِينُ',
    era: '610–632 CE',
    location: 'Makkah & Madīnah',
    chains: ['hafs', 'warsh'],
    bio: 'Brought the wording, pauses, and melodic Tajweed articulation directly to the Prophet’s heart and reviewed the complete Qur’ān twice in the final Ramaḍān.',
    methodology: 'Al-‘Arḍah al-Akhīrah established the settled canonical order and permitted Qirā’āt.',
  },
  {
    id: 'node-prophet',
    tier: 'Tier 3 · Prophetic Reception',
    title: 'Prophet Muḥammad ﷺ',
    arabicTitle: 'سَيِّدُنَا مُحَمَّدٌ ﷺ',
    era: '1–11 AH',
    location: 'Al-Masjid al-Nabawī, Madīnah',
    chains: ['hafs', 'warsh'],
    bio: 'Taught companions verbatim face-to-face by recitation (Mushāfahah), approving authentic dialectical variations.',
    methodology: 'Oral transmission (Talaqqī) remained mandatory before trusting written consonantal script alone.',
  },
  {
    id: 'node-sahabah',
    tier: 'Tier 4 · The Companions',
    title: 'Ubayy ibn Ka‘b · ‘Uthmān · ‘Alī · Zayd · Ibn Mas‘ūd',
    arabicTitle: 'الصَّحَابَةُ الكِرَامُ',
    era: '11–40 AH',
    location: 'Madīnah & Kūfah',
    chains: ['hafs', 'warsh'],
    bio: 'Ubayy ibn Ka‘b & Zayd ibn Thābit taught in Madīnah (ancestors of Nāfi‘/Warsh chain), while ‘Alī ibn Abī Ṭālib & ‘Abdullāh ibn Mas‘ūd anchored the Kūfan teaching behind ‘Āṣim/Ḥafṣ.',
    methodology: 'All 10 canonical readings conform strictly to the ‘Uthmānī consonantal skeleton (Rasm).',
  },
  {
    id: 'node-tabiin',
    tier: 'Tier 5 · Senior Tābi‘īn',
    title: 'Abū ‘Abd al-Raḥmān al-Sulamī & Abū Ja‘far',
    arabicTitle: 'التَّابِعُونَ العُلَمَاءُ',
    era: '40–100 AH',
    location: 'Kūfah Mosque & Madīnah',
    chains: ['hafs', 'warsh'],
    bio: 'Al-Sulamī taught ‘Āṣim for 40 years in Kūfah exactly as he learned from ‘Alī (a.s.); Abū Ja‘far & Yazīd ibn al-Qa‘qā‘ mentored Nāfi‘ in Madīnah.',
    methodology: 'Dedicated lifelong circles inside Al-Masjid al-Nabawī and Kūfah Grand Mosque.',
  },
  {
    id: 'node-imam-asim',
    tier: 'Tier 6 · Canonical Imām (Kūfah)',
    title: "Imām ‘Āṣim ibn Abī al-Najūd",
    arabicTitle: 'الإِمَامُ عَاصِمٌ الكُوفِيُّ',
    era: 'd. 127 AH',
    location: 'Kūfah',
    chains: ['hafs'],
    bio: 'Renowned for crystal-clear articulation and balanced tone, fusing the chains of ‘Alī ibn Abī Ṭālib (a.s.) and Ibn Mas‘ūd.',
    methodology: 'Transmitted Ḥafṣ’s stream directly from ‘Alī (a.s.) -> Al-Sulamī -> ‘Āṣim.',
  },
  {
    id: 'node-imam-nafi',
    tier: 'Tier 6 · Canonical Imām (Madīnah)',
    title: "Imām Nāfi‘ al-Madanī",
    arabicTitle: 'الإِمَامُ نَافِعٌ المَدَنِيُّ',
    era: 'd. 169 AH',
    location: 'Madīnah',
    chains: ['warsh'],
    bio: 'Studied under 70 of the Madīnan Tābi‘īn; Imām Mālik described Nāfi‘’s recitation as the authentic Sunnah of Madīnah.',
    methodology: 'Adopted only the consensus points shared by his Madīnan teachers.',
  },
  {
    id: 'node-rawi-hafs',
    tier: 'Tier 7 · Primary Rāwī',
    title: 'Ḥafṣ ibn Sulaymān al-Asadī',
    arabicTitle: 'حَفْصُ بْنُ سُلَيْمَانَ',
    era: '90–180 AH',
    location: 'Kūfah & Baghdād',
    chains: ['hafs'],
    bio: 'Stepson and closest pupil of ‘Āṣim; narrated every letter and pause of ‘Āṣim’s stream from ‘Alī (a.s.) accurately.',
    methodology: 'Formally codified later via Ṭarīq al-Shāṭibiyyah (d. 590 AH).',
  },
  {
    id: 'node-rawi-warsh',
    tier: 'Tier 7 · Primary Rāwī',
    title: '‘Uthmān ibn Sa‘īd ("Warsh")',
    arabicTitle: 'وَرْشٌ المِصْرِيُّ',
    era: '110–197 AH',
    location: 'Egypt & Madīnah',
    chains: ['warsh'],
    bio: 'Traveled from Egypt to Madīnah where Imām Nāfi‘ nicknamed him "Warshān / Warsh" and audited his complete memorization several times.',
    methodology: 'Carried back to Egypt and spread across Fez, Qayrawān, and Andalusia via Imām al-Azraq.',
  },
  {
    id: 'node-present',
    tier: 'Tier 8 · Living Tradition',
    title: 'Modern Ijāzah Scholars & Reciters',
    arabicTitle: 'أَهْلُ الإِجَازَةِ وَالأَدَاءِ',
    era: 'Contemporary (28–31 links)',
    location: 'Worldwide',
    chains: ['hafs', 'warsh'],
    bio: 'Every certified Qāri’ holds an unbroken named chain (Ijāzah) tracing word by word through Al-Shāṭibiyyah / Al-Jazariyyah back to the Prophet ﷺ.',
    methodology: 'Recite accurately to a certified teacher to inherit this unbroken prophetic chain.',
  },
];

export const MAGHREBI_LETTER_CARDS = [
  {
    id: 'magh-fa',
    name: "Al-Fā’ (Subscript Dot)",
    maghrebiGlyph: 'ڢ',
    mashriqiGlyph: 'ف',
    note: 'In Maghrebi Muṣḥafs (Morocco, Tunisia, Andalusia), Fā’ carries a single dot BELOW the body to distinguish it visually from Qāf.',
    example: 'ٱلْڢَلَڧِ · Al-Falaq',
  },
  {
    id: 'magh-qaf',
    name: 'Al-Qāf (Single Top Dot)',
    maghrebiGlyph: 'ڧ',
    mashriqiGlyph: 'ق',
    note: 'Final and isolated Qāf retains only ONE centered dot above its sweeping bowl rather than two.',
    example: 'ڧُلْ أَعُوذُ · Qul A‘ūdhu',
  },
  {
    id: 'magh-nun',
    name: 'Final Nūn (Dotless Sweep)',
    maghrebiGlyph: 'ں',
    mashriqiGlyph: 'ن',
    note: 'At the end of words, the deep semicircular sweep of Nūn frequently omits its inner dot, relying on context & vocalization.',
    example: 'ٱلْعَـٰلَمِيں · ‘Ālamīn',
  },
];

export const POLYCHROMY_DABT_LEGEND = [
  {
    id: 'red-dabt',
    colorHex: '#BA1A1A',
    dotClass: 'bg-[#BA1A1A]',
    title: 'Crimson Markings',
    arabicLabel: 'نَقْطُ الْإِعْرَابِ',
    detail: 'Core case endings (Fatḥah, Kasrah, Ḍammah), Shaddah & Sukūn vocalization marks.',
  },
  {
    id: 'gold-dabt',
    colorHex: '#D97706',
    dotClass: 'bg-[#D97706]',
    title: 'Amber / Ochre Ink',
    arabicLabel: 'عَلَامَةُ الْهَمْزِ وَالتَّسْهِيلِ',
    detail: 'Silent hamzah transfers (Naql), softened Tashīl points, and dropped letters in Warsh.',
  },
  {
    id: 'green-dabt',
    colorHex: '#064E3B',
    dotClass: 'bg-[#064E3B]',
    title: 'Emerald Marks',
    arabicLabel: 'هَمْزَةُ الْوَصْلِ',
    detail: 'Joining Hamzat al-Waṣl circles showing which preceding vowel activates upon starting.',
  },
  {
    id: 'blue-dabt',
    colorHex: '#0F766E',
    dotClass: 'bg-[#0F766E]',
    title: 'Indigo / Teal Marks',
    arabicLabel: 'التَّقْلِيلُ وَالْإِمَالَةُ',
    detail: 'Large oval dots under vowels indicating Taqlīl or Imālah vowel inclination.',
  },
];

/**
 * Converts standard Mashriqi Naskh Arabic into traditional Maghrebi Fā' (ڢ) / Qāf (ڧ)
 * letter forms when Maghrebi orthography is previewed or enabled.
 */
export function convertToMaghrebiScript(arabic: string): string {
  return arabic
    .replace(/\u0641/g, '\u06A2') // ف -> ڢ
    .replace(/\u0642/g, '\u06A7'); // ق -> ڧ
}

/**
 * Known textual adjustments for Warsh preview on supported verses (e.g. 1:4 مَـٰلِكِ -> مَلِكِ).
 */
export function formatAyahByRiwayah(
  verseKey: string,
  arabic: string,
  riwayah: RiwayahId = 'hafs',
  maghrebiOrthography = false
): string {
  let result = arabic;
  if (riwayah === 'warsh') {
    if (verseKey === '1:4') {
      result = result.replace(/مَـ?ٰ?لِكِ/, 'مَلِكِ');
    } else if (verseKey === '2:9') {
      result = result.replace(/يُخَـ?ٰ?دِعُونَ/, 'يَخْدَعُونَ');
    }
  }
  return maghrebiOrthography ? convertToMaghrebiScript(result) : result;
}
