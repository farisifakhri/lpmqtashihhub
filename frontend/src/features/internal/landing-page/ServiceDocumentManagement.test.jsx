import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ServiceDocumentManagement } from './ServiceDocumentManagement';
import { serviceDocumentApi } from '@/api/service-document.api';

vi.mock('@/api/service-document.api', () => ({
  serviceDocumentApi: {
    listAdmin: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    downloadAdmin: vi.fn(),
  },
}));

describe('ServiceDocumentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceDocumentApi.listAdmin.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    serviceDocumentApi.create.mockResolvedValue({ success: true });
  });

  it('lists documents with publication controls and shows all six configured categories in the form', async () => {
    render(<ServiceDocumentManagement />);
    expect(await screen.findByRole('columnheader', { name: 'Status' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Dokumen' }));
    const dialog = screen.getByRole('dialog', { name: 'Tambah Dokumen Unduhan' });
    expect(within(dialog).getByLabelText('Dokumen PDF *')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Judul Dokumen *')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Kategori *').querySelectorAll('option')).toHaveLength(6);
    expect(within(dialog).getByText('Publikasikan dokumen ke halaman landing page')).toBeInTheDocument();
  });

  it('uploads a PDF with title, category, and draft status', async () => {
    render(<ServiceDocumentManagement />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tambah Dokumen' }));
    const dialog = screen.getByRole('dialog', { name: 'Tambah Dokumen Unduhan' });
    fireEvent.change(within(dialog).getByLabelText('Judul Dokumen *'), {
      target: { value: 'Panduan Pemohon Baru' },
    });
    fireEvent.change(within(dialog).getByLabelText('Kategori *'), {
      target: { value: 'Produk LPMQ' },
    });
    fireEvent.change(within(dialog).getByLabelText('Dokumen PDF *'), {
      target: { files: [new File(['pdf'], 'panduan.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(within(dialog).getByLabelText('Publikasikan dokumen ke halaman landing page'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan Dokumen' }));

    await waitFor(() => expect(serviceDocumentApi.create).toHaveBeenCalledTimes(1));
    const payload = serviceDocumentApi.create.mock.calls[0][0];
    expect(payload.get('title')).toBe('Panduan Pemohon Baru');
    expect(payload.get('category')).toBe('Produk LPMQ');
    expect(payload.get('is_published')).toBe('false');
    expect(payload.get('file').name).toBe('panduan.pdf');
  });

  it('sends category and publication filters to the admin list', async () => {
    render(<ServiceDocumentManagement />);
    await screen.findByRole('columnheader', { name: 'Status' });

    fireEvent.change(screen.getByLabelText('Filter Kategori'), {
      target: { value: 'Mushaf Isyarat' },
    });
    await waitFor(() => {
      expect(serviceDocumentApi.listAdmin).toHaveBeenLastCalledWith(expect.objectContaining({
        category: 'Mushaf Isyarat',
      }));
    });

    fireEvent.change(screen.getByLabelText('Status Publikasi'), { target: { value: 'false' } });
    await waitFor(() => {
      expect(serviceDocumentApi.listAdmin).toHaveBeenLastCalledWith(expect.objectContaining({
        category: 'Mushaf Isyarat',
        is_published: 'false',
      }));
    });
  });
});
