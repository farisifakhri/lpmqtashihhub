import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Step3Berkas } from './Step3Berkas';
import { fileApi } from '@/api/file.api';

describe('Step3Berkas saved attachments', () => {
  it('shows saved file metadata and actions without populating native file inputs', async () => {
    vi.spyOn(fileApi, 'viewPrivateFile').mockResolvedValue('blob:preview');
    vi.spyOn(fileApi, 'downloadPrivateFile').mockResolvedValue();
    render(<Step3Berkas
      kategoriPendaftaran="Mushaf Baru"
      isDigital={false}
      suratPermohonanFileId="file-surat"
      coverFileId="file-cover"
      contohHalamanFileId="file-sample"
      setSuratPermohonanFile={vi.fn()} setSuratPermohonanFileId={vi.fn()}
      setCoverFile={vi.fn()} setCoverFileId={vi.fn()}
      setContohHalamanFile={vi.fn()} setContohHalamanFileId={vi.fn()}
      storedFiles={{
        SURAT_PERMOHONAN: { file_name: 'surat.pdf', mime_type: 'application/pdf', file_size: 2048 },
        COVER: { file_name: 'cover.png', mime_type: 'image/png', file_size: 1024 },
        SAMPLE_PAGE_1_5: { file_name: 'sampel.pdf', mime_type: 'application/pdf', file_size: 3072 },
      }}
    />);

    expect(screen.getByText(/surat\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/cover\.png/)).toBeInTheDocument();
    expect(screen.getByText(/sampel\.pdf/)).toBeInTheDocument();
    expect(screen.getAllByText(/^Dokumen sudah tersimpan/)).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat' })[0]);
    expect(fileApi.viewPrivateFile).toHaveBeenCalledWith('file-surat');
  });
});
