import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegulationInfoPage } from './RegulationInfoPage';
import { regulationApi } from '@/api/regulation.api';

vi.mock('@/api/regulation.api', () => ({
  regulationApi: {
    getPublicRegulations: vi.fn(),
    fetchPreviewBlobUrl: vi.fn(),
    downloadRegulation: vi.fn(),
  },
}));

describe('RegulationInfoPage Public Component', () => {
  const mockRegulations = [
    {
      id: 'reg-1',
      title: 'Keputusan Menteri Agama No. 44 Tahun 2024 tentang Petunjuk Pelaksanaan Pentashihan',
      category: 'Peraturan Menteri Agama RI',
      document_number: 'KMA No. 44 Tahun 2024',
      file_name: 'kma_44_2024.pdf',
      file_size: 102400,
      is_published: true,
      created_at: '2026-10-20T10:00:00.000Z',
    },
    {
      id: 'reg-2',
      title: 'Standar Operasional Prosedur Pentashihan Mushaf Standar Indonesia',
      category: 'Ketentuan Pentashihan',
      document_number: 'SOP-LPMQ-01/2023',
      file_name: 'sop_pentashihan.pdf',
      file_size: 51200,
      is_published: true,
      created_at: '2026-10-21T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    regulationApi.getPublicRegulations.mockResolvedValue({
      success: true,
      data: mockRegulations,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it('renders header, breadcrumbs, title and regulation table rows', async () => {
    render(
      <MemoryRouter>
        <RegulationInfoPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Dokumen Regulasi Resmi')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Regulasi Penerbit Mushaf Al-Qur’an/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/KMA No. 44 Tahun 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/SOP-LPMQ-01\/2023/i)).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: /Lihat/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Unduh/i })).toHaveLength(2);
  });

  it('uses the homepage public header and footer structure without duplicate layout regions', async () => {
    render(
      <MemoryRouter>
        <RegulationInfoPage />
      </MemoryRouter>
    );
    await screen.findByText(/KMA No. 44 Tahun 2024/i);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'z-50', 'border-b', 'border-line');
    expect(header.querySelector('img[alt="Logo Tashih LPMQ"]')).toHaveClass('h-10', 'w-auto');
    expect(within(header).getByRole('link', { name: 'LPMQ Kemenag RI' })).toHaveAttribute('href', '/');
    expect(within(header).getByRole('link', { name: /Hubungi Layanan Tashih Online melalui WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/628111997125'
    );
    expect(within(header).getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login');
    expect(within(header).queryByText('Login Penerbit')).not.toBeInTheDocument();
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('bg-brand-950', 'text-white');
    expect(within(footer).getByRole('region', { name: 'TENTANG KAMI' })).toBeInTheDocument();
    expect(within(footer).getByTitle(/Peta lokasi Lajnah Pentashihan/i)).toHaveAttribute('loading', 'lazy');
    expect(within(footer).getByText(/Gedung Bayt Al-Qur'an & Museum Istiqlal/i)).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Pengaduan' })).toHaveAttribute('href', '/');
    expect(within(footer).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/');
    expect(within(footer).queryByText('Layanan Terkait')).not.toBeInTheDocument();
  });

  it('shows only document titles and uses a complete category-style badge for document numbers', async () => {
    const longDocumentNumber = 'Keputusan Kepala Badan Litbang dan Diklat Kementerian Agama RI Nomor 89 Tahun 2023';
    const documentsWithLongNumber = [
      { ...mockRegulations[0], document_number: longDocumentNumber },
      mockRegulations[1],
    ];
    regulationApi.getPublicRegulations.mockResolvedValue({
      success: true,
      data: documentsWithLongNumber,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <RegulationInfoPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(mockRegulations[0].title)).toBeInTheDocument();
    expect(screen.queryByText(mockRegulations[0].file_name)).not.toBeInTheDocument();
    expect(screen.queryByText(mockRegulations[1].file_name)).not.toBeInTheDocument();
    expect(screen.queryByText('(100 KB)')).not.toBeInTheDocument();
    expect(screen.queryByText('(50 KB)')).not.toBeInTheDocument();

    const documentNumberBadge = screen.getByText(longDocumentNumber);
    expect(documentNumberBadge).toHaveClass('inline-flex', 'rounded-lg', 'border-brand-200', 'bg-brand-50');
    expect(documentNumberBadge.parentElement).toHaveTextContent(longDocumentNumber);
    const categoryBadge = documentNumberBadge.closest('tr').querySelector('td:nth-child(3) span');
    expect(categoryBadge).toHaveTextContent(mockRegulations[0].category);
    expect(categoryBadge).toHaveClass('rounded-lg', 'border-brand-200', 'bg-brand-50');
  });

  it('filters regulations when category is changed', async () => {
    render(
      <MemoryRouter>
        <RegulationInfoPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/KMA No. 44 Tahun 2024/i)).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/Kategori Regulasi/i);
    fireEvent.change(categorySelect, { target: { value: 'Ketentuan Pentashihan' } });

    await waitFor(() => {
      expect(regulationApi.getPublicRegulations).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Ketentuan Pentashihan',
          page: 1,
        })
      );
    });
  });

  it('opens preview modal when clicking Lihat', async () => {
    regulationApi.fetchPreviewBlobUrl.mockResolvedValue('blob:http://localhost/mock-preview');

    render(
      <MemoryRouter>
        <RegulationInfoPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/KMA No. 44 Tahun 2024/i)).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /Lihat/i });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(regulationApi.fetchPreviewBlobUrl).toHaveBeenCalledWith('reg-1');
      expect(screen.getByText(/Format: Dokumen PDF Resmi LPMQ/i)).toBeInTheDocument();
    });
  });

  it('triggers download when clicking Unduh', async () => {
    regulationApi.downloadRegulation.mockResolvedValue();

    render(
      <MemoryRouter>
        <RegulationInfoPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/KMA No. 44 Tahun 2024/i)).toBeInTheDocument();
    });

    const downloadButtons = screen.getAllByRole('button', { name: /Unduh/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(regulationApi.downloadRegulation).toHaveBeenCalledWith('reg-1', 'kma_44_2024.pdf');
    });
  });
});
