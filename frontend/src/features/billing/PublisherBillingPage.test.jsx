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
        role: 'PENERBIT',
        roles: ['PENERBIT'],
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
      expect(screen.getByText('BILL-REG2026001-A1B2')).toBeInTheDocument();
    });

    expect(screen.getByText('Billing & Konfirmasi Pembayaran')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Mushaf Al-Qur\'an Standar Indonesia')).toBeInTheDocument();
    expect(screen.getByText('Konfirmasi Pembayaran')).toBeInTheDocument();
  });

  it('opens the Menunggu Bayar tab from its URL parameter', async () => {
    render(
      <MemoryRouter initialEntries={['/publisher/billing?tab=UNPAID']}>
        <PublisherBillingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(PaymentApiModule.paymentApi.listPayments).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'UNPAID' })
      );
    });
    expect(screen.getByRole('button', { name: 'Menunggu Bayar' })).toHaveClass('bg-white');
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

    fireEvent.click(screen.getByText('Konfirmasi Pembayaran'));

    expect(screen.getByText('Konfirmasi Pembayaran PNBP')).toBeInTheDocument();
    expect(screen.getAllByText(/Nomor Transaksi Penerimaan Negara/i).length).toBeGreaterThan(0);
  });

  it("B-04: merender tombol unduh Surat Lolos & Billing (PDF) jika dokumen verifikasi tersedia", async () => {
    vi.spyOn(PaymentApiModule.paymentApi, "listPayments").mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            ...mockPayments[0],
            registration: {
              ...mockPayments[0].registration,
              verification_documents: [
                {
                  id: "doc-ver-1",
                  document_no: "B-04/LPMQ.01/TL.01/10/2026",
                  document_type: "SURAT_HASIL_VERIFIKASI",
                  status: "SENT",
                },
              ],
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      },
    });

    render(
      <MemoryRouter>
        <PublisherBillingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Unduh Surat Lolos & Billing (PDF)")).toBeInTheDocument();
    });
  });

  it('dapat membuka modal konfirmasi pembayaran saat registration status VERIFICATION_APPROVED', async () => {
    vi.spyOn(PaymentApiModule.paymentApi, 'listPayments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            ...mockPayments[0],
            registration: {
              ...mockPayments[0].registration,
              status: 'VERIFICATION_APPROVED',
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      },
    });

    render(
      <MemoryRouter>
        <PublisherBillingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Konfirmasi Pembayaran')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Konfirmasi Pembayaran'));

    expect(screen.getByText('Konfirmasi Pembayaran PNBP')).toBeInTheDocument();
  });

  it('menampilkan badge menunggu pengesahan saat status masih dalam proses verifikasi', async () => {
    vi.spyOn(PaymentApiModule.paymentApi, 'listPayments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            ...mockPayments[0],
            registration: {
              ...mockPayments[0].registration,
              status: 'IN_VERIFICATION',
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      },
    });

    render(
      <MemoryRouter>
        <PublisherBillingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Menunggu Pengesahan Verifikasi')).toBeInTheDocument();
    });

    expect(screen.queryByText('Konfirmasi Pembayaran')).not.toBeInTheDocument();
  });
});
