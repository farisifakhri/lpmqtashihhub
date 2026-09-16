import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedDashboard } from './UnifiedDashboard';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as RegistrationApiModule from '@/api/registration.api';

describe('UnifiedDashboard Component (Role-Based & Harmonized Colors)', () => {
  beforeEach(() => {
    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({
      data: [
        {
          id: 'reg-1',
          registration_no: 'REG-2026-001',
          title: 'Mushaf Al-Qur\'an Standar 30 Juz',
          status: 'READY_FOR_VERIFICATION',
          created_at: new Date().toISOString(),
          publisher: { legal_name: 'PT Mushaf Nusantara Mandiri' },
          service_type: { name: 'Mushaf Standar', base_fee: 5000000 },
        },
      ],
    });
  });

  it('merender dasbor sesuai perspektif penerbit ketika role ADMIN_PENERBIT', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'pub-1',
        name: 'Ahmad Fauzi',
        role: 'ADMIN_PENERBIT',
        roles: ['ADMIN_PENERBIT'],
        publisherName: 'PT Mushaf Nusantara Mandiri',
      },
    });

    render(
      <MemoryRouter>
        <UnifiedDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/PT Mushaf Nusantara Mandiri/i)).toBeInTheDocument();
    expect(screen.getByText('Penerbit Mushaf Terdaftar')).toBeInTheDocument();
    expect(screen.getByText('Ajukan Naskah Baru')).toBeInTheDocument();
    expect(screen.getByText('Billing PNBP Terdaftar')).toBeInTheDocument();
  });

  it('merender dasbor sesuai perspektif petugas ketika role VERIFIKATOR', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'staff-1',
        name: 'Drs. H. M. Sholihin',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR'],
        nip: '197509152003121002',
      },
    });

    render(
      <MemoryRouter>
        <UnifiedDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Drs. H. M. Sholihin/i)).toBeInTheDocument();
    expect(screen.getByText(/Petugas LPMQ — VERIFIKATOR/i)).toBeInTheDocument();
    expect(screen.getAllByText('Verifikasi Berkas').length).toBeGreaterThanOrEqual(1);
  });

  it('merender tombol peralihan perspektif untuk SUPERADMIN', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'admin-1',
        name: 'Super Administrator',
        role: 'SUPERADMIN',
        roles: ['SUPERADMIN'],
      },
    });

    render(
      <MemoryRouter>
        <UnifiedDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Alur Sidang Internal')).toBeInTheDocument();
    expect(screen.getByText('Layanan Penerbit & PNBP')).toBeInTheDocument();
  });

  it('filters active work server-side and fetches the next FIFO page', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ currentUser: { id: 'staff', roles: ['VERIFIKATOR'], role: 'VERIFIKATOR' } });
    RegistrationApiModule.registrationApi.listRegistrations.mockResolvedValue({ data: [{ id: 'r1', title: 'Naskah FIFO', status: 'READY_FOR_VERIFICATION', created_at: new Date().toISOString() }], pagination: { page: 1, limit: 20, total: 25, totalPages: 2 } });
    render(<MemoryRouter><UnifiedDashboard /></MemoryRouter>);
    await screen.findByText('Naskah FIFO');
    expect(RegistrationApiModule.registrationApi.listRegistrations).toHaveBeenCalledWith(expect.objectContaining({ queue_only: 'true', limit: 20, page: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    await waitFor(() => expect(RegistrationApiModule.registrationApi.listRegistrations).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi \(/ }));
    await waitFor(() => expect(RegistrationApiModule.registrationApi.listRegistrations).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, segment: 'VERIFICATION' })));
  });
});
