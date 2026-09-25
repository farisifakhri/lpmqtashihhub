import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fileApi } from '@/api/file.api';
import { dateLabel, downloadAvailable } from './publisher-status';
export function PublisherDocumentList({ documents = [] }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const download = async document => {
    setBusy(document.id); setError('');
    try { await fileApi.downloadDocument(document.id, `${document.document_no}.pdf`); }
    catch (err) { setError(err.message || 'Dokumen tidak dapat diunduh. Coba kembali.'); }
    finally { setBusy(null); }
  };
  const issued = documents.filter(item => item.document_type === 'SURAT_TANDA_TASHIH' && item.status === 'ISSUED');
  return <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-civic-danger">{error}</p>}
    {!issued.length && <p className="text-sm text-ink-muted">STT belum diterbitkan. Dokumen akan muncul setelah ditetapkan oleh pejabat berwenang.</p>}
    {issued.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
      <div className="flex items-start gap-3"><FileText className="h-5 w-5 text-brand-700 shrink-0" /><div><p className="text-sm font-semibold text-ink break-all">{document.document_no}</p><p className="text-xs text-ink-muted mt-1">Terbit {dateLabel(document.issued_at)} · Berlaku hingga {dateLabel(document.valid_until)}</p>{!downloadAvailable(document) && <p className="text-xs text-civic-warning mt-1">{document.valid_until && new Date(document.valid_until) < new Date() ? 'Masa berlaku dokumen sudah berakhir.' : 'Berkas PDF resmi belum tersedia. Hubungi pengelola layanan.'}</p>}</div></div>
      <Button size="sm" variant="outline" disabled={busy !== null || !downloadAvailable(document)} onClick={() => download(document)}><Download className="h-4 w-4" />{busy === document.id ? 'Mengunduh…' : 'Unduh STT'}</Button>
    </div>)}
  </div>;
}
