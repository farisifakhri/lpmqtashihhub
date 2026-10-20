import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

vi.mock('./DistributionMap', async () => {
  const { createElement } = await import('react');

  return {
    default: () =>
      createElement(
        'section',
        { id: 'peta-persebaran-penerbit' },
        createElement('h2', null, 'Peta Persebaran Penerbit Mushaf Al-Qur’an')
      ),
  };
});

describe('LandingPage sections and navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('keeps the retained sections and navigation while removing the requested sections', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Hero branding & title
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Layanan Surat Tanda Tashih/i);
    expect(screen.getByText('Kementerian Agama Republik Indonesia')).toBeInTheDocument();

    // Section headings
    expect(screen.getByRole('heading', { level: 2, name: /Informasi Pelayanan/ })).toBeInTheDocument();
    expect(screen.getByText('Layanan Pentashihan')).toBeInTheDocument();
    const mapHeading = await screen.findByRole('heading', {
      name: /Peta Persebaran Penerbit Mushaf Al-Qur’an/i,
    });
    expect(mapHeading).toBeInTheDocument();
    expect(mapHeading.closest('section').previousElementSibling).toHaveAttribute(
      'id',
      'layanan-pentashihan'
    );
    expect(screen.queryByText('Alur Penerbitan Surat Tanda Tashih (STT)')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Saluran Pengaduan & Bantuan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Permohonan Master Mushaf Standar Indonesia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Pertanyaan yang Sering Diajukan \(FAQ\)/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Berapa lama masa berlaku Surat Tanda Tashih/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bagaimana alur pendaftaran naskah mushaf/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apakah mushaf digital atau aplikasi Android/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apakah ada biaya tambahan untuk revisi naskah/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Di mana lokasi penyerahan master naskah fisik/i)).not.toBeInTheDocument();

    const mainNavigation = screen.getByRole('navigation', { name: 'Navigasi utama' });
    expect(within(mainNavigation).getByRole('link', { name: 'Permohonan Master' })).toHaveAttribute('href', '#beranda');
    expect(within(mainNavigation).getByRole('link', { name: 'Pengaduan' })).toHaveAttribute('href', '#');
    expect(within(mainNavigation).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#beranda');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      const targetId = anchor.getAttribute('href').slice(1);
      expect(targetId === '' || document.getElementById(targetId)).toBeTruthy();
    });
  });

  it('renders Layanan Pentashihan section with three service cards and decoupled navbar submenus', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Judul & deskripsi section
    expect(screen.getByRole('heading', { name: /Layanan Pentashihan/i })).toBeInTheDocument();
    expect(screen.getByText('Anda dapat memilih beberapa layanan pentashihan')).toBeInTheDocument();

    // Tiga kartu layanan tanpa deskripsi tambahan
    const card1 = screen.getByText("Pendaftaran Mushaf Al-Qur'an");
    const card2 = screen.getByText('Pengecekan Tanda Tashih');
    const card3 = screen.getByText("Pencarian Mushaf Al-Qur'an");
    expect(card1).toBeInTheDocument();
    expect(card2).toBeInTheDocument();
    expect(card3).toBeInTheDocument();

    // Kartu 1 memiliki tautan ke /login
    const linkPendaftaran = screen.getByRole('link', { name: /Pendaftaran Mushaf Al-Qur'an/i });
    expect(linkPendaftaran).toHaveAttribute('href', '/login');

    // Konten lama section 2 sudah tidak ada
    expect(screen.queryByText('Naskah yang Wajib Ditashih')).not.toBeInTheDocument();
    expect(screen.queryByText('Dokumen Persyaratan')).not.toBeInTheDocument();
    expect(screen.queryByText('Standar Waktu Layanan (SLA)')).not.toBeInTheDocument();

    // Submenu Informasi tetap tampil di navigasi namun diputus dari #informasi
    const infoSubmenus = [
      screen.getAllByText('Informasi Layanan Pentashihan')[0],
      screen.getAllByText('Alur & Regulasi STT')[0],
      screen.getAllByText('Persyaratan Berkas Naskah')[0],
    ];
    infoSubmenus.forEach((submenu) => {
      expect(submenu).toBeInTheDocument();
      const anchor = submenu.closest('a');
      expect(anchor).toHaveAttribute('href', '#');
    });
  });

  it('renders Informasi Pelayanan section with text maklumat, social links, statistics, and values', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Heading dan teks maklumat verbatim
    expect(screen.getByRole('heading', { level: 2, name: /Informasi Pelayanan/ })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Dengan ini kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan/i
      )
    ).toBeInTheDocument();

    // Kartu Visi, Misi, Motto
    expect(screen.getByText('Visi')).toBeInTheDocument();
    expect(screen.getByText(/Terwujudnya mushaf Al-Qur’an yang sahih dan mudah dibaca/i)).toBeInTheDocument();
    expect(screen.getByText('Misi')).toBeInTheDocument();
    expect(screen.getByText(/Menjaga kesahihan mushaf Al-Qur’an/i)).toBeInTheDocument();
    expect(screen.getByText('Motto')).toBeInTheDocument();
    expect(screen.getByText(/Sahih Melayani/i)).toBeInTheDocument();

    // Tiga kartu statistik & tanggal pembaruan data
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Surat Tanda Tashih Diterbitkan')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText("Penerbit Mushaf Al-Qur'an")).toBeInTheDocument();
    expect(screen.getByText('53')).toBeInTheDocument();
    expect(screen.getByText("Pentashih Mushaf Al-Qur'an")).toBeInTheDocument();
    expect(screen.getByText(/Data diambil per tanggal: 17 Oktober 2026/i)).toBeInTheDocument();

    // Tautan media sosial resmi
    const ytLink = screen.getByRole('link', { name: /Kanal YouTube Resmi LPMQ/i });
    expect(ytLink).toHaveAttribute('href', 'https://www.youtube.com/@LajnahKemenag');
    expect(ytLink).toHaveAttribute('target', '_blank');

    const xLink = screen.getByRole('link', { name: /Akun X Resmi LPMQ/i });
    expect(xLink).toHaveAttribute('href', 'https://x.com/LPMQKemenagRI');
    expect(xLink).toHaveAttribute('target', '_blank');

    const igLink = screen.getByRole('link', { name: /Akun Instagram Resmi LPMQ/i });
    expect(igLink).toHaveAttribute('href', 'https://www.instagram.com/lpmq_kemenag_ri');
    expect(igLink).toHaveAttribute('target', '_blank');

    const fbLink = screen.getByRole('link', { name: /Akun Facebook Resmi LPMQ/i });
    expect(fbLink).toHaveAttribute('href', 'https://www.facebook.com/LPMQKemenagRI/');
    expect(fbLink).toHaveAttribute('target', '_blank');
  });

  it('searches the remaining landing page sections from the hero', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole('searchbox', { name: /Cari informasi/i });
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Pencarian Mushaf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));

    const matchingSection = screen.getByText("Pencarian Mushaf Al-Qur'an").closest('section');
    expect(matchingSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(screen.getByRole('status')).toHaveTextContent('Bagian "Layanan Pentashihan" ditemukan.');

    fireEvent.change(searchInput, { target: { value: 'tidak ada informasi ini' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cari' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tidak ditemukan informasi yang sesuai.');
  });
});
