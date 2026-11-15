import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { Ayah, OpenerPhase, ReaderSettings, Reciter, Surah } from '../types/quran';
import { BASMALAH_OPENER, ISTIADHAH_OPENER } from '../data/quranData';
import { getWordDisplayArabic } from '../data/qiraatData';

interface FloatingPlayerDeckProps {
  surah: Surah;
  activeAyah: Ayah;
  openerPhase: OpenerPhase | null;
  reciter: Reciter;
  reciters: Reciter[];
  isPlaying: boolean;
  isLoadingChapter?: boolean;
  audioMode: 'stream' | 'study-sync';
  currentTime: number;
  duration: number;
  settings: ReaderSettings;
  variant?: 'floating' | 'sidebar' | 'top-compact' | 'bottom-bar';
  hideOnDesktop?: boolean;
  onTogglePlay: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onPrevAyah: () => void;
  onNextAyah: () => void;
  onRewind5s: () => void;
  onSeekRatio: (ratio: number) => void;
  onCycleSpeed: () => void;
  onCycleRepeat: () => void;
  onSelectReciter: (reciterId: string) => void;
}

function formatTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const FloatingPlayerDeck: React.FC<FloatingPlayerDeckProps> = ({
  surah,
  activeAyah,
  openerPhase,
  reciter,
  reciters,
  isPlaying,
  isLoadingChapter = false,
  audioMode,
  currentTime,
  duration,
  settings,
  variant = 'floating',
  hideOnDesktop = false,
  onTogglePlay,
  onPrevChapter,
  onNextChapter,
  onPrevAyah,
  onNextAyah,
  onRewind5s,
  onSeekRatio,
  onCycleSpeed,
  onCycleRepeat,
  onSelectReciter,
}) => {
  const waveRef = useRef<HTMLDivElement | null>(null);
  const mobileWaveRef = useRef<HTMLDivElement | null>(null);
  const reciterMenuRef = useRef<HTMLDivElement | null>(null);
  const secondaryReciterMenuRef = useRef<HTMLDivElement | null>(null);
  const [isReciterMenuOpen, setIsReciterMenuOpen] = useState(false);
  const [scrubPreview, setScrubPreview] = useState<{
    surface: 'bottom' | 'floating' | 'sidebar' | 'top';
    ratio: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  const activeOpener =
    openerPhase === 'istiadhah'
      ? ISTIADHAH_OPENER
      : openerPhase === 'basmalah'
      ? BASMALAH_OPENER
      : null;
  const activeWaveform = activeOpener ? activeOpener.waveform : activeAyah.waveform;
  const activeWords = activeOpener ? activeOpener.words : activeAyah.words;
  const compactWaveform = activeWaveform.filter((_, idx) => idx % 2 === 0);
  const safeDuration = Math.max(
    1,
    duration || (activeOpener ? activeOpener.durationSec : activeAyah.durationSec)
  );
  const progress = Math.min(1, Math.max(0, currentTime / safeDuration));

  useEffect(() => {
    if (!isReciterMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inPrimary = reciterMenuRef.current?.contains(target);
      const inSecondary = secondaryReciterMenuRef.current?.contains(target);
      if (!inPrimary && !inSecondary) {
        setIsReciterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isReciterMenuOpen]);

  const computePointerRatio = (
    clientX: number,
    el: HTMLDivElement | null
  ): number => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
  };

  const handleWaveformClick = (
    e: React.MouseEvent<HTMLDivElement>,
    targetRef: React.RefObject<HTMLDivElement | null> = waveRef
  ) => {
    const el = targetRef.current ?? e.currentTarget;
    onSeekRatio(computePointerRatio(e.clientX, el));
  };

  const renderScrubTooltip = (surface: 'bottom' | 'floating' | 'sidebar' | 'top') => {
    if (!scrubPreview || scrubPreview.surface !== surface) return null;
    const ratio = scrubPreview.ratio;
    const sec = ratio * safeDuration;
    const wIdx = activeWords.length
      ? Math.min(activeWords.length - 1, Math.floor(ratio * activeWords.length))
      : 0;
    const word = activeWords[wIdx];
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 z-50 px-2.5 py-1 rounded-lg bg-[#022C22] dark:bg-emerald-950 text-[#FEF3C7] border border-[#D97706]/40 shadow-lg flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold tabular-nums"
        style={{ left: `${Math.min(92, Math.max(8, ratio * 100))}%` }}
      >
        <span>{formatTime(sec)}</span>
        {word && (
          <>
            <span className="opacity-45">·</span>
            <span dir="rtl" className="font-quran-amiri text-sm leading-none text-amber-200">
              {getWordDisplayArabic(
                activeAyah,
                word,
                settings.riwayah,
                settings.maghrebiOrthography
              )}
            </span>
          </>
        )}
      </div>
    );
  };

  const repeatLabel =
    settings.repeatMode === 'ayah'
      ? 'Ayah'
      : settings.repeatMode === 'surah'
      ? 'Surah'
      : 'Off';

  const isSidebar = variant === 'sidebar';
  const isTopCompact = variant === 'top-compact';
  const isBottomBar = variant === 'bottom-bar';

  const reciterPopover = isReciterMenuOpen && (
    <div
      role="listbox"
      aria-label="Select Qari or reciter"
      className={`absolute left-0 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] shadow-2xl p-2 z-50 ${
        isSidebar || isTopCompact ? 'top-full mt-2' : 'bottom-full mb-3'
      }`}
    >
      <p className="px-2.5 py-1.5 text-[11px] font-semibold text-[#404944] dark:text-emerald-200/75">
        Select Reciter (Qari)
      </p>
      <div className="space-y-1 max-h-[min(16rem,45dvh)] overflow-y-auto">
        {[...reciters]
          .sort((a, b) => {
            const activeRiw = settings.riwayah ?? 'hafs';
            const aMatch = (a.riwayah ?? 'hafs') === activeRiw ? 0 : 1;
            const bMatch = (b.riwayah ?? 'hafs') === activeRiw ? 0 : 1;
            return aMatch - bMatch;
          })
          .map((item) => {
            const isSelected = item.id === reciter.id;
            const isWarshReciter = item.riwayah === 'warsh';
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectReciter(item.id);
                  setIsReciterMenuOpen(false);
                }}
                className={`w-full min-h-[42px] px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'text-[#022C22] hover:bg-[#064E3B]/6 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/10'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold truncate">{item.name}</p>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-[#022C22]/20 dark:text-[#022C22]'
                          : isWarshReciter
                          ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300'
                          : 'bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200'
                      }`}
                    >
                      {isWarshReciter ? 'Warsh' : 'Ḥafṣ'}
                    </span>
                  </div>
                  <p
                    className={`text-[10px] truncate ${
                      isSelected
                        ? 'text-white/80 dark:text-[#022C22]/80'
                        : 'text-[#404944] dark:text-emerald-200/75'
                    }`}
                  >
                    {item.style}
                  </p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
      </div>
    </div>
  );

  if (isSidebar) {
    return (
      <section
        aria-label="Audio recitation player"
        className="w-full rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921]/95 p-4 ayah-card-resting relative z-20"
      >
        {/* Header: Surah/Verse Context + Qari Switcher + Time */}
        <div className="flex items-start justify-between gap-3">
          <div ref={reciterMenuRef} className="relative min-w-0 flex-1">
            <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
              {surah.id}. {surah.nameSimple} ·{' '}
              {openerPhase === 'istiadhah'
                ? "Isti‘adhah"
                : openerPhase === 'basmalah'
                ? 'Bismillah'
                : `Ayah ${activeAyah.number}`}
            </p>
            <button
              type="button"
              onClick={() => setIsReciterMenuOpen((o) => !o)}
              aria-expanded={isReciterMenuOpen}
              aria-haspopup="listbox"
              title="Change reciter"
              className="mt-0.5 text-[11px] font-medium text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-300 flex items-center gap-1 max-w-full rounded px-1 -ml-1 py-0.5 hover:bg-[#064E3B]/6 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              {audioMode === 'stream' ? (
                <Volume2 className="w-3 h-3 shrink-0" />
              ) : (
                <Sparkles className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{reciter.name}</span>
              <ChevronUp
                className={`w-3 h-3 shrink-0 transition-transform ${
                  isReciterMenuOpen ? '' : 'rotate-180'
                }`}
              />
            </button>
            {reciterPopover}
          </div>

          <div className="text-right shrink-0">
            <p className="text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85">
              {formatTime(currentTime)} / {formatTime(safeDuration)}
            </p>
            <p className="text-[10px] font-medium text-[#0F766E] dark:text-emerald-300/80 tabular-nums">
              {openerPhase ? 'Opener' : `Verse ${activeAyah.number}/${surah.ayahs.length}`}
            </p>
          </div>
        </div>

        {/* Interactive Waveform Scrubber */}
        <div
          ref={waveRef}
          onClick={handleWaveformClick}
          role="slider"
          aria-label="Seek recitation position"
          aria-valuemin={0}
          aria-valuemax={Math.round(safeDuration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onSeekRatio(Math.min(1, progress + 0.1));
            if (e.key === 'ArrowLeft') onSeekRatio(Math.max(0, progress - 0.1));
          }}
          className="relative mt-2.5 h-7 flex items-center gap-[2px] cursor-pointer group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded-lg px-1"
        >
          {activeWaveform.map((amp, i) => {
            const barRatio = (i + 0.5) / activeWaveform.length;
            const isPlayed = barRatio <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? 'bg-[#D97706] dark:bg-amber-400'
                    : 'bg-[#0F766E]/30 group-hover:bg-[#0F766E]/55 dark:bg-emerald-300/25 dark:group-hover:bg-emerald-300/45'
                }`}
                style={{ height: `${Math.round(amp * 22)}px` }}
              />
            );
          })}

          <span
            className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-full bg-[#D97706] dark:bg-amber-300 shadow-sm border border-white dark:border-[#022C22] pointer-events-none transition-[left] duration-75"
            style={{ left: `calc(${progress * 100}% - 4px)` }}
            aria-hidden="true"
          />
        </div>

        {/* Transport Controls Row */}
        <div className="flex items-center justify-between gap-1 pt-2.5 mt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/10">
          <button
            type="button"
            onClick={onCycleSpeed}
            title="Recitation speed"
            className="min-h-[34px] px-2 rounded-lg text-[11px] font-semibold tabular-nums text-[#0F766E] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] shrink-0"
          >
            {settings.playbackSpeed}x
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onRewind5s}
              aria-label="Rewind 5 seconds"
              title="Rewind 5s"
              className="w-7 h-8 rounded-full flex items-center justify-center text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onPrevChapter}
              disabled={isLoadingChapter}
              aria-label="Previous chapter"
              title="Previous Chapter (Surah)"
              className="w-7 h-8 rounded-full flex items-center justify-center text-[#0F766E] hover:text-[#064E3B] hover:bg-[#064E3B]/8 dark:text-emerald-300 dark:hover:bg-emerald-400/12 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevAyah}
              aria-label="Previous verse"
              title="Previous Ayah"
              className="w-7 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isLoadingChapter}
              aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
              className={`w-10 h-10 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] mx-0.5 ${
                isPlaying ? 'ring-2 ring-[#D97706]/50 dark:ring-amber-300/60' : ''
              }`}
            >
              {isLoadingChapter ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNextAyah}
              aria-label="Next verse"
              title="Next Ayah"
              className="w-7 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onNextChapter}
              disabled={isLoadingChapter}
              aria-label="Next chapter"
              title="Next Chapter (Surah)"
              className="w-7 h-8 rounded-full flex items-center justify-center text-[#0F766E] hover:text-[#064E3B] hover:bg-[#064E3B]/8 dark:text-emerald-300 dark:hover:bg-emerald-400/12 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={`Loop mode: ${repeatLabel}`}
            title={`Loop: ${repeatLabel} (click to switch Off / Ayah / Surah)`}
            className={`min-h-[34px] px-2 rounded-full flex items-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] shrink-0 ${
              settings.repeatMode !== 'off'
                ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300 ring-1 ring-[#D97706]/30 dark:ring-amber-300/30'
                : 'text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200/75 dark:hover:bg-emerald-400/10'
            }`}
          >
            {settings.repeatMode === 'ayah' ? (
              <Repeat1 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Repeat className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{repeatLabel}</span>
          </button>
        </div>
      </section>
    );
  }

  if (isTopCompact) {
    return (
      <section
        data-top-docked-player="true"
        aria-label="Audio recitation player"
        className="w-full rounded-2xl border border-[#064E3B]/14 dark:border-emerald-300/20 bg-[#FBFBFA]/95 dark:bg-[#041D17]/95 backdrop-blur-md px-3.5 py-2.5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div ref={reciterMenuRef} className="relative min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                {surah.id}. {surah.nameSimple} ·{' '}
                {openerPhase === 'istiadhah'
                  ? "Isti‘adhah"
                  : openerPhase === 'basmalah'
                  ? 'Bismillah'
                  : `Ayah ${activeAyah.number}`}
              </p>
              <span className="text-[11px] font-medium tabular-nums text-[#404944] dark:text-emerald-200/80 shrink-0">
                {formatTime(currentTime)} / {formatTime(safeDuration)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReciterMenuOpen((o) => !o)}
              aria-expanded={isReciterMenuOpen}
              aria-haspopup="listbox"
              title="Change reciter"
              className="mt-0.5 text-[11px] font-medium text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-300 flex items-center gap-1 max-w-full rounded px-1 -ml-1 py-0.5 hover:bg-[#064E3B]/6 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              {audioMode === 'stream' ? (
                <Volume2 className="w-3 h-3 shrink-0" />
              ) : (
                <Sparkles className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{reciter.name}</span>
              <ChevronUp
                className={`w-3 h-3 shrink-0 transition-transform ${
                  isReciterMenuOpen ? '' : 'rotate-180'
                }`}
              />
            </button>
            {reciterPopover}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onCycleSpeed}
              title="Recitation speed"
              className="min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold tabular-nums text-[#0F766E] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors"
            >
              {settings.playbackSpeed}x
            </button>

            <button
              type="button"
              onClick={onPrevAyah}
              aria-label="Previous verse"
              title="Previous Ayah"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isLoadingChapter}
              aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
              className={`w-9 h-9 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] flex items-center justify-center shadow-sm transition-transform active:scale-95 disabled:opacity-70 ${
                isPlaying ? 'ring-2 ring-[#D97706]/50 dark:ring-amber-300/60' : ''
              }`}
            >
              {isLoadingChapter ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNextAyah}
              aria-label="Next verse"
              title="Next Ayah"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label={`Loop mode: ${repeatLabel}`}
              title={`Loop: ${repeatLabel}`}
              className={`min-h-[32px] px-2 rounded-full flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                settings.repeatMode !== 'off'
                  ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300'
                  : 'text-[#404944] hover:text-[#064E3B] dark:text-emerald-200/75'
              }`}
            >
              {settings.repeatMode === 'ayah' ? (
                <Repeat1 className="w-3 h-3 shrink-0" />
              ) : (
                <Repeat className="w-3 h-3 shrink-0" />
              )}
              <span className="hidden sm:inline">{repeatLabel}</span>
            </button>
          </div>
        </div>

        {/* Compact Interactive Scrubber */}
        <div
          ref={waveRef}
          onClick={handleWaveformClick}
          role="slider"
          aria-label="Seek recitation position"
          aria-valuemin={0}
          aria-valuemax={Math.round(safeDuration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onSeekRatio(Math.min(1, progress + 0.1));
            if (e.key === 'ArrowLeft') onSeekRatio(Math.max(0, progress - 0.1));
          }}
          className="relative mt-1.5 h-4 flex items-center gap-[2px] cursor-pointer group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded px-0.5"
        >
          {activeWaveform.map((amp, i) => {
            const barRatio = (i + 0.5) / activeWaveform.length;
            const isPlayed = barRatio <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? 'bg-[#D97706] dark:bg-amber-400'
                    : 'bg-[#0F766E]/25 group-hover:bg-[#0F766E]/50 dark:bg-emerald-300/20 dark:group-hover:bg-emerald-300/40'
                }`}
                style={{ height: `${Math.max(4, Math.round(amp * 14))}px` }}
              />
            );
          })}
        </div>
      </section>
    );
  }

  if (isBottomBar) {
    return (
      <footer
        data-docked-bottom-bar="true"
        role="region"
        aria-label="Audio recitation player"
        className="shrink-0 relative z-30 border-t border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#FFFFFF]/96 dark:bg-[#041D17]/96 backdrop-blur-xl shadow-[0_-6px_24px_-6px_rgba(2,44,34,0.08)] dark:shadow-[0_-8px_28px_-6px_rgba(0,0,0,0.45)]"
      >
        {/* Ultra-slim seek strip shown on short/zoomed <sm portrait viewports so bar compresses to 1 row */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
            onSeekRatio(Math.min(1, Math.max(0, ratio)));
          }}
          role="slider"
          aria-label="Seek recitation position"
          aria-valuemin={0}
          aria-valuemax={Math.round(safeDuration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onSeekRatio(Math.min(1, progress + 0.1));
            if (e.key === 'ArrowLeft') onSeekRatio(Math.max(0, progress - 0.1));
          }}
          className="hidden [@media(max-height:540px)]:block sm:!hidden w-full h-1.5 bg-[#064E3B]/10 dark:bg-emerald-300/15 cursor-pointer relative"
        >
          <span
            className="block h-full bg-[#D97706] dark:bg-amber-400 transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="max-w-[1600px] mx-auto px-2.5 sm:px-5 lg:px-8 py-2 [@media(max-height:540px)]:py-1">
          {/* Landscape Mobile / Tablet / Desktop Single-Row Docked Bar (sm+) */}
          <div className="hidden sm:flex items-center gap-2.5 md:gap-4 lg:gap-6 min-w-0">
            {/* Track & Reciter Context */}
            <div ref={reciterMenuRef} className="relative w-28 sm:w-36 md:w-44 lg:w-56 shrink-0 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                  {surah.id}. {surah.nameSimple} ·{' '}
                  {openerPhase === 'istiadhah'
                    ? "Isti‘adhah"
                    : openerPhase === 'basmalah'
                    ? 'Bismillah'
                    : `Ayah ${activeAyah.number}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReciterMenuOpen((o) => !o)}
                aria-expanded={isReciterMenuOpen}
                aria-haspopup="listbox"
                title="Change reciter"
                className="mt-0.5 text-[11px] font-medium text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-300 flex items-center gap-1 max-w-full rounded px-1 -ml-1 py-0.5 hover:bg-[#064E3B]/6 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                {audioMode === 'stream' ? (
                  <Volume2 className="w-3 h-3 shrink-0" />
                ) : (
                  <Sparkles className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{reciter.name}</span>
                <ChevronUp
                  className={`w-3 h-3 shrink-0 transition-transform ${
                    isReciterMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {reciterPopover}
            </div>

            {/* Transport Controls */}
            <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
              <button
                type="button"
                onClick={onRewind5s}
                aria-label="Rewind 5 seconds"
                title="Rewind 5s"
                className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onPrevChapter}
                disabled={isLoadingChapter}
                aria-label="Previous chapter"
                title="Previous Chapter (Surah)"
                className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-[#0F766E] hover:text-[#064E3B] hover:bg-[#064E3B]/8 dark:text-emerald-300 dark:hover:bg-emerald-400/12 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onPrevAyah}
                aria-label="Previous verse"
                title="Previous Ayah"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                disabled={isLoadingChapter}
                aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
                className={`w-9 h-9 md:w-10 md:h-10 [@media(max-height:540px)]:w-8 [@media(max-height:540px)]:h-8 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] mx-0.5 ${
                  isPlaying ? 'ring-2 ring-[#D97706]/50 dark:ring-amber-300/60' : ''
                }`}
              >
                {isLoadingChapter ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNextAyah}
                aria-label="Next verse"
                title="Next Ayah"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onNextChapter}
                disabled={isLoadingChapter}
                aria-label="Next chapter"
                title="Next Chapter (Surah)"
                className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-[#0F766E] hover:text-[#064E3B] hover:bg-[#064E3B]/8 dark:text-emerald-300 dark:hover:bg-emerald-400/12 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Waveform Scrubber + Clock */}
            <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3">
              <div className="relative flex-1 min-w-[48px]">
                {renderScrubTooltip('bottom')}
                <div
                  ref={waveRef}
                  onClick={(e) => handleWaveformClick(e, waveRef)}
                  onPointerDown={(e) => {
                    isDraggingRef.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const ratio = computePointerRatio(e.clientX, waveRef.current);
                    setScrubPreview({ surface: 'bottom', ratio });
                    onSeekRatio(ratio);
                  }}
                  onPointerMove={(e) => {
                    const ratio = computePointerRatio(e.clientX, waveRef.current);
                    setScrubPreview({ surface: 'bottom', ratio });
                    if (isDraggingRef.current) onSeekRatio(ratio);
                  }}
                  onPointerUp={() => {
                    isDraggingRef.current = false;
                  }}
                  onPointerCancel={() => {
                    isDraggingRef.current = false;
                    setScrubPreview(null);
                  }}
                  onPointerLeave={() => {
                    if (!isDraggingRef.current) setScrubPreview(null);
                  }}
                  role="slider"
                  aria-label="Seek recitation position"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(safeDuration)}
                  aria-valuenow={Math.round(currentTime)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') onSeekRatio(Math.min(1, progress + 0.1));
                    if (e.key === 'ArrowLeft') onSeekRatio(Math.max(0, progress - 0.1));
                  }}
                  className="relative w-full h-7 [@media(max-height:540px)]:h-5 flex items-center gap-[1.5px] lg:gap-[2px] cursor-pointer group select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded-lg px-0.5 touch-none"
                >
                  {compactWaveform.map((amp, i) => {
                    const barRatio = (i + 0.5) / compactWaveform.length;
                    const isPlayed = barRatio <= progress;
                    return (
                      <span
                        key={i}
                        className={`flex-1 min-w-[1px] rounded-full transition-colors duration-150 ${
                          isPlayed
                            ? 'bg-[#D97706] dark:bg-amber-400'
                            : 'bg-[#0F766E]/28 group-hover:bg-[#0F766E]/55 dark:bg-emerald-300/22 dark:group-hover:bg-emerald-300/45'
                        }`}
                        style={{ height: `${Math.max(4, Math.round(amp * 20))}px` }}
                      />
                    );
                  })}
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-full bg-[#D97706] dark:bg-amber-300 shadow-sm border border-white dark:border-[#022C22] pointer-events-none transition-[left] duration-75"
                    style={{ left: `calc(${progress * 100}% - 4px)` }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <span className="text-[10.5px] md:text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85 shrink-0 text-right whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(safeDuration)}
              </span>
            </div>

            {/* Right Controls: Speed + Loop + Verse Counter */}
            <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onCycleSpeed}
                title="Recitation speed"
                className="min-h-[34px] px-1.5 md:px-2 rounded-lg text-[11px] md:text-xs font-semibold tabular-nums text-[#0F766E] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                {settings.playbackSpeed}x
              </button>

              <button
                type="button"
                onClick={onCycleRepeat}
                aria-label={`Loop mode: ${repeatLabel}`}
                title={`Loop: ${repeatLabel} (click to switch Off / Ayah / Surah)`}
                className={`min-h-[34px] px-2 md:px-2.5 rounded-full flex items-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                  settings.repeatMode !== 'off'
                    ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300 ring-1 ring-[#D97706]/30 dark:ring-amber-300/30'
                    : 'text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200/75 dark:hover:bg-emerald-400/10'
                }`}
              >
                {settings.repeatMode === 'ayah' ? (
                  <Repeat1 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Repeat className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="hidden md:inline">{repeatLabel}</span>
              </button>

              <span className="hidden lg:inline-block text-[11px] font-medium text-[#404944] dark:text-emerald-200/75 tabular-nums pl-1 min-w-[38px] text-right">
                {openerPhase ? 'Opener' : `${activeAyah.number}/${surah.ayahs.length}`}
              </span>
            </div>
          </div>

          {/* Portrait Mobile Compact Docked Bar (< sm) */}
          <div className="sm:hidden space-y-1.5 [@media(max-height:540px)]:space-y-0">
            <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 min-w-0">
              <div ref={secondaryReciterMenuRef} className="relative min-w-[100px] flex-1">
                <p className="text-[11.5px] font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                  {surah.id}. {surah.nameSimple} ·{' '}
                  {openerPhase === 'istiadhah'
                    ? "Isti‘adhah"
                    : openerPhase === 'basmalah'
                    ? 'Bismillah'
                    : `Ayah ${activeAyah.number}`}
                </p>
                <button
                  type="button"
                  onClick={() => setIsReciterMenuOpen((o) => !o)}
                  aria-expanded={isReciterMenuOpen}
                  aria-haspopup="listbox"
                  className="text-[10px] font-medium text-[#0F766E] dark:text-emerald-300 flex items-center gap-1 max-w-full"
                >
                  <span className="truncate">{reciter.name}</span>
                  <ChevronUp
                    className={`w-3 h-3 shrink-0 transition-transform ${
                      isReciterMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {reciterPopover}
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={onCycleSpeed}
                  className="px-1.5 py-1 rounded text-[10.5px] font-semibold tabular-nums text-[#0F766E] dark:text-emerald-200"
                >
                  {settings.playbackSpeed}x
                </button>
                <button
                  type="button"
                  onClick={onPrevAyah}
                  aria-label="Previous verse"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#022C22] dark:text-[#E6FFF4]"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  disabled={isLoadingChapter}
                  aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
                  className="w-8 h-8 rounded-full bg-[#064E3B] dark:bg-emerald-500 text-[#FEF3C7] dark:text-[#022C22] flex items-center justify-center shadow-sm"
                >
                  {isLoadingChapter ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onNextAyah}
                  aria-label="Next verse"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#022C22] dark:text-[#E6FFF4]"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onCycleRepeat}
                  aria-label={`Loop mode: ${repeatLabel}`}
                  className={`px-1.5 py-1 rounded-full flex items-center gap-0.5 text-[10.5px] font-semibold ${
                    settings.repeatMode !== 'off'
                      ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300'
                      : 'text-[#404944] dark:text-emerald-200/75'
                  }`}
                >
                  {settings.repeatMode === 'ayah' ? (
                    <Repeat1 className="w-3 h-3" />
                  ) : (
                    <Repeat className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 [@media(max-height:540px)]:hidden">
              <div
                ref={mobileWaveRef}
                onClick={(e) => handleWaveformClick(e, mobileWaveRef)}
                role="slider"
                aria-label="Seek recitation position"
                aria-valuemin={0}
                aria-valuemax={Math.round(safeDuration)}
                aria-valuenow={Math.round(currentTime)}
                tabIndex={0}
                className="relative flex-1 min-w-0 h-4 flex items-center gap-[1.5px] cursor-pointer group select-none overflow-hidden"
              >
                {compactWaveform.map((amp, i) => {
                  const barRatio = (i + 0.5) / compactWaveform.length;
                  const isPlayed = barRatio <= progress;
                  return (
                    <span
                      key={i}
                      className={`flex-1 min-w-[1px] rounded-full ${
                        isPlayed
                          ? 'bg-[#D97706] dark:bg-amber-400'
                          : 'bg-[#0F766E]/25 dark:bg-emerald-300/20'
                      }`}
                      style={{ height: `${Math.max(3, Math.round(amp * 13))}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-medium tabular-nums text-[#404944] dark:text-emerald-200/80 shrink-0">
                {formatTime(currentTime)}/{formatTime(safeDuration)}
              </span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <div
      data-fixed-bottom-player="true"
      className={`fixed left-0 right-0 z-30 bottom-14 md:bottom-5 px-3 sm:px-5 pointer-events-none ${
        hideOnDesktop ? 'min-[900px]:hidden' : ''
      }`}
      role="region"
      aria-label="Audio recitation player"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto relative rounded-3xl border border-[#064E3B]/12 dark:border-emerald-300/20 bg-white/90 dark:bg-[#022C22]/90 backdrop-blur-xl shadow-[0_12px_40px_-8px_rgba(2,44,34,0.16)] dark:shadow-[0_14px_42px_-8px_rgba(0,0,0,0.55)] px-3.5 py-3 sm:px-6 sm:py-3.5">
        {/* Top Row: Track Context + Reciter Switcher + Waveform + Timestamp */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          <div
            ref={reciterMenuRef}
            className="relative flex items-center justify-between sm:justify-start gap-2.5 min-w-0 sm:w-52 shrink-0"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                {surah.id}. {surah.nameSimple} ·{' '}
                {openerPhase === 'istiadhah'
                  ? "Isti‘adhah"
                  : openerPhase === 'basmalah'
                  ? 'Bismillah'
                  : `Ayah ${activeAyah.number}`}
              </p>
              <button
                type="button"
                onClick={() => setIsReciterMenuOpen((o) => !o)}
                aria-expanded={isReciterMenuOpen}
                aria-haspopup="listbox"
                title="Change reciter"
                className="mt-0.5 text-[11px] font-medium text-[#0F766E] hover:text-[#064E3B] dark:text-emerald-300 dark:hover:text-amber-300 flex items-center gap-1 max-w-full rounded px-1 -ml-1 py-0.5 hover:bg-[#064E3B]/6 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              >
                {audioMode === 'stream' ? (
                  <Volume2 className="w-3 h-3 shrink-0" />
                ) : (
                  <Sparkles className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate">{reciter.name}</span>
                <ChevronUp
                  className={`w-3 h-3 shrink-0 transition-transform ${
                    isReciterMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {reciterPopover}

            <span className="sm:hidden text-[11px] font-medium tabular-nums text-[#404944] dark:text-emerald-200/80 shrink-0">
              {formatTime(currentTime)} / {formatTime(safeDuration)}
            </span>
          </div>

          {/* Interactive Amplitude Waveform */}
          <div className="relative flex-1">
            {renderScrubTooltip('floating')}
            <div
              ref={waveRef}
              onClick={handleWaveformClick}
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                const ratio = computePointerRatio(e.clientX, waveRef.current);
                setScrubPreview({ surface: 'floating', ratio });
                onSeekRatio(ratio);
              }}
              onPointerMove={(e) => {
                const ratio = computePointerRatio(e.clientX, waveRef.current);
                setScrubPreview({ surface: 'floating', ratio });
                if (isDraggingRef.current) onSeekRatio(ratio);
              }}
              onPointerUp={() => {
                isDraggingRef.current = false;
              }}
              onPointerCancel={() => {
                isDraggingRef.current = false;
                setScrubPreview(null);
              }}
              onPointerLeave={() => {
                if (!isDraggingRef.current) setScrubPreview(null);
              }}
              role="slider"
              aria-label="Seek recitation position"
              aria-valuemin={0}
              aria-valuemax={Math.round(safeDuration)}
              aria-valuenow={Math.round(currentTime)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') onSeekRatio(Math.min(1, progress + 0.1));
                if (e.key === 'ArrowLeft') onSeekRatio(Math.max(0, progress - 0.1));
              }}
              className="relative w-full h-8 flex items-center gap-[2px] sm:gap-[3px] cursor-pointer group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded-lg px-1 touch-none"
            >
              {activeWaveform.map((amp, i) => {
                const barRatio = (i + 0.5) / activeWaveform.length;
                const isPlayed = barRatio <= progress;
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-full transition-colors duration-150 ${
                      isPlayed
                        ? 'bg-[#D97706] dark:bg-amber-400'
                        : 'bg-[#0F766E]/30 group-hover:bg-[#0F766E]/55 dark:bg-emerald-300/25 dark:group-hover:bg-emerald-300/45'
                    }`}
                    style={{ height: `${Math.round(amp * 26)}px` }}
                  />
                );
              })}

              {/* Gold Scrub Head */}
              <span
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-5 rounded-full bg-[#D97706] dark:bg-amber-300 shadow-sm border border-white dark:border-[#022C22] pointer-events-none transition-[left] duration-75"
                style={{ left: `calc(${progress * 100}% - 5px)` }}
                aria-hidden="true"
              />
            </div>
          </div>

          <span className="hidden sm:inline-block text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85 w-20 text-right shrink-0">
            {formatTime(currentTime)} / {formatTime(safeDuration)}
          </span>
        </div>

        {/* Bottom Row: Transport Controls */}
        <div className="flex items-center justify-between gap-1 pt-2 mt-1 border-t border-[#064E3B]/8 dark:border-emerald-300/10">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={onCycleSpeed}
            title="Recitation speed"
            className="min-h-[38px] min-w-[40px] sm:min-w-[48px] px-1.5 sm:px-2.5 rounded-lg text-xs font-semibold tabular-nums text-[#0F766E] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] shrink-0"
          >
            {settings.playbackSpeed}x
          </button>

          {/* Core Center Controls */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            <button
              type="button"
              onClick={onRewind5s}
              aria-label="Rewind 5 seconds"
              title="Rewind 5s"
              className="w-8 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevChapter}
              disabled={isLoadingChapter}
              aria-label="Previous chapter"
              title="Previous Chapter (Surah)"
              className="w-8 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#0F766E] hover:text-[#064E3B] hover:bg-[#064E3B]/8 dark:text-emerald-300 dark:hover:bg-emerald-400/12 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <ChevronsLeft className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              type="button"
              onClick={onPrevAyah}
              aria-label="Previous verse"
              title="Previous Ayah"
              className="w-8 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <SkipBack className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* Primary Circular Play/Pause */}
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isLoadingChapter}
              aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
              className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] mx-0.5 ${
                isPlaying ? 'ring-2 ring-[#D97706]/50 dark:ring-amber-300/60' : ''
              }`}
            >
              {isLoadingChapter ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNextAyah}
              aria-label="Next verse"
              title="Next Ayah"
              className="w-8 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#022C22] hover:bg-[#064E3B]/8 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <SkipForward className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              type="button"
              onClick={onNextChapter}
              disabled={isLoadingChapter}
              aria-label="Next chapter"
              title="Next Chapter (Surah)"
              className="w-8 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#0F766E] hover:text-[#064E3B] hover:bg-[#064E3B]/8 dark:text-emerald-300 dark:hover:bg-emerald-400/12 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <ChevronsRight className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label={`Loop mode: ${repeatLabel}`}
              title={`Loop: ${repeatLabel} (click to switch Off / Ayah / Surah)`}
              className={`min-h-[38px] px-2 sm:px-2.5 rounded-full flex items-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                settings.repeatMode !== 'off'
                  ? 'bg-[#D97706]/15 text-[#904D00] dark:bg-amber-400/20 dark:text-amber-300 ring-1 ring-[#D97706]/30 dark:ring-amber-300/30'
                  : 'text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200/75 dark:hover:bg-emerald-400/10'
              }`}
            >
              {settings.repeatMode === 'ayah' ? (
                <Repeat1 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Repeat className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="text-[11px]">{repeatLabel}</span>
            </button>
          </div>

          <div className="min-w-[48px] text-right hidden sm:block shrink-0">
            <span className="text-[11px] font-medium text-[#404944] dark:text-emerald-200/75 tabular-nums">
              {openerPhase ? 'Opener' : `${activeAyah.number}/${surah.ayahs.length}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
