import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { getAuthToken } from '@/api/client';
import { handoverApi } from '@/api/handover.api';
import { fileApi } from '@/api/file.api';
import { DocumentArchive } from '@/components/common/DocumentArchive';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { WorkflowStepper } from '@/components/common/WorkflowStepper';
import { WorkflowOwnershipBanner } from '@/components/workflow/WorkflowOwnershipBanner';
import { getWorkflowViewModel } from '@/lib/workflow-view-model';
import { InspectionChecklist } from './components/InspectionChecklist';
import { ResultLetterPanel } from './components/ResultLetterPanel';
import { InspectionReferencePanels } from './components/InspectionReferencePanels';
import { InspectionDialogs } from './components/InspectionDialogs';
import { InspectionActionPanel } from './components/InspectionActionPanel';
import { MushafContentReviewTable } from './components/MushafContentReviewTable';
import { InspectionDocumentStudio } from './components/InspectionDocumentStudio';
import { useInspection } from './hooks/useInspection';
import { getInspectionDraft, getInspectionViewModel } from './inspection-view-model';
import { PageHeader } from '@/components/ui/PageHeader';
import { SignatoryProgress } from '@/components/common/SignatoryProgress';
import { EmailDeliveryStatus } from '@/components/common/EmailDeliveryStatus';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageCheck,
  AlertCircle,
  Save,
  Send,
  Play,
  Info,
  Printer,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  BookOpen,
  History,
} from 'lucide-react';

const CHECKLIST_DEFINITIONS = [
  {
    code: 'COMPLETENESS_JUZ',
    title: '1. Kelengkapan Juz',
    description: 'Pemeriksaan kelengkapan mushaf 30 juz secara utuh.',
  },
  {
    code: 'COMPLETENESS_SURAH',
    title: '2. Kelengkapan Surah',
    description: 'Pemeriksaan kelengkapan 114 surah mulai Al-Fatihah sampai An-Nas.',
  },
  {
    code: 'PAGE_ORDER',
    title: '3. Urutan Halaman',
    description: 'Pemeriksaan kerapian dan keteraturan urutan halaman mushaf tanpa ada yang tertukar atau terlewat.',
  },
  {
    code: 'MSI_CONFORMITY',
    title: '4. Kesesuaian Dengan Kaidah Penulisan Mushaf Standar Indonesia',
    description: 'Pemeriksaan kaidah rasm Usmani, tanda harakat, tanda waqaf, dan tanda baca sesuai pedoman Mushaf Standar Indonesia (MSI).',
  },
  {
    code: 'TAJWID_COLOR',
    title: '5. Kesesuaian Dengan Kaidah Tajwid Warna',
    description: 'Pemeriksaan penerapan kode dan panduan tajwid warna sesuai pedoman LPMQ (bila menggunakan tajwid warna).',
  },
  {
    code: 'TRANSLATION_KEMENAG',
    title: '6. Kesesuaian Dengan Terjemah Kemenag',
    description: "Pemeriksaan teks terjemahan Al-Qur'an Kementerian Agama RI edisi mutakhir (bila mushaf berterjemah).",
  },
  {
    code: 'BRAILLE_PEDOMAN',
    title: "7. Kesesuaian Dengan Pedoman Penulisan Al-Qur'an Braille Kemenag",
    description: "Pemeriksaan sistem simbol dan standarisasi Al-Qur'an Braille Kemenag RI (khusus mushaf braille).",
  },
  {
    code: 'TRANSLITERATION_PEDOMAN',
    title: '8. Kesesuaian Dengan Pedoman Transliterasi',
    description: 'Pemeriksaan pedoman transliterasi Arab-Latin SKB Menteri Agama dan Mendikbud (bila memuat transliterasi).',
  },
];

