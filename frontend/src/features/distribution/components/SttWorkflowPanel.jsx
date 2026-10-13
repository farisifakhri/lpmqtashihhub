import React, { useState } from 'react';
import {
  FileCheck2,
  RefreshCw,
  Send,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { documentationApi } from '@/api/documentation.api';
import { showToast } from '@/components/ui/toast';

export const SttWorkflowPanel = ({
  distLoading,
  readyRegistrations,
  fetchDistributionData,
}) => {
  const [requestNotesModalReg, setRequestNotesModalReg] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleRequestStt = async (regId) => {
    setActionLoadingId(regId);
    try {
      await documentationApi.requestStt(regId, requestNotes.trim());
      showToast('Pengajuan pembuatan STT berhasil dikirim ke Admin Internal.', 'success');
      setRequestNotesModalReg(null);
      setRequestNotes('');
      await fetchDistributionData();
    } catch (err) {
      showToast(err.message || 'Gagal mengajukan pembuatan STT ke admin.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmitToTu = async (regId, documentId) => {
    setActionLoadingId(regId);
    try {
      await documentationApi.submitToTu(documentId);
      showToast('Draf STT berhasil diteruskan ke Tata Usaha (TU) untuk pembubuhan paraf dan TTD.', 'success');
      await fetchDistributionData();
    } catch (err) {
      showToast(err.message || 'Gagal mengirimkan draf STT ke TU.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-line/90 shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-brand-700" />
            4. Pengajuan STT & Alur Pengesahan TU (Tahap Akhir)
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Setelah pentashihan selesai, ajukan pembuatan STT ke Admin, terima draf resmi, lalu teruskan ke TU (Paraf 1 & 2) dan Kepala LPMQ untuk pengesahan tanda tangan.
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
            const meta = reg.foreign_metadata || {};
            const sttRequest = meta.stt_request || null;
            const tuWorkflow = sttDoc?.content_snapshot?.tu_workflow || null;
            const isSubmittedToTu = tuWorkflow?.status === 'SUBMITTED_TO_TU';
            const isIssued = reg.status === 'STT_ISSUED' || sttDoc?.status === 'ISSUED';
            const isDraftSentToDist = sttDoc && (sttRequest?.status === 'DRAFT_READY' || tuWorkflow);

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
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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

                  {/* Action Buttons for Distributor */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Request STT from Admin */}
                    {!sttRequest && reg.status === 'READY_FOR_STT' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoadingId === reg.id}
                        onClick={() => setRequestNotesModalReg(reg)}
                        className="bg-brand-700 hover:bg-brand-800 text-white shadow-xs text-xs font-bold"
                        icon={<Send className="w-3.5 h-3.5" />}
                      >
                        Ajukan Pembuatan STT ke Admin
                      </Button>
                    )}

                    {/* 2. Submit to TU */}
                    {sttDoc && sttDoc.status === 'DRAFT' && !isSubmittedToTu && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoadingId === reg.id}
                        onClick={() => handleSubmitToTu(reg.id, sttDoc.id)}
                        className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs text-xs font-bold"
                        icon={<UserCheck className="w-3.5 h-3.5" />}
                      >
                        {actionLoadingId === reg.id ? 'Mengirim...' : 'Kirim ke TU untuk Pengesahan'}
                      </Button>
                    )}

                    {/* 3. Preview PDF */}
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

                {/* Workflow Stepper Status Card */}
                <div className="bg-surface-subtle/50 rounded-xl p-4 border border-line text-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Step 1: Sidang Selesai */}
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-ink">1. Pentashihan Selesai</div>
                      <div className="text-ink-muted text-[11px]">Rekomendasi lolos telah disetujui</div>
                    </div>
                  </div>

                  {/* Step 2: Pengajuan ke Admin */}
                  <div className="flex items-start gap-2">
                    {sttRequest ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-ink">2. Permintaan STT ke Admin</div>
                      <div className="text-ink-muted text-[11px]">
                        {sttRequest ? 'Diajukan ke Admin Internal' : 'Belum diajukan'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Draf STT & Pengiriman ke TU */}
                  <div className="flex items-start gap-2">
                    {isSubmittedToTu ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : sttDoc ? (
                      <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-ink">3. Penyerahan ke TU</div>
                      <div className="text-ink-muted text-[11px]">
                        {isSubmittedToTu ? 'Sedang diparaf TU' : sttDoc ? 'Draf siap dikirim ke TU' : 'Menunggu draf Admin'}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Pengesahan & TTD Kepala */}
                  <div className="flex items-start gap-2">
                    {isIssued ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-ink">4. Tanda Tangan Kepala</div>
                      <div className="text-ink-muted text-[11px]">
                        {isIssued ? 'Resmi Diterbitkan' : 'Menunggu TTD Kepala'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TU Signatories Detail (if submitted to TU) */}
                {isSubmittedToTu && (
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-950">
                    <div className="font-bold flex items-center gap-1.5 mb-2">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      Status Pembubuhan Paraf & Pengesahan Tata Usaha:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2 bg-white/80 rounded-lg border border-blue-100 flex items-center justify-between">
                        <span>Penandatangan 1 (Paraf 1):</span>
                        <span className="font-bold text-emerald-700">
                          {tuWorkflow?.paraf_1 ? '✓ Sudah Paraf' : 'Menunggu'}
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-blue-100 flex items-center justify-between">
                        <span>Penandatangan 2 (Paraf 2):</span>
                        <span className="font-bold text-emerald-700">
                          {tuWorkflow?.paraf_2 ? '✓ Sudah Paraf' : 'Menunggu'}
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-blue-100 flex items-center justify-between">
                        <span>Kepala LPMQ (TTD Resmi):</span>
                        <span className="font-bold text-emerald-700">
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

      {/* Modal Dialog: Catatan Pengajuan STT */}
      {requestNotesModalReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Ajukan Pembuatan Draf STT ke Admin
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Pengajuan untuk naskah <strong>{requestNotesModalReg.registration_no}</strong> ({requestNotesModalReg.title}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Catatan Distributor untuk Admin Internal (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Misal: Seluruh catatan pentashihan telah terpenuhi dan rekomendasi sidang disetujui tanpa catatan perbaikan."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRequestNotesModalReg(null);
                  setRequestNotes('');
                }}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoadingId === requestNotesModalReg.id}
                onClick={() => handleRequestStt(requestNotesModalReg.id)}
                className="bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs"
              >
                {actionLoadingId === requestNotesModalReg.id ? 'Mengirim...' : 'Kirim Pengajuan STT'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SttWorkflowPanel;

