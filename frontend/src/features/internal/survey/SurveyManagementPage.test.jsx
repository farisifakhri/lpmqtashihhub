import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SurveyManagementPage } from './SurveyManagementPage';
import { surveyApi } from '@/api/survey.api';
import * as toastModule from '@/components/ui/toast';

const unsur = { id: 'u1', code: 'A', name: 'Persyaratan Pelayanan', kind: 'IKM', definition: 'Syarat yang harus dipenuhi dalam pengurusan suatu jenis pelayanan.', is_standard: true, sort_order: 1, is_archived: false, _count: { items: 0 } };
const question = { id: 'q1', text: 'Bagaimana kesesuaian persyaratan?', type: 'PILIHAN', unsur_id: 'u1', unsur: { id: 'u1', code: 'A', name: 'Persyaratan Pelayanan', sort_order: 1 }, options: [{ id: 'o1', label: 'Sangat sesuai', value: 4 }, { id: 'o2', label: 'Tidak sesuai', value: 1 }], _count: { items: 0, answers: 0 } };
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
    for (const section of ['1. Kalimat Pembuka', '2. Data Demografis', '4. Kepuasan Secara Keseluruhan (skala 1–5)', '5. Loyalitas (skala 1–10)', '8. Kalimat Penutup']) {
      expect(await screen.findByText(section)).toBeInTheDocument();
    }
    expect(screen.getByText('Penyandang disabilitas (ya/tidak) dan jenis disabilitas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Susun Pertanyaan/ }));
    expect(await screen.findByRole('heading', { name: 'Pemilihan Survei' })).toBeInTheDocument();
  });

  it('menyusun pertanyaan per unsur dan menyimpan susunannya', async () => {
    const setItems = vi.spyOn(surveyApi, 'setSurveyItems').mockResolvedValue({ data: { ...baseSurvey, items: [{ unsur_id: 'u1', question_id: 'q1', unsur, question }] } });
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');

    await screen.findByRole('option', { name: 'A · Persyaratan Pelayanan' });
    fireEvent.change(screen.getByLabelText('Tambah unsur ke survei'), { target: { value: 'u1' } });
    fireEvent.change(screen.getByLabelText('Tambah pertanyaan Persyaratan Pelayanan'), { target: { value: 'q1' } });
    expect(screen.getByTestId('unsur-group-u1')).toHaveTextContent('Bagaimana kesesuaian persyaratan?');

    fireEvent.click(screen.getByRole('button', { name: /Simpan Susunan/ }));
    await waitFor(() => expect(setItems).toHaveBeenCalledWith('s1', [{ unsur_id: 'u1', question_id: 'q1' }]));
  });

  it('sub-menu Laporan Survei meminta pilih survei lalu menampilkan indeks dan mutu', async () => {
    const getReport = vi.spyOn(surveyApi, 'getReport').mockResolvedValue({ data: {
      respondents: 2, index: 87.5, mutu: { grade: 'B', label: 'Baik' },
      essays: [{ question: 'Kritik dan saran', text: 'Layanan cepat.', respondent: 'PT Uji', submitted_at: '2027-02-01T00:00:00.000Z' }],
      unsur: [{ id: 'u1', code: 'A', name: 'Persyaratan Pelayanan', answers: 2, average: 3.5, converted: 87.5, mutu: { grade: 'B', label: 'Baik' } }],
      demographics: { gender: [], age: [], education: [], occupation: [], disability: [], disability_type: [], service_type: [], service_category: [] },
      satisfaction: { average: 4.5, distribution: [] },
      nps: { score: 0, respondents: 2, promoters: 1, passives: 0, detractors: 1 },
      anti_corruption: [{ key: 'ak_transparency', average: 4.5, answers: 2 }, { key: 'ak_no_extortion', average: 5, answers: 1 }, { key: 'ak_no_broker', average: null, answers: 0 }, { key: 'ak_no_gratification', average: null, answers: 0 }],
    } });
    renderPage('/internal/surveys?tab=laporan');
    expect(screen.getByRole('heading', { name: 'Laporan Survei' })).toBeInTheDocument();
    expect(screen.getByText('Pilih survei')).toBeInTheDocument();

    await screen.findByRole('option', { name: 'Survei IKM 2027' });
    fireEvent.change(screen.getByLabelText('Nama Survei'), { target: { value: 's1' } });
    expect((await screen.findAllByText('B · Baik')).length).toBe(2); // mutu keseluruhan + mutu per unsur
    expect(getReport).toHaveBeenCalledWith('s1');
    expect(screen.getByText('Kategori IKM (Pedoman PANRB 9/2024 hlm. 22)')).toBeInTheDocument();
    expect(screen.getByText('Kepuasan secara keseluruhan (1–5)')).toBeInTheDocument();
    expect(screen.getByText('1 promotor (9–10) · 0 pasif (7–8) · 1 detraktor (1–6)')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada pungutan liar (pungli) oleh petugas pada unit ini.')).toBeInTheDocument();
    expect(screen.getByText('Layanan cepat.')).toBeInTheDocument();
  });

  it('Nama Unsur menampilkan unsur baku beserta definisinya; unsur baku yang tidak dipakai dapat dihapus', async () => {
    const update = vi.spyOn(surveyApi, 'updateUnsur').mockResolvedValue({ data: unsur });
    renderPage('/internal/surveys?tab=unsur');
    expect(await screen.findByText('Syarat yang harus dipenuhi dalam pengurusan suatu jenis pelayanan.')).toBeInTheDocument();
    expect(screen.getByText('Baku PANRB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus Persyaratan Pelayanan' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Ubah Persyaratan Pelayanan' }));
    const definition = screen.getByLabelText('Definisi');
    expect(definition).toHaveValue(unsur.definition);
    fireEvent.change(definition, { target: { value: 'Syarat khusus pentashihan.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('u1', { name: 'Persyaratan Pelayanan', definition: 'Syarat khusus pentashihan.', survey_id: null }));
  });

  it('Tambah Unsur cukup nama dan definisi (tanpa kode dan jenis)', async () => {
    const create = vi.spyOn(surveyApi, 'createUnsur').mockResolvedValue({ data: unsur });
    renderPage('/internal/surveys?tab=unsur');
    fireEvent.click(await screen.findByRole('button', { name: /Tambah Unsur/ }));
    expect(screen.queryByLabelText(/Kode/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Jenis/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nama unsur/), { target: { value: 'Pungutan liar' } });
    fireEvent.change(screen.getByLabelText('Definisi'), { target: { value: 'Pungutan di luar ketentuan.' } });
    await screen.findByRole('option', { name: 'Survei IKM 2027' });
    fireEvent.change(screen.getByLabelText(/Nama survei/), { target: { value: 's1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Pungutan liar', definition: 'Pungutan di luar ketentuan.', survey_id: 's1' }));
  });

  it('unsur khusus survei hanya muncul bila survei itu dipilih di form pertanyaan dan Pemilihan Survei', async () => {
    const khusus = { ...unsur, id: 'u9', code: null, name: 'Unsur khusus lain', survey_id: 's2', survey: { id: 's2', name: 'Survei lain' } };
    surveyApi.listUnsur.mockResolvedValue({ data: [unsur, khusus] });
    renderPage('/internal/surveys?tab=pertanyaan');
    fireEvent.click(await screen.findByRole('button', { name: /Tambah Pertanyaan/ }));
    const unsurSelect = screen.getByLabelText(/^Unsur/);
    await waitFor(() => expect(within(unsurSelect).getByRole('option', { name: 'Unsur khusus lain' })).toBeInTheDocument()); // tanpa survei: semua unsur
    fireEvent.change(screen.getByLabelText(/^Unsur/), { target: { value: 'u9' } });
    await screen.findByRole('option', { name: 'Survei IKM 2027' });
    fireEvent.change(screen.getByLabelText(/Nama survei/), { target: { value: 's1' } });
    expect(within(unsurSelect).queryByRole('option', { name: 'Unsur khusus lain' })).not.toBeInTheDocument();
    expect(unsurSelect).toHaveValue(''); // pilihan unsur lama dikosongkan
  });

  it('Pemilihan Survei menyembunyikan unsur khusus survei lain', async () => {
    surveyApi.listUnsur.mockResolvedValue({ data: [unsur, { ...unsur, id: 'u9', code: null, name: 'Unsur khusus lain', survey_id: 's2' }] });
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');
    await screen.findByRole('option', { name: 'A · Persyaratan Pelayanan' });
    expect(screen.queryByRole('option', { name: 'Unsur khusus lain' })).not.toBeInTheDocument();
  });

  it('Pemilihan Survei menampilkan definisi unsur dan bisa mengeluarkan unsur', async () => {
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');
    await screen.findByRole('option', { name: 'A · Persyaratan Pelayanan' });
    fireEvent.change(screen.getByLabelText('Tambah unsur ke survei'), { target: { value: 'u1' } });
    expect(screen.getByTestId('unsur-group-u1')).toHaveTextContent('Syarat yang harus dipenuhi');
    fireEvent.click(screen.getByRole('button', { name: 'Keluarkan unsur Persyaratan Pelayanan' }));
    expect(screen.queryByTestId('unsur-group-u1')).not.toBeInTheDocument();
  });

  it('tombol Hapus menghapus unsur yang tidak dipakai dan nonaktif untuk unsur yang masih dipakai', async () => {
    surveyApi.listUnsur.mockResolvedValue({ data: [unsur, { ...unsur, id: 'u2', name: 'Unsur terpakai', is_standard: false, _count: { items: 2 } }] });
    const remove = vi.spyOn(surveyApi, 'deleteUnsur').mockResolvedValue({ data: unsur });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage('/internal/surveys?tab=unsur');

    expect(await screen.findByRole('button', { name: 'Hapus Unsur terpakai' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Persyaratan Pelayanan' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('u1'));
  });

  it('Nama Unsur menampilkan nomor urut Pedoman dan tombol Pulihkan Unsur Baku memanggil API', async () => {
    const restore = vi.spyOn(surveyApi, 'restoreStandardUnsur').mockResolvedValue({ data: [unsur] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage('/internal/surveys?tab=unsur');
    expect(await screen.findByText('1.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pulihkan Unsur Baku PANRB/ }));
    await waitFor(() => expect(restore).toHaveBeenCalled());
  });

  it('Responden Survei menampilkan seluruh data demografis Pedoman', async () => {
    vi.spyOn(surveyApi, 'getReport').mockResolvedValue({ data: {
      respondents: 1, index: null, mutu: null, essays: [], unsur: [],
      demographics: {
        gender: [{ label: 'Laki-laki', count: 1, percent: 100 }], age: [], education: [], occupation: [],
        disability: [{ label: 'Ya', count: 1, percent: 100 }], disability_type: [{ label: 'FISIK', count: 1, percent: 100 }],
        service_type: [{ label: 'Tanda tashih mushaf cetak', count: 1, percent: 100 }], service_category: [{ label: 'HYBRID', count: 1, percent: 100 }],
      },
      satisfaction: { average: null, distribution: [] }, nps: { score: null, respondents: 0, promoters: 0, passives: 0, detractors: 0 }, anti_corruption: [],
    } });
    renderPage('/internal/surveys?tab=responden&survey=s1');
    expect(await screen.findByText('Penyandang disabilitas')).toBeInTheDocument();
    expect(screen.getByText('Fisik (Tuna Daksa)')).toBeInTheDocument();
    expect(screen.getByText('Campuran (Hybrid)')).toBeInTheDocument();
    expect(screen.getByText('Tanda tashih mushaf cetak')).toBeInTheDocument();
  });

  it('Pertanyaan Survei: unsur wajib di form, dikirim ke API, dan bank soal dikelompokkan per unsur', async () => {
    const create = vi.spyOn(surveyApi, 'createQuestion').mockResolvedValue({ data: question });
    renderPage('/internal/surveys?tab=pertanyaan');
    expect(await screen.findByRole('heading', { name: /A · Persyaratan Pelayanan/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter unsur'), { target: { value: 'u1' } });
    await waitFor(() => expect(surveyApi.listQuestions).toHaveBeenLastCalledWith({ search: undefined, unsur_id: 'u1' }));
    fireEvent.click(screen.getByRole('button', { name: /Tambah Pertanyaan/ }));
    expect(screen.getByLabelText(/^Unsur/)).toHaveValue('u1'); // terisi dari filter
    fireEvent.change(screen.getByLabelText(/Teks pertanyaan/), { target: { value: 'Bagaimana kejelasan persyaratan?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ unsur_id: 'u1', text: 'Bagaimana kejelasan persyaratan?' })));
  });

  it('Pemilihan Survei hanya menampilkan pertanyaan milik unsur yang dipilih', async () => {
    const other = { ...question, id: 'q2', text: 'Pertanyaan unsur biaya', unsur_id: 'u2', unsur: { id: 'u2', name: 'Biaya/Tarif' } };
    surveyApi.listUnsur.mockResolvedValue({ data: [unsur, { ...unsur, id: 'u2', code: 'D', name: 'Biaya/Tarif' }] });
    surveyApi.listQuestions.mockResolvedValue({ data: [question, other] });
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');
    await screen.findByRole('option', { name: 'D · Biaya/Tarif' });

    fireEvent.change(screen.getByLabelText('Tambah unsur ke survei'), { target: { value: 'u2' } });
    expect(screen.getByRole('option', { name: 'Pertanyaan unsur biaya' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bagaimana kesesuaian persyaratan?' })).not.toBeInTheDocument();
  });

  it('Tambah semua memasukkan seluruh pertanyaan unsur sekaligus lalu disimpan berurutan per unsur', async () => {
    const q3 = { ...question, id: 'q3', text: 'Pertanyaan persyaratan kedua' };
    surveyApi.listQuestions.mockResolvedValue({ data: [question, q3] });
    const setItems = vi.spyOn(surveyApi, 'setSurveyItems').mockResolvedValue({ data: { ...baseSurvey, items: [] } });
    renderPage('/internal/surveys?tab=pemilihan&survey=s1');
    await screen.findByRole('option', { name: 'A · Persyaratan Pelayanan' });
    fireEvent.change(screen.getByLabelText('Tambah unsur ke survei'), { target: { value: 'u1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah semua pertanyaan Persyaratan Pelayanan' }));
    expect(screen.getByLabelText('Tambah pertanyaan Persyaratan Pelayanan')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Simpan Susunan/ }));
    await waitFor(() => expect(setItems).toHaveBeenCalledWith('s1', [{ unsur_id: 'u1', question_id: 'q1' }, { unsur_id: 'u1', question_id: 'q3' }]));
  });
  it('tombol Isi Pertanyaan Baku PANRB mengisi bank soal dan melaporkan hasilnya', async () => {
    const toast = vi.spyOn(toastModule, 'showToast');
    const seed = vi.spyOn(surveyApi, 'seedStandardQuestions')
      .mockResolvedValueOnce({ data: { created: 12, existing: 0, missing_unsur: [] } })
      .mockResolvedValueOnce({ data: { created: 0, existing: 10, missing_unsur: ['Sarana dan Prasarana'] } });
    renderPage('/internal/surveys?tab=pertanyaan');
    const button = await screen.findByRole('button', { name: /Isi Pertanyaan Baku PANRB/ });

    fireEvent.click(button);
    await waitFor(() => expect(toast).toHaveBeenCalledWith('12 pertanyaan baku ditambahkan.', 'success'));
    await waitFor(() => expect(surveyApi.listQuestions).toHaveBeenCalledTimes(2)); // daftar dimuat ulang

    fireEvent.click(button);
    await waitFor(() => expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('unsur Sarana dan Prasarana tidak ditemukan'), 'danger'));
    expect(seed).toHaveBeenCalledTimes(2);
  });
  it('Pertanyaan Survei: Nama survei memasukkan pertanyaan ke survei; hapus tanpa konfirmasi dengan notifikasi 2 detik', async () => {
    const create = vi.spyOn(surveyApi, 'createQuestion').mockResolvedValue({ data: question });
    const remove = vi.spyOn(surveyApi, 'deleteQuestion').mockResolvedValue({ data: question });
    const confirm = vi.spyOn(window, 'confirm');
    const toast = vi.spyOn(toastModule, 'showToast');
    surveyApi.listQuestions.mockResolvedValue({ data: [{ ...question, items: [{ survey: { id: 's1', name: 'Survei IKM 2027' } }], _count: { items: 1, answers: 0 } }, { ...question, id: 'q9', text: 'Pertanyaan bebas', items: [], _count: { items: 0, answers: 0 } }] });
    renderPage('/internal/surveys?tab=pertanyaan');
    expect(await screen.findByText('Dipakai di: Survei IKM 2027', { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tambah Pertanyaan/ }));
    await screen.findByRole('option', { name: 'Survei IKM 2027' });
    fireEvent.change(screen.getByLabelText(/Nama survei/), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText(/^Unsur/), { target: { value: 'u1' } });
    fireEvent.change(screen.getByLabelText(/Teks pertanyaan/), { target: { value: 'Bagaimana kejelasan tarif?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ survey_id: 's1', unsur_id: 'u1' })));

    // Pertanyaan yang dipakai survei (belum dijawab) juga bisa dihapus.
    const [usedDelete, freeDelete] = screen.getAllByRole('button', { name: 'Hapus pertanyaan' });
    fireEvent.click(usedDelete);
    await waitFor(() => expect(remove).toHaveBeenCalledWith('q1'));
    expect(toast).toHaveBeenCalledWith('Pertanyaan dihapus dan dikeluarkan dari survei Survei IKM 2027.', 'success', 1000);
    fireEvent.click(freeDelete);
    await waitFor(() => expect(remove).toHaveBeenCalledWith('q9'));
    expect(confirm).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Pertanyaan dihapus.', 'success', 1000);
  });
});
