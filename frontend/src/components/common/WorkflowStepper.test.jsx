import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowStepper, getActiveStageIndex, WORKFLOW_STAGES } from './WorkflowStepper';

describe('WorkflowStepper Component', () => {
  it('menghitung indeks tahapan aktif secara deterministik berdasarkan status', () => {
    expect(getActiveStageIndex('DRAFT')).toBe(1);
    expect(getActiveStageIndex('SUBMITTED')).toBe(1);
    expect(getActiveStageIndex('READY_FOR_VERIFICATION')).toBe(1);
    expect(getActiveStageIndex('VERIFICATION_ASSIGNED')).toBe(2);
    expect(getActiveStageIndex('IN_VERIFICATION')).toBe(2);
    expect(getActiveStageIndex('WAITING_VERIFICATION_APPROVAL')).toBe(3);
    expect(getActiveStageIndex('VERIFICATION_APPROVED')).toBe(3);
    expect(getActiveStageIndex('AWAITING_PAYMENT')).toBe(4);
    expect(getActiveStageIndex('PAYMENT_VERIFICATION')).toBe(4);
    expect(getActiveStageIndex('WAITING_DISTRIBUTION')).toBe(5);
    expect(getActiveStageIndex('WAITING_DISTRIBUTOR_RECEIPT')).toBe(5);
    expect(getActiveStageIndex('READY_FOR_PHYSICAL_HANDOVER')).toBe(5);
    expect(getActiveStageIndex('TASHIH_IN_PROGRESS')).toBe(6);
    expect(getActiveStageIndex('READY_FOR_STT')).toBe(7);
    expect(getActiveStageIndex('STT_ISSUED')).toBe(7);
    expect(getActiveStageIndex('COMPLETED')).toBe(8);
  });

  it('memperhitungkan assignmentStatus ketika registration status belum bermutasi', () => {
    // Saat assignment verifikasi berstatus WAITING_APPROVAL, stage harus maju ke 3 (Penetapan Hasil Verifikasi)
    expect(getActiveStageIndex('IN_VERIFICATION', 'WAITING_APPROVAL')).toBe(3);
    expect(getActiveStageIndex('IN_VERIFICATION', 'APPROVED')).toBe(3);
  });

  it('merender judul stepper resmi SOP LPMQ dan label tahapan aktif', () => {
    render(<WorkflowStepper currentStatus="IN_VERIFICATION" />);

    expect(screen.getByText(/Alur Proses & Siklus Layanan Pentashihan \(SOP LPMQ\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pemeriksaan Verifikator/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sedang Berjalan')).toBeInTheDocument();
    expect(screen.getByText(/dari 8/i)).toBeInTheDocument();
  });

  it('menampilkan badge status revisi saat REVISION_REQUIRED', () => {
    render(<WorkflowStepper currentStatus="REVISION_REQUIRED" />);

    expect(screen.getByText(/Status: Perlu Revisi Penerbit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Penetapan Hasil Verifikasi/i).length).toBeGreaterThanOrEqual(1);
  });

  it('merender seluruh 8 tahapan resmi dengan tooltip deskripsi', () => {
    render(<WorkflowStepper currentStatus="AWAITING_PAYMENT" />);

    WORKFLOW_STAGES.forEach((stage) => {
      expect(screen.getAllByText(stage.name).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('menerapkan kontras tinggi WCAG pada node tahapan aktif Sedang Berjalan (ikon putih murni + ring emas)', () => {
    const { container } = render(<WorkflowStepper currentStatus="IN_VERIFICATION" />);

    // Tahap 2 adalah tahapan aktif
    const stage2 = screen.getByTitle(WORKFLOW_STAGES[1].description);
    const activeCircle = stage2.querySelector('div');

    // Lingkaran aktif menggunakan latar hijau pekat, border emas, dan ring aksen emas
    expect(activeCircle).toHaveClass('bg-brand-800', 'text-white', 'border-civicGold-500');

    // Ikon di dalam lingkaran harus berwarna putih murni (bukan cokelat/emas redup pada latar hijau)
    const activeIcon = activeCircle.querySelector('svg');
    expect(activeIcon).toHaveClass('text-white', 'animate-pulse');
    expect(activeIcon).not.toHaveClass('text-civicGold-700');

    // Badge Sedang Berjalan menggunakan token resmi civicGold
    const badge = screen.getByText('Sedang Berjalan');
    expect(badge).toHaveClass('text-civicGold-700', 'bg-civicGold-100');
  });

  it('menerapkan styling kontras tinggi yang jelas untuk tahapan selesai, revisi, dan batal', () => {
    // 1. Periksa tahap yang sudah selesai (Tahap 1 saat aktif Tahap 2)
    const { rerender } = render(<WorkflowStepper currentStatus="IN_VERIFICATION" />);
    const stage1 = screen.getByTitle(WORKFLOW_STAGES[0].description);
    const pastCircle = stage1.querySelector('div');
    expect(pastCircle).toHaveClass('bg-brand-700', 'text-white', 'border-brand-700');
    expect(pastCircle.querySelector('svg')).toHaveClass('text-white');

    // Tahap masa depan (Tahap 3 saat aktif Tahap 2)
    const stage3 = screen.getByTitle(WORKFLOW_STAGES[2].description);
    const futureCircle = stage3.querySelector('div');
    expect(futureCircle).toHaveClass('bg-surface', 'text-ink-muted', 'border-line-strong');

    // 2. Periksa tahapan saat status REVISION_REQUIRED
    rerender(<WorkflowStepper currentStatus="REVISION_REQUIRED" />);
    expect(screen.getByText('Perlu Revisi')).toBeInTheDocument();
    const revStage = screen.getByTitle(WORKFLOW_STAGES[2].description);
    const revCircle = revStage.querySelector('div');
    expect(revCircle).toHaveClass('bg-civic-warning', 'text-white', 'border-civic-warning');
    expect(revCircle.querySelector('svg')).toHaveClass('text-white');

    // 3. Periksa tahapan saat status CANCELLED
    rerender(<WorkflowStepper currentStatus="CANCELLED" />);
    expect(screen.getByText('Dibatalkan')).toBeInTheDocument();
    const cancelStage = screen.getByTitle(WORKFLOW_STAGES[0].description);
    const cancelCircle = cancelStage.querySelector('div');
    expect(cancelCircle).toHaveClass('bg-civic-danger', 'text-white', 'border-civic-danger');
    expect(cancelCircle.querySelector('svg')).toHaveClass('text-white');
  });
});
