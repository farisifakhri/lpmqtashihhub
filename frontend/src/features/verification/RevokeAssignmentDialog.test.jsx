import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RevokeAssignmentDialog } from './RevokeAssignmentDialog';
import * as VerificationApiModule from '@/api/verification.api';

describe('RevokeAssignmentDialog Component', () => {
  const mockAssignment = {
    id: 'assign-test-123',
    status: 'ASSIGNED',
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(VerificationApiModule.verificationApi, 'revokeAssignment').mockResolvedValue({
      success: true,
      data: {
        id: 'assign-test-123',
        status: 'REVOKED',
        revocation_reason: 'Verifikator sedang dinas luar kota.',
      },
    });
  });

  it('merender dialog pencabutan penugasan dengan rincian penugasan aktif', () => {
    render(
      <RevokeAssignmentDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Cabut Penugasan Verifikasi')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-LPMQ-001')).toBeInTheDocument();
    expect(screen.getByText('Drs. H. Ahmad Verifikator, M.Ag')).toBeInTheDocument();
    expect(screen.getByText('ND.01/LPMQ/VERIF/2026')).toBeInTheDocument();
  });

  it('memvalidasi alasan pencabutan minimal 5 karakter sebelum memanggil API', async () => {
    const onSuccessMock = vi.fn();
    render(
      <RevokeAssignmentDialog
        assignment={mockAssignment}
        onClose={vi.fn()}
        onSuccess={onSuccessMock}
      />
    );

    const textarea = screen.getByLabelText(/Alasan Pencabutan Penugasan/i);
    const submitBtn = screen.getByRole('button', { name: /Cabut Penugasan/i });

    // Submit kosong
    fireEvent.change(textarea, { target: { value: 'abc' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Alasan pencabutan penugasan wajib diisi \(minimal 5 karakter\)/i)).toBeInTheDocument();
    expect(VerificationApiModule.verificationApi.revokeAssignment).not.toHaveBeenCalled();

    // Submit valid
    fireEvent.change(textarea, { target: { value: 'Verifikator berhalangan tetap karena cuti dinas luar kota.' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(VerificationApiModule.verificationApi.revokeAssignment).toHaveBeenCalledWith('assign-test-123', {
        reason: 'Verifikator berhalangan tetap karena cuti dinas luar kota.',
      });
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });
});

