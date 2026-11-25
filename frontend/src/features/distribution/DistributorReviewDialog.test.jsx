import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DistributorReviewDialog, groupJuzItems } from './DistributorReviewDialog';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { tashihApi } from '@/api/tashih.api';

describe('DistributorReviewDialog Component (B-17)', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'dist-1',
        name: 'Ahmad Fauzi, S.Ag',
        role: 'DISTRIBUTOR',
        roles: ['DISTRIBUTOR'],
      },
    });
  });

  it('merender dialog reviu dan tidak mewajibkan comparison_notes pada ronde awal', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-initial',
        title: 'Mushaf Standar',
        status: 'TASHIH_IN_PROGRESS',
        official_documents: [], // tidak ada surat revisi sebelumnya
        assignments: [
          {
            id: 'asg-1',
            iteration: 1,
            stage: 'INITIAL',
            status: 'COMPLETED',
            reviews: [{ id: 'rev-1', result: 'PASSED', recap_file_id: 'file-1' }],
          },
        ],
      },
    });

    const approveSpy = vi.spyOn(tashihApi, 'approveDistribution').mockResolvedValue({ success: true });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<DistributorReviewDialog registrationId="reg-initial" onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/Reviu Hasil Sidang Pentashihan/i)).toBeInTheDocument();
    });

    // Pada ronde awal, textarea catatan pembanding tidak ditampilkan
    expect(screen.queryByText(/Catatan Telaah Pembanding Distributor/i)).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Simpan Keputusan Distributor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('reg-initial', expect.objectContaining({
        result: 'PASSED',
      }));
      expect(approveSpy.mock.calls[0][1]).not.toHaveProperty('comparison_notes');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('menyimpan keputusan distributor pada ronde revisi tanpa menyertakan comparison_notes (B-19a)', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-rev-2',
        title: 'Mushaf Standar Revisi',
        status: 'TASHIH_IN_PROGRESS',
        revision_round: 1,
        official_documents: [
          {
            id: 'doc-prev-srv',
            document_type: 'REVISION_RETURN_LETTER',
            document_no: 'SRV-REG001-1',
            version: 1,
            content_snapshot: { notes: 'Perbaiki harakat surat Al-Fatihah' },
          },
        ],
        publisher_revision_recaps: [
          {
            id: 'prr-1',
            round_number: 1,
            recap_file_id: 'file-pub-recap',
          },
        ],
        assignments: [
          {
            id: 'asg-2',
            iteration: 2,
            stage: 'REVISION',
            status: 'COMPLETED',
            reviews: [{ id: 'rev-2', result: 'PASSED', recap_file_id: 'file-pentashih-2' }],
          },
        ],
      },
    });

    const approveSpy = vi.spyOn(tashihApi, 'approveDistribution').mockResolvedValue({ success: true });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<DistributorReviewDialog registrationId="reg-rev-2" onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/Reviu Hasil Sidang Pentashihan/i)).toBeInTheDocument();
    });

    // Catatan pembanding tidak ada di dialog ini (dipindah ke penugasan masuk naskah B-19a)
    expect(screen.queryByPlaceholderText(/Tuliskan analisis perbandingan/i)).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Simpan Keputusan Distributor/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('reg-rev-2', expect.objectContaining({
        result: 'PASSED',
      }));
      expect(approveSpy.mock.calls[0][1]).not.toHaveProperty('comparison_notes');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('tidak menghitung penugasan yang dilepas (REVOKED) sehingga keputusan tetap bisa diambil (B-19b)', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-revoked',
        title: 'Mushaf Standar',
        status: 'TASHIH_IN_PROGRESS',
        official_documents: [],
        assignments: [
          {
            id: 'asg-revoked',
            iteration: 1,
            stage: 'INITIAL',
            status: 'REVOKED',
            revocation_reason: 'Pentashih cuti dinas',
            assignee: { name: 'Pentashih Lama' },
            reviews: [],
          },
          {
            id: 'asg-pengganti',
            iteration: 1,
            stage: 'INITIAL',
            status: 'COMPLETED',
            assignee: { name: 'Pentashih Pengganti' },
            reviews: [{ id: 'rev-p', result: 'PASSED', recap_file_id: 'file-p' }],
          },
        ],
      },
    });

    render(<DistributorReviewDialog registrationId="reg-revoked" onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Keputusan Tindak Lanjut Distributor/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Dilepas')).toBeInTheDocument();
    expect(screen.getByText(/Pentashih cuti dinas/)).toBeInTheDocument();
    expect(screen.queryByText(/Sidang Belum Selesai Seluruhnya/i)).not.toBeInTheDocument();
  });

  it('memungkinkan distributor meloloskan naskah ke tahap dumi meski terdapat catatan perbaikan dari pentashih', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-with-revisions',
        title: 'Mushaf Al-Qur`an dengan Koreksi Minor',
        status: 'TASHIH_IN_PROGRESS',
        official_documents: [],
        assignments: [
          {
            id: 'asg-1',
            iteration: 1,
            stage: 'INITIAL',
            status: 'COMPLETED',
            assignee: { name: 'Pentashih 1' },
            reviews: [{ id: 'rev-1', result: 'PASSED', recap_file_id: 'recap-1' }],
          },
          {
            id: 'asg-2',
            iteration: 1,
            stage: 'INITIAL',
            status: 'COMPLETED',
            assignee: { name: 'Pentashih 2' },
            reviews: [{ id: 'rev-2', result: 'REVISION_REQUIRED', recap_file_id: 'recap-2', notes: 'Ada koreksi harakat minor di juz 5' }],
          },
        ],
      },
    });

    const approveSpy = vi.spyOn(tashihApi, 'approveDistribution').mockResolvedValue({ success: true });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<DistributorReviewDialog registrationId="reg-with-revisions" onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/Reviu Hasil Sidang Pentashihan/i)).toBeInTheDocument();
    });

    // 1. Secara default terpilih "Kembalikan ke Penerbit (Perbaikan)"
    const revisionRadio = screen.getByRole('radio', { name: /Kembalikan ke Penerbit \(Perbaikan\)/i });
    expect(revisionRadio).toBeChecked();

    // 2. Pesan informatif ditampilkan, bukan teks pengunci
    expect(screen.getByText(/Terdapat catatan perbaikan dari pentashih; Koordinator Distribusi\/Distributor tetap dapat meloloskan telaah ke tahap dumi jika catatan bersifat minor\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Rekomendasi STT terkunci/i)).not.toBeInTheDocument();

    // 3. Opsi "Loloskan Telaah & Alihkan ke Tahap Dumi" TIDAK terkunci / disabled
    const passRadio = screen.getByRole('radio', { name: /Loloskan Telaah & Alihkan ke Tahap Dumi/i });
    expect(passRadio).not.toBeDisabled();

    // 4. Distributor bebas memilih opsi Loloskan Telaah & Alihkan ke Tahap Dumi
    fireEvent.click(passRadio);
    expect(passRadio).toBeChecked();

    // 5. Submit keputusan dan pastikan payload result adalah PASSED
    const submitBtn = screen.getByRole('button', { name: /Simpan Keputusan Distributor/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('reg-with-revisions', expect.objectContaining({
        result: 'PASSED',
      }));
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('mengelompokkan juz berurutan dengan status sama tanpa catatan unik (smart grouping)', () => {
    const rawItems = [
      { id: 'j1', juz_number: 1, result: 'PASSED', notes: null },
      { id: 'j2', juz_number: 2, result: 'PASSED', notes: '' },
      { id: 'j3', juz_number: 3, result: 'PASSED', notes: 'Lolos bersih' },
      { id: 'j4', juz_number: 4, result: 'REVISION_REQUIRED', notes: 'Ada salah harakat ayat 15' },
      { id: 'j5', juz_number: 5, result: 'PASSED', notes: null },
      { id: 'j6', juz_number: 6, result: 'PASSED', notes: null },
    ];

    const grouped = groupJuzItems(rawItems, 'Lolos bersih');
    expect(grouped).toEqual([
      { from: 1, to: 3, result: 'PASSED', note: '', isRange: true },
      { from: 4, to: 4, result: 'REVISION_REQUIRED', note: 'Ada salah harakat ayat 15', isRange: false },
      { from: 5, to: 6, result: 'PASSED', note: '', isRange: true },
    ]);
  });

  it('mengosongkan textarea catatan keputusan distributor secara default ("") dan melabelinya Opsional', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-empty-notes',
        title: 'Mushaf Al-Qur`an Standar',
        status: 'TASHIH_IN_PROGRESS',
        assignments: [
          {
            id: 'asg-1',
            iteration: 1,
            stage: 'INITIAL',
            status: 'COMPLETED',
            assignee: { name: 'Pentashih 1' },
            reviews: [{ id: 'rev-1', result: 'REVISION_REQUIRED', recap_file_id: 'recap-1', notes: 'Ada catatan pentashih yang tidak boleh diautofill' }],
            juz_items: [
              { id: 'j-1', juz_number: 1, result: 'REVISION_REQUIRED', notes: 'Ada catatan pentashih' },
            ],
          },
        ],
      },
    });

    const approveSpy = vi.spyOn(tashihApi, 'approveDistribution').mockResolvedValue({ success: true });

    render(<DistributorReviewDialog registrationId="reg-empty-notes" onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByText(/Reviu Hasil Sidang Pentashihan/i);

    // Label harus Opsional
    expect(screen.getByText('Opsional')).toBeInTheDocument();

    // Textarea harus kosong dan memiliki placeholder baru
    const textarea = screen.getByPlaceholderText(/Tambahkan catatan keputusan atau arahan dari Distributor \(opsional\)\.\.\./i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('');

    // Tombol simpan keputusan TIDAK disabled meskipun catatan kosong
    const submitBtn = screen.getByRole('button', { name: /Simpan Keputusan Distributor/i });
    expect(submitBtn).not.toBeDisabled();

    // Klik simpan keputusan
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('reg-empty-notes', expect.objectContaining({
        result: 'REVISION_REQUIRED',
        notes: '',
      }));
    });
  });

  it('menampilkan form keputusan tindak lanjut sejak awal saat masih ada pentashih berstatus Belum Selesai', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-incomplete',
        title: 'Mushaf Belum Selesai',
        status: 'TASHIH_IN_PROGRESS',
        assignments: [
          {
            id: 'asg-1',
            iteration: 1,
            stage: 'INITIAL',
            status: 'ASSIGNED',
            assignee: { name: 'Pentashih Belum Review' },
            reviews: [],
            juz_items: [{ id: 'j-1', juz_number: 1, result: null }],
          },
        ],
      },
    });

    render(<DistributorReviewDialog registrationId="reg-incomplete" onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByText(/Reviu Hasil Sidang Pentashihan/i);

    // 1. Teks pengingat kuning tidak lagi mengunci keputusan
    expect(screen.getByText(/Masih ada anggota tim pentashih yang belum menginputkan hasil telaah\. Pilih keputusan tindak lanjut di bawah jika Distributor ingin tetap memproses naskah\./i)).toBeInTheDocument();

    // 2. Form keputusan langsung tampil sejak awal dan aktif
    expect(screen.getByText(/Keputusan Tindak Lanjut Distributor/i)).toBeInTheDocument();
    const passRadio = screen.getByRole('radio', { name: /Loloskan Telaah & Alihkan ke Tahap Dumi/i });
    const revRadio = screen.getByRole('radio', { name: /Kembalikan ke Penerbit \(Perbaikan\)/i });
    expect(passRadio).toBeInTheDocument();
    expect(passRadio).not.toBeDisabled();
    expect(revRadio).toBeInTheDocument();
    expect(revRadio).not.toBeDisabled();

    // 3. Catatan keputusan distributor berlabel Opsional dan textarea dapat diisi
    expect(screen.getByText('Opsional')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/Tambahkan catatan keputusan atau arahan dari Distributor \(opsional\)\.\.\./i);
    expect(textarea).toBeInTheDocument();
  });

  it('menerapkan alur konfirmasi dua langkah (Simpan Keputusan -> Lanjutkan Menyimpan) saat ada pentashih belum selesai', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-two-step',
        title: 'Mushaf Two Step Override',
        status: 'TASHIH_IN_PROGRESS',
        assignments: [
          {
            id: 'asg-1',
            iteration: 1,
            stage: 'INITIAL',
            status: 'ASSIGNED',
            assignee: { name: 'Pentashih Pending' },
            reviews: [],
          },
        ],
      },
    });

    const approveSpy = vi.spyOn(tashihApi, 'approveDistribution').mockResolvedValue({ success: true });
    const onSuccess = vi.fn();

    render(<DistributorReviewDialog registrationId="reg-two-step" onClose={vi.fn()} onSuccess={onSuccess} />);

    await screen.findByText(/Reviu Hasil Sidang Pentashihan/i);

    // Tombol awal bertuliskan "Simpan Keputusan Distributor"
    const submitBtn = screen.getByRole('button', { name: /Simpan Keputusan Distributor/i });
    expect(submitBtn).toBeInTheDocument();

    // Kotak merah belum tampil
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Klik pertama
    fireEvent.click(submitBtn);

    // API belum dipanggil
    expect(approveSpy).not.toHaveBeenCalled();

    // Kotak peringatan merah muncul
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Konfirmasi Penyimpanan Sidang Belum Selesai/i)).toBeInTheDocument();
    expect(screen.getByText(/Masih ada penugasan pentashih yang belum selesai atau belum memiliki hasil sidang/i)).toBeInTheDocument();

    // Label tombol berubah menjadi "Lanjutkan Menyimpan"
    expect(screen.getByRole('button', { name: /Lanjutkan Menyimpan/i })).toBeInTheDocument();

    // Klik kedua
    fireEvent.click(screen.getByRole('button', { name: /Lanjutkan Menyimpan/i }));

    // API dipanggil dengan flag forceOverride dan allowIncompleteAssignments
    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('reg-two-step', expect.objectContaining({
        result: 'PASSED',
        forceOverride: true,
        allowIncompleteAssignments: true,
      }));
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('mereset kotak merah konfirmasi dan tombol saat distributor mengubah pilihan keputusan', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      success: true,
      data: {
        id: 'reg-reset-test',
        title: 'Mushaf Reset Test',
        status: 'TASHIH_IN_PROGRESS',
        assignments: [
          {
            id: 'asg-1',
            iteration: 1,
            stage: 'INITIAL',
            status: 'ASSIGNED',
            reviews: [],
          },
        ],
      },
    });

    render(<DistributorReviewDialog registrationId="reg-reset-test" onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByText(/Reviu Hasil Sidang Pentashihan/i);

    // Klik pertama memicu state konfirmasi override
    fireEvent.click(screen.getByRole('button', { name: /Simpan Keputusan Distributor/i }));
    expect(screen.getByText(/Konfirmasi Penyimpanan Sidang Belum Selesai/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lanjutkan Menyimpan/i })).toBeInTheDocument();

    // Ubah pilihan ke "Kembalikan ke Penerbit (Perbaikan)"
    const revRadio = screen.getByRole('radio', { name: /Kembalikan ke Penerbit \(Perbaikan\)/i });
    fireEvent.click(revRadio);

    // Kotak merah hilang dan tombol kembali menjadi "Simpan Keputusan Distributor"
    expect(screen.queryByText(/Konfirmasi Penyimpanan Sidang Belum Selesai/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Keputusan Distributor/i })).toBeInTheDocument();
  });
});

