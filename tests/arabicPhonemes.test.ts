import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ARABIC_PHONEMES,
  IPA_MANNERS,
  IPA_PLACES,
  MAKHRAJ_GROUPS,
  PHONEME_BY_ID,
} from '../src/data/arabicPhonemes';
import {
  buildPhonemePracticePrompt,
  buildPhonemeReferenceContour,
  evaluatePhonemeTone,
  getPhonemeAudioUrl,
  type PhonemeMicSample,
} from '../src/utils/phonemeGrading';

test('covers all 28 Arabic consonants plus Alif Madd (29 phonemes) with unique ids and letters', () => {
  assert.equal(ARABIC_PHONEMES.length, 29);

  const ids = new Set(ARABIC_PHONEMES.map((p) => p.id));
  const letters = new Set(ARABIC_PHONEMES.map((p) => p.letter));
  assert.equal(ids.size, ARABIC_PHONEMES.length);
  assert.equal(letters.size, ARABIC_PHONEMES.length);

  const requiredLetters = [
    'ء', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ',
    'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ',
    'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
  ];
  for (const ch of requiredLetters) {
    assert.ok(letters.has(ch), `Expected letter ${ch} in ARABIC_PHONEMES`);
  }
});

test('every Arabic phoneme has a pre-generated local MP3 audio file for Hear Letter', () => {
  for (const p of ARABIC_PHONEMES) {
    const url = getPhonemeAudioUrl(p.id);
    assert.equal(url, `/audio/phonemes/${p.id}.mp3`);
    const filePath = path.resolve('public', url.replace(/^\//, ''));
    assert.ok(fs.existsSync(filePath), `Missing phoneme MP3: ${filePath}`);
    assert.ok(
      fs.statSync(filePath).size > 1000,
      `Phoneme MP3 too small/empty: ${filePath}`
    );
  }
});

test('provides accurate interdental tongue-between-teeth guidance for ظ, ذ, and ث', () => {
  const zaa = ARABIC_PHONEMES.find((p) => p.letter === 'ظ');
  const dhal = ARABIC_PHONEMES.find((p) => p.letter === 'ذ');
  const tha = ARABIC_PHONEMES.find((p) => p.letter === 'ث');

  assert.ok(zaa);
  assert.equal(zaa.ipa, '/ðˤ/');
  assert.equal(zaa.emphatic, true);
  assert.equal(zaa.voiced, true);
  assert.equal(zaa.placeOfArticulation, 'interdental');
  assert.equal(zaa.tonguePose, 'interdental-heavy');
  assert.ok(zaa.howToPronounce.toLowerCase().includes('between'));
  assert.ok(zaa.howToPronounce.toLowerCase().includes('th'));

  assert.ok(dhal);
  assert.equal(dhal.ipa, '/ð/');
  assert.equal(dhal.emphatic, false);
  assert.equal(dhal.tonguePose, 'interdental-light');

  assert.ok(tha);
  assert.equal(tha.ipa, '/θ/');
  assert.equal(tha.voiced, false);
  assert.equal(tha.tonguePose, 'interdental-light');
});

test('includes valid Makhraj groups, IPA matrix coordinates, and similar-letter cross-references', () => {
  const validGroups = new Set(MAKHRAJ_GROUPS.map((g) => g.id));
  const validPlaces = new Set(IPA_PLACES.map((p) => p.id));
  const validManners = new Set(IPA_MANNERS.map((m) => m.id));

  for (const p of ARABIC_PHONEMES) {
    assert.deepEqual(PHONEME_BY_ID.get(p.id), p);
    assert.ok(validGroups.has(p.makhrajGroup));
    assert.ok(validPlaces.has(p.placeOfArticulation));
    assert.ok(validManners.has(p.mannerOfArticulation));
    assert.ok(p.ipa.startsWith('/') && p.ipa.endsWith('/'));
    assert.ok(p.howToPronounce.trim().length > 20);
    assert.ok(p.tongueStep.trim().length > 10);
    assert.ok(p.englishAnchor.trim().length > 3);
    assert.ok(p.contactMarker.x > 0);
    assert.ok(p.contactMarker.y > 0);
    assert.ok(p.quranExample.surahId >= 1);
    assert.ok(p.quranExample.ayahNumber >= 1);
    assert.equal(
      p.quranExample.verseKey,
      `${p.quranExample.surahId}:${p.quranExample.ayahNumber}`
    );
    for (const simId of p.similarLetters) {
      assert.ok(
        PHONEME_BY_ID.has(simId),
        `Missing similarLetter reference ${simId} on ${p.id}`
      );
    }
  }
});

test('marks the 7 classical Istiʿlāʾ (always-heavy) consonants correctly', () => {
  const heavyLetters = new Set(
    ARABIC_PHONEMES.filter((p) => p.emphatic).map((p) => p.letter)
  );
  for (const ch of ['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ']) {
    assert.ok(heavyLetters.has(ch), `Expected ${ch} to be marked emphatic`);
  }
  assert.equal(heavyLetters.size, 7);
});

test('evaluatePhonemeTone rejects silent/faint audio, caps mismatched speech, and coaches Tafkhim depth on ظ', () => {
  const zaa = PHONEME_BY_ID.get('zaa-heavy')!;
  assert.equal(buildPhonemePracticePrompt(zaa, 'letter'), 'ظَ أَظْ');
  assert.equal(buildPhonemePracticePrompt(zaa, 'word'), zaa.quranExample.word);

  const contour = buildPhonemeReferenceContour(zaa, 24);
  assert.equal(contour.length, 24);
  for (const pt of contour) {
    assert.ok(pt >= 0 && pt <= 1);
  }

  // Faint input
  const quiet = evaluatePhonemeTone(zaa, 'letter', [], 0.5, 0.1, 0.005, null);
  assert.ok(quiet.overallScore < 30);
  assert.equal(quiet.ratingLabel, 'Too Faint');

  const makeSamples = (fullness: number): PhonemeMicSample[] =>
    Array.from({ length: 16 }, (_, idx) => ({
      tMs: idx * 65,
      rms: 0.14,
      pitchHz: 158 + (idx % 2),
      fullness,
    }));

  // Non-Arabic speech cap
  const mismatched = evaluatePhonemeTone(zaa, 'letter', makeSamples(0.68), 1.1, 0.9, 0.18, {
    transcript: 'hello testing',
    isArabicSpeech: false,
    wordMatchRatio: 0,
    charSimilarity: 0,
    perWordAccuracy: [0],
    matchedWordCount: 0,
    expectedWordCount: 2,
  });
  assert.ok(mismatched.overallScore <= 48);
  assert.equal(mismatched.isMatchedSpeech, false);

  // Light/thin Tafkhim warning on ظ
  const thinZaa = evaluatePhonemeTone(zaa, 'letter', makeSamples(0.36), 1.1, 0.9, 0.18, {
    transcript: 'ظ',
    isArabicSpeech: true,
    wordMatchRatio: 0.5,
    charSimilarity: 0.6,
    perWordAccuracy: [85],
    matchedWordCount: 1,
    expectedWordCount: 2,
  });
  assert.ok(thinZaa.coachTip.toLowerCase().includes('back of your tongue'));

  // Strong deep Tafkhim + matched ظ
  const strongZaa = evaluatePhonemeTone(zaa, 'letter', makeSamples(0.72), 1.1, 0.9, 0.18, {
    transcript: 'ظ أظ',
    isArabicSpeech: true,
    wordMatchRatio: 1,
    charSimilarity: 0.95,
    perWordAccuracy: [100, 95],
    matchedWordCount: 2,
    expectedWordCount: 2,
  });
  assert.ok(strongZaa.overallScore >= 80);
  assert.ok(strongZaa.weightMatchScore > thinZaa.weightMatchScore);
});
