import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

