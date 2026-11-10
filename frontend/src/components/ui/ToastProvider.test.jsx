import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';
import { showToast } from './toast';

describe('ToastProvider', () => {
  it('shows an API error in the shared live region', () => {
    render(<ToastProvider><span>Halaman</span></ToastProvider>);
    act(() => { showToast('Layanan sedang sibuk.'); });

    expect(screen.getByRole('alert')).toHaveTextContent('Layanan sedang sibuk.');
  });

  it('menutup pemberitahuan setelah durasi khusus, bawaan tetap 5 detik', () => {
    vi.useFakeTimers();
    render(<ToastProvider><span>Halaman</span></ToastProvider>);
    act(() => { showToast('Pertanyaan dihapus.', 'success', 2000); });
    act(() => { vi.advanceTimersByTime(1999); });
    expect(screen.getByText('Pertanyaan dihapus.')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('Pertanyaan dihapus.')).not.toBeInTheDocument();

    act(() => { showToast('Tersimpan.', 'success'); });
    act(() => { vi.advanceTimersByTime(4999); });
    expect(screen.getByText('Tersimpan.')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('Tersimpan.')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
