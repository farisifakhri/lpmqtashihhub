import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MasterRequestForm, validateMasterRequestForm } from './MasterRequestForm';
import { masterRequestApi } from '@/api/master-request.api';

vi.mock('@/api/master-request.api', () => ({
  masterRequestApi: {
    getMushafTypes: vi.fn(),
    getProvinces: vi.fn(),
    getRegencies: vi.fn(),
    getDistricts: vi.fn(),
    submit: vi.fn(),
  },
}));

const pdf = (name = 'surat.pdf', size = 1024) => {
  const file = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const onSubmitted = vi.fn();
const renderPage = (defaults) => render(<MasterRequestForm defaults={defaults} onSubmitted={onSubmitted} />);

async function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Nama Pemohon/), { target: { value: 'Budi Santoso' } });
  fireEvent.change(screen.getByLabelText(/Alamat Pemohon/), { target: { value: 'Jl. Merdeka No. 1, RT 01' } });
  fireEvent.change(screen.getByLabelText(/^Provinsi/), { target: { value: '32' } });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Kota Bandung' })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText(/Kota\/Kabupaten/), { target: { value: '32.73' } });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Sukasari' })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText(/Kecamatan/), { target: { value: '32.73.01' } });
  fireEvent.change(screen.getByLabelText(/Kode Pos/), { target: { value: '40151' } });
  fireEvent.change(screen.getByLabelText(/Nomor Telepon Pemohon/), { target: { value: '081234567890' } });
  fireEvent.change(screen.getByLabelText(/Email Pemohon/), { target: { value: 'budi@example.com' } });
  fireEvent.change(screen.getByLabelText(/Lembaga Pemohon/), { target: { value: 'Yayasan Rumah Tahfiz' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Yasin dan Tahlil' }));
  fireEvent.change(screen.getByLabelText(/Rencana Penggunaan/), { target: { value: 'Dicetak untuk dibagikan gratis.' } });
  fireEvent.change(screen.getByLabelText(/^Surat Permohonan Master/), { target: { files: [pdf('surat.pdf')] } });
  fireEvent.change(screen.getByLabelText(/^Profil Pemohon Master/), { target: { files: [pdf('profil.pdf')] } });
}

describe('MasterRequestForm (formulir permohonan master penerbit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    masterRequestApi.getMushafTypes.mockResolvedValue({
      data: [
        { kode: 'YASIN_TAHLIL', label: 'Yasin dan Tahlil' },
        { kode: 'PEDOMAN_BRAILLE', label: "Pedoman Membaca dan Menulis Al-Qur'an Braille" },
      ],
    });
    masterRequestApi.getProvinces.mockResolvedValue({ data: [{ kode: '32', nama: 'Jawa Barat' }] });
    masterRequestApi.getRegencies.mockResolvedValue({ data: [{ kode: '32.73', nama: 'Kota Bandung' }] });
    masterRequestApi.getDistricts.mockResolvedValue({ data: [{ kode: '32.73.01', nama: 'Sukasari' }] });
  });

  it('menampilkan seluruh bagian formulir sesuai contoh', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: "Ajukan Master Mushaf Al-Qur'an" })).toBeInTheDocument();
    for (const heading of ['Siapa yang mengajukan?', 'Master apa yang dibutuhkan?', 'Lampirkan dokumen', 'Persetujuan']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(await screen.findByRole('radio', { name: 'Yasin dan Tahlil' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Jawa Barat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kosongkan Formulir' })).toBeInTheDocument();
    expect(screen.getByText('Braille (Tunanetra)')).toBeInTheDocument();
  });

  it('panel kelengkapan bertambah saat bagian diisi', async () => {
    renderPage();
    expect(screen.getByTestId('progress-count')).toHaveTextContent('0/5');
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i }));
    expect(screen.getByTestId('progress-count')).toHaveTextContent('1/5');
    await screen.findByRole('radio', { name: 'Yasin dan Tahlil' });
    await fillValidForm();
    expect(screen.getByTestId('progress-count')).toHaveTextContent('5/5');
  });

  it('tombol Kirim Permohonan nonaktif sampai pernyataan dicentang', async () => {
    renderPage();
    const submit = screen.getByRole('button', { name: 'Kirim Permohonan' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i }));
    expect(submit).toBeEnabled();
  });

  it('kota/kabupaten dan kecamatan dimuat berjenjang dan dikosongkan saat provinsi berganti', async () => {
    renderPage();
    await screen.findByRole('option', { name: 'Jawa Barat' });
    expect(screen.getByLabelText(/Kota\/Kabupaten/)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Provinsi/), { target: { value: '32' } });
    await waitFor(() => expect(masterRequestApi.getRegencies).toHaveBeenCalledWith('32'));
    fireEvent.change(await screen.findByLabelText(/Kota\/Kabupaten/), { target: { value: '32.73' } });
    await waitFor(() => expect(masterRequestApi.getDistricts).toHaveBeenCalledWith('32.73'));
    fireEvent.change(screen.getByLabelText(/^Provinsi/), { target: { value: '' } });
    expect(screen.getByLabelText(/Kota\/Kabupaten/)).toHaveValue('');
    expect(screen.getByLabelText(/Kecamatan/)).toBeDisabled();
  });

  it('menampilkan pesan validasi dan tidak mengirim bila isian kosong', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Permohonan' }));
    expect(await screen.findByText('Nama pemohon wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Provinsi wajib dipilih.')).toBeInTheDocument();
    expect(screen.getByText("Jenis mushaf Al-Qur'an wajib dipilih.")).toBeInTheDocument();
    expect(screen.getByText("Surat Permohonan Master Mushaf Al-Qur'an wajib diunggah.")).toBeInTheDocument();
    expect(masterRequestApi.submit).not.toHaveBeenCalled();
  });

  it('menolak berkas lebih dari 500 KB', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Surat Permohonan Master/), { target: { files: [pdf('besar.pdf', 600 * 1024)] } });
    expect(await screen.findByText('Ukuran berkas maksimal 500 KB.')).toBeInTheDocument();
  });

  it('mengirim formulir lengkap sebagai multipart lalu meneruskan hasilnya', async () => {
    masterRequestApi.submit.mockResolvedValue({
      data: { kode_permohonan: 'PMQ-20261109-ABC234', jenis_mushaf: 'Yasin dan Tahlil' },
    });
    renderPage();
    await screen.findByRole('radio', { name: 'Yasin dan Tahlil' });
    await fillValidForm();
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Permohonan' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ kode_permohonan: 'PMQ-20261109-ABC234' })));
    const formData = masterRequestApi.submit.mock.calls[0][0];
    expect(formData.get('nama_pemohon')).toBe('Budi Santoso');
    expect(formData.get('kecamatan_kode')).toBe('32.73.01');
    expect(formData.get('jenis_mushaf')).toBe('YASIN_TAHLIL');
    expect(formData.get('pernyataan')).toBe('true');
    expect(formData.get('surat_permohonan').name).toBe('surat.pdf');
    expect(formData.get('profil_pemohon').name).toBe('profil.pdf');
  });

  it('menampilkan galat dari server per kolom', async () => {
    masterRequestApi.submit.mockRejectedValue(Object.assign(new Error('Periksa isian Anda.'), {
      data: { errors: [{ field: 'email', message: 'Format alamat email tidak valid.' }] },
    }));
    renderPage();
    await screen.findByRole('radio', { name: 'Yasin dan Tahlil' });
    await fillValidForm();
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Permohonan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Periksa isian Anda.');
    expect(screen.getByText('Format alamat email tidak valid.')).toBeInTheDocument();
  });

  it('tombol Kosongkan Formulir mengosongkan isian dan persetujuan', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Nama Pemohon/), { target: { value: 'Budi' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Kosongkan Formulir' }));
    expect(screen.getByLabelText(/Nama Pemohon/)).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /menyetujui pernyataan/i })).not.toBeChecked();
  });
});

