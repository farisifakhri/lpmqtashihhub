import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewRegistrationPage } from './NewRegistrationPage';
import * as Auth from '@/features/auth/AuthContext';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
describe('Publisher new registration handoff', () => {
  it('removes an added ukuran dan oplah row while keeping the required first row', async () => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { roles: ['ADMIN_PENERBIT'] } });
    vi.spyOn(masterApi, 'getCategories').mockResolvedValue({ data: [{ id: 'cat1', name: 'Mushaf' }] });
    vi.spyOn(masterApi, 'getServiceTypes').mockResolvedValue({ data: [{ id: 'svc1', category_id: 'cat1', name: 'Reguler', base_fee: 1000 }] });
    vi.spyOn(masterApi, 'getAddons').mockResolvedValue({ data: [] });
    render(<MemoryRouter><NewRegistrationPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getAllByPlaceholderText('Tulis oplah')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Tambah Ukuran dan Oplah/i }));
    expect(screen.getAllByPlaceholderText('Tulis oplah')).toHaveLength(2);
    fireEvent.click(screen.getAllByTitle('Hapus baris ini')[1]);
    expect(screen.getAllByPlaceholderText('Tulis oplah')).toHaveLength(1);
    expect(screen.queryByTitle('Hapus baris ini')).not.toBeInTheDocument();
  });

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

  it('renders foreign mushaf fields when Mushaf Luar Negeri is selected and creates foreign registration draft', async () => {
    vi.spyOn(Auth, 'useAuth').mockReturnValue({ currentUser: { roles: ['ADMIN_PENERBIT'] } });
    vi.spyOn(masterApi, 'getCategories').mockResolvedValue({ data: [{ id: 'cat1', name: 'Mushaf' }] });
    vi.spyOn(masterApi, 'getServiceTypes').mockResolvedValue({
      data: [
        { id: 'svc1', category_id: 'cat1', name: 'Mushaf Al-Qur\'an 30 Juz', status: 'ACTIVE' },
        { id: 'svc-ln', category_id: 'cat1', name: 'Mushaf Al-Qur\'an Luar Negeri', status: 'ACTIVE' },
      ],
    });
    vi.spyOn(masterApi, 'getAddons').mockResolvedValue({ data: [] });
    vi.spyOn(registrationApi, 'createDraft').mockResolvedValue({
      data: { id: 'ln-draft', registration_no: 'REG-LN-001' },
    });

    render(
      <MemoryRouter initialEntries={['/publisher/new-registration']}>
        <Routes>
          <Route path="/publisher/new-registration" element={<NewRegistrationPage />} />
          <Route path="/publisher/registrations/ln-draft" element={<div>Lengkapi berkas mushaf luar negeri</div>} />
        </Routes>
      </MemoryRouter>
    );

    const continueButtons = screen.getAllByRole('button', { name: 'Lanjutkan ke Berkas' });
    await waitFor(() => expect(continueButtons[0]).toBeEnabled());

    // Initially Nama Percetakan is present
    expect(screen.getByPlaceholderText('Tulis nama percetakan')).toBeInTheDocument();

    // Select 'Mushaf Luar Negeri'
    fireEvent.change(screen.getByDisplayValue('Mushaf Baru'), { target: { value: 'Mushaf Luar Negeri' } });

    // Nama Percetakan should now be hidden
    expect(screen.queryByPlaceholderText('Tulis nama percetakan')).not.toBeInTheDocument();

    // The 4 foreign fields should now be present
    expect(screen.getByRole('combobox', { name: /Negara asal mushaf/i }) || screen.getByText('Pilih negara asal mushaf')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tulis Nama penerbit asal Mushaf')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tulis Nama lembaga pentashih asal Mushaf')).toBeInTheDocument();
    expect(screen.getByText(/Unggah tanda tashih dari lembaga pentashih mushaf asal/i)).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Mushaf Al-Qur/), { target: { value: 'Mushaf Madinah King Fahd' } });
    fireEvent.change(screen.getByDisplayValue('Pilih negara asal mushaf'), { target: { value: 'Arab Saudi' } });
    fireEvent.change(screen.getByPlaceholderText('Tulis Nama penerbit asal Mushaf'), { target: { value: 'Mujamma Al Malik Fahd' } });
    fireEvent.change(screen.getByPlaceholderText('Tulis Nama lembaga pentashih asal Mushaf'), { target: { value: 'Lajnah Ilmiyyah Madinah' } });

    // Submit
    fireEvent.click(continueButtons[0]);

    await waitFor(() => {
      expect(registrationApi.createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Mushaf Madinah King Fahd',
          registration_type: 'FOREIGN_MANUSCRIPT',
          registration_category: 'FOREIGN_MANUSCRIPT',
          service_type_id: 'svc-ln',
          foreign_metadata: expect.objectContaining({
            country_of_origin: 'Arab Saudi',
            foreign_publisher_name: 'Mujamma Al Malik Fahd',
            foreign_tashih_institution: 'Lajnah Ilmiyyah Madinah',
          }),
        })
      );
    });

    expect(await screen.findByText('Lengkapi berkas mushaf luar negeri')).toBeInTheDocument();
  });
});
