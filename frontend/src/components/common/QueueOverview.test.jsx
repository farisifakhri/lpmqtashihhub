import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueueOverview, QueuePagination, QueueItemMeta, waitingLabel } from './QueueOverview';

describe('Queue UI', () => {
  it('shows bounded elapsed time and handles absent timestamps', () => {
    const now = new Date('2026-09-16T12:00:00Z').getTime();
    expect(waitingLabel('2026-09-14T10:00:00Z', now)).toBe('2 hari 2 jam');
    expect(waitingLabel('2026-09-17T12:00:00Z', now)).toBe('Kurang dari 1 jam');
    expect(waitingLabel(undefined, now)).toBe('Belum tercatat');
  });
  it('distinguishes FIFO work from archives without invented global positions', () => {
    render(<><QueueOverview total={23} oldest={new Date().toISOString()} /><QueueItemMeta item={{ queue_position: 21, queue_entered_at: new Date().toISOString() }} /></>);
    expect(screen.getByText('Tertua lebih dahulu · FIFO')).toBeInTheDocument();
    expect(screen.getByText('Urutan #21')).toBeInTheDocument();
  });
  it('supports both pagination contracts and disables next on the last page', () => {
    const change = vi.fn();
    const { rerender } = render(<QueuePagination pagination={{ page: 1, total: 25, total_pages: 2 }} loading={false} onPageChange={change} />);
    expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    expect(change).toHaveBeenCalledWith(2);
    rerender(<QueuePagination pagination={{ page: 2, total: 25, totalPages: 2 }} loading={false} onPageChange={change} />);
    expect(screen.getByRole('button', { name: 'Selanjutnya' })).toBeDisabled();
  });
});
