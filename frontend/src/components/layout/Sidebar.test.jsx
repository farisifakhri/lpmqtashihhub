import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import * as AuthContext from '@/features/auth/AuthContext';

const show = role => {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: { name: 'Petugas', role, roles: [role] } });
  render(<MemoryRouter><Sidebar /></MemoryRouter>);
};
describe('Admin Internal navigation', () => {
  it('labels ADMIN correctly and hides operational, publisher and superadmin links', () => {
    show('ADMIN');
    expect(screen.getByText('Admin Internal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kendali Operasional/ })).toBeInTheDocument();
    for (const path of ['/internal/verifications', '/internal/distributions', '/internal/tashih', '/internal/documents', '/internal/settings', '/internal/users', '/publisher']) {
      expect(document.querySelector(`a[href="${path}"]`)).toBeNull();
    }
  });
  it('keeps SUPERADMIN navigation available', () => {
    show('SUPERADMIN');
    expect(screen.getByText('Superadmin')).toBeInTheDocument();
    for (const path of ['/internal/verifications', '/internal/distributions', '/internal/tashih', '/internal/documents', '/internal/settings', '/internal/users', '/publisher']) {
      expect(document.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
  });
});
