import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { InformationGuideManagement } from './InformationGuideManagement';
import { informationGuideApi } from '@/api/information-guide.api';

vi.mock('@/api/information-guide.api', () => ({
  informationGuideApi: {
    listAdmin: vi.fn(),
    getAdmin: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadImage: vi.fn(),
    fetchFileBlobUrl: vi.fn(),
    fetchImageBlobUrl: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock('@/features/information/InformationGuideContent', () => ({
  InformationGuideContent: () => <div>Pratinjau konten panduan</div>,
}));

vi.mock('@/features/information/InformationGuideEditor', () => ({
  InformationGuideEditor: () => <div>Editor konten panduan</div>,
  prepareInformationGuideHtml: (html) => html,
}));

const guide = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  title: 'Panduan Admin',
  content_type: 'DOCUMENT',
  file_name: 'panduan.pdf',
  file_size: 100,
  mime_type: 'application/pdf',
  is_published: false,
  created_at: '2026-10-25T10:00:00.000Z',
  updated_at: '2026-10-25T10:00:00.000Z',
};

describe('InformationGuideManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    informationGuideApi.listAdmin.mockResolvedValue({
      success: true,
      data: [guide],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    informationGuideApi.create.mockResolvedValue({ success: true, data: guide });
  });

  it('lists admin guides with publication state and opens the create workflow', async () => {
    render(<InformationGuideManagement />);

    expect(await screen.findByText('Panduan Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Draf').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Tambah Panduan/i }));

    const dialog = screen.getByRole('dialog', { name: 'Tambah Panduan' });
    fireEvent.change(within(dialog).getByLabelText('Judul Panduan *'), { target: { value: 'Panduan Baru' } });
    fireEvent.change(within(dialog).getByLabelText('Bentuk Konten'), { target: { value: 'DOCUMENT' } });
    const file = new File(['%PDF-1.7'], 'panduan-baru.pdf', { type: 'application/pdf' });
    fireEvent.change(within(dialog).getByLabelText('Berkas panduan *'), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan Draf' }));

    await waitFor(() => expect(informationGuideApi.create).toHaveBeenCalledTimes(1));
    expect(informationGuideApi.create.mock.calls[0][0]).toBeInstanceOf(FormData);
  });
});
