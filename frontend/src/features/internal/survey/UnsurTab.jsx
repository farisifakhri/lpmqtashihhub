import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, RotateCcw, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass, STATUS_BADGE } from './survey-constants';
import { useRowDrag, moveItem } from './useRowDrag';

const EMPTY = { name: '', definition: '', survey_id: '' };

export function UnsurTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(null); // null = modal tertutup; { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [surveyList, setSurveyList] = useState([]);
  useEffect(() => { surveyApi.listSurveys().then((r) => setSurveyList(r.data || [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    surveyApi.listUnsur({ include_archived: showArchived ? 'true' : undefined })
      .then((res) => setItems(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showArchived]);

  useEffect(load, [load]);

  // Card "Pilih Survei": '' = semua unsur; selain itu tampilkan unsur yang dipakai survei terpilih.
  const [viewSurveyId, setViewSurveyId] = useState('');
  const [viewSurvey, setViewSurvey] = useState(null);
  useEffect(() => {
    if (!viewSurveyId) { setViewSurvey(null); return undefined; }
    let active = true;
    surveyApi.getSurvey(viewSurveyId).then((r) => active && setViewSurvey(r.data || null)).catch(() => active && setViewSurvey(null));
    return () => { active = false; };
  }, [viewSurveyId, items]);
  const questionsPerUnsur = new Map();
  for (const it of viewSurvey?.items || []) questionsPerUnsur.set(it.unsur_id, (questionsPerUnsur.get(it.unsur_id) || 0) + 1);
  const filtering = Boolean(viewSurveyId);
  const rows = filtering
    ? [...questionsPerUnsur.keys()].map((id) => items.find((u) => u.id === id)).filter(Boolean)
    : items;

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { id, name } = form;
      const body = { name, definition: form.definition.trim() || null, survey_id: form.survey_id || null };
      if (id) await surveyApi.updateUnsur(id, body);
      else await surveyApi.createUnsur(body);
      showToast(id ? 'Unsur diperbarui.' : 'Unsur ditambahkan.', 'success');
      setForm(null);
      load();
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  // Urutan baru langsung disimpan; daftar lokal ikut berubah agar tampilan tidak berkedip.
  const moveRow = (from, to) => {
    const next = moveItem(items, from, to);
    if (next === items) return;
    setItems(next);
    surveyApi.reorderUnsur(next.map((u) => u.id)).catch(load);
  };
  const drag = useRowDrag(moveRow);

  // Hapus tanpa konfirmasi; unsur ikut dikeluarkan dari susunan survei yang memakainya.
  const removeUnsur = (u) => run(
    () => surveyApi.deleteUnsur(u.id, u._count?.items ? 'true' : undefined),
    u._count?.items ? `Unsur dihapus dari ${u._count.items} susunan survei.` : 'Unsur dihapus.',
    500,
  );

  const run = async (fn, message, duration) => {
    try { await fn(); showToast(message, 'success', duration); load(); } catch { /* sudah ditampilkan */ }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Tampilkan yang diarsipkan
          </label>
          <Button size="sm" variant="outline"
            title="Membuat ulang unsur baku yang terhapus dan mengembalikan urutan 1–9"
            onClick={() => window.confirm('Pulihkan 9 unsur baku dan urutannya? Unsur baku yang terhapus akan dibuat ulang; unsur bernama sama dijadikan unsur baku.')
              && run(() => surveyApi.restoreStandardUnsur(), 'Unsur baku dipulihkan sesuai urutannya.')}>
            <RotateCcw className="w-4 h-4" /> Pulihkan Unsur Baku
          </Button>
          <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Tambah Unsur</Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-line bg-white p-4 md:grid-cols-[minmax(0,22rem)_1fr] md:items-center">
        <label className="space-y-1 text-xs font-semibold text-ink-muted">
          Pilih Survei
          <select className={inputClass} value={viewSurveyId} onChange={(e) => setViewSurveyId(e.target.value)}>
            <option value="">Semua unsur</option>
            {surveyList.map((sv) => <option key={sv.id} value={sv.id}>{sv.name} ({sv.kind})</option>)}
          </select>
        </label>
        {!filtering ? (
          <p className="text-xs text-ink-muted">Pilih survei untuk melihat unsur yang dipakai beserta jumlah pertanyaannya. Saat ini menampilkan {items.length} unsur.</p>
        ) : !viewSurvey ? (
          <p role="status" className="text-xs text-ink-muted">Memuat isi survei…</p>
        ) : (
          <div className="space-y-1.5" aria-label="Ringkasan survei terpilih">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
              {viewSurvey.name}
              <Badge variant="info">{viewSurvey.kind}</Badge>
              <Badge variant={STATUS_BADGE[viewSurvey.display_status || viewSurvey.status]?.variant}>{STATUS_BADGE[viewSurvey.display_status || viewSurvey.status]?.label || viewSurvey.status}</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              {questionsPerUnsur.size} unsur · {viewSurvey.items?.length || 0} pertanyaan · {viewSurvey._count?.responses ?? 0} responden
            </p>
          </div>
        )}
      </div>

      {filtering && viewSurvey && !rows.length ? (
        <EmptyState title="Survei ini belum memakai unsur" description="Susun unsur dan pertanyaannya lewat menu Pemilihan Survei." />
      ) : !loading && !items.length ? (
        <EmptyState title="Belum ada unsur" description="Tambahkan unsur penilaian terlebih dahulu, lalu susun pertanyaan per unsur di survei." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3 w-8"><span className="sr-only">Urutan</span></th><th className="p-3 w-12">No.</th><th className="p-3">Unsur & Definisi</th><th className="p-3">Dipakai</th><th className="p-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u, index) => (
                <tr key={u.id} {...(filtering ? {} : drag.rowProps(index))}
                  className={`${u.is_archived ? 'opacity-60' : ''} ${!filtering && drag.isOver(index) ? 'outline outline-2 -outline-offset-2 outline-brand-700' : ''}`}>
                  <td className="p-3 align-top">
                    {/* Urutan unsur berlaku global; tidak diubah saat daftar disaring per survei. */}
                    {!filtering && <span {...drag.gripProps(index)} className="inline-flex cursor-grab text-ink-muted active:cursor-grabbing"><GripVertical className="w-4 h-4" /></span>}
                  </td>
                  <td className="p-3 align-top font-semibold text-ink-muted">{index + 1}.</td>
                  <td className="p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                      {u.name}
                      {u.is_standard && <Badge variant="success">Baku</Badge>}
                      {u.is_archived && <Badge>Diarsipkan</Badge>}
                      <Badge variant={u.survey ? 'info' : 'default'}>{u.survey ? `Survei: ${u.survey.name}` : 'Semua survei'}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">{u.definition || 'Belum ada definisi.'}</p>
                  </td>
                  <td className="p-3 text-xs text-ink-muted">{filtering ? `${questionsPerUnsur.get(u.id)} pertanyaan` : `${u._count?.items || 0} survei`}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" aria-label={`Naikkan ${u.name}`} disabled={filtering || index === 0} onClick={() => moveRow(index, index - 1)}><ArrowUp className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Turunkan ${u.name}`} disabled={filtering || index === items.length - 1} onClick={() => moveRow(index, index + 1)}><ArrowDown className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Ubah ${u.name}`}
                        onClick={() => setForm({ id: u.id, name: u.name, definition: u.definition || '', survey_id: u.survey_id || '', is_standard: u.is_standard })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={u.is_archived ? `Pulihkan ${u.name}` : `Arsipkan ${u.name}`}
                        onClick={() => run(() => surveyApi.updateUnsur(u.id, { is_archived: !u.is_archived }), u.is_archived ? 'Unsur dipulihkan.' : 'Unsur diarsipkan.')}>
                        {u.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Hapus ${u.name}`}
                        title={u._count?.items > 0 ? 'Unsur dipakai pada survei; penghapusan mengeluarkannya dari susunan survei tersebut.' : undefined}
                        onClick={() => removeUnsur(u)}>
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

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah Unsur' : 'Tambah Unsur'} size="md">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <FormField label="Nama survei" hint={form.is_standard
              ? 'Unsur baku selalu berlaku untuk semua survei sehingga tidak dapat dikhususkan.'
              : 'Opsional. Pilih survei bila unsur ini khusus untuk survei tersebut; kosongkan agar unsur bisa dipakai di semua survei.'}>
              <select className={inputClass} disabled={form.is_standard} value={form.survey_id} onChange={(e) => setForm({ ...form, survey_id: e.target.value })}>
                <option value="">Semua survei (unsur umum)</option>
                {surveyList.map((sv) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
              </select>
            </FormField>
            <FormField label="Nama unsur" required>
              <input className={inputClass} value={form.name} minLength={3} maxLength={255} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Definisi" hint={form.is_standard ? 'Definisi baku; boleh disesuaikan dengan layanan pentashihan.' : 'Penjelasan singkat unsur agar penyusun pertanyaan dan pembaca laporan memahami maksudnya.'}>
              <textarea className={inputClass} rows={4} maxLength={2000} value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} />
            </FormField>
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
