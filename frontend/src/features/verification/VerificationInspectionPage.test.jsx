import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VerificationInspectionPage } from './VerificationInspectionPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as VerificationApiModule from '@/api/verification.api';

describe('VerificationInspectionPage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'verif-1',
        name: 'Drs. H. M. Sholihin',
        role: 'VERIFIKATOR',
        roles: ['VERIFIKATOR'],
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: {
          id: 'assign-1',
          status: 'IN_PROGRESS',
          assigned_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 86400000).toISOString(),
          sla: {
            due_at: new Date(Date.now() + 86400000).toISOString(),
            is_overdue: false,
            remaining_ms: 86400000,
            duration_target: '2 hari',
          },
        },
        registration: {
          id: 'reg-1',
          registration_no: 'REG-2026-001',
          title: 'Mushaf Al-Qur\'an Standar Kemenag',
          status: 'IN_VERIFICATION',
          publisher: {
            id: 'pub-1',
            legal_name: 'PT Mushaf Nusantara',
            address: 'Jl. Percetakan No. 1, Jakarta',
          },
          service_type: {
            name: 'Mushaf Standar',
            category: { name: 'Mushaf Cetak' },
          },
          manuscript_files: [
            {
              id: 'file-1',
              file_name: 'cover_mushaf.pdf',
              file_type: 'COVER',
              version: 1,
            },
          ],
          physical_master_intake: {
            format: 'A4',
            binding_method: 'PER_JUZ',
            volume_count: 30,
            status: 'RECEIVED',
            receipt_no: 'TT-LPMQ-2026-001',
            condition: 'Baik dan Lengkap',
          },
        },
        nota_dinas: {
          id: 'nd-1',
          document_no: 'ND-VERIF-2026-001',
        },
        latest_result_document: null,
        result_documents: [],
      },
    });
  });

  it('merender lembar pemeriksaan naskah, checklist 4 butir, dan tombol simpan draf', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Mushaf Al-Qur\'an Standar Kemenag')).toBeInTheDocument();
      expect(screen.getByText(/Lembar Kerja Checklist Pemeriksaan/i)).toBeInTheDocument();
      expect(screen.getByText(/1. Kelengkapan & Kesesuaian Data Registrasi/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Kelengkapan Berkas Digital/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Kesesuaian Master Fisik Mushaf/i)).toBeInTheDocument();
      expect(screen.getByText(/4. Format & Rasm Naskah Awal/i)).toBeInTheDocument();
      expect(screen.getByText('Simpan Draf Pemeriksaan')).toBeInTheDocument();
      expect(screen.getByText('Ajukan Draf ke Kepala LPMQ')).toBeInTheDocument();
    });
  });

  it('merender panel Serah-Terima Master Fisik ke Distributor jika pembayaran PNBP telah diverifikasi sah', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: {
          id: 'assign-1',
          status: 'COMPLETED',
          decision: 'PASSED',
        },
        registration: {
          id: 'reg-1',
          registration_no: 'REG-2026-001',
          title: 'Mushaf Al-Qur\'an Standar Kemenag',
          status: 'PAYMENT_VERIFICATION',
          publisher: { legal_name: 'PT Mushaf Nusantara' },
          payment_records: [
            {
              id: 'pay-1',
              billing_no: 'BILL-001',
              status: 'VERIFIED',
              amount: 5000000,
            },
          ],
          physical_handovers: [],
        },
        nota_dinas: { document_no: 'ND-001' },
        latest_result_document: { status: 'SENT' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Langkah 7 SOP: Serah-Terima Master Fisik ke Distributor/i)).toBeInTheDocument();
      expect(screen.getByText(/Serahkan Master Fisik & Terbitkan BAST/i)).toBeInTheDocument();
    });
  });
});

