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

  // Auto-generate official intake receipt number format: TT-LPMQ-YYYY-XXXX
  const generateReceiptNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TT-LPMQ-${year}-${rand}`;
  };

  const fetchWaitingList = async () => {
    setWaitingLoading(true);
    try {
      const res = await registrationApi.listRegistrations({
        status: 'READY_FOR_VERIFICATION',
        limit: 20,
      });
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
      const pendingItems = items.filter((item) => {
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
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const canAssign = isHead;
  const isAssigned = selectedReg?.status && selectedReg.status !== 'READY_FOR_VERIFICATION';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* Header */}
      <PageHeader
        title="Loket Intake Master Fisik Mushaf"
        subtitle="Pencocokan print-out master fisik A4 per juz dengan data deklarasi pendaftaran (LPMQ SOP v2.2)"
        breadcrumbs={[
          { label: 'Portal Petugas', href: '/internal' },
          { label: 'Intake Master Fisik' },
        ]}
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

      {/* Fast Lookup Bar */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <label className="block text-xs font-bold text-slate-800">
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
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: REG-2026-001 atau tempel kode QR..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-100/70 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={handleBackToQueue}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Antrean Intake Loket
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sedang Memproses:</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {selectedReg.registration_no}
              </span>
            </div>
          </div>

          {/* Visual Diff Alert if Volume Count Mismatches */}
          {isVolumeMismatch && !isReceived && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900 shadow-2xs animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-amber-950">
                  Peringatan Perbedaan Jumlah Jilid Fisik (Visual Diff)
                </strong>
                <p className="mt-0.5 leading-relaxed text-amber-800">
                  Jumlah jilid aktual yang dihitung di loket (<strong>{actualVolumeCount} Jilid</strong>) berbeda dari deklarasi yang dimasukkan penerbit saat pendaftaran (<strong>{declaredVolumeCount} Jilid</strong>).
                  Sesuai aturan SOP v2.2, sistem menolak penerimaan jika jumlah jilid berbeda. Silakan kembalikan master fisik dengan catatan agar penerbit memperbarui deklarasi.
                </p>
              </div>
            </div>
          )}

          {/* Intake Status Banner if Already Received */}
          {isReceived && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <strong className="text-sm font-bold">Master Fisik Telah Resmi Diterima di Loket LPMQ</strong>
                  <p className="text-emerald-800 mt-0.5">
                    Nomor Tanda Terima: <strong className="font-mono">{selectedReg.physical_master_intake?.receipt_no}</strong> · Kondisi: {selectedReg.physical_master_intake?.condition || 'Baik'} · Diterima pada {selectedReg.physical_master_intake?.received_at ? new Date(selectedReg.physical_master_intake.received_at).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-xs bg-white"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Cetak Tanda Terima
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
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors"
                    >
                      <span>Buka Antrean Penugasan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )
                ) : (
                  <Link
                    to={`/internal/verifications/${selectedReg.verification_assignment?.id || selectedReg.verification_assignments?.[0]?.id || selectedReg.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition-colors"
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
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-sm font-bold text-rose-950">
                    Master Fisik Dikembalikan ke Penerbit (Perlu Perbaikan)
                  </strong>
                  <p className="text-rose-800 leading-relaxed">
                    Alasan Pengembalian: <em>"{selectedReg.physical_master_intake?.notes || 'Master fisik tidak lengkap atau cacat.'}"</em>
                  </p>
                  <p className="text-[11px] text-rose-700">
                    Kondisi Catatan Loket: <strong>{selectedReg.physical_master_intake?.condition || 'Tidak Lengkap'}</strong> · Menunggu penerbit menyerahkan perbaikan jilid naskah fisik A4.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center px-3 py-1 bg-rose-100 border border-rose-300 rounded-full font-bold text-rose-800 text-xs">
                  DIKEMBALIKAN (REVISI)
                </span>
              </div>
            </div>
          )}

          {/* 2-Column Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* KOLOM KIRI: Deklarasi Penerbit */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Deklarasi Dokumen Penerbit
                  </h3>
                </div>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  title={selectedReg.external_sync_error || undefined}
                >
                  {selectedReg.external_sync_status === 'SYNCED'
                    ? 'Tersinkronisasi'
                    : selectedReg.external_sync_status === 'FAILED'
                    ? 'Gagal Sinkronisasi'
                    : selectedReg.external_sync_status === 'FAILED_CONFIGURATION'
                    ? 'Konfigurasi Belum Lengkap'
                    : 'Menunggu integrasi resmi'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nomor Registrasi:</span>
                  <strong className="text-slate-900 font-mono text-sm block mt-0.5">
                    {selectedReg.registration_no}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Judul Naskah Mushaf:</span>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">
                    {selectedReg.title}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500 block text-[11px]">Penerbit Pemohon:</span>
                  <p className="text-slate-900 font-semibold mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {selectedReg.publisher?.legal_name || '-'}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{selectedReg.publisher?.address || 'Alamat tidak terdata'}</p>
                </div>

                <div className="border-t border-slate-100 pt-2.5 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Format Master:</span>
                    <strong className="text-slate-900 block font-mono">
                      {selectedReg.physical_master_intake?.format || 'A4'} (Per Juz)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Jumlah Jilid Deklarasi:</span>
                    <strong className="text-slate-900 block font-mono text-sm text-emerald-800">
                      {declaredVolumeCount} Jilid
                    </strong>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500 block text-[11px]">Jenis Layanan & Kategori:</span>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {selectedReg.service_type?.name || 'Mushaf Standar'} · {selectedReg.service_type?.category?.name || 'Mushaf Cetak'}
                  </p>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Verifikasi Fisik oleh Petugas Loket */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Verifikasi Fisik Aktual di Loket
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Formulir Petugas
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Format Jilid */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Format Naskah Cetak Fisik
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Ukuran A4 Dijilid Rapi Per Juz (Standar SOP)"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                  />
                </div>

                {/* Actual Volume Count & Condition */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Jumlah Jilid Aktual Diterima <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      disabled={isReceived}
                      value={actualVolumeCount}
                      onChange={(e) => setActualVolumeCount(e.target.value)}
                      className={`w-full p-2.5 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                        isVolumeMismatch
                          ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-amber-500/20'
                          : 'border-slate-300 focus:ring-emerald-700/20 focus:border-emerald-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Kondisi Fisik Naskah <span className="text-rose-600">*</span>
                    </label>
                    <select
                      disabled={isReceived}
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    >
                      <option value="BAIK">BAIK (Rapi & Bersih)</option>
                      <option value="LENGKAP">LENGKAP (30 Juz)</option>
                      <option value="CACAT_RINGAN">CACAT RINGAN</option>
                      <option value="TIDAK_LENGKAP">TIDAK LENGKAP / RUSAK</option>
                    </select>
                  </div>
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Nomor Tanda Terima Resmi LPMQ <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={isReceived}
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      placeholder="TT-LPMQ-YYYY-XXXX"
                      className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                    {!isReceived && (
                      <button
                        type="button"
                        onClick={() => setReceiptNo(generateReceiptNo())}
                        className="px-3 py-2.5 text-[11px] font-semibold text-slate-700 hover:text-emerald-900 border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
                      >
                        Acak No.
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Catatan Pemeriksaan Fisik (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReceived}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Print-out jilid per juz dalam keadaan rapi, tidak ada halaman buram..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                {/* Action Buttons */}
                {!isReceived ? (
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReturnModalOpen(true)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
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
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 italic">
                      {!isAssigned
                        ? 'Master fisik sudah diterima. Langkah berikutnya: Penugasan Verifikator oleh Kepala LPMQ.'
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
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors"
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
              <Inbox className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Antrean Naskah Menunggu Master Fisik di Loket
              </h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
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
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center space-y-3 shadow-2xs">
              <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Memuat antrean naskah masuk...</p>
            </div>
          ) : waitingList.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center space-y-3 shadow-2xs">
              <PackageCheck className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="text-sm font-bold text-slate-800">
                Tidak Ada Antrean Naskah Menunggu Fisik
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Seluruh naskah siap verifikasi telah diterima master fisiknya di loket, atau gunakan kotak pencarian di atas jika mencari nomor registrasi spesifik.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-5">Nomor Registrasi & Tanggal</th>
                      <th className="py-3.5 px-5">Judul Naskah & Penerbit</th>
                      <th className="py-3.5 px-5">Deklarasi Fisik</th>
                      <th className="py-3.5 px-5">Status Fisik</th>
                      <th className="py-3.5 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {waitingList.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className="font-mono font-bold text-slate-900 block">
                            {item.registration_no || item.registrationNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.created_at || item.submittedAt || Date.now()).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-slate-800 block">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.publisher?.legal_name || item.publisher?.name || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-medium text-slate-700 block">
                            {item.physical_master_intake?.volume_count || 30} Jilid A4
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {item.service_type?.name || 'Mushaf Standar'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          {item.physical_master_intake?.status === 'RECEIVED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Diterima di Loket
                            </span>
                          ) : item.physical_master_intake?.status === 'RETURNED' || item.status === 'REVISION_REQUIRED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              Dikembalikan (Revisi)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Menunggu Fisik A4
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
            { label: 'Kondisi Naskah', value: condition },
          ]}
          impactMessage="Tanda terima resmi (TT-LPMQ) akan diterbitkan ke akun penerbit dan naskah siap ditugaskan kepada Verifikator oleh Kepala LPMQ."
          confirmLabel="Terbitkan Tanda Terima"
          confirmVariant="primary"
          loading={actionLoading}
        />
      )}

      {/* Modal Penolakan / Pengembalian Master Fisik */}
      {returnModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Kembalikan Master Fisik ke Penerbit
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Jelaskan alasan pengembalian naskah fisik (misalnya: print-out cacat, jilid kurang dari 30 juz, atau halaman buram). Penerbit akan mendapatkan notifikasi untuk melengkapi fisik naskah.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Alasan Pengembalian Fisik <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Jumlah jilid fisik yang diserahkan hanya 29 juz (kurang juz 30), mohon dilengkapi kembali..."
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
                  className="text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2"
                >
                  {actionLoading ? 'Memproses...' : 'Kembalikan Master'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Penugasan Verifikator oleh Kepala LPMQ */}
      {assignDialogOpen && selectedReg && (
        <AssignVerificationDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          registration={selectedReg}
          onSuccess={async () => {
            setAssignDialogOpen(false);
            setSuccessMessage(
              `Verifikator berhasil ditugaskan untuk naskah ${selectedReg.registration_no}. Nota Dinas telah diterbitkan.`
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

