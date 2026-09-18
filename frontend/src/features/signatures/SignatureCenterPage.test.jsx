import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignatureCenterPage } from './SignatureCenterPage';
import { verificationApi } from '@/api/verification.api';

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

    expect(await screen.findByText('Pusat Tanda Tangan & Pengesahan Digital')).toBeInTheDocument();
    expect(screen.getByText('Sertifikasi BSrE / E-Sign')).toBeInTheDocument();

    // Verify 3 canonical tabs exist
    expect(screen.getByRole('button', { name: /Perlu Tanda Tangan Anda/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menunggu Penandatangan Lain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selesai Ditandatangani/i })).toBeInTheDocument();
  });

  it('menampilkan dokumen yang perlu ditandatangani dan detailnya', async () => {
    renderComponent();

    expect(await screen.findByText('SP-VERIF/2026/09/001')).toBeInTheDocument();
    expect(screen.getByText(/Mushaf Al-Qur'an Standar Indonesia Braille/i)).toBeInTheDocument();
    expect(screen.getByText('PT Sinar Grafika Islamika')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tanda Tangani/i })).toBeInTheDocument();
  });

  it('membuka ConfirmationSummaryDialog saat tombol Tanda Tangani ditekan', async () => {
    renderComponent();

    const signButton = await screen.findByRole('button', { name: /Tanda Tangani/i });
    fireEvent.click(signButton);

    expect(await screen.findByText('Tanda Tangani Dokumen Resmi')).toBeInTheDocument();
    expect(screen.getByText(/Tanda tangan elektronik ini memiliki kekuatan hukum sah/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tanda Tangani Secara Digital/i })).toBeInTheDocument();
  });

  it('memanggil verificationApi.signDocument saat konfirmasi tanda tangan', async () => {
    renderComponent();

    const signButton = await screen.findByRole('button', { name: /Tanda Tangani/i });
    fireEvent.click(signButton);

    const confirmButton = await screen.findByRole('button', { name: /Tanda Tangani Secara Digital/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(verificationApi.signDocument).toHaveBeenCalledWith('doc-1');
    });

    expect(await screen.findByText(/berhasil ditandatangani secara digital/i)).toBeInTheDocument();
  });

  it('berpindah ke tab Selesai Ditandatangani dan menampilkan arsip', async () => {
    renderComponent();

    const completedTab = await screen.findByRole('button', { name: /Selesai Ditandatangani/i });
    fireEvent.click(completedTab);

    expect(await screen.findByText('BA-VERIF/2026/09/002')).toBeInTheDocument();
    expect(screen.getByText(/Mushaf Al-Qur'an Tajwid Warna A4/i)).toBeInTheDocument();
    expect(screen.getByText('Lengkap Ditandatangani')).toBeInTheDocument();
  });
});

