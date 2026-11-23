import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VerificationApprovalTable } from './VerificationApprovalTable';
import { parafApi } from '@/api/paraf.api';

vi.mock('@/api/paraf.api', () => ({ parafApi: { queue: vi.fn(), paraf: vi.fn() } }));
vi.mock('@/api/queue.api', () => ({ invalidateQueueCounts: vi.fn() }));
vi.mock('@/features/auth/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 'pem-1', name: 'dr afdhal' } }) }));

const pemaraf = { id: 'pem-1', name: 'dr afdhal', role: 'PEMARAF', activeRole: 'PEMARAF', roles: ['PEMARAF'], isPemaraf: true };
const assignment = (id, assigned, signers = []) => ({
  id, status: 'WAITING_APPROVAL', queue_position: 1, verifier: { name: 'Verifikator A' },
  registration: { registration_no: `REG-${id}`, title: `Naskah ${id}`, publisher: { legal_name: 'PT Mushaf' } },
  documents: [
    { id: `ba-${id}`, document_type: 'BERITA_ACARA_VERIFIKASI', status: 'SUBMITTED' },
    { id: `shv-${id}`, document_type: 'SURAT_HASIL_VERIFIKASI', status: 'SUBMITTED' },
  ],
  paraf: { assigned, signers, complete: false, required: 2, pemaraf: (assigned || []).map((pid) => ({ id: pid, name: `Nama ${pid}`, signed: signers.some((s) => s.id === pid) })) },
});

const renderTable = (assignments, onRefresh = vi.fn()) => render(
  <MemoryRouter><VerificationApprovalTable assignments={assignments} currentUser={pemaraf} onRefresh={onRefresh} /></MemoryRouter>,
);

describe('VerificationApprovalTable (Menunggu Persetujuan, Pemaraf)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('kotak pilih aktif hanya untuk draf yang giliran Pemaraf ini, nama Pemaraf ditunjuk tampil', () => {
    renderTable([
      assignment('1', ['pem-1', 'pem-2']),
      assignment('2', ['pem-2', 'pem-3']), // tidak ditunjuk
      assignment('3', ['pem-1', 'pem-2'], [{ id: 'pem-1' }]), // sudah memaraf
    ]);
    expect(screen.getByRole('checkbox', { name: /Pilih REG-1/ })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /REG-2: Anda tidak ditunjuk/ })).toBeDisabled();
    // Sudah saya paraf: cap 'Diparaf' menggantikan kotak pilih
    expect(screen.queryByRole('checkbox', { name: /REG-3/ })).not.toBeInTheDocument();
    expect(screen.getByText('Diparaf')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Tinjau Detail/ })).toHaveLength(3);
    // Nama Pemaraf yang ditunjuk tampil, termasuk penanda akun sendiri
    expect(screen.getAllByText('Nama pem-2')).toHaveLength(3);
    expect(screen.getAllByText('Nama pem-1 (Anda)')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('1 dari 3 draf menunggu paraf Anda');
  });

  it('setelah paraf lengkap, status mengikuti alur surat: menunggu pengesahan Kepala', () => {
    const done = assignment('5', ['pem-1', 'pem-2'], [{ id: 'pem-1', signed_at: '2026-11-23T03:00:00.000Z' }, { id: 'pem-2' }]);
    done.paraf.complete = true;
    renderTable([done]);
    expect(screen.getByText('Menunggu Pengesahan Kepala LPMQ')).toBeInTheDocument();
    const flow = screen.getByRole('list', { name: 'Alur surat hasil verifikasi' });
    expect(within(flow).getByText('Paraf Pemaraf (2/2)').nextSibling).toHaveTextContent('(selesai)');
    expect(within(flow).getByText('Pengesahan Kepala LPMQ').nextSibling).toHaveTextContent('(sedang berjalan)');
    expect(screen.getByRole('status')).toHaveTextContent('Anda sudah memaraf 1 draf');
  });

  it('Kepala LPMQ memilih draf yang parafnya lengkap lalu mengesahkan sekaligus', async () => {
    parafApi.paraf.mockResolvedValue({ data: {} });
    const kepala = { id: 'kep-1', name: 'Kepala LPMQ', role: 'KEPALA_LPMQ', activeRole: 'KEPALA_LPMQ', roles: ['KEPALA_LPMQ'] };
    const ready = assignment('6', ['pem-1', 'pem-2'], [{ id: 'pem-1' }, { id: 'pem-2' }]);
    ready.paraf.complete = true;
    const waiting = assignment('7', ['pem-1', 'pem-2'], [{ id: 'pem-1' }]);
    const onRefresh = vi.fn();
    render(<MemoryRouter><VerificationApprovalTable assignments={[ready, waiting]} currentUser={kepala} onRefresh={onRefresh} /></MemoryRouter>);

    expect(screen.getByRole('checkbox', { name: /REG-7: menunggu paraf Pemaraf \(1\/2\)/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('1 dari 2 draf siap Anda sahkan');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua 1 draf yang siap Anda sahkan' }));
    const card = screen.getByRole('complementary', { name: 'Paraf dokumen terpilih' });
    fireEvent.click(within(card).getByRole('button', { name: /Sahkan Semua yang Dipilih \(1\)/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Sahkan Sekarang \(1\)/ }));
    await waitFor(() => expect(within(dialog).getByText('Hasil Pengesahan')).toBeInTheDocument());
    expect(parafApi.paraf.mock.calls.map(([item]) => item.action_id)).toEqual(['shv-6']);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('pilih semua lalu paraf sekaligus memakai surat hasil verifikasi, lalu memuat ulang', async () => {
    parafApi.paraf.mockResolvedValue({ data: {} });
    const onRefresh = vi.fn();
    renderTable([assignment('1', ['pem-1', 'pem-2']), assignment('4', null)], onRefresh);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua 2 draf yang menunggu paraf Anda' }));
    expect(screen.getByRole('checkbox', { name: /Pilih REG-1/ })).toBeChecked();
    const card = screen.getByRole('complementary', { name: 'Paraf dokumen terpilih' });
    fireEvent.click(within(card).getByRole('button', { name: /Paraf Semua yang Dipilih \(2\)/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Bubuhkan Paraf \(2\)/ }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(parafApi.paraf.mock.calls.map(([item]) => item.action_id)).toEqual(['shv-1', 'shv-4']);
  });
});
