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
});
