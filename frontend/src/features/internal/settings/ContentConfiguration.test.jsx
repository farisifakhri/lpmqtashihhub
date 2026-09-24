import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContentConfiguration } from './ContentConfiguration';
import * as AuthContext from '@/features/auth/AuthContext';
import { masterApi } from '@/api/master.api';

const service = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Layanan Uji Hapus',
  category_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  category: { name: 'Mushaf Cetak' },
  status: 'ACTIVE',
  base_fee: 0,
  duration_initial: 15,
  duration_revision: 7,
  duration_dummy: 3,
};

describe('ContentConfiguration delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: { role: 'SUPERADMIN', roles: ['SUPERADMIN'] } });
    vi.spyOn(masterApi, 'getCategories').mockResolvedValue({ data: [{ id: service.category_id, name: 'Mushaf Cetak' }] });
  });

  it('removes a service only after the API confirms deactivation', async () => {
    vi.spyOn(masterApi, 'getServiceTypes')
      .mockResolvedValueOnce({ data: [service] })
      .mockResolvedValueOnce({ data: [] });
    const deleteService = vi.spyOn(masterApi, 'deleteServiceType').mockResolvedValue({ success: true });

    render(<MemoryRouter><ContentConfiguration /></MemoryRouter>);
    expect(await screen.findByText(service.name)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Nonaktifkan konten'));
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan Konten' }));

    await waitFor(() => expect(deleteService).toHaveBeenCalledWith(service.id));
    await waitFor(() => expect(screen.queryByText(service.name)).not.toBeInTheDocument());
  });

  it('keeps the service and shows the server error when deactivation fails', async () => {
    vi.spyOn(masterApi, 'getServiceTypes').mockResolvedValue({ data: [service] });
    vi.spyOn(masterApi, 'deleteServiceType').mockRejectedValue(new Error('Layanan masih digunakan.'));

    render(<MemoryRouter><ContentConfiguration /></MemoryRouter>);
    expect(await screen.findByText(service.name)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Nonaktifkan konten'));
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan Konten' }));

    expect(await screen.findAllByText('Layanan masih digunakan.')).not.toHaveLength(0);
    expect(screen.getAllByText(service.name)).not.toHaveLength(0);
  });
});
