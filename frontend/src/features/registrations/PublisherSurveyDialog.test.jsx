import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PublisherDocumentList } from './PublisherDocumentList';
import { publisherSurveyApi } from '@/api/publisher-survey.api';
import { fileApi } from '@/api/file.api';

const unsur = { id: 'u1', code: 'A', name: 'Persyaratan', definition: 'Syarat yang harus dipenuhi.' };
const question = {
  id: 'q1', text: 'Bagaimana kesesuaian persyaratan pelayanan?', type: 'PILIHAN',
  options: [{ id: 'o4', label: 'Sangat baik', value: 4 }, { id: 'o1', label: 'Tidak baik', value: 1 }],
};
const ikm = {
  id: 's1', name: 'Indeks Persepsi Kualitas Pelayanan', description: 'Survei kepuasan layanan.',
  answered: false, answered_at: null, items: [{ unsur, question }],
};
const stt = {
  id: 'doc-1', document_type: 'SURAT_TANDA_TASHIH', status: 'ISSUED', document_no: 'STT/LPMQ/2026/001',
  issued_at: '2026-11-06T00:00:00.000Z', valid_until: '2031-11-06T00:00:00.000Z', file_id: 'f1',
};
const registration = { id: 'reg-1' };

const renderList = () => render(<PublisherDocumentList documents={[stt]} registration={registration} />);

describe('Pop-up survei sebelum unduh STT', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(fileApi, 'downloadDocument').mockResolvedValue();
  });

  it('menampilkan pop-up survei saat Unduh STT ditekan dan survei belum diisi', async () => {
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [ikm] });
    renderList();
    await screen.findByText(/Isi survei kepuasan dulu/);

    fireEvent.click(screen.getByRole('button', { name: /Unduh STT/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Isi Survei Kepuasan Layanan')).toBeInTheDocument();
    expect(within(dialog).getByText('Bagaimana kesesuaian persyaratan pelayanan?')).toBeInTheDocument();
    expect(fileApi.downloadDocument).not.toHaveBeenCalled();
  });

  it('setelah survei terakhir dikirim, STT langsung diunduh', async () => {
    vi.spyOn(publisherSurveyApi, 'listForRegistration')
      .mockResolvedValueOnce({ data: [ikm] })
      .mockResolvedValueOnce({ data: [ikm] })
      .mockResolvedValue({ data: [{ ...ikm, answered: true, answered_at: '2026-11-06T10:00:00.000Z' }] });
    const submit = vi.spyOn(publisherSurveyApi, 'submit').mockResolvedValue({ data: { id: 'r1' } });
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: /Unduh STT/ }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByLabelText('Sangat baik'));
    fireEvent.click(screen.getByRole('button', { name: /Kirim Indeks Persepsi Kualitas Pelayanan/ }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith('reg-1', 's1', expect.objectContaining({
      answers: [{ question_id: 'q1', option_id: 'o4' }],
    })));
    await waitFor(() => expect(fileApi.downloadDocument).toHaveBeenCalledWith('doc-1', 'STT/LPMQ/2026/001.pdf'));
  });

  it('langsung mengunduh tanpa pop-up bila survei sudah terisi', async () => {
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [{ ...ikm, answered: true }] });
    renderList();
    await waitFor(() => expect(publisherSurveyApi.listForRegistration).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Unduh STT/ }));
    await waitFor(() => expect(fileApi.downloadDocument).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
