import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrintingReportSection } from './PrintingReportSection';
import { documentationApi } from '@/api/documentation.api';

describe('U-16 / B-10: PrintingReportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockData = {
    registration_id: 'reg-123',
    registration_no: 'REG-2026-10-0001',
    summary: {
      total_oplah_allowed: 10000,
      total_oplah_printed: 3000,
      remaining_oplah: 7000,
      percentage_printed: 30,
      is_quota_exceeded: false,
      has_delivered_exemplars: false,
      exemplar_received_by_lpmq: false,
    },
    reports: [
      {
        id: 'rep-1',
        batch_no: 1,
        print_date: '2026-10-25',
        oplah_printed: 3000,
        printer_name: 'PT Percetakan Grafika',
        printer_location: 'Jakarta Timur',
        exemplar_sent: false,
        notes: 'Kloter cetak perdana',
      },
    ],
  };

  it('renders quota summary and reports correctly', async () => {
    vi.spyOn(documentationApi, 'getPrintingReports').mockResolvedValue({ data: mockData });

    render(<PrintingReportSection registrationId="reg-123" isPublisher={true} />);

    expect(screen.getByText(/Laporan Realisasi Pencetakan & Penyerahan 5 Eksemplar/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('10.000')).toBeInTheDocument();
      expect(screen.getByText('3.000')).toBeInTheDocument();
      expect(screen.getByText('7.000')).toBeInTheDocument();
      expect(screen.getByText(/Cetakan Ke-1/i)).toBeInTheDocument();
      expect(screen.getByText(/PT Percetakan Grafika/i)).toBeInTheDocument();
    });

    // Alert kewajiban 5 eksemplar
    expect(screen.getByText(/Perhatian: Kewajiban 5 Eksemplar Terbitan Final/i)).toBeInTheDocument();
  });

  it('allows publisher to open modal and submit a new printing report', async () => {
    vi.spyOn(documentationApi, 'getPrintingReports').mockResolvedValue({ data: mockData });
    vi.spyOn(documentationApi, 'createPrintingReport').mockResolvedValue({
      success: true,
      message: 'Laporan realisasi pencetakan berhasil dicatat.',
    });

    render(<PrintingReportSection registrationId="reg-123" isPublisher={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Laporkan Pencetakan Baru/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Laporkan Pencetakan Baru/i }));

    expect(screen.getByText(/Formulir Laporan Pencetakan Al-Qur'an/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Contoh: 5000/i), { target: { value: '4000' } });
    fireEvent.change(screen.getByPlaceholderText(/Contoh: PT Percetakan Grafika/i), { target: { value: 'PT Solo Grafika' } });
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Kudus, Jawa Tengah/i), { target: { value: 'Surakarta' } });

    // Checklist 5 eksemplar
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole('button', { name: /Simpan Laporan/i }));

    await waitFor(() => {
      expect(documentationApi.createPrintingReport).toHaveBeenCalledWith('reg-123', expect.objectContaining({
        oplah_printed: 4000,
        printer_name: 'PT Solo Grafika',
        printer_location: 'Surakarta',
        exemplar_sent: true,
      }));
    });
  });
});

