import React from 'react';
import { Link } from 'react-router-dom';
import logoTashih from '@/assets/logo-lpmq1.webp';
import logoyt from '@/assets/logoyt.webp';
import logox from '@/assets/logox.webp';
import logoig from '@/assets/logoig.webp';
import logofb from '@/assets/logofb.webp';

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

const footerLinks = [
  { label: 'Regulasi', key: 'regulation', href: '/informasi/regulasi-penerbit-mushaf', emphasized: false },
  { label: 'Pengaduan', key: 'complaint', href: '#beranda', emphasized: false },
  { label: 'FAQ', key: 'faq', href: '/faq', emphasized: false },
  { label: 'Portal Penerbit', key: 'portal', href: '/login', emphasized: true },
];

export const PublicFooter = ({
  handleNavigate,
  linkTargets = {},
}) => (
  <footer className="bg-brand-950 text-white">
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-8 lg:px-12 lg:py-12">
      <div className="space-y-4">
        <img src={logoTashih} alt="Logo Tashih LPMQ" className="w-32 max-w-full object-contain" />
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
              <img src={social.icon} alt={social.name} className="h-5 w-auto object-contain sm:h-6" />
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
          {footerLinks.map((link) => {
            const href = linkTargets[link.key] || link.href;
            const className = link.emphasized
              ? 'font-semibold text-white hover:underline'
              : 'hover:text-white';
            const onClick = href.startsWith('/') && handleNavigate
              ? (event) => handleNavigate(href, event)
              : undefined;

            return href.startsWith('/') ? (
              <Link key={link.key} to={href} onClick={onClick} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={link.key} href={href} className={className}>
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  </footer>
);
