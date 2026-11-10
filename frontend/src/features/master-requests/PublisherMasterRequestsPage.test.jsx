import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherMasterRequestsPage } from './PublisherMasterRequestsPage';
import { masterRequestApi } from '@/api/master-request.api';

vi.mock('@/api/master-request.api', () => ({
  masterRequestApi: { listMine: vi.fn(), openMyLetter: vi.fn() },
}));

const base = {
  applicant_name: 'Ahmad Fauzi',
  institution: 'PT Mushaf Nusantara',
  created_at: '2026-11-10T02:00:00.000Z',
};

const renderPage = (state) => render(
  <MemoryRouter initialEntries={[{ pathname: '/publisher/master-requests', state }]}>
    <PublisherMasterRequestsPage />
  </MemoryRouter>,
);

describe('PublisherMasterRequestsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('menampilkan ajakan mengajukan bila belum ada permohonan', async () => {
    masterRequestApi.listMine.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('Belum ada permohonan master')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ajukan Permohonan/ })[0]).toHaveAttribute('href', '/publisher/master-requests/new');
  });

  it('menampilkan status tiap permohonan; surat hanya bisa dibuka setelah dikirim', async () => {
    masterRequestApi.listMine.mockResolvedValue({
      data: [
        { ...base, id: 'r-1', request_code: 'PMQ-1', status: 'DIKIRIM', mushaf_type_label: 'Yasin dan Tahlil', letter_number: 'B-0007/LPMQ.01/HM.01/XI/2026', signed_at: '2026-11-10T04:00:00.000Z' },
        { ...base, id: 'r-2', request_code: 'PMQ-2', status: 'MENUNGGU_TTE', mushaf_type_label: 'Pedoman Braille' },
        { ...base, id: 'r-3', request_code: 'PMQ-3', status: 'DITOLAK', mushaf_type_label: 'Juz Amma', admin_note: 'Profil lembaga tidak sesuai' },
      ],
    });
    renderPage();
    expect(await screen.findByText('PMQ-1')).toBeInTheDocument();
    expect(screen.getByText('Disetujui — surat tersedia')).toBeInTheDocument();
    expect(screen.getByText('Surat persetujuan sedang diproses')).toBeInTheDocument();
    expect(screen.getByText('Profil lembaga tidak sesuai')).toBeInTheDocument();
    expect(screen.getByText('B-0007/LPMQ.01/HM.01/XI/2026')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: /Lihat Surat Persetujuan/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(masterRequestApi.openMyLetter).toHaveBeenCalledWith('r-1'));
  });

  it('menampilkan kode permohonan yang baru dikirim', async () => {
    masterRequestApi.listMine.mockResolvedValue({ data: [] });
    renderPage({ submitted: { kode_permohonan: 'PMQ-20261110-ABC234' } });
    expect(await screen.findByText('PMQ-20261110-ABC234')).toBeInTheDocument();
  });
});
