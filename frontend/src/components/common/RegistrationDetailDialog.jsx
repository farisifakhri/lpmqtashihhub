import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Clock, AlertCircle, UserCheck, ArrowRight } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';
import { useOptionalAuth } from '@/features/auth/AuthContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { AssignVerificationDialog } from '@/features/verification/AssignVerificationDialog';
import { TOKENS } from '@/app/tokens';
import { clsx } from 'clsx';
import { waitingLabel } from './QueueOverview';
import { WorkflowPhaseStatus } from './WorkflowPhaseStatus';
import { DocumentArchive } from './DocumentArchive';

export function RegistrationDetailDialog({ id, onClose }) {
  const authContext = useOptionalAuth();
  const currentUser = authContext?.currentUser || null;
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const isVerifier = userRoles.includes('VERIFIKATOR') || currentUser?.role === 'VERIFIKATOR';
  const isAdmin = userRoles.includes('HELPER_ADMIN') || userRoles.includes('SUPERADMIN') || currentUser?.role === 'HELPER_ADMIN' || currentUser?.role === 'SUPERADMIN';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const closeButton = useRef(null);
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  const reloadData = () => {
    Promise.all([registrationApi.getDetail(id), reportApi.getRegistrationTimeline(id)])
      .then(([detail, timeline]) => {
        setData({ ...detail.data, status_histories: timeline.data.timeline });
      })
      .catch(err => {
        setError(err.message || 'Detail naskah tidak dapat dimuat.');
      });
  };

  useEffect(() => {
    let active = true;
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = event => {
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const controls = panel.current?.querySelectorAll('button, a[href], input, [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    // Use the permission-aware timeline, not internal notes from the detail payload.
    Promise.all([registrationApi.getDetail(id), reportApi.getRegistrationTimeline(id)])
      .then(([detail, timeline]) => { if (active) setData({ ...detail.data, status_histories: timeline.data.timeline }); })
      .catch(err => { if (active) setError(err.message || 'Detail naskah tidak dapat dimuat.'); });
    return () => { active = false; document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [id]);

  const intake = data?.physical_master_intake || data?.physical_master;
  const isIntakeReceived = intake?.status === 'RECEIVED';

  return <div className="fixed inset-0 z-50 bg-ink/50 p-4 sm:p-6 flex items-center justify-center" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="registration-detail-title" className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-xl flex flex-col justify-between">
      <div>
        <div className="sticky top-0 bg-white border-b border-line p-5 flex items-center justify-between gap-4 z-10">
          <h2 id="registration-detail-title" className="font-bold text-ink">Detail & perjalanan naskah</h2>
          <button ref={closeButton} onClick={onClose} aria-label="Tutup detail naskah" className="rounded-lg p-2 hover:bg-surface-subtle"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          {error ? <p role="alert" className="flex gap-2 text-sm text-civic-danger"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p> : !data ? <p role="status" className="text-sm text-ink-muted">Memuat detail naskah…</p> : <>
            <div><p className="font-mono text-xs text-brand-700">{data.registration_no}</p><h3 className="text-xl font-bold text-ink mt-1">{data.title}</h3><p className="text-sm text-ink-muted mt-1">{data.publisher?.legal_name}</p></div>
            {(isAdmin || userRoles.includes('DOKUMENTATOR')) && <DocumentArchive registrationId={data.id} />}
            <div className="rounded-xl bg-canvas border border-line p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={data.status} />
                {data.external_sync_status && (
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-md font-semibold border px-2 py-0.5 text-[11px]',
                      TOKENS.externalSyncStatus?.[data.external_sync_status]?.bgClass || 'bg-surface-subtle',
                      TOKENS.externalSyncStatus?.[data.external_sync_status]?.textClass || 'text-ink',
                      TOKENS.externalSyncStatus?.[data.external_sync_status]?.borderClass || 'border-line'
                    )}
                    title={data.external_sync_error || TOKENS.externalSyncStatus?.[data.external_sync_status]?.description}
                  >
                    Integrasi: {TOKENS.externalSyncStatus?.[data.external_sync_status]?.label || data.external_sync_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted flex gap-2"><Clock className="h-4 w-4" />Tahap ini dimulai: {data.stage_entered_at ? new Date(data.stage_entered_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' : 'Belum tercatat'}</p>
              <p className="text-xs text-ink-muted">{data.service_type?.name}</p>
            </div>
            <WorkflowPhaseStatus registration={data} />
            <div><h4 className="text-sm font-bold text-ink mb-3">Riwayat proses</h4>
              {data.status_histories?.length ? <ol className="space-y-4 border-l-2 border-brand-100 pl-4">{data.status_histories.map(history => <li key={history.id} className="text-xs space-y-1"><StatusBadge status={history.to_status} /><p className="text-ink-muted">{new Date(history.changed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>{history.notes && <p className="text-ink break-words">{history.notes}</p>}</li>)}</ol> : <p className="text-xs text-ink-muted">Belum ada perubahan status tercatat.</p>}
            </div>
          </>}
        </div>
      </div>

      {data && (
        <div className="sticky bottom-0 bg-canvas border-t border-line p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-10">
          <div className="text-xs text-ink-muted">
            {data.status === 'READY_FOR_VERIFICATION' && isIntakeReceived ? (
              <span className="text-brand-700 font-semibold">Master fisik diterima loket. Siap ditugaskan Helper Admin.</span>
            ) : data.status === 'READY_FOR_VERIFICATION' ? (
              <span className="text-civic-warning font-semibold">Menunggu intake master fisik A4 di loket LPMQ.</span>
            ) : data.status === 'VERIFICATION_ASSIGNED' ? (
              <span className="text-civic-info font-semibold">Verifikator telah ditugaskan (Nota Dinas terbit).</span>
            ) : (
              <span>Tahap saat ini: <strong className="text-ink">{data.status}</strong></span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.status === 'READY_FOR_VERIFICATION' && isIntakeReceived && isAdmin && (
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-bold"
                onClick={() => setAssignDialogOpen(true)}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Tugaskan Verifikator
              </Button>
            )}
            {data.status === 'READY_FOR_VERIFICATION' && isIntakeReceived && !isAdmin && (
              <Link
                to={`/internal/verifications?tab=NEED_ASSIGNMENT&id=${data.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-2xs transition-colors"
              >
                <span>Antrean Penugasan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {data.status === 'READY_FOR_VERIFICATION' && !isIntakeReceived && isAdmin && (
              <Link
                to={`/internal/master-intake?search=${encodeURIComponent(data.registration_no || data.id)}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-civic-warning hover:bg-civic-warning text-white font-bold text-xs shadow-2xs transition-colors"
              >
                <span>Loket Intake Fisik</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {['VERIFICATION_ASSIGNED', 'IN_VERIFICATION'].includes(data.status) && (isVerifier || isHead) && (
              <Link
                to={`/internal/verifications?id=${data.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink hover:bg-ink text-white font-bold text-xs shadow-2xs transition-colors"
              >
                <span>Buka Pemeriksaan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}

      {assignDialogOpen && data && (
        <AssignVerificationDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          registration={data}
          onSuccess={() => {
            setAssignDialogOpen(false);
            reloadData();
          }}
          onConflict={() => {
            setAssignDialogOpen(false);
            reloadData();
          }}
        />
      )}
    </section>
  </div>;
}
