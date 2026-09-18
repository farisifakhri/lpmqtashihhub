import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { handoverApi } from '@/api/handover.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { WorkflowStepper } from '@/components/common/WorkflowStepper';
import { WorkflowOwnershipBanner } from '@/components/workflow/WorkflowOwnershipBanner';
import { getWorkflowViewModel } from '@/lib/workflow-view-model';
import { PageHeader } from '@/components/ui/PageHeader';
import { SlaIndicator } from '@/components/ui/SlaIndicator';
import { StatusSummary } from '@/components/ui/StatusSummary';
import { AssignedOfficer } from '@/components/ui/AssignedOfficer';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';
import { DocumentPreview } from '@/components/common/DocumentPreview';
import { SignatoryProgress } from '@/components/common/SignatoryProgress';
import { EmailDeliveryStatus } from '@/components/common/EmailDeliveryStatus';
import { StickyActionBar } from '@/components/layout/StickyActionBar';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Clock,
  PackageCheck,
  Calendar,
  AlertCircle,
  FileCheck,
  Save,
  Send,
  Play,
  Download,
  Eye,
  Info,
  Layers,
  History,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  Printer,
  FileCode,
  ExternalLink,
  BookOpen,
  X,
  RefreshCw,
  CheckSquare,
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

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const workflowVm = useMemo(() => {
    return detail?.registration ? getWorkflowViewModel(detail.registration, currentUser) : null;
  }, [detail, currentUser]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verificationApi.getAssignmentDetail(id);
      if (res?.data) {
        const data = res.data;
        setDetail(data);

        // Fetch distributors for handover if verifier or admin
        try {
          const distRes = await handoverApi.listDistributors();
          if (distRes?.data && Array.isArray(distRes.data)) {
            setDistributors(distRes.data);
            if (distRes.data.length > 0 && !selectedDistributorId) {
              setSelectedDistributorId(distRes.data[0].id);
            }
          }
        } catch {
          // Ignore if user lacks permission to list distributors
        }

        // Set initial selected digital file
        if (data.registration?.manuscript_files?.length > 0 && !selectedFileId) {
          setSelectedFileId(data.registration.manuscript_files[0].id);
        }

        // Pre-fill form if existing draft exists
        const latestDoc = data.latest_result_document;
        if (latestDoc?.content_snapshot) {
          const snapshot = latestDoc.content_snapshot;
          if (Array.isArray(snapshot.checklist) && snapshot.checklist.length === 4) {
            setChecklist(
              CHECKLIST_DEFINITIONS.map((def) => {
                const found = snapshot.checklist.find((c) => c.code === def.code);
                return found || { code: def.code, result: 'SESUAI', notes: '' };
              })
            );
          }
          if (snapshot.decision) setDecision(snapshot.decision);
          if (snapshot.notes) setNotes(snapshot.notes);
          if (snapshot.letter_text) setLetterText(snapshot.letter_text);
        } else if (data.assignment?.decision) {
          setDecision(data.assignment.decision);
          if (data.assignment.notes) setNotes(data.assignment.notes);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat detail pemeriksaan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

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
      await verificationApi.startVerification(id);
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
    });

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
      await verificationApi.saveDraft(id, payload);
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
      await verificationApi.submitDraft(id, payload);
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
    if (!returnReason.trim() || returnReason.trim().length < 5) {
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
        <div className="w-9 h-9 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-700">Memuat berkas dan lembar kerja pemeriksaan...</p>
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

  const assignment = detail?.assignment || {};
  const registration = detail?.registration || {};
  const publisher = registration.publisher || {};
  const physicalMaster = registration.physical_master_intake || {};
  const notaDinas = detail?.nota_dinas || {};
  const latestResultDoc = detail?.latest_result_document;
  const beritaAcaraDoc = detail?.berita_acara;

  const isLatestDocSigned = latestResultDoc?.status === 'SIGNED' || latestResultDoc?.status === 'SENT';
  const isBaSigned = !beritaAcaraDoc || beritaAcaraDoc.status === 'SIGNED' || beritaAcaraDoc.status === 'SENT';
  const isAllFullySigned = isLatestDocSigned && isBaSigned;

  const latestSignatory = latestResultDoc?.signatories?.find(s => s.signer_user_id === currentUser?.id);
  const canUserSignLatest = Boolean(
    ['APPROVED', 'SIGNING'].includes(latestResultDoc?.status) &&
    latestSignatory &&
    latestSignatory.status === 'PENDING'
  );

  const baSignatories = beritaAcaraDoc?.signatories || [];
  const baMySignatory = baSignatories.find(s => s.signer_user_id === currentUser?.id);
  const priorBaPending = baMySignatory
    ? baSignatories.find(s => s.sign_order < baMySignatory.sign_order && s.status !== 'SIGNED')
    : null;
  const canUserSignBa = Boolean(
    ['APPROVED', 'SIGNING'].includes(beritaAcaraDoc?.status) &&
    baMySignatory &&
    baMySignatory.status === 'PENDING' &&
    !priorBaPending
  );

  const isEmailFailed = latestResultDoc?.status === 'EMAIL_FAILED' || latestResultDoc?.email_delivery_status === 'EMAIL_FAILED';
  const isAssigned = assignment.status === 'ASSIGNED';
  const isInProgress = assignment.status === 'IN_PROGRESS';
  const isCompletedOrSubmitted =
    assignment.status === 'COMPLETED' || latestResultDoc?.status === 'SUBMITTED';
  const userRoles = Array.isArray(currentUser?.roles)
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const isVerifier = userRoles.includes('VERIFIKATOR') || currentUser?.role === 'VERIFIKATOR';
  const isAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN');

  const isAssignedVerifier = isVerifier && (!assignment.verifier_id || assignment.verifier_id === currentUser?.id || assignment.verifier?.id === currentUser?.id);
  const canVerifierWork = isInProgress && isAssignedVerifier;
  const isReadOnly = !canVerifierWork;

  const canHeadApprove = isHead && (registration.status === 'WAITING_VERIFICATION_APPROVAL' || latestResultDoc?.status === 'SUBMITTED');
  const isSent = latestResultDoc?.status === 'SENT' || ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'REVISION_REQUIRED'].includes(registration.status);
  const canVerifierSend = isAssignedVerifier && (registration.status === 'VERIFICATION_APPROVED' || ['APPROVED', 'SIGNING', 'SIGNED'].includes(latestResultDoc?.status)) && !isSent && !isEmailFailed;

  const latestPayment = registration.payment_records?.[0];
  const latestHandover = registration.physical_handovers?.[0];
  const isPaymentVerified = latestPayment?.status === 'VERIFIED';
  const canVerifierHandover =
    (isVerifier || isAdmin) &&
    registration.status === 'PAYMENT_VERIFICATION' &&
    isPaymentVerified &&
    (!latestHandover || latestHandover.status === 'RETURNED');
  const isWaitingDistributor = registration.status === 'WAITING_DISTRIBUTOR_RECEIPT';
  const isHandoverReceived =
    latestHandover?.status === 'RECEIVED' ||
    ['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(
      registration.status
    );

  const selectedFileObj = registration.manuscript_files?.find(f => f.id === selectedFileId) || registration.manuscript_files?.[0];

  const sesuaiCount = checklist.filter(c => c.result === 'SESUAI').length;
  const tidakSesuaiCount = checklist.filter(c => c.result === 'TIDAK_SESUAI').length;
  const tidakBerlakuCount = checklist.filter(c => c.result === 'TIDAK_BERLAKU').length;

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
            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md">
              {registration.registration_no}
            </span>
            <StatusBadge status={registration.status} />
            {isHead && (
              <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                Otoritas Kepala LPMQ
              </span>
            )}
          </div>
        }
      />

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-800 hover:underline font-bold px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900 text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-800 hover:underline font-bold px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* SLA & Start Banner if ASSIGNED */}
      {isAssigned && (
        <div className="p-5 rounded-xl border border-gold-400/50 bg-gradient-to-r from-[#083224] to-[#0E5139] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gold-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-gold-400" />
              Pemeriksaan Belum Dimulai
            </h4>
            <p className="text-xs text-emerald-100/80 max-w-xl leading-relaxed">
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
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/70 text-rose-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-rose-900">
              Draf Dikembalikan oleh Kepala LPMQ
            </h4>
            <p className="text-rose-800 leading-relaxed">
              <strong>Catatan Perbaikan:</strong> &ldquo;{assignment.return_reason}&rdquo;
            </p>
            <p className="text-rose-600 text-[11px]">
              Silakan periksa kembali berkas/checklist yang perlu disesuaikan, lalu ajukan draf perbaikan.
            </p>
          </div>
        </div>
      )}

      {/* Info banner if WAITING_APPROVAL */}
      {assignment.status === 'WAITING_APPROVAL' && !canHeadApprove && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 flex items-start gap-3 shadow-2xs">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-900">
              Draf Sedang Diperiksa Kepala LPMQ
            </h4>
            <p className="text-amber-800 leading-relaxed">
              Draf hasil telaah dan Berita Acara telah diajukan. Tidak ada tindakan yang diperlukan dari Verifikator saat ini.
            </p>
          </div>
        </div>
      )}

      {/* Info banner if READY_TO_SEND */}
      {assignment.status === 'READY_TO_SEND' && (
        <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-emerald-900">
              Dokumen Telah Lengkap Ditandatangani
            </h4>
            <p className="text-emerald-800 leading-relaxed">
              Surat Pemberitahuan dan Berita Acara telah ditandatangani secara digital. Verifikator dapat mengirimkan surat hasil verifikasi ke penerbit.
            </p>
          </div>
        </div>
      )}

      {/* Responsive View Switcher for Screen < 1024px */}
      <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveMobileTab('ringkasan')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'ringkasan' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Ringkasan
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('dokumen')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'dokumen' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Dokumen
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('checklist')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'checklist' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('hasil')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            activeMobileTab === 'hasil' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600'
          }`}
        >
          Hasil & Surat
        </button>
      </div>

      {/* 3-Area Desktop Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* AREA 1: Navigation, Ringkasan Naskah & SLA (~3 cols on desktop) */}
        <div
          className={`lg:col-span-3 space-y-4 ${
            activeMobileTab === 'ringkasan' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Identitas Naskah Card */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <div className="border-b border-slate-100 pb-2.5">
              <span className="font-mono text-slate-500 block text-[11px]">No. Registrasi:</span>
              <strong className="text-slate-900 font-bold font-mono text-xs block mt-0.5">
                #{registration.registration_no || 'REG-PENDING'}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Judul Naskah:</span>
              <p className="text-slate-800 font-semibold text-xs mt-0.5">
                “{registration.title || "Mushaf Al-Qur'an Standar Kemenag"}”
              </p>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1">
              <span className="text-slate-500 block text-[11px]">Penerbit Pemohon</span>
              <strong className="text-slate-800 font-semibold block">{publisher.legal_name || '-'}</strong>
              <p className="text-slate-500 text-[11px] truncate">{publisher.address || 'Alamat kantor terdaftar'}</p>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1">
              <span className="text-slate-500 block text-[11px]">Layanan & Kategori</span>
              <span className="font-medium text-slate-800 block">
                {registration.service_type?.name || 'Mushaf Standar'}
              </span>
              <span className="text-slate-500 text-[11px] block">
                {registration.service_type?.category?.name || 'Mushaf Cetak'}
              </span>
            </div>

            {notaDinas.document_no && (
              <div className="border-t border-slate-100 pt-2.5 space-y-1">
                <span className="text-slate-500 block text-[11px]">Dasar Penugasan Resmi</span>
                <span className="font-mono font-semibold text-emerald-900 block">
                  {notaDinas.document_no}
                </span>
                <span className="text-slate-400 text-[10px] block">
                  Penugasan: {formatDate(assignment.assigned_at)}
                </span>
              </div>
            )}
          </div>

          {/* SLA Card */}
          {assignment.sla && (
            <SlaIndicator
              dueDate={assignment.sla.due_at}
              isOverdue={assignment.sla.is_overdue}
              remainingMs={assignment.sla.remaining_ms}
              targetDuration={assignment.sla.duration_target || '2 hari'}
            />
          )}

          {/* Penerimaan Master Fisik Info */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <PackageCheck className="w-4 h-4 text-emerald-800" />
              <span>Master Fisik di Meja LPMQ</span>
            </div>
            {physicalMaster.receipt_no ? (
              <div className="space-y-1 text-slate-600 text-[11px]">
                <p>
                  No. Tanda Terima:{' '}
                  <strong className="font-mono text-slate-800">{physicalMaster.receipt_no}</strong>
                </p>
                <p>
                  Format: <strong>{physicalMaster.format || 'A4'}</strong> · {physicalMaster.volume_count || 30} Jilid
                </p>
                <p>Kondisi: <span className="font-semibold text-emerald-800">{physicalMaster.condition || 'Baik'}</span></p>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">
                Menunggu verifikasi penerimaan fisik master di loket LPMQ.
              </p>
            )}
          </div>

          {/* Petugas Verifikator */}
          {assignment.assigned_to && (
            <AssignedOfficer
              officer={{
                name: assignment.assigned_to.name || 'Drs. H. M. Sholihin',
                nip: assignment.assigned_to.nip || '197508122002121002',
                role: 'Verifikator Berkas & Naskah',
              }}
              label="Verifikator Pemeriksa"
            />
          )}
        </div>

        {/* AREA 2: PrivateFileViewer / Berkas Digital (~5 cols on desktop) */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            activeMobileTab === 'dokumen' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Document Switcher Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                <h3 className="text-xs font-bold text-slate-900">
                  Pratinjau Dokumen Naskah
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {registration.manuscript_files?.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFileId(f.id)}
                    className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all ${
                      selectedFileId === f.id
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.file_type === 'COVER' ? 'Cover' : 'PDF Naskah'}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewer Pane */}
            <div className="p-3">
              {selectedFileObj ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span className="font-semibold truncate max-w-xs">
                      {selectedFileObj.file_name || selectedFileObj.original_name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Versi {selectedFileObj.version || 1}
                    </span>
                  </div>

                  {selectedFileObj.file_url ? (
                    <div className="h-[520px] rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      <iframe
                        src={`${selectedFileObj.file_url}#toolbar=0`}
                        title={selectedFileObj.file_name}
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <PrivateFileViewer
                      fileId={selectedFileObj.id}
                      fileName={selectedFileObj.file_name}
                      height="520px"
                    />
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">Tidak ada berkas digital terlampir.</p>
                </div>
              )}
            </div>
          </div>

          {/* Master Intake Receipt Card */}
          {physicalMaster.receipt_no && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px]">Tanda Terima Master Fisik:</span>
                <p className="font-mono font-bold text-slate-900">{physicalMaster.receipt_no}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyReceipt(physicalMaster.receipt_no)}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-600 bg-slate-50"
              >
                {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReceipt ? 'Tersalin' : 'Salin Nomor'}</span>
              </button>
            </div>
          )}
        </div>

        {/* AREA 3: Checklist Pemeriksaan & Keputusan (~4 cols on desktop) */}
        <div
          className={`lg:col-span-4 space-y-4 ${
            activeMobileTab === 'checklist' || activeMobileTab === 'hasil' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Section Checklist (Always accessible or active on mobile checklist tab) */}
          <div
            className={`p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 ${
              activeMobileTab === 'hasil' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-800" />
                  Lembar Kerja Checklist Pemeriksaan
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Evaluasi 4 butir standar verifikasi administrasi & rasm
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                {sesuaiCount + tidakBerlakuCount}/4 Lengkap
              </span>
            </div>

            {/* Checklist items list */}
            <div className="space-y-3.5">
              {CHECKLIST_DEFINITIONS.map((def, idx) => {
                const currentItem = checklist.find((c) => c.code === def.code) || {
                  code: def.code,
                  result: 'SESUAI',
                  notes: '',
                };
                const itemError = validationErrors[`${def.code}_notes`];

                return (
                  <div
                    key={def.code}
                    className={`p-3.5 rounded-xl border transition-all ${
                      currentItem.result === 'SESUAI'
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : currentItem.result === 'TIDAK_SESUAI'
                        ? 'bg-rose-50/20 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {def.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {def.description}
                      </p>
                    </div>

                    {/* Radio Results */}
                    <div className="mt-3 flex items-center gap-1.5 p-1 bg-white rounded-lg border border-slate-200 text-xs">
                      <label
                        className={`flex-1 py-1.5 px-2 rounded-md text-center cursor-pointer transition-all font-semibold ${
                          currentItem.result === 'SESUAI'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`result_${def.code}`}
                          value="SESUAI"
                          checked={currentItem.result === 'SESUAI'}
                          onChange={() => handleChecklistChange(def.code, 'result', 'SESUAI')}
                          disabled={isReadOnly}
                          className="sr-only"
                        />
                        <span>Sesuai</span>
                      </label>

                      <label
                        className={`flex-1 py-1.5 px-2 rounded-md text-center cursor-pointer transition-all font-semibold ${
                          currentItem.result === 'TIDAK_SESUAI'
                            ? 'bg-rose-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`result_${def.code}`}
                          value="TIDAK_SESUAI"
                          checked={currentItem.result === 'TIDAK_SESUAI'}
                          onChange={() => handleChecklistChange(def.code, 'result', 'TIDAK_SESUAI')}
                          disabled={isReadOnly}
                          className="sr-only"
                        />
                        <span>Tidak Sesuai</span>
                      </label>

                      <label
                        className={`flex-1 py-1.5 px-2 rounded-md text-center cursor-pointer transition-all font-semibold ${
                          currentItem.result === 'TIDAK_BERLAKU'
                            ? 'bg-slate-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`result_${def.code}`}
                          value="TIDAK_BERLAKU"
                          checked={currentItem.result === 'TIDAK_BERLAKU'}
                          onChange={() => handleChecklistChange(def.code, 'result', 'TIDAK_BERLAKU')}
                          disabled={isReadOnly}
                          className="sr-only"
                        />
                        <span>N/A</span>
                      </label>
                    </div>

                    {/* Note Input */}
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={currentItem.notes || ''}
                        onChange={(e) => handleChecklistChange(def.code, 'notes', e.target.value)}
                        disabled={isReadOnly}
                        placeholder={
                          currentItem.result === 'TIDAK_SESUAI'
                            ? 'Catatan kekurangan butir ini (wajib)...'
                            : 'Catatan tambahan (opsional)...'
                        }
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                          itemError
                            ? 'border-rose-300 focus:ring-rose-500/20'
                            : 'border-slate-200 focus:ring-emerald-700/20 focus:border-emerald-700'
                        } ${isReadOnly ? 'bg-slate-50 text-slate-600' : ''}`}
                      />
                      {itemError && <p className="text-[11px] text-rose-600 mt-0.5 font-medium">{itemError}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Keputusan & Surat (Always accessible or active on mobile hasil tab) */}
          <div
            className={`p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 ${
              activeMobileTab === 'checklist' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Keputusan Hasil Pemeriksaan</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kesimpulan akhir verifikasi berkas administrasi dan naskah
              </p>
            </div>

            {/* Decision Radio Boxes */}
            <div className="space-y-2.5">
              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  decision === 'PASSED'
                    ? 'border-emerald-700 bg-emerald-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
              >
                <input
                  type="radio"
                  name="verification_decision"
                  value="PASSED"
                  checked={decision === 'PASSED'}
                  onChange={() => {
                    setDecision('PASSED');
                    loadOfficialTemplate('PASSED');
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Lolos Verifikasi (PASSED)
                  </strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Seluruh butir terpenuhi. Rekomendasikan penerbitan billing PNBP.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                  decision === 'REVISION_REQUIRED'
                    ? 'border-amber-600 bg-amber-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-amber-300'
                } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
              >
                <input
                  type="radio"
                  name="verification_decision"
                  value="REVISION_REQUIRED"
                  checked={decision === 'REVISION_REQUIRED'}
                  onChange={() => {
                    setDecision('REVISION_REQUIRED');
                    loadOfficialTemplate('REVISION_REQUIRED');
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Perlu Perbaikan Penerbit (REVISION_REQUIRED)
                  </strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Terdapat butir tidak sesuai yang wajib diperbaiki pemohon.
                  </p>
                </div>
              </label>
            </div>

            {validationErrors.decision && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{validationErrors.decision}</span>
              </div>
            )}

            {/* Notes textarea */}
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-800 flex items-center justify-between">
                <span>
                  Catatan Kesimpulan / Alasan Keputusan:
                  {decision === 'REVISION_REQUIRED' && (
                    <span className="text-rose-600 ml-1 font-bold">*Wajib</span>
                  )}
                </span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setIsDirty(true);
                }}
                disabled={isReadOnly}
                placeholder={
                  decision === 'REVISION_REQUIRED'
                    ? 'Tuliskan rincian kekurangan yang wajib diperbaiki penerbit...'
                    : 'Catatan tambahan jika diperlukan (opsional)...'
                }
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            {/* Draf Surat Teks */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-800" />
                  Teks Draf Surat Hasil Verifikasi
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLetterTab('editor')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      letterTab === 'editor' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterTab('preview')}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      letterTab === 'preview' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Pratinjau
                  </button>
                </div>
              </div>

              {letterTab === 'editor' ? (
                <textarea
                  rows={6}
                  value={letterText}
                  onChange={(e) => {
                    setLetterText(e.target.value);
                    setIsDirty(true);
                  }}
                  disabled={isReadOnly}
                  placeholder="Tuliskan teks draf surat hasil verifikasi resmi..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs whitespace-pre-line text-slate-800 max-h-60 overflow-y-auto leading-relaxed">
                  {letterText}
                </div>
              )}
            </div>
          </div>
        </div>
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
        <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-200 text-emerald-900 rounded-xl shrink-0">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Langkah 7 SOP: Serah-Terima Master Fisik ke Distributor
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
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

      {/* STICKY ACTION BAR FOR WORKSPACE */}
      <StickyActionBar
        statusMessage={
          isInProgress ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Checklist: {sesuaiCount + tidakBerlakuCount}/4 Butir Selesai
              </span>
              <span>·</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {isDirty ? 'Ada perubahan belum disimpan' : 'Tersimpan otomatis'}
              </span>
            </div>
          ) : canHeadApprove ? (
            <span className="font-bold text-amber-900">
              Menunggu Persetujuan Draf oleh Kepala LPMQ
            </span>
          ) : assignment.status === 'WAITING_APPROVAL' ? (
            <span className="font-bold text-amber-900">
              Draf Sedang Diperiksa Kepala LPMQ
            </span>
          ) : assignment.status === 'WAITING_SIGNATURE' ? (
            <span className="font-bold text-indigo-900">
              Menunggu Penandatanganan Dokumen Resmi
            </span>
          ) : assignment.status === 'READY_TO_SEND' ? (
            <span className="font-bold text-emerald-900">
              Dokumen Telah Lengkap Ditandatangani — Siap Dikirim ke Penerbit
            </span>
          ) : isSent ? (
            <span className="font-bold text-emerald-900">
              Surat Resmi Telah Terkirim ke Penerbit
            </span>
          ) : null
        }
        secondaryActions={
          <>
            {canVerifierWork && (
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={actionLoading}
                className="text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {actionLoading ? 'Menyimpan...' : 'Simpan Draf Pemeriksaan'}
              </Button>
            )}
            {canHeadApprove && (
              <Button
                variant="outline"
                onClick={() => setReturnModalOpen(true)}
                disabled={actionLoading}
                className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Kembalikan Draf
              </Button>
            )}
          </>
        }
        primaryAction={
          canVerifierWork ? (
            <Button
              variant="primary"
              onClick={handleOpenSubmitConfirm}
              disabled={actionLoading}
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {actionLoading ? 'Mengajukan...' : 'Ajukan Draf ke Kepala LPMQ'}
            </Button>
          ) : canHeadApprove ? (
            <Button
              variant="primary"
              onClick={() => setApproveConfirmOpen(true)}
              disabled={actionLoading}
              className="text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {actionLoading ? 'Memproses...' : 'Setujui Draf Hasil Verifikasi'}
            </Button>
          ) : canVerifierSend ? (
            <Button
              variant="primary"
              onClick={handleSendDocument}
              disabled={actionLoading || !isAllFullySigned}
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Kirim Surat Resmi & Terbitkan Billing PNBP
            </Button>
          ) : null
        }
      />

      {/* Confirmation Summary Dialog for Submitting Draft */}
      <ConfirmationSummaryDialog
        isOpen={submitConfirmOpen}
        onClose={() => setSubmitConfirmOpen(false)}
        onConfirm={handleConfirmSubmitToHead}
        title="Ajukan Draf Hasil Verifikasi"
        description="Periksa ringkasan hasil evaluasi berkas dan naskah sebelum diajukan secara resmi kepada Kepala LPMQ."
        objectName={`Naskah: ${registration.title || '-'}`}
        nextActor="Kepala LPMQ"
        statusChange="IN_PROGRESS -> WAITING_APPROVAL"
        irreversibleConsequence="Draf akan dikunci untuk penelaahan Kepala LPMQ dan tidak dapat diedit selama masa reviu."
        summaryItems={[
          { label: 'Nomor Registrasi', value: registration.registration_no || '-' },
          { label: 'Naskah Mushaf', value: registration.title || '-' },
          { label: 'Hasil Checklist', value: `${sesuaiCount} Sesuai, ${tidakSesuaiCount} Tidak Sesuai` },
          {
            label: 'Keputusan Verifikator',
            value: decision === 'PASSED' ? 'Lolos Verifikasi' : 'Perlu Perbaikan Penerbit',
          },
        ]}
        impactMessage={
          decision === 'PASSED'
            ? 'Draf surat kelolosan akan dikirim ke Kepala LPMQ untuk pengesahan tanda tangan elektronik resmi dan penerbitan billing PNBP.'
            : 'Surat catatan kekurangan akan dikirim ke Kepala LPMQ untuk pengesahan sebelum diteruskan kepada penerbit untuk perbaikan berkas.'
        }
        confirmLabel={decision === 'PASSED' ? 'Ajukan Kelolosan' : 'Ajukan Perbaikan'}
        confirmVariant={decision === 'PASSED' ? 'primary' : 'gold'}
        loading={actionLoading}
      />

      {/* Confirmation Summary Dialog for Approving Draft (Kepala LPMQ) */}
      <ConfirmationSummaryDialog
        isOpen={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleConfirmApprove}
        title="Setujui Draf Hasil Verifikasi"
        description="Persetujuan draf oleh Kepala LPMQ akan mengunci isi dokumen dan memulai alur tanda tangan elektronik resmi."
        objectName={`Surat Hasil Verifikasi (${registration.registration_no || '-'})`}
        nextActor="Penandatangan Elektronik Resmi (Kepala LPMQ & Verifikator)"
        statusChange="DRAFT -> APPROVED (Siap Ditandatangani)"
        irreversibleConsequence="Setelah disetujui, draf dikunci dan didaftarkan ke antrean tanda tangan elektronik resmi."
        confirmLabel="Setujui Draf"
        confirmVariant="primary"
        loading={actionLoading}
      />

      {/* Return Modal (Kepala LPMQ) */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Kembalikan Draf ke Verifikator
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Berikan arahan perbaikan secara spesifik. Draf surat akan dikembalikan ke status pemeriksaan aktif verifikator.
            </p>

            <form onSubmit={handleReturnDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Alasan & Arahan Perbaikan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Format penulisan rasm pada draf surat perlu disesuaikan dengan ketentuan Surat Keputusan..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
                <span className="text-[11px] text-slate-400">Minimal 5 karakter.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReturnModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || returnReason.trim().length < 5}
                  className="text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold"
                >
                  {actionLoading ? 'Mengembalikan...' : 'Kembalikan Draf'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Serah-Terima Master Fisik ke Distributor (Langkah 7 SOP) */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
                Serah-Terima Master Fisik ke Distributor (Langkah 7 SOP)
              </div>
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1 text-xs text-emerald-950">
              <p className="font-bold">Naskah: {registration.title}</p>
              <p>Nomor Registrasi: {registration.registration_no}</p>
              <p>Penerbit: {publisher.legal_name}</p>
            </div>

            {handoverModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{handoverModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateHandover} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pilih Petugas Distributor Penerima <span className="text-rose-600">*</span>
                </label>
                {distributors.length > 0 ? (
                  <select
                    value={selectedDistributorId}
                    onChange={(e) => setSelectedDistributorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    required
                  >
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.nip ? `(NIP: ${d.nip})` : ''} - Petugas Distributor
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    Tidak ditemukan petugas Distributor aktif. Hubungi Administrator.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Kondisi Fisik Master <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={handoverCondition}
                    onChange={(e) => setHandoverCondition(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    required
                  >
                    <option value="BAIK">BAIK (Rapi & Lengkap)</option>
                    <option value="LENGKAP">LENGKAP (30 Juz A4)</option>
                    <option value="CUKUP">CUKUP</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Jumlah Jilid Fisik <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={handoverVolumeCount}
                    onChange={(e) => setHandoverVolumeCount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan Penyerahan Verifikator (Opsional)
                </label>
                <textarea
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Contoh: Master cetak A4 dijilid spiral per juz lengkap 1-30 juz diserahkan di loket pentashihan..."
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHandoverModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !selectedDistributorId}
                  className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-5 py-2.5"
                >
                  {actionLoading ? 'Menerbitkan BAST...' : 'Serahkan & Terbitkan BAST'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationInspectionPage;
