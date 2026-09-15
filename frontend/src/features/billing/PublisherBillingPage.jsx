import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { paymentApi } from '@/api/payment.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  CreditCard,
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';

export const PublisherBillingPage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedRegId = searchParams.get('registration_id');

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PAID' | 'VERIFIED'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBilling, setCopiedBilling] = useState(null);

  // Modal Konfirmasi Pembayaran
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [ntpn, setNtpn] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [modalError, setModalError] = useState(null);

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (activeTab !== 'ALL') {
        params.status = activeTab;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await paymentApi.listPayments(params);
      if (res?.data) {
        const items = res.data.items || [];
        setPayments(items);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }

        // Auto open confirm modal if preselected registration_id matches
        if (preselectedRegId) {
          const match = items.find((p) => p.registration_id === preselectedRegId);
          if (match && match.status === 'UNPAID') {
            setSelectedPayment(match);
            setConfirmModalOpen(true);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar tagihan pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeTab, pagination.page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchPayments();
  };

  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedBilling(key);
    setTimeout(() => setCopiedBilling(null), 2000);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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

  // Helper SLA status
  const getSlaDisplay = (payment) => {
    if (!payment.expires_at) return null;
    const now = new Date();
    const expiry = new Date(payment.expires_at);
    const diffMs = expiry.getTime() - now.getTime();
    const isOverdue = diffMs <= 0;

    if (payment.status !== 'UNPAID') {
      return {
        label: `Batas SLA: ${formatDate(payment.expires_at)}`,
        isWarning: false,
        isExpired: false,
      };
    }

    if (isOverdue) {
      return {
        label: 'Kode Billing Kedaluwarsa (7 Hari)',
        isWarning: true,
        isExpired: true,
      };
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return {
        label: `Sisa ${diffDays} hari ${diffHours} jam`,
        isWarning: diffDays <= 2,
        isExpired: false,
      };
    }

    return {
      label: `Sisa ${diffHours} jam lagi`,
      isWarning: true,
      isExpired: false,
    };
  };

  const openConfirmModal = (payment) => {
    setSelectedPayment(payment);
    setNtpn(payment.external_ref || '');
    setReceiptFile(null);
    setReceiptPreview(null);
    setModalError(null);
    setConfirmModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setModalError('Ukuran berkas maksimal 5 MB.');
      return;
    }

    // Validate type (PDF, PNG, JPEG)
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      setModalError('Format berkas harus PDF, PNG, atau JPG.');
      return;
    }

    setModalError(null);
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;

    if (!ntpn.trim()) {
      setModalError('Nomor Transaksi Penerimaan Negara (NTPN) / Ref Transfer wajib diisi.');
      return;
    }

    if (!receiptFile) {
      setModalError('Berkas bukti transfer wajib diunggah.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      // 1. Upload berkas bukti ke secure storage
      const uploaded = await paymentApi.uploadReceipt(receiptFile);
      if (!uploaded?.id) {
        throw new Error('Gagal memproses unggahan bukti pembayaran.');
      }

      // 2. Konfirmasi pembayaran
      await paymentApi.confirmPayment(selectedPayment.id, {
        receipt_file_id: uploaded.id,
        external_ref: ntpn.trim(),
      });

      setSuccessMessage('Konfirmasi pembayaran berhasil dikirimkan. Petugas LPMQ akan memverifikasi bukti Anda.');
      setConfirmModalOpen(false);
      await fetchPayments();
    } catch (err) {
      setModalError(err.message || 'Gagal mengonfirmasi pembayaran.');
    } finally {
      setActionLoading(false);
    }
  };

  // Hitung metrik
  const metrics = useMemo(() => {
    return {
      unpaidCount: payments.filter((p) => p.status === 'UNPAID').length,
      paidCount: payments.filter((p) => p.status === 'PAID').length,
      verifiedCount: payments.filter((p) => p.status === 'VERIFIED').length,
    };
  }, [payments]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/publisher" className="hover:text-emerald-700 transition-colors">
            Portal Penerbit
          </Link>
          <span>&bull;</span>
          <span className="font-bold text-slate-800">Billing PNBP</span>
        </div>

        <span className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
          SLA Pembayaran: 7 Hari Kalender
        </span>
      </div>

      {/* Alert Messages */}
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

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-[#083224] via-[#0B3F2D] to-[#0E5139] text-white rounded-2xl border border-emerald-800/80 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#DFB045_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative z-10 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-gold-300 font-bold bg-primary-950/70 px-2.5 py-0.5 rounded border border-gold-400/30">
                Penerimaan Negara Bukan Pajak (PNBP)
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Billing & Konfirmasi Pembayaran
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
                Kelola kode billing resmi Kementerian Agama, pantau masa berlaku tagihan 7 hari kalender, dan lakukan konfirmasi setoran NTPN secara aman.
              </p>
            </div>

            <Button
              onClick={fetchPayments}
              disabled={loading}
              variant="outline"
              className="text-xs border-emerald-500/50 text-white hover:bg-emerald-800/60 shrink-0 self-start sm:self-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-400/20 text-amber-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200/80 font-medium">Menunggu Bayar</p>
                <p className="text-lg font-extrabold text-white">{metrics.unpaidCount} Tagihan</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-400/20 text-indigo-300">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200/80 font-medium">Dalam Verifikasi</p>
                <p className="text-lg font-extrabold text-white">{metrics.paidCount} Tagihan</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-400/20 text-emerald-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200/80 font-medium">Lunas & Sah</p>
                <p className="text-lg font-extrabold text-white">{metrics.verifiedCount} Tagihan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto overflow-x-auto text-xs">
            {[
              { key: 'ALL', label: 'Semua' },
              { key: 'UNPAID', label: 'Menunggu Bayar' },
              { key: 'PAID', label: 'Dalam Verifikasi' },
              { key: 'VERIFIED', label: 'Lunas' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. billing, judul, naskah..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <Button type="submit" variant="outline" className="text-xs py-2 px-3">
              Cari
            </Button>
          </form>
        </div>
      </div>

      {/* Daftar Tagihan */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memuat data tagihan PNBP...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak Ada Tagihan Ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab !== 'ALL'
              ? `Belum ada tagihan dengan status ${activeTab}.`
              : 'Naskah Anda belum memiliki tagihan PNBP. Tagihan akan otomatis terbit setelah surat hasil verifikasi disahkan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((item) => {
            const reg = item.registration || {};
            const sla = getSlaDisplay(item);
            const isUnpaid = item.status === 'UNPAID';
            const isPaid = item.status === 'PAID';
            const isVerified = item.status === 'VERIFIED';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow p-5 space-y-4"
              >
                {/* Rejection Alert Banner */}
                {item.rejection_reason && isUnpaid && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">
                        Bukti Pembayaran Sebelumnya Perlu Diperbaiki:
                      </p>
                      <p className="text-rose-700 mt-0.5 leading-relaxed">{item.rejection_reason}</p>
                      <p className="text-rose-600 text-[11px] mt-1 italic">
                        Silakan unggah kembali bukti setoran bank yang sah dan pastikan NTPN terbaca jelas.
                      </p>
                    </div>
                  </div>
                )}

                {/* Top Details & Billing Number */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-mono text-slate-500">No. Billing:</span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {item.billing_no}
                      </span>
                      <button
                        onClick={() => handleCopyText(item.billing_no, item.id)}
                        className="text-slate-400 hover:text-emerald-700 transition-colors ml-1 p-0.5"
                        title="Salin Nomor Billing"
                      >
                        {copiedBilling === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {reg.registration_no || '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sla && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          sla.isExpired
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : sla.isWarning
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {sla.label}
                      </span>
                    )}

                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* Main Info Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Judul Naskah Mushaf</p>
                    <p className="font-bold text-slate-900 text-sm">{reg.title || 'Naskah Mushaf'}</p>
                    <p className="text-slate-500">{reg.service_type?.name || 'Pentashihan Reguler'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Nominal Tarif PNBP</p>
                    <p className="font-black text-slate-900 text-base text-emerald-700">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-slate-500">Sesuai PP Tarif Kemenag RI</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Status Setoran / NTPN</p>
                    {item.external_ref ? (
                      <p className="font-mono font-bold text-slate-800">NTPN: {item.external_ref}</p>
                    ) : (
                      <p className="text-amber-700 font-medium italic">Belum ada konfirmasi NTPN</p>
                    )}
                    <p className="text-slate-500">
                      Terbit: {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Metode Pembayaran:{' '}
                    <span className="font-semibold text-slate-700">
                      Bank Persepsi / SIMPONI Kemenag
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isUnpaid && (
                      <Button
                        variant="primary"
                        onClick={() => openConfirmModal(item)}
                        className="w-full sm:w-auto text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-4 py-2 inline-flex items-center justify-center gap-1.5"
                      >
                        <UploadCloud className="w-4 h-4" />
                        Konfirmasi Pembayaran
                      </Button>
                    )}

                    {isPaid && (
                      <div className="inline-flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-xl font-bold text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        Bukti Terkirim (Menunggu Verifikasi Petugas)
                      </div>
                    )}

                    {isVerified && (
                      <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Lunas & Terverifikasi Sah
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Konfirmasi Pembayaran */}
      {confirmModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-slideUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Konfirmasi Pembayaran PNBP
              </div>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Tagihan Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nomor Billing:</span>
                <span className="font-mono font-bold text-slate-800">{selectedPayment.billing_no}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Naskah Mushaf:</span>
                <span className="font-bold text-slate-800">{selectedPayment.registration?.title || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Total Tagihan:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </div>
            </div>

            {/* Form Input */}
            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nomor Transaksi Penerimaan Negara (NTPN) / No. Resi Bank <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={ntpn}
                  onChange={(e) => setNtpn(e.target.value)}
                  placeholder="Contoh: 8274910284759281 atau No. Resi BSI"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Nomor NTPN tercetak pada bukti setoran bank atau struk teller/ATM.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Unggah Bukti Setor / Transfer <span className="text-rose-600">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="receipt-file-input"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  <label htmlFor="receipt-file-input" className="cursor-pointer block space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                    {receiptFile ? (
                      <div className="text-xs">
                        <p className="font-bold text-emerald-700">{receiptFile.name}</p>
                        <p className="text-slate-400 text-[11px]">
                          {(receiptFile.size / 1024).toFixed(1)} KB &bull; Klik untuk mengganti
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <p className="font-semibold text-slate-700">Pilih berkas bukti transfer</p>
                        <p className="text-slate-400 text-[11px]">Format PDF, PNG, atau JPG (Maks 5 MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {receiptPreview && (
                <div className="mt-2 text-center">
                  <img
                    src={receiptPreview}
                    alt="Preview Bukti"
                    className="max-h-36 mx-auto rounded-lg border border-slate-200 object-contain shadow-2xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-5 py-2"
                >
                  {actionLoading ? 'Mengirimkan...' : 'Kirim Konfirmasi Pembayaran'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Petunjuk Pembayaran Resmi SIMPONI */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          Panduan Pembayaran PNBP Pentashihan Mushaf
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
            <p className="font-bold text-slate-800">1. Salin Kode Billing</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Gunakan Nomor Billing yang tertera di atas. Pastikan pembayaran dilakukan sebelum batas waktu SLA (7 hari kalender).
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
            <p className="font-bold text-slate-800">2. Setor ke Bank Persepsi</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Bayar melalui Teller Bank, ATM, atau Mobile Banking mitra SIMPONI (Bank Mandiri, BRI, BNI, BSI, BCA) menggunakan menu Pembayaran Penerimaan Negara.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
            <p className="font-bold text-slate-800">3. Konfirmasi di Portal</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Masukkan Nomor Transaksi Penerimaan Negara (NTPN) serta unggah foto/PDF bukti bayar agar verifikator LPMQ dapat memverifikasi pelunasan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublisherBillingPage;

