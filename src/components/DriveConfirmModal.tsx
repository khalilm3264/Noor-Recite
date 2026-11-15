import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Trash2, X } from 'lucide-react';

export type DriveConfirmTone = 'primary' | 'amber' | 'danger';

export interface DriveConfirmDialogState {
  title: string;
  description: string;
  items?: string[];
  confirmLabel: string;
  tone: DriveConfirmTone;
  onConfirm: () => Promise<void> | void;
}

interface DriveConfirmModalProps {
  dialog: DriveConfirmDialogState | null;
  busy: boolean;
  onCancel: () => void;
}

export const DriveConfirmModal: React.FC<DriveConfirmModalProps> = ({
  dialog,
  busy,
  onCancel,
}) => {
  useEffect(() => {
    if (!dialog) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialog, busy, onCancel]);

  if (!dialog) return null;

  const isDanger = dialog.tone === 'danger';
  const isAmber = dialog.tone === 'amber';

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="drive-confirm-title"
        aria-describedby="drive-confirm-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[#064E3B]/15 dark:border-emerald-300/20 bg-white dark:bg-[#0A2921] p-5 sm:p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-[#BA1A1A]/12 text-[#BA1A1A] dark:bg-rose-500/20 dark:text-rose-300'
                  : isAmber
                  ? 'bg-[#D97706]/15 text-[#B45309] dark:bg-amber-400/20 dark:text-amber-300'
                  : 'bg-[#064E3B]/10 text-[#064E3B] dark:bg-emerald-500/20 dark:text-emerald-300'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : isAmber ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3
                id="drive-confirm-title"
                className="text-base font-bold text-[#022C22] dark:text-[#E6FFF4]"
              >
                {dialog.title}
              </h3>
              <p
                id="drive-confirm-desc"
                className="text-xs sm:text-[13px] text-[#404944] dark:text-emerald-200/80 mt-1 leading-relaxed"
              >
                {dialog.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Cancel confirmation"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#404944] hover:bg-[#064E3B]/8 dark:text-emerald-200/80 dark:hover:bg-emerald-400/10 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {dialog.items && dialog.items.length > 0 && (
          <div className="rounded-xl border border-[#064E3B]/12 dark:border-emerald-300/15 bg-[#FBFBFA] dark:bg-[#041D17] p-3 max-h-40 overflow-y-auto space-y-1">
            {dialog.items.map((item, idx) => (
              <p
                key={`${item}-${idx}`}
                className="text-xs font-medium text-[#022C22] dark:text-[#E6FFF4] truncate"
              >
                • {item}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[40px] px-4 rounded-xl border border-[#064E3B]/15 dark:border-emerald-300/20 text-xs font-semibold text-[#022C22] dark:text-[#E6FFF4] hover:bg-[#064E3B]/5 dark:hover:bg-emerald-400/10 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void dialog.onConfirm()}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
              isDanger
                ? 'bg-[#BA1A1A] text-white hover:bg-[#991B1B]'
                : isAmber
                ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                : 'bg-[#064E3B] text-white hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22] dark:hover:bg-emerald-400'
            }`}
          >
            {busy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{busy ? 'Working…' : dialog.confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
