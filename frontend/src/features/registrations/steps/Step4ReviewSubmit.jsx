import React from 'react';
import { CheckCircle2, AlertTriangle, FileText, Image, Smartphone, Send, Save, ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Step4ReviewSubmit = ({
  kategoriPendaftaran,
  namaMushaf,
  jenisStandarMushaf,
  penanggungJawabProduk,
  penanggungJawabWa,
  penanggungJawabEmail,
  sizes,
  namaPercetakan,
  deskripsiMushaf,
  selectedJenisNaskah,
  selectedMateriTambahan,
  penanggungJawabMateri,
  // Berkas
  suratPermohonanFile,
  suratPermohonanFileId,
  coverFile,
  coverFileId,
  contohHalamanFile,
  contohHalamanFileId,
  apkFile,
  apkFileId,
  apkUrl,
  suratPernyataanFile,
  suratPernyataanFileId,
  buktiTashihFile,
  buktiTashihFileId,
  isDigital,
  // Actions
  onPreviousStep,
  onInitiateSubmit,
  onSaveDraft,
  isSubmitting,
  uploadingFiles,
  loadingMaster,
}) => {
  const isPerpanjangan = kategoriPendaftaran === 'Perpanjangan Tanda Tashih';
  const isLuarNegeri = kategoriPendaftaran === 'Mushaf Luar Negeri';

  // Buka file lokal (File object) di tab baru menggunakan object URL
  const handlePreviewFile = (file) => {
    const url = URL.createObjectURL(file);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    } else {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-line p-5 sm:p-7 shadow-xs space-y-6">
        <div className="border-b border-line pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Langkah 4: Tinjau & Konfirmasi Permohonan
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              Periksa kembali seluruh data dan berkas persyaratan sebelum mengirimkan permohonan ke loket LPMQ.
            </p>
          </div>
        </div>

        {/* Peringatan Integritas Data (REV-07) */}
        <div className="p-4 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-xs text-civic-warning font-semibold flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-civic-warning" />
          <div>
            <p className="font-bold">Peringatan Ketelitian Pengisian (REV-07)</p>
            <p className="mt-0.5 leading-relaxed">
              Seluruh rincian naskah dan berkas digital harus lengkap dan sesuai ketentuan sebelum diajukan. Data yang dikirimkan akan diproses langsung oleh tim verifikator LPMQ.
            </p>
          </div>
        </div>

        {/* Ringkasan Isian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel Data Mushaf */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider border-b border-line pb-2">
              Identitas & Spesifikasi Naskah
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-ink-muted">Kategori:</span>
                <span className="font-bold text-ink text-right">{kategoriPendaftaran}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-muted">Nama Mushaf:</span>
                <span className="font-bold text-ink text-right">{namaMushaf || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-muted">Standar Mushaf:</span>
                <span className="font-medium text-ink text-right">{jenisStandarMushaf}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-muted">Penanggung Jawab:</span>
                <span className="font-medium text-ink text-right">
                  {penanggungJawabProduk || '—'}
                </span>
              </div>
              {penanggungJawabWa && (
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">WhatsApp PJ:</span>
                  <span className="font-mono text-ink text-right">{penanggungJawabWa}</span>
                </div>
              )}
              {penanggungJawabEmail && (
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">Email PJ:</span>
                  <span className="text-ink text-right">{penanggungJawabEmail}</span>
                </div>
              )}
              {namaPercetakan && (
                <div className="flex justify-between gap-2">
                  <span className="text-ink-muted">Percetakan:</span>
                  <span className="text-ink text-right">{namaPercetakan}</span>
                </div>
              )}
              {sizes?.length > 0 && sizes[0].ukuran && (
                <div className="pt-2 border-t border-line">
                  <span className="text-ink-muted block mb-1">Daftar Ukuran & Oplah:</span>
                  <div className="space-y-1">
                    {sizes.map((s, idx) => (
                      <div key={idx} className="flex justify-between text-xs bg-white px-2 py-1 rounded border border-line">
                        <span>Ukuran: {s.ukuran || '—'} cm</span>
                        <span className="font-semibold">{Number(s.oplah || 0).toLocaleString('id-ID')} eks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Klasifikasi & Materi */}
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider border-b border-line pb-2">
              Jenis Naskah & Materi Tambahan
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-ink-muted block mb-1.5 font-semibold">Jenis Naskah Terpilih:</span>
                {selectedJenisNaskah.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJenisNaskah.map((j) => (
                      <span key={j} className="px-2 py-0.5 rounded bg-brand-100 text-brand-900 font-semibold text-xs border border-brand-200">
                        {j}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-civic-danger italic">Belum ada jenis naskah dipilih</span>
                )}
              </div>

              <div className="pt-2 border-t border-line">
                <span className="text-ink-muted block mb-1.5 font-semibold">Materi Tambahan (Pelengkap):</span>
                {selectedMateriTambahan.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMateriTambahan.map((m) => (
                      <span key={m} className="px-2 py-0.5 rounded bg-surface-subtle text-ink text-xs border border-line">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-ink-muted italic">Tidak ada materi tambahan</span>
                )}
              </div>

              {penanggungJawabMateri && (
                <div className="flex justify-between gap-2 pt-2 border-t border-line">
                  <span className="text-ink-muted">PJ Materi:</span>
                  <span className="text-ink text-right">{penanggungJawabMateri}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Berkas Digital */}
        <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
          <div className="border-b border-line pb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
              Tinjau Berkas Persyaratan Digital
            </h3>
            <span className="text-xs text-ink-muted">Klik "Tinjau" untuk melihat isi berkas sebelum mengirim</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Surat Permohonan */}
            <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${suratPermohonanFile || suratPermohonanFileId ? 'bg-white border-brand-200' : 'bg-white border-line'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={`w-4 h-4 shrink-0 ${suratPermohonanFile || suratPermohonanFileId ? 'text-brand-700' : 'text-ink-muted'}`} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Surat Permohonan</div>
                  <div className="text-xs text-ink-muted truncate">
                    {suratPermohonanFile ? suratPermohonanFile.name : (suratPermohonanFileId ? 'Berkas tersimpan' : '⚠️ Belum dipilih')}
                  </div>
                </div>
              </div>
              {suratPermohonanFile && (
                <button
                  type="button"
                  onClick={() => handlePreviewFile(suratPermohonanFile)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 shrink-0 transition-colors"
                  title="Tinjau berkas"
                >
                  <Eye className="w-3 h-3" />
                  Tinjau
                </button>
              )}
            </div>

            {/* Cover Mushaf */}
            <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${coverFile || coverFileId ? 'bg-white border-brand-200' : 'bg-white border-line'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <Image className={`w-4 h-4 shrink-0 ${coverFile || coverFileId ? 'text-brand-700' : 'text-ink-muted'}`} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Cover / Sampul Mushaf</div>
                  <div className="text-xs text-ink-muted truncate">
                    {coverFile ? coverFile.name : (coverFileId ? 'Berkas tersimpan' : '⚠️ Belum dipilih')}
                  </div>
                </div>
              </div>
              {coverFile && (
                <button
                  type="button"
                  onClick={() => handlePreviewFile(coverFile)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 shrink-0 transition-colors"
                  title="Tinjau berkas"
                >
                  <Eye className="w-3 h-3" />
                  Tinjau
                </button>
              )}
            </div>

            {/* Contoh Halaman */}
            <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${contohHalamanFile || contohHalamanFileId ? 'bg-white border-brand-200' : 'bg-white border-line'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={`w-4 h-4 shrink-0 ${contohHalamanFile || contohHalamanFileId ? 'text-brand-700' : 'text-ink-muted'}`} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Sampel Halaman 1–3</div>
                  <div className="text-xs text-ink-muted truncate">
                    {contohHalamanFile ? contohHalamanFile.name : (contohHalamanFileId ? 'Berkas tersimpan' : '⚠️ Belum dipilih')}
                  </div>
                </div>
              </div>
              {contohHalamanFile && (
                <button
                  type="button"
                  onClick={() => handlePreviewFile(contohHalamanFile)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 shrink-0 transition-colors"
                  title="Tinjau berkas"
                >
                  <Eye className="w-3 h-3" />
                  Tinjau
                </button>
              )}
            </div>

            {/* Aplikasi Digital (APK) */}
            {isDigital && (
              <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${apkFile || apkUrl || apkFileId ? 'bg-white border-brand-200' : 'bg-white border-line'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className={`w-4 h-4 shrink-0 ${apkFile || apkUrl || apkFileId ? 'text-brand-fg' : 'text-ink-muted'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">Aplikasi Digital</div>
                    <div className="text-xs text-ink-muted truncate">
                      {apkFile ? apkFile.name : (apkUrl ? apkUrl : (apkFileId ? 'Berkas tersimpan' : '⚠️ Belum disediakan'))}
                    </div>
                  </div>
                </div>
                {apkUrl && !apkFile && (
                  <a
                    href={apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 shrink-0 transition-colors"
                    title="Buka tautan"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka
                  </a>
                )}
              </div>
            )}

            {/* Surat Pernyataan (Perpanjangan) */}
            {isPerpanjangan && (
              <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${suratPernyataanFile || suratPernyataanFileId ? 'bg-white border-brand-200' : 'bg-white border-line'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className={`w-4 h-4 shrink-0 ${suratPernyataanFile || suratPernyataanFileId ? 'text-brand-700' : 'text-ink-muted'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">Surat Pernyataan</div>
                    <div className="text-xs text-ink-muted truncate">
                      {suratPernyataanFile ? suratPernyataanFile.name : (suratPernyataanFileId ? 'Berkas tersimpan' : '⚠️ Belum dipilih')}
                    </div>
                  </div>
                </div>
                {suratPernyataanFile && (
                  <button
                    type="button"
                    onClick={() => handlePreviewFile(suratPernyataanFile)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 shrink-0 transition-colors"
                    title="Tinjau berkas"
                  >
                    <Eye className="w-3 h-3" />
                    Tinjau
                  </button>
                )}
              </div>
            )}

            {/* Bukti Tashih Asal (Luar Negeri) */}
            {isLuarNegeri && (
              <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${buktiTashihFile || buktiTashihFileId ? 'bg-white border-brand-200' : 'bg-white border-line'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className={`w-4 h-4 shrink-0 ${buktiTashihFile || buktiTashihFileId ? 'text-brand-700' : 'text-ink-muted'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">Bukti Tashih Asal</div>
                    <div className="text-xs text-ink-muted truncate">
                      {buktiTashihFile ? buktiTashihFile.name : (buktiTashihFileId ? 'Berkas tersimpan' : '⚠️ Belum dipilih')}
                    </div>
                  </div>
                </div>
                {buktiTashihFile && (
                  <button
                    type="button"
                    onClick={() => handlePreviewFile(buktiTashihFile)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 shrink-0 transition-colors"
                    title="Tinjau berkas"
                  >
                    <Eye className="w-3 h-3" />
                    Tinjau
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigasi & Aksi Pengiriman */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onPreviousStep}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs w-full sm:w-auto"
          >
            Kembali ke Berkas
          </Button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isSubmitting || loadingMaster}
              onClick={onSaveDraft}
              icon={<Save className="w-4 h-4 text-ink-muted" />}
              className="text-xs w-full sm:w-auto"
            >
              Simpan Draf Saja
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isSubmitting || loadingMaster}
              onClick={onInitiateSubmit}
              icon={<Send className="w-4 h-4" />}
              className="text-xs font-bold w-full sm:w-auto"
            >
              {isSubmitting ? (uploadingFiles ? 'Mengunggah Berkas...' : 'Memproses...') : 'Kirim Permohonan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4ReviewSubmit;
