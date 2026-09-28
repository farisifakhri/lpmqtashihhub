import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';
import { showToast } from './toast';

describe('ToastProvider', () => {
  it('shows an API error in the shared live region', () => {
    render(<ToastProvider><span>Halaman</span></ToastProvider>);
    act(() => { showToast('Layanan sedang sibuk.'); });

    expect(screen.getByRole('alert')).toHaveTextContent('Layanan sedang sibuk.');
  });
});
