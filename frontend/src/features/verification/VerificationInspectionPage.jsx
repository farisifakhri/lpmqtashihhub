import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { verificationApi } from '@/api/verification.api';
import { handoverApi } from '@/api/handover.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { WorkflowStepper } from '@/components/common/WorkflowStepper';
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
  const [letterTab, setLetterTab] = useState('editor'); // 'editor' | 'preview'
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Handover to Distributor State (Langkah 7 SOP - PR-VER-06)
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
      result: 'SESUAI', // default: SESUAI
      notes: '',
    }))
  );
  const [decision, setDecision] = useState('PASSED'); // 'PASSED' | 'REVISION_REQUIRED'
  const [notes, setNotes] = useState('');
  const [letterText, setLetterText] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

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
          // Abaikan jika user tidak memiliki role untuk list distributors
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
    setChecklist((prev) =>
      prev.map((item) => (item.code === code ? { ...item, [field]: value } : item))
    );
    // Clear field validation error
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[`${code}_${field}`];
      return copy;
    });
  };

  const validateForm = (isSubmit = false) => {
    const errors = {};

    // Validate checklist
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
      setSuccessMessage('Draf checklist dan surat berhasil disimpan.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan draf.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitToHead = async () => {
    if (!validateForm(true)) {
      return;
    }

    const confirmMsg =
      decision === 'PASSED'
        ? 'Apakah Anda yakin ingin mengajukan draf hasil verifikasi (LOLOS) ini kepada Kepala LPMQ?'
        : 'Apakah Anda yakin ingin mengajukan draf hasil verifikasi (PERLU PERBAIKAN PENERBIT) ini kepada Kepala LPMQ?';

    if (!window.confirm(confirmMsg)) return;

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
      setSuccessMessage('Draf surat hasil verifikasi berhasil diajukan kepada Kepala LPMQ.');
      await fetchDetail();
    } catch (err) {
      setError(err.message || 'Gagal mengajukan draf hasil verifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDocument = async () => {
    if (!latestResultDoc?.id) return;
    if (!window.confirm('Apakah Anda yakin ingin menyetujui dan menandatangani surat hasil verifikasi ini secara resmi?')) return;
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await verificationApi.approveDocument(latestResultDoc.id);
      setSuccessMessage('Surat hasil verifikasi berhasil disetujui dan disahkan oleh Kepala LPMQ.');
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

  // Format tanggal Indonesia
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
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-700">Memuat berkas dan naskah pemeriksaan...</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl space-y-4 text-center">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-rose-900">Gagal Membuka Pemeriksaan</h2>
          <p className="text-sm text-rose-700">{error}</p>
          <div className="pt-2">
            <Button onClick={() => navigate('/internal/verifications')} variant="outline">
              &larr; Kembali ke Antrean
            </Button>
          </div>
        </div>
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

  // Multi-signatory completion checks (P0-02 & §4.3)
  const isLatestDocSigned = latestResultDoc?.status === 'SIGNED' || latestResultDoc?.status === 'SENT';
  const isBaSigned = !beritaAcaraDoc || beritaAcaraDoc.status === 'SIGNED' || beritaAcaraDoc.status === 'SENT';
  const isAllFullySigned = isLatestDocSigned && isBaSigned;

  // Signatory permissions for current user
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
  const isReadOnly = !isInProgress;

  const userRoles = Array.isArray(currentUser?.roles)
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const isVerifier = userRoles.includes('VERIFIKATOR') || currentUser?.role === 'VERIFIKATOR';
  const isAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN');

  const canHeadApprove = isHead && (registration.status === 'WAITING_VERIFICATION_APPROVAL' || latestResultDoc?.status === 'SUBMITTED');
  const canVerifierSend = isVerifier && (registration.status === 'VERIFICATION_APPROVED' || ['APPROVED', 'SIGNING', 'SIGNED'].includes(latestResultDoc?.status)) && !isSent && !isEmailFailed;
  const isSent = latestResultDoc?.status === 'SENT' || ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'REVISION_REQUIRED'].includes(registration.status);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/internal/verifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Antrean Verifikasi
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-emerald-800 font-medium">Modul Verifikasi</span>
          <span>&bull;</span>
          <span className="font-bold text-slate-800">Pemeriksaan Naskah</span>
        </div>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:underline font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-700 hover:underline font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Banner with Institutional Accents */}
      <div className="bg-gradient-to-r from-[#083224] via-[#0B3F2D] to-[#0E5139] text-white rounded-2xl border border-emerald-800/80 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#DFB045_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative z-10 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-gold-300 bg-primary-950/70 px-3 py-1 rounded-md border border-gold-400/40 tracking-wider shadow-2xs">
                  {registration.registration_no || 'REG-PENDING'}
                </span>
                <StatusBadge status={registration.status} />
                {latestResultDoc?.status === 'SUBMITTED' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    <Clock className="w-3.5 h-3.5 text-indigo-300" />
                    Draf Diajukan ke Kepala LPMQ (v{latestResultDoc.version})
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                {registration.title || 'Mushaf Al-Qur\'an Standar Kemenag'}
              </h1>
            </div>

            {/* SLA Status Card */}
            {assignment.sla && (
              <div
                className={`p-4 rounded-xl border text-xs max-w-xs shadow-sm ${
                  assignment.sla.is_overdue
                    ? 'bg-rose-950/70 border-rose-500/50 text-rose-100'
                    : 'bg-primary-950/70 border-gold-400/40 text-gold-100'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {assignment.sla.is_overdue ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  )}
                  <span>
                    {assignment.sla.is_overdue
                      ? 'Target SLA 2 Hari Terlambat'
                      : 'Target SLA Pemeriksaan: 2 Hari'}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-300 space-y-0.5 border-t border-white/10 pt-1.5">
                  <p>Tenggat: <span className="text-white font-medium">{formatDate(assignment.sla.due_at)}</span></p>
                  {assignment.started_at && (
                    <p>Dimulai: <span className="text-white font-medium">{formatDate(assignment.started_at)}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/15 text-xs">
            <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-2xs">
              <span className="text-emerald-200/80 font-medium">Penerbit Pemohon:</span>
              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-gold-400" />
                {publisher.legal_name || '-'}
              </p>
              <p className="text-emerald-100/70 truncate">{publisher.address || 'Alamat tidak terdata'}</p>
            </div>

            <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-2xs">
              <span className="text-emerald-200/80 font-medium">Jenis Layanan:</span>
              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-gold-400" />
                {registration.service_type?.name || 'Mushaf Standar'}
              </p>
              <p className="text-emerald-100/70">
                Kategori: {registration.service_type?.category?.name || 'Mushaf Cetak'}
              </p>
            </div>

            <div className="space-y-1 bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-2xs">
              <span className="text-emerald-200/80 font-medium">Dasar Penugasan Resmi:</span>
              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gold-400" />
                Nota Dinas: <span className="font-mono text-gold-200">{notaDinas.document_no || 'Menunggu Dokumen'}</span>
              </p>
              <p className="text-emerald-100/70">
                Oleh: {assignment.assigned_by?.name || 'Kepala LPMQ'} ({formatDate(assignment.assigned_at)})
              </p>
            </div>
          </div>
        </div>

        {/* Banner if ASSIGNED (Must start first) */}
        {isAssigned && (
          <div className="bg-gradient-to-r from-amber-500/20 via-primary-900 to-primary-950 border-t border-gold-400/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gold-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-gold-400" />
                Pemeriksaan Belum Dimulai
              </h4>
              <p className="text-xs text-primary-100 max-w-xl leading-relaxed">
                Sesuai aturan SOP, Anda harus memulai penelaahan secara resmi sebelum mengisi checklist
                dan menyusun draf hasil verifikasi.
              </p>
            </div>
            <Button
              variant="gold"
              onClick={handleStartVerification}
              disabled={actionLoading}
              className="text-xs px-5 py-2.5 font-bold inline-flex items-center gap-2 shadow-sm flex-shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              {actionLoading ? 'Memulai...' : 'Mulai Pemeriksaan Sekarang'}
            </Button>
          </div>
        )}
      </div>

      {/* 2. Visual SOP Process Stepper */}
      <WorkflowStepper currentStatus={registration.status} currentStageId={2} />

      {/* 3. Dokumen & Master Fisik (Layout Dokumen Modern) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Berkas Digital Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Berkas Digital Naskah (Unggahan Penerbit)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dokumen softcopy resmi yang diunggah saat pendaftaran
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {registration.manuscript_files?.length || 0} Berkas
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {registration.manuscript_files?.length > 0 ? (
              registration.manuscript_files.map((file) => {
                const isCover = file.file_type === 'COVER' || file.file_name?.toLowerCase().includes('cover');
                return (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50/90 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-2xs ${
                          isCover
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                            : 'bg-gradient-to-br from-rose-500 to-red-700 text-white'
                        }`}
                      >
                        {isCover ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {file.file_name || file.original_name || 'Berkas Naskah'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                              isCover
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isCover ? 'Cover Mushaf' : 'PDF Naskah 5 Halaman'}
                          </span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-600">Versi {file.version || 1}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      {file.file_url ? (
                        <>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-800 font-semibold text-xs px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 rounded-lg shadow-2xs transition-all"
                            title="Pratinjau di tab baru"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Lihat</span>
                          </a>
                          <a
                            href={file.file_url}
                            download
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-xs px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition-all"
                            title="Unduh file asli"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh</span>
                          </a>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic bg-slate-100 px-2 py-1 rounded">
                          Tersimpan di Cloud LPMQ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada berkas digital yang terlampir pada pendaftaran ini.
              </div>
            )}
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
            <span className="font-bold">Ketentuan Berkas Digital:</span> Pastikan kesesuaian cover naskah resolusi tinggi dan kelengkapan 5 halaman awal penanda mushaf (Surah Al-Fatihah dan awal Surah Al-Baqarah).
          </div>
        </div>

        {/* Master Fisik Mushaf Card (Dokumen Fisik A4 Per Juz) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-gold-600" />
                Penerimaan Master Fisik (A4 Per Juz)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemeriksaan master print-out naskah asli di loket penerimaan
              </p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                physicalMaster.status === 'RECEIVED'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}
            >
              {physicalMaster.status === 'RECEIVED' ? 'Telah Diterima' : 'Belum Diterima'}
            </span>
          </div>

          {/* Official Receipt Stamp Box */}
          <div className="p-4 rounded-xl border-2 border-gold-300/80 bg-gradient-to-br from-gold-50/50 via-white to-amber-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 bg-gold-100/90 px-2 py-0.5 rounded border border-gold-300">
                Tanda Terima Resmi LPMQ
              </span>
              {physicalMaster.receipt_no && (
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(physicalMaster.receipt_no)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-700 font-medium transition-colors"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin No.</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Nomor Tanda Terima:</span>
              <span className="font-mono text-sm font-black text-emerald-900 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                {physicalMaster.receipt_no || 'TT-LPMQ-2026-001'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold-200/60 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Format Fisik:</span>
                <p className="font-bold text-slate-800">{physicalMaster.format || 'A4'} &bull; {physicalMaster.binding_method || 'PER_JUZ'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Kelengkapan Volume:</span>
                <p className="font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {physicalMaster.volume_count ? `${physicalMaster.volume_count} Juz Lengkap` : '30 Juz Lengkap'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gold-200/60 text-xs flex justify-between items-center">
              <span className="text-slate-500">Kondisi Fisik:</span>
              <span className="font-semibold text-slate-800 px-2 py-0.5 rounded bg-white border border-slate-200">
                {physicalMaster.condition || 'Baik & Rapi'}
              </span>
            </div>

            {physicalMaster.received_at && (
              <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                <span>Diterima pada:</span>
                <span className="font-medium text-slate-700">{formatDate(physicalMaster.received_at)}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Aturan Wajib BR-VER-002:</strong> Master fisik print-out naskah wajib disandingkan langsung di meja verifikator untuk mencocokkan kelengkapan 30 juz sebelum hasil pemeriksaan disahkan.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Lembar Kerja Checklist Verifikasi (4 Butir Wajib SOP) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              <span>Lembar Kerja Checklist Pemeriksaan (4 Butir SOP)</span>
            </h2>
            {isReadOnly && (
              <span className="text-xs px-3 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                Mode Pratinjau / Hanya Baca
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pemeriksaan wajib mencakup 4 pilar verifikasi naskah. Apabila ditemukan ketidaksesuaian,
            catatan temuan wajib diisi sebagai poin rincian perbaikan bagi penerbit.
          </p>
        </div>

        {/* 4 Checklist Items */}
        <div className="space-y-5">
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
                className={`p-5 rounded-xl border transition-all duration-200 shadow-2xs ${
                  currentItem.result === 'TIDAK_SESUAI'
                    ? 'border-amber-300 bg-gradient-to-r from-amber-50/40 via-white to-orange-50/20'
                    : currentItem.result === 'SESUAI'
                    ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/30 via-white to-teal-50/15'
                    : 'border-slate-200 bg-slate-50/30'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{def.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-8">{def.description}</p>
                  </div>

                  {/* Segmented Radio Buttons Result */}
                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200 self-start">
                    <label
                      className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all select-none ${
                        currentItem.result === 'SESUAI'
                          ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      } ${isReadOnly ? 'pointer-events-none opacity-70' : ''}`}
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
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sesuai</span>
                    </label>

                    <label
                      className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all select-none ${
                        currentItem.result === 'TIDAK_SESUAI'
                          ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      } ${isReadOnly ? 'pointer-events-none opacity-70' : ''}`}
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
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Tidak Sesuai</span>
                    </label>

                    <label
                      className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all select-none ${
                        currentItem.result === 'TIDAK_BERLAKU'
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      } ${isReadOnly ? 'pointer-events-none opacity-70' : ''}`}
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
                      <span>Tidak Berlaku</span>
                    </label>
                  </div>
                </div>

                {/* Notes Input for Checklist Item */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 pl-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Catatan Temuan / Penjelasan Khusus:
                      {currentItem.result === 'TIDAK_SESUAI' && (
                        <span className="text-rose-600 ml-1 font-bold">*Wajib Diisi</span>
                      )}
                    </label>
                  </div>
                  <input
                    type="text"
                    value={currentItem.notes || ''}
                    onChange={(e) => handleChecklistChange(def.code, 'notes', e.target.value)}
                    disabled={isReadOnly}
                    placeholder={
                      currentItem.result === 'TIDAK_SESUAI'
                        ? 'Tuliskan secara spesifik kekurangan/kesalahan pada butir ini...'
                        : 'Catatan tambahan jika diperlukan (opsional)...'
                    }
                    className={`w-full px-3.5 py-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all ${
                      itemError
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600'
                        : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                    } ${isReadOnly ? 'bg-slate-100 text-slate-600' : ''}`}
                  />
                  {itemError && <p className="text-[11px] text-rose-600 mt-1 font-medium">{itemError}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Keputusan Verifikasi & Alasan Keseluruhan */}
        <div className="pt-6 border-t border-slate-200 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Keputusan Hasil Pemeriksaan</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih kesimpulan akhir verifikasi berkas administrasi dan naskah mushaf.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opsi Lolos */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                decision === 'PASSED'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600/30'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="verification_decision"
                  value="PASSED"
                  checked={decision === 'PASSED'}
                  onChange={() => {
                    setDecision('PASSED');
                    loadOfficialTemplate('PASSED');
                    setValidationErrors((p) => {
                      const c = { ...p };
                      delete c.decision;
                      return c;
                    });
                  }}
                  disabled={isReadOnly}
                  className="mt-1"
                />
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Lolos Verifikasi (PASSED)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Seluruh butir checklist terpenuhi (Sesuai/Tidak Berlaku). Rekomendasikan
                    penerbitan billing PNBP dan serah-terima ke Distributor.
                  </p>
                </div>
              </div>
            </label>

            {/* Opsi Perlu Perbaikan */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                decision === 'REVISION_REQUIRED'
                  ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500/30'
                  : 'border-slate-200 bg-white hover:border-amber-300'
              } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="verification_decision"
                  value="REVISION_REQUIRED"
                  checked={decision === 'REVISION_REQUIRED'}
                  onChange={() => {
                    setDecision('REVISION_REQUIRED');
                    loadOfficialTemplate('REVISION_REQUIRED');
                    setValidationErrors((p) => {
                      const c = { ...p };
                      delete c.decision;
                      return c;
                    });
                  }}
                  disabled={isReadOnly}
                  className="mt-1"
                />
                <div>
                  <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Perlu Perbaikan Penerbit (REVISION_REQUIRED)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Terdapat kekurangan berkas/naskah yang harus diperbaiki oleh penerbit sebelum
                    dapat diproses lebih lanjut.
                  </p>
                </div>
              </div>
            </label>
          </div>

          {validationErrors.decision && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{validationErrors.decision}</span>
            </div>
          )}

          {/* Catatan Keseluruhan (Wajib jika revisi) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>
                Catatan Kesimpulan / Alasan Keputusan:
                {decision === 'REVISION_REQUIRED' && (
                  <span className="text-rose-600 ml-1 font-bold">*Wajib Diisi</span>
                )}
              </span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setValidationErrors((p) => {
                  const c = { ...p };
                  delete c.notes;
                  return c;
                });
              }}
              disabled={isReadOnly}
              placeholder={
                decision === 'REVISION_REQUIRED'
                  ? 'Jelaskan secara komprehensif apa saja kekurangan yang wajib diperbaiki oleh penerbit...'
                  : 'Catatan tambahan atau pertimbangan verifikator (opsional)...'
              }
              className={`w-full p-3.5 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                validationErrors.notes
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600'
                  : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
              } ${isReadOnly ? 'bg-slate-100 text-slate-600' : ''}`}
            />
            {validationErrors.notes && (
              <p className="text-[11px] text-rose-600 font-medium">{validationErrors.notes}</p>
            )}
          </div>
        </div>

        {/* 5. Editor & Pratinjau Surat Resmi Hasil Verifikasi (Official GovTech Decree) */}
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Teks Draf Surat Hasil Verifikasi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dokumen dinas resmi yang akan disahkan oleh Kepala LPMQ melalui tanda tangan elektronik
              </p>
            </div>

            {/* Mode Switcher: Editor vs Official Letterhead Preview */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setLetterTab('editor')}
                  className={`px-3 py-1 rounded-md transition-all font-semibold ${
                    letterTab === 'editor'
                      ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Editor Teks
                </button>
                <button
                  type="button"
                  onClick={() => setLetterTab('preview')}
                  className={`px-3 py-1 rounded-md transition-all font-semibold inline-flex items-center gap-1.5 ${
                    letterTab === 'preview'
                      ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3 h-3 text-gold-600" />
                  Pratinjau Format Surat
                </button>
              </div>

              {!isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOfficialTemplate(decision)}
                  className="text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  Muat Template
                </Button>
              )}
            </div>
          </div>

          {letterTab === 'editor' ? (
            <div>
              <textarea
                rows={8}
                value={letterText}
                onChange={(e) => {
                  setLetterText(e.target.value);
                  setValidationErrors((p) => {
                    const c = { ...p };
                    delete c.letter_text;
                    return c;
                  });
                }}
                disabled={isReadOnly}
                placeholder="Tuliskan teks draf surat hasil verifikasi resmi..."
                className={`w-full p-4 font-sans text-xs leading-relaxed rounded-xl border bg-white focus:outline-none focus:ring-2 shadow-2xs ${
                  validationErrors.letter_text
                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600'
                    : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                } ${isReadOnly ? 'bg-slate-100 text-slate-700' : ''}`}
              />
              {validationErrors.letter_text && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">{validationErrors.letter_text}</p>
              )}
            </div>
          ) : (
            /* Authentic Decree Letterhead Format */
            <div className="p-6 sm:p-8 bg-white rounded-xl border-2 border-slate-300 shadow-md font-sans text-slate-900 space-y-4 max-w-4xl mx-auto">
              {/* Official Letterhead */}
              <div className="text-center space-y-1 pb-4 border-b-4 border-double border-slate-900">
                <h4 className="text-sm sm:text-base font-extrabold tracking-wider uppercase text-slate-900">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </h4>
                <h5 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-800">
                  BADAN LITBANG DAN DIKLAT
                </h5>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-emerald-900 uppercase">
                  LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN
                </h3>
                <p className="text-[11px] text-slate-600">
                  Gedung Bayt Al-Qur'an & Museum Istiqlal, Taman Mini Indonesia Indah, Jakarta Timur 13560
                </p>
                <p className="text-[10px] text-slate-500">
                  Telepon (021) 87798801 &bull; Laman: https://lpmq.kemenag.go.id &bull; Pos-el: lpmq@kemenag.go.id
                </p>
              </div>

              {/* Document Meta Row */}
              <div className="flex justify-between text-xs pt-2">
                <div className="space-y-0.5">
                  <p><span className="w-20 inline-block text-slate-600">Nomor</span>: <span className="font-mono font-semibold">B-024/LPMQ.01/TL.00/{new Date().getFullYear()}</span></p>
                  <p><span className="w-20 inline-block text-slate-600">Sifat</span>: <span className="font-semibold">Biasa / Resmi</span></p>
                  <p><span className="w-20 inline-block text-slate-600">Lampiran</span>: <span>1 (satu) Berkas</span></p>
                  <p><span className="w-20 inline-block text-slate-600">Hal</span>: <span className="font-bold underline">Hasil Verifikasi Dokumen & Naskah Mushaf</span></p>
                </div>
                <div className="text-right">
                  <p className="text-slate-600">Jakarta, {formatDate(new Date())}</p>
                </div>
              </div>

              {/* Addressee */}
              <div className="text-xs pt-2">
                <p className="text-slate-600">Kepada Yth.</p>
                <p className="font-bold text-slate-900">{publisher.legal_name || 'Penerbit Pemohon'}</p>
                <p className="text-slate-600">{publisher.address || 'Alamat Kantor Penerbit'}</p>
              </div>

              {/* Letter Body */}
              <div className="pt-3 text-xs leading-relaxed whitespace-pre-line text-slate-800 border-t border-slate-100">
                {letterText}
              </div>

              {/* Signature Block */}
              <div className="pt-8 flex justify-end">
                <div className="w-64 text-center text-xs space-y-1">
                  <p className="text-slate-600">Kepala Lajnah Pentashihan Mushaf Al-Qur'an,</p>
                  <div className="h-16 flex items-center justify-center">
                    <div className="px-3 py-1.5 rounded border border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800 font-mono">
                      [Tanda Tangan Elektronik Tersertifikasi BSrE]
                    </div>
                  </div>
                  <p className="font-bold text-slate-900 underline">Dr. H. Abdul Aziz Sidqi, M.Ag.</p>
                  <p className="text-slate-500 text-[10px]">NIP. 197805122005011003</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Riwayat Dokumen Hasil Sebelumnya */}
        {detail?.result_documents?.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Riwayat Dokumen Hasil Verifikasi ({detail.result_documents.length} Versi)
            </h4>
            <div className="space-y-2">
              {detail.result_documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      Surat Hasil Verifikasi Versi {doc.version}
                    </span>
                    <span className="text-slate-500 ml-2">
                      Status: <span className="font-semibold">{doc.status}</span> &bull;{' '}
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    ID: {doc.id.substring(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button Footer Verifikator Input Draf */}
        {isInProgress && (
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={actionLoading}
              className="w-full sm:w-auto text-xs px-5 py-2.5 font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {actionLoading ? 'Menyimpan...' : 'Simpan Draf Pemeriksaan'}
            </Button>

            <Button
              variant="primary"
              onClick={handleSubmitToHead}
              disabled={actionLoading}
              className="w-full sm:w-auto text-xs px-6 py-2.5 font-bold inline-flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {actionLoading ? 'Mengajukan...' : 'Ajukan Draf ke Kepala LPMQ'}
            </Button>
          </div>
        )}

        {/* Panel Aksi Persetujuan Kepala LPMQ (Epic E - BR-VER-013) */}
        {canHeadApprove && (
          <div className="p-5 bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-emerald-50/80 border border-amber-300 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-200 text-amber-900 rounded-xl shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Otoritas Pengesahan Kepala LPMQ
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    BR-VER-013
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Draf surat hasil verifikasi telah diajukan oleh Verifikator. Anda memiliki wewenang untuk menyetujui serta menandatangani surat secara resmi, atau mengembalikan draf untuk diperbaiki.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
              <Button
                variant="outline"
                onClick={() => setReturnModalOpen(true)}
                disabled={actionLoading}
                className="w-full md:w-auto text-xs text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400 font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Kembalikan Draf
              </Button>
              <Button
                variant="primary"
                onClick={handleApproveDocument}
                disabled={actionLoading}
                className="w-full md:w-auto text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {actionLoading ? 'Memproses...' : 'Setujui & Sahkan Surat'}
              </Button>
            </div>
          </div>
        )}

        {/* Panel Penandatanganan Digital Multi-Signatory (KB-04, KB-05, P0-02 & §4.3) */}
        {(['APPROVED', 'SIGNING', 'SIGNED'].includes(latestResultDoc?.status) || ['APPROVED', 'SIGNING', 'SIGNED'].includes(beritaAcaraDoc?.status)) && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Penandatanganan Digital Dokumen Resmi
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">SOP v2.2</span>
                  </h4>
                  <p className="text-xs text-slate-500">Pemberitahuan hasil verifikasi dan Berita Acara wajib ditandatangani secara berurutan.</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isAllFullySigned ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                {isAllFullySigned ? "Semua Dokumen Ditandatangani" : "Menunggu Tanda Tangan"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Surat Pemberitahuan Hasil Verifikasi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">1. Surat Pemberitahuan Hasil</span>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">{latestResultDoc?.status}</span>
                </div>
                <p className="text-slate-600 text-[11px]">Ditandatangani tunggal oleh Kepala LPMQ sebagai pengesahan hasil pemeriksaan administrasi & format.</p>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Kepala LPMQ:</span>
                    <span className={`font-semibold ${latestSignatory?.status === "SIGNED" ? "text-emerald-700" : "text-amber-700"}`}>
                      {latestSignatory?.status === "SIGNED" ? "Sudah Ditandatangani" : "Menunggu Tanda Tangan"}
                    </span>
                  </div>
                  {latestSignatory?.signed_at && (
                    <p className="text-[10px] text-slate-400 font-mono">Waktu: {formatDate(latestSignatory.signed_at)}</p>
                  )}
                </div>
                {canUserSignLatest && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSignDocument(latestResultDoc.id)}
                    disabled={actionLoading}
                    className="w-full text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Tanda Tangani Surat Pemberitahuan
                  </Button>
                )}
              </div>

              {/* 2. Berita Acara Verifikasi */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">2. Berita Acara Verifikasi</span>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">{beritaAcaraDoc?.status || "PENDING"}</span>
                </div>
                <p className="text-slate-600 text-[11px]">Ditandatangani bertingkat: Verifikator Naskah (urutan 1), kemudian Kepala LPMQ (urutan 2).</p>
                <div className="space-y-1.5">
                  {baSignatories.map((sig) => (
                    <div key={sig.id} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{sig.name_position_snapshot}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Urutan {sig.sign_order}</span>
                      </div>
                      <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${sig.status === "SIGNED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {sig.status === "SIGNED" ? "Ditandatangani" : "Menunggu"}
                      </span>
                    </div>
                  ))}
                </div>
                {canUserSignBa && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSignDocument(beritaAcaraDoc.id)}
                    disabled={actionLoading}
                    className="w-full text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Tanda Tangani Berita Acara Verifikasi
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Banner Notifikasi Kegagalan Email (KB-07 / P0-03) */}
        {isEmailFailed && (
          <div className="p-5 bg-rose-50 border border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-rose-900 shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-200 text-rose-800 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-950">Pengiriman Email Hasil Verifikasi Gagal</p>
                <p className="text-rose-800 leading-relaxed">
                  {latestResultDoc?.email_delivery_error || "Gagal menghubungi penyedia email outbox."}
                  <span className="block mt-0.5 text-rose-700 text-[11px]">Sesuai SOP, proses pengajuan belum berpindah status sampai email berhasil dikirim ke penerbit.</span>
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => handleRetryEmail(latestResultDoc?.id)}
              disabled={actionLoading}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shrink-0 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
              Coba Kirim Ulang Email
            </Button>
          </div>
        )}

        {/* Panel Aksi Pengiriman Surat & Penerbitan PNBP oleh Verifikator (Epic F & G) */}
        {canVerifierSend && (
          <div className="p-5 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/70 border border-emerald-300 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-200 text-emerald-900 rounded-xl shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Surat Telah Disetujui Kepala LPMQ
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Surat hasil verifikasi telah ditandatangani secara resmi. Silakan kirimkan surat ini kepada penerbit dan otomatis terbitkan tagihan billing PNBP.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
              <Button
                variant="primary"
                onClick={handleSendDocument}
                disabled={actionLoading || !isAllFullySigned}
                className="w-full md:w-auto text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-6 py-2.5 shadow-sm inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {actionLoading ? 'Mengirimkan...' : 'Kirim Surat Resmi & Terbitkan Billing PNBP'}
              </Button>
            </div>
          </div>
        )}

        {/* Status Banner Pengajuan Masih Menunggu Kepala LPMQ (untuk Non-Kepala) */}
        {isCompletedOrSubmitted && !canHeadApprove && !canVerifierSend && !isSent && (
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center gap-3 text-indigo-900 text-xs shadow-2xs">
            <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Draf Telah Diajukan ke Kepala LPMQ</p>
              <p className="text-indigo-700 mt-0.5 leading-relaxed">
                Hasil verifikasi ini telah diajukan secara resmi dan saat ini berada di antrean
                persetujuan Kepala LPMQ (Epic E).
              </p>
            </div>
          </div>
        )}

        {/* Status Banner Dokumen Resmi Telah Terkirim (Epic G) */}
        {isSent && (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-700 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  Surat Hasil Verifikasi Resmi Telah Terkirim ke Penerbit
                </p>
                <p className="text-slate-600">
                  Surat hasil verifikasi berstatus <span className="font-semibold text-emerald-800">SENT</span> dan tagihan PNBP telah diterbitkan dengan masa aktif 7 hari kalender.
                  Status registrasi terkini: <span className="font-bold text-slate-800">{registration.status}</span>.
                </p>
              </div>
            </div>
            {registration.status === 'PAYMENT_VERIFICATION' && (
              <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs whitespace-nowrap">
                {isPaymentVerified ? 'Pembayaran Lunas (Terverifikasi)' : 'Menunggu Verifikasi Pembayaran'}
              </span>
            )}
          </div>
        )}

        {/* Panel Aksi Serah Terima Master Fisik ke Distributor (Langkah 7 SOP - PR-VER-06) */}
        {canVerifierHandover && (
          <div className="p-5 bg-gradient-to-r from-teal-50 via-emerald-50 to-emerald-100/70 border border-emerald-300 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-200 text-emerald-900 rounded-xl shrink-0">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Langkah 7 SOP: Serah-Terima Master Fisik ke Distributor
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                    SOP v2.2
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Pembayaran PNBP telah diverifikasi sah (LUNAS). Verifikator wajib menyerahkan naskah fisik cetak ukuran A4 (dijilid per juz, 30 jilid) kepada petugas Distributor di loket pentashihan untuk diterbitkan Berita Acara Serah Terima (BAST).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
              <Button
                variant="primary"
                onClick={() => setHandoverModalOpen(true)}
                disabled={actionLoading}
                className="w-full md:w-auto text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-6 py-2.5 shadow-sm inline-flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Serahkan Master Fisik & Terbitkan BAST
              </Button>
            </div>
          </div>
        )}

        {/* Status Banner Menunggu Konfirmasi Loket Distributor (Langkah 8 SOP) */}
        {isWaitingDistributor && latestHandover && (
          <div className="p-5 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-200 text-amber-900 rounded-xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-950">
                  Master Fisik Telah Diserahkan &bull; Menunggu Konfirmasi Distributor
                </p>
                <p className="text-amber-800">
                  BAST Nomor: <span className="font-mono font-bold">{latestHandover.receipt_no}</span> &bull; Diserahkan kepada petugas Distributor{' '}
                  <span className="font-bold">{latestHandover.to_user?.name || 'Distributor'}</span> pada{' '}
                  {formatDate(latestHandover.handed_over_at)} ({latestHandover.volume_count} Jilid A4).
                </p>
              </div>
            </div>
            <Link
              to="/internal/distributions"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap shadow-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Buka Antrean Distributor
            </Link>
          </div>
        )}

        {/* Status Banner Master Fisik Resmi Diterima Distributor (Langkah 8 Selesai) */}
        {isHandoverReceived && latestHandover && (
          <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-200 text-emerald-900 rounded-xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-950">
                  Master Fisik Resmi Diterima di Meja Pentashihan (Langkah 8 SOP Selesai)
                </p>
                <p className="text-emerald-800">
                  BAST <span className="font-mono font-bold">{latestHandover.receipt_no}</span> telah disahkan oleh Distributor pada{' '}
                  {formatDate(latestHandover.received_at)}. Tenggat pentashihan sidang ditetapkan pada{' '}
                  <span className="font-bold">{formatDateOnly(latestHandover.tashih_due_at)}</span>. Naskah siap diagendakan ke tim sidang pentashih.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs whitespace-nowrap border border-emerald-200">
              Siap Distribusi Sidang
            </span>
          </div>
        )}

        {/* Warning Banner Jika Master Fisik Pernah Dikembalikan Distributor (Cacat Fisik) */}
        {latestHandover?.status === 'RETURNED' && (
          <div className="p-5 bg-rose-50 border border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-rose-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-200 text-rose-900 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-950">
                  Master Fisik Terakhir Dikembalikan oleh Distributor (Cacat Fisik)
                </p>
                <p className="text-rose-800">
                  BAST: <span className="font-mono font-semibold">{latestHandover.receipt_no}</span> &bull; Catatan: {latestHandover.notes || 'Master fisik cacat / halaman tidak lengkap.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHandoverModalOpen(true)}
              className="text-xs text-rose-800 border-rose-300 hover:bg-rose-100 whitespace-nowrap font-bold"
            >
              Serahkan Ulang Fisik
            </Button>
          </div>
        )}
      </div>

      {/* Modal Pengembalian Draf (Kepala LPMQ) */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
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
              Mohon berikan catatan arahan perbaikan secara spesifik kepada Verifikator. Draf surat akan dikembalikan ke status pemeriksaan aktif.
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
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
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
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {actionLoading ? 'Mengembalikan...' : 'Kembalikan Draf'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Serah-Terima Master Fisik ke Distributor (Langkah 7 SOP - PR-VER-06) */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
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

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-950">
              <p className="font-bold">Naskah: {registration.title}</p>
              <p>Nomor Registrasi: {registration.registration_no}</p>
              <p>Penerbit: {publisher.legal_name}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Setelah data diserahkan, sistem akan otomatis menerbitkan Nomor BAST resmi (
              <span className="font-mono text-emerald-800 font-bold">BAST-VER-DIST-...</span>) dan memindahkan status naskah ke{' '}
              <span className="font-bold text-slate-800">Menunggu Distributor (WAITING_DISTRIBUTOR_RECEIPT)</span>.
            </p>

            {handoverModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
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
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium"
                    required
                  >
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.nip ? `(NIP: ${d.nip})` : ''} - Petugas Distributor
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
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
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium"
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
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
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
                  className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-5 py-2.5"
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
