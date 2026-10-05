import React, { useCallback, useEffect, useState } from 'react';
import { Building2, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { publisherApi } from '@/api/publisher.api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABELS = {
  UNVERIFIED: 'Menunggu verifikasi',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Ditolak',
};

export const PublisherVerificationPage = () => {
  const [status, setStatus] = useState('UNVERIFIED');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPublishers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await publisherApi.list({ status, page: pagination.page, limit: 20 });
      setItems(result.data || []);
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Daftar penerbit gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [status, pagination.page]);

  useEffect(() => { loadPublishers(); }, [loadPublishers]);

  const handleVerify = async (publisher) => {
    const name = publisher.legal_name || publisher.user?.name || 'penerbit ini';
    if (!window.confirm(`Pastikan dokumen ${name} sudah diperiksa dan memenuhi persyaratan. Tandai sebagai terverifikasi?`)) return;
    setPendingId(publisher.id);
    setError('');
    setSuccess('');
    try {
      await publisherApi.verify(publisher.id, {
        verification_status: 'VERIFIED',
        notes: 'Dokumen penerbit telah diperiksa dan memenuhi persyaratan verifikasi.',
      });
      setSuccess(`${name} berhasil diverifikasi.`);
      await loadPublishers();
    } catch (err) {
      setError(err.message || 'Status penerbit gagal diperbarui.');
    } finally {
      setPendingId(null);
    }
  };

  const changeStatus = (nextStatus) => {
    setStatus(nextStatus);
    setPagination(current => ({ ...current, page: 1 }));
    setSuccess('');
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Tata Kelola Penerbit</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Verifikasi Penerbit</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">Periksa dokumen dan profil penerbit sebelum menyetujui akun. Penerbit terverifikasi dapat mengajukan pentashihan.</p>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={loadPublishers}>
          <RefreshCw className="h-4 w-4" /> Muat ulang
        </Button>
      </header>

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Daftar penerbit</p>
            <p className="mt-1 text-xs text-ink-muted">{pagination.total || 0} penerbit · tindakan diverifikasi dan dicatat pada audit sistem</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            Status
            <select value={status} onChange={event => changeStatus(event.target.value)} className="rounded-lg border border-line-strong bg-white px-3 py-2 text-sm">
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </section>

      {error && <div role="alert" className="rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900">{success}</div>}

      {loading ? (
        <div className="rounded-xl border border-line bg-white p-10 text-center text-sm text-ink-muted">Memuat daftar penerbit…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="Tidak ada penerbit pada status ini" description="Daftar akan diperbarui saat ada pendaftaran penerbit baru atau perubahan status." />
      ) : (
        <div className="space-y-3">
          {items.map(publisher => (
            <article key={publisher.id} className="rounded-xl border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="rounded-lg bg-brand-50 p-2.5 text-brand-800"><Building2 className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-ink">{publisher.legal_name || publisher.user?.name || 'Nama penerbit belum diisi'}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{publisher.user?.name || 'Kontak belum tersedia'}{publisher.user?.email ? ` · ${publisher.user.email}` : ''}</p>
                    <p className="mt-1 text-xs text-ink-muted">{publisher.entity_type || 'Jenis badan usaha belum dicantumkan'} · {publisher.documents?.length || 0} dokumen terlampir</p>
                    {publisher.documents?.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {publisher.documents.map(document => <li key={document.id} className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] text-ink-muted">{document.document_type.replaceAll('_', ' ')} · {document.status}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${publisher.verification_status === 'VERIFIED' ? 'border-brand-100 bg-brand-50 text-brand-800' : publisher.verification_status === 'REJECTED' ? 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger' : 'border-civic-warningLine bg-civic-warningSoft text-civic-warning'}`}>
                    {STATUS_LABELS[publisher.verification_status] || publisher.verification_status}
                  </span>
                  {publisher.verification_status === 'UNVERIFIED' && (
                    <Button size="sm" disabled={pendingId === publisher.id} onClick={() => handleVerify(publisher)} icon={pendingId === publisher.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}>
                      {pendingId === publisher.id ? 'Memproses…' : 'Tandai terverifikasi'}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <span className="text-ink-muted">Halaman {pagination.page || 1} dari {pagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={loading || pagination.page <= 1} onClick={() => setPagination(value => ({ ...value, page: value.page - 1 }))}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => setPagination(value => ({ ...value, page: value.page + 1 }))}>Berikutnya</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherVerificationPage;
