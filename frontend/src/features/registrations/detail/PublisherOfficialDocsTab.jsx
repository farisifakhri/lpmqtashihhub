import React from 'react';
import {
  FileText,
  Eye,
  Download,
  Printer,
} from 'lucide-react';
import { fileApi } from '@/api/file.api';
import { Button } from '@/components/ui/Button';
import { PublisherDocumentList } from '../PublisherDocumentList';
import { DocumentArchive } from '@/components/common/DocumentArchive';

export function PublisherOfficialDocsTab({
  data,
  setPreviewFile,
  setShowReceipt,
}) {
  return (
    <div className="space-y-6">
      {/* Bagian 1: Dokumen Permohonan Penerbit */}
      <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
        <div className="border-b border-line pb-3">
          <h2 className="font-bold text-ink text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-800" />
            Dokumen Permohonan & Kelengkapan Penerbit
          </h2>
          <p className="text-[11px] text-ink-muted mt-0.5">
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
                  <span className="inline-block mt-1 font-mono text-[10px] text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
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
            <p className="text-[11px] text-ink-muted mt-0.5">
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
          <p className="text-ink-muted text-[11px]">Dapat dicetak sebagai bukti penyerahan saat datang langsung ke Loket LPMQ TMII.</p>
        </div>
      </section>

      {/* Bagian 3: Surat Tanda Tashih & Dokumen Resmi LPMQ */}
      <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
        <h2 className="font-bold text-ink text-sm">Surat Tanda Tashih & Arsip Penetapan LPMQ</h2>
        <PublisherDocumentList documents={data.official_documents} registration={data} />
        <DocumentArchive registrationId={data.id} />
      </section>
    </div>
  );
}
