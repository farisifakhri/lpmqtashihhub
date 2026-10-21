import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  Phone,
  Search,
  X,
  BookOpen,
  FileCheck2,
  Clock,
  ShieldCheck,
  Building2,
  Plus,
  Minus,
  LogIn,
  UserPlus,
  Target,
  List,
  Quote,
  FileCheck,
  FilePlus,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import heroImageFirst from '@/assets/berandaaku.webp';
import heroImageSecond from '@/assets/berandakii.webp';
import logoTashih from '@/assets/logo-lpmq1.webp';
import logoyt from '@/assets/logoyt.webp';
import logox from '@/assets/logox.webp';
import logoig from '@/assets/logoig.webp';
import logofb from '@/assets/logofb.webp';
import qrcodeapk from '@/assets/qrcodeapk.webp';
import mockup from '@/assets/mockup.webp';
import playstore from '@/assets/playstore.webp';
import appstore from '@/assets/appstore.webp';
import pilihanfitur from '@/assets/pilihanfitur.webp';

const DistributionMap = lazy(() => import('./DistributionMap'));

const navItems = [
  { label: 'Beranda', href: '#beranda' },
  {
    label: 'Informasi',
    href: '#',
    children: [
      { label: 'Informasi Layanan Pentashihan', href: '#' },
      { label: 'Alur & Regulasi STT', href: '#' },
      { label: 'Persyaratan Berkas Naskah', href: '#' },
    ],
  },
  { label: 'Permohonan Master', href: '#beranda' },
  {
    label: 'Pengaduan',
    href: '#',
    children: [
      { label: 'Saluran Pengaduan Masyarakat', href: '#' },
      { label: 'Cek Status Laporan Naskah', href: '#' },
      { label: 'Kontak Pusat Bantuan LPMQ', href: '#' },
    ],
  },
  { label: 'FAQ', href: '#beranda' },
];

const socialMediaLinks = [
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@LajnahKemenag',
    icon: logoyt,
    ariaLabel: 'Kanal YouTube Resmi LPMQ',
  },
  {
    name: 'X',
    href: 'https://x.com/LPMQKemenagRI',
    icon: logox,
    ariaLabel: 'Akun X Resmi LPMQ',
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/lpmq_kemenag_ri',
    icon: logoig,
    ariaLabel: 'Akun Instagram Resmi LPMQ',
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/LPMQKemenagRI/',
    icon: logofb,
    ariaLabel: 'Akun Facebook Resmi LPMQ',
  },
];

const serviceStatistics = [
  {
    count: '100',
    label: 'Surat Tanda Tashih Diterbitkan',
    icon: FileCheck,
  },
  {
    count: '99',
    label: "Penerbit Mushaf Al-Qur'an",
    icon: Building2,
  },
  {
    count: '53',
    label: "Pentashih Mushaf Al-Qur'an",
    icon: Users,
  },
];

const serviceValues = [
  {
    title: 'Visi',
    desc: 'Terwujudnya mushaf Al-Qur’an yang sahih dan mudah dibaca.',
    icon: Target,
  },
  {
    title: 'Misi',
    desc: 'Menjaga kesahihan mushaf Al-Qur’an.',
    icon: List,
  },
  {
    title: 'Motto',
    desc: 'Sahih Melayani.',
    icon: Quote,
  },
];

const pentashihanServices = [
  {
    title: "Pendaftaran Mushaf Al-Qur'an",
    icon: FilePlus,
    href: '/login',
    isInternal: true,
  },
  {
    title: 'Pengecekan Tanda Tashih',
    icon: FileCheck2,
    href: null,
    isInternal: false,
  },
  {
    title: "Pencarian Mushaf Al-Qur'an",
    icon: Search,
    href: null,
    isInternal: false,
  },
];

