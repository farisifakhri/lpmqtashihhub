import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, RotateCcw } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass } from './survey-constants';

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
            title="Membuat ulang unsur baku yang terhapus dan mengembalikan urutan 1–9 sesuai Pedoman Menteri PANRB No. 9/2024"
            onClick={() => window.confirm('Pulihkan 9 unsur baku PANRB dan urutannya? Unsur baku yang terhapus akan dibuat ulang; unsur bernama sama dijadikan unsur baku.')
              && run(() => surveyApi.restoreStandardUnsur(), 'Unsur baku PANRB dipulihkan sesuai urutan Pedoman.')}>
            <RotateCcw className="w-4 h-4" /> Pulihkan Unsur Baku PANRB
          </Button>
          <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Tambah Unsur</Button>
        </div>
      </div>

      {!loading && !items.length ? (
        <EmptyState title="Belum ada unsur" description="Tambahkan unsur penilaian terlebih dahulu, lalu susun pertanyaan per unsur di survei." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3 w-12">No.</th><th className="p-3">Unsur & Definisi</th><th className="p-3">Dipakai</th><th className="p-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((u) => (
                <tr key={u.id} className={u.is_archived ? 'opacity-60' : ''}>
                  <td className="p-3 align-top font-semibold text-ink-muted">{u.is_standard ? `${u.sort_order}.` : '–'}</td>
                  <td className="p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                      {u.name}
                      {u.is_standard && <Badge variant="success">Baku PANRB</Badge>}
                      {u.is_archived && <Badge>Diarsipkan</Badge>}
                      <Badge variant={u.survey ? 'info' : 'default'}>{u.survey ? `Survei: ${u.survey.name}` : 'Semua survei'}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">{u.definition || 'Belum ada definisi.'}</p>
                  </td>
                  <td className="p-3 text-xs text-ink-muted">{u._count?.items || 0} survei</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" aria-label={`Ubah ${u.name}`}
                        onClick={() => setForm({ id: u.id, name: u.name, definition: u.definition || '', survey_id: u.survey_id || '', is_standard: u.is_standard })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={u.is_archived ? `Pulihkan ${u.name}` : `Arsipkan ${u.name}`}
                        onClick={() => run(() => surveyApi.updateUnsur(u.id, { is_archived: !u.is_archived }), u.is_archived ? 'Unsur dipulihkan.' : 'Unsur diarsipkan.')}>
                        {u.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>
                      {/* Unsur yang masih dipakai survei tidak dapat dihapus; arsipkan saja. */}
                      <Button size="sm" variant="ghost" aria-label={`Hapus ${u.name}`} disabled={u._count?.items > 0}
                        title={u._count?.items > 0 ? 'Unsur masih dipakai pada survei sehingga tidak dapat dihapus; arsipkan saja.' : undefined}
                        onClick={() => window.confirm(`Hapus unsur "${u.name}"? Tindakan ini tidak dapat dibatalkan.`) && run(() => surveyApi.deleteUnsur(u.id), 'Unsur dihapus.', 1000)}>
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
            <FormField label="Nama survei" hint="Opsional. Pilih survei bila unsur ini khusus untuk survei tersebut; kosongkan agar unsur bisa dipakai di semua survei.">
              <select className={inputClass} value={form.survey_id} onChange={(e) => setForm({ ...form, survey_id: e.target.value })}>
                <option value="">Semua survei (unsur umum)</option>
                {surveyList.map((sv) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
              </select>
            </FormField>
            <FormField label="Nama unsur" required>
              <input className={inputClass} value={form.name} minLength={3} maxLength={255} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Definisi" hint={form.is_standard ? 'Definisi baku dari Pedoman Menteri PANRB No. 9/2024; boleh disesuaikan dengan layanan pentashihan.' : 'Penjelasan singkat unsur agar penyusun pertanyaan dan pembaca laporan memahami maksudnya.'}>
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
