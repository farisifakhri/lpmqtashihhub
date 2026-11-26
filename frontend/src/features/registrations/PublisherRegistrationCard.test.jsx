import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherRegistrationCard } from './PublisherRegistrationCard';

const card = (overrides) => render(
  <MemoryRouter>
    <PublisherRegistrationCard registration={{
      id: 'r1', registration_no: 'REG-1', title: 'Mushaf Uji', status: 'IN_VERIFICATION', created_at: '2026-11-20T00:00:00Z', ...overrides,
    }} />
  </MemoryRouter>,
);
const inHours = (hours) => new Date(Date.now() + hours * 3600_000).toISOString();

describe('PublisherRegistrationCard SLA verifikasi', () => {
  it('shows draft action without official workflow progress', () => {
    card({ status: 'DRAFT', updated_at: '2026-11-25T00:00:00Z' });
    expect(screen.getByRole('link', { name: /Lanjutkan Draft/ })).toHaveAttribute('href', '/publisher/new-registration?draftId=r1');
    expect(screen.getByText(/Diperbarui/)).toBeInTheDocument();
    expect(screen.queryByText('2. Verifikasi Fisik')).not.toBeInTheDocument();
    expect(screen.queryByText('3. STT')).not.toBeInTheDocument();
  });
  it('menampilkan sisa waktu SLA saat verifikator sudah ditugaskan', () => {
    card({ verification_assignments: [{ due_at: inHours(30) }] });
    expect(screen.getByText('SLA Verifikasi')).toBeInTheDocument();
    expect(screen.getByText(/Sisa 1 hari/)).toBeInTheDocument();
  });

  it('menandai SLA terlewati', () => {
    card({ status: 'VERIFICATION_ASSIGNED', verification_assignments: [{ due_at: inHours(-5) }] });
    expect(screen.getByText(/Terlambat 5 jam/)).toBeInTheDocument();
  });

  it('menulis keterlambatan panjang dalam hari dan jam', () => {
    card({ verification_assignments: [{ due_at: inHours(-(14 * 24 + 9)) }] });
    expect(screen.getByText(/Terlambat 14 hari 9 jam/)).toBeInTheDocument();
  });

  it('menjeda SLA saat menunggu perbaikan penerbit', () => {
    card({ status: 'REVISION_REQUIRED', verification_assignments: [{ due_at: inHours(-5) }] });
    expect(screen.getByText(/Jeda SLA/)).toBeInTheDocument();
  });

  it('memakai estimasi 2 HK selama verifikator belum ditugaskan', () => {
    card({ status: 'READY_FOR_VERIFICATION' });
    expect(screen.queryByText('SLA Verifikasi')).not.toBeInTheDocument();
    expect(screen.getByText(/Verifikasi: maks. 2 HK/)).toBeInTheDocument();
  });
});
