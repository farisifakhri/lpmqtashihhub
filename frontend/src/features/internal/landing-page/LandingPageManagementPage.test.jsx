import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LandingPageManagementPage } from './LandingPageManagementPage';
import * as AuthContext from '@/features/auth/AuthContext';
import { regulationApi } from '@/api/regulation.api';
import { informationGuideApi } from '@/api/information-guide.api';

const informationSubmenus = [
  "Regulasi Penerbit Mushaf Al-Qur'an",
  'Panduan Permohonan Surat Tanda Tashih/Izin Edar',
  'SOP Pelayanan Surat Tanda Tashih',
  "Direktori Penerbit Mushaf Al-Qur'an",
  'Survei IKM dan IPAK Pelayananan Surat Tanda Tashih',
  'Siaran Pers',
  'Unduh Dokumen Seputar Pelayanan Surat Tanda Tashih/Izin Edar',
];

describe('LandingPageManagementPage navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: { role: 'SUPERADMIN', roles: ['SUPERADMIN'] },
    });
    vi.spyOn(regulationApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    vi.spyOn(regulationApi, 'getAdminSummary').mockResolvedValue({
      success: true,
      data: { totalAll: 0, totalPublished: 0, totalUnpublished: 0, categories: [] },
    });
    vi.spyOn(informationGuideApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
  });

  it('shows the requested main and information navigation in order', async () => {
    render(<LandingPageManagementPage />);
    expect(await screen.findByText('Total Regulasi')).toBeInTheDocument();

    const mainNavigation = within(screen.getByRole('navigation', { name: 'Navigasi menu landing page' }));
    expect(mainNavigation.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Informasi',
      'Permohonan Master',
      'Pengaduan',
      'FAQ',
    ]);

    const informationNavigation = within(screen.getByRole('navigation', { name: 'Submenu Informasi' }));
    expect(informationNavigation.getAllByRole('button').map((button) => button.textContent)).toEqual(
      informationSubmenus,
    );
    expect(informationNavigation.getByRole('button', { name: informationSubmenus[0] })).toHaveAttribute(
      'aria-current',
      'page',
    );

    informationSubmenus.slice(1).forEach((label) => {
      fireEvent.click(informationNavigation.getByRole('button', { name: label }));
      expect(informationNavigation.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    });
  });

  it('shows guide management, keeps unfinished menus as placeholders, and restores regulation management', async () => {
    render(<LandingPageManagementPage />);
    expect(await screen.findByText('Total Regulasi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: informationSubmenus[1] }));
    expect(screen.getByRole('heading', { name: informationSubmenus[1] })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Tambah Panduan' })).toBeInTheDocument();
    expect(screen.queryByText('Segera Hadir')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Regulasi')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tambah Dokumen' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Permohonan Master' }));
    expect(screen.getByRole('heading', { name: 'Permohonan Master' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'FAQ' }));
    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pengaduan' }));
    const complaintNavigation = within(screen.getByRole('navigation', { name: 'Submenu Pengaduan' }));
    expect(complaintNavigation.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Saluran Pengaduan Masyarakat',
      'Cek Status Laporan Naskah',
      'Kontak Pusat Bantuan LPMQ',
    ]);
    fireEvent.click(complaintNavigation.getByRole('button', { name: 'Cek Status Laporan Naskah' }));
    expect(screen.getByRole('heading', { name: 'Cek Status Laporan Naskah' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Informasi' }));
    fireEvent.click(screen.getByRole('button', { name: informationSubmenus[0] }));
    expect(await screen.findByText('Total Regulasi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah Dokumen' })).toBeInTheDocument();
  });

  it('uses the existing guide-management form for the isolated SOP section', async () => {
    vi.spyOn(informationGuideApi, 'create').mockResolvedValue({
      success: true,
      data: { is_published: false, content_type: 'EDITOR' },
    });
    render(<LandingPageManagementPage />);
    expect(await screen.findByText('Total Regulasi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SOP Pelayanan Surat Tanda Tashih' }));
    expect(await screen.findByRole('button', { name: 'Tambah SOP' })).toBeInTheDocument();
    await waitFor(() => {
      expect(informationGuideApi.listAdmin).toHaveBeenCalledWith(expect.objectContaining({ section: 'SOP' }));
    });
    expect(screen.getByRole('columnheader', { name: 'Judul SOP' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Bentuk Konten' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tanggal Diperbarui' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah SOP' }));
    const dialog = screen.getByRole('dialog', { name: 'Tambah SOP' });
    expect(within(dialog).getByLabelText('Judul SOP *')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Bentuk Konten')).toBeInTheDocument();
    expect(within(dialog).getByText('Publikasikan SOP')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Judul SOP *'), { target: { value: 'SOP Uji Administrasi' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Simpan Draf' }));
    await waitFor(() => expect(informationGuideApi.create).toHaveBeenCalledTimes(1));
    expect(informationGuideApi.create.mock.calls[0][0]).toMatchObject({
      title: 'SOP Uji Administrasi',
      section: 'SOP',
    });
  });

  it('keeps document creation in the filters and shows only title and one complete document-number badge', async () => {
    const originalFileName = 'sk_bal itbang_89_2023.pdf';
    const longDocumentNumber = 'SK Kepala Badan Litbang dan Diklat Kementerian Agama RI Nomor 89 Tahun 2023';
    vi.spyOn(regulationApi, 'listAdmin').mockResolvedValue({
      success: true,
      data: [{
        id: 'reg-1',
        title: 'Keputusan Pengesahan Mushaf',
        category: 'Ketentuan Pentashihan',
        document_number: longDocumentNumber,
        file_name: originalFileName,
        file_size: 204800,
        is_published: true,
        created_at: '2026-10-20T10:00:00.000Z',
      }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(<LandingPageManagementPage />);
    expect(await screen.findByText('Keputusan Pengesahan Mushaf')).toBeInTheDocument();
    expect(screen.queryByText(originalFileName)).not.toBeInTheDocument();
    expect(screen.queryByText('(200 KB)')).not.toBeInTheDocument();

    const documentNumberBadge = screen.getByText(longDocumentNumber);
    expect(documentNumberBadge).toHaveClass('inline-flex', 'rounded-lg', 'border-brand-200', 'bg-brand-50');
    expect(documentNumberBadge.parentElement).toHaveTextContent(longDocumentNumber);

    const filterContainer = screen.getByRole('button', { name: 'Tambah Dokumen' }).parentElement;
    expect(within(filterContainer).getByLabelText('Cari Dokumen')).toBeInTheDocument();
    expect(within(filterContainer).getByLabelText('Filter Kategori')).toBeInTheDocument();
    expect(within(filterContainer).getByLabelText('Status Publikasi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Dokumen' }));
    expect(screen.getByRole('heading', { name: 'Tambah Dokumen Regulasi' })).toBeInTheDocument();
  });
});
