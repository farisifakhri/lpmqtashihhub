import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherVerificationPage } from './PublisherVerificationPage';
import { publisherRegistrationApi } from '@/api/publisher-registration.api';

describe('PublisherVerificationPage (T-S03 Verifikasi Penerbit Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRegistrations = [
    {
      id: 'reg-01',
      kode_pendaftaran: 'REG-PUB-7K9M2X4F',
      nama_penerbit: 'PT Pustaka Cahaya Mandiri',
      jenis_penerbit: 'PERUSAHAAN',
      email: 'info@pustakacahaya.co.id',
      status: 'DIAJUKAN',
      tautan_terdeteksi: true,
      versi: 1,
      created_at: '2026-10-19T10:30:00.000Z',
    },
    {
      id: 'reg-02',
      kode_pendaftaran: 'REG-PUB-8M1N4B2C',
      nama_penerbit: 'Yayasan Al-Furqan Indonesia',
      jenis_penerbit: 'YAYASAN',
      email: 'sekretariat@alfurqan.or.id',
      status: 'DIAJUKAN',
      tautan_terdeteksi: false,
      versi: 1,
      created_at: '2026-10-19T11:00:00.000Z',
    },
  ];

  const mockDetail = {
    id: 'reg-01',
    kode_pendaftaran: 'REG-PUB-7K9M2X4F',
    nama_penerbit: 'PT Pustaka Cahaya Mandiri',
    jenis_penerbit: 'PERUSAHAAN',
    alamat_lengkap: 'Jl. Percetakan Mushaf No. 12, Jakarta Timur',
    nama_penanggung_jawab: 'Ahmad Subagio',
    telepon_penanggung_jawab: '081234567890',
    email: 'info@pustakacahaya.co.id',
    npwp: '01.234.567.8-901.000',
    nib: '9120001234567',
    status: 'DIAJUKAN',
    alasan: null,
    versi: 1,
    dokumen: [
      {
        id: 'doc-1',
        tipe: 'SURAT_PENDAFTARAN',
        nama_asli: 'surat-permohonan.pdf',
        ukuran_bytes: 245012,
        tautan_terdeteksi: false,
        daftar_tautan: [],
      },
      {
        id: 'doc-2',
        tipe: 'PROFIL',
        nama_asli: 'company-profile.pdf',
        ukuran_bytes: 489110,
        tautan_terdeteksi: true,
        daftar_tautan: ['https://pustakacahaya.co.id'],
      },
    ],
  };

  it('renders publisher registration list and displays security warning when links are detected in documents', async () => {
    vi.spyOn(publisherRegistrationApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: mockRegistrations,
      pagination: { page: 1, limit: 10, total_records: 2, total_pages: 1 },
    });

    render(
      <MemoryRouter>
        <PublisherVerificationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verifikasi Pendaftaran Penerbit')).toBeInTheDocument();
      expect(screen.getByText('PT Pustaka Cahaya Mandiri')).toBeInTheDocument();
      expect(screen.getByText('Yayasan Al-Furqan Indonesia')).toBeInTheDocument();
      // Penanda tautan terdeteksi
      expect(screen.getByText('Ada Tautan di Dokumen')).toBeInTheDocument();
    });
  });

  it('opens registration detail modal showing complete legal data and documents', async () => {
    vi.spyOn(publisherRegistrationApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: mockRegistrations,
      pagination: { page: 1, limit: 10, total_records: 2, total_pages: 1 },
    });
    vi.spyOn(publisherRegistrationApi, 'getAdminDetail').mockResolvedValue({
      success: true,
      data: mockDetail,
    });

    render(
      <MemoryRouter>
        <PublisherVerificationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Periksa & Putuskan/i })[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Periksa & Putuskan/i })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('registration-detail-modal')).toBeInTheDocument();
      expect(screen.getByText(/Jl\. Percetakan Mushaf No\. 12, Jakarta Timur/i)).toBeInTheDocument();
      expect(screen.getByText(/surat-permohonan\.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/company-profile\.pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/Peringatan Keamanan: Terdeteksi Tautan URL di Dokumen/i)).toBeInTheDocument();
      expect(screen.getByText('https://pustakacahaya.co.id')).toBeInTheDocument();
    });
  });

  it('submits decision SETUJUI with current versi', async () => {
    vi.spyOn(publisherRegistrationApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: mockRegistrations,
      pagination: { page: 1, limit: 10, total_records: 2, total_pages: 1 },
    });
    vi.spyOn(publisherRegistrationApi, 'getAdminDetail').mockResolvedValue({
      success: true,
      data: mockDetail,
    });
    const decideSpy = vi.spyOn(publisherRegistrationApi, 'decideAdmin').mockResolvedValue({
      success: true,
      data: { id: 'reg-01', status: 'DISETUJUI', versi: 2 },
    });

    render(
      <MemoryRouter>
        <PublisherVerificationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Periksa & Putuskan/i })[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Periksa & Putuskan/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Terapkan Keputusan: Setujui/i })).toBeInTheDocument();
    });

    // Buka confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Keputusan: Setujui/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ya, Setujui Akun/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ya, Setujui Akun/i }));

    await waitFor(() => {
      expect(decideSpy).toHaveBeenCalledWith('reg-01', {
        keputusan: 'SETUJUI',
        alasan: null,
        versi: 1,
      });
    });
  });

  it('handles VERSION_CONFLICT (409) gracefully without throwing', async () => {
    vi.spyOn(publisherRegistrationApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: mockRegistrations,
      pagination: { page: 1, limit: 10, total_records: 2, total_pages: 1 },
    });
    vi.spyOn(publisherRegistrationApi, 'getAdminDetail').mockResolvedValue({
      success: true,
      data: mockDetail,
    });

    const conflictErr = new Error('Versi data telah berubah.');
    conflictErr.status = 409;
    conflictErr.data = { code: 'VERSION_CONFLICT' };
    vi.spyOn(publisherRegistrationApi, 'decideAdmin').mockRejectedValue(conflictErr);

    render(
      <MemoryRouter>
        <PublisherVerificationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Periksa & Putuskan/i })[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Periksa & Putuskan/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Terapkan Keputusan: Setujui/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Terapkan Keputusan: Setujui/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ya, Setujui Akun/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ya, Setujui Akun/i }));

    await waitFor(() => {
      expect(screen.getByText(/Konflik Versi: Data pendaftaran ini telah diperbarui oleh petugas lain/i)).toBeInTheDocument();
    });
  });
});
