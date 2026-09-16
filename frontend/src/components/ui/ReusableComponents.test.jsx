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
});

