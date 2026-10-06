import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fileApi } from '@/api/file.api';
import { dateLabel, downloadAvailable } from './publisher-status';

export function PublisherDocumentList({ documents = [], registration = null }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const download = async (document) => {
    setBusy(document.id);
    setError('');
    try {
      await fileApi.downloadDocument(document.id, `${document.document_no}.pdf`);
    } catch (err) {
      setError(err.message || 'Dokumen tidak dapat diunduh. Coba kembali.');
    } finally {
      setBusy(null);
    }
  };

  const downloadFile = async (fileId, filename) => {
    setBusy(fileId);
    setError('');
    try {
      await fileApi.downloadPrivateFile(fileId, filename);
    } catch (err) {
      setError(err.message || 'Berkas tidak dapat diunduh. Coba kembali.');
    } finally {
      setBusy(null);
    }
  };

  const issued = documents.filter(
    (item) => item.document_type === 'SURAT_TANDA_TASHIH' && item.status === 'ISSUED'
  );

  const permohonanId =
    registration?.foreign_metadata?.surat_permohonan_file_id ||
    registration?.manuscript_files?.find((f) => f.type === 'SURAT_PERMOHONAN')?.file_id;
  const pernyataanId = registration?.foreign_metadata?.surat_pernyataan_perubahan_file_id;
  const buktiTashihId =
    registration?.foreign_metadata?.bukti_tashih_file_id ||
    registration?.manuscript_files?.find((f) => f.type === 'FOREIGN_TASHIH_CERTIFICATE')?.file_id;

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-civic-danger">{error}</p>}

      {/* Surat Permohonan Tanda Tashih */}
      {permohonanId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink">Surat Permohonan Tanda Tashih</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Surat resmi permohonan penerbit yang diajukan pada saat pendaftaran
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              downloadFile(
                permohonanId,
                `Surat-Permohonan-${registration?.registration_no || 'Tashih'}.pdf`
              )
            }
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-brand-700" />
            {busy === permohonanId ? 'Mengunduh…' : 'Unduh Surat Permohonan'}
          </Button>
        </div>
      )}

      {/* Surat Pernyataan Perubahan (jika ada) */}
      {pernyataanId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink">Surat Pernyataan Perubahan</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Surat pernyataan perubahan naskah/penerbit resmi
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              downloadFile(
                pernyataanId,
                `Surat-Pernyataan-${registration?.registration_no || 'Perubahan'}.pdf`
              )
            }
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-brand-700" />
            {busy === pernyataanId ? 'Mengunduh…' : 'Unduh Surat Pernyataan'}
          </Button>
        </div>
      )}

      {/* Bukti Tashih Lembaga Asal (Luar Negeri) */}
      {buktiTashihId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink">Bukti Tashih Lembaga Asal</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Sertifikat/bukti tashih dari lembaga pentashih luar negeri
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              downloadFile(
                buktiTashihId,
                `Bukti-Tashih-Asal-${registration?.registration_no || 'Mushaf'}.pdf`
              )
            }
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-brand-700" />
            {busy === buktiTashihId ? 'Mengunduh…' : 'Unduh Bukti Tashih'}
          </Button>
        </div>
      )}

      {/* Surat Tanda Tashih Resmi (STT) */}
      {issued.map((document) => (
        <div
          key={document.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4"
        >
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink break-all">{document.document_no}</p>
              <p className="text-xs text-ink-muted mt-1">
                Terbit {dateLabel(document.issued_at)} · Berlaku hingga {dateLabel(document.valid_until)}
              </p>
              {!downloadAvailable(document) && (
                <p className="text-xs text-civic-warning mt-1">
                  {document.valid_until && new Date(document.valid_until) < new Date()
                    ? 'Masa berlaku dokumen sudah berakhir.'
                    : 'Berkas PDF resmi belum tersedia. Hubungi pengelola layanan.'}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null || !downloadAvailable(document)}
            onClick={() => download(document)}
            className="text-xs font-bold"
          >
            <Download className="h-4 w-4 mr-1 text-brand-700" />
            {busy === document.id ? 'Mengunduh…' : 'Unduh STT'}
          </Button>
        </div>
      ))}

      {!issued.length && (
        <p className="text-sm text-ink-muted">
          STT belum diterbitkan. Dokumen akan muncul setelah ditetapkan oleh pejabat berwenang.
        </p>
      )}
    </div>
  );
}

export default PublisherDocumentList;
