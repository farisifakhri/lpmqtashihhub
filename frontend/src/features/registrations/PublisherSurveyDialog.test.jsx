import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PublisherSurveyDialog } from './PublisherSurveyDialog';
import { publisherSurveyApi } from '@/api/publisher-survey.api';

// 6 unsur × 1 pertanyaan; opsi sengaja disimpan dari nilai tertinggi ke terendah.
const items = Array.from({ length: 6 }, (_, i) => ({
  unsur: { id: `u${i}`, name: `Unsur ${i + 1}`, definition: null },
  question: {
    id: `q${i}`, type: 'PILIHAN', text: `Pertanyaan ${i + 1}?`,
    options: [{ id: `q${i}-4`, label: 'Sangat baik', value: 4 }, { id: `q${i}-3`, label: 'Baik', value: 3 }, { id: `q${i}-1`, label: 'Tidak baik', value: 1 }],
  },
}));
const survei = { id: 's1', name: 'Survei Uji', answered: false, items };

const keHalamanPertanyaan = async () => {
  render(<PublisherSurveyDialog registrationId="reg-1" isOpen onClose={() => {}} />);
  await screen.findByText('Bagian 1 dari 4'); // responden + 2 halaman pertanyaan (4 + 2) + penilaian
  fireEvent.change(screen.getByLabelText('Nama responden'), { target: { value: 'Budi' } });
  fireEvent.change(screen.getByLabelText('Usia'), { target: { value: '40' } });
  fireEvent.click(screen.getByLabelText('Laki-laki'));
  fireEvent.change(screen.getByLabelText('Pendidikan terakhir'), { target: { value: 'S1' } });
  fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'SWASTA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
  await screen.findByText('Bagian 2 dari 4');
};

describe('PublisherSurveyDialog: halaman pertanyaan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [survei] });
  });

  it('menggabungkan beberapa unsur per halaman dan memberi nomor urut pertanyaan', async () => {
    await keHalamanPertanyaan();
    for (const n of [1, 2, 3, 4]) expect(screen.getByText(`Pertanyaan ${n}?`)).toBeInTheDocument();
    expect(screen.queryByText('Pertanyaan 5?')).not.toBeInTheDocument();
    expect(screen.getByText('Unsur 1')).toBeInTheDocument();
  });

  it('setelah refresh, data responden dari survei yang sudah diisi dipakai ulang: langsung ke pertanyaan', async () => {
    const respondent = { respondent_name: 'Budi', gender: 'L', age: 40, education: 'S1', occupation: 'SWASTA' };
    const kedua = { ...survei, id: 's2', name: 'Survei Kedua' };
    vi.spyOn(publisherSurveyApi, 'listForRegistration')
      .mockResolvedValue({ data: [{ ...survei, answered: true, answered_at: '2026-11-09T07:00:00.000Z', respondent }, kedua] });
    render(<PublisherSurveyDialog registrationId="reg-1" isOpen onClose={() => {}} />);

    expect(await screen.findByText('Bagian 1 dari 3')).toBeInTheDocument(); // 2 halaman pertanyaan + penilaian
    expect(screen.getByText('Pertanyaan 1?')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nama responden')).not.toBeInTheDocument();
  });

  it('pindah ke survei berikutnya: responden tidak ditanya ulang, jawaban lama tidak ikut, penilaian akhir hanya di survei terakhir', async () => {
    const kedua = { ...survei, id: 's2', name: 'Survei Kedua' };
    vi.spyOn(publisherSurveyApi, 'listForRegistration')
      .mockResolvedValueOnce({ data: [survei, kedua] })
      .mockResolvedValue({ data: [{ ...survei, answered: true, answered_at: '2026-11-09T07:00:00.000Z' }, kedua] });
    vi.spyOn(publisherSurveyApi, 'submit').mockResolvedValue({ data: { id: 'r1' } });

    // Survei pertama (bukan terakhir): responden + 2 halaman pertanyaan, tanpa penilaian akhir.
    render(<PublisherSurveyDialog registrationId="reg-1" isOpen onClose={() => {}} />);
    await screen.findByText('Bagian 1 dari 3');
    fireEvent.change(screen.getByLabelText('Nama responden'), { target: { value: 'Budi' } });
    fireEvent.change(screen.getByLabelText('Usia'), { target: { value: '40' } });
    fireEvent.click(screen.getByLabelText('Laki-laki'));
    fireEvent.change(screen.getByLabelText('Pendidikan terakhir'), { target: { value: 'S1' } });
    fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'SWASTA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    await screen.findByText('Bagian 2 dari 3');
    screen.getAllByLabelText('Sangat baik').forEach((el) => fireEvent.click(el));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    await screen.findByText('Bagian 3 dari 3');
    screen.getAllByLabelText('Sangat baik').forEach((el) => fireEvent.click(el));
    expect(screen.queryByText(/Kepuasan, loyalitas, dan anti-korupsi/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kirim Survei' })).not.toBeInTheDocument(); // masih ada survei berikutnya
    fireEvent.click(screen.getByRole('button', { name: 'Simpan & Lanjut ke Survei Berikutnya' }));

    // Survei kedua (terakhir): langsung ke pertanyaan, jawaban kosong, lalu penilaian akhir.
    expect(await screen.findByText('Bagian 1 dari 3')).toBeInTheDocument(); // 2 halaman pertanyaan + penilaian
    expect(screen.getByRole('tab', { name: /Survei Kedua/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Nama responden')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio').every((r) => !r.checked)).toBe(true);
    expect(publisherSurveyApi.submit).toHaveBeenCalledWith('reg-1', 's1', expect.objectContaining({
      respondent_name: 'Budi', age: 40, overall_satisfaction: null, nps_score: null, feedback: null,
    }));
  });

  it('pilihan jawaban urut dari nilai terendah, paling positif di kanan', async () => {
    await keHalamanPertanyaan();
    const blok = screen.getByText('Pertanyaan 1?').closest('div');
    const labels = within(blok).getAllByRole('radio').map((r) => r.closest('label').textContent);
    expect(labels).toEqual(['Tidak baik', 'Baik', 'Sangat baik']);
  });
});
