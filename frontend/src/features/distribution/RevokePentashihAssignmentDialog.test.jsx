import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevokePentashihAssignmentDialog } from './RevokePentashihAssignmentDialog';
import { tashihApi } from '@/api/tashih.api';

vi.mock('@/api/tashih.api', () => ({
  tashihApi: {
    revokeAssignment: vi.fn(),
  },
}));

describe('RevokePentashihAssignmentDialog Component (B-19b)', () => {
  const mockAssignment = {
    id: 'asg-test-123',
    status: 'IN_PROGRESS',
    assignee: { name: 'Drs. H. Ahmad Pentashih, M.Ag.' },
    juz_items: [{ juz_number: 1 }, { juz_number: 2 }, { juz_number: 3 }],
    registration: {
      registration_no: 'REG-2026-999',
      title: 'Mushaf Al-Qur\'an Standar Indonesia',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merender rincian naskah, pentashih, dan peringatan kebijakan pencabutan', () => {
    render(
      <RevokePentashihAssignmentDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Pelepasan Penugasan Pentashih')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-999')).toBeInTheDocument();
    expect(screen.getByText('Mushaf Al-Qur\'an Standar Indonesia')).toBeInTheDocument();
    expect(screen.getByText('Drs. H. Ahmad Pentashih, M.Ag.')).toBeInTheDocument();
    expect(screen.getByText('Juz 1, 2, 3')).toBeInTheDocument();
    expect(screen.getByText(/Peringatan Integritas Cakupan Juz/i)).toBeInTheDocument();
  });

  it('memvalidasi alasan pencabutan minimal 10 karakter sebelum mengizinkan submit', async () => {
    render(
      <RevokePentashihAssignmentDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Lepas Penugasan/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/Alasan Pelepasan/i);
    fireEvent.change(textarea, { target: { value: 'Cuti sakit' } }); // 10 chars, wait: 'Cuti sak' is 8 chars
    fireEvent.change(textarea, { target: { value: 'Cuti sak' } }); // 8 chars (< 10)
    expect(submitBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Cuti ibadah umrah selama 14 hari' } }); // > 10 chars
    expect(submitBtn).not.toBeDisabled();
  });

  it('memanggil tashihApi.revokeAssignment dan memanggil onSuccess saat berhasil', async () => {
    tashihApi.revokeAssignment.mockResolvedValueOnce({
      success: true,
      message: 'Penugasan berhasil dicabut.',
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <RevokePentashihAssignmentDialog
        assignment={mockAssignment}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const textarea = screen.getByLabelText(/Alasan Pelepasan/i);
    fireEvent.change(textarea, { target: { value: 'Mengambil cuti melahirkan 3 bulan' } });

    const submitBtn = screen.getByRole('button', { name: /Lepas Penugasan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tashihApi.revokeAssignment).toHaveBeenCalledWith('asg-test-123', {
        reason: 'Mengambil cuti melahirkan 3 bulan',
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('menampilkan pesan galat saat API mengembalikan error', async () => {
    tashihApi.revokeAssignment.mockRejectedValueOnce(
      new Error('Penugasan pentashih sudah selesai dan tidak dapat dicabut.')
    );

    render(
      <RevokePentashihAssignmentDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText(/Alasan Pelepasan/i);
    fireEvent.change(textarea, { target: { value: 'Alasan cuti yang cukup panjang' } });

    const submitBtn = screen.getByRole('button', { name: /Lepas Penugasan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/sudah selesai dan tidak dapat dicabut/i);
    });
  });
});
