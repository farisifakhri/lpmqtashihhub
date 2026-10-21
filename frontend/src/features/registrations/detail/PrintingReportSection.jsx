import React, { useState, useEffect } from 'react';
import {
  Printer,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  Building2,
  Calendar,
  Layers,
  FileCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { documentationApi } from '@/api/documentation.api';

export function PrintingReportSection({ registrationId, isPublisher = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    batch_no: 1,
    print_date: new Date().toISOString().slice(0, 10),
    oplah_printed: '',
    printer_name: '',
    printer_location: '',
    exemplar_sent: false,
    exemplar_tracking_no: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentationApi.getPrintingReports(registrationId);
      const resData = res?.data || res;
      setData(resData);
      if (resData?.reports?.length) {
        setForm((prev) => ({
          ...prev,
          batch_no: resData.reports.length + 1,
        }));
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data laporan pencetakan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (registrationId) {
      loadData();
    }
  }, [registrationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!form.print_date) {
      setFormError('Tanggal pencetakan wajib diisi.');
      return;
    }
    const oplahNum = Number(form.oplah_printed);
    if (!oplahNum || oplahNum < 1) {
      setFormError('Jumlah oplah dicetak minimal 1 eksemplar.');
      return;
    }
    if (!form.printer_name.trim()) {
      setFormError('Nama perusahaan percetakan wajib diisi.');
      return;
    }
    if (!form.printer_location.trim()) {
      setFormError('Lokasi / kota percetakan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await documentationApi.createPrintingReport(registrationId, {
        batch_no: Number(form.batch_no),
        print_date: form.print_date,
        oplah_printed: oplahNum,
        printer_name: form.printer_name.trim(),
        printer_location: form.printer_location.trim(),
        exemplar_sent: Boolean(form.exemplar_sent),
        exemplar_tracking_no: form.exemplar_tracking_no ? form.exemplar_tracking_no.trim() : null,
        notes: form.notes ? form.notes.trim() : null,
      });

      setSuccessMsg('Laporan realisasi pencetakan berhasil dikirimkan.');
      setModalOpen(false);
      setForm({
        batch_no: (data?.reports?.length || 0) + 2,
        print_date: new Date().toISOString().slice(0, 10),
        oplah_printed: '',
        printer_name: '',
        printer_location: '',
        exemplar_sent: false,
        exemplar_tracking_no: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Gagal mengirim laporan pencetakan.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = data?.summary || {};
  const reports = data?.reports || [];
  const stt = data?.stt || {};

  return (
    <section className="rounded-xl border border-line bg-white p-5 space-y-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="font-bold text-ink text-sm flex items-center gap-2">
            <Printer className="w-4 h-4 text-brand-800" />
            Laporan Realisasi Pencetakan & Penyerahan 5 Eksemplar
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Kewajiban pelaporan berkala pencetakan massal Al-Qur'an dan penyerahan 5 (lima) eksemplar terbitan final ke LPMQ sesuai Surat Tanda Tashih.
          </p>
        </div>

        {isPublisher && (
          <Button
            size="sm"
            onClick={() => {
              setFormError('');
              setModalOpen(true);
            }}
            className="text-xs font-semibold bg-brand-800 hover:bg-brand-900 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Laporkan Pencetakan Baru
          </Button>
        )}
      </div>

      {successMsg && (
        <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Banner Status Kewajiban 5 Eksemplar */}
      {summary.exemplar_received_by_lpmq ? (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 space-y-0.5">
            <p className="font-bold">5 Eksemplar Terbitan Fisik Telah Diterima & Diarsipkan LPMQ</p>
            <p className="text-emerald-700">
              Dokumentator LPMQ telah memverifikasi fisik naskah mushaf Al-Qur'an dan mengarsipkannya pada dokumentasi resmi. Kewajiban eksemplar Anda dinyatakan terpenuhi.
            </p>
          </div>
        </div>
      ) : summary.has_delivered_exemplars ? (
        <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl flex items-start gap-3">
          <Truck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900 space-y-0.5">
            <p className="font-bold">5 Eksemplar Fisik Dilaporkan Telah Dikirimkan / Diserahkan</p>
            <p className="text-sky-700">
              Laporan pengiriman 5 eksemplar terbitan perdana telah dicatat. Saat ini sedang menunggu verifikasi fisik oleh tim Dokumentator di Bayt Al-Qur'an & Museum Istiqlal TMII Jakarta.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-0.5">
            <p className="font-bold">Perhatian: Kewajiban 5 Eksemplar Terbitan Final (Cetakan Pertama)</p>
            <p className="text-amber-800">
              Sesuai ketentuan Surat Tanda Tashih (STT), penerbit <strong>wajib menyerahkan 5 (lima) eksemplar</strong> hasil cetak perdana kepada LPMQ paling lambat <strong>1 (satu) bulan kalender</strong> setelah pelaksanaan pencetakan selesai.
            </p>
          </div>
        </div>
      )}

      {/* Statistik Kuota Oplah */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-canvas rounded-xl border border-line">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-700" />
            Izin Kuota STT
          </span>
          <p className="text-base font-bold text-ink mt-1">
            {Number(summary.total_oplah_allowed || 0).toLocaleString('id-ID')}
            <span className="text-xs font-normal text-ink-muted ml-1">Eks</span>
          </p>
          <span className="text-[11px] text-ink-muted">Sesuai penetapan STT</span>
        </div>

        <div className="p-3 bg-canvas rounded-xl border border-line">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-sky-700" />
            Realisasi Dicetak
          </span>
          <p className="text-base font-bold text-sky-900 mt-1">
            {Number(summary.total_oplah_printed || 0).toLocaleString('id-ID')}
            <span className="text-xs font-normal text-ink-muted ml-1">Eks</span>
          </p>
          <span className="text-[11px] text-sky-700 font-medium">{summary.percentage_printed || 0}% kuota</span>
        </div>

        <div className="p-3 bg-canvas rounded-xl border border-line">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
            Sisa Kuota Oplah
          </span>
          <p className={`text-base font-bold mt-1 ${summary.is_quota_exceeded ? 'text-rose-600' : 'text-emerald-700'}`}>
            {Number(summary.remaining_oplah || 0).toLocaleString('id-ID')}
            <span className="text-xs font-normal text-ink-muted ml-1">Eks</span>
          </p>
          <span className="text-[11px] text-ink-muted">
            {summary.is_quota_exceeded ? 'Melebihi izin STT' : 'Dapat dicetak'}
          </span>
        </div>

        <div className="p-3 bg-canvas rounded-xl border border-line">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-700" />
            5 Eksemplar Fisik
          </span>
          <p className="text-sm font-bold text-ink mt-1">
            {summary.exemplar_received_by_lpmq ? (
              <span className="text-emerald-700">Diterima (5/5)</span>
            ) : summary.has_delivered_exemplars ? (
              <span className="text-sky-700">Terkirim</span>
            ) : (
              <span className="text-amber-700">Belum Terpenuhi</span>
            )}
          </p>
          <span className="text-[11px] text-ink-muted">Target: 5 Eksemplar</span>
        </div>
      </div>

      {/* Tabel Riwayat Laporan Pencetakan */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
          Riwayat Laporan Realisasi Pencetakan ({reports.length})
        </h3>

        {loading ? (
          <p className="text-xs text-ink-muted italic p-4 text-center">Memuat data laporan pencetakan…</p>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-line rounded-xl bg-canvas space-y-2">
            <Printer className="w-8 h-8 text-ink-muted mx-auto stroke-1" />
            <p className="text-xs font-semibold text-ink">Belum Ada Laporan Realisasi Pencetakan</p>
            <p className="text-xs text-ink-muted max-w-md mx-auto">
              Setelah mencetak naskah di percetakan, laporkan kloter pencetakan dan konfirmasikan pengiriman 5 eksemplar fisik ke LPMQ melalui tombol di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-ink-muted font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Batch / Cetakan</th>
                  <th className="py-2.5 px-3">Tanggal Cetak</th>
                  <th className="py-2.5 px-3 text-right">Oplah Cetak</th>
                  <th className="py-2.5 px-3">Percetakan & Lokasi</th>
                  <th className="py-2.5 px-3">Status 5 Eksemplar</th>
                  <th className="py-2.5 px-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reports.map((rep) => (
                  <tr key={rep.id || rep.batch_no} className="hover:bg-canvas/50">
                    <td className="py-2.5 px-3 font-semibold text-brand-800">
                      Cetakan Ke-{rep.batch_no}
                    </td>
                    <td className="py-2.5 px-3 text-ink whitespace-nowrap">
                      {rep.print_date}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-ink whitespace-nowrap">
                      {Number(rep.oplah_printed || 0).toLocaleString('id-ID')} Eks
                    </td>
                    <td className="py-2.5 px-3 text-ink">
                      <p className="font-semibold text-ink">{rep.printer_name}</p>
                      <p className="text-[11px] text-ink-muted">{rep.printer_location}</p>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {rep.exemplar_sent ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">
                            <Truck className="w-2.5 h-2.5" />
                            Diserahkan / Dikirim
                          </span>
                          {rep.exemplar_tracking_no && (
                            <p className="font-mono text-[10px] text-ink-muted">Resi: {rep.exemplar_tracking_no}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-canvas text-ink-muted border border-line">
                          Belum dikirim
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted max-w-[200px] truncate" title={rep.notes || '-'}>
                      {rep.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Form Laporan Pencetakan */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-brand-800" />
                  Formulir Laporan Pencetakan Al-Qur'an
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Isikan data realisasi pelaksanaan pencetakan fisik mushaf.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-canvas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Cetakan Ke- (Batch No) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.batch_no}
                    onChange={(e) => setForm({ ...form, batch_no: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-ink focus:border-brand-700 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Tanggal Pencetakan *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.print_date}
                    onChange={(e) => setForm({ ...form, print_date: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-ink focus:border-brand-700 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">
                  Jumlah Oplah Dicetak (Eksemplar) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Contoh: 5000"
                  value={form.oplah_printed}
                  onChange={(e) => setForm({ ...form, oplah_printed: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-ink focus:border-brand-700 focus:bg-white text-xs"
                />
                <span className="text-[11px] text-ink-muted mt-0.5 block">
                  Sisa kuota izin STT saat ini: {Number(summary.remaining_oplah || 0).toLocaleString('id-ID')} eksemplar.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Nama Perusahaan Percetakan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Percetakan Grafika"
                    value={form.printer_name}
                    onChange={(e) => setForm({ ...form, printer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-ink focus:border-brand-700 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Kota / Lokasi Percetakan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kudus, Jawa Tengah"
                    value={form.printer_location}
                    onChange={(e) => setForm({ ...form, printer_location: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-ink focus:border-brand-700 focus:bg-white text-xs"
                  />
                </div>
              </div>

              {/* Pemenuhan 5 Eksemplar */}
              <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.exemplar_sent}
                    onChange={(e) => setForm({ ...form, exemplar_sent: e.target.checked })}
                    className="mt-0.5 rounded border-brand-300 text-brand-800 focus:ring-brand-700"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-brand-900 block">
                      5 (Lima) eksemplar cetakan fisik pertama telah disiapkan / dikirimkan ke LPMQ
                    </span>
                    <span className="text-ink-muted text-[11px]">
                      Centang jika pada batch cetak ini penerbit telah menyerahkan/mengirim 5 eksemplar fisik ke Bayt Al-Qur'an & Museum Istiqlal TMII Jakarta Timur.
                    </span>
                  </div>
                </label>

                {form.exemplar_sent && (
                  <div className="pt-2 border-t border-brand-100 animate-fadeIn">
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Nomor Resi Ekspedisi / Keterangan Kirim (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: JNE-88291039 / Diserahkan Langsung"
                      value={form.exemplar_tracking_no}
                      onChange={(e) => setForm({ ...form, exemplar_tracking_no: e.target.value })}
                      className="w-full px-3 py-1.5 border border-line rounded-lg bg-white text-ink focus:border-brand-700 text-xs"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan spesifikasi jilid, kertas, atau kloter cetak..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-ink focus:border-brand-700 focus:bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold bg-brand-800 hover:bg-brand-900 text-white"
                >
                  {submitting ? 'Menyimpan…' : 'Simpan Laporan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default PrintingReportSection;
