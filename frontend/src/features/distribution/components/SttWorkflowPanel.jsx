import React from 'react';
import {
  FileCheck2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { sttParafProgress } from '@/lib/stt-paraf';

export const SttWorkflowPanel = ({
  distLoading,
  readyRegistrations,
  fetchDistributionData,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-line/90 shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-brand-700" />
            4. Monitoring Penetapan STT & Alur Pengesahan
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Pantau status penetapan Surat Tanda Tashih (STT) naskah lolos sidang: penyusunan draf oleh Dokumentator, paraf oleh Pemaraf, dan pengesahan TTE Kepala LPMQ.
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
        <div className="py-16 text-center text-ink-muted">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-brand-700" />
          <p className="text-xs font-semibold">Memuat naskah siap STT...</p>
        </div>
      ) : (!readyRegistrations || readyRegistrations.length === 0) ? (
        <div className="py-16 text-center text-ink-muted max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-2.5">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-ink">Belum ada naskah yang siap diajukan STT</p>
          <p className="text-xs text-ink-muted mt-1">
            Naskah yang telah menyelesaikan seluruh tahapan sidang pentashihan dan dinyatakan lolos akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {readyRegistrations.map((reg) => {
            const docs = reg.official_documents || [];
            const sttDoc = docs.find((d) => d.document_type === 'SURAT_TANDA_TASHIH') || null;
            const tuWorkflow = sttDoc?.content_snapshot?.tu_workflow || null;
            const isSubmittedToTu = Boolean(tuWorkflow?.submitted_at);
            const paraf = sttParafProgress(tuWorkflow);
            const isIssued = reg.status === 'STT_ISSUED' || sttDoc?.status === 'ISSUED';

            return (
              <div
                key={reg.id}
                className="p-5 sm:p-6 hover:bg-canvas/60 transition-colors space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                        {reg.registration_no}
                      </span>
                      <StatusBadge status={reg.status} size="xs" />
                      {isIssued && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-civic-successSoft text-civic-success border border-civic-successLine">
                          <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
                          STT Resmi Diterbitkan
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-ink line-clamp-1">
                      {reg.title}
                    </h4>
                    <p className="text-xs text-ink-muted">
                      <span className="font-semibold text-ink">
                        {reg.publisher?.legal_name || 'Penerbit Terdaftar'}
                      </span>
                      {' • '}
                      <span>{reg.service_type?.name}</span>
                    </p>
                  </div>

                  {/* Actions (Read-Only Preview & Download for Distributor) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {sttDoc && (
                      <a
                        href={`/api/v1/official-documents/${sttDoc.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-surface-subtle text-ink font-semibold text-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                        {isIssued ? 'Unduh STT Resmi' : 'Pratinjau Draf STT'}
                      </a>
                    )}
                  </div>
                </div>

                {/* Workflow Stepper Status Card (Jalur A - Dokumentator Lead) */}
                <div className="bg-surface-subtle/50 rounded-xl p-4 border border-line text-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Step 1: Sidang Selesai */}
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-civic-success shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-ink">1. Pentashihan Selesai</div>
                      <div className="text-ink-muted text-[11px]">Rekomendasi lolos telah disetujui</div>
                    </div>
                  </div>

                  {/* Step 2: Draf STT Dokumentator */}
                  <div className="flex items-start gap-2">
                    {sttDoc ? (
                      <CheckCircle2 className="w-4 h-4 text-civic-success shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-civic-warning shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-ink">2. Draf STT Dokumentator</div>
                      <div className="text-ink-muted text-[11px]">
                        {sttDoc ? 'Draf STT telah disusun' : 'Menunggu Dokumentator'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Paraf Pemaraf */}
                  <div className="flex items-start gap-2">
                    {paraf.complete ? (
                      <CheckCircle2 className="w-4 h-4 text-civic-success shrink-0 mt-0.5" />
                    ) : isSubmittedToTu ? (
                      <Clock className="w-4 h-4 text-civic-info shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-ink">3. Paraf Pemaraf</div>
                      <div className="text-ink-muted text-[11px]">
                        {isSubmittedToTu
                          ? (paraf.complete
                            ? 'Paraf lengkap, menunggu TTE Kepala'
                            : `Menunggu paraf (${paraf.done}/${paraf.required})`)
                          : (sttDoc ? 'Menunggu penyerahan ke Pemaraf' : 'Menunggu draf STT')}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Pengesahan & TTD Kepala */}
                  <div className="flex items-start gap-2">
                    {isIssued ? (
                      <CheckCircle2 className="w-4 h-4 text-civic-success shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-ink">4. Pengesahan Kepala LPMQ</div>
                      <div className="text-ink-muted text-[11px]">
                        {isIssued ? 'Resmi Diterbitkan' : (paraf.complete ? 'Siap disahkan Kepala LPMQ' : 'Menunggu kelengkapan paraf')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TU Signatories Detail (if submitted to TU) */}
                {isSubmittedToTu && (
                  <div className="bg-civic-infoSoft border border-civic-infoLine rounded-xl p-3.5 text-xs text-ink">
                    <div className="font-bold flex items-center gap-1.5 mb-2">
                      <UserCheck className="w-4 h-4 text-civic-info" />
                      Status Paraf & Pengesahan:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-white/80 rounded-lg border border-civic-infoLine flex items-center justify-between">
                        <span>Paraf Pemaraf:</span>
                        <span className={paraf.complete ? 'font-bold text-civic-success' : 'font-bold text-civic-warning'}>
                          {paraf.done > 0
                            ? `${paraf.complete ? '✓ ' : ''}${paraf.parafs.map((p) => p?.signed_by?.name || 'Pemaraf').join(', ')} (${paraf.done}/${paraf.required})`
                            : `Menunggu (0/${paraf.required})`}
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-civic-infoLine flex items-center justify-between">
                        <span>Kepala LPMQ (TTD Resmi):</span>
                        <span className={isIssued ? 'font-bold text-civic-success' : 'font-medium text-ink-muted'}>
                          {isIssued ? '✓ Resmi Sah' : 'Menunggu'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SttWorkflowPanel;
