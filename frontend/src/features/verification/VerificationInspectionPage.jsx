import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { handoverApi } from '@/api/handover.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { WorkflowStepper } from '@/components/common/WorkflowStepper';
import { WorkflowOwnershipBanner } from '@/components/workflow/WorkflowOwnershipBanner';
import { getWorkflowViewModel } from '@/lib/workflow-view-model';
import { InspectionChecklist } from './components/InspectionChecklist';
import { InspectionReferencePanels } from './components/InspectionReferencePanels';
import { InspectionDialogs } from './components/InspectionDialogs';
import { InspectionActionPanel } from './components/InspectionActionPanel';
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
} from 'lucide-react';

const CHECKLIST_DEFINITIONS = [
  {
    code: 'REGISTRATION_DATA',
    title: '1. Kelengkapan & Kesesuaian Data Registrasi',
    description:
      'Pemeriksaan identitas pemohon, legalitas penerbit (badan hukum/kemenag), alamat kantor resmi, kesesuaian kategori mushaf, dan keabsahan surat permohonan.',
  },
  {
    code: 'DIGITAL_FILES',
    title: '2. Kelengkapan Berkas Digital',
    description:
      'Pemeriksaan file cover mushaf resolusi tinggi serta kelengkapan 5 halaman penanda naskah (Surah Al-Fatihah dan awal Al-Baqarah) berformat PDF sesuai standar.',
  },
  {
    code: 'PHYSICAL_MASTER',
    title: '3. Kesesuaian Master Fisik Mushaf (A4 Per Juz)',
    description:
      'Pemeriksaan print-out master mushaf ukuran A4 yang dijilid rapi per juz, jumlah jilid (30 juz), kondisi fisik tidak cacat, dan tanda terima resmi penerimaan LPMQ.',
  },
  {
    code: 'MANUSCRIPT_CONTENT',
    title: '4. Format & Rasm Naskah Awal',
    description:
      'Pemeriksaan awal kesesuaian Rasm Usmani Standar Indonesia, penempatan tanda harakat, kejelasan ayat awal, kelengkapan tanda waqaf, dan iluminasi cover.',
  },
];

