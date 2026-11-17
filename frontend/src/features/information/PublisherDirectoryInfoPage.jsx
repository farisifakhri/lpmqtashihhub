import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicAppPromotion } from '@/components/public/PublicAppPromotion';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from '@/components/public/PublicHeader';
import { publicApi } from '@/api/public.api';
import { PublisherDirectory } from '@/features/publisher-directory/PublisherDirectory';

const BASE_PATH = '/informasi/direktori-penerbit-mushaf';
const TITLE = "Direktori Penerbit Mushaf Al-Qur'an";

// Halaman Informasi publik: direktori yang sama dengan Super Admin, tanpa NPWP/NIB.
export function PublisherDirectoryInfoPage() {
  const navigate = useNavigate();
  const handleNavigate = (path, event) => {
    event?.preventDefault();
    if (path?.startsWith('/')) navigate(path);
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader
        activePage="Informasi"
        activeHref={BASE_PATH}
        handleNavigate={handleNavigate}
        navItems={PUBLIC_INFORMATION_NAV_ITEMS}
        logoHref="/"
      />
      <main className="mx-auto min-h-[55vh] max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-muted">
          <Link to="/" className="hover:text-brand-700">Beranda</Link>
          <span className="mx-2">/</span>
          <span>Informasi</span>
          <span className="mx-2">/</span>
          <span className="text-ink">{TITLE}</span>
        </nav>
        <section aria-labelledby="publisher-directory-title" className="space-y-5 rounded-2xl border border-line bg-surface px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <h1 id="publisher-directory-title" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {TITLE}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Daftar penerbit mushaf Al-Qur’an yang telah terdaftar dan terverifikasi di Lajnah Pentashihan Mushaf Al-Qur’an.
            </p>
          </div>
          <PublisherDirectory fetchDirectory={publicApi.publisherDirectory} />
        </section>
      </main>
      <PublicAppPromotion />
      <PublicFooter handleNavigate={handleNavigate} />
    </div>
  );
}

export default PublisherDirectoryInfoPage;
