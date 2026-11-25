import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReviewProgressPanel } from './ReviewProgressPanel';

const reg = {
  id: 'reg-1', registration_no: 'REG-1', title: 'Mushaf Uji', status: 'TASHIH_IN_PROGRESS', core_team_number: 1, core_distributor_id: 'dist-1',
  assignments: [
    { id: 'a-1', iteration: 1, status: 'IN_PROGRESS', assignee: { name: 'Ustadz Aktif' }, reviews: [] },
    { id: 'a-2', iteration: 1, status: 'COMPLETED', assignee: { name: 'Ustadz Selesai' }, reviews: [{ result: 'PASSED' }] },
  ],
};
const panel = (props) => render(
  <MemoryRouter>
    <ReviewProgressPanel inProgressRegistrations={[reg]} fetchDistributionData={() => {}} setReviewDialogRegId={() => {}} {...props} />
  </MemoryRouter>,
);

describe('ReviewProgressPanel pencabutan pentashih', () => {
  it('distributor berwenang melihat tombol Cabut hanya pada pentashih yang belum selesai', () => {
    const onRevoke = vi.fn();
    panel({ onRevokePentashih: onRevoke, canRevoke: () => true });
    const buttons = screen.getAllByRole('button', { name: /Cabut penugasan/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onRevoke).toHaveBeenCalledWith(reg.assignments[0], reg);
  });

  it('menyembunyikan tombol Cabut bagi pengguna yang tidak berwenang', () => {
    panel({ onRevokePentashih: vi.fn(), canRevoke: () => false });
    expect(screen.queryByRole('button', { name: /Cabut penugasan/ })).not.toBeInTheDocument();
  });
});
