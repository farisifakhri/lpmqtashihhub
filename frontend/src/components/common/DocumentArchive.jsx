import React, { useEffect, useMemo, useState } from 'react';
import { registrationApi } from '@/api/registration.api';
import { fileApi } from '@/api/file.api';
import { getAuthToken } from '@/api/client';
import { DocumentVersionHistory } from './DocumentVersionHistory';
import { DocumentPreview } from './DocumentPreview';
import { PrivateFileViewer } from './PrivateFileViewer';

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
  const snapshot = selected?.content_snapshot || {};
  const text = snapshot.letter_text || snapshot.notes || (selected?.document_type === 'NOTA_DINAS_VERIFIKASI'
    ? `Penugasan verifikasi naskah ${snapshot.title || '-'} kepada ${snapshot.verifier_name || 'verifikator'}. Batas penyelesaian: ${snapshot.due_at ? new Date(snapshot.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}.`
    : 'Ringkasan isi tersedia pada dokumen PDF.');
  const metadata = selected ? [
    ['Jenis dokumen', labels[selected.document_type] || selected.document_type],
    ['Nomor surat', selected.document_no || 'Belum diberi nomor'],
    ['Status', selected.status],
    ['Versi', selected.version],
    ['Dibuat', selected.created_at ? new Date(selected.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'],
    ['Penyusun', selected.created_by?.name || snapshot.verifier_name || snapshot.assigned_by_name || '-'],
    ...(snapshot.billing_no ? [['Kode billing PNBP', snapshot.billing_no]] : []),
    ...(snapshot.billing_file_id ? [['Lampiran', 'Dokumen billing PNBP']] : []),
  ] : [];

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
    {selected && <section className="rounded-xl border border-line bg-white p-5 space-y-5" aria-label="Tinjau dokumen arsip">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div><h4 className="font-semibold text-ink">Tinjau dokumen</h4><p className="text-xs text-ink-muted">Metadata arsip dan isi versi yang dipilih.</p></div>
        <button type="button" onClick={() => printPdf(selected)} className="rounded-lg bg-brand-800 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-900">Lihat Dokumen PDF</button>
      </div>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 text-sm">
        {metadata.map(([label, value]) => <div key={label} className="border-b border-line pb-2"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-0.5 font-medium text-ink break-words">{value}</dd></div>)}
      </dl>
      {snapshot.billing_file_id && selected.source === 'VERIFICATION' && <details className="rounded-lg border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-900">Lihat lampiran billing PNBP</summary>
        <div className="pt-4"><PrivateFileViewer fileId={snapshot.billing_file_id} fileName="billing-pnbp.pdf" mimeType="application/pdf" height="480px" endpoint={`/verification-documents/${selected.id}/attachments/${snapshot.billing_file_id}`} /></div>
      </details>}
      <DocumentPreview
      title={labels[selected.document_type] || selected.document_type}
      documentNo={selected.document_no}
      version={selected.version}
      letterText={text}
      onDownload={selected.source === 'OFFICIAL' ? () => fileApi.downloadDocument(selected.id, `${selected.document_no || selected.document_type}.pdf`) : undefined}
      />
    </section>}
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
