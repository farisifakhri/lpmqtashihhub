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
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Perlu Konfirmasi Loket</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
          <p className="text-[11px] text-slate-500">Jumlah pada halaman ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Telah Diterima & Disahkan</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckSquare className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {handovers.filter((h) => h.status === 'RECEIVED').length}
          </p>
          <p className="text-[11px] text-slate-500">Jumlah pada halaman ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Dikembalikan / Cacat</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {handovers.filter((h) => h.status === 'RETURNED').length}
          </p>
          <p className="text-[11px] text-slate-500">Jumlah pada halaman ini</p>
        </div>
      </div>

      {!error && <QueueOverview total={pagination.total} oldest={handovers[0]?.queue_entered_at || handovers[0]?.created_at} fifo={!['RECEIVED', 'RETURNED'].includes(activeTab)} loading={loading} />}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => {
                setActiveTab('PENDING');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'PENDING'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Cari serah-terima naskah"
              value={searchQuery}
              maxLength={191}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari BAST, no reg, judul..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedSearch('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Main List Table / Cards */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">Memuat berkas serah-terima fisik...</p>
        </div>
      ) : error ? null : handovers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak Ada Serah-Terima Fisik</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-5 space-y-4"
              >
                {/* Header Row: BAST No + Status */}
                <QueueItemMeta item={item} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-mono text-slate-500">BAST:</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{item.receipt_no}</span>
                      <button
                        onClick={() => handleCopyText(item.receipt_no, item.id)}
                        className="text-slate-400 hover:text-emerald-700 transition-colors ml-1"
                        title="Salin No. BAST"
                      >
                        {copiedReceipt === item.id ? (
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
                      Diserahkan: {formatDate(item.handed_over_at)}
                    </span>
                    {renderHandoverBadge(item.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Col 1: Title & Publisher */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Naskah Mushaf</p>
                    <p className="font-bold text-slate-900 text-sm">{reg.title || 'Naskah Mushaf'}</p>
                    <p className="text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {pub.legal_name || 'Penerbit Pemohon'}
                    </p>
                  </div>

                  {/* Col 2: Physical Details */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Kondisi & Kelengkapan Fisik</p>
                    <p className="font-bold text-slate-900 text-xs">
                      {item.volume_count} Jilid &bull; Ukuran A4 (Per Juz)
                    </p>
                    <p className="text-slate-600">
                      Kondisi: <span className="font-semibold text-slate-800">{item.condition || 'BAIK'}</span>
                    </p>
                  </div>

                  {/* Col 3: Actors (From Verifier to Distributor) */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Petugas Serah-Terima</p>
                    <p className="text-slate-700">
                      Dari:{' '}
                      <span className="font-bold text-slate-900">
                        {fromUser.name || 'Verifikator'}
                      </span>
                    </p>
                    <p className="text-slate-700">
                      Kepada:{' '}
                      <span className="font-bold text-slate-900">
                        {toUser.name || 'Distributor'}
                      </span>
                    </p>
                  </div>

                  {/* Col 4: Due Date & Status Notes */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Tenggat & Jadwal Sidang</p>
                    {item.tashih_due_at ? (
                      <div>
                        <p className="font-bold text-emerald-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {formatDateOnly(item.tashih_due_at)}
                        </p>
                        <p className="text-[11px] text-slate-500">Target Sidang Tashih</p>
                      </div>
                    ) : isPending ? (
                      <p className="text-amber-700 font-medium italic">
                        Menunggu penetapan tenggat oleh Distributor
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">-</p>
                    )}
                  </div>
                </div>

                {/* Notes if available */}
                {item.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 mr-1.5">Catatan BAST:</span>
                    <span className="whitespace-pre-line">{item.notes}</span>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Tahap: <span className="font-semibold text-slate-700">{item.stage}</span>
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
                      className="text-xs text-slate-700"
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
                            className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold"
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
                        <span className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          Menunggu Petugas: {toUser.name || 'Distributor Tujuan'}
                        </span>
                      )
                    )}

                    {isReceived && (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Siap Distribusi Tim Sidang
                      </span>
                    )}

                    {isReturned && (
                      <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 inline-flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
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
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
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
