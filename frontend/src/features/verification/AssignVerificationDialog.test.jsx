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

    expect(screen.getByText('Terbitkan Nota Dinas & Tugaskan Verifikator')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-LPMQ-001')).toBeInTheDocument();
    expect(screen.getByText(/PT Percetakan Menara Kudus/i)).toBeInTheDocument();
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

    // Isi nomor nota saja, belum pilih verifikator
    const notaInput = screen.getByLabelText(/Nomor Nota Dinas Penugasan/i);
    fireEvent.change(notaInput, { target: { value: 'ND.01/LPMQ/2026' } });

    const submitBtn = screen.getByRole('button', { name: /Terbitkan Nota Dinas & Tugaskan/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Silakan pilih verifikator yang akan ditugaskan/i)).toBeInTheDocument();
    expect(VerificationApiModule.verificationApi.createAssignment).not.toHaveBeenCalled();
  });

  it('menampilkan pesan validasi jika nomor Nota Dinas kosong atau kurang dari 3 karakter', async () => {
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

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'v-1' } });

    const submitBtn = screen.getByRole('button', { name: /Terbitkan Nota Dinas & Tugaskan/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Nomor Nota Dinas wajib diisi/i)).toBeInTheDocument();
    expect(VerificationApiModule.verificationApi.createAssignment).not.toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText(/Nomor Nota Dinas Penugasan/i), {
      target: { value: 'ND.02/LPMQ.01/HM.01/09/2026' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Tambahkan arahan atau atensi khusus/i), {
      target: { value: 'Periksa master fisik juz 1-30 sesuai master loket.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Terbitkan Nota Dinas & Tugaskan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(VerificationApiModule.verificationApi.createAssignment).toHaveBeenCalledWith(
        'reg-test-123',
        {
          verifier_id: 'v-2',
          nota_no: 'ND.02/LPMQ.01/HM.01/09/2026',
          notes: 'Periksa master fisik juz 1-30 sesuai master loket.',
        }
      );
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
});
