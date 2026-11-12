import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import * as AuthContext from '@/features/auth/AuthContext';
import * as QueueCounts from '@/features/queue/useQueueCounts';
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
    expect(screen.getByRole('link', { name: /Penerimaan Master Fisik/ })).toHaveAttribute('href', '/internal/distributions/handover');
    expect(screen.getByRole('link', { name: /Penugasan Tim Sidang/ })).toHaveAttribute('href', '/internal/distributions/assignment');
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
    expect(screen.getByRole('link', { name: /Intake Master Fisik/ }).textContent).toContain('Intake');
  });

  it('menampilkan badge pada tiap menu yang memiliki antrean, termasuk 99+ untuk jumlah besar', async () => {
    mockBadges({ publisher_registrations: 2, master_intake: 150, verification_assigned: 3 });
    show('ADMIN_INTERNAL');
    const intake = screen.getByRole('link', { name: /Intake Master Fisik/ });
    expect((await within(intake).findByTestId('sidebar-pending-badge')).textContent).toContain('99+');
    expect(within(screen.getByRole('link', { name: /Pendaftaran Penerbit/ })).getByTestId('sidebar-pending-badge').textContent).toContain('2');
    expect(within(screen.getByRole('link', { name: /Verifikasi Berkas/ })).getByTestId('sidebar-pending-badge').textContent).toContain('3');
    expect(screen.getAllByTestId('sidebar-pending-badge')).toHaveLength(3);
  });

  it('menampilkan hitungan aktif gabungan pada menu pentashih', async () => {
    const countsSpy = vi.spyOn(QueueCounts, 'useQueueCounts').mockReturnValue({
      counts: { tashih_active: 5 },
      error: null,
    });
    show('PENTASHIH');
    const link = screen.getByRole('link', { name: /Sidang Pentashihan/ });
    expect(await within(link).findByLabelText('5 entri antrean menunggu tindakan')).toHaveTextContent('5');
    expect(link.querySelectorAll('[data-testid="sidebar-pending-badge"], [aria-label$="entri antrean menunggu tindakan"]')).toHaveLength(1);
    countsSpy.mockRestore();
  });

  it('menampilkan badge dinamis Kepala untuk persetujuan dan tanda tangan saja', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: { id: 'head-1', name: 'Kepala', role: 'KEPALA_LPMQ', roles: ['KEPALA_LPMQ'] },
    });
    const countsSpy = vi.spyOn(QueueCounts, 'useQueueCounts').mockReturnValue({
      counts: { verification_approval_pending: 2, head_signature_pending: 101 },
      error: null,
    });
    mockBadges({ signatures_pending: 8, stt_ready: 4 });
    const { unmount } = render(<MemoryRouter><Sidebar /></MemoryRouter>);

    const approvals = screen.getByRole('link', { name: /Persetujuan Verifikasi/ });
    const signatures = screen.getByRole('link', { name: /Pusat Tanda Tangan \(TTE\)/ });
    const stt = screen.getByRole('link', { name: /Penetapan STT/ });
    expect(approvals).toHaveAttribute('href', '/internal/verifications?tab=WAITING_APPROVAL');
    expect(await within(approvals).findByLabelText('2 entri antrean menunggu tindakan')).toHaveTextContent('2');
    expect(within(signatures).getByLabelText('101 entri antrean menunggu tindakan')).toHaveTextContent('99+');
    await waitFor(() => expect(notificationApi.getSidebarBadges).toHaveBeenCalled());
    expect(within(signatures).queryByTestId('sidebar-pending-badge')).toBeNull();
    expect(within(stt).queryByTestId('sidebar-pending-badge')).toBeNull();
    expect(screen.getAllByLabelText(/entri antrean menunggu tindakan/)).toHaveLength(2);

    unmount();
    countsSpy.mockRestore();
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

describe('Publisher navigation', () => {
  it('links to revision actions and unpaid billing, with separate live badges', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: { id: 'publisher-user', name: 'Penerbit', role: 'PENERBIT', roles: ['PENERBIT'] },
    });
    const countsSpy = vi.spyOn(QueueCounts, 'useQueueCounts').mockReturnValue({
      counts: { publisher_revision_pending: 1, publisher_billing_unpaid: 100 },
      error: null,
    });
    const legacyBadgesSpy = vi.spyOn(notificationApi, 'getSidebarBadges').mockResolvedValue({
      data: { publisher_billing: 1 },
    });
    const { unmount } = render(<MemoryRouter><Sidebar /></MemoryRouter>);

    const registrations = screen.getByRole('link', { name: /Permohonan Saya/ });
    const revisions = screen.getByRole('link', { name: /Perbaikan Naskah/ });
    const billing = screen.getByRole('link', { name: /Tagihan/ });
    expect(registrations).toHaveAttribute('href', '/publisher/registrations?view=actions');
    expect(revisions).toHaveAttribute('href', '/publisher/revisions');
    expect(billing).toHaveAttribute('href', '/publisher/billing?tab=UNPAID');
    expect(registrations).toHaveTextContent('1');
    expect(revisions).toHaveTextContent('1');
    expect(revisions.querySelectorAll('[data-testid="sidebar-pending-badge"], [aria-label$="entri antrean menunggu tindakan"]')).toHaveLength(1);
    expect(revisions).not.toHaveTextContent('Revisi');
    expect(billing).toHaveTextContent('99+');
    expect(billing.querySelectorAll('[data-testid="sidebar-pending-badge"], [aria-label$="entri antrean menunggu tindakan"]')).toHaveLength(1);
    for (const path of ['/publisher', '/publisher/new-registration', '/publisher/documents']) {
      expect(document.querySelector(`a[href="${path}"]`)?.querySelector('[aria-label$="entri antrean menunggu tindakan"]')).toBeNull();
    }
    unmount();
    countsSpy.mockRestore();
    legacyBadgesSpy.mockRestore();
  });
});

describe('Publisher navigation', () => {
  it('links to revision actions and unpaid billing, with separate live badges', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: { name: 'Penerbit', role: 'PENERBIT', roles: ['PENERBIT'] },
    });
    const countsSpy = vi.spyOn(QueueCounts, 'useQueueCounts').mockReturnValue({
      counts: { publisher_revision_pending: 1, publisher_billing_unpaid: 100 },
      error: null,
    });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    const registrations = screen.getByRole('link', { name: /Permohonan Saya/ });
    const billing = screen.getByRole('link', { name: /Tagihan/ });
    expect(registrations).toHaveAttribute('href', '/publisher/registrations?view=actions');
    expect(billing).toHaveAttribute('href', '/publisher/billing?tab=UNPAID');
    expect(registrations).toHaveTextContent('1');
    expect(billing).toHaveTextContent('99+');
    for (const label of ['Beranda', 'Permohonan Tanda Tashih Baru', 'Arsip Dokumen']) {
      expect(screen.getByRole('link', { name: new RegExp(label) }).querySelector('[aria-label$="entri antrean menunggu tindakan"]')).toBeNull();
    }
    countsSpy.mockRestore();
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
