import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VerificationInspectionPage } from './VerificationInspectionPage';
import * as AuthContextModule from '@/features/auth/AuthContext';
import * as VerificationApiModule from '@/api/verification.api';
import * as QueueApi from '@/api/queue.api';
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

  it('merender lembar pemeriksaan naskah, checklist butir pemeriksaan, dan tombol simpan draf', async () => {
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
      expect(screen.getByText(/1. Kelengkapan Juz/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Kelengkapan Surah/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Urutan Halaman/i)).toBeInTheDocument();
      expect(screen.getByText(/4. Kesesuaian Dengan Kaidah Penulisan Mushaf Standar Indonesia/i)).toBeInTheDocument();
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

  it('menampilkan penampil naskah dan meja kerja checklist secara display block (bertumpuk, lebar penuh)', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    const workstation = await screen.findByTestId('inspection-workstation');
    expect(workstation).toHaveClass('block');
    expect(workstation.className).not.toMatch(/grid/);
    // Kedua panel (naskah & meja kerja) menempati lebar penuh, tanpa pembagian kolom.
    for (const panel of workstation.children) {
      expect(panel.className).not.toMatch(/col-span/);
    }
    expect(workstation.children).toHaveLength(2);
  });

  it('Studio Naskah & Berkas hanya menampilkan versi terbaru tiap jenis berkas', async () => {
    const base = await VerificationApiModule.verificationApi.getAssignmentDetail();
    base.data.registration.manuscript_files = [
      { id: 'cover-v1', file_id: 'f-cover-1', type: 'COVER', version: 1 },
      { id: 'cover-v2', file_id: 'f-cover-2', type: 'COVER', version: 2 },
      { id: 'dummy-v1', file_id: 'f-dummy-1', type: 'DUMMY', version: 1 },
    ];
    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue(base);
    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    const coverTabs = await screen.findAllByRole('button', { name: /Sampul \/ Cover/ });
    expect(coverTabs).toHaveLength(1);
    expect(coverTabs[0]).toHaveTextContent('v2');
    expect(screen.getAllByRole('button', { name: /Dummy Cetak/ })).toHaveLength(1);
  });

  it('tombol Lanjutkan memindahkan verifikator ke langkah meja kerja berikutnya', async () => {
    Element.prototype.scrollIntoView = vi.fn(); // jsdom tidak mengimplementasikan scrollIntoView
    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );
    const panelOf = (button) => button.closest('[class*="lg:block"], [class*="lg:hidden"]');

    const toKonten = await screen.findByRole('button', { name: /Lanjutkan ke Konten Mushaf/ });
    expect(panelOf(toKonten)).toHaveClass('lg:block');
    fireEvent.click(toKonten);

    expect(panelOf(toKonten)).toHaveClass('lg:hidden');
    expect(panelOf(screen.getByRole('button', { name: /Lanjutkan ke Kalkulator Tarif & SLA/ }))).toHaveClass('block', 'lg:block');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
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
      expect(screen.getByRole('button', { name: /Setujui & Sahkan Surat Hasil/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Kembalikan Draf/i })).toBeInTheDocument();
    });
  });

  it('meminta nomor surat hasil dan berita acara di dialog persetujuan Kepala LPMQ', async () => {
    const invalidateSpy = vi.spyOn(QueueApi, 'invalidateQueueCounts');
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

    const approveButton = await screen.findByRole('button', { name: /Setujui & Sahkan Surat Hasil/i });
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
    expect(invalidateSpy).toHaveBeenCalled();
    invalidateSpy.mockRestore();
  });

  it('U-04: Kepala LPMQ dapat mengesahkan surat hasil dan berita acara secara otomatis tanpa mengetik nomor manual', async () => {
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

    const approveButton = await screen.findByRole('button', { name: /Setujui & Sahkan Surat Hasil/i });
    fireEvent.click(approveButton);

    expect(await screen.findByRole('heading', { name: 'Sahkan Surat Hasil Verifikasi' })).toBeInTheDocument();
    expect(screen.getByText(/Penomoran Resmi Diterbitkan Otomatis/i)).toBeInTheDocument();

    // Langsung klik tombol sahkan tanpa mengisi nomor manual
    fireEvent.click(screen.getByRole('button', { name: /Sahkan dan Terbitkan PDF/i }));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('doc-1', {
        auto_number: true,
        auto_generate: true,
      });
    });
  });

  it('menampilkan notifikasi prasyarat billing jika verifikator mengajukan draf lolos tanpa kode billing', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('REG-2026-001');

    // Keputusan default adalah PASSED (Lolos Verifikasi), kode billing masih kosong
    expect(screen.getByText(/Prasyarat Pengajuan Draf Belum Lengkap/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Belum Diisi/i).length).toBeGreaterThan(0);

    // Verifikator mencoba klik "Ajukan Draf ke Kepala LPMQ"
    const submitBtn = screen.getByRole('button', { name: /Ajukan Draf ke Kepala LPMQ/i });
    fireEvent.click(submitBtn);

    // Muncul modal notifikasi prasyarat billing yang jelas dan ramah UX
    expect(await screen.findByRole('heading', { name: 'Prasyarat Billing Belum Lengkap' })).toBeInTheDocument();
    expect(screen.getByText(/Kode Billing PNBP \(SIMPONI\)/i)).toBeInTheDocument();
    expect(screen.getByText('Belum diisi (Wajib)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lengkapi Kode Billing Sekarang' })).toBeInTheDocument();

    // Klik tombol aksi cepat "Lengkapi Kode Billing Sekarang" menutup dialog
    fireEvent.click(screen.getByRole('button', { name: 'Lengkapi Kode Billing Sekarang' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Prasyarat Billing Belum Lengkap' })).not.toBeInTheDocument();
    });
  });

  it('WorkflowStepper merefleksikan tahapan dinamis secara akurat sesuai status registrasi', async () => {
    vi.spyOn(VerificationApiModule.verificationApi, 'getAssignmentDetail').mockResolvedValue({
      success: true,
      data: {
        assignment: {
          id: 'assign-1',
          status: 'WAITING_APPROVAL',
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
        latest_result_document: { id: 'doc-1', status: 'SUBMITTED' },
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

    // Tahapan stepper harus secara dinamis menunjukkan Tahap 3 (Penetapan Hasil Verifikasi)
    await waitFor(() => {
      expect(screen.getByText(/dari 8/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Penetapan Hasil Verifikasi/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('secara otomatis mengubah keputusan ke Ditolak/Perbaikan ketika ada butir checklist Tidak Sesuai', async () => {
    render(
      <MemoryRouter initialEntries={['/internal/verifications/assign-1']}>
        <Routes>
          <Route path="/internal/verifications/:id" element={<VerificationInspectionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lembar Kerja Checklist Pemeriksaan')).toBeInTheDocument();
    });

    const radioTidakSesuai = screen.getAllByRole('radio', { name: /Tidak Sesuai/i })[0];
    fireEvent.click(radioTidakSesuai);

    await waitFor(() => {
      expect(screen.getByText(/Perhatian: Terdapat 1 butir checklist dinyatakan Tidak Sesuai/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Naskah Ditolak \/ Perlu Perbaikan Penerbit \(Otomatis dari Checklist\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ditolak \/ Perbaikan/i)).toBeInTheDocument();
  });
});
