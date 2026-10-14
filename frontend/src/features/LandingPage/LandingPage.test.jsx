import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

describe('LandingPage Components & P0-2 Honest Complaint Placeholder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders landing page with all main sections and navigation', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Hero branding & title
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Layanan Surat Tanda Tashih/i);
    expect(screen.getByText('Kementerian Agama Republik Indonesia')).toBeInTheDocument();

    // Section headings
    expect(screen.getByText('Alur Penerbitan Surat Tanda Tashih (STT)')).toBeInTheDocument();
    expect(screen.getByText('Saluran Pengaduan & Bantuan')).toBeInTheDocument();
    expect(screen.getByText('Permohonan Master Mushaf Standar Indonesia')).toBeInTheDocument();
    expect(screen.getByText('Pertanyaan yang Sering Diajukan (FAQ)')).toBeInTheDocument();
  });

  it('P0-2: provides honest complaint placeholder without fake submission or false success message', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Verifikasi penanda bahwa modul daring sedang dipersiapkan
    expect(screen.getByText('Formulir Daring Segera Hadir')).toBeInTheDocument();
    expect(screen.getByText(/Pengaduan Kesalahan Naskah & Layanan Terintegrasi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tahap 5 SOP LPMQ/i)).toBeInTheDocument();

    // Verifikasi kanal resmi ditampilkan jelas
    expect(screen.getByText('lajnah@kemenag.go.id')).toBeInTheDocument();
    expect(screen.getAllByText(/\(021\) 87798807 \/ 8416466/)[0]).toBeInTheDocument();

    // Verifikasi TIDAK ADA form palsu yang menampilkan "Pengaduan Berhasil Terkirim"
    expect(screen.queryByText(/Pengaduan Berhasil Terkirim/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kirim Pengaduan/i })).not.toBeInTheDocument();
  });

  it('connects hero search bar genuinely to FAQ filter and allows reset', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole('searchbox', { name: /Cari informasi/i });
    expect(searchInput).toBeInTheDocument();

    // Cari kata kunci khusus yang ada di FAQ: "APK"
    fireEvent.change(searchInput, { target: { value: 'APK' } });

    // FAQ harus terfilter dan menampilkan indikator hasil pencarian
    expect(screen.getByText(/Menampilkan hasil pencarian untuk "APK"/i)).toBeInTheDocument();
    expect(screen.getByText(/Apakah mushaf digital atau aplikasi Android \(APK\) dapat ditashih\?/i)).toBeInTheDocument();

    // Pertanyaan lain yang tidak relevan harus tersembunyi
    expect(screen.queryByText(/Berapa lama masa berlaku Surat Tanda Tashih/i)).not.toBeInTheDocument();

    // Klik tombol reset pencarian
    const resetBtn = screen.getByRole('button', { name: /Reset Pencarian/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);

    // Seluruh FAQ tampil kembali
    expect(screen.getByText(/Berapa lama masa berlaku Surat Tanda Tashih/i)).toBeInTheDocument();
  });
});
