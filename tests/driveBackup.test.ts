import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNoorBackupJson, type NoorDriveBackupPayload } from '../src/utils/googleDriveApi';

const backup = {
  app: 'Noor Recite',
  version: 1,
  exportedAt: '2026-11-18T13:00:00.000Z',
  settings: {
    arabicFont: 'amiri', arabicFontSize: 34, translationLanguage: 'en',
    showTransliteration: true, showTranslation: true, showTajweedColors: true,
    alwaysShowFootnotes: true, reciterId: 'ghamdi', playbackSpeed: 1,
    repeatMode: 'off', syncOffsetSec: 0,
  },
  darkMode: false,
  dailyGoal: 5,
  bookmarks: [{
    verseKey: '1:1', surahId: 1, surahName: 'Al-Fatiha', ayahNumber: 1,
    arabic: '', translation: '', note: '', savedAt: '2026-11-18',
  }],
  bookmarkCollections: [],
  khatmahPlan: {
    targetDays: 30, currentDay: 1, pagesCompleted: 0, totalPages: 604,
    juzNumber: 1, scheduleStyle: 'five-prayers', hifzSyncEnabled: true,
    salahRemindersEnabled: true, streakDays: [0], slots: [],
  },
  hifzSpacedQueue: [],
  hifzWeakWords: [],
  recitationHistory: [],
  hifzProgressEvents: [],
} satisfies NoorDriveBackupPayload;

test('version 1 snapshots retain study data with or without optional fields', () => {
  assert.deepEqual(parseNoorBackupJson(JSON.stringify(backup)), backup);
  const withPreferences = { ...backup, settings: { ...backup.settings, riwayah: 'warsh' } };
  assert.deepEqual(parseNoorBackupJson(JSON.stringify(withPreferences)), withPreferences);
});

test('invalid or unsupported snapshots are rejected before replacing local state', () => {
  for (const change of [
    { version: 2 },
    { exportedAt: 'invalid date' },
    { bookmarks: [null] },
    { bookmarks: [{ ...backup.bookmarks[0], note: {} }] },
    { settings: { ...backup.settings, translationLanguage: ['en'] } },
    { khatmahPlan: { ...backup.khatmahPlan, slots: [null] } },
    { bookmarkCollections: [null] },
    { hifzSpacedQueue: [{}] },
    { hifzWeakWords: [{}] },
    { recitationHistory: [null] },
    { hifzProgressEvents: [3] },
  ]) {
    assert.equal(parseNoorBackupJson(JSON.stringify({ ...backup, ...change })), null);
  }
  assert.equal(parseNoorBackupJson('{'), null);
});
