import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VerifikatorInboxPage } from './VerifikatorInboxPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as VerificationApiModule from '@/api/verification.api';

describe('VerifikatorInboxPage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'verif-1',
        name: 'Drs. H. M. Sholihin',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR'],
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'assign-1',
            status: 'ASSIGNED',
            assigned_at: new Date().toISOString(),
            due_at: new Date(Date.now() + 86400000).toISOString(),
            registration: {
              id: 'reg-1',
              registration_no: 'REG-2026-001',
              title: 'Mushaf Al-Qur\'an Standar Kemenag',
              status: 'VERIFICATION_ASSIGNED',
              publisher: { legal_name: 'PT Mushaf Nusantara' },
              physical_master_intake: {
                status: 'RECEIVED',
                receipt_no: 'TT-LPMQ-2026-001',
              },
            },
            documents: [
              {
                id: 'doc-1',
                document_no: 'ND-VERIF-2026-001',
                version: 1,
              },
            ],
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });
  });

  it('merender judul antrean verifikasi dan item naskah yang ditugaskan', async () => {
    render(
      <MemoryRouter>
        <VerifikatorInboxPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Antrean Penugasan Verifikasi Berkas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Standar Kemenag')).toBeInTheDocument();
      expect(screen.getByText('PT Mushaf Nusantara')).toBeInTheDocument();
      expect(screen.getByText(/ND-VERIF-2026-001/i)).toBeInTheDocument();
      expect(screen.getByText('Mulai Pemeriksaan')).toBeInTheDocument();
    });
  });

  it('defaults to active assignments and searches from page one', async () => {
    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);
    await screen.findByText('REG-2026-001');
    expect(VerificationApiModule.verificationApi.listAssignments).toHaveBeenCalledWith(expect.objectContaining({ status: 'ASSIGNED', page: 1 }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari penugasan verifikasi' }), { target: { value: 'Naskah lama' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));
    await waitFor(() => expect(VerificationApiModule.verificationApi.listAssignments).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'Naskah lama' })));
  });

  it('does not display an empty queue when loading failed', async () => {
    VerificationApiModule.verificationApi.listAssignments.mockRejectedValue(new Error('Jaringan tidak tersedia'));
    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);
    await screen.findByText('Jaringan tidak tersedia');
    expect(screen.queryByText('Tidak Ada Penugasan Ditemukan')).not.toBeInTheDocument();
  });
});

