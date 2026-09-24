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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Kembalikan Draf ke Verifikator
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Berikan arahan perbaikan secara spesifik. Draf surat akan dikembalikan ke status pemeriksaan aktif verifikator.
            </p>

            <form onSubmit={handleReturnDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Alasan & Arahan Perbaikan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={returnReason}
                  maxLength={1000}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Format penulisan rasm pada draf surat perlu disesuaikan dengan ketentuan Surat Keputusan..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
                <span className="text-[11px] text-slate-400">Minimal 5 karakter.</span>
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
                  className="text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
                Serah-Terima Master Fisik ke Distributor (Langkah 7 SOP)
              </div>
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1 text-xs text-emerald-950">
              <p className="font-bold">Naskah: {registration.title}</p>
              <p>Nomor Registrasi: {registration.registration_no}</p>
              <p>Penerbit: {publisher.legal_name}</p>
            </div>

            {handoverModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{handoverModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateHandover} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pilih Petugas Distributor Penerima <span className="text-rose-600">*</span>
                </label>
                {distributors.length > 0 ? (
                  <select
                    value={selectedDistributorId}
                    onChange={(e) => setSelectedDistributorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    required
                  >
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.nip ? `(NIP: ${d.nip})` : ''} - Petugas Distributor
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    Tidak ditemukan petugas Distributor aktif. Hubungi Administrator.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Kondisi Fisik Master <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={handoverCondition}
                    onChange={(e) => setHandoverCondition(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    required
                  >
                    <option value="BAIK">BAIK (Rapi & Lengkap)</option>
                    <option value="LENGKAP">LENGKAP (30 Juz A4)</option>
                    <option value="CUKUP">CUKUP</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Jumlah Jilid Fisik <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={handoverVolumeCount}
                    onChange={(e) => setHandoverVolumeCount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan Penyerahan Verifikator (Opsional)
                </label>
                <textarea
                  value={handoverNotes}
                  maxLength={1000}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Contoh: Master cetak A4 dijilid spiral per juz lengkap 1-30 juz diserahkan di loket pentashihan..."
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
                  className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-5 py-2.5"
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
