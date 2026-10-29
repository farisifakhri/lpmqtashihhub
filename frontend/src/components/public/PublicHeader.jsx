import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Minus, Phone, Plus, X } from 'lucide-react';
import logoTashih from '@/assets/logo-lpmq1.webp';

export const PUBLIC_NAV_ITEMS = [
  { label: 'Beranda', href: '#beranda' },
  {
    label: 'Informasi',
    href: '#',
    children: [
      { label: 'Informasi Layanan Pentashihan', href: '#' },
      { label: 'Alur & Regulasi STT', href: '#' },
      { label: 'Persyaratan Berkas Naskah', href: '#' },
      { label: "Regulasi Penerbit Mushaf Al-Qur'an", href: '/informasi/regulasi-penerbit-mushaf' },
      { label: 'Panduan Permohonan Surat Tanda Tashih/Izin Edar', href: '/informasi/panduan-permohonan-surat-tanda-tashih' },
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

export const PUBLIC_INFORMATION_NAV_ITEMS = PUBLIC_NAV_ITEMS.map((item) => ({
  ...item,
  href: item.label === 'Informasi' || item.label === 'Pengaduan' ? '#' : '/',
  children: item.children?.map((child) => ({
    ...child,
    href: child.label === "Regulasi Penerbit Mushaf Al-Qur'an" ||
      child.label === 'Panduan Permohonan Surat Tanda Tashih/Izin Edar'
      ? child.href
      : item.label === 'Informasi'
        ? '/'
        : item.label === 'Pengaduan'
          ? '/'
          : '#',
  })),
}));

export const PublicHeader = ({
  activePage = 'Beranda',
  activeHref,
  handleNavigate,
  navItems = PUBLIC_NAV_ITEMS,
  logoHref = '#beranda',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileDropdown, setMobileDropdown] = useState(null);

  const handleInternalNavigation = (path, event) => {
    if (handleNavigate) {
      handleNavigate(path, event);
      return;
    }
    if (event) event.preventDefault();
  };

  const handleChildClick = (child, event) => {
    if (child.href?.startsWith('/')) {
      setMenuOpen(false);
      setMobileDropdown(null);
      setActiveDropdown(null);
      handleInternalNavigation(child.href, event);
      return;
    }
    if (!child.href || child.href === '#') event.preventDefault();
    setActiveDropdown(null);
    setMenuOpen(false);
    setMobileDropdown(null);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
          {navItems.map((item, index) => {
            const hasChildren = item.children?.length > 0;
            const isOpen = activeDropdown === item.label;
            const isActive = activePage === item.label;

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
                    onClick={(event) => {
                      if (!item.href || item.href === '#') event.preventDefault();
                    }}
                    className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
                      isOpen || isActive
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
                  <div
                    className={`absolute left-0 top-full pt-2 w-64 z-50 transition-all duration-200 ease-out origin-top-left ${
                      isOpen
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                    }`}
                  >
                    <div className="rounded-2xl border border-line bg-surface p-2 shadow-2xl">
                      <div className="flex flex-col gap-1">
                        {item.children.map((child, childIndex) => {
                          const isCurrent = child.href === activeHref;
                          return (
                            <a
                              key={childIndex}
                              href={child.href}
                              onClick={(event) => handleChildClick(child, event)}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-700 transition-colors ${
                                isCurrent ? 'bg-brand-50 text-brand-700' : ''
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? 'bg-brand-700' : 'bg-brand-600'}`} />
                              <span>{child.label}</span>
                            </a>
                          );
                        })}
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
                onClick={(event) => {
                  if (item.href.startsWith('/')) handleInternalNavigation(item.href, event);
                  else setMenuOpen(false);
                }}
                className={`text-[13px] font-medium transition-colors py-2 ${
                  isActive || (activePage === 'Beranda' && index === 0)
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
          href={logoHref}
          onClick={(event) => {
            if (logoHref.startsWith('/')) handleInternalNavigation(logoHref, event);
          }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          aria-label="LPMQ Kemenag RI"
        >
          <img src={logoTashih} alt="Logo Tashih LPMQ" className="h-10 w-auto object-contain" />
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
            onClick={(event) => handleInternalNavigation('/login', event)}
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
              const hasChildren = item.children?.length > 0;
              const isMobileOpen = mobileDropdown === item.label;

              if (hasChildren) {
                return (
                  <div key={item.label} className="rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle">
                      <a
                        href={item.href}
                        onClick={(event) => {
                          if (!item.href || item.href === '#') {
                            event.preventDefault();
                            setMobileDropdown((previous) => previous === item.label ? null : item.label);
                          } else {
                            setMenuOpen(false);
                          }
                        }}
                        className={`flex-1 hover:text-brand-fg ${
                          activePage === item.label ? 'font-semibold text-brand-fg' : ''
                        }`}
                      >
                        {item.label}
                      </a>
                      <button
                        type="button"
                        onClick={() => setMobileDropdown((previous) => previous === item.label ? null : item.label)}
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
                    {isMobileOpen && (
                      <div className="mx-2 mb-2 p-2 bg-surface rounded-xl border border-line shadow-sm flex flex-col gap-1">
                        {item.children.map((child, childIndex) => (
                          <a
                            key={childIndex}
                            href={child.href}
                            onClick={(event) => handleChildClick(child, event)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:text-brand-700 hover:bg-brand-50 transition-colors ${
                              child.href === activeHref
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-ink'
                            }`}
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
                  onClick={(event) => {
                    if (item.href.startsWith('/')) handleInternalNavigation(item.href, event);
                    setMenuOpen(false);
                  }}
                  className={`rounded-xl px-3 py-3 text-sm font-medium hover:bg-surface-subtle hover:text-brand-fg ${
                    activePage === item.label ? 'text-brand-fg' : 'text-ink'
                  }`}
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
                onClick={(event) => {
                  setMenuOpen(false);
                  handleInternalNavigation('/login', event);
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
  );
};
