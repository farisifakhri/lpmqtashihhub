import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DocumentArchive } from './DocumentArchive';
import { registrationApi } from '@/api/registration.api';
import { publisherSurveyApi } from '@/api/publisher-survey.api';
import { fileApi } from '@/api/file.api';
import * as AuthContext from '@/features/auth/AuthContext';

const unsur = { id: 'u1', code: 'A', name: 'Persyaratan', definition: 'Syarat yang harus dipenuhi.' };
const question = {
  id: 'q1', text: 'Bagaimana kesesuaian persyaratan pelayanan?', type: 'PILIHAN',
  options: [{ id: 'o4', label: 'Sangat baik', value: 4 }, { id: 'o1', label: 'Tidak baik', value: 1 }],
};
const survei = {
  id: 's1', name: 'Indeks Persepsi Kualitas Pelayanan', description: null,
  answered: false, answered_at: null, items: [{ unsur, question }],
};
const stt = {
  id: 'doc-1', source: 'OFFICIAL', document_type: 'SURAT_TANDA_TASHIH', document_no: 'STT/LPMQ/2026/001',
  status: 'ISSUED', version: 1, created_at: '2026-11-06T00:00:00.000Z', content_snapshot: {},
};

const asPublisher = () => vi.spyOn(AuthContext, 'useOptionalAuth').mockReturnValue({ currentUser: { roles: ['PENERBIT'] } });

describe('DocumentArchive: pop-up survei sebelum STT dibuka penerbit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(registrationApi, 'getDocumentArchive').mockResolvedValue({ data: [stt] });
    vi.spyOn(fileApi, 'downloadDocument').mockResolvedValue();
  });

  it('menyembunyikan STT (pratinjau maupun unduh) dan menampilkan pop-up survei', async () => {
    asPublisher();
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [survei] });
    render(<DocumentArchive registrationId="reg-1" />);

    const tombol = await screen.findByRole('button', { name: /Isi Survei untuk Membuka Surat Tanda Tashih/ });
    // Sebelum survei terisi, STT tidak bisa ditinjau dan nomornya pun tidak tampil.
    expect(screen.queryByRole('button', { name: /Lihat Dokumen PDF/ })).not.toBeInTheDocument();
    expect(screen.queryByText('STT/LPMQ/2026/001', { exact: false })).not.toBeInTheDocument();
    fireEvent.click(tombol);

    const dialog = await screen.findByRole('dialog');
    // Kuesioner dibagi per bagian; bagian pertama adalah data responden.
    expect(within(dialog).getByText('Bagian 1 dari 3')).toBeInTheDocument();
    expect(within(dialog).getByText('DATA RESPONDEN', { exact: false })).toBeInTheDocument();
    expect(fileApi.downloadDocument).not.toHaveBeenCalled();
  });

  it('membuka STT setelah survei terakhir dikirim', async () => {
    asPublisher();
    vi.spyOn(publisherSurveyApi, 'listForRegistration')
      .mockResolvedValueOnce({ data: [survei] }) // pemuatan arsip
      .mockResolvedValueOnce({ data: [survei] }) // pemuatan pop-up
      .mockResolvedValue({ data: [{ ...survei, answered: true, answered_at: '2026-11-06T10:00:00.000Z' }] });
    vi.spyOn(publisherSurveyApi, 'submit').mockResolvedValue({ data: { id: 'r1' } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stt');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, headers: { get: () => 'application/pdf' }, blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    });
    render(<DocumentArchive registrationId="reg-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Isi Survei untuk Membuka Surat Tanda Tashih/ }));
    await screen.findByRole('dialog');

    // Data responden kosong: Lanjut terkunci dan isian yang kurang disebutkan.
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled();
    expect(screen.getByText(/Belum diisi: Nama responden, Usia, Jenis kelamin/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nama responden'), { target: { value: 'Budi' } });
    fireEvent.change(screen.getByLabelText('Usia'), { target: { value: '40' } });
    fireEvent.click(screen.getByLabelText('Laki-laki'));
    fireEvent.change(screen.getByLabelText('Pendidikan terakhir'), { target: { value: 'S1' } });
    fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'SWASTA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    expect(await screen.findByRole('button', { name: 'Lanjut' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Sangat baik'));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    // Bagian terakhir: semua penilaian dan kritik/saran wajib.
    expect(await screen.findByRole('button', { name: 'Kirim Survei' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Sangat Puas'));
    fireEvent.click(screen.getByLabelText('10'));
    screen.getAllByLabelText('Sangat Setuju').forEach((el) => fireEvent.click(el));
    expect(screen.getByText('Belum diisi: Kritik dan saran.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kritik dan saran'), { target: { value: 'Mantap.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Survei' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/official-documents/doc-1/pdf'), expect.anything()));
    expect(await screen.findByRole('button', { name: /Lihat Dokumen PDF/ })).toBeInTheDocument();
  });

  it('survei diisi berurutan: survei kedua terkunci sampai survei pertama terisi', async () => {
    asPublisher();
    const pertama = { ...survei, id: 's0', name: 'kepuasan langganan' };
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [pertama, survei] });
    render(<DocumentArchive registrationId="reg-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Isi Survei untuk Membuka Surat Tanda Tashih/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('tab', { name: /kepuasan langganan/ })).toBeEnabled();
    expect(within(dialog).getByRole('tab', { name: /Indeks Persepsi Kualitas Pelayanan/ })).toBeDisabled();
  });

  it('petugas internal tidak diminta mengisi survei', async () => {
    vi.spyOn(AuthContext, 'useOptionalAuth').mockReturnValue({ currentUser: { roles: ['DOKUMENTATOR'] } });
    const daftar = vi.spyOn(publisherSurveyApi, 'listForRegistration');
    render(<DocumentArchive registrationId="reg-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Unduh Dokumen/ }));
    await waitFor(() => expect(fileApi.downloadDocument).toHaveBeenCalled());
    expect(daftar).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
