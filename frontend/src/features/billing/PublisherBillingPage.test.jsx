import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherBillingPage } from './PublisherBillingPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as PaymentApiModule from '@/api/payment.api';

describe('PublisherBillingPage Component', () => {
  const mockPayments = [
    {
      id: 'pay-1',
      billing_no: 'BILL-REG2026001-A1B2',
      registration_id: 'reg-1',
      amount: 5000000,
      status: 'UNPAID',
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      registration: {
        id: 'reg-1',
        registration_no: 'REG-2026-001',
        title: 'Mushaf Al-Qur\'an Standar Indonesia',
        service_type: { name: 'Pentashihan Reguler 30 Juz' },
      },
    },
  ];

  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'pub-user-1',
        name: 'Ahmad Fauzi',
        role: 'ADMIN_PENERBIT',
        roles: ['ADMIN_PENERBIT'],
        publisherId: 'pub-corp-1',
      },
    });

    vi.spyOn(PaymentApiModule.paymentApi, 'listPayments').mockResolvedValue({
      success: true,
      data: {
        items: mockPayments,
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      },
    });
  });

  it('merender judul halaman billing dan kartu tagihan dengan SLA 7 hari', async () => {
    render(
      <MemoryRouter>
        <PublisherBillingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Billing & Konfirmasi Pembayaran')).toBeInTheDocument();
    });

    expect(screen.getByText('BILL-REG2026001-A1B2')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Mushaf Al-Qur\'an Standar Indonesia')).toBeInTheDocument();
    expect(screen.getByText('Konfirmasi Pembayaran')).toBeInTheDocument();
  });

  it('dapat membuka modal konfirmasi pembayaran saat tombol diklik', async () => {
    render(
      <MemoryRouter>
        <PublisherBillingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Konfirmasi Pembayaran')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByText('Konfirmasi Pembayaran');
    fireEvent.click(confirmBtn);

    expect(screen.getByText('Konfirmasi Pembayaran PNBP')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: 8274910284759281/i)).toBeInTheDocument();
    expect(screen.getByText(/Unggah Bukti Setor \/ Transfer/i)).toBeInTheDocument();
  });
});
