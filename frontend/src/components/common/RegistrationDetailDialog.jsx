import React, { useEffect, useRef, useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { waitingLabel } from './QueueOverview';

export function RegistrationDetailDialog({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const closeButton = useRef(null);
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
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
  return <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 sm:p-6 flex items-center justify-center" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="registration-detail-title" className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-xl">
      <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between gap-4">
        <h2 id="registration-detail-title" className="font-bold text-slate-900">Detail & perjalanan naskah</h2>
        <button ref={closeButton} onClick={onClose} aria-label="Tutup detail naskah" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        {error ? <p role="alert" className="flex gap-2 text-sm text-rose-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p> : !data ? <p role="status" className="text-sm text-slate-500">Memuat detail naskah…</p> : <>
          <div><p className="font-mono text-xs text-emerald-700">{data.registration_no}</p><h3 className="text-xl font-bold text-slate-900 mt-1">{data.title}</h3><p className="text-sm text-slate-500 mt-1">{data.publisher?.legal_name}</p></div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2"><StatusBadge status={data.status} /><p className="text-xs text-slate-600 flex gap-2"><Clock className="h-4 w-4" />Berada pada tahap ini selama {waitingLabel(data.stage_entered_at)}</p><p className="text-xs text-slate-500">{data.service_type?.name}</p></div>
          <div><h4 className="text-sm font-bold text-slate-900 mb-3">Riwayat proses</h4>
            {data.status_histories?.length ? <ol className="space-y-4 border-l-2 border-emerald-100 pl-4">{data.status_histories.map(history => <li key={history.id} className="text-xs space-y-1"><StatusBadge status={history.to_status} /><p className="text-slate-500">{new Date(history.changed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>{history.notes && <p className="text-slate-700 break-words">{history.notes}</p>}</li>)}</ol> : <p className="text-xs text-slate-500">Belum ada perubahan status tercatat.</p>}
          </div>
        </>}
      </div>
    </section>
  </div>;
}