const quickAccessItems = [
  {
    title: 'Login Penerbit',
    desc: 'Masuk ke portal akun resmi penerbit mushaf',
    href: '/login',
    isInternal: true,
    icon: LogIn,
  },
  {
    title: 'Pendaftaran Penerbit',
    desc: 'Registrasi akun perorangan atau lembaga penerbit',
    href: '/register',
    isInternal: true,
    icon: UserPlus,
  },
  {
    title: 'Alur Pelayanan',
    desc: 'Panduan 6 tahapan proses penerbitan STT resmi',
    href: '#informasi-pelayanan',
    isInternal: false,
    icon: Clock,
  },
  {
    title: 'Prosedur Pelayanan',
    desc: 'Tata cara dan SOP pengajuan naskah Al-Qur\'an',
    href: '#informasi-pelayanan',
    isInternal: false,
    icon: BookOpen,
  },
  {
    title: 'Standar Pelayanan',
    desc: 'Maklumat mutu, jangka waktu SLA, dan tarif PNBP',
    href: '#informasi-pelayanan',
    isInternal: false,
    icon: ShieldCheck,
  },
];

const heroSlides = [
  { src: heroImageFirst, alt: 'Gambar pertama slideshow beranda LPMQ' },
  { src: heroImageSecond, alt: 'Gambar kedua slideshow beranda LPMQ' },
];

