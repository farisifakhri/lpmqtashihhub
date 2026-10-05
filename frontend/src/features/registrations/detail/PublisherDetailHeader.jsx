import React, { useState } from 'react';
import {
  Printer,
  RefreshCw,
  Trash2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PublisherProgress } from '../PublisherProgress';
import { WorkflowPhaseStatus } from '@/components/common/WorkflowPhaseStatus';
import { dateLabel } from '../publisher-status';

export function PublisherDetailHeader({
  data,
  busy,
  actionLoading,
  setRefresh,
  setShowReceipt,
  setShowDeleteModal,
  setShowCancelModal,
}) {
  const [showPhaseDetails, setShowPhaseDetails] = useState(false);

  return (
    <header className="rounded-xl border border-line bg-white p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-ink bg-surface-subtle px-2.5 py-0.5 rounded border border-line">
              {data.registration_no}
            </span>
            <span className="text-xs text-ink-muted">
              Dibuat {dateLabel(data.created_at)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink break-words mt-1">
            {data.title}
          </h1>
          <p className="text-xs text-ink-muted">
            Layanan: <strong className="text-ink">{data.service_type?.name}</strong>
          </p>
          <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            {data.foreign_metadata?.nama_mushaf && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink font-semibold border border-line text-[11px]">
                Mushaf: <span className="ml-1 text-brand-800 font-bold">{data.foreign_metadata.nama_mushaf}</span>
              </span>
            )}
            {data.foreign_metadata?.jenis_mushaf && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-800 font-bold border border-brand-200 text-[11px]">
                {data.foreign_metadata.jenis_mushaf}
              </span>
            )}
            {data.foreign_metadata?.nama_percetakan && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink-muted border border-line text-[11px]">
                Percetakan: <span className="ml-1 text-ink font-medium">{data.foreign_metadata.nama_percetakan}</span>
              </span>
            )}
            {data.foreign_metadata?.penanggung_jawab_produk && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink-muted border border-line text-[11px]">
                PJ: <span className="ml-1 text-ink font-semibold">{data.foreign_metadata.penanggung_jawab_produk}</span>
                {data.foreign_metadata?.penanggung_jawab_wa && (
                  <span className="ml-1.5 font-mono text-[10px] text-brand-800">({data.foreign_metadata.penanggung_jawab_wa})</span>
                )}
              </span>
            )}
          </div>
          {(data.foreign_metadata?.negara_asal_mushaf || data.foreign_metadata?.country_of_origin) && (
            <div className="pt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-civic-infoSoft text-civic-info font-semibold border border-civic-infoLine text-[11px]">
                Mushaf Luar Negeri: {data.foreign_metadata.negara_asal_mushaf || data.foreign_metadata.country_of_origin}
              </span>
              {(data.foreign_metadata.penerbit_asal_mushaf || data.foreign_metadata.foreign_publisher_name) && (
                <span className="text-ink-muted text-[11px]">
                  Penerbit Asal: <strong className="text-ink">{data.foreign_metadata.penerbit_asal_mushaf || data.foreign_metadata.foreign_publisher_name}</strong>
                </span>
              )}
              {(data.foreign_metadata.lembaga_pentashih_asal_mushaf || data.foreign_metadata.foreign_tashih_institution) && (
                <span className="text-ink-muted text-[11px]">
                  Lembaga Pentashih: <strong className="text-ink">{data.foreign_metadata.lembaga_pentashih_asal_mushaf || data.foreign_metadata.foreign_tashih_institution}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <StatusBadge registration={data} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReceipt(true)}
            className="text-xs font-bold text-ink hover:text-brand-800"
          >
            <Printer className="h-3.5 w-3.5 mr-1 text-brand-700" />
            Cetak Bukti Pendaftaran
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setRefresh((value) => value + 1)}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busy ? 'animate-spin' : ''}`} />
            Muat ulang
          </Button>
          {data.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || actionLoading}
              onClick={() => setShowDeleteModal(true)}
              className="text-xs font-semibold text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1 text-civic-danger" />
              Hapus Draf
            </Button>
          )}
          {data.status === 'READY_FOR_VERIFICATION' && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || actionLoading}
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-semibold text-civic-warning border-civic-warningLine hover:bg-civic-warningSoft"
            >
              <XCircle className="h-3.5 w-3.5 mr-1 text-civic-warning" />
              Batalkan Permohonan
            </Button>
          )}
        </div>
      </div>

      {/* Visual Progress Stepper & 3 Tab Status (REV-13: Jangan disembunyikan) */}
      <div className="pt-3 border-t border-line space-y-3">
        <PublisherProgress registration={data} />

        {/* 3 Tab Status Alur Utama: Permohonan, Verifikasi, Pembayaran */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Tab 1: Permohonan */}
          <div className="p-3.5 rounded-xl border border-brand-200 bg-brand-50/60 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
              ✓
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">1. Permohonan</p>
              <p className="text-[11px] text-brand-900 font-medium">Permohonan resmi terdaftar di LPMQ</p>
            </div>
          </div>

          {/* Tab 2: Verifikasi */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
            ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status)
              ? 'border-brand-200 bg-brand-50/60'
              : data.status === 'READY_FOR_VERIFICATION' || ['VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED'].includes(data.status)
              ? 'border-civic-warningLine bg-civic-warningSoft/70'
              : 'border-line bg-canvas'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs ${
              ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status)
                ? 'bg-brand-700 text-white'
                : data.status === 'READY_FOR_VERIFICATION' || ['VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED'].includes(data.status)
                ? 'bg-civic-warning text-white'
                : 'bg-surface-strong text-ink-muted'
            }`}>
              {['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status) ? '✓' : '2'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">2. Verifikasi</p>
              <p className="text-[11px] font-medium text-ink-muted">
                {data.physical_master_intake?.status === 'RECEIVED'
                  ? 'Master fisik diterima loket · Diverifikasi'
                  : data.status === 'READY_FOR_VERIFICATION'
                  ? 'Menunggu master fisik diterima LPMQ'
                  : ['VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL'].includes(data.status)
                  ? 'Sedang diperiksa oleh verifikator'
                  : ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status)
                  ? 'Verifikasi administrasi & fisik selesai'
                  : 'Menunggu master fisik diterima LPMQ'}
              </p>
            </div>
          </div>

          {/* Tab 3: Pembayaran */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
            ['PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status)
              ? 'border-brand-200 bg-brand-50/60'
              : ['AWAITING_PAYMENT'].includes(data.status)
              ? 'border-civic-warningLine bg-civic-warningSoft/70'
              : 'border-line bg-canvas'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs ${
              ['PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status)
                ? 'bg-brand-700 text-white'
                : ['AWAITING_PAYMENT'].includes(data.status)
                ? 'bg-civic-warning text-white'
                : 'bg-surface-strong text-ink-muted'
            }`}>
              {['PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status) ? '✓' : '3'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">3. Pembayaran</p>
              <p className="text-[11px] font-medium text-ink-muted">
                {['PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(data.status)
                  ? 'Sudah dibayar / Lunas'
                  : ['AWAITING_PAYMENT'].includes(data.status)
                  ? 'Belum dibayar · Menunggu Pembayaran PNBP'
                  : 'Belum dibayar / Menunggu verifikasi'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setShowPhaseDetails(!showPhaseDetails)}
            className="text-[11px] font-semibold text-brand-800 hover:text-brand-900 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showPhaseDetails ? (
              <>
                Sembunyikan Rincian Seluruh Tahap Alur <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Lihat Rincian Seluruh Tahap Alur (7 Tahap) <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        {showPhaseDetails && (
          <div className="pt-2 animate-fadeIn">
            <WorkflowPhaseStatus registration={data} />
          </div>
        )}
      </div>
    </header>
  );
}
