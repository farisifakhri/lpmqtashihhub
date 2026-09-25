import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublisherRegistrationDetailPage } from './PublisherRegistrationDetailPage';
import { registrationApi } from '@/api/registration.api';
import { reportApi } from '@/api/report.api';
import { fileApi } from '@/api/file.api';
import * as Auth from '@/features/auth/AuthContext';
const data = { id: 'r1', title: 'Naskah perbaikan', registration_no: 'REG-1', status: 'REVISION_REQUIRED', status_histories: [{ id: 'hidden', notes: 'RAHASIA INTERNAL' }], manuscript_files: [{ id: 'c1', type: 'COVER', version: 1 }, { id: 's1', type: 'SAMPLE_PAGE_1_5', version: 1 }], official_documents: [] };
const show = () => render(<MemoryRouter initialEntries={['/publisher/registrations/r1']}><Routes><Route path="/publisher/registrations/:id" element={<PublisherRegistrationDetailPage />} /></Routes></MemoryRouter>);
describe('Publisher detail and revision', () => {
  beforeEach(() => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { id: 'publisher', roles: ['ADMIN_PENERBIT'] } });
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({ data });
    vi.spyOn(registrationApi, 'getDocumentArchive').mockResolvedValue({ data: [] });
    vi.spyOn(reportApi, 'getRegistrationTimeline').mockResolvedValue({ data: { timeline: [{ id: 'h1', to_status: 'REVISION_REQUIRED', notes: 'Perbaiki halaman 3', changed_at: '2026-09-16T00:00:00Z' }] } });
    vi.spyOn(fileApi, 'upload').mockResolvedValue({ id: 'file-new' });
    vi.spyOn(registrationApi, 'addManuscript').mockResolvedValue({ data: {} });
    vi.spyOn(registrationApi, 'submitRegistration').mockResolvedValue({ data: {} });
    vi.spyOn(registrationApi, 'declarePhysicalMaster').mockResolvedValue({ data: {} });
  });
  it('uses the sanitized timeline and uploads a new version before an explicit resubmit', async () => {
    show();
    await screen.findByRole('heading', { name: 'Naskah perbaikan' });
    expect(screen.queryByText('RAHASIA INTERNAL')).not.toBeInTheDocument();
    expect(screen.getAllByText('Perbaiki halaman 3')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Jenis berkas'), { target: { value: 'DUMMY' } });
    fireEvent.change(screen.getByLabelText('Pilih berkas naskah'), { target: { files: [new File(['%PDF- sample'], 'perbaikan.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Unggah versi baru' }));
    await waitFor(() => expect(registrationApi.addManuscript).toHaveBeenCalledWith('r1', { type: 'DUMMY', file_id: 'file-new' }));
    expect(registrationApi.submitRegistration).not.toHaveBeenCalled();
    const submit = await screen.findByRole('button', { name: 'Ajukan ulang perbaikan' });
    fireEvent.click(submit);
    await waitFor(() => expect(registrationApi.submitRegistration).toHaveBeenCalledWith('r1'));
  });
  it('blocks unsupported files without sending an upload', async () => {
    show(); await screen.findByRole('heading', { name: 'Naskah perbaikan' });
    fireEvent.change(screen.getByLabelText('Pilih berkas naskah'), { target: { files: [new File(['bad'], 'script.exe', { type: 'application/octet-stream' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Unggah versi baru' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('maksimal 10 MB');
    expect(fileApi.upload).not.toHaveBeenCalled();
  });
  it('does not offer uploads or submission during verification', async () => {
    registrationApi.getDetail.mockResolvedValue({ data: { ...data, status: 'IN_VERIFICATION' } });
    show(); await screen.findByRole('heading', { name: 'Naskah perbaikan' });
    expect(screen.queryByLabelText('Pilih berkas naskah')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kirim pengajuan|Ajukan ulang/ })).not.toBeInTheDocument();
  });
  it('refuses to expose a detail page after an ownership error', async () => {
    registrationApi.getDetail.mockRejectedValue(new Error('Akses ditolak'));
    show(); expect(await screen.findByRole('alert')).toHaveTextContent('Akses ditolak');
    expect(screen.queryByRole('heading', { name: 'Naskah perbaikan' })).not.toBeInTheDocument();
  });
  it('preserves shipping information when updating the physical volume declaration', async () => {
    const intake = { status: 'PENDING', volume_count: 30, sent_at: '2026-09-16T00:00:00Z', delivery_method: 'Kurir', notes: 'Master sudah dikirim' };
    registrationApi.getDetail.mockResolvedValue({ data: { ...data, physical_master_intake: intake } });
    show(); await screen.findByRole('heading', { name: 'Naskah perbaikan' });
    fireEvent.change(screen.getByLabelText('Jumlah jilid master fisik'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pernyataan fisik' }));
    await waitFor(() => expect(registrationApi.declarePhysicalMaster).toHaveBeenCalledWith('r1', { format: 'A4', binding_method: 'PER_JUZ', volume_count: 32, sent_at: intake.sent_at, delivery_method: intake.delivery_method, notes: intake.notes }));
  });
});