const StatCounter = ({ target, isVisible, duration = 1600 }) => {
  const numericTarget = typeof target === 'number' ? target : parseInt(target, 10) || 0;
  const [count, setCount] = useState(() => {
    // Di lingkungan pengujian (jsdom) atau SSR tanpa IntersectionObserver, tampilkan target langsung
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      return numericTarget;
    }
    return 0;
  });

  useEffect(() => {
    if (!isVisible) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setCount(numericTarget);
      return;
    }

    let startTime = null;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing out cubic: berhitung cepat di awal lalu melambat secara proporsional dan presisi
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easedProgress * numericTarget);

      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(numericTarget);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible, numericTarget, duration]);

  return <>{count}</>;
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileDropdown, setMobileDropdown] = useState(null);
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveHeroSlide((currentSlide) => (currentSlide + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setStatsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
      }
    );

    const currentEl = statsRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleNavigate = (path, e) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) {
      return;
    }
    if (e) {
      e.preventDefault();
    }
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      navigate(path);
      return;
    }

    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
    }, 280);
  };

  return (
    <>
      <div
        className={`min-h-screen bg-canvas font-sans text-ink transition-opacity duration-300 ease-out animate-page-in ${
          isNavigating ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
            {navItems.map((item, index) => {
              const hasChildren = item.children && item.children.length > 0;
              const isOpen = activeDropdown === item.label;

              if (hasChildren) {
                return (
                  <div
                    key={item.label}
                    className="relative py-2"
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <a
                      href={item.href}
                      onClick={(e) => {
                        if (!item.href || item.href === '#') {
                          e.preventDefault();
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
                        isOpen
                          ? 'text-brand-700 font-semibold'
                          : 'text-ink-muted hover:text-brand-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[11px] font-bold transition-transform duration-200 ${
                          isOpen ? 'text-brand-700 rotate-180' : 'text-ink-muted'
                        }`}
                        aria-hidden="true"
                      >
                        {isOpen ? (
                          <Minus className="h-3 w-3 stroke-[2.5]" />
                        ) : (
                          <Plus className="h-3 w-3 stroke-[2.5]" />
                        )}
                      </span>
                    </a>

                    {/* Dropdown Menu Desktop dengan Background Putih & Animasi Smooth */}
                    <div
                      className={`absolute left-0 top-full pt-2 w-64 z-50 transition-all duration-200 ease-out origin-top-left ${
                        isOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                      }`}
                    >
                      <div className="rounded-2xl border border-line bg-surface p-2 shadow-2xl">
                        <div className="flex flex-col gap-1">
                          {item.children.map((child, cIdx) => (
                            <a
                              key={cIdx}
                              href={child.href}
                              onClick={(e) => {
                                if (!child.href || child.href === '#') {
                                  e.preventDefault();
                                }
                                setActiveDropdown(null);
                              }}
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-700 transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                              <span>{child.label}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`text-[13px] font-medium transition-colors py-2 ${
                    index === 0
                      ? 'text-brand-700 font-semibold'
                      : 'text-ink-muted hover:text-brand-700'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <a
            href="#beranda"
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
            aria-label="LPMQ Kemenag RI"
          >
            <img
              src={logoTashih}
              alt="Logo Tashih LPMQ"
              className="h-10 w-auto object-contain"
            />
          </a>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="https://wa.me/628111997125"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi Layanan Tashih Online melalui WhatsApp"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-fill px-6 text-[12px] font-medium text-white transition hover:bg-brand-fill-hover"
            >
              <Phone className="h-3.5 w-3.5" />
              Kontak Kami
            </a>
            <Link
              to="/login"
              onClick={(e) => handleNavigate('/login', e)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-civic-infoSoft px-6 text-[12px] font-medium text-civic-info transition hover:bg-civic-infoLine"
            >
              Masuk
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="ml-auto rounded-xl p-2 text-brand-fg lg:hidden"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-line bg-surface px-5 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isMobileOpen = mobileDropdown === item.label;

                if (hasChildren) {
                  return (
                    <div key={item.label} className="rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle">
                        <a
                          href={item.href}
                          onClick={(e) => {
                            if (!item.href || item.href === '#') {
                              e.preventDefault();
                              setMobileDropdown((prev) => (prev === item.label ? null : item.label));
                              return;
                            }
                            setMenuOpen(false);
                          }}
                          className="flex-1 hover:text-brand-fg"
                        >
                          {item.label}
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            setMobileDropdown((prev) => (prev === item.label ? null : item.label))
                          }
                          className="p-1 rounded-md text-ink-muted hover:text-brand-fg focus:outline-none"
                          aria-label={`Toggle submenu ${item.label}`}
                          aria-expanded={isMobileOpen}
                        >
                          {isMobileOpen ? (
                            <Minus className="h-4 w-4 stroke-[2.5]" />
                          ) : (
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                          )}
                        </button>
                      </div>

                      {/* Submenu Mobile Collapsible dengan Background Putih */}
                      {isMobileOpen && (
                        <div className="mx-2 mb-2 p-2 bg-surface rounded-xl border border-line shadow-sm flex flex-col gap-1">
                          {item.children.map((child, cIdx) => (
                            <a
                              key={cIdx}
                              href={child.href}
                              onClick={(e) => {
                                if (!child.href || child.href === '#') {
                                  e.preventDefault();
                                }
                                setMenuOpen(false);
                                setMobileDropdown(null);
                              }}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:text-brand-700 hover:bg-brand-50 transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-600/70 shrink-0" />
                              <span>{child.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-surface-subtle hover:text-brand-fg"
                  >
                    {item.label}
                  </a>
                );
              })}
              <div className="mt-2 flex gap-2">
                <a
                  href="https://wa.me/628111997125"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hubungi Layanan Tashih Online melalui WhatsApp"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-fill px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-fill-hover"
                >
                  <Phone className="h-4 w-4" />
                  Kontak Kami
                </a>
                <Link
                  to="/login"
                  onClick={(e) => {
                    setMenuOpen(false);
                    handleNavigate('/login', e);
                  }}
                  className="flex flex-1 items-center justify-center rounded-full bg-civic-infoSoft px-4 py-3 text-sm font-medium text-civic-info transition hover:bg-civic-infoLine"
                >
                  Masuk
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full px-0 py-3 lg:py-0 space-y-12">
        {/* Section 1: Hero */}
        <section
          id="beranda"
          className="relative isolate min-h-[500px] overflow-hidden rounded-[0px] bg-brand-950 sm:min-h-[560px] lg:min-h-[610px]"
          aria-label="Slideshow gambar beranda"
          role="region"
        >
          {heroSlides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              aria-hidden={activeHeroSlide !== index}
              loading="eager"
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 motion-reduce:transition-none ${
                activeHeroSlide === index ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </section>

        {/* Quick Links Section: Akses Menu Cepat */}
        <section className="space-y-4" aria-label="Akses Menu Cepat">
          <div className="text-center pb-2">
            <span className="text-xs font-bold text-brand-fg uppercase tracking-wider block mb-1">
              Pintasan Layanan
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">
              Akses Menu Cepat
            </h2>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              const CardContent = (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 group-hover:scale-105 transition-transform shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="w-7 h-7 rounded-full bg-surface-subtle group-hover:bg-brand-fill group-hover:text-white flex items-center justify-center text-ink-muted transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-brand-fg transition-colors">
                      {item.title}
                    </h3>
                    {/* Deskripsi tersembunyi secara default dan hanya muncul saat kursor diarahkan (hover) */}
                    <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <div className="overflow-hidden">
                        <p className="pt-1.5 text-xs text-ink-muted leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );

              const cardClasses =
                "rounded-2xl bg-surface p-5 border border-line shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-brand-600/50 group flex flex-col justify-between";

              if (item.isInternal) {
                return (
                  <Link
                    key={item.title}
                    to={item.href}
                    onClick={(e) => handleNavigate(item.href, e)}
                    className={cardClasses}
                  >
                    {CardContent}
                  </Link>
                );
              }

              return (
                <a key={item.title} href={item.href} className={cardClasses}>
                  {CardContent}
                </a>
              );
            })}
          </div>
        </section>

        {/* Section: Informasi Pelayanan (Maklumat Pelayanan) */}
        <section
          id="informasi-pelayanan"
          aria-label="Informasi Pelayanan"
          className="rounded-2xl sm:rounded-3xl bg-surface p-6 sm:p-8 lg:p-10 border border-line shadow-xs"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Kolom Kiri: Maklumat Pelayanan, Statistik & Tanggal */}
            <div className="lg:col-span-7 flex flex-col space-y-6 sm:space-y-8">
              <div className="space-y-3">
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-700 tracking-tight"
                  aria-label="Informasi Pelayanan - Maklumat Pelayanan"
                >
                  Maklumat Pelayanan
                  <span className="sr-only"> - Maklumat Pelayanan</span>
                </h2>
                <p className="text-xs sm:text-sm text-ink leading-relaxed">
                  Dengan ini kami menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan. Apabila terdapat janji layanan (memberikan pelayanan secara profesional dan sepenuh hati) tegurlah dan laporkan ke unit pengaduan.
                </p>
              </div>

              {/* Tiga Kartu Statistik / Tracker dengan Animasi Berhitung saat Terlihat */}
              <div ref={statsRef} className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2 sm:gap-6">
                  {serviceStatistics.map((stat, idx) => {
                    const IconComponent = stat.icon;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center text-center p-2 sm:p-3 space-y-2"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-2xs">
                          <IconComponent className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                          <StatCounter target={stat.count} isVisible={statsVisible} />
                        </span>
                        <span className="text-[11px] sm:text-xs font-semibold text-ink-muted leading-snug">
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Keterangan Tanggal Pembaruan Data Dummy */}
                <p className="text-[11px] text-ink-muted text-center sm:text-left">
                  Data diambil per tanggal: 17 Oktober 2026
                </p>
              </div>
            </div>

            {/* Kolom Kanan: Visi, Misi, dan Motto */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              {serviceValues.map((val, idx) => {
                const IconComponent = val.icon;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-2xl bg-brand-600 text-white p-5 sm:p-6 shadow-sm flex items-center gap-4 transition-all duration-200 hover:bg-brand-700"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-white border border-white/20">
                      <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                        {val.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/90 leading-snug">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: Layanan Pentashihan */}
        <section id="layanan-pentashihan" className="rounded-2xl bg-surface p-6 sm:p-8 border border-line space-y-6">
          <div className="border-b border-line pb-4">
            {/* <span className="text-xs font-bold text-brand-fg uppercase tracking-wider">Layanan Utama</span> */}
            <h2 className="text-2xl font-black text-ink mt-1">Layanan Pentashihan</h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Anda dapat memilih beberapa layanan pentashihan
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {pentashihanServices.map((service, idx) => {
              const IconComponent = service.icon;
              const hasRoute = Boolean(service.href);

              const cardContent = (
                <div className="p-6 rounded-2xl border border-line bg-surface-subtle hover:bg-surface hover:border-brand-600 hover:shadow-sm transition-all duration-300 group flex flex-col justify-between min-h-[140px] h-full cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors shadow-2xs">
                    <IconComponent className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="mt-5">
                    <h3 className="text-base font-bold text-ink group-hover:text-brand-700 transition-colors leading-snug">
                      {service.title}
                    </h3>
                  </div>
                </div>
              );

              if (hasRoute && service.isInternal) {
                return (
                  <Link
                    key={idx}
                    to={service.href}
                    onClick={(e) => handleNavigate(service.href, e)}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-2xl"
                  >
                    {cardContent}
                  </Link>
                );
              }

              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-2xl"
                  onClick={(e) => {
                    if (!service.href) {
                      e.preventDefault();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!service.href && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                    }
                  }}
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        </section>

        <Suspense
          fallback={
            <div
              className="flex h-80 items-center justify-center rounded-xl border border-line bg-surface-subtle text-sm text-ink-muted sm:h-96"
              role="status"
            >
              Memuat peta persebaran...
            </div>
          }
        >
          <DistributionMap />
        </Suspense>
      </main>

      <div className="lpmq-app-footer-gradient text-white">
        <section
          id="aplikasi-quran-kemenag"
          aria-labelledby="quran-app-title"
          className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 overflow-hidden px-5 py-10 sm:px-8 sm:py-12 md:grid-cols-[minmax(0,1.25fr)_minmax(170px,0.65fr)] lg:grid-cols-[minmax(0,1.2fr)_180px_minmax(280px,0.85fr)] lg:gap-10 lg:px-12 lg:py-14"
        >
          <div className="space-y-4">
            <h2
              id="quran-app-title"
              className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl"
            >
              Yuk Download Aplikasi
              <br />
              Qur’an Kemenag Sekarang!
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
              Dapatkan kenyamanan dan kemudahan membaca kitab suci Al-Qur’an kapan dan di mana saja. Dengan aplikasi Qur’an Kemenag, siapapun dapat mengecek Surat Tanda Tashih pada mushaf yang beredar di Indonesia.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="https://play.google.com/store/apps/details?id=com.quran.kemenag&hl=id&gl=US&pli=1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download Qur’an Kemenag di Google Play"
                className="inline-flex rounded-md focus-visible:ring-offset-brand-900"
              >
                <img
                  src={playstore}
                  alt="Get it on Google Play"
                  className="h-11 w-auto object-contain"
                />
              </a>
              <a
                href="https://apps.apple.com/us/app/quran-kemenag/id1626953037"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download Qur’an Kemenag di App Store"
                className="inline-flex rounded-md focus-visible:ring-offset-brand-900"
              >
                <img
                  src={appstore}
                  alt="Download on the App Store"
                  className="h-11 w-auto object-contain"
                />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 md:justify-self-end lg:justify-self-center">
            <div className="flex items-center justify-center gap-3">
              <img
                src={pilihanfitur}
                alt=""
                aria-hidden="true"
                className="h-7 w-7 shrink-0 object-contain"
              />
              <p className="text-right text-sm font-bold leading-tight text-white">
                Banyak Pilihan
                <br />
                Fitur
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-md border border-line text-ink">
              <Link
                to="/verifikasi/sertifikat/31.74.26.10.19.001"
                className="group block"
                title="Klik untuk membuka verifikasi sertifikat penerbit LPMQ"
              >
                <p className="mb-2 rounded border border-brand-300 bg-brand-800 px-2.5 py-1 text-xs font-semibold text-white group-hover:bg-brand-900 transition-colors">
                  Sertifikat Penerbit (QR)
                </p>
                <div className="relative mx-auto flex items-center justify-center p-1 bg-surface-subtle rounded-lg">
                  <img
                    src={qrcodeapk}
                    alt="QR code untuk mengunduh aplikasi dan verifikasi sertifikat penerbit"
                    className="h-32 w-32 object-contain sm:h-36 sm:w-36 group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="mt-2 text-left space-y-0.5 px-0.5 border-t border-line pt-1.5">
                  <span className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                    Alamat QR Verifikasi:
                  </span>
                  <span className="block font-mono text-[9px] text-brand-fg font-semibold break-all leading-tight">
                    tashih.kemenag.go.id/verifikasi/sertifikat/31.74.26.10.19.001
                  </span>
                </div>
              </Link>
            </div>
          </div>

          <div className="flex justify-center md:col-span-2 lg:col-span-1">
            <img
              src={mockup}
              alt="Tampilan aplikasi Qur’an Kemenag pada ponsel"
              className="h-72 w-full max-w-xs object-contain sm:h-80 md:h-96 md:max-w-sm lg:h-[440px] lg:max-w-none"
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-brand-950 text-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-8 lg:px-12 lg:py-12">
          <div className="space-y-4">
            <img
              src={logoTashih}
              alt="Logo Tashih LPMQ"
              className="w-32 max-w-full object-contain"
            />
            <address className="space-y-1 text-xs not-italic leading-relaxed text-white/85">
              <p>Gedung Bayt Al-Qur'an &amp; Museum Istiqlal</p>
              <p>Jalan Raya TMII Pintu I Jakarta Timur 13560</p>
              <p>Telp: (021) 8416468 - 8416466</p>
              <p>Faks: (021) 8416468</p>
              <p>Narahubung Layanan Pentashihan: +628111997125</p>
            </address>
            <div className="flex items-center gap-3 sm:gap-4">
              {socialMediaLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="inline-flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:ring-white"
                >
                  <img
                    src={social.icon}
                    alt={social.name}
                    className="h-5 w-auto object-contain sm:h-6"
                  />
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center md:justify-self-center lg:justify-self-stretch">
            <div className="w-full max-w-[340px] overflow-hidden rounded-xl border border-white/15">
              <iframe
                title="Peta lokasi Lajnah Pentashihan Mushaf Al-Qur'an di Gedung Bayt Al-Qur'an, TMII"
                src="https://maps.google.com/maps?q=Bayt%20Al-Qur%27an%20%26%20Museum%20Istiqlal%2C%20TMII%2C%20Jakarta%20Timur&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="h-44 w-full border-0 sm:h-48"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          <section aria-labelledby="about-us-title" className="space-y-4 md:col-span-2 lg:col-span-1">
            <h2 id="about-us-title" className="text-lg font-bold text-brand-300">
              TENTANG KAMI
            </h2>
            <div className="space-y-3 text-xs leading-relaxed text-white/85 sm:text-sm">
              <p>
                Ini adalah website Layanan Tashih Online Lajnah Pentashihan Mushaf Al-Qur'an Badan Litbang dan Diklat Kementerian Agama Republik Indonesia.
              </p>
              <p>
                Melalui website ini, perusahaan penerbit, Lembaga Pemerintah, dan Yayasan dapat mengajukan permohonan Surat Tanda Tashih dan/atau Surat Izin Edar untuk mushaf Al-Qur'an yang akan diedarkan di Indonesia.
              </p>
              <p>
                Melalui website ini, masyarakat dapat melaporkan aduan seputar mushaf Al-Qur'an dan mengecek Surat Tanda Tashih mushaf Al-Qur'an.
              </p>
            </div>
          </section>
        </div>

        <div className="border-t border-white/20">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-5 py-6 text-center text-xs text-white/80 sm:flex-row sm:px-8 sm:text-left lg:px-12">
            <p>
              Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama Republik Indonesia.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
              <a href="#informasi-pelayanan" className="hover:text-white">Regulasi</a>
              <a href="#beranda" className="hover:text-white">Pengaduan</a>
              <a href="#beranda" className="hover:text-white">FAQ</a>
              <Link
                to="/login"
                onClick={(e) => handleNavigate('/login', e)}
                className="font-semibold text-white hover:underline"
              >
                Portal Penerbit
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>

    {/* Loading Overlay Elegan saat Navigasi Berlangsung */}
    {isNavigating && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/60 backdrop-blur-xs transition-opacity duration-200 animate-page-in"
        role="status"
        aria-live="polite"
        aria-label="Memuat halaman..."
      >
        <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-surface/95 border border-line shadow-xl backdrop-blur-md">
          <div className="w-7 h-7 rounded-full border-3 border-brand-200 border-t-brand-700 animate-spin" />
          <span className="text-xs font-semibold text-ink-muted">Memuat halaman...</span>
        </div>
      </div>
    )}
  </>
  );
};

export default LandingPage;
