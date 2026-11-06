import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublisherSurveyPage } from './PublisherSurveyPage';
import { publisherSurveyApi } from '@/api/publisher-survey.api';

const unsur = { id: 'u1', code: 'A', name: 'Persyaratan', definition: 'Syarat yang harus dipenuhi.' };
const question = {
  id: 'q1', text: 'Bagaimana kesesuaian persyaratan pelayanan?', type: 'PILIHAN',
  options: [{ id: 'o4', label: 'Sangat baik', value: 4 }, { id: 'o1', label: 'Tidak baik', value: 1 }],
};
const ikm = {
  id: 's1', name: 'Indeks Persepsi Kualitas Pelayanan', description: 'Survei kepuasan layanan.',
  answered: false, answered_at: null, items: [{ unsur, question }], _count: { items: 1 },
};
const ipak = {
  id: 's2', name: 'Indeks Persepsi Anti Korupsi', description: null,
  answered: true, answered_at: '2026-11-06T09:00:00.000Z', items: [{ unsur, question }], _count: { items: 1 },
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/publisher/registrations/reg-1/survey']}>
    <Routes><Route path="/publisher/registrations/:id/survey" element={<PublisherSurveyPage />} /></Routes>
  </MemoryRouter>,
);

describe('PublisherSurveyPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [ikm, ipak] });
  });

  it('membagi survei per nama dan menandai mana yang sudah terisi', async () => {
    renderPage();
    const tabIkm = await screen.findByRole('tab', { name: /Indeks Persepsi Kualitas Pelayanan/ });
    expect(within(tabIkm).getByText('Belum')).toBeInTheDocument();
    const tabIpak = screen.getByRole('tab', { name: /Indeks Persepsi Anti Korupsi/ });
    expect(within(tabIpak).getByText('Terisi')).toBeInTheDocument();
    // Survei pertama yang belum terisi langsung dibuka.
    expect(tabIkm).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('1 survei belum diisi. STT dapat dicetak setelah seluruhnya terisi.')).toBeInTheDocument();
  });

  it('survei yang sudah terisi tidak menampilkan formulir lagi', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Indeks Persepsi Anti Korupsi/ }));
    expect(screen.getByText(/sudah Anda isi pada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kirim/ })).not.toBeInTheDocument();
  });

  it('mengirim jawaban pilihan, demografi, dan penilaian tambahan', async () => {
    const submit = vi.spyOn(publisherSurveyApi, 'submit').mockResolvedValue({ data: { id: 'r1' } });
    renderPage();
    await screen.findByText('Bagaimana kesesuaian persyaratan pelayanan?');

    fireEvent.click(screen.getByLabelText('Sangat baik'));
    fireEvent.click(screen.getByLabelText('Puas'));
    fireEvent.change(screen.getByLabelText('Usia'), { target: { value: '41' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim Indeks Persepsi Kualitas Pelayanan/ }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith('reg-1', 's1', expect.objectContaining({
      answers: [{ question_id: 'q1', option_id: 'o4' }],
      age: 41,
      overall_satisfaction: 4,
    })));
  });
});
