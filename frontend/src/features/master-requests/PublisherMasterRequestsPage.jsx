import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, FileSignature, Loader2, Plus, RefreshCw, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/ui/toast';
import { masterRequestApi } from '@/api/master-request.api';
import { MasterStatusPill, PUBLISHER_STEPS, formatDateTime, stepIndex } from './master-request.constants';

/** Pelacak tahapan sederhana: Diajukan -> Ditinjau -> Ditandatangani -> Surat diterima */
const StepTracker = ({ status }) => {
  if (status === 'DITOLAK') return null;
  const current = stepIndex(status);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Tahapan permohonan">
      {PUBLISHER_STEPS.map((step, index) => {
        const done = index < current || status === 'DIKIRIM';
        const active = index === current && status !== 'DIKIRIM';
        return (
          <li key={step.key} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${done ? 'bg-lpmq-green' : active ? 'bg-lpmq-green/50' : 'bg-surface-subtle'}`} />
            <span className={`flex items-center gap-1 text-[11px] ${done || active ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
              {done && <Check className="h-3 w-3 text-lpmq-green" aria-hidden="true" />}
              {step.label}
              <span className="sr-only">{done ? '(selesai)' : active ? '(sedang berjalan)' : '(belum)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export const PublisherMasterRequestsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const submitted = location.state?.submitted;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await masterRequestApi.listMine();
      setItems(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Daftar permohonan master belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openLetter = async (item) => {
    setOpeningId(item.id);
    try {
      await masterRequestApi.openMyLetter(item.id);
    } catch (err) {
      showToast(err?.message || 'Surat persetujuan belum dapat dibuka.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Portal Penerbit', path: '/publisher' }, { label: 'Permohonan Master' }]}
        title="Permohonan Master Mushaf"
        subtitle="Ajukan master mushaf Al-Qur'an terbitan LPMQ dan unduh surat persetujuannya setelah ditandatangani Kepala LPMQ."
        actions={(
          <Link to="/publisher/master-requests/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark">
            <Plus className="h-4 w-4" aria-hidden="true" /> Ajukan Permohonan
          </Link>
        )}
      />

      {submitted && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-civic-successLine bg-civic-successSoft p-4 text-sm text-ink">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-civic-success" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">Permohonan terkirim dengan kode <span className="font-mono">{submitted.kode_permohonan}</span>.</p>
            <p className="text-xs text-ink-muted">Kami akan memberi tahu Anda ketika surat persetujuan siap.</p>
          </div>
          <button type="button" onClick={() => navigate('.', { replace: true, state: null })}
            className="text-xs font-semibold text-ink-muted hover:text-ink">Tutup</button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          <button type="button" onClick={load} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface py-16 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memuat permohonan...
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <FileSignature className="mx-auto h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">Belum ada permohonan master</p>
          <p className="mt-1 text-xs text-ink-muted">Ajukan permohonan pertama Anda untuk memperoleh master mushaf dari LPMQ.</p>
          <Link to="/publisher/master-requests/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark">
            <Plus className="h-4 w-4" aria-hidden="true" /> Ajukan Permohonan
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-line bg-surface p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink">{item.request_code}</span>
                    <MasterStatusPill status={item.status} audience="publisher" />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink">{item.mushaf_type_label}</p>
                  <p className="text-xs text-ink-muted">Diajukan {formatDateTime(item.created_at)} · {item.applicant_name}</p>
                </div>
                {item.status === 'DIKIRIM' && (
                  <button type="button" onClick={() => openLetter(item)} disabled={openingId === item.id}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark disabled:opacity-60">
                    {openingId === item.id
                      ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      : <FileSignature className="h-4 w-4" aria-hidden="true" />}
                    Lihat Surat Persetujuan
                  </button>
                )}
              </div>

              <StepTracker status={item.status} />

              {item.status === 'DIKIRIM' && (
                <p className="mt-3 text-xs text-ink-muted">
                  Surat nomor <span className="font-mono font-semibold text-ink">{item.letter_number}</span> ditandatangani
                  secara elektronik pada {formatDateTime(item.signed_at)}.
                </p>
              )}
              {item.status === 'DITOLAK' && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-3 py-2 text-xs text-ink">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-civic-danger" aria-hidden="true" />
                  <span><span className="font-semibold">Alasan: </span>{item.admin_note || '-'}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PublisherMasterRequestsPage;
