import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignatureCenterPage } from './SignatureCenterPage';
import { verificationApi } from '@/api/verification.api';
import { masterRequestApi } from '@/api/master-request.api';

// Mock dependencies
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'usr-kepala-1',
      name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
      roles: ['KEPALA_LPMQ'],
    },
  }),
}));

vi.mock('@/api/verification.api', () => ({
  verificationApi: {
    listAssignments: vi.fn(),
    signDocument: vi.fn(),
  },
}));

vi.mock('@/api/master-request.api', () => ({
  masterRequestApi: {
    listForSignature: vi.fn(),
    sign: vi.fn(),
    openSignatureLetter: vi.fn(),
  },
}));

const mockMasterLetters = [
  {
    id: 'mreq-1',
    request_code: 'PMQ-20261110-ABC234',
    status: 'MENUNGGU_TTE',
    letter_number: 'B-0007/LPMQ.01/HM.01/XI/2026',
    mushaf_type_label: 'Yasin dan Tahlil',
    institution: 'PT Mushaf Nusantara',
    publisher: { id: 'pub-1', legal_name: 'PT Mushaf Nusantara' },
    letter_drafted_at: '2026-11-10T03:00:00.000Z',
    letter_drafted_by: { id: 'usr-admin-1', name: 'Admin Internal' },
  },
];

const mockAssignments = [
  {
    id: 'asg-1',
    status: 'WAITING_SIGNATURE',
    assigned_at: '2026-09-15T08:00:00.000Z',
    verifier: { id: 'v-1', name: 'Drs. H. M. Sholihin' },
    registration: {
      id: 'reg-1',
      registration_no: 'REG-2026-09-001',
      title: "Mushaf Al-Qur'an Standar Indonesia Braille",
      publisher: { legal_name: 'PT Sinar Grafika Islamika' },
    },
    documents: [
      {
        id: 'doc-1',
        document_no: 'SP-VERIF/2026/09/001',
        document_type: 'SURAT_HASIL_VERIFIKASI',
        status: 'SIGNING',
        version: 1,
      },
    ],
  },
  {
    id: 'asg-2',
    status: 'COMPLETED',
    assigned_at: '2026-09-10T08:00:00.000Z',
    verifier: { id: 'v-1', name: 'Drs. H. M. Sholihin' },
    registration: {
      id: 'reg-2',
      registration_no: 'REG-2026-09-002',
      title: "Mushaf Al-Qur'an Tajwid Warna A4",
      publisher: { legal_name: 'Penerbit Menara Suci' },
    },
    documents: [
      {
        id: 'doc-2',
        document_no: 'BA-VERIF/2026/09/002',
        document_type: 'BERITA_ACARA_VERIFIKASI',
        status: 'SIGNED',
        version: 1,
      },
    ],
  },
];

describe('SignatureCenterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verificationApi.listAssignments.mockResolvedValue({
      data: {
        items: mockAssignments,
      },
    });
    verificationApi.signDocument.mockResolvedValue({
      data: { success: true },
    });
    masterRequestApi.listForSignature.mockResolvedValue({ data: mockMasterLetters });
    masterRequestApi.sign.mockResolvedValue({ data: { status: 'DITANDATANGANI' } });
    masterRequestApi.openSignatureLetter.mockResolvedValue();
  });

  const renderComponent = (initialPath = '/internal/signatures') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/internal/signatures" element={<SignatureCenterPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('merender header dan 3 tab kanonikal pusat tanda tangan', async () => {
    renderComponent();

    expect((await screen.findAllByText('Pusat Persetujuan Internal')).length).toBeGreaterThan(0);
    expect(screen.getByText('Verifikasi internal LPMQ')).toBeInTheDocument();

    // Verify 3 canonical tabs exist
    expect(screen.getByRole('button', { name: /Perlu Konfirmasi Anda/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menunggu Penandatangan Lain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selesai Ditandatangani/i })).toBeInTheDocument();
  });

  it('menampilkan dokumen yang perlu ditandatangani dan detailnya', async () => {
    renderComponent();

    expect(await screen.findByText('SP-VERIF/2026/09/001')).toBeInTheDocument();
    expect(screen.getByText(/Mushaf Al-Qur'an Standar Indonesia Braille/i)).toBeInTheDocument();
    expect(screen.getByText('PT Sinar Grafika Islamika')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Konfirmasi$/i })).toBeInTheDocument();
  });

  it('membuka ConfirmationSummaryDialog saat tombol Tanda Tangani ditekan', async () => {
    renderComponent();

    const signButton = await screen.findByRole('button', { name: /^Konfirmasi$/i });
    fireEvent.click(signButton);

    expect(await screen.findByText('Konfirmasi Dokumen Internal')).toBeInTheDocument();
    expect(screen.getByText(/Konfirmasi ini tercatat dalam jejak audit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Catat Konfirmasi Internal/i })).toBeInTheDocument();
  });

  it('memanggil verificationApi.signDocument saat konfirmasi tanda tangan', async () => {
    renderComponent();

    const signButton = await screen.findByRole('button', { name: /^Konfirmasi$/i });
    fireEvent.click(signButton);

    const confirmButton = await screen.findByRole('button', { name: /Catat Konfirmasi Internal/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(verificationApi.signDocument).toHaveBeenCalledWith('doc-1');
    });

    expect(await screen.findByText(/berhasil dicatat/i)).toBeInTheDocument();
  });

  it('berpindah ke tab Selesai Ditandatangani dan menampilkan arsip', async () => {
    renderComponent();

    const completedTab = await screen.findByRole('button', { name: /Selesai Ditandatangani/i });
    fireEvent.click(completedTab);

    expect(await screen.findByText('BA-VERIF/2026/09/002')).toBeInTheDocument();
    expect(screen.getByText(/Mushaf Al-Qur'an Tajwid Warna A4/i)).toBeInTheDocument();
    expect(screen.getByText('Lengkap Ditandatangani')).toBeInTheDocument();
  });

  it('menampilkan surat persetujuan Permohonan Master untuk ditandatangani Kepala', async () => {
    renderComponent();

    expect(await screen.findByText('B-0007/LPMQ.01/HM.01/XI/2026')).toBeInTheDocument();
    expect(screen.getByText('Surat Persetujuan Master', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getAllByText('PT Mushaf Nusantara').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /Pratinjau/i }).at(-1));
    expect(masterRequestApi.openSignatureLetter).toHaveBeenCalledWith('mreq-1');

    fireEvent.click(screen.getByRole('button', { name: /Tandatangani Surat/i }));
    expect(await screen.findByText('Tanda Tangan Surat Persetujuan Master')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Tandatangani Surat$/i }).at(-1));

    await waitFor(() => expect(masterRequestApi.sign).toHaveBeenCalledWith('mreq-1'));
    expect(verificationApi.signDocument).not.toHaveBeenCalled();
    expect(await screen.findByText(/dikembalikan ke Admin/i)).toBeInTheDocument();
  });
});
