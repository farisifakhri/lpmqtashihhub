import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Download, Eye, ShieldCheck } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { fileApi } from '@/api/file.api';
import { getAuthToken } from '@/api/client';
import { useOptionalAuth } from '@/features/auth/AuthContext';
import { publisherSurveyApi } from '@/api/publisher-survey.api';
import { PublisherSurveyDialog, SURVEY_COMPLETED_EVENT } from '@/features/registrations/PublisherSurveyDialog';
import { DocumentVersionHistory } from './DocumentVersionHistory';
import { PrivateFileViewer } from './PrivateFileViewer';
import { Button } from '@/components/ui/Button';
import { formatDocumentType, formatDocumentStatus } from '@/lib/glossary';

const labels = {
  SURAT_PERMOHONAN: 'Surat Permohonan Tanda Tashih',
  NOTA_DINAS_VERIFIKASI: 'Disposisi Verifikasi',
  SURAT_HASIL_VERIFIKASI: 'Surat Hasil Verifikasi',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'Surat Pemberitahuan Hasil Verifikasi',
  BERITA_ACARA_VERIFIKASI: 'Berita Acara Verifikasi',
  BERITA_ACARA_TASHIH: 'Berita Acara Tashih',
  SURAT_TANDA_TASHIH: 'Surat Tanda Tashih',
  REVISION_RETURN_LETTER: 'Surat Pengembalian dan Catatan Hasil Tashih',
};

