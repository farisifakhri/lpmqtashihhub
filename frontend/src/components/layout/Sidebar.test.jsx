import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import * as AuthContext from '@/features/auth/AuthContext';
import * as QueueCounts from '@/features/queue/useQueueCounts';

const show = role => {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: { name: 'Petugas', role, roles: [role] } });
  render(<MemoryRouter><Sidebar /></MemoryRouter>);
};
describe('Helper Admin navigation', () => {
  it('labels ADMIN_INTERNAL correctly with operational workflow and hides publisher & superadmin system links', () => {
    show('ADMIN_INTERNAL');
    expect(screen.getByRole('link', { name: /Kendali Operasional/ })).toBeInTheDocument();
    // Helper admin has access to operational workflow steps
    expect(document.querySelector('a[href*="/internal/verifications"]')).not.toBeNull();
    expect(document.querySelector('a[href="/internal/distributions"]')).not.toBeNull();
    expect(document.querySelector('a[href*="/internal/tashih"]')).not.toBeNull();
    expect(document.querySelector('a[href="/internal/documents"]')).not.toBeNull();
    // Helper admin does NOT have access to publisher portal, signatures, and superadmin settings
    for (const path of ['/internal/settings', '/internal/users', '/internal/signatures', '/publisher']) {
      expect(document.querySelector(`a[href="${path}"]`)).toBeNull();
    }
  });

  it('shows live queue badges for the active admin role and keeps navigation role-specific', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'admin-1',
        name: 'Petugas',
        role: 'ADMIN_INTERNAL',
        roles: ['ADMIN_INTERNAL', 'SUPERADMIN'],
      },
    });
    const countsSpy = vi.spyOn(QueueCounts, 'useQueueCounts').mockReturnValue({
      counts: {
        publisher_registration_pending: 101,
        master_intake_pending: 2,
        verification_assignment_pending: 0,
      },
      error: null,
    });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.getByText('2', { selector: 'span' })).toBeInTheDocument();
    expect(document.querySelector('a[href="/internal/settings"]')).toBeNull();
    expect(screen.queryByText('Loket')).toBeNull();
    countsSpy.mockRestore();
  });

  it('hides admin counts when another role is active', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'admin-1',
        name: 'Petugas',
        role: 'PENERBIT',
        roles: ['ADMIN_INTERNAL', 'PENERBIT'],
      },
    });
    const countsSpy = vi.spyOn(QueueCounts, 'useQueueCounts').mockReturnValue({
      counts: { publisher_registration_pending: 3, master_intake_pending: 2 },
      error: null,
    });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /Permohonan Saya/ })).toBeInTheDocument();
    expect(screen.queryByText('2', { selector: 'span' })).toBeNull();
    expect(screen.queryByText('3', { selector: 'span' })).toBeNull();
    expect(document.querySelector('a[href="/internal/master-intake"]')).toBeNull();
    countsSpy.mockRestore();
  });

  it('does not create sidebar entries for PENANDATANGAN', () => {
    show('PENANDATANGAN');
    expect(document.querySelectorAll('nav a')).toHaveLength(0);
  });
  it('keeps SUPERADMIN navigation available', () => {
    show('SUPERADMIN');
    for (const path of ['/internal/verifications', '/internal/distributions', '/internal/tashih', '/internal/documents', '/internal/settings', '/internal/users', '/publisher']) {
      expect(document.querySelector(`a[href*="${path}"]`)).not.toBeNull();
    }
  });
});

describe('Distributor navigation', () => {
  it('membuka antrean penerimaan dan penugasan tim pada tab yang berbeda', () => {
    show('DISTRIBUTOR');
    expect(screen.getByRole('link', { name: /Master Menunggu Diterima/ })).toHaveAttribute('href', '/internal/distributions?stage=HANDOVER');
    expect(screen.getByRole('link', { name: /Distribusi Tim/ })).toHaveAttribute('href', '/internal/distributions?stage=ASSIGNMENT');
  });
});
describe('Verifikator navigation', () => {
  it('menyembunyikan menu Verifikasi Penerbit dan menampilkan badge notifikasi (Bug 13 & 25)', () => {
    show('VERIFIKATOR');
    // Verifikator tidak memiliki menu Verifikasi Penerbit (Langkah 1 khusus Admin)
    expect(document.querySelector('a[href="/internal/publishers"]')).toBeNull();

    // Verifikator memiliki menu Tugas Verifikasi dengan badge notifikasi
    const tugasLink = screen.getByRole('link', { name: /Tugas Verifikasi/ });
    expect(tugasLink).toBeInTheDocument();
    expect(tugasLink.textContent).toContain('1');
  });
});

describe('Multi-role cycling in Sidebar', () => {
  it('renders role switch button and cycles roles when user has multi-roles', () => {
    const switchActiveRole = vi.fn();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: {
        name: 'Ahmad Staff',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR', 'DISTRIBUTOR'],
      },
      switchActiveRole,
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const switchBtn = screen.getByRole('button', { name: /Ganti \(2\)/i });
    expect(switchBtn).toBeInTheDocument();

    switchBtn.click();
    expect(switchActiveRole).toHaveBeenCalledWith('DISTRIBUTOR');
  });
});
