import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SurveyResultsInfoPage } from './SurveyResultsInfoPage';
import { publicApi } from '@/api/public.api';

vi.mock('@/api/public.api', () => ({ publicApi: { surveys: vi.fn(), surveyReport: vi.fn() } }));
vi.mock('@/components/public/PublicFooter', () => ({ PublicFooter: () => <footer aria-label="Public footer" /> }));
vi.mock('@/components/public/PublicAppPromotion', () => ({ PublicAppPromotion: () => <section aria-label="Promosi" /> }));

const surveys = [
  { id: 'ikm', name: 'Indeks Persepsi Kualitas Pelayanan', kind: 'IKM' },
  { id: 'ipak', name: 'Indeks Persepsi Anti Korupsi', kind: 'IPAK' },
];
const report = {
  survey: { id: 'ikm', name: 'Indeks Persepsi Kualitas Pelayanan', kind: 'IKM' },
  respondents: 421,
  unsur: [
    { id: 'a', code: 'A', name: 'Persyaratan Pelayanan', sum: 1560, respondents: 421, average: 3.7, converted: 92.5, mutu: { grade: 'A', label: 'Sangat Baik' } },
    { id: 'c', code: 'C', name: 'Waktu Penyelesaian', sum: 1418, respondents: 421, average: 3.36, converted: 84, mutu: { grade: 'B', label: 'Baik' } },
  ],
  average: 3.53,
  index: 88.25,
  mutu: { grade: 'B', label: 'Baik' },
  demographics: { gender: [{ label: 'Laki-laki', count: 377, percent: 89.55 }], education: [], occupation: [], age: [] },
};

describe('SurveyResultsInfoPage', () => {
  beforeEach(() => {
    publicApi.surveys.mockReset().mockResolvedValue({ success: true, data: surveys });
    publicApi.surveyReport.mockReset().mockResolvedValue({ success: true, data: report });
  });

  it('langsung menampilkan rekap survei pertama: kartu ringkasan, tabel unsur dan total', async () => {
    render(<MemoryRouter><SurveyResultsInfoPage /></MemoryRouter>);

    expect(await screen.findByText('Data Rekap Indeks Persepsi Kualitas Pelayanan')).toBeInTheDocument();
    expect(publicApi.surveyReport).toHaveBeenCalledWith('ikm', { from: '', to: '' });
    expect(screen.queryByText('Halaman sedang dalam proses pembuatan.')).not.toBeInTheDocument();
    expect(screen.getByText('Indeks Kepuasan Masyarakat')).toBeInTheDocument();

    const table = screen.getAllByRole('table')[0]; // tabel Nilai Unsur (tabel kedua = definisi kategori)
    expect(screen.getByRole('heading', { name: 'Definisi Kategori IKM' })).toBeInTheDocument();
    const row = within(table).getByText('Waktu Penyelesaian').closest('tr');
    // NRR tertimbang = 3,36 × 1/2 unsur
    expect(within(row).getByText('1,68')).toBeInTheDocument();
    expect(within(row).getByText('B')).toBeInTheDocument();
    const total = within(table).getByText('Total').closest('tr');
    expect(within(total).getByText('2978')).toBeInTheDocument();
    expect(within(total).getByText('88,25')).toBeInTheDocument();
    expect(screen.getByText(/377 · 89.55%/)).toBeInTheDocument();
  });

  it('memilih survei lain dan rentang tanggal lalu memuat ulang rekap', async () => {
    render(<MemoryRouter initialEntries={['/?survey=ikm']}><SurveyResultsInfoPage /></MemoryRouter>);
    await screen.findByText('Data Rekap Indeks Persepsi Kualitas Pelayanan');

    fireEvent.change(screen.getByLabelText('Pilih Survei'), { target: { value: 'ipak' } });
    // Satu kolom tanggal: klik tanggal 10 lalu 3 → rentang otomatis diurutkan.
    fireEvent.click(screen.getByLabelText('Tanggal'));
    const now = new Date();
    const day = (n) => new Date(now.getFullYear(), now.getMonth(), n);
    const label = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fireEvent.click(screen.getByRole('button', { name: label(day(10)) }));
    fireEvent.click(screen.getByRole('button', { name: label(day(3)) }));
    expect(screen.getByLabelText('Tanggal')).toHaveTextContent(`${label(day(3))} – ${label(day(10))}`);
    fireEvent.click(screen.getByRole('button', { name: 'Lihat Survei' }));

    await vi.waitFor(() => expect(publicApi.surveyReport).toHaveBeenLastCalledWith('ipak', { from: iso(day(3)), to: iso(day(10)) }));
  });

  it('menampilkan pesan bila belum ada responden', async () => {
    publicApi.surveyReport.mockResolvedValue({ success: true, data: { ...report, respondents: 0, unsur: [] } });
    render(<MemoryRouter><SurveyResultsInfoPage /></MemoryRouter>);
    expect(await screen.findByText('Belum ada responden pada periode ini.')).toBeInTheDocument();
  });
});

describe('SurveyResultsInfoPage IPAK', () => {
  it('memakai label IPAK dan nama unsur dari survei yang dipilih', async () => {
    publicApi.surveys.mockReset().mockResolvedValue({ success: true, data: surveys });
    publicApi.surveyReport.mockReset().mockResolvedValue({ success: true, data: {
      ...report,
      survey: { id: 'ipak', name: 'Indeks Persepsi Anti Korupsi', kind: 'IPAK' },
      unsur: [{ id: '1', code: '1', name: 'Manipulasi Peraturan', definition: 'Tidak ada pelaksanaan pelayanan yang menyimpang dari peraturan.', sum: 1625, respondents: 421, average: 3.85, converted: 96.49, mutu: { grade: 'A', label: 'Bersih dari korupsi' } }],
      average: 3.93, index: 98.48, mutu: { grade: 'A', label: 'Bersih dari korupsi' },
    } });
    render(<MemoryRouter initialEntries={['/?survey=ipak']}><SurveyResultsInfoPage /></MemoryRouter>);

    expect(await screen.findByText('Nilai IPAK')).toBeInTheDocument();
    expect(screen.getByText('IPAK Terkonversi')).toBeInTheDocument();
    expect(screen.getByText('Indeks Persepsi Anti Korupsi', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText('Manipulasi Peraturan').length).toBeGreaterThan(0);
    expect(screen.queryByText('Manipulasi Peraturan (1)')).not.toBeInTheDocument(); // tanpa kode unsur
    expect(screen.getByText('NRR (Nilai Rata-Rata)')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada pelaksanaan pelayanan yang menyimpang dari peraturan.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Definisi Kategori IPAK' })).toBeInTheDocument();
    const current = document.querySelector('tr[aria-current="true"]');
    expect(current).toHaveTextContent('88,31 – 100,00');
    expect(current).toHaveTextContent('Bersih dari korupsi');
    expect(screen.getByText('Tidak bersih dari korupsi')).toBeInTheDocument();
  });
});
