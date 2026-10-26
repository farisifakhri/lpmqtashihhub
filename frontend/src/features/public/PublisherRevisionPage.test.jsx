import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublisherRevisionPage } from './PublisherRevisionPage';
import { publisherRegistrationApi } from '@/api/publisher-registration.api';

describe('PublisherRevisionPage (T-S02 Halaman Perbaikan Pendaftaran)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders expired token error message when token is invalid or expired', async () => {
    const errorObj = new Error('Token hangus');
    errorObj.status = 410;
    errorObj.data = { code: 'TOKEN_INVALID_OR_EXPIRED' };
    vi.spyOn(publisherRegistrationApi, 'getRevision').mockRejectedValue(errorObj);

    render(
      <MemoryRouter initialEntries={['/pendaftaran-penerbit/perbaikan?token=EXPIRED_TOKEN']}>
        <Routes>
          <Route path="/pendaftaran-penerbit/perbaikan" element={<PublisherRevisionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tautan Perbaikan Tidak Berlaku')).toBeInTheDocument();
      expect(screen.getByText(/Tautan perbaikan sudah tidak berlaku atau pernah digunakan/i)).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Cek Status Pendaftaran/i })[0]).toHaveAttribute('href', '/cek-status');
    });
  });

  it('loads revision data, displays admin notes and document list status', async () => {
    vi.spyOn(publisherRegistrationApi, 'getRevision').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        nama_penerbit: 'PT Pustaka Cahaya Mandiri',
        jenis_penerbit: 'PERUSAHAAN',
        alamat_lengkap: 'Jl. Percetakan Mushaf No. 12',
        nama_penanggung_jawab: 'Ahmad Subagio',
        telepon_penanggung_jawab: '081234567890',
        email: 'info@pustaka.co.id',
        alasan_perbaikan: 'Akta Notaris buram dan belum ada SK Kemenkumham.',
        dokumen_terunggah: [
          { tipe: 'SURAT_PENDAFTARAN', nama_file: 'surat.pdf', status: 'VALID' },
          { tipe: 'AKTA_NOTARIS', nama_file: 'akta.pdf', status: 'PERLU_DIGANTI' },
          { tipe: 'PROFIL', nama_file: 'profil.pdf', status: 'VALID' },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={['/pendaftaran-penerbit/perbaikan?token=VALID_TOKEN']}>
        <Routes>
          <Route path="/pendaftaran-penerbit/perbaikan" element={<PublisherRevisionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Perbaikan Dokumen Pendaftaran')).toBeInTheDocument();
      expect(screen.getByText(/"Akta Notaris buram dan belum ada SK Kemenkumham\."/i)).toBeInTheDocument();
      expect(screen.getByText('Perlu Diganti')).toBeInTheDocument();
      expect(screen.getAllByText('Valid / Sesuai').length).toBe(2);
    });
  });

  it('submits revision and displays success state', async () => {
    vi.spyOn(publisherRegistrationApi, 'getRevision').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        nama_penerbit: 'PT Pustaka Cahaya Mandiri',
        jenis_penerbit: 'PERUSAHAAN',
        alamat_lengkap: 'Jl. Percetakan Mushaf No. 12',
        nama_penanggung_jawab: 'Ahmad Subagio',
        telepon_penanggung_jawab: '081234567890',
        email: 'info@pustaka.co.id',
        alasan_perbaikan: 'Akta Notaris buram.',
        dokumen_terunggah: [
          { tipe: 'AKTA_NOTARIS', nama_file: 'akta.pdf', status: 'PERLU_DIGANTI' },
        ],
      },
    });

    const submitSpy = vi.spyOn(publisherRegistrationApi, 'submitRevision').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        status: 'DIAJUKAN',
      },
    });

    render(
      <MemoryRouter initialEntries={['/pendaftaran-penerbit/perbaikan?token=VALID_TOKEN']}>
        <Routes>
          <Route path="/pendaftaran-penerbit/perbaikan" element={<PublisherRevisionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Perlu Diganti')).toBeInTheDocument();
    });

    const dummyFile = new File(['%PDF-1.4 new akta'], 'akta-baru.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    fireEvent.click(screen.getByRole('button', { name: /Kirimkan Perbaikan Dokumen Pendaftaran/i }));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
      expect(screen.getByText('Perbaikan Berhasil Dikirimkan!')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Pantau Status di Halaman Cek Status/i })).toHaveAttribute('href', '/cek-status');
    });
  });
});
