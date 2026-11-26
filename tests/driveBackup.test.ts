import assert from 'node:assert/strict';
import test from 'node:test';
import { listNoorBackupFiles, parseNoorBackupJson, readDriveFilePreview, type NoorDriveBackupPayload } from '../src/utils/googleDriveApi';

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

test('an existing Study-folder backup can be listed, read, and validated for restore', async (t) => {
  const file = { id: 'existing-backup', name: 'noor-recite-backup.json', mimeType: 'application/json' };
  t.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    const url = new URL(input);
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer per-file-token');
    if (url.pathname === '/drive/v3/files') {
      assert.match(url.searchParams.get('q') ?? '', /^'study-folder' in parents/);
      return Response.json({ files: [file] });
    }
    assert.equal(url.pathname, '/drive/v3/files/existing-backup');
    assert.equal(url.searchParams.get('alt'), 'media');
    return Response.json(backup);
  });
  const [listed] = await listNoorBackupFiles('per-file-token', 'study-folder');
  const preview = await readDriveFilePreview('per-file-token', listed);
  assert.deepEqual(parseNoorBackupJson(preview.textContent ?? ''), backup);
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
