import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DistributorReviewDialog } from './DistributorReviewDialog';
import * as AuthContextModule from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { tashihApi } from '@/api/tashih.api';

// Langkah 1 "Selesai" -> langkah 2 pilih kartu kirim -> tombol submit.
const SEND = /Simpan Keputusan Distributor|Kirim ke Pemaraf/i;
const finishAndSend = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Selesai' }));
  fireEvent.click(screen.getAllByRole('button', { name: SEND }).find((b) => b.hasAttribute('aria-pressed')));
  const submit = screen.getAllByRole('button', { name: SEND }).find((b) => b.getAttribute('type') === 'submit');
  expect(submit).not.toBeDisabled();
  fireEvent.click(submit);
};

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

    finishAndSend();

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

    finishAndSend();

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

    const selesai = await screen.findByRole('button', { name: 'Selesai' });
    expect(screen.getByText('Dilepas')).toBeInTheDocument();
    expect(screen.getByText(/Pentashih cuti dinas/)).toBeInTheDocument();
    expect(screen.queryByText(/Sidang Belum Selesai Seluruhnya/i)).not.toBeInTheDocument();
    expect(selesai).not.toBeDisabled();
    fireEvent.click(selesai);
    fireEvent.click(screen.getByRole('button', { name: SEND }));
    expect(screen.getByText(/Keputusan Tindak Lanjut Distributor/i)).toBeInTheDocument();
  });
  it('Selesai membuka tampilan tindak lanjut: Sidang Kembali membuka pemilihan pekan tanpa mengirim keputusan', async () => {
    const reg = {
      id: 'reg-week', title: 'Mushaf Pekan', status: 'TASHIH_IN_PROGRESS', official_documents: [],
      assignments: [{ id: 'asg-1', iteration: 1, stage: 'INITIAL', status: 'COMPLETED', reviews: [{ id: 'rev-1', result: 'PASSED', recap_file_id: 'file-1' }] }],
    };
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({ success: true, data: reg });
    const approveSpy = vi.spyOn(tashihApi, 'approveDistribution').mockResolvedValue({ success: true });
    const onAddWeek = vi.fn();

    render(<DistributorReviewDialog registrationId="reg-week" onClose={vi.fn()} onSuccess={vi.fn()} onAddWeek={onAddWeek} />);

    // Langkah 1: tinjau hasil sidang saja, tanpa keputusan dan tanpa tombol kirim
    const selesai = await screen.findByRole('button', { name: 'Selesai' });
    expect(screen.queryByText(/Keputusan Tindak Lanjut Distributor/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: SEND })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sidang Kembali/i })).not.toBeInTheDocument();

    // Langkah 2: dua kartu tindak lanjut
    fireEvent.click(selesai);
    expect(screen.getByText(/Tindak Lanjut Sidang/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SEND })).toHaveAttribute('aria-pressed', 'false');
    // Keputusan & catatan hanya ada di jalur Kirim ke Pemaraf
    expect(screen.queryByText(/Keputusan Tindak Lanjut Distributor/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sidang Kembali/i }));
    expect(onAddWeek).toHaveBeenCalledWith(expect.objectContaining({ id: 'reg-week' }));
    expect(approveSpy).not.toHaveBeenCalled();

    // Kembali ke langkah 1 tetap mungkin
    fireEvent.click(screen.getByRole('button', { name: 'Kembali' }));
    expect(screen.getByRole('button', { name: 'Selesai' })).toBeInTheDocument();
  });

  it('tanpa onAddWeek, langkah tindak lanjut hanya menawarkan kirim keputusan', async () => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({ success: true, data: {
      id: 'reg-x', title: 'Mushaf X', status: 'TASHIH_IN_PROGRESS', official_documents: [],
      assignments: [{ id: 'asg-1', iteration: 1, stage: 'INITIAL', status: 'COMPLETED', reviews: [{ id: 'rev-1', result: 'PASSED', recap_file_id: 'file-1' }] }],
    } });
    render(<DistributorReviewDialog registrationId="reg-x" onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Selesai' }));
    expect(screen.getByRole('button', { name: SEND })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sidang Kembali/i })).not.toBeInTheDocument();
  });
});

