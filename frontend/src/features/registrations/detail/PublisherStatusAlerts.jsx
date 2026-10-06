import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Send,
  CheckCircle2,
  Printer,
  AlertTriangle,
  Clock,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PublisherStatusAlerts({
  data,
  action,
  editable,
  revision,
  revisionNote,
  requiredFiles,
  actionLoading,
  showPhysicalReceipt,
  handleTabChange,
}) {
  return (
    <>
      {/* 1. Hero Next Action Card (Langkah Anda Saat Ini - DRAFT) */}
      {data.status === 'DRAFT' && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-800 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-ink text-sm">
                  Langkah Anda Saat Ini: Lengkapi Berkas Naskah & Ajukan
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Naskah berstatus Draf. Unggah berkas digital wajib di bawah ini sebelum mengirim permohonan ke LPMQ.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white border border-brand-200 text-brand-800 shadow-2xs">
              Menunggu Berkas Penerbit
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                data.manuscript_files?.some((f) => f.type === 'COVER')
                  ? 'bg-brand-50 text-brand-800 border-brand-100'
                  : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
              }`}>
                {data.manuscript_files?.some((f) => f.type === 'COVER') ? '✓ Sampul Terunggah' : '⚠️ Sampul Belum Diunggah'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                data.manuscript_files?.some((f) => f.type === 'SAMPLE_PAGE_1_5')
                  ? 'bg-brand-50 text-brand-800 border-brand-100'
                  : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
              }`}>
                {data.manuscript_files?.some((f) => f.type === 'SAMPLE_PAGE_1_5') ? '✓ Sampel Hal 1–5 Terunggah' : '⚠️ Sampel Hal 1–5 Belum Diunggah'}
              </span>
            </div>

            <p className="text-[11px] text-ink-muted">
              {requiredFiles
                ? 'Berkas wajib lengkap. Silakan kirimkan permohonan pada formulir di bawah.'
                : 'Lengkapi berkas wajib di tab di bawah untuk mengirimkan permohonan.'}
            </p>
          </div>
        </section>
      )}

      {/* 2. Tahapan Wajib Pengiriman Berkas Fisik (READY_FOR_VERIFICATION) */}
      {data.status === 'READY_FOR_VERIFICATION' && (
        <section className="rounded-xl border border-civic-warningLine bg-civic-warningSoft/60 p-5 space-y-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-civic-warningLine pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-civic-warning text-white flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-ink text-sm">
                  Tahapan Pengiriman Berkas Fisik ke LPMQ
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Proses verifikasi resmi oleh verifikator LPMQ dimulai setelah naskah master fisik diterima di loket LPMQ.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                data.physical_master_intake?.status === 'RECEIVED' || data.physical_dispatch_status === 'DISPATCHED'
                  ? 'bg-brand-100 text-brand-800 border-brand-100'
                  : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
              }`}>
                {data.physical_master_intake?.status === 'RECEIVED'
                  ? 'Master Fisik Diterima Loket · Menunggu Penugasan'
                  : data.physical_dispatch_status === 'DISPATCHED'
                    ? 'Berkas Dikirim · Menunggu Penerimaan Loket'
                    : 'Menunggu Pengiriman Berkas Fisik'}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTabChange('berkas-fisik')}
                className="text-xs font-bold"
              >
                Buka Penyerahan Berkas Fisik
              </Button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-civic-warningLine text-xs text-ink space-y-2">
            <p className="font-bold text-brand-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand-700" />
              {data.physical_master_intake?.status === 'RECEIVED'
                ? 'Master Fisik Diterima Loket LPMQ'
                : data.physical_dispatch_status === 'DISPATCHED'
                  ? 'Konfirmasi Pengiriman Berkas Tercatat di Sistem'
                  : 'Petunjuk Pengiriman Master Fisik'}
            </p>
            <p className="text-ink-muted leading-relaxed">
              {data.physical_master_intake?.status === 'RECEIVED'
                ? 'Master fisik telah diterima loket LPMQ. Langkah berikutnya: petugas menugaskan verifikator untuk memulai pemeriksaan naskah.'
                : 'Langkah berikutnya: petugas loket menerima dan memeriksa master fisik yang dikirimkan. Silakan buka tab Penyerahan Berkas Fisik untuk memeriksa status atau mengisi nomor resi pengiriman.'}
            </p>
            {data.physical_master_intake?.status === 'RECEIVED' && (
              <Button type="button" variant="outline" size="sm" onClick={showPhysicalReceipt} disabled={actionLoading} className="text-xs">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Lihat / Cetak PDF Tanda Terima Fisik
              </Button>
            )}
          </div>
        </section>
      )}

      {/* 3. Revision Callout Box */}
      {revision && (
        <section className="rounded-xl border border-civic-warningLine bg-civic-warningSoft p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-civic-warningLine/70 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-civic-warning shrink-0" />
              <h2 className="font-bold text-civic-warning text-sm">Catatan perbaikan</h2>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-white text-civic-warning border border-civic-warningLine">
              Perlu Revisi Penerbit
            </span>
          </div>
          <p className="text-xs text-civic-warning whitespace-pre-wrap break-words leading-relaxed pl-7">
            {revisionNote ||
              'Petugas meminta perbaikan. Hubungi pengelola layanan bila rincian belum tersedia.'}
          </p>
          <p className="text-[11px] text-civic-warning font-medium pl-7">
            Unggah versi terbaru tanpa menghapus riwayat berkas, kemudian ajukan ulang pada bagian Kirim Permohonan di bawah.
          </p>
        </section>
      )}

      {/* 4. In Verification Callout */}
      {['IN_VERIFICATION', 'VERIFICATION_ASSIGNED', 'WAITING_VERIFICATION_APPROVAL'].includes(data.status) && (
        <section className="rounded-xl border border-civic-infoLine bg-civic-infoSoft/60 p-5 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-civic-info shrink-0" />
            <div>
              <h2 className="font-bold text-ink text-sm">Sedang Dalam Pemeriksaan Verifikator LPMQ</h2>
              <p className="text-[11px] text-ink-muted">
                Tim verifikator LPMQ sedang menelaah kelengkapan administrasi dan fisik naskah Anda. Anda akan diberitahu jika diperlukan perbaikan berkas atau saat penetapan biaya PNBP diterbitkan.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Awaiting Payment Callout */}
      {['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'].includes(data.status) && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-brand-800 shrink-0" />
              <div>
                <h2 className="font-bold text-ink text-sm">Verifikasi Disetujui: Menunggu Pembayaran PNBP</h2>
                <p className="text-[11px] text-ink-muted">
                  Surat Ketetapan Tarif PNBP telah diterbitkan. Silakan selesaikan pembayaran agar naskah dapat dijadwalkan untuk sidang pentashihan.
                </p>
              </div>
            </div>
            <Link
              to="/publisher/billing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Buka Tagihan PNBP
            </Link>
          </div>
        </section>
      )}

      {/* 6. Tashih in progress Callout */}
      {['TASHIH_IN_PROGRESS', 'WAITING_DISTRIBUTION', 'WAITING_DISTRIBUTOR_RECEIPT'].includes(data.status) && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-brand-800 shrink-0" />
            <div>
              <h2 className="font-bold text-ink text-sm">Naskah Sedang Dalam Proses Pentashihan</h2>
              <p className="text-[11px] text-ink-muted">
                Tim Pentashih LPMQ sedang melakukan penelaahan detail setiap juz, teks ayat, harakat, dan tanda baca naskah Al-Qur'an. Anda dapat memantau riwayat telaah pada tab Riwayat Proses.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 7. STT Issued Callout */}
      {['STT_ISSUED', 'READY_FOR_STT', 'COMPLETED'].includes(data.status) && (
        <section className="rounded-xl border border-brand-100 bg-brand-50/70 p-5 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-100/80 pb-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-brand-700 shrink-0" />
              <div>
                <h2 className="font-bold text-ink text-sm">Alhamdulillah, Surat Tanda Tashih (STT) Telah Terbit</h2>
                <p className="text-[11px] text-ink-muted">
                  Naskah Anda dinyatakan sahih dan Surat Tanda Tashih resmi telah disahkan oleh Kepala LPMQ Kemenag RI.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('dokumen')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              Unduh Dokumen STT
            </button>
          </div>
        </section>
      )}

      {action && !editable && (
        <Link
          to={action.path}
          className="inline-flex rounded-xl bg-brand-800 hover:bg-brand-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-colors"
        >
          {action.label}
        </Link>
      )}
    </>
  );
}
