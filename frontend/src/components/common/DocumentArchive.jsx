import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Printer, Download, Eye, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { fileApi } from '@/api/file.api';
import { getAuthToken } from '@/api/client';
import { DocumentVersionHistory } from './DocumentVersionHistory';
import { PrivateFileViewer } from './PrivateFileViewer';
import { Button } from '@/components/ui/Button';

const labels = {
  NOTA_DINAS_VERIFIKASI: 'Disposisi Verifikasi',
  SURAT_HASIL_VERIFIKASI: 'Surat Hasil Verifikasi',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'Surat Pemberitahuan Hasil Verifikasi',
  BERITA_ACARA_VERIFIKASI: 'Berita Acara Verifikasi',
  BERITA_ACARA_TASHIH: 'Berita Acara Tashih',
  SURAT_TANDA_TASHIH: 'Surat Tanda Tashih',
};

const statusBadgeClasses = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine',
  APPROVED: 'bg-brand-50 text-brand-800 border-brand-200',
  SIGNING: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
  SIGNED: 'bg-brand-100 text-brand-900 border-brand-200',
  ISSUED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export function DocumentArchive({ registrationId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const printPdf = async (document) => {
    setError('');
    setPdfLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const path = document.source === 'OFFICIAL'
        ? `/official-documents/${document.id}/pdf`
        : `/verification-documents/${document.id}/pdf`;
      const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}`, Accept: 'application/pdf' },
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error('PDF dokumen belum dapat dibuka.');
      }
      setPdfUrl(URL.createObjectURL(await response.blob()));
    } catch (reason) {
      setError(reason.message || 'PDF dokumen belum dapat dibuka.');
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    registrationApi.getDocumentArchive(registrationId)
      .then((response) => {
        if (active) setDocuments(response.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Arsip tidak dapat dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [registrationId]);

  const groups = useMemo(() => {
    if (Object.groupBy) {
      return Object.groupBy(documents, (item) => `${item.source}:${item.document_type}`);
    }
    return documents.reduce((result, item) => {
      const key = `${item.source}:${item.document_type}`;
      (result[key] ||= []).push(item);
      return result;
    }, {});
  }, [documents]);

  const selected = documents.find((item) => item.id === selectedId) || documents[0];
  const snapshot = selected?.content_snapshot || {};
  const text = snapshot.letter_text || snapshot.notes || (selected?.document_type === 'NOTA_DINAS_VERIFIKASI'
    ? `Penugasan verifikasi naskah ${snapshot.title || '-'} kepada ${snapshot.verifier_name || 'verifikator'}. Batas penyelesaian: ${snapshot.due_at ? new Date(snapshot.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}.`
    : 'Ringkasan isi tersedia pada dokumen PDF resmi.');

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

  return (
    <section className="space-y-4 font-sans" aria-label="Arsip dokumen">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-800" />
            Arsip Dokumen Resmi & Riwayat Versi
          </h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Salinan penetapan naskah dinas resmi LPMQ Kementerian Agama RI.
          </p>
        </div>
        {documents.length > 0 && (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200">
            {documents.length} Dokumen Tersimpan
          </span>
        )}
      </div>

      {loading && <p role="status" className="text-xs text-ink-muted">Memuat arsip dokumen…</p>}
      {error && <p role="alert" className="text-xs text-civic-danger font-medium p-3 bg-civic-dangerSoft rounded-lg border border-civic-dangerLine">{error}</p>}
      {!loading && !error && !documents.length && (
        <div className="p-6 text-center rounded-xl border border-dashed border-line bg-canvas/50 space-y-1">
          <FileText className="w-8 h-8 text-ink-muted/50 mx-auto" />
          <p className="text-xs font-semibold text-ink">Belum Ada Dokumen Resmi</p>
          <p className="text-[11px] text-ink-muted">
            Dokumen resmi (Disposisi, Surat Hasil, Berita Acara, STT) akan muncul secara otomatis saat tahapan verifikasi dan pentashihan diproses.
          </p>
        </div>
      )}

      {/* Dokumen & Versi Groups */}
      {Object.entries(groups).length > 0 && (
        <div className="space-y-3">
          {Object.entries(groups).map(([key, versions]) => (
            <div key={key} className="space-y-1.5">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider text-brand-900">
                {labels[versions[0].document_type] || versions[0].document_type}
              </h4>
              <DocumentVersionHistory
                versions={versions.map((item) => ({
                  ...item,
                  file_name: `${labels[item.document_type] || item.document_type} · ${item.status}`,
                }))}
                currentVersionId={selected?.id}
                onSelectVersion={(item) => setSelectedId(item.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Tinjau Dokumen Card */}
      {selected && (
        <section className="rounded-xl border border-line bg-white p-5 space-y-5 shadow-2xs" aria-label="Tinjau dokumen arsip">
          {/* Header Card */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-ink text-sm">Tinjau dokumen</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClasses[selected.status] || 'bg-slate-100 text-slate-700'}`}>
                  {selected.status}
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-100">
                  Versi {selected.version}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {labels[selected.document_type] || selected.document_type} — {selected.document_no || 'Belum ada nomor surat'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => printPdf(selected)}
                disabled={pdfLoading}
                className="text-xs font-bold"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                {pdfLoading ? 'Membuka PDF…' : 'Lihat Dokumen PDF'}
              </Button>
              {selected.source === 'OFFICIAL' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileApi.downloadDocument(selected.id, `${selected.document_no || selected.document_type}.pdf`)}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Unduh PDF
                </Button>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-xs bg-canvas/50 p-4 rounded-xl border border-line">
            {metadata.map(([label, value]) => (
              <div key={label} className="border-b border-line/60 sm:border-0 pb-1.5 sm:pb-0">
                <dt className="text-[11px] text-ink-muted font-medium">{label}</dt>
                <dd className="mt-0.5 font-semibold text-ink break-words">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Lampiran Billing PNBP (jika ada) */}
          {snapshot.billing_file_id && selected.source === 'VERIFICATION' && (
            <details className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
              <summary className="cursor-pointer text-xs font-bold text-brand-900 flex items-center justify-between">
                <span>Lampiran Kode Billing & Bukti SIMPONI</span>
                <span className="text-[10px] text-brand-700 underline font-normal">Klik untuk pratinjau</span>
              </summary>
              <div className="pt-2">
                <PrivateFileViewer
                  fileId={snapshot.billing_file_id}
                  fileName="billing-pnbp.pdf"
                  mimeType="application/pdf"
                  height="450px"
                  endpoint={`/verification-documents/${selected.id}/attachments/${snapshot.billing_file_id}`}
                />
              </div>
            </details>
          )}

          {/* Ringkasan Isi Surat Resmi */}
          <div className="p-4 bg-white rounded-xl border border-line space-y-2">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h5 className="font-bold text-xs text-ink flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-700" />
                Ringkasan Isi Dokumen Resmi
              </h5>
              <span className="text-[10px] text-ink-muted">Format Standar Tata Naskah Dinas LPMQ</span>
            </div>
            <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
              {text}
            </p>
          </div>
        </section>
      )}

      {/* Modal Dialog Penampil PDF Resmi */}
      {pdfUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="PDF arsip dokumen"
          className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
        >
          <div className="w-full max-w-5xl h-[92vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5 bg-surface-subtle">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Dokumen Resmi: {labels[selected?.document_type] || selected?.document_type}
                </h2>
                <p className="text-xs text-ink-muted">
                  Nomor: {selected?.document_no || 'DRAF'} · Status: {selected?.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  download={`${selected?.document_no || selected?.document_type || 'dokumen'}.pdf`}
                  className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900 hover:bg-brand-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-brand-700" />
                  Unduh Salinan PDF
                </a>
                <button
                  type="button"
                  onClick={() => setPdfUrl(null)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
            <iframe
              title="Penampil PDF arsip dokumen"
              src={pdfUrl}
              className="flex-1 w-full border-0 bg-slate-100"
            />
          </div>
        </div>
      )}
    </section>
  );
}
