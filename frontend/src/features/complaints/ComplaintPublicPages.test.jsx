import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { complaintApi } from '@/api/complaint.api';
import { PUBLIC_NAV_ITEMS } from '@/components/public/PublicHeader';
import { PrintErrorComplaintPage, validatePrintErrorForm } from './PrintErrorComplaintPage';
import { ServiceComplaintPage } from './ServiceComplaintPage';
import { TrackComplaintPage } from './TrackComplaintPage';
import { EMPTY_REPORTER, validateComplaintFile, validateReporter } from './complaint.constants';

vi.mock('@/components/public/PublicFooter', () => ({ PublicFooter: () => <footer aria-label="Public footer" /> }));
vi.mock('@/components/public/PublicAppPromotion', () => ({ PublicAppPromotion: () => null }));

const png = (name = 'gambar.png', size = 1024) => new File([new Uint8Array(size)], name, { type: 'image/png' });

const VALID_REPORTER = {
  nama: 'Ahmad Fauzi',
  jenis_kelamin: 'LAKI_LAKI',
  usia: '34',
  alamat: 'Jl. Merdeka No. 1 RT 01/RW 02',
  provinsi_kode: '32',
  kabupaten_kode: '32.73',
  kecamatan_kode: '32.73.01',
  kode_pos: '40151',
  telepon: '081234567890',
  email: 'ahmad@example.com',
  pekerjaan: 'Guru',
};

const renderAt = (path, element) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path={path} element={element} />
      <Route path="/pengaduan/lacak" element={<TrackComplaintPage />} />
    </Routes>
  </MemoryRouter>,
);

/** Isi identitas pengadu termasuk dropdown wilayah berjenjang. */
async function fillReporter() {
  fireEvent.change(screen.getByLabelText(/Nama Pengadu/), { target: { value: VALID_REPORTER.nama } });
  fireEvent.click(screen.getByLabelText('Laki-laki'));
  fireEvent.change(screen.getByLabelText(/Usia Pengadu/), { target: { value: '34' } });
  fireEvent.change(screen.getByLabelText(/Alamat Pengadu/), { target: { value: VALID_REPORTER.alamat } });
  await screen.findByRole('option', { name: 'Jawa Barat' });
  fireEvent.change(screen.getByLabelText(/^Provinsi/), { target: { value: '32' } });
  await screen.findByRole('option', { name: 'Kota Bandung' });
  fireEvent.change(screen.getByLabelText(/Kota\/Kabupaten/), { target: { value: '32.73' } });
  await screen.findByRole('option', { name: 'Sukasari' });
  fireEvent.change(screen.getByLabelText(/Kecamatan/), { target: { value: '32.73.01' } });
  fireEvent.change(screen.getByLabelText(/Kode Pos/), { target: { value: '40151' } });
  fireEvent.change(screen.getByLabelText(/Nomor Telepon Pengadu/), { target: { value: VALID_REPORTER.telepon } });
  fireEvent.change(screen.getByLabelText(/Email Pengadu/), { target: { value: VALID_REPORTER.email } });
  fireEvent.change(screen.getByLabelText(/Pekerjaan Pengadu/), { target: { value: 'Guru' } });
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  vi.spyOn(complaintApi, 'getProvinces').mockResolvedValue({ data: [{ kode: '32', nama: 'Jawa Barat' }] });
  vi.spyOn(complaintApi, 'getRegencies').mockResolvedValue({ data: [{ kode: '32.73', nama: 'Kota Bandung' }] });
  vi.spyOn(complaintApi, 'getDistricts').mockResolvedValue({ data: [{ kode: '32.73.01', nama: 'Sukasari' }] });
  vi.spyOn(complaintApi, 'getReference').mockResolvedValue({ data: {} });
  vi.spyOn(complaintApi, 'getCaptcha').mockResolvedValue({ data: { token: 'captcha-token-123', image: 'data:image/svg+xml;base64,PHN2Zy8+' } });
});

afterEach(() => vi.restoreAllMocks());

describe('navbar Pengaduan', () => {
  it('berisi tiga submenu pengaduan dengan halaman sendiri', () => {
    const pengaduan = PUBLIC_NAV_ITEMS.find((item) => item.label === 'Pengaduan');
    expect(pengaduan.children).toEqual([
      { label: "Pengaduan Kesalahan Cetak Mushaf Al-Qur'an", href: '/pengaduan/kesalahan-cetak-mushaf' },
      { label: 'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar', href: '/pengaduan/pelayanan-surat-tanda-tashih' },
      { label: 'Lacak Pengaduan', href: '/pengaduan/lacak' },
    ]);
  });
});

