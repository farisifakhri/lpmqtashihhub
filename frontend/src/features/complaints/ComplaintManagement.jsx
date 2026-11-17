import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileImage,
  FileText,
  Inbox,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Timer,
  XCircle,
} from 'lucide-react';
import { complaintApi } from '@/api/complaint.api';
import { Modal } from '@/components/ui/Modal';
import {
  COMPLAINT_STATUS_META,
  COMPLAINT_STATUS_ORDER,
  COMPLAINT_TYPE_LABELS,
  ComplaintStatusPill,
  formatDate,
  formatDateTime,
  formatFileSize,
  serviceCategoryLabel,
} from './complaint.constants';

const LIMIT_OPTIONS = [10, 25, 50];
const FILTERS = ['SEMUA', ...COMPLAINT_STATUS_ORDER];

const GENDER_LABELS = { LAKI_LAKI: 'Laki-laki', PEREMPUAN: 'Perempuan' };
const ATTACHMENT_LABELS = {
  SURAT_TANDA_TASHIH: 'Gambar Surat Tanda Tashih',
  COVER_MUSHAF: 'Gambar Cover Mushaf',
  HALAMAN_SALAH: 'Gambar Halaman Salah',
};

const textareaClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lpmq-green focus:ring-4 focus:ring-lpmq-green/10';
const todayJakarta = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

const Detail = ({ label, children, wide = false }) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
    <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-ink">{children || '-'}</dd>
  </div>
);

const Block = ({ title, children }) => (
  <section className="rounded-xl border border-line p-4">
    <h3 className="mb-3 text-sm font-bold text-ink">{title}</h3>
    {children}
  </section>
);

