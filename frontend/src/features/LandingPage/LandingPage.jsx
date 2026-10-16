import React, { useState, useMemo } from 'react';
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
  ShieldAlert,
  ShieldCheck,
  Mail,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Building2,
  MessageSquareWarning,
  Layers,
  Plus,
  Minus,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import heroImage from '@/assets/berandaaku.webp';
import logoTashih from '@/assets/logo-lpmq1.webp';

const navItems = [
  { label: 'Beranda', href: '#beranda' },
  {
    label: 'Informasi',
    href: '#informasi',
    children: [
      { label: 'Informasi Layanan Pentashihan', href: '#informasi' },
      { label: 'Alur & Regulasi STT', href: '#alur-stt' },
      { label: 'Persyaratan Berkas Naskah', href: '#informasi' },
    ],
  },
  { label: 'Permohonan Master', href: '#master' },
  {
    label: 'Pengaduan',
    href: '#pengaduan',
    children: [
      { label: 'Saluran Pengaduan Masyarakat', href: '#pengaduan' },
      { label: 'Cek Status Laporan Naskah', href: '#pengaduan' },
      { label: 'Kontak Pusat Bantuan LPMQ', href: '#pengaduan' },
    ],
  },
  { label: 'FAQ', href: '#faq' },
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
    href: '#informasi',
    isInternal: false,
    icon: Clock,
  },
  {
    title: 'Prosedur Pelayanan',
    desc: 'Tata cara dan SOP pengajuan naskah Al-Qur\'an',
    href: '#informasi',
    isInternal: false,
    icon: BookOpen,
  },
  {
    title: 'Standar Pelayanan',
    desc: 'Maklumat mutu, jangka waktu SLA, dan tarif PNBP',
    href: '#informasi',
    isInternal: false,
    icon: ShieldCheck,
  },
];

