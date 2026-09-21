import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandSearchDialog } from './CommandSearchDialog';
import { NotificationCenter } from './NotificationCenter';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { notificationApi } from '@/api/notification.api';

describe('App Shell Components: CommandSearch & NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'u-1',
        name: 'Ahmad Verifikator',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR'],
      },
    });
  });

  it('CommandSearchDialog merender daftar perintah dan memfilter berdasarkan pencarian', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandSearchDialog isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: /Pencarian Global dan Perintah Cepat/i })).toBeInTheDocument();
    expect(screen.getByText('Tugas Verifikasi Naskah')).toBeInTheDocument();
    expect(screen.getByText('Pusat Kendali Operasional')).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Cari perintah atau halaman');
    fireEvent.change(searchInput, { target: { value: 'Pembayaran' } });

    expect(screen.getByText('Verifikasi Pembayaran PNBP')).toBeInTheDocument();
    expect(screen.queryByText('Tugas Verifikasi Naskah')).not.toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('NotificationCenter membuka panel notifikasi dan berpindah tab dengan data API riil', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'Penugasan Verifikator Baru: REG-2026-001',
        type: 'ASSIGNMENT',
        payload: { nota_no: 'ND-001', notes: 'Segera lakukan pemeriksaan' },
        read_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'notif-2',
        title: 'Pembaruan Panduan SOP v2.2',
        type: 'SYSTEM_INFO',
        payload: { notes: 'Ketentuan SLA 2 hari kerja diberlakukan' },
        read_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      success: true,
      data: mockNotifications,
    });
    vi.spyOn(notificationApi, 'markAsRead').mockResolvedValue({
      success: true,
      data: { ...mockNotifications[0], read_at: new Date().toISOString() },
    });

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Pemberitahuan/i });
    expect(bellBtn).toBeInTheDocument();

    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Perlu Tindakan/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Penugasan Verifikator Baru: REG-2026-001/i)).toBeInTheDocument();
    });

    const infoTab = screen.getByRole('button', { name: /Informasi/i });
    fireEvent.click(infoTab);

    await waitFor(() => {
      expect(screen.getByText(/Pembaruan Panduan SOP v2.2/i)).toBeInTheDocument();
    });
  });

  it('NotificationCenter mendukung penandaan dibaca (markAsRead)', async () => {
    const mockNotifications = [
      {
        id: 'notif-unread-1',
        title: 'Permohonan Persetujuan Draf Verifikasi',
        type: 'APPROVAL_REQUEST',
        payload: { notes: 'Mohon persetujuan draf' },
        read_at: null,
        created_at: new Date().toISOString(),
      },
    ];

    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      success: true,
      data: mockNotifications,
    });
    const markAsReadSpy = vi.spyOn(notificationApi, 'markAsRead').mockResolvedValue({
      success: true,
      data: { ...mockNotifications[0], read_at: new Date().toISOString() },
    });

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Pemberitahuan/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText(/Permohonan Persetujuan Draf Verifikasi/i)).toBeInTheDocument();
    });

    const markBtn = screen.getByTitle('Tandai sudah dibaca');
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(markAsReadSpy).toHaveBeenCalledWith('notif-unread-1');
    });
  });

  it('NotificationCenter mengarahkan link action ke canonical assignment URL atau payload.link', async () => {
    const mockNotifications = [
      {
        id: 'notif-assign-1',
        title: 'Penugasan verifikasi naskah',
        desc: 'Pemeriksaan kelengkapan naskah mushaf',
        type: 'ASSIGNMENT',
        registration_id: 'reg-abc-123',
        payload: {
          assignment_id: 'assign-xyz-789',
          link: '/internal/verifications/assign-xyz-789',
        },
        read_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'notif-tashih-1',
        title: 'Penugasan pentashihan baru',
        desc: 'Penugasan pentashihan naskah tahap 1',
        type: 'ASSIGNMENT',
        registration_id: 'reg-def-456',
        payload: {
          assignment_id: 'assign-tashih-111',
          link: '/internal/tashih',
        },
        read_at: null,
        created_at: new Date().toISOString(),
      },
    ];

    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      success: true,
      data: mockNotifications,
    });

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Pemberitahuan/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Penugasan verifikasi naskah')).toBeInTheDocument();
      expect(screen.getByText('Penugasan pentashihan baru')).toBeInTheDocument();
    });

    const actionLinks = screen.getAllByRole('link', { name: /Buka Pekerjaan/i });
    expect(actionLinks[0]).toHaveAttribute('href', '/internal/verifications/assign-xyz-789');
    expect(actionLinks[1]).toHaveAttribute('href', '/internal/tashih');
  });
});