function AttachmentButton({ complaintId, attachment, onError }) {
  const [opening, setOpening] = useState(false);
  const Icon = attachment.mime_type === 'application/pdf' ? FileText : FileImage;
  const open = async () => {
    setOpening(true);
    try {
      await complaintApi.openAttachment(complaintId, attachment.id);
    } catch (err) {
      onError(err?.message || 'Lampiran belum dapat dibuka.');
    } finally {
      setOpening(false);
    }
  };
  return (
    <button type="button" onClick={open} disabled={opening}
      aria-label={`Buka ${ATTACHMENT_LABELS[attachment.attachment_type] || 'lampiran'} ${attachment.original_filename}`}
      className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-lpmq-green hover:bg-lpmq-soft/40 disabled:opacity-60">
      {opening ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4 shrink-0 text-lpmq-green" aria-hidden="true" />}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{ATTACHMENT_LABELS[attachment.attachment_type]}</span>
        <span className="block truncate text-ink-muted">{attachment.original_filename} · {formatFileSize(attachment.file_size)}</span>
      </span>
    </button>
  );
}

/**
 * Panel aksi admin di dalam detail. Setiap keputusan membutuhkan langkah konfirmasi eksplisit.
 * mode: null | 'accept' | 'reject' | 'status' | 'final'
 */
function ActionPanel({ complaint, mode, setMode, onDone }) {
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [final, setFinal] = useState({ hasil: '', keterangan: '', tanggal_selesai: todayJakarta() });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const actions = complaint.allowed_actions || [];
  const statusOptions = actions.filter((action) => action === 'DALAM_PROSES' || action === 'MENUNGGU_TINDAK_LANJUT');

  useEffect(() => {
    setNote('');
    setConfirmed(false);
    setError(null);
    setNextStatus(statusOptions[0] || '');
    setFinal({ hasil: '', keterangan: '', tanggal_selesai: todayJakarta() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, complaint.status]);

  if (actions.length === 0) {
    return (
      <p className="rounded-lg bg-surface-subtle px-4 py-3 text-xs text-ink-muted">
        {complaint.status === 'SELESAI' ? 'Pengaduan telah selesai ditangani.' : 'Pengaduan telah ditolak. Tidak ada tindakan lanjutan.'}
      </p>
    );
  }

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setMode(null);
      onDone(res?.data, res?.message);
    } catch (err) {
      setError(err?.message || 'Tindakan belum dapat diproses.');
    } finally {
      setBusy(false);
    }
  };

  const cancelButton = (
    <button type="button" onClick={() => setMode(null)} disabled={busy}
      className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">Batal</button>
  );
  const errorBox = error && (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-3 py-2 text-xs text-civic-danger">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {error}
    </p>
  );

  if (mode === 'accept') {
    return (
      <form className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4" aria-label="Konfirmasi terima pengaduan"
        onSubmit={(e) => { e.preventDefault(); run(() => complaintApi.accept(complaint.id, note.trim())); }}>
        <p className="text-sm font-bold text-ink">Terima pengaduan {complaint.complaint_code}?</p>
        <p className="text-xs text-ink-muted">Status akan berubah menjadi <strong>Diterima</strong> dan dapat dilihat pengadu melalui Lacak Pengaduan.</p>
        <label htmlFor="catatan-terima" className="block text-xs font-semibold text-ink">Catatan untuk pengadu (opsional)</label>
        <textarea id="catatan-terima" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass}
          placeholder="Contoh: Pengaduan diterima dan akan ditindaklanjuti bersama penerbit." />
        {errorBox}
        <div className="flex justify-end gap-2">
          {cancelButton}
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark disabled:opacity-60">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Ya, Terima Pengaduan
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'reject') {
    const tooShort = note.trim().length < 10;
    return (
      <form className="space-y-3 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft/50 p-4" aria-label="Form penolakan pengaduan"
        onSubmit={(e) => { e.preventDefault(); if (!tooShort && confirmed) run(() => complaintApi.reject(complaint.id, note.trim())); }}>
        <p className="text-sm font-bold text-ink">Tolak pengaduan {complaint.complaint_code}</p>
        <label htmlFor="alasan-tolak" className="block text-xs font-semibold text-ink">
          Alasan Penolakan <span className="text-civic-danger" aria-hidden="true">*</span>
        </label>
        <textarea id="alasan-tolak" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass}
          placeholder="Alasan ini akan dapat dibaca pengadu melalui Lacak Pengaduan (minimal 10 karakter)." />
        <label className="flex items-start gap-2 text-xs text-ink">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-civic-danger" />
          Saya yakin menolak pengaduan ini. Keputusan tidak dapat dibatalkan.
        </label>
        {errorBox}
        <div className="flex justify-end gap-2">
          {cancelButton}
          <button type="submit" disabled={busy || tooShort || !confirmed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-civic-danger px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Tolak Pengaduan
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'status') {
    const tooShort = note.trim().length < 5;
    return (
      <form className="space-y-3 rounded-xl border border-civic-warningLine bg-civic-warningSoft/50 p-4" aria-label="Form perubahan status"
        onSubmit={(e) => { e.preventDefault(); if (!tooShort && nextStatus) run(() => complaintApi.updateStatus(complaint.id, nextStatus, note.trim())); }}>
        <p className="text-sm font-bold text-ink">Perbarui status penanganan</p>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-ink">Status baru</legend>
          {statusOptions.map((status) => (
            <label key={status} className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="status-baru" value={status} checked={nextStatus === status}
                onChange={(e) => setNextStatus(e.target.value)} className="h-4 w-4 accent-lpmq-green" />
              {COMPLAINT_STATUS_META[status].label}
            </label>
          ))}
        </fieldset>
        <label htmlFor="keterangan-status" className="block text-xs font-semibold text-ink">
          Keterangan perubahan <span className="text-civic-danger" aria-hidden="true">*</span>
        </label>
        <textarea id="keterangan-status" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass}
          placeholder="Keterangan ini tercatat di riwayat dan dapat dibaca pengadu (minimal 5 karakter)." />
        {errorBox}
        <div className="flex justify-end gap-2">
          {cancelButton}
          <button type="submit" disabled={busy || tooShort || !nextStatus}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Simpan Status
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'final') {
    const invalid = final.hasil.trim().length < 5 || final.keterangan.trim().length < 10 || !final.tanggal_selesai;
    return (
      <form className="space-y-3 rounded-xl border border-civic-successLine bg-civic-successSoft/50 p-4" aria-label="Form laporan akhir"
        onSubmit={(e) => { e.preventDefault(); if (!invalid && confirmed) run(() => complaintApi.submitFinalReport(complaint.id, { hasil: final.hasil.trim(), keterangan: final.keterangan.trim(), tanggal_selesai: final.tanggal_selesai })); }}>
        <p className="text-sm font-bold text-ink">Buat Laporan Akhir</p>
        <div>
          <label htmlFor="hasil-penanganan" className="mb-1 block text-xs font-semibold text-ink">Hasil Penanganan <span className="text-civic-danger" aria-hidden="true">*</span></label>
          <input id="hasil-penanganan" type="text" maxLength={255} value={final.hasil} onChange={(e) => setFinal((p) => ({ ...p, hasil: e.target.value }))}
            className={textareaClass} placeholder="Contoh: Mushaf ditarik dan dicetak ulang oleh penerbit" />
        </div>
        <div>
          <label htmlFor="keterangan-akhir" className="mb-1 block text-xs font-semibold text-ink">Keterangan atau Penjelasan <span className="text-civic-danger" aria-hidden="true">*</span></label>
          <textarea id="keterangan-akhir" rows={4} maxLength={5000} value={final.keterangan} onChange={(e) => setFinal((p) => ({ ...p, keterangan: e.target.value }))}
            className={textareaClass} placeholder="Uraikan langkah penanganan dan hasilnya (minimal 10 karakter)." />
        </div>
        <div>
          <label htmlFor="tanggal-selesai" className="mb-1 block text-xs font-semibold text-ink">Tanggal Penyelesaian <span className="text-civic-danger" aria-hidden="true">*</span></label>
          <input id="tanggal-selesai" type="date" max={todayJakarta()} value={final.tanggal_selesai}
            onChange={(e) => setFinal((p) => ({ ...p, tanggal_selesai: e.target.value }))} className={`${textareaClass} sm:w-56`} />
        </div>
        <label className="flex items-start gap-2 text-xs text-ink">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-lpmq-green" />
          Laporan akhir sudah benar. Status akan menjadi Selesai dan laporan dapat dibaca pengadu.
        </label>
        {errorBox}
        <div className="flex justify-end gap-2">
          {cancelButton}
          <button type="submit" disabled={busy || invalid || !confirmed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} Kirim Laporan Akhir
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes('TERIMA') && (
        <button type="button" onClick={() => setMode('accept')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-lpmq-green px-4 py-2 text-xs font-bold text-white hover:bg-lpmq-dark">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Terima
        </button>
      )}
      {actions.includes('TOLAK') && (
        <button type="button" onClick={() => setMode('reject')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-civic-dangerLine px-4 py-2 text-xs font-bold text-civic-danger hover:bg-civic-dangerSoft">
          <XCircle className="h-4 w-4" aria-hidden="true" /> Tolak
        </button>
      )}
      {statusOptions.length > 0 && (
        <button type="button" onClick={() => setMode('status')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-surface-subtle">
          {statusOptions.includes('DALAM_PROSES') ? <PlayCircle className="h-4 w-4" aria-hidden="true" /> : <Timer className="h-4 w-4" aria-hidden="true" />}
          Ubah Status
        </button>
      )}
      {actions.includes('LAPORAN_AKHIR') && (
        <button type="button" onClick={() => setMode('final')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-civic-successLine px-4 py-2 text-xs font-bold text-civic-success hover:bg-civic-successSoft">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Buat Laporan Akhir
        </button>
      )}
    </div>
  );
}

function ComplaintDetailModal({ complaintId, initialMode, onClose, onChanged }) {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [attachmentError, setAttachmentError] = useState(null);
  const [mode, setMode] = useState(initialMode || null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    complaintApi.getAdminDetail(complaintId)
      .then((res) => active && setComplaint(res?.data || null))
      .catch((err) => active && setError(err?.message || 'Detail pengaduan belum dapat dimuat.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [complaintId]);

  const handleDone = (data, message) => {
    if (data) setComplaint(data);
    setNotice(message || 'Perubahan tersimpan.');
    onChanged();
  };

  const c = complaint;
  return (
    <Modal isOpen onClose={onClose} size="xl" title="Detail Pengaduan"
      description={c ? `${c.complaint_code} · ${COMPLAINT_TYPE_LABELS[c.type]}` : undefined}>
      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Memuat detail...</p>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">{error}</p>
      ) : c && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-subtle px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-muted">Status:</span> <ComplaintStatusPill status={c.status} />
            </div>
            <span className="text-xs text-ink-muted">Dikirim {formatDateTime(c.created_at)}</span>
          </div>

          {notice && (
            <p role="status" className="flex items-center gap-2 rounded-lg border border-civic-successLine bg-civic-successSoft px-3 py-2 text-xs text-civic-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {notice}
            </p>
          )}

          {attachmentError && (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-3 py-2 text-xs text-civic-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> {attachmentError}
            </p>
          )}

          <Block title="Tindakan Admin">
            <ActionPanel complaint={c} mode={mode} setMode={setMode} onDone={handleDone} />
          </Block>

          <Block title="Identitas Pengadu">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Nama Pengadu">{c.reporter_name}</Detail>
              <Detail label="Jenis Kelamin">{GENDER_LABELS[c.reporter_gender]}</Detail>
              <Detail label="Usia">{c.reporter_age} tahun</Detail>
              <Detail label="Pekerjaan">{c.reporter_occupation}</Detail>
              <Detail label="Nomor Telepon">{c.phone}</Detail>
              <Detail label="Email">{c.email}</Detail>
              <Detail label="Alamat" wide>
                {c.address}{'\n'}Kec. {c.district_name}, {c.regency_name}, {c.province_name} {c.postal_code}
              </Detail>
            </dl>
          </Block>

          {c.type === 'KESALAHAN_CETAK' ? (
            <>
              <Block title="Data Penerbit dan Mushaf">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Detail label="Nama Penerbit">{c.publisher_name}</Detail>
                  <Detail label="Nama Mushaf">{c.mushaf_name}</Detail>
                  <Detail label="Nomor Surat Tanda Tashih" wide>{c.tashih_number}</Detail>
                </dl>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {c.attachments.filter((a) => !a.error_item_id).map((attachment) => (
                    <AttachmentButton key={attachment.id} complaintId={c.id} attachment={attachment} onError={setAttachmentError} />
                  ))}
                </div>
              </Block>
              <Block title={`Informasi Kesalahan Cetak (${c.error_items.length})`}>
                <ol className="space-y-3">
                  {c.error_items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-line p-3">
                      <p className="mb-2 text-xs font-bold text-ink">Kesalahan {item.position}</p>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <Detail label="Surah dan Ayat">{item.surah_ayat}</Detail>
                        <Detail label="Jenis Kesalahan">{item.error_type}</Detail>
                        <Detail label="Deskripsi Kesalahan" wide>{item.description}</Detail>
                      </dl>
                      <div className="mt-2 sm:w-1/2">
                        {item.attachments.map((attachment) => (
                          <AttachmentButton key={attachment.id} complaintId={c.id} attachment={attachment} onError={setAttachmentError} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </Block>
            </>
          ) : (
            <Block title="Data Pelayanan yang Diadukan">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Nomor Pendaftaran Mushaf">{c.registration_number}</Detail>
                <Detail label="Penerbit Pendaftar Mushaf">{c.registrant_publisher}</Detail>
                <Detail label="Jenis Pengaduan" wide>{serviceCategoryLabel(c.service_category)}</Detail>
                <Detail label="Deskripsi Pengaduan" wide>{c.description}</Detail>
              </dl>
            </Block>
          )}

          {c.status === 'DITOLAK' && (
            <Block title="Keputusan Penolakan">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Alasan Penolakan" wide>{c.rejection_reason}</Detail>
                <Detail label="Ditolak oleh">{c.decided_by?.name}</Detail>
                <Detail label="Waktu">{formatDateTime(c.decided_at)}</Detail>
              </dl>
            </Block>
          )}

          {c.status === 'SELESAI' && (
            <Block title="Laporan Akhir">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Hasil Penanganan" wide>{c.final_result}</Detail>
                <Detail label="Keterangan atau Penjelasan" wide>{c.final_explanation}</Detail>
                <Detail label="Tanggal Penyelesaian">{formatDate(c.resolved_on)}</Detail>
                <Detail label="Dibuat oleh">{c.final_report_by?.name} · {formatDateTime(c.final_report_at)}</Detail>
              </dl>
            </Block>
          )}

          <Block title="Riwayat Status">
            <ol className="space-y-3">
              {c.histories.map((history) => (
                <li key={history.id} className="flex flex-col gap-1 border-l-2 border-line pl-3 sm:flex-row sm:items-start sm:gap-3">
                  <div className="shrink-0 sm:w-44">
                    <ComplaintStatusPill status={history.status} />
                    <p className="mt-1 text-[11px] text-ink-muted">{formatDateTime(history.created_at)}</p>
                  </div>
                  <div className="text-xs">
                    <p className="whitespace-pre-line text-ink">{history.note || '-'}</p>
                    <p className="mt-0.5 text-ink-muted">{history.changed_by ? `oleh ${history.changed_by.name}` : 'oleh sistem (pengadu)'}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Block>
        </div>
      )}
    </Modal>
  );
}

/**
 * Pengelolaan pengaduan per jenis (Kelola Landing Page > Pengaduan).
 * @param {{ type: 'KESALAHAN_CETAK' | 'PELAYANAN' }} props
 */
export function ComplaintManagement({ type }) {
  const isPrint = type === 'KESALAHAN_CETAK';
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [status, setStatus] = useState('SEMUA');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // { id, mode }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complaintApi.listAdmin({ type, page, limit, status, search });
      setRows(res?.data || []);
      setCounts(res?.counts || {});
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err?.message || 'Daftar pengaduan belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [type, page, limit, status, search]);

  useEffect(() => { load(); }, [load]);

  // Ganti jenis pengaduan: kembali ke halaman pertama tanpa filter
  useEffect(() => {
    setStatus('SEMUA');
    setSearch('');
    setSearchInput('');
    setPage(1);
  }, [type]);

  const totalAll = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const columns = isPrint ? 8 : 9;
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">{COMPLAINT_TYPE_LABELS[type]}</h2>
          <p className="text-xs text-ink-muted">Laporan yang masuk melalui formulir publik. Verifikasi, tangani, lalu buat laporan akhir.</p>
        </div>
        <button type="button" onClick={load}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Muat Ulang
        </button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="tablist" aria-label="Filter status pengaduan" className="flex flex-wrap gap-2">
          {FILTERS.map((id) => {
            const active = status === id;
            const count = id === 'SEMUA' ? totalAll : counts[id] || 0;
            return (
              <button key={id} type="button" role="tab" aria-selected={active}
                onClick={() => { setStatus(id); setPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'border-lpmq-green bg-lpmq-green text-white' : 'border-line text-ink-muted hover:text-ink'
                }`}>
                {id === 'SEMUA' ? 'Semua' : COMPLAINT_STATUS_META[id].label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-surface-subtle'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <form onSubmit={submitSearch} className="flex w-full gap-2 xl:w-auto" role="search">
          <div className="relative flex-1 xl:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Cari pengaduan"
              placeholder={isPrint ? 'Cari kode, pengadu, penerbit, mushaf' : 'Cari kode, pengadu, nomor pendaftaran, penerbit'}
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
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="border-b border-line bg-surface-subtle text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">No</th>
              <th scope="col" className="px-4 py-3 font-bold">Kode Pengaduan</th>
              <th scope="col" className="px-4 py-3 font-bold">Nama Pengadu</th>
              {isPrint ? (
                <>
                  <th scope="col" className="px-4 py-3 font-bold">Nama Penerbit</th>
                  <th scope="col" className="px-4 py-3 font-bold">Nama Mushaf</th>
                </>
              ) : (
                <>
                  <th scope="col" className="px-4 py-3 font-bold">Nomor Pendaftaran Mushaf</th>
                  <th scope="col" className="px-4 py-3 font-bold">Penerbit</th>
                  <th scope="col" className="px-4 py-3 font-bold">Jenis Pengaduan</th>
                </>
              )}
              <th scope="col" className="px-4 py-3 font-bold">Tanggal Pengaduan</th>
              <th scope="col" className="px-4 py-3 font-bold">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && rows.length === 0 ? (
              <tr><td colSpan={columns} className="px-4 py-10 text-center text-ink-muted">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Memuat pengaduan...
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns} className="px-4 py-12 text-center text-ink-muted">
                <Inbox className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                {search || status !== 'SEMUA' ? 'Tidak ada pengaduan yang sesuai dengan filter.' : 'Belum ada pengaduan yang masuk.'}
              </td></tr>
            ) : rows.map((row, index) => {
              const canDecide = row.allowed_actions?.includes('TERIMA');
              return (
                <tr key={row.id} className="align-top hover:bg-surface-subtle/60">
                  <td className="px-4 py-3 text-ink-muted">{start + index}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-ink">{row.complaint_code}</td>
                  <td className="px-4 py-3 text-ink">{row.reporter_name}</td>
                  {isPrint ? (
                    <>
                      <td className="px-4 py-3 text-ink">{row.publisher_name}</td>
                      <td className="max-w-[200px] px-4 py-3 text-ink">{row.mushaf_name}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono text-ink">{row.registration_number}</td>
                      <td className="px-4 py-3 text-ink">{row.registrant_publisher}</td>
                      <td className="max-w-[200px] px-4 py-3 text-ink">{serviceCategoryLabel(row.service_category)}</td>
                    </>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(row.created_at)}</td>
                  <td className="px-4 py-3"><ComplaintStatusPill status={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => setSelected({ id: row.id, mode: null })}
                        aria-label={`Lihat pengaduan ${row.complaint_code}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-line px-2.5 py-1.5 font-semibold text-ink hover:bg-surface-subtle">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Lihat Pengaduan
                      </button>
                      <button type="button" disabled={!canDecide} onClick={() => setSelected({ id: row.id, mode: 'accept' })}
                        aria-label={`Terima pengaduan ${row.complaint_code}`}
                        title={canDecide ? undefined : 'Hanya untuk pengaduan yang menunggu verifikasi'}
                        className="rounded-md bg-lpmq-green px-2.5 py-1.5 font-semibold text-white hover:bg-lpmq-dark disabled:cursor-not-allowed disabled:opacity-35">
                        Terima
                      </button>
                      <button type="button" disabled={!canDecide} onClick={() => setSelected({ id: row.id, mode: 'reject' })}
                        aria-label={`Tolak pengaduan ${row.complaint_code}`}
                        title={canDecide ? undefined : 'Hanya untuk pengaduan yang menunggu verifikasi'}
                        className="rounded-md border border-civic-dangerLine px-2.5 py-1.5 font-semibold text-civic-danger hover:bg-civic-dangerSoft disabled:cursor-not-allowed disabled:opacity-35">
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor={`limit-${type}`}>Tampilkan</label>
          <select id={`limit-${type}`} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink">
            {LIMIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <span>baris · {start}–{end} dari {pagination.total} pengaduan</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Halaman {pagination.page} dari {pagination.totalPages}</span>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Halaman sebelumnya"
            className="rounded-md border border-line p-1.5 hover:bg-surface-subtle disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Halaman berikutnya"
            className="rounded-md border border-line p-1.5 hover:bg-surface-subtle disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {selected && (
        <ComplaintDetailModal
          key={`${selected.id}-${selected.mode}`}
          complaintId={selected.id}
          initialMode={selected.mode}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

export default ComplaintManagement;
