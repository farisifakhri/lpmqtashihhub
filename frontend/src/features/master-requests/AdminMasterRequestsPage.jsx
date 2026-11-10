import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSignature,
  FileText,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/ui/toast';
import { masterRequestApi } from '@/api/master-request.api';
import { DEFAULT_LETTER_SUBJECT, MasterStatusPill, MASTER_STATUS_META, formatDateTime } from './master-request.constants';

const FILTERS = ['SEMUA', 'DIAJUKAN', 'MENUNGGU_TTE', 'DITANDATANGANI', 'DIKIRIM', 'DITOLAK'];

const DOC_LABELS = {
  SURAT_PERMOHONAN: "Surat Permohonan Master Mushaf Al-Qur'an",
  PROFIL_PEMOHON: "Profil Pemohon Master Mushaf Al-Qur'an",
};

const DEFAULT_LETTER_BODY =
  'Berkas master dalam format digital akan dikirimkan melalui surel resmi LPMQ ke alamat email yang terdaftar paling lambat 3 (tiga) hari kerja setelah surat ini diterima.';

const formatSize = (bytes) => (bytes ? `${Math.max(1, Math.round(bytes / 1024))} KB` : '');

const DetailRow = ({ label, children }) => (
  <div className="grid gap-1 py-2 sm:grid-cols-[170px_1fr] sm:gap-4">
    <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
    <dd className="whitespace-pre-line break-words text-sm text-ink">{children || '-'}</dd>
  </div>
);