describe('MasterRequestForm nilai awal akun penerbit', () => {
  it('mengisi lembaga & email dari akun penerbit dan Kosongkan kembali ke nilai awal', async () => {
    masterRequestApi.getMushafTypes.mockResolvedValue({ data: [] });
    masterRequestApi.getProvinces.mockResolvedValue({ data: [] });
    renderPage({ lembaga: 'PT Mushaf Nusantara', email: 'penerbit@mushafnusantara.com' });
    expect(screen.getByLabelText(/Lembaga Pemohon/)).toHaveValue('PT Mushaf Nusantara');
    expect(screen.getByLabelText(/Email Pemohon/)).toHaveValue('penerbit@mushafnusantara.com');
    fireEvent.change(screen.getByLabelText(/Lembaga Pemohon/), { target: { value: 'Lain' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kosongkan Formulir' }));
    expect(screen.getByLabelText(/Lembaga Pemohon/)).toHaveValue('PT Mushaf Nusantara');
  });
});

describe('validateMasterRequestForm', () => {
  it('memeriksa format kode pos, telepon, dan email', () => {
    const errors = validateMasterRequestForm({
      nama_pemohon: 'Budi', alamat: 'Jl. Merdeka No. 1', provinsi_kode: '32', kabupaten_kode: '32.73',
      kecamatan_kode: '32.73.01', kode_pos: '401', telepon: '12', email: 'budi@', lembaga: 'Yayasan',
      jenis_mushaf: 'YASIN_TAHLIL', penggunaan: 'Untuk dibagikan gratis',
    }, { surat_permohonan: pdf(), profil_pemohon: pdf() });
    expect(Object.keys(errors).sort()).toEqual(['email', 'kode_pos', 'telepon']);
  });
});
