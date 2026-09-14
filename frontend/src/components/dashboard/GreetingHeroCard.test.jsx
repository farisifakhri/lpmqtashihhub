import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GreetingHeroCard } from './GreetingHeroCard';

describe('GreetingHeroCard Component', () => {
  it('merender sapaan nama pengguna, role badge, dan subtext', () => {
    render(
      <GreetingHeroCard
        userName="Farisi Fakhri"
        roleLabel="SUPERADMIN"
        subtext="Sistem Pengelolaan Pentashihan Mushaf Al-Qur'an"
      />
    );

    expect(screen.getByText(/Farisi Fakhri/i)).toBeInTheDocument();
    expect(screen.getByText('SUPERADMIN')).toBeInTheDocument();
    expect(screen.getByText(/Sistem Pengelolaan Pentashihan/i)).toBeInTheDocument();
  });
});

