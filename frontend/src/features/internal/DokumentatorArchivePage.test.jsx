import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DokumentatorArchivePage } from './DokumentatorArchivePage';
import * as RegistrationApiModule from '@/api/registration.api';
import * as DocumentationApiModule from '@/api/documentation.api';
import * as AuthContextModule from '@/features/auth/AuthContext';

describe('DokumentatorArchivePage Component', () => {
  const mockRegistration = {
    id: 'reg-001',
    registration_no: 'REG-2026-DOC-001',
    title: 'Mushaf Standar Uji Dokumentasi',
    status: 'READY_FOR_STT',
    publisher: { legal_name: 'PT Percetakan Al-Qur\'an Berkah' },
    service_type: { name: 'Pentashihan Mushaf Standar Indonesia' },
    created_at: '2026-10-10T10:00:00Z',
  };

  const mockDetail = {
    registration: mockRegistration,
    publisher: mockRegistration.publisher,
    service_type: mockRegistration.service_type,
    physical_intake: {
      receipt_no: 'TT-LPMQ-2026-1234',
      condition: 'BAIK',
      volume_count: 30,
      received_at: '2026-10-10T10:00:00Z',
    },
    official_documents: [
      {
        id: 'doc-1',
        document_type: 'BERITA_ACARA_TASHIH',
        document_no: 'BA/LPMQ/2026/001',
        version: 1,
        status: 'ISSUED',
      },
    ],
    manuscript_files: [
      {
        id: 'file-1',
        file_id: 'up-1',
        file_name: 'cover_mushaf.pdf',
        file_type: 'COVER',
        file_size: 204800,
      },
    ],
    documentation_items: [],
    documentation_archive: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'dok-1',
        name: 'Ahmad Dokumentator',
        role: 'DOKUMENTATOR',
        roles: ['DOKUMENTATOR'],
      },
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({
      data: {
        items: [mockRegistration],
        pagination: { total: 1, page: 1, limit: 50 },
      },
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'getDocumentationDetail').mockResolvedValue({
      data: mockDetail,
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'saveDocumentationArchive').mockResolvedValue({
      success: true,
      data: { id: 'reg-001' },
    });
  });

  it('merender judul halaman dokumentasi dan daftar naskah', async () => {
    render(
      <MemoryRouter>
        <DokumentatorArchivePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Dokumentator: Pengarsipan Naskah & Deposit Mushaf/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('REG-2026-DOC-001')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Standar Uji Dokumentasi')).toBeInTheDocument();
    });
  });

  it('menampilkan dua pertanyaan konfirmasi wajib bagi dokumentator', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/documents?id=reg-001']}>
        <DokumentatorArchivePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/1\. Apakah dokumentasi terhadap mushaf master ini sudah ada\?/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Apakah sudah menerima 5 eksemplar dari penerbit\?/i)).toBeInTheDocument();
    });
  });

  it('menampilkan formulir alokasi lemari dan rak hanya jika kedua pertanyaan dijawab Ya', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/documents?id=reg-001']}>
        <DokumentatorArchivePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/1\. Apakah dokumentasi terhadap mushaf master ini sudah ada\?/i)).toBeInTheDocument();
    });

    // Awalnya form lokasi lemari belum muncul
    expect(screen.queryByPlaceholderText(/Misal: Lemari A, Lemari 02/i)).not.toBeInTheDocument();

    // Jawab Ya pada pertanyaan 1 saja
    const radioYesMaster = screen.getByLabelText(/Ya, sudah ada/i);
    fireEvent.click(radioYesMaster);
    expect(screen.queryByPlaceholderText(/Misal: Lemari A, Lemari 02/i)).not.toBeInTheDocument();

    // Jawab Ya pada pertanyaan 2
    const radioYes5Exemplars = screen.getByLabelText(/Ya, sudah menerima 5 eksemplar/i);
    fireEvent.click(radioYes5Exemplars);

    // Sekarang form lemari, rak, dan kode berkas harus muncul
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Misal: Lemari A, Lemari 02/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Misal: Rak 3, Tingkat 1/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Misal: ARSIP-2026-M042/i)).toBeInTheDocument();
    });
  });

  it('dapat mengisi survei mutu fisik standar Tashih.go.id dan menyimpan arsip dokumentasi', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/documents?id=reg-001']}>
        <DokumentatorArchivePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Survei Mutu Mushaf Fisik \(Format Resmi Tashih\.go\.id\)/i)).toBeInTheDocument();
    });

    // Centang Ya pada kedua pertanyaan
    fireEvent.click(screen.getByLabelText(/Ya, sudah ada/i));
    fireEvent.click(screen.getByLabelText(/Ya, sudah menerima 5 eksemplar/i));

    // Isi lokasi lemari & rak
    const cabinetInput = await screen.findByPlaceholderText(/Misal: Lemari A, Lemari 02/i);
    const shelfInput = screen.getByPlaceholderText(/Misal: Rak 3, Tingkat 1/i);
    const codeInput = screen.getByPlaceholderText(/Misal: ARSIP-2026-M042/i);

    fireEvent.change(cabinetInput, { target: { value: 'Lemari Master A' } });
    fireEvent.change(shelfInput, { target: { value: 'Rak 2' } });
    fireEvent.change(codeInput, { target: { value: 'ARSIP-2026-TEST' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Simpan Dokumentasi & Arsip/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(DocumentationApiModule.documentationApi.saveDocumentationArchive).toHaveBeenCalledWith(
        'reg-001',
        expect.objectContaining({
          has_master_documentation: true,
          has_received_5_exemplars: true,
          storage_cabinet: 'Lemari Master A',
          storage_shelf: 'Rak 2',
          archive_code: 'ARSIP-2026-TEST',
        })
      );
    });
  });
});

