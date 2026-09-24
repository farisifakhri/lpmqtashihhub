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

    expect(screen.getByText(/Antrean Verifikasi Berkas/i)).toBeInTheDocument();

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

  it('merender kartu tugas read-only "Draft Sedang Diperiksa Kepala LPMQ" saat status WAITING_APPROVAL', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'assign-2',
            status: 'WAITING_APPROVAL',
            assigned_at: new Date().toISOString(),
            registration: {
              id: 'reg-2',
              registration_no: 'REG-2026-002',
              title: 'Mushaf Al-Qur\'an Standar Kemenag',
              status: 'WAITING_VERIFICATION_APPROVAL',
              publisher: { legal_name: 'PT Mushaf Nusantara' },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Draft Sedang Diperiksa Kepala LPMQ')).toBeInTheDocument();
      expect(screen.getByText(/Tidak ada tindakan yang diperlukan dari Verifikator saat ini/i)).toBeInTheDocument();
      expect(screen.getByText('Lihat Detail Draf')).toBeInTheDocument();
    });
  });

  it('merender kartu tugas "Dokumen Siap Dikirim kepada Penerbit" saat status READY_TO_SEND', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'assign-3',
            status: 'READY_TO_SEND',
            assigned_at: new Date().toISOString(),
            registration: {
              id: 'reg-3',
              registration_no: 'REG-2026-003',
              title: 'Mushaf Al-Qur\'an Standar Kemenag',
              status: 'VERIFICATION_APPROVED',
              publisher: { legal_name: 'PT Mushaf Nusantara' },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Dokumen Siap Dikirim kepada Penerbit')).toBeInTheDocument();
      expect(screen.getByText('Kirim Dokumen ke Penerbit')).toBeInTheDocument();
    });
  });

  it('merender kartu tugas "Draf Dikembalikan oleh Kepala LPMQ" saat status IN_PROGRESS dengan return_reason', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'assign-4',
            status: 'IN_PROGRESS',
            return_reason: 'Perbaiki catatan checklist lembar 3.',
            assigned_at: new Date().toISOString(),
            registration: {
              id: 'reg-4',
              registration_no: 'REG-2026-004',
              title: 'Mushaf Al-Qur\'an Standar Kemenag',
              status: 'IN_VERIFICATION',
              publisher: { legal_name: 'PT Mushaf Nusantara' },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Draf Dikembalikan oleh Kepala LPMQ')).toBeInTheDocument();
      expect(screen.getByText(/Perbaiki catatan checklist lembar 3./i)).toBeInTheDocument();
      expect(screen.getByText('Revisi Pemeriksaan')).toBeInTheDocument();
    });
  });

  it('untuk peran SUPERADMIN: memuat tab Perlu Penugasan secara default dan membuka dialog penugasan', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'superadmin-1',
        name: 'Superadmin LPMQ',
        role: 'SUPERADMIN',
        roles: ['SUPERADMIN'],
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'listUnassignedRegistrations').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'reg-unassigned-1',
            registration_no: 'REG-2026-UNASSIGNED',
            title: 'Mushaf Al-Qur\'an Standar Usmani',
            status: 'READY_FOR_VERIFICATION',
            stage_entered_at: new Date().toISOString(),
            publisher: { legal_name: 'Penerbit Menara Kudus' },
            physical_master_intake: {
              status: 'RECEIVED',
              receipt_no: 'TT-LPMQ-2026-999',
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'getVerifiers').mockResolvedValue({
      success: true,
      data: [
        { id: 'v-1', name: 'Ahmad Verifikator', nip: '19800101', active_assignments_count: 2 },
      ],
    });

    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('REG-2026-UNASSIGNED')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Standar Usmani')).toBeInTheDocument();
      expect(screen.getByText('Naskah Siap Ditugaskan ke Verifikator')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tugaskan Verifikator/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Tugaskan Verifikator/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Terbitkan Nota Dinas & Tugaskan Verifikator')).toBeInTheDocument();
    });
  });

  it('untuk peran KEPALA_LPMQ: menampilkan tab persetujuan tanpa tombol penugasan', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'kepala-1',
        name: 'Kepala LPMQ',
        role: 'KEPALA_LPMQ',
        roles: ['KEPALA_LPMQ'],
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      },
    });

    render(<MemoryRouter><VerifikatorInboxPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Perlu Penugasan/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tugaskan Verifikator/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Menunggu Persetujuan/i })).toBeInTheDocument();
    });
  });
});

