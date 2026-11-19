import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Flame,
  HeartHandshake,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AppScreen, KhatmahPlanState, KhatmahSlotProgress } from '../types/quran';
import {
  QARI_TTS_STYLES,
  getAiTtsAudioUrl,
  getCachedAiTtsUrl,
  unlockAudioElement,
} from '../utils/aiTts';
import { FiligreeDivider, RubElHizbBadge } from './RubElHizbIcon';

interface KhatmahPlannerViewProps {
  plan: KhatmahPlanState;
  onUpdatePlan: (updater: (prev: KhatmahPlanState) => KhatmahPlanState) => void;
  onJumpToSurah: (surahId: number, ayahNumber: number, autoPlay?: boolean) => void;
  onSyncPagesToHifz: (slots: KhatmahSlotProgress[]) => number;
  onNavigateHub?: (screen: AppScreen) => void;
  onPauseReaderAudio?: () => void;
}

const DUA_KHATM_ARABIC =
  'اللَّهُمَّ ارْحَمْنِي بِالْقُرْآنِ، وَاجْعَلْهُ لِي إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً، اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَا نُسِّيتُ، وَعَلِّمْنِي مِنْهُ مَا جَهِلْتُ، وَارْزُقْنِي تِلَاوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لِي حُجَّةً يَا رَبَّ الْعَالَمِينَ.';

const DUA_KHATM_TRANSLIT =
  'Allāhumma rḥamnī bi-l-Qur’ān, waj‘alhu lī imāman wa-nūran wa-hudan wa-raḥmah. Allāhumma dhakkirnī minhu mā nussītu, wa-‘allimnī minhu mā jahiltu, warzuqnī tilāwatahu ānā’a l-layli wa-aṭrāfa n-nahār, waj‘alhu lī ḥujjatan yā Rabba l-‘ālamīn.';

const DUA_KHATM_EN =
  'O Allāh, have mercy on me through the Qur’ān, and make it for me a guide, a light, a guidance, and a mercy. Remind me of what I have forgotten from it, teach me what I do not know of it, bless me with its recitation throughout the night and ends of the day, and make it a witness for me, O Lord of all worlds.';

