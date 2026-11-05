import React from 'react';
import qrcodeapk from '@/assets/qrcodeapk.webp';
import mockup from '@/assets/mockup.webp';
import playstore from '@/assets/playstore.webp';
import appstore from '@/assets/appstore.webp';
import pilihanfitur from '@/assets/pilihanfitur.webp';

export function PublicAppPromotion() {
  return (
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
              <img src={playstore} alt="Get it on Google Play" className="h-11 w-auto object-contain" />
            </a>
            <a
              href="https://apps.apple.com/us/app/quran-kemenag/id1626953037"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Qur’an Kemenag di App Store"
              className="inline-flex rounded-md focus-visible:ring-offset-brand-900"
            >
              <img src={appstore} alt="Download on the App Store" className="h-11 w-auto object-contain" />
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 md:justify-self-end lg:justify-self-center">
          <div className="flex items-center justify-center gap-3">
            <img src={pilihanfitur} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
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
  );
}
