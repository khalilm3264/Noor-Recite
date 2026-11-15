import { WordFootnote, WordToken } from '../types/quran';

export interface AyahFootnoteItem {
  number: number;
  wordIndex: number;
  word: WordToken;
  footnote: WordFootnote;
}

/**
 * Normalize Uthmani / Imla'i Arabic words into a canonical lookup key by removing
 * vowel marks, tatweel, dagger alif, Quranic pause annotations, and unifying Alif forms.
 */
export function normalizeArabicKey(raw: string): string {
  return raw
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/[^\u0621-\u064A]/g, '')
    .trim();
}

const FOOTNOTE_CATALOG: Record<string, Omit<WordFootnote, 'id' | 'arabicTerm'>> = {
  // === Opener & Al-Fatiha ===
  اعوذ: {
    term: 'A‘ūdhu ("I seek refuge")',
    literalGloss: 'I flee for shelter and cling to protection',
    category: 'Spiritual Concept',
    root: 'ع و ذ',
    explanation:
      'Classical Arabic lexicons explain ‘awdh as fleeing away from danger and clinging closely to a place of safety. Before reciting, the reader explicitly admits human weakness and turns to Allah for protection.',
  },
  الشيطن: {
    term: 'Ash-Shayṭān ("Satan")',
    literalGloss: 'One far removed from truth and good',
    category: 'Classical Arabic Nuance',
    root: 'ش ط ن',
    explanation:
      'Comes from shaṭana (to stray far away from what is right). The definite prefix al- ("the") identifies Shayṭān as a created being defined by rebellion and distance from Divine mercy.',
  },
  الشيطان: {
    term: 'Ash-Shayṭān ("Satan")',
    literalGloss: 'One far removed from truth and good',
    category: 'Classical Arabic Nuance',
    root: 'ش ط ن',
    explanation:
      'Comes from shaṭana (to stray far away from what is right). The definite prefix al- ("the") marks him as one characterized by separation from mercy.',
  },
  الرجيم: {
    term: 'Ar-Rajīm ("the accursed")',
    literalGloss: 'Expelled and cast away from mercy',
    category: 'Grammar & Definite "The"',
    root: 'ر ج م',
    explanation:
      'Uses the emphatic fa‘īl adjective form with the definite article "the" (al-). In classical commentary it carries two senses: driven out from heavenly favor, and actively pelting human hearts with corrupting thoughts.',
  },
  بسم: {
    term: 'Bismi ("In the name of")',
    literalGloss: 'With and through the Name',
    category: 'Classical Arabic Nuance',
    root: 'س م و',
    explanation:
      'Combines the preposition bi- ("by" or "with") and ism (from sumuww, elevation). Beginning with Bismi implies undertaking an action while seeking blessing and aid through Allah’s Name.',
  },
  الله: {
    term: 'Allāh',
    literalGloss: 'The Sole Proper Name of God',
    category: 'Theology & Divine Name',
    root: 'أ ل ه',
    explanation:
      'Unlike the English word "God," which can be made plural or given gender, Allāh is a singular proper name that takes neither plural nor gender and gathers all Divine attributes of perfection. It relates to al-Ilāh, the One worshipped with love and awe.',
  },
  لله: {
    term: 'Lillāh ("to Allah")',
    literalGloss: 'Belonging exclusively to Allah',
    category: 'Theology & Divine Name',
    root: 'أ ل ه',
    explanation:
      'The prefixed preposition li- signals exclusive ownership and right: every sincere praise in existence belongs rightfully to Allah.',
  },
  بالله: {
    term: 'Billāh ("in Allah")',
    literalGloss: 'Clinging to Allah as shelter',
    category: 'Theology & Divine Name',
    root: 'أ ل ه',
    explanation:
      'The prefix bi- expresses direct attachment, placing one’s reliance directly on Allah for refuge.',
  },
  الرحمن: {
    term: 'Ar-Raḥmān ("the Entirely Merciful")',
    literalGloss: 'Vast, all-embracing mercy',
    category: 'Theology & Divine Name',
    root: 'ر ح م',
    explanation:
      'English repeats "Merciful," whereas Arabic distinguishes two different patterns from the same root (r-ḥ-m). Ar-Raḥmān uses the intensive fa‘lān form (similar to ‘aṭshān, filled with thirst) to describe immense mercy poured out across all creation. In the Qur’an, this name belongs solely to Allah.',
  },
  الرحيم: {
    term: 'Ar-Raḥīm ("the Especially Merciful")',
    literalGloss: 'Constant, enduring mercy',
    category: 'Theology & Divine Name',
    root: 'ر ح م',
    explanation:
      'Uses the permanent fa‘īl form. Whereas Ar-Raḥmān highlights the vastness of Allah’s mercy in the present across all creatures, Ar-Raḥīm points to its lasting, personal continuity toward believers.',
  },
  الحمد: {
    term: 'Al-Ḥamd ("All praise")',
    literalGloss: 'All loving praise paired with gratitude',
    category: 'Grammar & Definite "The"',
    root: 'ح م د',
    explanation:
      'Here the definite article "the" (al-) is used for totality (al-istighrāq), so al-ḥamd means all praise in existence, not just one compliment. Unlike madḥ (praise that can be insincere) or shukr (thanks for a favor), ḥamd honors goodness and perfection out of love.',
  },
  رب: {
    term: 'Rabb ("Lord")',
    literalGloss: 'Owner, Caretaker, and Nurturer',
    category: 'Theology & Divine Name',
    root: 'ر ب ب',
    explanation:
      'English "Lord" sounds mainly like a feudal title. In Arabic, Rabb (from the same family as tarbiyah, upbringing) describes the One who owns, sustains, repairs, and gradually brings every creature to maturity.',
  },
  ربك: {
    term: 'Rabbuka ("your Lord")',
    literalGloss: 'Your personal Sustainer and Caretaker',
    category: 'Theology & Divine Name',
    root: 'ر ب ب',
    explanation:
      'Attaching "-ka" ("your") turns universal Lordship into close personal care during difficult seasons.',
  },
  ربهم: {
    term: 'Rabbihim ("their Lord")',
    literalGloss: 'Their Sustainer and Master',
    category: 'Theology & Divine Name',
    root: 'ر ب ب',
    explanation:
      'Shows that the angels act strictly by permission and care of their Sustainer.',
  },
  برب: {
    term: 'Bi-Rabbi ("in the Lord of")',
    literalGloss: 'Turning for shelter to the Caretaker of',
    category: 'Theology & Divine Name',
    root: 'ر ب ب',
    explanation:
      'Pairs seeking refuge (bi-) with Rabb, calling on the One who actively guards and nurtures what He has made.',
  },
  العلمين: {
    term: 'Al-‘Ālamīn ("all the worlds")',
    literalGloss: 'Every realm and sign of creation',
    category: 'Classical Arabic Nuance',
    root: 'ع ل م',
    explanation:
      'Shares its root with ‘ilm (knowledge) and ‘alāmah (a sign). Classical scholars note that every realm of creation (human, angelic, physical, and unseen) serves as a sign pointing to its Maker.',
  },
  العالمين: {
    term: 'Al-‘Ālamīn ("all the worlds")',
    literalGloss: 'Every realm and sign of creation',
    category: 'Classical Arabic Nuance',
    root: 'ع ل م',
    explanation:
      'Shares its root with ‘ilm (knowledge) and ‘alāmah (a sign), meaning every order of creation that testifies to its Creator.',
  },
  ملك: {
    term: 'Mālik / Malik ("Sovereign Master")',
    literalGloss: 'Owner and King',
    category: 'Theology & Divine Name',
    root: 'م ل ك',
    explanation:
      'Preserved in two canonical Qur’anic readings: Mālik (Absolute Owner) and Malik (Supreme King), uniting full possession and ruling authority on the Day of Judgment.',
  },
  مالك: {
    term: 'Mālik ("Sovereign Master")',
    literalGloss: 'Rightful Owner and Possessor',
    category: 'Theology & Divine Name',
    root: 'م ل ك',
    explanation:
      'Signifies direct ownership and authority over the Day of Recompense without anyone sharing rule.',
  },
  الدين: {
    term: 'Ad-Dīn ("the Recompense / Way")',
    literalGloss: 'Moral reckoning, repayment, and devotion',
    category: 'Grammar & Definite "The"',
    root: 'د ي ن',
    explanation:
      'With the definite article "the" (al-), ad-dīn refers here to the final Day of exact moral reckoning (linked to dayn, a debt settled in full). Elsewhere in the Qur’an it also means the complete path of devotion to God.',
  },
  اياك: {
    term: 'Iyyāka ("You alone")',
    literalGloss: 'Fronted pronoun: only You',
    category: 'Classical Arabic Nuance',
    explanation:
      'In normal Arabic word order, the object follows the verb. Placing "You" first ("You alone we worship") introduces exclusivity (ḥaṣr), leaving no room for worship directed anywhere else.',
  },
  واياك: {
    term: 'Wa Iyyāka ("and You alone")',
    literalGloss: 'And from You exclusively',
    category: 'Classical Arabic Nuance',
    explanation:
      'Repeats the fronted pronoun to show that even asking for strength and help belongs solely to Allah.',
  },
  نعبد: {
    term: 'Na‘budu ("we worship")',
    literalGloss: 'We serve in humility and love',
    category: 'Spiritual Concept',
    root: 'ع ب د',
    explanation:
      '‘Ibādah combines deep humility with willing love and obedience. Using the plural "we" joins the individual reciter with the wider community of believers.',
  },
  نستعين: {
    term: 'Nasta‘īn ("we ask for help")',
    literalGloss: 'We continually seek enabling aid',
    category: 'Spiritual Concept',
    root: 'ع و ن',
    explanation:
      'The Form X verb pattern (istaf‘ala) indicates earnest, ongoing reliance, acknowledging that even sincere worship requires Allah’s help.',
  },
  الصراط: {
    term: 'Aṣ-Ṣirāṭ ("the Path")',
    literalGloss: 'The wide, unmistakable main highway',
    category: 'Grammar & Definite "The"',
    root: 'ص ر ط',
    explanation:
      'Unlike ṭarīq (an ordinary road) or sabīl (a path, often plural in the Qur’an), ṣirāṭ is always singular and denotes a wide, direct highway. The definite "the" (al-) stresses that guidance leads along one clear road.',
  },
  صرط: {
    term: 'Aṣ-Ṣirāṭ ("the Path")',
    literalGloss: 'The wide, unmistakable main highway',
    category: 'Grammar & Definite "The"',
    root: 'ص ر ط',
    explanation:
      'Denotes a wide, unmistakable main road rather than a side trail, paired with the definite "the" (al-) to point to one unified way of truth.',
  },
  المستقيم: {
    term: 'Al-Mustaqīm ("the Straight")',
    literalGloss: 'The upright, balanced, steady way',
    category: 'Grammar & Definite "The"',
    root: 'ق و م',
    explanation:
      'With the definite article "the" (al-), mustaqīm (from qāma, to stand upright) conveys more than geometric straightness: it means morally balanced, free of excess or neglect, and leading reliably to its goal.',
  },
  الضالين: {
    term: 'Aḍ-Ḍāllīn ("those astray")',
    literalGloss: 'Those wandering without true guidance',
    category: 'Grammar & Definite "The"',
    root: 'ض ل ل',
    explanation:
      'Refers to people who lose their bearings and wander without sound knowledge, contrasted with the previous clause describing those who reject truth knowingly.',
  },

  // === Surah Al-Baqarah & Major Quranic Theology (for all 114 Surahs) ===
  القيوم: {
    term: 'Al-Qayyūm ("the All-Sustainer")',
    literalGloss: 'The Self-Subsisting Upholder of all things',
    category: 'Theology & Divine Name',
    root: 'ق و م',
    explanation:
      'This intensive fay‘ūl pattern holds two meanings that no single English word captures together: Allah exists completely independently, needing nothing, while continuously sustaining every creature at every moment. The definite "the" (al-) reserves this perfection for Allah alone.',
  },
  قيوم: {
    term: 'Qayyūm ("All-Sustainer")',
    literalGloss: 'Self-Subsisting and Ever-Upholding',
    category: 'Theology & Divine Name',
    root: 'ق و م',
    explanation:
      'An intensive Arabic form meaning completely self-sufficient in essence while continuously keeping all creation intact.',
  },
  الحي: {
    term: 'Al-Ḥayy ("the Ever-Living")',
    literalGloss: 'Possessor of perfect, undiminished life',
    category: 'Theology & Divine Name',
    root: 'ح ي ي',
    explanation:
      'Signifies life unlike created life: neither preceded by non-existence nor touched by fatigue, sleep, or decay, and the source from which all living things draw life.',
  },
  الغيب: {
    term: 'Al-Ghayb ("the Unseen")',
    literalGloss: 'Realities veiled from physical perception',
    category: 'Grammar & Definite "The"',
    root: 'غ ي ب',
    explanation:
      'Preceded by "the" (al-), al-ghayb does not mean guesswork or myth. It refers to real dimensions of existence (such as revelation, angels, and the Hereafter) veiled beyond ordinary human senses.',
  },
  المتقين: {
    term: 'Al-Muttaqīn ("the God-conscious")',
    literalGloss: 'Those who guard themselves through awareness of God',
    category: 'Spiritual Concept',
    root: 'و ق ي',
    explanation:
      'Often translated simply as "the righteous" or "the pious," taqwā comes from wiqāyah (a protective shield). It describes mindful awareness of Allah that protects the heart from spiritual and moral harm.',
  },
  تقوى: {
    term: 'Taqwā ("God-consciousness")',
    literalGloss: 'Mindful reverence and spiritual protection',
    category: 'Spiritual Concept',
    root: 'و ق ي',
    explanation:
      'Combines reverence, moral vigilance, and love, functioning as a protective shield rather than mere anxious fear.',
  },
  الصلوة: {
    term: 'Aṣ-Ṣalāh ("the Prayer")',
    literalGloss: 'Consecrated daily worship and connection',
    category: 'Grammar & Definite "The"',
    root: 'ص ل و',
    explanation:
      'Marked with the definite "the" (al-), aṣ-ṣalāh designates the prescribed daily prayers that unite posture, Qur’anic recitation, and direct supplication to God.',
  },
  الصلاة: {
    term: 'Aṣ-Ṣalāh ("the Prayer")',
    literalGloss: 'Consecrated daily worship and connection',
    category: 'Grammar & Definite "The"',
    root: 'ص ل و',
    explanation:
      'With the definite "the" (al-), aṣ-ṣalāh refers to the structured daily worship linking body, mind, and heart to Allah.',
  },
  الزكوة: {
    term: 'Az-Zakāh ("purifying charity")',
    literalGloss: 'Purification together with healthy growth',
    category: 'Spiritual Concept',
    root: 'ز ك و',
    explanation:
      'English "charity" or "alms" misses the double sense of zakāh: pruning away selfishness while causing one’s wealth and soul to grow pure.',
  },
  الزكاة: {
    term: 'Az-Zakāh ("purifying charity")',
    literalGloss: 'Purification together with healthy growth',
    category: 'Spiritual Concept',
    root: 'ز ك و',
    explanation:
      'Carries both purification and increase, teaching that wealth becomes clean and blessed when shared.',
  },
  امنوا: {
    term: 'Āmanū ("those who believed")',
    literalGloss: 'Entered into trust, security, and fidelity',
    category: 'Spiritual Concept',
    root: 'أ م ن',
    explanation:
      'Related to amn (safety and peace), Qur’anic īmān goes beyond agreeing with an idea; it is active trust and faithfulness that settles the heart in peace.',
  },
  ءامنوا: {
    term: 'Āmanū ("those who believed")',
    literalGloss: 'Entered into trust, security, and fidelity',
    category: 'Spiritual Concept',
    root: 'أ م ن',
    explanation:
      'Rooted in safety and trustworthiness (amn), indicating committed faith rather than casual opinion.',
  },

  // === Ad-Duha (93) ===
  والضحى: {
    term: 'Waḍ-Ḍuḥā ("By the morning brightness")',
    literalGloss: 'Gentle, full morning daylight',
    category: 'Classical Arabic Nuance',
    root: 'ض ح و',
    explanation:
      'Ḍuḥā names the clear, warm morning hours after sunrise before midday heat sets in. Swearing by it consoles the listener that clarity returns after dark periods.',
  },
  سجى: {
    term: 'Sajā ("grows still and tranquil")',
    literalGloss: 'Settles quietly like a calm cover',
    category: 'Classical Arabic Nuance',
    root: 'س ج و',
    explanation:
      'Describes peaceful, unhurried stillness rather than frightening darkness, framing quiet intervals as times of rest rather than abandonment.',
  },
  ضالا: {
    term: 'Ḍāllan ("lost / unaware")',
    literalGloss: 'Lost and unaware of the way, yet searching',
    category: 'Classical Arabic Nuance',
    root: 'ض ل ل',
    explanation:
      'In this verse, ḍāllan means lacking clear revelation and wandering in search of truth rather than rejecting it, showing how Arabic meaning depends closely on context.',
  },
  فاغنى: {
    term: 'Fa-aghnā ("enriched you")',
    literalGloss: 'Granted sufficiency and inner contentment',
    category: 'Spiritual Concept',
    root: 'غ ن ي',
    explanation:
      'Ghinā in classical usage denotes freedom from anxious want, uniting outer provision with richness and contentment of heart.',
  },

  // === Ash-Sharh (94) ===
  مع: {
    term: 'Ma‘a ("with")',
    literalGloss: 'Accompanied concurrently, in the same span',
    category: 'Classical Arabic Nuance',
    explanation:
      'Notice the preposition is ma‘a ("with"), not ba‘da ("after"). Relief does not merely follow later; steadiness and openings accompany the hardship itself.',
  },
  العسر: {
    term: 'Al-‘Usr ("the hardship")',
    literalGloss: 'One single definite hardship',
    category: 'Grammar & Definite "The"',
    root: 'ع س ر',
    explanation:
      'A classic Arabic grammar point about "the" (al-): because al-‘usr carries the definite article in both 94:5 and 94:6, it points back to the same single hardship, whereas yusrān ("ease") is indefinite, promising varied and repeated ease overcoming one hardship.',
  },
  يسرا: {
    term: 'Yusrā ("ease")',
    literalGloss: 'Abundant, varied ease (indefinite)',
    category: 'Grammar & Definite "The"',
    root: 'ي س ر',
    explanation:
      'Left indefinite (without "the"), yusrān stays open to multiple forms of relief. Classical scholars summed up 94:5–6 with the saying: "One hardship can never overcome two eases."',
  },
  صدرك: {
    term: 'Ṣadrak ("your breast")',
    literalGloss: 'Your chest and inner capacity',
    category: 'Classical Arabic Nuance',
    root: 'ص د ر',
    explanation:
      'Expanding the ṣadr means widening emotional and spiritual room inside so heavy responsibilities no longer feel suffocating.',
  },
  وزرك: {
    term: 'Wizrak ("your heavy burden")',
    literalGloss: 'Crushing load of responsibility',
    category: 'Classical Arabic Nuance',
    root: 'و ز ر',
    explanation:
      'Related to wazar (a heavy load or mountain refuge), portraying spiritual and emotional strain being lifted away.',
  },

  // === Al-Qadr (97) ===
  القدر: {
    term: 'Al-Qadr ("Decree / Honor")',
    literalGloss: 'Measure, Decree, Honor, and Sacred Weight',
    category: 'Grammar & Definite "The"',
    root: 'ق د ر',
    explanation:
      'Commentators note three overlapping senses here: Decree (wise ordering of affairs), Majesty (immense honor), and Tightness (the earth filled closely with descending angels).',
  },
  والروح: {
    term: 'Ar-Rūḥ ("the Spirit")',
    literalGloss: 'Archangel Jibril',
    category: 'Grammar & Definite "The"',
    root: 'ر و ح',
    explanation:
      'With the honorific definite "the" (al-), ar-Rūḥ singles out the Angel Gabriel, who conveys revelation that gives life to human hearts, standing alongside all other angels.',
  },
  سلم: {
    term: 'Salām ("Peace")',
    literalGloss: 'Wholeness, safety, and quiet serenity',
    category: 'Spiritual Concept',
    root: 'س ل م',
    explanation:
      'Salām means more than the absence of fighting; it expresses complete soundness, harmony, and protection from harm until dawn.',
  },
  سلام: {
    term: 'Salām ("Peace")',
    literalGloss: 'Wholeness, safety, and quiet serenity',
    category: 'Spiritual Concept',
    root: 'س ل م',
    explanation:
      'Expresses complete soundness and peace filling that night until morning light.',
  },

  // === Al-Asr (103) ===
  والعصر: {
    term: 'Wal-‘Aṣr ("By time")',
    literalGloss: 'Late afternoon and compressed passing time',
    category: 'Grammar & Definite "The"',
    root: 'ع ص ر',
    explanation:
      'English "time" sounds neutral, while ‘aṣr comes from pressing or squeezing (as in pressing fruit) and names the late afternoon when daylight quickly runs down, vividly reminding the listener how short human life is.',
  },
  الانسن: {
    term: 'Al-Insān ("humankind")',
    literalGloss: 'Humanity, prone to fellowship and forgetfulness',
    category: 'Grammar & Definite "The"',
    root: 'أ ن س',
    explanation:
      'With the generic definite "the" (al-), al-insān includes all human beings. Linguists connect it to both uns (warm companionship) and nisyān (forgetfulness).',
  },
  الانسان: {
    term: 'Al-Insān ("humankind")',
    literalGloss: 'Humanity, prone to fellowship and forgetfulness',
    category: 'Grammar & Definite "The"',
    root: 'أ ن س',
    explanation:
      'Uses the generic definite "the" to address humanity as a whole, reflecting both our need for connection and our tendency to forget.',
  },
  خسر: {
    term: 'Khusr ("loss")',
    literalGloss: 'Squandering core capital',
    category: 'Classical Arabic Nuance',
    root: 'خ س ر',
    explanation:
      'Uses trade language: unlike losing a small profit, khusr means watching your main capital (here, your lifetime) slip away with nothing lasting gained.',
  },
  بالحق: {
    term: 'Bil-Ḥaqq ("to truth")',
    literalGloss: 'Firm reality, justice, and moral duty',
    category: 'Grammar & Definite "The"',
    root: 'ح ق ق',
    explanation:
      'Preceded by the definite "the" (al-), al-ḥaqq brings together factual truth, fairness, and what is genuinely right and enduring.',
  },
  بالصبر: {
    term: 'Biṣ-Ṣabr ("to steadfast patience")',
    literalGloss: 'Active perseverance and self-restraint',
    category: 'Grammar & Definite "The"',
    root: 'ص ب ر',
    explanation:
      'Far from passive waiting, ṣabr literally means binding oneself firmly: holding steady in doing good, resisting temptation, and enduring hardship.',
  },

  // === Al-Ikhlas (112) ===
  احد: {
    term: 'Aḥad ("One")',
    literalGloss: 'Indivisible, absolute Oneness',
    category: 'Theology & Divine Name',
    root: 'أ ح د',
    explanation:
      'Arabic uses aḥad here rather than wāḥid ("one" as a number in counting). Wāḥid can be followed by "two" or split into parts, whereas aḥad states absolute, indivisible singularity with no counterpart.',
  },
  الصمد: {
    term: 'Aṣ-Ṣamad ("the Eternal Refuge")',
    literalGloss: 'The Self-Sufficient Anchor all creation turns toward',
    category: 'Theology & Divine Name',
    root: 'ص م د',
    explanation:
      'No single English phrase covers aṣ-ṣamad cleanly. Classical commentators explain two core senses: the Sovereign whom every creature relies upon in need, and the Solid, Self-Sufficient One who lacks nothing.',
  },
  كفوا: {
    term: 'Kufuwan ("equivalent")',
    literalGloss: 'Any equal, peer, or counterpart',
    category: 'Classical Arabic Nuance',
    root: 'ك ف أ',
    explanation:
      'Closes the surah by ruling out any equal, rival, or comparable likeness anywhere in existence.',
  },

  // === Al-Falaq (113) & An-Nas (114) ===
  الفلق: {
    term: 'Al-Falaq ("the Daybreak")',
    literalGloss: 'Splitting light open out of darkness',
    category: 'Grammar & Definite "The"',
    root: 'ف ل ق',
    explanation:
      'From falaqa (to split open), referring to dawn breaking out of night or a seed splitting underground. It evokes Allah breaking open relief even in the darkest situations.',
  },
  غاسق: {
    term: 'Ghāsiq ("darkness")',
    literalGloss: 'Creeping darkness settling deeply',
    category: 'Classical Arabic Nuance',
    root: 'غ س ق',
    explanation:
      'Pictures darkness creeping and thickening until sight grows dim, whether literally at night or figuratively during confusion.',
  },
  النفاثت: {
    term: 'An-Naffāthāt ("those who blow on knots")',
    literalGloss: 'Whisperers puffing lightly to weave hidden harm',
    category: 'Classical Arabic Nuance',
    root: 'ن ف ث',
    explanation:
      'Refers to covert malice, sorcery, or quiet intrigue meant to sow suspicion and break human bonds.',
  },
  النفاثات: {
    term: 'An-Naffāthāt ("those who blow on knots")',
    literalGloss: 'Whisperers puffing lightly to weave hidden harm',
    category: 'Classical Arabic Nuance',
    root: 'ن ف ث',
    explanation:
      'Describes secretive malice and subtle speech aimed at fraying trust and wellbeing.',
  },
  حاسد: {
    term: 'Ḥāsid ("an envier")',
    literalGloss: 'One who resents another’s blessing',
    category: 'Spiritual Concept',
    root: 'ح س د',
    explanation:
      'Unlike admiring someone’s blessing while hoping for similar good yourself (ghibṭah), ḥasad specifically desires that the other person lose what they have.',
  },
  الوسواس: {
    term: 'Al-Waswās ("the whisperer")',
    literalGloss: 'Recurring subtle inner whisper',
    category: 'Classical Arabic Nuance',
    root: 'و س و س',
    explanation:
      'An Arabic word whose repeated sound ("w-s-w-s") imitates quiet, persistent whispering. It refers specifically to nagging inner whispers of temptation or doubt, not "retreating."',
  },
  الخناس: {
    term: 'Al-Khannās ("who retreats")',
    literalGloss: 'One who shrinks back when exposed',
    category: 'Classical Arabic Nuance',
    root: 'خ ن س',
    explanation:
      'Shows the whisperer’s behavior: persistent when the heart is distracted, yet shrinking back (khunūs) as soon as a person remembers Allah.',
  },
  الناس: {
    term: 'An-Nās ("humankind")',
    literalGloss: 'Humanity in its social openness and forgetfulness',
    category: 'Grammar & Definite "The"',
    root: 'ن و س',
    explanation:
      'Repeated at the close of every verse in Surah An-Nas, pairing human vulnerability with Allah’s protection as Nurturer (Rabb), Sovereign (Malik), and God (Ilāh).',
  },
  اله: {
    term: 'Ilāh ("God")',
    literalGloss: 'Sole worthy Object of worship and devotion',
    category: 'Theology & Divine Name',
    root: 'أ ل ه',
    explanation:
      'In An-Nas (114:1–3), the titles move from Rabb (Caretaker) to Malik (King) to Ilāh (the sole One worshipped), reaching from outer care straight into the loyalty of the heart.',
  },
  الاه: {
    term: 'Ilāh ("God")',
    literalGloss: 'Sole worthy Object of worship and devotion',
    category: 'Theology & Divine Name',
    root: 'أ ل ه',
    explanation:
      'Signifies the one true Object of worship, love, and inward trust.',
  },

  // === Frequent intricate terms across all 114 Surahs ===
  الكوثر: {
    term: 'Al-Kawthar ("Abundant Good")',
    literalGloss: 'Overflowing, lasting abundance',
    category: 'Classical Arabic Nuance',
    root: 'ك ث ر',
    explanation:
      'An intensive form from kathrah (abundance), encompassing lasting goodness in this life, prophetic legacy, wisdom, and the sacred river promised in Paradise.',
  },
  النفس: {
    term: 'An-Nafs ("the Soul / Self")',
    literalGloss: 'Living self and inner moral inclination',
    category: 'Spiritual Concept',
    root: 'ن ف س',
    explanation:
      'Shares its root with nafas (breath), covering the whole living person, conscious self, and spiritual soul capable of growth toward inner peace.',
  },
  نفس: {
    term: 'Nafs ("soul / self")',
    literalGloss: 'Living soul and conscious self',
    category: 'Spiritual Concept',
    root: 'ن ف س',
    explanation:
      'Refers to the whole human self, combining life, desire, consciousness, and moral choice.',
  },
  القلب: {
    term: 'Al-Qalb ("the Heart")',
    literalGloss: 'Inner center that turns and perceives',
    category: 'Spiritual Concept',
    root: 'ق ل ب',
    explanation:
      'Literally "that which turns" (from taqallub). In Qur’anic Arabic, the heart is the seat of conscience, understanding, memory, and sincerity, not merely passing emotion.',
  },
  قلوبهم: {
    term: 'Qulūbuhum ("their hearts")',
    literalGloss: 'Their inner seats of understanding',
    category: 'Spiritual Concept',
    root: 'ق ل ب',
    explanation:
      'Refers to inner moral perception and the direction a person’s conviction turns.',
  },
  النور: {
    term: 'An-Nūr ("the Light")',
    literalGloss: 'Clear illumination revealing reality',
    category: 'Grammar & Definite "The"',
    root: 'ن و ر',
    explanation:
      'With the definite "the" (al-), nūr stands for gentle, revealing light, especially guidance that lets a person see truth clearly.',
  },
  الهدى: {
    term: 'Al-Hudā ("the Guidance")',
    literalGloss: 'Gentle showing of the right road',
    category: 'Grammar & Definite "The"',
    root: 'ه د ي',
    explanation:
      'Shares its root with hadiyyah (a gift), portraying divine guidance as a generous gift leading travelers safely home.',
  },
  هدى: {
    term: 'Hudā ("guidance")',
    literalGloss: 'Kindly direction toward safety',
    category: 'Spiritual Concept',
    root: 'ه د ي',
    explanation:
      'Means both pointing out the true path and gently guiding someone along it.',
  },
  الكتاب: {
    term: 'Al-Kitāb ("the Scripture")',
    literalGloss: 'Coherently gathered Divine Writ',
    category: 'Grammar & Definite "The"',
    root: 'ك ت ب',
    explanation:
      'From kataba ("to bring parts firmly together" or "inscribe"), using definite "the" to refer to preserved revelation as one coherent whole.',
  },
  العزيز: {
    term: 'Al-‘Azīz ("the Almighty")',
    literalGloss: 'Unconquerable, exalted, and beyond compare',
    category: 'Theology & Divine Name',
    root: 'ع ز ز',
    explanation:
      'Blends invincible strength with rare honor and dignity. The Qur’an often pairs it with Al-Ḥakīm ("All-Wise") to show power always joined with wisdom.',
  },
  الحكيم: {
    term: 'Al-Ḥakīm ("the All-Wise")',
    literalGloss: 'One who sets everything in its rightful place',
    category: 'Theology & Divine Name',
    root: 'ح ك م',
    explanation:
      'From ḥikmah (wisdom and sound judgment), meaning Allah acts with exact purpose and moral fitness in every decree and law.',
  },
  العليم: {
    term: 'Al-‘Alīm ("the All-Knowing")',
    literalGloss: 'Complete knowledge of hidden and manifest',
    category: 'Theology & Divine Name',
    root: 'ع ل م',
    explanation:
      'An intensive attribute denoting eternal, direct knowledge of every thought, intention, and detail across creation.',
  },
  الغفور: {
    term: 'Al-Ghafūr ("the All-Forgiving")',
    literalGloss: 'One who covers, shields, and forgives repeatedly',
    category: 'Theology & Divine Name',
    root: 'غ ف ر',
    explanation:
      'Rooted in ghafara (to cover and protect, like a helmet, mighfar). Divine forgiveness both wipes away sins and shields the believer’s dignity.',
  },
};

