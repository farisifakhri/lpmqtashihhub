import React from 'react';
import {
  FileText,
  Eye,
  Download,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowDown,
} from 'lucide-react';
import { fileApi } from '@/api/file.api';
import { Button } from '@/components/ui/Button';
import { DocumentArchive } from '@/components/common/DocumentArchive';
import { PrintingReportSection } from './PrintingReportSection';

export function PublisherOfficialDocsTab({
  data,
  setPreviewFile,
  setShowReceipt,
}) {
  const issuedStt = data.official_documents?.find(
    (d) => d.document_type === 'SURAT_TANDA_TASHIH' && d.status === 'ISSUED'
  );
  const isSttIssued = Boolean(issuedStt) || ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(data.status);

  const scrollToPrintingReport = () => {
    const el = document.getElementById('printing-report-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Ucapan Selamat & Download STT Resmi (Paket B-18) */}
      {isSttIssued && (
        <div className="rounded-2xl border border-civic-successLine bg-civic-successSoft/30 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-brand-fill text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-civic-successSoft text-civic-success border border-civic-successLine">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Surat Tanda Tashih Resmi Diterbitkan
                </div>
                <h2 className="text-lg font-black text-ink">
                  Selamat! Naskah Anda Telah Resmi Memperoleh Tanda Tashih
                </h2>
                <p className="text-xs text-ink-muted max-w-2xl leading-relaxed">
                  Mushaf Al-Qur'an ini telah dinyatakan sah dan memenuhi standar tashih LPMQ Kementerian Agama Republik Indonesia. Dokumen tanda tashih resmi telah dilengkapi kode QR verifikasi publik dan berkekuatan hukum penuh.
                </p>
              </div>
            </div>

            {issuedStt && (
              <Button
                variant="primary"
                size="md"
                onClick={() => fileApi.downloadDocument(issuedStt.id, `${issuedStt.document_no || 'STT-LPMQ'}.pdf`)}
                className="font-bold shrink-0 shadow-xs flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-brand-100" />
                <span>Unduh STT Resmi (PDF)</span>
              </Button>
            )}
          </div>

          {issuedStt && (
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-civic-successLine text-xs text-ink-muted">
              <div>
                Nomor Dokumen: <strong className="font-mono text-ink">{issuedStt.document_no}</strong>
              </div>
              <span>•</span>
              <div>
                Tanggal Terbit: <strong className="text-ink">{issuedStt.issued_at ? new Date(issuedStt.issued_at).toLocaleDateString('id-ID') : '-'}</strong>
              </div>
              <span>•</span>
              <div>
                Masa Berlaku: <strong className="text-ink">{issuedStt.valid_until ? new Date(issuedStt.valid_until).toLocaleDateString('id-ID') : '3 Tahun'}</strong>
              </div>
            </div>
          )}

          {/* Kartu Peringatan Kewajiban 5 Eksemplar Fisik (Batas Waktu: 30 Hari Kalender) */}
          <div className="p-4 bg-white/80 border border-civic-warningLine rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink font-bold block">
                  Kewajiban Pengiriman 5 Eksemplar Fisik (Batas Waktu: 30 Hari Kalender)
                </strong>
                <span className="text-ink-muted text-[11px] block mt-0.5">
                  Penerbit wajib mengirimkan 5 eksemplar cetak fisik hasil penerbitan dan mengisi pelaporan realisasi oplah ke LPMQ dalam waktu 30 hari kalender sejak STT terbit.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToPrintingReport}
              className="text-xs font-semibold text-civic-warning border-civic-warningLine hover:bg-civic-warningSoft shrink-0"
            >
              <ArrowDown className="w-3.5 h-3.5 mr-1" />
              Isi Laporan Cetak
            </Button>
          </div>
        </div>
      )}

      {/* Bagian 1: Dokumen Permohonan Penerbit */}
      <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
        <div className="border-b border-line pb-3">
          <h2 className="font-bold text-ink text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-800" />
            Dokumen Permohonan & Kelengkapan Penerbit
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Berkas resmi yang diunggah penerbit saat permohonan tanda tashih.
          </p>
        </div>

        <div className="grid gap-3">
          {/* Surat Permohonan Tanda Tashih */}
          {data.foreign_metadata?.surat_permohonan_file_id ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-brand-50 border border-brand-100 text-brand-800 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Surat Permohonan Tanda Tashih</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Surat permohonan resmi berkop penerbit yang diajukan ke Kepala LPMQ.
                  </p>
                  <span className="inline-block mt-1 font-mono text-xs text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                    Dokumen Resmi Penerbit
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewFile({ id: data.foreign_metadata.surat_permohonan_file_id, name: `Surat-Permohonan-${data.registration_no}.pdf` })}
                  className="text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Lihat Berkas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileApi.downloadPrivateFile(data.foreign_metadata.surat_permohonan_file_id, `Surat-Permohonan-${data.registration_no}.pdf`)}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Unduh
                </Button>
              </div>
            </div>
          ) : null}

          {/* Surat Pernyataan Perubahan */}
          {data.foreign_metadata?.surat_pernyataan_perubahan_file_id && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-surface-subtle border border-line text-ink shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Surat Pernyataan Perubahan</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Surat pernyataan resmi perubahan data naskah atau identitas penerbit.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewFile({ id: data.foreign_metadata.surat_pernyataan_perubahan_file_id, name: `Surat-Pernyataan-${data.registration_no}.pdf` })}
                  className="text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Lihat Berkas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileApi.downloadPrivateFile(data.foreign_metadata.surat_pernyataan_perubahan_file_id, `Surat-Pernyataan-${data.registration_no}.pdf`)}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Unduh
                </Button>
              </div>
            </div>
          )}

          {/* Bukti Tashih Asal (Luar Negeri) */}
          {data.foreign_metadata?.bukti_tashih_file_id && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-civic-infoSoft border border-civic-infoLine text-civic-info shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Bukti Tashih Lembaga Asal</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Sertifikat / bukti tashih dari lembaga pentashih luar negeri asal mushaf.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewFile({ id: data.foreign_metadata.bukti_tashih_file_id, name: `Bukti-Tashih-Asal-${data.registration_no}.pdf` })}
                  className="text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Lihat Berkas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileApi.downloadPrivateFile(data.foreign_metadata.bukti_tashih_file_id, `Bukti-Tashih-Asal-${data.registration_no}.pdf`)}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-brand-700" />
                  Unduh
                </Button>
              </div>
            </div>
          )}

          {!data.foreign_metadata?.surat_permohonan_file_id && !data.foreign_metadata?.surat_pernyataan_perubahan_file_id && !data.foreign_metadata?.bukti_tashih_file_id && (
            <p className="text-xs text-ink-muted italic p-3 bg-canvas rounded-lg">
              Tidak ada dokumen lampiran khusus pada permohonan ini.
            </p>
          )}
        </div>
      </section>

      {/* Bagian 2: Bukti Pendaftaran Card */}
      <section className="rounded-xl border border-line bg-white p-5 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <Printer className="w-4 h-4 text-brand-800" />
              Bukti Pendaftaran Resmi (Tanda Terima)
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Tanda terima pendaftaran permohonan tashih dengan kode QR verifikasi resmi LPMQ.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReceipt(true)}
            className="text-xs font-bold text-brand-800 border-brand-300 hover:bg-brand-50"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-brand-700" />
            Buka Tanda Terima & Unduh PDF
          </Button>
        </div>
        <div className="p-3 bg-canvas rounded-lg border border-line text-xs space-y-1">
          <p className="text-ink">Nomor Registrasi: <strong className="font-mono text-brand-800">{data.registration_no}</strong></p>
          <p className="text-ink-muted text-xs">Dapat dicetak sebagai bukti penyerahan saat datang langsung ke LPMQ TMII.</p>
        </div>
      </section>

      {/* Bagian 3: Surat Tanda Tashih & Arsip Penetapan LPMQ (Cukup satu tampilan arsip dokumen resmi) */}
      <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
        <DocumentArchive registrationId={data.id} />
      </section>
      {/* Bagian 4: Laporan Realisasi Pencetakan & Penyerahan 5 Eksemplar (U-16 / B-10) */}
      {(data.official_documents?.some(d => d.document_type === 'SURAT_TANDA_TASHIH' && d.status === 'ISSUED') || ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(data.status)) && (
        <div id="printing-report-section">
          <PrintingReportSection registrationId={data.id} isPublisher={true} />
        </div>
      )}
    </div>
  );
}