export const KhatmahPlannerView: React.FC<KhatmahPlannerViewProps> = ({
  plan,
  onUpdatePlan,
  onJumpToSurah,
  onSyncPagesToHifz,
  onNavigateHub,
  onPauseReaderAudio,
}) => {
  const [showDuaModal, setShowDuaModal] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copiedDua, setCopiedDua] = useState(false);
  const [isSpeakingDua, setIsSpeakingDua] = useState(false);
  const [isBufferingDua, setIsBufferingDua] = useState(false);
  const [duaSpeechFallback, setDuaSpeechFallback] = useState(false);
  const [duaAudioTime, setDuaAudioTime] = useState(0);
  const [duaAudioDuration, setDuaAudioDuration] = useState(0);
  const [duaAudioError, setDuaAudioError] = useState<string | null>(null);

  const duaAudioRef = useRef<HTMLAudioElement | null>(null);
  const duaAbortRef = useRef<AbortController | null>(null);
  const duaSessionRef = useRef(0);

  const completedSlots = plan.slots.filter((s) => s.completed).length;
  const pct = Math.min(100, Math.round((plan.pagesCompleted / Math.max(1, plan.totalPages)) * 100));
  const pagesRemaining = Math.max(0, plan.totalPages - plan.pagesCompleted);
  const pagesPerDayTarget = Math.max(1, Math.ceil(plan.totalPages / plan.targetDays));
  const daysRemaining = Math.max(1, Math.ceil(pagesRemaining / pagesPerDayTarget));

  const expectedCompletionDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + daysRemaining);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [daysRemaining]);

  const circumference = 2 * Math.PI * 36;
  const strokeOffset = circumference * (1 - pct / 100);

  const displaySessions = useMemo(() => {
    if (plan.scheduleStyle === 'single-session') {
      const start = plan.slots[0]?.pageStart ?? 1;
      const end = plan.slots[plan.slots.length - 1]?.pageEnd ?? start + pagesPerDayTarget - 1;
      return [
        {
          slot: plan.slots[0],
          title: 'Dedicated Daily Wird',
          subtitle: `Read ${pagesPerDayTarget} continuous pages (${start}–${end}) · Starting Sūrah ${plan.slots[0]?.surahName ?? 'Al-Fātiḥah'}`,
          pagesLabel: `${pagesPerDayTarget} pgs`,
        },
      ];
    }
    if (plan.scheduleStyle === 'two-sessions') {
      const half = Math.max(1, Math.ceil(plan.slots.length / 2));
      return [
        {
          slot: plan.slots[0],
          title: 'Post-Fajr Morning Block',
          subtitle: `Pages ${plan.slots[0]?.pageStart ?? 1}–${plan.slots[half - 1]?.pageEnd ?? 10} · Fresh morning focus`,
          pagesLabel: `${Math.ceil(pagesPerDayTarget / 2)} pgs`,
        },
        {
          slot: plan.slots[half] ?? plan.slots[0],
          title: 'Post-Maghrib Evening Block',
          subtitle: `Pages ${(plan.slots[half] ?? plan.slots[0])?.pageStart ?? 11}–${plan.slots[plan.slots.length - 1]?.pageEnd ?? 20} · Closing daily wird`,
          pagesLabel: `${Math.floor(pagesPerDayTarget / 2) || 1} pgs`,
        },
      ];
    }
    return plan.slots.map((slot) => ({
      slot,
      title: slot.label,
      subtitle: `${slot.surahName} · Ayat ${slot.startAyah}+ · Pages ${slot.pageStart}–${slot.pageEnd}`,
      pagesLabel: `${Math.max(1, slot.pageEnd - slot.pageStart + 1)} pgs`,
    }));
  }, [plan.scheduleStyle, plan.slots, pagesPerDayTarget]);

  const handleToggleSlot = (slotId: KhatmahSlotProgress['id']) => {
    onUpdatePlan((prev) => {
      const target = prev.slots.find((s) => s.id === slotId);
      if (!target) return prev;
      const deltaPages = Math.max(1, target.pageEnd - target.pageStart + 1);
      const nextCompleted = !target.completed;
      const nextPages = Math.min(
        prev.totalPages,
        Math.max(0, prev.pagesCompleted + (nextCompleted ? deltaPages : -deltaPages))
      );
      const nextJuz = Math.min(30, Math.max(1, Math.ceil((nextPages / prev.totalPages) * 30)));
      return {
        ...prev,
        pagesCompleted: nextPages,
        juzNumber: nextJuz,
        slots: prev.slots.map((s) => (s.id === slotId ? { ...s, completed: nextCompleted } : s)),
      };
    });
  };

  const handleSyncToHifz = () => {
    const added = onSyncPagesToHifz(plan.slots);
    setSyncNotice(
      added > 0
        ? `Synced ${added} Tilāwah passage${added === 1 ? '' : 's'} into your Hifz Stage 1 Spaced Review Queue.`
        : 'All current Khatmah passages are already queued in your Hifz Spaced Review tracker.'
    );
    window.setTimeout(() => setSyncNotice(null), 4500);
  };

  const handleCopyDua = () => {
    navigator.clipboard?.writeText(`${DUA_KHATM_ARABIC}\n\n${DUA_KHATM_EN}`).catch(() => {});
    setCopiedDua(true);
    window.setTimeout(() => setCopiedDua(false), 2000);
  };

  const stopDuaPlayback = useCallback(() => {
    duaSessionRef.current += 1;
    duaAbortRef.current?.abort();
    duaAbortRef.current = null;
    setIsBufferingDua(false);
    setDuaSpeechFallback(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (duaAudioRef.current && !duaAudioRef.current.paused) {
      duaAudioRef.current.pause();
    }
    setIsSpeakingDua(false);
  }, []);

  useEffect(() => {
    return () => {
      stopDuaPlayback();
      if (duaAudioRef.current) {
        duaAudioRef.current.src = '';
      }
    };
  }, [stopDuaPlayback]);

  const tryDuaBrowserFallback = useCallback((): boolean => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null;
      const utter = new SpeechSynthesisUtterance(DUA_KHATM_ARABIC);
      utter.lang = arabicVoice?.lang || 'ar-SA';
      if (arabicVoice) utter.voice = arabicVoice;
      utter.rate = 1;
      utter.pitch = 1;
      utter.onend = () => {
        setIsSpeakingDua(false);
        setDuaSpeechFallback(false);
      };
      utter.onerror = () => {
        setIsSpeakingDua(false);
        setDuaSpeechFallback(false);
        setDuaAudioError('Qari Voice narration is unavailable right now.');
      };
      setDuaSpeechFallback(true);
      setIsBufferingDua(false);
      setIsSpeakingDua(true);
      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleSpeakDua = async () => {
    if (isSpeakingDua) {
      stopDuaPlayback();
      return;
    }

    const audio = duaAudioRef.current;
    onPauseReaderAudio?.();
    setDuaAudioError(null);
    setDuaSpeechFallback(false);

    if (audio && audio.src && audio.readyState >= 1 && !audio.error) {
      setIsSpeakingDua(true);
      try {
        await audio.play();
        return;
      } catch {
        // Fall through to fresh synthesis fetch
      }
    }

    const session = ++duaSessionRef.current;
    duaAbortRef.current?.abort();
    const ctrl = new AbortController();
    duaAbortRef.current = ctrl;

    const cachedUrl = getCachedAiTtsUrl(DUA_KHATM_ARABIC, {
      voiceName: 'Charon',
      style: QARI_TTS_STYLES.dua,
    });
    if (audio && cachedUrl) {
      if (audio.src !== cachedUrl) {
        audio.src = cachedUrl;
        audio.load();
      } else {
        audio.currentTime = 0;
      }
      setIsBufferingDua(false);
      setIsSpeakingDua(true);
      audio.play().catch(() => {
        if (!tryDuaBrowserFallback()) {
          setIsSpeakingDua(false);
          setDuaAudioError('Qari Voice narration is unavailable right now.');
        }
      });
      return;
    }

    unlockAudioElement(audio);
    setIsBufferingDua(true);
    setIsSpeakingDua(true);

    try {
      const blobUrl = await getAiTtsAudioUrl(DUA_KHATM_ARABIC, {
        voiceName: 'Charon',
        style: QARI_TTS_STYLES.dua,
        signal: ctrl.signal,
      });
      if (duaSessionRef.current !== session || ctrl.signal.aborted) return;
      if (!audio) throw new Error('Audio element unavailable');
      audio.src = blobUrl;
      audio.load();
      setIsBufferingDua(false);
      await audio.play();
    } catch (err) {
      if (ctrl.signal.aborted || duaSessionRef.current !== session) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setIsBufferingDua(false);
      if (!tryDuaBrowserFallback()) {
        setIsSpeakingDua(false);
        setDuaAudioError('Qari Voice narration is unavailable right now.');
      }
    }
  };

  const handleSeekDua = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = duaAudioRef.current;
    if (!audio || !duaAudioDuration || duaSpeechFallback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const nextSec = ratio * duaAudioDuration;
    audio.currentTime = nextSec;
    setDuaAudioTime(nextSec);
  };

  const formatAudioSec = (sec: number) => {
    const safe = Math.max(0, Math.floor(sec));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 space-y-6">
      <audio
        ref={duaAudioRef}
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuaAudioDuration(d);
        }}
        onPlaying={() => setIsBufferingDua(false)}
        onWaiting={() => setIsBufferingDua(true)}
        onTimeUpdate={(e) => {
          setDuaAudioTime(e.currentTarget.currentTime);
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuaAudioDuration(d);
        }}
        onEnded={() => {
          setIsSpeakingDua(false);
          setIsBufferingDua(false);
          setDuaAudioTime(0);
        }}
        onError={() => {
          if (!isSpeakingDua) return;
          setIsBufferingDua(false);
          if (!tryDuaBrowserFallback()) {
            setIsSpeakingDua(false);
            setDuaAudioError('Qari Voice narration is unavailable right now.');
          }
        }}
      />
      {/* Unified Hub Sub-Bar */}
      {onNavigateHub && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateHub('surahs')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-xs font-semibold text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 inline-flex items-center gap-1.5 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>114 Surahs &amp; Juz</span>
          </button>
          <button
            type="button"
            aria-current="page"
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Khatmah Planner</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateHub('topics')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 bg-white dark:bg-[#0A2921] text-xs font-semibold text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80 inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thematic Topics &amp; Heart</span>
          </button>
        </div>
      )}

      {/* Header + Target Cycle Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300">
            Daily Khatmah &amp; Tilāwah Planner
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Consistent Qur’ān Completion
          </h1>
          <p className="text-sm text-[#404944] dark:text-emerald-200/80 max-w-2xl">
            Pace your daily reading across prayer windows, stay steady with smart catch-up calculation, and feed finished chapters directly into Hifz spaced review.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#064E3B]/[0.06] dark:bg-[#0A2921] border border-[#064E3B]/10 dark:border-emerald-300/15 shrink-0">
          {([30, 60, 90] as const).map((days) => {
            const active = plan.targetDays === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() => onUpdatePlan((prev) => ({ ...prev, targetDays: days }))}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22] shadow-xs'
                    : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/80'
                }`}
              >
                {days}-Day Plan
              </button>
            );
          })}
        </div>
      </div>

      {/* Khatmah Progress Hero Card */}
      <section className="relative overflow-hidden rounded-3xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-gradient-to-br from-[#064E3B] via-[#04392B] to-[#022C22] text-[#F5FFFA] p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Day {plan.currentDay} of {plan.targetDays} · Juz&apos; {plan.juzNumber}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {pagesPerDayTarget} Pages / Day · {pagesRemaining} Pages Remaining
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/85">
              Expected Khatm Completion:{' '}
              <strong className="text-amber-300 font-semibold">{expectedCompletionDate}</strong>{' '}
              ({daysRemaining} days at current pace)
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white/10 tabular-nums font-semibold">
                {plan.pagesCompleted} / {plan.totalPages} Muṣḥaf Pages
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/10 tabular-nums font-semibold">
                {completedSlots} / {plan.slots.length} Today&apos;s Windows Done
              </span>
            </div>
          </div>

          {/* Radial SVG Progress */}
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0 self-start sm:self-center">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="7"
              />
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-extrabold tabular-nums">{pct}%</span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80">
                Complete
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Prophetic Sunnah Consistency Hadith Quote */}
      <div className="rounded-2xl border border-[#D97706]/25 dark:border-amber-400/25 bg-[#FEF3C7]/25 dark:bg-amber-950/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-amber-300">
            Prophetic Guidance on Consistency · Ṣaḥīḥ al-Bukhārī 6464
          </p>
          <p className="text-sm font-medium text-[#022C22] dark:text-[#E6FFF4]">
            &ldquo;The most beloved deeds to Allāh are those done consistently, even if they are small.&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDuaModal((v) => !v)}
          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>{showDuaModal ? 'Hide Khatm Du‘ā’' : 'Du‘ā’ Khatm al-Qur’ān'}</span>
        </button>
      </div>

      {showDuaModal && (
        <section className="rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-5 sm:p-6 space-y-4 ayah-card-resting">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Du‘ā’ Upon Completing the Noble Qur’ān
              </h3>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                Traditional Closing Supplication (Du‘ā’ al-Khatmah)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSpeakDua()}
                className={`min-h-[36px] px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  isSpeakingDua
                    ? 'bg-[#D97706] text-white dark:bg-amber-400 dark:text-[#022C22]'
                    : 'bg-[#064E3B]/10 text-[#064E3B] hover:bg-[#064E3B] hover:text-[#FEF3C7] dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22]'
                }`}
              >
                {isBufferingDua ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading</span>
                  </>
                ) : isSpeakingDua ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Qari Voice</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Qari Voice</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyDua}
                className="min-h-[36px] px-3 rounded-lg border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {copiedDua ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDua ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {(isSpeakingDua || duaAudioDuration > 0) && (
            <div className="rounded-xl bg-[#064E3B]/[0.045] dark:bg-emerald-400/10 px-3.5 py-2.5 flex items-center gap-2.5 sm:gap-3">
              <Volume2 className="w-4 h-4 text-[#0F766E] dark:text-emerald-300 shrink-0" />
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-400/20 dark:text-emerald-200 shrink-0">
                Qari Voice
              </span>
              {duaSpeechFallback ? (
                <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
                  Speaking Arabic supplication...
                </div>
              ) : isBufferingDua ? (
                <div className="flex-1 text-xs font-medium text-[#0F766E] dark:text-emerald-200">
                  Preparing Qari Voice recitation...
                </div>
              ) : (
                <>
                  <div
                    onClick={handleSeekDua}
                    role="slider"
                    aria-label="Seek Du‘ā’ al-Khatmah recitation"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duaAudioDuration || 1)}
                    aria-valuenow={Math.round(duaAudioTime)}
                    tabIndex={0}
                    className="relative flex-1 h-2 rounded-full bg-[#064E3B]/15 dark:bg-emerald-300/20 cursor-pointer overflow-hidden"
                  >
                    <span
                      className="block h-full rounded-full bg-[#D97706] dark:bg-amber-400 transition-[width] duration-75"
                      style={{
                        width: `${
                          duaAudioDuration > 0
                            ? Math.min(100, (duaAudioTime / duaAudioDuration) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums text-[#404944] dark:text-emerald-200/85 shrink-0">
                    {formatAudioSec(duaAudioTime)} / {formatAudioSec(duaAudioDuration)}
                  </span>
                </>
              )}
            </div>
          )}

          {duaAudioError && (
            <p className="text-xs text-[#BA1A1A] dark:text-rose-300">{duaAudioError}</p>
          )}

          <p dir="rtl" className="font-quran-amiri text-2xl leading-[2.0] text-[#003527] dark:text-amber-100">
            {DUA_KHATM_ARABIC}
          </p>
          <p className="text-xs italic text-[#0F766E] dark:text-emerald-300">{DUA_KHATM_TRANSLIT}</p>
          <p className="text-xs sm:text-sm text-[#404944] dark:text-emerald-100/85 leading-relaxed">
            {DUA_KHATM_EN}
          </p>
        </section>
      )}

      {/* Main 2-Column Interactive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 cols: Daily Tilāwah Checklist & Pace Switcher */}
        <section className="lg:col-span-7 rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 sm:p-6 space-y-4 ayah-card-resting">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]">
                Today&apos;s Tilāwah Quota
              </h2>
              <p className="text-xs text-[#404944] dark:text-emerald-200/75">
                Choose a daily rhythm matching your prayer schedule
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#064E3B]/[0.05] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15">
              {(
                [
                  { id: 'five-prayers', label: '5 Prayers' },
                  { id: 'two-sessions', label: 'Fajr & Maghrib' },
                  { id: 'single-session', label: '1 Session' },
                ] as const
              ).map((tab) => {
                const active = plan.scheduleStyle === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onUpdatePlan((prev) => ({ ...prev, scheduleStyle: tab.id }))}
                    className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#064E3B] text-white dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'text-[#404944] dark:text-emerald-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            {displaySessions.map(({ slot, title, subtitle, pagesLabel }) => (
              <div
                key={slot.id}
                className={`rounded-2xl border p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-colors ${
                  slot.completed
                    ? 'border-[#064E3B]/25 bg-[#064E3B]/[0.04] dark:border-emerald-400/35 dark:bg-emerald-500/10'
                    : 'border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17]/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSlot(slot.id)}
                    aria-label={slot.completed ? `Mark ${slot.label} unread` : `Mark ${slot.label} complete`}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      slot.completed
                        ? 'bg-[#064E3B] border-[#064E3B] text-white dark:bg-emerald-500 dark:border-emerald-500 dark:text-[#022C22]'
                        : 'bg-white border-[#064E3B]/20 text-transparent hover:border-[#D97706] dark:bg-[#0A2921] dark:border-emerald-300/25'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-bold ${
                          slot.completed
                            ? 'text-[#064E3B] dark:text-emerald-200 line-through decoration-[#064E3B]/40'
                            : 'text-[#022C22] dark:text-[#E6FFF4]'
                        }`}
                      >
                        {title}
                      </p>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D97706]/12 text-[#904D00] dark:bg-amber-400/15 dark:text-amber-300 tabular-nums">
                        {pagesLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[#404944] dark:text-emerald-200/75 truncate">
                      {subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onJumpToSurah(slot.surahId, slot.startAyah, false)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#064E3B]/8 hover:bg-[#064E3B] text-[#064E3B] hover:text-white dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-500 dark:hover:text-[#022C22] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read {slot.surahName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Right 5 cols: Hifz Intake Sync, Smart Catch-Up, Istiqāmah Streak & Reminders */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hifz Queue Synchronization Card */}
          <section className="rounded-2xl border border-[#D97706]/30 dark:border-amber-400/35 bg-white dark:bg-[#0A2921] p-5 space-y-3.5 ayah-card-resting">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-amber-300">
                  Hifz Queue Synchronization
                </p>
                <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  Feed Tilāwah into Spaced Recall
                </h3>
                <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                  Automatically send Surahs completed in today&apos;s Khatmah directly into Stage 1 of your Hifz Quiz spaced repetition pipeline.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdatePlan((prev) => ({ ...prev, hifzSyncEnabled: !prev.hifzSyncEnabled }))
                }
                aria-label="Toggle automatic Hifz queue synchronization"
                className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                  plan.hifzSyncEnabled
                    ? 'bg-[#064E3B] dark:bg-emerald-500 justify-end'
                    : 'bg-[#064E3B]/20 dark:bg-emerald-300/20 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSyncToHifz}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#003527] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-[#FEF3C7] dark:text-[#022C22] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Completed Pages to Hifz Now</span>
            </button>

            {syncNotice && (
              <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-[#064E3B] dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{syncNotice}</span>
              </div>
            )}
          </section>

          {/* 7-Day Istiqāmah Streak & Smart Catch-Up */}
          <section className="rounded-2xl border border-[#064E3B]/10 dark:border-emerald-300/15 bg-white dark:bg-[#0A2921] p-5 space-y-4 ayah-card-resting">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#D97706] dark:text-amber-300" />
                <h3 className="text-sm font-bold text-[#022C22] dark:text-[#E6FFF4]">
                  7-Day Istiqāmah Cadence
                </h3>
              </div>
              <span className="text-xs font-bold tabular-nums text-[#0F766E] dark:text-emerald-300">
                {plan.streakDays.filter((v) => v === 1).length}/7 Days
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                const done = plan.streakDays[idx] === 1;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onUpdatePlan((prev) => {
                        const next = [...prev.streakDays];
                        next[idx] = next[idx] === 1 ? 0 : 1;
                        return { ...prev, streakDays: next };
                      })
                    }
                    className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors ${
                      done
                        ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                        : 'bg-[#064E3B]/[0.06] text-[#404944] dark:bg-[#041D17] dark:text-emerald-200/70'
                    }`}
                  >
                    <span>{day}</span>
                    <span className="text-[10px]">{done ? '✓' : '·'}</span>
                  </button>
                );
              })}
            </div>

            <FiligreeDivider />

            {/* Smart Catch-Up Optimizer */}
            <div className="rounded-xl bg-[#F5FFFA] dark:bg-[#041D17] border border-[#064E3B]/10 dark:border-emerald-300/15 p-3.5 space-y-1">
              <p className="text-xs font-bold text-[#064E3B] dark:text-emerald-300">
                Smart Pace Optimizer
              </p>
              <p className="text-xs text-[#404944] dark:text-emerald-200/80 leading-relaxed">
                Reading <strong className="text-[#022C22] dark:text-white">+4 extra pages</strong> per prayer today comfortably keeps your {plan.targetDays}-day finish ahead of schedule.
              </p>
            </div>

            {/* Ṣalāh-Synced Reminder Switch */}
            <button
              type="button"
              onClick={() =>
                onUpdatePlan((prev) => ({
                  ...prev,
                  salahRemindersEnabled: !prev.salahRemindersEnabled,
                }))
              }
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/18 flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-[#D97706] dark:text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#022C22] dark:text-[#E6FFF4]">
                    Ṣalāh-Synced Reminders
                  </p>
                  <p className="text-[11px] text-[#404944] dark:text-emerald-200/75 truncate">
                    Gentle chime 10 min after Fajr &amp; Maghrib
                  </p>
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  plan.salahRemindersEnabled
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[#064E3B]/10 text-[#404944] dark:text-emerald-200/60'
                }`}
              >
                {plan.salahRemindersEnabled ? 'Active' : 'Paused'}
              </span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
