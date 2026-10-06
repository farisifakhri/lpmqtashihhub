import React from 'react';
import {
  FileText,
  Eye,
  Upload,
  Send,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const FILE_TYPES = {
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
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
      {/* Kolom Kiri: Berkas Digital yang Tersimpan */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-5 space-y-4 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-800" />
              Berkas naskah digital
            </h2>
            <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
              Sampul dan sampel halaman 1–5 naskah mushaf yang diverifikasi oleh LPMQ Kemenag RI (PDF, PNG, atau JPEG maksimal 10 MB).
            </p>
          </div>

          {data.manuscript_files?.length ? (
            <ul className="space-y-2.5">
              {data.manuscript_files.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center gap-3 rounded-xl bg-canvas border border-line p-3 text-xs text-ink hover:border-brand-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-brand-700" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-ink block truncate">
                        {FILE_TYPES[item.type] || item.type}
                      </span>
                      <span className="text-[10px] text-ink-muted block">
                        Versi {item.version}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] text-ink-muted bg-surface border border-line px-2 py-0.5 rounded">
                      v{item.version}
                    </span>
                    {item.file_id && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewFile({
                            id: item.file_id,
                            name: `${FILE_TYPES[item.type] || item.type}.pdf`,
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs text-brand-800 hover:text-brand-900 font-semibold px-2 py-1 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors"
                        title="Lihat Berkas"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center rounded-xl border border-dashed border-line bg-canvas">
              <p className="text-xs text-ink-muted">Belum ada berkas naskah digital yang diunggah.</p>
            </div>
          )}

          {/* Form Unggah Tambahan (Saat Draf atau Perlu Perbaikan) */}
          {editable ? (
            <form onSubmit={upload} className="space-y-3.5 border-t border-line pt-4">
              <p className="text-xs font-bold text-ink">
                {revision ? 'Unggah Berkas Perbaikan' : 'Unggah Berkas Naskah'}
              </p>

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
                  className="w-full rounded-lg border border-line-strong p-2 text-xs bg-canvas font-medium focus:bg-surface focus:ring-2 focus:ring-brand-700/20"
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
                  className="w-full text-xs file:rounded-lg file:border-0 file:bg-brand-50 file:p-2 file:text-brand-900 file:font-bold file:mr-3 border border-line rounded-lg bg-canvas"
                />
              </div>

              <Button type="submit" disabled={busy || !file} size="sm" className="text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {busy ? 'Memproses…' : 'Unggah versi baru'}
              </Button>
            </form>
          ) : (
            <p className="text-[11px] text-ink-muted italic pt-1">
              Berkas digital naskah terkunci selama proses verifikasi berlangsung.
            </p>
          )}
        </section>
      </div>

      {/* Kolom Kanan: Panduan Berkas & Langkah Tindak Lanjut */}
      <div className="space-y-6">
        {editable ? (
          <section className="rounded-2xl border border-line bg-surface p-5 space-y-3.5 shadow-2xs">
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-800" />
              {revision ? 'Ajukan Ulang Perbaikan' : 'Kirim permohonan'}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              {revision
                ? 'Setelah berkas perbaikan diunggah, klik tombol di bawah untuk mengajukan kembali ke tim verifikator LPMQ.'
                : 'Periksa kelengkapan berkas digital sebelum mengirim permohonan ke LPMQ.'}
            </p>
            {!requiredFiles && (
              <p className="text-xs text-civic-warning font-semibold bg-civic-warningSoft p-2.5 rounded-lg border border-civic-warningLine">
                Lengkapi sampul dan sampel halaman 1–5 terlebih dahulu.
              </p>
            )}
            <Button
              disabled={busy || !requiredFiles}
              onClick={onSubmitRegistration}
              className="text-xs w-full sm:w-auto font-bold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {revision ? 'Ajukan ulang perbaikan' : 'Kirim permohonan'}
            </Button>
          </section>
        ) : (
          <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-brand-700" />
              <span>Berkas Digital Berhasil Terdaftar</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Seluruh berkas naskah digital awal telah diterima sistem LPMQ. Langkah berikutnya adalah menyerahkan master fisik naskah (30 jilid A4).
            </p>
            <div className="pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTabChange('berkas-fisik')}
                className="text-xs font-bold inline-flex items-center gap-1.5"
              >
                <span>Buka Penyerahan Berkas Fisik</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

