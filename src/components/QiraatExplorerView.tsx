import { WARSH_PREVIEW_NOTICE } from '../data/qiraatData';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  GitBranch,
  Globe,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { RiwayahId } from '../types/quran';
import {
  CANONICAL_TEN_QURRA,
  FARSH_COMPARISONS,
  MAGHREBI_LETTER_CARDS,
  POLYCHROMY_DABT_LEGEND,
  RIWAYAH_PROFILES,
  SANAD_LINEAGE_NODES,
  convertToMaghrebiScript,
} from '../data/qiraatData';
import { getEveryAyahUrl } from '../data/quranData';
import { FiligreeDivider, RubElHizbBadge } from './RubElHizbIcon';

interface QiraatExplorerViewProps {
  activeRiwayah: RiwayahId;
  maghrebiOrthography: boolean;
  onSetGlobalRiwayah: (riwayah: RiwayahId) => void;
  onToggleMaghrebiOrthography: (enabled: boolean) => void;
  onPracticeInReader: (surahId: number, ayahNumber: number) => void;
  onPauseReaderAudio?: () => void;
}

type QiraatSubTab = 'riwayah-compare' | 'ten-qiraat' | 'maghrebi-script' | 'sanad-tree';

export const QiraatExplorerView: React.FC<QiraatExplorerViewProps> = ({
  activeRiwayah,
  maghrebiOrthography,
  onSetGlobalRiwayah,
  onToggleMaghrebiOrthography,
  onPracticeInReader,
  onPauseReaderAudio,
}) => {
  const [subTab, setSubTab] = useState<QiraatSubTab>('riwayah-compare');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [selectedFarshId, setSelectedFarshId] = useState<string>(FARSH_COMPARISONS[0].id);
  const [openUsulId, setOpenUsulId] = useState<string | null>('hafs-malik');
  const [scriptStyle, setScriptStyle] = useState<'maghrebi' | 'mashriqi'>('maghrebi');
  const [sanadFilter, setSanadFilter] = useState<'both' | 'hafs' | 'warsh'>('both');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-rawi-warsh');
  const [riwayahToast, setRiwayahToast] = useState<string | null>(null);

  // Live audio comparator ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackKey, setPlayingTrackKey] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const selectedFarsh = useMemo(
    () => FARSH_COMPARISONS.find((f) => f.id === selectedFarshId) ?? FARSH_COMPARISONS[0],
    [selectedFarshId]
  );

  const filteredQurra = useMemo(() => {
    if (regionFilter === 'All') return CANONICAL_TEN_QURRA;
    return CANONICAL_TEN_QURRA.filter((q) => q.region === regionFilter);
  }, [regionFilter]);

  const filteredSanad = useMemo(() => {
    if (sanadFilter === 'both') return SANAD_LINEAGE_NODES;
    return SANAD_LINEAGE_NODES.filter((n) => n.chains.includes(sanadFilter));
  }, [sanadFilter]);

  const inspectedNode = useMemo(
    () =>
      filteredSanad.find((n) => n.id === selectedNodeId) ??
      filteredSanad[filteredSanad.length - 1],
    [filteredSanad, selectedNodeId]
  );

  const playComparisonAudio = (trackKey: string, folder: string, surahId: number, ayahNum: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingTrackKey === trackKey && !audio.paused) {
      audio.pause();
      setPlayingTrackKey(null);
      return;
    }
    onPauseReaderAudio?.();
    const url = getEveryAyahUrl(folder, surahId, ayahNum);
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.currentTime = 0;
    setPlayingTrackKey(trackKey);
    audio.play().catch(() => setPlayingTrackKey(null));
  };

  const applyGlobalRiwayah = (id: RiwayahId) => {
    onSetGlobalRiwayah(id);
    const label = RIWAYAH_PROFILES[id].name;
    setRiwayahToast(`Reader text preview switched to ${label}. Reader audio is unchanged.`);
    window.setTimeout(() => setRiwayahToast(null), 3500);
  };

  return (
    <div className="space-y-5">
      <audio ref={audioRef} preload="none" onEnded={() => setPlayingTrackKey(null)} />

      {/* Internal Scholarly Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Qira'at & Script modules"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 overflow-x-auto no-scrollbar"
        >
          {(
            [
              { id: 'riwayah-compare', label: 'Ḥafṣ vs Warsh Audio', icon: Volume2 },
              { id: 'ten-qiraat', label: '10 Mutawātir Qirā’āt', icon: Globe },
              { id: 'maghrebi-script', label: 'Maghrebi Rasm & Dabṭ', icon: BookOpen },
              { id: 'sanad-tree', label: 'Sanad Lineage Tree', icon: GitBranch },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(t.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                    : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Global Riwāyah Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D97706]/12 border border-[#D97706]/25 text-xs font-bold text-[#904D00] dark:bg-amber-400/15 dark:text-amber-300">
          <Compass className="w-3.5 h-3.5" />
          <span>Text preview: {RIWAYAH_PROFILES[activeRiwayah].name}</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[#404944] dark:text-emerald-200/80">
        {WARSH_PREVIEW_NOTICE}
      </p>

      {riwayahToast && (
        <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-[#064E3B] dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{riwayahToast}</span>
        </div>
      )}

      {/* TAB 1: RIWAYAH AUDIO COMPARISON & GLOBAL SWITCHER */}
      {subTab === 'riwayah-compare' && (
        <div className="space-y-5">
          {/* Side-by-Side Ḥafṣ vs Warsh Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['hafs', 'warsh'] as const).map((rid) => {
              const profile = RIWAYAH_PROFILES[rid];
              const isSelected = activeRiwayah === rid;
              const trackKey = `compare-${rid}-${selectedFarsh.verseKey}`;
              const isPlayingThis = playingTrackKey === trackKey;
              return (
                <section
                  key={rid}
                  className={`rounded-2xl border p-5 sm:p-6 space-y-4 ayah-card-resting transition-all ${
                    isSelected
                      ? 'border-[#D97706] bg-gradient-to-b from-[#FFFFFF] to-[#FEF3C7]/25 dark:from-[#0A2921] dark:to-amber-950/20'
                      : 'border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                        {profile.tariq}
                      </span>
                      <h2 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4] mt-0.5">
                        {profile.name}
                      </h2>
                      <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                        {profile.imam}
                      </p>
                    </div>
                    <span dir="rtl" className="font-quran-amiri text-xl font-bold text-[#003527] dark:text-amber-200 shrink-0">
                      {profile.arabicName}
                    </span>
                  </div>

                  {/* Comparative Verse Display */}
                  <div className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-4 text-center space-y-1">
                    <p className="text-[11px] font-semibold text-[#0F766E] dark:text-emerald-300">
                      Verse {selectedFarsh.verseKey} · {selectedFarsh.surahName}
                    </p>
                    <p dir="rtl" className="font-quran-amiri text-2xl sm:text-3xl leading-[1.9] text-[#003527] dark:text-amber-100">
                      {rid === 'hafs'
                        ? selectedFarsh.hafsArabic
                        : maghrebiOrthography
                        ? convertToMaghrebiScript(selectedFarsh.warshArabic)
                        : selectedFarsh.warshArabic}
                    </p>
                    <p className="text-xs italic text-[#404944] dark:text-emerald-200/80">
                      {rid === 'hafs' ? selectedFarsh.hafsTranslit : selectedFarsh.warshTranslit}
                    </p>
                  </div>

                  <p className="text-xs text-[#404944] dark:text-emerald-200/85 leading-relaxed">
                    {profile.highlightSummary}
                  </p>

                  {/* Listen + Set Global Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        playComparisonAudio(
                          trackKey,
                          profile.everyAyahFolder,
                          selectedFarsh.surahId,
                          selectedFarsh.ayahNumber
                        )
                      }
                      className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                        isPlayingThis
                          ? 'bg-[#D97706] text-white'
                          : 'bg-[#064E3B]/10 text-[#064E3B] hover:bg-[#064E3B] hover:text-white dark:bg-emerald-400/15 dark:text-emerald-200'
                      }`}
                    >
                      {isPlayingThis ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>Listen ({profile.sampleReciterName.split(' ')[1]})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyGlobalRiwayah(rid)}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        isSelected
                          ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                          : 'border border-[#064E3B]/20 dark:border-emerald-300/25 text-[#022C22] dark:text-[#E6FFF4] hover:border-[#D97706]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{isSelected ? 'Preview Selected' : 'Use Text Preview'}</span>
                    </button>
                  </div>

                  {/* Usul Rule Accordions */}
                  <div className="space-y-1.5 pt-2 border-t border-[#064E3B]/8 dark:border-emerald-300/12">
                    {profile.keyRules.map((rule) => {
                      const open = openUsulId === rule.id;
                      return (
                        <div
                          key={rule.id}
                          className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/12 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenUsulId(open ? null : rule.id)}
                            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/[0.03]"
                          >
                            <span>{rule.title}</span>
                            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {open && (
                            <div className="px-3 pb-2.5 text-xs text-[#404944] dark:text-emerald-200/80 space-y-1">
                              <p dir="rtl" className="font-quran-amiri text-lg text-[#064E3B] dark:text-amber-200">
                                {rule.exampleArabic}
                              </p>
                              <p>{rule.summary}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Verse Selector Strip for A/B Comparison */}
          <div className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-4 space-y-3 ayah-card-resting">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Switch Canonical Comparison Passage:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FARSH_COMPARISONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFarshId(f.id)}
                    className={`min-h-[34px] px-3 rounded-full text-xs font-semibold transition-colors ${
                      selectedFarshId === f.id
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'bg-[#064E3B]/8 text-[#404944] dark:bg-emerald-400/10 dark:text-emerald-200'
                    }`}
                  >
                    {f.surahName} ({f.verseKey})
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
              <strong>{selectedFarsh.ruleCategory}:</strong> {selectedFarsh.note}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: THE 10 MUTAWĀTIR QIRĀ'ĀT EXPLORER */}
      {subTab === 'ten-qiraat' && (
        <div className="space-y-5">
          {/* Regional Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#022C22] dark:text-[#E6FFF4]">
                The 10 Canonical Imāms &amp; 20 Rāwīs
              </h2>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                Seven Mutawātir readings codified by Imām Ibn Mujāhid + Three completing Imāms verified by Imām Ibn al-Jazarī
              </p>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['All', 'Madīnah', 'Makkah', 'Baṣrah', 'Damascus', 'Kūfah'] as const).map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setRegionFilter(region)}
                  className={`min-h-[34px] px-3 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    regionFilter === region
                      ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'bg-white dark:bg-[#0A2921] border border-[#064E3B]/12 dark:border-emerald-300/18 text-[#404944] dark:text-emerald-200/80'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQurra.map((qari) => (
              <article
                key={qari.number}
                className="rounded-2xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] p-5 space-y-3 ayah-card-resting"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <RubElHizbBadge className="w-9 h-9" label={qari.number} active={qari.number === 1 || qari.number === 5} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4] truncate">
                        {qari.name}
                      </h3>
                      <p className="text-[11px] font-medium text-[#0F766E] dark:text-emerald-300">
                        {qari.region} · {qari.diedHijri} · {qari.category}
                      </p>
                    </div>
                  </div>
                  <span dir="rtl" className="font-quran-amiri text-xl font-bold text-[#003527] dark:text-amber-200 shrink-0">
                    {qari.arabicName}
                  </span>
                </div>

                <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                  {qari.signatureRule}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {qari.rawis.map((rawi) => (
                    <div
                      key={rawi.name}
                      className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#022C22] dark:text-white">
                          {rawi.name}
                        </span>
                        <span dir="rtl" className="font-quran-amiri text-sm text-[#D97706] dark:text-amber-300">
                          {rawi.arabic}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 leading-snug">
                        {rawi.highlight}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MAGHREBI SCRIPT & POLYCHROMY DABṬ EXPLORER */}
      {subTab === 'maghrebi-script' && (
        <div className="space-y-5">
          {/* Interactive Script Showcase Card */}
          <section className="rounded-3xl border border-[#D97706]/30 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-5 sm:p-7 ayah-card-resting space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-amber-300">
                  ‘Ilm al-Rasm wa-l-Dabṭ · West-North African Calligraphy
                </span>
                <h2 className="text-xl font-bold text-[#022C22] dark:text-[#E6FFF4] mt-0.5">
                  Maghrebi vs. Mashriqī Script Orthography
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#041D17] border border-[#064E3B]/10">
                  <button
                    type="button"
                    onClick={() => setScriptStyle('maghrebi')}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold ${
                      scriptStyle === 'maghrebi'
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'text-[#404944] dark:text-emerald-200/80'
                    }`}
                  >
                    Rasm Maghribī (ڢ / ڧ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScriptStyle('mashriqi')}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold ${
                      scriptStyle === 'mashriqi'
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'text-[#404944] dark:text-emerald-200/80'
                    }`}
                  >
                    Mashriqī Naskh (ف / ق)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleMaghrebiOrthography(!maghrebiOrthography)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    maghrebiOrthography
                      ? 'bg-[#D97706] text-white'
                      : 'border border-[#064E3B]/20 dark:border-emerald-300/25 text-[#022C22] dark:text-[#E6FFF4]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{maghrebiOrthography ? 'Active in Reader ✓' : 'Apply to Muṣḥaf'}</span>
                </button>
              </div>
            </div>

            {/* Live Comparison Verses: Al-Falaq 113:1 & Al-Baqarah 2:5 */}
            <div className="rounded-2xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/12 dark:border-emerald-300/20 p-5 sm:p-6 text-center space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                Live Calligraphy Preview · Sūrah Al-Falaq (113:1) &amp; Al-Baqarah (2:5)
              </p>
              <p dir="rtl" className="font-quran-scheherazade text-3xl sm:text-4xl leading-[2.0] text-[#003527] dark:text-amber-100">
                {scriptStyle === 'maghrebi'
                  ? convertToMaghrebiScript('قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ ۝ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ')
                  : 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ ۝ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ'}
              </p>
              <p className="text-xs text-[#404944] dark:text-emerald-200/80">
                Notice the solitary subscript dot on <strong>Al-Fā’ (ڢ)</strong> in ٱلْڢَلَڧِ and single top dot on <strong>Al-Qāf (ڧ)</strong> in ڧُلْ under Maghrebi script.
              </p>
            </div>

            {/* 3 Core Glyph Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MAGHREBI_LETTER_CARDS.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                      {card.name}
                    </h3>
                    <div className="flex items-center gap-2 font-quran-scheherazade text-2xl font-bold">
                      <span className="text-[#D97706] dark:text-amber-300">{card.maghrebiGlyph}</span>
                      <span className="text-xs font-sans text-[#707974]">vs</span>
                      <span className="text-[#064E3B] dark:text-emerald-200">{card.mashriqiGlyph}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                    {card.note}
                  </p>
                  <p dir="rtl" className="font-quran-scheherazade text-base text-[#0F766E] dark:text-emerald-300">
                    {card.example}
                  </p>
                </div>
              ))}
            </div>

            <FiligreeDivider />

            {/* 4-Color Polychromy Dabṭ Legend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  Classical Polychromy Vocalization System (Dabṭ)
                </h3>
                <button
                  type="button"
                  onClick={() => onPracticeInReader(1, 1)}
                  className="text-xs font-semibold text-[#0F766E] dark:text-emerald-300 hover:underline"
                >
                  Open Reader →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {POLYCHROMY_DABT_LEGEND.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${item.dotClass}`} />
                      <span className="text-xs font-bold text-[#022C22] dark:text-white">
                        {item.title}
                      </span>
                    </div>
                    <p dir="rtl" className="font-quran-amiri text-sm text-[#0F766E] dark:text-amber-300">
                      {item.arabicLabel}
                    </p>
                    <p className="text-[11px] text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: INTERACTIVE SANAD & LINEAGE TREE */}
      {subTab === 'sanad-tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Chain Selector + Vertical Mutawātir Lineage Timeline (7 cols) */}
          <section className="lg:col-span-7 rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 sm:p-6 space-y-4 ayah-card-resting">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  Unbroken Mutawātir Sanad Chain
                </h2>
                <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                  Tap any link in the golden chain to inspect historical transmission notes
                </p>
              </div>
              <div className="inline-flex gap-1 p-1 rounded-xl bg-[#064E3B]/[0.05] dark:bg-[#041D17]">
                {(
                  [
                    { id: 'both', label: 'Both Chains' },
                    { id: 'hafs', label: 'Ḥafṣ' },
                    { id: 'warsh', label: 'Warsh' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSanadFilter(f.id)}
                    className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-semibold ${
                      sanadFilter === f.id
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'text-[#404944] dark:text-emerald-200/80'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative pl-5 space-y-3 border-l-2 border-[#D97706]/40 dark:border-amber-400/40">
              {filteredSanad.map((node) => {
                const selected = inspectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`relative w-full text-left rounded-2xl border p-4 transition-all ${
                      selected
                        ? 'border-[#D97706] bg-[#FEF3C7]/25 dark:border-amber-400 dark:bg-amber-950/25'
                        : 'border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80 hover:border-[#064E3B]/30'
                    }`}
                  >
                    <span
                      className={`absolute -left-[27px] top-5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0A2921] ${
                        selected ? 'bg-[#D97706]' : 'bg-[#064E3B] dark:bg-emerald-400'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
                          {node.tier} · {node.era}
                        </span>
                        <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                          {node.title}
                        </h3>
                      </div>
                      <span dir="rtl" className="font-quran-amiri text-base font-bold text-[#D97706] dark:text-amber-300">
                        {node.arabicTitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sticky Node Bio Inspector (5 cols) */}
          {inspectedNode && (
            <aside className="lg:col-span-5 lg:sticky lg:top-6 rounded-2xl border border-[#D97706]/30 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-5 sm:p-6 space-y-4 ayah-card-resting">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-amber-300">
                <Award className="w-4 h-4" />
                <span>Sanad Link Inspector</span>
              </div>
              <div>
                <p dir="rtl" className="font-quran-amiri text-2xl font-bold text-[#003527] dark:text-amber-200">
                  {inspectedNode.arabicTitle}
                </p>
                <h3 className="text-lg font-bold text-[#022C22] dark:text-white mt-1">
                  {inspectedNode.title}
                </h3>
                <p className="text-xs text-[#0F766E] dark:text-emerald-300 font-medium">
                  {inspectedNode.era} · {inspectedNode.location}
                </p>
              </div>
              <FiligreeDivider />
              <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-[#404944] dark:text-emerald-100/85">
                <div>
                  <p className="text-xs font-bold text-[#022C22] dark:text-white mb-0.5">
                    Historical Transmission Role
                  </p>
                  <p>{inspectedNode.bio}</p>
                </div>
                <div className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-3.5">
                  <p className="text-xs font-bold text-[#064E3B] dark:text-emerald-300 mb-1">
                    Recitation Methodology (Usūl)
                  </p>
                  <p className="text-xs">{inspectedNode.methodology}</p>
                </div>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};
