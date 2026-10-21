import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the retained sections and navigation while removing the requested sections', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

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
    const appPromotion = screen.getByRole('region', { name: /Yuk Download Aplikasi/ });
    const mapSection = mapHeading.closest('section');
    expect(
      mapSection.compareDocumentPosition(appPromotion) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(mapSection.closest('main').nextElementSibling).toBe(appPromotion.parentElement);
    expect(appPromotion.parentElement).toHaveClass('lpmq-app-footer-gradient');
    const footer = screen.getByRole('contentinfo');
    expect(appPromotion.parentElement.nextElementSibling).toBe(footer);
    expect(footer).toHaveClass('bg-brand-950', 'text-white');
    expect(
      within(appPromotion).getByRole('heading', {
        name: 'Yuk Download Aplikasi Qur’an Kemenag Sekarang!',
      })
    ).toBeInTheDocument();
    expect(appPromotion).toHaveTextContent(
      'Dapatkan kenyamanan dan kemudahan membaca kitab suci Al-Qur’an kapan dan di mana saja. Dengan aplikasi Qur’an Kemenag, siapapun dapat mengecek Surat Tanda Tashih pada mushaf yang beredar di Indonesia.'
    );
    const googlePlayLink = within(appPromotion).getByRole('link', {
      name: 'Download Qur’an Kemenag di Google Play',
    });
    expect(googlePlayLink).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.quran.kemenag&hl=id&gl=US&pli=1'
    );
    expect(googlePlayLink).toHaveAttribute('target', '_blank');
    const appStoreLink = within(appPromotion).getByRole('link', {
      name: 'Download Qur’an Kemenag di App Store',
    });
    expect(appStoreLink).toHaveAttribute('href', 'https://apps.apple.com/us/app/quran-kemenag/id1626953037');
    expect(appStoreLink).toHaveAttribute('target', '_blank');
    expect(within(appPromotion).getByAltText(/QR code untuk mengunduh aplikasi/).src).toContain(
      'qrcodeapk.webp'
    );
    expect(within(appPromotion).getByAltText(/Tampilan aplikasi Qur’an Kemenag/).src).toContain(
      'mockup.webp'
    );
    expect(appPromotion.querySelector('img[src*="pilihanfitur.webp"]')).toBeInTheDocument();
    expect(within(appPromotion).getByText('Banyak Pilihan', { exact: false })).toHaveClass(
      'text-right'
    );
    expect(within(footer).getByRole('link', { name: 'Regulasi' })).toHaveAttribute(
      'href',
      '#informasi-pelayanan'
    );
    expect(within(footer).getByRole('link', { name: 'Pengaduan' })).toHaveAttribute(
      'href',
      '#beranda'
    );
    expect(within(footer).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#beranda');
    expect(within(footer).getByRole('link', { name: 'Portal Penerbit' })).toHaveAttribute(
      'href',
      '/login'
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

  it('renders the image-only hero and WhatsApp contact links on desktop and mobile', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const heroImages = within(hero).getAllByRole('img', { hidden: true });
    expect(heroImages).toHaveLength(2);
    expect(heroImages[0]).toHaveAttribute('src', expect.stringContaining('berandaaku.webp'));
    expect(heroImages[1]).toHaveAttribute('src', expect.stringContaining('berandakii.webp'));
    expect(within(hero).queryByText(/Kementerian Agama Republik Indonesia/i)).not.toBeInTheDocument();
    expect(within(hero).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(hero).queryByRole('searchbox')).not.toBeInTheDocument();
    expect(within(hero).queryByRole('button')).not.toBeInTheDocument();

    let contactLinks = screen.getAllByRole('link', {
      name: 'Hubungi Layanan Tashih Online melalui WhatsApp',
    });
    expect(contactLinks).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }));
    contactLinks = screen.getAllByRole('link', {
      name: 'Hubungi Layanan Tashih Online melalui WhatsApp',
    });
    expect(contactLinks).toHaveLength(2);
    contactLinks.forEach((contactLink) => {
      expect(contactLink).toHaveAttribute('href', 'https://wa.me/628111997125');
      expect(contactLink).toHaveAttribute('target', '_blank');
      expect(contactLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('adds the About Us information above the retained footer links', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const footer = screen.getByRole('contentinfo');
    const aboutSection = within(footer).getByRole('region', { name: 'TENTANG KAMI' });
    const columns = footer.firstElementChild;
    const identityColumn = columns.children[0];
    const mapColumn = columns.children[1];

    expect(footer).toHaveClass('bg-brand-950', 'text-white');
    expect(columns).toHaveClass('lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.7fr)]');
    expect(identityColumn.querySelector('img')).toHaveAttribute('alt', 'Logo Tashih LPMQ');
    expect(identityColumn.querySelector('img').src).toContain('logo-lpmq1.webp');
    expect(identityColumn.querySelector('img').nextElementSibling).toBe(
      identityColumn.querySelector('address')
    );
    expect(identityColumn.querySelector('address').nextElementSibling).toHaveAttribute(
      'class',
      expect.stringContaining('flex')
    );
    expect(mapColumn.querySelector('iframe')).toHaveClass('h-44', 'w-full');
    expect(mapColumn.querySelector('iframe').parentElement).toHaveClass(
      'max-w-[340px]',
      'overflow-hidden',
      'rounded-xl'
    );
    expect(aboutSection).toHaveClass('md:col-span-2', 'lg:col-span-1');
    expect(aboutSection.querySelector('#about-us-title')).toHaveClass('text-brand-300');
    expect(aboutSection.querySelector('#about-us-title').nextElementSibling).toHaveClass(
      'text-white/85'
    );
    expect(
      within(mapColumn).getByTitle(
        "Peta lokasi Lajnah Pentashihan Mushaf Al-Qur'an di Gedung Bayt Al-Qur'an, TMII"
      )
    ).toHaveAttribute('loading', 'lazy');
    expect(
      within(identityColumn).getByText("Gedung Bayt Al-Qur'an & Museum Istiqlal")
    ).toBeInTheDocument();
    expect(within(identityColumn).getByText('Jalan Raya TMII Pintu I Jakarta Timur 13560')).toBeInTheDocument();
    expect(within(identityColumn).getByText('Telp: (021) 8416468 - 8416466')).toBeInTheDocument();
    expect(within(identityColumn).getByText('Faks: (021) 8416468')).toBeInTheDocument();
    expect(
      within(identityColumn).getByText('Narahubung Layanan Pentashihan: +628111997125')
    ).toBeInTheDocument();
    expect(aboutSection).toHaveTextContent(
      "Ini adalah website Layanan Tashih Online Lajnah Pentashihan Mushaf Al-Qur'an Badan Litbang dan Diklat Kementerian Agama Republik Indonesia."
    );
    expect(aboutSection).toHaveTextContent(
      "Melalui website ini, perusahaan penerbit, Lembaga Pemerintah, dan Yayasan dapat mengajukan permohonan Surat Tanda Tashih dan/atau Surat Izin Edar untuk mushaf Al-Qur'an yang akan diedarkan di Indonesia."
    );
    expect(aboutSection).toHaveTextContent(
      "Melalui website ini, masyarakat dapat melaporkan aduan seputar mushaf Al-Qur'an dan mengecek Surat Tanda Tashih mushaf Al-Qur'an."
    );
    expect(within(footer).getByRole('link', { name: 'Regulasi' })).toHaveAttribute(
      'href',
      '#informasi-pelayanan'
    );
    expect(within(footer).getByRole('link', { name: 'Pengaduan' })).toHaveAttribute(
      'href',
      '#beranda'
    );
    expect(within(footer).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#beranda');
    expect(within(footer).getByRole('link', { name: 'Portal Penerbit' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(footer.lastElementChild).toHaveClass('border-t', 'border-white/20');
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

    // Tautan media sosial resmi dipindahkan ke footer.
    const footer = screen.getByRole('contentinfo');
    const infoSection = screen.getByRole('region', { name: 'Informasi Pelayanan' });
    const ytLink = screen.getByRole('link', { name: /Kanal YouTube Resmi LPMQ/i });
    expect(ytLink).toHaveAttribute('href', 'https://www.youtube.com/@LajnahKemenag');
    expect(ytLink).toHaveAttribute('target', '_blank');
    expect(footer.contains(ytLink)).toBe(true);
    expect(infoSection.contains(ytLink)).toBe(false);

    const xLink = screen.getByRole('link', { name: /Akun X Resmi LPMQ/i });
    expect(xLink).toHaveAttribute('href', 'https://x.com/LPMQKemenagRI');
    expect(xLink).toHaveAttribute('target', '_blank');
    expect(footer.contains(xLink)).toBe(true);
    expect(infoSection.contains(xLink)).toBe(false);

    const igLink = screen.getByRole('link', { name: /Akun Instagram Resmi LPMQ/i });
    expect(igLink).toHaveAttribute('href', 'https://www.instagram.com/lpmq_kemenag_ri');
    expect(igLink).toHaveAttribute('target', '_blank');
    expect(footer.contains(igLink)).toBe(true);
    expect(infoSection.contains(igLink)).toBe(false);

    const fbLink = screen.getByRole('link', { name: /Akun Facebook Resmi LPMQ/i });
    expect(fbLink).toHaveAttribute('href', 'https://www.facebook.com/LPMQKemenagRI/');
    expect(fbLink).toHaveAttribute('target', '_blank');
    expect(footer.contains(fbLink)).toBe(true);
    expect(infoSection.contains(fbLink)).toBe(false);
  });

  it('crossfades the hero slides every five seconds and cycles back to the first image', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const firstSlide = screen.getByAltText('Gambar pertama slideshow beranda LPMQ');
    const secondSlide = screen.getByAltText('Gambar kedua slideshow beranda LPMQ');
    expect(firstSlide).toHaveClass('opacity-100');
    expect(secondSlide).toHaveClass('opacity-0');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(firstSlide).toHaveClass('opacity-0');
    expect(secondSlide).toHaveClass('opacity-100');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(firstSlide).toHaveClass('opacity-100');
    expect(secondSlide).toHaveClass('opacity-0');

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
