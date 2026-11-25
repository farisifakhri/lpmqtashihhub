import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SttAuthenticityCheck } from './SttAuthenticityCheck';
import { publicApi } from '@/api/public.api';
import { ApiError } from '@/api/client';

const findSttTokenInPdf = vi.fn();
const renderPdfPreview = vi.fn();
vi.mock('@/lib/pdf-qr', () => ({
  findSttTokenInPdf: (...args) => findSttTokenInPdf(...args),
  renderPdfPreview: (...args) => renderPdfPreview(...args),
}));

const TOKEN = 'b3c0c262-d2e5-427b-a8e9-8a330acd3a96';
const result = (integrity, overrides = {}) => ({
  document_no: 'STT/LPMQ/2026/30CA56', title: 'Mushaf Uji', publisher_name: 'PT Uji', status: 'ISSUED', is_valid: true,
  issued_at: '2026-11-09T00:00:00Z', valid_until: '2028-11-08T00:00:00Z', checked_file_integrity: integrity, ...overrides,
});
const pdfFile = () => {
  const file = new File(['%PDF-1.7'], 'stt.pdf', { type: 'application/pdf' });
  file.arrayBuffer = async () => new ArrayBuffer(8);
  return file;
};
const upload = (file) => fireEvent.change(screen.getByLabelText('Unggah PDF STT'), { target: { files: [file] } });
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
const renderPage = () => render(<MemoryRouter><SttAuthenticityCheck /></MemoryRouter>);

describe('SttAuthenticityCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    renderPdfPreview.mockResolvedValue(['data:image/png;base64,AAAA']);
    const original = new Blob(['%PDF-'], { type: 'application/pdf' });
    original.arrayBuffer = async () => new ArrayBuffer(5); // jsdom belum menyediakan Blob#arrayBuffer
    vi.spyOn(publicApi, 'getOriginalSttFile').mockResolvedValue(original);
  });

  it('baru memeriksa setelah Kirim, lalu menyatakan asli bila checksum cocok dan STT berlaku', async () => {
    findSttTokenInPdf.mockResolvedValue(TOKEN);
    vi.spyOn(publicApi, 'checkSttFile').mockResolvedValue(result('MATCH'));
    renderPage();
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeDisabled();
    const file = pdfFile();
    upload(file);
    expect(screen.getByText('stt.pdf')).toBeInTheDocument();
    expect(findSttTokenInPdf).not.toHaveBeenCalled();
    send();
    const verdict = await screen.findByRole('heading', { name: /Asli: berkas identik dengan STT asli/i });
    expect(verdict).toHaveFocus();
    expect(publicApi.checkSttFile).toHaveBeenCalledWith(TOKEN, file);
    expect(publicApi.getOriginalSttFile).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText('STT/LPMQ/2026/30CA56')).toBeInTheDocument();
    expect(screen.getByAltText('Berkas yang Anda unggah, halaman 1')).toBeInTheDocument();
    expect(screen.getByAltText('STT asli dari arsip LPMQ, halaman 1')).toBeInTheDocument();
  });

  it('menandai berkas yang diubah dan menyediakan STT asli untuk diunduh', async () => {
    findSttTokenInPdf.mockResolvedValue(TOKEN);
    vi.spyOn(publicApi, 'checkSttFile').mockResolvedValue(result('MISMATCH'));
    renderPage();
    upload(pdfFile());
    send();
    expect(await screen.findByText(/Berkas BERBEDA dari STT asli/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unduh STT asli/i })).toHaveAttribute('download', 'STT_LPMQ_2026_30CA56.pdf');
  });

  it('tidak menyatakan sah bila berkas identik tetapi STT sudah dicabut', async () => {
    findSttTokenInPdf.mockResolvedValue(TOKEN);
    vi.spyOn(publicApi, 'checkSttFile').mockResolvedValue(result('MATCH', { status: 'REVOKED', is_valid: false }));
    renderPage();
    upload(pdfFile());
    send();
    expect(await screen.findByText(/Berkas asli, tetapi STT sudah dicabut/i)).toBeInTheDocument();
    expect(screen.queryByText(/Asli: berkas identik/i)).not.toBeInTheDocument();
    expect(screen.getByText('Dicabut')).toBeInTheDocument();
  });

  it('menyatakan patut diduga palsu bila QR terbaca tetapi tidak terdaftar', async () => {
    findSttTokenInPdf.mockResolvedValue(TOKEN);
    vi.spyOn(publicApi, 'checkSttFile').mockRejectedValue(new ApiError('Dokumen tidak ditemukan.', 404));
    renderPage();
    upload(pdfFile());
    send();
    expect(await screen.findByText(/tidak terdaftar di arsip STT LPMQ/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Link atau token QR STT/i)).not.toBeInTheDocument();
  });

  it('tidak mencap palsu STT terdaftar yang arsip aslinya tidak tersedia', async () => {
    findSttTokenInPdf.mockResolvedValue(TOKEN);
    const message = 'STT ini terdaftar di LPMQ, tetapi berkas aslinya belum tersedia untuk dicocokkan.';
    vi.spyOn(publicApi, 'checkSttFile').mockRejectedValue(new ApiError(message, 409, { code: 'STT_ORIGINAL_UNAVAILABLE' }));
    renderPage();
    upload(pdfFile());
    send();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/patut diduga/i)).not.toBeInTheDocument();
  });

  it('tetap menampilkan vonis bila berkas asli belum dibuka untuk publik', async () => {
    findSttTokenInPdf.mockResolvedValue(TOKEN);
    vi.spyOn(publicApi, 'checkSttFile').mockResolvedValue(result('MISMATCH', { status: 'REVOKED', is_valid: false }));
    publicApi.getOriginalSttFile.mockRejectedValue(new ApiError('Berkas asli STT ini belum dibuka untuk publik.', 409));
    renderPage();
    upload(pdfFile());
    send();
    expect(await screen.findByText(/Berkas BERBEDA dari STT asli/i)).toBeInTheDocument();
    expect(screen.getByText(/juga sudah dicabut/i)).toBeInTheDocument();
    expect(screen.getByText(/belum dapat ditampilkan untuk publik/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Unduh STT asli/i })).not.toBeInTheDocument();
  });

  it('meminta link/token manual bila QR tidak terbaca', async () => {
    findSttTokenInPdf.mockResolvedValue(null);
    vi.spyOn(publicApi, 'checkSttFile').mockResolvedValue(result('MISMATCH'));
    renderPage();
    upload(pdfFile());
    send();
    expect(await screen.findByText(/QR Code verifikasi STT tidak terbaca/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/Link atau token QR STT/i);
    fireEvent.change(input, { target: { value: 'bukan-link' } });
    fireEvent.click(screen.getByRole('button', { name: 'Periksa' }));
    expect(await screen.findByText(/Format tidak dikenali/i)).toBeInTheDocument();
    expect(publicApi.checkSttFile).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: `https://tashih.kemenag.go.id/verify-documents/${TOKEN}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Periksa' }));
    expect(await screen.findByText(/Berkas BERBEDA dari STT asli/i)).toBeInTheDocument();
    expect(publicApi.checkSttFile).toHaveBeenCalledWith(TOKEN, expect.any(File));
  });

  it('menolak berkas bukan PDF', async () => {
    renderPage();
    upload(new File(['x'], 'foto.png', { type: 'image/png' }));
    expect(await screen.findByText(/Pilih berkas PDF/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeDisabled();
    expect(findSttTokenInPdf).not.toHaveBeenCalled();
  });
});
