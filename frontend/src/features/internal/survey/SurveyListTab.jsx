import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Power, PowerOff, ListChecks, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { useRowDrag, moveItem } from './useRowDrag';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import {
  inputClass, STATUS_BADGE, STATUS_OPTIONS, formatDate, unsurLabel,
  OPENING_TEXT, CLOSING_TEXT, DEMOGRAPHIC_FIELDS, SATISFACTION_LABELS, ANTI_CORRUPTION_STATEMENTS,
} from './survey-constants';

const QuestionnaireSection = ({ title, children }) => (
  <section className="rounded-lg border border-line p-3 text-sm text-ink space-y-1.5">
    <h5 className="text-xs font-bold text-brand-900">{title}</h5>
    <div className="text-xs leading-relaxed text-ink-muted">{children}</div>
  </section>
);

const EMPTY = { name: '', status: 'DRAFT', itemCount: 0 };
const NO_QUESTIONS_NOTE = 'Catatan: survei belum memiliki pertanyaan, jadi belum bisa diisi penerbit. Susun pertanyaannya di Pemilihan Survei.';

const StatusBadge = ({ survey }) => {
  const status = STATUS_BADGE[survey.display_status] || STATUS_BADGE.DRAFT;
  return <Badge variant={status.variant}>{status.label}</Badge>;
};

