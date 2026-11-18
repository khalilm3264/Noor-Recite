import {
  BookmarkCollection,
  BookmarkItem,
  HifzSpacedItem,
  HifzWeakWord,
  KhatmahPlanState,
  ReaderSettings,
} from '../types/quran';
import { RecitationHistoryEntry } from './recitationHistory';
import { HifzProgressEvent } from './hifzProgress';

export const NOOR_DRIVE_FOLDER_NAME = 'Noor Recite Study';
export const NOOR_BACKUP_MIME_HINT = 'application/json';
export const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
export const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
export const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
export const GOOGLE_SLIDE_MIME = 'application/vnd.google-apps.presentation';

export class DriveAuthExpiredError extends Error {
  constructor(message = 'Your Google Drive access session expired. Please sign in again.') {
    super(message);
    this.name = 'DriveAuthExpiredError';
  }
}

export class DriveApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  trashed?: boolean;
  starred?: boolean;
  description?: string;
}

export interface DriveAboutInfo {
  user?: {
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  };
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
  };
}

export interface DriveActivityEntry {
  timestamp: string;
  actionLabel: string;
}

export interface NoorDriveBackupPayload {
  app: 'Noor Recite';
  version: 1;
  exportedAt: string;
  accountEmail?: string;
  settings: ReaderSettings;
  darkMode: boolean;
  dailyGoal: number;
  bookmarks: BookmarkItem[];
  bookmarkCollections: BookmarkCollection[];
  khatmahPlan: KhatmahPlanState;
  hifzSpacedQueue: HifzSpacedItem[];
  hifzWeakWords: HifzWeakWord[];
  recitationHistory: RecitationHistoryEntry[];
  hifzProgressEvents: HifzProgressEvent[];
}

const FILE_FIELDS =
  'id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents,trashed,starred,description';

async function driveFetch(
  token: string,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    throw new DriveAuthExpiredError();
  }
  if (!res.ok) {
    let message = `Google Drive request failed (${res.status})`;
    try {
      const errData = (await res.json()) as {
        error?: { message?: string };
      };
      if (errData?.error?.message) {
        message = errData.error.message;
      }
    } catch {
      // ignore non-json error response
    }
    throw new DriveApiError(message, res.status);
  }
  return res;
}

export async function fetchDriveAbout(token: string): Promise<DriveAboutInfo> {
  const res = await driveFetch(
    token,
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive)'
  );
  return (await res.json()) as DriveAboutInfo;
}

export type DriveListScope =
  | 'noor-folder'
  | 'all'
  | 'docs'
  | 'media'
  | 'appdata'
  | 'trashed';

export interface ListDriveFilesOptions {
  scope: DriveListScope;
  searchQuery?: string;
  noorFolderId?: string | null;
  pageSize?: number;
}

function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function listDriveFiles(
  token: string,
  options: ListDriveFilesOptions
): Promise<DriveFileItem[]> {
  const clauses: string[] = [];
  let spaces = 'drive';

  if (options.scope === 'appdata') {
    spaces = 'appDataFolder';
  } else if (options.scope === 'trashed') {
    clauses.push('trashed = true');
  } else {
    clauses.push('trashed = false');
    if (options.scope === 'noor-folder' && options.noorFolderId) {
      clauses.push(`'${escapeDriveQueryValue(options.noorFolderId)}' in parents`);
    } else if (options.scope === 'docs') {
      clauses.push(
        `(mimeType = '${GOOGLE_DOC_MIME}' or mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/json')`
      );
    } else if (options.scope === 'media') {
      clauses.push(
        `(mimeType = 'application/pdf' or mimeType contains 'audio/' or mimeType contains 'image/')`
      );
    }
  }

  const qTrim = options.searchQuery?.trim();
  if (qTrim) {
    clauses.push(`name contains '${escapeDriveQueryValue(qTrim)}'`);
  }

  const params = new URLSearchParams({
    spaces,
    pageSize: String(options.pageSize ?? 50),
    orderBy: 'folder,modifiedTime desc',
    fields: `files(${FILE_FIELDS})`,
  });
  if (clauses.length > 0) {
    params.set('q', clauses.join(' and '));
  }

  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
}

