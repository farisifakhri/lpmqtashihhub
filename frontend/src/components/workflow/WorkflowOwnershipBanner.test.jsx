import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkflowOwnershipBanner } from './WorkflowOwnershipBanner';

describe('WorkflowOwnershipBanner Component', () => {
  it('merender status manusia, pemilik aksi, dan tombol aksi untuk user yang berhak', () => {
    const vm = {
      phase: 'VERIFICATION',
      statusCode: 'IN_VERIFICATION',
      statusLabel: 'Sedang Diverifikasi',
      statusDescription: 'Pemeriksaan checklist berkas sedang berjalan.',
      ownerRoleLabel: 'Verifikator',
      ownerName: 'Ahmad Sholihin',
      nextActionLabel: 'Lanjutkan telaah naskah',
      nextActionPath: '/internal/verifications/reg-1',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      isOverdue: false,
      blockedReason: null,
      canUserAct: true,
    };

    render(
      <MemoryRouter>
        <WorkflowOwnershipBanner viewModel={vm} />
      </MemoryRouter>
    );

    expect(screen.getByText('Sedang Diverifikasi')).toBeInTheDocument();
    expect(screen.getByText(/Pemeriksaan checklist berkas sedang berjalan/i)).toBeInTheDocument();
    expect(screen.getByText(/Verifikator \(Ahmad Sholihin\)/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lanjutkan telaah naskah/i })).toBeInTheDocument();
  });

  it('menampilkan blocker callout saat pekerjaan tertahan', () => {
    const vm = {
      phase: 'VERIFICATION',
      statusCode: 'READY_FOR_VERIFICATION',
      statusLabel: 'Menunggu Penugasan Verifikator',
      statusDescription: 'Naskah menunggu penugasan.',
      ownerRoleLabel: 'Kepala LPMQ',
      ownerName: null,
      nextActionLabel: 'Tugaskan',
      nextActionPath: '/internal/verifications',
      dueAt: null,
      isOverdue: false,
      blockedReason: 'Menunggu penyerahan master fisik A4 di loket.',
      canUserAct: true,
    };

    render(
      <MemoryRouter>
        <WorkflowOwnershipBanner viewModel={vm} />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Menunggu penyerahan master fisik A4 di loket/i)).toBeInTheDocument();
  });

  it('menampilkan pesan informatif saat user aktif bukan pemilik tindakan', () => {
    const vm = {
      phase: 'PAYMENT',
      statusCode: 'AWAITING_PAYMENT',
      statusLabel: 'Menunggu Pembayaran PNBP',
      statusDescription: 'Kode billing SIMPONI aktif.',
      ownerRoleLabel: 'Penerbit',
      ownerName: null,
      nextActionLabel: 'Bayar sekarang',
      nextActionPath: '/publisher/billing',
      dueAt: null,
      isOverdue: false,
      blockedReason: null,
      canUserAct: false,
    };

    render(
      <MemoryRouter>
        <WorkflowOwnershipBanner viewModel={vm} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Tindakan berikutnya merupakan kewenangan Penerbit/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Bayar sekarang/i })).not.toBeInTheDocument();
  });
});

