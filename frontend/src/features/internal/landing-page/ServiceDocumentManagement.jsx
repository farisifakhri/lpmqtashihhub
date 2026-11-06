import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { serviceDocumentApi } from '@/api/service-document.api';
import { SERVICE_DOCUMENT_CATEGORIES } from '@/features/information/service-document.constants';

const EMPTY_FORM = {
  title: '',
  category: SERVICE_DOCUMENT_CATEGORIES[0],
  is_published: true,
  file: null,
};

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export const ServiceDocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [publishedFilter, setPublishedFilter] = useState('ALL');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyDownloadId, setBusyDownloadId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await serviceDocumentApi.listAdmin({
        page,
        limit,
        category: categoryFilter,
        is_published: publishedFilter,
      });
      if (!response?.success) throw new Error('Daftar dokumen belum dapat dimuat.');
      setDocuments(response.data || []);
      setPagination(response.pagination || { page, limit, total: 0, totalPages: 1 });
    } catch (requestError) {
      console.error('Gagal mengambil daftar dokumen pelayanan:', requestError);
      setError(getErrorMessage(requestError, 'Gagal memuat daftar dokumen.'));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, publishedFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (document) => {
    setEditTarget(document);
    setForm({
      title: document.title,
      category: document.category,
      is_published: Boolean(document.is_published),
      file: null,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFormError('Hanya berkas PDF yang dapat diunggah.');
      event.target.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFormError('Ukuran berkas PDF melebihi batas 15 MB.');
      event.target.value = '';
      return;
    }
    setForm((current) => ({ ...current, file }));
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError('Judul dokumen wajib diisi.');
      return;
    }
    if (!form.category) {
      setFormError('Kategori dokumen wajib dipilih.');
      return;
    }
    if (!editTarget && !form.file) {
      setFormError('Berkas dokumen PDF wajib diunggah.');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title.trim());
    formData.append('category', form.category);
    formData.append('is_published', form.is_published ? 'true' : 'false');
    if (form.file) formData.append('file', form.file);

    setSubmitting(true);
    try {
      if (editTarget) {
        await serviceDocumentApi.update(editTarget.id, formData);
        showToast('Dokumen berhasil diperbarui.');
      } else {
        await serviceDocumentApi.create(formData);
        showToast('Dokumen berhasil disimpan.');
      }
      setFormOpen(false);
      setEditTarget(null);
      await fetchDocuments();
    } catch (submitError) {
      console.error('Gagal menyimpan dokumen pelayanan:', submitError);
      setFormError(getErrorMessage(submitError, 'Dokumen gagal disimpan. Periksa berkas lalu coba kembali.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await serviceDocumentApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Dokumen berhasil dihapus.');
      await fetchDocuments();
    } catch (deleteError) {
      console.error('Gagal menghapus dokumen pelayanan:', deleteError);
      showToast(getErrorMessage(deleteError, 'Dokumen gagal dihapus.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (document) => {
    setBusyDownloadId(document.id);
    try {
      await serviceDocumentApi.downloadAdmin(document.id, document.file_name || `${document.title}.pdf`);
    } catch (downloadError) {
      console.error('Gagal mengunduh dokumen pelayanan:', downloadError);
      showToast(getErrorMessage(downloadError, 'Dokumen gagal diunduh.'), 'error');
    } finally {
      setBusyDownloadId(null);
    }
  };

  const totalPages = pagination.totalPages || 1;
  const startRecord = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <section className="space-y-5 pb-10">
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
            toast.type === 'error'
              ? 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger'
              : 'border-brand-200 bg-brand-50 text-brand-900'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-ink">
            Unduh Dokumen Seputar Pelayanan Surat Tanda Tashih/Izin Edar
          </h2>
          <p className="mt-1 text-xs text-ink-muted">Kelola dokumen unduhan, kategori, dan status publikasinya.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-800"
        >
          <Plus className="h-4 w-4" /> Tambah Dokumen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="service-document-admin-category" className="mb-1 block text-xs font-semibold text-ink-muted">Filter Kategori</label>
          <div className="relative">
            <select
              id="service-document-admin-category"
              value={categoryFilter}
              onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}
              className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2 pr-8 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="ALL">Semua Kategori</option>
              {SERVICE_DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          </div>
        </div>
        <div>
          <label htmlFor="service-document-admin-status" className="mb-1 block text-xs font-semibold text-ink-muted">Status Publikasi</label>
          <div className="relative">
            <select
              id="service-document-admin-status"
              value={publishedFilter}
              onChange={(event) => { setPublishedFilter(event.target.value); setPage(1); }}
              className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2 pr-8 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="true">Dipublikasikan</option>
              <option value="false">Draf / Belum Publikasi</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          </div>
        </div>
        <div>
          <label htmlFor="service-document-admin-limit" className="mb-1 block text-xs font-semibold text-ink-muted">Tampilkan Baris</label>
          <div className="relative">
            <select
              id="service-document-admin-limit"
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
              className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2 pr-8 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              {[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size} baris</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {error && !loading && (
          <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-6 w-6 text-civic-danger" />
            <p className="text-xs font-semibold text-ink">{error}</p>
            <button type="button" onClick={fetchDocuments} className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800">
              Muat Ulang
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-subtle text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th scope="col" className="w-16 px-4 py-3 text-center">No</th>
                <th scope="col" className="min-w-[220px] px-4 py-3">Judul Dokumen</th>
                <th scope="col" className="min-w-[220px] px-4 py-3">Kategori</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="min-w-[180px] px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {loading && <tr><td colSpan="5" className="px-4 py-12 text-center text-ink-muted">Memuat daftar dokumen...</td></tr>}
              {!loading && !error && documents.length === 0 && (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-ink-muted">Belum ada dokumen. Tambahkan dokumen pertama untuk memulai.</td></tr>
              )}
              {!loading && !error && documents.map((document, index) => (
                <tr key={document.id} className="hover:bg-surface-subtle/70">
                  <td className="px-4 py-3 text-center font-semibold text-ink-muted">
                    {(pagination.page - 1) * pagination.limit + index + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{document.title}</td>
                  <td className="px-4 py-3">{document.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                      document.is_published
                        ? 'border-civic-successLine bg-civic-successSoft text-civic-success'
                        : 'border-line bg-surface-subtle text-ink-muted'
                    }`}>
                      {document.is_published ? 'Dipublikasikan' : 'Draf'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownload(document)}
                        disabled={busyDownloadId === document.id}
                        aria-label={`Unduh ${document.title}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" /><span>Unduh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(document)}
                        aria-label={`Edit ${document.title}`}
                        className="rounded-lg border border-line p-1.5 text-ink hover:bg-surface-subtle"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(document)}
                        aria-label={`Hapus ${document.title}`}
                        className="rounded-lg border border-line p-1.5 text-civic-danger hover:bg-civic-dangerSoft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error && documents.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs sm:flex-row">
            <span className="text-ink-muted">Menampilkan {startRecord}-{endRecord} dari {pagination.total} dokumen</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={pagination.page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 font-medium text-ink hover:bg-surface-subtle disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
              </button>
              <span className="font-semibold">Halaman {pagination.page} dari {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={pagination.page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 font-medium text-ink hover:bg-surface-subtle disabled:opacity-40">
                Berikutnya <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="service-document-form-title">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-brand-200 bg-brand-50 p-2 text-brand-700"><Upload className="h-5 w-5" /></span>
                <div>
                  <h3 id="service-document-form-title" className="text-base font-bold text-ink">
                    {editTarget ? 'Edit Dokumen Unduhan' : 'Tambah Dokumen Unduhan'}
                  </h3>
                  <p className="text-xs text-ink-muted">Unggah berkas PDF dan lengkapi informasi dokumen.</p>
                </div>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Tutup form" className="rounded-lg p-1 text-ink-muted hover:bg-surface-subtle">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3 text-xs font-medium text-civic-danger"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="service-document-file" className="mb-1 block font-semibold text-ink">
                  Dokumen PDF {!editTarget && <span className="text-civic-danger">*</span>}
                </label>
                <div className="rounded-xl border-2 border-dashed border-line bg-surface-subtle p-4">
                  <input id="service-document-file" type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="block w-full text-xs text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700" />
                  <p className="mt-2 text-[11px] text-ink-muted">
                    {form.file?.name || (editTarget ? `Berkas tersimpan: ${editTarget.file_name}. Pilih file baru jika ingin menggantinya.` : 'Format PDF, ukuran maksimal 15 MB.')}
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="service-document-title" className="mb-1 block font-semibold text-ink">Judul Dokumen <span className="text-civic-danger">*</span></label>
                <input id="service-document-title" type="text" required maxLength={255} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </div>
              <div>
                <label htmlFor="service-document-category-select" className="mb-1 block font-semibold text-ink">Kategori <span className="text-civic-danger">*</span></label>
                <div className="relative">
                  <select id="service-document-category-select" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full appearance-none rounded-xl border border-line bg-surface px-3 py-2 pr-8 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                    {SERVICE_DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                </div>
              </div>
              <div className="border-t border-line pt-3">
                <label className="flex cursor-pointer items-start gap-2 font-semibold text-ink">
                  <input type="checkbox" checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600" />
                  <span>Publikasikan dokumen ke halaman landing page</span>
                </label>
                <p className="pl-6 pt-1 text-[11px] text-ink-muted">Jika tidak dicentang, dokumen tersimpan sebagai draf dan tidak terlihat oleh publik.</p>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-surface-subtle">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {submitting ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Simpan Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-labelledby="service-document-delete-title">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <h3 id="service-document-delete-title" className="text-base font-bold text-ink">Hapus Dokumen?</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">Dokumen “{deleteTarget.title}” beserta berkasnya akan dihapus.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle">Batal</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-xl bg-civic-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {deleting ? 'Menghapus...' : 'Hapus Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ServiceDocumentManagement;