describe('validasi formulir pengaduan', () => {
  it('memeriksa identitas pengadu', () => {
    expect(validateReporter(VALID_REPORTER)).toEqual({});
    const errors = validateReporter({ ...EMPTY_REPORTER, usia: '7', kode_pos: '123', telepon: '12', email: 'salah' });
    expect(Object.keys(errors)).toEqual(expect.arrayContaining([
      'nama', 'jenis_kelamin', 'usia', 'alamat', 'provinsi_kode', 'kabupaten_kode', 'kecamatan_kode', 'kode_pos', 'telepon', 'email', 'pekerjaan',
    ]));
  });

  it('membatasi lampiran pada JPG/JPEG/PNG/PDF maksimal 2 MB', () => {
    expect(validateComplaintFile(null, 'Cover')).toBe('Cover wajib diunggah.');
    expect(validateComplaintFile(png('a.gif'), 'Cover')).toMatch(/JPG, JPEG, PNG, atau PDF/);
    expect(validateComplaintFile(png('a.png', 2 * 1024 * 1024 + 1), 'Cover')).toMatch(/maksimal 2 MB/);
    expect(validateComplaintFile(new File(['%PDF-'], 'a.PDF'), 'Cover')).toBeNull();
    expect(validateComplaintFile(png('a.jpeg'), 'Cover')).toBeNull();
  });

  it('mewajibkan setiap informasi kesalahan lengkap dengan gambarnya', () => {
    const errors = validatePrintErrorForm({
      reporter: VALID_REPORTER,
      mushaf: { nama_penerbit: 'PT A', nama_mushaf: 'Mushaf A', nomor_surat_tashih: 'STT-1' },
      files: { gambar_surat_tashih: png(), gambar_cover: png() },
      items: [
        { surah_ayat: 'Al-Fatihah: 1', jenis_kesalahan: 'Kesalahan huruf', deskripsi: 'Huruf ba tertulis ta.', gambar: png() },
        { surah_ayat: '', jenis_kesalahan: '', deskripsi: 'pendek', gambar: null },
      ],
      captcha: '',
    });
    expect(Object.keys(errors).sort()).toEqual([
      'captcha_jawaban', 'kesalahan.1.deskripsi', 'kesalahan.1.gambar', 'kesalahan.1.jenis_kesalahan', 'kesalahan.1.surah_ayat',
    ]);
  });
});

