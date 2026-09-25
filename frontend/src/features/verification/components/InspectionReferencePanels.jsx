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
          <div className="p-4 bg-white rounded-xl border border-line shadow-2xs space-y-3 text-xs">
            <div className="border-b border-line pb-2.5">
              <span className="font-mono text-ink-muted block text-[11px]">No. Registrasi:</span>
              <strong className="text-ink font-bold font-mono text-xs block mt-0.5">
                #{registration.registration_no || 'REG-PENDING'}
              </strong>
            </div>

            <div>
              <span className="text-ink-muted block text-[11px]">Judul Naskah:</span>
              <p className="text-ink font-semibold text-xs mt-0.5">
                “{registration.title || "Mushaf Al-Qur'an Standar Kemenag"}”
              </p>
            </div>

            <div className="border-t border-line pt-2.5 space-y-1">
              <span className="text-ink-muted block text-[11px]">Penerbit Pemohon</span>
              <strong className="text-ink font-semibold block">{publisher.legal_name || '-'}</strong>
              <p className="text-ink-muted text-[11px] truncate">{publisher.address || 'Alamat kantor terdaftar'}</p>
            </div>

            <div className="border-t border-line pt-2.5 space-y-1">
              <span className="text-ink-muted block text-[11px]">Layanan & Kategori</span>
              <span className="font-medium text-ink block">
                {registration.service_type?.name || 'Mushaf Standar'}
              </span>
              <span className="text-ink-muted text-[11px] block">
                {registration.service_type?.category?.name || 'Mushaf Cetak'}
              </span>
            </div>

            {notaDinas.document_no && (
              <div className="border-t border-line pt-2.5 space-y-1">
                <span className="text-ink-muted block text-[11px]">Dasar Penugasan Resmi</span>
                <span className="font-mono font-semibold text-brand-900 block">
                  {notaDinas.document_no}
                </span>
                <span className="text-ink-muted text-[10px] block">
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
          <div className="p-4 bg-canvas rounded-xl border border-line text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <PackageCheck className="w-4 h-4 text-brand-800" />
              <span>Master Fisik di Meja LPMQ</span>
            </div>
            {physicalMaster.receipt_no ? (
              <div className="space-y-1 text-ink-muted text-[11px]">
                <p>
                  No. Tanda Terima:{' '}
                  <strong className="font-mono text-ink">{physicalMaster.receipt_no}</strong>
                </p>
                <p>
                  Format: <strong>{physicalMaster.format || 'A4'}</strong> · {physicalMaster.volume_count || 30} Jilid
                </p>
                <p>Kondisi: <span className="font-semibold text-brand-800">{physicalMaster.condition || 'Baik'}</span></p>
              </div>
            ) : (
              <p className="text-ink-muted text-[11px]">
                Menunggu verifikasi penerimaan fisik master di loket LPMQ.
              </p>
            )}
          </div>

          {/* Riwayat Penugasan & Nota Dinas (if multiple assignments exist) */}
          {detail?.assignment_history?.length > 1 && (
            <div className="p-4 bg-white rounded-xl border border-line shadow-2xs space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-ink border-b border-line pb-2">
                <History className="w-4 h-4 text-brand-800" />
                <span>Riwayat Penugasan ({detail.assignment_history.length})</span>
              </div>
              <div className="space-y-2 divide-y divide-line">
                {detail.assignment_history.map((h) => {
                  const hNota = h.documents?.find?.(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || h.documents?.[0];
                  const isCur = h.id === assignment.id;
                  return (
                    <div key={h.id} className={`pt-2 first:pt-0 text-[11px] space-y-1 ${isCur ? 'font-semibold text-brand-900' : 'text-ink-muted'}`}>
                      <div className="flex items-center justify-between">
                        <span>{h.verifier?.name || 'Verifikator'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.status === 'REVOKED' ? 'bg-civic-dangerSoft text-civic-danger' : (isCur ? 'bg-brand-100 text-brand-800' : 'bg-surface-subtle text-ink')}`}>
                          {h.status === 'REVOKED' ? 'Dicabut' : h.status}
                        </span>
                      </div>
                      {hNota?.document_no && (
                        <div className="font-mono text-[10px] text-ink-muted">
                          ND: {hNota.document_no}
                        </div>
                      )}
                      {h.revocation_reason && (
                        <div className="text-civic-danger text-[10px] italic">
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
          <div className="bg-white rounded-xl border border-line shadow-2xs overflow-hidden">
            {/* Document Switcher Header */}
            <div className="p-3 bg-canvas border-b border-line flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-800" />
                <h3 className="text-xs font-bold text-ink">
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
                        ? 'bg-brand-800 text-white shadow-2xs'
                        : 'bg-white text-ink border border-line hover:bg-canvas'
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
                  <div className="flex items-center justify-between text-xs text-ink-muted px-1">
                    <span className="font-semibold truncate max-w-xs">
                      {selectedFileObj.file_name || selectedFileObj.original_name}
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      Versi {selectedFileObj.version || 1}
                    </span>
                  </div>

                  {selectedFileObj.file_url ? (
                    <div className="h-[520px] rounded-lg border border-line overflow-hidden bg-surface-subtle flex items-center justify-center relative">
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
                <div className="py-20 text-center text-ink-muted space-y-2">
                  <FileText className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">Tidak ada berkas digital terlampir.</p>
                </div>
              )}
            </div>
          </div>

          {/* Master Intake Receipt Card */}
          {physicalMaster.receipt_no && (
            <div className="p-4 bg-white rounded-xl border border-line shadow-2xs flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-ink-muted text-[11px]">Tanda Terima Master Fisik:</span>
                <p className="font-mono font-bold text-ink">{physicalMaster.receipt_no}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyReceipt(physicalMaster.receipt_no)}
                className="inline-flex items-center gap-1 text-ink hover:text-brand-800 text-xs px-2.5 py-1.5 rounded-lg border border-line hover:border-brand-700 bg-canvas"
              >
                {copiedReceipt ? <Check className="w-3.5 h-3.5 text-brand-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReceipt ? 'Tersalin' : 'Salin Nomor'}</span>
              </button>
            </div>
          )}
        </div>
  </>
);
