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
  it('HELPER_ADMIN sees team assignment but not operational or system-admin shortcuts', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ currentUser: { id: 'admin-internal', roles: ['HELPER_ADMIN'], role: 'HELPER_ADMIN' } });
    RegistrationApiModule.registrationApi.listRegistrations.mockResolvedValue({ data: [{ id: 'r1', title: 'Siap ditugaskan', status: 'WAITING_DISTRIBUTION', created_at: new Date().toISOString() }] });
    render(<MemoryRouter><UnifiedDashboard /></MemoryRouter>);
    await screen.findByText('Siap ditugaskan');
    expect(screen.getByText('Penugasan Tim')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tetapkan Tim' })).toBeInTheDocument();
    for (const title of ['Master Data Layanan', 'Identitas dan Akses', 'Verifikasi Berkas', 'Penetapan STT', 'Sidang Pentashihan']) expect(screen.queryByRole('link', { name: new RegExp(title) })).not.toBeInTheDocument();
  });
  it('DISTRIBUTOR cannot see the manual team assignment controls', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ currentUser: { id: 'distributor', roles: ['DISTRIBUTOR'], role: 'DISTRIBUTOR' } });
    RegistrationApiModule.registrationApi.listRegistrations.mockResolvedValue({ data: [{ id: 'r1', title: 'Antrean distribusi', status: 'WAITING_DISTRIBUTION', created_at: new Date().toISOString() }] });
    render(<MemoryRouter><UnifiedDashboard /></MemoryRouter>);
    await screen.findByText('Antrean distribusi');
    expect(screen.queryByRole('button', { name: 'Tetapkan Tim' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Penugasan Tim/ })).not.toBeInTheDocument();
  });

  it('SUPERADMIN sees Tugaskan Verifikator on READY_FOR_VERIFICATION rows when physical master is received', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { id: 'superadmin-1', roles: ['SUPERADMIN'], role: 'SUPERADMIN' },
    });
    RegistrationApiModule.registrationApi.listRegistrations.mockResolvedValue({
      data: [
        {
          id: 'reg-ready-1',
          registration_no: 'REG-2026-999',
          title: 'Mushaf Standar Uji Penugasan',
          status: 'READY_FOR_VERIFICATION',
          created_at: new Date().toISOString(),
          physical_master_intake: { status: 'RECEIVED', receipt_no: 'TT-001' },
        },
      ],
    });

    render(
      <MemoryRouter>
        <UnifiedDashboard />
      </MemoryRouter>
    );

    await screen.findByText('Mushaf Standar Uji Penugasan');
    expect(screen.getByRole('button', { name: /Tugaskan Verifikator/i })).toBeInTheDocument();
  });

  it('HELPER_ADMIN sees Intake Master Fisik action link on READY_FOR_VERIFICATION rows when physical master is pending', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { id: 'admin-loket', roles: ['HELPER_ADMIN'], role: 'HELPER_ADMIN' },
    });
    RegistrationApiModule.registrationApi.listRegistrations.mockResolvedValue({
      data: [
        {
          id: 'reg-intake-1',
          registration_no: 'REG-2026-888',
          title: 'Mushaf Menunggu Master Fisik',
          status: 'READY_FOR_VERIFICATION',
          created_at: new Date().toISOString(),
          physical_master_intake: { status: 'PENDING' },
        },
      ],
    });

    render(
      <MemoryRouter>
        <UnifiedDashboard />
      </MemoryRouter>
    );

    await screen.findByText('Mushaf Menunggu Master Fisik');
    expect(screen.getByRole('link', { name: /Loket Intake Master Fisik/i })).toBeInTheDocument();
    const intakeLink = screen.getByRole('link', { name: /^Intake Master Fisik$/i });
    expect(intakeLink).toBeInTheDocument();
    expect(intakeLink.getAttribute('href')).toContain('/internal/master-intake?search=REG-2026-888');
  });
});
