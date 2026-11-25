import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ManualTeamAssignmentDialog, QUICK_PRESETS } from './ManualTeamAssignmentDialog';
import { registrationApi } from '@/api/registration.api';
import * as QueueApiModule from '@/api/queue.api';
import { masterApi } from '@/api/master.api';
import * as AuthContextModule from '@/features/auth/AuthContext';

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
    const invalidateSpy = vi.spyOn(QueueApiModule, 'invalidateQueueCounts');
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
    expect(invalidateSpy).toHaveBeenCalledOnce();
    invalidateSpy.mockRestore();
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

  it('only highlights exactly one group preset button when selected and correctly assigns Juz 16-30', async () => {
    const assigned = vi.fn();
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={assigned} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });

    const btnFull = screen.getAllByRole('button', { name: 'Juz 1–30 (Penuh)' })[0];
    const btn1630 = screen.getAllByRole('button', { name: 'Juz 16–30 (15 Juz)' })[0];

    // Secara default / saat Juz 1-30 aktif, hanya tombol Juz 1-30 yang memiliki style aktif (bg-brand-700)
    expect(btnFull).toHaveClass('bg-brand-700');
    expect(btn1630).not.toHaveClass('bg-brand-700');

    // Klik tombol Juz 16-30 (15 Juz)
    fireEvent.click(btn1630);

    // Sekarang hanya tombol Juz 16-30 yang aktif, tombol Juz 1-30 tidak boleh aktif
    expect(btn1630).toHaveClass('bg-brand-700');
    expect(btnFull).not.toHaveClass('bg-brand-700');

    // Pastikan seluruh anggota tim mendapatkan juz 16 s.d. 30
    fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));
    const expectedJuz1630 = Array.from({ length: 15 }, (_, i) => i + 16);
    await waitFor(() => expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', {
      team_id: 't1',
      allow_overlap: true,
      juz_assignments: [
        { assignee_id: 'u1', juz_numbers: expectedJuz1630 },
        { assignee_id: 'u2', juz_numbers: expectedJuz1630 },
      ],
      stage: 'INITIAL',
    }));
    expect(assigned).toHaveBeenCalledOnce();
  });

  it('verifies all 13 group presets activate exclusively one by one and populate inputs and badge accurately', async () => {
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });

    const container = screen.getByTestId('group-presets-container');
    const badge = screen.getByTestId('group-range-badge');
    const inputFrom = screen.getByLabelText('Dari Juz Kelompok');
    const inputTo = screen.getByLabelText('Sampai Juz Kelompok');

    expect(QUICK_PRESETS).toHaveLength(13);

    for (const preset of QUICK_PRESETS) {
      const targetButton = within(container).getByRole('button', { name: preset.label });
      fireEvent.click(targetButton);

      // Pastikan dari seluruh 13 tombol, HANYA 1 tombol yang memiliki class aktif (bg-brand-700)
      const allButtons = within(container).getAllByRole('button');
      const activeButtons = allButtons.filter(b => b.classList.contains('bg-brand-700'));
      expect(activeButtons).toHaveLength(1);
      expect(activeButtons[0]).toHaveTextContent(preset.label);
      expect(targetButton).toHaveAttribute('aria-pressed', 'true');

      // Pastikan badge di kanan atas menampilkan format range yang tepat
      const expectedCount = preset.to - preset.from + 1;
      expect(badge).toHaveTextContent(`Juz ${preset.from} s.d. ${preset.to} (${expectedCount} Juz)`);

      // Pastikan input custom terisi angka yang tepat
      expect(inputFrom).toHaveValue(preset.from);
      expect(inputTo).toHaveValue(preset.to);
    }

    // Verifikasi rentang kustom yang tidak ada di preset (misal 2 s.d. 18): tidak boleh ada tombol preset yang aktif
    fireEvent.change(inputFrom, { target: { value: '2' } });
    fireEvent.change(inputTo, { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan ke Seluruh Anggota' }));

    const activeAfterCustom = within(container).getAllByRole('button').filter(b => b.classList.contains('bg-brand-700'));
    expect(activeAfterCustom).toHaveLength(0);
    expect(badge).toHaveTextContent('Juz 2 s.d. 18 (17 Juz)');

    // Verifikasi bila input kustom diisi 11 s.d. 20 lalu diterapkan: hanya tombol Juz 11–20 (10 Juz) yang aktif (bukan Juz 1–20)
    fireEvent.change(inputFrom, { target: { value: '11' } });
    fireEvent.change(inputTo, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan ke Seluruh Anggota' }));

    const active11to20 = within(container).getAllByRole('button').filter(b => b.classList.contains('bg-brand-700'));
    expect(active11to20).toHaveLength(1);
    expect(active11to20[0]).toHaveTextContent('Juz 11–20 (10 Juz)');
    expect(badge).toHaveTextContent('Juz 11 s.d. 20 (10 Juz)');
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

  it('pentashih yang dipilih di satu pekan tidak ikut ke pekan lain, dan pilihan pekan semula dipulihkan', async () => {
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    fireEvent.click(screen.getByRole('button', { name: /^Januari/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));
    fireEvent.click(screen.getByRole('button', { name: /Pentashih Pribadi/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pentashih satu' }));
    expect(screen.getByRole('checkbox', { name: 'Pentashih satu' })).toBeChecked();

    // Buka Pekan 2 langsung: mulai kosong, pentashih Pekan 1 tidak terbawa
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 2' }));
    expect(screen.getByRole('button', { name: 'Pekan 2' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Pentashih Pribadi/i }));
    expect(screen.getByRole('checkbox', { name: 'Pentashih satu' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pentashih dua' }));

    // Kembali ke Pekan 1: pilihannya sendiri dipulihkan
    fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));
    expect(screen.getByRole('checkbox', { name: 'Pentashih satu' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pentashih dua' })).not.toBeChecked();
  });

  it('menyembunyikan form sampai card pekan dibuka, dan menutupnya hanya setelah konfirmasi', async () => {
    render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    await screen.findByText('Naskah siap distribusi');
    expect(screen.queryByText('Skema Penugasan Pentashih')).not.toBeInTheDocument();
    // awalnya hanya 12 card bulan; pekan baru muncul setelah bulannya dipilih
    expect(screen.queryByRole('button', { name: /^Pekan/ })).not.toBeInTheDocument();
    expect(screen.getByText('Pilih Bulan').nextSibling.querySelectorAll('button')).toHaveLength(12);
    // card bulan tanpa tahun; tahun dipilih lewat dropdown dan tampil di judul bulan yang dibuka
    const nextYear = new Date().getFullYear() + 1;
    fireEvent.click(screen.getByRole('button', { name: 'Pilih Tahun' }));
    fireEvent.click(screen.getByRole('button', { name: String(nextYear + 1) }));
    expect(screen.queryByRole('group', { name: 'Daftar tahun' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tahun sebelumnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maret' }));
    expect(screen.getByRole('region', { name: `Maret ${nextYear}` })).toBeInTheDocument();
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

  describe('B-23: SLA Pentashihan Ditentukan Distributor', () => {
    it('B23-T2: Distributor menetapkan due_at <= max_due dan dikirim ke server', async () => {
      vi.spyOn(registrationApi, 'getAssignmentSla').mockResolvedValue({
        data: {
          stage: 'INITIAL',
          start_date: '2026-11-16T08:00:00.000Z',
          sla_days: 22,
          max_due_at: '2026-12-16T16:00:00.000Z',
          service_name: "Mushaf Al-Qur'an Standar Kemenag",
          basis_info: '22 Hari Kerja (Penugasan Awal)',
        },
      });

      render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
      await screen.findByText('Naskah siap distribusi');
      fireEvent.click(screen.getByRole('button', { name: /^Januari/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

      // SLA banner tampil
      expect(screen.getByText(/Batas Maksimal: 22 Hari Kerja/i)).toBeInTheDocument();
      const dateInput = screen.getByLabelText(/Tanggal Target Selesai Pentashihan/i);
      expect(dateInput).toHaveValue('2026-12-16');

      // Ubah tanggal menjadi lebih cepat (misal 2026-12-10)
      fireEvent.change(dateInput, { target: { value: '2026-12-10' } });

      fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));

      await waitFor(() => {
        expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', expect.objectContaining({
          team_id: 't1',
          due_at: '2026-12-10',
          stage: 'INITIAL',
        }));
      });
    });

    it('B23-T3: Distributor dicegah memilih due_at melebihi max_due', async () => {
      vi.spyOn(registrationApi, 'getAssignmentSla').mockResolvedValue({
        data: {
          stage: 'INITIAL',
          start_date: '2026-11-16T08:00:00.000Z',
          sla_days: 22,
          max_due_at: '2026-12-16T16:00:00.000Z',
          service_name: "Mushaf Al-Qur'an Standar Kemenag",
          basis_info: '22 Hari Kerja',
        },
      });

      render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
      await screen.findByText('Naskah siap distribusi');
      fireEvent.click(screen.getByRole('button', { name: /^Januari/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

      const dateInput = screen.getByLabelText(/Tanggal Target Selesai Pentashihan/i);
      fireEvent.change(dateInput, { target: { value: '2026-12-25' } });

      fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/tidak boleh melebihi batas maksimal SLA/i);
      expect(registrationApi.createAssignments).not.toHaveBeenCalled();
    });

    it('B23-T4: Superadmin dapat override due_at melebihi max_due dengan alasan perpanjangan', async () => {
      vi.spyOn(AuthContextModule, 'useOptionalAuth').mockReturnValue({
        currentUser: { id: 'sa-1', name: 'Super Admin', roles: ['SUPERADMIN'] },
      });

      vi.spyOn(registrationApi, 'getAssignmentSla').mockResolvedValue({
        data: {
          stage: 'INITIAL',
          start_date: '2026-11-16T08:00:00.000Z',
          sla_days: 22,
          max_due_at: '2026-12-16T16:00:00.000Z',
          service_name: "Mushaf Al-Qur'an Standar Kemenag",
          basis_info: '22 Hari Kerja',
        },
      });

      render(<ManualTeamAssignmentDialog id="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
      await screen.findByText('Naskah siap distribusi');
      fireEvent.click(screen.getByRole('button', { name: /^Januari/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Pekan 1' }));

      const dateInput = screen.getByLabelText(/Tanggal Target Selesai Pentashihan/i);
      fireEvent.change(dateInput, { target: { value: '2026-12-25' } });

      // Field alasan perpanjangan muncul untuk superadmin
      const reasonInput = await screen.findByLabelText(/Alasan Perpanjangan Tenggat Waktu/i);
      fireEvent.change(reasonInput, { target: { value: 'Perpanjangan karena mushaf memiliki 30 juz kaligrafi khusus dan ornamen rumit' } });

      fireEvent.change(screen.getByRole('combobox', { name: 'Kelompok Kerja Pentashihan' }), { target: { value: 't1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Tetapkan penugasan' }));

      await waitFor(() => {
        expect(registrationApi.createAssignments).toHaveBeenCalledWith('r1', expect.objectContaining({
          team_id: 't1',
          due_at: '2026-12-25',
          due_override_reason: 'Perpanjangan karena mushaf memiliki 30 juz kaligrafi khusus dan ornamen rumit',
          stage: 'INITIAL',
        }));
      });
    });
  });
});