describe('PrintErrorComplaintPage', () => {
  it('menampilkan judul, bagian formulir, dan dapat menambah/menghapus informasi kesalahan', async () => {
    renderAt('/pengaduan/kesalahan-cetak-mushaf', <PrintErrorComplaintPage />);
    expect(screen.getByRole('heading', { level: 1, name: "Formulir Pengaduan Kesalahan Cetak Mushaf Al-Qur'an" })).toBeInTheDocument();
    expect(screen.getByText(/untuk melaporkan kesalahan cetak mushaf Al-Qur'an kepada Lajnah/)).toBeInTheDocument();
    for (const section of ['Identitas Pengadu', "Data Penerbit dan Mushaf Al-Qur'an yang Diadukan", "Informasi Kesalahan Cetak Mushaf Al-Qur'an", 'Verifikasi dan Pengiriman']) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    }
    expect(await screen.findByAltText('Gambar kode verifikasi')).toBeInTheDocument();
    expect(screen.getAllByText('Format JPG, JPEG, PNG, atau PDF. Ukuran maksimal 2 MB.')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Informasi Kesalahan Lainnya' }));
    expect(screen.getByRole('listitem', { name: 'Informasi kesalahan 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus informasi kesalahan 2' }));
    expect(screen.queryByRole('listitem', { name: 'Informasi kesalahan 2' })).not.toBeInTheDocument();
    // Kelompok pertama tidak dapat dihapus
    expect(screen.queryByRole('button', { name: 'Hapus informasi kesalahan 1' })).not.toBeInTheDocument();
  });

  it('tidak mengirim formulir yang belum lengkap', async () => {
    const submit = vi.spyOn(complaintApi, 'submitPrintError');
    renderAt('/pengaduan/kesalahan-cetak-mushaf', <PrintErrorComplaintPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengaduan' }));
    expect(await screen.findByText(/Masih ada isian yang belum lengkap/)).toBeInTheDocument();
    expect(screen.getByText('Nama pengadu wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Gambar Surat Tanda Tashih wajib diunggah.')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('mengirim dua kesalahan beserta lampiran lalu menampilkan kode pengaduan', async () => {
    const submit = vi.spyOn(complaintApi, 'submitPrintError').mockResolvedValue({
      data: {
        kode_pengaduan: 'ADU-KC-20261111-ABCD2345',
        jenis_pengaduan_label: "Pengaduan Kesalahan Cetak Mushaf Al-Qur'an",
        tanggal_pengaduan: '2026-11-11T03:00:00.000Z',
        email: 'ahmad@example.com',
      },
    });
    renderAt('/pengaduan/kesalahan-cetak-mushaf', <PrintErrorComplaintPage />);
    await fillReporter();
    fireEvent.change(screen.getByLabelText(/Nama Penerbit Mushaf/), { target: { value: 'PT Mushaf Nusantara' } });
    fireEvent.change(screen.getByLabelText(/^Nama Mushaf/), { target: { value: 'Mushaf Nusantara 30 Juz' } });
    fireEvent.change(screen.getByLabelText(/Nomor Surat Tanda Tashih/), { target: { value: 'STT-123/2025' } });
    fireEvent.change(screen.getByLabelText(/Gambar Surat Tanda Tashih/), { target: { files: [png('stt.png')] } });
    fireEvent.change(screen.getByLabelText(/Gambar Cover Mushaf/), { target: { files: [png('cover.png')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Informasi Kesalahan Lainnya' }));
    for (const index of [0, 1]) {
      const item = within(screen.getByRole('listitem', { name: `Informasi kesalahan ${index + 1}` }));
      fireEvent.change(item.getByLabelText(/Surah dan Ayat/), { target: { value: `Al-Baqarah: ${index + 1}` } });
      fireEvent.change(item.getByLabelText(/Jenis Kesalahan/), { target: { value: 'Kesalahan huruf' } });
      fireEvent.change(item.getByLabelText(/Deskripsi Kesalahan/), { target: { value: `Huruf pada kata ke-${index + 1} salah cetak.` } });
      fireEvent.change(item.getByLabelText(/Gambar Halaman Salah/), { target: { files: [png(`hal-${index + 1}.png`)] } });
    }
    fireEvent.change(screen.getByLabelText(/Kode Verifikasi/), { target: { value: 'ab3cd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengaduan' }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    const formData = submit.mock.calls[0][0];
    expect(JSON.parse(formData.get('kesalahan'))).toHaveLength(2);
    expect(formData.getAll('gambar_kesalahan').map((file) => file.name)).toEqual(['hal-1.png', 'hal-2.png']);
    expect(formData.get('gambar_cover').name).toBe('cover.png');
    expect(formData.get('captcha_token')).toBe('captcha-token-123');
    expect(formData.get('captcha_jawaban')).toBe('AB3CD');
    expect(formData.get('website')).toBe('');

    const dialog = await screen.findByRole('dialog', { name: 'Pengaduan Berhasil Dikirim' });
    expect(within(dialog).getByTestId('kode-pengaduan')).toHaveTextContent('ADU-KC-20261111-ABCD2345');
    expect(within(dialog).getByText("Pengaduan Kesalahan Cetak Mushaf Al-Qur'an")).toBeInTheDocument();
    expect(within(dialog).getByText(/Simpan kode ini/)).toBeInTheDocument();
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salin Kode Pengaduan' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ADU-KC-20261111-ABCD2345'));
    expect(await within(dialog).findByText('Kode tersalin')).toBeInTheDocument();
  });
});

describe('ServiceComplaintPage', () => {
  it('mengirim pengaduan pelayanan dan memuat ulang CAPTCHA bila kode verifikasi salah', async () => {
    const submit = vi.spyOn(complaintApi, 'submitService')
      .mockRejectedValueOnce(Object.assign(new Error('Kode verifikasi tidak sesuai.'), {
        status: 400, data: { errors: [{ field: 'captcha_jawaban', message: 'Kode verifikasi tidak sesuai.' }] },
      }))
      .mockResolvedValueOnce({ data: { kode_pengaduan: 'ADU-PL-20261111-WXYZ2345', jenis_pengaduan_label: 'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar', tanggal_pengaduan: '2026-11-11T03:00:00.000Z', email: 'ahmad@example.com' } });
    renderAt('/pengaduan/pelayanan-surat-tanda-tashih', <ServiceComplaintPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Formulir Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar' })).toBeInTheDocument();
    await fillReporter();
    fireEvent.change(screen.getByLabelText(/Nomor Pendaftaran Mushaf/), { target: { value: 'REG-2026-0001' } });
    fireEvent.change(screen.getByLabelText(/Penerbit Pendaftar Mushaf/), { target: { value: 'PT Mushaf Nusantara' } });
    fireEvent.click(screen.getByLabelText('Keterlambatan proses pentashihan master mushaf'));
    expect(screen.getByLabelText('Kesalahan penetapan biaya PNBP layanan tashih')).toBeInTheDocument();
    expect(screen.getByLabelText('Pengaduan Lainnya')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Deskripsi Pengaduan/), { target: { value: 'Proses pentashihan melewati batas waktu layanan.' } });
    fireEvent.change(screen.getByLabelText(/Kode Verifikasi/), { target: { value: 'XXXXX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengaduan' }));

    expect(await screen.findAllByText('Kode verifikasi tidak sesuai.')).not.toHaveLength(0);
    await waitFor(() => expect(complaintApi.getCaptcha).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[0][0].get('jenis_pengaduan')).toBe('KETERLAMBATAN_PENTASHIHAN');

    fireEvent.change(screen.getByLabelText(/Kode Verifikasi/), { target: { value: 'AB3CD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengaduan' }));
    expect(await screen.findByTestId('kode-pengaduan')).toHaveTextContent('ADU-PL-20261111-WXYZ2345');
    // Formulir dikosongkan setelah terkirim
    expect(screen.getByLabelText(/Nomor Pendaftaran Mushaf/)).toHaveValue('');
  });

  it('tombol Reset mengosongkan formulir', async () => {
    renderAt('/pengaduan/pelayanan-surat-tanda-tashih', <ServiceComplaintPage />);
    fireEvent.change(screen.getByLabelText(/Nomor Pendaftaran Mushaf/), { target: { value: 'REG-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByLabelText(/Nomor Pendaftaran Mushaf/)).toHaveValue('');
  });
});

describe('TrackComplaintPage', () => {
  it('menampilkan informasi, riwayat, dan hasil penanganan dari kode pengaduan', async () => {
    const track = vi.spyOn(complaintApi, 'track').mockResolvedValue({
      data: {
        kode_pengaduan: 'ADU-KC-20261111-ABCD2345',
        jenis_pengaduan_label: "Pengaduan Kesalahan Cetak Mushaf Al-Qur'an",
        tanggal_pengaduan: '2026-11-11T03:00:00.000Z',
        nama_pengadu: 'Ah*** Fa***',
        status: 'SELESAI',
        riwayat: [
          { status: 'MENUNGGU_VERIFIKASI', keterangan: 'Pengaduan berhasil dikirim.', tanggal: '2026-11-11T03:00:00.000Z' },
          { status: 'DITERIMA', keterangan: 'Diterima.', tanggal: '2026-11-11T04:00:00.000Z' },
          { status: 'SELESAI', keterangan: 'Laporan akhir: Mushaf ditarik', tanggal: '2026-11-12T04:00:00.000Z' },
        ],
        alasan_penolakan: null,
        hasil_penanganan: { hasil: 'Mushaf ditarik', keterangan: 'Penerbit menarik cetakan.', tanggal_selesai: '2026-11-12T00:00:00.000Z' },
      },
    });
    renderAt('/pengaduan/lacak', <TrackComplaintPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lacak Pengaduan' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Masukkan kode pengaduan Anda'), { target: { value: 'adu-kc-20261111-abcd2345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lacak Pengaduan' }));

    expect(await screen.findByRole('heading', { name: 'Informasi Pengaduan' })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('ADU-KC-20261111-ABCD2345');
    expect(screen.getByText('Ah*** Fa***')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Riwayat Status Pengaduan' })).toBeInTheDocument();
    expect(screen.getByText('Diterima.')).toBeInTheDocument();
    const hasil = within(screen.getByRole('region', { name: 'Hasil Penanganan' }));
    expect(hasil.getByText('Mushaf ditarik')).toBeInTheDocument();
    expect(hasil.getByText('Penerbit menarik cetakan.')).toBeInTheDocument();
    expect(hasil.getByText('12 November 2026')).toBeInTheDocument();
  });

  it('menampilkan alasan penolakan', async () => {
    vi.spyOn(complaintApi, 'track').mockResolvedValue({
      data: {
        kode_pengaduan: 'ADU-PL-1', jenis_pengaduan_label: 'Pengaduan Pelayanan', tanggal_pengaduan: '2026-11-11T03:00:00.000Z',
        nama_pengadu: 'Si***', status: 'DITOLAK', riwayat: [], alasan_penolakan: 'Data pendaftaran tidak ditemukan.', hasil_penanganan: null,
      },
    });
    renderAt('/pengaduan/lacak', <TrackComplaintPage />);
    fireEvent.change(screen.getByPlaceholderText('Masukkan kode pengaduan Anda'), { target: { value: 'ADU-PL-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lacak Pengaduan' }));
    const reason = await screen.findByRole('region', { name: 'Alasan Penolakan' });
    expect(reason).toHaveTextContent('Data pendaftaran tidak ditemukan.');
  });

  it('memberi pesan bila kode tidak ditemukan', async () => {
    vi.spyOn(complaintApi, 'track').mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    renderAt('/pengaduan/lacak', <TrackComplaintPage />);
    fireEvent.change(screen.getByPlaceholderText('Masukkan kode pengaduan Anda'), { target: { value: 'ADU-XX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lacak Pengaduan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kode pengaduan tidak ditemukan. Silakan periksa kembali kode yang Anda masukkan.');
  });
});
