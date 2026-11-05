import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  FileCheck2,
  Clock,
  ShieldCheck,
  Building2,
  LogIn,
  UserPlus,
  Target,
  List,
  Quote,
  FileCheck,
  FilePlus,
  Users,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import heroImageFirst from '@/assets/berandaaku.webp';
import heroImageSecond from '@/assets/berandakii.webp';
import qrcodeapk from '@/assets/qrcodeapk.webp';
import mockup from '@/assets/mockup.webp';
import playstore from '@/assets/playstore.webp';
import appstore from '@/assets/appstore.webp';
import pilihanfitur from '@/assets/pilihanfitur.webp';

const DistributionMap = lazy(() => import('./DistributionMap'));

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

const HERO_SLIDE_INTERVAL_MS = 10000;
let heroSlideRemainingMs = HERO_SLIDE_INTERVAL_MS;

const extendedHeroSlides = [
  { ...heroSlides[heroSlides.length - 1], slideIndex: heroSlides.length - 1, isClone: true },
  ...heroSlides.map((slide, slideIndex) => ({ ...slide, slideIndex, isClone: false })),
  { ...heroSlides[0], slideIndex: 0, isClone: true },
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
  const location = useLocation();
  const isLandingRoute = location.pathname === '/' || location.pathname === '/landing';
  const [isNavigating, setIsNavigating] = useState(false);
  const [heroTrackIndex, setHeroTrackIndex] = useState(1);
  const [isHeroTrackTransitionEnabled, setIsHeroTrackTransitionEnabled] = useState(true);
  const isHeroTrackTransitioningRef = useRef(false);
  const pendingHeroDirectionsRef = useRef([]);
  const heroSectionRef = useRef(null);
  const heroTimerRef = useRef(null);
  const heroTimerDeadlineRef = useRef(null);
  const heroTimerRemainingRef = useRef(heroSlideRemainingMs);
  const heroTimerControlsRef = useRef(null);
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const activeHeroSlide = (heroTrackIndex - 1 + heroSlides.length) % heroSlides.length;

  const navigateHeroSlide = useCallback((direction) => {
    heroTimerRemainingRef.current = HERO_SLIDE_INTERVAL_MS;
    heroSlideRemainingMs = HERO_SLIDE_INTERVAL_MS;
    heroTimerControlsRef.current?.restart();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setHeroTrackIndex((currentIndex) => {
        const nextIndex = currentIndex + direction;
        if (nextIndex === 0) return heroSlides.length;
        if (nextIndex === heroSlides.length + 1) return 1;
        return nextIndex;
      });
      return;
    }

    if (isHeroTrackTransitioningRef.current) {
      pendingHeroDirectionsRef.current.push(direction);
      return;
    }

    isHeroTrackTransitioningRef.current = true;
    setHeroTrackIndex((currentIndex) => currentIndex + direction);
  }, []);

  useEffect(() => {
    let isHeroVisible = true;

    const pauseTimer = () => {
      if (heroTimerRef.current !== null) {
        window.clearTimeout(heroTimerRef.current);
        heroTimerRef.current = null;
        if (heroTimerDeadlineRef.current !== null) {
          heroTimerRemainingRef.current = Math.max(
            0,
            heroTimerDeadlineRef.current - Date.now()
          );
          heroSlideRemainingMs = heroTimerRemainingRef.current;
        }
      }
      heroTimerDeadlineRef.current = null;
    };

    const startTimer = (delay = heroTimerRemainingRef.current) => {
      if (
        !isLandingRoute ||
        !isHeroVisible ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      if (heroTimerRef.current !== null) return;

      heroTimerRemainingRef.current = delay;
      heroSlideRemainingMs = delay;
      heroTimerDeadlineRef.current = Date.now() + delay;
      heroTimerRef.current = window.setTimeout(() => {
        heroTimerRef.current = null;
        heroTimerDeadlineRef.current = null;
        navigateHeroSlide(1);
      }, delay);
    };

    const restartTimer = () => {
      pauseTimer();
      heroTimerRemainingRef.current = HERO_SLIDE_INTERVAL_MS;
      heroSlideRemainingMs = HERO_SLIDE_INTERVAL_MS;
      startTimer(HERO_SLIDE_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseTimer();
      } else {
        startTimer();
      }
    };

    let heroObserver;
    if (typeof window.IntersectionObserver !== 'undefined' && heroSectionRef.current) {
      isHeroVisible = false;
      heroObserver = new IntersectionObserver(([entry]) => {
        if (!entry) return;
        isHeroVisible = entry.isIntersecting;
        if (isHeroVisible) {
          startTimer();
        } else {
          pauseTimer();
        }
      });
      heroObserver.observe(heroSectionRef.current);
    }

    heroTimerControlsRef.current = { restart: restartTimer };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      heroObserver?.disconnect();
      pauseTimer();
      if (heroTimerControlsRef.current?.restart === restartTimer) {
        heroTimerControlsRef.current = null;
      }
    };
  }, [isLandingRoute, navigateHeroSlide]);

  useEffect(() => {
    if (isHeroTrackTransitionEnabled) return undefined;

    let secondFrameId;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsHeroTrackTransitionEnabled(true);
        const nextDirection = pendingHeroDirectionsRef.current.shift();
        if (nextDirection === undefined) {
          isHeroTrackTransitioningRef.current = false;
        } else {
          setHeroTrackIndex((currentIndex) => currentIndex + nextDirection);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [isHeroTrackTransitionEnabled]);

  const handleHeroTrackTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;

    if (heroTrackIndex === 0 || heroTrackIndex === heroSlides.length + 1) {
      setIsHeroTrackTransitionEnabled(false);
      setHeroTrackIndex(heroTrackIndex === 0 ? heroSlides.length : 1);
      return;
    }

    const nextDirection = pendingHeroDirectionsRef.current.shift();
    if (nextDirection === undefined) {
      isHeroTrackTransitioningRef.current = false;
    } else {
      setHeroTrackIndex((currentIndex) => currentIndex + nextDirection);
    }
  };

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
      <PublicHeader handleNavigate={handleNavigate} />

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] px-5 py-3 sm:px-8 lg:px-12 lg:py-4 space-y-12">
        {/* Section 1: Hero */}
        <section
          ref={heroSectionRef}
          id="beranda"
          className="relative isolate min-h-[500px] overflow-hidden rounded-[20px] bg-brand-950 sm:min-h-[560px] lg:min-h-[610px]"
          aria-label="Slideshow gambar beranda"
          role="region"
        >
          <div
            data-hero-track
            className={`absolute inset-0 flex ${
              isHeroTrackTransitionEnabled
                ? 'transition-transform duration-[600ms] ease-in-out motion-reduce:transition-none'
                : 'transition-none'
            }`}
            style={{
              width: `${extendedHeroSlides.length * 100}%`,
              transform: `translateX(-${(heroTrackIndex * 100) / extendedHeroSlides.length}%)`,
            }}
            onTransitionEnd={handleHeroTrackTransitionEnd}
          >
            {extendedHeroSlides.map((slide, index) => (
              <div
                key={`${slide.src}-${index}`}
                aria-hidden={slide.isClone || activeHeroSlide !== slide.slideIndex}
                className="relative h-full shrink-0"
                style={{ flex: `0 0 ${100 / extendedHeroSlides.length}%` }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    background:
                      'linear-gradient(to right, #143001 0%, rgba(20, 48, 1, 0.85) 30%, rgba(20, 48, 1, 0.4) 60%, transparent 100%)',
                  }}
                />
                {slide.slideIndex === 0 && (
                  <div className="absolute inset-0 z-20 flex items-center justify-start px-16 py-10 text-left sm:px-20 lg:px-24">
                    <div className="w-full max-w-2xl">
                      <span className="inline-flex max-w-full rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur-md sm:text-sm">
                        Kementerian Agama Republik Indonesia
                      </span>
                      <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                        Layanan Surat Tanda Tashih Al-Qur’an
                      </h1>
                      <p className="mt-4 text-base leading-relaxed text-white sm:mt-5 sm:text-lg lg:text-xl">
                        Layanan resmi penerbitan Surat Tanda Tashih (STT) untuk mushaf cetak,
                        mushaf digital, dan rekaman audio/visual.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            aria-label="Slide sebelumnya"
            onClick={() => navigateHeroSlide(-1)}
            className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5"
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Slide berikutnya"
            onClick={() => navigateHeroSlide(1)}
            className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>
        </section>

        {/* Quick Links Section: Akses Menu Cepat */}
        <section className="space-y-4" aria-label="Akses Menu Cepat">
          <div className="text-center pb-2">
            <span className="text-xs font-bold text-lpmq-green uppercase tracking-wider block mb-1">
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
                    <div className="w-10 h-10 rounded-xl bg-lpmq-soft border border-lpmq-border flex items-center justify-center text-lpmq-green group-hover:scale-105 transition-transform shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="w-7 h-7 rounded-full bg-surface-subtle group-hover:bg-lpmq-green group-hover:text-white flex items-center justify-center text-lpmq-green transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-lpmq-green transition-colors">
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
                "rounded-2xl bg-surface p-5 border border-line shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:bg-lpmq-soft hover:shadow-md hover:border-lpmq-green/50 group flex flex-col justify-between";

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
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-lpmq-green tracking-tight"
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
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-lpmq-green text-white flex items-center justify-center shadow-2xs">
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
                    className="flex-1 rounded-2xl bg-lpmq-green text-white p-5 sm:p-6 shadow-sm flex items-center gap-4 transition-all duration-200 hover:bg-lpmq-dark"
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
                <div className="p-6 rounded-2xl border border-lpmq-border bg-white hover:bg-lpmq-soft hover:border-lpmq-green group-active:bg-lpmq-green group-active:border-lpmq-green hover:shadow-sm transition-all duration-300 group flex flex-col justify-between min-h-[140px] h-full cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-lpmq-soft text-lpmq-green flex items-center justify-center group-hover:ring-2 group-hover:ring-lpmq-accent group-hover:ring-offset-1 group-active:bg-lpmq-green group-active:text-white transition-all duration-300 shadow-2xs">
                    <IconComponent className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="mt-5">
                    <h3 className="text-base font-bold text-ink group-hover:text-lpmq-green group-active:text-white transition-colors duration-300 leading-snug">
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
                    className="group active:bg-lpmq-green active:border-lpmq-green block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpmq-green rounded-2xl"
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
                  className="group active:bg-lpmq-green active:border-lpmq-green block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpmq-green rounded-2xl"
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
            <div className="rounded-lg bg-white p-2 text-center">
              <p className="mb-2 rounded border border-brand-300 bg-brand-800 px-2 py-1 text-xs font-semibold text-white">
                Scan untuk Download
              </p>
              <img
                src={qrcodeapk}
                alt="QR code untuk mengunduh aplikasi Qur’an Kemenag"
                className="h-32 w-32 object-contain sm:h-36 sm:w-36"
              />
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

      <PublicFooter handleNavigate={handleNavigate} />
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
