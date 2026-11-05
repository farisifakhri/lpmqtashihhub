import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import * as AuthContext from '@/features/auth/AuthContext';
import { notificationApi } from '@/api/notification.api';
import { DATA_MUTATED_EVENT } from '@/api/client';

vi.mock('@/api/notification.api', () => ({
  notificationApi: { getSidebarBadges: vi.fn() },
  default: {},
}));

const mockBadges = data => notificationApi.getSidebarBadges.mockResolvedValue({ success: true, data });

beforeEach(() => {
  notificationApi.getSidebarBadges.mockReset();
  mockBadges({});
});

const show = (role, path = '/') => {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: { name: 'Petugas', role, roles: [role] } });
  render(<MemoryRouter initialEntries={[path]}><Sidebar /></MemoryRouter>);
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
    for (const path of ['/internal/settings', '/internal/users', '/internal/signatures', '/internal/surveys', '/publisher']) {
      expect(document.querySelector(`a[href="${path}"]`)).toBeNull();
    }
  });
  it('keeps SUPERADMIN navigation available', () => {
    show('SUPERADMIN');
    for (const path of ['/internal/verifications', '/internal/distributions', '/internal/tashih', '/internal/documents', '/internal/settings', '/internal/users', '/publisher']) {
      expect(document.querySelector(`a[href*="${path}"]`)).not.toBeNull();
    }
  });
  it('menampilkan menu Survei bertingkat dengan 7 sub-menu untuk SUPERADMIN', () => {
    show('SUPERADMIN');
    const toggle = screen.getByRole('button', { name: 'Survei' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('a[href^="/internal/surveys"]')).toBeNull();

    act(() => toggle.click());
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const links = [...document.querySelectorAll(`#${toggle.getAttribute('aria-controls')} a`)].map(a => a.textContent);
    expect(links).toEqual(['Nama Survei', 'Nama Unsur', 'Pertanyaan Survei', 'Pemilihan Survei', 'Jawaban Survei', 'Responden Survei', 'Laporan Survei']);
  });
  it('membuka grup Survei otomatis dan menandai sub-menu yang sedang dibuka', () => {
    show('SUPERADMIN', '/internal/surveys?tab=laporan');
    expect(screen.getByRole('button', { name: 'Survei' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Laporan Survei' })).toHaveClass('lpmq-sidebar-nav-active');
    expect(screen.getByRole('link', { name: 'Nama Survei' })).not.toHaveClass('lpmq-sidebar-nav-active');
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
  it('menyembunyikan menu Verifikasi Penerbit dan menampilkan badge notifikasi dari backend (Bug 13 & 25)', async () => {
    mockBadges({ verification_assigned: 1 });
    show('VERIFIKATOR');
    // Verifikator tidak memiliki menu Verifikasi Penerbit (Langkah 1 khusus Admin)
    expect(document.querySelector('a[href="/internal/publishers"]')).toBeNull();

    // Verifikator memiliki menu Tugas Verifikasi dengan badge merah berisi jumlah antrean
    const tugasLink = screen.getByRole('link', { name: /Tugas Verifikasi/ });
    const badge = await within(tugasLink).findByTestId('sidebar-pending-badge');
    expect(badge.textContent).toContain('1');
    expect(badge.className).toContain('bg-civic-danger');
    expect(tugasLink).toHaveAccessibleName(/1 menunggu tindakan/);
  });
});

describe('Badge notifikasi sidebar', () => {
  it('tidak menampilkan badge merah bila antrean kosong, dan tetap menampilkan label statis', async () => {
    mockBadges({ master_intake: 0, verification_need_assignment: 0 });
    show('ADMIN_INTERNAL');
    await waitFor(() => expect(notificationApi.getSidebarBadges).toHaveBeenCalled());
    expect(screen.queryAllByTestId('sidebar-pending-badge')).toHaveLength(0);
    expect(screen.getByRole('link', { name: /Intake Master Fisik/ }).textContent).toContain('Loket');
  });

  it('menampilkan badge pada tiap menu yang memiliki antrean, termasuk 99+ untuk jumlah besar', async () => {
    mockBadges({ publisher_registrations: 2, master_intake: 150, verification_need_assignment: 3 });
    show('ADMIN_INTERNAL');
    const intake = screen.getByRole('link', { name: /Intake Master Fisik/ });
    expect((await within(intake).findByTestId('sidebar-pending-badge')).textContent).toContain('99+');
    expect(within(screen.getByRole('link', { name: /Pendaftaran Penerbit/ })).getByTestId('sidebar-pending-badge').textContent).toContain('2');
    expect(within(screen.getByRole('link', { name: /Penugasan Verifikator/ })).getByTestId('sidebar-pending-badge').textContent).toContain('3');
    expect(screen.getAllByTestId('sidebar-pending-badge')).toHaveLength(3);
  });

  it('menjumlahkan antrean sidang awal dan revisi pada menu Tugas Saya pentashih', async () => {
    mockBadges({ tashih_initial: 2, tashih_revision: 3 });
    show('PENTASHIH');
    const link = screen.getByRole('link', { name: /Tugas Saya/ });
    expect((await within(link).findByTestId('sidebar-pending-badge')).textContent).toContain('5');
  });

  it('memuat ulang badge setelah ada perubahan data', async () => {
    mockBadges({ verification_assigned: 2 });
    show('VERIFIKATOR');
    const link = screen.getByRole('link', { name: /Tugas Verifikasi/ });
    expect((await within(link).findByTestId('sidebar-pending-badge')).textContent).toContain('2');

    mockBadges({ verification_assigned: 0 });
    act(() => { window.dispatchEvent(new CustomEvent(DATA_MUTATED_EVENT)); });
    await waitFor(() => expect(within(link).queryByTestId('sidebar-pending-badge')).toBeNull());
  });

  it('mengabaikan kegagalan backend tanpa merusak sidebar', async () => {
    notificationApi.getSidebarBadges.mockRejectedValue(new Error('server mati'));
    show('VERIFIKATOR');
    await waitFor(() => expect(notificationApi.getSidebarBadges).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /Tugas Verifikasi/ })).toBeInTheDocument();
    expect(screen.queryAllByTestId('sidebar-pending-badge')).toHaveLength(0);
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
