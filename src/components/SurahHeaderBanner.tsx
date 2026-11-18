import React, { useMemo, useState } from 'react';
import { FileDown, Play, Pause, ScrollText } from 'lucide-react';
import {
  OpenerPhase,
  ReaderSettings,
  Surah,
  SurahOpenerLine,
  TranslationLanguage,
} from '../types/quran';
import { BASMALAH_OPENER, ISTIADHAH_OPENER, alignTranslationSegments } from '../data/quranData';
import { formatAyahByRiwayah } from '../data/qiraatData';
import { getAyahFootnotes } from '../data/wordFootnotes';
import { FiligreeDivider, RubElHizbBadge } from './RubElHizbIcon';
import { LanguagePillSelector } from './LanguagePillSelector';
import {
  getAyahTranslationSegments,
  getAyahTranslationText,
  getTranslationTextClass,
  getWordMeaningText,
  isRtlTranslationLang,
  resolveEffectiveSyncedWordIndex,
} from '../utils/translationConfig';

interface SurahHeaderBannerProps {
  surah: Surah;
  settings: ReaderSettings;
  isPlayingCurrentSurah: boolean;
  openerPhase: OpenerPhase | null;
  openerWordIndex: number | null;
  onTogglePlaySurah: () => void;
  onToggleReadingMode?: () => void;
  onPlayOpener: (phase: OpenerPhase) => void;
  onSelectLanguage: (lang: TranslationLanguage) => void;
  onOpenQiraatExplorer?: () => void;
  onExportPdf?: () => void;
}

