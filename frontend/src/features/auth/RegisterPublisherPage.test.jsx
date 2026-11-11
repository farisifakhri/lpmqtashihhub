import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPublisherPage } from './RegisterPublisherPage';
import { publisherRegistrationApi } from '@/api/publisher-registration.api';

describe('RegisterPublisherPage (T-S01 Form Pendaftaran Penerbit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only legal entity types (PERUSAHAAN, YAYASAN, LEMBAGA_PEMERINTAH) and NO PERORANGAN', () => {
    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    // Judul & Narasi harus Pendaftaran Akun Penerbit
    expect(screen.getByRole('heading', { level: 1, name: /Pendaftaran Akun Penerbit/i })).toBeInTheDocument();

    // Harus ada tombol jenis penerbit legalitas
    expect(screen.getByText('Perusahaan (PT / CV)')).toBeInTheDocument();
    expect(screen.getByText('Yayasan')).toBeInTheDocument();
    expect(screen.getByText('Lembaga Pemerintah')).toBeInTheDocument();

    // Tidak boleh ada teks perorangan / pemohon perorangan
    expect(screen.queryByText(/Perorangan \/ Mandiri/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pemohon Perorangan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mode Perorangan/i)).not.toBeInTheDocument();
  });

  it('dynamically adapts required documents and NIB field based on entity type', () => {
    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    // Default: PERUSAHAAN -> NIB field & NIB upload exists
    expect(screen.getByLabelText(/Nomor Induk Berusaha \(NIB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Salinan NIB \(OSS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Akta Notaris & SK Kemenkumham/i)).toBeInTheDocument();

    // Switch to YAYASAN -> NIB disappears, Akta remains
    fireEvent.click(screen.getByText('Yayasan'));
    expect(screen.queryByLabelText(/Nomor Induk Berusaha \(NIB\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Salinan NIB \(OSS\)/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Akta Notaris & SK Kemenkumham/i)).toBeInTheDocument();

    // Switch to LEMBAGA_PEMERINTAH -> NIB and Akta both disappear
    fireEvent.click(screen.getByText('Lembaga Pemerintah'));
    expect(screen.queryByLabelText(/Nomor Induk Berusaha \(NIB\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Akta Notaris & SK Kemenkumham/i)).not.toBeInTheDocument();
  });

  it('validates file formats to only accept PDF files', async () => {
    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    const nonPdfFile = new File(['image content'], 'sample.png', { type: 'image/png' });
    const fileInputs = screen.getAllByRole('textbox', { hidden: true }); // file input
    // Target surat permohonan file input
    const suratInput = document.querySelector('input[type="file"]');
    expect(suratInput).toBeInTheDocument();

    fireEvent.change(suratInput, { target: { files: [nonPdfFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Format berkas harus berupa dokumen PDF/i)).toBeInTheDocument();
    });
  });

  it('validates file size limits for standard documents (max 500 KB)', async () => {
    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    // Buat file PDF palsu berukuran 600 KB
    const largeContent = new Uint8Array(600 * 1024);
    const largeFile = new File([largeContent], 'large-surat.pdf', { type: 'application/pdf' });

    const suratInput = document.querySelector('input[type="file"]');
    fireEvent.change(suratInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Ukuran berkas melebihi batas maksimal 500 KB/i)).toBeInTheDocument();
    });
  });

  it('shows required-field validation immediately above the submit button', async () => {
    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    fireEvent.submit(screen.getByRole('button', { name: /Ajukan Pendaftaran Akun Penerbit/i }).closest('form'));

    const error = await screen.findByRole('alert');
    const submit = screen.getByRole('button', { name: /Ajukan Pendaftaran Akun Penerbit/i });
    expect(error).toHaveTextContent('Nama resmi lembaga / penerbit wajib diisi.');
    expect(error.nextElementSibling).toBe(submit);
  });

  it('successfully submits registration and displays high-entropy registration code with copy option', async () => {
    const registerSpy = vi.spyOn(publisherRegistrationApi, 'register').mockResolvedValue({
      success: true,
      data: {
        kode_pendaftaran: 'REG-PUB-7K9M2X4F',
        nama_penerbit: 'PT Pustaka Cahaya Mandiri',
        email: 'info@pustakacahaya.co.id',
        status: 'DIAJUKAN',
      },
    });

    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    // Isi Text Inputs
    fireEvent.change(screen.getByPlaceholderText(/Contoh: PT Pustaka Cahaya Mandiri/i), {
      target: { value: 'PT Pustaka Cahaya Mandiri' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Jl\. Percetakan Mushaf/i), {
      target: { value: 'Jl. Percetakan Mushaf No. 12, Jakarta Timur' },
    });
    fireEvent.change(screen.getByPlaceholderText(/01\.234\.567/i), {
      target: { value: '01.234.567.8-901.000' },
    });
    fireEvent.change(screen.getByPlaceholderText(/9120001234567/i), {
      target: { value: '9120001234567' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ahmad Subagio/i), {
      target: { value: 'Ahmad Subagio, S.Pd' },
    });
    fireEvent.change(screen.getByPlaceholderText(/081234567890/i), {
      target: { value: '081234567890' },
    });
    fireEvent.change(screen.getByPlaceholderText(/sekretariat@pustaka\.co\.id/i), {
      target: { value: 'info@pustakacahaya.co.id' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Huruf kapital & angka/i), {
      target: { value: 'Rahasia123' },
    });

    // Lampirkan 6 file PDF
    const dummyPdf = new File(['%PDF-1.4 test'], 'test.pdf', { type: 'application/pdf' });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(6);

    fileInputs.forEach((input) => {
      fireEvent.change(input, { target: { files: [dummyPdf] } });
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Ajukan Pendaftaran Akun Penerbit/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalled();
      expect(screen.getByText('Pendaftaran Berhasil Diajukan!')).toBeInTheDocument();
      expect(screen.getByTestId('success-registration-code')).toHaveTextContent('REG-PUB-7K9M2X4F');
      const statusLinks = screen.getAllByRole('link', { name: /Cek Status Pendaftaran/i });
      expect(statusLinks.length).toBeGreaterThanOrEqual(1);
      expect(statusLinks[0]).toHaveAttribute('href', '/cek-status');
    });
  });

  it('displays user-friendly error when API returns DUPLICATE_ACTIVE_REGISTRATION', async () => {
    const errorObj = new Error('Pendaftaran duplikat');
    errorObj.data = { code: 'DUPLICATE_ACTIVE_REGISTRATION' };
    vi.spyOn(publisherRegistrationApi, 'register').mockRejectedValue(errorObj);

    render(
      <MemoryRouter>
        <RegisterPublisherPage />
      </MemoryRouter>
    );

    // Isi Form
    fireEvent.change(screen.getByPlaceholderText(/Contoh: PT Pustaka Cahaya Mandiri/i), {
      target: { value: 'PT Pustaka Cahaya Mandiri' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Jl\. Percetakan Mushaf/i), {
      target: { value: 'Jl. Percetakan Mushaf No. 12, Jakarta Timur' },
    });
    fireEvent.change(screen.getByPlaceholderText(/01\.234\.567/i), {
      target: { value: '01.234.567.8-901.000' },
    });
    fireEvent.change(screen.getByPlaceholderText(/9120001234567/i), {
      target: { value: '9120001234567' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ahmad Subagio/i), {
      target: { value: 'Ahmad Subagio, S.Pd' },
    });
    fireEvent.change(screen.getByPlaceholderText(/081234567890/i), {
      target: { value: '081234567890' },
    });
    fireEvent.change(screen.getByPlaceholderText(/sekretariat@pustaka\.co\.id/i), {
      target: { value: 'info@pustakacahaya.co.id' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Huruf kapital & angka/i), {
      target: { value: 'Rahasia123' },
    });

    const dummyPdf = new File(['%PDF-1.4 test'], 'test.pdf', { type: 'application/pdf' });
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      fireEvent.change(input, { target: { files: [dummyPdf] } });
    });

    fireEvent.click(screen.getByRole('button', { name: /Ajukan Pendaftaran Akun Penerbit/i }));

    await waitFor(() => {
      expect(screen.getByText(/sudah terdaftar pada permohonan yang aktif/i)).toBeInTheDocument();
    });
    const error = screen.getByRole('alert');
    const submit = screen.getByRole('button', { name: /Ajukan Pendaftaran Akun Penerbit/i });
    expect(error.nextElementSibling).toBe(submit);
  });
});
