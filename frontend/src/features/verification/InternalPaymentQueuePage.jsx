import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { paymentApi } from '@/api/payment.api';
import { fileApi } from '@/api/file.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
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
  PackageCheck,
  ChevronRight,
} from 'lucide-react';

export const InternalPaymentQueuePage = () => {
  const { currentUser } = useAuth();

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('PAID'); // default 'PAID' (perlu verifikasi)
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBilling, setCopiedBilling] = useState(null);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const requestId = useRef(0);

  // Selected payment for detail workspace
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  // Confirmation dialog for verifying payment
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);

  // Modal Penolakan / Pengembalian Bukti Bayar
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [modalError, setModalError] = useState(null);

  const fetchPayments = async () => {
    const request = ++requestId.current;
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
      if (submittedSearch) {
        params.search = submittedSearch;
      }

      const res = await paymentApi.listPayments(params);
      if (request !== requestId.current) return;
      if (res?.data) {
        const items = res.data.items || [];
        setPayments(items);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }

        // Auto select first item if none selected or not in list
        if (items.length > 0) {
          setSelectedPaymentId((prev) => {
            const exists = items.some((i) => i.id === prev);
            return exists ? prev : items[0].id;
          });
        } else {
          setSelectedPaymentId(null);
        }
      }
    } catch (err) {
      if (request === requestId.current) setError(err.message || 'Gagal memuat antrean pembayaran PNBP.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    return () => {
      requestId.current += 1;
    };
  }, [activeTab, pagination.page, submittedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (pagination.page === 1 && submittedSearch === searchQuery.trim()) fetchPayments();
    setSubmittedSearch(searchQuery.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
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

  const selectedPayment = useMemo(() => {
    return payments.find((p) => p.id === selectedPaymentId) || null;
  }, [payments, selectedPaymentId]);

  const handleVerify = async () => {
    if (!selectedPayment) return;

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await paymentApi.verifyPayment(selectedPayment.id);
      setSuccessMessage(
        `Pembayaran untuk nomor billing ${selectedPayment.billing_no} berhasil diverifikasi sah (LUNAS). Naskah siap diserahkan ke Distributor.`
      );
      setVerifyConfirmOpen(false);
      await fetchPayments();
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi pembayaran.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = () => {
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
      setSuccessMessage(
        `Bukti pembayaran untuk billing ${selectedPayment.billing_no} berhasil ditolak dan status dikembalikan ke UNPAID.`
      );
      setRejectModalOpen(false);
      await fetchPayments();
    } catch (err) {
      setModalError(err.message || 'Gagal menolak bukti pembayaran.');
    } finally {
      setActionLoading(false);
    }
  };

  // Master Content: Left Queue Pane
  const masterContent = (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari billing, naskah, pemohon..."
          className="w-full text-xs pl-9 pr-14 py-2.5 rounded-xl border border-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold text-ink hover:text-brand-900 bg-surface-subtle rounded-lg hover:bg-surface-strong transition-colors"
        >
          Cari
        </button>
      </form>

      {/* Segmented Filter */}
      <div className="flex items-center p-1 bg-surface-subtle rounded-xl border border-line text-xs font-semibold overflow-x-auto">
        {[
          { key: 'PAID', label: 'Perlu Verifikasi' },
          { key: 'UNPAID', label: 'Menunggu' },
          { key: 'VERIFIED', label: 'Lunas & Sah' },
          { key: 'ALL', label: 'Semua' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all whitespace-nowrap text-center ${
              activeTab === tab.key
                ? 'bg-white text-brand-900 shadow-2xs font-bold'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Items */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-7 h-7 border-3 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-ink-muted font-medium">Memuat antrean tagihan...</p>
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="Tidak Ada Tagihan"
          description={
            activeTab === 'PAID'
              ? 'Tidak ada bukti pembayaran baru yang menunggu verifikasi saat ini.'
              : `Belum ada data pembayaran dengan status ${activeTab}.`
          }
          icon={<Receipt className="w-10 h-10 text-line-strong stroke-1" />}
        />
      ) : (
        <div className="space-y-2.5">
          {payments.map((item) => {
            const isSelected = selectedPaymentId === item.id;
            const reg = item.registration || {};
            const pub = reg.publisher || {};

            return (
              <div
                key={item.id}
                onClick={() => setSelectedPaymentId(item.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs space-y-2 ${
                  isSelected
                    ? 'border-brand-700 bg-brand-50/40 shadow-xs ring-1 ring-brand-700/30'
                    : 'border-line bg-white hover:border-line-strong hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-ink text-xs">
                    {item.billing_no}
                  </span>
                  <StatusBadge status={item.status} />
                </div>

                <div>
                  <h4 className="font-bold text-ink text-xs line-clamp-1">
                    {reg.title || 'Naskah Mushaf'}
                  </h4>
                  <p className="text-[11px] text-ink-muted truncate mt-0.5">
                    {pub.legal_name || 'Penerbit Pemohon'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-line text-[11px]">
                  <strong className="text-brand-800 font-extrabold">
                    {formatCurrency(item.amount)}
                  </strong>
                  <span className="text-ink-muted font-mono text-[10px]">
                    {item.external_ref ? `NTPN: ${item.external_ref}` : 'Belum NTPN'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-line text-xs text-ink-muted">
          <span>
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="px-2.5 py-1 rounded-md border border-line disabled:opacity-50 font-semibold hover:bg-canvas"
            >
              Sebelumnya
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="px-2.5 py-1 rounded-md border border-line disabled:opacity-50 font-semibold hover:bg-canvas"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Detail Content: Right Workspace Pane
  const detailContent = selectedPayment ? (
    <div className="space-y-6">
      {/* Workspace Header Card */}
      <div className="p-5 bg-white rounded-xl border border-line shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-ink bg-surface-subtle border border-line px-2.5 py-1 rounded-md">
                Billing #{selectedPayment.billing_no}
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(selectedPayment.billing_no, 'detail')}
                className="text-ink-muted hover:text-brand-800 transition-colors"
                title="Salin Nomor Billing"
              >
                {copiedBilling === 'detail' ? (
                  <Check className="w-3.5 h-3.5 text-brand-700" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <StatusBadge status={selectedPayment.status} />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-ink">
              {selectedPayment.registration?.title || 'Naskah Mushaf'}
            </h2>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-ink-muted block">Tarif Layanan PNBP</span>
            <span className="text-xl font-black text-brand-800">
              {formatCurrency(selectedPayment.amount)}
            </span>
          </div>
        </div>

        {/* Snapshot Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-canvas rounded-lg border border-line space-y-1">
            <span className="text-ink-muted block text-[11px]">Penerbit Pemohon:</span>
            <strong className="text-ink block font-semibold">
              {selectedPayment.registration?.publisher?.legal_name || '-'}
            </strong>
            <p className="text-ink-muted text-[11px] truncate">
              {selectedPayment.registration?.publisher?.address || 'Alamat terdaftar'}
            </p>
          </div>

          <div className="p-3 bg-canvas rounded-lg border border-line space-y-1">
            <span className="text-ink-muted block text-[11px]">Nomor NTPN / Referensi:</span>
            {selectedPayment.external_ref ? (
              <strong className="text-ink block font-mono font-bold">
                {selectedPayment.external_ref}
              </strong>
            ) : (
              <span className="text-ink-muted italic block">Belum ada NTPN</span>
            )}
            <p className="text-ink-muted text-[11px]">
              Waktu Setor: {formatDate(selectedPayment.paid_at || selectedPayment.created_at)}
            </p>
          </div>

          <div className="p-3 bg-canvas rounded-lg border border-line space-y-1">
            <span className="text-ink-muted block text-[11px]">Layanan Pentashihan:</span>
            <strong className="text-ink block font-semibold">
              {selectedPayment.registration?.service_type?.name || 'Mushaf Standar'}
            </strong>
            <p className="text-ink-muted text-[11px]">
              Registrasi: {selectedPayment.registration?.registration_no || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Pratinjau Bukti Setor / Slip Bank */}
      <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-canvas border-b border-line flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-800" />
            <h3 className="font-bold text-ink">
              Pratinjau Bukti Setor / Slip Pembayaran Bank
            </h3>
          </div>
          {selectedPayment.receipt_file_id && (
            <span className="font-mono text-[11px] text-ink-muted">
              ID Berkas: {selectedPayment.receipt_file_id.substring(0, 8)}...
            </span>
          )}
        </div>

        <div className="p-4">
          {selectedPayment.receipt_file_id ? (
            <PrivateFileViewer
              fileId={selectedPayment.receipt_file_id}
              fileName={`bukti_bayar_${selectedPayment.billing_no}.pdf`}
              height="480px"
              fallbackText="Bukti setor tersimpan dalam format berkas terenkripsi."
            />
          ) : (
            <div className="py-16 text-center text-ink-muted space-y-2">
              <FileText className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-xs">
                Penerbit belum mengunggah bukti bayar atau slip transfer bank.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Decision Card */}
      {selectedPayment.status === 'PAID' && (
        <div className="p-5 bg-white rounded-xl border border-brand-100 bg-brand-50/20 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-700" />
              Verifikasi & Pengesahan Setoran PNBP
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed max-w-lg">
              Periksa kecocokan nominal dan keaslian Nomor Transaksi Penerimaan Negara (NTPN). Setelah disahkan, naskah akan berstatus LUNAS dan siap diserahkan ke Distributor Pentashihan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <Button
              variant="outline"
              onClick={openRejectModal}
              disabled={actionLoading}
              className="text-xs text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Tolak Bukti Bayar
            </Button>

            <Button
              variant="primary"
              onClick={() => setVerifyConfirmOpen(true)}
              disabled={actionLoading}
              className="text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Sahkan Pembayaran (Lunas)
            </Button>
          </div>
        </div>
      )}

      {selectedPayment.status === 'VERIFIED' && (() => {
        const assignmentId =
          selectedPayment.registration?.verification_assignments?.[0]?.id ||
          selectedPayment.registration?.verification_assignment?.id ||
          selectedPayment.registration?.id ||
          selectedPayment.registration_id;
        const latestHandover = selectedPayment.registration?.physical_handovers?.[0];
        const isHandedOver = Boolean(latestHandover && latestHandover.status !== 'RETURNED');

        return (
          <div className="p-5 bg-brand-50 border border-brand-100 rounded-xl space-y-4 text-xs text-brand-950 shadow-2xs animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-100 text-brand-900 rounded-xl shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <strong className="block text-sm font-bold text-brand-900">
                    Pembayaran PNBP Telah Diverifikasi Sah (Lunas)
                  </strong>
                  <p className="text-xs text-brand-800 leading-relaxed">
                    Setoran kas negara telah dicocokkan dengan NTPN. Tahap selanjutnya: Verifikator menyerahkan master fisik naskah ke petugas <strong>Distributor Pentashihan</strong> (Langkah 7 SOP).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  to={`/internal/verifications/${assignmentId}`}
                  className="inline-flex items-center gap-1.5 font-bold text-white bg-brand-700 hover:bg-brand-800 px-3.5 py-2 rounded-lg shadow-xs transition-colors"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{isHandedOver ? 'Lihat Lembar Serah-Terima' : 'Lakukan Serah-Terima Fisik (BAST)'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/internal/distributions"
                  className="inline-flex items-center gap-1.5 font-semibold text-ink bg-white border border-line-strong hover:bg-canvas px-3 py-2 rounded-lg shadow-2xs transition-colors"
                >
                  <span>Antrean Distribusi</span>
                </Link>
              </div>
            </div>

            {/* SOP Step Guidance */}
            <div className="pt-3 border-t border-brand-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-brand-800">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-brand-900">Alur SOP Selanjutnya:</span>
                <span>Langkah 7: Verifikator serahkan master cetak & terbitkan BAST</span>
                <span>&rarr;</span>
                <span>Langkah 8: Distributor konfirmasi terima di loket</span>
              </div>
              {latestHandover && (
                <div className="font-mono text-brand-900 bg-brand-100 px-2 py-0.5 rounded">
                  BAST: {latestHandover.receipt_no} ({latestHandover.status})
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  ) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Verifikasi Pembayaran & Setoran PNBP"
        subtitle="Validasi bukti setor bank, NTPN, dan kecocokan nominal tarif PNBP mushaf (SOP Pentashihan LPMQ)"
        breadcrumbs={[
          { label: 'Portal Petugas', href: '/internal' },
          { label: 'Verifikasi Pembayaran PNBP' },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={fetchPayments}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
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

      {/* Master-Detail Split Workspace */}
      <MasterDetailLayout
        masterContent={masterContent}
        detailContent={detailContent}
        hasSelection={Boolean(selectedPayment)}
        onClearSelection={() => setSelectedPaymentId(null)}
        emptyDetailText="Pilih salah satu tagihan pembayaran dari antrean di sebelah kiri untuk memeriksa berkas bukti setor dan mengesahkan transaksi."
        masterWidth="lg:w-5/12 xl:w-4/12"
        detailWidth="lg:w-7/12 xl:w-8/12"
      />

      {/* Confirmation Dialog for Verifying Payment */}
      {selectedPayment && (
        <ConfirmationSummaryDialog
          isOpen={verifyConfirmOpen}
          onClose={() => setVerifyConfirmOpen(false)}
          onConfirm={handleVerify}
          title="Sahkan Pembayaran PNBP (Lunas)"
          description="Pastikan data NTPN dan bukti transfer bank telah cocok dengan catatan persepsi kas negara."
          objectName={`Billing SIMPONI #${selectedPayment.billing_no}`}
          nextActor="Petugas Distributor (Serah-Terima Master Fisik)"
          statusChange="PAID -> VERIFIED"
          irreversibleConsequence="Pengesahan pembayaran PNBP bersifat permanen dan mencatatkan penerimaan kas negara. Naskah akan langsung melangkah ke penyerahan master fisik."
          summaryItems={[
            { label: 'Nomor Billing', value: selectedPayment.billing_no },
            { label: 'Naskah Mushaf', value: selectedPayment.registration?.title || '-' },
            { label: 'Penerbit', value: selectedPayment.registration?.publisher?.legal_name || '-' },
            { label: 'Nomor NTPN', value: selectedPayment.external_ref || 'Belum diisi' },
            { label: 'Nominal Tarif', value: formatCurrency(selectedPayment.amount) },
          ]}
          impactMessage="Status pembayaran akan menjadi LUNAS (VERIFIED) dan naskah resmi siap diserahkan ke Distributor Pentashihan (Langkah 7 SOP)."
          confirmLabel="Sahkan & Tetapkan Lunas"
          confirmVariant="primary"
          loading={actionLoading}
        />
      )}

      {/* Modal Penolakan Bukti Pembayaran */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-civic-danger font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-civic-danger" />
                Tolak Bukti Pembayaran PNBP
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-civic-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-civic-danger shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-ink-muted leading-relaxed">
              Berikan alasan penolakan secara jelas kepada penerbit (misalnya: nominal transfer kurang, NTPN salah, atau bukti buram). Status tagihan akan dikembalikan ke <b>Menunggu Pembayaran (UNPAID)</b>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Alasan Penolakan <span className="text-civic-danger">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Bukti transfer buram dan NTPN tidak dapat diverifikasi pada sistem persepsi bank..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-danger/20 focus:border-civic-danger"
                  required
                />
                <span className="text-[11px] text-ink-muted">Minimal 5 karakter.</span>
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
                  className="text-xs bg-civic-danger hover:bg-civic-danger text-white font-bold px-4 py-2"
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
