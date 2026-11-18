import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURED_SURAHS } from '../src/data/quranData';
import { formatAyahClipboardText } from '../src/utils/clipboard';

test('formatAyahClipboardText includes Arabic text and active English translation', () => {
  const ayah = FEATURED_SURAHS[0].ayahs[0];
  const formatted = formatAyahClipboardText(ayah, {
    translationLanguage: 'en',
    riwayah: 'hafs',
    maghrebiOrthography: false,
  });

  assert.ok(formatted.includes(ayah.arabic));
  assert.ok(formatted.includes(ayah.translation));
  assert.ok(formatted.includes(`(Qur'an ${ayah.verseKey})`));
});

test('formatAyahClipboardText uses active non-English translation when selected', () => {
  const ayah = FEATURED_SURAHS[0].ayahs[1];
  const formattedUr = formatAyahClipboardText(ayah, {
    translationLanguage: 'ur',
    riwayah: 'hafs',
    maghrebiOrthography: false,
  });

  assert.ok(formattedUr.includes(ayah.arabic));
  assert.ok(ayah.translationUr && formattedUr.includes(ayah.translationUr));
  assert.ok(!formattedUr.includes(ayah.translation));
});
