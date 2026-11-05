import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass, KIND_OPTIONS } from './survey-constants';

const EMPTY = { code: '', name: '', kind: 'IKM' };

export function UnsurTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(null); // null = modal tertutup; { id?, ...fields }
  const [saving, setSaving] = useState(false);

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
      const { id, code, name, kind } = form;
      if (id) await surveyApi.updateUnsur(id, { code, name, kind });
      else await surveyApi.createUnsur({ code, name, kind });
      showToast(id ? 'Unsur diperbarui.' : 'Unsur ditambahkan.', 'success');
      setForm(null);
      load();
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  const run = async (fn, message) => {
    try { await fn(); showToast(message, 'success'); load(); } catch { /* sudah ditampilkan */ }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Unsur Survei</h2>
          <p className="text-xs text-ink-muted">Dimensi penilaian (mis. 9 unsur IKM) yang dipakai ulang di semua survei.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Tampilkan yang diarsipkan
          </label>
          <Button size="sm" onClick={() => setForm({ ...EMPTY })}><Plus className="w-4 h-4" /> Tambah Unsur</Button>
        </div>
      </div>

      {!loading && !items.length ? (
        <EmptyState title="Belum ada unsur" description="Tambahkan unsur penilaian terlebih dahulu, lalu susun pertanyaan per unsur di survei." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3">Kode</th><th className="p-3">Nama Unsur</th><th className="p-3">Jenis</th><th className="p-3">Dipakai</th><th className="p-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((u) => (
                <tr key={u.id} className={u.is_archived ? 'opacity-60' : ''}>
                  <td className="p-3 font-mono text-xs">{u.code}</td>
                  <td className="p-3 text-ink">{u.name} {u.is_archived && <Badge>Diarsipkan</Badge>}</td>
                  <td className="p-3"><Badge variant="info">{u.kind}</Badge></td>
                  <td className="p-3 text-xs text-ink-muted">{u._count?.items || 0} survei</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" aria-label={`Ubah ${u.name}`} onClick={() => setForm({ ...u })}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label={u.is_archived ? `Pulihkan ${u.name}` : `Arsipkan ${u.name}`}
                        onClick={() => run(() => surveyApi.updateUnsur(u.id, { is_archived: !u.is_archived }), u.is_archived ? 'Unsur dipulihkan.' : 'Unsur diarsipkan.')}>
                        {u.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>
                      {!u._count?.items && (
                        <Button size="sm" variant="ghost" aria-label={`Hapus ${u.name}`}
                          onClick={() => window.confirm(`Hapus unsur "${u.name}"?`) && run(() => surveyApi.deleteUnsur(u.id), 'Unsur dihapus.')}>
                          <Trash2 className="w-4 h-4 text-civic-danger" />
                        </Button>
                      )}
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
            <FormField label="Kode" required hint="Contoh: A, B, IPAK-1. Harus unik.">
              <input className={inputClass} value={form.code} maxLength={30} required onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </FormField>
            <FormField label="Nama unsur" required>
              <input className={inputClass} value={form.name} maxLength={255} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Jenis" required>
              <select className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KIND_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
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
