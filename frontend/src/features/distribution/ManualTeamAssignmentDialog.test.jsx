import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualTeamAssignmentDialog } from './ManualTeamAssignmentDialog';
import { registrationApi } from '@/api/registration.api';
import { masterApi } from '@/api/master.api';

describe('Manual team assignment (B-05)', () => {
  beforeEach(() => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      data: {
        id: 'r1',
        registration_no: 'REG-01',
        title: 'Naskah siap distribusi',
        status: 'WAITING_DISTRIBUTION',
        registration_type: 'NEW',
        assignments: [],
        payment_records: [{ status: 'VERIFIED' }],
      },
    });
    vi.spyOn(masterApi, 'getDistributionTeams').mockResolvedValue({
      data: [
        {
          id: 't1',
          name: 'Kelompok Reguler',
          decree_no: 'NOMOR-01',
          status: 'ACTIVE',
          active_from: '2026-01-01',
          members: [
            {
              user_id: 'u1',
              status: 'ACTIVE',
              user: { name: 'Pentashih satu', nip: '19800101', status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] },
            },
            {
              user_id: 'u2',
              status: 'ACTIVE',
              user: { name: 'Pentashih dua', nip: '19800102', status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] },
            },
            {
              user_id: 'u3',
              status: 'ACTIVE',
              user: { name: 'Petugas bukan pentashih', status: 'ACTIVE', roles: [{ role: { code: 'VERIFIKATOR' } }] },
            },
            {
              user_id: 'u4',
              status: 'ACTIVE',
              user: { name: 'Pentashih nonaktif', status: 'INACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] },
            },
          ],
        },
      ],
    });
    vi.spyOn(masterApi, 'getPentashihCandidates').mockResolvedValue({
      data: [
        { id: 'u1', name: 'Pentashih satu', nip: '19800101', email: 'satu@example.com', active_assignments_count: 0 },
        { id: 'u2', name: 'Pentashih dua', nip: '19800102', email: 'dua@example.com', active_assignments_count: 1 },
      ],
    });
    vi.spyOn(registrationApi, 'createAssignments').mockResolvedValue({ data: [] });
  });

  it('requires explicit selection and validates juz assignment without SK wording', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();

    // Pastikan tidak ada istilah SK pada label
    expect(screen.queryByLabelText(/tim dengan sk/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });

    expect(screen.queryByText('Petugas bukan pentashih')).not.toBeInTheDocument();
    expect(screen.queryByText('Pentashih nonaktif')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Pentashih satu/i }));
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Juz 1 untuk Pentashih satu' }));
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', {
      team_id: 't1',
      juz_assignments: [{ assignee_id: 'u1', juz_numbers: [1] }],
      stage: 'INITIAL',
    }));
    expect(assigned).toHaveBeenCalledOnce();
  });

  it('supports assigning 20-10 juz range using quick preset buttons', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');

    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Pentashih satu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Juz 1–20 (20 Juz)' }));

    expect(screen.getByText('Juz 1 s.d. 20 (20 Juz)')).toBeInTheDocument();

    // Pilih pentashih kedua untuk juz 21–30
    fireEvent.click(screen.getByRole('checkbox', { name: /Pentashih dua/i }));
    const presetButtons = screen.getAllByRole('button', { name: 'Juz 21–30 (10 Juz)' });
    fireEvent.click(presetButtons[presetButtons.length - 1]);

    expect(screen.getByText('Juz 21 s.d. 30 (10 Juz)')).toBeInTheDocument();
    expect(await screen.findByText(/Cakupan Penuh: Seluruh 30 Juz Lengkap/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', {
      team_id: 't1',
      juz_assignments: [
        { assignee_id: 'u1', juz_numbers: Array.from({ length: 20 }, (_, i) => i + 1) },
        { assignee_id: 'u2', juz_numbers: Array.from({ length: 10 }, (_, i) => i + 21) },
      ],
      stage: 'INITIAL',
    }));
    expect(assigned).toHaveBeenCalledOnce();
  });

  it('filters pentashih with search box', async () => {
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');

    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
    expect(screen.getByText('Pentashih satu')).toBeInTheDocument();
    expect(screen.getByText('Pentashih dua')).toBeInTheDocument();

    // Filter pencarian "dua"
    fireEvent.change(screen.getByPlaceholderText(/Cari berdasarkan nama/i), { target: { value: 'dua' } });
    expect(screen.queryByText('Pentashih satu')).not.toBeInTheDocument();
    expect(screen.getByText('Pentashih dua')).toBeInTheDocument();
  });

  it('does not let ADMIN_INTERNAL skip verification or payment prerequisites', async () => {
    registrationApi.getDetail.mockResolvedValue({ data: { status: 'READY_FOR_VERIFICATION', title: 'Belum siap', payment_records: [] } });
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Belum siap');
    expect(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();
    expect(registrationApi.createAssignments).not.toHaveBeenCalled();
  });

  it('shows server concurrency errors without silently claiming success', async () => {
    registrationApi.createAssignments.mockRejectedValue(new Error('Status pengajuan telah berubah'));
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Pentashih satu/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Juz 1 untuk Pentashih satu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Status pengajuan telah berubah');
  });
});
