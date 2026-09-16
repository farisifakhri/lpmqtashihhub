import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewRegistrationPage } from './NewRegistrationPage';
import * as Auth from '@/features/auth/AuthContext';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
describe('Publisher new registration handoff', () => {
  it('creates one draft and opens file completion instead of submitting an empty registration', async () => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { roles: ['ADMIN_PENERBIT'] } });
    vi.spyOn(masterApi, 'getCategories').mockResolvedValue({ data: [{ id: 'cat1', name: 'Mushaf' }] });
    vi.spyOn(masterApi, 'getServiceTypes').mockResolvedValue({ data: [{ id: 'svc1', category_id: 'cat1', name: 'Reguler', base_fee: 1000 }] });
    vi.spyOn(masterApi, 'getAddons').mockResolvedValue({ data: [] });
    vi.spyOn(registrationApi, 'createDraft').mockResolvedValue({ data: { id: 'new-draft', registration_no: 'REG-NEW' } });
    vi.spyOn(registrationApi, 'submitRegistration').mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/publisher/new-registration']}><Routes><Route path="/publisher/new-registration" element={<NewRegistrationPage />} /><Route path="/publisher/registrations/new-draft" element={<div>Lengkapi berkas draf baru</div>} /></Routes></MemoryRouter>);
    const continueButtons = screen.getAllByRole('button', { name: 'Lanjutkan ke Berkas' });
    await waitFor(() => expect(continueButtons[0]).toBeEnabled());
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Mushaf Al-Qur/), { target: { value: 'Naskah baru penerbit' } });
    fireEvent.click(continueButtons[0]);
    expect(await screen.findByText('Lengkapi berkas draf baru')).toBeInTheDocument();
    expect(registrationApi.createDraft).toHaveBeenCalledTimes(1);
    expect(registrationApi.submitRegistration).not.toHaveBeenCalled();
  });
});