// Modal "Lihat": ringkasan survei beserta pertanyaan per unsur (hanya baca).
function SurveyViewModal({ surveyId, onClose, onArrange }) {
  const [survey, setSurvey] = useState(null);
  useEffect(() => {
    if (!surveyId) return;
    setSurvey(null);
    surveyApi.getSurvey(surveyId).then((r) => setSurvey(r.data)).catch(() => onClose());
  }, [surveyId, onClose]);

  return (
    <Modal isOpen={!!surveyId} onClose={onClose} title="Detail Survei" size="lg">
      {!survey ? <p className="text-sm text-ink-muted">Memuat…</p> : (
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-muted">Nama survei</dt><dd className="font-semibold text-ink">{survey.name}</dd>
            <dt className="text-ink-muted">Status</dt><dd><StatusBadge survey={survey} /></dd>
            <dt className="text-ink-muted">Jumlah pertanyaan</dt><dd>{survey._count.items}</dd>
            <dt className="text-ink-muted">Jumlah responden</dt><dd>{survey._count.responses}</dd>
            <dt className="text-ink-muted">Dibuat</dt><dd>{formatDate(survey.created_at)}</dd>
            <dt className="text-ink-muted">Diperbarui</dt><dd>{formatDate(survey.updated_at)}</dd>
          </dl>
          {/* Struktur kuesioner sesuai Pedoman Menteri PANRB No. 9/2024 hlm. 14–21, urut seperti yang dilihat responden. */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Struktur Kuesioner (Pedoman PANRB 9/2024)</h4>
            <QuestionnaireSection title="1. Kalimat Pembuka"><p>{survey.description || OPENING_TEXT}</p></QuestionnaireSection>
            <QuestionnaireSection title="2. Data Responden (diisi sekali)">
              <ul className="list-disc pl-5 space-y-0.5">{DEMOGRAPHIC_FIELDS.map((f) => <li key={f}>{f}</li>)}</ul>
            </QuestionnaireSection>
            <QuestionnaireSection title="3. Data Persepsi (skala 1–4, jawaban paling positif di kanan)">
              {!survey.items.length ? (
                <p className="text-civic-warning">Belum ada pertanyaan. Susun di Pemilihan Survei.</p>
              ) : (
                <ol className="space-y-1.5">
                  {survey.items.map((item, i) => (
                    <li key={item.id}>
                      <span className="text-xs text-ink-muted">{i + 1}. {unsurLabel(item.unsur)}</span>
                      <p className="text-ink">{item.question.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </QuestionnaireSection>
            <p className="text-xs text-ink-muted">Bagian 4–6 ditanyakan sekali saja, di akhir survei terakhir yang diisi penerbit.</p>
            <QuestionnaireSection title="4. Kepuasan Secara Keseluruhan (skala 1–5)">
              <p>{Object.values(SATISFACTION_LABELS).join(' · ')}</p>
            </QuestionnaireSection>
            <QuestionnaireSection title="5. Pengukuran Perilaku Anti-Korupsi (skala 1–5: Sangat tidak setuju – Sangat setuju)">
              <ul className="list-disc pl-5 space-y-0.5">{Object.values(ANTI_CORRUPTION_STATEMENTS).map((s) => <li key={s.text}>{s.text}</li>)}</ul>
            </QuestionnaireSection>
            <QuestionnaireSection title="6. Kritik dan Saran"><p>Isian bebas.</p></QuestionnaireSection>
            <QuestionnaireSection title="7. Kalimat Penutup"><p>{CLOSING_TEXT}</p></QuestionnaireSection>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={() => onArrange(survey.id)}><ListChecks className="w-4 h-4" /> Susun Pertanyaan</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function SurveyListTab({ onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    surveyApi.listSurveys({ search: search.trim() || undefined })
      .then((res) => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(load, [load]);
  const closeView = useCallback(() => setViewId(null), []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { name: form.name, status: form.status };
      if (form.id) await surveyApi.updateSurvey(form.id, body);
      else await surveyApi.createSurvey(body);
      const saved = form.id ? 'Survei diperbarui.' : 'Survei ditambahkan.';
      showToast(form.status === 'AKTIF' && !form.itemCount ? `${saved} ${NO_QUESTIONS_NOTE}` : saved, 'success');
      setForm(null);
      load();
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  const run = async (fn, message, duration) => {
    try { await fn(); showToast(message, 'success', duration); load(); } catch { /* sudah ditampilkan */ }
  };

  // Urutan baru langsung disimpan; daftar lokal ikut berubah agar tampilan tidak berkedip.
  const moveRow = (from, to) => {
    const next = moveItem(items, from, to);
    if (next === items) return;
    setItems(next);
    surveyApi.reorderSurveys(next.map((s) => s.id)).catch(load);
  };
  const drag = useRowDrag(moveRow);

  // Hapus tanpa konfirmasi; jawaban responden survei ini ikut terhapus bila ada.
  const removeSurvey = (s) => run(
    () => surveyApi.deleteSurvey(s.id, s._count?.responses ? 'true' : undefined),
    s._count?.responses ? `Survei dihapus beserta ${s._count.responses} jawabannya.` : 'Survei dihapus.',
    500,
  );

  const activate = (s) =>
    run(() => surveyApi.activateSurvey(s.id), s._count?.items ? 'Survei diaktifkan.' : `Survei diaktifkan. ${NO_QUESTIONS_NOTE}`);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input className={`${inputClass} w-56`} placeholder="Cari nama survei…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari survei" />
        <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Tambah Survei</Button>
      </div>

      {!loading && !items.length ? (
        <EmptyState title="Belum ada survei" description="Tambahkan topik survei, susun pertanyaannya di Pemilihan Survei, lalu aktifkan." actionLabel="Tambah Survei" onAction={() => setForm({ ...EMPTY })} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3 w-8"><span className="sr-only">Urutan</span></th><th className="p-3">Nama Survei</th><th className="p-3">Status</th><th className="p-3">Pertanyaan</th><th className="p-3">Responden</th><th className="p-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((s, index) => (
                  <tr key={s.id} {...drag.rowProps(index)} className={drag.isOver(index) ? 'outline outline-2 -outline-offset-2 outline-brand-700' : undefined}>
                    <td className="p-3">
                      <span {...drag.gripProps(index)} className="inline-flex cursor-grab text-ink-muted active:cursor-grabbing"><GripVertical className="w-4 h-4" /></span>
                    </td>
                    <td className="p-3 font-semibold text-ink">{s.name}</td>
                    <td className="p-3"><StatusBadge survey={s} /></td>
                    <td className="p-3">{s._count?.items || 0}</td>
                    <td className="p-3">{s._count?.responses || 0}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        {s.status === 'AKTIF' ? (
                          <Button size="sm" variant="danger" onClick={() => run(() => surveyApi.deactivateSurvey(s.id), 'Survei dinonaktifkan.')}><PowerOff className="w-4 h-4" /> Nonaktifkan Survei</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => activate(s)}><Power className="w-4 h-4" /> Aktifkan Survei</Button>
                        )}
                        <Button size="sm" variant="ghost" aria-label={`Naikkan ${s.name}`} disabled={index === 0} onClick={() => moveRow(index, index - 1)}><ArrowUp className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" aria-label={`Turunkan ${s.name}`} disabled={index === items.length - 1} onClick={() => moveRow(index, index + 1)}><ArrowDown className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" aria-label={`Lihat ${s.name}`} onClick={() => setViewId(s.id)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`}
                          onClick={() => setForm({ id: s.id, name: s.name, status: s.status, itemCount: s._count?.items || 0 })}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Hapus ${s.name}`}
                          title={s._count?.responses ? 'Survei sudah dijawab; penghapusan ikut membuang jawabannya.' : undefined}
                          onClick={() => removeSurvey(s)}>
                          <Trash2 className="w-4 h-4 text-civic-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Survei' : 'Tambah Survei'} size="md">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <FormField label="Nama survei" required hint="Topik survei, mis. Indeks Persepsi Kualitas Pelayanan atau Survei IKM 2027.">
              <input className={inputClass} value={form.name} minLength={3} maxLength={255} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Status" required hint="Survei Aktif dapat diisi penerbit setelah pertanyaannya disusun di Pemilihan Survei.">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <SurveyViewModal surveyId={viewId} onClose={closeView} onArrange={(id) => { setViewId(null); onOpen(id); }} />
    </section>
  );
}
