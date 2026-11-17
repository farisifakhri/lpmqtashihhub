import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { complaintApi } from '@/api/complaint.api';
import { ComplaintManagement } from './ComplaintManagement';

const printRow = {
  id: 'c-1',
  complaint_code: 'ADU-KC-20261111-ABCD2345',
  type: 'KESALAHAN_CETAK',
  status: 'MENUNGGU_VERIFIKASI',
  reporter_name: 'Ahmad Fauzi',
  publisher_name: 'PT Mushaf Nusantara',
  mushaf_name: 'Mushaf Nusantara 30 Juz',
  created_at: '2026-11-11T03:00:00.000Z',
  allowed_actions: ['TERIMA', 'TOLAK'],
};

const detail = (overrides = {}) => ({
  ...printRow,
  reporter_gender: 'LAKI_LAKI',
  reporter_age: 34,
  reporter_occupation: 'Guru',
  phone: '081234567890',
  email: 'ahmad@example.com',
  address: 'Jl. Merdeka No. 1',
  district_name: 'Sukasari',
  regency_name: 'Kota Bandung',
  province_name: 'Jawa Barat',
  postal_code: '40151',
  tashih_number: 'STT-123/2025',
  attachments: [
    { id: 'a-1', attachment_type: 'SURAT_TANDA_TASHIH', original_filename: 'stt.png', file_size: 2048, mime_type: 'image/png', error_item_id: null },
    { id: 'a-2', attachment_type: 'COVER_MUSHAF', original_filename: 'cover.pdf', file_size: 4096, mime_type: 'application/pdf', error_item_id: null },
  ],
  error_items: [{
    id: 'e-1', position: 1, surah_ayat: 'Al-Baqarah: 255', error_type: 'Kesalahan huruf', description: 'Huruf ba tertulis ta.',
    attachments: [{ id: 'a-3', attachment_type: 'HALAMAN_SALAH', original_filename: 'hal1.png', file_size: 1024, mime_type: 'image/png', error_item_id: 'e-1' }],
  }],
  histories: [{ id: 'h-1', status: 'MENUNGGU_VERIFIKASI', note: 'Pengaduan berhasil dikirim.', created_at: '2026-11-11T03:00:00.000Z', changed_by: null }],
  ...overrides,
});

beforeEach(() => {
  vi.spyOn(complaintApi, 'listAdmin').mockResolvedValue({
    data: [printRow, { ...printRow, id: 'c-2', complaint_code: 'ADU-KC-20261111-ZZZZ2345', status: 'SELESAI', allowed_actions: [] }],
    counts: { MENUNGGU_VERIFIKASI: 1, SELESAI: 1 },
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
  });
});

afterEach(() => vi.restoreAllMocks());

