import { DuaAlternateVariant } from '../types/quran';

export interface DuaAlternatesBundle {
  primaryVariantLabel?: string;
  alternates: DuaAlternateVariant[];
}

export const ALTERNATES_BY_DUA_ID: Record<string, DuaAlternatesBundle> = {
  'dua-morning-protection': {
    primaryVariantLabel: '3x Bismillāh (Harm Refuge)',
    alternates: [
      {
        id: 'morning-body-health-82',
        label: 'Body, Hearing & Sight (3x)',
        badge: 'Abu Dawud 5090',
        arabic:
          'ٱللَّهُمَّ عَافِنِي فِي بَدَنِي، ٱللَّهُمَّ عَافِنِي فِي سَمْعِي، ٱللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ. ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ ٱلْكُفْرِ، وَٱلْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ ٱلْقَبْرِ، لَا إِلَٰهَ إِلَّا أَنْتَ ثَلَاثَ مَرَّاتٍ',
        transliteration:
          'Allāhumma ‘āfinī fī badanī, Allāhumma ‘āfinī fī sam‘ī, Allāhumma ‘āfinī fī baṣarī, lā ilāha illā Anta. Allāhumma innī a‘ūdhu bika minal-kufri wal-faqri, wa a‘ūdhu bika min ‘adhābil-qabri, lā ilāha illā Anta',
        translationEn:
          'O Allah, grant health to my body, hearing, and sight; there is no deity worthy of worship except You. O Allah, I seek refuge in You from disbelief, poverty, and the punishment of the grave; there is no deity except You (recited 3 times).',
        translationHi:
          'ऐ अल्लाह! मेरे शरीर, मेरे कानों और मेरी आँखों को आफ़ियत (सेहत) दे, तेरे सिवा कोई माबूद नहीं। ऐ अल्लाह! मैं कुफ़्र, मोहताजी और क़ब्र के अज़ाब से तेरी पनाह माँगता हूँ, तेरे सिवा कोई माबूद नहीं (3 बार)।',
        translationUr:
          'اے اللہ! میرے بدن، میری سماعت اور میری بصارت کو عافیت عطا فرما، تیرے سوا کوئی معبود نہیں۔ اے اللہ! میں کفر، فقر اور عذابِ قبر سے تیری پناہ مانگتا ہوں، تیرے سوا کوئی معبود نہیں (3 بار)۔',
        reference: 'Sunan Abi Dawud 5090 · Morning & Evening (3x)',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/82.mp3',
      },
      {
        id: 'morning-hasbiyallah-83',
        label: 'Hasbiyallāh (7x)',
        badge: 'Sufficiency 7x',
        arabic:
          'حَسْبِيَ ٱللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ سَبْعَ مَرَّاتٍ',
        transliteration:
          'Ḥasbiyallāhu lā ilāha illā Huwa ‘alayhi tawakkaltu wa Huwa Rabbul-‘Arshil-‘Aẓīm (7 times)',
        translationEn:
          'Allah is sufficient for me; there is no deity worthy of worship except Him. In Him I put my trust, and He is the Lord of the Mighty Throne (recited 7 times).',
        translationHi:
          'मेरे लिए अल्लाह काफ़ी है, उसके सिवा कोई माबूद नहीं, मैंने उसी पर भरोसा किया और वह अर्श-ए-अज़ीम का मालिक है (7 बार)।',
        translationUr:
          'میرے لیے اللہ کافی ہے، اس کے سوا کوئی معبود نہیں، میں نے اسی پر بھروسا کیا اور وہ عرشِ عظیم کا رب ہے (7 بار)۔',
        reference: 'Sunan Abi Dawud 5081 · Qur’an 9:129',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/83.mp3',
      },
      {
        id: 'morning-all-directions-84',
        label: 'Comprehensive Safety (All Directions)',
        badge: 'Ibn Majah 3871',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ ٱلْعَفْوَ وَٱلْعَافِيَةَ فِي ٱلدُّنْيَا وَٱلْآخِرَةِ، ٱللَّهُمَّ إِنِّي أَسْأَلُكَ ٱلْعَفْوَ وَٱلْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، ٱللَّهُمَّ ٱسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، ٱللَّهُمَّ ٱحْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
        transliteration:
          'Allāhumma innī as’alukal-‘afwa wal-‘āfiyata fid-dunyā wal-ākhirah. Allāhumma innī as’alukal-‘afwa wal-‘āfiyata fī dīnī wa dunyāya wa ahlī wa mālī. Allāhummastur ‘awrātī wa āmin raw‘ātī. Allāhummaḥ-faẓnī mim-bayni yadayya wa min khalfī wa ‘an yamīnī wa ‘an shimālī wa min fawqī, wa a‘ūdhu bi-‘aẓamatika an ughtāla min taḥtī',
        translationEn:
          'O Allah, I ask You for pardon and well-being in this world and the Hereafter, in my religion, worldly affairs, family, and wealth. Conceal my faults, calm my fears, and guard me from in front, behind, my right, my left, above, and I seek refuge in Your greatness from being harmed from beneath.',
        translationHi:
          'ऐ अल्लाह! मैं तुझसे दुनिया व आख़िरत, अपने दीन, घर-परिवार और माल में माफ़ी और आफ़ियत माँगता हूँ। मेरे ऐब छुपा दे, मेरे डर को अमन दे, और मुझे आगे, पीछे, दाएँ, बाएँ, ऊपर और नीचे हर तरफ़ की आफ़त से बचा ले।',
        translationUr:
          'اے اللہ! میں تجھ سے دنیا و آخرت، اپنے دین، دنیا، اہل و عیال اور مال میں معافی اور عافیت مانگتا ہوں۔ میرے عیبوں کی پردہ پوشی فرما، میرے خوف کو امن میں بدل دے، اور مجھے آگے، پیچھے، دائیں، بائیں، اوپر اور نیچے ہر جانب سے محفوظ رکھ۔',
        reference: 'Sunan Abi Dawud 5074 & Ibn Majah 3871 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/84.mp3',
      },
      {
        id: 'morning-ya-hayyu-88',
        label: 'Yā Ḥayyu Yā Qayyūm (Aid)',
        badge: 'Al-Hakim · Hasan',
        arabic:
          'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِيَ كُلَّهُ وَلَا تَكِلْنِي إِلَىٰ نَفْسِي طَرْفَةَ عَيْنٍ',
        transliteration:
          'Yā Ḥayyu yā Qayyūmu bi-raḥmatika astaghīth, aṣliḥ lī sha’nī kullahū wa lā takilnī ilā nafsī ṭarfata ‘ayn',
        translationEn:
          'O Ever-Living, O Sustainer of all, in Your mercy I seek relief; rectify all of my affairs and do not leave me to myself even for the blink of an eye.',
        translationHi:
          'ऐ हमेशा ज़िंदा रहने वाले, ऐ सबको थामने वाले! मैं तेरी रहमत की मदद माँगता हूँ; मेरे सारे काम दुरुस्त फ़रमा दे और पलक झपकने भर भी मुझे मेरे नफ़्स के हवाले न कर।',
        translationUr:
          'اے ہمیشہ زندہ رہنے والے، اے تمام کائنات کو سنبھالنے والے! میں تیری رحمت سے فریاد کرتا ہوں؛ میرے تمام معاملات درست فرما دے اور پلک جھپکنے کے برابر بھی مجھے میرے نفس کے سپرد نہ فرما۔',
        reference: 'Al-Mustadrak & Sunan an-Nasa’i al-Kubra · Hasan',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/88.mp3',
      },
      {
        id: 'evening-perfect-words-97',
        label: 'Evening Refuge (3x A‘ūdhu bi-Kalimātillāh)',
        badge: 'Sahih Muslim 2709',
        arabic: 'أَعُوذُ بِكَلِمَاتِ ٱللَّهِ ٱلتَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ ثَلَاثَ مَرَّاتٍ إِذَا أَمْسَىٰ',
        transliteration:
          'A‘ūdhu bi-kalimātillāhit-tāmmāti min sharri mā khalaq (3 times in the evening)',
        translationEn:
          'I seek refuge in the perfect words of Allah from the evil of whatever He has created (recited three times at evening).',
        translationHi:
          'मैं अल्लाह के मुकम्मल कलिमात की पनाह माँगता हूँ हर उस चीज़ के शर से जिसे उसने पैदा किया (शाम को 3 बार)।',
        translationUr:
          'میں اللہ کے کامل کلمات کی پناہ مانگتا ہوں ہر اس چیز کے شر سے جو اس نے پیدا کی (شام کو 3 بار)۔',
        reference: 'Sahih Muslim 2709 · Evening Protection',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/97.mp3',
      },
    ],
  },

  'dua-leaving-home': {
    primaryVariantLabel: 'Tawakkul (Abu Dawud)',
    alternates: [
      {
        id: 'leaving-umm-salamah-17',
        label: 'Refuge From Going Astray (Umm Salamah)',
        badge: 'Nasa’i & Tirmidhi',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ، أَوْ أُضَلَّ، أَوْ أَزِلَّ، أَوْ أُزَلَّ، أَوْ أَظْلِمَ، أَوْ أُظْلَمَ، أَوْ أَجْهَلَ، أَوْ يُجْهَلَ عَلَيَّ',
        transliteration:
          'Allāhumma innī a‘ūdhu bika an aḍilla aw uḍalla, aw azilla aw uzalla, aw aẓlima aw uẓlama, aw ajhala aw yujhala ‘alayya',
        translationEn:
          'O Allah, I seek refuge in You lest I stray or be led astray, slip or be tripped, oppress or be oppressed, or act foolishly or be treated foolishly.',
        translationHi:
          'ऐ अल्लाह! मैं तेरी पनाह माँगता हूँ कि मैं गुमराह होऊँ या गुमराह किया जाऊँ, फिसलूँ या फिसलाया जाऊँ, ज़ुल्म करूँ या मुझ पर ज़ुल्म हो, या जाहिलाना हरकत करूँ या मेरे साथ जहालत की जाए।',
        translationUr:
          'اے اللہ! میں تیری پناہ مانگتا ہوں اس سے کہ میں خود گمراہ ہوں یا کوئی مجھے گمراہ کرے، میں پھسلوں یا پھسلایا جاؤں، ظلم کروں یا مجھ پر ظلم ہو، یا نادانی کروں یا مجھ پر نادانی کی جائے۔',
        reference: 'Sunan Abi Dawud 5094 & Tirmidhi 3427 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/17.mp3',
      },
      {
        id: 'entering-home-18',
        label: 'Returning & Entering Home',
        badge: 'Abu Dawud 5096',
        arabic: 'بِسْمِ ٱللَّهِ وَلَجْنَا، وَبِسْمِ ٱللَّهِ خَرَجْنَا، وَعَلَى ٱللَّهِ رَبِّنَا تَوَكَّلْنَا، ثُمَّ لِيُسَلِّمْ عَلَىٰ أَهْلِهِ',
        transliteration:
          'Bismillāhi walajnā, wa bismillāhi kharajnā, wa ‘alallāhi Rabbinā tawakkalnā (then greet one’s household with Salām)',
        translationEn:
          'In the name of Allah we enter, and in the name of Allah we depart, and upon Allah our Lord we place our trust — then offer Salam to the household.',
        translationHi:
          'अल्लाह के नाम से हम दाख़िल हुए और अल्लाह के नाम से हम निकले, और अपने रब अल्लाह पर हमने भरोसा किया — फिर घर वालों को सलाम करें।',
        translationUr:
          'اللہ کے نام سے ہم داخل ہوئے اور اللہ کے نام سے ہم نکلے، اور اپنے رب اللہ پر ہم نے بھروسا کیا — پھر گھر والوں کو سلام کریں۔',
        reference: 'Sunan Abi Dawud 5096',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/18.mp3',
      },
    ],
  },

  'dua-before-eating': {
    primaryVariantLabel: 'Before Eating',
    alternates: [
      {
        id: 'eating-if-forgotten-178',
        label: 'If Forgotten at Start (Ākhirihī)',
        badge: 'Abu Dawud 3767',
        arabic:
          'إِذَا أَكَلَ أَحَدُكُمْ طَعَاماً فَلْيَقُلْ بِسْمِ ٱللَّهِ، فَإِنْ نَسِيَ فِي أَوَّلِهِ فَلْيَقُلْ بِسْمِ ٱللَّهِ فِي أَوَّلِهِ وَآخِرِهِ',
        transliteration:
          'Bismillāhi fī awwalihī wa ākhirihī (if forgotten when beginning the meal)',
        translationEn:
          'When one of you eats food, let him say “Bismillah”; and if he forgets at the beginning, let him say: “In the name of Allah at its beginning and its end.”',
        translationHi:
          'जब तुममें से कोई खाना खाए तो “बिस्मिल्लाह” कहे, और अगर शुरू में भूल जाए तो कहे: “अल्लाह के नाम से इसके शुरू में और इसके आख़िर में।”',
        translationUr:
          'جب تم میں سے کوئی کھانا کھائے تو بسم اللہ کہے، اور اگر شروع میں بھول جائے تو کہے: اللہ کے نام سے اس کے اول و آخر میں۔',
        reference: 'Sunan Abi Dawud 3767 & Tirmidhi 1858 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/178.mp3',
      },
      {
        id: 'eating-blessing-milk-179',
        label: 'Ask Blessing & Increase (Food & Milk)',
        badge: 'Tirmidhi 3455',
        arabic:
          'مَنْ أَطْعَمَهُ ٱللَّهُ ٱلطَّعَامَ فَلْيَقُلْ: ٱللَّهُمَّ بَارِكْ لَنَا فِيهِ وَأَطْعِمْنَا خَيْراً مِنْهُ، وَمَنْ سَقَاهُ ٱللَّهُ لَبَناً فَلْيَقُلْ ٱللَّهُمَّ بَارِكْ لَنَا فِيهِ وَزِدْنَا مِنْهُ',
        transliteration:
          'Allāhumma bārik lanā fīhi wa aṭ‘imnā khayram-minh (food) · Allāhumma bārik lanā fīhi wa zidnā minh (milk)',
        translationEn:
          'Whoever Allah feeds should say: “O Allah, bless us in it and feed us better than it.” Whoever Allah gives milk to drink should say: “O Allah, bless us in it and increase us in it.”',
        translationHi:
          'जिसको अल्लाह खाना खिलाए वह कहे: “ऐ अल्लाह! इसमें हमारे लिए बरकत दे और इससे बेहतर खिला,” और जिसको दूध पिलाए वह कहे: “ऐ अल्लाह! इसमें बरकत दे और हमें इसमें और ज़ियादा अता फ़रमा।”',
        translationUr:
          'جسے اللہ کھانا کھلائے وہ کہے: اے اللہ! اس میں برکت فرما اور ہمیں اس سے بہتر کھلا؛ اور جسے دودھ پلائے وہ کہے: اے اللہ! اس میں برکت فرما اور ہمیں مزید عطا فرما۔',
        reference: 'Jami‘ at-Tirmidhi 3455 · Hasan',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/179.mp3',
      },
    ],
  },

  'dua-after-eating': {
    primaryVariantLabel: 'Gratitude (Tirmidhi 3458)',
    alternates: [
      {
        id: 'after-eating-abundant-181',
        label: 'Abundant Pure Praise (Bukhari 5458)',
        badge: 'Sahih al-Bukhari',
        arabic:
          'ٱلْحَمْدُ لِلَّهِ حَمْداً كَثِيراً طَيِّباً مُبَارَكاً فِيهِ، غَيْرَ مَكْفِيٍّ وَلَا مُوَدَّعٍ، وَلَا مُسْتَغْنًى عَنْهُ رَبَّنَا',
        transliteration:
          'Al-ḥamdulillāhi ḥamdan kathīran ṭayyiban mubārakan fīhi, ghayra makfiyyin wa lā muwadda‘in, wa lā mustaghnan ‘anhu Rabbanā',
        translationEn:
          'All praise is due to Allah — abundant, pure, and blessed praise — never ceasing, never forsaken, nor are we ever independent of our Lord.',
        translationHi:
          'अल्लाह के लिए बहुत, पाकीज़ा और बरकत वाली तारीफ़ है; न यह सिलसिला ख़त्म होने वाला है और न हम अपने रब से कभी बेनियाज़ हो सकते हैं।',
        translationUr:
          'اللہ کے لیے کثیر، پاکیزہ اور بابرکت حمد ہے؛ جو نہ کبھی ختم ہونے والی ہے نہ چھوڑی جانے والی، اور اے ہمارے رب! ہم تجھ سے کبھی بے نیاز نہیں ہو سکتے۔',
        reference: 'Sahih al-Bukhari 5458',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/181.mp3',
      },
      {
        id: 'after-eating-host-182',
        label: 'Blessing the Host',
        badge: 'Sahih Muslim 2042',
        arabic: 'ٱللَّهُمَّ بَارِكْ لَهُمْ فِيمَا رَزَقْتَهُمْ، وَٱغْفِرْ لَهُمْ وَٱرْحَمْهُمْ',
        transliteration: 'Allāhumma bārik lahum fīmā razaqtahum, waghfir lahum warḥamhum',
        translationEn:
          'O Allah, bless them in what You have provided for them, forgive them, and have mercy upon them.',
        translationHi:
          'ऐ अल्लाह! जो कुछ तूने इन्हें रिज़्क़ दिया है उसमें बरकत दे, इनकी मग़फ़िरत फ़रमा और इन पर रहम कर।',
        translationUr:
          'اے اللہ! جو رزق تو نے انہیں دیا ہے اس میں برکت عطا فرما، ان کی مغفرت فرما اور ان پر رحم فرما۔',
        reference: 'Sahih Muslim 2042 · Dua for One’s Host',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/182.mp3',
      },
    ],
  },

  'dua-before-sleep': {
    primaryVariantLabel: 'Bismika Amūtu (Short)',
    alternates: [
      {
        id: 'sleep-on-right-side-102',
        label: 'Laying Side Down (Right Side)',
        badge: 'Bukhari & Muslim',
        arabic:
          'بِٱسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَٱرْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَٱحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ ٱلصَّالِحِينَ',
        transliteration:
          'Bismika Rabbī waḍa‘tu janbī wa bika arfa‘uh, fa-in amsakta nafsī farḥamhā, wa in arsaltahā faḥfaẓhā bimā taḥfaẓu bihī ‘ibādakaṣ-ṣāliḥīn',
        translationEn:
          'In Your name, my Lord, I lie down on my side, and in Your name I rise. If You take my soul, have mercy upon it; and if You send it back, protect it as You protect Your righteous servants.',
        translationHi:
          'ऐ मेरे रब! तेरे नाम से मैं अपना पहलू रखता हूँ और तेरे ही नाम से उठाऊँगा। अगर तू मेरी रूह रोक ले तो उस पर रहम फ़रमा, और अगर लौटा दे तो उसकी ऐसे हिफ़ाज़त कर जैसे अपने नेक बंदों की करता है।',
        translationUr:
          'اے میرے رب! تیرے نام کے ساتھ میں نے اپنا پہلو رکھا اور تیرے ہی حکم سے اٹھاؤں گا۔ اگر تو میری جان روک لے تو اس پر رحم فرما، اور اگر واپس لوٹا دے تو اس کی ویسی حفاظت فرما جیسی تو اپنے نیک بندوں کی فرماتا ہے۔',
        reference: 'Sahih al-Bukhari 6320 & Muslim 2714',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/102.mp3',
      },
      {
        id: 'sleep-soul-keeper-103',
        label: 'Creator & Keeper of the Soul',
        badge: 'Sahih Muslim 2712',
        arabic:
          'ٱللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَٱحْفَظْهَا، وَإِنْ أَمَتَّهَا فَٱغْفِرْ لَهَا. ٱللَّهُمَّ إِنِّي أَسْأَلُكَ ٱلْعَافِيَةَ',
        transliteration:
          'Allāhumma innaka khalaqta nafsī wa Anta tawaffāhā, laka mamātuhā wa maḥyāhā, in aḥyaytahā faḥfaẓhā, wa in amattahā faghfir lahā. Allāhumma innī as’alukal-‘āfiyah',
        translationEn:
          'O Allah, You created my soul and You take it back; to You belong its death and its life. If You keep it alive, protect it; and if You cause it to die, forgive it. O Allah, I ask You for well-being.',
        translationHi:
          'ऐ अल्लाह! तूने मेरी जान पैदा की और तू ही इसे वापस लेता है; तेरे ही हाथ में इसका मरना और जीना है। अगर तू इसे ज़िंदा रखे तो इसकी हिफ़ाज़त कर, और मौत दे तो इसे बख्श दे। ऐ अल्लाह! मैं तुझसे आफ़ियत माँगता हूँ।',
        translationUr:
          'اے اللہ! تو نے میری جان کو پیدا کیا اور تو ہی اسے قبض کرتا ہے؛ اس کی موت و حیات تیرے ہی اختیار میں ہے۔ اگر تو اسے زندہ رکھے تو اس کی حفاظت فرما، اور اگر موت دے تو اسے بخش دے۔ اے اللہ! میں تجھ سے عافیت کا سوال کرتا ہوں۔',
        reference: 'Sahih Muslim 2712',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/103.mp3',
      },
      {
        id: 'sleep-day-of-resurrection-104',
        label: 'Right Hand Under Cheek (3x)',
        badge: 'Tirmidhi 3398',
        arabic: 'ٱللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
        transliteration: 'Allāhumma qinī ‘adhābaka yawma tab‘athu ‘ibādak (3 times)',
        translationEn:
          'O Allah, protect me from Your punishment on the Day You resurrect Your servants.',
        translationHi:
          'ऐ अल्लाह! जिस दिन तू अपने बंदों को दोबारा उठाए, उस दिन के अज़ाब से मुझे बचा लेना।',
        translationUr:
          'اے اللہ! جس دن تو اپنے بندوں کو اٹھائے گا، اس دن کے عذاب سے مجھے بچا لینا۔',
        reference: 'Sunan Abi Dawud 5045 & Tirmidhi 3398 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/104.mp3',
      },
      {
        id: 'sleep-seven-heavens-107',
        label: 'Lord of the Seven Heavens (Debt & Safety)',
        badge: 'Sahih Muslim 2713',
        arabic:
          'ٱللَّهُمَّ رَبَّ ٱلسَّمَاوَاتِ ٱلسَّبْعِ وَرَبَّ ٱلْأَرْضِ، وَرَبَّ ٱلْعَرْشِ ٱلْعَظِيمِ، رَبَّنَا وَرَبَّ كُلِّ شَيْءٍ، فَالِقَ ٱلْحَبِّ وَٱلنَّوَىٰ، وَمُنْزِلَ ٱلتَّوْرَاةِ وَٱلْإِنْجِيلِ، وَٱلْفُرْقَانِ، أَعُوذُ بِكَ مِنْ شَرِّ كُلِّ شَيْءٍ أَنْتَ آخِذٌ بِنَاصِيَتِهِ. ٱللَّهُمَّ أَنْتَ ٱلْأَوَّلُ فَلَيْسَ قَبْلَكَ شَيْءٌ، وَأَنْتَ ٱلْآخِرُ فَلَيْسَ بَعْدَكَ شَيْءٌ، وَأَنْتَ ٱلظَّاهِرُ فَلَيْسَ فَوْقَكَ شَيْءٌ، وَأَنْتَ ٱلْبَاطِنُ فَلَيْسَ دُونَكَ شَيْءٌ، ٱقْضِ عَنَّا ٱلدَّيْنَ وَأَغْنِنَا مِنَ ٱلْفَقْرِ',
        transliteration:
          'Allāhumma Rabbas-samāwātis-sab‘i wa Rabbal-arḍi wa Rabbal-‘Arshil-‘Aẓīm, Rabbanā wa Rabba kulli shay’, fāliqa-l-ḥabbi wan-nawā, wa munzilat-Tawrāti wal-Injīli wal-Furqān, a‘ūdhu bika min sharri kulli shay’in Anta ākhidhum-bināṣiyatih. Allāhumma Antal-Awwalu falaysa qablaka shay’, wa Antal-Ākhiru falaysa ba‘daka shay’, wa Antaẓ-Ẓāhiru falaysa fawqaka shay’, wa Antal-Bāṭinu falaysa dūnaka shay’, iqḍi ‘annad-dayna wa aghninā minal-faqr',
        translationEn:
          'O Allah, Lord of the seven heavens, earth, and Mighty Throne; Splitter of grain and seed; Revealer of the Torah, Gospel, and Criterion: I seek refuge in You from the evil of everything You seize by its forelock. You are the First, Last, Ascendant, and Nearest—settle our debts and enrich us from poverty.',
        translationHi:
          'ऐ सातों आसमानों, ज़मीन और अर्श-ए-अज़ीम के रब! दाने और गुठली को फाड़ने वाले, तौरात, इंजील और फ़ुरक़ान (क़ुरआन) उतारने वाले! हर उस चीज़ के शर से तेरी पनाह जो तेरे क़ब्ज़े में है। तू अव्वल, आख़िर, ज़ाहिर और बातिन है; हमारा क़र्ज़ अदा करा दे और हमें मोहताजी से ग़नी कर दे।',
        translationUr:
          'اے ساتوں آسمانوں، زمین اور عرشِ عظیم کے رب! دانے اور گٹھلی کو پھاڑنے والے، تورات، انجیل اور فرقان نازل فرمانے والے! میں ہر اس چیز کے شر سے تیری پناہ مانگتا ہوں جس کی پیشانی تیرے قبضے میں ہے۔ تو اول، آخر، ظاہر اور باطن ہے؛ ہمارا قرض ادا فرما اور ہمیں فقر سے بے نیاز کر دے۔',
        reference: 'Sahih Muslim 2713',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/107.mp3',
      },
      {
        id: 'sleep-fed-sheltered-108',
        label: 'Gratitude for Shelter & Sufficiency',
        badge: 'Sahih Muslim 2715',
        arabic:
          'ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَطْعَمَنَا وَسَقَانَا، وَكَفَانَا، وَآوَانَا، فَكَمْ مِمَّنْ لَا كَافِيَ لَهُ وَلَا مُؤْوِيَ',
        transliteration:
          'Al-ḥamdulillāhilladhī aṭ‘amanā wa saqānā, wa kafānā, wa āwānā, fakam mimman lā kāfiya lahū wa lā mu’wī',
        translationEn:
          'All praise is for Allah who fed us, gave us drink, sufficed us, and sheltered us—for how many have none to suffice or shelter them.',
        translationHi:
          'सब तारीफ़ अल्लाह के लिए है जिसने हमें खिलाया, पिलाया, हमारी किफ़ायत की और हमें ठिकाना दिया—जबकि कितने ही लोग हैं जिनका कोई सहारा और ठिकाना नहीं।',
        translationUr:
          'تمام تعریفیں اللہ کے لیے ہیں جس نے ہمیں کھلایا، پلایا، ہماری کفایت کی اور ہمیں ٹھکانا دیا؛ ورنہ کتنے ہی ایسے ہیں جن کا کوئی کفیل اور پناہ دینے والا نہیں۔',
        reference: 'Sahih Muslim 2715',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/108.mp3',
      },
      {
        id: 'sleep-unseen-knower-109',
        label: 'Refuge From Self-Harm (Knower of Unseen)',
        badge: 'Tirmidhi 3392',
        arabic:
          'ٱللَّهُمَّ عَالِمَ ٱلْغَيْبِ وَٱلشَّهَادَةِ فَاطِرَ ٱلسَّمَاوَاتِ وَٱلْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ ٱلشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَىٰ نَفْسِي سُوءًا، أَوْ أَجُرَّهُ إِلَىٰ مُسْلِمٍ',
        transliteration:
          'Allāhumma ‘Ālimal-ghaybi wash-shahādati Fāṭiras-samāwāti wal-arḍi, Rabba kulli shay’in wa Malīkah, ash-hadu al-lā ilāha illā Anta, a‘ūdhu bika min sharri nafsī wa min sharrish-shayṭāni wa shirkih, wa an aqtarifa ‘alā nafsī sū’an aw ajurrahū ilā muslim',
        translationEn:
          'O Allah, Knower of the unseen and the seen, Creator of the heavens and earth, Lord and Sovereign of all things: I seek refuge in You from the evil of my own soul, from Satan and his shirk, and from bringing harm upon myself or any Muslim.',
        translationHi:
          'ऐ गैब व हाज़िर के जानने वाले, आसमान व ज़मीन के पैदा करने वाले और हर चीज़ के मालिक अल्लाह! मैं अपने नफ़्स के शर, शैतान व उसके शिर्क और ख़ुद को या किसी मुसलमान को नुक़सान पहुँचाने से तेरी पनाह माँगता हूँ।',
        translationUr:
          'اے غیب و شہادت کے جاننے والے، آسمانوں اور زمین کے پیدا کرنے والے اور ہر چیز کے مالک اللہ! میں اپنے نفس کے شر، شیطان اور اس کے شرک سے اور خود کو یا کسی مسلمان کو نقصان پہنچانے سے تیری پناہ مانگتا ہوں۔',
        reference: 'Sunan Abi Dawud 5067 & Tirmidhi 3392 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/109.mp3',
      },
      {
        id: 'sleep-final-surrender-111',
        label: 'Final Surrender Before Sleep (Barā’)',
        badge: 'Bukhari 6311',
        arabic:
          'ٱللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ ٱلَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ ٱلَّذِي أَرْسَلْتَ',
        transliteration:
          'Allāhumma aslamtu nafsī ilayk, wa fawwaḍtu amrī ilayk, wa wajjahtu wajhī ilayk, wa alja’tu ẓahrī ilayk, raghbatan wa rahbatan ilayk, lā malja’a wa lā manja minka illā ilayk, āmantu bi-Kitābikalladhī anzalta wa bi-Nabiyyikalladhī arsalt',
        translationEn:
          'O Allah, I surrender my soul to You, entrust my affairs to You, turn my face to You, and rely completely on You—out of hope and awe of You. There is no refuge or escape from You except with You. I believe in Your Book that You revealed and Your Prophet whom You sent.',
        translationHi:
          'ऐ अल्लाह! मैंने अपनी जान तेरे सुपुर्द की, अपना मामला तुझे सौंपा, अपना रुख़ तेरी तरफ़ किया और उम्मीद व डर से तेरा ही सहारा लिया। तुझसे बचकर पनाह की जगह सिर्फ़ तुझी में है। मैं तेरी उतारी किताब और तेरे भेजे नबी पर ईमान लाया।',
        translationUr:
          'اے اللہ! میں نے اپنی جان تیرے سپرد کر دی، اپنا معاملہ تجھے سونپ دیا، اپنا رخ تیری طرف کر لیا اور امید و خوف کے ساتھ تیری ہی پناہ پکڑی۔ تجھ سے بچ کر کوئی ٹھکانا اور نجات نہیں مگر تیری ہی طرف۔ میں تیری نازل کردہ کتاب اور تیرے بھیجے ہوئے نبی پر ایمان لایا۔',
        reference: 'Sahih al-Bukhari 6311 & Muslim 2710 · Make these your last words',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/111.mp3',
      },
    ],
  },

  'dua-waking-up': {
    primaryVariantLabel: 'Bukhari 6312',
    alternates: [
      {
        id: 'wake-afani-jasadi-3',
        label: 'Restored Health & Soul (Tirmidhi 3401)',
        badge: 'Tirmidhi 3401',
        arabic: 'ٱلْحَمْدُ لِلَّهِ ٱلَّذِي عَافَانِي فِي جَسَدِي، وَرَدَّ عَلَيَّ رُوحِي، وَأَذِنَ لِي بِذِكْرِهِ',
        transliteration:
          'Al-ḥamdulillāhilladhī ‘āfānī fī jasadī, wa radda ‘alayya rūḥī, wa adhina lī bi-dhikrih',
        translationEn:
          'All praise is for Allah who restored health to my body, returned my soul to me, and permitted me to remember Him.',
        translationHi:
          'सब तारीफ़ अल्लाह के लिए है जिसने मेरे जिस्म को सेहत दी, मेरी रूह मुझे लौटाई और मुझे अपने ज़िक्र की तौफ़ीक़ दी।',
        translationUr:
          'تمام تعریفیں اللہ کے لیے ہیں جس نے میرے جسم کو عافیت دی، میری روح مجھے لوٹائی اور مجھے اپنے ذکر کی توفیق بخشی۔',
        reference: 'Jami‘ at-Tirmidhi 3401 · Hasan',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/3.mp3',
      },
      {
        id: 'wake-in-the-night-2',
        label: 'Waking During the Night (Answered Prayer)',
        badge: 'Bukhari 1154',
        arabic:
          'لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ ٱللَّهِ، وَٱلْحَمْدُ لِلَّهِ، وَلَا إِلَٰهَ إِلَّا ٱللَّهُ، وَٱللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ ٱلْعَلِيِّ ٱلْعَظِيمِ، رَبِّ ٱغْفِرْ لِي',
        transliteration:
          'Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamdu wa Huwa ‘alā kulli shay’in qadīr. Subḥānallāh, wal-ḥamdulillāh, wa lā ilāha illallāh, wallāhu Akbar, wa lā ḥawla wa lā quwwata illā billāhil-‘Aliyyil-‘Aẓīm. Rabbighfir lī',
        translationEn:
          'None has the right to be worshipped except Allah alone, without partner; His is dominion and praise and He is All-Powerful. Glory be to Allah, praise be to Allah, none is worthy of worship except Allah, Allah is the Greatest, and there is no power nor might except with Allah. My Lord, forgive me.',
        translationHi:
          'अल्लाह के सिवा कोई माबूद नहीं, वह अकेला है, उसी की बादशाही व तारीफ़ है। सुब्हानल्लाह, अल्हम्दुलिल्लाह, ला इलाहा इल्लल्लाह, अल्लाहु अकबर, ला हौला वला क़ुव्वता इल्ला बिल्लाह। ऐ मेरे रब! मुझे बख्श दे।',
        translationUr:
          'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اسی کی بادشاہی اور حمد ہے۔ سبحان اللہ، الحمد للہ، لا الہ الا اللہ، اللہ اکبر، لا حول ولا قوۃ الا باللہ۔ اے میرے رب! مجھے بخش دے۔',
        reference: 'Sahih al-Bukhari 1154 · Answered if recited upon waking at night',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/2.mp3',
      },
      {
        id: 'wake-stirring-night-112',
        label: 'Stirring / Turning Over at Night',
        badge: 'Nasa’i & Ibn Hibban',
        arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ ٱلْوَاحِدُ ٱلْقَهَّارُ، رَبُّ ٱلسَّمَاوَاتِ وَٱلْأَرْضِ وَمَا بَيْنَهُمَا ٱلْعَزِيزُ ٱلْغَفَّارُ',
        transliteration:
          'Lā ilāha illallāhul-Wāḥidul-Qahhār, Rabbus-samāwāti wal-arḍi wa mā baynahumal-‘Azīzul-Ghaffār',
        translationEn:
          'There is no deity except Allah, the One, the Prevailing, Lord of the heavens and the earth and all between them, the Exalted in Might, the Perpetual Forgiver.',
        translationHi:
          'अल्लाह के सिवा कोई माबूद नहीं, वह अकेला और सब पर ग़ालिब है; आसमानों, ज़मीन और उनके बीच की हर चीज़ का रब, ज़बरदस्त और बड़ा माफ़ करने वाला है।',
        translationUr:
          'اللہ کے سوا کوئی معبود نہیں، وہ یکتا اور سب پر غالب ہے؛ آسمانوں، زمین اور ان کے درمیان کی ہر چیز کا رب، زبردست اور بخشنے والا ہے۔',
        reference: 'Sunan an-Nasa’i al-Kubra & Al-Hakim · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/112.mp3',
      },
      {
        id: 'wake-quran-3-190-194',
        label: 'Dawn Contemplation (Qur’an 3:190–194)',
        badge: 'Bukhari 4569',
        arabic:
          'إِنَّ فِى خَلْقِ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ وَٱخْتِلَـٰفِ ٱلَّيْلِ وَٱلنَّهَارِ لَـَٔايَـٰتٍ لِّأُو۟لِى ٱلْأَلْبَـٰبِ ۝١٩٠ ٱلَّذِينَ يَذْكُرُونَ ٱللَّهَ قِيَـٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِى خَلْقِ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ رَبَّنَا مَا خَلَقْتَ هَـٰذَا بَـٰطِلًا سُبْحَـٰنَكَ فَقِنَا عَذَابَ ٱلنَّارِ ۝١٩١ رَبَّنَآ إِنَّكَ مَن تُدْخِلِ ٱلنَّارَ فَقَدْ أَخْزَيْتَهُۥ ۖ وَمَا لِلظَّـٰلِمِينَ مِنْ أَنصَارٍ ۝١٩٢ رَّبَّنَآ إِنَّنَا سَمِعْنَا مُنَادِيًا يُنَادِى لِلْإِيمَـٰنِ أَنْ ءَامِنُوا۟ بِرَبِّكُمْ فَـَٔامَنَّا ۚ رَبَّنَا فَٱغْفِرْ لَنَا ذُنُوبَنَا وَكَفِّرْ عَنَّا سَيِّـَٔاتِنَا وَتَوَفَّنَا مَعَ ٱلْأَبْرَارِ ۝١٩٣ رَبَّنَا وَءَاتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ ٱلْقِيَـٰمَةِ ۗ إِنَّكَ لَا تُخْلِفُ ٱلْمِيعَادَ ۝١٩٤',
        transliteration:
          'Inna fī khalqis-samāwāti wal-arḍi wakhtilāfil-layli wan-nahāri la’āyātil-li’ulil-albāb... Rabbanā mā khalaqta hādhā bāṭilan subḥānaka faqina ‘adhāban-nār... Rabbanā faghfir lanā dhunūbanā wa kaffir ‘annā sayyi’ātinā wa tawaffanā ma‘al-abrār...',
        translationEn:
          'Indeed, in the creation of the heavens and the earth and the alternation of night and day are signs for those of understanding—who remember Allah standing, sitting, and lying on their sides, and reflect: “Our Lord, You did not create this aimlessly; exalted are You, so protect us from the Fire, forgive our sins, and grant us what You promised through Your messengers.”',
        translationHi:
          'बेशक आसमानों व ज़मीन की पैदाइश और रात-दिन के आने-जाने में अक़्लमंदों के लिए निशानियाँ हैं—जो खड़े, बैठे और लेटे अल्लाह को याद करते हैं और दुआ करते हैं: “ऐ हमारे रब! तूने यह सब बेमक़सद नहीं बनाया, तू पाक है, हमें आग के अज़ाब से बचा और हमारे गुनाह बख्श दे।”',
        translationUr:
          'بے شک آسمانوں اور زمین کی تخلیق اور رات دن کے آنے جانے میں عقل والوں کے لیے نشانیاں ہیں—جو کھڑے، بیٹھے اور لیٹے اللہ کو یاد کرتے اور دعا کرتے ہیں: اے ہمارے رب! تو نے یہ سب بے مقصد نہیں بنایا، تو پاک ہے، ہمیں آگ کے عذاب سے بچا اور ہمارے گناہ بخش دے۔',
        reference: 'Surah Ali ‘Imran 3:190–194 · Recited by the Prophet ﷺ upon waking for Tahajjud',
        quranRef: { surahId: 3, ayahNumber: 190 },
        quranRange: { surahId: 3, startAyah: 190, endAyah: 194 },
      },
    ],
  },

  'dua-masjid-enter': {
    primaryVariantLabel: 'Entering (Short)',
    alternates: [
      {
        id: 'masjid-enter-full-20',
        label: 'Entering Masjid (Full Refuge & Salām)',
        badge: 'Abu Dawud 466',
        arabic:
          'يَبْدَأُ بِرِجْلِهِ ٱلْيُمْنَىٰ، وَيَقُولُ: أَعُوذُ بِٱللَّهِ ٱلْعَظِيمِ، وَبِوَجْهِهِ ٱلْكَرِيمِ، وَسُلْطَانِهِ ٱلْقَدِيمِ، مِنَ ٱلشَّيْطَانِ ٱلرَّجِيمِ، بِسْمِ ٱللَّهِ، وَٱلصَّلَاةُ وَٱلسَّلَامُ عَلَىٰ رَسُولِ ٱللَّهِ، ٱللَّهُمَّ ٱفْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
        transliteration:
          'A‘ūdhu billāhil-‘Aẓīm, wa bi-wajhihil-karīm, wa sulṭānihil-qadīm, minash-shayṭānir-rajīm. Bismillāh, waṣ-ṣalātu was-salāmu ‘alā Rasūlillāh, Allāhummaf-taḥ lī abwāba raḥmatik',
        translationEn:
          'Step in with the right foot saying: I seek refuge in Allah the Supreme, His Noble Face, and His eternal authority from the accursed Satan. In the name of Allah, blessings and peace upon His Messenger; O Allah, open the doors of Your mercy for me.',
        translationHi:
          'दाहिने पैर से दाख़िल हों और कहें: मैं अज़ीम अल्लाह, उसके करीम चेहरे और उसकी क़दीम बादशाही की पनाह माँगता हूँ शैतान मरदूद से; बिस्मिल्लाह, रसूलुल्लाह ﷺ पर दरूद व सलाम; ऐ अल्लाह मेरे लिए अपनी रहमत के दरवाज़े खोल दे।',
        translationUr:
          'دائیں پاؤں سے داخل ہوں اور کہیں: میں عظیم اللہ، اس کے کریم چہرے اور اس کی قدیم سلطنت کی پناہ مانگتا ہوں شیطان مردود سے؛ اللہ کے نام سے، درود و سلام ہو رسول اللہ ﷺ پر؛ اے اللہ میرے لیے اپنی رحمت کے دروازے کھول دے۔',
        reference: 'Sunan Abi Dawud 465–466 & Sahih Muslim 713',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/20.mp3',
      },
      {
        id: 'masjid-leave-21',
        label: 'Leaving Masjid (Your Bounty)',
        badge: 'Left Foot · Muslim 713',
        arabic:
          'يَبْدَأُ بِرِجْلِهِ ٱلْيُسْرَىٰ وَيَقُولُ: بِسْمِ ٱللَّهِ وَٱلصَّلَاةُ وَٱلسَّلَامُ عَلَىٰ رَسُولِ ٱللَّهِ، ٱللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ، ٱللَّهُمَّ ٱعْصِمْنِي مِنَ ٱلشَّيْطَانِ ٱلرَّجِيمِ',
        transliteration:
          'Bismillāhi waṣ-ṣalātu was-salāmu ‘alā Rasūlillāh, Allāhumma innī as’aluka min faḍlik, Allāhumma‘-ṣimnī minash-shayṭānir-rajīm',
        translationEn:
          'Step out with the left foot saying: In the name of Allah, prayers and peace upon the Messenger of Allah. O Allah, I ask You from Your bounty; O Allah, guard me from the accursed Satan.',
        translationHi:
          'बाएँ पैर से बाहर निकलते वक़्त कहें: अल्लाह के नाम से, रसूलुल्लाह ﷺ पर दरूद व सलाम, ऐ अल्लाह मैं तुझसे तेरे फ़ज़्ल का सवाल करता हूँ और शैतान से तेरी हिफ़ाज़त माँगता हूँ।',
        translationUr:
          'بائیں پاؤں سے نکلتے وقت کہیں: اللہ کے نام سے، رسول اللہ ﷺ پر درود و سلام، اے اللہ میں تجھ سے تیرا فضل مانگتا ہوں، اے اللہ مجھے شیطان مردود سے محفوظ رکھ۔',
        reference: 'Sahih Muslim 713 & Ibn Majah 773',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/21.mp3',
      },
      {
        id: 'masjid-dua-of-light-19',
        label: 'Going to Masjid (Dua of Light)',
        badge: 'Bukhari 6316',
        arabic:
          'ٱللَّهُمَّ ٱجْعَلْ فِي قَلْبِي نُوراً، وَفِي لِسَانِي نُوراً، وَفِي سَمْعِي نُوراً، وَفِي بَصَرِي نُوراً، وَمِنْ فَوْقِي نُوراً، وَمِنْ تَحْتِي نُوراً، وَعَنْ يَمِينِي نُوراً، وَعَنْ شِمَالِي نُوراً، وَمِنْ أَمَامِي نُوراً، وَمِنْ خَلْفِي نُوراً، وَٱجْعَلْ فِي نَفْسِي نُوراً، وَأَعْظِمْ لِي نُوراً، وَعَظِّمْ لِي نُوراً، وَٱجْعَلْ لِي نُوراً، وَٱجْعَلْنِي نُوراً، ٱللَّهُمَّ أَعْطِنِي نُوراً، وَٱجْعَلْ فِي عَصَبِي نُوراً، وَفِي لَحْمِي نُوراً، وَفِي دَمِي نُوراً، وَفِي شَعْرِي نُوراً، وَفِي بَشَرِي نُوراً ٱللَّهُمَّ ٱجْعَلْ لِي نُوراً فِي قَبْرِي وَنُوراً فِي عِظَامِي وَزِدْنِي نُوراً، وَزِدْنِي نُوراً، وَزِدْنِي نُوراً وَهَبْ لِي نُوراً عَلَىٰ نُورٍ',
        transliteration:
          'Allāhummaj-‘al fī qalbī nūran, wa fī lisānī nūran, wa fī sam‘ī nūran, wa fī baṣarī nūran... wa hab lī nūran ‘alā nūr',
        translationEn:
          'O Allah, place light in my heart, on my tongue, in my hearing, in my sight, above me, below me, to my right and left, before and behind me; place light in my soul, bones, flesh, blood, hair, and skin, and grant me light upon light.',
        translationHi:
          'ऐ अल्लाह! मेरे दिल में नूर, ज़बान, कान, आँख, ऊपर, नीचे, दाएँ, बाएँ, आगे, पीछे और मेरे जिस्म के हर हिस्से में नूर अता फ़रमा और मुझे नूर पर नूर अता कर।',
        translationUr:
          'اے اللہ! میرے دل، زبان، سماعت، بصارت، اوپر، نیچے، دائیں، بائیں، آگے، پیچھے اور میرے رگ و پے اور پورے وجود میں نور بھر دے اور مجھے نور پر نور عطا فرما۔',
        reference: 'Sahih al-Bukhari 6316 & Muslim 763 · Heading to Prayer',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/19.mp3',
      },
    ],
  },

  'dua-travel': {
    primaryVariantLabel: 'Qur’an 43:13–14 (Exact Sync)',
    alternates: [
      {
        id: 'travel-mounting-206',
        label: 'When Mounting a Ride (Abu Dawud)',
        badge: 'Abu Dawud 2602',
        arabic:
          'بِسْمِ ٱللَّهِ، وَٱلْحَمْدُ لِلَّهِ، سُبْحَانَ ٱلَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ، ٱلْحَمْدُ لِلَّهِ، ٱلْحَمْدُ لِلَّهِ، ٱلْحَمْدُ لِلَّهِ، ٱللَّهُ أَكْبَرُ، ٱللَّهُ أَكْبَرُ، ٱللَّهُ أَكْبَرُ، سُبْحَانَكَ ٱللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي فَٱغْفِرْ لِي؛ فَإِنَّهُ لَا يَغْفِرُ ٱلذُّنُوبَ إِلَّا أَنْتَ',
        transliteration:
          'Bismillāh, wal-ḥamdulillāh, Subḥānalladhī sakhkhara lanā hādhā wa mā kunnā lahū muqrinīn, wa innā ilā Rabbinā lamunqalibūn. Al-ḥamdulillāh (3x), Allāhu Akbar (3x), Subḥānaka Allāhumma innī ẓalamtu nafsī faghfir lī, fa’innahū lā yaghfirudh-dhunūba illā Anta',
        translationEn:
          'In the name of Allah, praise be to Allah. Glory to Him who subjected this to us while we could never have subdued it, and to our Lord we return. Alhamdulillah (3x), Allahu Akbar (3x); glory to You, O Allah, I have wronged myself, so forgive me, for none forgives sins except You.',
        translationHi:
          'बिस्मिल्लाह, अल्हम्दुलिल्लाह, पाक है वह जिसने इसे हमारे बस में कर दिया; अल्हम्दुलिल्लाह (3x), अल्लाहु अकबर (3x); ऐ अल्लाह मैंने अपने ऊपर ज़ुल्म किया, मुझे बख्श दे, तेरे सिवा कोई गुनाह माफ़ नहीं करता।',
        translationUr:
          'بسم اللہ، الحمد للہ، پاک ہے وہ ذات جس نے اسے ہمارے بس میں کر دیا؛ الحمد للہ (3 بار)، اللہ اکبر (3 بار)؛ اے اللہ میں نے اپنی جان پر ظلم کیا، مجھے معاف فرما کیونکہ تیرے سوا کوئی گناہ معاف نہیں کر سکتا۔',
        reference: 'Sunan Abi Dawud 2602 & Tirmidhi 3446 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/206.mp3',
      },
      {
        id: 'travel-full-muslim-207',
        label: 'Full Travel Prayer (Sahih Muslim 1342)',
        badge: 'Full Journey Dua',
        arabic:
          'ٱللَّهُ أَكْبَرُ، ٱللَّهُ أَكْبَرُ، ٱللَّهُ أَكْبَرُ، سُبْحَانَ ٱلَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ، ٱللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَٰذَا ٱلْبِرَّ وَٱلتَّقْوَىٰ، وَمِنَ ٱلْعَمَلِ مَا تَرْضَىٰ، ٱللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَٰذَا وَٱطْوِ عَنَّا بُعْدَهُ، ٱللَّهُمَّ أَنْتَ ٱلصَّاحِبُ فِي ٱلسَّفَرِ، وَٱلْخَلِيفَةُ فِي ٱلْأَهْلِ، ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ ٱلسَّفَرِ، وَكَآبَةِ ٱلْمَنْظَرِ، وَسُوءِ ٱلْمُنْقَلَبِ فِي ٱلْمَالِ وَٱلْأَهْلِ، وَإِذَا رَجَعَ قَالَهُنَّ وَزَادَ فِيهِنَّ: آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ',
        transliteration:
          'Allāhu Akbar (3x), Subḥānalladhī sakhkhara lanā hādhā... Allāhumma innā nas’aluka fī safarinā hādhal-birra wat-taqwā, wa minal-‘amali mā tarḍā, Allāhumma hawwin ‘alaynā safaranā hādhā waṭwi ‘annā bu‘dah, Allāhumma Antaṣ-Ṣāḥibu fis-safari wal-khalīfatu fil-ahl... Āyibūna tā’ibūna ‘ābidūna li-Rabbinā ḥāmidūn',
        translationEn:
          'Allahu Akbar (3x). Glory be to Him who subjected this to us. O Allah, we ask You in this journey for righteousness, piety, and deeds pleasing to You. Make this journey easy and shorten its distance for us; You are the Companion on the road and the Guardian over our family, and we seek refuge in You from hardship, distressing sights, and misfortune upon returning.',
        translationHi:
          'अल्लाहु अकबर (3x)। ऐ अल्लाह! हम इस सफ़र में तुझसे नेकी, तक़वा और तेरी रज़ा वाले काम माँगते हैं। इस सफ़र को आसान कर और इसकी दूरी कम कर दे; सफ़र में तू हमारा साथी और घर में हमारा निगहबान है। हम सफ़र की मशक़्क़त और बुरी वापसी से तेरी पनाह माँगते हैं।',
        translationUr:
          'اللہ اکبر (3 بار)۔ اے اللہ! ہم اس سفر میں تجھ سے نیکی، تقویٰ اور تیری پسند کے عمل مانگتے ہیں۔ یہ سفر آسان فرما اور اس کی مسافت لپیٹ دے؛ سفر میں تو ہمارا رفیق اور گھر والوں میں ہمارا نگہبان ہے۔ ہم سفر کی تکلیف اور برے حال میں واپسی سے تیری پناہ مانگتے ہیں۔',
        reference: 'Sahih Muslim 1342',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/207.mp3',
      },
      {
        id: 'travel-return-217',
        label: 'Returning Home From a Journey',
        badge: 'Bukhari & Muslim',
        arabic:
          'يُكَبِّرُ عَلَىٰ كُلِّ شَرَفٍ ثَلَاثَ تَكْبِيرَاتٍ ثُمَّ يَقُولُ: لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ، وَلَهُ ٱلْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ، صَدَقَ ٱللَّهُ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ ٱلْأَحْزَابَ وَحْدَهُ',
        transliteration:
          'Allāhu Akbar (3x on high ground) — Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa Huwa ‘alā kulli shay’in qadīr, āyibūna, tā’ibūna, ‘ābidūna, li-Rabbinā ḥāmidūn, ṣadaqallāhu wa‘dah, wa naṣara ‘abdah, wa hazamal-aḥzāba waḥdah',
        translationEn:
          'Say Allahu Akbar three times at each rise, then: None has the right to be worshipped except Allah alone without partner; we return, repenting, worshipping, and praising our Lord. Allah fulfilled His promise, aided His servant, and defeated the confederates alone.',
        translationHi:
          'हर ऊँचाई पर 3 बार अल्लाहु अकबर कहें, फिर: अल्लाह के सिवा कोई माबूद नहीं; हम लौट रहे हैं तौबा करते हुए, इबादत करते हुए, अपने रब की तारीफ़ करते हुए। अल्लाह ने अपना वादा सच कर दिखाया।',
        translationUr:
          'ہر بلندی پر 3 بار اللہ اکبر کہے، پھر: اللہ کے سوا کوئی معبود نہیں؛ ہم واپس آ رہے ہیں توبہ کرتے ہوئے، عبادت کرتے ہوئے اور اپنے رب کی حمد کرتے ہوئے۔ اللہ نے اپنا وعدہ سچا کر دکھایا۔',
        reference: 'Sahih al-Bukhari 1797 & Muslim 1344',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/217.mp3',
      },
      {
        id: 'travel-hills-214',
        label: 'Ascending & Descending Hills',
        badge: 'Bukhari 2993',
        arabic: 'قَالَ جَابِرٌ رَضِيَ ٱللَّهُ عَنْهُ: كُنَّا إِذَا صَعِدْنَا كَبَّرْنَا، وَإِذَا نَزَلْنَا سَبَّحْنَا',
        transliteration:
          'Jabir (RA) said: Whenever we ascended we said Allāhu Akbar, and whenever we descended we said Subḥānallāh',
        translationEn:
          'Jabir (may Allah be pleased with him) reported: Whenever we climbed upward we declared “Allahu Akbar” (Allah is Greatest), and whenever we descended we declared “SubhanAllah” (Glory be to Allah).',
        translationHi:
          'हज़रत जाबिर (रज़ि.) फ़रमाते हैं: जब हम ऊँचाई पर चढ़ते तो “अल्लाहु अकबर” कहते और जब नीचे उतरते तो “सुब्हानल्लाह” कहते थे।',
        translationUr:
          'حضرت جابر رضی اللہ عنہ فرماتے ہیں: جب ہم بلندی پر چڑھتے تو اللہ اکبر کہتے اور جب نیچے اترتے تو سبحان اللہ کہتے۔',
        reference: 'Sahih al-Bukhari 2993',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/214.mp3',
      },
      {
        id: 'travel-dawn-215',
        label: 'Traveler’s Dua at Dawn',
        badge: 'Muslim 2718',
        arabic:
          'سَمَّعَ سَامِعٌ بِحَمْدِ ٱللَّهِ، وَحُسْنِ بَلَائِهِ عَلَيْنَا، رَبَّنَا صَاحِبْنَا، وَأَفْضِلْ عَلَيْنَا، عَائِذاً بِٱللَّهِ مِنَ ٱلنَّارِ',
        transliteration:
          'Sami‘a sāmi‘un bi-ḥamdillāhi wa ḥusni balā’ihī ‘alaynā, Rabbanā ṣāḥibnā wa afḍil ‘alaynā, ‘ā’idhan billāhi minan-nār',
        translationEn:
          'May a witness bear witness to our praise of Allah and His gracious testing and favors upon us. Our Lord, accompany us and bestow Your grace upon us—while I seek refuge in Allah from the Fire.',
        translationHi:
          'एक सुनने वाले ने अल्लाह की तारीफ़ और हमारे ऊपर उसके बेहतरीन एहसानात की गवाही दी। ऐ हमारे रब! सफ़र में हमारा साथ दे, हम पर फ़ज़्ल फ़रमा; मैं आग से अल्लाह की पनाह माँगता हूँ।',
        translationUr:
          'ایک سننے والے نے اللہ کی حمد اور ہم پر اس کے حسین احسانات کی گواہی دی۔ اے ہمارے رب! ہمارا ساتھ فرما اور ہم پر فضل فرما؛ میں آگ سے اللہ کی پناہ مانگتا ہوں۔',
        reference: 'Sahih Muslim 2718',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/215.mp3',
      },
    ],
  },

  'dua-after-adhan': {
    primaryVariantLabel: 'Wasīlah (Bukhari 614)',
    alternates: [
      {
        id: 'adhan-contentment-23',
        label: 'During Tashahhud of Adhan (Raḍītu billāh)',
        badge: 'Muslim 386',
        arabic:
          'يَقُولُ: وَأَنَا أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَنَّ مُحَمَّداً عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِٱللَّهِ رَبّاً، وَبِمُحَمَّدٍ رَسُولاً، وَبِٱلْإِسْلَامِ دِيناً يَقُولُ ذَلِكَ عَقِبَ تَشَهُّدِ ٱلْمُؤَذِّنِ',
        transliteration:
          'Wa ana ash-hadu al-lā ilāha illallāhu waḥdahū lā sharīka lah, wa anna Muḥammadan ‘abduhū wa rasūluh, raḍītu billāhi Rabban, wa bi-Muḥammadin rasūlan, wa bil-Islāmi dīnā',
        translationEn:
          'Right after the mu’adhdhin’s testimony of faith say: And I too bear witness that there is no deity except Allah alone without partner and Muhammad is His servant and Messenger; I am pleased with Allah as Lord, Muhammad as Messenger, and Islam as religion.',
        translationHi:
          'मुअज़्ज़िन की गवाही के बाद कहें: मैं भी गवाही देता हूँ कि अल्लाह के सिवा कोई माबूद नहीं और मुहम्मद ﷺ उसके बंदे व रसूल हैं; मैं अल्लाह को रब, मुहम्मद ﷺ को रसूल और इस्लाम को दीन मानकर राज़ी हूँ।',
        translationUr:
          'مؤذن کی شہادت کے بعد کہے: میں بھی گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں اور محمد ﷺ اس کے بندے اور رسول ہیں؛ میں اللہ کے رب، محمد ﷺ کے رسول اور اسلام کے دین ہونے پر راضی ہوں۔',
        reference: 'Sahih Muslim 386 · Forgiveness of previous sins',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/23.mp3',
      },
      {
        id: 'adhan-hayya-ala-22',
        label: 'Responding to Ḥayya ‘alaṣ-Ṣalāh',
        badge: 'Bukhari 611 · Muslim 385',
        arabic:
          'يَقُولُ مِثْلَ مَا يَقُولُ ٱلْمُؤَذِّنُ إِلَّا فِي حَيَّ عَلَىٰ ٱلصَّلَاةِ وَحَيَّ عَلَىٰ ٱلْفَلَاحِ فَيَقُولُ: لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ',
        transliteration:
          'Repeat the mu’adhdhin’s words, except after Ḥayya ‘alaṣ-Ṣalāh / Ḥayya ‘alal-Falāḥ say: Lā ḥawla wa lā quwwata illā billāh',
        translationEn:
          'Repeat every phrase of the Adhan after the caller, except upon hearing “Come to prayer” and “Come to success,” respond: “There is no might nor power except through Allah.”',
        translationHi:
          'मुअज़्ज़िन के हर कलिमे को दोहराएँ, सिवाय “हय्या अलस्सलाह” और “हय्या अलल फ़लाह” के जवाब में कहें: “ला हौला वला क़ुव्वता इल्ला बिल्लाह।”',
        translationUr:
          'مؤذن کے ہر کلمے کا جواب دیں، سوائے حی علی الصلاۃ اور حی علی الفلاح کے جواب میں کہیں: لا حول ولا قوۃ الا باللہ۔',
        reference: 'Sahih al-Bukhari 611 & Muslim 385',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/22.mp3',
      },
    ],
  },

  'dua-before-salam': {
    primaryVariantLabel: '4 Refuges (Muslim 588)',
    alternates: [
      {
        id: 'salam-sin-debt-56',
        label: 'Refuge From Sin & Debt (Bukhari 832)',
        badge: 'Al-Ma’tham wal-Maghram',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ ٱلْقَبْرِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ ٱلْمَسِيحِ ٱلدَّجَّالِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ ٱلْمَحْيَا وَٱلْمَمَاتِ. ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ ٱلْمَأْثَمِ وَٱلْمَغْرَمِ',
        transliteration:
          'Allāhumma innī a‘ūdhu bika min ‘adhābil-qabri, wa a‘ūdhu bika min fitnatil-masīḥid-dajjāl, wa a‘ūdhu bika min fitnatil-maḥyā wal-mamāt. Allāhumma innī a‘ūdhu bika minal-ma’thami wal-maghram',
        translationEn:
          'O Allah, I seek refuge in You from the punishment of the grave, the trial of the False Messiah, and the trials of life and death. O Allah, I seek refuge in You from sin and overwhelming debt.',
        translationHi:
          'ऐ अल्लाह! मैं क़ब्र के अज़ाब, दज्जाल के फ़ितने और ज़िंदगी व मौत की आज़माइश से तेरी पनाह माँगता हूँ। ऐ अल्लाह! मैं गुनाह और क़र्ज़ के बोझ से तेरी पनाह माँगता हूँ।',
        translationUr:
          'اے اللہ! میں قبر کے عذاب، دجال کے فتنے اور زندگی و موت کے فتنوں سے تیری پناہ مانگتا ہوں۔ اے اللہ! میں گناہ اور قرض کے بوجھ سے تیری پناہ مانگتا ہوں۔',
        reference: 'Sahih al-Bukhari 832 & Muslim 589',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/56.mp3',
      },
      {
        id: 'salam-abu-bakr-57',
        label: 'Abu Bakr’s Dua (Ẓalamtu Nafsī)',
        badge: 'Bukhari 834',
        arabic:
          'ٱللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْماً كَثِيراً، وَلَا يَغْفِرُ ٱلذُّنُوبَ إِلَّا أَنْتَ، فَٱغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ وَٱرْحَمْنِي، إِنَّكَ أَنْتَ ٱلْغَفُورُ ٱلرَّحِيمُ',
        transliteration:
          'Allāhumma innī ẓalamtu nafsī ẓulman kathīran, wa lā yaghfirudh-dhunūba illā Anta, faghfir lī maghfiratam-min ‘indika warḥamnī, innaka Antal-Ghafūrur-Raḥīm',
        translationEn:
          'O Allah, I have greatly wronged myself, and none forgives sins except You. So grant me forgiveness from Yourself and have mercy upon me; indeed, You are the All-Forgiving, Most Merciful.',
        translationHi:
          'ऐ अल्लाह! मैंने अपने ऊपर बहुत ज़ुल्म किया और तेरे सिवा कोई गुनाह बख्शने वाला नहीं, तो मुझे अपनी तरफ़ से ख़ास मग़फ़िरत अता कर और मुझ पर रहम फ़रमा; बेशक तू बख्शने वाला मेहरबान है।',
        translationUr:
          'اے اللہ! میں نے اپنی جان پر بہت ظلم کیا اور تیرے سوا کوئی گناہ بخشنے والا نہیں، پس اپنی خاص مغفرت سے مجھے بخش دے اور مجھ پر رحم فرما؛ بے شک تو بخشنے والا مہربان ہے۔',
        reference: 'Sahih al-Bukhari 834 & Muslim 2705 · Taught to Abu Bakr (RA)',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/57.mp3',
      },
      {
        id: 'salam-all-sins-58',
        label: 'Past, Future & Hidden Sins (Muslim 771)',
        badge: 'Al-Muqaddim',
        arabic:
          'ٱللَّهُمَّ ٱغْفِرْ لِي مَا قَدَّمْتُ، وَمَا أَخَّرْتُ، وَمَا أَسْرَرْتُ، وَمَا أَعْلَنْتُ، وَمَا أَسْرَفْتُ، وَمَا أَنْتَ أَعْلَمُ بِهِ مِنِّي. أَنْتَ ٱلْمُقَدِّمُ، وَأَنْتَ ٱلْمُؤَخِّرُ لَا إِلَٰهَ إِلَّا أَنْتَ',
        transliteration:
          'Allāhummaghfir lī mā qaddamtu wa mā akhkhartu wa mā asrartu wa mā a‘lantu wa mā asraftu wa mā Anta a‘lamu bihī minnī. Antal-Muqaddimu wa Antal-Mu’akhkhiru lā ilāha illā Anta',
        translationEn:
          'O Allah, forgive me for what I sent ahead and left behind, what I concealed and revealed, where I exceeded bounds, and what You know better than I. You are the Advancer and the Delayer; there is no deity except You.',
        translationHi:
          'ऐ अल्लाह! मेरे अगले-पिछले, छुपे-ज़ाहिर, हद से बढ़े हुए और जो तू मुझसे ज़्यादा जानता है वह सब गुनाह माफ़ फ़रमा। तू ही आगे बढ़ाने और पीछे रखने वाला है; तेरे सिवा कोई माबूद नहीं।',
        translationUr:
          'اے اللہ! میرے اگلے پچھلے، پوشیدہ و ظاہر، حد سے بڑھے ہوئے اور جو تو مجھ سے زیادہ جانتا ہے سب گناہ معاف فرما۔ تو ہی آگے بڑھانے والا اور پیچھے ہٹانے والا ہے؛ تیرے سوا کوئی معبود نہیں۔',
        reference: 'Sahih Muslim 771 · Also recited in Salah',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/58.mp3',
      },
      {
        id: 'salam-remembrance-59',
        label: 'Aid in Dhikr, Shukr & Worship (Mu‘ādh)',
        badge: 'Abu Dawud 1522',
        arabic: 'ٱللَّهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ',
        transliteration: 'Allāhumma a‘innī ‘alā dhikrika, wa shukrika, wa ḥusni ‘ibādatik',
        translationEn:
          'O Allah, help me to remember You, to give thanks to You, and to worship You in the best of ways.',
        translationHi:
          'ऐ अल्लाह! अपने ज़िक्र, अपने शुक्र और बेहतरीन इबादत करने पर मेरी मदद फ़रमा।',
        translationUr:
          'اے اللہ! اپنے ذکر، اپنے شکر اور بہترین عبادت کرنے پر میری مدد فرما۔',
        reference: 'Sunan Abi Dawud 1522 · Taught to Mu‘ādh ibn Jabal (RA)',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/59.mp3',
      },
      {
        id: 'salam-feeble-old-age-60',
        label: 'Refuge From Miserliness & Senility',
        badge: 'Bukhari 2822',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ ٱلْبُخْلِ، وَأَعُوذُ بِكَ مِنَ ٱلْجُبْنِ، وَأَعُوذُ بِكَ مِنْ أَنْ أُرَدَّ إِلَىٰ أَرْذَلِ ٱلْعُمُرِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ ٱلدُّنْيَا وَعَذَابِ ٱلْقَبْرِ',
        transliteration:
          'Allāhumma innī a‘ūdhu bika minal-bukhli wa minal-jubni wa an uradda ilā ardhalil-‘umur, wa a‘ūdhu bika min fitnatid-dunyā wa ‘adhābil-qabr',
        translationEn:
          'O Allah, I seek refuge in You from miserliness, cowardice, being returned to decrepit old age, the trials of this world, and the punishment of the grave.',
        translationHi:
          'ऐ अल्लाह! मैं कंजूसी, बुज़दिली, बेहद कमज़ोर बुढ़ापे, दुनिया के फ़ितने और क़ब्र के अज़ाब से तेरी पनाह माँगता हूँ।',
        translationUr:
          'اے اللہ! میں بخل، بزدلی، ناکارہ بڑھاپے، دنیا کے فتنے اور قبر کے عذاب سے تیری پناہ مانگتا ہوں۔',
        reference: 'Sahih al-Bukhari 2822',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/60.mp3',
      },
      {
        id: 'salam-jannah-nar-61',
        label: 'Asking Paradise & Fire Refuge',
        badge: 'Abu Dawud 792',
        arabic: 'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ ٱلْجَنَّةَ وَأَعُوذُ بِكَ مِنَ ٱلنَّارِ',
        transliteration: 'Allāhumma innī as’alukal-jannata wa a‘ūdhu bika minan-nār',
        translationEn: 'O Allah, I ask You for Paradise and seek Your refuge from the Fire.',
        translationHi: 'ऐ अल्लाह! मैं तुझसे जन्नत माँगता हूँ और जहन्नम की आग से तेरी पनाह चाहता हूँ।',
        translationUr: 'اے اللہ! میں تجھ سے جنت کا سوال کرتا ہوں اور آگ سے تیری پناہ مانگتا ہوں۔',
        reference: 'Sunan Abi Dawud 792 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/61.mp3',
      },
      {
        id: 'salam-ammar-comprehensive-62',
        label: 'Comprehensive Fear, Truth & Joy of Seeing Allah',
        badge: 'Nasa’i 1305',
        arabic:
          'ٱللَّهُمَّ بِعِلْمِكَ ٱلْغَيْبَ وَقُدْرَتِكَ عَلَىٰ ٱلْخَلْقِ أَحْيِنِي مَا عَلِمْتَ ٱلْحَيَاةَ خَيْراً لِي، وَتَوَفَّنِي إِذَا عَلِمْتَ ٱلْوَفَاةَ خَيْراً لِي، ٱللَّهُمَّ إِنِّي أَسْأَلُكَ خَشْيَتَكَ فِي ٱلْغَيْبِ وَٱلشَّهَادَةِ، وَأَسْأَلُكَ كَلِمَةَ ٱلْحَقِّ فِي ٱلرِّضَا وَٱلْغَضَبِ، وَأَسْأَلُكَ ٱلْقَصْدَ فِي ٱلْغِنَىٰ وَٱلْفَقْرِ، وَأَسْأَلُكَ نَعِيماً لَا يَنْفَدُ، وَأَسْأَلُكَ قُرَّةَ عَيْنٍ لَا تَنْقَطِعُ، وَأَسْأَلُكَ ٱلرِّضَا بَعْدَ ٱلْقَضَاءِ، وَأَسْأَلُكَ بَرْدَ ٱلْعَيْشِ بَعْدَ ٱلْمَوْتِ، وَأَسْأَلُكَ لَذَّةَ ٱلنَّظَرِ إِلَىٰ وَجْهِكَ، وَٱلشَّوْقَ إِلَىٰ لِقَائِكَ فِي غَيْرِ ضَرَّاءَ مُضِرَّةٍ، وَلَا فِتْنَةٍ مُضِلَّةٍ، ٱللَّهُمَّ زَيِّنَّا بِزِينَةِ ٱلْإِيمَانِ، وَٱجْعَلْنَا هُدَاةً مُهْتَدِينَ',
        transliteration:
          'Allāhumma bi-‘ilmikal-ghayba wa qudratika ‘alal-khalqi aḥyinī mā ‘alimtal-ḥayāta khayral-lī... wa as’aluka ladhdhatan-naẓari ilā Wajhika wash-shawqa ilā liqā’ika fī ghayri ḍarrā’a muḍirratin wa lā fitnatin muḍillah, Allāhumma zayyinnā bi-zīnatil-īmān waj‘alnā hudātam-muhtadīn',
        translationEn:
          'O Allah, by Your knowledge of the unseen and power over creation, keep me alive while life is best for me and take me when death is best. Grant me fear of You in private and public, the word of truth in contentment and anger, moderation in wealth and poverty, unending bliss, contentment after decree, cool comfort after death, the joy of gazing upon Your Face, and longing to meet You without harm or misleading trial.',
        translationHi:
          'ऐ अल्लाह! अपने गैब के इल्म और मख़लूक़ पर क़ुदरत के वास्ते मुझे तब तक ज़िंदा रख जब तक ज़िंदगी मेरे लिए बेहतर हो। मुझे छुपे-ज़ाहिर में तेरा ख़ौफ़, ख़ुशी-ग़ुस्से में सच बात, अमीरी-ग़रीबी में मियाना-रवी, फ़ैसले पर राज़ी रहना, मौत के बाद सुकून और तेरे दीदार की लज़्ज़त अता फ़रमा।',
        translationUr:
          'اے اللہ! اپنے علمِ غیب اور مخلوق پر قدرت کے واسطے مجھے تب تک زندہ رکھ جب تک زندگی میرے لیے بہتر ہو۔ مجھے خلوت و جلوت میں تیری خشیت، خوشی و غصے میں حق بات، امیری و غریبی میں میانہ روی، قضا پر رضا، موت کے بعد خوشگوار زندگی اور تیرے دیدار کی لذت عطا فرما۔',
        reference: 'Sunan an-Nasa’i 1305 · Sahih (‘Ammār ibn Yāsir)',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/62.mp3',
      },
      {
        id: 'salam-al-ahad-samad-63',
        label: 'By Allah the One & Eternal (Al-Aḥad aṣ-Ṣamad)',
        badge: 'Ibn Majah 3857',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ يَا أَللَّهُ بِأَنَّكَ ٱلْوَاحِدُ ٱلْأَحَدُ ٱلصَّمَدُ ٱلَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُنْ لَهُ كُفُواً أَحَدٌ، أَنْ تَغْفِرَ لِي ذُنُوبِي إِنَّكَ أَنْتَ ٱلْغَفُورُ ٱلرَّحِيمُ',
        transliteration:
          'Allāhumma innī as’aluka yā Allāh bi’annakal-Wāḥidul-Aḥaduṣ-Ṣamadulladhī lam yalid wa lam yūlad wa lam yakul-lahū kufuwan aḥad, an taghfira lī dhunūbī innaka Antal-Ghafūrur-Raḥīm',
        translationEn:
          'O Allah, I ask You by the fact that You are the One, the Eternal Refuge who neither begets nor is born and has no equal: forgive my sins, for You are the All-Forgiving, Most Merciful.',
        translationHi:
          'ऐ अल्लाह! मैं तुझसे इस वसीले से सवाल करता हूँ कि तू एक, बेनियाज़ है, न तूने किसी को जना और न तू जना गया; मेरे गुनाह माफ़ फ़रमा दे, बेशक तू बख्शने वाला मेहरबान है।',
        translationUr:
          'اے اللہ! میں تجھ سے تیرے واحد، احد اور بے نیاز ہونے کے واسطے سے سوال کرتا ہوں کہ میرے گناہ بخش دے؛ بے شک تو بڑا بخشنے والا نہایت رحم والا ہے۔',
        reference: 'Sunan an-Nasa’i 1301 & Ibn Majah 3857 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/63.mp3',
      },
      {
        id: 'salam-al-mannan-64',
        label: 'By Praise & Ismul-A‘ẓam (Al-Mannān)',
        badge: 'Abu Dawud 1495',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنَّ لَكَ ٱلْحَمْدَ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، ٱلْمَنَّانُ، يَا بَدِيعَ ٱلسَّمَاوَاتِ وَٱلْأَرْضِ يَا ذَا ٱلْجَلَالِ وَٱلْإِكْرَامِ، يَا حَيُّ يَا قَيُّومُ إِنِّي أَسْأَلُكَ ٱلْجَنَّةَ وَأَعُوذُ بِكَ مِنَ ٱلنَّارِ',
        transliteration:
          'Allāhumma innī as’aluka bi-anna lakal-ḥamda lā ilāha illā Anta waḥdaka lā sharīka lakal-Mannān, yā Badī‘as-samāwāti wal-arḍ, yā Dhal-Jalāli wal-Ikrām, yā Ḥayyu yā Qayyūm, innī as’alukal-jannata wa a‘ūdhu bika minan-nār',
        translationEn:
          'O Allah, I ask You since all praise belongs to You alone—the Bestower, Originator of heavens and earth, Possessor of Majesty and Honor, Ever-Living, Sustainer: grant me Paradise and protect me from the Fire.',
        translationHi:
          'ऐ अल्लाह! सब तारीफ़ तेरे ही लिए है, तू सबसे बड़ा एहसान करने वाला, आसमान व ज़मीन का पैदा करने वाला, जलाल व बुज़ुर्गी वाला और ज़िंदा व क़ायम है; मैं तुझसे जन्नत माँगता हूँ और आग से पनाह चाहता हूँ।',
        translationUr:
          'اے اللہ! تمام تعریفیں تیرے لیے ہیں، تو احسان فرمانے والا، آسمانوں و زمین کا موجد، عظمت و بزرگی والا اور حی و قیوم ہے؛ میں تجھ سے جنت کا سوال کرتا ہوں اور آگ سے پناہ مانگتا ہوں۔',
        reference: 'Sunan Abi Dawud 1495 & Nasa’i 1300 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/64.mp3',
      },
      {
        id: 'salam-witness-oneness-65',
        label: 'Supplicating by Tawḥīd (Ismul-A‘ẓam)',
        badge: 'Tirmidhi 3475',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنِّي أَشْهَدُ أَنَّكَ أَنْتَ ٱللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ ٱلْأَحَدُ ٱلصَّمَدُ ٱلَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُواً أَحَدٌ',
        transliteration:
          'Allāhumma innī as’aluka bi-annī ash-hadu annaka Antallāhu lā ilāha illā Antal-Aḥaduṣ-Ṣamadulladhī lam yalid wa lam yūlad wa lam yakul-lahū kufuwan aḥad',
        translationEn:
          'O Allah, I ask You by bearing witness that You are Allah; there is no deity except You, the One, the Eternal Refuge, who neither begets nor was born, and there is none comparable to Him.',
        translationHi:
          'ऐ अल्लाह! मैं अपनी इस गवाही के वसीले से माँगता हूँ कि तू ही अल्लाह है, तेरे सिवा कोई माबूद नहीं, तू एक व बेनियाज़ है, तेरा कोई शरीक व हमसर नहीं।',
        translationUr:
          'اے اللہ! میں اس گواہی کے واسطے سے سوال کرتا ہوں کہ تو ہی اللہ ہے، تیرے سوا کوئی معبود نہیں، تو یکتا و بے نیاز ہے اور تیرا کوئی ہمسر نہیں۔',
        reference: 'Sunan Abi Dawud 1493 & Tirmidhi 3475 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/65.mp3',
      },
    ],
  },

  'dua-qunoot-witr': {
    primaryVariantLabel: 'Hanafi Qunoot (#118)',
    alternates: [
      {
        id: 'qunoot-shafii-hanbali-116',
        label: 'Prophetic Qunoot (Shafi‘i / Hanbali)',
        badge: 'Abu Dawud 1425',
        arabic:
          'ٱللَّهُمَّ ٱهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ؛ فَإِنَّكَ تَقْضِي وَلَا يُقْضَىٰ عَلَيْكَ، إِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ',
        transliteration:
          'Allāhummahdinī fīman hadayt, wa ‘āfinī fīman ‘āfayt, wa tawallanī fīman tawallayt, wa bārik lī fīmā a‘ṭayt, wa qinī sharra mā qaḍayt; fa-innaka taqḍī wa lā yuqḍā ‘alayk, innahū lā yadhillu man wālayt, wa lā ya‘izzu man ‘ādayt, tabārakta Rabbanā wa ta‘ālayt',
        translationEn:
          'O Allah, guide me among those You have guided, grant me well-being among those You have spared, befriend me among those You have befriended, bless me in what You have given, and protect me from the evil of what You have decreed. Surely You decree and none decrees over You; whoever You befriend is never humiliated, nor honored whoever opposes You. Blessed and Exalted are You, our Lord.',
        translationHi:
          'ऐ अल्लाह! मुझे उन लोगों में हिदायत दे जिन्हें तूने हिदायत दी, उन लोगों में आफ़ियत दे जिन्हें तूने आफ़ियत दी, मेरा मददगार बन और जो कुछ तूने दिया उसमें बरकत दे; बेशक तेरा फ़ैसला अटल है और जिसे तू दोस्त रखे वह ज़लील नहीं होता।',
        translationUr:
          'اے اللہ! مجھے ان لوگوں میں شامل فرما کر ہدایت دے جنہیں تو نے ہدایت دی، مجھے عافیت دے جنہیں تو نے عافیت دی، میرا کارساز بن جا، جو تو نے دیا اس میں برکت عطا فرما اور اپنے فیصلے کے شر سے بچا لے؛ بے شک جسے تو دوست رکھے وہ کبھی ذلیل نہیں ہوتا۔',
        reference: 'Sunan Abi Dawud 1425 & Tirmidhi 464 · Taught to al-Hasan ibn ‘Ali',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/116.mp3',
      },
      {
        id: 'qunoot-pleasure-pardon-117',
        label: 'Closing Witr Seeking Refuge (Muslim 486)',
        badge: 'Sahih Muslim 486',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَعُوذُ بِرِضَاكَ مِنْ سَخَطِكَ، وَبِمُعَافَاتِكَ مِنْ عُقُوبَتِكَ، وَأَعُوذُ بِكَ مِنْكَ، لَا أُحْصِي ثَنَاءً عَلَيْكَ، أَنْتَ كَمَا أَثْنَيْتَ عَلَىٰ نَفْسِكَ',
        transliteration:
          'Allāhumma innī a‘ūdhu bi-riḍāka min sakhaṭik, wa bi-mu‘āfātika min ‘uqūbatik, wa a‘ūdhu bika mink, lā uḥṣī thanā’an ‘alayk, Anta kamā athnayta ‘alā nafsik',
        translationEn:
          'O Allah, I seek refuge in Your pleasure from Your wrath, in Your pardon from Your punishment, and in You from Yourself. I cannot enumerate Your praise; You are as You have praised Yourself.',
        translationHi:
          'ऐ अल्लाह! मैं तेरी रज़ा के ज़रिये तेरी नाराज़गी से, तेरी माफ़ी के ज़रिये तेरी सज़ा से और तुझ ही से तेरी पनाह माँगता हूँ। मैं तेरी तारीफ़ गिन नहीं सकता, तू वैसा ही है जैसी तूने ख़ुद अपनी तारीफ़ की।',
        translationUr:
          'اے اللہ! میں تیری رضا کے ذریعے تیری ناراضگی سے، تیری معافی کے ذریعے تیری سزا سے اور خود تجھ ہی سے تیری پناہ مانگتا ہوں۔ میں تیری ثنا شمار نہیں کر سکتا، تو ویسا ہی ہے جیسی تو نے خود اپنی ثنا بیان فرمائی۔',
        reference: 'Sahih Muslim 486 · Abu Dawud 1427',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/117.mp3',
      },
      {
        id: 'qunoot-after-witr-119',
        label: 'Dhikr After Concluding Witr (3x)',
        badge: 'Abu Dawud 1430',
        arabic:
          'سُبْحَانَ ٱلْمَلِكِ ٱلْقُدُّوسِ ثَلَاثَ مَرَّاتٍ وَٱلثَّالِثَةُ يَجْهَرُ بِهَا وَيَمُدُّ بِهَا صَوْتَهُ يَقُولُ: رَبِّ ٱلْمَلَائِكَةِ وَٱلرُّوحِ',
        transliteration:
          'Subḥānal-Malikil-Quddūs (3 times, lengthening the third) · Rabbil-malā’ikati war-rūḥ',
        translationEn:
          'Glory be to the Sovereign, the Most Holy (recited three times, raising and lengthening the voice on the third), adding: Lord of the angels and the Spirit (Jibril).',
        translationHi:
          'पाक है वह बादशाह जो निहायत मुक़द्दस है (3 बार; तीसरी बार बुलंद और लंबी आवाज़ से) और कहें: फ़रिश्तों और रूह (जिब्रील) का रब।',
        translationUr:
          'پاک ہے بادشاہ جو نہایت مقدس ہے (3 بار؛ تیسری مرتبہ آواز بلند کر کے کھینچ کر پڑھیں)، اور کہیں: فرشتوں اور روح (جبریل) کا رب۔',
        reference: 'Sunan Abi Dawud 1430 & Nasa’i 1732 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/119.mp3',
      },
    ],
  },

  'dhikr-tasbih-fatimah': {
    primaryVariantLabel: '33 / 33 / 34 Tasbīḥ',
    alternates: [
      {
        id: 'post-salah-salam-66',
        label: 'Immediately After Salām (Astaghfirullāh 3x)',
        badge: 'Sahih Muslim 591',
        arabic:
          'أَسْتَغْفِرُ ٱللَّهَ ثَلَاثاً ٱللَّهُمَّ أَنْتَ ٱلسَّلَامُ، وَمِنْكَ ٱلسَّلَامُ، تَبَارَكْتَ يَا ذَا ٱلْجَلَالِ وَٱلْإِكْرَامِ',
        transliteration:
          'Astaghfirullāh (3x) · Allāhumma Antas-Salāmu wa minkas-salām, tabārakta yā Dhal-Jalāli wal-Ikrām',
        translationEn:
          'Say “I seek forgiveness from Allah” three times, then: O Allah, You are Peace and from You comes peace; Blessed are You, Possessor of Majesty and Honor.',
        translationHi:
          'तीन बार “अस्तग़फ़िरुल्लाह” कहें, फिर: ऐ अल्लाह! तू ही सलामती वाला है और तुझ ही से सलामती है; ऐ जलाल और बुज़ुर्गी वाले तू बड़ी बरकत वाला है।',
        translationUr:
          'تین بار استغفراللہ کہیں، پھر: اے اللہ! تو ہی سلامتی والا ہے اور تجھ ہی سے سلامتی ہے؛ اے عظمت و بزرگی والے تو بڑی برکت والا ہے۔',
        reference: 'Sahih Muslim 591',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/66.mp3',
      },
      {
        id: 'post-salah-la-mania-67',
        label: 'Sovereignty & Gratitude (Bukhari 844)',
        badge: 'Lā Māni‘a limā A‘ṭayt',
        arabic:
          'لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، ٱللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا ٱلْجَدِّ مِنْكَ ٱلْجَدُّ',
        transliteration:
          'Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamdu wa Huwa ‘alā kulli shay’in qadīr. Allāhumma lā māni‘a limā a‘ṭayt, wa lā mu‘ṭiya limā mana‘t, wa lā yanfa‘u dhal-jaddi minkal-jadd',
        translationEn:
          'None is worthy of worship except Allah alone without partner; His is dominion and praise. O Allah, none can withhold what You grant, none can give what You withhold, and no wealth or status can avail anyone against You.',
        translationHi:
          'अल्लाह के सिवा कोई माबूद नहीं, वह अकेला है, उसी की बादशाही व तारीफ़ है। ऐ अल्लाह! जो तू दे उसे कोई रोक नहीं सकता और जो तू रोके उसे कोई दे नहीं सकता, और तेरे आगे किसी की दौलत काम नहीं आती।',
        translationUr:
          'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اسی کی بادشاہی اور حمد ہے۔ اے اللہ! جو تو عطا کرے اسے کوئی روک نہیں سکتا اور جو تو روک لے اسے کوئی دے نہیں سکتا، اور تیرے ہاں کسی کی شان و دولت کام نہیں آتی۔',
        reference: 'Sahih al-Bukhari 844 & Muslim 593',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/67.mp3',
      },
      {
        id: 'post-salah-mukhlisina-68',
        label: 'Sincere Devotion (Sahih Muslim 594)',
        badge: 'Mukhliṣīna lahud-dīn',
        arabic:
          'لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ، وَلَهُ ٱلْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ. لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ، لَا إِلَٰهَ إِلَّا ٱللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ ٱلنِّعْمَةُ وَلَهُ ٱلْفَضْلُ وَلَهُ ٱلثَّنَاءُ ٱلْحَسَنُ، لَا إِلَٰهَ إِلَّا ٱللَّهُ مُخْلِصِينَ لَهُ ٱلدِّينَ وَلَوْ كَرِهَ ٱلْكَافِرُونَ',
        transliteration:
          'Lā ilāha illallāhu waḥdahū lā sharīka lah... Lā ḥawla wa lā quwwata illā billāh, lā ilāha illallāhu wa lā na‘budu illā iyyāh, lahun-ni‘matu wa lahul-faḍlu wa lahuth-thanā’ul-ḥasan, lā ilāha illallāhu mukhliṣīna lahud-dīna wa law karihal-kāfirūn',
        translationEn:
          'None has the right to be worshipped except Allah alone; there is no power or strength except through Allah. We worship none but Him; to Him belong favor, grace, and finest praise—sincere in devotion to Him even if disbelievers dislike it.',
        translationHi:
          'अल्लाह के सिवा कोई माबूद नहीं, उसी के लिए नेमत, फ़ज़्ल और अच्छी तारीफ़ है। हम उसी के लिए दीन को ख़ालिस करते हुए कहते हैं: अल्लाह के सिवा कोई माबूद नहीं।',
        translationUr:
          'اللہ کے سوا کوئی معبود نہیں، ہم اسی کی عبادت کرتے ہیں؛ تمام نعمت، فضل اور بہترین ثنا اسی کے لیے ہے، اور ہم خالص اسی کے دین پر قائم ہیں اگرچہ منکر ناپسند کریں۔',
        reference: 'Sahih Muslim 594',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/68.mp3',
      },
      {
        id: 'post-salah-fajr-rizq-73',
        label: 'After Fajr (Knowledge, Rizq & Deeds)',
        badge: 'Ibn Majah 925',
        arabic:
          'ٱللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْماً نَافِعاً، وَرِزْقاً طَيِّباً، وَعَمَلاً مُتَقَبَّلاً بَعْدَ ٱلسَّلَامِ مِنْ صَلَاةِ ٱلْفَجْرِ',
        transliteration:
          'Allāhumma innī as’aluka ‘ilman nāfi‘an, wa rizqan ṭayyiban, wa ‘amalam-mutaqabbalā (after Fajr Salam)',
        translationEn:
          'O Allah, I ask You for beneficial knowledge, pure and wholesome provision, and accepted deeds (recited after the Salam of Fajr prayer).',
        translationHi:
          'ऐ अल्लाह! मैं तुझसे फ़ायदेमंद इल्म, पाकीज़ा रोज़ी और क़बूल होने वाले अमल की दुआ करता हूँ (फ़ज्र की नमाज़ के बाद)।',
        translationUr:
          'اے اللہ! میں تجھ سے نفع بخش علم، پاکیزہ رزق اور مقبول عمل کا سوال کرتا ہوں (نمازِ فجر کے سلام کے بعد)۔',
        reference: 'Sunan Ibn Majah 925 · Sahih (Umm Salamah RA)',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/73.mp3',
      },
    ],
  },

  'dhikr-durood-ibrahim': {
    primaryVariantLabel: 'Āli Muḥammad (Bukhari 3370)',
    alternates: [
      {
        id: 'durood-wives-descendants-54',
        label: 'With Wives & Descendants (Bukhari 3369)',
        badge: 'Azwājihī wa Dhurriyyatih',
        arabic:
          'ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ أَزْوَاجِهِ وَذُرِّيَّتِهِ، كَمَا صَلَّيْتَ عَلَىٰ آلِ إِبْرَاهِيمَ. وَبَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ أَزْوَاجِهِ وَذُرِّيَّتِهِ، كَمَا بَارَكْتَ عَلَىٰ آلِ إِبْرَاهِيمَ. إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration:
          'Allāhumma ṣalli ‘alā Muḥammadin wa ‘alā azwājihī wa dhurriyyatihī kamā ṣallayta ‘alā āli Ibrāhīm. Wa bārik ‘alā Muḥammadin wa ‘alā azwājihī wa dhurriyyatihī kamā bārakta ‘alā āli Ibrāhīm. Innaka Ḥamīdum-Majīd',
        translationEn:
          'O Allah, send grace upon Muhammad and upon his wives and his offspring, just as You sent grace upon the family of Ibrahim; and bless Muhammad, his wives, and his offspring, just as You blessed the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.',
        translationHi:
          'ऐ अल्लाह! मुहम्मद ﷺ और आपकी बीवियों व औलाद पर रहमत नाज़िल फ़रमा जैसे तूने आले-इब्राहीम पर रहमत की, और मुहम्मद ﷺ व आपकी बीवियों व औलाद पर बरकत नाज़िल फ़रमा; बेशक तू तारीफ़ व बुज़ुर्गी वाला है।',
        translationUr:
          'اے اللہ! محمد ﷺ اور آپ کی ازواج و اولاد پر رحمت نازل فرما جیسا کہ تو نے آلِ ابراہیم پر رحمت نازل فرمائی، اور محمد ﷺ اور آپ کی ازواج و اولاد پر برکت نازل فرما؛ بے شک تو تعریف کے لائق اور بزرگی والا ہے۔',
        reference: 'Sahih al-Bukhari 3369 & Muslim 407',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/54.mp3',
      },
    ],
  },

  'dhikr-sayyidul-istighfar': {
    primaryVariantLabel: 'Sayyidul Istighfār',
    alternates: [
      {
        id: 'istighfar-great-250',
        label: 'Great Istighfār (Al-Ḥayyul-Qayyūm)',
        badge: 'Abu Dawud 1517',
        arabic:
          'وَقَالَ صَلَّىٰ ٱللَّهُ عَلَيْهِ وَسَلَّمَ: مَنْ قَالَ أَسْتَغْفِرُ ٱللَّهَ ٱلْعَظِيمَ ٱلَّذِي لَا إِلَٰهَ إِلَّا هُوَ ٱلْحَيُّ ٱلْقَيُّومُ وَأَتُوبُ إِلَيْهِ، غَفَرَ ٱللَّهُ لَهُ وَإِنْ كَانَ فَرَّ مِنَ ٱلزَّحْفِ',
        transliteration:
          'Astaghfirullāhal-‘Aẓīmalladhī lā ilāha illā Huwal-Ḥayyul-Qayyūmu wa atūbu ilayh',
        translationEn:
          'Whoever says: “I seek the forgiveness of Allah the Almighty, besides whom there is no deity, the Ever-Living, the Sustainer of all, and I repent to Him,” Allah will forgive him even if he had fled from battle.',
        translationHi:
          'जो शख़्स कहे: “मैं अज़ीम अल्लाह से माफ़ी माँगता हूँ जिसके सिवा कोई माबूद नहीं, जो हमेशा ज़िंदा व क़ायम है, और मैं उसी की तरफ़ तौबा करता हूँ”—अल्लाह उसे माफ़ कर देगा।',
        translationUr:
          'جو شخص کہے: میں عظیم اللہ سے بخشش مانگتا ہوں جس کے سوا کوئی معبود نہیں، جو زندہ و قائم ہے، اور میں اسی کی طرف توبہ کرتا ہوں—اللہ اسے بخش دیتا ہے۔',
        reference: 'Sunan Abi Dawud 1517 & Tirmidhi 3577 · Sahih',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/250.mp3',
      },
    ],
  },

  'dhikr-subhanallah-bihamdihi': {
    primaryVariantLabel: 'Bukhari 6406',
    alternates: [
      {
        id: 'dhikr-kalimatani-256',
        label: 'Two Light Words (Full Hadith)',
        badge: 'Bukhari 6406 Full',
        arabic:
          'وَقَالَ صَلَّىٰ ٱللَّهُ عَلَيْهِ وَسَلَّمَ: كَلِمَتَانِ خَفِيفَتَانِ عَلَىٰ ٱللِّسَانِ، ثَقِيلَتَانِ فِي ٱلْمِيزَانِ، حَبِيبَتَانِ إِلَىٰ ٱلرَّحْمَٰنِ: سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ، سُبْحَانَ ٱللَّهِ ٱلْعَظِيمِ',
        transliteration:
          'Kalimatāni khafīfatāni ‘alal-lisān, thaqīlatāni fil-mīzān, ḥabībatāni ilar-Raḥmān: Subḥānallāhi wa biḥamdihī, Subḥānallāhil-‘Aẓīm',
        translationEn:
          'The Prophet ﷺ said: Two phrases are light on the tongue, heavy on the scale of deeds, and beloved to the Most Merciful: “SubhanAllahi wa bihamdihi, SubhanAllahil-‘Azim.”',
        translationHi:
          'नबी ﷺ ने फ़रमाया: दो कलिमे ज़बान पर हल्के, मीज़ान में भारी और रहमान को बेहद महबूब हैं: “सुब्हानल्लाहि व बिहम्दिही, सुब्हानल्लाहिल-अज़ीम।”',
        translationUr:
          'نبی ﷺ نے فرمایا: دو کلمے زبان پر ہلکے، میزان میں بھاری اور رحمٰن کو بہت محبوب ہیں: سبحان اللہ وبحمدہ، سبحان اللہ العظیم۔',
        reference: 'Sahih al-Bukhari 6406 & 7563',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/256.mp3',
      },
      {
        id: 'dhikr-adada-khalqihi-94',
        label: 'Weight of the Throne (3x Juwayriyah)',
        badge: 'Sahih Muslim 2726',
        arabic:
          'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ ثَلَاثَ مَرَّاتٍ إِذَا أَصْبَحَ',
        transliteration:
          'Subḥānallāhi wa biḥamdihī: ‘adada khalqihī, wa riḍā nafsihī, wa zinata ‘arshihī, wa midāda kalimātih (3 times in morning)',
        translationEn:
          'Glory and praise be to Allah—as many times as His creation, as much as pleases Him, as heavy as the weight of His Throne, and as endless as the ink of His words (3 times each morning).',
        translationHi:
          'अल्लाह पाक है अपनी तारीफ़ के साथ—उसकी मख़लूक़ की गिनती के बराबर, उसकी ख़ुशी के बराबर, उसके अर्श के वज़न के बराबर और उसके कलिमात की स्याही के बराबर (सुबह 3 बार)।',
        translationUr:
          'اللہ پاک ہے اپنی حمد کے ساتھ—اس کی مخلوق کی تعداد کے برابر، اس کی رضا کے برابر، اس کے عرش کے وزن کے برابر اور اس کے کلمات کی روشنائی کے برابر (صبح 3 بار)۔',
        reference: 'Sahih Muslim 2726 · Taught to Juwayriyah (RA)',
        audioUrl: 'https://www.hisnmuslim.com/audio/ar/94.mp3',
      },
    ],
  },
};
