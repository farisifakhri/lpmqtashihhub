import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, RefreshCw, WifiOff } from 'lucide-react';
import { getAuthToken } from '@/api/client';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const DailyQuranWidget = () => {
  const [ayah, setAyah] = useState(FALLBACK_AYAH);
  const [isLoading, setIsLoading] = useState(false);
  const [usesFallback, setUsesFallback] = useState(true);
  const requestController = useRef(null);

  const loadRandomAyah = useCallback(async (manual = false) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const seed = Math.floor(Date.now() / 86400000);
    const surahNumber = manual ? Math.floor(Math.random() * 114) + 1 : (seed % 114) + 1;
    const ayahNumber = manual ? Math.floor(Math.random() * SURAH_AYAH_COUNTS[surahNumber - 1]) + 1 : (seed % SURAH_AYAH_COUNTS[surahNumber - 1]) + 1;

    setIsLoading(true);
    setUsesFallback(false);

    try {
      const response = await fetch(`${API_BASE_URL}/quran/verses/${surahNumber}/${ayahNumber}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Respons API tidak berhasil.');

      const payload = await response.json();
      const data = payload?.data;
      const arabic = data?.arabic;
      const translation = data?.translation;
      if (!arabic) {
        throw new Error('Struktur respons API tidak valid.');
      }

      setAyah({ arabic, translation, footnote: data.footnote, source: data.source || `QS. Surah ${surahNumber}: ${ayahNumber}` });
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

  return (
    <section
      className="h-full min-w-0 rounded-xl border border-line bg-white p-5 sm:p-6 shadow-2xs transition-shadow"
      aria-labelledby="quran-widget-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white shadow-2xs">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 id="quran-widget-title" className="text-sm font-bold text-ink">
              Ayat Al-Qur'an
            </h3>
            <p className="text-xs text-ink-muted">Rujukan Qur'an Kemenag · LPMQ</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadRandomAyah(true)}
            disabled={isLoading}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-subtle hover:text-ink disabled:cursor-wait disabled:opacity-60 transition-colors"
            title="Muat ayat lain"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Memuat...' : 'Ayat lain'}
          </button>
        </div>
      </div>

      {usesFallback && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-civic-warning bg-civic-warningSoft p-2 rounded-lg border border-civic-warningLine" role="status">
          <WifiOff className="h-3.5 w-3.5" /> Ayat contoh lokal ditampilkan. Akses API resmi LPMQ belum tersedia.
        </div>
      )}

      <div className={`mt-4 transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`} aria-busy={isLoading}>
        <span className="inline-block rounded-md bg-brand-800 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
          {ayah.source}
        </span>
        <p dir="rtl" className="py-4 text-right font-serif text-xl sm:text-2xl font-normal leading-[2.4] tracking-wide text-ink">
          {ayah.arabic}
        </p>
        {ayah.translation && <p className="rounded-r-lg border-l-4 border-civicGold-700 bg-canvas py-3 pl-4 pr-3 text-xs sm:text-sm italic leading-relaxed text-ink">
          “{ayah.translation}”
        </p>}
        {ayah.footnote && <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{ayah.footnote}</p>}
      </div>
    </section>
  );
};

export default DailyQuranWidget;
