import React from 'react';
import {
  Download,
  Trash2,
  XCircle,
} from 'lucide-react';
import { fileApi } from '@/api/file.api';
import { Button } from '@/components/ui/Button';
import { PrivateFileViewer } from '@/components/common/PrivateFileViewer';
import { RegistrationReceiptDialog } from '../RegistrationReceiptDialog';
import { ShippingLabelDialog } from '../ShippingLabelDialog';

export function PublisherDetailModals({
  data,
  actionLoading,
  previewFile,
  setPreviewFile,
  showDeleteModal,
  setShowDeleteModal,
  handleDeleteDraft,
  showCancelModal,
  setShowCancelModal,
  cancelReason,
  setCancelReason,
  handleCancelRegistration,
  physicalReceiptUrl,
  setPhysicalReceiptUrl,
  showReceipt,
  setShowReceipt,
  showShippingLabel,
  setShowShippingLabel,
  onReceiptClose,
}) {
  return (
    <>
      {/* Modal Preview Berkas Permohonan */}
      {previewFile && (
        <div role="dialog" aria-modal="true" aria-label={`Pratinjau ${previewFile.name}`} className="fixed inset-0 z-50 bg-ink/70 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">{previewFile.name}</h2>
                <p className="text-xs text-ink-muted">Pratinjau berkas dokumen permohonan resmi.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="text-xs" onClick={() => fileApi.downloadPrivateFile(previewFile.id, previewFile.name)}>
                  <Download className="w-3.5 h-3.5 mr-1 text-brand-700" /> Unduh Berkas
                </Button>
                <Button variant="outline" className="text-xs" onClick={() => setPreviewFile(null)}>Tutup</Button>
              </div>
            </div>
            <div className="flex-1 w-full overflow-hidden p-2">
              <PrivateFileViewer fileId={previewFile.id} fileName={previewFile.name} height="100%" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Draf */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Hapus Draf Permohonan</h3>
              <p className="text-xs text-ink-muted">
                Apakah Anda yakin ingin menghapus draf permohonan <strong className="text-ink">{data?.title}</strong>?
                Seluruh berkas naskah yang telah diunggah akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteDraft}
                disabled={actionLoading}
                className="bg-civic-danger hover:bg-civic-danger text-white font-semibold text-xs"
              >
                {actionLoading ? 'Menghapus...' : 'Ya, Hapus Draf'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batalkan Permohonan */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-civic-warningSoft text-civic-warning flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Batalkan Permohonan Pentashihan</h3>
              <p className="text-xs text-ink-muted">
                Apakah Anda yakin ingin membatalkan permohonan <strong className="text-ink">{data?.title}</strong> ({data?.registration_no})?
                Permohonan akan ditarik dari antrean verifikasi LPMQ.
              </p>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-ink">Alasan Pembatalan (Opsional):</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Terdapat revisi format master sebelum verifikasi dimulai..."
                rows={3}
                className="w-full rounded-xl border border-line p-2.5 text-xs focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Kembali
              </Button>
              <Button
                size="sm"
                onClick={handleCancelRegistration}
                disabled={actionLoading}
                className="bg-civic-warning hover:bg-civic-warning text-white font-semibold text-xs"
              >
                {actionLoading ? 'Membatalkan...' : 'Ya, Batalkan Permohonan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Bukti Pendaftaran Resmi */}
      {physicalReceiptUrl && (
        <div role="dialog" aria-modal="true" aria-label="PDF tanda terima fisik" className="fixed inset-0 z-50 bg-ink/70 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Tanda Terima Master Fisik</h2>
                <p className="text-xs text-ink-muted">Gunakan ikon cetak pada toolbar PDF untuk mencetak dokumen berkop LPMQ.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={physicalReceiptUrl} download={`tanda-terima-${data?.registration_no || 'master-fisik'}.pdf`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">Unduh PDF</a>
                <Button variant="outline" className="text-xs" onClick={() => setPhysicalReceiptUrl(null)}>Tutup</Button>
              </div>
            </div>
            <iframe title="Penampil PDF tanda terima master fisik" src={physicalReceiptUrl} className="flex-1 w-full border-0" />
          </div>
        </div>
      )}

      <RegistrationReceiptDialog
        isOpen={showReceipt}
        onClose={onReceiptClose}
        registration={data}
      />

      <ShippingLabelDialog
        isOpen={showShippingLabel}
        onClose={() => setShowShippingLabel(false)}
        registration={data}
      />
    </>
  );
}