export async function findNoorFolder(token: string): Promise<DriveFileItem | null> {
  const params = new URLSearchParams({
    spaces: 'drive',
    pageSize: '5',
    fields: `files(${FILE_FIELDS})`,
    q: `name = '${escapeDriveQueryValue(NOOR_DRIVE_FOLDER_NAME)}' and mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false`,
  });
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files?.[0] ?? null;
}

export async function findOrCreateNoorFolder(token: string): Promise<DriveFileItem> {
  const existing = await findNoorFolder(token);
  if (existing) return existing;

  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: NOOR_DRIVE_FOLDER_NAME,
        mimeType: GOOGLE_FOLDER_MIME,
        description: 'Quranic study backups, bookmarks, and contemplation notes from Noor Recite',
      }),
    }
  );
  return (await res.json()) as DriveFileItem;
}

export async function listNoorBackupFiles(
  token: string,
  noorFolderId?: string | null
): Promise<DriveFileItem[]> {
  const parentClause = noorFolderId
    ? `('${escapeDriveQueryValue(noorFolderId)}' in parents or name contains 'noor-recite-backup')`
    : `name contains 'noor-recite-backup'`;
  const params = new URLSearchParams({
    spaces: 'drive',
    pageSize: '25',
    orderBy: 'modifiedTime desc',
    fields: `files(${FILE_FIELDS})`,
    q: `${parentClause} and mimeType = 'application/json' and trashed = false`,
  });
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
}

function buildMultipartBody(
  boundary: string,
  metadata: Record<string, unknown>,
  content: Blob | string,
  contentType: string
): Blob {
  const headerPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`;
  const footerPart = `\r\n--${boundary}--`;
  return new Blob([headerPart, content, footerPart]);
}

export async function createDriveMultipartFile(
  token: string,
  metadata: {
    name: string;
    mimeType?: string;
    parents?: string[];
    description?: string;
  },
  content: Blob | string,
  uploadContentType: string
): Promise<DriveFileItem> {
  const boundary = `noor_drive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const body = buildMultipartBody(boundary, metadata, content, uploadContentType);
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  return (await res.json()) as DriveFileItem;
}

