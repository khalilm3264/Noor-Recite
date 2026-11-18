import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURED_SURAHS } from '../src/data/quranData';
import { BookmarkItem, ReaderSettings } from '../src/types/quran';
import {
  buildDefaultPdfExportOptions,
  buildPdfDocumentEntries,
  sanitizePdfFilename,
  toArabicIndicNumerals,
} from '../src/utils/pdfExport';

const BASE_SETTINGS: ReaderSettings = {
  arabicFont: 'amiri',
  arabicFontSize: 34,
  translationLanguage: 'en',
  showTransliteration: true,
  showTranslation: true,
  showTajweedColors: true,
  alwaysShowFootnotes: true,
  reciterId: 'ghamdi',
  playbackSpeed: 1,
  repeatMode: 'off',
  syncOffsetSec: 0,
  riwayah: 'hafs',
  maghrebiOrthography: false,
};

test('toArabicIndicNumerals converts digits cleanly', () => {
  assert.equal(toArabicIndicNumerals(1), '١');
  assert.equal(toArabicIndicNumerals(255), '٢٥٥');
  assert.equal(toArabicIndicNumerals(114), '١١٤');
});

test('sanitizePdfFilename creates clean portable .pdf filenames', () => {
  assert.equal(
    sanitizePdfFilename('Noor-Recite-Surah-001-Al-Fatiha.pdf'),
    'Noor-Recite-Surah-001-Al-Fatiha.pdf'
  );
  assert.equal(
    sanitizePdfFilename('Friday & Nightly Wird!'),
    'Friday-Nightly-Wird.pdf'
  );
});

test('buildPdfDocumentEntries exports full selected Surah with Bismillah and all ayahs', () => {
  const fatiha = FEATURED_SURAHS[0];
  const options = buildDefaultPdfExportOptions({
    scope: 'surah',
    surah: fatiha,
    bookmarks: [],
    settings: BASE_SETTINGS,
  });

  const doc = buildPdfDocumentEntries({
    surah: fatiha,
    bookmarks: [],
    options,
  });

  assert.equal(doc.entries.length, fatiha.ayahs.length);
  assert.equal(doc.entries[0].verseKey, '1:1');
  assert.equal(doc.entries[doc.entries.length - 1].verseKey, '1:7');
  assert.ok(doc.entries[0].transliteration);
  assert.ok(doc.entries[0].translation);
  assert.ok(doc.meta.openerIstiadhah);
  assert.equal(doc.meta.openerBismillah, undefined);
  assert.equal(doc.meta.suggestedFilename, 'Noor-Recite-Surah-001-Al-Fatiha.pdf');

  const withBismillah = FEATURED_SURAHS.find((s) => s.hasBismillah);
  assert.ok(withBismillah);
  const docWithBismillah = buildPdfDocumentEntries({
    surah: withBismillah,
    bookmarks: [],
    options: buildDefaultPdfExportOptions({
      scope: 'surah',
      surah: withBismillah,
      bookmarks: [],
      settings: BASE_SETTINGS,
    }),
  });
  assert.ok(docWithBismillah.meta.openerBismillah);
});

test('buildPdfDocumentEntries normalizes Surah ayah ranges and respects content toggles', () => {
  const fatiha = FEATURED_SURAHS[0];
  const options = {
    ...buildDefaultPdfExportOptions({
      scope: 'surah',
      surah: fatiha,
      bookmarks: [],
      settings: BASE_SETTINGS,
    }),
    ayahStart: 6,
    ayahEnd: 3, // Intentionally reversed to verify range normalization
    includeTransliteration: false,
    includeTranslation: false,
    includeTafsirOrNotes: false,
    includeBismillah: false,
  };

  const doc = buildPdfDocumentEntries({
    surah: fatiha,
    bookmarks: [],
    options,
  });

  assert.deepEqual(
    doc.entries.map((e) => e.ayahNumber),
    [3, 4, 5, 6]
  );
  assert.equal(doc.meta.openerBismillah, undefined);
  assert.equal(doc.entries[0].transliteration, undefined);
  assert.equal(doc.entries[0].translation, undefined);
  assert.equal(doc.entries[0].noteText, undefined);
  assert.equal(
    doc.meta.suggestedFilename,
    'Noor-Recite-Surah-001-Al-Fatiha-Ayahs-3-6.pdf'
  );
});

test('buildPdfDocumentEntries exports only selected bookmarked verses with reflections', () => {
  const fatiha = FEATURED_SURAHS[0];
  const bookmarks: BookmarkItem[] = [
    {
      verseKey: '1:5',
      surahId: 1,
      surahName: 'Al-Fatiha',
      ayahNumber: 5,
      arabic: fatiha.ayahs[4].arabic,
      translation: fatiha.ayahs[4].translation,
      note: 'Pivot of the prayer.',
      savedAt: 'Today',
      collectionId: 'col-heart',
    },
    {
      verseKey: '94:5',
      surahId: 94,
      surahName: 'Ash-Sharh',
      ayahNumber: 5,
      arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
      translation: 'For indeed, with hardship comes ease.',
      note: '',
      savedAt: 'Yesterday',
    },
  ];

  const options = buildDefaultPdfExportOptions({
    scope: 'bookmarks',
    surah: fatiha,
    bookmarks,
    settings: BASE_SETTINGS,
    preselectedBookmarkKeys: ['1:5'],
  });

  const knownSurahsById = Object.fromEntries(FEATURED_SURAHS.map((s) => [s.id, s]));
  const doc = buildPdfDocumentEntries({
    surah: fatiha,
    bookmarks,
    options,
    knownSurahsById,
    activeCollectionFilterName: 'Heart & Steadfastness',
  });

  assert.equal(doc.entries.length, 1);
  assert.equal(doc.entries[0].verseKey, '1:5');
  assert.equal(doc.entries[0].noteLabel, 'Personal Reflection');
  assert.equal(doc.entries[0].noteText, 'Pivot of the prayer.');
  assert.ok(doc.entries[0].transliteration);
  assert.equal(
    doc.meta.suggestedFilename,
    'Noor-Recite-Bookmarks-Heart-Steadfastness.pdf'
  );
});
