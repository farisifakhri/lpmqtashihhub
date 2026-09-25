import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualTeamAssignmentDialog } from './ManualTeamAssignmentDialog';
import { registrationApi } from '@/api/registration.api';
import { masterApi } from '@/api/master.api';

describe('Manual team assignment', () => {
  beforeEach(() => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({ data: { id: 'r1', registration_no: 'REG-01', title: 'Naskah siap distribusi', status: 'WAITING_DISTRIBUTION', registration_type: 'NEW', assignments: [], payment_records: [{ status: 'VERIFIED' }] } });
    vi.spyOn(masterApi, 'getDistributionTeams').mockResolvedValue({ data: [{ id: 't1', name: 'Tim aktif', decree_no: 'SK-01', status: 'ACTIVE', active_from: '2026-01-01', members: [
      { user_id: 'u1', status: 'ACTIVE', user: { name: 'Pentashih aktif', status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] } },
      { user_id: 'u2', status: 'ACTIVE', user: { name: 'Petugas bukan pentashih', status: 'ACTIVE', roles: [{ role: { code: 'VERIFIKATOR' } }] } },
      { user_id: 'u3', status: 'ACTIVE', user: { name: 'Pentashih nonaktif', status: 'INACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] } },
    ] }] });
    vi.spyOn(registrationApi, 'createAssignments').mockResolvedValue({ data: [] });
  });
  it('requires explicit team and member selection before assigning', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Tim dengan SK aktif' }), { target: { value: 't1' } });
    expect(screen.queryByText('Petugas bukan pentashih')).not.toBeInTheDocument();
    expect(screen.queryByText('Pentashih nonaktif')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pentashih aktif' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', { team_id: 't1', assignee_ids: ['u1'], stage: 'INITIAL' }));
    expect(assigned).toHaveBeenCalledOnce();
  });
  it('does not let HELPER_ADMIN skip verification or payment prerequisites', async () => {
    registrationApi.getDetail.mockResolvedValue({ data: { status: 'READY_FOR_VERIFICATION', title: 'Belum siap', payment_records: [] } });
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Belum siap');
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();
    expect(registrationApi.createAssignments).not.toHaveBeenCalled();
  });
  it('shows server concurrency errors without silently claiming success', async () => {
    registrationApi.createAssignments.mockRejectedValue(new Error('Status pengajuan telah berubah'));
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pentashih aktif' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Status pengajuan telah berubah');
  });
});
