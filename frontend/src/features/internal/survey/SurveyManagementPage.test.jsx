import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SurveyManagementPage } from './SurveyManagementPage';
import { surveyApi } from '@/api/survey.api';

const unsur = { id: 'u1', code: 'A', name: 'Persyaratan Pelayanan', kind: 'IKM', definition: 'Syarat yang harus dipenuhi dalam pengurusan suatu jenis pelayanan.', is_standard: true, is_archived: false, _count: { items: 0 } };
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

  it('menampilkan daftar survei dengan status (Expired), jumlah responden, dan action lengkap', async () => {
    renderPage();
    expect(await screen.findByText('Survei IKM 2027')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    for (const name of [/Nonaktifkan Survei/, 'Lihat Survei IKM 2027', 'Edit Survei IKM 2027', 'Hapus Survei IKM 2027']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // Sudah ada jawaban → tidak dapat dihapus.
    expect(screen.getByRole('button', { name: 'Hapus Survei IKM 2027' })).toBeDisabled();
  });

  it('menambah survei cukup dengan nama dan status; Aktif bisa langsung dipilih', async () => {
    const create = vi.spyOn(surveyApi, 'createSurvey').mockResolvedValue({ data: baseSurvey });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Tambah Survei/ }));
    expect(screen.getByRole('option', { name: 'Aktif' })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nama survei/), { target: { value: 'Indeks Persepsi Kualitas Pelayanan' } });
    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'AKTIF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Indeks Persepsi Kualitas Pelayanan', status: 'AKTIF' }));
  });

  it('tombol Aktifkan Survei tetap bisa dipakai walau survei belum punya pertanyaan', async () => {
    surveyApi.listSurveys.mockResolvedValue({ data: [{ ...baseSurvey, name: 'remaja dewasa', _count: { items: 0, responses: 0 } }] });
    const activate = vi.spyOn(surveyApi, 'activateSurvey').mockResolvedValue({ data: { ...baseSurvey, status: 'AKTIF' } });
    renderPage();
    const button = await screen.findByRole('button', { name: /Aktifkan Survei/ });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    await waitFor(() => expect(activate).toHaveBeenCalledWith('s1'));
  });

  it('Edit survei yang sudah punya pertanyaan boleh diubah ke Aktif; Lihat menampilkan detail', async () => {
    const update = vi.spyOn(surveyApi, 'updateSurvey').mockResolvedValue({ data: baseSurvey });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Survei IKM 2027' }));
    expect(screen.getByRole('option', { name: 'Aktif' })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'NONAKTIF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('s1', { name: 'Survei IKM 2027', status: 'NONAKTIF' }));

    fireEvent.click(screen.getByRole('button', { name: 'Lihat Survei IKM 2027' }));
    expect(await screen.findByRole('heading', { name: 'Detail Survei' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Susun Pertanyaan/ }));
    expect(await screen.findByRole('heading', { name: 'Pemilihan Survei' })).toBeInTheDocument();
  });

  it('menyusun pertanyaan per unsur dan menyimpan susunannya', async () => {
    const setItems = vi.spyOn(surveyApi, 'setSurveyItems').mockResolvedValue({ data: { ...baseSurvey, items: [{ unsur_id: 'u1', question_id: 'q1', unsur, question }] } });
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');

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

  it('Nama Unsur menampilkan unsur baku beserta definisinya dan tidak menyediakan Hapus untuk unsur baku', async () => {
    const update = vi.spyOn(surveyApi, 'updateUnsur').mockResolvedValue({ data: unsur });
    renderPage('/internal/surveys?tab=unsur');
    expect(await screen.findByText('Syarat yang harus dipenuhi dalam pengurusan suatu jenis pelayanan.')).toBeInTheDocument();
    expect(screen.getByText('Baku PANRB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus Persyaratan Pelayanan' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ubah Persyaratan Pelayanan' }));
    const definition = screen.getByLabelText('Definisi');
    expect(definition).toHaveValue(unsur.definition);
    fireEvent.change(definition, { target: { value: 'Syarat khusus pentashihan.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('u1', { code: 'A', name: 'Persyaratan Pelayanan', kind: 'IKM', definition: 'Syarat khusus pentashihan.' }));
  });

  it('Pemilihan Survei menampilkan definisi unsur yang dipilih', async () => {
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');
    await screen.findByRole('option', { name: 'A · Persyaratan Pelayanan' });
    expect(screen.queryByTestId('picked-unsur-definition')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pilih unsur'), { target: { value: 'u1' } });
    expect(screen.getByTestId('picked-unsur-definition')).toHaveTextContent('Syarat yang harus dipenuhi');
  });
});