export const SurahHeaderBanner: React.FC<SurahHeaderBannerProps> = ({
  surah,
  settings,
  isPlayingCurrentSurah,
  openerPhase,
  openerWordIndex,
  onTogglePlaySurah,
  onToggleReadingMode,
  onPlayOpener,
  onSelectLanguage,
  onOpenQiraatExplorer,
  onExportPdf,
}) => {
  const [openOpenerFootnote, setOpenOpenerFootnote] = useState<{
    phase: OpenerPhase;
    number: number;
  } | null>(null);

  const openerFootnotes = useMemo(
    () => ({
      istiadhah: getAyahFootnotes(ISTIADHAH_OPENER.words),
      basmalah: getAyahFootnotes(BASMALAH_OPENER.words),
    }),
    []
  );

  const fontClass =
    settings.arabicFont === 'scheherazade'
      ? 'font-quran-scheherazade'
      : 'font-quran-amiri';

  const activeLang: TranslationLanguage = settings.translationLanguage ?? 'en';

  const renderOpenerLine = (line: SurahOpenerLine) => {
    const isLineActive = openerPhase === line.phase;
    const syncedIdx = isLineActive ? openerWordIndex : null;
    const footnotes = openerFootnotes[line.phase];
    const footnoteByWordIdx = new Map(footnotes.map((f) => [f.wordIndex, f]));
    const activeFn =
      openOpenerFootnote && openOpenerFootnote.phase === line.phase
        ? footnotes.find((f) => f.number === openOpenerFootnote.number) ?? null
        : null;
    const localizedLine = getAyahTranslationText(line, activeLang);
    const activeSegments =
      getAyahTranslationSegments(line, activeLang) ??
      alignTranslationSegments(
        localizedLine.text,
        line.words,
        localizedLine.resolvedLang
      ) ??
      [];
    const effectiveSegWordIdx = resolveEffectiveSyncedWordIndex(syncedIdx, activeSegments);

    return (
      <div
        id={`opener-${line.phase}`}
        key={line.phase}
        className={`scroll-mt-6 w-full max-w-xl rounded-2xl px-3 sm:px-4 py-3 transition-all duration-300 ease-out border ${
          isLineActive
            ? 'border-[#D97706]/50 bg-[#D97706]/[0.06] dark:border-amber-400/50 dark:bg-amber-400/10'
            : 'border-[#064E3B]/8 bg-white/60 dark:border-emerald-300/12 dark:bg-[#022C22]/45'
        }`}
      >
        <div className="flex items-center justify-between gap-2 pb-1">
          <span className="text-[11px] font-semibold tracking-wide text-[#0F766E] dark:text-emerald-300/90">
            {line.label}
          </span>
          <button
            type="button"
            onClick={() => onPlayOpener(line.phase)}
            aria-label={
              isLineActive && isPlayingCurrentSurah
                ? `Pause ${line.label}`
                : `Recite ${line.label}`
            }
            title={`Recite ${line.label}`}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
              isLineActive && isPlayingCurrentSurah
                ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/12 dark:text-emerald-200 dark:hover:bg-emerald-400 dark:hover:text-[#022C22]'
            }`}
          >
            {isLineActive && isPlayingCurrentSurah ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Arabic Words */}
        <div
          dir="rtl"
          className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[22px] sm:text-[26px] leading-[1.9] ${fontClass}`}
        >
          {line.words.map((word, idx) => {
            const isWordSynced = syncedIdx === idx;
            const localizedMeaning = getWordMeaningText(word, activeLang);
            return (
              <span
                key={word.id}
                title={`${word.transliteration} · ${localizedMeaning}`}
                className={`px-2 py-0.5 rounded-full ${
                  isWordSynced
                    ? 'transition-none bg-[#064E3B]/10 dark:bg-amber-400/18 border border-[#D97706] dark:border-amber-400 text-[#003527] dark:text-amber-100 font-semibold'
                    : 'border border-transparent text-[#064E3B] dark:text-amber-100/95'
                }`}
              >
                {formatAyahByRiwayah(
                  'opener',
                  word.arabic,
                  settings.riwayah,
                  settings.maghrebiOrthography
                )}
              </span>
            );
          })}
        </div>

        {/* Synchronized Transliteration */}
        {settings.showTransliteration && (
          <p className="mt-1 text-xs sm:text-[13px] italic leading-relaxed">
            {line.words.map((word, idx) => {
              const isSynced = syncedIdx === idx;
              const isPast = syncedIdx !== null && idx < syncedIdx;
              return (
                <React.Fragment key={word.id}>
                  <span
                    className={`rounded px-0.5 ${
                      isSynced
                        ? 'transition-none bg-[#D97706]/16 text-[#904D00] dark:bg-amber-400/22 dark:text-amber-200 underline decoration-[#D97706] dark:decoration-amber-400 decoration-2 underline-offset-4 font-semibold not-italic'
                        : isPast
                        ? 'text-[#064E3B] dark:text-emerald-200'
                        : syncedIdx !== null
                        ? 'text-[#0F766E]/55 dark:text-emerald-300/55'
                        : 'text-[#0F766E] dark:text-emerald-300/90'
                    }`}
                  >
                    {word.transliteration}
                  </span>
                  {idx < line.words.length - 1 ? ' ' : ''}
                </React.Fragment>
              );
            })}
          </p>
        )}

        {/* Synchronized Translation across all 7 languages with Superscript Footnotes */}
        {settings.showTranslation && (
          <p
            dir={isRtlTranslationLang(localizedLine.resolvedLang) ? 'rtl' : 'ltr'}
            className={`mt-1 ${getTranslationTextClass(
              localizedLine.resolvedLang,
              'compact'
            )}`}
          >
            {activeSegments.map((seg, segIdx) => {
              const isSynced = effectiveSegWordIdx === seg.wordIndex;
              const isPast =
                effectiveSegWordIdx !== null && seg.wordIndex < effectiveSegWordIdx;
              const fnItem = footnoteByWordIdx.get(seg.wordIndex);
              const isOpen = activeFn?.number === fnItem?.number;

              return (
                <React.Fragment key={`${seg.wordIndex}-${segIdx}`}>
                  <span
                    className={`rounded ${localizedLine.resolvedLang === 'zh' && !isSynced ? 'px-0' : 'px-0.5'} ${
                      isSynced
                        ? 'transition-none bg-[#D97706]/16 text-[#003527] dark:bg-amber-400/20 dark:text-amber-100 underline decoration-[#D97706]/85 dark:decoration-amber-400/85 decoration-2 underline-offset-4 font-semibold'
                        : isPast
                        ? 'text-[#022C22] dark:text-[#E6FFF4]'
                        : syncedIdx !== null
                        ? 'text-[#022C22]/55 dark:text-[#D0FAEA]/55'
                        : 'text-[#404944] dark:text-emerald-200/85'
                    }`}
                  >
                    {seg.text}
                  </span>
                  {fnItem && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenOpenerFootnote((prev) =>
                          prev && prev.phase === line.phase && prev.number === fnItem.number
                            ? null
                            : { phase: line.phase, number: fnItem.number }
                        )
                      }
                      aria-expanded={isOpen}
                      aria-label={`Read footnote ${fnItem.number}: ${fnItem.footnote.term}`}
                      title={`Footnote ${fnItem.number}: ${fnItem.footnote.term}`}
                      className={`inline-flex items-center justify-center align-super text-[9.5px] font-bold leading-none ml-0.5 px-1 py-0.5 rounded tabular-nums cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        isOpen
                          ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                          : 'text-[#0F766E] hover:text-[#D97706] dark:text-amber-300'
                      }`}
                    >
                      {fnItem.number}
                    </button>
                  )}
                  {segIdx < activeSegments.length - 1 &&
                  localizedLine.resolvedLang !== 'zh'
                    ? ' '
                    : ''}
                </React.Fragment>
              );
            })}
          </p>
        )}

        {/* Inline Opener Footnotes Strip */}
        {footnotes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/10 text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-[#404944] dark:text-emerald-200/80">
              <span className="font-semibold text-[#0F766E] dark:text-emerald-300">
                Notes:
              </span>
              {footnotes.map((fn, idx) => {
                const isOpen = activeFn?.number === fn.number;
                return (
                  <React.Fragment key={fn.footnote.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenOpenerFootnote((prev) =>
                          prev && prev.phase === line.phase && prev.number === fn.number
                            ? null
                            : { phase: line.phase, number: fn.number }
                        )
                      }
                      aria-expanded={isOpen}
                      className={`inline-flex items-baseline gap-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                        isOpen
                          ? 'text-[#B45309] dark:text-amber-300 font-semibold underline decoration-[#D97706]/70 underline-offset-4'
                          : 'hover:text-[#064E3B] dark:hover:text-amber-200'
                      }`}
                    >
                      <sup className="text-[9.5px] font-bold text-[#0F766E] dark:text-amber-300 tabular-nums">
                        {fn.number}
                      </sup>
                      <span>{fn.word.transliteration}</span>
                    </button>
                    {idx < footnotes.length - 1 && (
                      <span aria-hidden="true" className="opacity-35">
                        ·
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {activeFn && (
              <div className="mt-2 pt-2 border-t border-[#064E3B]/6 dark:border-emerald-300/8 text-[12px] leading-relaxed">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold text-[#0F766E] dark:text-amber-300 tabular-nums">
                    {activeFn.number}.
                  </span>
                  <span className="font-semibold text-[#022C22] dark:text-white">
                    {activeFn.footnote.term}
                  </span>
                  <span className="text-[11px] text-[#404944] dark:text-emerald-300/75">
                    · {activeFn.footnote.category}
                  </span>
                </div>
                <p className="mt-0.5 pl-4 text-[#404944] dark:text-emerald-100/85">
                  <span className="font-medium text-[#022C22]/85 dark:text-emerald-100">
                    Literally: &ldquo;{activeFn.footnote.literalGloss}.&rdquo;{' '}
                  </span>
                  {activeFn.footnote.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label={`Surah ${surah.nameSimple}`}
      className="relative overflow-hidden rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-gradient-to-b from-[#FFFFFF] via-[#F5FFFA] to-[#E6FFF4]/55 dark:from-[#0A2921] dark:via-[#07261E] dark:to-[#063529]/80 p-4 sm:p-8 ayah-card-resting"
    >
      {/* Subtle stepped Islamic geometric corner ornaments */}
      <svg
        viewBox="0 0 64 64"
        className="absolute top-0 left-0 w-14 h-14 text-[#064E3B]/10 dark:text-emerald-300/12 pointer-events-none"
        fill="none"
        aria-hidden="true"
      >
        <path d="M0 24H24V0M0 12H12V0M24 24L36 36" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <svg
        viewBox="0 0 64 64"
        className="absolute top-0 right-0 w-14 h-14 text-[#064E3B]/10 dark:text-emerald-300/12 pointer-events-none rotate-90"
        fill="none"
        aria-hidden="true"
      >
        <path d="M0 24H24V0M0 12H12V0M24 24L36 36" stroke="currentColor" strokeWidth="1.2" />
      </svg>

      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs font-medium text-[#404944] dark:text-emerald-200/80">
          <span>Surah {surah.id}</span>
          <span aria-hidden="true">·</span>
          <span>{surah.revelationPlace}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{surah.totalAyahs} Verses</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">Juz {surah.juz}</span>
          {onOpenQiraatExplorer && (
            <button
              type="button"
              onClick={onOpenQiraatExplorer}
              title="Compare 10 Qirā'āt, Riwāyahs & Maghrebi Script"
              className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#064E3B]/8 hover:bg-[#064E3B]/15 text-[#064E3B] dark:bg-emerald-400/15 dark:hover:bg-emerald-400/25 dark:text-emerald-200 text-[11px] font-semibold transition-colors"
            >
              <span>
                Text preview: {settings.riwayah === 'warsh' ? "Warsh 'an Nāfi'" : "Ḥafṣ 'an 'Āṣim"}
                {settings.maghrebiOrthography ? ' · Maghrebi' : ''}
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 mt-1">
          <h1
            dir="rtl"
            className="font-quran-amiri text-[34px] sm:text-[42px] font-bold leading-[1.6] text-[#003527] dark:text-[#E6FFF4]"
          >
            {surah.nameArabic}
          </h1>
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <RubElHizbBadge className="w-6 h-6" label={surah.id} active />
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#022C22] dark:text-white">
              {surah.nameSimple}
            </p>
            <span className="text-sm font-medium text-[#0F766E] dark:text-emerald-300">
              · {surah.nameMeaning}
            </span>
          </div>
        </div>

        <div className="w-full max-w-md pt-1">
          <FiligreeDivider />
        </div>

        {/* Opening Invocation: Isti'adhah (+ Basmalah for 112 Surahs, except Surah 1 where 1:1 is Basmalah and Surah 9 At-Tawbah which has no Basmalah) */}
        <div className="w-full flex flex-col items-center gap-2.5 pt-1">
          {renderOpenerLine(ISTIADHAH_OPENER)}
          {surah.hasBismillah && renderOpenerLine(BASMALAH_OPENER)}
          {surah.id === 9 && (
            <p className="text-xs text-[#404944] dark:text-emerald-200/80 max-w-lg">
              Surah At-Tawbah (Chapter 9) is the sole chapter in the Qur&apos;an that begins with Al-Isti&apos;adhah alone, without Bismillah.
            </p>
          )}
          {surah.id === 1 && (
            <p className="text-xs text-[#404944] dark:text-emerald-200/80 max-w-lg">
              In Surah Al-Fatiha, Bismillahi-r-Rahmani-r-Rahim is recited as Verse 1:1 immediately following Al-Isti&apos;adhah.
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onTogglePlaySurah}
            className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-semibold tracking-wide flex items-center gap-2.5 transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            {isPlayingCurrentSurah ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Recitation</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Recite Surah</span>
              </>
            )}
          </button>

          {onToggleReadingMode && (
            <button
              type="button"
              onClick={onToggleReadingMode}
              aria-pressed={settings.readingMode !== false}
              title="Auto-scrolls verses and continues into the next Surah in the background"
              className={`min-h-[44px] px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                settings.readingMode !== false
                  ? 'border-[#D97706]/50 bg-[#D97706]/12 text-[#904D00] dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200'
                  : 'border-[#064E3B]/15 bg-white/80 text-[#404944] hover:text-[#022C22] dark:border-emerald-300/20 dark:bg-[#041D17] dark:text-emerald-200/80'
              }`}
            >
              <ScrollText className="w-4 h-4 shrink-0" />
              <span>
                {settings.readingMode !== false ? 'Reading Mode: On' : 'Reading Mode'}
              </span>
            </button>
          )}

          <LanguagePillSelector
            activeLang={activeLang}
            onSelectLanguage={onSelectLanguage}
          />

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              title={`Export Surah ${surah.nameSimple} as a styled PDF document`}
              className="min-h-[44px] px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-2 border border-[#064E3B]/15 bg-white/85 text-[#022C22] hover:border-[#D97706]/60 hover:text-[#904D00] dark:border-emerald-300/20 dark:bg-[#041D17] dark:text-emerald-200 dark:hover:border-amber-400/60 dark:hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>Export PDF</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