export const VerificationInspectionPage = () => {
  const { id } = useParams(); // assignmentId
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tab state for mobile/tablet responsive layout (<1024px)
  const [activeMobileTab, setActiveMobileTab] = useState('checklist'); // 'naskah' | 'checklist' | 'konten' | 'hasil' | 'arsip'
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState('checklist'); // 'checklist' | 'konten' | 'hasil' | 'arsip'
  const [contentReview, setContentReview] = useState(null);

  // Document preview selection
  const [activeDocTab, setActiveDocTab] = useState('digital'); // 'digital' | 'receipt' | 'letter'
  const [selectedFileId, setSelectedFileId] = useState(null);

  // Official letter editor/preview toggle
  const [letterTab, setLetterTab] = useState('editor'); // 'editor' | 'preview'
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

  // Modals state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [resultDocumentNo, setResultDocumentNo] = useState('');
  const [minutesDocumentNo, setMinutesDocumentNo] = useState('');
  const [approveModalError, setApproveModalError] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);

  useEffect(() => () => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
  }, [pdfPreview]);

  // Handover to Distributor State (Langkah 7 SOP)
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverCondition, setHandoverCondition] = useState('BAIK');
  const [handoverVolumeCount, setHandoverVolumeCount] = useState(30);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverModalError, setHandoverModalError] = useState(null);

  // Form State
  const [checklist, setChecklist] = useState(
    CHECKLIST_DEFINITIONS.map((def) => ({
      code: def.code,
      result: 'SESUAI',
      notes: '',
    }))
  );
  const [decision, setDecision] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [notes, setNotes] = useState('');
  const [letterText, setLetterText] = useState('');
  const [billingNo, setBillingNo] = useState('');
  const [billingFileId, setBillingFileId] = useState('');
  const [billingFileName, setBillingFileName] = useState('');
  const [billingUploading, setBillingUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const { detail, loading, error, setError, fetchDetail } = useInspection(id, async (data) => {
    if (data.assignment?.id && data.assignment.id !== id) {
      navigate(`/internal/verifications/${data.assignment.id}`, { replace: true });
    }

    if (data.registration?.manuscript_files?.length > 0 && !selectedFileId) {
      setSelectedFileId(data.registration.manuscript_files[0].id);
    }
    if (data.registration?.physical_master_intake?.volume_count) {
      setHandoverVolumeCount(data.registration.physical_master_intake.volume_count);
    }

    const draft = getInspectionDraft(data, CHECKLIST_DEFINITIONS);
    if (draft.checklist) setChecklist(draft.checklist);
    if (draft.decision) setDecision(draft.decision);
    if (draft.notes) setNotes(draft.notes);
    if (draft.letterText) setLetterText(draft.letterText);
    if (data.latest_result_document?.content_snapshot?.billing_no) setBillingNo(data.latest_result_document.content_snapshot.billing_no);
    setBillingFileId(data.latest_result_document?.content_snapshot?.billing_file_id || '');
    if (data.latest_result_document?.content_snapshot?.mushaf_content_review) {
      setContentReview(data.latest_result_document.content_snapshot.mushaf_content_review);
    }
    if (data.latest_result_document?.document_no) setResultDocumentNo(data.latest_result_document.document_no);
    if (data.berita_acara?.document_no) setMinutesDocumentNo(data.berita_acara.document_no);
  });
  const assignmentId = detail?.assignment?.id || id;
  useEffect(() => {
    if (!detail?.registration || new URLSearchParams(location.search).get('handover') !== '1') return;
    if (detail.registration.core_distributor_id) setHandoverModalOpen(true);
    navigate(location.pathname, { replace: true });
  }, [detail, location.pathname, location.search, navigate]);
  const workflowVm = useMemo(() => {
    return detail?.registration ? getWorkflowViewModel(detail.registration, currentUser) : null;
  }, [detail, currentUser]);

  const allFiles = useMemo(() => {
    const list = [...(detail?.registration?.manuscript_files || [])];
    const meta = detail?.registration?.foreign_metadata || {};
    const knownFileIds = new Set(list.map((f) => f.file_id || f.id));

    if (meta.surat_permohonan_file_id && !knownFileIds.has(meta.surat_permohonan_file_id)) {
      list.unshift({
        id: meta.surat_permohonan_file_id,
        file_id: meta.surat_permohonan_file_id,
        type: 'SURAT_PERMOHONAN',
        file_name: 'Surat-Permohonan-Tashih.pdf',
        version: 1,
      });
      knownFileIds.add(meta.surat_permohonan_file_id);
    }
    if (meta.bukti_tashih_file_id && !knownFileIds.has(meta.bukti_tashih_file_id)) {
      list.push({
        id: meta.bukti_tashih_file_id,
        file_id: meta.bukti_tashih_file_id,
        type: 'FOREIGN_TASHIH_CERTIFICATE',
        file_name: 'Bukti-Tashih-Asal.pdf',
        version: 1,
      });
      knownFileIds.add(meta.bukti_tashih_file_id);
    }
    if (meta.surat_pernyataan_perubahan_file_id && !knownFileIds.has(meta.surat_pernyataan_perubahan_file_id)) {
      list.push({
        id: meta.surat_pernyataan_perubahan_file_id,
        file_id: meta.surat_pernyataan_perubahan_file_id,
        type: 'SURAT_PERNYATAAN',
        file_name: 'Surat-Pernyataan.pdf',
        version: 1,
      });
      knownFileIds.add(meta.surat_pernyataan_perubahan_file_id);
    }
    return list;
  }, [detail?.registration]);

  // Sinkronisasi canonical assignment URL jika masuk menggunakan registration_id
  useEffect(() => {
    if (detail?.assignment?.id && id !== detail.assignment.id) {
      navigate(`/internal/verifications/${detail.assignment.id}`, { replace: true });
    }
  }, [detail, id, navigate]);

  // Set default letter text if blank
  useEffect(() => {
    if (!letterText && detail?.registration) {
      loadOfficialTemplate(decision);
    }
  }, [detail, decision]);

  const loadOfficialTemplate = (dec) => {
    if (!detail?.registration) return;
    const reg = detail.registration;
    const regNo = reg.registration_no || 'NOMOR_REGISTRASI';
    const publisher = reg.publisher?.legal_name || 'PENERBIT';
    const title = reg.title || 'NASKAH MUSHAF';
    const findings = checklist.filter(item => item.result === 'TIDAK_SESUAI')
      .map((item, index) => `${index + 1}. ${CHECKLIST_DEFINITIONS.find(def => def.code === item.code)?.title || item.code}: ${item.notes || 'perlu diperbaiki'}`)
      .join('\n');

    if (dec === 'PASSED') {
      setLetterText(
        `Sehubungan dengan permohonan tanda tashih naskah ${title} dari ${publisher} dengan nomor registrasi ${regNo}, kami sampaikan bahwa naskah tersebut dinyatakan lolos verifikasi administrasi dan pemeriksaan awal master fisik oleh LPMQ.\n\nSelanjutnya, penerbit dimohon menyelesaikan pembayaran PNBP pelayanan Surat Tanda Tashih menggunakan kode billing yang tercantum pada surat ini. Bukti pembayaran perlu diunggah pada portal layanan untuk diperiksa satu kali oleh petugas.\n\nProses pentashihan naskah dilanjutkan setelah pembayaran PNBP diterima oleh LPMQ.`
      );
    } else {
      setLetterText(
        `Sehubungan dengan permohonan tanda tashih naskah ${title} dari ${publisher} dengan nomor registrasi ${regNo}, kami sampaikan bahwa naskah tersebut belum lolos verifikasi.\n\nAspek yang perlu diperbaiki:\n${findings || '1. Lengkapi rincian ketidaksesuaian pada catatan pemeriksaan.'}\n\nMaster mushaf dikembalikan kepada penerbit untuk diperbaiki. Setelah seluruh catatan dipenuhi, penerbit dapat mengajukan kembali naskah melalui portal layanan LPMQ.`
      );
    }
  };

  const handleStartVerification = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await verificationApi.startVerification(assignmentId);
      await fetchDetail();
      setSuccessMessage('Pemeriksaan berhasil dimulai. Lembar kerja verifikasi kini aktif.');
    } catch (err) {
      setError(err.message || 'Gagal memulai pemeriksaan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChecklistChange = (code, field, value) => {
    setIsDirty(true);
    setChecklist((prev) =>
      prev.map((item) => (item.code === code ? { ...item, [field]: value } : item))
    );
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[`${code}_${field}`];
      return copy;
    });
  };

  const validateForm = (isSubmit = false) => {
    const errors = {};

    checklist.forEach((item) => {
      if (item.result === 'TIDAK_SESUAI' && (!item.notes || !item.notes.trim())) {
        errors[`${item.code}_notes`] = 'Catatan wajib diisi untuk butir yang tidak sesuai.';
      }
      if (item.notes?.trim().length > 1000) errors[`${item.code}_notes`] = 'Catatan maksimal 1000 karakter.';
    });

    if (notes.trim().length > 2000) errors.notes = 'Catatan kesimpulan maksimal 2000 karakter.';
    if (letterText.trim().length > 10000) errors.letter_text = 'Teks draf surat maksimal 10000 karakter.';
    if (isSubmit && decision === 'PASSED' && billingNo.trim().length < 3) errors.billing_no = 'Kode billing PNBP wajib diisi sebelum surat lolos diajukan.';
    if (isSubmit && decision === 'PASSED' && !billingFileId) errors.billing_file_id = 'Unggah dokumen billing PNBP dalam format PDF sebelum surat diajukan.';

    if (decision === 'PASSED') {
      const hasTidakSesuai = checklist.some((i) => i.result === 'TIDAK_SESUAI');
      if (hasTidakSesuai) {
        errors.decision =
          'Keputusan Lolos Verifikasi memerlukan seluruh butir checklist Sesuai atau Tidak Berlaku.';
      }
    } else if (decision === 'REVISION_REQUIRED') {
      const hasTidakSesuai = checklist.some((i) => i.result === 'TIDAK_SESUAI');
      if (!hasTidakSesuai) {
        errors.decision =
          'Keputusan Perlu Perbaikan memerlukan minimal 1 butir checklist yang Tidak Sesuai.';
      }
      if (!notes || !notes.trim()) {
        errors.notes = 'Alasan perbaikan penerbit wajib diisi secara menyeluruh.';
      }
    }

    if (isSubmit) {
      if (!letterText || letterText.trim().length < 20) {
        errors.letter_text = 'Teks draf surat hasil verifikasi minimal 20 karakter.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validateForm(false)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload = {
        checklist,
        decision,
        notes: notes.trim() || undefined,
        letter_text: letterText.trim() || undefined,
        billing_no: decision === 'PASSED' ? billingNo.trim() || undefined : undefined,
        billing_file_id: decision === 'PASSED' ? billingFileId || undefined : undefined,
        mushaf_content_review: contentReview || undefined,
      };
      await verificationApi.saveDraft(assignmentId, payload);
      setIsDirty(false);
      setSuccessMessage('Draf checklist dan surat berhasil disimpan.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan draf.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSubmitConfirm = () => {
    if (!validateForm(true)) {
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const handleConfirmSubmitToHead = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload = {
        checklist,
        decision,
        notes: notes.trim() || undefined,
        letter_text: letterText.trim(),
        billing_no: decision === 'PASSED' ? billingNo.trim() : undefined,
        billing_file_id: decision === 'PASSED' ? billingFileId || undefined : undefined,
        mushaf_content_review: contentReview || undefined,
      };
      await verificationApi.submitDraft(assignmentId, payload);
      setSubmitConfirmOpen(false);
      setIsDirty(false);
      setSuccessMessage('Surat hasil telah ditandatangani internal oleh Verifikator dan diajukan bersama kode billing kepada Kepala LPMQ.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal mengajukan draf hasil verifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    const targetDoc = latestResultDoc || detail?.latest_result_document;
    const targetBaDoc = beritaAcaraDoc || detail?.berita_acara;
    if (!targetDoc?.id) return;

    const resNo = resultDocumentNo.trim();
    const minNo = minutesDocumentNo.trim();

    if (!resNo || resNo.length < 3) {
      setApproveModalError('Nomor surat hasil wajib diisi (minimal 3 karakter).');
      return;
    }
    if (targetBaDoc && (!minNo || minNo.length < 3)) {
      setApproveModalError('Nomor berita acara wajib diisi (minimal 3 karakter).');
      return;
    }
    if (resNo.length > 191 || (targetBaDoc && minNo.length > 191)) {
      setApproveModalError('Nomor dokumen tidak boleh melebihi 191 karakter.');
      return;
    }

    setActionLoading(true);
    setApproveModalError(null);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.approveDocument(targetDoc.id, {
        document_numbers: {
          [targetDoc.document_type]: resNo,
          ...(targetBaDoc ? { BERITA_ACARA_VERIFIKASI: minNo } : {}),
        },
      });
      setApproveConfirmOpen(false);
      setSuccessMessage('Surat hasil dan Berita Acara telah disahkan. Kode billing tercantum pada PDF surat hasil; verifikator dapat langsung mengirimkannya.');
      await fetchDetail();
    } catch (err) {
      setApproveModalError(err.message || 'Gagal menyetujui surat hasil verifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnDocument = async (e) => {
    e?.preventDefault();
    if (!latestResultDoc?.id) return;
    if (returnReason.trim().length < 5 || returnReason.trim().length > 1000) {
      setError('Alasan pengembalian draf minimal 5 karakter.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.returnDocument(latestResultDoc.id, { reason: returnReason.trim() });
      setSuccessMessage('Draf surat hasil verifikasi berhasil dikembalikan ke verifikator dengan catatan perbaikan.');
      setReturnModalOpen(false);
      setReturnReason('');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal mengembalikan draf hasil verifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignDocument = async (docId) => {
    if (!docId) return;
    if (!window.confirm('Konfirmasi persetujuan internal dokumen ini?')) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.signDocument(docId);
      setSuccessMessage('Persetujuan internal berhasil dicatat.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal menandatangani dokumen.');
    } finally {
      setActionLoading(false);
    }
  };

  const getDocumentPdfUrl = async docId => {
    const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const response = await fetch(`${base}/verification-documents/${docId}/pdf`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!response.ok) throw new Error('PDF dokumen belum dapat dibuka.');
    return URL.createObjectURL(await response.blob());
  };

  const handleBillingFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024 || file.size === 0) {
      setValidationErrors(previous => ({ ...previous, billing_file_id: 'Pilih PDF billing PNBP berisi data, maksimal 10 MB.' }));
      return;
    }
    setBillingUploading(true);
    setValidationErrors(previous => ({ ...previous, billing_file_id: undefined }));
    try {
      const uploaded = await fileApi.upload(file);
      setBillingFileId(uploaded.id);
      setBillingFileName(file.name);
      setIsDirty(true);
    } catch (reason) {
      setValidationErrors(previous => ({ ...previous, billing_file_id: reason.message || 'Dokumen billing belum berhasil diunggah.' }));
    } finally {
      setBillingUploading(false);
    }
  };

  const showDocumentPdf = async (docId, title) => {
    try {
      const url = await getDocumentPdfUrl(docId);
      setPdfPreview({ url, title });
    } catch (reason) { setError(reason.message); }
  };

  const handleRetryEmail = async (docId) => {
    if (!docId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.retryEmail(docId);
      setSuccessMessage('Email hasil verifikasi berhasil dikirim ulang kepada penerbit.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendDocument = async () => {
    if (!latestResultDoc?.id) return;
    if (!window.confirm('Kirimkan surat hasil verifikasi resmi kepada penerbit dan terbitkan tagihan pembayaran PNBP?')) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.sendDocument(latestResultDoc.id, { channel: 'IN_APP' });
      setSuccessMessage('Surat hasil verifikasi telah berhasil dikirimkan kepada penerbit dan tagihan pembayaran PNBP aktif terbit.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal mengirimkan surat hasil verifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHandover = async (e) => {
    e?.preventDefault();
    if (!detail?.registration?.id) return;
    if (!detail.registration.core_distributor_id) {
      setHandoverModalError('Distributor tim inti belum ditetapkan. Hubungi administrator.');
      return;
    }

    setActionLoading(true);
    setHandoverModalError(null);
    try {
      const payload = {
        condition: handoverCondition.trim() || 'BAIK',
        volume_count: Number(handoverVolumeCount) || 30,
        notes: handoverNotes.trim() || undefined,
      };

      await handoverApi.createHandover(detail.registration.id, payload);
      setSuccessMessage(
        'Master fisik mushaf berhasil diserahkan kepada Distributor. Nomor BAST telah terbit dan status naskah berpindah ke "Menunggu Distributor".'
      );
      setHandoverModalOpen(false);
      setHandoverNotes('');
      await fetchDetail();
    } catch (err) {
      setHandoverModalError(err.message || 'Gagal menyerahkan master fisik ke distributor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyReceipt = (val) => {
    if (!val) return;
    navigator.clipboard?.writeText(val);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-3">
        <div className="w-9 h-9 border-3 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-ink">Memuat berkas dan lembar kerja pemeriksaan...</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <ErrorState
          title="Gagal Membuka Pemeriksaan"
          message={error}
          onRetry={fetchDetail}
        />
      </div>
    );
  }

  const {
    assignment, registration, publisher, physicalMaster, notaDinas,
    latestResultDoc, beritaAcaraDoc, isLatestDocSigned, isBaSigned, isAllFullySigned,
    latestSignatory, canUserSignLatest, baSignatories, baMySignatory, priorBaPending,
    canUserSignBa, isEmailFailed, isRevoked, isAssigned, isInProgress,
    isCompletedOrSubmitted, userRoles, isHead, isVerifier, isAdmin,
    isAssignedVerifier, canVerifierWork, isReadOnly, canHeadApprove, approvalReady, isSent,
    canVerifierSend, latestPayment, latestHandover, isPaymentVerified, canVerifierHandover,
    isWaitingDistributor, isHandoverReceived, selectedFileObj, sesuaiCount, tidakSesuaiCount,
    tidakBerlakuCount,
  } = getInspectionViewModel(detail, currentUser, selectedFileId, checklist);

  const activeFile = allFiles.find((f) => f.id === selectedFileId || f.file_id === selectedFileId) || selectedFileObj || allFiles[0];

  const getFileLabel = (f) => {
    if (!f) return 'Berkas';
    const type = f.type || f.file_type;
    if (type === 'COVER') return 'Sampul / Cover';
    if (type === 'SURAT_PERMOHONAN' || f.file_id === registration.foreign_metadata?.surat_permohonan_file_id) return 'Surat Permohonan';
    if (type === 'SAMPLE_PAGE_1_5' || type === 'SAMPLE_PAGE') return 'Sampel Hal 1-3';
    if (type === 'FOREIGN_TASHIH_CERTIFICATE') return 'Bukti Tashih';
    if (type === 'SURAT_PERNYATAAN') return 'Surat Pernyataan';
    if (type === 'DUMMY') return 'Dummy Cetak';
    if (type === 'MASTER_COMPLETED') return 'Master Lengkap';
    return f.file_name || 'PDF Berkas';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Top Header & Breadcrumb */}
      <PageHeader
        title={registration.title || "Mushaf Al-Qur'an Standar Kemenag"}
        subtitle={`Nomor Registrasi: ${registration.registration_no || 'REG-PENDING'} · Pemohon: ${publisher.legal_name || '-'}`}
        breadcrumbs={[
          { label: 'Antrean Verifikasi', href: '/internal/verifications' },
          { label: 'Pemeriksaan Naskah' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-ink bg-surface-subtle border border-line-strong px-2.5 py-1 rounded-md">
              {registration.registration_no}
            </span>
            <StatusBadge status={registration.status} />
            {isHead && (
              <span className="px-2.5 py-1 rounded-md bg-civic-warningSoft text-civic-warning border border-civic-warningLine text-xs font-bold">
                Otoritas Kepala LPMQ
              </span>
            )}
          </div>
        }
      />

      <section className="rounded-xl border border-line bg-white p-4 space-y-3 text-sm shadow-2xs" aria-label="Alur penugasan dan dokumen verifikasi">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-ink text-sm flex items-center gap-1.5 mr-1">
              <FileText className="w-4 h-4 text-brand-800" />
              Dokumen Verifikasi Resmi
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {[[notaDinas, 'Disposisi'], [latestResultDoc, 'Surat hasil'], [beritaAcaraDoc, 'Berita acara']].filter(([doc]) => doc?.id).map(([doc, title]) => (
                <Button key={doc.id} variant="outline" size="sm" className="text-xs" onClick={() => showDocumentPdf(doc.id, title)}>
                  <Printer className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Lihat / Cetak PDF {title}
                </Button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
            className="text-xs font-semibold text-brand-800 hover:text-brand-900 inline-flex items-center gap-1 cursor-pointer"
          >
            {showWorkflowGuide ? (
              <>Sembunyikan Panduan SOP <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Petunjuk Alur SOP Verifikasi <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>

        <div className={showWorkflowGuide ? 'pt-3 border-t border-line space-y-3 animate-fadeIn' : 'hidden'}>
          <p className="text-xs text-ink-muted">Ikuti urutan ini dari disposisi sampai surat hasil dikirim ke penerbit:</p>
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-xs">
            {[
              ['1', 'Penerimaan & penugasan', `Master fisik ${physicalMaster.receipt_no ? `diterima (${physicalMaster.receipt_no})` : 'menunggu tanda terima'}; Disposisi ${notaDinas.document_no || 'belum terbit'}.`],
              ['2', 'Periksa PDF Disposisi', 'Cocokkan nomor, naskah, nama verifikator, dan batas tugas pada PDF.'],
              ['3', 'Periksa naskah', 'Mulai pemeriksaan, isi empat butir checklist, dan catat setiap ketidaksesuaian.'],
              ['4', 'Susun & ajukan surat', 'Pilih hasil, tinjau pratinjau surat, lalu ajukan draf untuk persetujuan Kepala LPMQ.'],
            ].map(([number, title, description]) => (
              <li key={number} className="rounded-lg border border-line bg-canvas p-3 flex gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white font-bold">{number}</span>
                <div><strong className="block text-ink">{title}</strong><p className="mt-1 text-ink-muted leading-relaxed">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {pdfPreview && (
        <div role="dialog" aria-modal="true" aria-label={`PDF ${pdfPreview.title}`} className="fixed inset-0 z-50 bg-ink/70 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">PDF {pdfPreview.title}</h2>
                <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF untuk mencetak dokumen ini.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={pdfPreview.url} download={`${pdfPreview.title.replace(/\s+/g, '-')}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
                <Button variant="outline" className="text-xs" onClick={() => setPdfPreview(null)}>Tutup</Button>
              </div>
            </div>
            <iframe title={`Penampil PDF ${pdfPreview.title}`} src={pdfPreview.url} className="flex-1 w-full border-0" />
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between text-brand-900 text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-brand-800 hover:underline font-bold px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl flex items-center justify-between text-civic-danger text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-civic-danger shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-civic-danger hover:underline font-bold px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Revocation Banner if REVOKED */}
      {isRevoked && (
        <div className="p-4 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft text-civic-danger flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-civic-danger shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-civic-danger text-sm">
              Penugasan Verifikasi Ini Telah Dicabut (REVOKED)
            </h4>
            <p className="leading-relaxed">
              Penugasan ini dicabut oleh {assignment.revoked_by?.name || 'Kepala LPMQ'} pada {assignment.revoked_at ? new Date(assignment.revoked_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}. Lembar pemeriksaan berstatus hanya-baca (read-only).
            </p>
            {assignment.revocation_reason && (
              <p className="p-2 bg-white rounded border border-civic-dangerLine font-medium">
                Alasan pencabutan: &ldquo;{assignment.revocation_reason}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* SLA & Start Banner if ASSIGNED */}
      {isAssigned && (
        <div className="p-5 rounded-xl border border-brand-800 bg-brand-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-civicGold-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-civicGold-700" />
              Pemeriksaan Belum Dimulai
            </h4>
            <p className="text-xs text-brand-100/80 max-w-xl leading-relaxed">
              Sesuai SOP, Anda harus memulai penelaahan secara resmi sebelum mengisi checklist dan menyusun draf hasil verifikasi.
            </p>
          </div>
          <Button
            variant="gold"
            onClick={handleStartVerification}
            disabled={actionLoading}
            className="text-xs px-5 py-2 font-bold inline-flex items-center gap-2 shadow-xs shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            {actionLoading ? 'Memulai...' : 'Mulai Pemeriksaan Sekarang'}
          </Button>
        </div>
      )}

      {/* Workflow Ownership Banner */}
      {workflowVm && (
        <WorkflowOwnershipBanner viewModel={workflowVm} />
      )}

      {/* Workflow Stepper */}
      <WorkflowStepper currentStatus={registration.status} currentStageId={2} />

      {/* Return reason alert banner if returned by Kepala */}
      {assignment.status === 'IN_PROGRESS' && assignment.return_reason && (
        <div className="p-4 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft/70 text-civic-danger flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-civic-danger shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-civic-danger">
              Draf Dikembalikan oleh Kepala LPMQ
            </h4>
            <p className="text-civic-danger leading-relaxed">
              <strong>Catatan Perbaikan:</strong> &ldquo;{assignment.return_reason}&rdquo;
            </p>
            <p className="text-civic-danger text-[11px]">
              Silakan periksa kembali berkas/checklist yang perlu disesuaikan, lalu ajukan draf perbaikan.
            </p>
          </div>
        </div>
      )}

      {/* Info banner if WAITING_APPROVAL */}
      {assignment.status === 'WAITING_APPROVAL' && !canHeadApprove && (
        <div className="p-4 rounded-xl border border-civic-warningLine bg-civic-warningSoft/70 text-civic-warning flex items-start gap-3 shadow-2xs">
          <Clock className="w-5 h-5 text-civic-warning shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-civic-warning">
              Draf Sedang Diperiksa Kepala LPMQ
            </h4>
            <p className="text-civic-warning leading-relaxed">
              Draf hasil telaah dan Berita Acara telah diajukan. Tidak ada tindakan yang diperlukan dari Verifikator saat ini.
            </p>
          </div>
        </div>
      )}

      {/* Info banner if READY_TO_SEND */}
      {assignment.status === 'READY_TO_SEND' && (
        <div className="p-4 rounded-xl border border-brand-100 bg-brand-50 text-brand-900 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-brand-900">
              Dokumen Telah Lengkap Ditandatangani
            </h4>
            <p className="text-brand-800 leading-relaxed">
              Surat Pemberitahuan dan Berita Acara telah dikonfirmasi secara internal. Verifikator dapat mengirimkan surat hasil verifikasi ke penerbit.
            </p>
          </div>
        </div>
      )}

      {/* SOP Step 7: Serah Terima Master Fisik Panel */}
      {canVerifierHandover && (
        <div className="p-5 bg-brand-50 border border-brand-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-900 rounded-xl shrink-0">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
                Langkah 7 SOP: Serah-Terima Master Fisik ke Distributor
              </h4>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                {registration.status === 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED'
                  ? 'Master fisik telah diperbaiki. Periksa kembali lalu serahkan ke Distributor dengan BAST baru; pembayaran tetap sah.'
                  : 'Pembayaran PNBP telah diverifikasi sah. Serahkan master cetak fisik mushaf kepada petugas Distributor di loket pentashihan.'}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => setHandoverModalOpen(true)}
            disabled={actionLoading}
            className="w-full md:w-auto text-xs shrink-0"
          >
            <PackageCheck className="w-4 h-4 mr-1.5" />
            {registration.status === 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED' ? 'Serahkan Kembali & Terbitkan BAST Baru' : 'Serahkan Master Fisik & Terbitkan BAST'}
          </Button>
        </div>
      )}

      {latestHandover && (
        <section className="rounded-xl border border-line bg-white p-5 text-xs shadow-2xs" aria-label="Status serah terima master fisik">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-ink">Serah terima master fisik ke distributor</h4>
              <p className="text-ink-muted">BAST {latestHandover.receipt_no} · {latestHandover.volume_count} jilid · {latestHandover.to_user?.name || 'Distributor'}</p>
              <p className="font-semibold text-brand-800">
                {latestHandover.status === 'RECEIVED' ? 'Sudah diterima distributor' : latestHandover.status === 'RETURNED' ? 'Dikembalikan distributor untuk perbaikan' : 'Menunggu konfirmasi penerimaan distributor'}
              </p>
            </div>
            <Button variant="outline" onClick={() => handoverApi.downloadHandoverPdf(latestHandover.id, latestHandover.receipt_no).catch(err => setError(err.message))}>
              Unduh PDF BAST
            </Button>
          </div>
        </section>
      )}

      {/* Responsive View Switcher for Screen < 1024px */}
      <div className="lg:hidden flex items-center p-1 bg-surface-subtle rounded-xl border border-line text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveMobileTab('naskah')}
          className={`flex-1 py-2 px-2.5 whitespace-nowrap rounded-lg text-center transition-all ${
            activeMobileTab === 'naskah' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Naskah & Berkas
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('checklist')}
          className={`flex-1 py-2 px-2.5 whitespace-nowrap rounded-lg text-center transition-all ${
            activeMobileTab === 'checklist' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('konten')}
          className={`flex-1 py-2 px-2.5 whitespace-nowrap rounded-lg text-center transition-all ${
            activeMobileTab === 'konten' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Audit Konten
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('hasil')}
          className={`flex-1 py-2 px-2.5 whitespace-nowrap rounded-lg text-center transition-all ${
            activeMobileTab === 'hasil' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Hasil & Surat
        </button>
      </div>

      {/* THE SPLIT-STUDIO WORKSTATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (6 cols): Inspection Document Studio */}
        <div className={`lg:col-span-6 space-y-4 ${activeMobileTab === 'naskah' ? 'block' : 'hidden lg:block'}`}>
          <InspectionDocumentStudio
            allFiles={allFiles}
            activeFile={activeFile}
            selectedFileId={selectedFileId}
            setSelectedFileId={setSelectedFileId}
            getFileLabel={getFileLabel}
            registration={registration}
            publisher={publisher}
            physicalMaster={physicalMaster}
            assignment={assignment}
            formatDate={formatDate}
            handleCopyReceipt={handleCopyReceipt}
            copiedReceipt={copiedReceipt}
          />
        </div>

        {/* RIGHT COLUMN (6 cols): Interactive Workbench */}
        <div className="lg:col-span-6 space-y-4">
          {/* Desktop Tab Selector Header */}
          <div className="hidden lg:flex items-center justify-between p-1 bg-surface-subtle border border-line rounded-xl text-xs font-semibold">
            <div className="flex items-center gap-1 w-full">
              <button
                type="button"
                onClick={() => setActiveWorkbenchTab('checklist')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeWorkbenchTab === 'checklist'
                    ? 'bg-white text-brand-900 shadow-2xs font-bold border border-line'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-brand-700" />
                <span>Checklist (4 Butir)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-50 text-brand-800 border border-brand-200">
                  {sesuaiCount + tidakBerlakuCount}/4
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkbenchTab('konten')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeWorkbenchTab === 'konten'
                    ? 'bg-white text-brand-900 shadow-2xs font-bold border border-line'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-brand-700" />
                <span>Konten Mushaf</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-civic-infoSoft text-civic-info border border-civic-infoLine">
                  REV-16
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkbenchTab('hasil')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeWorkbenchTab === 'hasil'
                    ? 'bg-white text-brand-900 shadow-2xs font-bold border border-line'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-brand-700" />
                <span>Hasil & Draf Surat</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  decision === 'PASSED'
                    ? 'bg-brand-50 text-brand-800 border border-brand-200'
                    : 'bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine'
                }`}>
                  {decision === 'PASSED' ? 'Lolos' : 'Perbaikan'}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: CHECKLIST */}
          <div className={`${activeMobileTab === 'checklist' ? 'block' : 'hidden'} ${activeWorkbenchTab === 'checklist' ? 'lg:block' : 'lg:hidden'}`}>
            <InspectionChecklist
              activeMobileTab="checklist"
              sesuaiCount={sesuaiCount}
              tidakBerlakuCount={tidakBerlakuCount}
              checklist={checklist}
              validationErrors={validationErrors}
              isReadOnly={isReadOnly}
              handleChecklistChange={handleChecklistChange}
              definitions={CHECKLIST_DEFINITIONS}
              className="space-y-4"
            />
          </div>

          {/* TAB 2: AUDIT KONTEN MUSHAF (REV-16) */}
          <div className={`${activeMobileTab === 'konten' ? 'block' : 'hidden'} ${activeWorkbenchTab === 'konten' ? 'lg:block' : 'lg:hidden'}`}>
            <MushafContentReviewTable
              registration={registration}
              contentReview={contentReview}
              onChange={(data) => {
                setIsDirty(true);
                setContentReview(data);
              }}
              isReadOnly={isReadOnly}
            />
          </div>

          {/* TAB 3: HASIL & DRAF SURAT */}
          <div className={`${activeMobileTab === 'hasil' ? 'block' : 'hidden'} ${activeWorkbenchTab === 'hasil' ? 'lg:block' : 'lg:hidden'} space-y-4`}>
            {/* Multi-Signatory Progress & Email Status Banners */}
            {isHead && latestResultDoc?.status === 'SUBMITTED' && !approvalReady && (
              <div role="alert" className="rounded-xl border border-civic-warningLine bg-civic-warningSoft p-4 text-xs text-civic-warning">
                Persetujuan Kepala tersedia setelah Verifikator menandatangani surat dan Berita Acara, serta kode billing PNBP pada surat lolos sudah tercatat sebagai tagihan.
              </div>
            )}
            {(['SUBMITTED', 'APPROVED', 'SIGNING', 'SIGNED'].includes(latestResultDoc?.status) || ['SUBMITTED', 'APPROVED', 'SIGNING', 'SIGNED'].includes(beritaAcaraDoc?.status)) && (
              <div className="p-4 bg-white rounded-xl border border-line shadow-2xs space-y-4">
                <SignatoryProgress
                  signatories={[
                    ...(latestResultDoc?.signatories || []).map(sig => ({
                      role_label: `Surat Hasil - Urutan ${sig.sign_order}`,
                      name: sig.name_position_snapshot,
                      status: sig.status,
                      signed_at: sig.signed_at,
                    })),
                    ...baSignatories.map((sig) => ({
                      role_label: `Berita Acara - Urutan ${sig.sign_order}`,
                      name: sig.name_position_snapshot,
                      status: sig.status,
                      signed_at: sig.signed_at,
                    })),
                  ]}
                />

                <div className="flex flex-wrap items-center gap-3">
                  {canUserSignLatest && (
                    <Button
                      variant="primary"
                      onClick={() => handleSignDocument(latestResultDoc.id)}
                      disabled={actionLoading}
                      className="text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Konfirmasi Internal Surat Pemberitahuan
                    </Button>
                  )}
                  {canUserSignBa && (
                    <Button
                      variant="primary"
                      onClick={() => handleSignDocument(beritaAcaraDoc.id)}
                      disabled={actionLoading}
                      className="text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Konfirmasi Internal Berita Acara
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isEmailFailed && (
              <EmailDeliveryStatus
                status="FAILED"
                recipient={publisher.email || 'penerbit@mushaf.id'}
                errorMessage={latestResultDoc?.email_delivery_error}
                onRetry={() => handleRetryEmail(latestResultDoc?.id)}
                retrying={actionLoading}
              />
            )}

            <ResultLetterPanel
              activeMobileTab="hasil"
              decision={decision}
              setDecision={setDecision}
              loadOfficialTemplate={loadOfficialTemplate}
              setIsDirty={setIsDirty}
              isReadOnly={isReadOnly}
              validationErrors={validationErrors}
              notes={notes}
              setNotes={setNotes}
              letterTab={letterTab}
              setLetterTab={setLetterTab}
              letterText={letterText}
              setLetterText={setLetterText}
              billingNo={billingNo}
              setBillingNo={setBillingNo}
              billingFileId={billingFileId}
              billingFileName={billingFileName}
              billingUploading={billingUploading}
              handleBillingFile={handleBillingFile}
              resultDocumentId={latestResultDoc?.id}
              registration={registration}
              publisher={publisher}
              className="p-5 bg-white rounded-xl border border-line shadow-2xs space-y-5"
            />
          </div>
        </div>
      </div>

      <InspectionActionPanel
        isInProgress={isInProgress}
        sesuaiCount={sesuaiCount}
        tidakBerlakuCount={tidakBerlakuCount}
        isDirty={isDirty}
        canHeadApprove={canHeadApprove}
        assignment={assignment}
        isSent={isSent}
        canVerifierWork={canVerifierWork}
        handleSaveDraft={handleSaveDraft}
        actionLoading={actionLoading}
        setReturnModalOpen={setReturnModalOpen}
        handleOpenSubmitConfirm={handleOpenSubmitConfirm}
        setApproveConfirmOpen={setApproveConfirmOpen}
        canVerifierSend={canVerifierSend}
        handleSendDocument={handleSendDocument}
        isAllFullySigned={isAllFullySigned}
        submitConfirmOpen={submitConfirmOpen}
        setSubmitConfirmOpen={setSubmitConfirmOpen}
        handleConfirmSubmitToHead={handleConfirmSubmitToHead}
        registration={registration}
        tidakSesuaiCount={tidakSesuaiCount}
        decision={decision}
        approveConfirmOpen={approveConfirmOpen}
        handleConfirmApprove={handleConfirmApprove}
        resultDocumentNo={resultDocumentNo}
        setResultDocumentNo={setResultDocumentNo}
        minutesDocumentNo={minutesDocumentNo}
        setMinutesDocumentNo={setMinutesDocumentNo}
        latestResultDoc={latestResultDoc}
        beritaAcaraDoc={beritaAcaraDoc}
        approveModalError={approveModalError}
        setApproveModalError={setApproveModalError}
      />
      <InspectionDialogs
        returnModalOpen={returnModalOpen}
        setReturnModalOpen={setReturnModalOpen}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        handleReturnDocument={handleReturnDocument}
        actionLoading={actionLoading}
        handoverModalOpen={handoverModalOpen}
        setHandoverModalOpen={setHandoverModalOpen}
        registration={registration}
        publisher={publisher}
        handoverModalError={handoverModalError}
        handleCreateHandover={handleCreateHandover}
        handoverCondition={handoverCondition}
        setHandoverCondition={setHandoverCondition}
        handoverVolumeCount={handoverVolumeCount}
        setHandoverVolumeCount={setHandoverVolumeCount}
        handoverNotes={handoverNotes}
        setHandoverNotes={setHandoverNotes}
      />
    </div>
  );
};

export default VerificationInspectionPage;
