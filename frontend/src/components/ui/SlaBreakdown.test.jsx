import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlaBreakdown } from './SlaBreakdown';
import { PublisherRegistrationCard } from '@/features/registrations/PublisherRegistrationCard';
import { MemoryRouter } from 'react-router-dom';

describe('B-21 & B-23: SlaBreakdown Component', () => {
  it('B21-T8: Compact mode displays "Verifikasi: maks. 2 HK" without fallback 59', () => {
    render(<SlaBreakdown status="READY_FOR_VERIFICATION" compact />);
    expect(screen.getByText('Verifikasi: maks. 2 HK')).toBeInTheDocument();
    expect(screen.queryByText(/59/)).not.toBeInTheDocument();
  });

  it('B21-T9: Compact mode displays pentashihan days when snapshot exists', () => {
    const snapshot = {
      sla_initial_days: 43,
      sla_revision_days: 27,
      sla_dummy_days: 19,
    };
    render(<SlaBreakdown snapshot={snapshot} status="WAITING_DISTRIBUTION" compact />);
    expect(screen.getByText('SLA Awal: 43 HK')).toBeInTheDocument();
  });

  it('B21-T9: Full breakdown renders all 4 stages', () => {
    const snapshot = {
      sla_initial_days: 43,
      sla_revision_days: 27,
      sla_dummy_days: 19,
    };
    render(<SlaBreakdown snapshot={snapshot} status="WAITING_DISTRIBUTION" />);
    expect(screen.getByText('Maks. 2 HK')).toBeInTheDocument();
    expect(screen.getByText('43 HK')).toBeInTheDocument();
    expect(screen.getByText('27 HK')).toBeInTheDocument();
    expect(screen.getByText('19 HK')).toBeInTheDocument();
  });

  it('B21-T8: PublisherRegistrationCard never renders arbitrary 59', () => {
    const registration = {
      id: 'reg-123',
      title: "Mushaf Al-Qur'an Standar Indonesia",
      status: 'VERIFICATION_ASSIGNED',
      service_type: { name: 'Reguler' },
      fee_sla_snapshot: null, // No snapshot yet
    };

    render(
      <MemoryRouter>
        <PublisherRegistrationCard registration={registration} />
      </MemoryRouter>
    );

    expect(screen.getByText('Verifikasi: maks. 2 HK')).toBeInTheDocument();
    expect(screen.queryByText(/59/)).not.toBeInTheDocument();
  });

  it('B23-T10: Renders active pentashihan deadline when activeDueAt is provided', () => {
    const snapshot = {
      sla_initial_days: 22,
    };
    render(
      <SlaBreakdown
        snapshot={snapshot}
        status="TASHIH_IN_PROGRESS"
        activeDueAt="2026-12-16T16:00:00.000Z"
      />
    );
    expect(screen.getByText(/Tenggat Waktu Sidang Berjalan/i)).toBeInTheDocument();
  });
});
