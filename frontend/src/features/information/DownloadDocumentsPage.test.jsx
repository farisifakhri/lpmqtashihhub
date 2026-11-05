import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DownloadDocumentsPage } from './DownloadDocumentsPage';
import { serviceDocumentApi } from '@/api/service-document.api';

vi.mock('@/api/service-document.api', () => ({
  serviceDocumentApi: {
    listPublic: vi.fn(),
    download: vi.fn(),
  },
}));

describe('DownloadDocumentsPage', () => {
  const document = {
    id: '18a35d15-a003-48f1-bf2a-18296ec3cbe3',
    title: 'Panduan Permohonan Surat Tanda Tashih',
    category: 'Panduan Memohon Surat Tanda Tashih',
    file_name: 'panduan-permohonan.pdf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    serviceDocumentApi.listPublic.mockResolvedValue({
      success: true,
      data: [document],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    serviceDocumentApi.download.mockResolvedValue(undefined);
  });

  it('shows all document categories by default and renders the requested table headers', async () => {
    render(<MemoryRouter><DownloadDocumentsPage /></MemoryRouter>);

    expect(await screen.findByText(document.title)).toBeInTheDocument();
    expect(serviceDocumentApi.listPublic).toHaveBeenCalledWith({ page: 1, limit: 10, category: 'ALL' });
    expect(screen.getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Judul Dokumen' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Kategori' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mushaf Isyarat' })).toBeInTheDocument();
  });

  it('filters by category, adjusts page size, and downloads the selected document', async () => {
    render(<MemoryRouter><DownloadDocumentsPage /></MemoryRouter>);
    await screen.findByText(document.title);

    fireEvent.change(screen.getByLabelText('Filter Kategori'), {
      target: { value: 'Produk LPMQ' },
    });
    await waitFor(() => {
      expect(serviceDocumentApi.listPublic).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        category: 'Produk LPMQ',
      });
    });

    fireEvent.change(screen.getByLabelText('Tampilkan Baris'), { target: { value: '25' } });
    await waitFor(() => {
      expect(serviceDocumentApi.listPublic).toHaveBeenLastCalledWith({
        page: 1,
        limit: 25,
        category: 'Produk LPMQ',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: `Unduh ${document.title}` }));
    await waitFor(() => expect(serviceDocumentApi.download).toHaveBeenCalledWith(document.id, document.file_name));
  });

  it('keeps table headers visible when the document list is empty', async () => {
    serviceDocumentApi.listPublic.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    render(<MemoryRouter><DownloadDocumentsPage /></MemoryRouter>);

    expect(await screen.findByText('Belum ada dokumen yang tersedia.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Judul Dokumen' })).toBeInTheDocument();
  });
});
