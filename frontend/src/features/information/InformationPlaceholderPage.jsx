import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicAppPromotion } from '@/components/public/PublicAppPromotion';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from '@/components/public/PublicHeader';

export function InformationPlaceholderPage({ title, basePath }) {
  const navigate = useNavigate();
  const handleNavigate = (path, event) => {
    event?.preventDefault();
    if (path?.startsWith('/')) navigate(path);
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader
        activePage="Informasi"
        activeHref={basePath}
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
          <span className="text-ink">{title}</span>
        </nav>
        <section
          aria-labelledby="information-placeholder-title"
          className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
        >
          <h1 id="information-placeholder-title" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-ink-muted" role="status">
            Halaman sedang dalam proses pembuatan.
          </p>
        </section>
      </main>
      <PublicAppPromotion />
      <PublicFooter handleNavigate={handleNavigate} />
    </div>
  );
}