export async function overwriteDriveMultipartFile(
  token: string,
  fileId: string,
  metadataPatch: {
    name?: string;
    description?: string;
  },
  content: Blob | string,
  uploadContentType: string
): Promise<DriveFileItem> {
  const boundary = `noor_drive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const body = buildMultipartBody(boundary, metadataPatch, content, uploadContentType);
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  return (await res.json()) as DriveFileItem;
}

export async function updateDriveFileMetadata(
  token: string,
  fileId: string,
  patch: {
    name?: string;
    trashed?: boolean;
    starred?: boolean;
    description?: string;
  }
): Promise<DriveFileItem> {
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }
  );
  return (await res.json()) as DriveFileItem;
}

export async function deleteDriveFilePermanently(
  token: string,
  fileId: string
): Promise<void> {
  await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
    }
  );
}

export interface DriveFilePreviewResult {
  kind: 'text' | 'json' | 'image' | 'audio' | 'pdf' | 'unsupported';
  textContent?: string;
  objectUrl?: string;
  exportedExtension?: string;
}

export async function readDriveFilePreview(
  token: string,
  file: DriveFileItem
): Promise<DriveFilePreviewResult> {
  const isGoogleDoc = file.mimeType === GOOGLE_DOC_MIME;
  const isGoogleSheet = file.mimeType === GOOGLE_SHEET_MIME;
  const isGoogleSlide = file.mimeType === GOOGLE_SLIDE_MIME;

  if (isGoogleDoc || isGoogleSheet || isGoogleSlide) {
    const exportMime = isGoogleSheet ? 'text/csv' : 'text/plain';
    const res = await driveFetch(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exportMime)}`
    );
    const textContent = await res.text();
    return {
      kind: 'text',
      textContent,
      exportedExtension: isGoogleSheet ? 'csv' : 'txt',
    };
  }

  if (file.mimeType === GOOGLE_FOLDER_MIME) {
    return { kind: 'unsupported', textContent: 'Folders cannot be previewed directly.' };
  }

  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`
  );

  if (file.mimeType.startsWith('image/')) {
    const blob = await res.blob();
    return { kind: 'image', objectUrl: URL.createObjectURL(blob) };
  }

  if (file.mimeType.startsWith('audio/')) {
    const blob = await res.blob();
    return { kind: 'audio', objectUrl: URL.createObjectURL(blob) };
  }

  if (file.mimeType === 'application/pdf') {
    const blob = await res.blob();
    return { kind: 'pdf', objectUrl: URL.createObjectURL(blob) };
  }

  if (
    file.mimeType === 'application/json' ||
    file.name.toLowerCase().endsWith('.json')
  ) {
    const textContent = await res.text();
    return { kind: 'json', textContent };
  }

  if (
    file.mimeType.startsWith('text/') ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.txt') ||
    file.name.toLowerCase().endsWith('.csv')
  ) {
    const textContent = await res.text();
    return { kind: 'text', textContent };
  }

  const blob = await res.blob();
  return { kind: 'unsupported', objectUrl: URL.createObjectURL(blob) };
}

export async function downloadDriveFileBlob(
  token: string,
  file: DriveFileItem
): Promise<{ blob: Blob; downloadName: string }> {
  const isGoogleDoc = file.mimeType === GOOGLE_DOC_MIME;
  const isGoogleSheet = file.mimeType === GOOGLE_SHEET_MIME;
  const isGoogleSlide = file.mimeType === GOOGLE_SLIDE_MIME;

  if (isGoogleDoc || isGoogleSheet || isGoogleSlide) {
    const exportMime = isGoogleSheet
      ? 'text/csv'
      : isGoogleDoc
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf';
    const ext = isGoogleSheet ? '.csv' : isGoogleDoc ? '.docx' : '.pdf';
    const res = await driveFetch(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exportMime)}`
    );
    return {
      blob: await res.blob(),
      downloadName: file.name.endsWith(ext) ? file.name : `${file.name}${ext}`,
    };
  }

  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`
  );
  return {
    blob: await res.blob(),
    downloadName: file.name,
  };
}

export async function fetchDriveFileActivity(
  token: string,
  fileId: string
): Promise<DriveActivityEntry[]> {
  try {
    const res = await driveFetch(
      token,
      'https://www.googleapis.com/driveactivity/v2/activity:query',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: `items/${fileId}`,
          pageSize: 6,
        }),
      }
    );
    const data = (await res.json()) as {
      activities?: Array<{
        timestamp?: string;
        timeRange?: { endTime?: string };
        primaryActionDetail?: Record<string, unknown>;
      }>;
    };
    return (data.activities ?? []).map((act) => {
      const ts = act.timestamp || act.timeRange?.endTime || '';
      const keys = Object.keys(act.primaryActionDetail ?? {});
      const rawAction = keys[0] || 'activity';
      const actionMap: Record<string, string> = {
        create: 'Created in Drive',
        edit: 'Edited content',
        rename: 'Renamed file',
        move: 'Moved folder',
        delete: 'Moved to trash',
        restore: 'Restored from trash',
        comment: 'Commented',
      };
      return {
        timestamp: ts,
        actionLabel: actionMap[rawAction] || `Updated (${rawAction})`,
      };
    });
  } catch {
    // Gracefully return empty if Drive Activity API is disabled or has no activity
    return [];
  }
}

export function buildStudyJournalMarkdown(payload: NoorDriveBackupPayload): string {
  const lines: string[] = [
    '# Noor Recite · Quranic Study & Tadabbur Journal',
    '',
    `Exported: ${new Date(payload.exportedAt).toLocaleString()}`,
    `Daily Recitation Goal: ${payload.dailyGoal} verses/day`,
    `Khatmah Progress: Day ${payload.khatmahPlan.currentDay} (${payload.khatmahPlan.pagesCompleted} / ${payload.khatmahPlan.totalPages} pages)`,
    '',
    '---',
    '',
    `## Saved Verses & Contemplation Notes (${payload.bookmarks.length})`,
    '',
  ];

  if (payload.bookmarks.length === 0) {
    lines.push('_No saved verse bookmarks yet._', '');
  } else {
    for (const bm of payload.bookmarks) {
      lines.push(`### ${bm.surahName} (${bm.verseKey})`);
      lines.push('');
      lines.push(bm.arabic);
      lines.push('');
      lines.push(`> ${bm.translation}`);
      if (bm.note.trim()) {
        lines.push('');
        lines.push(`**Contemplation Note:** ${bm.note.trim()}`);
      }
      lines.push('');
    }
  }

  lines.push('---', '', `## Hifz Spaced Review Queue (${payload.hifzSpacedQueue.length})`, '');
  if (payload.hifzSpacedQueue.length === 0) {
    lines.push('_No Hifz verses in spaced queue yet._', '');
  } else {
    for (const item of payload.hifzSpacedQueue) {
      lines.push(
        `- ${item.surahName} ${item.verseKey} · Stage ${item.stage}/5 (${item.intervalLabel})`
      );
    }
    lines.push('');
  }

  if (payload.hifzWeakWords.length > 0) {
    lines.push(`## Focused Tajweed & Hifz Words (${payload.hifzWeakWords.length})`, '');
    for (const w of payload.hifzWeakWords) {
      lines.push(`- ${w.arabic} (${w.transliteration}): ${w.meaning} [${w.surahName} ${w.verseKey}]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasStrings(record: JsonRecord, ...keys: string[]): boolean {
  return keys.every((key) => typeof record[key] === 'string');
}

function hasBooleans(record: JsonRecord, ...keys: string[]): boolean {
  return keys.every((key) => typeof record[key] === 'boolean');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;
}

function isArrayOf(value: unknown, check: (entry: unknown) => boolean): boolean {
  return Array.isArray(value) && value.every(check);
}

function isOneOf(value: unknown, ...options: (string | number)[]): boolean {
  return options.some((option) => option === value);
}

const languages: readonly unknown[] = ['en', 'hi', 'ur', 'bn', 'ms', 'ha', 'ff'];

function hasVerseFields(record: JsonRecord): boolean {
  return hasStrings(record, 'verseKey', 'surahName') &&
    isInteger(record.surahId, 1, 114) && isInteger(record.ayahNumber, 1, 286);
}

function isBookmark(value: unknown): boolean {
  return isRecord(value) && hasVerseFields(value) &&
    hasStrings(value, 'arabic', 'translation', 'note', 'savedAt') &&
    (value.collectionId === undefined || typeof value.collectionId === 'string') &&
    (value.translationLanguage === undefined || languages.includes(value.translationLanguage));
}

function isReaderSettings(value: unknown): boolean {
  return isRecord(value) &&
    isOneOf(value.arabicFont, 'amiri', 'scheherazade') &&
    isFiniteNumber(value.arabicFontSize) && value.arabicFontSize > 0 &&
    languages.includes(value.translationLanguage) &&
    hasBooleans(value, 'showTransliteration', 'showTranslation', 'showTajweedColors', 'alwaysShowFootnotes') &&
    typeof value.reciterId === 'string' &&
    isOneOf(value.playbackSpeed, 0.75, 1, 1.25) &&
    isOneOf(value.repeatMode, 'off', 'ayah', 'surah') &&
    isFiniteNumber(value.syncOffsetSec) &&
    (value.highlightStyle === undefined || isOneOf(value.highlightStyle, 'pill', 'wave', 'box', 'glow')) &&
    (value.reflectionDelaySec === undefined || isOneOf(value.reflectionDelaySec, 0, 1, 2)) &&
    (value.wordRepeatCount === undefined || isOneOf(value.wordRepeatCount, 1, 3, 5)) &&
    (value.riwayah === undefined || value.riwayah === 'hafs' || value.riwayah === 'warsh') &&
    (value.maghrebiOrthography === undefined || typeof value.maghrebiOrthography === 'boolean');
}

function isKhatmahSlot(value: unknown): boolean {
  return isRecord(value) &&
    isOneOf(value.id, 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha') &&
    hasStrings(value, 'label', 'arabicLabel', 'surahName') &&
    isInteger(value.surahId, 1, 114) && isInteger(value.startAyah, 1, 286) &&
    isInteger(value.pageStart, 1) && isInteger(value.pageEnd, 1) &&
    typeof value.completed === 'boolean';
}

function isKhatmahPlan(value: unknown): boolean {
  return isRecord(value) &&
    isOneOf(value.targetDays, 30, 60, 90) &&
    isInteger(value.currentDay, 1) && isInteger(value.pagesCompleted, 0) &&
    isInteger(value.totalPages, 1) && isInteger(value.juzNumber, 1, 30) &&
    isOneOf(value.scheduleStyle, 'five-prayers', 'two-sessions', 'single-session') &&
    hasBooleans(value, 'hifzSyncEnabled', 'salahRemindersEnabled') &&
    isArrayOf(value.streakDays, (entry) => isInteger(entry, 0)) &&
    isArrayOf(value.slots, isKhatmahSlot);
}

function isSpacedItem(value: unknown): boolean {
  return isRecord(value) && hasVerseFields(value) && hasStrings(value, 'id', 'intervalLabel') &&
    isInteger(value.stage, 1, 5) && isFiniteNumber(value.updatedAt) &&
    isOneOf(value.source, 'khatmah', 'topic', 'manual') &&
    (value.lastScore === undefined || isFiniteNumber(value.lastScore));
}

function isWeakWord(value: unknown): boolean {
  return isRecord(value) && hasVerseFields(value) &&
    hasStrings(value, 'id', 'arabic', 'transliteration', 'meaning') &&
    (value.tajweedNote === undefined || typeof value.tajweedNote === 'string') &&
    isFiniteNumber(value.addedAt) && isInteger(value.reviewCount, 0);
}

function isHistoryEntry(value: unknown): boolean {
  return isRecord(value) &&
    hasStrings(value, 'id', 'date', 'surahName', 'verseKey') &&
    isInteger(value.surahId, 1, 114) && isFiniteNumber(value.durationSec) &&
    isFiniteNumber(value.timestamp);
}

function isProgressEvent(value: unknown): boolean {
  return isRecord(value) && hasStrings(value, 'id', 'date', 'verseKey') &&
    isInteger(value.surahId, 1, 114) && isInteger(value.stage, 1, 5) &&
    (value.status === 'memorized' || value.status === 'mastered') &&
    isFiniteNumber(value.timestamp);
}

function isNoorBackup(value: unknown): value is NoorDriveBackupPayload {
  return isRecord(value) && value.app === 'Noor Recite' && value.version === 1 &&
    typeof value.exportedAt === 'string' && Number.isFinite(Date.parse(value.exportedAt)) &&
    (value.accountEmail === undefined || typeof value.accountEmail === 'string') &&
    isReaderSettings(value.settings) && typeof value.darkMode === 'boolean' &&
    isInteger(value.dailyGoal, 1) && isArrayOf(value.bookmarks, isBookmark) &&
    isArrayOf(value.bookmarkCollections, (entry) =>
      isRecord(entry) && hasStrings(entry, 'id', 'name', 'description', 'createdAt')
    ) &&
    isKhatmahPlan(value.khatmahPlan) &&
    isArrayOf(value.hifzSpacedQueue, isSpacedItem) &&
    isArrayOf(value.hifzWeakWords, isWeakWord) &&
    isArrayOf(value.recitationHistory, isHistoryEntry) &&
    isArrayOf(value.hifzProgressEvents, isProgressEvent);
}

export function parseNoorBackupJson(rawText: string): NoorDriveBackupPayload | null {
  try {
    const parsed: unknown = JSON.parse(rawText);
    return isNoorBackup(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function formatDriveBytes(sizeStr?: string): string {
  if (!sizeStr) return '-';
  const bytes = Number(sizeStr);
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
