import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Settings2, Power, PowerOff } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass, KIND_OPTIONS, STATUS_BADGE, formatDate, toDateInput } from './survey-constants';

const EMPTY = { name: '', kind: 'IKM', description: '', starts_at: '', ends_at: '' };

export function SurveyListTab({ onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    surveyApi.listSurveys({ search: search.trim() || undefined })
      .then((res) => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(load, [load]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { name: form.name, kind: form.kind, description: form.description || null, starts_at: form.starts_at, ends_at: form.ends_at };
      if (form.id) {
        await surveyApi.updateSurvey(form.id, body);
        showToast('Survei diperbarui.', 'success');
        setForm(null);
        load();
      } else {
        const res = await surveyApi.createSurvey(body);
        showToast('Survei dibuat. Lanjutkan dengan menyusun pertanyaannya.', 'success');
        setForm(null);
        onOpen(res.data.id);
      }
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  const run = async (fn, message) => {
    try { await fn(); showToast(message, 'success'); load(); } catch { /* sudah ditampilkan */ }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <input className={`${inputClass} w-56`} placeholder="Cari nama survei…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari survei" />
          <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Buat Survei</Button>
        </div>
      </div>

      {!loading && !items.length ? (
        <EmptyState title="Belum ada survei" description="Siapkan unsur dan bank pertanyaan, lalu buat survei pertama." actionLabel="Buat Survei" onAction={() => setForm({ ...EMPTY })} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3">Nama Survei</th><th className="p-3">Jenis</th><th className="p-3">Periode</th><th className="p-3">Pertanyaan</th><th className="p-3">Responden</th><th className="p-3">Status</th><th className="p-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((s) => {
                const status = STATUS_BADGE[s.display_status] || STATUS_BADGE.DRAFT;
                const deletable = s.status === 'DRAFT' && !s._count?.responses;
                return (
                  <tr key={s.id}>
                    <td className="p-3"><button type="button" className="text-left font-semibold text-brand-800 hover:underline" onClick={() => onOpen(s.id)}>{s.name}</button></td>
                    <td className="p-3"><Badge variant="info">{s.kind}</Badge></td>
                    <td className="p-3 text-xs text-ink-muted whitespace-nowrap">{formatDate(s.starts_at)} – {formatDate(s.ends_at)}</td>
                    <td className="p-3">{s._count?.items || 0}</td>
                    <td className="p-3">{s._count?.responses || 0}</td>
                    <td className="p-3"><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        {s.status === 'AKTIF' ? (
                          <Button size="sm" variant="danger" onClick={() => run(() => surveyApi.deactivateSurvey(s.id), 'Survei dinonaktifkan.')}><PowerOff className="w-4 h-4" /> Nonaktifkan</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => run(() => surveyApi.activateSurvey(s.id), 'Survei diaktifkan.')}><Power className="w-4 h-4" /> Aktifkan</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onOpen(s.id)}><Settings2 className="w-4 h-4" /> Susun</Button>
                        <Button size="sm" variant="ghost" aria-label={`Ubah ${s.name}`}
                          onClick={() => setForm({ id: s.id, name: s.name, kind: s.kind, description: s.description || '', starts_at: toDateInput(s.starts_at), ends_at: toDateInput(s.ends_at) })}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Duplikat ${s.name}`} onClick={() => run(() => surveyApi.duplicateSurvey(s.id), 'Survei diduplikat sebagai Draf.')}><Copy className="w-4 h-4" /></Button>
                        {deletable && (
                          <Button size="sm" variant="ghost" aria-label={`Hapus ${s.name}`} onClick={() => window.confirm(`Hapus survei "${s.name}"?`) && run(() => surveyApi.deleteSurvey(s.id), 'Survei dihapus.')}>
                            <Trash2 className="w-4 h-4 text-civic-danger" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Survei' : 'Buat Survei'} size="lg">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <FormField label="Nama survei" required hint="Contoh: Survei IKM Triwulan I 2027">
              <input className={inputClass} value={form.name} minLength={3} maxLength={255} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Jenis" required>
              <select className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KIND_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tanggal mulai" required>
                <input type="date" className={inputClass} value={form.starts_at} required onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </FormField>
              <FormField label="Tanggal selesai" required>
                <input type="date" className={inputClass} value={form.ends_at} min={form.starts_at || undefined} required onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Pengantar untuk responden" hint="Opsional. Ditampilkan di atas formulir survei.">
              <textarea className={inputClass} rows={3} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Buat & Susun Pertanyaan'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
