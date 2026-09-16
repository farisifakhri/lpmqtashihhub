import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, RefreshCw, WifiOff } from 'lucide-react';

const SURAH_AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,
  111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,
  73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,
  18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,
  12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,
  5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6,
];

const FALLBACK_AYAH = {
  arabic: 'إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ',
  translation: 'Sesungguhnya Kamilah yang menurunkan Al-Qur\'an dan pasti Kami pula yang memeliharanya.',
  source: 'QS. Al-Hijr: 9',
};

const API_BASE_URL = 'https://quran-api-id.vercel.app';

export const DailyQuranWidget = () => {
  const [ayah, setAyah] = useState(FALLBACK_AYAH);
  const [countdown, setCountdown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [usesFallback, setUsesFallback] = useState(false);
  const requestController = useRef(null);

  const loadRandomAyah = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const surahNumber = Math.floor(Math.random() * 114) + 1;
    const ayahNumber = Math.floor(Math.random() * SURAH_AYAH_COUNTS[surahNumber - 1]) + 1;

    setIsLoading(true);
    setUsesFallback(false);

    try {
      const response = await fetch(`${API_BASE_URL}/surah/${surahNumber}/${ayahNumber}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Respons API tidak berhasil.');

      const payload = await response.json();
      const data = payload?.data;
      const arabic = data?.text?.arab;
      const translation = data?.translation?.id;
      if (payload?.code !== 200 || !arabic || !translation) {
        throw new Error('Struktur respons API tidak valid.');
      }

      const surahName = data?.surah?.name?.transliteration?.id || `Surah ${surahNumber}`;
      const resolvedAyahNumber = data?.number?.inSurah || ayahNumber;
      setAyah({ arabic, translation, source: `QS. ${surahName}: ${resolvedAyahNumber}` });
      setCountdown(60);
    } catch (error) {
      if (requestController.current !== controller) return;
      setUsesFallback(true);
      setAyah(FALLBACK_AYAH);
    } finally {
      clearTimeout(timeoutId);
      if (requestController.current === controller) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRandomAyah();
    return () => {
      const activeController = requestController.current;
      requestController.current = null;
      activeController?.abort();
    };
  }, [loadRandomAyah]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          loadRandomAyah();
          return 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadRandomAyah]);

  return (
    <section className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/25 to-white p-5 shadow-sm sm:p-6" aria-labelledby="quran-widget-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 id="quran-widget-title" className="text-sm font-bold text-neutral-900">Ayat Al-Qur'an dalam 1 Menit</h3>
            <p className="text-[11px] text-neutral-500">Sumber dinamis • quran-api-id</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-neutral-500 sm:inline">
            Ayat berikutnya dalam <strong className="font-mono text-primary-700">{countdown}</strong> detik
          </span>
          <button
            type="button"
            onClick={loadRandomAyah}
            disabled={isLoading}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800 hover:bg-primary-100 disabled:cursor-wait disabled:opacity-60"
            title="Muat ayat lain"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Memuat' : 'Ayat lain'}
          </button>
        </div>
      </div>

      {usesFallback && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-800" role="status">
          <WifiOff className="h-3.5 w-3.5" /> Data referensi lokal ditampilkan karena API tidak tersedia.
        </div>
      )}

      <div className={`mt-4 transition-opacity ${isLoading ? 'opacity-55' : 'opacity-100'}`} aria-busy={isLoading}>
        <span className="inline-block rounded-md bg-primary-800 px-3 py-1 text-xs font-bold text-white">
          {ayah.source}
        </span>
        <p dir="rtl" className="py-4 text-right font-serif text-xl font-medium leading-[2.3] tracking-wide text-neutral-900 sm:text-2xl">
          {ayah.arabic}
        </p>
        <p className="rounded-r-lg border-l-4 border-gold-500 bg-neutral-50/90 py-2.5 pl-3.5 text-xs italic leading-relaxed text-neutral-700 sm:text-sm">
          “{ayah.translation}”
        </p>
      </div>
    </section>
  );
};

export default DailyQuranWidget;
