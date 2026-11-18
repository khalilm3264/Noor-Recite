import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASMALAH_OPENER,
  ISTIADHAH_OPENER,
  alignTranslationSegments,
  joinTranslationTokens,
  tokenizeTranslationForAlignment,
} from '../src/data/quranData.ts';
import {
  getAyahTranslationSegments,
  getAyahTranslationText,
  resolveEffectiveSyncedWordIndex,
} from '../src/utils/translationConfig.ts';
import type { WordToken } from '../src/types/quran.ts';

test('Chinese (zh) tokenization splits CJK words without collapsing or adding spaces', () => {
  const tokens = tokenizeTranslationForAlignment('奉至仁至慈的真主之名。', 'zh');
  assert.ok(tokens.length >= 4, `Expected >= 4 tokens, got ${JSON.stringify(tokens)}`);
  assert.equal(joinTranslationTokens(tokens, 'zh'), '奉至仁至慈的真主之名。');

  const cleaned = tokenizeTranslationForAlignment('奉 至仁 至慈 的 真主 之名。', 'zh');
  assert.equal(joinTranslationTokens(cleaned, 'zh'), '奉至仁至慈的真主之名。');
});

test('French (fr) elisions like d’Allah align to the Allah Arabic word token', () => {
  const frText = ISTIADHAH_OPENER.translations?.fr ?? '';
  const segs = alignTranslationSegments(frText, ISTIADHAH_OPENER.words, 'fr');
  assert.ok(segs && segs.length > 0);
  const allahSeg = segs.find((s) => s.text.includes('Allah'));
  assert.ok(allahSeg, 'Expected a segment containing Allah');
  assert.equal(allahSeg.wordIndex, 1);

  const basmalahFr = BASMALAH_OPENER.translations?.fr ?? '';
  const basmalahSegs = alignTranslationSegments(basmalahFr, BASMALAH_OPENER.words, 'fr');
  assert.ok(basmalahSegs && basmalahSegs.length > 0);
  const basmalahAllah = basmalahSegs.find((s) => s.text.includes('Allah'));
  assert.ok(basmalahAllah);
  assert.equal(basmalahAllah.wordIndex, 1);
});

test('Spanish (es) and Chinese (zh) verse alignments produce valid in-bounds wordIndex segments', () => {
  const sampleWords: WordToken[] = [
    { id: 'w1', arabic: 'بِسْمِ', transliteration: 'Bismi', meaning: 'In the name of' },
    { id: 'w2', arabic: 'ٱللَّهِ', transliteration: 'Allahi', meaning: 'Allah' },
    { id: 'w3', arabic: 'ٱلرَّحْمَـٰنِ', transliteration: 'ar-Rahmani', meaning: 'the Most Merciful' },
    { id: 'w4', arabic: 'ٱلرَّحِيمِ', transliteration: 'ar-Rahim', meaning: 'the Especially Merciful' },
  ];

  const zhSegs = alignTranslationSegments('奉至仁至慈的真主之名。', sampleWords, 'zh');
  assert.ok(zhSegs && zhSegs.length >= 3);
  for (const seg of zhSegs) {
    assert.ok(seg.wordIndex >= 0 && seg.wordIndex < sampleWords.length);
  }

  const esSegs = alignTranslationSegments(
    'En el nombre de Allah, el Misericordioso, el Compasivo.',
    sampleWords,
    'es'
  );
  assert.ok(esSegs && esSegs.length >= 3);
  for (const seg of esSegs) {
    assert.ok(seg.wordIndex >= 0 && seg.wordIndex < sampleWords.length);
  }
});

test('resolveEffectiveSyncedWordIndex prevents blank translation highlights when words outnumber tokens', () => {
  const sparseSegments = [
    { text: '奉', wordIndex: 0 },
    { text: '真主', wordIndex: 2 },
    { text: '之名。', wordIndex: 4 },
  ];

  assert.equal(resolveEffectiveSyncedWordIndex(null, sparseSegments), null);
  assert.equal(resolveEffectiveSyncedWordIndex(0, sparseSegments), 0);
  assert.equal(resolveEffectiveSyncedWordIndex(1, sparseSegments), 0);
  assert.equal(resolveEffectiveSyncedWordIndex(2, sparseSegments), 2);
  assert.equal(resolveEffectiveSyncedWordIndex(3, sparseSegments), 2);
  assert.equal(resolveEffectiveSyncedWordIndex(4, sparseSegments), 4);
});

test('Opener translations and segments resolve cleanly for zh, es, and fr', () => {
  for (const lang of ['zh', 'es', 'fr'] as const) {
    const resolved = getAyahTranslationText(BASMALAH_OPENER, lang);
    assert.equal(resolved.resolvedLang, lang);
    assert.ok(resolved.text.length > 0);
    const segs =
      getAyahTranslationSegments(BASMALAH_OPENER, lang) ??
      alignTranslationSegments(resolved.text, BASMALAH_OPENER.words, lang);
    assert.ok(segs && segs.length > 0);
  }
});
