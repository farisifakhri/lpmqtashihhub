import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { WorkflowPhaseStatus } from './WorkflowPhaseStatus';

describe('WorkflowPhaseStatus', () => {
  it('menunjukkan status setiap fase sesuai tahap penugasan', () => {
    render(<WorkflowPhaseStatus registration={{ status: 'VERIFICATION_ASSIGNED' }} />);
    const phases = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(phases).toHaveLength(8);
    expect(phases[0]).toHaveTextContent('Sudah dilalui');
    expect(phases[1]).toHaveAttribute('aria-current', 'step');
    expect(phases[1]).toHaveTextContent('Verifikator Ditugaskan');
    expect(phases[2]).toHaveTextContent('Belum dimulai');
  });

  it('menempatkan perbaikan sidang pada fase pentashihan', () => {
    render(<WorkflowPhaseStatus registration={{ status: 'REVISION_REQUIRED', revision_source: 'TASHIH' }} />);
    const phases = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(phases[4]).toHaveAttribute('aria-current', 'step');
    expect(phases[4]).toHaveTextContent('Perlu Perbaikan Naskah Sidang');
  });

  it('menunjukkan proses dibatalkan tanpa menandai fase lanjutan selesai', () => {
    render(<WorkflowPhaseStatus registration={{ status: 'CANCELLED' }} />);
    const phases = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(phases[0]).toHaveTextContent('Dibatalkan');
    expect(phases[1]).toHaveTextContent('Tidak dilanjutkan');
  });
});
