import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Lock, X, BookCheck } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass, OPTION_PRESETS, unsurLabel } from './survey-constants';

const EMPTY = { text: '', type: 'PILIHAN', survey_id: '', unsur_id: '', options: OPTION_PRESETS[0].options };

// Bank soal dikelompokkan per unsur (urutan dari server); pertanyaan lama tanpa unsur di grup terakhir.
const groupByUnsur = (questions) => {
  const groups = new Map();
  for (const q of questions) {
    const key = q.unsur_id || 'none';
    if (!groups.has(key)) groups.set(key, { unsur: q.unsur, items: [] });
    groups.get(key).items.push(q);
  }
  return [...groups.values()];
};

export function QuestionBankTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unsurFilter, setUnsurFilter] = useState('');
  const [unsurList, setUnsurList] = useState([]);
  const [surveyList, setSurveyList] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    surveyApi.listQuestions({ search: search.trim() || undefined, unsur_id: unsurFilter || undefined })
      .then((res) => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, unsurFilter]);

  useEffect(load, [load]);
  useEffect(() => { surveyApi.listUnsur().then((r) => setUnsurList(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { surveyApi.listSurveys().then((r) => setSurveyList(r.data || [])).catch(() => {}); }, []);
  const formUnsur = unsurList.find((u) => u.id === form?.unsur_id);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { text: form.text, type: form.type, unsur_id: form.unsur_id, survey_id: form.survey_id || null, options: form.type === 'PILIHAN' ? form.options : [] };
      if (form.id) await surveyApi.updateQuestion(form.id, body);
      else await surveyApi.createQuestion(body);
      showToast(form.id ? 'Pertanyaan diperbarui.' : 'Pertanyaan ditambahkan.', 'success');
      setForm(null);
      load();
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  const [seeding, setSeeding] = useState(false);
  // Mengisi pertanyaan Data Persepsi baku Pedoman PANRB 9/2024; aman ditekan berulang.
  const seedStandard = async () => {
    setSeeding(true);
    try {
      const { data } = await surveyApi.seedStandardQuestions();
      const parts = [data.created ? `${data.created} pertanyaan baku ditambahkan` : 'Semua pertanyaan baku sudah ada di bank soal'];
      if (data.created && data.existing) parts.push(`${data.existing} sudah ada sebelumnya`);
      if (data.missing_unsur.length) parts.push(`unsur ${data.missing_unsur.join(", ")} tidak ditemukan — tekan Pulihkan Unsur Baku PANRB di Nama Unsur, lalu ulangi`);
      showToast(`${parts.join("; ")}.`, data.missing_unsur.length ? 'danger' : 'success');
      load();
    } catch { /* sudah ditampilkan apiClient */ } finally {
      setSeeding(false);
    }
  };

  const run = async (fn, message, duration) => {
    try { await fn(); showToast(message, 'success', duration); load(); } catch { /* sudah ditampilkan */ }
  };

  const setOption = (index, patch) =>
    setForm({ ...form, options: form.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">Pertanyaan yang sudah dijawab responden terkunci; gunakan Duplikat untuk membuat versi baru.</p>
        <div className="flex items-center gap-2">
          <select className={`${inputClass} w-56`} aria-label="Filter unsur" value={unsurFilter} onChange={(e) => setUnsurFilter(e.target.value)}>
            <option value="">Semua unsur</option>
            {unsurList.map((u) => <option key={u.id} value={u.id}>{unsurLabel(u)}</option>)}
          </select>
          <input className={`${inputClass} w-56`} placeholder="Cari pertanyaan…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari pertanyaan" />
          <Button size="sm" variant="outline" disabled={seeding} onClick={seedStandard} title="Isi 12 pertanyaan Data Persepsi baku (Pedoman PANRB 9/2024, varian Campuran) ke unsur masing-masing">
            <BookCheck className="w-4 h-4" /> {seeding ? 'Mengisi…' : 'Isi Pertanyaan Baku PANRB'}
          </Button>
          <Button size="sm" onClick={() => setForm({ ...EMPTY, unsur_id: unsurFilter })}><Plus className="w-4 h-4" /> Tambah Pertanyaan</Button>
        </div>
      </div>

      {!loading && !items.length ? (
        <EmptyState title="Belum ada pertanyaan" description="Tambahkan pertanyaan beserta opsi jawabannya, lalu masukkan ke survei." />
      ) : (
        <div className="space-y-5">
          {groupByUnsur(items).map((group) => (
          <section key={group.unsur?.id || 'none'} className="space-y-2.5" aria-label={group.unsur ? `Pertanyaan unsur ${group.unsur.name}` : 'Pertanyaan tanpa unsur'}>
            <h3 className="text-sm font-bold text-ink">
              {group.unsur ? unsurLabel(group.unsur) : 'Belum dikelompokkan ke unsur'}
              <span className="ml-2 text-xs font-normal text-ink-muted">{group.items.length} pertanyaan</span>
            </h3>
          {group.items.map((q) => {
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
                  <span className="text-xs text-ink-muted">
                    {q.items?.length ? `Dipakai di: ${q.items.map((i) => i.survey.name).join(", ")}` : 'Belum dipakai di survei'} · {q._count?.answers || 0} jawaban
                  </span>
                  <div className="flex gap-1.5">
                    {!locked && <Button size="sm" variant="ghost" aria-label="Ubah pertanyaan" onClick={() => setForm({ id: q.id, text: q.text, type: q.type, survey_id: '', unsur_id: q.unsur_id || '', options: q.options.map(({ label, value }) => ({ label, value })) })}><Pencil className="w-4 h-4" /></Button>}
                    <Button size="sm" variant="ghost" aria-label="Duplikat pertanyaan" onClick={() => run(() => surveyApi.duplicateQuestion(q.id), 'Pertanyaan diduplikat.')}><Copy className="w-4 h-4" /></Button>
                    {!q._count?.items && !locked && (
                      <Button size="sm" variant="ghost" aria-label="Hapus pertanyaan" onClick={() => run(() => surveyApi.deleteQuestion(q.id), 'Pertanyaan dihapus.', 2000)}>
                        <Trash2 className="w-4 h-4 text-civic-danger" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          </section>
          ))}
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'} size="lg">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <FormField label="Nama survei" hint="Opsional. Pertanyaan langsung masuk ke susunan survei ini; kosongkan bila hanya disimpan di bank soal.">
              <select className={inputClass} value={form.survey_id} onChange={(e) => setForm({ ...form, survey_id: e.target.value })}>
                <option value="">Tidak dimasukkan ke survei</option>
                {surveyList.map((sv) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
              </select>
            </FormField>
            <FormField label="Unsur" required hint={formUnsur?.definition || 'Pertanyaan akan muncul di Pemilihan Survei saat unsur ini dipilih.'}>
              <select className={inputClass} required value={form.unsur_id} onChange={(e) => setForm({ ...form, unsur_id: e.target.value })}>
                <option value="">Pilih unsur…</option>
                {unsurList.map((u) => <option key={u.id} value={u.id}>{unsurLabel(u)}</option>)}
              </select>
            </FormField>
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
