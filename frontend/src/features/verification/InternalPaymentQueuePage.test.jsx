import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InternalPaymentQueuePage } from './InternalPaymentQueuePage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as PaymentApiModule from '@/api/payment.api';

describe('InternalPaymentQueuePage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'admin-1',
        name: 'Ahmad Verifikator',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR'],
      },
    });

    vi.spyOn(PaymentApiModule.paymentApi, 'listPayments').mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'pay-1',
            billing_no: 'BILL-2026-001',
            amount: 5000000,
            status: 'PAID',
            external_ref: 'NTPN-88992211',
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            receipt_file_id: 'file-slip-1',
            registration: {
              id: 'reg-1',
              registration_no: 'REG-2026-001',
              title: 'Mushaf Al-Qur\'an Standar Kemenag',
              publisher: {
                legal_name: 'PT Mushaf Nusantara',
                address: 'Jl. Percetakan No. 1, Jakarta',
              },
              service_type: {
                name: 'Mushaf Standar',
              },
            },
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });
  });

  it('merender antrean pembayaran, rincian billing terpilih, dan tombol sahkan pembayaran', async () => {
    render(
      <MemoryRouter>
        <InternalPaymentQueuePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verifikasi Pembayaran & Setoran PNBP')).toBeInTheDocument();
      expect(screen.getByText('BILL-2026-001')).toBeInTheDocument();
      expect(screen.getByText('NTPN-88992211')).toBeInTheDocument();
      expect(screen.getByText('Sahkan Pembayaran (Lunas)')).toBeInTheDocument();
      expect(screen.getByText('Tolak Bukti Bayar')).toBeInTheDocument();
    });
  });

  it('membuka dialog konfirmasi pengesahan ketika tombol sahkan diklik', async () => {
    render(
      <MemoryRouter>
        <InternalPaymentQueuePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sahkan Pembayaran (Lunas)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sahkan Pembayaran (Lunas)'));

    await waitFor(() => {
      expect(screen.getByText('Sahkan Pembayaran PNBP (Lunas)')).toBeInTheDocument();
      expect(screen.getByText('Sahkan & Tetapkan Lunas')).toBeInTheDocument();
    });
  });

  it('langsung menampilkan aksi serah terima setelah satu pemeriksaan bukti bayar', async () => {
    PaymentApiModule.paymentApi.listPayments.mockImplementation(async params => ({
      data: {
        items: [{
          id: 'pay-1', billing_no: 'BILL-2026-001', amount: 5000000,
          status: params.status === 'VERIFIED' ? 'VERIFIED' : 'PAID',
          receipt_file_id: 'file-slip-1',
          registration: {
            id: 'reg-1', registration_no: 'REG-2026-001', title: 'Mushaf Standar',
            publisher: { legal_name: 'PT Mushaf Nusantara' },
            verification_assignments: [{ id: 'assign-1' }], physical_handovers: [],
          },
        }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    }));
    vi.spyOn(PaymentApiModule.paymentApi, 'verifyPayment').mockResolvedValue({ success: true });
    render(<MemoryRouter><InternalPaymentQueuePage /></MemoryRouter>);
    fireEvent.click(await screen.findByText('Sahkan Pembayaran (Lunas)'));
    fireEvent.click(screen.getByText('Sahkan & Tetapkan Lunas'));
    expect(await screen.findByText('Lakukan Serah-Terima Fisik (BAST)')).toBeInTheDocument();
    expect(PaymentApiModule.paymentApi.verifyPayment).toHaveBeenCalledWith('pay-1');
  });
});

