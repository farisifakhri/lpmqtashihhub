import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('reports a render failure and offers a recovery action', () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => { throw new Error('render failed'); };

    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(errorLog).toHaveBeenCalledWith('Unhandled UI error:', expect.any(Error), expect.any(Object));
    expect(screen.getByRole('alert')).toHaveTextContent('Halaman mengalami kendala');
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeInTheDocument();
  });
});
