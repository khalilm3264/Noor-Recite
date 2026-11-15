import { WARSH_PREVIEW_NOTICE } from '../data/qiraatData';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Check,
  Clock,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  HifzSpacedItem,
  ReaderSettings,
  TranslationLanguage,
  WordHighlightStyle,
} from '../types/quran';
import { RECITERS } from '../data/quranData';
import {
  TRANSLATION_LANGUAGE_OPTIONS,
  isRtlTranslationLang,
} from '../utils/translationConfig';
import {
  RecitationHistoryEntry,
  computeRecitationInsights,
  formatRecitationDuration,
} from '../utils/recitationHistory';
import {
  HifzDailyPoint,
  HifzProgressEvent,
  build30DayHifzSeries,
  computeHifzSummary,
} from '../utils/hifzProgress';

interface SettingsModalProps {
  isOpen: boolean;
  settings: ReaderSettings;
  darkMode: boolean;
  recitationHistory: RecitationHistoryEntry[];
  hifzProgressEvents?: HifzProgressEvent[];
  hifzSpacedQueue?: HifzSpacedItem[];
  onClearRecitationHistory: () => void;
  onToggleDarkMode: () => void;
  onUpdateSettings: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

type SettingsTab = 'preferences' | 'insights';
type HifzChartMode = 'daily' | 'cumulative';

interface HifzTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: HifzDailyPoint }>;
  darkMode: boolean;
  mode: HifzChartMode;
}

