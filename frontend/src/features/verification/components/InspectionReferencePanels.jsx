import React from 'react';
import { SlaIndicator } from '@/components/ui/SlaIndicator';
import { AssignedOfficer } from '@/components/ui/AssignedOfficer';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';
import { Button } from '@/components/ui/Button';
import { FileText, Building2, Clock, PackageCheck, Calendar, History, Copy, Check, Eye, Download, ExternalLink, BookOpen, Layers, FileCode, AlertCircle } from 'lucide-react';

export const InspectionReferencePanels = ({
  activeMobileTab, registration, publisher, notaDinas, assignment, formatDate,
  physicalMaster, detail, selectedFileId, setSelectedFileId, selectedFileObj,
  handleCopyReceipt, copiedReceipt,
}) => (
  <>
        <div
          className={`lg:col-span-3 space-y-4 ${
            activeMobileTab === 'ringkasan' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Identitas Naskah Card */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <div className="border-b border-slate-100 pb-2.5">
              <span className="font-mono text-slate-500 block text-[11px]">No. Registrasi:</span>
              <strong className="text-slate-900 font-bold font-mono text-xs block mt-0.5">
                #{registration.registration_no || 'REG-PENDING'}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Judul Naskah:</span>
              <p className="text-slate-800 font-semibold text-xs mt-0.5">
                “{registration.title || "Mushaf Al-Qur'an Standar Kemenag"}”
              </p>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1">
              <span className="text-slate-500 block text-[11px]">Penerbit Pemohon</span>
              <strong className="text-slate-800 font-semibold block">{publisher.legal_name || '-'}</strong>
              <p className="text-slate-500 text-[11px] truncate">{publisher.address || 'Alamat kantor terdaftar'}</p>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1">
              <span className="text-slate-500 block text-[11px]">Layanan & Kategori</span>
              <span className="font-medium text-slate-800 block">
                {registration.service_type?.name || 'Mushaf Standar'}
              </span>
              <span className="text-slate-500 text-[11px] block">
                {registration.service_type?.category?.name || 'Mushaf Cetak'}
              </span>
            </div>

            {notaDinas.document_no && (
              <div className="border-t border-slate-100 pt-2.5 space-y-1">
                <span className="text-slate-500 block text-[11px]">Dasar Penugasan Resmi</span>
                <span className="font-mono font-semibold text-emerald-900 block">
                  {notaDinas.document_no}
                </span>
                <span className="text-slate-400 text-[10px] block">
                  Penugasan: {formatDate(assignment.assigned_at)}
                </span>
              </div>
            )}
          </div>

          {/* SLA Card */}
          {assignment.sla && (
            <SlaIndicator
              dueDate={assignment.sla.due_at}
              isOverdue={assignment.sla.is_overdue}
              remainingMs={assignment.sla.remaining_ms}
              targetDuration={assignment.sla.duration_target || '2 hari'}
            />
          )}

          {/* Penerimaan Master Fisik Info */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <PackageCheck className="w-4 h-4 text-emerald-800" />
              <span>Master Fisik di Meja LPMQ</span>
            </div>
            {physicalMaster.receipt_no ? (
              <div className="space-y-1 text-slate-600 text-[11px]">
                <p>
                  No. Tanda Terima:{' '}
                  <strong className="font-mono text-slate-800">{physicalMaster.receipt_no}</strong>
                </p>
                <p>
                  Format: <strong>{physicalMaster.format || 'A4'}</strong> · {physicalMaster.volume_count || 30} Jilid
                </p>
                <p>Kondisi: <span className="font-semibold text-emerald-800">{physicalMaster.condition || 'Baik'}</span></p>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">
                Menunggu verifikasi penerimaan fisik master di loket LPMQ.
              </p>
            )}
          </div>

          {/* Riwayat Penugasan & Nota Dinas (if multiple assignments exist) */}
          {detail?.assignment_history?.length > 1 && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-100 pb-2">
                <History className="w-4 h-4 text-emerald-800" />
                <span>Riwayat Penugasan ({detail.assignment_history.length})</span>
              </div>
              <div className="space-y-2 divide-y divide-slate-100">
                {detail.assignment_history.map((h) => {
                  const hNota = h.documents?.find?.(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || h.documents?.[0];
                  const isCur = h.id === assignment.id;
                  return (
                    <div key={h.id} className={`pt-2 first:pt-0 text-[11px] space-y-1 ${isCur ? 'font-semibold text-emerald-900' : 'text-slate-600'}`}>
                      <div className="flex items-center justify-between">
                        <span>{h.verifier?.name || 'Verifikator'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.status === 'REVOKED' ? 'bg-rose-100 text-rose-800' : (isCur ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}`}>
                          {h.status === 'REVOKED' ? 'Dicabut' : h.status}
                        </span>
                      </div>
                      {hNota?.document_no && (
                        <div className="font-mono text-[10px] text-slate-500">
                          ND: {hNota.document_no}
                        </div>
                      )}
                      {h.revocation_reason && (
                        <div className="text-rose-700 text-[10px] italic">
                          Alasan: &ldquo;{h.revocation_reason}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Petugas Verifikator */}
          {assignment.assigned_to && (
            <AssignedOfficer
              officer={{
                name: assignment.assigned_to.name || 'Drs. H. M. Sholihin',
                nip: assignment.assigned_to.nip || '197508122002121002',
                role: 'Verifikator Berkas & Naskah',
              }}
              label="Verifikator Pemeriksa"
            />
          )}
        </div>

        {/* AREA 2: PrivateFileViewer / Berkas Digital (~5 cols on desktop) */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            activeMobileTab === 'dokumen' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Document Switcher Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                <h3 className="text-xs font-bold text-slate-900">
                  Pratinjau Dokumen Naskah
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {registration.manuscript_files?.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFileId(f.id)}
                    className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all ${
                      selectedFileId === f.id
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.file_type === 'COVER' ? 'Cover' : 'PDF Naskah'}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewer Pane */}
            <div className="p-3">
              {selectedFileObj ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span className="font-semibold truncate max-w-xs">
                      {selectedFileObj.file_name || selectedFileObj.original_name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Versi {selectedFileObj.version || 1}
                    </span>
                  </div>

                  {selectedFileObj.file_url ? (
                    <div className="h-[520px] rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      <iframe
                        src={`${selectedFileObj.file_url}#toolbar=0`}
                        title={selectedFileObj.file_name}
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <PrivateFileViewer
                      fileId={selectedFileObj.id}
                      fileName={selectedFileObj.file_name}
                      height="520px"
                    />
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">Tidak ada berkas digital terlampir.</p>
                </div>
              )}
            </div>
          </div>

          {/* Master Intake Receipt Card */}
          {physicalMaster.receipt_no && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px]">Tanda Terima Master Fisik:</span>
                <p className="font-mono font-bold text-slate-900">{physicalMaster.receipt_no}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyReceipt(physicalMaster.receipt_no)}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-600 bg-slate-50"
              >
                {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReceipt ? 'Tersalin' : 'Salin Nomor'}</span>
              </button>
            </div>
          )}
        </div>
  </>
);
