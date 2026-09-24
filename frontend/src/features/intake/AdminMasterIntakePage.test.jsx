import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminMasterIntakePage } from './AdminMasterIntakePage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as RegistrationApiModule from '@/api/registration.api';
import * as VerificationApiModule from '@/api/verification.api';

describe('AdminMasterIntakePage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'admin-1',
        name: 'Petugas Loket LPMQ',
        role: 'ADMIN',
        roles: ['ADMIN'],
      },
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'reg-1',
            registration_no: 'REG-2026-001',
            title: 'Mushaf Al-Qur\'an Standar Kemenag',
            status: 'READY_FOR_VERIFICATION',
            publisher: {
              legal_name: 'PT Mushaf Nusantara',
              address: 'Jl. Percetakan No. 1, Jakarta',
            },
            service_type: {
              name: 'Mushaf Standar',
              category: { name: 'Mushaf Cetak' },
            },
            physical_master_intake: {
              format: 'A4',
              volume_count: 30,
              status: 'PENDING',
              condition: 'BAIK',
            },
          },
        ],
      },
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-1',
        registration_no: 'REG-2026-001',
        title: 'Mushaf Al-Qur\'an Standar Kemenag',
        status: 'READY_FOR_VERIFICATION',
        publisher: {
          legal_name: 'PT Mushaf Nusantara',
          address: 'Jl. Percetakan No. 1, Jakarta',
        },
        service_type: {
          name: 'Mushaf Standar',
          category: { name: 'Mushaf Cetak' },
        },
        physical_master_intake: {
          format: 'A4',
          volume_count: 30,
          status: 'PENDING',
          condition: 'BAIK',
        },
      },
    });
  });

  it('merender halaman intake loket dan melakukan pencarian nomor registrasi', async () => {
    render(
      <MemoryRouter>
        <AdminMasterIntakePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loket Intake Master Fisik Mushaf')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Contoh: REG-2026-001/i);
    fireEvent.change(input, { target: { value: 'REG-2026-001' } });

    const searchBtn = screen.getByText('Periksa Naskah');
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('1. Deklarasi Dokumen Penerbit')).toBeInTheDocument();
      expect(screen.getByText('2. Verifikasi Fisik Aktual di Loket')).toBeInTheDocument();
      expect(screen.getByText('Terima Master Fisik & Terbitkan Tanda Terima')).toBeInTheDocument();
      expect(screen.getByText('Kembalikan ke Penerbit')).toBeInTheDocument();
    });
  });

  it('menampilkan peringatan visual diff jika jumlah jilid fisik berbeda dari deklarasi', async () => {
    render(
      <MemoryRouter>
        <AdminMasterIntakePage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Contoh: REG-2026-001/i);
    fireEvent.change(input, { target: { value: 'REG-2026-001' } });
    fireEvent.click(screen.getByText('Periksa Naskah'));

    await waitFor(() => {
      expect(screen.getByText('2. Verifikasi Fisik Aktual di Loket')).toBeInTheDocument();
    });

    const volumeInput = screen.getByDisplayValue('30');
    fireEvent.change(volumeInput, { target: { value: '29' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Peringatan Perbedaan Jumlah Jilid Fisik/i)
      ).toBeInTheDocument();
    });
  });

  it('merender tombol aksi penugasan verifikator saat master fisik telah diterima', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'superadmin-1',
        name: 'Superadmin LPMQ',
        role: 'SUPERADMIN',
        roles: ['SUPERADMIN'],
      },
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-1',
        registration_no: 'REG-2026-001',
        title: 'Mushaf Al-Qur\'an Standar Kemenag',
        status: 'READY_FOR_VERIFICATION',
        publisher: { legal_name: 'PT Mushaf Nusantara' },
        service_type: { name: 'Mushaf Standar' },
        physical_master_intake: {
          format: 'A4',
          volume_count: 30,
          status: 'RECEIVED',
          condition: 'BAIK',
          receipt_no: 'TT-LPMQ-2026-001',
          received_at: new Date().toISOString(),
        },
      },
    });

    render(
      <MemoryRouter>
        <AdminMasterIntakePage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Contoh: REG-2026-001/i);
    fireEvent.change(input, { target: { value: 'REG-2026-001' } });
    fireEvent.click(screen.getByText('Periksa Naskah'));

    await waitFor(() => {
      expect(screen.getByText('Master Fisik Telah Resmi Diterima di Loket LPMQ')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tugaskan Verifikator Sekarang/i })).toBeInTheDocument();
      expect(screen.getByText('Cetak Tanda Terima')).toBeInTheDocument();
    });
  });

  it('merender antrean naskah yang menunggu master fisik dan membuka detail saat diklik', async () => {
    render(
      <MemoryRouter>
        <AdminMasterIntakePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Antrean Naskah Menunggu Master Fisik di Loket')).toBeInTheDocument();
      expect(screen.getByText('Proses Penerimaan Fisik')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Proses Penerimaan Fisik'));

    await waitFor(() => {
      expect(screen.getByText('1. Deklarasi Dokumen Penerbit')).toBeInTheDocument();
      expect(screen.getByText('Kembali ke Antrean Intake Loket')).toBeInTheDocument();
    });

    // Navigasi kembali ke daftar antrean
    fireEvent.click(screen.getByText('Kembali ke Antrean Intake Loket'));

    await waitFor(() => {
      expect(screen.getByText('Antrean Naskah Menunggu Master Fisik di Loket')).toBeInTheDocument();
    });
  });

  it('berhasil memproses pencarian ketika API backend mengembalikan res.data berupa array langsung', async () => {
    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockImplementation(async (params) => {
      if (params?.search) {
        return {
          success: true,
          data: [
            {
              id: 'reg-0355',
              registration_no: 'REG-202609-0355',
              title: 'Mushaf Al-Qur\'an Standar Kemenag RI',
              status: 'READY_FOR_VERIFICATION',
            },
          ],
        };
      }
      return { success: true, data: [] };
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-0355',
        registration_no: 'REG-202609-0355',
        title: 'Mushaf Al-Qur\'an Standar Kemenag RI',
        status: 'READY_FOR_VERIFICATION',
        publisher: { legal_name: 'PT Percetakan Al-Qur\'an' },
        physical_master_intake: {
          format: 'A4',
          volume_count: 30,
          status: 'PENDING',
          condition: 'BAIK',
        },
      },
    });

    render(
      <MemoryRouter>
        <AdminMasterIntakePage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Contoh: REG-2026-001/i);
    fireEvent.change(input, { target: { value: 'REG-202609-0355' } });

    const searchBtn = screen.getByRole('button', { name: /Periksa Naskah/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('1. Deklarasi Dokumen Penerbit')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Standar Kemenag RI')).toBeInTheDocument();
    });
  });
});

