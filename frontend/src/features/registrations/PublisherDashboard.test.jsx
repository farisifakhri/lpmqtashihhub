import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherDashboard } from './PublisherDashboard';
import * as Auth from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';

const fixture = { id: 'rev-1', title: 'Naskah revisi', registration_no: 'REG-01', status: 'REVISION_REQUIRED' };
describe('Publisher dashboard', () => {
  beforeEach(() => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { id: 'publisher', roles: ['ADMIN_PENERBIT'], publisherName: 'Penerbit Nusantara' } });
    vi.spyOn(registrationApi, 'listRegistrations').mockImplementation(async params => params.segment ? { data: [fixture], pagination: { total: 9 } } : { data: [fixture], pagination: { total: 28 }, summary: { by_status: { DRAFT: 3, REVISION_REQUIRED: 4, AWAITING_PAYMENT: 2, IN_VERIFICATION: 10, COMPLETED: 9 }, issued_stt: 7 } });
  });
  const show = () => render(<MemoryRouter><PublisherDashboard /></MemoryRouter>);
  it('uses global scoped counts, not the six most recent rows', async () => {
    show();
    const total = screen.getByRole('link', { name: /Total (permohonan|pengajuan)/ });
    await waitFor(() => expect(total).toHaveTextContent('28'));
    expect(screen.getByRole('link', { name: /Perlu tindakan/ })).toHaveTextContent('9');
    expect(screen.getByRole('link', { name: /Sedang diproses/ })).toHaveTextContent('10');
    expect(screen.getByRole('link', { name: /(STT [Tt]erbit|Naskah dengan STT terbit)/ })).toHaveTextContent('7');
    expect(registrationApi.listRegistrations).toHaveBeenCalledWith({ page: 1, limit: 5, segment: 'PUBLISHER_ACTIONS' });
    expect(screen.queryByText('Tetapkan Tim')).not.toBeInTheDocument();
  });
  it('links a requested revision to the owned detail page', async () => {
    show();
    const actions = screen.getByRole('region', { name: 'Perlu tindakan' });
    const link = await within(actions).findByRole('link', { name: /Unggah perbaikan/ });
    expect(link).toHaveAttribute('href', '/publisher/registrations/rev-1');
    expect(screen.getByText(/Menampilkan 5 dari 9/)).toBeInTheDocument();
  });
  it('provides a first-registration empty state', async () => {
    registrationApi.listRegistrations.mockResolvedValue({ data: [], pagination: { total: 0 }, summary: { by_status: {}, issued_stt: 0 } });
    show();
    expect(await screen.findByText(/Belum ada (permohonan|pengajuan)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buat (permohonan|pengajuan) pertama/ })).toHaveAttribute('href', '/publisher/new-registration');
    expect(screen.getByText(/Tidak ada tindakan yang tertunda/)).toBeInTheDocument();
  });
  it('shows a fetch failure without misleading zeros and retries', async () => {
    registrationApi.listRegistrations.mockRejectedValueOnce(new Error('Koneksi terputus'));
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Koneksi terputus');
    expect(screen.getByRole('link', { name: /Total (permohonan|pengajuan)/ })).toHaveTextContent('—');
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
