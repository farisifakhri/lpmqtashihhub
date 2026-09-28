import React, { useEffect, useRef } from 'react';
import { AlertTriangle, HelpCircle, Check, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const ConfirmationSummaryDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  description = 'Periksa rincian objek berikut sebelum melanjutkan keputusan.',
  summaryItems = [],
  objectName,
  nextActor,
  statusChange,
  generatedDocument,
  irreversibleConsequence,
  impactMessage,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  confirmVariant = 'primary', // 'primary' | 'danger' | 'gold'
  loading = false,
  icon,
}) => {
  const dialogRef = useRef(null);

  // Gabungkan item ringkasan terstruktur jika disediakan
  const allSummaryItems = [
    ...summaryItems,
    objectName ? { label: 'Objek Naskah', value: objectName } : null,
    nextActor ? { label: 'Pelaku / Penerima Berikutnya', value: nextActor } : null,
    statusChange ? { label: 'Perubahan Status', value: statusChange } : null,
    generatedDocument ? { label: 'Dokumen Terbentuk', value: generatedDocument } : null,
  ].filter(Boolean);

  const finalImpact = impactMessage || irreversibleConsequence;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  // Focus trap on open
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line outline-none animate-slideUp"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            {icon || (
              <div
                className={clsx(
                  'p-2 rounded-lg shrink-0',
                  confirmVariant === 'danger'
                    ? 'bg-civic-dangerSoft text-civic-danger'
                    : 'bg-brand-100 text-brand-800'
                )}
              >
                {confirmVariant === 'danger' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>
            )}
            <div>
              <h2 id="confirmation-dialog-title" className="text-base font-bold text-ink">
                {title}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors"
            aria-label="Tutup dialog konfirmasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Details Table */}
        {allSummaryItems.length > 0 && (
          <div className="bg-canvas rounded-lg p-3.5 border border-line space-y-2 text-xs">
            {allSummaryItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-2 border-b border-line/60 pb-1.5 last:border-b-0 last:pb-0"
              >
                <span className="text-ink-muted font-medium">{item.label}:</span>
                <span className="font-semibold text-ink text-right font-mono">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Impact Message */}
        {finalImpact && (
          <div
            role="note"
            className="flex items-start gap-2.5 p-3 rounded-lg border border-civic-warningLine bg-civic-warningSoft text-xs text-civic-warning"
          >
            <ShieldAlert className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Akibat Tindakan: </span>
              <span>{finalImpact}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            {cancelLabel}
          </Button>

          <Button
            variant={confirmVariant}
            size="md"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationSummaryDialog;

