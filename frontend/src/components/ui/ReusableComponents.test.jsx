import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { PrimaryTaskCard } from './PrimaryTaskCard';
import { StatusSummary } from './StatusSummary';
import { SlaIndicator } from './SlaIndicator';
import { AssignedOfficer } from './AssignedOfficer';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { IconButton } from './IconButton';
import { FormField } from './FormField';
import { SearchField } from './SearchField';
import { Skeleton } from './Skeleton';
import { WorkflowTimeline } from '@/components/common/WorkflowTimeline';
import { ConfirmationSummaryDialog } from '@/components/common/ConfirmationSummaryDialog';
import { StickyActionBar } from '@/components/layout/StickyActionBar';

describe('Redesign UI/UX Reusable Components', () => {
  it('PageHeader merender judul, breadcrumbs, dan tombol aksi', () => {
    render(
      <MemoryRouter>
        <PageHeader
          breadcrumbs={[{ label: 'Portal', path: '/publisher' }, { label: 'Pengajuan' }]}
          title="Verifikasi Dokumen Naskah"
          subtitle="Daftar naskah dalam tahap pemeriksaan verifikator."
          actions={<button>Aksi Utama</button>}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Verifikasi Dokumen Naskah')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.getByText('Pengajuan')).toBeInTheDocument();
    expect(screen.getByText('Aksi Utama')).toBeInTheDocument();
  });

  it('PrimaryTaskCard merender tugas, pemilik tindakan, dan merespons klik CTA', () => {
    const handleAction = vi.fn();
    render(
      <PrimaryTaskCard
        title="Lengkapi Sampel Cover & Halaman 1-5"
        description="Naskah draf memerlukan unggahan berkas digital sebelum diajukan ke LPMQ."
        objectRef="REG-2026-001"
        ownerLabel="Penerbit"
        actionLabel="Unggah Berkas"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('Lengkapi Sampel Cover & Halaman 1-5')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Penerbit')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Unggah Berkas'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('StatusSummary merender status manusiawi dan langkah berikutnya', () => {
    render(
      <StatusSummary
        status="IN_VERIFICATION"
        slaText="Sisa 1 hari 12 jam"
      />
    );

    expect(screen.getByRole('heading', { name: 'Sedang Diverifikasi' })).toBeInTheDocument();
    expect(screen.getByText('Sisa 1 hari 12 jam')).toBeInTheDocument();
    expect(screen.getByText('Penanggung jawab saat ini:')).toBeInTheDocument();
  });

  it('SlaIndicator merender hitung mundur waktu dan peringatan jika lewat SLA', () => {
    const overdueTime = new Date(Date.now() - 3600000).toISOString();
    render(
      <SlaIndicator dueAt={overdueTime} targetDuration="2 hari" />
    );

    expect(screen.getByText(/Terlambat/i)).toBeInTheDocument();
  });

  it('WorkflowTimeline merender 8 fase proses resmi LPMQ', () => {
    render(<WorkflowTimeline currentStatus="IN_VERIFICATION" />);

    // Periksa bahwa 8 fase utama muncul
    expect(screen.getAllByText(/Pendaftaran/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Verifikasi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pembayaran/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Serah-terima/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pentashihan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Penerbitan STT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dokumentasi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Selesai/i).length).toBeGreaterThan(0);
  });

  it('WorkflowTimeline menampilkan revisi dan pembatalan sesuai status registrasi', () => {
    const { rerender } = render(<WorkflowTimeline currentStatus="REVISION_REQUIRED" />);
    expect(screen.getAllByText(/Perlu Perbaikan Berkas/i).length).toBeGreaterThan(0);
    rerender(<WorkflowTimeline currentStatus="CANCELLED" />);
    expect(screen.getAllByText(/Dibatalkan/i).length).toBeGreaterThan(0);
  });

  it('ConfirmationSummaryDialog merangkum rincian sebelum submit', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmationSummaryDialog
        isOpen={true}
        title="Setujui Hasil Verifikasi"
        description="Pastikan naskah telah memenuhi persyaratan administrasi."
        summaryItems={[
          { label: 'Nomor Registrasi', value: 'REG-2026-001' },
          { label: 'Keputusan', value: 'Lolos Verifikasi' },
        ]}
        impactMessage="Surat hasil telaah akan diterbitkan dan billing PNBP diterbitkan."
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Setujui Hasil Verifikasi')).toBeInTheDocument();
    expect(screen.getByText('REG-2026-001')).toBeInTheDocument();
    expect(screen.getByText(/billing PNBP diterbitkan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Lanjutkan'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('StickyActionBar merender aksi di footer tanpa overlapping', () => {
    render(
      <StickyActionBar
        statusMessage="Draf tersimpan otomatis"
        primaryAction={<button>Simpan & Ajukan</button>}
      />
    );

    expect(screen.getByText('Draf tersimpan otomatis')).toBeInTheDocument();
    expect(screen.getByText('Simpan & Ajukan')).toBeInTheDocument();
  });

  it('IconButton merender icon dengan accessible label dan merespons klik', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={<span data-testid="test-icon">icon</span>}
        label="Tutup Dialog"
        onClick={handleClick}
      />
    );

    const btn = screen.getByRole('button', { name: 'Tutup Dialog' });
    expect(btn).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('FormField menghubungkan label, input, error, dan hint secara aksesibel', () => {
    render(
      <FormField
        id="nama-naskah"
        label="Judul Naskah"
        hint="Gunakan judul lengkap sesuai cover."
        error="Judul naskah wajib diisi."
        required
      >
        <input type="text" />
      </FormField>
    );

    expect(screen.getByLabelText(/Judul Naskah/i)).toBeInTheDocument();
    expect(screen.getByText('Judul naskah wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    const input = screen.getByLabelText(/Judul Naskah/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('nama-naskah-error');
    expect(input.getAttribute('aria-describedby')).toContain('nama-naskah-hint');
  });

  it('SearchField merender input pencarian dengan clear button dan shortcut badge', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();

    const { rerender } = render(
      <SearchField
        value=""
        onChange={handleChange}
        placeholder="Cari naskah..."
        shortcut="Ctrl+K"
        onClear={handleClear}
      />
    );

    expect(screen.getByPlaceholderText('Cari naskah...')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();

    rerender(
      <SearchField
        value="Al-Baqarah"
        onChange={handleChange}
        placeholder="Cari naskah..."
        shortcut="Ctrl+K"
        onClear={handleClear}
      />
    );

    const clearBtn = screen.getByRole('button', { name: 'Bersihkan pencarian' });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('Skeleton merender placeholder loading dengan role presentation/aria-hidden', () => {
    const { container } = render(<Skeleton className="h-6 w-32" />);
    const el = container.firstChild;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toContain('animate-pulse');
  });
});

