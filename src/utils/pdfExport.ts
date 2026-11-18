import { jsPDF } from 'jspdf';
import {
  Ayah,
  BookmarkCollection,
  BookmarkItem,
  ReaderSettings,
  RiwayahId,
  Surah,
  TranslationLanguage,
} from '../types/quran';
import { formatAyahByRiwayah } from '../data/qiraatData';
import { TAJWEED_RULES } from '../data/tajweedRules';
import {
  TRANSLATION_LANGUAGE_OPTIONS,
  getAyahTranslationText,
  isRtlTranslationLang,
} from './translationConfig';

export type PdfExportScope = 'surah' | 'bookmarks';
export type PdfPaperTheme = 'parchment' | 'minimal';
export type PdfPageFormat = 'a4' | 'letter';

export interface PdfExportOptions {
  scope: PdfExportScope;
  paperTheme: PdfPaperTheme;
  pageFormat: PdfPageFormat;
  translationLanguage: TranslationLanguage;
  includeTransliteration: boolean;
  includeTranslation: boolean;
  includeTafsirOrNotes: boolean;
  includeTajweedSummary: boolean;
  includeBismillah: boolean;
  riwayah: RiwayahId;
  maghrebiOrthography: boolean;
  arabicFont: 'amiri' | 'scheherazade';
  ayahStart: number;
  ayahEnd: number;
  selectedBookmarkKeys: string[];
}

export interface PdfVerseEntry {
  verseKey: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  transliteration?: string;
  translation?: string;
  translationLang: TranslationLanguage;
  noteLabel?: string;
  noteText?: string;
  tajweedBadges?: string[];
  savedAt?: string;
}

export interface PdfDocumentMeta {
  title: string;
  arabicTitle?: string;
  subtitle: string;
  metaLine: string;
  openerIstiadhah?: string;
  openerBismillah?: string;
  surahNotice?: string;
  footerLabel: string;
  suggestedFilename: string;
}

export interface PdfPreparedDocument {
  meta: PdfDocumentMeta;
  entries: PdfVerseEntry[];
}

const TAJWEED_NAME_BY_TYPE = new Map(
  TAJWEED_RULES.map((rule) => [rule.type, rule.name] as const)
);

export function toArabicIndicNumerals(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(Math.max(0, Math.floor(num)))
    .split('')
    .map((ch) => digits[Number(ch)] ?? ch)
    .join('');
}