const FAQ_LIST = [
  {
    q: 'Berapa lama masa berlaku Surat Tanda Tashih (STT)?',
    a: 'Surat Tanda Tashih resmi berlaku selama 2 (dua) tahun kalender sejak tanggal pengesahan oleh Kepala LPMQ. Penerbit dapat mengajukan perpanjangan (extension) sebelum masa berlaku berakhir.',
  },
  {
    q: 'Bagaimana alur pendaftaran naskah mushaf Al-Qur’an?',
    a: 'Alur meliputi: 1) Registrasi Akun Penerbit & verifikasi legalitas; 2) Pengajuan draf mushaf & unggah berkas naskah; 3) Verifikasi kelengkapan naskah oleh verifikator; 4) Pembayaran tarif PNBP; 5) Sidang pentashihan oleh tim pentashih; 6) Penerbitan Surat Tanda Tashih (STT) resmi ber-QR Code.',
  },
  {
    q: 'Apakah mushaf digital atau aplikasi Android (APK) dapat ditashih?',
    a: 'Ya, LPMQ melayani pentashihan mushaf digital dalam bentuk berkas paket Android (APK) maupun tautan resmi (URL HTTPS). Verifikator dan pentashih akan memeriksa integritas teks ayat, harakat, dan tanda baca pada aplikasi.',
  },
  {
    q: 'Apakah ada biaya tambahan untuk revisi naskah yang memerlukan perbaikan?',
    a: 'Tidak ada biaya tambahan untuk putaran perbaikan telaah pentashihan. Tarif PNBP dihitung per naskah/STT dan add-on materi tambahan (seperti terjemah, transliterasi, atau tafsir) yang tercatat resmi pada saat pendaftaran awal.',
  },
  {
    q: 'Di mana lokasi penyerahan master naskah fisik jika diperlukan?',
    a: 'Naskah fisik diserahkan ke Loket Pelayanan Pentashihan LPMQ di Gedung Bayt Al-Qur\'an & Museum Istiqlal, Jalan Raya TMII Pintu I, Jakarta Timur 13560.',
  },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileDropdown, setMobileDropdown] = useState(null);

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

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_LIST;
    const query = searchQuery.toLowerCase();
    return FAQ_LIST.filter(
      (item) => item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const faqSection = document.getElementById('faq');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth' });
    }
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
                      <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
                        <div className="flex flex-col gap-1">
                          {item.children.map((child, cIdx) => (
                            <a
                              key={cIdx}
                              href={child.href}
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-[#f0f7e9] hover:text-[#4e9508] transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#579b0a] shrink-0" />
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
              href="tel:+622187798807"
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
                          onClick={() => setMenuOpen(false)}
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
                        <div className="mx-2 mb-2 p-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          {item.children.map((child, cIdx) => (
                            <a
                              key={cIdx}
                              href={child.href}
                              onClick={() => {
                                setMenuOpen(false);
                                setMobileDropdown(null);
                              }}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:text-[#4e9508] hover:bg-[#f0f7e9] transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#579b0a]/70 shrink-0" />
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
                  href="tel:+622187798807"
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
      <main className="mx-auto max-w-[1400px] px-5 py-3 sm:px-8 lg:px-12 lg:py-4 space-y-12">
        {/* Section 1: Hero */}
        <section
          id="beranda"
          className="relative isolate flex min-h-[500px] items-center justify-center overflow-hidden rounded-[28px] bg-brand-950 sm:min-h-[560px] lg:min-h-[610px]"
          aria-labelledby="hero-title"
        >
          <img
            src={heroImage}
            alt="Al-Qur'an"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/25 to-brand-fill/95" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-brand-fill-hover/95 to-transparent" />

          <div className="w-full max-w-4xl px-5 text-center text-white sm:px-8">
            <span className="inline-block px-3.5 py-1.5 mb-4 text-xs font-semibold rounded-full bg-white/10 text-white border border-white/20 backdrop-blur">
              Kementerian Agama Republik Indonesia
            </span>
            <h1
              id="hero-title"
              className="mx-auto max-w-3xl text-4xl font-black leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[54px]"
            >
              Layanan Surat Tanda Tashih
              <br />
              Al-Qur’an
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/80 max-w-xl mx-auto">
              Layanan resmi penerbitan Surat Tanda Tashih (STT) untuk mushaf cetak, mushaf digital, dan rekaman audio/visual.
            </p>

            {
            
           
            <form
              className="mx-auto mt-8 flex h-[58px] max-w-[520px] items-center rounded-full bg-surface p-1.5 shadow-lg sm:mt-9"
              onSubmit={handleSearchSubmit}
            >
              <Search className="ml-4 h-5 w-5 shrink-0 text-ink-muted" />

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari syarat, alur, atau pertanyaan FAQ..."
                aria-label="Cari informasi"
                className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 text-sm text-ink outline-none shadow-none ring-0 focus:border-0 focus:outline-none focus:shadow-none focus:ring-0 focus-visible:outline-none active:outline-none placeholder:text-ink-muted"
              />

              <button
                type="submit"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-fill text-white transition hover:bg-brand-fill-hover"
                aria-label="Cari"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
           }
          </div>
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

        {/* Section: Alur Layanan STT (Surat Tanda Tashih) */}
        <section id="alur-stt" className="rounded-2xl bg-surface p-6 sm:p-8 border border-line space-y-6">
          <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-brand-fg uppercase tracking-wider">Tahapan Layanan</span>
              <h2 className="text-2xl font-black text-ink mt-1">Alur Penerbitan Surat Tanda Tashih (STT)</h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1">
                Enam tahapan terpadu proses pentashihan Al-Qur'an resmi Kementerian Agama Republik Indonesia.
              </p>
            </div>
            <Link
              to="/login"
              onClick={(e) => handleNavigate('/login', e)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-fill hover:bg-brand-fill-hover text-white font-semibold text-xs transition shadow-2xs self-start sm:self-auto"
            >
              Mulai Pendaftaran <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Pengajuan & Registrasi Naskah',
                desc: 'Penerbit mendaftarkan akun, melengkapi identitas legalitas (NIB/Akta), mengisi spesifikasi mushaf, dan mengunggah berkas draf naskah (PDF/APK).'
              },
              {
                step: '02',
                title: 'Verifikasi Dokumen & Administrasi',
                desc: 'Petugas verifikator LPMQ memeriksa kelengkapan format mushaf, surat permohonan, sampel halaman, dan validitas URL/APK digital.'
              },
              {
                step: '03',
                title: 'Pembayaran Tarif PNBP Resmi',
                desc: 'Penerbit melunasi billing PNBP resmi (SIMPONI Kemenkeu) sesuai jenis naskah dan komponen add-on materi (terjemah/tafsir).'
              },
              {
                step: '04',
                title: 'Sidang & Telaah Pentashihan',
                desc: 'Tim pentashih LPMQ menelaah teks ayat Al-Qur’an, harakat, waqaf, dan rasm Usmani secara mendalam melalui lembar kerja telaah.'
              },
              {
                step: '05',
                title: 'Penyerahan Master & Dumi Cetak',
                desc: 'Penerbit menyerahkan master fisik/dumi cetak untuk validasi kesesuaian cetak terakhir oleh distributor dan pentashih.'
              },
              {
                step: '06',
                title: 'Penerbitan STT Resmi Ber-QR',
                desc: 'Kepala LPMQ menandatangani Surat Tanda Tashih elektronik yang dilengkapi QR Code pengesahan berizin edar nasional.'
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-5 rounded-xl border border-line bg-surface-subtle hover:border-brand-700 hover:shadow-2xs transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    {item.step}
                  </span>
                  <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                    Langkah {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Informasi Layanan */}
        <section id="informasi" className="rounded-2xl bg-surface p-6 sm:p-8 border border-line space-y-6">
          <div className="border-b border-line pb-4">
            <span className="text-xs font-bold text-brand-fg uppercase tracking-wider">Regulasi & Ketentuan</span>
            <h2 className="text-2xl font-black text-ink mt-1">Informasi Layanan Pentashihan</h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Dasar hukum pelaksanaan pentashihan berlandaskan PMA Nomor 44 Tahun 2016 tentang Penerbitan, Pentashihan, dan Peredaran Mushaf Al-Qur'an.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="p-4 rounded-xl bg-surface-subtle border border-line space-y-2">
              <div className="p-2 rounded-lg bg-brand-100 text-brand-800 w-fit">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">Naskah yang Wajib Ditashih</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Setiap mushaf Al-Qur'an dalam bentuk cetak 30 juz, surah pilihan (Yasin, Juz 'Amma), mushaf digital (APK/Web), dan audio/visual yang diterbitkan atau diedarkan di Indonesia wajib memiliki Surat Tanda Tashih yang masih berlaku.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-subtle border border-line space-y-2">
              <div className="p-2 rounded-lg bg-brand-100 text-brand-800 w-fit">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">Dokumen Persyaratan</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Penerbit wajib mengunggah: 1) Akta Perusahaan/NIB; 2) Surat Permohonan resmi; 3) Draf halaman cover; 4) Contoh halaman naskah; 5) Berkas paket APK atau URL resmi untuk mushaf digital.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-subtle border border-line space-y-2">
              <div className="p-2 rounded-lg bg-brand-100 text-brand-800 w-fit">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">Standar Waktu Layanan (SLA)</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Pemeriksaan tahap awal diselesaikan dalam 15 hari kerja. Putaran revisi perbaikan ditelaah dalam 7 hari kerja, dan pemeriksaan dumi cetak akhir selesai dalam 3 hari kerja.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Layanan Pengaduan */}
        <section id="pengaduan" className="rounded-2xl bg-surface p-6 sm:p-8 border border-line space-y-6">
          <div className="border-b border-line pb-4">
            <span className="text-xs font-bold text-brand-fg uppercase tracking-wider">Layanan Masyarakat</span>
            <h2 className="text-2xl font-black text-ink mt-1">Saluran Pengaduan & Bantuan</h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              Sampaikan saran, kendala layanan, atau temuan mushaf yang diduga mengalami kesalahan cetak langsung kepada petugas LPMQ.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl bg-surface-subtle border border-line space-y-3">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <Building2 className="w-4 h-4 text-brand-700" />
                  <span>Loket Pelayanan Langsung</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Gedung Bayt Al-Qur'an & Museum Istiqlal, Jalan Raya TMII Pintu I, Jakarta Timur 13560.
                </p>
                <p className="text-xs text-ink-muted">
                  Senin - Jumat: 08.00 - 15.30 WIB
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-line space-y-3">
                <div className="flex items-center gap-2 text-ink font-bold text-sm">
                  <Phone className="w-4 h-4 text-brand-700" />
                  <span>Kontak Resmi</span>
                </div>
                <p className="text-xs text-ink-muted">
                  Telepon: (021) 87798807 / 8416466<br />
                  Email: lajnah@kemenag.go.id<br />
                  Website: lajnah.kemenag.go.id
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold w-fit">
                  <Clock className="w-3.5 h-3.5 text-brand-700" />
                  <span>Formulir Daring Segera Hadir</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-ink">
                    Pengaduan Kesalahan Naskah & Layanan Terintegrasi
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Sistem pelaporan kesalahan teks mushaf dengan verifikasi kontak dan nomor tiket mandiri sedang dalam integrasi penuh (Tahap 5 SOP LPMQ). Selama masa persiapan, seluruh laporan masyarakat ditindaklanjuti secara manual dan resmi melalui saluran berikut:
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-lg bg-surface border border-line flex items-start gap-3">
                    <div className="p-2 rounded-md bg-brand-50 text-brand-700 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-ink">Kanal Email Resmi Pentashihan</h4>
                      <p className="text-xs text-ink font-semibold">lajnah@kemenag.go.id</p>
                      <p className="text-[11px] text-ink-muted">
                        Format subjek: <span className="font-mono text-ink">[PENGADUAN] Judul Mushaf / Nama Penerbit / Temuan</span>. Lampirkan foto halaman naskah yang keliru dan halaman tanda tashih (jika ada).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-surface border border-line flex items-start gap-3">
                    <div className="p-2 rounded-md bg-brand-50 text-brand-700 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-ink">Hotline & Telepon Resmi</h4>
                      <p className="text-xs text-ink font-semibold">(021) 87798807 / 8416466</p>
                      <p className="text-[11px] text-ink-muted">
                        Melayani konsultasi teknis, verifikasi keabsahan STT mushaf, dan pelaporan peredaran naskah pada hari kerja pukul 08.00 - 15.30 WIB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-surface-subtle p-3 border border-line text-[11px] text-ink-muted leading-normal">
                  <p>
                    <strong>Komitmen LPMQ:</strong> Setiap laporan yang menyertakan identitas pelapor dan bukti visual akan diverifikasi langsung oleh Tim Pentashih Mushaf Al-Qur'an Kementerian Agama RI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Permohonan Master */}
        <section id="master" className="rounded-2xl bg-surface p-6 sm:p-8 border border-line space-y-6">
          <div className="border-b border-line pb-4">
            <span className="text-xs font-bold text-brand-fg uppercase tracking-wider">Mushaf Standar</span>
            <h2 className="text-2xl font-black text-ink mt-1">Permohonan Master Mushaf Standar Indonesia</h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              LPMQ menyediakan salinan rujukan Mushaf Standar Indonesia (MSI) dalam rasm Usmani bagi penerbit berizin.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-xl border border-line bg-surface-subtle space-y-2">
              <div className="flex items-center gap-2 text-ink font-bold text-sm">
                <Layers className="w-4 h-4 text-brand-700" />
                <span>Master Fisik Cetak 30 Juz</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Salinan master fisik rujukan resmi ukuran A4 per juz. Disediakan untuk penerbit yang ingin menerbitkan mushaf cetak standar Usmani sesuai ketetapan Muktamar Ulama Al-Qur'an.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-line bg-surface-subtle space-y-2">
              <div className="flex items-center gap-2 text-ink font-bold text-sm">
                <FileCheck2 className="w-4 h-4 text-brand-700" />
                <span>Font & Aset Digital Resmi</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Font LPMQ Misbah dan aset glif resmi dapat digunakan oleh pengembang aplikasi Al-Qur'an digital setelah memperoleh rekomendasi teknis dari LPMQ.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: FAQ */}
        <section id="faq" className="rounded-2xl bg-surface p-6 sm:p-8 border border-line space-y-6">
          <div className="border-b border-line pb-4">
            <span className="text-xs font-bold text-brand-fg uppercase tracking-wider">Tanya Jawab</span>
            <h2 className="text-2xl font-black text-ink mt-1">Pertanyaan yang Sering Diajukan (FAQ)</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
              <p className="text-xs sm:text-sm text-ink-muted">
                {searchQuery
                  ? `Menampilkan hasil pencarian untuk "${searchQuery}" (${filteredFaqs.length} ditemukan)`
                  : 'Informasi lengkap seputar mekanisme pendaftaran, biaya, dan tata cara pentashihan Al-Qur\'an.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-brand-fg hover:underline w-fit"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <p className="text-xs text-ink-muted py-4 text-center">
                Tidak ada pertanyaan yang sesuai dengan kata kunci "{searchQuery}".
              </p>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={faq.q}
                    className="rounded-xl border border-line bg-surface-subtle overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-ink"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-ink-muted leading-relaxed border-t border-line/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-line bg-surface py-8">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <p>
            Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama Republik Indonesia.
          </p>
          <div className="flex items-center gap-4">
            <a href="#informasi" className="hover:text-brand-fg">Regulasi</a>
            <a href="#pengaduan" className="hover:text-brand-fg">Pengaduan</a>
            <a href="#faq" className="hover:text-brand-fg">FAQ</a>
            <Link
              to="/login"
              onClick={(e) => handleNavigate('/login', e)}
              className="font-semibold text-brand-fg hover:underline"
            >
              Portal Penerbit
            </Link>
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
