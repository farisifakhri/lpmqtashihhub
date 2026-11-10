import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminMasterRequestsPage } from './AdminMasterRequestsPage';
import { masterRequestApi } from '@/api/master-request.api';

vi.mock('@/api/master-request.api', () => ({
  masterRequestApi: {
    listAdmin: vi.fn(),
    getAdminDetail: vi.fn(),
    reject: vi.fn(),
    submitLetter: vi.fn(),
    sendToPublisher: vi.fn(),
    openDocument: vi.fn(),
    openAdminLetter: vi.fn(),
  },
}));

const row = {
  id: 'req-1',
  request_code: 'PMQ-20261110-ABC234',
  applicant_name: 'Ahmad Fauzi',
  institution: 'PT Mushaf Nusantara',
  publisher: { id: 'pub-1', legal_name: 'PT Mushaf Nusantara' },
  mushaf_type_label: 'Yasin dan Tahlil',
  status: 'DIAJUKAN',
  created_at: '2026-11-10T02:00:00.000Z',
};

const detail = (overrides = {}) => ({
  ...row,
  publisher_id: 'pub-1',
  address: 'Jl. Merdeka No. 1',
  district_name: 'Sukasari',
  regency_name: 'Kota Bandung',
  province_name: 'Jawa Barat',
  postal_code: '40151',
  phone: '081234567890',
  email: 'penerbit@example.com',
  intended_use: 'Dicetak untuk dibagikan gratis.',
  documents: [{ id: 'doc-1', document_type: 'SURAT_PERMOHONAN', original_filename: 'surat.pdf', file_size: 2048 }],
  submitted_by: { name: 'Ahmad Fauzi' },
  allowed_actions: ['AJUKAN_TTE', 'TOLAK'],
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><AdminMasterRequestsPage /></MemoryRouter>);

async function openDetail() {
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: /Lihat detail permohonan PMQ-20261110-ABC234/ }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText('penerbit@example.com');
  return dialog;
}

describe('AdminMasterRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    masterRequestApi.listAdmin.mockResolvedValue({
      data: [row],
      counts: { DIAJUKAN: 1, MENUNGGU_TTE: 2, DITANDATANGANI: 0, DIKIRIM: 3, DITOLAK: 0 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    masterRequestApi.getAdminDetail.mockResolvedValue({ data: detail() });
  });

  it('menampilkan daftar dan filter status alur TTE', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Permohonan Master' })).toBeInTheDocument();
    expect(await screen.findByText('PMQ-20261110-ABC234')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Semua\s*6/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Menunggu TTE Kepala/ }));
    await waitFor(() => expect(masterRequestApi.listAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'MENUNGGU_TTE' })));
  });

  it('admin menyusun surat persetujuan lalu mengajukannya ke Kepala untuk TTE', async () => {
    masterRequestApi.submitLetter.mockResolvedValue({
      data: detail({ status: 'MENUNGGU_TTE', letter_number: 'B-0007/LPMQ.01/HM.01/XI/2026', allowed_actions: ['PERBARUI_SURAT'] }),
    });
    const dialog = await openDetail();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Susun Surat Persetujuan' }));
    fireEvent.change(within(dialog).getByLabelText(/Isi tambahan surat/), { target: { value: 'Master dikirim melalui surel resmi LPMQ.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ajukan ke Kepala untuk TTE' }));
    await waitFor(() => expect(masterRequestApi.submitLetter).toHaveBeenCalledWith('req-1', {
      perihal: "Persetujuan Permohonan Master Mushaf Al-Qur'an",
      isi: 'Master dikirim melalui surel resmi LPMQ.',
    }));
    expect(await within(dialog).findByText(/menunggu tanda tangan elektronik Kepala LPMQ/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Pratinjau Draf Surat' })).toBeInTheDocument();
  });

  it('penolakan wajib beralasan', async () => {
    masterRequestApi.reject.mockResolvedValue({ data: detail({ status: 'DITOLAK', admin_note: 'Berkas tidak lengkap', allowed_actions: [] }) });
    const dialog = await openDetail();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tolak…' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tolak Permohonan' }));
    expect(within(dialog).getByText(/minimal 5 karakter/)).toBeInTheDocument();
    expect(masterRequestApi.reject).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Alasan penolakan/), { target: { value: 'Berkas tidak lengkap' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tolak Permohonan' }));
    await waitFor(() => expect(masterRequestApi.reject).toHaveBeenCalledWith('req-1', 'Berkas tidak lengkap'));
  });

  it('setelah ditandatangani Kepala, admin mengirim surat ke penerbit', async () => {
    masterRequestApi.getAdminDetail.mockResolvedValue({
      data: detail({
        status: 'DITANDATANGANI',
        letter_number: 'B-0007/LPMQ.01/HM.01/XI/2026',
        signed_at: '2026-11-10T04:00:00.000Z',
        signed_by: { name: 'Kepala LPMQ' },
        allowed_actions: ['KIRIM_KE_PENERBIT'],
      }),
    });
    masterRequestApi.sendToPublisher.mockResolvedValue({ data: detail({ status: 'DIKIRIM', letter_number: 'B-0007', signed_at: '2026-11-10T04:00:00.000Z', allowed_actions: [] }) });
    const dialog = await openDetail();
    expect(within(dialog).getByText('Ditandatangani Kepala LPMQ')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lihat Surat Bertanda Tangan' }));
    expect(masterRequestApi.openAdminLetter).toHaveBeenCalledWith('req-1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim Surat ke Penerbit' }));
    await waitFor(() => expect(masterRequestApi.sendToPublisher).toHaveBeenCalledWith('req-1'));
    expect(await within(dialog).findByText(/dapat diunduh penerbit/)).toBeInTheDocument();
  });

  it('permohonan formulir lama tanpa akun penerbit tidak dapat dibuatkan surat', async () => {
    masterRequestApi.getAdminDetail.mockResolvedValue({ data: detail({ publisher_id: null, publisher: null }) });
    const dialog = await openDetail();
    expect(within(dialog).getByText(/formulir publik lama/i, { selector: 'div' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Susun Surat Persetujuan' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Tolak…' })).toBeInTheDocument();
  });
});
