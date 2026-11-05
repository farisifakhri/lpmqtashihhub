import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Lock, X } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass, OPTION_PRESETS } from './survey-constants';

const EMPTY = { text: '', type: 'PILIHAN', options: OPTION_PRESETS[0].options };

export function QuestionBankTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    surveyApi.listQuestions({ search: search.trim() || undefined })
      .then((res) => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(load, [load]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { text: form.text, type: form.type, options: form.type === 'PILIHAN' ? form.options : [] };
      if (form.id) await surveyApi.updateQuestion(form.id, body);
      else await surveyApi.createQuestion(body);
      showToast(form.id ? 'Pertanyaan diperbarui.' : 'Pertanyaan ditambahkan.', 'success');
      setForm(null);
      load();
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  const run = async (fn, message) => {
    try { await fn(); showToast(message, 'success'); load(); } catch { /* sudah ditampilkan */ }
  };

  const setOption = (index, patch) =>
    setForm({ ...form, options: form.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Bank Pertanyaan</h2>
          <p className="text-xs text-ink-muted">Pertanyaan yang sudah dijawab responden terkunci; gunakan Duplikat untuk membuat versi baru.</p>
        </div>
        <div className="flex items-center gap-2">
          <input className={`${inputClass} w-56`} placeholder="Cari pertanyaan…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari pertanyaan" />
          <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Tambah Pertanyaan</Button>
        </div>
      </div>

      {!loading && !items.length ? (
        <EmptyState title="Belum ada pertanyaan" description="Tambahkan pertanyaan beserta opsi jawabannya, lalu masukkan ke survei." />
      ) : (
        <div className="space-y-2.5">
          {items.map((q) => {
            const locked = q._count?.answers > 0;
            return (
              <article key={q.id} className="rounded-xl border border-line bg-white p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="flex-1 min-w-0 text-sm text-ink">{q.text}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={q.type === 'PILIHAN' ? 'info' : 'default'}>{q.type === 'PILIHAN' ? 'Pilihan' : 'Esai'}</Badge>
                    {locked && <Badge variant="warning" icon={<Lock className="w-3 h-3" />}>Terkunci</Badge>}
                  </div>
                </div>
                {q.options?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((o) => (
                      <span key={o.id} className="rounded-md border border-line bg-surface-subtle px-2 py-0.5 text-xs text-ink">
                        {o.label} <strong className="text-brand-800">({o.value})</strong>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-muted">Dipakai di {q._count?.items || 0} survei · {q._count?.answers || 0} jawaban</span>
                  <div className="flex gap-1.5">
                    {!locked && <Button size="sm" variant="ghost" aria-label="Ubah pertanyaan" onClick={() => setForm({ id: q.id, text: q.text, type: q.type, options: q.options.map(({ label, value }) => ({ label, value })) })}><Pencil className="w-4 h-4" /></Button>}
                    <Button size="sm" variant="ghost" aria-label="Duplikat pertanyaan" onClick={() => run(() => surveyApi.duplicateQuestion(q.id), 'Pertanyaan diduplikat.')}><Copy className="w-4 h-4" /></Button>
                    {!q._count?.items && !locked && (
                      <Button size="sm" variant="ghost" aria-label="Hapus pertanyaan" onClick={() => window.confirm('Hapus pertanyaan ini?') && run(() => surveyApi.deleteQuestion(q.id), 'Pertanyaan dihapus.')}>
                        <Trash2 className="w-4 h-4 text-civic-danger" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'} size="lg">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <FormField label="Teks pertanyaan" required>
              <textarea className={inputClass} rows={3} minLength={5} maxLength={2000} required value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
            </FormField>
            <fieldset className="space-y-1.5">
              <legend className="text-[13px] font-semibold text-ink">Tipe</legend>
              <div className="flex gap-4 text-sm">
                {[['PILIHAN', 'Pilihan (skala nilai)'], ['ESAI', 'Esai (isian bebas, tidak dihitung ke indeks)']].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input type="radio" name="question-type" value={value} checked={form.type === value} onChange={() => setForm({ ...form, type: value })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.type === 'PILIHAN' && (
              <div className="space-y-2.5 rounded-xl border border-line bg-surface-subtle/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-ink">Isi cepat:</span>
                  {OPTION_PRESETS.map((p) => (
                    <Button key={p.id} type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, options: p.options })}>{p.label}</Button>
                  ))}
                </div>
                <p className="text-xs text-ink-muted">Nilai 4 = jawaban terbaik, 1 = terburuk. Untuk pertanyaan negatif (mis. pungutan liar), "Tidak pernah" bernilai 4.</p>
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className={inputClass} aria-label={`Label opsi ${i + 1}`} value={o.label} required maxLength={150} onChange={(e) => setOption(i, { label: e.target.value })} />
                    <select className={`${inputClass} w-24`} aria-label={`Nilai opsi ${i + 1}`} value={o.value} onChange={(e) => setOption(i, { value: Number(e.target.value) })}>
                      {[4, 3, 2, 1].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <Button type="button" size="sm" variant="ghost" aria-label={`Hapus opsi ${i + 1}`} disabled={form.options.length <= 2}
                      onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {form.options.length < 10 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, options: [...form.options, { label: '', value: 1 }] })}>
                    <Plus className="w-4 h-4" /> Tambah opsi
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
