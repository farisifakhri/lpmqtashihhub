import React from 'react';
import { StickyActionBar } from '@/components/layout/StickyActionBar';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { Button } from '@/components/ui/Button';
import { Save, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

export const InspectionActionPanel = ({
  isInProgress, sesuaiCount, tidakBerlakuCount, isDirty, canHeadApprove,
  assignment, isSent, canVerifierWork, handleSaveDraft, actionLoading,
  setReturnModalOpen, handleOpenSubmitConfirm, setApproveConfirmOpen,
  canVerifierSend, handleSendDocument, isAllFullySigned,
  submitConfirmOpen, setSubmitConfirmOpen, handleConfirmSubmitToHead,
  registration, tidakSesuaiCount, decision, approveConfirmOpen, handleConfirmApprove,
}) => (
  <>
      {/* STICKY ACTION BAR FOR WORKSPACE */}
      <StickyActionBar
        statusMessage={
          isInProgress ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Checklist: {sesuaiCount + tidakBerlakuCount}/4 Butir Selesai
              </span>
              <span>·</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {isDirty ? 'Ada perubahan belum disimpan' : 'Tersimpan otomatis'}
              </span>
            </div>
          ) : canHeadApprove ? (
            <span className="font-bold text-amber-900">
              Menunggu Persetujuan Draf oleh Kepala LPMQ
            </span>
          ) : assignment.status === 'WAITING_APPROVAL' ? (
            <span className="font-bold text-amber-900">
              Draf Sedang Diperiksa Kepala LPMQ
            </span>
          ) : assignment.status === 'WAITING_SIGNATURE' ? (
            <span className="font-bold text-indigo-900">
              Menunggu Penandatanganan Dokumen Resmi
            </span>
          ) : assignment.status === 'READY_TO_SEND' ? (
            <span className="font-bold text-emerald-900">
              Dokumen Telah Lengkap Ditandatangani — Siap Dikirim ke Penerbit
            </span>
          ) : isSent ? (
            <span className="font-bold text-emerald-900">
              Surat Resmi Telah Terkirim ke Penerbit
            </span>
          ) : null
        }
        secondaryActions={
          <>
            {canVerifierWork && (
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={actionLoading}
                className="text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {actionLoading ? 'Menyimpan...' : 'Simpan Draf Pemeriksaan'}
              </Button>
            )}
            {canHeadApprove && (
              <Button
                variant="outline"
                onClick={() => setReturnModalOpen(true)}
                disabled={actionLoading}
                className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Kembalikan Draf
              </Button>
            )}
          </>
        }
        primaryAction={
          canVerifierWork ? (
            <Button
              variant="primary"
              onClick={handleOpenSubmitConfirm}
              disabled={actionLoading}
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {actionLoading ? 'Mengajukan...' : 'Ajukan Draf ke Kepala LPMQ'}
            </Button>
          ) : canHeadApprove ? (
            <Button
              variant="primary"
              onClick={() => setApproveConfirmOpen(true)}
              disabled={actionLoading}
              className="text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {actionLoading ? 'Memproses...' : 'Setujui Draf Hasil Verifikasi'}
            </Button>
          ) : canVerifierSend ? (
            <Button
              variant="primary"
              onClick={handleSendDocument}
              disabled={actionLoading || !isAllFullySigned}
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Kirim Surat Resmi & Terbitkan Billing PNBP
            </Button>
          ) : null
        }
      />

      {/* Confirmation Summary Dialog for Submitting Draft */}
      <ConfirmationSummaryDialog
        isOpen={submitConfirmOpen}
        onClose={() => setSubmitConfirmOpen(false)}
        onConfirm={handleConfirmSubmitToHead}
        title="Ajukan Draf Hasil Verifikasi"
        description="Periksa ringkasan hasil evaluasi berkas dan naskah sebelum diajukan secara resmi kepada Kepala LPMQ."
        objectName={`Naskah: ${registration.title || '-'}`}
        nextActor="Kepala LPMQ"
        statusChange="IN_PROGRESS -> WAITING_APPROVAL"
        irreversibleConsequence="Draf akan dikunci untuk penelaahan Kepala LPMQ dan tidak dapat diedit selama masa reviu."
        summaryItems={[
          { label: 'Nomor Registrasi', value: registration.registration_no || '-' },
          { label: 'Naskah Mushaf', value: registration.title || '-' },
          { label: 'Hasil Checklist', value: `${sesuaiCount} Sesuai, ${tidakSesuaiCount} Tidak Sesuai` },
          {
            label: 'Keputusan Verifikator',
            value: decision === 'PASSED' ? 'Lolos Verifikasi' : 'Perlu Perbaikan Penerbit',
          },
        ]}
        impactMessage={
          decision === 'PASSED'
            ? 'Draf surat kelolosan akan dikirim ke Kepala LPMQ untuk pengesahan tanda tangan elektronik resmi dan penerbitan billing PNBP.'
            : 'Surat catatan kekurangan akan dikirim ke Kepala LPMQ untuk pengesahan sebelum diteruskan kepada penerbit untuk perbaikan berkas.'
        }
        confirmLabel={decision === 'PASSED' ? 'Ajukan Kelolosan' : 'Ajukan Perbaikan'}
        confirmVariant={decision === 'PASSED' ? 'primary' : 'gold'}
        loading={actionLoading}
      />

      {/* Confirmation Summary Dialog for Approving Draft (Kepala LPMQ) */}
      <ConfirmationSummaryDialog
        isOpen={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleConfirmApprove}
        title="Setujui Draf Hasil Verifikasi"
        description="Persetujuan draf oleh Kepala LPMQ akan mengunci isi dokumen dan memulai alur tanda tangan elektronik resmi."
        objectName={`Surat Hasil Verifikasi (${registration.registration_no || '-'})`}
        nextActor="Penandatangan Elektronik Resmi (Kepala LPMQ & Verifikator)"
        statusChange="DRAFT -> APPROVED (Siap Ditandatangani)"
        irreversibleConsequence="Setelah disetujui, draf dikunci dan didaftarkan ke antrean tanda tangan elektronik resmi."
        confirmLabel="Setujui Draf"
        confirmVariant="primary"
        loading={actionLoading}
      />

  </>
);
