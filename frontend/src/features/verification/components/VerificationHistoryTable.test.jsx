import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VerificationHistoryTable, trackSteps } from './VerificationHistoryTable';

const item = (id, status, { sent = true } = {}) => ({
  id, status, verifier: { name: 'Verifikator A' }, review_submitted_at: '2026-11-20T02:00:00.000Z',
  registration: { registration_no: `REG-${id}`, title: `Naskah ${id}`, status: sent ? 'AWAITING_PAYMENT' : 'VERIFICATION_APPROVED', stage_entered_at: '2026-11-23T03:00:00.000Z', publisher: { legal_name: 'PT Mushaf' } },
  documents: [
    { id: `shv-${id}`, document_type: 'SURAT_HASIL_VERIFIKASI', document_no: `B-${id}/LPMQ`, approved_at: '2026-11-23T03:00:00.000Z', sent_at: sent ? '2026-11-23T03:01:00.000Z' : null, approved_by: { name: 'Kepala LPMQ' } },
    { id: `ba-${id}`, document_type: 'BERITA_ACARA_VERIFIKASI', document_no: `BA-${id}` },
  ],
  paraf: { signers: [{ id: 'p1', name: 'dr afdhal', signed_at: '2026-11-21T00:00:00.000Z' }, { id: 'p2', name: 'Pemaraf Uji', signed_at: '2026-11-22T00:00:00.000Z' }] },
});

const renderTable = (assignments) => render(<MemoryRouter><VerificationHistoryTable assignments={assignments} /></MemoryRouter>);

describe('VerificationHistoryTable (Riwayat lacak berkas)', () => {
  it('jejak berkas: dikirim -> posisi saat ini sedang berjalan; belum dikirim -> tahap kirim sedang berjalan', () => {
    expect(trackSteps(item('1', 'COMPLETED')).map((s) => s.state)).toEqual(['done', 'done', 'done', 'done', 'current']);
    expect(trackSteps(item('2', 'READY_TO_SEND', { sent: false })).map((s) => s.state)).toEqual(['done', 'done', 'done', 'current', 'todo']);
  });

  it('menyaring belum/sudah dikirim dan membuka jejak bertanggal lewat tombol Lacak', () => {
    renderTable([item('1', 'COMPLETED'), item('2', 'READY_TO_SEND', { sent: false })]);
    expect(screen.getByText('B-1/LPMQ')).toBeInTheDocument();
    expect(screen.getByText('BA: BA-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Disahkan, Belum Dikirim (1)' }));
    expect(screen.queryByText('REG-1')).not.toBeInTheDocument();
    expect(screen.getByText('Belum dikirim ke penerbit')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Semua (2)' }));
    const lacak = screen.getAllByRole('button', { name: /Lacak/ })[0];
    fireEvent.click(lacak);
    expect(lacak).toHaveAttribute('aria-expanded', 'true');
    const timeline = screen.getByRole('list', { name: 'Lacak berkas REG-1' });
    expect(within(timeline).getByText(/dr afdhal \(21 Nov 2026\) · Pemaraf Uji \(22 Nov 2026\)/)).toBeInTheDocument();
    expect(within(timeline).getByText('No. B-1/LPMQ')).toBeInTheDocument();
    expect(within(timeline).getByText('Posisi Berkas Saat Ini')).toBeInTheDocument();
  });
});
