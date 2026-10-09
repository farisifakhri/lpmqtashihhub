import React, { useState } from 'react';
import { tashihApi } from '@/api/tashih.api';
import { fileApi } from '@/api/file.api';
import { Upload, FileText, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [rangeResult, setRangeResult] = useState('PASSED');
  const [rangeNotes, setRangeNotes] = useState('');
  const [recapFileId, setRecapFileId] = useState(null);
  const [uploadingRecap, setUploadingRecap] = useState(false);
  const [rangeSaving, setRangeSaving] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [showIndividual, setShowIndividual] = useState(false);

  const sortedJuz = [...items].sort((a, b) => a.juz_number - b.juz_number);
  const rangeText = sortedJuz.length
    ? `Juz ${sortedJuz[0].juz_number} s.d. ${sortedJuz[sortedJuz.length - 1].juz_number} (${sortedJuz.length} Juz)`
    : 'Rentang Penugasan';

  const handleFileUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingRecap(true);
    setRangeError('');
    try {
      const res = await fileApi.upload(file);
      setRecapFileId(res.id);
    } catch (err) {
      setRangeError(err.message || 'Gagal mengunggah berkas rekapan internal.');
    } finally {
      setUploadingRecap(false);
    }
  };

  const submitRangeReview = async event => {
    event.preventDefault();
    if (!rangeNotes.trim()) {
      setRangeError('Catatan hasil telaah rentang naskah wajib diisi.');
      return;
    }
    setRangeSaving(true);
    setRangeError('');
    try {
      await tashihApi.recordReview(assignment.id, {
        result: rangeResult,
        notes: rangeNotes.trim(),
        recap_file_id: recapFileId || undefined,
      });
      onSaved({ id: assignment.id, status: 'COMPLETED' });
      onClose();
    } catch (err) {
      setRangeError(err.message || 'Gagal menyimpan hasil telaah rentang naskah.');
    } finally {
      setRangeSaving(false);
    }
  };

  return <div role="dialog" aria-modal="true" aria-labelledby="juz-checklist-title" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4 overflow-y-auto">
    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl space-y-4 border border-line">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h3 id="juz-checklist-title" className="text-base font-bold text-ink">Telaah Rentang Naskah Sidang</h3>
          <p className="text-xs text-ink-muted">{assignment.registration?.registration_no} · {assignment.registration?.title}</p>
          <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200">
            {rangeText}
          </span>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:bg-surface-subtle">Tutup</button>
      </div>

      {/* Form Telaah Rentang Sekaligus (R-09, R-10, T-01) */}
      <form onSubmit={submitRangeReview} className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
          <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
            Keputusan Sidang Rentang Naskah ({rangeText})
          </h4>
        </div>

        {rangeError && <p role="alert" className="text-xs text-civic-danger bg-civic-dangerSoft p-2.5 rounded-lg border border-civic-dangerLine">{rangeError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className={`p-3 rounded-lg border-2 flex items-start gap-2.5 cursor-pointer transition-all ${
            rangeResult === 'PASSED' ? 'border-brand-700 bg-white shadow-2xs' : 'border-line bg-surface hover:border-line-strong'
          }`}>
            <input type="radio" name="rangeResult" value="PASSED" checked={rangeResult === 'PASSED'} onChange={e => setRangeResult(e.target.value)} className="mt-0.5 text-brand-700" />
            <div>
              <div className="text-xs font-bold text-ink">Lolos Tanpa Catatan (Bersih)</div>
              <div className="text-[11px] text-ink-muted">Seluruh ayat dan rasm pada rentang juz ini telah sesuai kaidah.</div>
            </div>
          </label>
          <label className={`p-3 rounded-lg border-2 flex items-start gap-2.5 cursor-pointer transition-all ${
            rangeResult === 'REVISION_REQUIRED' ? 'border-civic-warning bg-white shadow-2xs' : 'border-line bg-surface hover:border-line-strong'
          }`}>
            <input type="radio" name="rangeResult" value="REVISION_REQUIRED" checked={rangeResult === 'REVISION_REQUIRED'} onChange={e => setRangeResult(e.target.value)} className="mt-0.5 text-civic-warning" />
            <div>
              <div className="text-xs font-bold text-ink">Perlu Perbaikan Naskah</div>
              <div className="text-[11px] text-ink-muted">Terdapat catatan rasm/harakat yang wajib diperbaiki penerbit.</div>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Catatan Koreksi / Ringkasan Telaah Rentang Juz</label>
          <textarea
            value={rangeNotes}
            onChange={e => setRangeNotes(e.target.value)}
            rows={3}
            maxLength={10000}
            placeholder="Tuliskan ringkasan hasil pentashihan untuk rentang juz yang ditugaskan..."
            className="w-full p-2.5 text-xs bg-white border border-line-strong rounded-lg outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-mono"
          />
        </div>

        {/* Unggah Berkas Rekapan Internal (RF-DIST-18, RF-DIST-19, T-01) */}
        <div className="p-3 bg-white rounded-lg border border-line space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Berkas Rekapan Koreksi Internal (Opsional)</span>
            <span className="text-[10px] text-ink-muted">PDF / Gambar</span>
          </div>

          {recapFileId ? (
            <div className="flex items-center justify-between p-2 bg-brand-50 border border-brand-200 rounded text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                <span className="font-mono text-ink truncate">ID: {recapFileId}</span>
              </div>
              <button type="button" onClick={() => setRecapFileId(null)} className="text-civic-danger text-xs hover:underline font-semibold ml-2">Hapus</button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-line-strong hover:border-brand-700 rounded-lg cursor-pointer bg-surface-subtle/50 text-xs font-medium text-ink transition-colors">
              <Upload className="w-4 h-4 text-brand-700" />
              <span>{uploadingRecap ? 'Mengunggah…' : 'Unggah Berkas Rekapan Koreksi'}</span>
              <input type="file" accept=".pdf,image/png,image/jpeg" disabled={uploadingRecap} onChange={handleFileUpload} className="sr-only" />
            </label>
          )}

          <p className="text-[10px] text-ink-muted leading-relaxed">
            🔒 <strong>Kerahasiaan Internal:</strong> Berkas rekapan koreksi hanya dapat dilihat oleh Anda dan Koordinator Distributor. Berkas ini tidak dikirim ke penerbit.
          </p>
        </div>

        <button
          type="submit"
          disabled={rangeSaving || uploadingRecap || !rangeNotes.trim()}
          className="w-full py-2.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
        >
          {rangeSaving ? 'Menyimpan Hasil Telaah…' : `Simpan Keputusan Rentang ${rangeText}`}
        </button>
      </form>

      {/* Rincian Checklist Tiap Juz (Kompatibilitas & Detail) */}
      <div className="border-t border-line pt-3 space-y-3">
        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
          Pemeriksaan Rinci Tiap Juz
        </h4>
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">Target panduan: 2 juz per orang per hari. Tidak ada pembatasan otomatis.</p>
        <div className="space-y-3">
          {items.map(item => <JuzRow key={item.id} assignmentId={assignment.id} item={item} onSaved={onSaved} />)}
        </div>
      </div>
    </div>
  </div>;
}

