import React from 'react';
import { CheckCircle2, X, AlertCircle, AlertTriangle, FileText, PackageCheck, Clock, Calendar, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const HandoverDialogs = ({
  receiveModalOpen, selectedHandover, setReceiveModalOpen, receiveModalError,
  handleReceiveSubmit, receiveCondition, setReceiveCondition, receiveVolumeCount,
  setReceiveVolumeCount, tashihDueAt, setTashihDueAt, receiveNotes, setReceiveNotes,
  actionLoading, returnModalOpen, setReturnModalOpen, returnModalError,
  handleReturnSubmit, returnReason, setReturnReason, detailModalOpen, detailHandover,
  setDetailModalOpen, formatDate, formatDateOnly, renderHandoverBadge,
}) => (
  <>
      {/* Modal Konfirmasi Penerimaan Master Fisik (Langkah 8 SOP) */}
      {receiveModalOpen && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand-800 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-brand-700" />
                Konfirmasi Penerimaan Master Fisik (Langkah 8 SOP)
              </div>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-xl space-y-1 text-xs text-brand-900">
              <p className="font-bold">Naskah: {selectedHandover.registration?.title}</p>
              <p>Nomor Registrasi: {selectedHandover.registration?.registration_no}</p>
              <p>No. BAST: {selectedHandover.receipt_no}</p>
            </div>

            {receiveModalError && (
              <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl text-xs text-civic-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-civic-danger flex-shrink-0" />
                <span>{receiveModalError}</span>
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">
                    Kondisi Fisik Master <span className="text-civic-danger">*</span>
                  </label>
                  <select
                    value={receiveCondition}
                    onChange={(e) => setReceiveCondition(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-medium"
                    required
                  >
                    <option value="BAIK">BAIK (Rapi & Lengkap)</option>
                    <option value="LENGKAP">LENGKAP (30 Juz A4)</option>
                    <option value="CUKUP">CUKUP (Dapat Disidangkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">
                    Jumlah Jilid Fisik <span className="text-civic-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={receiveVolumeCount}
                    onChange={(e) => setReceiveVolumeCount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">
                  Tenggat Waktu Pentashihan (Tashih Due At) <span className="text-civic-danger">*</span>
                </label>
                <input
                  type="date"
                  value={tashihDueAt}
                  onChange={(e) => setTashihDueAt(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-semibold text-ink"
                  required
                />
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Standar target pentashihan tim sidang adalah 30 hari kalender sejak master fisik diterima resmi di loket.
                </span>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">
                  Catatan Penerimaan Loket (Opsional)
                </label>
                <textarea
                  value={receiveNotes}
                  maxLength={1000}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Catatan kondisi jilid atau penanda naskah saat diterima di loket..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReceiveModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="text-xs bg-[#146C43] hover:bg-[#0E5139] text-white font-bold px-5 py-2.5"
                >
                  {actionLoading ? 'Memproses...' : 'Sahkan Penerimaan & Lanjut Distribusi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Penolakan / Pengembalian Fisik Cacat */}
      {returnModalOpen && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-civic-danger font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-civic-danger" />
                Kembalikan Master Fisik (Cacat Fisik)
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Master fisik yang dikembalikan akan memindahkan status pengajuan naskah kembali ke{' '}
              <span className="font-bold text-civic-warning">Perlu Perbaikan Fisik (PHYSICAL_HANDOVER_CORRECTION_REQUIRED)</span>. Pembayaran PNBP yang telah diverifikasi tetap sah (tanpa tagihan ulang) dan penerbit hanya perlu memperbaiki master fisik.
            </p>

            {returnModalError && (
              <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl text-xs text-civic-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-civic-danger flex-shrink-0" />
                <span>{returnModalError}</span>
              </div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">
                  Alasan Pengembalian / Kerusakan Fisik <span className="text-civic-danger">*</span>
                </label>
                <textarea
                  value={returnReason}
                  maxLength={1000}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Jilid 14 halaman 12 robek dan buram, tidak memenuhi syarat naskah cetak A4..."
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-danger/20 focus:border-civic-danger"
                  required
                />
                <span className="text-[11px] text-ink-muted">Minimal 5 karakter.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReturnModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || returnReason.trim().length < 5}
                  className="text-xs bg-civic-danger hover:bg-civic-danger text-white font-bold px-5 py-2.5"
                >
                  {actionLoading ? 'Mengembalikan...' : 'Kembalikan Master Fisik'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail BAST */}
      {detailModalOpen && detailHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-ink font-bold text-base">
                <FileText className="w-5 h-5 text-brand-700" />
                Detail Berita Acara Serah Terima (BAST) Fisik
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-canvas rounded-xl border border-line/70">
                <div>
                  <span className="text-ink-muted block font-medium">Nomor BAST:</span>
                  <span className="font-mono font-bold text-ink text-sm">
                    {detailHandover.receipt_no}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block font-medium">Status Serah-Terima:</span>
                  <div className="mt-1">{renderHandoverBadge(detailHandover.status)}</div>
                </div>
                <div>
                  <span className="text-ink-muted block font-medium">Nomor Registrasi:</span>
                  <span className="font-mono font-semibold text-brand-800">
                    {detailHandover.registration?.registration_no}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block font-medium">Judul Naskah:</span>
                  <span className="font-bold text-ink">{detailHandover.registration?.title}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-line rounded-xl space-y-1">
                  <p className="font-bold text-ink">Pihak Pertama (Menyerahkan)</p>
                  <p className="text-ink-muted">Nama: {detailHandover.from_user?.name || '-'}</p>
                  <p className="text-ink-muted">NIP: {detailHandover.from_user?.nip || '-'}</p>
                  <p className="text-ink-muted">Waktu: {formatDate(detailHandover.handed_over_at)}</p>
                </div>

                <div className="p-3 border border-line rounded-xl space-y-1">
                  <p className="font-bold text-ink">Pihak Kedua (Menerima)</p>
                  <p className="text-ink-muted">Nama: {detailHandover.to_user?.name || '-'}</p>
                  <p className="text-ink-muted">NIP: {detailHandover.to_user?.nip || '-'}</p>
                  <p className="text-ink-muted">
                    Waktu Terima: {detailHandover.received_at ? formatDate(detailHandover.received_at) : '-'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-canvas border border-line rounded-xl space-y-1">
                <p className="font-bold text-ink">Kondisi & Kelengkapan</p>
                <p className="text-ink">
                  Jumlah: <span className="font-semibold">{detailHandover.volume_count} Jilid A4 (Per Juz)</span>
                </p>
                <p className="text-ink">
                  Kondisi: <span className="font-semibold">{detailHandover.condition || 'BAIK'}</span>
                </p>
                {detailHandover.tashih_due_at && (
                  <p className="text-brand-800 font-bold">
                    Tenggat Pentashihan: {formatDateOnly(detailHandover.tashih_due_at)}
                  </p>
                )}
                {detailHandover.notes && (
                  <p className="text-ink-muted pt-1 border-t border-line whitespace-pre-line">
                    Catatan: {detailHandover.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-line">
              <Button
                variant="outline"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
  </>
);
