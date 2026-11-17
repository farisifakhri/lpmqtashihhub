import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, CircleDot, FileSearch, Loader2, Search, XCircle } from 'lucide-react';
import { complaintApi } from '@/api/complaint.api';
import { COMPLAINT_ROUTES, ComplaintStatusPill, formatDate, formatDateTime } from './complaint.constants';
import { ComplaintPublicShell, FormAlert, inputClass } from './ComplaintFormParts';

const NOT_FOUND = 'Kode pengaduan tidak ditemukan. Silakan periksa kembali kode yang Anda masukkan.';

const Info = ({ label, children }) => (
  <div>
    <dt className="text-xs text-ink-muted">{label}</dt>
    <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
  </div>
);

function HistoryTimeline({ items }) {
  return (
    <ol className="relative ml-2 space-y-5 border-l border-line pl-6">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const Icon = item.status === 'DITOLAK' ? XCircle : item.status === 'SELESAI' ? CheckCircle2 : CircleDot;
        return (
          <li key={`${item.status}-${item.tanggal}-${index}`} className="relative">
            <span className={`absolute -left-[33px] flex h-5 w-5 items-center justify-center rounded-full bg-surface ${
              last ? 'text-lpmq-green' : 'text-ink-muted'
            }`} aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <ComplaintStatusPill status={item.status} />
              <time className="text-xs text-ink-muted" dateTime={item.tanggal}>{formatDateTime(item.tanggal)}</time>
            </div>
            {item.keterangan && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{item.keterangan}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function TrackComplaintPage() {
  const location = useLocation();
  const initialCode = location.state?.kode || '';
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const autoTracked = useRef(false);

  const track = async (value) => {
    const kode = String(value || '').trim().toUpperCase();
    if (!kode) {
      setError('Masukkan kode pengaduan terlebih dahulu.');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await complaintApi.track(kode);
      setResult(res?.data || null);
    } catch (err) {
      setResult(null);
      setError(err?.status === 404 ? NOT_FOUND : err?.message || 'Pelacakan belum dapat diproses. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Datang dari dialog konfirmasi pengiriman: langsung lacak kode yang baru dibuat
  useEffect(() => {
    if (initialCode && !autoTracked.current) {
      autoTracked.current = true;
      track(initialCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const onSubmit = (event) => {
    event.preventDefault();
    track(code);
  };

  return (
    <ComplaintPublicShell
      title="Lacak Pengaduan"
      description="Pantau perkembangan pengaduan Anda tanpa perlu masuk akun. Masukkan kode pengaduan yang Anda terima setelah mengirim formulir atau melalui email."
      activeHref={COMPLAINT_ROUTES.LACAK}
    >
      <form onSubmit={onSubmit} role="search" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <label htmlFor="kode-pengaduan" className="mb-1.5 block text-[13px] font-semibold text-ink">Kode Pengaduan</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="kode-pengaduan"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            placeholder="Masukkan kode pengaduan Anda"
            className={`${inputClass(false)} font-mono tracking-wide`}
          />
          <button type="submit" disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-lpmq-green px-6 py-2.5 text-sm font-bold text-white hover:bg-lpmq-dark disabled:opacity-70">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            Lacak Pengaduan
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">Contoh format: ADU-KC-20261111-XXXXXXXX</p>
      </form>

      <div className="mt-6 space-y-5" aria-live="polite">
        {error && <FormAlert>{error}</FormAlert>}

        {!result && !error && !loading && (
          <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center text-sm text-ink-muted">
            <FileSearch className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
            Hasil pelacakan akan tampil di sini.
          </div>
        )}

        {result && (
          <>
            <section aria-labelledby="info-pengaduan" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 id="info-pengaduan" className="mb-4 text-base font-bold text-ink">Informasi Pengaduan</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Kode Pengaduan"><span className="font-mono">{result.kode_pengaduan}</span></Info>
                <Info label="Jenis Pengaduan">{result.jenis_pengaduan_label}</Info>
                <Info label="Tanggal Pengaduan">{formatDateTime(result.tanggal_pengaduan)}</Info>
                <Info label="Nama Pengadu">{result.nama_pengadu}</Info>
                <Info label="Status Terbaru"><ComplaintStatusPill status={result.status} /></Info>
              </dl>
            </section>

            {result.status === 'DITOLAK' && result.alasan_penolakan && (
              <section aria-labelledby="alasan-penolakan" className="rounded-2xl border border-civic-dangerLine bg-civic-dangerSoft p-5 sm:p-6">
                <h2 id="alasan-penolakan" className="mb-2 text-base font-bold text-civic-danger">Alasan Penolakan</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{result.alasan_penolakan}</p>
              </section>
            )}

            {result.hasil_penanganan && (
              <section aria-labelledby="hasil-penanganan" className="rounded-2xl border border-civic-successLine bg-civic-successSoft p-5 sm:p-6">
                <h2 id="hasil-penanganan" className="mb-4 text-base font-bold text-civic-success">Hasil Penanganan</h2>
                <dl className="space-y-3">
                  <Info label="Hasil Penanganan">{result.hasil_penanganan.hasil}</Info>
                  <div>
                    <dt className="text-xs text-ink-muted">Keterangan atau Penjelasan</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink">{result.hasil_penanganan.keterangan}</dd>
                  </div>
                  <Info label="Tanggal Penyelesaian">{formatDate(result.hasil_penanganan.tanggal_selesai)}</Info>
                </dl>
              </section>
            )}

            <section aria-labelledby="riwayat-status" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 id="riwayat-status" className="mb-5 text-base font-bold text-ink">Riwayat Status Pengaduan</h2>
              <HistoryTimeline items={result.riwayat || []} />
            </section>
          </>
        )}
      </div>
    </ComplaintPublicShell>
  );
}

export default TrackComplaintPage;
