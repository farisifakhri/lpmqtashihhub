import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewProgressPanel } from './ReviewProgressPanel';

describe('ReviewProgressPanel Component', () => {
  const dummyInProgressReg = {
    id: 'reg-001',
    registration_no: 'REG-202611-0007',
    title: 'Mushaf Syuhada',
    publisher: { legal_name: 'PT Mushaf Berkah' },
    service_type: { name: 'Mushaf Al-Qur\'an Tajwid Warna/Kode Tajwid' },
    assigned_distributor: {
      id: 'dist-1',
      name: 'Ahmad Fauzi, S.Kom',
      role_label: 'Distributor',
    },
    sla: {
      elapsed_working_days: 2,
      target_working_days: 5,
      due_at: '2026-11-26T16:00:00.000Z',
      sla_status: 'ON_TIME',
      sla_status_label: 'Tepat Waktu',
    },
    assignments: [
      {
        id: 'assign-1',
        status: 'COMPLETED',
        iteration: 1,
        assignee: { name: 'H. Mustopa, M.Si' },
        reviews: [{ result: 'PASSED' }],
      },
      {
        id: 'assign-2',
        status: 'COMPLETED',
        iteration: 1,
        assignee: { name: 'Alvita Eka Rahmah, S.Ag' },
        reviews: [{ result: 'REVISION_REQUIRED' }],
      },
      {
        id: 'assign-3',
        status: 'REVOKED',
        iteration: 1,
        assignee: { name: 'Bagas Aji Handriyan, S.Ag' },
        reviews: [],
      },
    ],
  };

  it('merender kartu naskah lengkap dengan distributor, informasi SLA, dan status badge', () => {
    render(
      <ReviewProgressPanel
        distLoading={false}
        waitingDistRegistrations={[]}
        inProgressRegistrations={[dummyInProgressReg]}
        fetchDistributionData={vi.fn()}
        setReviewDialogRegId={vi.fn()}
        onRevokePentashih={vi.fn()}
        canAssign={() => false}
        onStartAssignment={vi.fn()}
      />
    );

    // Badges & title
    expect(screen.getByText('REG-202611-0007')).toBeInTheDocument();
    expect(screen.getByText('Mushaf Syuhada')).toBeInTheDocument();
    expect(screen.getByText(/PT Mushaf Berkah/)).toBeInTheDocument();

    // Distributor info
    expect(screen.getByText('Ahmad Fauzi, S.Kom')).toBeInTheDocument();
    expect(screen.getAllByText('Distributor').length).toBeGreaterThan(0);

    // SLA info & formatted date
    expect(screen.getByText(/2 dari 5 hari/i)).toBeInTheDocument();
    expect(screen.getByText(/26 Nov 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Tepat Waktu')).toBeInTheDocument();

    // Action button
    expect(screen.getByRole('button', { name: /Reviu Hasil Sidang/i })).toBeInTheDocument();
  });

  it('mengendalikan accordion Anggota Sidang (default tertutup, membuka saat diklik)', () => {
    render(
      <ReviewProgressPanel
        distLoading={false}
        waitingDistRegistrations={[]}
        inProgressRegistrations={[dummyInProgressReg]}
        fetchDistributionData={vi.fn()}
        setReviewDialogRegId={vi.fn()}
        onRevokePentashih={vi.fn()}
        canAssign={() => false}
        onStartAssignment={vi.fn()}
      />
    );

    // Default collapsed: pentashih names are not visible
    expect(screen.queryByText('H. Mustopa, M.Si')).not.toBeInTheDocument();
    expect(screen.queryByText('Alvita Eka Rahmah, S.Ag')).not.toBeInTheDocument();

    // Click accordion header to expand
    const accordionBtn = screen.getByRole('button', { name: /Anggota Sidang/i });
    fireEvent.click(accordionBtn);

    // Now expanded: names and status indicators are shown
    expect(screen.getByText('H. Mustopa, M.Si')).toBeInTheDocument();
    expect(screen.getByText('Alvita Eka Rahmah, S.Ag')).toBeInTheDocument();
    expect(screen.getByText(/Bagas Aji Handriyan, S.Ag \(Dicabut\)/i)).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(accordionBtn);
    expect(screen.queryByText('H. Mustopa, M.Si')).not.toBeInTheDocument();
  });

  it('merender fallback Belum ditentukan jika distributor belum ada', () => {
    const regWithoutDist = {
      ...dummyInProgressReg,
      id: 'reg-002',
      assigned_distributor: null,
      distributor: null,
      core_distributor: null,
      sla: {
        elapsed_working_days: 6,
        target_working_days: 5,
        due_at: '2026-11-20T16:00:00.000Z',
        sla_status: 'OVERDUE',
        sla_status_label: 'Terlambat',
      },
    };

    render(
      <ReviewProgressPanel
        distLoading={false}
        waitingDistRegistrations={[]}
        inProgressRegistrations={[regWithoutDist]}
        fetchDistributionData={vi.fn()}
        setReviewDialogRegId={vi.fn()}
        onRevokePentashih={vi.fn()}
        canAssign={() => false}
        onStartAssignment={vi.fn()}
      />
    );

    expect(screen.getByText('Belum ditentukan')).toBeInTheDocument();
    expect(screen.getByText('Terlambat')).toBeInTheDocument();
  });
});
