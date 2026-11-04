import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { informationGuideApi } from '@/api/information-guide.api';
import { InformationGuidePage } from './InformationGuidePage';

vi.mock('@/api/information-guide.api', () => ({
  informationGuideApi: {
    listPublic: vi.fn(),
    getPublic: vi.fn(),
    fetchFileBlobUrl: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock('@/components/public/PublicHeader', () => ({
  PublicHeader: () => <header aria-label="Public header" />,
  PUBLIC_INFORMATION_NAV_ITEMS: [],
}));

vi.mock('@/components/public/PublicFooter', () => ({
  PublicFooter: () => <footer aria-label="Public footer" />,
}));

vi.mock('./InformationGuideContent', () => ({
  InformationGuideContent: ({ html }) => <div data-testid="guide-content">{html}</div>,
}));

const guide = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  title: 'Panduan Permohonan STT',
  content_type: 'EDITOR',
  content_html: '<p>Langkah permohonan</p>',
  mime_type: null,
  created_at: '2026-10-25T10:00:00.000Z',
  updated_at: '2026-10-25T10:00:00.000Z',
};

function renderGuidePage(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/informasi/panduan-permohonan-surat-tanda-tashih" element={<InformationGuidePage />} />
        <Route path="/informasi/panduan-permohonan-surat-tanda-tashih/:id" element={<InformationGuidePage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderSopPage(path) {
  const props = {
    section: 'SOP',
    basePath: '/informasi/sop-pelayanan-surat-tanda-tashih',
    title: 'SOP Pelayanan Surat Tanda Tashih',
    description: 'Daftar SOP Pelayanan Surat Tanda Tashih Izin Edar',
    tableLayout: true,
  };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/informasi/sop-pelayanan-surat-tanda-tashih" element={<InformationGuidePage {...props} />} />
        <Route path="/informasi/sop-pelayanan-surat-tanda-tashih/:id" element={<InformationGuidePage {...props} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('InformationGuidePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    informationGuideApi.listPublic.mockResolvedValue({
      success: true,
      data: [guide],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    informationGuideApi.getPublic.mockResolvedValue({ success: true, data: guide });
  });

  it('lists only public guides and links to a detail route', async () => {
    renderGuidePage('/informasi/panduan-permohonan-surat-tanda-tashih');

    expect(await screen.findByRole('heading', { name: guide.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat panduan/i })).toHaveAttribute(
      'href',
      `/informasi/panduan-permohonan-surat-tanda-tashih/${guide.id}`
    );
    expect(screen.getByRole('banner', { name: 'Public header' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Public footer' })).toBeInTheDocument();
    expect(informationGuideApi.listPublic).toHaveBeenCalledWith({ page: 1, limit: 10, search: '' });
  });

  it('shows guide detail content and handles a direct detail URL', async () => {
    renderGuidePage(`/informasi/panduan-permohonan-surat-tanda-tashih/${guide.id}`);

    expect(await screen.findByRole('heading', { name: guide.title })).toBeInTheDocument();
    expect(screen.getByTestId('guide-content')).toHaveTextContent('Langkah permohonan');
    expect(informationGuideApi.getPublic).toHaveBeenCalledWith(guide.id);
  });

  it('shows loading errors rather than an empty success state', async () => {
    informationGuideApi.listPublic.mockRejectedValueOnce(new Error('Server tidak tersedia.'));
    renderGuidePage('/informasi/panduan-permohonan-surat-tanda-tashih');

    expect(await screen.findByRole('alert')).toHaveTextContent('Server tidak tersedia.');
    fireEvent.click(screen.getByRole('button', { name: /Muat ulang/i }));
    await waitFor(() => expect(informationGuideApi.listPublic).toHaveBeenCalledTimes(2));
  });

  it('lists SOP records in a labeled table and links each record to its detail', async () => {
    renderSopPage('/informasi/sop-pelayanan-surat-tanda-tashih');

    expect(await screen.findByRole('heading', { name: 'SOP Pelayanan Surat Tanda Tashih' })).toBeInTheDocument();
    expect(screen.getByText('Daftar SOP Pelayanan Surat Tanda Tashih Izin Edar')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Judul Informasi' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat SOP/i })).toHaveAttribute(
      'href',
      `/informasi/sop-pelayanan-surat-tanda-tashih/${guide.id}`
    );
    expect(informationGuideApi.listPublic).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: '',
      section: 'SOP',
    });
  });

  it('loads SOP details using the SOP section filter', async () => {
    renderSopPage(`/informasi/sop-pelayanan-surat-tanda-tashih/${guide.id}`);

    expect(await screen.findByRole('heading', { name: guide.title })).toBeInTheDocument();
    expect(screen.getByTestId('guide-content')).toHaveTextContent('Langkah permohonan');
    expect(informationGuideApi.getPublic).toHaveBeenCalledWith(guide.id, { section: 'SOP' });
  });
});