/** Riwayat singkat alur: siapa melakukan apa dan kapan. */
const Timeline = ({ detail }) => {
  const steps = [
    { label: 'Diajukan penerbit', at: detail.created_at, by: detail.submitted_by?.name },
    { label: 'Surat diajukan ke Kepala (TTE)', at: detail.letter_drafted_at, by: detail.letter_drafted_by?.name },
    { label: 'Ditandatangani Kepala LPMQ', at: detail.signed_at, by: detail.signed_by?.name },
    { label: 'Surat dikirim ke penerbit', at: detail.sent_at, by: detail.sent_by?.name },
  ];
  if (detail.status === 'DITOLAK') {
    steps.splice(1, 3, { label: 'Ditolak admin', at: detail.processed_at, by: detail.processed_by?.name, danger: true });
  }
  return (
    <ol className="space-y-2.5">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2.5 text-xs">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
            step.at ? (step.danger ? 'bg-civic-danger' : 'bg-lpmq-green') : 'border border-line-strong bg-surface'
          }`} aria-hidden="true" />
          <div>
            <p className={step.at ? 'font-semibold text-ink' : 'text-ink-muted'}>{step.label}</p>
            {step.at && <p className="text-ink-muted">{formatDateTime(step.at)}{step.by ? ` · ${step.by}` : ''}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};

function MasterRequestDetailModal({ requestId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null); // 'letter' | 'reject'
  const [perihal, setPerihal] = useState(DEFAULT_LETTER_SUBJECT);
  const [isi, setIsi] = useState(DEFAULT_LETTER_BODY);
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  const applyDetail = (data) => {
    setDetail(data);
    if (data?.letter_subject) setPerihal(data.letter_subject);
    if (data?.letter_body) setIsi(data.letter_body);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await masterRequestApi.getAdminDetail(requestId);
      applyDetail(res?.data || null);
    } catch (err) {
      setError(err?.message || 'Detail permohonan belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, success) => {
    setBusy(key);
    setActionError(null);
    try {
      const res = await fn();
      if (res?.data) applyDetail(res.data);
      setMode(null);
      showToast(success, 'success');
      onChanged?.();
    } catch (err) {
      setActionError(err?.message || 'Tindakan belum dapat diproses.');
    } finally {
      setBusy(null);
    }
  };

  const submitLetter = () => {
    if (isi.trim().length < 20) {
      setActionError('Isi surat minimal 20 karakter.');
      return;
    }
    run('letter', () => masterRequestApi.submitLetter(requestId, { perihal: perihal.trim(), isi: isi.trim() }),
      detail.status === 'DIAJUKAN'
        ? 'Surat persetujuan diajukan ke Kepala LPMQ untuk ditandatangani.'
        : 'Surat persetujuan diperbarui.');
  };

  const reject = () => {
    if (alasan.trim().length < 5) {
      setActionError('Tulis alasan penolakan minimal 5 karakter.');
      return;
    }
    run('reject', () => masterRequestApi.reject(requestId, alasan.trim()), 'Permohonan ditolak dan penerbit telah diberi tahu.');
  };

  const send = () => run('send', () => masterRequestApi.sendToPublisher(requestId), 'Surat persetujuan dikirim ke penerbit.');

  const openPdf = async (fn) => {
    try { await fn(); } catch (err) { showToast(err?.message || 'Dokumen belum dapat dibuka.'); }
  };

  const actions = detail?.allowed_actions || [];
  const canLetter = actions.includes('AJUKAN_TTE') || actions.includes('PERBARUI_SURAT');
  const isLegacy = detail && !detail.publisher_id;

  return (
    <Modal isOpen onClose={onClose} size="xl" title="Detail Permohonan Master Mushaf"
      description={detail ? `Kode permohonan ${detail.request_code}` : undefined}>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memuat detail permohonan...
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">{error}</div>
      )}
      {!loading && detail && (
        <div className="grid gap-6 lg:grid-cols-[1fr_230px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold text-ink">{detail.request_code}</span>
              <MasterStatusPill status={detail.status} />
              {detail.letter_number && <span className="font-mono text-xs text-ink-muted">Surat {detail.letter_number}</span>}
            </div>

            {isLegacy && (
              <div className="flex items-start gap-2 rounded-lg border border-civic-warningLine bg-civic-warningSoft px-3 py-2 text-xs text-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-civic-warning" aria-hidden="true" />
                Permohonan ini berasal dari formulir publik lama dan tidak terhubung ke akun penerbit, sehingga surat
                tidak dapat dikirim melalui portal. Tolak dan minta pemohon mengajukan ulang melalui portal penerbit.
              </div>
            )}

            <section>
              <h3 className="mb-1 text-sm font-bold text-ink">Penerbit &amp; Pemohon</h3>
              <dl className="divide-y divide-line">
                <DetailRow label="Akun Penerbit">
                  {detail.publisher ? `${detail.publisher.legal_name}${detail.publisher.nomor_induk_penerbit ? ` (NIP ${detail.publisher.nomor_induk_penerbit})` : ''}` : 'Formulir publik lama'}
                </DetailRow>
                <DetailRow label="Nama Pemohon">{detail.applicant_name}</DetailRow>
                <DetailRow label="Lembaga">{detail.institution}</DetailRow>
                <DetailRow label="Alamat">{`${detail.address}\nKec. ${detail.district_name}, ${detail.regency_name}, ${detail.province_name} ${detail.postal_code}`}</DetailRow>
                <DetailRow label="Kontak">
                  <a className="text-lpmq-green hover:underline" href={`tel:${detail.phone}`}>{detail.phone}</a>
                  {' · '}
                  <a className="text-lpmq-green hover:underline" href={`mailto:${detail.email}`}>{detail.email}</a>
                </DetailRow>
              </dl>
            </section>

            <section>
              <h3 className="mb-1 text-sm font-bold text-ink">Master yang Dimohon</h3>
              <dl className="divide-y divide-line">
                <DetailRow label="Jenis Mushaf">{detail.mushaf_type_label}</DetailRow>
                <DetailRow label="Rencana Penggunaan">{detail.intended_use}</DetailRow>
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-bold text-ink">Dokumen Permohonan</h3>
              <ul className="space-y-2">
                {(detail.documents || []).map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-civic-danger" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{DOC_LABELS[doc.document_type] || doc.document_type}</p>
                        <p className="truncate text-xs text-ink-muted">{doc.original_filename} · {formatSize(doc.file_size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => openPdf(() => masterRequestApi.openDocument(requestId, doc.id))}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-subtle">
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Lihat PDF
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Tindak lanjut */}
            <section className="rounded-xl border border-line bg-surface-subtle p-4">
              <h3 className="text-sm font-bold text-ink">Tindak Lanjut</h3>

              {detail.status === 'DITOLAK' && (
                <p className="mt-2 text-sm text-ink"><span className="font-semibold">Alasan penolakan: </span>{detail.admin_note}</p>
              )}
              {detail.status === 'MENUNGGU_TTE' && (
                <p className="mt-1 text-xs text-ink-muted">Surat sedang menunggu tanda tangan elektronik Kepala LPMQ di Pusat Tanda Tangan. Isi surat masih dapat diperbaiki.</p>
              )}
              {detail.status === 'DITANDATANGANI' && (
                <p className="mt-1 text-xs text-ink-muted">Surat sudah ditandatangani Kepala LPMQ. Kirim ke penerbit agar dapat diunduh dari portalnya.</p>
              )}
              {detail.status === 'DIKIRIM' && (
                <p className="mt-1 text-xs text-ink-muted">Surat sudah dikirim dan dapat diunduh penerbit dari menu Permohonan Master.</p>
              )}

              {detail.letter_number && (
                <button type="button" onClick={() => openPdf(() => masterRequestApi.openAdminLetter(requestId))}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {detail.signed_at ? 'Lihat Surat Bertanda Tangan' : 'Pratinjau Draf Surat'}
                </button>
              )}

              {mode === 'letter' && canLetter && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="letter-subject" className="mb-1 block text-xs font-semibold text-ink">Perihal</label>
                    <input id="letter-subject" value={perihal} maxLength={255} onChange={(e) => setPerihal(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lpmq-green" />
                  </div>
                  <div>
                    <label htmlFor="letter-body" className="mb-1 block text-xs font-semibold text-ink">
                      Isi tambahan surat <span className="font-normal text-ink-muted">(mis. cara penyerahan master)</span>
                    </label>
                    <textarea id="letter-body" rows={4} maxLength={5000} value={isi} onChange={(e) => { setIsi(e.target.value); setActionError(null); }}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lpmq-green" />
                    <p className="mt-1 text-[11px] text-ink-muted">Salam pembuka, pernyataan persetujuan, ketentuan larangan jual-beli dan kewajiban tanda tashih ditambahkan otomatis.</p>
                  </div>
                </div>
              )}

              {mode === 'reject' && (
                <div className="mt-4">
                  <label htmlFor="reject-reason" className="mb-1 block text-xs font-semibold text-ink">Alasan penolakan (dikirim ke penerbit)</label>
                  <textarea id="reject-reason" rows={3} maxLength={2000} value={alasan}
                    onChange={(e) => { setAlasan(e.target.value); setActionError(null); }}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lpmq-green" />
                </div>
              )}

              {actionError && (
                <p role="alert" className="mt-3 flex items-start gap-1.5 text-xs font-medium text-civic-danger">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{actionError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {mode && (
                  <button type="button" onClick={() => { setMode(null); setActionError(null); }} disabled={Boolean(busy)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink">Batal</button>
                )}
                {actions.includes('TOLAK') && mode !== 'letter' && (
                  mode === 'reject' ? (
                    <button type="button" onClick={reject} disabled={Boolean(busy)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-civic-danger px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                      {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                      Tolak Permohonan
                    </button>
                  ) : (
                    <button type="button" onClick={() => setMode('reject')}
                      className="rounded-lg border border-civic-dangerLine px-4 py-2 text-xs font-bold text-civic-danger hover:bg-civic-dangerSoft">
                      Tolak…
                    </button>
                  )
                )}
                {canLetter && !isLegacy && mode !== 'reject' && (
                  mode === 'letter' ? (
                    <button type="button" onClick={submitLetter} disabled={Boolean(busy)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark disabled:opacity-60">
                      {busy === 'letter' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />}
                      {detail.status === 'DIAJUKAN' ? 'Ajukan ke Kepala untuk TTE' : 'Simpan Perbaikan Surat'}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setMode('letter')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark">
                      <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
                      {detail.status === 'DIAJUKAN' ? 'Susun Surat Persetujuan' : 'Perbaiki Isi Surat'}
                    </button>
                  )
                )}
                {actions.includes('KIRIM_KE_PENERBIT') && (
                  <button type="button" onClick={send} disabled={Boolean(busy)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark disabled:opacity-60">
                    {busy === 'send' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                    Kirim Surat ke Penerbit
                  </button>
                )}
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-line p-4 lg:self-start">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Riwayat</h3>
            <Timeline detail={detail} />
          </aside>
        </div>
      )}
    </Modal>
  );
}

export const AdminMasterRequestsPage = () => {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [status, setStatus] = useState('SEMUA');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await masterRequestApi.listAdmin({ page, limit: 10, status, search });
      setRows(res?.data || []);
      setCounts(res?.counts || {});
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err?.message || 'Daftar permohonan master belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const totalAll = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Tata Kelola Sistem' }, { label: 'Permohonan Master' }]}
        title="Permohonan Master"
        subtitle="Tinjau permohonan master mushaf dari penerbit, ajukan surat persetujuan ke Kepala LPMQ untuk TTE, lalu kirim surat bertanda tangan ke penerbit."
        actions={(
          <button type="button" onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Muat Ulang
          </button>
        )}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="tablist" aria-label="Filter status permohonan" className="flex flex-wrap gap-2">
          {FILTERS.map((id) => {
            const active = status === id;
            const count = id === 'SEMUA' ? totalAll : counts[id] || 0;
            return (
              <button key={id} type="button" role="tab" aria-selected={active}
                onClick={() => { setStatus(id); setPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'border-lpmq-green bg-lpmq-green text-white' : 'border-line text-ink-muted hover:text-ink'
                }`}>
                {id === 'SEMUA' ? 'Semua' : MASTER_STATUS_META[id].label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-surface-subtle'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <form onSubmit={submitSearch} className="flex w-full gap-2 xl:w-auto" role="search">
          <div className="relative flex-1 xl:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Cari permohonan master"
              placeholder="Cari kode, nama, lembaga, email, nomor surat"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-xs text-ink outline-none focus:border-lpmq-green" />
          </div>
          <button type="submit" className="rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark">Cari</button>
        </form>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-line bg-surface-subtle text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">Kode</th>
              <th scope="col" className="px-4 py-3 font-bold">Penerbit / Pemohon</th>
              <th scope="col" className="px-4 py-3 font-bold">Jenis Mushaf</th>
              <th scope="col" className="px-4 py-3 font-bold">Tanggal</th>
              <th scope="col" className="px-4 py-3 font-bold">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Memuat permohonan...
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                <Inbox className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                {search || status !== 'SEMUA' ? 'Tidak ada permohonan yang sesuai dengan filter.' : 'Belum ada permohonan master mushaf.'}
              </td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="align-top hover:bg-surface-subtle/60">
                <td className="px-4 py-3">
                  <p className="font-mono font-semibold text-ink">{row.request_code}</p>
                  {row.letter_number && <p className="font-mono text-[10px] text-ink-muted">{row.letter_number}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{row.publisher?.legal_name || row.institution}</p>
                  <p className="text-ink-muted">{row.applicant_name}{!row.publisher && ' · formulir lama'}</p>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-ink">{row.mushaf_type_label}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(row.created_at)}</td>
                <td className="px-4 py-3"><MasterStatusPill status={row.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => setSelectedId(row.id)}
                    aria-label={`Lihat detail permohonan ${row.request_code}`}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 font-semibold text-ink hover:bg-surface-subtle">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>Halaman {pagination.page} dari {pagination.totalPages} · {pagination.total} permohonan</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Halaman sebelumnya"
              className="rounded-md border border-line p-1.5 hover:bg-surface-subtle disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Halaman berikutnya"
              className="rounded-md border border-line p-1.5 hover:bg-surface-subtle disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {selectedId && (
        <MasterRequestDetailModal requestId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
      )}
    </div>
  );
};

export default AdminMasterRequestsPage;
