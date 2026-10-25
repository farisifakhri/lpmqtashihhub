import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicCertificateVerification } from './PublicCertificateVerification';
import apiClient from '@/api/client';

vi.mock('@/api/client', () => ({
  default: vi.fn(),
}));

describe('PublicCertificateVerification (Verifikasi QR Publik Sertifikat Penerbit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('menampilkan status SAH jika nomor induk terdaftar resmi di pangkalan data LPMQ', async () => {
    apiClient.mockResolvedValueOnce({
      valid: true,
      status: 'SAH',
      data: {
        nomor_induk_penerbit: '31.74.26.10.19.001',
        legal_name: 'PT Percetakan Menara Kudus',
        address: 'Jl. Sunan Kudus No. 19, Kudus, Jawa Tengah',
        npwp: '01.345.678.9-501.000',
        nib: '9120008899112',
        decided_at: '2026-10-19T00:00:00.000Z',
        verification_status: 'VERIFIED',
      },
    });

    render(
      <MemoryRouter initialEntries={['/verifikasi/sertifikat/31.74.26.10.19.001']}>
        <Routes>
          <Route path="/verifikasi/sertifikat/:nomorInduk" element={<PublicCertificateVerification />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/SERTIFIKAT RESMI TERCATAT & TERVERIFIKASI/i)).toBeInTheDocument();
    });

    expect(screen.getByText('PT Percetakan Menara Kudus')).toBeInTheDocument();
    expect(screen.getByText('01.345.678.9-501.000')).toBeInTheDocument();
    expect(screen.getByText('9120008899112')).toBeInTheDocument();
    expect(screen.getByText(/Sertifikat Penerbit Resmi/i)).toBeInTheDocument();
  });

  it('menampilkan status TIDAK TERDAFTAR jika nomor induk tidak ditemukan di database', async () => {
    apiClient.mockResolvedValueOnce({
      valid: false,
      status: 'TIDAK_TERDAFTAR',
    });

    render(
      <MemoryRouter initialEntries={['/verifikasi/sertifikat/99.99.99.99.99.999']}>
        <Routes>
          <Route path="/verifikasi/sertifikat/:nomorInduk" element={<PublicCertificateVerification />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/SERTIFIKAT TIDAK TERDAFTAR/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/tidak ditemukan dalam pangkalan data resmi LPMQ/i)).toBeInTheDocument();
  });

  it('menampilkan status PALSU / TIDAK VALID jika format nomor terindikasi manipulasi', async () => {
    apiClient.mockResolvedValueOnce({
      valid: false,
      status: 'TIDAK_VALID',
    });

    render(
      <MemoryRouter initialEntries={['/verifikasi/sertifikat/KODE-PALSU-123']}>
        <Routes>
          <Route path="/verifikasi/sertifikat/:nomorInduk" element={<PublicCertificateVerification />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/SERTIFIKAT TERINDIKASI TIDAK SAH \/ PALSU/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Peringatan Keamanan/i)).toBeInTheDocument();
    expect(screen.getByText(/Laporkan ke LPMQ/i)).toBeInTheDocument();
  });
});
