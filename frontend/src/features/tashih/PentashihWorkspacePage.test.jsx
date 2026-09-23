import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PentashihWorkspacePage } from './PentashihWorkspacePage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as TashihApiModule from '@/api/tashih.api';

describe('PentashihWorkspacePage Component', () => {
  const mockAssignments = [
    {
      id: 'assign-1',
      status: 'ASSIGNED',
      stage: 'INITIAL',
      iteration: 1,
      due_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      created_at: new Date().toISOString(),
      registration: {
        id: 'reg-1',
        registration_no: 'REG-2026-001',
        title: 'Mushaf Al-Qur\'an Standar Usmani',
        status: 'TASHIH_IN_PROGRESS',
        publisher: {
          id: 'pub-1',
          legal_name: 'PT Pustaka Mushaf Utama',
          brand_name: 'Pustaka Utama',
        },
        service_type: {
          id: 'srv-1',
          name: 'Pentashihan Reguler',
        },
        manuscript_files: [
          {
            id: 'file-1',
            file_id: 'file-uuid-1',
            file_name: 'surat-al-baqarah.pdf',
            file_type: 'Master Mushaf A4',
            file_path: '/files/surat-al-baqarah.pdf',
            file_size: 1048576,
          },
        ],
      },
      team: {
        id: 'team-1',
        name: 'Tim Pentashih Al-Fatihah',
        decree_no: 'SK-2026-01',
      },
      reviews: [],
    },
    {
      id: 'assign-2',
      status: 'COMPLETED',
      stage: 'INITIAL',
      iteration: 1,
      due_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date().toISOString(),
      registration: {
        id: 'reg-2',
        registration_no: 'REG-2026-002',
        title: 'Mushaf Al-Qur\'an Tajwid Berwarna',
        status: 'TASHIH_IN_PROGRESS',
        publisher: {
          id: 'pub-2',
          legal_name: 'CV Media Quran',
        },
        service_type: {
          id: 'srv-2',
          name: 'Pentashihan Reguler',
        },
        manuscript_files: [],
      },
      team: {
        id: 'team-1',
        name: 'Tim Pentashih Al-Fatihah',
        decree_no: 'SK-2026-01',
      },
      reviews: [
        {
          id: 'rev-2',
          result: 'PASSED',
          notes: 'Tanda waqaf dan harakat telah sesuai.',
          completed_at: new Date().toISOString(),
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'pentashih-1',
        name: 'Dr. Ahmad Pentashih, M.Ag',
        role: 'PENTASHIH',
        roles: ['PENTASHIH'],
      },
    });

    vi.spyOn(TashihApiModule.tashihApi, 'getMyAssignments').mockResolvedValue({
      success: true,
      data: mockAssignments,
    });

    vi.spyOn(TashihApiModule.tashihApi, 'recordReview').mockResolvedValue({
      success: true,
      data: {
        id: 'rev-new',
        result: 'PASSED',
        notes: 'Hasil tashih memenuhi kaidah.',
      },
    });
  });

  it('merender ruang sidang pentashih dan menampilkan tugas aktif', async () => {
    render(
      <MemoryRouter>
        <PentashihWorkspacePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Ruang Sidang Pentashihan Mushaf/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Standar Usmani')).toBeInTheDocument();
      expect(screen.getByText('PT Pustaka Mushaf Utama')).toBeInTheDocument();
      expect(screen.getByText('Buka Lembar Telaah')).toBeInTheDocument();
    });
  });

  it('dapat membuka dialog input hasil sidang dan mencatat hasil evaluasi', async () => {
    render(
      <MemoryRouter>
        <PentashihWorkspacePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Buka Lembar Telaah')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buka Lembar Telaah'));

    await waitFor(() => {
      expect(screen.getByText(/Lembar Telaah Sidang Pentashihan/i)).toBeInTheDocument();
      expect(screen.getByText(/Lolos Tanpa Catatan \(Bersih\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Catatan Koreksi & Telaah/i)).toBeInTheDocument();
    });

    // Masukkan catatan sidang
    const textarea = screen.getByPlaceholderText(/Contoh format telaah/i);
    fireEvent.change(textarea, { target: { value: 'Seluruh rasm dan harakat telah ditashih dengan cermat.' } });

    // Submit dialog
    const submitBtn = screen.getByText('Kirim Hasil Telaah');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(TashihApiModule.tashihApi.recordReview).toHaveBeenCalledWith(
        'assign-1',
        expect.objectContaining({
          result: 'PASSED',
          notes: 'Seluruh rasm dan harakat telah ditashih dengan cermat.',
        })
      );
    });
  });

  it('dapat beralih ke tab riwayat selesai', async () => {
    render(
      <MemoryRouter>
        <PentashihWorkspacePage />
      </MemoryRouter>
    );

    const historyTab = await screen.findByRole('button', { name: /Riwayat Selesai/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('REG-2026-002')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Tajwid Berwarna')).toBeInTheDocument();
      expect(screen.getByText(/Tanda waqaf dan harakat telah sesuai/i)).toBeInTheDocument();
    });
  });
});
