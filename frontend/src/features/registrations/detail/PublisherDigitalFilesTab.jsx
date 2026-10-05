import React from 'react';
import {
  FileText,
  Eye,
  Upload,
  Send,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const FILE_TYPES = {
  COVER: 'Sampul / cover',
  SAMPLE_PAGE_1_5: 'Sampel halaman 1–5',
  DUMMY: 'Dumi perbaikan',
  MASTER_COMPLETED: 'Master lengkap perbaikan',
  FOREIGN_TASHIH_CERTIFICATE: 'Bukti Tashih Lembaga Asal',
};

export function PublisherDigitalFilesTab({
  data,
  editable,
  revision,
  requiredFiles,
  type,
  setType,
  file,
  setFile,
  busy,
  upload,
  onSubmitRegistration,
  setPreviewFile,
  handleTabChange,
}) {
  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
      {/* Kolom Kiri: Berkas Digital */}
      <div className="space-y-6">
        <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-800" />
              Berkas naskah digital
            </h2>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Sampul dan halaman 1–5 adalah berkas awal naskah digital (PDF, PNG, atau JPEG maksimal 10 MB).
            </p>
          </div>

          {data.manuscript_files?.length ? (
            <ul className="space-y-2">
              {data.manuscript_files.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center gap-3 rounded-lg bg-canvas border border-line p-3 text-xs text-ink"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-700" />
                    <span className="font-semibold text-ink">
                      {FILE_TYPES[item.type] || item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-muted bg-white border border-line px-2 py-0.5 rounded">
                      Versi {item.version}
                    </span>
                    {item.file_id && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ id: item.file_id, name: `${FILE_TYPES[item.type] || item.type}.pdf` })}
                        className="text-xs text-brand-800 hover:text-brand-900 font-semibold p-1 hover:bg-brand-50 rounded cursor-pointer"
                        title="Lihat Berkas"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-muted">Belum ada berkas naskah.</p>
          )}

          {editable ? (
            <form onSubmit={upload} className="space-y-3 border-t border-line pt-4">
              <div>
                <label
                  htmlFor="publisher-file-type"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Jenis berkas
                </label>
                <select
                  id="publisher-file-type"
                  value={type}
                  disabled={busy}
                  onChange={(event) => setType(event.target.value)}
                  className="w-full rounded-lg border border-line-strong p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                >
                  {Object.entries(FILE_TYPES)
                    .filter(
                      ([key]) =>
                        revision || ['COVER', 'SAMPLE_PAGE_1_5'].includes(key)
                    )
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="publisher-manuscript-file"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Pilih berkas naskah
                </label>
                <input
                  id="publisher-manuscript-file"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={busy}
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="w-full text-xs file:rounded-lg file:border-0 file:bg-brand-50 file:p-2 file:text-brand-900 file:font-bold file:mr-3 border border-line rounded-lg"
                />
              </div>

              <Button type="submit" disabled={busy || !file} size="sm" className="text-xs">
                <Upload className="h-3.5 w-3.5 mr-1" />
                {busy ? 'Memproses…' : 'Unggah versi baru'}
              </Button>
            </form>
          ) : (
            <p className="text-[11px] text-ink-muted italic pt-1">
              Unggah hanya tersedia saat draf atau setelah petugas meminta perbaikan.
            </p>
          )}
        </section>
      </div>

      {/* Kolom Kanan: Panduan Berkas & Tombol Pengajuan */}
      <div className="space-y-6">
        {editable ? (
          <section className="rounded-xl border border-line bg-white p-5 space-y-3 shadow-2xs">
            <h2 className="font-bold text-ink text-sm">Kirim permohonan</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Periksa kelengkapan berkas digital sebelum mengirim permohonan ke LPMQ.
            </p>
            {!requiredFiles && (
              <p className="text-xs text-civic-warning font-semibold">
                Lengkapi sampul dan sampel halaman 1–5 terlebih dahulu.
              </p>
            )}
            <Button
              disabled={busy || !requiredFiles}
              onClick={onSubmitRegistration}
              className="text-xs w-full sm:w-auto"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {revision ? 'Ajukan ulang perbaikan' : 'Kirim permohonan'}
            </Button>
          </section>
        ) : (
          <section className="rounded-xl border border-line bg-white p-5 space-y-3 shadow-2xs">
            <h2 className="font-bold text-ink text-sm flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-brand-800" />
              Penyerahan Berkas Fisik
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Penyerahan berkas fisik (A4 dijilid per juz) kini berada pada tab terpisah. Buka tab <strong>Penyerahan Berkas Fisik</strong> untuk memeriksa status penerimaan atau mengisi nomor resi pengiriman.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('berkas-fisik')}
              className="text-xs font-semibold text-brand-800"
            >
              Buka Tab Berkas Fisik
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
