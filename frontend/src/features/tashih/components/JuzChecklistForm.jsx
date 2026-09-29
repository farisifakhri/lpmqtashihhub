import React, { useState } from 'react';
import { tashihApi } from '@/api/tashih.api';

function JuzRow({ assignmentId, item, onSaved }) {
  const [result, setResult] = useState('PASSED');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async event => {
    event.preventDefault();
    if (item.result || saving) return;
    if (result === 'REVISION_REQUIRED' && !notes.trim()) {
      setError('Catatan koreksi wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await tashihApi.recordJuzChecklist(assignmentId, item.juz_number, { result, notes: notes.trim() });
      onSaved(response.data);
    } catch (cause) {
      setError(cause.message || 'Checklist belum tersimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };
  return <form onSubmit={save} className="rounded-xl border border-line bg-surface p-4 space-y-3">
    <div className="flex items-center justify-between gap-2"><h4 className="font-bold text-ink">Juz {item.juz_number}</h4><span className="text-xs text-ink-muted">{item.result === 'PASSED' ? 'Selesai' : item.result === 'REVISION_REQUIRED' ? 'Perlu perbaikan' : 'Belum ditashih'}</span></div>
    {item.result ? <p className="text-sm text-ink-muted">{item.notes || 'Tanpa catatan koreksi.'}</p> : <>
      <label className="block text-xs font-semibold text-ink">Status<select aria-label={`Status juz ${item.juz_number}`} value={result} onChange={event => setResult(event.target.value)} className="mt-1 block w-full rounded-lg border border-line-strong bg-surface p-2 text-sm text-ink"><option value="PASSED">Selesai ditashih</option><option value="REVISION_REQUIRED">Perlu perbaikan</option></select></label>
      <label className="block text-xs font-semibold text-ink">Catatan koreksi<textarea aria-label={`Catatan juz ${item.juz_number}`} value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} rows={2} placeholder="Opsional bila selesai; wajib bila perlu perbaikan" className="mt-1 block w-full rounded-lg border border-line-strong bg-surface p-2 text-sm text-ink" /></label>
      {error && <p role="alert" className="text-xs text-civic-danger">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Menyimpan…' : `Simpan juz ${item.juz_number}`}</button>
    </>}
  </form>;
}

export function JuzChecklistForm({ assignment, onClose, onSaved }) {
  const items = assignment.juz_items || [];
  return <div role="dialog" aria-modal="true" aria-labelledby="juz-checklist-title" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h3 id="juz-checklist-title" className="text-lg font-bold text-ink">Checklist Tashih per Juz</h3><p className="text-sm text-ink-muted">{assignment.registration?.registration_no} · {assignment.registration?.title}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink">Tutup</button></div>
      <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">Target panduan: 2 juz per orang per hari. Tidak ada pembatasan otomatis.</p>
      <div className="space-y-3">{items.map(item => <JuzRow key={item.id} assignmentId={assignment.id} item={item} onSaved={onSaved} />)}</div>
    </div>
  </div>;
}
