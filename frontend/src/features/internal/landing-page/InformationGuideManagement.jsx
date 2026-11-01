import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { informationGuideApi } from '@/api/information-guide.api';
import { InformationGuideContent } from '@/features/information/InformationGuideContent';
import { InformationGuideEditor, prepareInformationGuideHtml } from '@/features/information/InformationGuideEditor';

const EMPTY_FORM = {
  title: '',
  content_type: 'EDITOR',
  content_html: '',
  is_published: false,
  file: null,
};

function isSupportedGuideFile(file) {
  return /\.(pdf|doc|docx)$/i.test(file.name) && file.size <= 15 * 1024 * 1024;
}

function getErrorMessage(error) {
  return error?.message || 'Panduan tidak dapat diproses. Silakan coba kembali.';
}

export function InformationGuideManagement() {
  const [guides, setGuides] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [published, setPublished] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const [editorOpen, setEditorOpen] = useState(false);
  const [guideId, setGuideId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await informationGuideApi.listAdmin({
        page,
        limit: pagination.limit,
        search,
        is_published: published,
      });
      setGuides(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setGuides([]);
    } finally {
      setLoading(false);
    }
  }, [page, pagination.limit, search, published]);

  useEffect(() => { fetchGuides(); }, [fetchGuides]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchValue.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => () => {
    if (previewFileUrl) URL.revokeObjectURL(previewFileUrl);
  }, [previewFileUrl]);

  const openNewGuide = () => {
    setGuideId(null);
    setForm({ ...EMPTY_FORM });
    setFileInputKey((key) => key + 1);
    setFormError('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setGuideId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
  };

  const openEdit = async (item) => {
    setFormError('');
    try {
      const response = await informationGuideApi.getAdmin(item.id);
      setGuideId(response.data.id);
      setForm({
        title: response.data.title,
        content_type: response.data.content_type,
        content_html: response.data.content_html || '',
        is_published: Boolean(response.data.is_published),
        file: null,
        file_name: response.data.file_name,
      });
      setFileInputKey((key) => key + 1);
      setEditorOpen(true);
    } catch (requestError) {
      setNoticeType('error');
      setNotice(getErrorMessage(requestError));
    }
  };

  const openPreview = async (item) => {
    setPreviewError('');
    setPreviewFileUrl('');
    try {
      const response = await informationGuideApi.getAdmin(item.id);
      setPreview(response.data);
      if (response.data.content_type === 'DOCUMENT' && response.data.mime_type === 'application/pdf') {
        const url = await informationGuideApi.fetchFileBlobUrl(item.id, { admin: true });
        setPreviewFileUrl(url);
      }
    } catch (requestError) {
      setNoticeType('error');
      setPreviewError(getErrorMessage(requestError));
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isSupportedGuideFile(file)) {
      setFormError('Pilih berkas PDF, DOC, atau DOCX berukuran maksimal 15 MB.');
      event.target.value = '';
      return;
    }
    setForm((current) => ({ ...current, file }));
    setFormError('');
  };

  const submitGuide = async (event) => {
    event.preventDefault();
    setFormError('');
    if (form.title.trim().length < 3) {
      setFormError('Judul panduan minimal 3 karakter.');
      return;
    }
    if (form.content_type === 'DOCUMENT' && !form.file && !guideId) {
      setFormError('Berkas panduan wajib diunggah.');
      return;
    }
    setSubmitting(true);
    try {
      const contentHtml = form.content_type === 'EDITOR'
        ? prepareInformationGuideHtml(form.content_html)
        : '';
      let payload;
      if (form.content_type === 'DOCUMENT' || form.file) {
        payload = new FormData();
        payload.append('title', form.title.trim());
        payload.append('content_type', form.content_type);
        payload.append('is_published', String(form.is_published));
        if (form.content_type === 'EDITOR') payload.append('content_html', contentHtml);
        if (form.file) payload.append('file', form.file);
      } else {
        payload = {
          title: form.title.trim(),
          content_type: form.content_type,
          content_html: contentHtml,
          is_published: form.is_published,
        };
      }

      const response = guideId
        ? await informationGuideApi.update(guideId, payload)
        : await informationGuideApi.create(payload);
      const savedGuide = response.data;
      setGuideId(savedGuide.id);
      setForm((current) => ({
        ...current,
        title: savedGuide.title,
        content_type: savedGuide.content_type,
        content_html: savedGuide.content_html || '',
        is_published: Boolean(savedGuide.is_published),
        file: null,
        file_name: savedGuide.file_name,
      }));
      setFileInputKey((key) => key + 1);
      setNoticeType('success');
      setNotice(savedGuide.content_type === 'EDITOR' && !savedGuide.is_published
        ? 'Draf tersimpan. Anda dapat melanjutkan mengunggah gambar atau memperbarui konten.'
        : 'Panduan berhasil disimpan.');
      fetchGuides();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await informationGuideApi.delete(deleteTarget.id);
      setNoticeType('success');
      setNotice('Panduan berhasil dihapus.');
      setDeleteTarget(null);
      fetchGuides();
    } catch (requestError) {
      setNoticeType('error');
      setNotice(getErrorMessage(requestError));
    } finally {
      setDeleting(false);
    }
  };

  const downloadGuide = async (item) => {
    try {
      await informationGuideApi.download(item.id, item.file_name || item.title, { admin: true });
    } catch (requestError) {
      setNoticeType('error');
      setNotice(getErrorMessage(requestError));
    }
  };

  const firstRecord = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <section className="space-y-5" aria-labelledby="guide-management-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="guide-management-title" className="text-lg font-bold text-ink">Panduan Permohonan Surat Tanda Tashih/Izin Edar</h2>
          <p className="mt-1 text-xs text-ink-muted">Kelola panduan dalam bentuk berkas atau konten editor rich-text.</p>
        </div>
        <button type="button" onClick={openNewGuide} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-800">
          <Plus className="h-4 w-4" /> Tambah Panduan
        </button>
      </div>

      {notice && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-medium ${
          noticeType === 'error'
            ? 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger'
            : 'border-brand-200 bg-brand-50 text-brand-800'
        }`} role={noticeType === 'error' ? 'alert' : 'status'}>
          <span>{notice}</span>
          <button type="button" className="ml-3 text-brand-800" aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <span className="sr-only">Cari panduan</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Cari judul panduan..."
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </label>
          <label>
            <span className="sr-only">Filter status publikasi</span>
            <select
              value={published}
              onChange={(event) => { setPublished(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="ALL">Semua status</option>
              <option value="true">Dipublikasikan</option>
              <option value="false">Draf</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {loading && <div className="space-y-3 p-5" aria-busy="true" aria-label="Memuat panduan">{[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-surface-subtle" />)}</div>}
        {!loading && error && (
          <div className="space-y-3 p-8 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-civic-danger" />
            <p className="text-sm text-ink">{error}</p>
            <button type="button" onClick={fetchGuides} className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
          </div>
        )}
        {!loading && !error && guides.length === 0 && (
          <div className="space-y-2 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-ink-muted" />
            <h3 className="text-sm font-bold text-ink">Belum ada panduan</h3>
            <p className="text-xs text-ink-muted">Tambahkan panduan untuk ditampilkan pada halaman informasi publik.</p>
          </div>
        )}
        {!loading && !error && guides.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-line bg-surface-subtle text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">Judul Panduan</th>
                    <th scope="col" className="px-4 py-3">Bentuk Konten</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Tanggal Diperbarui</th>
                    <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {guides.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-subtle/60">
                      <td className="max-w-[360px] px-4 py-3.5 font-semibold leading-5 text-ink">{item.title}</td>
                      <td className="px-4 py-3.5 text-ink-muted">{item.content_type === 'EDITOR' ? 'Editor rich-text' : 'Berkas dokumen'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.is_published ? 'border-civic-successLine bg-civic-successSoft text-civic-success' : 'border-line bg-surface-subtle text-ink-muted'}`}>
                          {item.is_published ? 'Dipublikasikan' : 'Draf'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">
                        {new Date(item.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => openPreview(item)} title="Pratinjau" aria-label={`Pratinjau ${item.title}`} className="rounded-lg border border-line p-1.5 text-ink hover:bg-surface-subtle"><Eye className="h-3.5 w-3.5" /></button>
                          {item.content_type === 'DOCUMENT' && <button type="button" onClick={() => downloadGuide(item)} title="Unduh" aria-label={`Unduh ${item.title}`} className="rounded-lg border border-line p-1.5 text-ink hover:bg-surface-subtle"><Download className="h-3.5 w-3.5" /></button>}
                          <button type="button" onClick={() => openEdit(item)} title="Edit" aria-label={`Edit ${item.title}`} className="rounded-lg border border-line p-1.5 text-ink hover:bg-surface-subtle"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setDeleteTarget(item)} title="Hapus" aria-label={`Hapus ${item.title}`} className="rounded-lg border border-civic-dangerLine p-1.5 text-civic-danger hover:bg-civic-dangerSoft"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-3 border-t border-line p-4 sm:flex-row">
              <p className="text-xs text-ink-muted">Menampilkan {firstRecord}–{lastRecord} dari {pagination.total} panduan</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-ink disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya</button>
                <span className="text-xs text-ink-muted">{page} / {pagination.totalPages || 1}</span>
                <button type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-ink disabled:opacity-40">Berikutnya <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="guide-editor-title">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <h3 id="guide-editor-title" className="text-base font-bold text-ink">{guideId ? 'Edit Panduan' : 'Tambah Panduan'}</h3>
                <p className="mt-1 text-xs text-ink-muted">Panduan akan tampil ke publik hanya jika status Dipublikasikan.</p>
              </div>
              <button type="button" onClick={closeEditor} aria-label="Tutup formulir" className="rounded-lg p-1 text-ink-muted hover:bg-surface-subtle"><X className="h-5 w-5" /></button>
            </div>
            {formError && <p className="mb-4 flex items-start gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3 text-xs text-civic-danger" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</p>}
            <form onSubmit={submitGuide} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-ink">Judul Panduan <span className="text-civic-danger">*</span></span>
                  <input required minLength={3} maxLength={255} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-ink">Bentuk Konten</span>
                  <select value={form.content_type} onChange={(event) => setForm((current) => ({ ...current, content_type: event.target.value, content_html: event.target.value === 'EDITOR' ? current.content_html : '', file: null }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                    <option value="EDITOR">Editor rich-text</option>
                    <option value="DOCUMENT">Unggah berkas PDF/DOC/DOCX</option>
                  </select>
                </label>
              </div>

              {form.content_type === 'DOCUMENT' ? (
                <div className="space-y-2">
                  <label htmlFor={`guide-file-${fileInputKey}`} className="block text-xs font-semibold text-ink">Berkas panduan <span className="text-civic-danger">*</span></label>
                  <input key={fileInputKey} id={`guide-file-${fileInputKey}`} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFile} className="block w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-800" />
                  <p className="text-[11px] text-ink-muted">{form.file?.name || form.file_name || 'Format PDF, DOC, atau DOCX; maksimal 15 MB.'}</p>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink">Konten Panduan <span className="text-civic-danger">*</span></label>
                  <InformationGuideEditor
                    guideId={guideId}
                    content={form.content_html}
                    onChange={(content_html) => setForm((current) => ({ ...current, content_html }))}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-subtle px-3 py-3 text-xs font-semibold text-ink">
                <input type="checkbox" checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600" />
                Publikasikan panduan
              </label>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-line pt-4 sm:flex-row">
                <button type="button" onClick={closeEditor} className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-subtle">Tutup</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Menyimpan...' : form.is_published ? 'Simpan & Publikasikan' : 'Simpan Draf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(preview || previewError) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="guide-preview-title">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line p-4 sm:p-5">
              <div className="min-w-0">
                <h3 id="guide-preview-title" className="font-bold text-ink">{preview?.title || 'Pratinjau Panduan'}</h3>
                <p className="mt-1 text-xs text-ink-muted">{preview?.is_published ? 'Dipublikasikan' : 'Draf — hanya terlihat oleh admin'}</p>
              </div>
              <button type="button" aria-label="Tutup pratinjau" onClick={() => { setPreview(null); setPreviewError(''); setPreviewFileUrl(''); }} className="rounded-lg p-1 text-ink-muted hover:bg-surface-subtle"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {previewError && <p className="text-sm text-civic-danger" role="alert">{previewError}</p>}
              {preview?.content_type === 'EDITOR' && <InformationGuideContent admin html={preview.content_html || ''} />}
              {preview?.content_type === 'DOCUMENT' && preview.mime_type === 'application/pdf' && previewFileUrl && <iframe title={`Pratinjau ${preview.title}`} src={previewFileUrl} className="h-[65vh] w-full rounded-lg border border-line" />}
              {preview?.content_type === 'DOCUMENT' && preview.mime_type !== 'application/pdf' && (
                <div className="space-y-3 py-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-brand-700" />
                  <p className="text-sm text-ink">Pratinjau langsung tersedia untuk berkas PDF. Unduh berkas Word untuk membukanya.</p>
                  <button type="button" onClick={() => downloadGuide(preview)} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white"><Download className="h-4 w-4" /> Unduh berkas</button>
                </div>
              )}
              {preview?.content_type === 'DOCUMENT' && preview.mime_type === 'application/pdf' && !previewFileUrl && <div className="flex justify-center py-10"><LoaderCircle className="h-6 w-6 animate-spin text-brand-700" /></div>}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-guide-title">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <h3 id="delete-guide-title" className="font-bold text-ink">Hapus panduan?</h3>
            <p className="mt-2 text-sm text-ink-muted">“{deleteTarget.title}” beserta berkas dan gambar terkait akan dihapus.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink">Batal</button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-xl bg-civic-danger px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{deleting ? 'Menghapus...' : 'Hapus panduan'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
