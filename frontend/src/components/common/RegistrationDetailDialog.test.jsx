import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegistrationDetailDialog } from './RegistrationDetailDialog';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';

describe('Registration detail', () => {
  it('loads the selected record, displays timeline and closes with Escape', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({ data: { registration_no: 'REG-FIFO-01', title: 'Naskah tertua', status: 'READY_FOR_VERIFICATION', stage_entered_at: new Date().toISOString(), status_histories: [{ id: 'h1', to_status: 'READY_FOR_VERIFICATION', changed_at: new Date().toISOString(), notes: 'Pengajuan diterima' }] } });
    vi.spyOn(reportApi, 'getRegistrationTimeline').mockResolvedValue({ data: { is_sanitized: true, timeline: [{ id: 'h1', to_status: 'READY_FOR_VERIFICATION', changed_at: new Date().toISOString(), notes: 'Pengajuan diterima' }] } });
    const close = vi.fn();
    render(<RegistrationDetailDialog id="r1" onClose={close} />);
    expect(await screen.findByText('Naskah tertua')).toBeInTheDocument();
    expect(screen.getByText('Pengajuan diterima')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Tutup detail naskah' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
  it('never falls back to private notes from the detail payload', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({ data: { title: 'Naskah penerbit', status: 'READY_FOR_VERIFICATION', status_histories: [{ id: 'h1', notes: 'Memo tim rahasia' }] } });
    vi.spyOn(reportApi, 'getRegistrationTimeline').mockResolvedValue({ data: { is_sanitized: true, timeline: [{ id: 'h1', to_status: 'READY_FOR_VERIFICATION', changed_at: new Date().toISOString(), notes: 'Pengajuan sedang diproses' }] } });
    render(<RegistrationDetailDialog id="r2" onClose={vi.fn()} />);
    await screen.findByText('Pengajuan sedang diproses');
    expect(screen.queryByText('Memo tim rahasia')).not.toBeInTheDocument();
  });
});