export const VerificationInspectionPage = () => {
  const { id } = useParams(); // assignmentId
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tab state for mobile/tablet responsive layout (<1024px)
  const [activeMobileTab, setActiveMobileTab] = useState('checklist'); // 'ringkasan' | 'dokumen' | 'checklist' | 'hasil'

  // Document preview selection
  const [activeDocTab, setActiveDocTab] = useState('digital'); // 'digital' | 'receipt' | 'letter'
  const [selectedFileId, setSelectedFileId] = useState(null);

  // Official letter editor/preview toggle
  const [letterTab, setLetterTab] = useState('editor'); // 'editor' | 'preview'
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Modals state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  // Handover to Distributor State (Langkah 7 SOP)
  const [distributors, setDistributors] = useState([]);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedDistributorId, setSelectedDistributorId] = useState('');
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
  const [validationErrors, setValidationErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const { detail, loading, error, setError, fetchDetail } = useInspection(id, async (data) => {
    if (data.assignment?.id && data.assignment.id !== id) {
      navigate(`/internal/verifications/${data.assignment.id}`, { replace: true });
    }

    try {
      const distRes = await handoverApi.listDistributors();
      if (Array.isArray(distRes?.data)) {
        setDistributors(distRes.data);
        if (distRes.data.length > 0 && !selectedDistributorId) setSelectedDistributorId(distRes.data[0].id);
      }
    } catch {
      // Listing distributor may be unavailable for a read-only viewer.
    }

    if (data.registration?.manuscript_files?.length > 0 && !selectedFileId) {
      setSelectedFileId(data.registration.manuscript_files[0].id);
    }

    const draft = getInspectionDraft(data, CHECKLIST_DEFINITIONS);
    if (draft.checklist) setChecklist(draft.checklist);
    if (draft.decision) setDecision(draft.decision);
    if (draft.notes) setNotes(draft.notes);
    if (draft.letterText) setLetterText(draft.letterText);
  });
  const assignmentId = detail?.assignment?.id || id;
  const workflowVm = useMemo(() => {
    return detail?.registration ? getWorkflowViewModel(detail.registration, currentUser) : null;
  }, [detail, currentUser]);

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
    const notaNo = detail.nota_dinas?.document_no || 'NOTA_DINAS';

    if (dec === 'PASSED') {
      setLetterText(
        `Berdasarkan hasil pemeriksaan administrasi berkas dan master fisik mushaf atas pengajuan pendaftaran Nomor ${regNo} dari pemohon ${publisher} untuk naskah '${title}' (menindaklanjuti Nota Dinas Penugasan No. ${notaNo}), dengan ini dinyatakan:\n\n1. Seluruh dokumen pendaftaran dan berkas digital telah diperiksa dan dinyatakan LENGKAP dan SESUAI.\n2. Master fisik mushaf ukuran A4 yang dijilid per juz telah diterima dan diverifikasi sesuai ketentuan SOP.\n3. Format penulisan rasm, harakat, dan tanda baca awal memenuhi standar pentashihan LPMQ Kementerian Agama RI.\n\nKesimpulan: Pengajuan dinyatakan LOLOS VERIFIKASI ADMINISTRASI & NASKAH, dan direkomendasikan untuk melanjutkan ke tahapan penerbitan kode billing PNBP serta penyerahan master fisik kepada Distributor Pentashihan.`
      );
    } else {
      setLetterText(
        `Berdasarkan hasil pemeriksaan administrasi berkas dan master fisik mushaf atas pengajuan pendaftaran Nomor ${regNo} dari pemohon ${publisher} untuk naskah '${title}' (menindaklanjuti Nota Dinas Penugasan No. ${notaNo}), dengan ini disampaikan bahwa pengajuan dinyatakan MEMERLUKAN PERBAIKAN (REVISI PENERBIT).\n\nAdapun butir perbaikan yang wajib dipenuhi penerbit tertera pada rincian catatan pemeriksaan. Mohon penerbit untuk memperbaiki dan memperbarui berkas yang bersangkutan melalui portal resmi LPMQ agar proses verifikasi dapat dilanjutkan kembali.`
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
      };
      await verificationApi.submitDraft(assignmentId, payload);
      setSubmitConfirmOpen(false);
      setIsDirty(false);
      setSuccessMessage('Draf surat hasil verifikasi berhasil diajukan kepada Kepala LPMQ.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal mengajukan draf hasil verifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!latestResultDoc?.id) return;
    setApproveConfirmOpen(false);
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.approveDocument(latestResultDoc.id);
      setSuccessMessage('Draf surat hasil verifikasi berhasil disetujui. Proses penandatanganan dokumen telah dimulai.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal menyetujui surat hasil verifikasi.');
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
    if (!window.confirm('Bubuhkan tanda tangan digital pada dokumen resmi ini?')) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.signDocument(docId);
      setSuccessMessage('Dokumen berhasil ditandatangani secara digital.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal menandatangani dokumen.');
    } finally {
      setActionLoading(false);
    }
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
    if (!selectedDistributorId) {
      setHandoverModalError('Silakan pilih petugas Distributor penerima naskah.');
      return;
    }

    setActionLoading(true);
    setHandoverModalError(null);
    try {
      const payload = {
        to_user_id: selectedDistributorId,
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
    isAssignedVerifier, canVerifierWork, isReadOnly, canHeadApprove, isSent,
    canVerifierSend, latestPayment, latestHandover, isPaymentVerified, canVerifierHandover,
    isWaitingDistributor, isHandoverReceived, selectedFileObj, sesuaiCount, tidakSesuaiCount,
    tidakBerlakuCount,
  } = getInspectionViewModel(detail, currentUser, selectedFileId, checklist);

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
        <div className="p-5 rounded-xl border border-civicGold-700/50 bg-gradient-to-r from-[#083224] to-[#0E5139] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
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
              Surat Pemberitahuan dan Berita Acara telah ditandatangani secara digital. Verifikator dapat mengirimkan surat hasil verifikasi ke penerbit.
            </p>
          </div>
        </div>
      )}

      {/* Responsive View Switcher for Screen < 1024px */}
      <div className="lg:hidden flex items-center p-1 bg-surface-subtle rounded-xl border border-line text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveMobileTab('ringkasan')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'ringkasan' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Ringkasan
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('dokumen')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'dokumen' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Dokumen
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('checklist')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'checklist' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('hasil')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'hasil' ? 'bg-white text-brand-900 shadow-2xs font-bold' : 'text-ink-muted'
          }`}
        >
          Hasil & Surat
        </button>
      </div>

      {/* 3-Area Desktop Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* AREA 1: Navigation, Ringkasan Naskah & SLA (~3 cols on desktop) */}
        <InspectionReferencePanels
          activeMobileTab={activeMobileTab}
          registration={registration}
          publisher={publisher}
          notaDinas={notaDinas}
          assignment={assignment}
          formatDate={formatDate}
          physicalMaster={physicalMaster}
          detail={detail}
          selectedFileId={selectedFileId}
          setSelectedFileId={setSelectedFileId}
          selectedFileObj={selectedFileObj}
          handleCopyReceipt={handleCopyReceipt}
          copiedReceipt={copiedReceipt}
        />

        {/* AREA 3: Checklist Pemeriksaan & Keputusan (~4 cols on desktop) */}
        <InspectionChecklist
          activeMobileTab={activeMobileTab}
          sesuaiCount={sesuaiCount}
          tidakBerlakuCount={tidakBerlakuCount}
          checklist={checklist}
          validationErrors={validationErrors}
          isReadOnly={isReadOnly}
          handleChecklistChange={handleChecklistChange}
          decision={decision}
          setDecision={setDecision}
          loadOfficialTemplate={loadOfficialTemplate}
          setIsDirty={setIsDirty}
          notes={notes}
          setNotes={setNotes}
          letterTab={letterTab}
          setLetterTab={setLetterTab}
          letterText={letterText}
          setLetterText={setLetterText}
          definitions={CHECKLIST_DEFINITIONS}
        />
      </div>

      {/* Multi-Signatory Progress & Email Status Banners */}
      {(['APPROVED', 'SIGNING', 'SIGNED'].includes(latestResultDoc?.status) || ['APPROVED', 'SIGNING', 'SIGNED'].includes(beritaAcaraDoc?.status)) && (
        <div className="space-y-4">
          <SignatoryProgress
            signatories={[
              {
                role_label: 'Kepala LPMQ (Surat Pemberitahuan)',
                name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
                status: latestSignatory?.status || 'PENDING',
                signed_at: latestSignatory?.signed_at,
              },
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
                Tanda Tangani Surat Pemberitahuan
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
                Tanda Tangani Berita Acara Verifikasi
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Email Delivery Failure Banner */}
      {isEmailFailed && (
        <EmailDeliveryStatus
          status="FAILED"
          recipient={publisher.email || 'penerbit@mushaf.id'}
          errorMessage={latestResultDoc?.email_delivery_error}
          onRetry={() => handleRetryEmail(latestResultDoc?.id)}
          retrying={actionLoading}
        />
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
                Pembayaran PNBP telah diverifikasi sah. Serahkan master cetak fisik mushaf kepada petugas Distributor di loket pentashihan.
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
            Serahkan Master Fisik & Terbitkan BAST
          </Button>
        </div>
      )}

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
        distributors={distributors}
        selectedDistributorId={selectedDistributorId}
        setSelectedDistributorId={setSelectedDistributorId}
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
