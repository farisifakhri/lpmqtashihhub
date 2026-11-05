import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SurveyManagementPage } from './SurveyManagementPage';
import { surveyApi } from '@/api/survey.api';

const unsur = { id: 'u1', code: 'A', name: 'Persyaratan Pelayanan', kind: 'IKM', is_archived: false, _count: { items: 0 } };
const question = { id: 'q1', text: 'Bagaimana kesesuaian persyaratan?', type: 'PILIHAN', options: [{ id: 'o1', label: 'Sangat sesuai', value: 4 }, { id: 'o2', label: 'Tidak sesuai', value: 1 }], _count: { items: 0, answers: 0 } };
const baseSurvey = { id: 's1', name: 'Survei IKM 2027', kind: 'IKM', description: null, starts_at: '2027-01-01T00:00:00.000Z', ends_at: '2027-12-31T00:00:00.000Z', status: 'DRAFT', display_status: 'DRAFT', updated_at: 'v1', _count: { items: 0, responses: 0 } };

const renderPage = (path = '/internal/surveys') => render(<MemoryRouter initialEntries={[path]}><SurveyManagementPage /></MemoryRouter>);

describe('SurveyManagementPage (Super Admin)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(surveyApi, 'listSurveys').mockResolvedValue({ data: [{ ...baseSurvey, display_status: 'BERAKHIR', status: 'AKTIF', _count: { items: 5, responses: 12 } }] });
    vi.spyOn(surveyApi, 'getSurvey').mockResolvedValue({ data: { ...baseSurvey, items: [] } });
    vi.spyOn(surveyApi, 'listUnsur').mockResolvedValue({ data: [unsur] });
    vi.spyOn(surveyApi, 'listQuestions').mockResolvedValue({ data: [question] });
  });

  it('menampilkan daftar survei dengan status turunan (Berakhir) dan jumlah responden', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Survei IKM 2027' })).toBeInTheDocument();
    expect(screen.getByText('Berakhir')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('membuat survei baru lalu langsung membuka halaman susun pertanyaan', async () => {
    const create = vi.spyOn(surveyApi, 'createSurvey').mockResolvedValue({ data: baseSurvey });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Buat Survei/ }));
    fireEvent.change(screen.getByLabelText(/Nama survei/), { target: { value: 'Survei IKM 2027' } });
    fireEvent.change(screen.getByLabelText(/Tanggal mulai/), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText(/Tanggal selesai/), { target: { value: '2027-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat & Susun Pertanyaan' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Survei IKM 2027', kind: 'IKM', starts_at: '2027-01-01', ends_at: '2027-12-31' })));
    expect(await screen.findByRole('heading', { name: 'Pemilihan Survei' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nama Survei')).toHaveValue('s1');
  });

  it('menyusun pertanyaan per unsur dan menyimpan susunannya', async () => {
    const setItems = vi.spyOn(surveyApi, 'setSurveyItems').mockResolvedValue({ data: { ...baseSurvey, items: [{ unsur_id: 'u1', question_id: 'q1', unsur, question }] } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Survei IKM 2027' }));

    await screen.findByRole('option', { name: 'A · Persyaratan Pelayanan' });
    fireEvent.change(screen.getByLabelText('Pilih unsur'), { target: { value: 'u1' } });
    fireEvent.change(screen.getByLabelText('Pilih pertanyaan'), { target: { value: 'q1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tambah$/ }));
    expect(screen.getByText('Bagaimana kesesuaian persyaratan?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Simpan Susunan/ }));
    await waitFor(() => expect(setItems).toHaveBeenCalledWith('s1', [{ unsur_id: 'u1', question_id: 'q1' }]));
  });

  it('sub-menu Laporan Survei meminta pilih survei lalu menampilkan indeks dan mutu', async () => {
    const getReport = vi.spyOn(surveyApi, 'getReport').mockResolvedValue({ data: {
      respondents: 2, index: 87.5, mutu: { grade: 'B', label: 'Baik' }, essays: [],
      unsur: [{ id: 'u1', code: 'A', name: 'Persyaratan Pelayanan', answers: 2, average: 3.5, converted: 87.5 }],
      demographics: { gender: [], age: [], education: [], occupation: [] },
    } });
    renderPage('/internal/surveys?tab=laporan');
    expect(screen.getByRole('heading', { name: 'Laporan Survei' })).toBeInTheDocument();
    expect(screen.getByText('Pilih survei')).toBeInTheDocument();

    await screen.findByRole('option', { name: 'Survei IKM 2027' });
    fireEvent.change(screen.getByLabelText('Nama Survei'), { target: { value: 's1' } });
    expect(await screen.findByText('B · Baik')).toBeInTheDocument();
    expect(getReport).toHaveBeenCalledWith('s1');
  });
});
