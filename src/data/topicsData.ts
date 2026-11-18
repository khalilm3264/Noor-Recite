export interface HeartStatePrompt {
  id: string;
  moodLabel: string;
  arabicWord: string;
  topicId: string;
  subtitle: string;
  ayahCount: number;
  tone: 'emerald' | 'amber' | 'teal';
}

export interface TopicAyahEntry {
  id: string;
  surahId: number;
  ayahNumber: number;
  verseKey: string;
  surahName: string;
  subCategory: string;
  arabic: string;
  transliteration: string;
  translationEn: string;
  translationHi: string;
  translationUr: string;
  reflectionNote: string;
  tajweedRule: string;
}

export interface QuranTopicCollection {
  id: string;
  title: string;
  arabicTitle: string;
  category: 'Heart & Character' | 'Trials & Steadfastness' | 'Worship & Du‘ā’' | 'Mercy & Hope';
  featured?: boolean;
  tagline: string;
  description: string;
  subFilters: string[];
  featuredAyahFocus?: {
    verseKey: string;
    highlightWord: string;
    tajweedFocus: string;
    tajweedRuleDetail: string;
  };
  ayahs: TopicAyahEntry[];
}

export const HEART_STATES: HeartStatePrompt[] = [
  {
    id: 'anxious',
    moodLabel: 'Anxious Heart',
    arabicWord: 'سَكِينَة',
    topicId: 'comfort-distress',
    subtitle: 'Tranquility & Dhikr',
    ayahCount: 4,
    tone: 'emerald',
  },
  {
    id: 'hopeful',
    moodLabel: 'Seeking Hope',
    arabicWord: 'أَمَل',
    topicId: 'mercy-forgiveness',
    subtitle: 'Divine Mercy & Return',
    ayahCount: 4,
    tone: 'amber',
  },
  {
    id: 'overwhelmed',
    moodLabel: 'Overwhelmed',
    arabicWord: 'تَيْسِير',
    topicId: 'comfort-distress',
    subtitle: 'Ease After Hardship',
    ayahCount: 4,
    tone: 'teal',
  },
  {
    id: 'grief',
    moodLabel: 'Grief & Loss',
    arabicWord: 'صَبْر',
    topicId: 'sabr-steadfastness',
    subtitle: 'Steadfastness & Resolve',
    ayahCount: 5,
    tone: 'amber',
  },
  {
    id: 'gratitude',
    moodLabel: 'Deep Gratitude',
    arabicWord: 'شُكْر',
    topicId: 'gratitude-shukr',
    subtitle: 'Praise & Abundance',
    ayahCount: 4,
    tone: 'emerald',
  },
];

