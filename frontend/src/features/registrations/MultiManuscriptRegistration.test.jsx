import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewRegistrationPage } from './NewRegistrationPage';
import * as Auth from '@/features/auth/AuthContext';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';

describe('B-01 Sesi 3: Multi-Manuscript & Variants Form (Frontend)', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-receipt');
    global.URL.revokeObjectURL = vi.fn();
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { roles: ['PENERBIT'] } });
    vi.spyOn(masterApi, 'getCategories').mockResolvedValue({ data: [{ id: 'cat1', name: 'Mushaf' }] });
    vi.spyOn(masterApi, 'getServiceTypes').mockResolvedValue({
      data: [{ id: 'svc1', category_id: 'cat1', name: "Mushaf Al-Qur'an 30 Juz", base_fee: 1000000 }],
    });
    vi.spyOn(masterApi, 'getAddons').mockResolvedValue({ data: [] });
    vi.spyOn(registrationApi, 'createDraft').mockResolvedValue({
      data: { id: 'multi-reg-1', registration_no: 'REG-MULTI-001' },
    });
    vi.spyOn(registrationApi, 'submitRegistration').mockResolvedValue({});
  });

  it('B-01 FE-1: Formulir penerbit tidak menampilkan kalkulator tarif atau SLA (Keputusan baseline)', async () => {
    render(
      <MemoryRouter initialEntries={['/publisher/new-registration']}>
        <Routes>
          <Route path="/publisher/new-registration" element={<NewRegistrationPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Pastikan tidak ada kartu kalkulator atau estimasi tarif/hari kerja pada formulir penerbit
    expect(screen.queryByText(/Kalkulator PNBP/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Estimasi Hari Kerja/i)).not.toBeInTheDocument();
  });

  it('B-01 FE-2: Mendukung penambahan naskah tambahan (multi-naskah) dan varian per naskah', async () => {
    render(
      <MemoryRouter initialEntries={['/publisher/new-registration']}>
        <Routes>
          <Route path="/publisher/new-registration" element={<NewRegistrationPage />} />
        </Routes>
      </MemoryRouter>
    );

    const draftButtons = screen.getAllByRole('button', { name: 'Simpan Draf' });
    await waitFor(() => expect(draftButtons[0]).toBeEnabled());

    // Isi naskah utama (Naskah 1)
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Mushaf Al-Qur/), {
      target: { value: "Mushaf Al-Qur'an Nusantara 30 Juz" },
    });
    fireEvent.change(screen.getByPlaceholderText('Tulis nama penanggung jawab Produk/Mushaf'), {
      target: { value: 'Drs. H. Ahmad' },
    });

    // Tambah naskah ke-2
    const addManuscriptBtn = screen.getAllByRole('button', { name: /Tambah Naskah Lain/i })[0];
    fireEvent.click(addManuscriptBtn);

    // Periksa bahwa form naskah ke-2 muncul
    expect(screen.getByText('Judul Naskah ke-2')).toBeInTheDocument();
    const secondTitleInput = screen.getByPlaceholderText(/Contoh: Mushaf Seri 2/i);
    fireEvent.change(secondTitleInput, {
      target: { value: 'Surah Yasin dan Tahlil Eksklusif' },
    });

    // Pilih Item Dasar untuk Naskah 2 (Yasin)
    const dasarSelect = screen.getByDisplayValue(/Al-Qur'an 30 Juz \(Cetak\)/i);
    fireEvent.change(dasarSelect, { target: { value: 'YASIN' } });

    // Tambah varian untuk naskah ke-2
    const addVariantBtn = screen.getByRole('button', { name: /\+ Tambah Varian/i });
    fireEvent.click(addVariantBtn);

    // Simpan draf
    fireEvent.click(draftButtons[0]);

    await waitFor(() => {
      expect(registrationApi.createDraft).toHaveBeenCalledTimes(1);
    });

    const calledPayload = registrationApi.createDraft.mock.calls[0][0];
    expect(calledPayload.manuscripts).toHaveLength(2);
    expect(calledPayload.manuscripts[0].title).toBe("Mushaf Al-Qur'an Nusantara 30 Juz");
    expect(calledPayload.manuscripts[0].seq_number).toBe(1);
    expect(calledPayload.manuscripts[1].title).toBe('Surah Yasin dan Tahlil Eksklusif');
    expect(calledPayload.manuscripts[1].seq_number).toBe(2);
    expect(calledPayload.manuscripts[1].items).toContain('YASIN');
  });

  it('B-01 FE-3: Menghapus naskah tambahan ketika tombol hapus diklik', async () => {
    render(
      <MemoryRouter initialEntries={['/publisher/new-registration']}>
        <Routes>
          <Route path="/publisher/new-registration" element={<NewRegistrationPage />} />
        </Routes>
      </MemoryRouter>
    );

    const draftButtons = screen.getAllByRole('button', { name: 'Simpan Draf' });
    await waitFor(() => expect(draftButtons[0]).toBeEnabled());

    // Tambah naskah ke-2
    fireEvent.click(screen.getAllByRole('button', { name: /Tambah Naskah Lain/i })[0]);
    expect(screen.getByText('Judul Naskah ke-2')).toBeInTheDocument();

    // Hapus naskah ke-2
    const deleteManuscriptBtn = screen.getByRole('button', { name: /Hapus Naskah/i });
    fireEvent.click(deleteManuscriptBtn);

    // Naskah ke-2 harus hilang
    expect(screen.queryByText('Judul Naskah ke-2')).not.toBeInTheDocument();
  });
});

