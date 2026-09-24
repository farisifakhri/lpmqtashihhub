import React from 'react';
import { Users, RefreshCw, CheckCircle2, PackageCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const TeamAssignmentPanel = ({ distLoading, waitingDistRegistrations, fetchDistributionData, isAdmin, setAssignmentModalId }) => (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                Naskah Siap Penugasan Tim Pentashih (Langkah 1 SOP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Naskah yang telah lolos verifikasi, lunas PNBP, dan fisik master telah diterima loket distributor.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDistributionData}
              disabled={distLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${distLoading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>

          {distLoading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-700" />
              <p className="text-xs font-semibold">Memuat naskah siap distribusi...</p>
            </div>
          ) : waitingDistRegistrations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Tidak ada naskah yang menunggu penugasan</p>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh naskah yang telah diterima fisiknya sudah ditetapkan SK Tim Pentashihnya.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-6">Nomor & Tanggal</th>
                    <th className="py-3 px-6">Judul Naskah & Penerbit</th>
                    <th className="py-3 px-6">Layanan</th>
                    <th className="py-3 px-6">Kesiapan Berkas</th>
                    <th className="py-3 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {waitingDistRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900 block">
                          {reg.registration_no}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(reg.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block line-clamp-1">
                          {reg.title}
                        </span>
                        <span className="text-emerald-800 font-semibold text-[11px]">
                          {reg.publisher?.legal_name || 'Penerbit'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-slate-800 block">
                          {reg.service_type?.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {reg.service_type?.category?.name || 'Mushaf Cetak'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> PNBP Lunas
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 block w-fit">
                            <PackageCheck className="w-3 h-3" /> Fisik Diterima
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isAdmin ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setAssignmentModalId(reg.id)}
                            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                            icon={<Users className="w-3.5 h-3.5" />}
                          >
                            Tetapkan Tim Sidang
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" /> Menunggu penetapan oleh Admin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
);
