import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { QueueOverview, QueueItemMeta } from '@/components/common/QueueOverview';
import { PackageCheck, Search, RefreshCw, Clock, AlertCircle, CheckCircle2, AlertTriangle, FileText, Copy, Check, Building2, Calendar, Eye, Layers, ShieldCheck, ArrowRight, Inbox, RotateCcw, CheckSquare, Users, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';

export const HandoverPanel = ({
  pendingCount, handovers, error, pagination, activeTab, setActiveTab, loading,
  setPagination, searchQuery, setSearchQuery, submittedSearch, setSubmittedSearch,
  handleSearchSubmit, handleCopyText, copiedReceipt, formatDate, formatDateOnly,
  renderHandoverBadge, openDetailModal, canConfirm, openReturnModal, openReceiveModal,
  isSuperAdmin, currentUser, actionLoading,
}) => (
        <>
          {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-warning">Perlu Konfirmasi Loket</span>
            <span className="p-2 rounded-xl bg-civic-warningSoft text-civic-warning">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-ink">{pendingCount}</p>
          <p className="text-[11px] text-ink-muted">Jumlah pada halaman ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-700">Telah Diterima & Disahkan</span>
            <span className="p-2 rounded-xl bg-brand-50 text-brand-700">
              <CheckSquare className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-ink">
            {handovers.filter((h) => h.status === 'RECEIVED').length}
          </p>
          <p className="text-[11px] text-ink-muted">Jumlah pada halaman ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-civic-danger">Dikembalikan / Cacat</span>
            <span className="p-2 rounded-xl bg-civic-dangerSoft text-civic-danger">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-ink">
            {handovers.filter((h) => h.status === 'RETURNED').length}
          </p>
          <p className="text-[11px] text-ink-muted">Jumlah pada halaman ini</p>
        </div>
      </div>

      {!error && <QueueOverview total={pagination.total} oldest={handovers[0]?.queue_entered_at || handovers[0]?.created_at} fifo={!['RECEIVED', 'RETURNED'].includes(activeTab)} loading={loading} />}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-line shadow-2xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-subtle/80 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => {
                setActiveTab('PENDING');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'PENDING'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Menunggu Konfirmasi
            </button>
            <button
              onClick={() => {
                setActiveTab('RECEIVED');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'RECEIVED'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Telah Diterima
            </button>
            <button
              onClick={() => {
                setActiveTab('RETURNED');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'RETURNED'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Dikembalikan
            </button>
            <button
              onClick={() => {
                setActiveTab('ALL');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Cari serah-terima naskah"
              value={searchQuery}
              maxLength={191}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari BAST, no reg, judul..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedSearch('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-muted p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Main List Table / Cards */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-line space-y-3">
          <div className="w-9 h-9 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-ink-muted">Memuat berkas serah-terima fisik...</p>
        </div>
      ) : error ? null : handovers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-line space-y-3">
          <Inbox className="w-12 h-12 text-line-strong mx-auto" />
          <h3 className="text-sm font-bold text-ink">Tidak Ada Serah-Terima Fisik</h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'Tidak ada master fisik yang sedang menunggu konfirmasi penerimaan loket saat ini.'
              : `Belum ada data serah-terima dengan status ${activeTab}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {!loading && !error && handovers.map((item) => {
            const reg = item.registration || {};
            const pub = reg.publisher || {};
            const fromUser = item.from_user || {};
            const toUser = item.to_user || {};
            const isPending = item.status === 'PENDING';
            const isReceived = item.status === 'RECEIVED';
            const isReturned = item.status === 'RETURNED';
            const isTargetOfficer = isSuperAdmin || (item.to_user_id || toUser.id) === currentUser?.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-line shadow-2xs hover:shadow-xs transition-shadow p-5 space-y-4"
              >
                {/* Header Row: BAST No + Status */}
                <QueueItemMeta item={item} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-canvas border border-line px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-mono text-ink-muted">BAST:</span>
                      <span className="font-mono text-xs font-bold text-ink">{item.receipt_no}</span>
                      <button
                        onClick={() => handleCopyText(item.receipt_no, item.id)}
                        className="text-ink-muted hover:text-brand-700 transition-colors ml-1"
                        title="Salin No. BAST"
                      >
                        {copiedReceipt === item.id ? (
                          <Check className="w-3.5 h-3.5 text-brand-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="font-mono text-[11px] font-semibold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
                      {reg.registration_no || '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-muted">
                      Diserahkan: {formatDate(item.handed_over_at)}
                    </span>
                    {renderHandoverBadge(item.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Col 1: Title & Publisher */}
                  <div className="space-y-1">
                    <p className="text-ink-muted font-medium">Naskah Mushaf</p>
                    <p className="font-bold text-ink text-sm">{reg.title || 'Naskah Mushaf'}</p>
                    <p className="text-ink-muted flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-ink-muted" />
                      {pub.legal_name || 'Penerbit Pemohon'}
                    </p>
                  </div>

                  {/* Col 2: Physical Details */}
                  <div className="space-y-1">
                    <p className="text-ink-muted font-medium">Kondisi & Kelengkapan Fisik</p>
                    <p className="font-bold text-ink text-xs">
                      {item.volume_count} Jilid &bull; Ukuran A4 (Per Juz)
                    </p>
                    <p className="text-ink-muted">
                      Kondisi: <span className="font-semibold text-ink">{item.condition || 'BAIK'}</span>
                    </p>
                  </div>

                  {/* Col 3: Actors (From Verifier to Distributor) */}
                  <div className="space-y-1">
                    <p className="text-ink-muted font-medium">Petugas Serah-Terima</p>
                    <p className="text-ink">
                      Dari:{' '}
                      <span className="font-bold text-ink">
                        {fromUser.name || 'Verifikator'}
                      </span>
                    </p>
                    <p className="text-ink">
                      Kepada:{' '}
                      <span className="font-bold text-ink">
                        {toUser.name || 'Distributor'}
                      </span>
                    </p>
                  </div>

                  {/* Col 4: Due Date & Status Notes */}
                  <div className="space-y-1">
                    <p className="text-ink-muted font-medium">Tenggat & Jadwal Sidang</p>
                    {item.tashih_due_at ? (
                      <div>
                        <p className="font-bold text-brand-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-700" />
                          {formatDateOnly(item.tashih_due_at)}
                        </p>
                        <p className="text-[11px] text-ink-muted">Target Sidang Tashih</p>
                      </div>
                    ) : isPending ? (
                      <p className="text-civic-warning font-medium italic">
                        Menunggu penetapan tenggat oleh Distributor
                      </p>
                    ) : (
                      <p className="text-ink-muted italic">-</p>
                    )}
                  </div>
                </div>

                {/* Notes if available */}
                {item.notes && (
                  <div className="p-3 bg-canvas rounded-xl border border-line/70 text-xs text-ink leading-relaxed">
                    <span className="font-bold text-ink mr-1.5">Catatan BAST:</span>
                    <span className="whitespace-pre-line">{item.notes}</span>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-line">
                  <div className="text-[11px] text-ink-muted">
                    Tahap: <span className="font-semibold text-ink">{item.stage}</span>
                    {item.received_at && (
                      <span className="ml-2">
                        &bull; Diterima: <span className="font-medium">{formatDate(item.received_at)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailModal(item)}
                      className="text-xs text-ink"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detail BAST
                    </Button>

                    {isPending && canConfirm && (
                      isTargetOfficer ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReturnModal(item)}
                            disabled={actionLoading}
                            className="text-xs text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft font-semibold"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Tolak / Kembalikan Fisik
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openReceiveModal(item)}
                            disabled={actionLoading}
                            className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-4 py-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Konfirmasi Diterima (Langkah 8)
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-ink-muted italic bg-surface-subtle px-3 py-1.5 rounded-lg border border-line">
                          Menunggu Petugas: {toUser.name || 'Distributor Tujuan'}
                        </span>
                      )
                    )}

                    {isReceived && (
                      <span className="text-xs font-semibold text-brand-800 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                        Siap Distribusi Tim Sidang
                      </span>
                    )}

                    {isReturned && (
                      <span className="text-xs font-semibold text-civic-danger bg-civic-dangerSoft px-3 py-1.5 rounded-lg border border-civic-dangerLine inline-flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-civic-danger" />
                        Naskah Dikembalikan (Revisi)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-4 text-xs text-ink-muted">
          <span>
            Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} data)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="text-xs"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="text-xs"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
        </>
);
