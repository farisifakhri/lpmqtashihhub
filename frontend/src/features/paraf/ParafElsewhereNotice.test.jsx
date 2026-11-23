import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ParafElsewhereNotice } from './ParafElsewhereNotice';
import { parafApi } from '@/api/paraf.api';

vi.mock('@/api/paraf.api', () => ({ parafApi: { queue: vi.fn() } }));

const renderNotice = () => render(<MemoryRouter><ParafElsewhereNotice /></MemoryRouter>);

describe('ParafElsewhereNotice (Pemaraf di Persetujuan Verifikasi)', () => {
  it('memberi tahu keputusan sidang yang menunggu paraf dan menautkan ke Antrean Paraf', async () => {
    parafApi.queue.mockResolvedValue({ data: [
      { type: 'VERIFICATION_RESULT' }, { type: 'DISTRIBUTOR_REVIEW' }, { type: 'DISTRIBUTOR_REVIEW' },
    ] });
    renderNotice();
    expect(await screen.findByText('Ada 2 dokumen lain menunggu paraf Anda')).toBeInTheDocument();
    expect(screen.getByText('Keputusan Sidang (2)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buka Antrean Paraf/ })).toHaveAttribute('href', '/internal/paraf');
  });

  it('tidak tampil bila hanya ada surat hasil verifikasi (sudah ada di tabel halaman ini)', async () => {
    parafApi.queue.mockResolvedValue({ data: [{ type: 'VERIFICATION_RESULT' }] });
    const { container } = renderNotice();
    await waitFor(() => expect(parafApi.queue).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