export function DocumentArchive({ registrationId }) {
  const [allDocuments, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const previewRequestId = useRef(0);
  // Penerbit mengisi survei kepuasan dulu sebelum STT dapat dibuka atau diunduh.
  const auth = useOptionalAuth();
  const roles = auth?.currentUser?.roles || (auth?.currentUser?.role ? [auth.currentUser.role] : []);
  const isPublisher = roles.includes('PENERBIT') && !roles.includes('SUPERADMIN');
  const [surveysPending, setSurveysPending] = useState([]);
  const [surveysChecked, setSurveysChecked] = useState(false);
  const [surveyAction, setSurveyAction] = useState(null); // aksi yang ditunda sampai survei terisi

  useEffect(() => {
    if (!isPublisher || !registrationId) return undefined;
    let active = true;
    publisherSurveyApi.listForRegistration(registrationId)
      .then((res) => { if (active) setSurveysPending((res.data || []).filter((item) => !item.answered)); })
      .catch(() => { if (active) setSurveysPending([]); })
      .finally(() => { if (active) setSurveysChecked(true); });
    return () => { active = false; };
  }, [isPublisher, registrationId]);

  // Survei bisa juga diselesaikan dari banner STT di atas arsip ini.
  useEffect(() => {
    const unlock = (e) => { if (e.detail === registrationId) setSurveysPending([]); };
    window.addEventListener(SURVEY_COMPLETED_EVENT, unlock);
    return () => window.removeEventListener(SURVEY_COMPLETED_EVENT, unlock);
  }, [registrationId]);

  // Selama survei belum terisi, STT disembunyikan seluruhnya dari penerbit (bukan hanya tombol unduhnya).
  const isStt = (item) => item?.source === 'OFFICIAL' && item?.document_type === 'SURAT_TANDA_TASHIH';
  const sttLocked = isPublisher && (!surveysChecked || surveysPending.length > 0);
  const lockedStt = sttLocked ? allDocuments.find((item) => isStt(item) && item.status === 'ISSUED') : null;
  const documents = sttLocked ? allDocuments.filter((item) => !isStt(item)) : allDocuments;

  const needsSurvey = (document) => isPublisher && surveysPending.length > 0
    && document?.source === 'OFFICIAL' && document?.document_type === 'SURAT_TANDA_TASHIH';

  // Jalankan aksinya, atau tahan dulu dengan pop-up survei bila STT belum boleh dibuka.
  const guarded = (document, action) => () => {
    if (needsSurvey(document)) { setSurveyAction(() => action); return; }
    action();
  };

  const downloadOfficial = (document) => () => {
    setError('');
    fileApi.downloadDocument(document.id, `${document.document_no || document.document_type}.pdf`)
      .catch((reason) => setError(reason.message || 'Dokumen tidak dapat diunduh.'));
  };

  const openAttachmentPreview = (document) => {
    const fileId = document.content_snapshot?.billing_file_id;
    if (!fileId) return;
    setAttachmentPreview({
      fileId,
      fileName: 'billing-pnbp.pdf',
      endpoint: `/verification-documents/${document.id}/attachments/${fileId}`,
    });
  };

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const openDocumentPreview = async (document) => {
    const requestId = ++previewRequestId.current;
    setSelectedId(document.id);
    setPreviewDocument(document);
    setPreviewError('');
    setPdfUrl(null);
    setPdfLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const path = document.source === 'OFFICIAL'
        ? `/official-documents/${document.id}/pdf`
        : document.source === 'APPLICATION'
        ? `/uploads/${encodeURIComponent(document.file_id)}`
        : `/verification-documents/${document.id}/pdf`;
      const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}`, Accept: 'application/pdf' },
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
        let msg = '';
        try {
          if (typeof response.text === 'function') {
            const text = await response.text();
            try {
              const errData = JSON.parse(text);
              if (errData?.message) msg = errData.message;
            } catch {
              if (text && text.length < 200 && !text.startsWith('<')) msg = text;
            }
          } else if (typeof response.json === 'function') {
            const errData = await response.json();
            if (errData?.message) msg = errData.message;
          }
        } catch (_) {}
        if (!msg) {
          if (response.status === 403) msg = 'Akses ditolak: Anda tidak memiliki wewenang untuk membuka berkas dokumen resmi ini.';
          else if (response.status === 404) msg = 'Berkas PDF belum tersedia atau belum diterbitkan.';
          else if (response.status === 409) msg = 'Dokumen masih dalam proses pengesahan internal dan belum diterbitkan resmi.';
          else msg = `Gagal membuka dokumen PDF (Status: ${response.status}).`;
        }
        throw new Error(msg);
      }
      const blob = await response.blob();
      if (requestId === previewRequestId.current) setPdfUrl(URL.createObjectURL(blob));
    } catch (reason) {
      if (requestId === previewRequestId.current) setPreviewError(reason.message || 'PDF dokumen belum dapat dibuka.');
    } finally {
      if (requestId === previewRequestId.current) setPdfLoading(false);
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

  // Tanpa pilihan manual, buka langsung STT bila sudah terbit: itu dokumen yang dicari penerbit.
  const issuedStt = documents.find((item) => item.document_type === 'SURAT_TANDA_TASHIH' && item.status === 'ISSUED');
  const selected = documents.find((item) => item.id === selectedId) || issuedStt || documents[0];
  return (
    <section className="space-y-4 font-sans" aria-label="Arsip dokumen">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-800" />
            Arsip Dokumen Resmi & Riwayat Versi
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
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
      {!loading && lockedStt && (
        <div className="rounded-xl border border-civic-successLine bg-civic-successSoft/40 p-5 text-center space-y-3" aria-label="Surat Tanda Tashih terkunci survei">
          <ShieldCheck className="w-10 h-10 mx-auto text-civic-success" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-ink">Surat Tanda Tashih Anda sudah terbit</p>
            <p className="text-xs text-ink-muted max-w-md mx-auto">
              Isi survei kepuasan layanan terlebih dahulu. Setelah seluruh survei terkirim, Surat Tanda Tashih dapat Anda tinjau dan unduh.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="text-xs font-bold"
            onClick={() => { setSelectedId(lockedStt.id); setSurveyAction(() => () => openDocumentPreview(lockedStt)); }}
          >
            Isi Survei untuk Membuka Surat Tanda Tashih
          </Button>
        </div>
      )}
      {!loading && !error && !documents.length && !lockedStt && (
        <div className="p-6 text-center rounded-xl border border-dashed border-line bg-canvas/50 space-y-1">
          <FileText className="w-8 h-8 text-ink-muted/50 mx-auto" />
          <p className="text-xs font-semibold text-ink">Belum Ada Dokumen Resmi</p>
          <p className="text-xs text-ink-muted">
            Dokumen resmi (Disposisi, Surat Hasil, Berita Acara, Surat Tanda Tashih) akan muncul secara otomatis saat tahapan verifikasi dan pentashihan diproses.
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
                  file_name: `${formatDocumentType(item.document_type)} · ${formatDocumentStatus(item.status)}`,
                }))}
                currentVersionId={selected?.id}
                onSelectVersion={(item) => guarded(item, () => openDocumentPreview(item))()}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog Penampil PDF Resmi */}
      {previewDocument && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau arsip dokumen"
          className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
        >
          <div className="w-full max-w-5xl h-[92vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5 bg-surface-subtle">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Pratinjau Dokumen: {formatDocumentType(previewDocument.document_type)}
                </h2>
                <p className="text-xs text-ink-muted">
                  Nomor: {previewDocument.document_no || 'DRAF'} · Status: {formatDocumentStatus(previewDocument.status)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Menyimpan salinan tetap melewati gerbang survei, meski pratinjaunya sudah terbuka. */}
                {previewDocument.source === 'VERIFICATION' && previewDocument.content_snapshot?.billing_file_id && (
                  <Button type="button" variant="outline" size="sm" onClick={() => openAttachmentPreview(previewDocument)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Tinjau Bukti
                  </Button>
                )}
                {needsSurvey(previewDocument) ? (
                  <button
                    type="button"
                    onClick={guarded(previewDocument, downloadOfficial(previewDocument))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900 transition-colors hover:bg-brand-100 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-700" />
                    Isi Survei untuk Unduh
                  </button>
                ) : pdfUrl ? (
                  <a
                    href={pdfUrl}
                    download={`${previewDocument.document_no || previewDocument.document_type || 'dokumen'}.pdf`}
                    className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900 hover:bg-brand-100 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-700" />
                    Unduh Salinan PDF
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    previewRequestId.current += 1;
                    setPdfLoading(false);
                    setPdfUrl(null);
                    setPreviewDocument(null);
                    setPreviewError('');
                  }}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
            {pdfLoading ? (
              <div role="status" className="flex flex-1 items-center justify-center bg-surface-subtle text-sm text-ink-muted">
                Memuat dokumen…
              </div>
            ) : previewError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface-subtle p-6 text-center">
                <p role="alert" className="max-w-lg text-sm font-medium text-civic-danger">{previewError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => openDocumentPreview(previewDocument)}>
                  Coba Lagi
                </Button>
              </div>
            ) : pdfUrl ? (
              <iframe
                title="Penampil PDF arsip dokumen"
                src={pdfUrl}
                className="flex-1 w-full border-0 bg-surface-subtle"
              />
            ) : null}
          </div>
        </div>
      )}

      {attachmentPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau bukti dokumen"
          className="fixed inset-0 z-[60] bg-ink/75 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
        >
          <div className="w-full max-w-5xl h-[92vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-line">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 bg-surface-subtle">
              <h2 className="text-sm font-bold text-ink">Bukti Dokumen: {attachmentPreview.fileName}</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setAttachmentPreview(null)}>Tutup</Button>
            </div>
            <div className="flex-1 min-h-0 p-3 sm:p-5">
              <PrivateFileViewer
                fileId={attachmentPreview.fileId}
                fileName={attachmentPreview.fileName}
                mimeType="application/pdf"
                height="100%"
                className="h-full"
                endpoint={attachmentPreview.endpoint}
              />
            </div>
          </div>
        </div>
      )}

      <PublisherSurveyDialog
        registrationId={registrationId}
        isOpen={!!surveyAction}
        onClose={() => setSurveyAction(null)}
        onCompleted={() => {
          const lanjutkan = surveyAction;
          setSurveyAction(null);
          setSurveysPending([]);
          lanjutkan?.();
        }}
      />
    </section>
  );
}