describe('ComplaintManagement', () => {
  it('menampilkan tabel pengaduan kesalahan cetak dengan kolom dan aksi yang diminta', async () => {
    render(<ComplaintManagement type="KESALAHAN_CETAK" />);
    expect(await screen.findByText('ADU-KC-20261111-ABCD2345')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'No', 'Kode Pengaduan', 'Nama Pengadu', 'Nama Penerbit', 'Nama Mushaf', 'Tanggal Pengaduan', 'Status', 'Aksi',
    ]);
    expect(screen.getByRole('button', { name: 'Terima pengaduan ADU-KC-20261111-ABCD2345' })).toBeEnabled();
    // Pengaduan yang sudah selesai tidak dapat diterima/ditolak lagi
    expect(screen.getByRole('button', { name: 'Terima pengaduan ADU-KC-20261111-ZZZZ2345' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tolak pengaduan ADU-KC-20261111-ZZZZ2345' })).toBeDisabled();
    expect(screen.getByLabelText('Tampilkan')).toHaveValue('10');
    fireEvent.change(screen.getByLabelText('Tampilkan'), { target: { value: '25' } });
    await waitFor(() => expect(complaintApi.listAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'KESALAHAN_CETAK', limit: 25, page: 1 })));
  });

  it('menampilkan kolom khusus pengaduan pelayanan', async () => {
    complaintApi.listAdmin.mockResolvedValue({
      data: [{ ...printRow, type: 'PELAYANAN', registration_number: 'REG-1', registrant_publisher: 'PT A', service_category: 'BIAYA_PNBP' }],
      counts: {}, pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    render(<ComplaintManagement type="PELAYANAN" />);
    expect(await screen.findByText('Kesalahan penetapan biaya PNBP layanan tashih')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'No', 'Kode Pengaduan', 'Nama Pengadu', 'Nomor Pendaftaran Mushaf', 'Penerbit', 'Jenis Pengaduan', 'Tanggal Pengaduan', 'Status', 'Aksi',
    ]);
  });

  it('menampilkan detail lengkap dan membuka lampiran', async () => {
    vi.spyOn(complaintApi, 'getAdminDetail').mockResolvedValue({ data: detail() });
    const open = vi.spyOn(complaintApi, 'openAttachment').mockResolvedValue();
    render(<ComplaintManagement type="KESALAHAN_CETAK" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat pengaduan ADU-KC-20261111-ABCD2345' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('ahmad@example.com')).toBeInTheDocument();
    expect(within(dialog).getByText('STT-123/2025')).toBeInTheDocument();
    expect(within(dialog).getByText('Huruf ba tertulis ta.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Buka Gambar Halaman Salah hal1.png/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('c-1', 'a-3'));
    expect(within(dialog).getByRole('button', { name: /Buka Gambar Cover Mushaf cover.pdf/ })).toBeInTheDocument();
  });

  it('meminta konfirmasi sebelum menerima pengaduan', async () => {
    vi.spyOn(complaintApi, 'getAdminDetail').mockResolvedValue({ data: detail() });
    const accept = vi.spyOn(complaintApi, 'accept').mockResolvedValue({
      message: 'Pengaduan diterima.',
      data: detail({ status: 'DITERIMA', allowed_actions: ['DALAM_PROSES'] }),
    });
    render(<ComplaintManagement type="KESALAHAN_CETAK" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Terima pengaduan ADU-KC-20261111-ABCD2345' }));
    const dialog = await screen.findByRole('dialog');
    const form = await within(dialog).findByRole('form', { name: 'Konfirmasi terima pengaduan' });
    expect(accept).not.toHaveBeenCalled();
    fireEvent.click(within(form).getByRole('button', { name: 'Ya, Terima Pengaduan' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith('c-1', ''));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Pengaduan diterima.');
    expect(within(dialog).getByRole('button', { name: 'Ubah Status' })).toBeInTheDocument();
  });

  it('mewajibkan alasan dan konfirmasi untuk menolak pengaduan', async () => {
    vi.spyOn(complaintApi, 'getAdminDetail').mockResolvedValue({ data: detail() });
    const reject = vi.spyOn(complaintApi, 'reject').mockResolvedValue({ data: detail({ status: 'DITOLAK', allowed_actions: [], rejection_reason: 'Data tidak lengkap sama sekali.' }) });
    render(<ComplaintManagement type="KESALAHAN_CETAK" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tolak pengaduan ADU-KC-20261111-ABCD2345' }));
    const form = await screen.findByRole('form', { name: 'Form penolakan pengaduan' });
    const submit = within(form).getByRole('button', { name: 'Tolak Pengaduan' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(form).getByLabelText(/Alasan Penolakan/), { target: { value: 'Data tidak lengkap sama sekali.' } });
    expect(submit).toBeDisabled();
    fireEvent.click(within(form).getByRole('checkbox'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(reject).toHaveBeenCalledWith('c-1', 'Data tidak lengkap sama sekali.'));
  });

  it('mengubah status penanganan dan membuat laporan akhir', async () => {
    vi.spyOn(complaintApi, 'getAdminDetail').mockResolvedValue({ data: detail({ status: 'DALAM_PROSES', allowed_actions: ['MENUNGGU_TINDAK_LANJUT', 'LAPORAN_AKHIR'] }) });
    const updateStatus = vi.spyOn(complaintApi, 'updateStatus').mockResolvedValue({
      data: detail({ status: 'MENUNGGU_TINDAK_LANJUT', allowed_actions: ['DALAM_PROSES', 'LAPORAN_AKHIR'] }),
    });
    const finalReport = vi.spyOn(complaintApi, 'submitFinalReport').mockResolvedValue({
      data: detail({ status: 'SELESAI', allowed_actions: [], final_result: 'Mushaf ditarik', final_explanation: 'Penerbit menarik cetakan.', resolved_on: '2026-11-12T00:00:00.000Z' }),
    });
    render(<ComplaintManagement type="KESALAHAN_CETAK" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat pengaduan ADU-KC-20261111-ABCD2345' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Ubah Status' }));
    const statusForm = within(dialog).getByRole('form', { name: 'Form perubahan status' });
    expect(within(statusForm).getByLabelText('Menunggu Tindak Lanjut')).toBeChecked();
    fireEvent.change(within(statusForm).getByLabelText(/Keterangan perubahan/), { target: { value: 'Menunggu penarikan mushaf.' } });
    fireEvent.click(within(statusForm).getByRole('button', { name: 'Simpan Status' }));
    await waitFor(() => expect(updateStatus).toHaveBeenCalledWith('c-1', 'MENUNGGU_TINDAK_LANJUT', 'Menunggu penarikan mushaf.'));

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Buat Laporan Akhir' }));
    const finalForm = within(dialog).getByRole('form', { name: 'Form laporan akhir' });
    fireEvent.change(within(finalForm).getByLabelText(/Hasil Penanganan/), { target: { value: 'Mushaf ditarik' } });
    fireEvent.change(within(finalForm).getByLabelText(/Keterangan atau Penjelasan/), { target: { value: 'Penerbit menarik cetakan.' } });
    // Tanggal default = hari ini (WIB); tanggal di masa depan ditolak oleh atribut max
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    expect(within(finalForm).getByLabelText(/Tanggal Penyelesaian/)).toHaveValue(today);
    fireEvent.click(within(finalForm).getByRole('checkbox'));
    fireEvent.click(within(finalForm).getByRole('button', { name: 'Kirim Laporan Akhir' }));
    await waitFor(() => expect(finalReport).toHaveBeenCalledWith('c-1', {
      hasil: 'Mushaf ditarik', keterangan: 'Penerbit menarik cetakan.', tanggal_selesai: today,
    }));
    expect(await within(dialog).findByRole('heading', { name: 'Laporan Akhir' })).toBeInTheDocument();
    expect(within(dialog).getByText('Pengaduan telah selesai ditangani.')).toBeInTheDocument();
  });
});
