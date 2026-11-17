import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherDirectoryPage } from './PublisherDirectoryPage';
import { publisherApi } from '@/api/publisher.api';

vi.mock('@/api/publisher.api', () => ({ publisherApi: { directory: vi.fn() } }));

const abyan = {
  no: 1,
  id: 'p1',
  name: 'abyan',
  entity_type: 'PT',
  address: 'Jl. Tarumanegara utama no. 37 Banjarsari Solo Jawa Tengah',
  province: 'Jawa Tengah',
  pic_name: 'Edy Sutarto, S.T.',
  phone: '081329086542',
  email: 'abyanpenerbit@yahoo.com',
  nomor_induk_penerbit: '01.02.03.04',
  npwp: '012345678901000',
  nib: '',
  verified_at: '2026-11-01T00:00:00.000Z',
};
const summary = {
  total: 325,
  letters: { A: 2, B: 1 },
  provinces: [{ name: 'Aceh', count: 0 }, { name: 'Jawa Tengah', count: 1 }, { name: 'Belum Terdeteksi', count: 2 }],
};
const respond = (items = [abyan], total = items.length) => ({
  success: true,
  data: items,
  pagination: { total, page: 1, limit: 20, totalPages: Math.max(1, Math.ceil(total / 20)) },
  summary,
});

const renderPage = () => render(<MemoryRouter><PublisherDirectoryPage /></MemoryRouter>);

describe('PublisherDirectoryPage', () => {
  beforeEach(() => {
    publisherApi.directory.mockReset();
    publisherApi.directory.mockResolvedValue(respond());
  });

  it('menampilkan tabel direktori dengan jumlah penerbit seperti direktori lama', async () => {
    renderPage();

    const row = (await screen.findByText('abyan')).closest('tr');
    expect(within(row).getByText('Edy Sutarto, S.T.')).toBeInTheDocument();
    expect(within(row).getByText('081329086542')).toBeInTheDocument();
    expect(within(row).getByText('abyanpenerbit@yahoo.com')).toBeInTheDocument();
    expect(within(row).getByText('Jawa Tengah')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Data Penerbit Al-Qur’an · 325 Penerbit/ })).toHaveAttribute('aria-selected', 'true');
    expect(publisherApi.directory).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
  });

  it('tab alfabet memfilter per huruf; huruf tanpa penerbit dinonaktifkan', async () => {
    renderPage();
    await screen.findByText('abyan');

    fireEvent.click(screen.getByRole('tab', { name: 'Berdasarkan Alfabet' }));
    expect(publisherApi.directory).toHaveBeenLastCalledWith({ letter: 'A', page: 1, limit: 20 });
    expect(screen.getByRole('button', { name: 'Huruf C, 0 penerbit' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Huruf B, 1 penerbit' }));
    expect(publisherApi.directory).toHaveBeenLastCalledWith({ letter: 'B', page: 1, limit: 20 });
  });

  it('tab provinsi menampilkan jumlah per provinsi dan memfilter saat dipilih', async () => {
    renderPage();
    await screen.findByText('abyan');

    fireEvent.click(screen.getByRole('tab', { name: 'Berdasarkan Provinsi' }));
    expect(await screen.findByText('Pilih provinsi untuk menampilkan penerbit.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aceh/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Jawa Tengah/ }));
    expect(publisherApi.directory).toHaveBeenLastCalledWith({ province: 'Jawa Tengah', page: 1, limit: 20 });
    expect(await screen.findByText('abyan')).toBeInTheDocument();
  });

  it('pencarian spesifik mengirim kata kunci saat Cari ditekan', async () => {
    renderPage();
    await screen.findByText('abyan');

    fireEvent.click(screen.getByRole('tab', { name: 'Pencarian Spesifik' }));
    expect(await screen.findByText('Masukkan kata kunci lalu tekan Cari.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kata kunci penerbit'), { target: { value: '  yahoo ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));

    expect(publisherApi.directory).toHaveBeenLastCalledWith({ search: 'yahoo', page: 1, limit: 20 });
  });

  it('jumlah baris dan halaman bisa diubah', async () => {
    publisherApi.directory.mockResolvedValue(respond([abyan], 45));
    renderPage();
    await screen.findByText('abyan');

    fireEvent.click(screen.getByRole('button', { name: /Berikutnya/ }));
    expect(publisherApi.directory).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

    fireEvent.change(screen.getByLabelText('Tampilkan'), { target: { value: '50' } });
    expect(publisherApi.directory).toHaveBeenLastCalledWith({ page: 1, limit: 50 });
  });

  it('tombol Lihat membuka detail lengkap termasuk nomor induk dan NPWP', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat detail abyan' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('01.02.03.04')).toBeInTheDocument();
    expect(within(dialog).getByText('012345678901000')).toBeInTheDocument();
  });

  it('menampilkan pesan dan tombol muat ulang saat gagal', async () => {
    publisherApi.directory.mockRejectedValueOnce(new Error('Server sibuk'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server sibuk');
    fireEvent.click(screen.getByRole('button', { name: 'Muat ulang' }));
    expect(await screen.findByText('abyan')).toBeInTheDocument();
  });
});
