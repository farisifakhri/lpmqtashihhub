import React, { useState } from 'react';
import { ArrowRight, Menu, Phone, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/berandaa.png';
import logoTashih from '@/assets/logo-lpmq1.png';

const navItems = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Informasi', href: '#informasi' },
  { label: 'Pengaduan', href: '#pengaduan' },
  { label: 'Permohonan Master', href: '#master' },
  { label: 'FAQ', href: '#faq' },
];

export const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f7fb] font-poppins text-[#242424]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
            {navItems.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-[13px] font-medium transition-colors ${
                  index === 0 ? 'text-[#4e9508]' : 'text-[#363636] hover:text-[#4e9508]'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="#beranda"
            className="absolute left-1/2 -translate-x-1/2 text-[27px] font-semibold tracking-[-1.5px] text-[#5a990d]"
            aria-label="Tashih"
          >
             <img
            src={logoTashih}
            alt="Logo Tashih"
            className="h-10 w-auto object-contain"
  />
          </a>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="tel:+62210000000"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#579b0a] px-6 text-[12px] font-medium text-white transition hover:bg-[#478300]"
            >
              <Phone className="h-3.5 w-3.5" />
              Contact me
            </a>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#e3eaff] px-6 text-[12px] font-medium text-[#4e9508] transition hover:bg-[#d8e1ff]"
            >
              Login
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="ml-auto rounded-xl p-2 text-[#4e9508] lg:hidden"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-black/5 bg-white px-5 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-[#363636] hover:bg-[#f0f7e9] hover:text-[#4e9508]"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 flex gap-2">
                <a
                  href="tel:+62210000000"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#579b0a] px-4 py-3 text-sm font-medium text-white"
                >
                  <Phone className="h-4 w-4" />
                  Contact me
                </a>
                <Link
                  to="/login"
                  className="flex flex-1 items-center justify-center rounded-full bg-[#e3eaff] px-4 py-3 text-sm font-medium text-[#4e9508]"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="beranda" className="mx-auto max-w-[1400px] px-5 py-3 sm:px-8 lg:px-12 lg:py-4">
        <section
          className="relative isolate flex min-h-[500px] items-center justify-center overflow-hidden rounded-[28px] bg-[#123b18] sm:min-h-[560px] lg:min-h-[610px]"
          aria-labelledby="hero-title"
        >
          <img
            src={heroImage}
            alt="Al-Qur'an"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/25 to-[#278000]/95" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#287e00]/95 to-transparent" />

          <div className="w-full max-w-4xl px-5 text-center text-white sm:px-8">
            <h1
              id="hero-title"
              className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.12] tracking-[-1px] text-white drop-shadow-sm sm:text-5xl lg:text-[54px]"
            >
              Pendaftaran Penerbit Mushaf
              <br />
              Al-Qur’an
            </h1>

            <form
              className="mx-auto mt-8 flex h-[58px] max-w-[520px] items-center rounded-full bg-white p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.18)] sm:mt-9"
              onSubmit={(event) => event.preventDefault()}
            >
              <Search className="ml-4 h-5 w-5 shrink-0 text-[#85858e]" />
              <input
                type="search"
                placeholder="Temukan Disini.."
                aria-label="Cari informasi"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#333] outline-none placeholder:text-[#9b9ba3]"
              />
              <button
                type="submit"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5a9d0b] text-white transition hover:bg-[#478300]"
                aria-label="Cari"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan layanan">
          {['Informasi Layanan', 'Alur Pendaftaran', 'Status Permohonan', 'Pusat Bantuan'].map((item) => (
            <a
              key={item}
              href="#informasi"
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-[#303030]">{item}</p>
              <p className="mt-1 text-xs text-[#777]">Pelajari selengkapnya</p>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
