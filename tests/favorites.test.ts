import assert from 'node:assert/strict';
import test from 'node:test';
import { FavoriteItem } from '../src/types/quran';
import {
  filterFavorites,
  getDuaFavoriteId,
  getHadithFavoriteId,
  getSalahFavoriteId,
  getVerseFavoriteId,
  isFavoriteItem,
  toggleFavoriteItem,
} from '../src/utils/favorites';
import { parseNoorBackupJson, type NoorDriveBackupPayload } from '../src/utils/googleDriveApi';

const sampleFavorites: FavoriteItem[] = [
  {
    id: getVerseFavoriteId('2:255'),
    type: 'verse',
    title: 'Al-Baqarah · Ayah 255',
    subtitle: 'البقرة · Juz 3',
    arabic: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ',
    translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer.',
    reference: 'Qur’an 2:255',
    savedAt: 'Nov 19',
    surahId: 2,
    ayahNumber: 255,
    verseKey: '2:255',
  },
  {
    id: getDuaFavoriteId('dua-prophets-rabbi-requests', 'musa-sadri'),
    type: 'dua',
    title: 'Prophetic Rabbi Requests',
    subtitle: 'Duas of the Prophets in the Qur’an',
    arabic: 'رَبِّ ٱشْرَحْ لِى صَدْرِى',
    transliteration: 'Rabbi shrah li sadri',
    translation: 'My Lord, expand for me my breast.',
    reference: 'Qur’an 20:25–28',
    savedAt: 'Nov 19',
    duaId: 'dua-prophets-rabbi-requests',
    duaVariantId: 'musa-sadri',
    duaVariantLabel: 'Musa: Expand My Chest',
  },
  {
    id: getHadithFavoriteId('hadith-actions-intentions'),
    type: 'hadith',
    title: 'Actions Are By Intentions',
    subtitle: 'Narrated by Umar ibn al-Khattab',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    translation: 'Actions are judged only by intentions.',
    reference: 'Sahih al-Bukhari 1',
    savedAt: 'Nov 19',
    hadithId: 'hadith-actions-intentions',
  },
  {
    id: getSalahFavoriteId('step:step-sujud'),
    type: 'salah',
    title: 'Tasbih in Sujud',
    subtitle: 'Prostration · 3x',
    arabic: 'سُبْحَانَ رَبِّيَ الأَعْلَى',
    translation: 'Glory be to my Lord, the Most High.',
    reference: 'Sujud',
    savedAt: 'Nov 19',
    salahStepId: 'step-sujud',
    salahTab: 'steps',
  },
];

test('favorite IDs distinguish specific variations of the same Dua card and toggle cleanly', () => {
  const idPrimary = getDuaFavoriteId('dua-morning', 'primary');
  const idAlt = getDuaFavoriteId('dua-morning', 'alt-2');
  assert.notEqual(idPrimary, idAlt);

  let list: FavoriteItem[] = [];
  list = toggleFavoriteItem(list, sampleFavorites[0]);
  list = toggleFavoriteItem(list, sampleFavorites[1]);
  assert.equal(list.length, 2);
  assert.equal(list[0].id, sampleFavorites[1].id);

  // Toggling existing favorite removes it without mutating other items
  list = toggleFavoriteItem(list, sampleFavorites[1]);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, sampleFavorites[0].id);
});

test('filterFavorites filters across types, variation labels, Arabic text, and references', () => {
  assert.equal(filterFavorites(sampleFavorites, 'all', '').length, 4);
  assert.equal(filterFavorites(sampleFavorites, 'verse', '').length, 1);
  assert.equal(filterFavorites(sampleFavorites, 'dua', '').length, 1);
  assert.equal(filterFavorites(sampleFavorites, 'hadith', '').length, 1);
  assert.equal(filterFavorites(sampleFavorites, 'salah', '').length, 1);

  const musaMatch = filterFavorites(sampleFavorites, 'all', 'Musa');
  assert.equal(musaMatch.length, 1);
  assert.equal(musaMatch[0].duaVariantId, 'musa-sadri');

  const arabicMatch = filterFavorites(sampleFavorites, 'all', 'صَدْرِى');
  assert.equal(arabicMatch.length, 1);
  assert.equal(arabicMatch[0].type, 'dua');
});

test('isFavoriteItem and Drive backup parser validate optional favorites safely', () => {
  for (const fav of sampleFavorites) {
    assert.equal(isFavoriteItem(fav), true);
  }
  assert.equal(isFavoriteItem({ id: 'x', type: 'unknown' }), false);
  assert.equal(isFavoriteItem(null), false);

  const backupWithFavorites: NoorDriveBackupPayload = {
    app: 'Noor Recite',
    version: 1,
    exportedAt: '2026-11-19T12:00:00.000Z',
    settings: {
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
      playAllDuaVariations: true,
    },
    darkMode: false,
    dailyGoal: 10,
    bookmarks: [],
    bookmarkCollections: [],
    favorites: sampleFavorites,
    khatmahPlan: {
      targetDays: 30,
      currentDay: 1,
      pagesCompleted: 0,
      totalPages: 604,
      juzNumber: 1,
      scheduleStyle: 'five-prayers',
      hifzSyncEnabled: true,
      salahRemindersEnabled: true,
      streakDays: [0],
      slots: [],
    },
    hifzSpacedQueue: [],
    hifzWeakWords: [],
    recitationHistory: [],
    hifzProgressEvents: [],
  };

  assert.deepEqual(
    parseNoorBackupJson(JSON.stringify(backupWithFavorites)),
    backupWithFavorites
  );
  assert.equal(
    parseNoorBackupJson(
      JSON.stringify({ ...backupWithFavorites, favorites: [{ bad: true }] })
    ),
    null
  );
});
