import React from 'react';
import { Button } from '@/components/ui/Button';
import { X, AlertCircle, AlertTriangle, PackageCheck, CheckCircle2, Building2, FileText, Info } from 'lucide-react';

export const InspectionDialogs = ({
  returnModalOpen, setReturnModalOpen, returnReason, setReturnReason,
  handleReturnDocument, actionLoading, handoverModalOpen, setHandoverModalOpen,
  registration, publisher, handoverModalError, handleCreateHandover,
  distributors, selectedDistributorId, setSelectedDistributorId,
  handoverCondition, setHandoverCondition, handoverVolumeCount, setHandoverVolumeCount,
  handoverNotes, setHandoverNotes,
}) => (
  <>
      {/* Return Modal (Kepala LPMQ) */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-civic-danger font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-civic-danger" />
                Kembalikan Draf ke Verifikator
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Berikan arahan perbaikan secara spesifik. Draf surat akan dikembalikan ke status pemeriksaan aktif verifikator.
            </p>

            <form onSubmit={handleReturnDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Alasan & Arahan Perbaikan <span className="text-civic-danger">*</span>
                </label>
                <textarea
                  value={returnReason}
                  maxLength={1000}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Format penulisan rasm pada draf surat perlu disesuaikan dengan ketentuan Surat Keputusan..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-civic-danger/20 focus:border-civic-danger"
                  required
                />
                <span className="text-[11px] text-ink-muted">Minimal 5 karakter.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
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
                  className="text-xs bg-civic-danger hover:bg-civic-danger text-white font-bold"
                >
                  {actionLoading ? 'Mengembalikan...' : 'Kembalikan Draf'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Serah-Terima Master Fisik ke Distributor (Langkah 7 SOP) */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
                <PackageCheck className="w-5 h-5 text-brand-700" />
                Serah-Terima Master Fisik ke Distributor (Langkah 7 SOP)
              </div>
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="text-ink-muted hover:text-ink-muted p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-lg space-y-1 text-xs text-brand-950">
              <p className="font-bold">Naskah: {registration.title}</p>
              <p>Nomor Registrasi: {registration.registration_no}</p>
              <p>Penerbit: {publisher.legal_name}</p>
            </div>

            {handoverModalError && (
              <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-xs text-civic-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-civic-danger shrink-0" />
                <span>{handoverModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateHandover} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">
                  Pilih Petugas Distributor Penerima <span className="text-civic-danger">*</span>
                </label>
                {distributors.length > 0 ? (
                  <select
                    value={selectedDistributorId}
                    onChange={(e) => setSelectedDistributorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 font-medium"
                    required
                  >
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.nip ? `(NIP: ${d.nip})` : ''} - Petugas Distributor
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-civic-warningSoft border border-civic-warningLine rounded-lg text-civic-warning">
                    Tidak ditemukan petugas Distributor aktif. Hubungi Administrator.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">
                    Kondisi Fisik Master <span className="text-civic-danger">*</span>
                  </label>
                  <select
                    value={handoverCondition}
                    onChange={(e) => setHandoverCondition(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 font-medium"
                    required
                  >
                    <option value="BAIK">BAIK (Rapi & Lengkap)</option>
                    <option value="LENGKAP">LENGKAP (30 Juz A4)</option>
                    <option value="CUKUP">CUKUP</option>
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
                    value={handoverVolumeCount}
                    onChange={(e) => setHandoverVolumeCount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">
                  Catatan Penyerahan Verifikator (Opsional)
                </label>
                <textarea
                  value={handoverNotes}
                  maxLength={1000}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Contoh: Master cetak A4 dijilid spiral per juz lengkap 1-30 juz diserahkan di loket pentashihan..."
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHandoverModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !selectedDistributorId}
                  className="text-xs bg-brand-800 hover:bg-brand-900 text-white font-bold px-5 py-2.5"
                >
                  {actionLoading ? 'Menerbitkan BAST...' : 'Serahkan & Terbitkan BAST'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
  </>
);
