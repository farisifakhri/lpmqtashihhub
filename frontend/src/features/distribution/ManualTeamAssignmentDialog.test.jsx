import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualTeamAssignmentDialog } from './ManualTeamAssignmentDialog';
import { registrationApi } from '@/api/registration.api';
import { masterApi } from '@/api/master.api';

describe('Manual team assignment (B-05)', () => {
  beforeEach(() => {
    vi.spyOn(registrationApi, 'getDetail').mockResolvedValue({
      data: {
        id: 'r1',
        registration_no: 'REG-01',
        title: 'Naskah siap distribusi',
        status: 'WAITING_DISTRIBUTION',
        registration_type: 'NEW',
        assignments: [],
        payment_records: [{ status: 'VERIFIED' }],
      },
    });
    vi.spyOn(masterApi, 'getDistributionTeams').mockResolvedValue({
      data: [
        {
          id: 't1',
          name: 'Kelompok Reguler',
          decree_no: 'NOMOR-01',
          status: 'ACTIVE',
          active_from: '2026-01-01',
          members: [
            {
              user_id: 'u1',
              status: 'ACTIVE',
              user: { name: 'Pentashih satu', nip: '19800101', status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] },
            },
            {
              user_id: 'u2',
              status: 'ACTIVE',
              user: { name: 'Pentashih dua', nip: '19800102', status: 'ACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] },
            },
            {
              user_id: 'u3',
              status: 'ACTIVE',
              user: { name: 'Petugas bukan pentashih', status: 'ACTIVE', roles: [{ role: { code: 'VERIFIKATOR' } }] },
            },
            {
              user_id: 'u4',
              status: 'ACTIVE',
              user: { name: 'Pentashih nonaktif', status: 'INACTIVE', roles: [{ role: { code: 'PENTASHIH' } }] },
            },
          ],
        },
      ],
    });
    vi.spyOn(masterApi, 'getPentashihCandidates').mockResolvedValue({
      data: [
        { id: 'u1', name: 'Pentashih satu', nip: '19800101', email: 'satu@example.com', active_assignments_count: 0 },
        { id: 'u2', name: 'Pentashih dua', nip: '19800102', email: 'dua@example.com', active_assignments_count: 1 },
      ],
    });
    vi.spyOn(registrationApi, 'createAssignments').mockResolvedValue({ data: [] });
  });

  it('automatically checks all active team members upon team selection and allows unchecking absent members', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();

    // Pastikan tidak ada istilah SK pada label
    expect(screen.queryByLabelText(/tim dengan sk/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });

    expect(screen.queryByText('Petugas bukan pentashih')).not.toBeInTheDocument();
    expect(screen.queryByText('Pentashih nonaktif')).not.toBeInTheDocument();

    // Sesuai alur baru: Setelah memilih tim, semua anggota aktif otomatis tercentang
    const checkSatu = screen.getByRole('checkbox', { name: 'Pentashih satu' });
    const checkDua = screen.getByRole('checkbox', { name: 'Pentashih dua' });
    expect(checkSatu).toBeChecked();
    expect(checkDua).toBeChecked();

    // Hapus centang pentashih dua (karena tidak hadir)
    fireEvent.click(checkDua);
    expect(checkDua).not.toBeChecked();

    // Tetapkan penugasan untuk pentashih satu yang hadir
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));

    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', {
      team_id: 't1',
      juz_assignments: [{ assignee_id: 'u1', juz_numbers: Array.from({ length: 30 }, (_, i) => i + 1) }],
      stage: 'INITIAL',
    }));
    expect(assigned).toHaveBeenCalledOnce();
  });

  it('supports assigning group and individual juz range using quick preset buttons', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });

    // Preset grup Juz 1-20
    const presetButtons = screen.getAllByRole('button', { name: 'Juz 1–20 (20 Juz)' });
    fireEvent.click(presetButtons[0]);

    expect(screen.getAllByText(/Juz 1 s.d. 20 \(20 Juz\)/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', {
      team_id: 't1',
      allow_overlap: true,
      juz_assignments: [
        { assignee_id: 'u1', juz_numbers: Array.from({ length: 20 }, (_, i) => i + 1) },
        { assignee_id: 'u2', juz_numbers: Array.from({ length: 20 }, (_, i) => i + 1) },
      ],
      stage: 'INITIAL',
    }));
    expect(assigned).toHaveBeenCalledOnce();
  });

  it('supports assigning individual pentashih without team', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

    // Beralih ke skema Pentashih Pribadi (Mandiri)
    fireEvent.click(screen.getByRole('button', { name: /Pentashih Pribadi/i }));

    const checkSatu = screen.getByRole('checkbox', { name: 'Pentashih satu' });
    fireEvent.click(checkSatu);
    expect(checkSatu).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', {
      is_individual: true,
      juz_assignments: [{ assignee_id: 'u1', juz_numbers: Array.from({ length: 30 }, (_, i) => i + 1) }],
      stage: 'INITIAL',
    }));
    expect(assigned).toHaveBeenCalledOnce();
  });

  it('filters pentashih with search box', async () => {
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
    expect(screen.getByText('Pentashih satu')).toBeInTheDocument();
    expect(screen.getByText('Pentashih dua')).toBeInTheDocument();

    // Filter pencarian "dua"
    fireEvent.change(screen.getByPlaceholderText(/Cari berdasarkan nama/i), { target: { value: 'dua' } });
    expect(screen.queryByText('Pentashih satu')).not.toBeInTheDocument();
    expect(screen.getByText('Pentashih dua')).toBeInTheDocument();
  });

  it('does not let ADMIN_INTERNAL skip verification or payment prerequisites', async () => {
    registrationApi.getDetail.mockResolvedValue({ data: { status: 'READY_FOR_VERIFICATION', title: 'Belum siap', payment_records: [] } });
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Belum siap');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));
    expect(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tetapkan penugasan' })).toBeDisabled();
    expect(registrationApi.createAssignments).not.toHaveBeenCalled();
  });

  it('shows server concurrency errors without silently claiming success', async () => {
    registrationApi.createAssignments.mockRejectedValue(new Error('Status pengajuan telah berubah'));
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Status pengajuan telah berubah');
  });

  it('catatan telaah pembanding distributor opsional saat penugasan naskah revisi: boleh dilewati, terkirim bila diisi (B-19a)', async () => {
    registrationApi.getDetail.mockResolvedValue({
      data: {
        id: 'r-rev',
        status: 'WAITING_DISTRIBUTION',
        title: 'Naskah Revisi Masuk',
        payment_records: [{ status: 'VERIFIED' }],
        official_documents: [{ id: 'doc-1', document_type: 'REVISION_RETURN_LETTER' }],
        publisher_revision_recaps: [{ id: 'prr-1', round_number: 1 }],
      },
    });

    render(<ManualTeamAssignmentDialog id="r-rev" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah Revisi Masuk');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ })); // pilih bulan dulu
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

    // Section telaah pembanding ditampilkan
    expect(screen.getByText(/Catatan Telaah Pembanding Naskah Masuk/i)).toBeInTheDocument();

    // Pilih tim t1
    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });

    // Submit tanpa catatan pembanding tetap diterima, tanpa field comparison_notes
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledTimes(1));
    expect(registrationApi.createAssignments.mock.calls[0][1]).not.toHaveProperty('comparison_notes');

    // Bila diisi, catatan ikut terkirim
    const textarea = screen.getByPlaceholderText(/Tuliskan analisis perbandingan/i);
    fireEvent.change(textarea, { target: { value: 'Naskah revisi ronde 1 telah dibandingkan dengan catatan sidang sebelumnya.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    await waitFor(() => {
      expect(registrationApi.createAssignments).toHaveBeenCalledWith('r-rev', expect.objectContaining({
        comparison_notes: 'Naskah revisi ronde 1 telah dibandingkan dengan catatan sidang sebelumnya.',
      }));
    });
  });

  it('menyembunyikan form sampai card pekan dibuka, dan menutupnya hanya setelah konfirmasi', async () => {
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    expect(screen.queryByText('Skema Penugasan Pentashih')).not.toBeInTheDocument();
    // awalnya hanya 12 card bulan; pekan baru muncul setelah bulannya dipilih
    expect(screen.queryByRole('button', { name: /^Pekan/ })).not.toBeInTheDocument();
    expect(screen.getByText('Pilih Bulan').nextSibling.querySelectorAll('button')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /^Maret/ }));
    expect(screen.getAllByRole('button', { name: /^Pekan [1-5]$/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Ganti bulan' }));
    fireEvent.click(screen.getByRole('button', { name: /^Maret/ }));

    const pekan2 = screen.getByRole('button', { name: 'Pekan 2' });
    fireEvent.click(pekan2);
    expect(screen.getByText('Skema Penugasan Pentashih')).toBeInTheDocument();

    fireEvent.click(pekan2);
    fireEvent.click(screen.getByRole('button', { name: 'Tetap buka' }));
    expect(screen.getByText('Skema Penugasan Pentashih')).toBeInTheDocument();

    fireEvent.click(pekan2);
    fireEvent.click(screen.getByRole('button', { name: 'Ya, tutup' }));
    expect(screen.queryByText('Skema Penugasan Pentashih')).not.toBeInTheDocument();
  });
});
