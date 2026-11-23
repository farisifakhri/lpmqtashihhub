import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ParafQueuePage } from './ParafQueuePage';
import { parafApi } from '@/api/paraf.api';

vi.mock('@/api/paraf.api', () => ({ parafApi: { queue: vi.fn(), paraf: vi.fn() } }));
vi.mock('@/api/queue.api', () => ({ invalidateQueueCounts: vi.fn() }));
vi.mock('@/features/auth/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 'pem-1', name: 'dr afdhal' } }) }));

const item = (type, id, title) => ({
  type, action_id: id, subject_id: id, reference: `REF-${id}`, title, publisher: 'PT Mushaf', detail: '-',
  link: '/internal/signatures', paraf_done: 0, paraf_required: 2, requested_at: '2026-11-20T00:00:00.000Z',
});
const QUEUE = [
  item('VERIFICATION_RESULT', 'v1', 'Mushaf Uji Verifikasi'),
  item('STT', 's1', 'Mushaf Uji STT'),
  item('MASTER_LETTER', 'm1', 'Yasin dan Tahlil'),
];

const renderPage = () => render(<MemoryRouter><ParafQueuePage /></MemoryRouter>);

describe('ParafQueuePage (antrean paraf Pemaraf)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parafApi.queue.mockResolvedValue({ data: QUEUE });
  });

  it('menampilkan seluruh antrean dan menyaring per jenis', async () => {
    renderPage();
    expect(await screen.findByText('Mushaf Uji Verifikasi')).toBeInTheDocument();
    expect(screen.getByText('Mushaf Uji STT')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Draf STT (1)' }));
    expect(screen.queryByText('Mushaf Uji Verifikasi')).not.toBeInTheDocument();
    expect(screen.getByText('Mushaf Uji STT')).toBeInTheDocument();
  });

  it('centang beberapa dokumen lalu checkout memaraf semuanya; yang gagal tetap tercentang', async () => {
    parafApi.paraf.mockImplementation((it) => (it.action_id === 's1'
      ? Promise.reject(new Error('Anda tidak ditunjuk sebagai Pemaraf untuk draf STT ini.'))
      : Promise.resolve({ data: {} })));
    renderPage();
    fireEvent.click(await screen.findByRole('checkbox', { name: /REF-v1/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /REF-s1/ }));
    const card = screen.getByRole('complementary', { name: 'Paraf dokumen terpilih' });
    expect(within(card).getByText('1 Hasil Verifikasi · 1 Draf STT')).toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: /Paraf Semua yang Dipilih \(2\)/ }));
    const dialog = await screen.findByRole('dialog');
    parafApi.queue.mockResolvedValue({ data: QUEUE.filter((q) => q.action_id !== 'v1') });
    fireEvent.click(within(dialog).getByRole('button', { name: /Bubuhkan Paraf \(2\)/ }));

    await waitFor(() => expect(within(dialog).getByText('Hasil Paraf')).toBeInTheDocument());
    expect(parafApi.paraf).toHaveBeenCalledTimes(2);
    expect(within(dialog).getByText('Paraf tercatat.')).toBeInTheDocument();
    expect(within(dialog).getByText('Anda tidak ditunjuk sebagai Pemaraf untuk draf STT ini.')).toBeInTheDocument();
    // Judul dokumen yang sudah diparaf tetap tampil di ringkasan walau hilang dari antrean
    expect(within(dialog).getByText('Mushaf Uji Verifikasi')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Selesai/ }));
    expect(screen.getByRole('checkbox', { name: /REF-s1/ })).toBeChecked();
  });

  it('Pilih Semua hanya mencakup dokumen dalam filter', async () => {
    renderPage();
    await screen.findByText('Yasin dan Tahlil');
    fireEvent.click(screen.getByRole('button', { name: 'Surat Master (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pilih Semua' }));
    expect(screen.getByRole('button', { name: /Paraf Semua yang Dipilih \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /REF-m1/ })).toBeChecked();
  });
});