export const QURAN_TOPICS: QuranTopicCollection[] = [
  {
    id: 'sabr-steadfastness',
    title: 'Sabr & Steadfastness',
    arabicTitle: 'الصَّبْرُ وَالثَّبَاتُ',
    category: 'Trials & Steadfastness',
    featured: true,
    tagline: 'Anchor your heart through seasons of hardship, loss, and quiet perseverance.',
    description:
      'How the Qur’ān frames beautiful patience (Ṣabrun Jamīl) through prayer, dignity, and steady trust in Allāh.',
    subFilters: ['All', 'Patience in Trials', 'Prayer & Reliance', 'Promise of Reward', 'Prophetic Du‘ā’s'],
    featuredAyahFocus: {
      verseKey: '2:153',
      highlightWord: 'ٱلصَّـٰبِرِينَ',
      tajweedFocus: 'Al-Lām al-Shamsiyyah & Ṣād Tafkhīm',
      tajweedRuleDetail:
        'Assimilate the Lām into a crisp heavy Ṣād (صّ), then draw out the Alif for a calm 2-count natural Madd.',
    },
    ayahs: [
      {
        id: 'sabr-2-153',
        surahId: 2,
        ayahNumber: 153,
        verseKey: '2:153',
        surahName: 'Al-Baqarah',
        subCategory: 'Prayer & Reliance',
        arabic: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ',
        transliteration: 'Yā ayyuhā lladhīna āmanū sta‘īnū bi-ṣ-ṣabri wa-ṣ-ṣalāh; inna llāha ma‘a ṣ-ṣābirīn.',
        translationEn:
          'O you who believe, seek help through patience and prayer. Indeed, Allāh is with the patient.',
        translationHi:
          'ऐ ईमान वालों! सब्र और नमाज़ से मदद तलब करो। बेशक अल्लाह सब्र करने वालों के साथ है।',
        translationUr:
          'اے ایمان والو! صبر اور نماز سے مدد حاصل کرو، بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔',
        reflectionNote:
          'When facing hardship, the Prophet ﷺ turned immediately to Salah, uniting inner steadiness with devotion.',
        tajweedRule: 'Madd Munfaṣil (4–5 counts) · Tafkhīm on Ṣād',
      },
      {
        id: 'sabr-2-286',
        surahId: 2,
        ayahNumber: 286,
        verseKey: '2:286',
        surahName: 'Al-Baqarah',
        subCategory: 'Prophetic Du‘ā’s',
        arabic: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا ٱكْتَسَبَتْ',
        transliteration: 'Lā yukallifu llāhu nafsan illā wus‘ahā; lahā mā kasabat wa-‘alayhā mā ktasabat.',
        translationEn:
          'Allāh does not burden a soul beyond its capacity. It gets what good it earns, and against it is what evil it earns.',
        translationHi:
          'अल्लाह किसी जान पर उसकी ताकत से ज़्यादा बोझ नहीं डालता।',
        translationUr:
          'اللہ کسی جان پر اس کی طاقت سے زیادہ بوجھ نہیں ڈالتا۔',
        reflectionNote:
          'Knowing your current trial already fits inside the capacity Allāh granted you replaces panic with serene clarity.',
        tajweedRule: 'Tanwīn Iẓhār on نَفْسًا إِلَّا',
      },
      {
        id: 'sabr-39-10',
        surahId: 39,
        ayahNumber: 10,
        verseKey: '39:10',
        surahName: 'Az-Zumar',
        subCategory: 'Promise of Reward',
        arabic: 'إِنَّمَا يُوَفَّى ٱلصَّـٰبِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ',
        transliteration: 'Innamā yuwaffā ṣ-ṣābirūna ajrahum bi-ghayri ḥisāb.',
        translationEn:
          'Indeed, the patient will be given their reward in full without measure or reckoning.',
        translationHi:
          'बेशक सब्र करने वालों کو उनका बदला बेहिसाब अता किया जाएगा।',
        translationUr:
          'بے شک صبر کرنے والوں کو ان کا اجر بے حساب پورا پورا دیا جائے گا۔',
        reflectionNote:
          'Unlike deeds weighed on scales, steadfast endurance receives an unmeasured gift directly from Divine generosity.',
        tajweedRule: 'Ghunnah Mushaddadah on إِنَّمَا · Ikhfā’ Shafawī on أَجْرَهُم بِغَيْرِ',
      },
      {
        id: 'sabr-103-1',
        surahId: 103,
        ayahNumber: 3,
        verseKey: '103:3',
        surahName: 'Al-‘Aṣr',
        subCategory: 'Patience in Trials',
        arabic: 'إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ',
        transliteration: 'Illā lladhīna āmanū wa-‘amilū ṣ-ṣāliḥāti wa-tawāṣaw bi-l-ḥaqqi wa-tawāṣaw bi-ṣ-ṣabr.',
        translationEn:
          'Except those who believe, do righteous deeds, and counsel each other to truth and to patience.',
        translationHi:
          'सिवाय उनके जो ईमान लाए, नेक अमल किए और आपस में हक़ और सब्र की वसीयत की।',
        translationUr:
          'سوائے ان لوگوں کے جو ایمان لائے، نیک عمل کیے اور آپس میں حق اور صبر کی نصیحت کی۔',
        reflectionNote:
          'Patience is shared in community as believers encourage one another toward resilience.',
        tajweedRule: 'Qalqalah Kubrā at Waqf on بِٱلصَّبْرِ',
      },
      {
        id: 'sabr-2-250',
        surahId: 2,
        ayahNumber: 250,
        verseKey: '2:250',
        surahName: 'Al-Baqarah',
        subCategory: 'Prophetic Du‘ā’s',
        arabic: 'رَبَّنَآ أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَٱنصُرْنَا عَلَى ٱلْقَوْمِ ٱلْكَـٰفِرِينَ',
        transliteration: 'Rabbanā afrigh ‘alaynā ṣabran wa-thabbit aqdāmanā wa-nṣurnā ‘alā l-qawmi l-kāfirīn.',
        translationEn:
          'Our Lord, pour upon us patience, make firm our steps, and grant us victory over the disbelieving people.',
        translationHi:
          'ऐ हमारे रब! हम पर सब्र उंडेल दे, हमारे क़दम जमा दे और हमारी मदद फ़रमा।',
        translationUr:
          'اے ہمارے رب! ہم پر صبر انڈیل دے اور ہمارے قدم مضبوط جما دے۔',
        reflectionNote:
          'The verb "afrigh" means "pour down like rain", asking for calm strength from head to foot.',
        tajweedRule: 'Idghām with Ghunnah on صَبْرًا وَثَبِّتْ',
      },
    ],
  },
  {
    id: 'comfort-distress',
    title: 'Ease, Sakīnah & Relief',
    arabicTitle: 'السَّكِينَةُ وَالتَّيْسِيرُ',
    category: 'Heart & Character',
    tagline: 'Quieting anxiety with the promise of ease embedded within every hardship.',
    description:
      'Whenever chest tightness or worry rises, these verses affirm that Allāh’s nearness, calm remembrance, and simultaneous ease are closer than the hardship itself.',
    subFilters: ['All', 'Heart Calm', 'Twin Ease', 'Trust & Reliance'],
    ayahs: [
      {
        id: 'ease-94-5',
        surahId: 94,
        ayahNumber: 5,
        verseKey: '94:5',
        surahName: 'Ash-Sharḥ',
        subCategory: 'Twin Ease',
        arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
        transliteration: 'Fa-inna ma‘a l-‘usri yusrā.',
        translationEn: 'For indeed, with hardship comes ease.',
        translationHi: 'पस बेशक तंगी के साथ आसानी है।',
        translationUr: 'پس بے شک تنگی کے ساتھ آسانی ہے۔',
        reflectionNote:
          'Using "ma‘a" (with) rather than "ba‘da" (after) shows that relief accompanies the trial itself.',
        tajweedRule: 'Ghunnah Mushaddadah on فَإِنَّ (2 counts)',
      },
      {
        id: 'ease-94-6',
        surahId: 94,
        ayahNumber: 6,
        verseKey: '94:6',
        surahName: 'Ash-Sharḥ',
        subCategory: 'Twin Ease',
        arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
        transliteration: 'Inna ma‘a l-‘usri yusrā.',
        translationEn: 'Indeed, with hardship comes ease.',
        translationHi: 'बेशक तंगी के साथ आसानी है।',
        translationUr: 'بے شک مشکل کے ساتھ آسانی ہے۔',
        reflectionNote:
          'Classical exegetes highlight the Arabic grammar: one definite hardship (al-‘usr) can never overpower two indefinite forms of ease (yusrān).',
        tajweedRule: 'Madd ‘Iwaḍ at end (يُسْرًا -> yusrā)',
      },
      {
        id: 'ease-13-28',
        surahId: 13,
        ayahNumber: 28,
        verseKey: '13:28',
        surahName: 'Ar-Ra‘d',
        subCategory: 'Heart Calm',
        arabic: 'أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ',
        transliteration: 'Alā bi-dhikri llāhi taṭma’innu l-qulūb.',
        translationEn: 'Unquestionably, in the remembrance of Allāh do hearts find rest.',
        translationHi: 'सुन लो! अल्लाह की याद ही से दिलों को सुकून मिलता है।',
        translationUr: 'آگاہ ہو جاؤ! اللہ ہی کے ذکر سے دلوں کو اطمینان نصیب ہوتا ہے۔',
        reflectionNote:
          'The heart finds lasting stillness (iṭmi’nān) only when connected back to its Creator.',
        tajweedRule: 'Qalqalah Ṣughrā on Ṭā’ in تَطْمَئِنُّ + Ghunnah',
      },
      {
        id: 'ease-93-3',
        surahId: 93,
        ayahNumber: 3,
        verseKey: '93:3',
        surahName: 'Aḍ-Ḍuḥā',
        subCategory: 'Trust & Reliance',
        arabic: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ',
        transliteration: 'Mā wadda‘aka rabbuka wa-mā qalā.',
        translationEn: 'Your Lord has not forsaken you, nor is He displeased.',
        translationHi: 'न तुम्हारे रब ने तुम्हें छोड़ा है और न वह नाराज़ हुआ है।',
        translationUr: 'تمہارے رب نے تمہیں نہ چھوڑا ہے اور نہ وہ ناراض ہوا ہے۔',
        reflectionNote:
          'Silent seasons are not abandonment; they are preparation for deeper light ahead.',
        tajweedRule: 'Natural Madd 2 counts at verse ending',
      },
    ],
  },
  {
    id: 'mercy-forgiveness',
    title: 'Mercy, Hope & Return',
    arabicTitle: 'الرَّحْمَةُ وَالْمَغْفِرَةُ',
    category: 'Mercy & Hope',
    tagline: 'Never despair of Allāh’s encompassing compassion, regardless of past missteps.',
    description:
      'Verses inviting tired souls back with open arms, reminding every believer that sincere repentance turns darkness into peace.',
    subFilters: ['All', 'Unbounded Mercy', 'Repentance & Hope', 'Nearness'],
    ayahs: [
      {
        id: 'mercy-39-53',
        surahId: 39,
        ayahNumber: 53,
        verseKey: '39:53',
        surahName: 'Az-Zumar',
        subCategory: 'Unbounded Mercy',
        arabic: 'قُلْ يَـٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ',
        transliteration: 'Qul yā ‘ibādiya lladhīna asrafū ‘alā anfusihim lā taqnaṭū min raḥmati llāh.',
        translationEn:
          'Say, O My servants who have transgressed against themselves: do not despair of the mercy of Allāh.',
        translationHi:
          'कह दो: ऐ मेरे बंदों जिन्होंने अपनी जानों पर ज्यादती की है, अल्लाह की रहमत से नाउम्मीद न हो।',
        translationUr:
          'کہہ دو: اے میرے بندو جنہوں نے اپنی جانوں پر زیادتی کی ہے، اللہ کی رحمت سے مایوس نہ ہو۔',
        reflectionNote:
          'Even while calling sinners back, Allāh addresses them warmly as "My servants."',
        tajweedRule: 'Ikhfā’ on أَنفُسِهِمْ · Idghām bilā Ghunnah on مِن رَّحْمَةِ',
      },
      {
        id: 'mercy-2-186',
        surahId: 2,
        ayahNumber: 186,
        verseKey: '2:186',
        surahName: 'Al-Baqarah',
        subCategory: 'Nearness',
        arabic: 'وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ ٱلدَّاعِ إِذَا دَعَانِ',
        transliteration: 'Wa-idhā sa’alaka ‘ibādī ‘annī fa-innī qarīb; ujību da‘wata d-dā‘i idhā da‘ān.',
        translationEn:
          'When My servants ask you about Me, indeed I am near. I answer the call of the supplicant whenever they call upon Me.',
        translationHi:
          'और जब मेरे बंदे आपसे मेरे बारे में पूछें तो मैं बहुत करीब हूँ; दुआ करने वाले की दुआ क़बूल करता हूँ।',
        translationUr:
          'اور جب میرے بندے آپ سے میرے متعلق پوچھیں تو میں قریب ہوں، پکارنے والے کی پکار سنتا ہوں۔',
        reflectionNote:
          'Unlike other questions in the Qur’ān where the Prophet ﷺ is told "Qul (Say)", here Allāh replies directly without an intermediary word.',
        tajweedRule: 'Ghunnah Mushaddadah on عَنِّي and فَإِنِّي',
      },
      {
        id: 'mercy-1-3',
        surahId: 1,
        ayahNumber: 3,
        verseKey: '1:3',
        surahName: 'Al-Fātiḥah',
        subCategory: 'Unbounded Mercy',
        arabic: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
        transliteration: 'Ar-Raḥmāni r-Raḥīm.',
        translationEn: 'The Most Compassionate, the Most Merciful.',
        translationHi: 'बड़ा मेहरबान, निहायत रहम करने वाला।',
        translationUr: 'نہایت مہربان، بہت رحم فرمانے والا۔',
        reflectionNote:
          'Recited in every unit of daily prayer so our spiritual compass begins with mercy before accountability.',
        tajweedRule: 'Madd ‘Āriḍ li-s-Sukūn at end (2/4/6 counts)',
      },
      {
        id: 'mercy-112-1',
        surahId: 112,
        ayahNumber: 1,
        verseKey: '112:1',
        surahName: 'Al-Ikhlāṣ',
        subCategory: 'Repentance & Hope',
        arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
        transliteration: 'Qul huwa llāhu Aḥad.',
        translationEn: 'Say: He is Allāh, the One and Only.',
        translationHi: 'कह दो: वह अल्लाह एक है।',
        translationUr: 'کہہ دو: وہ اللہ ایک ہے۔',
        reflectionNote:
          'Equaling one-third of the Qur’ān in theological weight, Tawḥīd liberates the soul from every lesser fear.',
        tajweedRule: 'Qalqalah Kubrā on Dāl at stop',
      },
    ],
  },
  {
    id: 'gratitude-shukr',
    title: 'Gratitude & Contentment',
    arabicTitle: 'الشُّكْرُ وَالقَنَاعَةُ',
    category: 'Worship & Du‘ā’',
    tagline: 'Notice hidden blessings and unlock sustainable barakah through thankfulness.',
    description:
      'In Prophetic and Qur’ānic spirituality, Shukr transforms ordinary moments into worship and acts as the divine key to lasting increase.',
    subFilters: ['All', 'Promise of Increase', 'Praise & Hamd', 'Night & Morning'],
    ayahs: [
      {
        id: 'shukr-14-7',
        surahId: 14,
        ayahNumber: 7,
        verseKey: '14:7',
        surahName: 'Ibrāhīm',
        subCategory: 'Promise of Increase',
        arabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ',
        transliteration: 'La-in shakartum la-azīdannakum.',
        translationEn: 'If you are grateful, I will surely increase you in favor.',
        translationHi: 'अगर तुम शुक्र करोगे तो मैं तुम्हें ज़रूर ज़्यादा दूँगा।',
        translationUr: 'اگر تم شکر کرو گے تو میں تمہیں ضرور اور زیادہ دوں گا۔',
        reflectionNote:
          'Emphatic oath structure (La- + Nūn al-Tawkīd) guarantees spiritual and worldly increase with gratitude.',
        tajweedRule: 'Ikhfā’ on لَئِن شَكَرْتُمْ + Ghunnah on لَأَزِيدَنَّكُمْ',
      },
      {
        id: 'shukr-1-2',
        surahId: 1,
        ayahNumber: 2,
        verseKey: '1:2',
        surahName: 'Al-Fātiḥah',
        subCategory: 'Praise & Hamd',
        arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
        transliteration: 'Al-ḥamdu lillāhi Rabbi l-‘ālamīn.',
        translationEn: 'All praise and gratitude belong to Allāh, Lord of all worlds.',
        translationHi: 'सब तारीफ़ अल्लाह के लिए है जो तमाम जहानों का रब है।',
        translationUr: 'سب تعریفیں اللہ کے لیے ہیں جو تمام جہانوں کا رب ہے۔',
        reflectionNote:
          'The definitive article Al- encompasses every category of thanks past, present, and yet unknown.',
        tajweedRule: 'Iẓhār Qamariyyah + Tarqīq of Lām in لِلَّهِ',
      },
      {
        id: 'shukr-2-152',
        surahId: 2,
        ayahNumber: 152,
        verseKey: '2:152',
        surahName: 'Al-Baqarah',
        subCategory: 'Praise & Hamd',
        arabic: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ',
        transliteration: 'Fa-dhkurūnī adhkurkum wa-shkurū lī wa-lā takfurūn.',
        translationEn: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
        translationHi: 'पस तुम मुझे याद रखो, मैं तुम्हें याद रखूँगा और मेरा शुक्र अदा करो।',
        translationUr: 'پس تم مجھے یاد رکھو، میں تمہیں یاد رکھوں گا اور میرا شکر ادا کرو۔',
        reflectionNote:
          'To be remembered by the King of the universe requires only remembering Him gratefully in your moment.',
        tajweedRule: 'Tafkhīm on Rā’ in فَٱذْكُرُونِى + Madd Munfaṣil',
      },
      {
        id: 'shukr-93-11',
        surahId: 93,
        ayahNumber: 11,
        verseKey: '93:11',
        surahName: 'Aḍ-Ḍuḥā',
        subCategory: 'Night & Morning',
        arabic: 'وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ',
        transliteration: 'Wa-ammā bi-ni‘mati rabbika fa-ḥaddith.',
        translationEn: 'And as for the favor of your Lord, proclaim it gratefully.',
        translationHi: 'और अपने रब की नेमत का इज़हार करते रहो।',
        translationUr: 'اور اپنے رب کی نعمت کا ذکر کرتے رہو۔',
        reflectionNote:
          'Sharing gratitude and teaching beneficial knowledge honors the gifts entrusted to us.',
        tajweedRule: 'Ghunnah Mushaddadah on وَأَمَّا (2 counts)',
      },
    ],
  },
];
