import { Ayah, ReaderSettings } from '../types/quran';
import { getAyahDisplayArabic } from '../data/qiraatData';
import { getAyahTranslationText } from './translationConfig';

export function formatAyahClipboardText(
  ayah: Pick<
    Ayah,
    | 'verseKey'
    | 'arabic'
    | 'arabicWarsh'
    | 'translation'
    | 'translationHi'
    | 'translationUr'
    | 'translations'
  >,
  settings: Pick<
    ReaderSettings,
    'translationLanguage' | 'riwayah' | 'maghrebiOrthography'
  >
): string {
  const arabicText = getAyahDisplayArabic(
    ayah,
    settings.riwayah ?? 'hafs',
    Boolean(settings.maghrebiOrthography)
  ).trim();
  const activeLang = settings.translationLanguage ?? 'en';
  const { text: translationText } = getAyahTranslationText(ayah, activeLang);
  const cleanTranslation = translationText.trim();

  if (!cleanTranslation) {
    return `${arabicText} (${ayah.verseKey})`;
  }
  return `${arabicText}\n\n${cleanTranslation} (Qur'an ${ayah.verseKey})`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand below if Clipboard API is restricted in iframe
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);

  try {
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
