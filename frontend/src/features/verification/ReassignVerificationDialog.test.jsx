import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReassignVerificationDialog } from './ReassignVerificationDialog';
import * as VerificationApiModule from '@/api/verification.api';

describe('ReassignVerificationDialog Component', () => {
  const mockAssignment = {
    id: 'assign-test-123',
    status: 'ASSIGNED',
    verifier_id: 'v-1',
    verifier: {
      id: 'v-1',
      name: 'Drs. H. Ahmad Verifikator, M.Ag',
    },
    registration: {
      id: 'reg-test-123',
      registration_no: 'REG-2026-LPMQ-001',
      title: 'Mushaf Al-Qur\'an Standar Kemenag',
    },
    documents: [
      {
        id: 'doc-nd-1',
        document_type: 'NOTA_DINAS_VERIFIKASI',
        document_no: 'ND.01/LPMQ/VERIF/2026',
      },
    ],
  };

  const mockVerifiers = [
    {
      id: 'v-1', // current verifier, should be excluded
      name: 'Drs. H. Ahmad Verifikator, M.Ag',
      nip: '198001012005011001',
      active_assignment_count: 3,
    },
    {
      id: 'v-2', // eligible
      name: 'Hj. Siti Verifikator, S.Th.I',
      nip: '198502022008012002',
      active_assignment_count: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(VerificationApiModule.verificationApi, 'listActiveVerifiers').mockResolvedValue({
      success: true,
      data: mockVerifiers,
    });
    vi.spyOn(VerificationApiModule.verificationApi, 'reassignAssignment').mockResolvedValue({
      success: true,
      data: {
        assignment: { id: 'assign-new-456', status: 'ASSIGNED' },
        nota_dinas: { id: 'doc-nd-new', document_no: 'ND.02/LPMQ/REV/2026' },
      },
    });
  });

  it('mengecualikan verifikator saat ini dari daftar pilihan verifikator pengganti', async () => {
    render(
      <ReassignVerificationDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Tugaskan Ulang (Reassign) Verifikator')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-LPMQ-001')).toBeInTheDocument();

    await waitFor(() => {
      // Eligible verifier must be visible in list
      expect(screen.getByText('Hj. Siti Verifikator, S.Th.I')).toBeInTheDocument();
      // Current verifier must not be an option in the candidate list
      expect(screen.queryByText('198001012005011001')).not.toBeInTheDocument();
    });
  });

  it('memvalidasi pemilihan verifikator, nomor nota baru, dan alasan pengalihan', async () => {
    const onSuccessMock = vi.fn();
    render(
      <ReassignVerificationDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hj. Siti Verifikator, S.Th.I')).toBeInTheDocument();
    });

    // Select new verifier
    fireEvent.click(screen.getByText('Hj. Siti Verifikator, S.Th.I'));

    // Input new Nota Dinas
    const notaInput = screen.getByLabelText(/Nomor Nota Dinas Baru/i);
    fireEvent.change(notaInput, { target: { value: 'ND.02/LPMQ/REV/2026' } });

    // Input reason
    const reasonInput = screen.getByLabelText(/Alasan Pengalihan Tugas/i);
    fireEvent.change(reasonInput, { target: { value: 'Pemerataan beban kerja pentashihan mushaf.' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Terbitkan & Tugaskan Ulang/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(VerificationApiModule.verificationApi.reassignAssignment).toHaveBeenCalledWith('assign-test-123', {
        verifier_id: 'v-2',
        nota_no: 'ND.02/LPMQ/REV/2026',
        reason: 'Pemerataan beban kerja pentashihan mushaf.',
      });
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });
});

