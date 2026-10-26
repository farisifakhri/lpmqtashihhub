import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckRegistrationStatusPage } from './CheckRegistrationStatusPage';
import { publisherRegistrationApi } from '@/api/publisher-registration.api';

describe('CheckRegistrationStatusPage (T-S02 Cek Status Pendaftaran)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input and title cleanly', () => {
    render(
      <MemoryRouter>
        <CheckRegistrationStatusPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Cek Status Pendaftaran Penerbit')).toBeInTheDocument();
    expect(screen.getByLabelText(/Kode Pendaftaran Penerbit/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: REG-PUB-7K9M2X4F/i)).toBeInTheDocument();
  });

  it('checks status and renders DIAJUKAN state correctly', async () => {
    vi.spyOn(publisherRegistrationApi, 'checkStatus').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        status: 'DIAJUKAN',
        status_label: 'Menunggu Verifikasi Petugas',
        alasan: null,
        tanggal_pengajuan: '2026-10-19T10:30:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <CheckRegistrationStatusPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Contoh: REG-PUB-7K9M2X4F/i), {
      target: { value: 'REG-PUB-7K9M2X4F' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Periksa Status Pendaftaran/i }));

    await waitFor(() => {
      expect(screen.getByTestId('status-result-card')).toBeInTheDocument();
      expect(screen.getByText('Menunggu Verifikasi Petugas')).toBeInTheDocument();
      expect(screen.getByText(/antrean peninjauan oleh petugas loket\/sekretariat LPMQ/i)).toBeInTheDocument();
    });
  });

  it('checks status and renders PERLU_PERBAIKAN with reason from admin', async () => {
    vi.spyOn(publisherRegistrationApi, 'checkStatus').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        status: 'PERLU_PERBAIKAN',
        status_label: 'Perlu Perbaikan',
        alasan: 'Akta Notaris lembar kedua buram.',
        instruksi: 'Silakan periksa kotak masuk email terdaftar Anda.',
        tanggal_pengajuan: '2026-10-19T10:30:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <CheckRegistrationStatusPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Contoh: REG-PUB-7K9M2X4F/i), {
      target: { value: 'REG-PUB-7K9M2X4F' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Periksa Status Pendaftaran/i }));

    await waitFor(() => {
      expect(screen.getByText('Memerlukan Perbaikan Dokumen')).toBeInTheDocument();
      expect(screen.getByText(/"Akta Notaris lembar kedua buram\."/i)).toBeInTheDocument();
      expect(screen.getByText(/Silakan periksa kotak masuk email terdaftar Anda/i)).toBeInTheDocument();
    });
  });

  it('checks status and renders DISETUJUI with link to login', async () => {
    vi.spyOn(publisherRegistrationApi, 'checkStatus').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        status: 'DISETUJUI',
        status_label: 'Disetujui',
        alasan: null,
        tanggal_pengajuan: '2026-10-19T10:30:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <CheckRegistrationStatusPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Contoh: REG-PUB-7K9M2X4F/i), {
      target: { value: 'REG-PUB-7K9M2X4F' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Periksa Status Pendaftaran/i }));

    await waitFor(() => {
      expect(screen.getByText('Pendaftaran Telah Disetujui')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Masuk ke Portal Pentashihan/i })).toHaveAttribute('href', '/login');
    });
  });

  it('checks status and renders DITOLAK with explanation and link to register anew', async () => {
    vi.spyOn(publisherRegistrationApi, 'checkStatus').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        status: 'DITOLAK',
        status_label: 'Ditolak',
        alasan: 'Badan hukum fiktif tidak terdaftar di Kemenkumham.',
        tanggal_pengajuan: '2026-10-19T10:30:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <CheckRegistrationStatusPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Contoh: REG-PUB-7K9M2X4F/i), {
      target: { value: 'REG-PUB-7K9M2X4F' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Periksa Status Pendaftaran/i }));

    await waitFor(() => {
      expect(screen.getByText('Pendaftaran Ditolak')).toBeInTheDocument();
      expect(screen.getByText(/"Badan hukum fiktif tidak terdaftar di Kemenkumham\."/i)).toBeInTheDocument();
      expect(screen.getByText(/identitas badan hukum \(NPWP dan NIB\) serta email Anda telah dibebaskan/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ajukan Pendaftaran Baru/i })).toHaveAttribute('href', '/register');
    });
  });

  it('displays user-friendly 404 message when registration code is not found', async () => {
    const errorObj = new Error('Tidak ditemukan');
    errorObj.status = 404;
    errorObj.data = { code: 'REGISTRATION_NOT_FOUND' };
    vi.spyOn(publisherRegistrationApi, 'checkStatus').mockRejectedValue(errorObj);

    render(
      <MemoryRouter>
        <CheckRegistrationStatusPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Contoh: REG-PUB-7K9M2X4F/i), {
      target: { value: 'REG-PUB-NOTFOUND' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Periksa Status Pendaftaran/i }));

    await waitFor(() => {
      expect(screen.getByText(/Kode pendaftaran tidak ditemukan\. Pastikan Anda memasukkan kode dengan benar/i)).toBeInTheDocument();
    });
  });
});
