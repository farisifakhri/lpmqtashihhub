import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VerificationInspectionPage } from './VerificationInspectionPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as VerificationApiModule from '@/api/verification.api';
import { fileApi } from '@/api/file.api';

describe('VerificationInspectionPage Component', { timeout: 15000 }, () => {
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
      expect(screen.getByRole('button', { name: 'Lihat / Cetak PDF Disposisi' })).toBeInTheDocument();
      expect(screen.getByText('Periksa PDF Disposisi')).toBeInTheDocument();
      expect(screen.getByText('Hasil Pemeriksaan & Draf Surat')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }));
    expect(screen.getByText('KEMENTERIAN AGAMA REPUBLIK INDONESIA')).toBeInTheDocument();
    expect(screen.getByText('Yth. Pimpinan PT Mushaf Nusantara')).toBeInTheDocument();
  });

  it('mengunggah PDF billing PNBP dan menyertakannya pada draf surat', async () => {
    vi.spyOn(fileApi, 'upload').mockResolvedValue({ id: '00000000-0000-0000-0000-000000000123' });
    vi.spyOn(VerificationApiModule.verificationApi, 'saveDraft').mockResolvedValue({ success: true });
    render(<MemoryRouter initialEntries={['/internal/verifications/assign-1']}><Routes><Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} /></Routes></MemoryRouter>);
    const input = await screen.findByLabelText(/Dokumen billing PNBP \(PDF\)/i);
    fireEvent.change(input, { target: { files: [new File(['%PDF-1.4'], 'billing-pnbp.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText('Lampiran tersimpan: billing-pnbp.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draf Pemeriksaan' }));
    await waitFor(() => expect(VerificationApiModule.verificationApi.saveDraft).toHaveBeenCalledWith('assign-1', expect.objectContaining({ billing_file_id: '00000000-0000-0000-0000-000000000123' })));
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
          core_distributor_id: 'dist-1', core_distributor: { name: 'Distributor Tim Inti' },
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
    fireEvent.click(screen.getByRole('button', { name: 'Serahkan Master Fisik & Terbitkan BAST' }));
    expect(screen.getByText('Distributor Tim Inti')).toBeInTheDocument();
    expect(screen.queryByText(/Pilih Petugas Distributor Penerima/i)).not.toBeInTheDocument();
  });

  it('menawarkan BAST baru setelah distributor mengembalikan fisik tanpa meminta validasi pembayaran ulang', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: { id: 'assign-1', status: 'COMPLETED', verifier_id: 'verif-1' },
        registration: {
          id: 'reg-1', registration_no: 'REG-2026-001', title: 'Mushaf Uji',
          status: 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED', publisher: { legal_name: 'Penerbit Uji' },
          core_distributor_id: 'dist-1', core_distributor: { name: 'Distributor Tim Inti' },
          payment_records: [{ id: 'pay-1', status: 'VERIFIED' }],
          physical_handovers: [{ id: 'ho-1', receipt_no: 'BAST-001', status: 'RETURNED', volume_count: 30, to_user: { name: 'Distributor Uji' } }],
        },
        latest_result_document: { status: 'SENT' },
      },
    });
    render(<MemoryRouter initialEntries={['/internal/verifications/assign-1']}><Routes><Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Serahkan Kembali & Terbitkan BAST Baru' })).toBeInTheDocument();
    expect(screen.getByText('Dikembalikan distributor untuk perbaikan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unduh PDF BAST' })).toBeInTheDocument();
  });

  it('merender banner catatan pengembalian jika draf dikembalikan oleh Kepala LPMQ', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: {
          id: 'assign-1',
          status: 'IN_PROGRESS',
          return_reason: 'Harap periksa keselarasan penomoran ayat pada juz 15.',
        },
        registration: {
          id: 'reg-1',
          registration_no: 'REG-2026-001',
          title: 'Mushaf Al-Qur\'an Standar Kemenag',
          status: 'IN_VERIFICATION',
          publisher: { legal_name: 'PT Mushaf Nusantara' },
          manuscript_files: [],
        },
        nota_dinas: { document_no: 'ND-001' },
        latest_result_document: { id: 'doc-1', status: 'RETURNED' },
        result_documents: [],
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
      expect(screen.getByText(/Draf Dikembalikan oleh Kepala LPMQ/i)).toBeInTheDocument();
      expect(screen.getByText(/Harap periksa keselarasan penomoran ayat pada juz 15./i)).toBeInTheDocument();
    });
  });

  it('merender tombol persetujuan Kepala LPMQ saat draf SUBMITTED', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'kepala-1',
        name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
        role: 'KEPALA_LPMQ',
        roles: ['KEPALA_LPMQ'],
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: {
          id: 'assign-1',
          status: 'WAITING_APPROVAL',
          verifier: { id: 'verifier-1' },
        },
        registration: {
          id: 'reg-1',
          registration_no: 'REG-2026-001',
          title: 'Mushaf Al-Qur\'an Standar Kemenag',
          status: 'WAITING_VERIFICATION_APPROVAL',
          publisher: { legal_name: 'PT Mushaf Nusantara' },
          manuscript_files: [],
        },
        nota_dinas: { document_no: 'ND-001' },
        latest_result_document: { id: 'doc-1', status: 'SUBMITTED', content_snapshot: { decision: 'REVISION_REQUIRED' }, signatories: [{ signer_user_id: 'verifier-1', status: 'SIGNED' }] },
        result_documents: [],
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
      expect(screen.getByRole('button', { name: /Setujui Surat Bertanda Tangan Verifikator/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Kembalikan Draf/i })).toBeInTheDocument();
    });
  });

  it('meminta nomor surat hasil dan berita acara di dialog persetujuan Kepala LPMQ', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'head-1',
        name: 'Dr. H. Abdul Aziz Sidqi, M.Ag.',
        role: 'KEPALA_LPMQ',
        roles: ['KEPALA_LPMQ'],
      },
    });

    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: {
          id: 'assign-1',
          status: 'WAITING_APPROVAL',
          verifier: { id: 'verifier-1' },
        },
        registration: {
          id: 'reg-1',
          registration_no: 'REG-2026-001',
          title: "Mushaf Al-Qur'an Standar Kemenag",
          status: 'WAITING_VERIFICATION_APPROVAL',
          publisher: { legal_name: 'PT Mushaf Nusantara' },
          manuscript_files: [],
        },
        nota_dinas: { document_no: 'ND-001' },
        latest_result_document: { id: 'doc-1', document_type: 'SURAT_HASIL_VERIFIKASI', status: 'SUBMITTED', content_snapshot: { decision: 'REVISION_REQUIRED' }, signatories: [{ signer_user_id: 'verifier-1', status: 'SIGNED' }] },
        berita_acara: { id: 'ba-1', document_type: 'BERITA_ACARA_VERIFIKASI', status: 'SUBMITTED', signatories: [{ signer_user_id: 'verifier-1', status: 'SIGNED' }] },
        result_documents: [],
      },
    });

    const approveSpy = vi.spyOn(VerificationApiModule.verificationApi, 'approveDocument').mockResolvedValue({
      success: true,
      data: { id: 'doc-1', status: 'APPROVED' },
    });

    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    const approveButton = await screen.findByRole('button', { name: /Setujui Surat Bertanda Tangan Verifikator/i });
    expect(screen.getByRole('button', { name: 'Lihat / Cetak PDF Surat hasil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lihat / Cetak PDF Berita acara' })).toBeInTheDocument();
    fireEvent.click(approveButton);

    // Dialog persetujuan terbuka dengan kolom pengisian nomor
    expect(await screen.findByRole('heading', { name: 'Sahkan Surat Hasil Verifikasi' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nomor Surat Hasil Verifikasi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nomor Berita Acara Verifikasi/i)).toBeInTheDocument();

    // Isi nomor dokumen resmi
    fireEvent.change(screen.getByLabelText(/Nomor Surat Hasil Verifikasi/i), {
      target: { value: 'B-100/LPMQ.01/TL.00/09/2026' },
    });
    fireEvent.change(screen.getByLabelText(/Nomor Berita Acara Verifikasi/i), {
      target: { value: 'BA-100/LPMQ.01/TL.00/09/2026' },
    });

    // Klik tombol setujui dokumen
    fireEvent.click(screen.getByRole('button', { name: /Sahkan dan Terbitkan PDF/i }));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('doc-1', {
        document_numbers: {
          SURAT_HASIL_VERIFIKASI: 'B-100/LPMQ.01/TL.00/09/2026',
          BERITA_ACARA_VERIFIKASI: 'BA-100/LPMQ.01/TL.00/09/2026',
        },
      });
    });
  });
});