const HifzChartTooltip: React.FC<HifzTooltipProps> = ({
  active,
  payload,
  darkMode,
  mode,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${
        darkMode
          ? 'bg-[#041D17] border-emerald-300/25 text-[#E6FFF4]'
          : 'bg-white border-[#064E3B]/15 text-[#022C22]'
      }`}
    >
      <p className="font-bold mb-1">{point.label}</p>
      {mode === 'daily' ? (
        <div className="space-y-0.5 tabular-nums">
          <p className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] opacity-85">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-emerald-400" />
              Memorized
            </span>
            <span className="font-bold">{point.memorized}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] opacity-85">
              <span className="w-2 h-2 rounded-full bg-[#D97706] dark:bg-amber-400" />
              Mastered
            </span>
            <span className="font-bold">{point.mastered}</span>
          </p>
        </div>
      ) : (
        <p className="flex items-center justify-between gap-4 tabular-nums">
          <span className="text-[11px] opacity-85">30-Day Cumulative</span>
          <span className="font-bold">{point.cumulative} verses</span>
        </p>
      )}
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  darkMode,
  recitationHistory,
  hifzProgressEvents = [],
  hifzSpacedQueue = [],
  onClearRecitationHistory,
  onToggleDarkMode,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('preferences');
  const [hifzChartMode, setHifzChartMode] = useState<HifzChartMode>('daily');
  const [confirmClear, setConfirmClear] = useState(false);

  const insights = useMemo(
    () => computeRecitationInsights(recitationHistory),
    [recitationHistory]
  );

  const hifzSeries = useMemo(
    () => build30DayHifzSeries(hifzProgressEvents, hifzSpacedQueue),
    [hifzProgressEvents, hifzSpacedQueue]
  );

  const hifzSummary = useMemo(
    () => computeHifzSummary(hifzSeries, hifzSpacedQueue),
    [hifzSeries, hifzSpacedQueue]
  );

  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-4 sm:p-6 shadow-2xl max-h-[88dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Display, audio preferences, and recitation insights"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#064E3B]/10 dark:border-emerald-300/15">
          <div>
            <h2 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
              {activeTab === 'insights'
                ? 'Recitation Insights'
                : 'Reading & Audio Preferences'}
            </h2>
            <p className="text-xs text-[#404944] dark:text-emerald-200/75">
              {activeTab === 'insights'
                ? 'Calculated from your local recitation history log'
                : 'Customize calligraphy, translation language, tajweed highlights, and reciter'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-[#404944] hover:bg-[#064E3B]/8 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Switcher: Preferences | Insights */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-[#064E3B]/[0.05] dark:bg-[#041D17] p-1 border border-[#064E3B]/10 dark:border-emerald-300/15"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preferences'}
            onClick={() => setActiveTab('preferences')}
            className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'preferences'
                ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'insights'}
            onClick={() => setActiveTab('insights')}
            className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'insights'
                ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Insights</span>
          </button>
        </div>

        {activeTab === 'insights' ? (
          <div className="space-y-5 pt-5" role="tabpanel" aria-label="Recitation Insights">
            {/* Primary 2-column metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E] dark:text-emerald-300">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Total Recitation Time</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                  {formatRecitationDuration(insights.totalTimeSec)}
                </p>
                <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 tabular-nums">
                  {insights.totalVerses} {insights.totalVerses === 1 ? 'verse' : 'verses'} across{' '}
                  {insights.activeDays} active {insights.activeDays === 1 ? 'day' : 'days'}
                </p>
              </div>

              <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#D97706] dark:text-amber-300">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Average Daily Verses</span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                  {insights.avgDailyVerses}
                </p>
                <p className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                  Verses recited per active day
                </p>
              </div>
            </div>

            {/* Most Recited Surah */}
            <div className="rounded-xl border border-[#D97706]/25 dark:border-amber-400/25 bg-[#FEF3C7]/25 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309] dark:text-amber-300">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Most Recited Surah</span>
                </span>
                {insights.mostRecitedSurah && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D97706]/15 text-[#B45309] dark:bg-amber-400/20 dark:text-amber-200 tabular-nums">
                    Surah {insights.mostRecitedSurah.surahId}
                  </span>
                )}
              </div>

              {insights.mostRecitedSurah ? (
                <>
                  <p className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    {insights.mostRecitedSurah.surahName}
                  </p>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/80 tabular-nums">
                    {insights.mostRecitedSurah.count}{' '}
                    {insights.mostRecitedSurah.count === 1 ? 'verse' : 'verses'} logged ·{' '}
                    {formatRecitationDuration(insights.mostRecitedSurah.totalTimeSec)} spent reciting
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                    No recitations logged yet
                  </p>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                    Play verses in the Reader or tap &ldquo;+ Log Verse&rdquo; on your daily progress bar to build your recitation history.
                  </p>
                </div>
              )}
            </div>

            {/* Hifz Progress 30-Day Recharts Visualization */}
            <section
              aria-label="Hifz Progress 30-day chart"
              className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-4 space-y-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#064E3B] dark:text-emerald-300">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>Hifz Progress</span>
                  </div>
                  <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 mt-0.5">
                    Verses memorized or mastered over the past 30 days
                  </p>
                </div>

                <div
                  role="group"
                  aria-label="Hifz chart display mode"
                  className="inline-flex rounded-lg bg-[#064E3B]/[0.06] dark:bg-[#0A2921] p-0.5 border border-[#064E3B]/10 dark:border-emerald-300/15"
                >
                  <button
                    type="button"
                    onClick={() => setHifzChartMode('daily')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      hifzChartMode === 'daily'
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'text-[#404944] dark:text-emerald-200/80'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setHifzChartMode('cumulative')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      hifzChartMode === 'cumulative'
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'text-[#404944] dark:text-emerald-200/80'
                    }`}
                  >
                    Cumulative
                  </button>
                </div>
              </div>

              {/* Compact 30-day KPI Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/80 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-[#0F766E] dark:text-emerald-300">
                    Memorized (30d)
                  </p>
                  <p className="text-base font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    {hifzSummary.totalMemorized30d}
                  </p>
                </div>
                <div className="rounded-lg border border-[#D97706]/20 dark:border-amber-400/20 bg-white dark:bg-[#0A2921]/80 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-[#B45309] dark:text-amber-300">
                    Mastered (30d)
                  </p>
                  <p className="text-base font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    {hifzSummary.totalMastered30d}
                  </p>
                </div>
                <div className="rounded-lg border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921]/80 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-[#404944] dark:text-emerald-200/80">
                    Active Hifz Days
                  </p>
                  <p className="text-base font-bold tabular-nums text-[#022C22] dark:text-[#E6FFF4]">
                    {hifzSummary.activeHifzDays30d}
                    <span className="text-[11px] font-normal opacity-70">/30</span>
                  </p>
                </div>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {hifzChartMode === 'daily' ? (
                    <BarChart
                      data={hifzSeries}
                      margin={{ top: 8, right: 6, left: -24, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={
                          darkMode
                            ? 'rgba(110, 231, 183, 0.14)'
                            : 'rgba(6, 78, 59, 0.09)'
                        }
                      />
                      <XAxis
                        dataKey="shortLabel"
                        interval={4}
                        tick={{
                          fontSize: 10,
                          fill: darkMode ? '#A7F3D0' : '#404944',
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fontSize: 10,
                          fill: darkMode ? '#A7F3D0' : '#404944',
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{
                          fill: darkMode
                            ? 'rgba(52, 211, 153, 0.09)'
                            : 'rgba(6, 78, 59, 0.05)',
                        }}
                        content={
                          <HifzChartTooltip darkMode={darkMode} mode="daily" />
                        }
                      />
                      <Bar
                        dataKey="memorized"
                        stackId="hifz"
                        name="Memorized"
                        fill={darkMode ? '#34D399' : '#0F766E'}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={14}
                      />
                      <Bar
                        dataKey="mastered"
                        stackId="hifz"
                        name="Mastered"
                        fill={darkMode ? '#FBBF24' : '#D97706'}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={14}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={hifzSeries}
                      margin={{ top: 8, right: 6, left: -24, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="hifzCumFill" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={darkMode ? '#34D399' : '#0F766E'}
                            stopOpacity={0.42}
                          />
                          <stop
                            offset="95%"
                            stopColor={darkMode ? '#34D399' : '#0F766E'}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={
                          darkMode
                            ? 'rgba(110, 231, 183, 0.14)'
                            : 'rgba(6, 78, 59, 0.09)'
                        }
                      />
                      <XAxis
                        dataKey="shortLabel"
                        interval={4}
                        tick={{
                          fontSize: 10,
                          fill: darkMode ? '#A7F3D0' : '#404944',
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fontSize: 10,
                          fill: darkMode ? '#A7F3D0' : '#404944',
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={
                          <HifzChartTooltip
                            darkMode={darkMode}
                            mode="cumulative"
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        name="Cumulative Verses"
                        stroke={darkMode ? '#34D399' : '#064E3B'}
                        strokeWidth={2.2}
                        fill="url(#hifzCumFill)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-[#404944] dark:text-emerald-200/75">
                {hifzChartMode === 'daily' ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#0F766E] dark:bg-emerald-400" />
                      Memorized (Stage 1–3)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706] dark:bg-amber-400" />
                      Mastered (Stage 4–5)
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#064E3B] dark:bg-emerald-400" />
                    Unique verses memorized or mastered (rolling 30d)
                  </span>
                )}
                {hifzSummary.totalCombined30d === 0 && (
                  <span className="text-[10.5px] italic text-[#404944] dark:text-emerald-200/70">
                    Complete a Hifz Quiz drill to populate daily bars
                  </span>
                )}
              </div>
            </section>

            {/* Top Surahs Breakdown */}
            {insights.topSurahs.length > 0 && (
              <div className="space-y-2.5">
                <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                  Top Practiced Surahs
                </span>
                <div className="space-y-2">
                  {insights.topSurahs.map((stat) => {
                    const maxCount = insights.topSurahs[0]?.count || 1;
                    const pct = Math.max(8, Math.round((stat.count / maxCount) * 100));
                    return (
                      <div
                        key={stat.surahId}
                        className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 px-3.5 py-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                            {stat.surahId}. {stat.surahName}
                          </span>
                          <span className="tabular-nums text-[#404944] dark:text-emerald-200/80">
                            {stat.count} {stat.count === 1 ? 'verse' : 'verses'} ·{' '}
                            {formatRecitationDuration(stat.totalTimeSec)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#064E3B]/10 dark:bg-emerald-300/15 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#064E3B] dark:bg-emerald-400 transition-[width] duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reset History Control */}
            {(recitationHistory.length > 0 || hifzProgressEvents.length > 0) && (
              <div className="pt-2 border-t border-[#064E3B]/10 dark:border-emerald-300/15 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#404944] dark:text-emerald-200/70">
                  Stored locally in your browser
                </span>
                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="text-xs font-medium text-[#404944] hover:underline dark:text-emerald-200/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClearRecitationHistory();
                        setConfirmClear(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#BA1A1A] text-white text-xs font-semibold hover:opacity-90"
                    >
                      Confirm Reset
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#BA1A1A] dark:text-rose-300 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-5">
          {/* Surface Theme */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
              Reading Atmosphere
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => darkMode && onToggleDarkMode()}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  !darkMode
                    ? 'bg-[#064E3B] text-white border-[#064E3B]'
                    : 'bg-[#FBFBFA] text-[#022C22] border-[#064E3B]/15 dark:bg-[#041D17] dark:text-emerald-200 dark:border-emerald-300/20'
                }`}
              >
                Alabaster Parchment
              </button>
              <button
                type="button"
                onClick={() => !darkMode && onToggleDarkMode()}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  darkMode
                    ? 'bg-emerald-500 text-[#022C22] border-emerald-500'
                    : 'bg-white text-[#022C22] border-[#064E3B]/15'
                }`}
              >
                Night Cypress
              </button>
            </div>
          </div>

          {/* Arabic Font Family */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
              Arabic Calligraphic Script
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ arabicFont: 'amiri' })}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                  settings.arabicFont === 'amiri'
                    ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'border-[#064E3B]/15 text-[#022C22] dark:border-emerald-300/15 dark:text-[#E6FFF4]'
                }`}
              >
                <span>Amiri Naskh</span>
                <span dir="rtl" className="font-quran-amiri text-base">
                  بِسْمِ
                </span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ arabicFont: 'scheherazade' })}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                  settings.arabicFont === 'scheherazade'
                    ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22]'
                    : 'border-[#064E3B]/15 text-[#022C22] dark:border-emerald-300/15 dark:text-[#E6FFF4]'
                }`}
              >
                <span>Scheherazade</span>
                <span dir="rtl" className="font-quran-scheherazade text-base">
                  بِسْمِ
                </span>
              </button>
            </div>
          </div>

          {/* Arabic Font Size Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="arabic-size-slider"
                className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80"
              >
                Arabic Script Size
              </label>
              <span className="text-xs font-bold tabular-nums text-[#064E3B] dark:text-amber-300">
                {settings.arabicFontSize}px
              </span>
            </div>
            <input
              id="arabic-size-slider"
              type="range"
              min={22}
              max={48}
              step={2}
              value={settings.arabicFontSize}
              onChange={(e) => onUpdateSettings({ arabicFontSize: Number(e.target.value) })}
              className="w-full accent-[#064E3B] dark:accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Word Highlighting Style + Live Preview */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
              Karaoke Word Highlight Style
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'pill', label: 'Gold Pill' },
                  { id: 'wave', label: 'Wave Line' },
                  { id: 'box', label: 'Soft Box' },
                  { id: 'glow', label: 'Radiant Glow' },
                ] as { id: WordHighlightStyle; label: string }[]
              ).map((opt) => {
                const active = (settings.highlightStyle ?? 'pill') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ highlightStyle: opt.id })}
                    className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'border-[#064E3B]/15 text-[#022C22] hover:bg-[#064E3B]/[0.04] dark:border-emerald-300/15 dark:text-[#E6FFF4]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Live Typography & Highlight Preview */}
            <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] px-4 py-3 text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300/80">
                Live Script Preview
              </p>
              <div
                dir="rtl"
                className={`flex items-center justify-center gap-2 ${
                  settings.arabicFont === 'scheherazade'
                    ? 'font-quran-scheherazade'
                    : 'font-quran-amiri'
                }`}
                style={{ fontSize: `${Math.min(settings.arabicFontSize, 34)}px`, lineHeight: 1.85 }}
              >
                <span className="text-[#022C22] dark:text-[#E6FFF4]">بِسْمِ</span>
                <span
                  className={`px-2 py-0.5 ${
                    (settings.highlightStyle ?? 'pill') === 'wave'
                      ? 'underline decoration-wavy decoration-[#D97706] dark:decoration-amber-400 decoration-2 underline-offset-8 text-[#003527] dark:text-amber-200 font-bold'
                      : (settings.highlightStyle ?? 'pill') === 'box'
                      ? 'rounded-xl bg-[#064E3B]/[0.12] dark:bg-emerald-400/20 border border-[#064E3B]/30 dark:border-emerald-300/40 text-[#003527] dark:text-[#E6FFF4]'
                      : (settings.highlightStyle ?? 'pill') === 'glow'
                      ? 'text-[#B45309] dark:text-amber-300 font-bold [text-shadow:0_0_14px_rgba(217,119,6,0.45)]'
                      : 'rounded-full bg-[#064E3B]/[0.08] dark:bg-amber-400/15 border border-[#D97706] dark:border-amber-400 text-[#003527] dark:text-amber-100'
                  }`}
                >
                  ٱللَّٰهِ
                </span>
                <span className="text-[#022C22] dark:text-[#E6FFF4]">ٱلرَّحْمَٰنِ</span>
              </div>
            </div>
          </div>

          {/* Translation Language */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
              Translation Language
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {TRANSLATION_LANGUAGE_OPTIONS.map((opt) => {
                const selected = (settings.translationLanguage ?? 'en') === opt.id;
                const isRtl = isRtlTranslationLang(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ translationLanguage: opt.id as TranslationLanguage })}
                    className={`min-w-0 min-h-[56px] px-2 py-2 rounded-xl border flex flex-col items-center justify-center text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                      selected
                        ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22] dark:border-emerald-500'
                        : 'border-[#064E3B]/15 text-[#022C22] hover:bg-[#064E3B]/[0.04] dark:border-emerald-300/15 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/10'
                    }`}
                  >
                    <span
                      dir={isRtl ? 'rtl' : 'ltr'}
                      className={`text-xs sm:text-[13px] font-semibold leading-snug ${opt.fontClass}`}
                    >
                      {opt.label}
                    </span>
                    <span
                      dir={isRtl ? 'rtl' : 'ltr'}
                      className={`text-[10px] leading-tight mt-0.5 max-w-full truncate ${opt.fontClass} ${
                        selected
                          ? 'text-white/80 dark:text-[#022C22]/80'
                          : 'text-[#404944] dark:text-emerald-200/75'
                      }`}
                    >
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2.5">
            {[
              {
                key: 'showTajweedColors' as const,
                title: 'Tajweed Color Illumination',
                desc: 'Highlight Ghunnah, Qalqalah, Idgham, Ikhfa & Madd markers',
              },
              {
                key: 'showTransliteration' as const,
                title: 'Phonetic Transliteration',
                desc: 'Show Latin pronunciation guide beneath Arabic script',
              },
              {
                key: 'showTranslation' as const,
                title: 'Verse Translation',
                desc: 'Display English, Hindi, or Urdu rendering',
              },
              {
                key: 'alwaysShowFootnotes' as const,
                title: 'Always Keep Footnotes Open',
                desc: 'Display linguistic footnotes expanded beneath every verse',
              },
            ].map((item) => {
              const active = settings[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onUpdateSettings({ [item.key]: !active })}
                  className="w-full min-h-[52px] px-3.5 py-2.5 rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 flex items-center justify-between gap-3 text-left hover:bg-[#064E3B]/[0.03] dark:hover:bg-emerald-400/5 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                      {item.desc}
                    </p>
                  </div>
                  <span
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                      active
                        ? 'bg-[#064E3B] dark:bg-emerald-500 justify-end'
                        : 'bg-[#064E3B]/18 dark:bg-emerald-300/20 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Word Sync Calibration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sync-offset-slider"
                className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80"
              >
                Word Sync Calibration
              </label>
              <div className="flex items-center gap-2">
                {settings.syncOffsetSec !== 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ syncOffsetSec: 0 })}
                    className="text-[11px] font-semibold text-[#D97706] dark:text-amber-300 hover:underline"
                  >
                    Reset
                  </button>
                )}
                <span className="text-xs font-bold tabular-nums text-[#064E3B] dark:text-amber-300">
                  {settings.syncOffsetSec > 0 ? '+' : ''}
                  {settings.syncOffsetSec.toFixed(2)}s
                </span>
              </div>
            </div>
            <input
              id="sync-offset-slider"
              type="range"
              min={-0.5}
              max={0.5}
              step={0.05}
              value={settings.syncOffsetSec}
              onChange={(e) =>
                onUpdateSettings({ syncOffsetSec: Number(e.target.value) })
              }
              className="w-full accent-[#064E3B] dark:accent-amber-400 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-[#404944] dark:text-emerald-200/70">
              <span>Earlier (-0.50s)</span>
              <span>Default (0.00s)</span>
              <span>Later (+0.50s)</span>
            </div>
          </div>

          {/* Reflection Delay & Word Repeat Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                Reflection Pause Between Ayahs
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([0, 1, 2] as const).map((sec) => {
                  const selected = (settings.reflectionDelaySec ?? 0) === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateSettings({ reflectionDelaySec: sec })}
                      className={`min-h-[38px] rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
                        selected
                          ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'border-[#064E3B]/15 text-[#022C22] dark:border-emerald-300/15 dark:text-[#E6FFF4]'
                      }`}
                    >
                      {sec === 0 ? '0s Flow' : `${sec}s Pause`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                Word Repeat Frequency
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([1, 3, 5] as const).map((count) => {
                  const selected = (settings.wordRepeatCount ?? 1) === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onUpdateSettings({ wordRepeatCount: count })}
                      className={`min-h-[38px] rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
                        selected
                          ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'border-[#064E3B]/15 text-[#022C22] dark:border-emerald-300/15 dark:text-[#E6FFF4]'
                      }`}
                    >
                      {count}x
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Canonical Riwāyah & Maghrebi Script + Reciter Selector */}
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                Reader Text Preview
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'hafs', title: "Ḥafṣ 'an 'Āṣim", sub: 'Kūfah · Standard Worldwide' },
                    { id: 'warsh', title: "Warsh 'an Nāfi'", sub: 'Limited preview · 2 verses' },
                  ] as const
                ).map((r) => {
                  const selected = (settings.riwayah ?? 'hafs') === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onUpdateSettings({ riwayah: r.id })}
                      className={`min-h-[50px] px-3 py-2 rounded-xl border text-left transition-colors ${
                        selected
                          ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'border-[#064E3B]/15 text-[#022C22] dark:border-emerald-300/15 dark:text-[#E6FFF4]'
                      }`}
                    >
                      <p className="text-xs font-bold">{r.title}</p>
                      <p
                        className={`text-[10.5px] ${
                          selected
                            ? 'text-white/80 dark:text-[#022C22]/80'
                            : 'text-[#404944] dark:text-emerald-200/75'
                        }`}
                      >
                        {r.sub}
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/80">{WARSH_PREVIEW_NOTICE}</p>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    maghrebiOrthography: !settings.maghrebiOrthography,
                  })
                }
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 flex items-center justify-between gap-3 text-left hover:bg-[#064E3B]/[0.03] dark:hover:bg-emerald-400/5 transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                    Maghrebi Rasm Orthography (ڢ / ڧ)
                  </p>
                  <p className="text-[11px] text-[#404944] dark:text-emerald-200/75">
                    Render Fā&apos; with subscript dot &amp; Qāf with single top dot
                  </p>
                </div>
                <span
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                    settings.maghrebiOrthography
                      ? 'bg-[#064E3B] dark:bg-emerald-500 justify-end'
                      : 'bg-[#064E3B]/18 dark:bg-emerald-300/20 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-semibold text-[#404944] dark:text-emerald-200/80">
                Qari / Reciter Voice
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#064E3B]/8 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-200">
                Text preview: {settings.riwayah === 'warsh' ? "Warsh 'an Nāfi'" : "Ḥafṣ 'an 'Āṣim"}
              </span>
            </div>
            <div className="space-y-1.5">
              {RECITERS.map((reciter) => {
                const selected = settings.reciterId === reciter.id;
                return (
                  <button
                    key={reciter.id}
                    type="button"
                    onClick={() => onUpdateSettings({ reciterId: reciter.id })}
                    className={`w-full min-h-[48px] px-3.5 py-2 rounded-xl border flex items-center justify-between text-left transition-colors ${
                      selected
                        ? 'border-[#D97706] bg-[#D97706]/[0.07] dark:border-amber-400 dark:bg-amber-400/12'
                        : 'border-[#064E3B]/10 dark:border-emerald-300/15 hover:bg-[#064E3B]/[0.03] dark:hover:bg-emerald-400/8'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#022C22] dark:text-[#E6FFF4]">
                        {reciter.name}
                      </p>
                      <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                        {reciter.style}
                      </p>
                    </div>
                    {selected && <Check className="w-4 h-4 text-[#D97706] dark:text-amber-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};