export function sanitizePdfFilename(raw: string): string {
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const base = cleaned || 'Noor-Recite-Document';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function extractTajweedBadges(ayah: Ayah): string[] {
  const seen = new Set<string>();
  for (const word of ayah.words) {
    if (word.tajweed) {
      const label = TAJWEED_NAME_BY_TYPE.get(word.tajweed) ?? word.tajweed;
      seen.add(label);
    }
  }
  return Array.from(seen);
}

export function buildPdfDocumentEntries(params: {
  surah: Surah;
  bookmarks: BookmarkItem[];
  collections?: BookmarkCollection[];
  options: PdfExportOptions;
  knownSurahsById?: Record<number, Surah>;
  activeCollectionFilterName?: string;
}): PdfPreparedDocument {
  const {
    surah,
    bookmarks,
    options,
    knownSurahsById = {},
    activeCollectionFilterName,
  } = params;

  const riwayahLabel =
    options.riwayah === 'warsh' ? "Warsh 'an Nāfi'" : "Ḥafṣ 'an 'Āṣim";
  const scriptLabel = options.maghrebiOrthography ? ' · Maghrebi Script' : '';
  const langOption = TRANSLATION_LANGUAGE_OPTIONS.find(
    (l) => l.id === options.translationLanguage
  );
  const langLabel = langOption ? langOption.label : 'English';

  if (options.scope === 'surah') {
    const total = surah.ayahs.length;
    const minAyah = total > 0 ? surah.ayahs[0].number : 1;
    const maxAyah = total > 0 ? surah.ayahs[total - 1].number : surah.totalAyahs;
    const rawStart = Math.min(options.ayahStart, options.ayahEnd);
    const rawEnd = Math.max(options.ayahStart, options.ayahEnd);
    const startNum = Math.max(minAyah, Math.min(maxAyah, rawStart));
    const endNum = Math.max(startNum, Math.min(maxAyah, rawEnd));

    const filteredAyahs = surah.ayahs.filter(
      (a) => a.number >= startNum && a.number <= endNum
    );
    const isRange = startNum > minAyah || endNum < maxAyah;

    const entries: PdfVerseEntry[] = filteredAyahs.map((ayah) => {
      const localized = getAyahTranslationText(ayah, options.translationLanguage);
      const tajweedBadges = options.includeTajweedSummary
        ? extractTajweedBadges(ayah)
        : undefined;
      return {
        verseKey: ayah.verseKey,
        surahId: surah.id,
        surahName: surah.nameSimple,
        ayahNumber: ayah.number,
        arabic: formatAyahByRiwayah(
          ayah.verseKey,
          ayah.arabic,
          options.riwayah,
          options.maghrebiOrthography
        ),
        transliteration: options.includeTransliteration
          ? ayah.transliteration
          : undefined,
        translation: options.includeTranslation ? localized.text : undefined,
        translationLang: localized.resolvedLang,
        noteLabel:
          options.includeTafsirOrNotes && ayah.tafsirBrief
            ? 'Study & Tafsir Brief'
            : undefined,
        noteText:
          options.includeTafsirOrNotes && ayah.tafsirBrief
            ? ayah.tafsirBrief
            : undefined,
        tajweedBadges: tajweedBadges && tajweedBadges.length > 0 ? tajweedBadges : undefined,
      };
    });

    const paddedId = String(surah.id).padStart(3, '0');
    const rangeSuffix = isRange ? `-Ayahs-${startNum}-${endNum}` : '';
    const title = isRange
      ? `Surah ${surah.nameSimple} (${startNum}–${endNum})`
      : `Surah ${surah.nameSimple}`;

    return {
      meta: {
        title,
        arabicTitle: surah.nameArabic,
        subtitle: `${surah.nameMeaning} · Surah ${surah.id}`,
        metaLine: [
          surah.revelationPlace,
          `${entries.length} ${entries.length === 1 ? 'Verse' : 'Verses'}`,
          `Juz ${surah.juz}`,
          `${riwayahLabel}${scriptLabel}`,
          options.includeTranslation ? `Translation: ${langLabel}` : 'Arabic Text',
        ].join(' · '),
        openerIstiadhah: options.includeBismillah
          ? 'أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَـٰنِ ٱلرَّجِيمِ'
          : undefined,
        openerBismillah:
          options.includeBismillah && surah.hasBismillah
            ? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
            : undefined,
        surahNotice:
          options.includeBismillah && surah.id === 9
            ? "Surah At-Tawbah begins with Al-Isti'ādhah without Bismillah."
            : undefined,
        footerLabel: `Noor Recite · ${title}`,
        suggestedFilename: sanitizePdfFilename(
          `Noor-Recite-Surah-${paddedId}-${surah.nameSimple}${rangeSuffix}.pdf`
        ),
      },
      entries,
    };
  }

  // Bookmarked verses scope
  const selectedSet = new Set(options.selectedBookmarkKeys);
  const selectedBookmarks = bookmarks.filter((b) => selectedSet.has(b.verseKey));

  const ayahLookup = new Map<string, Ayah>();
  for (const a of surah.ayahs) {
    ayahLookup.set(a.verseKey, a);
  }
  for (const s of Object.values(knownSurahsById)) {
    for (const a of s.ayahs) {
      if (!ayahLookup.has(a.verseKey)) {
        ayahLookup.set(a.verseKey, a);
      }
    }
  }

  const entries: PdfVerseEntry[] = selectedBookmarks.map((bm) => {
    const matchedAyah = ayahLookup.get(bm.verseKey);
    const localized = matchedAyah
      ? getAyahTranslationText(matchedAyah, options.translationLanguage)
      : {
          text: bm.translation,
          resolvedLang: bm.translationLanguage ?? 'en',
        };
    const tajweedBadges =
      options.includeTajweedSummary && matchedAyah
        ? extractTajweedBadges(matchedAyah)
        : undefined;

    const noteParts: string[] = [];
    if (bm.note?.trim()) {
      noteParts.push(bm.note.trim());
    } else if (matchedAyah?.tafsirBrief) {
      noteParts.push(matchedAyah.tafsirBrief);
    }

    return {
      verseKey: bm.verseKey,
      surahId: bm.surahId,
      surahName: bm.surahName,
      ayahNumber: bm.ayahNumber,
      arabic: formatAyahByRiwayah(
        bm.verseKey,
        bm.arabic,
        options.riwayah,
        options.maghrebiOrthography
      ),
      transliteration:
        options.includeTransliteration && matchedAyah?.transliteration
          ? matchedAyah.transliteration
          : undefined,
      translation: options.includeTranslation ? localized.text : undefined,
      translationLang: localized.resolvedLang,
      noteLabel:
        options.includeTafsirOrNotes && noteParts.length > 0
          ? bm.note?.trim()
            ? 'Personal Reflection'
            : 'Study & Tafsir Brief'
          : undefined,
      noteText:
        options.includeTafsirOrNotes && noteParts.length > 0
          ? noteParts.join('\n')
          : undefined,
      tajweedBadges: tajweedBadges && tajweedBadges.length > 0 ? tajweedBadges : undefined,
      savedAt: bm.savedAt,
    };
  });

  const subtitle = activeCollectionFilterName
    ? `Collection: ${activeCollectionFilterName}`
    : 'Curated Verses & Personal Contemplation Journal';

  return {
    meta: {
      title: 'Bookmarked Verses',
      arabicTitle: 'الْآيَاتُ الْمُخْتَارَةُ',
      subtitle,
      metaLine: [
        `${entries.length} ${entries.length === 1 ? 'Selected Verse' : 'Selected Verses'}`,
        `${riwayahLabel}${scriptLabel}`,
        options.includeTranslation ? `Translation Enabled` : 'Arabic Text',
      ].join(' · '),
      footerLabel: 'Noor Recite · Bookmarked Verses',
      suggestedFilename: sanitizePdfFilename(
        activeCollectionFilterName
          ? `Noor-Recite-Bookmarks-${activeCollectionFilterName}.pdf`
          : 'Noor-Recite-Bookmarked-Verses.pdf'
      ),
    },
    entries,
  };
}

function getCanvasFontFamily(lang: TranslationLanguage): string {
  switch (lang) {
    case 'ur':
      return '"Noto Nastaliq Urdu", "Amiri", Georgia, serif';
    case 'fa':
      return '"Vazirmatn", "Amiri", sans-serif';
    case 'hi':
      return '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
    case 'bn':
      return '"Noto Sans Bengali", "Noto Sans", sans-serif';
    case 'zh':
      return '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    default:
      return '"Noto Sans", "Plus Jakarta Sans", sans-serif';
  }
}

export async function ensurePdfFontsLoaded(
  arabicFont: 'amiri' | 'scheherazade',
  lang: TranslationLanguage
): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const arabicFamily =
    arabicFont === 'scheherazade' ? '"Scheherazade New"' : '"Amiri"';
  const transFamily = getCanvasFontFamily(lang);
  try {
    await Promise.allSettled([
      document.fonts.load(`400 32px ${arabicFamily}`),
      document.fonts.load(`700 32px ${arabicFamily}`),
      document.fonts.load('400 20px "Plus Jakarta Sans"'),
      document.fonts.load('700 20px "Plus Jakarta Sans"'),
      document.fonts.load(`400 20px ${transFamily}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Proceed gracefully even if a font faces network offline constraints
  }
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  options?: { isCjk?: boolean }
): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  if (options?.isCjk) {
    const lines: string[] = [];
    let current = '';
    for (const ch of Array.from(normalized)) {
      const candidate = current + ch;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      // Break an unusually long unbroken token
      let chunk = '';
      for (const ch of Array.from(word)) {
        const nextChunk = chunk + ch;
        if (chunk && ctx.measureText(nextChunk).width > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = nextChunk;
        }
      }
      current = chunk;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

interface PdfPalette {
  bg: string;
  cardBg: string;
  noteBg: string;
  ink: string;
  inkMuted: string;
  primary: string;
  accent: string;
  border: string;
  frameOuter: string;
  frameInner: string;
  ornament: string;
}

function getThemePalette(theme: PdfPaperTheme): PdfPalette {
  if (theme === 'minimal') {
    return {
      bg: '#FFFFFF',
      cardBg: '#F8FAFC',
      noteBg: '#F1F5F9',
      ink: '#0F172A',
      inkMuted: '#475569',
      primary: '#064E3B',
      accent: '#B45309',
      border: 'rgba(15, 23, 42, 0.14)',
      frameOuter: 'rgba(6, 78, 59, 0.18)',
      frameInner: 'rgba(15, 23, 42, 0.08)',
      ornament: 'rgba(6, 78, 59, 0.14)',
    };
  }
  return {
    bg: '#FAF7F0',
    cardBg: '#FFFFFF',
    noteBg: '#F1FAF5',
    ink: '#022C22',
    inkMuted: '#404944',
    primary: '#064E3B',
    accent: '#B45309',
    border: 'rgba(6, 78, 59, 0.14)',
    frameOuter: 'rgba(6, 78, 59, 0.22)',
    frameInner: 'rgba(180, 83, 9, 0.25)',
    ornament: 'rgba(180, 83, 9, 0.22)',
  };
}

function getPageGeometry(format: PdfPageFormat) {
  // Points at 72 DPI, rendered at 2x resolution for crisp print & zoom
  const widthPt = format === 'letter' ? 612 : 595.28;
  const heightPt = format === 'letter' ? 792 : 841.89;
  const scale = 2;
  return {
    widthPt,
    heightPt,
    scale,
    canvasWidth: Math.round(widthPt * scale),
    canvasHeight: Math.round(heightPt * scale),
  };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawSteppedCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y + dy * 28);
  ctx.lineTo(x + dx * 28, y + dy * 28);
  ctx.lineTo(x + dx * 28, y);
  ctx.moveTo(x, y + dy * 14);
  ctx.lineTo(x + dx * 14, y + dy * 14);
  ctx.lineTo(x + dx * 14, y);
  ctx.moveTo(x + dx * 28, y + dy * 28);
  ctx.lineTo(x + dx * 40, y + dy * 40);
  ctx.stroke();
  ctx.restore();
}

function startNewPageCanvas(
  geom: ReturnType<typeof getPageGeometry>,
  palette: PdfPalette,
  theme: PdfPaperTheme
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = geom.canvasWidth;
  canvas.height = geom.canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context for PDF rendering.');
  }

  // Page background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer & inner editorial frame
  const insetOuter = 36;
  const insetInner = 46;
  ctx.strokeStyle = palette.frameOuter;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    insetOuter,
    insetOuter,
    canvas.width - insetOuter * 2,
    canvas.height - insetOuter * 2
  );

  if (theme === 'parchment') {
    ctx.strokeStyle = palette.frameInner;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      insetInner,
      insetInner,
      canvas.width - insetInner * 2,
      canvas.height - insetInner * 2
    );
    drawSteppedCorner(ctx, insetInner, insetInner, 1, 1, palette.ornament);
    drawSteppedCorner(
      ctx,
      canvas.width - insetInner,
      insetInner,
      -1,
      1,
      palette.ornament
    );
    drawSteppedCorner(
      ctx,
      insetInner,
      canvas.height - insetInner,
      1,
      -1,
      palette.ornament
    );
    drawSteppedCorner(
      ctx,
      canvas.width - insetInner,
      canvas.height - insetInner,
      -1,
      -1,
      palette.ornament
    );
  }

  return { canvas, ctx };
}

interface VerseLayoutBlock {
  entry: PdfVerseEntry;
  arabicLines: string[];
  translitLines: string[];
  translationLines: string[];
  noteLines: string[];
  tajweedLine: string;
  blockHeight: number;
}

function measureVerseBlock(
  ctx: CanvasRenderingContext2D,
  entry: PdfVerseEntry,
  contentWidth: number,
  arabicFontFamily: string
): VerseLayoutBlock {
  const innerPadX = 28;
  const innerWidth = contentWidth - innerPadX * 2;
  const verseEndMarker = `﴿${toArabicIndicNumerals(entry.ayahNumber)}﴾`;
  const arabicFull = `${entry.arabic} ${verseEndMarker}`;

  ctx.save();
  ctx.font = `600 42px ${arabicFontFamily}`;
  const arabicLines = wrapCanvasText(ctx, arabicFull, innerWidth);

  let translitLines: string[] = [];
  if (entry.transliteration) {
    ctx.font = 'italic 400 22px "Plus Jakarta Sans", sans-serif';
    translitLines = wrapCanvasText(ctx, entry.transliteration, innerWidth);
  }

  let translationLines: string[] = [];
  if (entry.translation) {
    const transFont = getCanvasFontFamily(entry.translationLang);
    const transSize = entry.translationLang === 'ur' ? 28 : 24;
    ctx.font = `400 ${transSize}px ${transFont}`;
    translationLines = wrapCanvasText(ctx, entry.translation, innerWidth, {
      isCjk: entry.translationLang === 'zh',
    });
  }

  let noteLines: string[] = [];
  if (entry.noteText) {
    ctx.font = '400 21px "Plus Jakarta Sans", sans-serif';
    noteLines = wrapCanvasText(ctx, entry.noteText, innerWidth - 28);
  }

  const tajweedLine =
    entry.tajweedBadges && entry.tajweedBadges.length > 0
      ? `Tajweed: ${entry.tajweedBadges.join(' · ')}`
      : '';
  ctx.restore();

  // Compute total height in 2x canvas px
  let height = 24; // top card padding
  height += 36; // header row (verse key + surah + optional savedAt)
  height += 16; // gap below header divider
  height += arabicLines.length * 76 + 10;

  if (translitLines.length > 0) {
    height += 10 + translitLines.length * 34;
  }
  if (translationLines.length > 0) {
    const lineH = entry.translationLang === 'ur' ? 48 : 37;
    height += 14 + translationLines.length * lineH;
  }
  if (tajweedLine) {
    height += 14 + 26;
  }
  if (noteLines.length > 0) {
    height += 16 + 34 + noteLines.length * 31 + 18;
  }
  height += 26; // bottom card padding

  return {
    entry,
    arabicLines,
    translitLines,
    translationLines,
    noteLines,
    tajweedLine,
    blockHeight: height,
  };
}

function drawHeaderBanner(
  ctx: CanvasRenderingContext2D,
  meta: PdfDocumentMeta,
  leftX: number,
  contentWidth: number,
  startY: number,
  palette: PdfPalette,
  arabicFontFamily: string
): number {
  const centerX = leftX + contentWidth / 2;
  let y = startY;

  ctx.save();
  // Brand masthead line
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = palette.accent;
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  ctx.fillText(`NOOR RECITE · ${dateStr.toUpperCase()}`, centerX, y + 18);
  y += 42;

  // Arabic Title
  if (meta.arabicTitle) {
    ctx.font = `700 58px ${arabicFontFamily}`;
    ctx.fillStyle = palette.primary;
    ctx.direction = 'rtl';
    ctx.fillText(meta.arabicTitle, centerX, y + 54);
    y += 82;
  }

  // English / Primary Title
  ctx.direction = 'ltr';
  ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = palette.ink;
  ctx.fillText(meta.title, centerX, y + 32);
  y += 48;

  // Subtitle
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = palette.primary;
  ctx.fillText(meta.subtitle, centerX, y + 22);
  y += 38;

  // Meta line
  ctx.font = '400 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = palette.inkMuted;
  const metaLines = wrapCanvasText(ctx, meta.metaLine, contentWidth - 60);
  for (const line of metaLines) {
    ctx.fillText(line, centerX, y + 19);
    y += 28;
  }

  // Filigree divider line with center diamond
  y += 14;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX + 80, y);
  ctx.lineTo(centerX - 18, y);
  ctx.moveTo(centerX + 18, y);
  ctx.lineTo(leftX + contentWidth - 80, y);
  ctx.stroke();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(centerX, y - 8);
  ctx.lineTo(centerX + 8, y);
  ctx.lineTo(centerX, y + 8);
  ctx.lineTo(centerX - 8, y);
  ctx.closePath();
  ctx.fill();
  y += 26;

  // Isti'adhah & Bismillah openers
  if (meta.openerIstiadhah) {
    ctx.font = `400 30px ${arabicFontFamily}`;
    ctx.fillStyle = palette.inkMuted;
    ctx.direction = 'rtl';
    ctx.fillText(meta.openerIstiadhah, centerX, y + 34);
    y += 56;
  }

  if (meta.openerBismillah) {
    ctx.font = `700 40px ${arabicFontFamily}`;
    ctx.fillStyle = palette.primary;
    ctx.direction = 'rtl';
    ctx.fillText(meta.openerBismillah, centerX, y + 42);
    y += 68;
  }

  if (meta.surahNotice) {
    ctx.direction = 'ltr';
    ctx.font = 'italic 400 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = palette.inkMuted;
    ctx.fillText(meta.surahNotice, centerX, y + 20);
    y += 38;
  }

  ctx.restore();
  return y + 12;
}

function drawVerseBlock(
  ctx: CanvasRenderingContext2D,
  block: VerseLayoutBlock,
  leftX: number,
  contentWidth: number,
  startY: number,
  palette: PdfPalette,
  arabicFontFamily: string
): void {
  const { entry } = block;
  const padX = 28;
  const innerRightX = leftX + contentWidth - padX;
  const innerLeftX = leftX + padX;

  ctx.save();

  // Verse card container
  drawRoundedRectPath(ctx, leftX, startY, contentWidth, block.blockHeight, 18);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Header strip inside card
  let y = startY + 24;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = palette.primary;
  ctx.fillText(`${entry.surahName} · ${entry.verseKey}`, innerLeftX, y + 22);

  if (entry.savedAt) {
    ctx.textAlign = 'right';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = palette.inkMuted;
    ctx.fillText(`Saved ${entry.savedAt}`, innerRightX, y + 21);
  }
  y += 36;

  // Subtle divider under verse header
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerLeftX, y);
  ctx.lineTo(innerRightX, y);
  ctx.stroke();
  y += 16;

  // Arabic lines (RTL)
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `600 42px ${arabicFontFamily}`;
  ctx.fillStyle = palette.ink;
  for (const line of block.arabicLines) {
    ctx.fillText(line, innerRightX, y + 48);
    y += 76;
  }
  y += 10;

  // Transliteration (LTR italic)
  if (block.translitLines.length > 0) {
    y += 10;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = 'italic 400 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = palette.primary;
    for (const line of block.translitLines) {
      ctx.fillText(line, innerLeftX, y + 22);
      y += 34;
    }
  }

  // Translation (LTR or RTL depending on language)
  if (block.translationLines.length > 0) {
    y += 14;
    const isRtl = isRtlTranslationLang(entry.translationLang);
    const transFont = getCanvasFontFamily(entry.translationLang);
    const transSize = entry.translationLang === 'ur' ? 28 : 24;
    const lineH = entry.translationLang === 'ur' ? 48 : 37;
    ctx.direction = isRtl ? 'rtl' : 'ltr';
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.font = `400 ${transSize}px ${transFont}`;
    ctx.fillStyle = palette.ink;
    const anchorX = isRtl ? innerRightX : innerLeftX;
    for (const line of block.translationLines) {
      ctx.fillText(line, anchorX, y + transSize + 2);
      y += lineH;
    }
  }

  // Tajweed metadata line (plain unboxed text)
  if (block.tajweedLine) {
    y += 14;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = palette.accent;
    ctx.fillText(block.tajweedLine, innerLeftX, y + 18);
    y += 26;
  }

  // Reflection / Tafsir Note Box (all-around hairline border, no thick left bar)
  if (block.noteLines.length > 0 && entry.noteLabel) {
    y += 16;
    const noteBoxHeight = 34 + block.noteLines.length * 31 + 14;
    drawRoundedRectPath(
      ctx,
      innerLeftX,
      y,
      contentWidth - padX * 2,
      noteBoxHeight,
      12
    );
    ctx.fillStyle = palette.noteBg;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = palette.primary;
    ctx.fillText(entry.noteLabel, innerLeftX + 16, y + 25);

    ctx.font = '400 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = palette.inkMuted;
    let noteY = y + 54;
    for (const line of block.noteLines) {
      ctx.fillText(line, innerLeftX + 16, noteY);
      noteY += 31;
    }
  }

  ctx.restore();
}

function stampPageFooter(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  footerLabel: string,
  pageNumber: number,
  totalPages: number,
  palette: PdfPalette
): void {
  const leftX = 76;
  const rightX = canvasWidth - 76;
  const footerY = canvasHeight - 58;

  ctx.save();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, footerY - 22);
  ctx.lineTo(rightX, footerY - 22);
  ctx.stroke();

  ctx.direction = 'ltr';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = palette.inkMuted;

  ctx.textAlign = 'left';
  ctx.fillText(footerLabel, leftX, footerY);

  ctx.textAlign = 'right';
  ctx.fillText(`Page ${pageNumber} of ${totalPages}`, rightX, footerY);
  ctx.restore();
}

export async function renderPdfPageCanvases(
  prepared: PdfPreparedDocument,
  options: PdfExportOptions,
  onProgress?: (current: number, total: number) => void,
  maxPages?: number
): Promise<HTMLCanvasElement[]> {
  await ensurePdfFontsLoaded(options.arabicFont, options.translationLanguage);

  const geom = getPageGeometry(options.pageFormat);
  const palette = getThemePalette(options.paperTheme);
  const arabicFontFamily =
    options.arabicFont === 'scheherazade'
      ? '"Scheherazade New", "Amiri", Georgia, serif'
      : '"Amiri", "Scheherazade New", Georgia, serif';

  const leftMargin = 76;
  const rightMargin = 76;
  const topMargin = 76;
  const bottomLimit = geom.canvasHeight - 102;
  const contentWidth = geom.canvasWidth - leftMargin - rightMargin;

  // Start page 1
  const pages: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];
  let current = startNewPageCanvas(geom, palette, options.paperTheme);
  pages.push(current);

  let cursorY = drawHeaderBanner(
    current.ctx,
    prepared.meta,
    leftMargin,
    contentWidth,
    topMargin,
    palette,
    arabicFontFamily
  );

  // Measure and lay out every verse block across pages
  const totalEntries = prepared.entries.length;
  for (let idx = 0; idx < totalEntries; idx++) {
    const entry = prepared.entries[idx];
    const block = measureVerseBlock(
      current.ctx,
      entry,
      contentWidth,
      arabicFontFamily
    );

    const cardGap = 24;
    if (cursorY + block.blockHeight > bottomLimit && cursorY > topMargin + 30) {
      if (maxPages && pages.length >= maxPages) {
        break;
      }
      current = startNewPageCanvas(geom, palette, options.paperTheme);
      pages.push(current);
      cursorY = topMargin;
    }

    drawVerseBlock(
      current.ctx,
      block,
      leftMargin,
      contentWidth,
      cursorY,
      palette,
      arabicFontFamily
    );
    cursorY += block.blockHeight + cardGap;

    if (idx % 12 === 11) {
      onProgress?.(idx + 1, totalEntries);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.(totalEntries, totalEntries);

  // Stamp exact Page X of Y footers across all rendered pages
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    stampPageFooter(
      p.ctx,
      geom.canvasWidth,
      geom.canvasHeight,
      prepared.meta.footerLabel,
      idx + 1,
      totalPages,
      palette
    );
  });

  return pages.map((p) => p.canvas);
}

export async function generateStyledPdfBlob(
  prepared: PdfPreparedDocument,
  options: PdfExportOptions,
  onProgress?: (label: string) => void
): Promise<{ blob: Blob; filename: string; pageCount: number }> {
  if (prepared.entries.length === 0) {
    throw new Error('Select at least one verse to export.');
  }

  onProgress?.('Typesetting Arabic calligraphy & layout...');
  const canvases = await renderPdfPageCanvases(
    prepared,
    options,
    (done, total) => {
      onProgress?.(`Typesetting verse ${done} of ${total}...`);
    }
  );

  const geom = getPageGeometry(options.pageFormat);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: options.pageFormat,
    compress: true,
  });

  doc.setProperties({
    title: prepared.meta.title,
    subject: prepared.meta.subtitle,
    creator: 'Noor Recite',
  });

  for (let i = 0; i < canvases.length; i++) {
    onProgress?.(`Packaging PDF page ${i + 1} of ${canvases.length}...`);
    if (i > 0) {
      doc.addPage(options.pageFormat, 'portrait');
    }
    const imgData = canvases[i].toDataURL('image/jpeg', 0.92);
    doc.addImage(
      imgData,
      'JPEG',
      0,
      0,
      geom.widthPt,
      geom.heightPt,
      undefined,
      'FAST'
    );
    if (i % 6 === 5) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const blob = doc.output('blob');
  return {
    blob,
    filename: prepared.meta.suggestedFilename,
    pageCount: canvases.length,
  };
}

export function triggerPdfDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function printStyledPdfCanvases(
  prepared: PdfPreparedDocument,
  options: PdfExportOptions,
  onProgress?: (label: string) => void
): Promise<void> {
  if (prepared.entries.length === 0) {
    throw new Error('Select at least one verse to export.');
  }

  onProgress?.('Preparing print layout...');
  const canvases = await renderPdfPageCanvases(prepared, options);
  const dataUrls = canvases.map((c) => c.toDataURL('image/png'));

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    throw new Error('Print frame is unavailable in this browser.');
  }

  const pageSizeCss = options.pageFormat === 'letter' ? 'letter' : 'A4';
  const imgTags = dataUrls
    .map(
      (src, idx) =>
        `<div class="pdf-sheet"><img src="${src}" alt="${prepared.meta.title} page ${idx + 1}" /></div>`
    )
    .join('');

  iframeDoc.open();
  iframeDoc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${prepared.meta.title}</title>
<style>
  @page { size: ${pageSizeCss} portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .pdf-sheet { page-break-after: always; break-after: page; width: 100%; }
  .pdf-sheet:last-child { page-break-after: auto; break-after: auto; }
  .pdf-sheet img { display: block; width: 100%; height: auto; }
</style>
</head>
<body>${imgTags}</body>
</html>`);
  iframeDoc.close();

  await new Promise<void>((resolve) => {
    const imgs = Array.from(iframeDoc.images);
    if (imgs.length === 0) {
      resolve();
      return;
    }
    let loaded = 0;
    const done = () => {
      loaded += 1;
      if (loaded >= imgs.length) resolve();
    };
    for (const img of imgs) {
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    }
    setTimeout(resolve, 1500);
  });

  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, 60_000);
}

export function buildDefaultPdfExportOptions(params: {
  scope: PdfExportScope;
  surah: Surah;
  bookmarks: BookmarkItem[];
  settings: ReaderSettings;
  preselectedBookmarkKeys?: string[];
}): PdfExportOptions {
  const { scope, surah, bookmarks, settings, preselectedBookmarkKeys } = params;
  const firstNum = surah.ayahs[0]?.number ?? 1;
  const lastNum =
    surah.ayahs[surah.ayahs.length - 1]?.number ?? Math.max(1, surah.totalAyahs);

  return {
    scope,
    paperTheme: 'parchment',
    pageFormat: 'a4',
    translationLanguage: settings.translationLanguage ?? 'en',
    includeTransliteration: settings.showTransliteration,
    includeTranslation: settings.showTranslation,
    includeTafsirOrNotes: true,
    includeTajweedSummary: settings.showTajweedColors,
    includeBismillah: true,
    riwayah: settings.riwayah ?? 'hafs',
    maghrebiOrthography: Boolean(settings.maghrebiOrthography),
    arabicFont: settings.arabicFont,
    ayahStart: firstNum,
    ayahEnd: lastNum,
    selectedBookmarkKeys:
      preselectedBookmarkKeys ?? bookmarks.map((b) => b.verseKey),
  };
}
