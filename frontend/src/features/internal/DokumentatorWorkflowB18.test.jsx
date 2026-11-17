import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DokumentatorArchivePage } from './DokumentatorArchivePage';
import { SignatureCenterPage } from '@/features/signatures/SignatureCenterPage';
import { PublisherOfficialDocsTab } from '@/features/registrations/detail/PublisherOfficialDocsTab';
import * as RegistrationApiModule from '@/api/registration.api';
import * as DocumentationApiModule from '@/api/documentation.api';
import * as VerificationApiModule from '@/api/verification.api';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { publisherSurveyApi } from '@/api/publisher-survey.api';

describe('B-18 Frontend Workflow: Dokumentator, Paraf TU, Kepala LPMQ, dan Penerbit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('B18-FE-01: DokumentatorArchivePage merender daftar naskah dalam format Card per Mushaf dengan filter standar mushaf', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'dok-1',
        name: 'Ahmad Dokumentator',
        roles: ['DOKUMENTATOR'],
      },
    });

    const mockRegistrations = [
      {
        id: 'reg-01',
        registration_no: 'REG-2026-USMANI-01',
        title: "Mushaf Al-Qur'an Rasm Usmani Standar",
        status: 'READY_FOR_STT',
        publisher: { legal_name: 'PT Percetakan Menara Kudus' },
        service_type: { name: 'Mushaf Standar Usmani', service_kind: 'REGULAR' },
        created_at: '2026-11-01T10:00:00Z',
        official_documents: [],
      },
      {
        id: 'reg-02',
        registration_no: 'REG-2026-BRAILLE-02',
        title: "Mushaf Al-Qur'an Braille Lengkap",
        status: 'READY_FOR_STT',
        publisher: { legal_name: 'Yayasan Braille Nusantara' },
        service_type: { name: 'Mushaf Standar Braille', service_kind: 'REGULAR' },
        created_at: '2026-11-02T10:00:00Z',
        official_documents: [],
      },
    ];

    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({
      data: {
        items: mockRegistrations,
        pagination: { total: 2, page: 1, limit: 50 },
      },
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'getDocumentationDetail').mockResolvedValue({
      data: {
        registration: mockRegistrations[0],
        publisher: mockRegistrations[0].publisher,
        service_type: mockRegistrations[0].service_type,
        official_documents: [],
        manuscript_files: [],
      },
    });

    render(
      <MemoryRouter>
        <DokumentatorArchivePage />
      </MemoryRouter>
    );

    // Pastikan kedua card naskah ter-render
    await waitFor(() => {
      expect(screen.getByText('REG-2026-USMANI-01')).toBeInTheDocument();
      expect(screen.getByText("Mushaf Al-Qur'an Rasm Usmani Standar")).toBeInTheDocument();
      expect(screen.getByText('REG-2026-BRAILLE-02')).toBeInTheDocument();
      expect(screen.getByText("Mushaf Al-Qur'an Braille Lengkap")).toBeInTheDocument();
    });

    // Uji filter Standar Mushaf: pilih Braille
    const standardSelect = screen.getByDisplayValue('Semua Standar');
    fireEvent.change(standardSelect, { target: { value: 'Braille' } });

    // Card Braille tetap ada di dalam container daftar card, Usmani tersaring keluar
    const brailleRegBadge = screen.getByText('REG-2026-BRAILLE-02');
    expect(brailleRegBadge).toBeInTheDocument();
    const cardsContainer = brailleRegBadge.closest('.space-y-3');
    expect(within(cardsContainer).getByText("Mushaf Al-Qur'an Braille Lengkap")).toBeInTheDocument();
    expect(within(cardsContainer).queryByText("Mushaf Al-Qur'an Rasm Usmani Standar")).not.toBeInTheDocument();
  });

  it('B18-FE-02: Tombol Buat Draf STT memicu pembuatan dokumen dan modal konfirmasi', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'dok-1',
        name: 'Ahmad Dokumentator',
        roles: ['DOKUMENTATOR'],
      },
    });

    const mockReg = {
      id: 'reg-stt-ready',
      registration_no: 'REG-2026-STT-01',
      title: "Mushaf Al-Qur'an Madinah Cetak",
      status: 'READY_FOR_STT',
      publisher: { legal_name: 'PT Pustaka Imam Bonjol' },
      service_type: { name: 'Mushaf Standar Usmani' },
      created_at: '2026-11-05T09:00:00Z',
      official_documents: [],
    };

    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockResolvedValue({
      data: {
        items: [mockReg],
        pagination: { total: 1, page: 1, limit: 50 },
      },
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'getDocumentationDetail').mockResolvedValue({
      data: {
        registration: mockReg,
        publisher: mockReg.publisher,
        service_type: mockReg.service_type,
        official_documents: [],
      },
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'createOfficialDocument').mockResolvedValue({
      success: true,
      data: {
        id: 'doc-stt-draft-1',
        document_no: 'DRAFT-STT-202611-001',
        document_type: 'SURAT_TANDA_TASHIH',
      },
    });

    render(
      <MemoryRouter>
        <DokumentatorArchivePage />
      </MemoryRouter>
    );

    // Temukan tombol Buat Draf STT pada card
    const createDraftBtn = await screen.findByRole('button', { name: /Buat Draf STT/i });
    expect(createDraftBtn).toBeInTheDocument();
    fireEvent.click(createDraftBtn);

    // Modal konfirmasi pembuatan Draf STT terbuka
    expect(await screen.findByText('Buat Draf Surat Tanda Tashih (STT)')).toBeInTheDocument();
    expect(screen.getAllByText('PT Pustaka Imam Bonjol').length).toBeGreaterThan(0);

    // Klik tombol konfirmasi
    const confirmBtn = screen.getByRole('button', { name: /Buat Draf STT Sekarang/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(DocumentationApiModule.documentationApi.createOfficialDocument).toHaveBeenCalledWith(
        'reg-stt-ready',
        { document_type: 'SURAT_TANDA_TASHIH' }
      );
    });
  });

  it('B18-FE-03: SignatureCenterPage menampilkan satu tombol paraf untuk role Pemaraf saja', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'pemaraf-1',
        name: 'Pemaraf Uji LPMQ',
        roles: ['PENTASHIH', 'KEPALA_LPMQ'],
        isPemaraf: true,
      },
    });

    const mockSttReg = {
      id: 'reg-tu-paraf',
      registration_no: 'REG-2026-PARAF-01',
      title: "Mushaf Al-Qur'an Siap Paraf",
      status: 'READY_FOR_STT',
      publisher: { legal_name: 'PT Citra Grafika' },
      official_documents: [
        {
          id: 'doc-stt-paraf-1',
          document_no: 'DRAFT-STT-202611-002',
          document_type: 'SURAT_TANDA_TASHIH',
          version: 1,
          status: 'DRAFT',
          content_snapshot: {
            tu_workflow: {
              status: 'SUBMITTED_TO_PEMARAF',
              submitted_at: '2026-11-06T10:00:00Z',
            },
          },
        },
      ],
    };

    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      data: { items: [] },
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockImplementation(({ status }) => {
      if (status === 'READY_FOR_STT') {
        return Promise.resolve({ data: { items: [mockSttReg] } });
      }
      return Promise.resolve({ data: { items: [] } });
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'parafTu').mockResolvedValue({
      success: true,
      data: {
        id: 'doc-stt-paraf-1',
        tu_workflow: { paraf: { signed_at: '2026-11-08T12:00:00Z' } },
      },
    });

    render(
      <MemoryRouter>
        <SignatureCenterPage />
      </MemoryRouter>
    );

    // Satu tombol paraf untuk Pemaraf; tidak ada Paraf 1/Paraf 2 dan Pemaraf tidak bisa mengesahkan
    const parafBtn = await screen.findByRole('button', { name: /Bubuhkan Paraf/i });
    expect(screen.queryByRole('button', { name: /Paraf 2/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tandatangani STT Resmi/i })).toBeNull();
    fireEvent.click(parafBtn);

    // Modal dialog paraf terbuka
    expect(await screen.findByText('Pembubuhan Paraf')).toBeInTheDocument();
    const submitButtons = screen.getAllByRole('button', { name: /Bubuhkan Paraf/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(DocumentationApiModule.documentationApi.parafTu).toHaveBeenCalledWith(
        'doc-stt-paraf-1',
        expect.objectContaining({ notes: '' })
      );
    });
  });

  it('B18-FE-03b: Tata Usaha (Admin Internal) tidak lagi mendapat tombol paraf STT', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { id: 'tu-admin-1', name: 'Siti Tata Usaha', roles: ['ADMIN_INTERNAL'] },
    });
    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({ data: { items: [] } });
    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockImplementation(({ status }) => Promise.resolve({
      data: {
        items: status === 'READY_FOR_STT' ? [{
          id: 'reg-tu',
          registration_no: 'REG-TU',
          title: 'Mushaf',
          status: 'READY_FOR_STT',
          publisher: { legal_name: 'PT Uji' },
          official_documents: [{
            id: 'doc-tu', document_no: 'DRAFT-TU', document_type: 'SURAT_TANDA_TASHIH', version: 1, status: 'DRAFT',
            content_snapshot: { tu_workflow: { submitted_at: '2026-11-06T10:00:00Z' } },
          }],
        }] : [],
      },
    }));

    render(<MemoryRouter><SignatureCenterPage /></MemoryRouter>);

    await waitFor(() => expect(RegistrationApiModule.registrationApi.listRegistrations).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('button', { name: /Bubuhkan Paraf/i })).toBeNull();
  });

  it('B18-FE-04: Tombol tanda tangan Kepala LPMQ aktif setelah diparaf Pemaraf', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'usr-kepala-1',
        name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
        roles: ['KEPALA_LPMQ'],
      },
    });

    const mockSttCompleteParaf = {
      id: 'reg-tu-complete',
      registration_no: 'REG-2026-SIGN-01',
      title: "Mushaf Al-Qur'an Siap Tanda Tangan",
      status: 'READY_FOR_STT',
      publisher: { legal_name: 'PT Berkah Mandiri' },
      official_documents: [
        {
          id: 'doc-stt-sign-1',
          document_no: 'DRAFT-STT-202611-003',
          document_type: 'SURAT_TANDA_TASHIH',
          version: 1,
          status: 'DRAFT',
          content_snapshot: {
            tu_workflow: {
              status: 'PARAF_COMPLETED',
              submitted_at: '2026-11-07T07:00:00Z',
              paraf_required: 2,
              parafs: [
                { signed_by: { id: 'p-1', name: 'Pemaraf Uji LPMQ' }, signed_at: '2026-11-07T08:00:00Z' },
                { signed_by: { id: 'p-2', name: 'dr afdhal' }, signed_at: '2026-11-07T08:30:00Z' },
              ],
            },
          },
        },
      ],
    };

    vi.spyOn(VerificationApiModule.verificationApi, 'listAssignments').mockResolvedValue({
      data: { items: [] },
    });

    vi.spyOn(RegistrationApiModule.registrationApi, 'listRegistrations').mockImplementation(({ status }) => {
      if (status === 'READY_FOR_STT') {
        return Promise.resolve({ data: { items: [mockSttCompleteParaf] } });
      }
      return Promise.resolve({ data: { items: [] } });
    });

    vi.spyOn(DocumentationApiModule.documentationApi, 'signStt').mockResolvedValue({
      success: true,
      data: {
        id: 'doc-stt-sign-1',
        status: 'ISSUED',
        document_no: '001/LPMQ.01/TL.00/11/2026',
      },
    });

    render(
      <MemoryRouter>
        <SignatureCenterPage />
      </MemoryRouter>
    );

    // Tombol "Tandatangani STT Resmi" aktif karena Pemaraf sudah membubuhkan paraf
    const signBtn = await screen.findByRole('button', { name: /Tandatangani STT Resmi/i });
    expect(signBtn).toBeInTheDocument();
    fireEvent.click(signBtn);

    // Dialog pengesahan STT terbuka
    expect(await screen.findByText('Pengesahan Surat Tanda Tashih (STT) Resmi')).toBeInTheDocument();
    const signButtons = screen.getAllByRole('button', { name: /Tandatangani STT Resmi/i });
    const confirmSignBtn = signButtons[signButtons.length - 1];
    fireEvent.click(confirmSignBtn);

    await waitFor(() => {
      expect(DocumentationApiModule.documentationApi.signStt).toHaveBeenCalledWith('doc-stt-sign-1');
    });
  });

  it('B18-FE-05: PublisherOfficialDocsTab menampilkan banner ucapan selamat dan tombol download STT resmi ber-QR', async () => {
    // Rincian & tombol unduh STT tampil setelah seluruh survei terisi.
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [] });
    const mockRegistration = {
      id: 'reg-pub-01',
      registration_no: 'REG-2026-PUB-01',
      title: "Mushaf Al-Qur'an Terbit Resmi",
      status: 'STT_ISSUED',
      publisher: { legal_name: 'PT Pustaka Al-Kautsar' },
      official_documents: [
        {
          id: 'doc-stt-issued-1',
          document_no: '042/LPMQ.01/TL.00/11/2026',
          document_type: 'SURAT_TANDA_TASHIH',
          status: 'ISSUED',
          issued_at: '2026-11-08T08:00:00Z',
          valid_until: '2029-11-08T08:00:00Z',
        },
      ],
      foreign_metadata: {},
    };

    render(
      <PublisherOfficialDocsTab
        data={mockRegistration}
        setPreviewFile={vi.fn()}
        setShowReceipt={vi.fn()}
      />
    );

    // Banner ucapan selamat
    expect(screen.getByText(/Selamat! Naskah Anda Telah Resmi Memperoleh Tanda Tashih/i)).toBeInTheDocument();
    expect(await screen.findByText('042/LPMQ.01/TL.00/11/2026')).toBeInTheDocument();

    // Tombol unduh STT resmi
    expect(screen.getByRole('button', { name: /Unduh Surat Tanda Tashih Resmi \(PDF\)/i })).toBeInTheDocument();

    // Peringatan kewajiban 5 eksemplar fisik
    expect(screen.getByText(/Kewajiban Pengiriman 5 Eksemplar Fisik \(Batas Waktu: 30 Hari Kalender\)/i)).toBeInTheDocument();
  });
});
