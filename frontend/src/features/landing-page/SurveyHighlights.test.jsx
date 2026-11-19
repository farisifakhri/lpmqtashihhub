import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SurveyHighlights from './SurveyHighlights';
import { publicApi } from '@/api/public.api';

vi.mock('@/api/public.api', () => ({ publicApi: { surveys: vi.fn(), surveyReport: vi.fn() } }));

const report = (id, name, kind, respondents = 10) => ({
  survey: { id, name, kind },
  respondents,
  unsur: [{ id: `${id}-a`, code: 'A', name: 'Persyaratan', sum: 37, respondents, average: 3.7, converted: 92.5, mutu: { grade: 'A', label: 'Sangat Baik' } }],
  average: 3.7,
  index: 92.5,
  mutu: { grade: 'A', label: 'Sangat Baik' },
  demographics: { gender: [{ label: 'Laki-laki', count: 9, percent: 90 }], education: [{ label: 'S1', count: 10, percent: 100 }], occupation: [], age: [] },
});

describe('SurveyHighlights', () => {
  beforeEach(() => {
    publicApi.surveys.mockReset().mockResolvedValue({ data: [
      { id: 'uji', name: 'Survei uji', kind: 'IKM' },
      { id: 'ipak', name: 'Indeks Persepsi Anti Korupsi', kind: 'IPAK' },
      { id: 'ikm2', name: 'IKM lain', kind: 'IKM' },
    ] });
    publicApi.surveyReport.mockReset().mockImplementation(async (id) => ({
      data: id === 'uji' ? report('uji', 'Indeks Persepsi Kualitas Pelayanan', 'IKM') : report('ipak', 'Indeks Persepsi Anti Korupsi', 'IPAK'),
    }));
  });

  it('menampilkan survei IKM dan IPAK pertama beserta diagram dan tautan rincian', async () => {
    render(<MemoryRouter><SurveyHighlights /></MemoryRouter>);
    const ikm = await screen.findByRole('article', { name: 'Indeks Persepsi Kualitas Pelayanan' });
    const ipak = screen.getByRole('article', { name: 'Indeks Persepsi Anti Korupsi' });
    expect(publicApi.surveyReport).toHaveBeenCalledTimes(2);
    expect(within(ikm).getByText('Indeks Kepuasan Masyarakat')).toBeInTheDocument();
    expect(within(ipak).getByText('Indeks Persepsi Anti Korupsi', { selector: 'p' })).toBeInTheDocument();
    expect(within(ikm).getByText('Nilai Konversi per Unsur')).toBeInTheDocument();
    expect(within(ikm).getByText('Persyaratan')).toBeInTheDocument();
    expect(within(ikm).getByRole('img', { name: /Jenis Kelamin: Laki-laki 90%/ })).toBeInTheDocument();
    expect(within(ikm).getByRole('link', { name: /Rincian/ })).toHaveAttribute('href', '/informasi/survei-ikm-ipak-pelayanan-surat-tanda-tashih?survey=uji');
  });

  it('tidak menampilkan bagian apa pun bila belum ada responden', async () => {
    publicApi.surveyReport.mockImplementation(async (id) => ({ data: report(id, 'x', 'IKM', 0) }));
    const { container } = render(<MemoryRouter><SurveyHighlights /></MemoryRouter>);
    await vi.waitFor(() => expect(publicApi.surveyReport).toHaveBeenCalledTimes(2));
    expect(container).toBeEmptyDOMElement();
  });
});
