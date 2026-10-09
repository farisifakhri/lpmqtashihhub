import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShippingLabelDialog } from './ShippingLabelDialog';
import { registrationApi } from '@/api/registration.api';

describe('ShippingLabelDialog', () => {
  const mockRegistration = {
    id: 'reg-123',
    registration_no: 'REG-2026-0099',
    title: 'Mushaf Al-Qur\'an Tajwid Digital Nusantara',
    publisher: {
      legal_name: 'PT Percetakan Menara Kudus',
      address: 'Jl. Menara No. 25, Kauman, Kudus, Jawa Tengah',
      phone: '081234567890',
      email: 'penerbit@menarakudus.co.id',
    },
    physical_master_intake: {
      volume_count: 30,
    },
    service_type: {
      name: 'Mushaf Standar Indonesia',
      category: {
        name: 'Tanda Tashih Baru',
      },
    },
    foreign_metadata: {
      penanggung_jawab_produk: 'H. Ahmad Fauzi',
      penanggung_jawab_wa: '081234567890',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'print').mockImplementation(() => {});
    vi.spyOn(registrationApi, 'downloadShippingLabelPdf').mockResolvedValue();
  });

  it('renders accurate publisher data and details without fallback defaults', () => {
    render(<ShippingLabelDialog isOpen={true} onClose={vi.fn()} registration={mockRegistration} />);

    expect(screen.getByText(/PT Percetakan Menara Kudus/i)).toBeInTheDocument();
    expect(screen.getByText('Jl. Menara No. 25, Kauman, Kudus, Jawa Tengah')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-0099')).toBeInTheDocument();
    expect(screen.getByText("Mushaf Al-Qur'an Tajwid Digital Nusantara")).toBeInTheDocument();
    expect(screen.getByText(/30 Jilid/)).toBeInTheDocument();
    expect(screen.getByText(/081234567890/)).toBeInTheDocument();
    expect(screen.getByText('H. Ahmad Fauzi')).toBeInTheDocument();
  });

  it('triggers download when Unduh Label PDF button is clicked', async () => {
    render(<ShippingLabelDialog isOpen={true} onClose={vi.fn()} registration={mockRegistration} />);

    const downloadButtons = screen.getAllByRole('button', { name: /Unduh Label PDF/i });
    expect(downloadButtons.length).toBeGreaterThan(0);
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(registrationApi.downloadShippingLabelPdf).toHaveBeenCalledWith(
        'reg-123',
        'Label-Pengiriman-REG-2026-0099.pdf'
      );
    });
  });

  it('triggers window.print when Cetak button is clicked', () => {
    render(<ShippingLabelDialog isOpen={true} onClose={vi.fn()} registration={mockRegistration} />);

    const printButton = screen.getByRole('button', { name: 'Cetak Label' });
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalled();
  });

  it('closes dialog when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<ShippingLabelDialog isOpen={true} onClose={handleClose} registration={mockRegistration} />);

    const closeBtn = screen.getByLabelText('Tutup dialog');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
