import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherRegistrationsPage } from './PublisherRegistrationsPage';
import * as Auth from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
describe('Publisher registration history', () => {
  beforeEach(() => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { id: 'publisher', roles: ['ADMIN_PENERBIT'] } });
    vi.spyOn(registrationApi, 'listRegistrations').mockResolvedValue({ data: [{ id: 'r1', title: 'Naskah pertama', status: 'DRAFT' }], pagination: { total: 25, page: 1, limit: 12, totalPages: 3 } });
  });
  it('loads actions from a dashboard deep link and paginates server-side', async () => {
    render(<MemoryRouter initialEntries={['/publisher/registrations?view=actions']}><PublisherRegistrationsPage /></MemoryRouter>);
    await screen.findByText('Naskah pertama');
    expect(registrationApi.listRegistrations).toHaveBeenCalledWith(expect.objectContaining({ segment: 'PUBLISHER_ACTIONS', page: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    await waitFor(() => expect(registrationApi.listRegistrations).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    fireEvent.change(screen.getByLabelText('Filter pengajuan'), { target: { value: 'REVISION_REQUIRED' } });
    await waitFor(() => expect(registrationApi.listRegistrations).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'REVISION_REQUIRED', page: 1 })));
  });
  it('debounces server search and resets to page one', async () => {
    render(<MemoryRouter initialEntries={['/publisher/registrations?page=2']}><PublisherRegistrationsPage /></MemoryRouter>);
    await screen.findByText('Naskah pertama');
    fireEvent.change(screen.getByLabelText('Cari judul atau nomor pengajuan'), { target: { value: 'alfarisi' } });
    await waitFor(() => expect(registrationApi.listRegistrations).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'alfarisi', page: 1 })));
  });
  it('requests only issued STT registrations for the archive', async () => {
    registrationApi.listRegistrations.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } });
    render(<MemoryRouter><PublisherRegistrationsPage documents /></MemoryRouter>);
    expect(await screen.findByText('Belum ada STT yang diterbitkan untuk naskah Anda.')).toBeInTheDocument();
    expect(registrationApi.listRegistrations).toHaveBeenCalledWith(expect.objectContaining({ segment: 'PUBLISHER_DOCUMENTS' }));
  });
});
