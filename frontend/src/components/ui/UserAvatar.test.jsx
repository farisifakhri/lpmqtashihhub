import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatar, AVATAR_OPTIONS } from './UserAvatar';

describe('UserAvatar Component', () => {
  it('merender Rub el Hizb monogram dengan inisial nama saat avatarId kosong', () => {
    const { container } = render(<UserAvatar name="Fakhri Farisi" />);
    const textElement = container.querySelector('text');
    expect(textElement).toBeTruthy();
    expect(textElement.textContent).toBe('FF');
  });

  it('menyediakan 6 opsi avatar resmi (3 pria dan 3 wanita)', () => {
    expect(AVATAR_OPTIONS).toHaveLength(6);
    const maleAvatars = AVATAR_OPTIONS.filter((a) => a.gender === 'male');
    const femaleAvatars = AVATAR_OPTIONS.filter((a) => a.gender === 'female');
    expect(maleAvatars).toHaveLength(3);
    expect(femaleAvatars).toHaveLength(3);
  });

  it('merender avatar pria-1 (peci hitam) dengan benar', () => {
    const { container } = render(<UserAvatar avatarId="pria-1" name="Ahmad" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('#pria1-peci')).toBeTruthy();
  });

  it('merender avatar wanita-1 (hijab dinas) dengan benar', () => {
    const { container } = render(<UserAvatar avatarId="wanita-1" name="Fatimah" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelector('#wanita1-hijab')).toBeTruthy();
  });

  it('menampilkan role badge saat showRoleBadge aktif', () => {
    render(
      <UserAvatar
        avatarId="pria-1"
        name="Admin"
        role="SUPERADMIN"
        showRoleBadge={true}
      />
    );
    const badge = screen.getByLabelText(/Peran: Super Admin/i);
    expect(badge).toBeTruthy();
  });

  it('menampilkan status online dot saat showOnline aktif tanpa role badge', () => {
    const { container } = render(
      <UserAvatar name="User" showOnline={true} showRoleBadge={false} />
    );
    const dot = container.querySelector('[data-testid="online-status-dot"]') || container.querySelector('.rounded-full.absolute');
    expect(dot).toBeTruthy();
  });
});

