import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { UnsurTab } from './UnsurTab';
import { surveyApi } from '@/api/survey.api';

const unsur = (id, name, kind) => ({ id, code: id, name, kind, definition: null, is_standard: true, is_archived: false, survey_id: null, _count: { items: 1 } });
const list = [unsur('A', 'Persyaratan Pelayanan Pentashihan', 'IKM'), unsur('B', 'Sistem, Mekanisme, dan Prosedur Pelayanan', 'IKM'), unsur('1', 'Manipulasi Peraturan', 'IPAK')];
const ipak = {
  id: 's-ipak', name: 'Indeks Persepsi Anti Korupsi', kind: 'IPAK', status: 'AKTIF', display_status: 'AKTIF', _count: { items: 2, responses: 421 },
  items: [{ unsur_id: '1', question_id: 'q1' }, { unsur_id: '1', question_id: 'q2' }],
};

describe('UnsurTab — card Pilih Survei', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(surveyApi, 'listUnsur').mockResolvedValue({ data: list });
    vi.spyOn(surveyApi, 'listSurveys').mockResolvedValue({ data: [{ id: 's-ipak', name: 'Indeks Persepsi Anti Korupsi', kind: 'IPAK' }] });
    vi.spyOn(surveyApi, 'getSurvey').mockResolvedValue({ data: ipak });
  });

  it('memilih survei menampilkan ringkasannya dan hanya unsur yang dipakai survei itu', async () => {
    render(<UnsurTab />);
    expect(await screen.findByText('Persyaratan Pelayanan Pentashihan')).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Indeks Persepsi Anti Korupsi (IPAK)' });

    fireEvent.change(screen.getByLabelText('Pilih Survei'), { target: { value: 's-ipak' } });

    const summary = await screen.findByLabelText('Ringkasan survei terpilih');
    expect(summary).toHaveTextContent('1 unsur · 2 pertanyaan · 421 responden');
    expect(within(summary).getByText('Aktif')).toBeInTheDocument();
    expect(screen.queryByText('Persyaratan Pelayanan Pentashihan')).not.toBeInTheDocument();
    const row = screen.getByText('Manipulasi Peraturan').closest('tr');
    expect(within(row).getByText('2 pertanyaan')).toBeInTheDocument();
    // urutan global tidak bisa diubah saat disaring
    expect(within(row).getByRole('button', { name: 'Turunkan Manipulasi Peraturan' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Pilih Survei'), { target: { value: '' } });
    expect(await screen.findByText('Persyaratan Pelayanan Pentashihan')).toBeInTheDocument();
  });
});
