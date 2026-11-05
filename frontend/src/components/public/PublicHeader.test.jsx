import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from './PublicHeader';

describe('PublicHeader', () => {
  it('keeps menu hover feedback color-only and preserves the active submenu indicator', () => {
    render(
      <MemoryRouter>
        <PublicHeader
          activePage="Beranda"
          activeHref="/informasi/siaran-pers"
          navItems={PUBLIC_INFORMATION_NAV_ITEMS}
        />
      </MemoryRouter>,
    );

    const desktopNav = screen.getByRole('navigation', { name: 'Navigasi utama' });
    const informationLink = within(desktopNav).getByRole('link', { name: /Informasi/ });
    expect(informationLink.className).toContain('hover:text-lpmq-green');
    expect(informationLink.className).not.toContain('hover:bg-');
    const homeLink = within(desktopNav).getByRole('link', { name: 'Beranda' });
    expect(homeLink.className).not.toContain('hover:bg-');

    const activeSubmenuLink = within(desktopNav).getByRole('link', { name: 'Siaran Pers' });
    expect(activeSubmenuLink.className).toContain('hover:bg-lpmq-soft');
    expect(activeSubmenuLink).toHaveClass('bg-lpmq-soft', 'text-lpmq-green');

    fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }));
    const mobileDropdownButton = screen.getByRole('button', { name: 'Toggle submenu Informasi' });
    const mobileMenu = mobileDropdownButton.parentElement;
    expect(mobileMenu.className).not.toContain('hover:bg-');
    fireEvent.click(mobileDropdownButton);
    const mobileActiveSubmenu = screen.getAllByRole('link', { name: 'Siaran Pers' }).find((link) =>
      link.className.includes('rounded-lg'),
    );
    expect(mobileActiveSubmenu.className).toContain('hover:bg-lpmq-soft');
    expect(mobileActiveSubmenu).toHaveClass('bg-lpmq-soft', 'text-lpmq-green');
  });
});
