import React, { useEffect, useMemo, useState } from 'react';
import { registrationApi } from '@/api/registration.api';
import { fileApi } from '@/api/file.api';
import { getAuthToken } from '@/api/client';
import { DocumentVersionHistory } from './DocumentVersionHistory';
import { DocumentPreview } from './DocumentPreview';

const labels = {
  NOTA_DINAS_VERIFIKASI: 'Nota Dinas Verifikasi',
  SURAT_HASIL_VERIFIKASI: 'Surat Hasil Verifikasi',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'Surat Pemberitahuan Hasil Verifikasi',
  BERITA_ACARA_VERIFIKASI: 'Berita Acara Verifikasi',
  BERITA_ACARA_TASHIH: 'Berita Acara Tashih',
  SURAT_TANDA_TASHIH: 'Surat Tanda Tashih',
};

export function DocumentArchive({ registrationId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const printPdf = async document => {
    setError('');
    try {
      const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const path = document.source === 'OFFICIAL'
        ? `/official-documents/${document.id}/pdf`
        : `/verification-documents/${document.id}/pdf`;
      const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${getAuthToken()}`, Accept: 'application/pdf' } });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('PDF dokumen belum dapat dibuka.');
      setPdfUrl(URL.createObjectURL(await response.blob()));
    } catch (reason) {
      setError(reason.message || 'PDF dokumen belum dapat dibuka.');
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    registrationApi.getDocumentArchive(registrationId)
      .then(response => { if (active) setDocuments(response.data || []); })
      .catch(err => { if (active) setError(err.message || 'Arsip tidak dapat dimuat.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [registrationId]);

  const groups = useMemo(() => Object.groupBy
    ? Object.groupBy(documents, item => `${item.source}:${item.document_type}`)
    : documents.reduce((result, item) => {
      const key = `${item.source}:${item.document_type}`;
      (result[key] ||= []).push(item);
      return result;
    }, {}), [documents]);
  const selected = documents.find(item => item.id === selectedId) || documents[0];
  const text = selected?.content_snapshot?.letter_text
    || selected?.content_snapshot?.notes
    || (selected?.content_snapshot ? JSON.stringify(selected.content_snapshot, null, 2) : 'Pratinjau isi belum tersedia.');

  return <section className="space-y-4" aria-label="Arsip dokumen">
    <h3 className="text-sm font-bold text-ink">Arsip dokumen dan semua versi</h3>
    {loading && <p role="status" className="text-sm text-ink-muted">Memuat arsip dokumen…</p>}
    {error && <p role="alert" className="text-sm text-civic-danger">{error}</p>}
    {!loading && !error && !documents.length && <p className="text-sm text-ink-muted">Belum ada dokumen dalam arsip.</p>}
    {Object.entries(groups).map(([key, versions]) => <div key={key}>
      <h4 className="mb-2 text-xs font-semibold text-ink">{labels[versions[0].document_type] || versions[0].document_type}</h4>
      <DocumentVersionHistory
        versions={versions.map(item => ({ ...item, file_name: `${labels[item.document_type] || item.document_type} · ${item.status}` }))}
        currentVersionId={selected?.id}
        onSelectVersion={item => setSelectedId(item.id)}
      />
    </div>)}
    {selected && <DocumentPreview
      title={labels[selected.document_type] || selected.document_type}
      documentNo={selected.document_no}
      version={selected.version}
      letterText={text}
      onPrint={() => printPdf(selected)}
      onDownload={selected.source === 'OFFICIAL' ? () => fileApi.downloadDocument(selected.id, `${selected.document_no || selected.document_type}.pdf`) : undefined}
    />}
    {pdfUrl && <div role="dialog" aria-modal="true" aria-label="PDF arsip dokumen" className="fixed inset-0 z-50 bg-ink/70 p-3 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-ink">PDF {labels[selected?.document_type] || selected?.document_type}</h2>
            <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={pdfUrl} download={`${selected?.document_no || selected?.document_type || 'dokumen'}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
            <button type="button" onClick={() => setPdfUrl(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink">Tutup</button>
          </div>
        </div>
        <iframe title="Penampil PDF arsip dokumen" src={pdfUrl} className="flex-1 w-full border-0" />
      </div>
    </div>}
  </section>;
}
