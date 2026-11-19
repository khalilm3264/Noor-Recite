import React, { useEffect, useRef, useState } from 'react';
import { AudioWaveform, Check, ChevronDown } from 'lucide-react';
import { QariVoiceProfile } from '../types/quran';
import { QARI_VOICE_PROFILES } from '../utils/useSmoothReadingPlayback';

interface VoiceProfilePillSelectorProps {
  activeProfile: QariVoiceProfile;
  onSelectProfile: (profile: QariVoiceProfile) => void;
  className?: string;
  align?: 'left' | 'right';
  fullWidth?: boolean;
}

const SHORT_LABELS: Record<QariVoiceProfile, { label: string; sub: string }> = {
  recorded: { label: 'Natural Arabic', sub: 'Original' },
  'male-gulf': { label: 'Gulf Arabic', sub: 'Natural' },
  'male-egypt': { label: 'Egyptian Arabic', sub: 'Natural' },
  'male-maghreb': { label: 'Maghrebi Arabic', sub: 'Natural' },
  'female-warm': { label: 'Female Arabic', sub: 'Natural' },
};

export const VoiceProfilePillSelector: React.FC<VoiceProfilePillSelectorProps> = ({
  activeProfile,
  onSelectProfile,
  className = '',
  align = 'right',
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentOpt =
    QARI_VOICE_PROFILES.find((opt) => opt.id === activeProfile) ??
    QARI_VOICE_PROFILES[0];
  const currentShort = SHORT_LABELS[currentOpt.id] ?? SHORT_LABELS.recorded;

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col ${
        fullWidth ? 'w-full' : 'items-start sm:items-end'
      } gap-1 max-w-full ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Reciter voice: ${currentShort.label} (${currentShort.sub})`}
        className={`${
          fullWidth ? 'w-full justify-between' : ''
        } min-h-[40px] px-3.5 py-2 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white/95 dark:bg-[#0A2921] text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:border-[#064E3B]/35 dark:hover:border-emerald-300/40 shadow-xs inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]`}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <AudioWaveform className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-300 shrink-0" />
          <span className="truncate font-bold">{currentShort.label}</span>
          <span className="text-[11px] font-normal text-[#404944] dark:text-emerald-200/75 truncate hidden sm:inline">
            · {currentShort.sub}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#404944] dark:text-emerald-200/75 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select reciter voice profile"
          className={`absolute top-full mt-1.5 z-50 ${
            fullWidth ? 'w-full min-w-[260px]' : 'w-72 max-w-[calc(100vw-2rem)]'
          } ${
            align === 'left' ? 'left-0' : 'right-0'
          } rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] shadow-2xl p-1.5`}
        >
          <p className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-emerald-300/80">
            Reciter Voice Tone
          </p>
          <div className="space-y-0.5">
            {QARI_VOICE_PROFILES.map((vp) => {
              const selected = activeProfile === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelectProfile(vp.id);
                    setIsOpen(false);
                  }}
                  className={`w-full min-h-[42px] px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] ${
                    selected
                      ? 'bg-[#064E3B] text-[#FEF3C7] dark:bg-emerald-500 dark:text-[#022C22]'
                      : 'text-[#022C22] hover:bg-[#064E3B]/6 dark:text-[#E6FFF4] dark:hover:bg-emerald-400/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{vp.label}</p>
                    <p
                      className={`text-[10.5px] truncate ${
                        selected
                          ? 'text-[#FEF3C7]/85 dark:text-[#022C22]/80'
                          : 'text-[#404944] dark:text-emerald-200/75'
                      }`}
                    >
                      {vp.desc}
                    </p>
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
