import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './LandingPage';

const initialVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(
  document,
  'visibilityState'
);

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
    vi.unstubAllGlobals();
    if (initialVisibilityStateDescriptor) {
      Object.defineProperty(document, 'visibilityState', initialVisibilityStateDescriptor);
    } else {
      delete document.visibilityState;
    }
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
      '/informasi/regulasi-penerbit-mushaf'
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
    expect(within(mainNavigation).getByRole('link', { name: 'Permohonan Master' })).toHaveAttribute('href', '/publisher/master-requests');
    expect(within(mainNavigation).getByRole('link', { name: 'Pengaduan' })).toHaveAttribute('href', '#');
    expect(within(mainNavigation).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#beranda');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      const targetId = anchor.getAttribute('href').slice(1);
      expect(targetId === '' || document.getElementById(targetId)).toBeTruthy();
    });
  });

  it('renders the hero slideshow controls and WhatsApp contact links on desktop and mobile', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const heroImages = within(hero).getAllByRole('img', { hidden: true });
    expect(heroImages).toHaveLength(4);
    expect(heroImages[1]).toHaveAttribute('src', expect.stringContaining('berandaaku.webp'));
    expect(heroImages[2]).toHaveAttribute('src', expect.stringContaining('berandakii.webp'));
    expect(hero.closest('main')).toHaveClass('max-w-[1400px]', 'px-5', 'sm:px-8', 'lg:px-12');
    const track = hero.querySelector('[data-hero-track]');
    expect(track).toHaveClass('transition-transform', 'duration-[600ms]', 'ease-in-out');
    expect(track.style.transform).toBe('translateX(-25%)');
    expect(
      within(hero).getByRole('heading', { name: 'Layanan Surat Tanda Tashih Al-Qur’an' })
    ).toBeInTheDocument();
    const ministryLabel = within(hero)
      .getAllByText('Kementerian Agama Republik Indonesia')
      .find((label) => label.closest('[aria-hidden="false"]'));
    expect(ministryLabel).toHaveClass(
      'backdrop-blur-md',
      'bg-white/15',
      'border-white/20',
      'rounded-full'
    );
    const slideOneDescription = within(hero)
      .getAllByText(/Layanan resmi penerbitan Surat Tanda Tashih/)
      .find((description) => description.closest('[aria-hidden="false"]'));
    expect(slideOneDescription).toBeInTheDocument();
    expect(within(hero).getByRole('button', { name: 'Slide sebelumnya' })).toHaveAttribute(
      'type',
      'button'
    );
    expect(within(hero).getByRole('button', { name: 'Slide berikutnya' })).toHaveAttribute(
      'type',
      'button'
    );

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

  it('shows slide-one text only on the first slide and supports circular controls and 10-second autoplay', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const previousButton = within(hero).getByRole('button', { name: 'Slide sebelumnya' });
    const nextButton = within(hero).getByRole('button', { name: 'Slide berikutnya' });
    const track = hero.querySelector('[data-hero-track]');
    const slideOneHeading = () =>
      within(hero).queryByRole('heading', { name: 'Layanan Surat Tanda Tashih Al-Qur’an' });
    const finishTransition = () => fireEvent.transitionEnd(track);

    expect(slideOneHeading()).toBeInTheDocument();
    fireEvent.click(nextButton);
    expect(track.style.transform).toBe('translateX(-50%)');
    expect(slideOneHeading()).not.toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(track.style.transform).toBe('translateX(-50%)');
    finishTransition();
    expect(track.style.transform).toBe('translateX(-75%)');
    finishTransition();
    expect(track.style.transform).toBe('translateX(-25%)');
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(slideOneHeading()).toBeInTheDocument();

    fireEvent.click(previousButton);
    expect(track.style.transform).toBe('translateX(-0%)');
    finishTransition();
    expect(track.style.transform).toBe('translateX(-50%)');
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(slideOneHeading()).not.toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(track.style.transform).toBe('translateX(-75%)');
    finishTransition();
    expect(track.style.transform).toBe('translateX(-25%)');
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(slideOneHeading()).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(track.style.transform).toBe('translateX(-50%)');
    expect(slideOneHeading()).not.toBeInTheDocument();
  });

  it('preserves the remaining autoplay time while navigating away from Beranda', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/']}>
        <nav aria-label="Test route controls">
          <Link to="/informasi">Test ke Informasi</Link>
          <Link to="/">Test ke Beranda</Link>
        </nav>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/informasi" element={<h1>Informasi</h1>} />
        </Routes>
      </MemoryRouter>
    );

    let hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const track = hero.querySelector('[data-hero-track]');

    fireEvent.click(within(hero).getByRole('button', { name: 'Slide berikutnya' }));
    fireEvent.transitionEnd(track);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    fireEvent.click(screen.getByRole('link', { name: 'Test ke Informasi' }));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole('heading', { name: 'Informasi' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Test ke Beranda' }));
    hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const resumedTrack = hero.querySelector('[data-hero-track]');
    expect(resumedTrack.style.transform).toBe('translateX(-25%)');

    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(resumedTrack.style.transform).toBe('translateX(-25%)');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(resumedTrack.style.transform).toBe('translateX(-50%)');
  });

  it('pauses autoplay while the browser tab is hidden and resumes the remaining time', () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const track = hero.querySelector('[data-hero-track]');

    fireEvent.click(within(hero).getByRole('button', { name: 'Slide berikutnya' }));
    fireEvent.transitionEnd(track);
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(track.style.transform).toBe('translateX(-50%)');

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    fireEvent(document, new Event('visibilitychange'));
    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(track.style.transform).toBe('translateX(-50%)');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(track.style.transform).toBe('translateX(-75%)');

  });

  it('pauses autoplay while the hero is outside the viewport', () => {
    vi.useFakeTimers();
    const observers = [];
    class TestIntersectionObserver {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }

      observe(target) {
        this.target = target;
      }

      disconnect() {}
    }

    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const track = hero.querySelector('[data-hero-track]');
    const heroObserver = observers.find((observer) => observer.target === hero);

    fireEvent.click(within(hero).getByRole('button', { name: 'Slide berikutnya' }));
    fireEvent.transitionEnd(track);

    act(() => {
      heroObserver.callback([{ target: hero, isIntersecting: true }]);
      vi.advanceTimersByTime(4000);
      heroObserver.callback([{ target: hero, isIntersecting: false }]);
      vi.advanceTimersByTime(60000);
    });
    expect(track.style.transform).toBe('translateX(-50%)');

    act(() => {
      heroObserver.callback([{ target: hero, isIntersecting: true }]);
      vi.advanceTimersByTime(5999);
    });
    expect(track.style.transform).toBe('translateX(-50%)');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(track.style.transform).toBe('translateX(-75%)');
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
      '/informasi/regulasi-penerbit-mushaf'
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
    [card1, card2, card3].forEach((title) => {
      const card = title.closest('.group');
      expect(card).toHaveClass(
        'bg-white',
        'border-lpmq-border',
        'hover:bg-lpmq-soft',
        'hover:border-lpmq-green',
        'group-active:bg-lpmq-green',
        'group-active:border-lpmq-green',
        'duration-300'
      );
      expect(card.querySelector('.w-12.h-12')).toHaveClass(
        'bg-lpmq-soft',
        'text-lpmq-green',
        'group-hover:ring-lpmq-accent',
        'group-active:bg-lpmq-green',
        'group-active:text-white'
      );
      expect(title).toHaveClass('text-ink', 'group-hover:text-lpmq-green', 'group-active:text-white');
    });

    // Kartu 1 memiliki tautan ke /login
    const linkPendaftaran = screen.getByRole('link', { name: /Pendaftaran Mushaf Al-Qur'an/i });
    expect(linkPendaftaran).toHaveAttribute('href', '/login');

    // Konten lama section 2 sudah tidak ada
    expect(screen.queryByText('Naskah yang Wajib Ditashih')).not.toBeInTheDocument();
    expect(screen.queryByText('Dokumen Persyaratan')).not.toBeInTheDocument();
    expect(screen.queryByText('Standar Waktu Layanan (SLA)')).not.toBeInTheDocument();

    const infoSubmenus = [
      ["Regulasi Penerbit Mushaf Al-Qur'an", '/informasi/regulasi-penerbit-mushaf'],
      ['Panduan Permohonan Surat Tanda Tashih/Izin Edar', '/informasi/panduan-permohonan-surat-tanda-tashih'],
      ['SOP Pelayanan Surat Tanda Tashih', '/informasi/sop-pelayanan-surat-tanda-tashih'],
      ["Direktori Penerbit Mushaf Al-Qur'an", '/informasi/direktori-penerbit-mushaf'],
      ['Survei IKM dan IPAK Pelayanan Surat Tanda Tashih', '/informasi/survei-ikm-ipak-pelayanan-surat-tanda-tashih'],
      ['Siaran Pers', '/informasi/siaran-pers'],
      ['Unduh Dokumen Seputar Pelayanan Surat Tanda Tashih/Izin Edar', '/informasi/unduh-dokumen-pelayanan-surat-tanda-tashih'],
    ];
    infoSubmenus.forEach(([label, href]) => {
      const submenu = screen.getAllByText(label)[0];
      expect(submenu).toBeInTheDocument();
      expect(submenu.closest('a')).toHaveAttribute('href', href);
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

  it('slides the hero horizontally every ten seconds and cycles back to the first image', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const hero = screen.getByRole('region', { name: 'Slideshow gambar beranda' });
    const track = hero.querySelector('[data-hero-track]');
    expect(track.style.transform).toBe('translateX(-25%)');

    fireEvent.click(within(hero).getByRole('button', { name: 'Slide berikutnya' }));
    fireEvent.transitionEnd(track);
    fireEvent.click(within(hero).getByRole('button', { name: 'Slide sebelumnya' }));
    fireEvent.transitionEnd(track);

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(track.style.transform).toBe('translateX(-50%)');

    fireEvent.transitionEnd(track);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(track.style.transform).toBe('translateX(-75%)');
    fireEvent.transitionEnd(track, { propertyName: 'transform' });
    expect(track.style.transform).toBe('translateX(-25%)');

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
