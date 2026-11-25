import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    vi.spyOn(PaymentApiModule.paymentApi, 'getPaymentDetail').mockResolvedValue({
      data: {
        id: 'pay-1',
        status: 'PAID',
        registration: { id: 'reg-1', verification_assignments: [{ id: 'assign-1' }] },
      },
    });
    let finishVerification;
    vi.spyOn(PaymentApiModule.paymentApi, 'verifyPayment').mockReturnValue(
      new Promise(resolve => { finishVerification = resolve; })
    );
    render(<MemoryRouter><InternalPaymentQueuePage /></MemoryRouter>);
    fireEvent.click(await screen.findByText('Sahkan Pembayaran (Lunas)'));
    fireEvent.click(screen.getByText('Sahkan & Tetapkan Lunas'));

    const loadingButton = await screen.findByText('Memproses...');
    expect(loadingButton.closest('button')).toBeDisabled();
    await act(async () => finishVerification({
      success: true,
      data: { id: 'pay-1', status: 'VERIFIED' },
    }));

    expect(await screen.findByText('Lakukan Serah-Terima Fisik (BAST)')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(PaymentApiModule.paymentApi.verifyPayment).toHaveBeenCalledWith('pay-1');
  });

  it('menutup dialog dan menampilkan BAST bila pengesahan tersimpan tetapi responsnya gagal diterima', async () => {
    PaymentApiModule.paymentApi.listPayments.mockImplementation(async params => ({
      data: {
        items: [{
          id: 'pay-1',
          billing_no: 'BILL-2026-001',
          status: params.status === 'VERIFIED' ? 'VERIFIED' : 'PAID',
          registration: {
            id: 'reg-1',
            verification_assignments: [{ id: 'assign-1' }],
            physical_handovers: [],
          },
        }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    }));
    vi.spyOn(PaymentApiModule.paymentApi, 'getPaymentDetail')
      .mockResolvedValueOnce({ data: { id: 'pay-1', status: 'PAID' } })
      .mockResolvedValueOnce({ data: { id: 'pay-1', status: 'VERIFIED' } });
    vi.spyOn(PaymentApiModule.paymentApi, 'verifyPayment')
      .mockRejectedValue(new Error('Respons pengesahan tidak diterima.'));

    render(<MemoryRouter><InternalPaymentQueuePage /></MemoryRouter>);
    fireEvent.click(await screen.findByText('Sahkan Pembayaran (Lunas)'));
    fireEvent.click(screen.getByText('Sahkan & Tetapkan Lunas'));

    expect(await screen.findByText('Lakukan Serah-Terima Fisik (BAST)')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('menampilkan error di dalam dialog dan mengaktifkan tombol kembali bila pengesahan gagal', async () => {
    vi.spyOn(PaymentApiModule.paymentApi, 'getPaymentDetail').mockResolvedValue({
      data: { id: 'pay-1', status: 'PAID' },
    });
    vi.spyOn(PaymentApiModule.paymentApi, 'verifyPayment')
      .mockRejectedValue(new Error('Pembayaran belum dapat diverifikasi.'));

    render(<MemoryRouter><InternalPaymentQueuePage /></MemoryRouter>);
    fireEvent.click(await screen.findByText('Sahkan Pembayaran (Lunas)'));
    fireEvent.click(screen.getByText('Sahkan & Tetapkan Lunas'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Pembayaran belum dapat diverifikasi.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sahkan & Tetapkan Lunas').closest('button')).toBeEnabled();
  });
});

