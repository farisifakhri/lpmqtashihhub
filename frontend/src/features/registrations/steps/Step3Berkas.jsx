import React from 'react';
import { UploadCloud, FileText, Image, Smartphone, CheckCircle2, Trash2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { formatFileSize, validateSelectedFile } from './registration-validation';

export const Step3Berkas = ({
  suratPermohonanFile,
  setSuratPermohonanFile,
  suratPermohonanFileId,
  setSuratPermohonanFileId,
  coverFile,
  setCoverFile,
  coverFileId,
  setCoverFileId,
  contohHalamanFile,
  setContohHalamanFile,
  contohHalamanFileId,
  setContohHalamanFileId,
  apkFile,
  setApkFile,
  apkFileId,
  setApkFileId,
  apkUrl,
  setApkUrl,
  suratPernyataanFile,
  setSuratPernyataanFile,
  suratPernyataanFileId,
  setSuratPernyataanFileId,
  buktiTashihFile,
  setBuktiTashihFile,
  buktiTashihFileId,
  setBuktiTashihFileId,
  kategoriPendaftaran,
  isDigital,
  fieldErrors = {},
  setFieldError,
  clearFieldError,
}) => {
  const isPerpanjangan = kategoriPendaftaran === 'Perpanjangan Tanda Tashih';
  const isLuarNegeri = kategoriPendaftaran === 'Mushaf Luar Negeri';

  // Handler validasi instan saat berkas dipilih
  const handleFileChange = (e, fileType, options, setFile, setFileId, errorKey) => {
    const file = e.target.files?.[0] || null;
    e.target.value = ''; // Reset input agar event onchange tetap terpicu jika memilih ulang berkas sama

    if (!file) return;

    const validationError = validateSelectedFile(file, options);
    if (validationError) {
      setFile(null);
      setFileId(null);
      setFieldError?.(errorKey, validationError);
      return;
    }

    clearFieldError?.(errorKey);
    setFile(file);
    setFileId(null); // File baru butuh diunggah ulang
  };

  const handleRemoveFile = (setFile, setFileId, errorKey) => {
    setFile(null);
    setFileId(null);
    clearFieldError?.(errorKey);
  };

  return (
    <div className="bg-white rounded-2xl border border-line p-5 sm:p-7 shadow-xs space-y-6">
      <div className="border-b border-line pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
          <UploadCloud className="w-5 h-5 text-brand-700" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink">
            Bagian III. Informasi Dokumen & Berkas Mushaf
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            Unggah berkas persyaratan digital. Format dan ukuran berkas akan divalidasi langsung saat Anda memilih berkas.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Surat Permohonan */}
        <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
          <div className="flex items-start justify-between gap-2">
            <div>
              <label htmlFor="file-surat-permohonan" className="block text-xs font-bold text-ink">
                1. Surat Permohonan Tanda Tashih <span className="text-civic-danger">*</span>
              </label>
              <p className="text-xs text-ink-muted mt-0.5">
                Surat permohonan resmi bertanda tangan pimpinan penerbit / penanggung jawab (Format PDF, maksimal 10 MB).
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
              Wajib (PDF)
            </span>
          </div>

          <input
            id="file-surat-permohonan"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) =>
              handleFileChange(
                e,
                'pdf',
                {
                  allowedExtensions: ['.pdf'],
                  allowedMimes: ['application/pdf'],
                  maxBytes: 10 * 1024 * 1024,
                  fieldLabel: 'Surat Permohonan',
                },
                setSuratPermohonanFile,
                setSuratPermohonanFileId,
                'suratPermohonan'
              )
            }
            aria-invalid={Boolean(fieldErrors.suratPermohonan)}
            aria-describedby={fieldErrors.suratPermohonan ? 'file-surat-permohonan-error' : undefined}
            className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
          />

          {suratPermohonanFile && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-brand-200 text-xs text-ink">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                <span className="font-semibold truncate">{suratPermohonanFile.name}</span>
                <span className="text-ink-muted shrink-0">({formatFileSize(suratPermohonanFile.size)})</span>
                <span className="text-xs font-bold text-civic-success bg-civic-successSoft px-1.5 py-0.5 rounded shrink-0">
                  Valid
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(setSuratPermohonanFile, setSuratPermohonanFileId, 'suratPermohonan')}
                className="p-1 text-civic-danger hover:bg-civic-dangerSoft rounded transition-colors ml-2"
                title="Hapus berkas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {fieldErrors.suratPermohonan && (
            <p id="file-surat-permohonan-error" className="text-xs text-civic-danger flex items-center gap-1.5 mt-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.suratPermohonan}</span>
            </p>
          )}
        </div>

        {/* 2. Cover Mushaf (PNG/JPEG only, not image/*) */}
        <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
          <div className="flex items-start justify-between gap-2">
            <div>
              <label htmlFor="file-cover" className="block text-xs font-bold text-ink">
                2. Gambar Cover / Sampul Mushaf <span className="text-civic-danger">*</span>
              </label>
              <p className="text-xs text-ink-muted mt-0.5">
                Desain sampul depan dan belakang mushaf (Format PNG atau JPEG/JPG, maksimal 10 MB).
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
              Wajib (PNG/JPEG)
            </span>
          </div>

          <input
            id="file-cover"
            type="file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            onChange={(e) =>
              handleFileChange(
                e,
                'image',
                {
                  allowedExtensions: ['.png', '.jpg', '.jpeg'],
                  allowedMimes: ['image/png', 'image/jpeg'],
                  maxBytes: 10 * 1024 * 1024,
                  fieldLabel: 'Gambar Cover',
                },
                setCoverFile,
                setCoverFileId,
                'cover'
              )
            }
            aria-invalid={Boolean(fieldErrors.cover)}
            aria-describedby={fieldErrors.cover ? 'file-cover-error' : undefined}
            className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
          />

          {coverFile && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-brand-200 text-xs text-ink">
              <div className="flex items-center gap-2 truncate">
                <Image className="w-4 h-4 text-brand-700 shrink-0" />
                <span className="font-semibold truncate">{coverFile.name}</span>
                <span className="text-ink-muted shrink-0">({formatFileSize(coverFile.size)})</span>
                <span className="text-xs font-bold text-civic-success bg-civic-successSoft px-1.5 py-0.5 rounded shrink-0">
                  Valid
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(setCoverFile, setCoverFileId, 'cover')}
                className="p-1 text-civic-danger hover:bg-civic-dangerSoft rounded transition-colors ml-2"
                title="Hapus berkas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {fieldErrors.cover && (
            <p id="file-cover-error" className="text-xs text-civic-danger flex items-center gap-1.5 mt-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.cover}</span>
            </p>
          )}
        </div>

        {/* 3. Contoh Halaman Mushaf (1–3) */}
        <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
          <div className="flex items-start justify-between gap-2">
            <div>
              <label htmlFor="file-contoh-halaman" className="block text-xs font-bold text-ink">
                3. Contoh Halaman Mushaf (Halaman 1–3) <span className="text-civic-danger">*</span>
              </label>
              <p className="text-xs text-ink-muted mt-0.5">
                Sampel tata letak halaman mushaf (Al-Fatihah dan awal Al-Baqarah) (Format PDF, maksimal 10 MB).
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
              Wajib (PDF)
            </span>
          </div>

          <input
            id="file-contoh-halaman"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) =>
              handleFileChange(
                e,
                'pdf',
                {
                  allowedExtensions: ['.pdf'],
                  allowedMimes: ['application/pdf'],
                  maxBytes: 10 * 1024 * 1024,
                  fieldLabel: 'Contoh Halaman Mushaf',
                },
                setContohHalamanFile,
                setContohHalamanFileId,
                'contohHalaman'
              )
            }
            aria-invalid={Boolean(fieldErrors.contohHalaman)}
            aria-describedby={fieldErrors.contohHalaman ? 'file-contoh-halaman-error' : undefined}
            className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
          />

          {contohHalamanFile && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-brand-200 text-xs text-ink">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                <span className="font-semibold truncate">{contohHalamanFile.name}</span>
                <span className="text-ink-muted shrink-0">({formatFileSize(contohHalamanFile.size)})</span>
                <span className="text-xs font-bold text-civic-success bg-civic-successSoft px-1.5 py-0.5 rounded shrink-0">
                  Valid
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(setContohHalamanFile, setContohHalamanFileId, 'contohHalaman')}
                className="p-1 text-civic-danger hover:bg-civic-dangerSoft rounded transition-colors ml-2"
                title="Hapus berkas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {fieldErrors.contohHalaman && (
            <p id="file-contoh-halaman-error" className="text-xs text-civic-danger flex items-center gap-1.5 mt-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.contohHalaman}</span>
            </p>
          )}
        </div>

        {/* 4. Berkas Aplikasi Digital (APK atau Tautan Cloud) jika 2. Digital */}
        {isDigital && (
          <div className="space-y-4 p-4 rounded-xl bg-civic-infoSoft border border-civic-infoLine">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-civic-info shrink-0" />
                <label className="block text-xs font-bold text-civic-info">
                  Aplikasi Mushaf Digital (APK atau Tautan Cloud) <span className="text-civic-danger">*</span>
                </label>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Karena Anda memilih naskah "2. Digital", silakan unggah installer APK Android (maksimal 100 MB) atau sertakan tautan unduhan cloud (Google Drive, Dropbox, atau Play Store) untuk diuji oleh pentashih.
              </p>
            </div>

            {/* Opsi A: Unggah Berkas APK */}
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-line">
              <label htmlFor="file-apk" className="block text-xs font-bold text-ink">
                Opsi 1: Unggah Installer APK (.apk, maks 100 MB)
              </label>
              <input
                id="file-apk"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={(e) =>
                  handleFileChange(
                    e,
                    'apk',
                    {
                      allowedExtensions: ['.apk'],
                      allowedMimes: [
                        'application/vnd.android.package-archive',
                        'application/octet-stream',
                        'application/zip',
                        'application/x-zip-compressed',
                      ],
                      maxBytes: 100 * 1024 * 1024,
                      fieldLabel: 'File Aplikasi APK',
                    },
                    setApkFile,
                    setApkFileId,
                    'apk'
                  )
                }
                className="w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink cursor-pointer p-1 rounded-lg border border-line-strong bg-white"
              />

              {apkFile && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-brand-50 border border-brand-200 text-xs text-ink">
                  <div className="flex items-center gap-2 truncate">
                    <Smartphone className="w-4 h-4 text-brand-700 shrink-0" />
                    <span className="font-semibold truncate">{apkFile.name}</span>
                    <span className="text-ink-muted shrink-0">({formatFileSize(apkFile.size)})</span>
                    <span className="text-xs font-bold text-civic-success bg-civic-successSoft px-1.5 py-0.5 rounded shrink-0">
                      Valid
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(setApkFile, setApkFileId, 'apk')}
                    className="p-1 text-civic-danger hover:bg-civic-dangerSoft rounded transition-colors ml-2"
                    title="Hapus berkas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Opsi B: Tautan Unduhan Cloud */}
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-line">
              <label htmlFor="apk-download-url" className="block text-xs font-bold text-ink flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-ink-muted" />
                <span>Opsi 2: Tautan Unduhan Aplikasi / Cloud Storage (Alternatif)</span>
              </label>
              <input
                id="apk-download-url"
                type="url"
                value={apkUrl || ''}
                onChange={(e) => {
                  setApkUrl?.(e.target.value);
                  clearFieldError?.('apk');
                }}
                placeholder="https://drive.google.com/... atau tautan installer aplikasi"
                className="w-full text-xs px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-1 focus:ring-brand-700 text-ink"
              />
              <p className="text-xs text-ink-muted">
                Dapat digunakan jika berkas APK Anda berukuran besar atau dihosting secara khusus.
              </p>
            </div>

            {fieldErrors.apk && (
              <p className="text-xs text-civic-danger flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.apk}</span>
              </p>
            )}
          </div>
        )}

        {/* 5. Surat Pernyataan jika Perpanjangan */}
        {isPerpanjangan && (
          <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
            <div className="flex items-start justify-between gap-2">
              <div>
                <label htmlFor="file-surat-pernyataan" className="block text-xs font-bold text-ink">
                  Surat Pernyataan Tidak Ada Perubahan <span className="text-civic-danger">*</span>
                </label>
                <p className="text-xs text-ink-muted mt-0.5">
                  Surat pernyataan bermaterai bahwa tidak terdapat perubahan isi pada master mushaf (Format PDF, maksimal 10 MB).
                </p>
              </div>
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
                Wajib (PDF)
              </span>
            </div>

            <input
              id="file-surat-pernyataan"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) =>
                handleFileChange(
                  e,
                  'pdf',
                  {
                    allowedExtensions: ['.pdf'],
                    allowedMimes: ['application/pdf'],
                    maxBytes: 10 * 1024 * 1024,
                    fieldLabel: 'Surat Pernyataan',
                  },
                  setSuratPernyataanFile,
                  setSuratPernyataanFileId,
                  'suratPernyataan'
                )
              }
              aria-invalid={Boolean(fieldErrors.suratPernyataan)}
              aria-describedby={fieldErrors.suratPernyataan ? 'file-surat-pernyataan-error' : undefined}
              className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
            />

            {suratPernyataanFile && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-brand-200 text-xs text-ink">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                  <span className="font-semibold truncate">{suratPernyataanFile.name}</span>
                  <span className="text-ink-muted shrink-0">({formatFileSize(suratPernyataanFile.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(setSuratPernyataanFile, setSuratPernyataanFileId, 'suratPernyataan')}
                  className="p-1 text-civic-danger hover:bg-civic-dangerSoft rounded transition-colors ml-2"
                  title="Hapus berkas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {fieldErrors.suratPernyataan && (
              <p id="file-surat-pernyataan-error" className="text-xs text-civic-danger flex items-center gap-1.5 mt-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.suratPernyataan}</span>
              </p>
            )}
          </div>
        )}

        {/* 6. Bukti Tashih Asal jika Luar Negeri */}
        {isLuarNegeri && (
          <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
            <div className="flex items-start justify-between gap-2">
              <div>
                <label htmlFor="file-bukti-tashih" className="block text-xs font-bold text-ink">
                  Bukti Tanda Tashih Asal Mushaf <span className="text-civic-danger">*</span>
                </label>
                <p className="text-xs text-ink-muted mt-0.5">
                  Unggah tanda tashih dari lembaga pentashih mushaf asal di luar negeri (Format PDF/PNG/JPEG, maksimal 10 MB).
                </p>
              </div>
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
                Wajib
              </span>
            </div>

            <input
              id="file-bukti-tashih"
              type="file"
              accept=".pdf,image/png,image/jpeg,.png,.jpg,.jpeg"
              onChange={(e) =>
                handleFileChange(
                  e,
                  'document',
                  {
                    allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg'],
                    allowedMimes: ['application/pdf', 'image/png', 'image/jpeg'],
                    maxBytes: 10 * 1024 * 1024,
                    fieldLabel: 'Bukti Tanda Tashih Asal',
                  },
                  setBuktiTashihFile,
                  setBuktiTashihFileId,
                  'buktiTashih'
                )
              }
              aria-invalid={Boolean(fieldErrors.buktiTashih)}
              aria-describedby={fieldErrors.buktiTashih ? 'file-bukti-tashih-error' : undefined}
              className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
            />

            {buktiTashihFile && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-brand-200 text-xs text-ink">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                  <span className="font-semibold truncate">{buktiTashihFile.name}</span>
                  <span className="text-ink-muted shrink-0">({formatFileSize(buktiTashihFile.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(setBuktiTashihFile, setBuktiTashihFileId, 'buktiTashih')}
                  className="p-1 text-civic-danger hover:bg-civic-dangerSoft rounded transition-colors ml-2"
                  title="Hapus berkas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {fieldErrors.buktiTashih && (
              <p id="file-bukti-tashih-error" className="text-xs text-civic-danger flex items-center gap-1.5 mt-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.buktiTashih}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step3Berkas;
