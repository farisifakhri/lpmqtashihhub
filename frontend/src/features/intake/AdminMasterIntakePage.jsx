import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { verificationApi } from '@/api/verification.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  PackageCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Building2,
  Calendar,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Layers,
  X,
  QrCode,
  UserCheck,
  Inbox,
  Truck,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { AssignVerificationDialog } from '@/features/verification/AssignVerificationDialog';

export const AdminMasterIntakePage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Selected registration state
  const [selectedReg, setSelectedReg] = useState(null);

  // Intake Queue Waiting List (naskah yang siap intake fisik)
  const [waitingList, setWaitingList] = useState([]);
  const [waitingLoading, setWaitingLoading] = useState(false);

  // Intake Form State
  const [condition, setCondition] = useState('BAIK');
  const [actualVolumeCount, setActualVolumeCount] = useState(30);
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');

  // Modals
  const [confirmReceiveOpen, setConfirmReceiveOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState(null);

  useEffect(() => () => {
    if (receiptPdfUrl) URL.revokeObjectURL(receiptPdfUrl);
  }, [receiptPdfUrl]);

  const showReceiptPdf = async () => {
    if (!selectedReg?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const blob = await verificationApi.getPhysicalReceiptPdf(selectedReg.id);
      setReceiptPdfUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason.message || 'PDF tanda terima belum dapat dibuka.');
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-generate official intake receipt number format: TT-LPMQ-YYYY-XXXX
  const generateReceiptNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TT-LPMQ-${year}-${rand}`;
  };

  const fetchWaitingList = async () => {
    setWaitingLoading(true);
    try {
      const [verifRes, revRes] = await Promise.all([
        registrationApi.listRegistrations({
          status: 'READY_FOR_VERIFICATION',
          limit: 20,
        }),
        registrationApi.listRegistrations({
          status: 'REVISION_REQUIRED',
          limit: 20,
        }),
      ]);
      const itemsVerif = Array.isArray(verifRes?.data) ? verifRes.data : (verifRes?.data?.items || []);
      const itemsRev = Array.isArray(revRes?.data) ? revRes.data : (revRes?.data?.items || []);
      const seenIds = new Set();
      const allItems = [...itemsVerif, ...itemsRev].filter((item) => {
        if (!item?.id || seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
      const pendingItems = allItems.filter((item) => {
        const intakeStatus = item.physical_master_intake?.status || item.physical_master?.status;
        return intakeStatus !== 'RECEIVED';
      });
      setWaitingList(pendingItems);
    } catch {
      // Abaikan error background fetch agar tidak mengganggu UI utama
    } finally {
      setWaitingLoading(false);
    }
  };

  const loadRegistrationById = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const detailRes = await registrationApi.getDetail(id);
      const data = detailRes?.data || detailRes;
      if (data) {
        setSelectedReg(data);
        setSearchQuery(data.registration_no || '');
        const declaration = data.physical_master_intake || {};
        setActualVolumeCount(declaration.volume_count || 30);
        setCondition(declaration.condition || 'BAIK');
        setReceiptNo(declaration.receipt_no || generateReceiptNo());
        setNotes(declaration.notes || '');
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat detail naskah.');
    } finally {
      setLoading(false);
    }
  };

  // Baca URL query parameter saat pertama kali dibuka atau parameter berubah
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q');
    const id = searchParams.get('id');
    if (id) {
      loadRegistrationById(id);
    } else if (q) {
      setSearchQuery(q);
      handleSearch(q);
    } else {
      fetchWaitingList();
    }
  }, [searchParams]);

  const handleBackToQueue = () => {
    setSelectedReg(null);
    setSearchQuery('');
    setSearchParams({});
    fetchWaitingList();
  };

  const handleSearch = async (query = searchQuery) => {
    const trimmed = (query || '').trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await registrationApi.listRegistrations({
        search: trimmed,
        limit: 10,
      });

      const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      if (items.length === 0) {
        setSelectedReg(null);
        setError(`Tidak ditemukan pendaftaran dengan nomor atau kata kunci '${trimmed}'.`);
      } else {
        // Fetch detailed record of first match
        const detailRes = await registrationApi.getDetail(items[0].id);
        const data = detailRes?.data || items[0];
        setSelectedReg(data);

        // Pre-fill form from declaration
        const declaration = data.physical_master_intake || {};
        setActualVolumeCount(declaration.volume_count || 30);
        setCondition(declaration.condition || 'BAIK');
        setReceiptNo(declaration.receipt_no || generateReceiptNo());
        setNotes(declaration.notes || '');
      }
    } catch (err) {
      setError(err.message || 'Gagal mencari pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReceipt = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const declaredVolumeCount = selectedReg?.physical_master_intake?.volume_count ?? 30;
  const isVolumeMismatch = Number(actualVolumeCount) !== Number(declaredVolumeCount);

  const handleConfirmReceive = async () => {
    if (!selectedReg?.id) return;

    if (!receiptNo.trim()) {
      setError('Nomor tanda terima fisik wajib diisi.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload = {
        decision: 'RECEIVED',
        volume_count: Number(actualVolumeCount),
        condition: condition.trim(),
        receipt_no: receiptNo.trim(),
        notes: notes.trim() || undefined,
      };

      await verificationApi.receivePhysicalMaster(selectedReg.id, payload);
      setSuccessMessage(
        `Master fisik mushaf berhasil diterima. Nomor Tanda Terima ${receiptNo} telah diterbitkan.`
      );
      setConfirmReceiveOpen(false);

      // Refresh detail
      const detailRes = await registrationApi.getDetail(selectedReg.id);
      if (detailRes?.data) setSelectedReg(detailRes.data);
    } catch (err) {
      setError(err.message || 'Gagal memproses penerimaan master fisik.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReg?.id) return;

    if (!returnReason.trim() || returnReason.trim().length < 5) {
      setError('Alasan pengembalian master fisik minimal 5 karakter.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload = {
        decision: 'RETURNED',
        volume_count: Number(actualVolumeCount),
        condition: condition.trim(),
        notes: returnReason.trim(),
      };

      await verificationApi.receivePhysicalMaster(selectedReg.id, payload);
      setSuccessMessage(
        `Master fisik mushaf dikembalikan kepada penerbit dengan catatan perbaikan.`
      );
      setReturnModalOpen(false);
      setReturnReason('');

      // Refresh detail
      const detailRes = await registrationApi.getDetail(selectedReg.id);
      if (detailRes?.data) setSelectedReg(detailRes.data);
    } catch (err) {
      setError(err.message || 'Gagal mengembalikan master fisik.');
    } finally {
      setActionLoading(false);
    }
  };

  const intakeStatus = selectedReg?.physical_master_intake?.status || 'PENDING';
  const isReceived = intakeStatus === 'RECEIVED';
  const isReturned = intakeStatus === 'RETURNED';
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const canAssign = userRoles.includes('ADMIN_INTERNAL') || userRoles.includes('SUPERADMIN') || ['ADMIN_INTERNAL', 'SUPERADMIN'].includes(currentUser?.role);
  const isAssigned = selectedReg?.status && selectedReg.status !== 'READY_FOR_VERIFICATION';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* Header */}
      <PageHeader
        title="Penerimaan Master Fisik Mushaf"
        subtitle="Penerimaan dan pencatatan tanda terima master fisik naskah oleh Admin Internal LPMQ"
        breadcrumbs={[
          { label: 'Portal Petugas', href: '/internal' },
          { label: 'Penerimaan Master Fisik' },
        ]}
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

      {/* Fast Lookup Bar */}
      <div className="p-5 bg-white rounded-xl border border-line shadow-2xs space-y-3">
        <label className="block text-xs font-bold text-ink">
          Cari Nomor Registrasi / Scan QR Tanda Bukti Pendaftaran
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-center gap-2.5"
        >
          <div className="relative flex-1 w-full">
            <QrCode className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: REG-2026-001 atau tempel kode QR..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-mono"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !searchQuery.trim()}
            className="w-full sm:w-auto text-xs px-5 py-2.5 font-bold"
          >
            <Search className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Mencari...' : 'Periksa Naskah'}
          </Button>
        </form>
      </div>

      {/* Workspace Area: 2-Column Comparison Snapshot */}
      {selectedReg ? (
        <div className="space-y-6">
          {/* Navigation bar to return to queue */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white border border-line rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={handleBackToQueue}
              className="inline-flex items-center gap-2 text-xs font-bold text-ink hover:text-brand-800 transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-subtle group-hover:bg-brand-50 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 text-ink-muted group-hover:text-brand-800" />
              </div>
              <span>Kembali ke Antrean Penerimaan Fisik</span>
            </button>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-muted text-xs">Sedang Memproses:</span>
              <span className="font-mono font-bold text-brand-950 bg-brand-50/70 px-2.5 py-1 rounded-lg border border-brand-200 flex items-center gap-1.5">
                <span>{selectedReg.registration_no}</span>
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(selectedReg.registration_no)}
                  title="Salin Nomor Registrasi"
                  className="text-brand-700 hover:text-brand-900 transition-colors ml-1"
                >
                  {copiedReceipt ? <Check className="w-3.5 h-3.5 text-civic-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-subtle text-ink border border-line">
                {isReceived ? '✓ Fisik Diterima' : 'Menunggu Master Fisik'}
              </span>
            </div>
          </div>

          {/* Visual Diff Alert if Volume Count Mismatches */}
          {isVolumeMismatch && !isReceived && (
            <div className="p-4 bg-civic-warningSoft border border-civic-warningLine rounded-xl flex items-start gap-3 text-xs text-civic-warning shadow-2xs animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-civic-warning shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-civic-warning">
                  Peringatan Perbedaan Jumlah Jilid Fisik (Visual Diff)
                </strong>
                <p className="mt-0.5 leading-relaxed text-civic-warning">
                  Jumlah jilid aktual yang dihitung (<strong>{actualVolumeCount} Jilid</strong>) berbeda dari deklarasi yang dimasukkan penerbit saat pendaftaran (<strong>{declaredVolumeCount} Jilid</strong>).
                  Sesuai regulasi SOP Pentashihan LPMQ, sistem menolak penerimaan jika jumlah jilid berbeda. Silakan kembalikan master fisik dengan catatan agar penerbit memperbarui deklarasi.
                </p>
              </div>
            </div>
          )}

          {/* Intake Status Banner if Already Received */}
          {isReceived && (
            <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-brand-700 shrink-0" />
                <div>
                  <strong className="text-sm font-bold">Master Fisik Telah Resmi Diterima oleh Admin Internal LPMQ</strong>
                  <p className="text-brand-800 mt-0.5">
                    Nomor Tanda Terima: <strong className="font-mono">{selectedReg.physical_master_intake?.receipt_no}</strong> · Kondisi: {selectedReg.physical_master_intake?.condition || 'Baik'} · Diterima pada {selectedReg.physical_master_intake?.received_at ? new Date(selectedReg.physical_master_intake.received_at).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={showReceiptPdf}
                  disabled={actionLoading}
                  className="text-xs bg-white"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Lihat / Cetak PDF Tanda Terima
                </Button>
                {!isAssigned ? (
                  canAssign ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setAssignDialogOpen(true)}
                      className="text-xs font-bold"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      Tugaskan Verifikator Sekarang
                    </Button>
                  ) : (
                    <Link
                      to={`/internal/verifications?tab=NEED_ASSIGNMENT&id=${selectedReg.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-2xs transition-colors"
                    >
                      <span>Buka Antrean Penugasan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )
                ) : (
                  <Link
                    to={`/internal/verifications/${selectedReg.verification_assignment?.id || selectedReg.verification_assignments?.[0]?.id || selectedReg.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink hover:bg-ink text-white font-bold text-xs shadow-2xs transition-colors"
                  >
                    <span>Lihat Pemeriksaan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Intake Status Banner if Returned */}
          {isReturned && (
            <div className="p-4 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-civic-danger shadow-2xs animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-civic-danger shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-sm font-bold text-civic-danger">
                    Master Fisik Dikembalikan ke Penerbit (Perlu Perbaikan)
                  </strong>
                  <p className="text-civic-danger leading-relaxed">
                    Alasan Pengembalian: <em>"{selectedReg.physical_master_intake?.notes || 'Master fisik tidak lengkap atau cacat.'}"</em>
                  </p>
                  <p className="text-xs text-civic-danger">
                    Kondisi Catatan Fisik: <strong>{selectedReg.physical_master_intake?.condition || 'Tidak Lengkap'}</strong> · Menunggu penerbit menyerahkan perbaikan jilid naskah fisik A4.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center px-3 py-1 bg-civic-dangerSoft border border-civic-dangerLine rounded-full font-bold text-civic-danger text-xs">
                  DIKEMBALIKAN (REVISI)
                </span>
              </div>
            </div>
          )}

          {/* 2-Column Comparison Grid - Symmetric Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* KOLOM KIRI: Deklarasi Dokumen Penerbit */}
            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-line shadow-2xs h-full flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-800">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      1. Deklarasi Dokumen Penerbit
                    </h3>
                    <p className="text-xs text-ink-muted">Data permohonan yang diisi oleh penerbit</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-subtle text-ink border border-line">
                  Data Terdaftar
                </span>
              </div>

              <div className="space-y-3.5 text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Banner Status Permohonan */}
                  <div className="p-3 rounded-xl bg-surface-subtle border border-line flex items-center gap-2.5 text-xs text-ink">
                    <FileCheck className="w-4 h-4 text-brand-700 shrink-0" />
                    <div>
                      <span className="font-bold block">Status Dokumen & Pendaftaran Resmi:</span>
                      <p className="text-ink-muted text-xs">
                        Naskah resmi diajukan via portal SIMP dengan spesifikasi deklarasi terdaftar.
                      </p>
                    </div>
                  </div>

                  {/* Identitas Naskah */}
                  <div className="p-3.5 rounded-xl bg-surface-subtle/70 border border-line space-y-1.5">
                    <span className="text-ink-muted block text-xs font-semibold uppercase tracking-wider">Judul Naskah Mushaf</span>
                    <p className="text-ink font-bold text-sm leading-snug">
                      {selectedReg.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {selectedReg.registration_no}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {selectedReg.service_type?.name || 'Mushaf Standar'} · {selectedReg.service_type?.category?.name || 'Mushaf Cetak'}
                      </span>
                    </div>
                  </div>

                  {/* Penerbit Pemohon */}
                  <div className="p-3.5 rounded-xl bg-surface-subtle/70 border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted block text-xs font-semibold uppercase tracking-wider">Penerbit Pemohon</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-civic-success bg-civic-successSoft px-2 py-0.5 rounded-full border border-civic-successLine">
                        <CheckCircle2 className="w-3 h-3 text-civic-success" />
                        Terdaftar di LPMQ
                      </span>
                    </div>
                    <p className="text-ink font-bold flex items-center gap-1.5 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                      <span>{selectedReg.publisher?.legal_name || '-'}</span>
                    </p>
                    <p className="text-ink-muted text-xs leading-relaxed">
                      {selectedReg.publisher?.address || 'Alamat tidak terdata'}
                    </p>
                    {selectedReg.publisher?.phone && (
                      <p className="text-xs text-brand-800 font-mono pt-0.5">
                        Telp: {selectedReg.publisher.phone}
                      </p>
                    )}
                  </div>

                  {/* Format Master & Jumlah Jilid Deklarasi */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1">
                      <span className="text-ink-muted block text-xs">Format Master</span>
                      <strong className="text-ink font-bold text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-brand-800 shrink-0" />
                        <span>{selectedReg.physical_master_intake?.format || 'A4'} (Per Juz)</span>
                      </strong>
                      <span className="text-xs text-ink-muted block">Standar Cetak Kemenag</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-brand-50/50 border border-brand-200 space-y-1">
                      <span className="text-brand-900 block text-xs font-medium">Jumlah Jilid Deklarasi</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-lg font-black text-brand-950">
                          {declaredVolumeCount}
                        </span>
                        <span className="text-xs font-bold text-brand-800">Jilid</span>
                      </div>
                      <span className="text-xs text-brand-700 block">Wajib diverifikasi fisik</span>
                    </div>
                  </div>

                  {/* Status & Logistik Pengiriman Paket dari Penerbit */}
                  <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-line text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink flex items-center gap-1.5 text-xs">
                        <Truck className="w-3.5 h-3.5 text-brand-700" />
                        Logistik & Ekspedisi Pengiriman:
                      </span>
                      <span className="text-xs font-semibold text-ink-muted bg-white px-2 py-0.5 rounded border border-line">
                        {selectedReg.physical_dispatch_status === 'DISPATCHED'
                          ? 'Terkirim'
                          : selectedReg.physical_master_intake?.status === 'RECEIVED'
                          ? 'Diterima'
                          : 'Tercatat'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-line">
                        <span className="text-ink-muted block text-xs">Kurir / Pengantar:</span>
                        <strong className="text-ink font-semibold truncate block">
                          {selectedReg.dispatch_courier || selectedReg.physical_master_intake?.delivery_method || 'Antar Langsung ke Loket LPMQ'}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-line">
                        <span className="text-ink-muted block text-xs">Nomor Resi / Tanda Kirim:</span>
                        <strong className="text-ink font-mono font-semibold truncate block">
                          {selectedReg.dispatch_tracking_no || selectedReg.physical_master_intake?.receipt_no || 'Tercatat di Loket TMII'}
                        </strong>
                      </div>
                    </div>
                    {selectedReg.dispatch_date && (
                      <p className="text-xs text-ink-muted">
                        Tanggal Pengiriman: <strong className="text-ink">{new Date(selectedReg.dispatch_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </p>
                    )}
                  </div>

                  {/* Kelengkapan Berkas Digital Permohonan */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-line text-xs space-y-2">
                    <span className="text-ink-muted block text-xs font-semibold uppercase tracking-wider">
                      Kelengkapan Berkas Digital Permohonan
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-line">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success shrink-0" />
                          <span className="text-ink font-medium">Surat Permohonan Pentashihan</span>
                        </div>
                        <span className="text-xs font-semibold text-civic-success bg-civic-successSoft px-2 py-0.5 rounded border border-civic-successLine">Terunggah</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-line">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success shrink-0" />
                          <span className="text-ink font-medium">Master Naskah Digital (PDF / Juz)</span>
                        </div>
                        <span className="text-xs font-semibold text-civic-success bg-civic-successSoft px-2 py-0.5 rounded border border-civic-successLine">Tersedia</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-line">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success shrink-0" />
                          <span className="text-ink font-medium">Surat Pernyataan Keabsahan & Hak Cipta</span>
                        </div>
                        <span className="text-xs font-semibold text-civic-success bg-civic-successSoft px-2 py-0.5 rounded border border-civic-successLine">Disetujui</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Kolom Kiri: Menyelaraskan Garis Bawah & Tombol dengan Kolom Kanan */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-line mt-auto">
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                      <Check className="w-3.5 h-3.5 text-brand-700" />
                      Deklarasi Penerbit Sah
                    </span>
                    <span className="hidden sm:inline text-xs">Tercatat di sistem LPMQ</span>
                  </div>
                  <Link
                    to={`/publisher/registrations/${selectedReg.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink hover:text-brand-900 border border-line hover:bg-canvas transition-colors w-full sm:w-auto justify-center"
                  >
                    <span>Buka Berkas Lengkap</span>
                    <ExternalLink className="w-3.5 h-3.5 text-brand-700" />
                  </Link>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Verifikasi Fisik oleh Admin Internal */}
            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-line shadow-2xs h-full flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-civic-successSoft border border-civic-successLine flex items-center justify-center text-civic-success">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      2. Verifikasi Fisik Aktual Admin Internal
                    </h3>
                    <p className="text-xs text-ink-muted">Pemeriksaan kondisi fisik paket di loket LPMQ</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-900 border border-brand-200">
                  Formulir Petugas
                </span>
              </div>

              <div className="space-y-4 text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Format Jilid Banner */}
                  <div className="p-3 rounded-xl bg-surface-subtle border border-line flex items-center gap-2.5 text-xs text-ink">
                    <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
                    <div>
                      <span className="font-bold block">Format Standar SOP Pentashihan:</span>
                      <p className="text-ink-muted text-xs">
                        Kertas ukuran A4 dijilid rapi per juz (Juz 1 s.d. Juz 30).
                      </p>
                    </div>
                  </div>

                  {/* Actual Volume Count & Resi Verification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="actual-volume-count" className="block font-bold text-ink mb-1.5">
                        Jumlah Jilid Aktual Diterima <span className="text-civic-danger">*</span>
                      </label>
                      <input
                        id="actual-volume-count"
                        type="number"
                        min="1"
                        max="60"
                        disabled={isReceived}
                        value={actualVolumeCount}
                        onChange={(e) => setActualVolumeCount(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border font-mono font-bold text-sm focus:outline-none focus:ring-2 ${
                          isVolumeMismatch
                            ? 'border-civic-warningLine bg-civic-warningSoft text-civic-warning focus:ring-civic-warning/20'
                            : 'border-line-strong focus:ring-brand-700/20 focus:border-brand-700'
                        }`}
                      />
                      {!isVolumeMismatch ? (
                        <p className="inline-flex items-center gap-1 text-xs text-civic-success font-semibold mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
                          Sesuai deklarasi ({declaredVolumeCount} Jilid)
                        </p>
                      ) : (
                        <p className="inline-flex items-center gap-1 text-xs text-civic-warning font-bold mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Berbeda dari deklarasi ({declaredVolumeCount} Jilid)
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="intake-tracking-number" className="block font-bold text-ink mb-1.5">
                        Nomor Resi / Tanda Terima Pengiriman
                      </label>
                      <input
                        id="intake-tracking-number"
                        type="text"
                        disabled
                        value={selectedReg.dispatch_tracking_no || selectedReg.physical_master_intake?.tracking_number || selectedReg.physical_master?.tracking_number || 'Tercatat di Loket LPMQ'}
                        className="w-full p-2.5 rounded-xl border border-line bg-canvas font-mono text-ink text-xs font-semibold"
                      />
                      <span className="text-xs text-ink-muted block mt-1">
                        Resi kurir penerbit atau pencatatan loket
                      </span>
                    </div>
                  </div>

                  {/* Pilihan Kondisi Fisik Naskah */}
                  <div>
                    <label className="block font-bold text-ink mb-1.5">
                      Kondisi Fisik Master Mushaf <span className="text-civic-danger">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'BAIK', label: 'Baik & Lengkap', desc: 'Jilid rapi, cetakan jelas' },
                        { id: 'LENGKAP_CATATAN', label: 'Ada Catatan', desc: 'Jilid lecek/longgar' },
                        { id: 'CACAT', label: 'Cacat / Buram', desc: 'Halaman hilang / buram' },
                      ].map((item) => {
                        const isSelected = condition === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={isReceived}
                            onClick={() => setCondition(item.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? item.id === 'CACAT'
                                  ? 'bg-civic-dangerSoft border-civic-danger text-civic-danger font-bold shadow-2xs'
                                  : 'bg-brand-50 border-brand-700 text-brand-950 font-bold shadow-2xs ring-1 ring-brand-700/20'
                                : 'bg-surface-subtle border-line text-ink hover:bg-canvas'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold block">{item.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-brand-700" />}
                            </div>
                            <span className="text-xs text-ink-muted block font-normal mt-0.5 leading-tight">
                              {item.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status & Waktu Penerimaan Loket */}
                  <div className="p-3 bg-surface-subtle/80 rounded-xl border border-line flex items-center justify-between text-xs">
                    <div>
                      <span className="text-ink-muted block text-xs">Tanggal Penerimaan Paket Fisik:</span>
                      <strong className="text-ink font-semibold">
                        {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-ink-muted block text-xs">Petugas Loket Intake:</span>
                      <span className="text-brand-900 font-bold text-xs inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-brand-700" />
                        {currentUser?.name || 'Petugas Admin Internal'}
                      </span>
                    </div>
                  </div>

                  {/* Receipt Number */}
                  <div>
                    <label htmlFor="receipt-number-input" className="block font-bold text-ink mb-1.5">
                      Nomor Tanda Terima Resmi LPMQ <span className="text-civic-danger">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="receipt-number-input"
                        type="text"
                        disabled={isReceived}
                        value={receiptNo}
                        onChange={(e) => setReceiptNo(e.target.value)}
                        placeholder="TT-LPMQ-YYYY-XXXX"
                        className="w-full p-2.5 rounded-xl border border-line-strong font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                      />
                      {!isReceived && (
                        <button
                          type="button"
                          onClick={() => setReceiptNo(generateReceiptNo())}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-ink hover:text-brand-900 border border-line rounded-xl hover:bg-canvas shrink-0 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-brand-700" />
                          <span>Buat No. Baru</span>
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-ink-muted block mt-1">
                      Format resmi tanda terima: TT-LPMQ-TAHUN-NOMOR
                    </span>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="intake-notes-textarea" className="block font-bold text-ink mb-1.5">
                      Catatan Pemeriksaan Fisik (Opsional)
                    </label>
                    <textarea
                      id="intake-notes-textarea"
                      rows={2}
                      disabled={isReceived}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Print-out jilid per juz dalam keadaan rapi, tidak ada halaman buram..."
                      className="w-full p-2.5 rounded-xl border border-line-strong text-xs focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {!isReceived ? (
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-line mt-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReturnModalOpen(true)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto text-xs text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-civic-danger" />
                      Kembalikan ke Penerbit
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setConfirmReceiveOpen(true)}
                      disabled={actionLoading || isVolumeMismatch}
                      className="w-full sm:w-auto text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Terima Master Fisik & Terbitkan Tanda Terima
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-line mt-auto">
                    <span className="text-xs text-ink-muted italic">
                      {!isAssigned
                        ? 'Master fisik sudah diterima. Langkah berikutnya: Penugasan Verifikator oleh Helper Admin.'
                        : 'Verifikator telah ditugaskan untuk naskah ini.'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isAssigned ? (
                        canAssign ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setAssignDialogOpen(true)}
                            className="text-xs font-bold"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                            Tugaskan Verifikator
                          </Button>
                        ) : (
                          <Link
                            to={`/internal/verifications?tab=NEED_ASSIGNMENT&id=${selectedReg.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-2xs transition-colors"
                          >
                            <span>Buka Antrean Penugasan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-brand-700" />
              <h3 className="text-sm font-bold text-ink">
                Antrean Naskah Menunggu Master Fisik
              </h3>
              <span className="text-xs bg-brand-100 text-brand-800 font-bold px-2.5 py-0.5 rounded-full">
                {waitingList.length} Naskah
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWaitingList}
              disabled={waitingLoading}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${waitingLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>

          {waitingLoading ? (
            <div className="p-12 bg-white rounded-xl border border-line text-center space-y-3 shadow-2xs">
              <RefreshCw className="w-8 h-8 text-brand-700 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-ink-muted">Memuat antrean naskah masuk...</p>
            </div>
          ) : waitingList.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border border-line text-center space-y-3 shadow-2xs">
              <PackageCheck className="w-12 h-12 text-line-strong mx-auto stroke-1" />
              <h3 className="text-sm font-bold text-ink">
                Tidak Ada Antrean Naskah Menunggu Fisik
              </h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
                Seluruh naskah telah diterima master fisiknya, atau gunakan kotak pencarian di atas jika mencari nomor registrasi spesifik.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-canvas/80 text-ink-muted text-xs font-bold uppercase tracking-wider border-b border-line">
                      <th className="py-3.5 px-5">Nomor Registrasi & Tanggal</th>
                      <th className="py-3.5 px-5">Judul Naskah & Penerbit</th>
                      <th className="py-3.5 px-5">Deklarasi Fisik</th>
                      <th className="py-3.5 px-5">Status Fisik</th>
                      <th className="py-3.5 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {waitingList.map((item) => (
                      <tr key={item.id} className="hover:bg-brand-50/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className="font-mono font-bold text-ink block">
                            {item.registration_no || item.registrationNumber}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {new Date(item.created_at || item.submittedAt || Date.now()).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-ink block">
                            {item.title}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {item.publisher?.legal_name || item.publisher?.name || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-medium text-ink block">
                            {item.physical_master_intake?.volume_count || 30} Jilid A4
                          </span>
                          <span className="text-xs text-ink-muted">
                            {item.service_type?.name || 'Mushaf Standar'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          {item.physical_master_intake?.status === 'RECEIVED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-100">
                              Diterima Admin Internal
                            </span>
                          ) : item.status === 'REVISION_REQUIRED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                              Perbaikan Fisik (Ronde #{item.revision_round || 1})
                            </span>
                          ) : item.physical_master_intake?.status === 'RETURNED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
                              Dikembalikan (Revisi)
                            </span>
                          ) : item.physical_dispatch_status === 'DISPATCHED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                              Dikirim · Menunggu Penerimaan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                              Belum Dikirim Penerbit
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => loadRegistrationById(item.id)}
                            className="text-xs font-bold"
                          >
                            <PackageCheck className="w-3.5 h-3.5 mr-1" />
                            Proses Penerimaan Fisik
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Receiving Physical Master */}
      {receiptPdfUrl && (
        <div role="dialog" aria-modal="true" aria-label="PDF tanda terima master fisik" className="fixed inset-0 z-50 bg-ink/70 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Tanda Terima Master Fisik</h2>
                <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF untuk mencetak dokumen berkop LPMQ.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={receiptPdfUrl} download={`tanda-terima-${selectedReg?.registration_no || 'master-fisik'}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
                <Button variant="outline" className="text-xs" onClick={() => setReceiptPdfUrl(null)}>Tutup</Button>
              </div>
            </div>
            <iframe title="Penampil PDF tanda terima master fisik" src={receiptPdfUrl} className="flex-1 w-full border-0" />
          </div>
        </div>
      )}

      {selectedReg && (
        <ConfirmationSummaryDialog
          isOpen={confirmReceiveOpen}
          onClose={() => setConfirmReceiveOpen(false)}
          onConfirm={handleConfirmReceive}
          title="Terima Master Fisik & Terbitkan Tanda Terima"
          description="Pastikan naskah fisik print-out A4 telah diperiksa lengkap 30 juz sebelum diterbitkan tanda terima resmi."
          summaryItems={[
            { label: 'Nomor Registrasi', value: selectedReg.registration_no },
            { label: 'Judul Naskah', value: selectedReg.title },
            { label: 'Penerbit', value: selectedReg.publisher?.legal_name || '-' },
            { label: 'Jumlah Jilid', value: `${actualVolumeCount} Jilid A4` },
            { label: 'Nomor Tanda Terima', value: receiptNo },
            { label: 'Status Penerimaan Fisik', value: 'Paket Fisik Terverifikasi' },
          ]}
          impactMessage={selectedReg.status === 'REVISION_REQUIRED' ? "Tanda terima resmi (TT-LPMQ) diterbitkan dan naskah fisik diteruskan kepada Distributor untuk sidang pentashihan." : "Tanda terima resmi (TT-LPMQ) akan diterbitkan ke akun penerbit dan naskah siap ditugaskan kepada Verifikator oleh Admin Internal."}
          confirmLabel="Terbitkan Tanda Terima"
          confirmVariant="primary"
          loading={actionLoading}
        />
      )}

      {/* Modal Penolakan / Pengembalian Master Fisik */}
      {returnModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-civic-danger font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-civic-danger" />
                Kembalikan Master Fisik ke Penerbit
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Jelaskan alasan pengembalian naskah fisik (misalnya: print-out cacat, jilid kurang dari 30 juz, atau halaman buram). Penerbit akan mendapatkan notifikasi untuk melengkapi fisik naskah.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Alasan Pengembalian Fisik <span className="text-civic-danger">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Jumlah jilid fisik yang diserahkan hanya 29 juz (kurang juz 30), mohon dilengkapi kembali..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-danger/20 focus:border-civic-danger"
                  required
                />
                <span className="text-xs text-ink-muted">Minimal 5 karakter.</span>
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
                  className="text-xs bg-civic-danger hover:bg-civic-danger text-white font-bold px-4 py-2"
                >
                  {actionLoading ? 'Memproses...' : 'Kembalikan Master'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Penugasan Verifikator oleh Helper Admin */}
      {assignDialogOpen && selectedReg && (
        <AssignVerificationDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          registration={selectedReg}
          onSuccess={async () => {
            setAssignDialogOpen(false);
            setSuccessMessage(
              `Verifikator berhasil ditugaskan untuk naskah ${selectedReg.registration_no}. Disposisi telah diterbitkan.`
            );
            try {
              const detailRes = await registrationApi.getDetail(selectedReg.id);
              if (detailRes?.data) setSelectedReg(detailRes.data);
            } catch {
              // Abaikan jika reload gagal
            }
          }}
          onConflict={async () => {
            try {
              const detailRes = await registrationApi.getDetail(selectedReg.id);
              if (detailRes?.data) setSelectedReg(detailRes.data);
            } catch {
              // Abaikan
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminMasterIntakePage;