const TRIVIAL_THE_MEANINGS = new Set([
  'the',
  'the one',
  'the ones',
  'the same',
  'the first',
  'the second',
  'the other',
]);

/**
 * Checks whether an Arabic word uses the definite article `ٱل`/`ال` and its English gloss
 * relies on "the ..." in a meaningful noun/attribute where Arabic definiteness adds nuance.
 */
function buildDefiniteArticleFootnote(word: WordToken): WordFootnote | null {
  const raw = word.arabic.trim();
  const norm = normalizeArabicKey(raw);
  const meaningLower = (word.meaning || '').trim().toLowerCase();

  const startsWithAl =
    raw.startsWith('ٱل') ||
    raw.startsWith('ال') ||
    raw.startsWith('لِل') ||
    raw.startsWith('بِٱل') ||
    raw.startsWith('وَٱل') ||
    raw.startsWith('فَٱل') ||
    norm.startsWith('ال');

  if (!startsWithAl) return null;
  if (!meaningLower.startsWith('the ')) return null;
  if (TRIVIAL_THE_MEANINGS.has(meaningLower)) return null;
  if (word.arabic.length < 4) return null;

  const cleanMeaning = word.meaning.trim();
  const label = word.transliteration?.trim() || cleanMeaning;

  return {
    id: `fn-al-${word.id}`,
    term: `${label} ("${cleanMeaning}")`,
    arabicTerm: word.arabic,
    literalGloss: `Definite "al-" ("the") + ${cleanMeaning.replace(/^the\s+/i, '')}`,
    category: 'Grammar & Definite "The"',
    root: word.root,
    explanation:
      'English renders the Arabic prefix al- simply as "the," yet classical Arabic uses it with added weight: either pointing to a specific, known reality (al-‘ahd) or encompassing the entire category and fullness of that quality (al-istighrāq).',
  };
}

