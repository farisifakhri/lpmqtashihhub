import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DistributorHandoverInboxPage } from './DistributorHandoverInboxPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as HandoverApiModule from '@/api/handover.api';
import * as RegistrationApiModule from '@/api/registration.api';
import * as MasterApiModule from '@/api/master.api';

describe('DistributorHandoverInboxPage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'dist-1',
        name: 'Ahmad Fauzi, S.Ag',
        role: 'DISTRIBUTOR',
        roles: ['DISTRIBUTOR'],
      },
    });

    vi.spyOn(HandoverApiModule.handoverApi, 'listHandovers').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'handover-1',
            receipt_no: 'BAST-VER-DIST-REG001-ABC123',
            registration_id: 'reg-1',
            stage: 'VERIFICATION_TO_DISTRIBUTION',
            status: 'PENDING',
            condition: 'BAIK',
            volume_count: 30,
            handed_over_at: new Date().toISOString(),
            received_at: null,
            tashih_due_at: null,
            notes: 'Master fisik diserahkan per juz A4 lengkap.',
            from_user: {
              id: 'verif-1',
              name: 'Drs. H. M. Sholihin',
              nip: '197501012000031001',
            },
            to_user: {
              id: 'dist-1',
              name: 'Ahmad Fauzi, S.Ag',
              nip: '198205122008011002',
            },
            registration: {
              id: 'reg-1',
              registration_no: 'REG-2026-001',
              title: 'Mushaf Al-Qur\'an Standar Kemenag RI',
              status: 'WAITING_DISTRIBUTOR_RECEIPT',
              publisher: {
                id: 'pub-1',
                legal_name: 'PT Mushaf Nusantara',
              },
              service_type: {
                id: 'srv-1',
                name: 'Pentashihan Reguler',
              },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    vi.spyOn(HandoverApiModule.handoverApi, 'receiveHandover').mockResolvedValue({
      success: true,
      data: {
        handover: {
          id: 'handover-1',
          status: 'RECEIVED',
        },
        registration: {
          id: 'reg-1',
          status: 'WAITING_DISTRIBUTION',
        },
      },
    });

    vi.spyOn(HandoverApiModule.handoverApi, 'returnHandover').mockResolvedValue({
      success: true,
      data: {
        handover: {
          id: 'handover-1',
          status: 'RETURNED',
        },
        registration: {
          id: 'reg-1',
          status: 'REVISION_REQUIRED',
        },
      },
    });
  });

  it('merender judul antrean serah-terima fisik dan data naskah BAST', async () => {
    render(
      <MemoryRouter>
        <DistributorHandoverInboxPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Antrean Serah-Terima Master Fisik/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/BAST-VER-DIST-REG001-ABC123/i)).toBeInTheDocument();
      expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Standar Kemenag RI')).toBeInTheDocument();
      expect(screen.getByText('PT Mushaf Nusantara')).toBeInTheDocument();
      expect(screen.getByText(/30 Jilid/i)).toBeInTheDocument();
      expect(screen.getByText('Konfirmasi Diterima (Langkah 8)')).toBeInTheDocument();
      expect(screen.getByText('Tolak / Kembalikan Fisik')).toBeInTheDocument();
    });
  });

  it('dapat membuka modal konfirmasi penerimaan fisik dan menetapkan tenggat pentashihan', async () => {
    render(
      <MemoryRouter>
        <DistributorHandoverInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Konfirmasi Diterima (Langkah 8)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Konfirmasi Diterima (Langkah 8)'));

    await waitFor(() => {
      expect(screen.getByText(/Konfirmasi Penerimaan Master Fisik \(Langkah 8 SOP\)/i)).toBeInTheDocument();
      expect(screen.getByText('Sahkan Penerimaan & Lanjut Distribusi')).toBeInTheDocument();
    });

    // Submit form modal penerimaan
    fireEvent.click(screen.getByText('Sahkan Penerimaan & Lanjut Distribusi'));

    await waitFor(() => {
      expect(HandoverApiModule.handoverApi.receiveHandover).toHaveBeenCalledWith(
        'handover-1',
        expect.objectContaining({
          condition: 'BAIK',
          volume_count: 30,
        })
      );
    });
  });

  it('dapat membuka modal pengembalian fisik cacat dan mengirimkan alasan penolakan', async () => {
    render(
      <MemoryRouter>
        <DistributorHandoverInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tolak / Kembalikan Fisik')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tolak / Kembalikan Fisik'));

    await waitFor(() => {
      expect(screen.getByText(/Kembalikan Master Fisik \(Cacat Fisik\)/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Jilid 14 halaman 12 robek/i);
    fireEvent.change(textarea, { target: { value: 'Jilid 5 halaman 10 buram tidak terbaca.' } });

    fireEvent.click(screen.getByText('Kembalikan Master Fisik'));

    await waitFor(() => {
      expect(HandoverApiModule.handoverApi.returnHandover).toHaveBeenCalledWith(
        'handover-1',
        expect.objectContaining({
          reason: 'Jilid 5 halaman 10 buram tidak terbaca.',
        })
      );
    });
  });

  it('membuka dialog penugasan dari antrean distributor untuk admin', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ currentUser: { id: 'admin-1', role: 'HELPER_ADMIN', roles: ['HELPER_ADMIN'] } });
    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({ data: [{ id: 'reg-1', registration_no: 'REG-2026-001', title: 'Mushaf Uji', status: 'WAITING_DISTRIBUTION' }] });
    vi.spyOn(RegistrationApiModule.registrationApi, 'getDetail').mockResolvedValue({ data: { id: 'reg-1', status: 'WAITING_DISTRIBUTION', payment_records: [{ status: 'VERIFIED' }] } });
    vi.spyOn(MasterApiModule.masterApi, 'getDistributionTeams').mockResolvedValue({ data: [] });
    render(<MemoryRouter><DistributorHandoverInboxPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Tim/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Tetapkan Tim Sidang/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('membuka dialog reviu dari panel monitoring', async () => {
    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({ data: [{ id: 'reg-1', registration_no: 'REG-2026-001', title: 'Mushaf Uji', status: 'TASHIH_IN_PROGRESS', assignments: [] }] });
    vi.spyOn(RegistrationApiModule.registrationApi, 'getDetail').mockResolvedValue({ data: { id: 'reg-1', registration_no: 'REG-2026-001', title: 'Mushaf Uji', status: 'TASHIH_IN_PROGRESS', assignments: [] } });
    render(<MemoryRouter><DistributorHandoverInboxPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Monitoring Sidang/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Lihat Hasil Anggota/i }));
    expect(await screen.findByText(/Reviu Hasil Pentashihan/i)).toBeInTheDocument();
  });
});

