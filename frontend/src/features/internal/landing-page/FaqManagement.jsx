import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { faqApi, FAQ_CATEGORIES_OPTIONS } from '@/api/faq.api';

const EMPTY_FORM = {
  category: FAQ_CATEGORIES_OPTIONS[0].value,
  question: '',
  answer: '',
  is_published: false,
};

const EMPTY_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getCategoryLabel(value) {
  return FAQ_CATEGORIES_OPTIONS.find((category) => category.value === value)?.label || value;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-[90] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
        toast.type === 'error'
          ? 'border-civic-dangerLine bg-civic-dangerSoft text-civic-danger'
          : 'border-brand-200 bg-brand-50 text-brand-900'
      }`}
    >
      {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
      <span className="text-sm font-semibold">{toast.message}</span>
    </div>
  );
}

function FaqText({ value }) {
  return (
    <div className="space-y-3 whitespace-pre-line text-sm leading-7 text-ink">
      {String(value || '').split(/\n{2,}/).map((paragraph, index) => <p key={`faq-text-${index}`}>{paragraph}</p>)}
    </div>
  );
}

export function FaqManagement() {
  const [faqs, setFaqs] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState('');
  const [publication, setPublication] = useState('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewFaq, setViewFaq] = useState(null);
  const [deleteFaq, setDeleteFaq] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await faqApi.listAdmin({
        page,
        limit,
        search,
        ...(category ? { category } : {}),
        is_published: publication,
      });
      setFaqs(response.data || []);
      setPagination(response.pagination || { ...EMPTY_PAGINATION, page, limit });
    } catch (requestError) {
      setFaqs([]);
      setError(requestError.message || 'Daftar FAQ tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, category, publication]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchValue.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const openNewFaq = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setFormOpen(true);
  };

  const openEditFaq = async (item) => {
    setFormError('');
    try {
      const response = await faqApi.getAdmin(item.id);
      setEditingId(response.data.id);
      setForm({
        category: response.data.category,
        question: response.data.question,
        answer: response.data.answer,
        is_published: Boolean(response.data.is_published),
      });
      setFormOpen(true);
    } catch (requestError) {
      showToast(requestError.message || 'FAQ tidak dapat dimuat untuk diedit.', 'error');
    }
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
  };

  const saveFaq = async (isPublished) => {
    setFormError('');
    if (form.question.trim().length < 3) {
      setFormError('Judul pertanyaan minimal 3 karakter.');
      return;
    }
    if (!form.answer.trim()) {
      setFormError('Jawaban wajib diisi.');
      return;
    }
    if (form.answer.trim().length > 10_000) {
      setFormError('Jawaban maksimal 10.000 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: form.category,
        question: form.question.trim(),
        answer: form.answer.trim(),
        is_published: isPublished,
      };
      if (editingId) {
        await faqApi.update(editingId, payload);
        showToast(isPublished ? 'FAQ berhasil diperbarui dan dipublikasikan.' : 'FAQ berhasil diperbarui sebagai draft.');
      } else {
        await faqApi.create(payload);
        showToast(isPublished ? 'FAQ berhasil dipublikasikan.' : 'FAQ berhasil disimpan sebagai draft.');
      }
      setFormOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setPage(1);
      await fetchFaqs();
    } catch (requestError) {
      setFormError(requestError.message || 'FAQ tidak dapat disimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteFaq) return;
    setDeleting(true);
    try {
      await faqApi.delete(deleteFaq.id);
      setDeleteFaq(null);
      showToast('FAQ berhasil dihapus.');
      await fetchFaqs();
    } catch (requestError) {
      showToast(requestError.message || 'FAQ tidak dapat dihapus.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setCategory('');
    setPublication('ALL');
    setSearchValue('');
    setSearch('');
    setPage(1);
  };

  return (
    <section className="space-y-5" aria-labelledby="faq-management-title">
      <Toast toast={toast} />
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800">Konten publik landing page</span>
          <h2 id="faq-management-title" className="mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Kelola FAQ</h2>
          <p className="mt-1 text-sm text-ink-muted">Buat, perbarui, dan atur publikasi pertanyaan yang sering diajukan.</p>
        </div>
        <button type="button" onClick={openNewFaq} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
          <Plus className="h-4 w-4" /> Tambah FAQ
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_minmax(180px,220px)_minmax(160px,200px)_auto] md:items-end">
        <label className="relative block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Cari FAQ</span>
          <Search className="pointer-events-none absolute left-3 top-[calc(50%+8px)] h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Cari pertanyaan atau jawaban..."
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pl-9 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Kategori</span>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink">
            <option value="">Semua Kategori</option>
            {FAQ_CATEGORIES_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Status Publikasi</span>
          <select value={publication} onChange={(event) => { setPublication(event.target.value); setPage(1); }} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink">
            <option value="ALL">Semua Status</option>
            <option value="true">Dipublikasikan</option>
            <option value="false">Draft</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Baris
            <select aria-label="Baris per halaman FAQ" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink">
              {[5, 10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={resetFilters} className="rounded-lg px-2 py-2 text-xs font-semibold text-brand-fg hover:bg-brand-50">Reset</button>
        </div>
      </div>

      {loading && <div className="space-y-3 rounded-2xl border border-line bg-surface p-5" aria-busy="true" aria-label="Memuat FAQ"><div className="h-10 animate-pulse rounded-lg bg-surface-subtle" /><div className="h-10 animate-pulse rounded-lg bg-surface-subtle" /></div>}
      {!loading && error && (
        <div className="rounded-2xl border border-civic-dangerLine bg-civic-dangerSoft p-6 text-sm text-civic-danger" role="alert">
          <AlertCircle className="mr-2 inline h-4 w-4" />{error}
          <button type="button" onClick={fetchFaqs} className="ml-3 font-semibold underline">Muat ulang</button>
        </div>
      )}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-line bg-surface-subtle text-xs font-bold uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="w-16 px-4 py-3">No</th>
                <th scope="col" className="w-56 px-4 py-3">Kategori</th>
                <th scope="col" className="px-4 py-3">Judul Pertanyaan</th>
                <th scope="col" className="w-36 px-4 py-3">Status Publikasi</th>
                <th scope="col" className="w-36 px-4 py-3">Tanggal Dibuat</th>
                <th scope="col" className="w-48 px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {faqs.length ? faqs.map((item, index) => (
                <tr key={item.id} className="align-top hover:bg-surface-subtle/60">
                  <td className="px-4 py-4 text-ink-muted">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                  <td className="px-4 py-4 text-ink">{getCategoryLabel(item.category)}</td>
                  <td className="px-4 py-4 font-semibold leading-6 text-ink">{item.question}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${item.is_published ? 'border-civic-successLine bg-civic-successSoft text-civic-success' : 'border-line bg-surface-subtle text-ink-muted'}`}>
                      {item.is_published ? 'Dipublikasikan' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-ink-muted">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-1.5">
                      <button type="button" onClick={() => setViewFaq(item)} aria-label={`Lihat ${item.question}`} title="Lihat" className="rounded-lg border border-line p-2 text-ink-muted hover:bg-surface-subtle hover:text-brand-700"><Eye className="h-4 w-4" /></button>
                      <button type="button" onClick={() => openEditFaq(item)} aria-label={`Edit ${item.question}`} title="Edit" className="rounded-lg border border-line p-2 text-ink-muted hover:bg-surface-subtle hover:text-brand-700"><Edit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setDeleteFaq(item)} aria-label={`Hapus ${item.question}`} title="Hapus" className="rounded-lg border border-line p-2 text-civic-danger hover:bg-civic-dangerSoft"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-muted">Belum ada FAQ yang sesuai dengan filter.</td></tr>
              )}
            </tbody>
          </table>
          {pagination.total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-surface-subtle/50 p-4 sm:flex-row">
              <p className="text-xs text-ink-muted">Menampilkan {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} FAQ</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya</button>
                <span className="text-xs text-ink-muted">{pagination.page} / {pagination.totalPages || 1}</span>
                <button type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink disabled:opacity-40">Berikutnya <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="faq-form-title">
          <form onSubmit={(event) => { event.preventDefault(); saveFaq(form.is_published); }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between border-b border-line pb-4">
              <div>
                <h3 id="faq-form-title" className="text-lg font-bold text-ink">{editingId ? 'Edit FAQ' : 'Tambah FAQ'}</h3>
                <p className="mt-1 text-sm text-ink-muted">Lengkapi kategori, pertanyaan, jawaban, dan status publikasi.</p>
              </div>
              <button type="button" onClick={closeForm} aria-label="Tutup form" className="rounded-lg p-2 text-ink-muted hover:bg-surface-subtle"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Kategori</span>
                <select required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink">
                  {FAQ_CATEGORIES_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Judul Pertanyaan</span>
                <input required minLength={3} maxLength={255} value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand-600 focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Jawaban</span>
                <textarea required maxLength={10_000} rows={8} value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-ink focus:border-brand-600 focus:outline-none" placeholder="Tulis jawaban dengan paragraf yang jelas..." />
                <span className="mt-1 block text-right text-xs text-ink-muted">{form.answer.length}/10.000 karakter</span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Status Publikasi</span>
                <select value={String(form.is_published)} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.value === 'true' }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink">
                  <option value="false">Draft</option>
                  <option value="true">Dipublikasikan</option>
                </select>
              </label>
            </div>
            {formError && <p className="mt-4 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft p-3 text-sm text-civic-danger" role="alert">{formError}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <button type="button" onClick={closeForm} disabled={submitting} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle">Batal</button>
              <button type="button" onClick={() => saveFaq(false)} disabled={submitting} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50">{submitting ? 'Menyimpan...' : 'Simpan Draft'}</button>
              <button type="button" onClick={() => saveFaq(true)} disabled={submitting} className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{submitting ? 'Menyimpan...' : 'Publikasikan'}</button>
            </div>
          </form>
        </div>
      )}

      {viewFaq && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="faq-detail-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold text-brand-fg">{getCategoryLabel(viewFaq.category)}</p>
                <h3 id="faq-detail-title" className="mt-1 text-lg font-bold text-ink">{viewFaq.question}</h3>
              </div>
              <button type="button" onClick={() => setViewFaq(null)} aria-label="Tutup detail FAQ" className="rounded-lg p-2 text-ink-muted hover:bg-surface-subtle"><X className="h-5 w-5" /></button>
            </div>
            <div className="py-5"><FaqText value={viewFaq.answer} /></div>
            <div className="flex items-center justify-between border-t border-line pt-4 text-xs text-ink-muted">
              <span>{viewFaq.is_published ? 'Dipublikasikan' : 'Draft'}</span>
              <span>Dibuat {formatDate(viewFaq.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      {deleteFaq && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="faq-delete-title">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <h3 id="faq-delete-title" className="text-lg font-bold text-ink">Hapus FAQ?</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">FAQ “{deleteFaq.question}” akan dihapus permanen dan tidak lagi ditampilkan.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteFaq(null)} disabled={deleting} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink">Batal</button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl bg-civic-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <Trash2 className="h-4 w-4" />{deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
