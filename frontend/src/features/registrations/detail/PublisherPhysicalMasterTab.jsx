import React, { useState } from 'react';
import {
  PackageCheck,
  BookOpen,
  MapPin,
  Printer,
  Truck,
  CheckCircle2,
  Download,
  Send,
  AlertCircle,
  Upload,
  FileText,
} from 'lucide-react';
import { fileApi } from '@/api/file.api';
import { Button } from '@/components/ui/Button';

export function PublisherPhysicalMasterTab({
  data,
  editable,
  volumeCount,
  setVolumeCount,
  busy,
  savePhysical,
  actionLoading,
  showPhysicalReceipt,
  dispatchData,
  setDispatchData,
  handleDispatch,
  setShowShippingLabel,
}) {
  const [downloadedSession, setDownloadedSession] = useState(false);
  const isLabelDownloaded = Boolean(
    data?.foreign_metadata?.shipping_label_downloaded_at || downloadedSession
  );
  const [uploadingRecap, setUploadingRecap] = useState(false);
  const [recapFileName, setRecapFileName] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleRecapUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRecap(true);
    setUploadError('');
    try {
      const res = await fileApi.upload(file);
      const fileId = res?.data?.id || res?.id;
      setDispatchData({ ...dispatchData, recap_file_id: fileId });
      setRecapFileName(file.name);
    } catch (err) {
      setUploadError(err.message || 'Gagal mengunggah berkas rekapitulasi perbaikan.');
    } finally {
      setUploadingRecap(false);
    }
  };

  const handleOpenShippingLabel = () => {
    setDownloadedSession(true);
    if (setShowShippingLabel) {
      setShowShippingLabel(true);
    }
  };

  const isRevisionRequired = data.status === 'REVISION_REQUIRED';

  return (
    <div className="space-y-6">
      {/* Petunjuk & Alamat Loket LPMQ */}
      <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-3">
          <div>
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-brand-800" />
              Petunjuk & Ketentuan Master Fisik
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Sesuai SOP LPMQ Kemenag RI, pemeriksaan fisik naskah memerlukan master fisik lengkap.
            </p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
            data.physical_master_intake?.status === 'RECEIVED'
              ? 'bg-brand-100 text-brand-800 border-brand-200'
              : data.physical_dispatch_status === 'DISPATCHED'
                ? 'bg-civic-infoSoft text-civic-info border-civic-infoLine'
                : 'bg-civic-warningSoft text-civic-warning border-civic-warningLine'
          }`}>
            {data.physical_master_intake?.status === 'RECEIVED'
              ? 'Master Fisik Diterima LPMQ'
              : data.physical_dispatch_status === 'DISPATCHED'
                ? 'Berkas Dikirim · Menunggu Penerimaan'
                : 'Menunggu Pengiriman Berkas Fisik'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-canvas rounded-xl border border-line space-y-2">
            <p className="font-bold text-ink flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-brand-700" />
              Ketentuan Master Fisik:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-muted leading-relaxed text-xs">
              <li>Dicetak pada kertas ukuran <strong>A4</strong> dengan resolusi tinggi dan jelas.</li>
              <li>Naskah wajib dijilid rapi <strong>per juz</strong> (total 30 jilid).</li>
              <li>Mencantumkan lembar tanda terima/nomor registrasi: <strong className="font-mono text-ink">{data.registration_no}</strong>.</li>
              <li>Pastikan kondisi fisik rapi, tidak ada halaman hilang atau tinta buram.</li>
            </ul>
          </div>

          <div className="p-4 bg-canvas rounded-xl border border-line space-y-2">
            <p className="font-bold text-ink flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-700" />
              Alamat Penyerahan / Pengiriman:
            </p>
            <div className="text-ink-muted space-y-1 text-xs leading-relaxed">
              <p className="font-bold text-ink">Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)</p>
              <p>Gedung Bayt Al-Qur'an & Museum Istiqlal, Jl. Raya TMII Pintu I</p>
              <p>Kel. Pinang Ranti, Kec. Makasar, Jakarta Timur 13560</p>
              <p className="pt-1 text-ink">Jam Layanan: Senin – Jumat, 08.00 – 15.00 WIB</p>
            </div>
          </div>
        </div>
      </section>

      {/* Resi Keluar Distributor: Informasi Naskah Fisik Dikirim Kembali ke Penerbit (B-07) */}
      {data.outgoing_tracking_no && (
        <section className="rounded-xl border border-civic-infoLine bg-civic-infoSoft/70 p-5 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-civic-infoLine pb-3">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-civic-info shrink-0" />
              <div>
                <h2 className="font-bold text-ink text-sm">
                  Pengembalian Naskah Fisik oleh LPMQ (Resi Keluar)
                </h2>
                <p className="text-xs text-ink-muted">
                  Tim Distributor telah mengirimkan naskah fisik beserta risalah catatan hasil tashih ke alamat Anda.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-civic-infoLine text-civic-info">
              Dalam Pengiriman Kembali
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-civic-infoLine/70 text-xs">
            <div>
              <span className="text-ink-muted block text-[11px]">Kurir / Ekspedisi:</span>
              <strong className="text-ink font-semibold">{data.outgoing_courier || 'Ekspedisi LPMQ'}</strong>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Nomor Resi:</span>
              <strong className="text-brand-800 font-mono font-bold">{data.outgoing_tracking_no}</strong>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Tanggal Kirim:</span>
              <span className="text-ink font-medium">
                {data.outgoing_dispatch_date
                  ? new Date(data.outgoing_dispatch_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Tercatat di Sistem'}
              </span>
            </div>
          </div>

          {data.outgoing_notes && (
            <div className="p-3 bg-white rounded-lg border border-civic-infoLine/60 text-xs text-ink-muted">
              <span className="font-bold text-ink">Catatan Petugas: </span>
              <span>{data.outgoing_notes}</span>
            </div>
          )}
        </section>
      )}
      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {/* Form 1: Pernyataan Jumlah Jilid Master Fisik */}
        <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-brand-800" />
                Pernyataan Jumlah Jilid Fisik
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Deklarasikan jumlah jilid master fisik yang diserahkan ke LPMQ.
              </p>
            </div>

            <div className="p-3 bg-canvas rounded-lg border border-line text-xs space-y-1">
              <p className="text-ink">
                Status Saat Ini: <strong>{data.physical_master_intake
                  ? `${data.physical_master_intake.volume_count} Jilid · ${
                      data.physical_master_intake.status === 'RECEIVED'
                        ? 'Telah Diterima LPMQ'
                        : 'Menunggu Verifikasi LPMQ'
                    }`
                  : 'Belum dideklarasikan (standar 30 jilid)'}</strong>
              </p>
              {data.physical_master_intake?.received_at && (
                <p className="text-xs text-ink-muted">
                  Diterima LPMQ pada: {new Date(data.physical_master_intake.received_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                </p>
              )}
            </div>

            {editable && data.physical_master_intake?.status !== 'RECEIVED' ? (
              <form onSubmit={savePhysical} className="space-y-3">
                <div>
                  <label htmlFor="publisher-master-count" className="block text-xs font-bold text-ink mb-1">
                    Jumlah jilid master fisik
                  </label>
                  <input
                    id="publisher-master-count"
                    type="number"
                    min="1"
                    max="100"
                    required
                    disabled={busy}
                    value={volumeCount}
                    onChange={(event) => setVolumeCount(event.target.value)}
                    className="w-full rounded-lg border border-line-strong p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm" disabled={busy} className="text-xs">
                  Simpan pernyataan fisik
                </Button>
              </form>
            ) : null}
          </div>

          {data.physical_master_intake?.status === 'RECEIVED' && (
            <div className="pt-3 border-t border-line mt-auto">
              <Button type="button" variant="outline" size="sm" onClick={showPhysicalReceipt} disabled={actionLoading} className="text-xs font-bold text-brand-800">
                <Printer className="w-3.5 h-3.5 mr-1.5 text-brand-700" />
                Lihat / Cetak PDF Tanda Terima Fisik
              </Button>
            </div>
          )}
        </section>

        {/* Form 2: Konfirmasi Pengiriman Berkas Fisik (U-09: Syarat Unduh Label Terlebih Dahulu) */}
        <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-800" />
                {data?.status === 'REVISION_REQUIRED' || data?.revision_source === 'TASHIH_REVISION' ? `Konfirmasi Pengiriman Naskah ${data?.revision_kind === 'NASKAH_DUMI' ? 'Dumi Final' : 'Perbaikan'} (Resi Masuk)` : 'Konfirmasi Pengiriman Berkas Fisik'}
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Catat kurir dan nomor resi pengiriman untuk memudahkan pelacakan berkas.
              </p>
            </div>

            {data.physical_master_intake?.status === 'RECEIVED' || data.physical_dispatch_status === 'DISPATCHED' ? (
              <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 text-xs text-ink space-y-2.5">
                <p className="font-bold text-brand-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                  Konfirmasi Pengiriman Tercatat di Sistem
                </p>
                <div className="text-xs text-ink space-y-1">
                  <p>Metode Pengantaran: <strong>{data.dispatch_courier || 'Antar Langsung ke LPMQ'}</strong></p>
                  {data.dispatch_tracking_no && (
                    <p>Nomor Resi / Keterangan: <strong className="font-mono text-brand-800">{data.dispatch_tracking_no}</strong></p>
                  )}
                  {data.dispatch_date && (
                    <p className="text-ink-muted text-xs">Tanggal Kirim: {new Date(data.dispatch_date).toLocaleDateString('id-ID')}</p>
                  )}
                </div>
                <p className="text-xs text-civic-info font-medium bg-white p-2.5 rounded-lg border border-line">
                  {data.physical_master_intake?.status === 'RECEIVED'
                    ? '✅ Berkas master fisik telah diterima LPMQ dan diverifikasi kelengkapannya.'
                    : '⏳ Berkas dalam proses pengantaran. Petugas LPMQ akan mengonfirmasi saat paket tiba di TMII.'}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenShippingLabel}
                    className="text-xs font-bold text-brand-800 border-brand-300 hover:bg-brand-50"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-brand-700" />
                    Unduh Label Pengiriman
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDispatch} className="space-y-3">
                {/* Notice U-09: Syarat Unduh Label Sebelum Kirim */}
                {!isLabelDownloaded ? (
                  <div className="p-3 rounded-lg bg-civic-warningSoft border border-civic-warningLine text-xs text-civic-warning flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-civic-warning" />
                    <div className="space-y-1">
                      <p className="font-bold">Wajib Unduh Label Pengiriman Terlebih Dahulu:</p>
                      <p className="leading-relaxed">
                        Silakan unduh dan cetak <strong>Label Pengiriman</strong> untuk ditempelkan pada paket naskah fisik sebelum mengonfirmasi pengiriman ke LPMQ.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Label pengiriman telah diunduh. Anda dapat melanjutkan konfirmasi pengiriman di bawah ini.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Metode Pengantaran / Ekspedisi
                  </label>
                  <select
                    disabled={busy}
                    value={dispatchData.courier}
                    onChange={(e) => setDispatchData({ ...dispatchData, courier: e.target.value })}
                    className="w-full rounded-lg border border-line-strong p-2 text-xs bg-white"
                  >
                    <option value="LOKET_LPMQ">Antar Langsung ke LPMQ TMII</option>
                    <option value="JNE">JNE Express</option>
                    <option value="POS_INDONESIA">Pos Indonesia</option>
                    <option value="TIKI">TIKI</option>
                    <option value="SICEPAT">SiCepat</option>
                    <option value="LAINNYA">Kurir / Ekspedisi Lainnya</option>
                  </select>
                </div>
                {data.status === 'REVISION_REQUIRED' && (
                  <div className="space-y-2 p-3.5 rounded-xl border border-brand-200 bg-brand-50/30">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        Berkas Rekapitulasi Perbaikan Penerbit
                      </label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                        Wajib Dilampirkan
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Unggah berkas daftar tindak lanjut butir perbaikan yang telah dilakukan penerbit sesuai catatan telaah sidang LPMQ (PDF/Word, maks. 25 MB).
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-300 bg-white hover:bg-brand-50 text-xs font-semibold text-brand-900 cursor-pointer transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-brand-700" />
                        <span>{uploadingRecap ? 'Mengunggah...' : dispatchData.recap_file_id ? 'Ganti Berkas Rekapitulasi' : 'Pilih Berkas Rekapitulasi'}</span>
                        <input
                          type="file"
                          onChange={handleRecapUpload}
                          disabled={busy || uploadingRecap}
                          accept=".pdf,.doc,.docx"
                          className="sr-only"
                        />
                      </label>
                      {recapFileName ? (
                        <span className="text-xs text-brand-800 font-medium inline-flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {recapFileName}
                        </span>
                      ) : dispatchData.recap_file_id ? (
                        <span className="text-xs text-brand-800 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                          Berkas rekapitulasi tersimpan
                        </span>
                      ) : (
                        <span className="text-xs text-ink-muted italic">Belum ada berkas dipilih</span>
                      )}
                    </div>
                    {uploadError && <p className="text-xs text-civic-danger">{uploadError}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Nomor Resi / Keterangan Tanda Kirim
                  </label>
                  <input
                    type="text"
                    disabled={busy}
                    value={dispatchData.tracking_no}
                    onChange={(e) => setDispatchData({ ...dispatchData, tracking_no: e.target.value })}
                    placeholder="Contoh: Resi JNE12345678 atau Diserahkan Staf PT"
                    className="w-full rounded-lg border border-line-strong p-2 text-xs bg-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant={isLabelDownloaded ? 'outline' : 'primary'}
                    size="sm"
                    onClick={handleOpenShippingLabel}
                    className={`text-xs font-bold w-full sm:w-auto ${
                      isLabelDownloaded
                        ? 'text-brand-800 border-brand-300 hover:bg-brand-50'
                        : 'bg-brand-700 hover:bg-brand-800 text-white'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-current" />
                    {isLabelDownloaded ? 'Unduh Ulang Label Pengiriman' : '1. Unduh Label Pengiriman'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || !isLabelDownloaded || uploadingRecap || (data.status === 'REVISION_REQUIRED' && !dispatchData.recap_file_id)}
                    variant={isLabelDownloaded && (!isRevisionRequired || dispatchData.recap_file_id) ? 'primary' : 'outline'}
                    size="sm"
                    title={!isLabelDownloaded ? 'Unduh label pengiriman terlebih dahulu' : (data.status === 'REVISION_REQUIRED' && !dispatchData.recap_file_id) ? 'Unggah berkas rekapitulasi perbaikan terlebih dahulu' : ''}
                    className={`text-xs font-bold w-full sm:w-auto ${
                      !isLabelDownloaded || (data.status === 'REVISION_REQUIRED' && !dispatchData.recap_file_id) ? 'opacity-50 cursor-not-allowed bg-surface-subtle text-ink-muted' : ''
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    2. Konfirmasi Pengiriman ke LPMQ
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
