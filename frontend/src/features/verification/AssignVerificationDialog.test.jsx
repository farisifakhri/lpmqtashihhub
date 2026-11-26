import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AssignVerificationDialog } from './AssignVerificationDialog';
import * as VerificationApiModule from '@/api/verification.api';

describe('AssignVerificationDialog Component', () => {
  const mockRegistration = {
    id: 'reg-test-123',
    registration_no: 'REG-2026-LPMQ-001',
    title: 'Mushaf Al-Qur\'an Rasm Usmani Standar Indonesia',
    publisher: {
      legal_name: 'PT Percetakan Menara Kudus',
    },
    physical_master_intake: {
      receipt_no: 'TT-LPMQ-2026-888',
      received_at: new Date().toISOString(),
    },
  };

  const mockVerifiers = [
    {
      id: 'v-1',
      name: 'Drs. H. Ahmad Verifikator, M.Ag',
      nip: '198001012005011001',
      active_assignments_count: 1,
    },
    {
      id: 'v-2',
      name: 'Hj. Siti Verifikator, S.Th.I',
      nip: '198502022008012002',
      active_assignments_count: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(VerificationApiModule.verificationApi, 'getDispositionNumberPreview').mockResolvedValue({
      success: true,
      data: { document_no: 'ND.001/LPMQ.01/TP.26/11/2026', issued_at: '2026-11-26T05:00:00.000Z', is_preview: true },
    });
    vi.spyOn(VerificationApiModule.verificationApi, 'listActiveVerifiers').mockResolvedValue({
      success: true,
      data: mockVerifiers,
    });
    vi.spyOn(VerificationApiModule.verificationApi, 'getVerifiers').mockResolvedValue({
      success: true,
      data: mockVerifiers,
    });
    vi.spyOn(VerificationApiModule.verificationApi, 'createAssignment').mockResolvedValue({
      success: true,
      data: {
        id: 'assign-new-1',
        registration_id: 'reg-test-123',
        status: 'ASSIGNED',
        documents: [
          {
            id: 'doc-nd-1',
            document_no: 'ND.01/LPMQ/VERIF/2026',
            document_type: 'SURAT_TUGAS',
          },
        ],
      },
    });
  });

  it('merender rincian naskah pemohon dan daftar verifikator aktif', async () => {
    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Terbitkan Disposisi & Tugaskan Verifikator')).toBeInTheDocument();
    expect(screen.getAllByText('REG-2026-LPMQ-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/PT Percetakan Menara Kudus/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/TT-LPMQ-2026-888/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Drs. H. Ahmad Verifikator, M.Ag/i)).toBeInTheDocument();
      expect(screen.getByText(/Hj. Siti Verifikator, S.Th.I/i)).toBeInTheDocument();
    });
  });

  it('menampilkan pesan validasi jika verifikator belum dipilih', async () => {
    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Terbitkan Disposisi & Tugaskan/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Silakan pilih verifikator yang akan ditugaskan/i)).toBeInTheDocument();
    expect(VerificationApiModule.verificationApi.createAssignment).not.toHaveBeenCalled();
  });

  it('menampilkan nomor disposisi preview dalam field read-only', async () => {
    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const notaInput = await screen.findByDisplayValue('ND.001/LPMQ.01/TP.26/11/2026');
    expect(notaInput).toHaveValue('ND.001/LPMQ.01/TP.26/11/2026');
    expect(notaInput).toHaveAttribute('readonly');
  });

  it('mengirim payload penugasan ke backend dan memanggil onSuccess ketika form valid', async () => {
    const onSuccessMock = vi.fn();
    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={vi.fn()}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'v-2' } });
    fireEvent.change(screen.getByPlaceholderText(/Tambahkan arahan atau atensi khusus/i), {
      target: { value: 'Periksa master fisik juz 1-30 sesuai master fisik naskah.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Terbitkan Disposisi & Tugaskan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(VerificationApiModule.verificationApi.createAssignment).toHaveBeenCalledWith(
        'reg-test-123',
        expect.objectContaining({
          verifier_id: 'v-2',
          notes: 'Periksa master fisik juz 1-30 sesuai master fisik naskah.',
        })
      );
      expect(VerificationApiModule.verificationApi.createAssignment.mock.calls[0][1]).not.toHaveProperty('nota_no');
      expect(onSuccessMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'assign-new-1',
          status: 'ASSIGNED',
        })
      );
    });
  });

  it('memanggil onClose saat tombol Batalkan diklik', async () => {
    const onCloseMock = vi.fn();
    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={onCloseMock}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /Batalkan/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('merender ringkasan konfirmasi penugasan dan tenggat target 2 hari kerja', async () => {
    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    expect(screen.getByText(/Ringkasan Konfirmasi Penugasan/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Hari Kerja \(Asia\/Jakarta\)/i)).toBeInTheDocument();
  });

  it('menangani error konflik 409 dengan pesan ramah dan memanggil onConflict jika tersedia', async () => {
    const onConflictMock = vi.fn();
    const conflictError = new Error('Pengajuan sudah memiliki verifikator aktif.');
    conflictError.status = 409;
    vi.spyOn(VerificationApiModule.verificationApi, 'createAssignment').mockRejectedValue(conflictError);

    render(
      <AssignVerificationDialog
        registration={mockRegistration}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onConflict={onConflictMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'v-1' } });
    const submitBtn = screen.getByRole('button', { name: /Terbitkan Disposisi & Tugaskan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Pengajuan sudah ditugaskan oleh pengguna lain\. Muat ulang antrean untuk melihat penugasan terbaru\./i)
      ).toBeInTheDocument();
      expect(onConflictMock).toHaveBeenCalledTimes(1);
    });
  });

  it('tetap mengizinkan admin memilih verifikator lain meskipun naskah memiliki rekomendasi tim inti (Bug 10 fix)', async () => {
    const registrationWithCore = {
      ...mockRegistration,
      core_verifier_id: 'v-1',
      core_team_number: 3,
    };
    render(
      <AssignVerificationDialog
        registration={registrationWithCore}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText(/Rekomendasi Tim Inti 3/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('v-1');

    // Admin dapat mengganti verifikator ke v-2
    fireEvent.change(select, { target: { value: 'v-2' } });
    expect(select).toHaveValue('v-2');
  });

  it('menampilkan peringatan pengalihan dan mengirim verifikator pilihan saat mengganti verifikator tim inti (issue #21)', async () => {
    const registrationWithCore = {
      ...mockRegistration,
      core_verifier_id: 'v-1',
      core_team_number: 1,
    };
    render(
      <AssignVerificationDialog
        registration={registrationWithCore}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const select = await screen.findByRole('combobox');
    expect(select).not.toBeDisabled();
    fireEvent.change(select, { target: { value: 'v-2' } });

    expect(screen.getByText(/Pengalihan Verifikator Tim Inti/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Terbitkan Disposisi & Tugaskan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(VerificationApiModule.verificationApi.createAssignment).toHaveBeenCalledWith(
        'reg-test-123',
        expect.objectContaining({
          verifier_id: 'v-2',
        })
      );
    });
  });
});
