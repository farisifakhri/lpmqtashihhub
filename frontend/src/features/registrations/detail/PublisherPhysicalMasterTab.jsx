import React from 'react';
import {
  PackageCheck,
  BookOpen,
  MapPin,
  Printer,
  Truck,
  CheckCircle2,
  Download,
  Send,
} from 'lucide-react';
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
            <p className="text-[11px] text-ink-muted mt-0.5">
              Sesuai SOP LPMQ Kemenag RI, pemeriksaan fisik naskah memerlukan master fisik lengkap.
            </p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
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
            <ul className="list-disc list-inside space-y-1 text-ink-muted leading-relaxed text-[11px]">
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
            <div className="text-ink-muted space-y-1 text-[11px] leading-relaxed">
              <p className="font-bold text-ink">Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)</p>
              <p>Gedung Bayt Al-Qur'an & Museum Istiqlal, Jl. Raya TMII Pintu I</p>
              <p>Kel. Pinang Ranti, Kec. Makasar, Jakarta Timur 13560</p>
              <p className="pt-1 text-ink">Jam Layanan: Senin – Jumat, 08.00 – 15.00 WIB</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Form 1: Pernyataan Jumlah Jilid Master Fisik */}
        <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-brand-800" />
              Pernyataan Jumlah Jilid Fisik
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
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
              <p className="text-[11px] text-ink-muted">
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

          {data.physical_master_intake?.status === 'RECEIVED' && (
            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={showPhysicalReceipt} disabled={actionLoading} className="text-xs font-bold text-brand-800">
                <Printer className="w-3.5 h-3.5 mr-1.5 text-brand-700" />
                Lihat / Cetak PDF Tanda Terima Fisik
              </Button>
            </div>
          )}
        </section>

        {/* Form 2: Konfirmasi Pengiriman Berkas Fisik */}
        <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
          <div className="border-b border-line pb-3">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-800" />
              Konfirmasi Pengiriman Berkas Fisik
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
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
                  <p className="text-ink-muted text-[11px]">Tanggal Kirim: {new Date(data.dispatch_date).toLocaleDateString('id-ID')}</p>
                )}
              </div>
              <p className="text-[11px] text-civic-info font-medium bg-white p-2.5 rounded-lg border border-line">
                {data.physical_master_intake?.status === 'RECEIVED'
                  ? '✅ Berkas master fisik telah diterima LPMQ dan diverifikasi kelengkapannya.'
                  : '⏳ Berkas dalam proses pengantaran. Petugas LPMQ akan mengonfirmasi saat paket tiba di TMII.'}
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShippingLabel(true)}
                  className="text-xs font-bold text-brand-800 border-brand-300 hover:bg-brand-50"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-brand-700" />
                  Unduh Label Pengiriman
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="space-y-3">
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
              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="submit" disabled={busy} variant="primary" size="sm" className="text-xs font-bold w-full sm:w-auto">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Konfirmasi Pengiriman Berkas ke LPMQ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShippingLabel(true)}
                  className="text-xs font-bold w-full sm:w-auto text-brand-800 border-brand-300 hover:bg-brand-50"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-brand-700" />
                  Unduh Label Pengiriman
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
