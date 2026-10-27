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
describe('Helper Admin navigation', () => {
  it('labels ADMIN_INTERNAL correctly with operational workflow and hides publisher & superadmin system links', () => {
    show('ADMIN_INTERNAL');
    expect(screen.getByRole('link', { name: /Kendali Operasional/ })).toBeInTheDocument();
    // Helper admin has access to operational workflow steps
    expect(document.querySelector('a[href="/internal/verifications"]')).not.toBeNull();
    expect(document.querySelector('a[href="/internal/distributions"]')).not.toBeNull();
    expect(document.querySelector('a[href="/internal/tashih"]')).not.toBeNull();
    expect(document.querySelector('a[href="/internal/documents"]')).not.toBeNull();
    // Helper admin does NOT have access to publisher portal, signatures, and superadmin settings
    for (const path of ['/internal/settings', '/internal/users', '/internal/signatures', '/publisher']) {
      expect(document.querySelector(`a[href="${path}"]`)).toBeNull();
    }
  });
  it('keeps SUPERADMIN navigation available', () => {
    show('SUPERADMIN');
    for (const path of ['/internal/verifications', '/internal/distributions', '/internal/tashih', '/internal/documents', '/internal/settings', '/internal/users', '/publisher']) {
      expect(document.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
  });
});

describe('Distributor navigation', () => {
  it('membuka antrean penerimaan dan penugasan tim pada tab yang berbeda', () => {
    show('DISTRIBUTOR');
    expect(screen.getByRole('link', { name: /Master Menunggu Diterima/ })).toHaveAttribute('href', '/internal/distributions?stage=HANDOVER');
    expect(screen.getByRole('link', { name: /Distribusi Tim/ })).toHaveAttribute('href', '/internal/distributions?stage=ASSIGNMENT');
  });
});