export function getWordFootnote(word: WordToken): WordFootnote | null {
  if (word.footnote) return word.footnote;

  const norm = normalizeArabicKey(word.arabic);
  if (norm && FOOTNOTE_CATALOG[norm]) {
    const entry = FOOTNOTE_CATALOG[norm];
    return {
      id: `fn-${word.id}`,
      arabicTerm: word.arabic,
      ...entry,
      root: entry.root ?? word.root,
    };
  }

  // Strip single-letter attached conjunction/preposition prefixes (و / ف / ب / ل / ك) and re-check
  if (norm.length > 4 && /^[وفبلك]/.test(norm)) {
    const stripped = norm.slice(1);
    if (FOOTNOTE_CATALOG[stripped]) {
      const entry = FOOTNOTE_CATALOG[stripped];
      return {
        id: `fn-${word.id}`,
        arabicTerm: word.arabic,
        ...entry,
        root: entry.root ?? word.root,
      };
    }
  }

  return buildDefiniteArticleFootnote(word);
}

export function getAyahFootnotes(words: WordToken[]): AyahFootnoteItem[] {
  const items: AyahFootnoteItem[] = [];
  let counter = 1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const footnote = getWordFootnote(word);
    if (footnote) {
      items.push({
        number: counter++,
        wordIndex: i,
        word,
        footnote,
      });
    }
  }

  return items;
}
