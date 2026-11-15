import {
  Ayah,
  SurahOpenerLine,
  TranslationLanguage,
  TranslationSegment,
  WordToken,
} from '../types/quran';

export interface TranslationLanguageOption {
  id: TranslationLanguage;
  label: string;
  shortLabel: string;
  sub: string;
  dir: 'ltr' | 'rtl';
  fontClass: string;
  pillClass: string;
}

export const TRANSLATION_LANGUAGE_OPTIONS: TranslationLanguageOption[] = [
  {
    id: 'en',
    label: 'English',
    shortLabel: 'English',
    sub: 'Sahih Intl',
    dir: 'ltr',
    fontClass: '',
    pillClass: 'leading-normal',
  },
  {
    id: 'hi',
    label: 'हिन्दी',
    shortLabel: 'हिन्दी',
    sub: 'अज़ीज़ुल हक़',
    dir: 'ltr',
    fontClass: 'font-translation-hi',
    pillClass: 'font-translation-hi leading-normal',
  },
  {
    id: 'ur',
    label: 'اردو',
    shortLabel: 'اردو',
    sub: 'جالندھری',
    dir: 'rtl',
    fontClass: 'font-translation-ur',
    pillClass: 'font-translation-ur text-[13px] leading-[1.9]',
  },
  {
    id: 'bn',
    label: 'বাংলা',
    shortLabel: 'বাংলা',
    sub: 'তাইসীরুল কুরআন',
    dir: 'ltr',
    fontClass: 'font-translation-bn',
    pillClass: 'font-translation-bn leading-normal',
  },
  {
    id: 'ms',
    label: 'Melayu / Indo',
    shortLabel: 'Melayu/Indo',
    sub: 'Basmeih · Indo',
    dir: 'ltr',
    fontClass: 'font-translation-latin',
    pillClass: 'font-translation-latin leading-normal',
  },
  {
    id: 'ha',
    label: 'Hausa',
    shortLabel: 'Hausa',
    sub: 'Pan-Hausa (Gumi)',
    dir: 'ltr',
    fontClass: 'font-translation-latin',
    pillClass: 'font-translation-latin leading-normal',
  },
  {
    id: 'ff',
    label: 'Fulfulde',
    shortLabel: 'Fulfulde',
    sub: 'Fula / Pulaar',
    dir: 'ltr',
    fontClass: 'font-translation-latin',
    pillClass: 'font-translation-latin leading-normal',
  },
];

export function isRtlTranslationLang(lang: TranslationLanguage): boolean {
  return lang === 'ur';
}

export function getTranslationFontClass(lang: TranslationLanguage): string {
  switch (lang) {
    case 'ur':
      return 'font-translation-ur';
    case 'hi':
      return 'font-translation-hi';
    case 'bn':
      return 'font-translation-bn';
    case 'ms':
    case 'ha':
    case 'ff':
      return 'font-translation-latin';
    default:
      return '';
  }
}

export function getTranslationTextClass(
  lang: TranslationLanguage,
  variant: 'ayah' | 'card' | 'compact' = 'card'
): string {
  if (lang === 'ur') {
    return variant === 'compact'
      ? 'font-translation-ur text-[15.5px] leading-[2.2]'
      : 'font-translation-ur text-[17px] sm:text-[18px] leading-[2.35]';
  }
  if (lang === 'hi') {
    return variant === 'compact'
      ? 'font-translation-hi text-xs sm:text-[13px] leading-[1.8]'
      : variant === 'ayah'
      ? 'font-translation-hi text-[15.5px] sm:text-[16px] leading-[1.85]'
      : 'font-translation-hi text-[15px] sm:text-[15.5px] leading-[1.85]';
  }
  if (lang === 'bn') {
    return variant === 'compact'
      ? 'font-translation-bn text-xs sm:text-[13px] leading-[1.8]'
      : variant === 'ayah'
      ? 'font-translation-bn text-[15.5px] sm:text-[16px] leading-[1.85]'
      : 'font-translation-bn text-[15px] sm:text-[15.5px] leading-[1.85]';
  }
  if (lang === 'ms' || lang === 'ha' || lang === 'ff') {
    return variant === 'compact'
      ? 'font-translation-latin text-xs sm:text-[13px] leading-relaxed'
      : variant === 'ayah'
      ? 'font-translation-latin text-[15.5px] sm:text-[16px] leading-[28px]'
      : 'font-translation-latin text-[15px] leading-[1.7]';
  }
  return variant === 'compact'
    ? 'text-xs sm:text-[13px] leading-relaxed'
    : variant === 'ayah'
    ? 'text-[15.5px] sm:text-[16px] leading-[28px]'
    : 'text-[15px] leading-[1.7]';
}

export function getWordMeaningText(
  word: WordToken,
  lang: TranslationLanguage
): string {
  if (lang === 'en') return word.meaning;
  const fromMap = word.meanings?.[lang];
  if (fromMap) return fromMap;
  if (lang === 'hi' && word.meaningHi) return word.meaningHi;
  if (lang === 'ur' && word.meaningUr) return word.meaningUr;
  return word.meaning;
}

export function hasLocalizedWordMeaning(
  word: WordToken,
  lang: TranslationLanguage
): boolean {
  if (lang === 'en') return Boolean(word.meaning);
  if (word.meanings?.[lang]) return true;
  if (lang === 'hi') return Boolean(word.meaningHi);
  if (lang === 'ur') return Boolean(word.meaningUr);
  return false;
}

export function getAyahTranslationText(
  ayah: Pick<Ayah | SurahOpenerLine, 'translation' | 'translationHi' | 'translationUr' | 'translations'>,
  lang: TranslationLanguage
): { text: string; resolvedLang: TranslationLanguage } {
  if (lang === 'en') return { text: ayah.translation, resolvedLang: 'en' };
  const fromMap = ayah.translations?.[lang];
  if (fromMap) return { text: fromMap, resolvedLang: lang };
  if (lang === 'hi' && ayah.translationHi) {
    return { text: ayah.translationHi, resolvedLang: 'hi' };
  }
  if (lang === 'ur' && ayah.translationUr) {
    return { text: ayah.translationUr, resolvedLang: 'ur' };
  }
  return { text: ayah.translation, resolvedLang: 'en' };
}

export function getAyahTranslationSegments(
  ayah: Pick<
    Ayah | SurahOpenerLine,
    'translationSegments' | 'translationSegmentsHi' | 'translationSegmentsUr' | 'translationSegmentsByLang'
  >,
  lang: TranslationLanguage
): TranslationSegment[] | undefined {
  if (lang === 'en') return ayah.translationSegments;
  const fromMap = ayah.translationSegmentsByLang?.[lang];
  if (fromMap && fromMap.length > 0) return fromMap;
  if (lang === 'hi') return ayah.translationSegmentsHi;
  if (lang === 'ur') return ayah.translationSegmentsUr;
  return undefined;
}
