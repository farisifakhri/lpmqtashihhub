import React from 'react';
import { StickyActionBar } from '@/components/layout/StickyActionBar';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { Button } from '@/components/ui/Button';
import { Save, AlertTriangle, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const InspectionActionPanel = ({
  isInProgress, sesuaiCount, tidakBerlakuCount, isDirty, canHeadApprove,
  assignment, isSent, canVerifierWork, handleSaveDraft, actionLoading,
  setReturnModalOpen, handleOpenSubmitConfirm, setApproveConfirmOpen,
  canVerifierSend, handleSendDocument, isAllFullySigned,
  submitConfirmOpen, setSubmitConfirmOpen, handleConfirmSubmitToHead,
  registration, tidakSesuaiCount, decision, approveConfirmOpen, handleConfirmApprove,
  resultDocumentNo, setResultDocumentNo,
  minutesDocumentNo, setMinutesDocumentNo,
  latestResultDoc, beritaAcaraDoc,
  approveModalError, setApproveModalError,
}) => (
  <>
      {/* STICKY ACTION BAR FOR WORKSPACE */}
      <StickyActionBar
        statusMessage={
          isInProgress ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">
                Checklist: {sesuaiCount + tidakBerlakuCount}/4 Butir Selesai
              </span>
              <span>·</span>
              <span className="text-ink-muted font-mono text-[11px]">
                {isDirty ? 'Ada perubahan belum disimpan' : 'Tersimpan otomatis'}
              </span>
            </div>
          ) : canHeadApprove ? (
            <span className="font-bold text-civic-warning">
              Menunggu Persetujuan Draf oleh Kepala LPMQ
            </span>
          ) : assignment.status === 'WAITING_APPROVAL' ? (
            <span className="font-bold text-civic-warning">
              Draf Sedang Diperiksa Kepala LPMQ
            </span>
          ) : assignment.status === 'WAITING_SIGNATURE' ? (
            <span className="font-bold text-civic-info">
              Menunggu Penandatanganan Dokumen Resmi
            </span>
          ) : assignment.status === 'READY_TO_SEND' ? (
            <span className="font-bold text-brand-900">
              Dokumen Telah Lengkap Ditandatangani — Siap Dikirim ke Penerbit
            </span>
          ) : isSent ? (
            <span className="font-bold text-brand-900">
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
                className="text-xs text-civic-danger border-civic-dangerLine hover:bg-civic-dangerSoft"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-civic-danger" />
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
              onClick={() => {
                if (setApproveModalError) setApproveModalError(null);
                setApproveConfirmOpen(true);
              }}
              disabled={actionLoading}
              className="text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {actionLoading ? 'Memproses...' : 'Setujui Surat Bertanda Tangan Verifikator'}
            </Button>
          ) : canVerifierSend ? (
            <Button
              variant="primary"
              onClick={handleSendDocument}
              disabled={actionLoading || !isAllFullySigned}
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Kirim Surat Resmi ke Penerbit
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
            ? 'Kode billing wajib terbit dan dicantumkan. Saat diajukan, Verifikator menandatangani isi draf secara internal sebelum Kepala LPMQ menyetujui.'
            : 'Surat catatan kekurangan akan dikirim ke Kepala LPMQ untuk pengesahan sebelum diteruskan kepada penerbit untuk perbaikan berkas.'
        }
        confirmLabel={decision === 'PASSED' ? 'Ajukan Kelolosan' : 'Ajukan Perbaikan'}
        confirmVariant={decision === 'PASSED' ? 'primary' : 'gold'}
        loading={actionLoading}
      />

      {/* Confirmation Summary Dialog for Approving Draft (Kepala LPMQ) */}
      <ConfirmationSummaryDialog
        isOpen={approveConfirmOpen}
        onClose={() => {
          if (setApproveModalError) setApproveModalError(null);
          setApproveConfirmOpen(false);
        }}
        onConfirm={handleConfirmApprove}
        title="Sahkan Surat Hasil Verifikasi"
        description="Periksa tanda tangan internal Verifikator dan kode billing yang sudah dicatat, lalu tetapkan nomor resmi dan setujui surat."
        objectName={`Surat Hasil Verifikasi (${registration.registration_no || '-'})`}
        nextActor="Verifikator untuk pengiriman surat"
        statusChange="SUBMITTED -> SIGNED (PDF final diarsipkan)"
        irreversibleConsequence="Setelah disetujui, nomor dokumen dan isi draf dikunci. PDF final dan QR menampilkan nomor ini."
        confirmLabel="Sahkan dan Terbitkan PDF"
        confirmVariant="primary"
        loading={actionLoading}
      >
        <div className="space-y-3 pt-2 border-t border-line text-xs">
          <div>
            <label htmlFor="approve-result-doc-no" className="block font-bold text-ink mb-1">
              Nomor Surat Hasil Verifikasi <span className="text-civic-danger">*</span>
            </label>
            <input
              id="approve-result-doc-no"
              type="text"
              value={resultDocumentNo || ''}
              onChange={(e) => {
                setResultDocumentNo?.(e.target.value);
                if (approveModalError) setApproveModalError?.(null);
              }}
              placeholder="Contoh: B-123/LPMQ.01/TL.00/09/2026"
              maxLength={191}
              className="w-full p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-mono text-ink bg-white"
              required
            />
            <p className="text-[11px] text-ink-muted mt-0.5">
              Nomor resmi surat hasil yang dicetak pada PDF final dan diverifikasi via QR.
            </p>
          </div>

          {beritaAcaraDoc && (
            <div>
              <label htmlFor="approve-ba-doc-no" className="block font-bold text-ink mb-1">
                Nomor Berita Acara Verifikasi <span className="text-civic-danger">*</span>
              </label>
              <input
                id="approve-ba-doc-no"
                type="text"
                value={minutesDocumentNo || ''}
                onChange={(e) => {
                  setMinutesDocumentNo?.(e.target.value);
                  if (approveModalError) setApproveModalError?.(null);
                }}
                placeholder="Contoh: BA-123/LPMQ.01/TL.00/09/2026"
                maxLength={191}
                className="w-full p-2.5 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 font-mono text-ink bg-white"
                required
              />
              <p className="text-[11px] text-ink-muted mt-0.5">
                Nomor resmi berita acara verifikasi fisik dan telaah naskah.
              </p>
            </div>
          )}

          {approveModalError && (
            <div className="p-2.5 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-xs text-civic-danger flex items-center gap-2" role="alert">
              <AlertCircle className="w-4 h-4 text-civic-danger shrink-0" />
              <span>{approveModalError}</span>
            </div>
          )}
        </div>
      </ConfirmationSummaryDialog>

  </>
);
