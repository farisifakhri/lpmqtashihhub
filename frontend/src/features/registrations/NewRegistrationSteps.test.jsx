import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewRegistrationPage } from './NewRegistrationPage';
import * as Auth from '@/features/auth/AuthContext';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
import { normalizeWhatsApp, validateWhatsApp, validateEmail } from './steps/registration-validation';

describe('NewRegistration Stepper and Enhancements', () => {
  beforeEach(() => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { roles: ['PENERBIT'] } });
    vi.spyOn(masterApi, 'getCategories').mockResolvedValue({ data: [] });
    vi.spyOn(masterApi, 'getServiceTypes').mockResolvedValue({ data: [] });
    vi.spyOn(masterApi, 'getAddons').mockResolvedValue({ data: [] });
    sessionStorage.clear();
  });

  it('normalizes Indonesian phone numbers and validates formats', () => {
    expect(normalizeWhatsApp('081234567890')).toBe('+6281234567890');
    expect(normalizeWhatsApp('6281234567890')).toBe('+6281234567890');
    expect(normalizeWhatsApp('+6281234567890')).toBe('+6281234567890');

    expect(validateWhatsApp('081234567890')).toBeNull();
    expect(validateWhatsApp('+6281234567890')).toBeNull();
    expect(typeof validateWhatsApp('123')).toBe('string');

    expect(validateEmail('user@kemenag.go.id')).toBeNull();
    expect(typeof validateEmail('invalid-email')).toBe('string');
  });

  it('renders 4 steps in the stepper navigation bar', async () => {
    render(
      <MemoryRouter>
        <NewRegistrationPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: /Tahapan Formulir Permohonan/i })).toBeInTheDocument();
    expect(screen.getByText('Data Mushaf')).toBeInTheDocument();
    expect(screen.getByText('Jenis & Materi')).toBeInTheDocument();
    expect(screen.getByText('Berkas Persyaratan')).toBeInTheDocument();
    expect(screen.getByText('Tinjau & Kirim')).toBeInTheDocument();
  });

  it('prompts to restore autosaved draft when sessionStorage contains draft data', async () => {
    sessionStorage.setItem(
      'lpmq_registration_autosave_v1',
      JSON.stringify({
        namaMushaf: 'Mushaf Draf Tersimpan Otomatis',
        penanggungJawabProduk: 'Ustadz Ahmad',
        penanggungJawabWa: '081299887766',
      })
    );

    render(
      <MemoryRouter>
        <NewRegistrationPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Draf Formulir Belum Tersimpan Ditemukan/i)).toBeInTheDocument();

    const restoreBtn = screen.getByRole('button', { name: /Pulihkan Draf/i });
    fireEvent.click(restoreBtn);

    const title = screen.getByPlaceholderText(/Contoh: Mushaf Al-Qur/i);
    expect(title).toHaveValue('Mushaf Draf Tersimpan Otomatis');
  });

  it('validates Step 1 before advancing to Step 2', async () => {
    render(
      <MemoryRouter>
        <NewRegistrationPage />
      </MemoryRouter>
    );

    // Click next step button from step 1
    const nextBtn = screen.getByRole('button', { name: /Lanjut: Langkah 2/i });
    fireEvent.click(nextBtn);

    // Validation errors should show
    expect(await screen.findByText('Nama mushaf minimal 3 karakter.')).toBeInTheDocument();
    expect(screen.getByText('Nama penanggung jawab produk/mushaf wajib diisi.')).toBeInTheDocument();
  });
});
