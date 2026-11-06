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

vi.mock('@/components/public/PublicAppPromotion', () => ({
  PublicAppPromotion: () => <section aria-label="Promosi aplikasi Qur’an Kemenag" />,
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
        <Route path="/informasi/panduan-permohonan-surat-tanda-tashih" element={<InformationGuidePage tableLayout />} />
        <Route path="/informasi/panduan-permohonan-surat-tanda-tashih/:id" element={<InformationGuidePage tableLayout />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderSopPage(path) {
  const props = {
    section: 'SOP',
    basePath: '/informasi/sop-pelayanan-surat-tanda-tashih',
    title: 'SOP Pelayanan Surat Tanda Tashih Izin Edar',
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

function renderSiaranPersPage(path) {
  const props = {
    section: 'SIARAN_PERS',
    basePath: '/informasi/siaran-pers',
    title: 'Siaran Pers',
    description: 'Daftar siaran pers LPMQ.',
    tableLayout: true,
  };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/informasi/siaran-pers" element={<InformationGuidePage {...props} />} />
        <Route path="/informasi/siaran-pers/:id" element={<InformationGuidePage {...props} />} />
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

    const pageTitle = await screen.findByRole('heading', { name: 'Panduan Permohonan Surat Tanda Tashih/Izin Edar' });
    expect(pageTitle).toHaveClass('text-2xl', 'font-extrabold', 'tracking-tight', 'text-brand-900', 'sm:text-3xl', 'lg:text-4xl');
    expect(screen.getByText('Panduan Permohonan')).toBeInTheDocument();
    const refreshButton = screen.getByRole('button', { name: 'Segarkan' });
    expect(refreshButton).toHaveClass('inline-flex', 'items-center', 'gap-1.5', 'rounded-xl', 'border', 'px-3.5', 'py-2');
    expect(refreshButton.querySelector('svg')).toHaveClass('h-3.5', 'w-3.5');
    expect(screen.getByText('Temukan panduan layanan permohonan Surat Tanda Tashih dan Izin Edar yang diterbitkan oleh LPMQ.')).toHaveClass(
      'text-xs',
      'leading-relaxed',
      'text-ink-muted',
      'sm:text-sm',
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      'Beranda/Informasi/Panduan Permohonan Surat Tanda Tashih/Izin Edar',
    );
    expect(await screen.findByText(guide.title)).toBeInTheDocument();
    fireEvent.click(refreshButton);
    await waitFor(() => expect(informationGuideApi.listPublic).toHaveBeenCalledTimes(2));
    const guideAction = screen.getByRole('link', { name: /Lihat panduan/i });
    expect(guideAction).toHaveAttribute(
      'href',
      `/informasi/panduan-permohonan-surat-tanda-tashih/${guide.id}`
    );
    expect(guideAction).toHaveClass('inline-flex', 'items-center', 'gap-1', 'whitespace-nowrap', 'px-2');
    expect(guideAction.querySelector('svg')).toHaveClass('h-3.5', 'w-3.5', 'shrink-0');
    expect(screen.getByRole('banner', { name: 'Public header' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Promosi aplikasi Qur’an Kemenag' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Public footer' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Judul Informasi' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();
    expect(await screen.findByText(guide.title)).toBeInTheDocument();
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

    const pageTitle = await screen.findByRole('heading', { name: 'SOP Pelayanan Surat Tanda Tashih Izin Edar' });
    expect(pageTitle).toHaveClass('text-2xl', 'font-extrabold', 'tracking-tight', 'text-brand-900', 'sm:text-3xl', 'lg:text-4xl');
    expect(screen.getByText('SOP Pelayanan')).toBeInTheDocument();
    const refreshButton = screen.getByRole('button', { name: 'Segarkan' });
    expect(screen.getByText('Daftar SOP Pelayanan Surat Tanda Tashih Izin Edar')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      'Beranda/Informasi/SOP Pelayanan Surat Tanda Tashih Izin Edar',
    );
    expect(screen.getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Judul Informasi' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();
    const sopAction = screen.getByRole('link', { name: /Lihat SOP/i });
    expect(sopAction).toHaveAttribute(
      'href',
      `/informasi/sop-pelayanan-surat-tanda-tashih/${guide.id}`
    );
    expect(sopAction).toHaveClass('inline-flex', 'items-center', 'gap-1', 'whitespace-nowrap', 'px-2');
    expect(sopAction.querySelector('svg')).toHaveClass('h-3.5', 'w-3.5', 'shrink-0');
    expect(informationGuideApi.listPublic).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: '',
      section: 'SOP',
    });
    fireEvent.click(refreshButton);
    await waitFor(() => expect(informationGuideApi.listPublic).toHaveBeenCalledTimes(2));
  });

  it('loads SOP details using the SOP section filter', async () => {
    renderSopPage(`/informasi/sop-pelayanan-surat-tanda-tashih/${guide.id}`);

    expect(await screen.findByRole('heading', { name: guide.title })).toBeInTheDocument();
    expect(screen.getByTestId('guide-content')).toHaveTextContent('Langkah permohonan');
    expect(informationGuideApi.getPublic).toHaveBeenCalledWith(guide.id, { section: 'SOP' });
  });

  it('lists published press releases in a labeled table and opens the press release detail', async () => {
    renderSiaranPersPage('/informasi/siaran-pers');

    const pageTitle = await screen.findByRole('heading', { name: 'Siaran Pers' });
    expect(pageTitle).toHaveClass('text-2xl', 'font-extrabold', 'tracking-tight', 'text-brand-900', 'sm:text-3xl', 'lg:text-4xl');
    expect(pageTitle.previousElementSibling).toHaveTextContent('Siaran Pers');
    const refreshButton = screen.getByRole('button', { name: 'Segarkan' });
    expect(screen.getByText('Daftar siaran pers LPMQ.')).toHaveClass(
      'text-xs',
      'leading-relaxed',
      'text-ink-muted',
      'sm:text-sm',
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Beranda/Informasi/Siaran Pers');
    expect(screen.getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Judul Pers' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();
    expect(await screen.findByText(guide.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat' })).toHaveAttribute(
      'href',
      `/informasi/siaran-pers/${guide.id}`
    );
    expect(informationGuideApi.listPublic).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: '',
      section: 'SIARAN_PERS',
    });
    fireEvent.click(refreshButton);
    await waitFor(() => expect(informationGuideApi.listPublic).toHaveBeenCalledTimes(2));
  });

  it('loads press release detail content using the press release section', async () => {
    renderSiaranPersPage(`/informasi/siaran-pers/${guide.id}`);

    expect(await screen.findByRole('heading', { name: guide.title })).toBeInTheDocument();
    expect(screen.getByTestId('guide-content')).toHaveTextContent('Langkah permohonan');
    expect(informationGuideApi.getPublic).toHaveBeenCalledWith(guide.id, { section: 'SIARAN_PERS' });
  });
});
