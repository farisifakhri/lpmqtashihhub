import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Receipt,
  Building2,
  Calendar,
  X,
  Eye,
  Download,
} from 'lucide-react';

export const InternalPaymentQueuePage = () => {
  const { currentUser } = useAuth();

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('PAID'); // default tab 'PAID' (perlu verifikasi)
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBilling, setCopiedBilling] = useState(null);

  // Modal Penolakan / Pengembalian Bukti Bayar
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modalError, setModalError] = useState(null);

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
        setPayments(res.data.items || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean pembayaran PNBP.');
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

  const handleVerify = async (payment) => {
    if (!window.confirm(`Sahkan pembayaran PNBP untuk naskah '${payment.registration?.title || payment.billing_no}' sebagai LUNAS dan VALID?`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await paymentApi.verifyPayment(payment.id);
      setSuccessMessage(`Pembayaran untuk billing ${payment.billing_no} berhasil diverifikasi sah (LUNAS).`);
      await fetchPayments();
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi pembayaran.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (payment) => {
    setSelectedPayment(payment);
    setRejectReason('');
    setModalError(null);
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;

    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setModalError('Alasan penolakan bukti bayar minimal 5 karakter.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      await paymentApi.returnPayment(selectedPayment.id, { reason: rejectReason.trim() });
      setSuccessMessage(`Bukti pembayaran untuk billing ${selectedPayment.billing_no} berhasil ditolak dan dikembalikan ke penerbit.`);
      setRejectModalOpen(false);
      await fetchPayments();
    } catch (err) {
      setModalError(err.message || 'Gagal menolak bukti pembayaran.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewReceipt = (fileId) => {
    if (!fileId) return;
    const token = localStorage.getItem('lpmq_token');
    const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
    window.open(`${apiBase}/workflow/uploads/${fileId}?token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/internal" className="hover:text-emerald-700 transition-colors">
            Portal Petugas
          </Link>
          <span>&bull;</span>
          <span className="font-bold text-slate-800">Verifikasi Pembayaran PNBP</span>
        </div>

        <span className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
          Epic G: BR-VER-016 & BR-VER-017
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

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#083224] via-[#0B3F2D] to-[#0E5139] text-white rounded-2xl p-6 sm:p-8 shadow-md border border-emerald-800/60">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#DFB045_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wide text-gold-300 uppercase shadow-2xs">
              <Receipt className="w-3.5 h-3.5 text-gold-400" />
              SOP Verifikasi — Epic G: Billing PNBP
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
              Verifikasi Pembayaran & Setoran PNBP
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              Validasi bukti setor bank, kecocokan Nomor Transaksi Penerimaan Negara (NTPN), dan nominal tarif PNBP mushaf sebelum naskah diserahkan ke Distributor Pentashihan.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={fetchPayments}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-2xs text-xs font-semibold shadow-xs shrink-0 self-start md:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto overflow-x-auto text-xs font-semibold">
            {[
              { key: 'PAID', label: 'Perlu Diverifikasi' },
              { key: 'UNPAID', label: 'Menunggu Bayar' },
              { key: 'VERIFIED', label: 'Lunas & Sah' },
              { key: 'ALL', label: 'Semua Status' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari billing, naskah, penerbit..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <Button type="submit" variant="outline" className="text-xs py-2 px-3">
              Cari
            </Button>
          </form>
        </div>
      </div>

      {/* List Payments */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memuat data verifikasi pembayaran...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak Ada Antrean Pembayaran</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'PAID'
              ? 'Tidak ada bukti pembayaran baru yang menunggu verifikasi saat ini.'
              : `Belum ada data pembayaran dengan status ${activeTab}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((item) => {
            const reg = item.registration || {};
            const pub = reg.publisher || {};
            const isNeedsVerification = item.status === 'PAID';
            const isVerified = item.status === 'VERIFIED';
            const isUnpaid = item.status === 'UNPAID';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-5 space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-mono text-slate-500">Billing:</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{item.billing_no}</span>
                      <button
                        onClick={() => handleCopyText(item.billing_no, item.id)}
                        className="text-slate-400 hover:text-emerald-700 transition-colors ml-1"
                        title="Salin No. Billing"
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
                    <span className="text-[11px] text-slate-500">
                      Terbit: {formatDate(item.created_at)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Naskah & Penerbit</p>
                    <p className="font-bold text-slate-900 text-sm">{reg.title || 'Naskah Mushaf'}</p>
                    <p className="text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {pub.legal_name || 'Penerbit Pemohon'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Tarif PNBP</p>
                    <p className="font-black text-slate-900 text-base text-emerald-700">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-slate-500">{reg.service_type?.name || 'Pentashihan Reguler'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Nomor NTPN / Referensi</p>
                    {item.external_ref ? (
                      <p className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-md inline-block">
                        {item.external_ref}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">Belum dikonfirmasi</p>
                    )}
                    {item.paid_at && (
                      <p className="text-[11px] text-slate-500">Waktu Bayar: {formatDate(item.paid_at)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Bukti Bayar & Dokumen</p>
                    {item.receipt_file_id ? (
                      <button
                        onClick={() => handleViewReceipt(item.receipt_file_id)}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Buka Bukti Bayar
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">Tidak ada berkas</span>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                {isNeedsVerification && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-amber-700 font-medium">
                      Penerbit telah mengunggah bukti bayar dan menunggu validasi petugas.
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        variant="outline"
                        onClick={() => openRejectModal(item)}
                        disabled={actionLoading}
                        className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Tolak Bukti Bayar
                      </Button>

                      <Button
                        variant="primary"
                        onClick={() => handleVerify(item)}
                        disabled={actionLoading}
                        className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-4 py-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Sahkan Pembayaran (Lunas)
                      </Button>
                    </div>
                  </div>
                )}

                {isVerified && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Pembayaran telah dinyatakan sah dan lunas. Naskah siap diserahkan kepada Distributor Pentashihan (Langkah 7 SOP).
                    </span>
                    <Link
                      to="/internal/distributions"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                    >
                      Buka Serah-Terima Fisik &rarr;
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Penolakan Bukti Pembayaran */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                Tolak Bukti Pembayaran PNBP
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
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

            <p className="text-xs text-slate-600 leading-relaxed">
              Berikan alasan penolakan secara jelas kepada penerbit (misalnya: nominal tidak sesuai, NTPN tidak terdaftar di sistem persepsi, atau bukti tidak terbaca). Status tagihan akan dikembalikan ke <b>Menunggu Pembayaran (UNPAID)</b>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Alasan Penolakan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Bukti transfer buram dan NTPN tidak dapat diverifikasi pada sistem persepsi bank..."
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
                  onClick={() => setRejectModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || rejectReason.trim().length < 5}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2"
                >
                  {actionLoading ? 'Menolak...' : 'Kirim Penolakan Bukti'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalPaymentQueuePage;

