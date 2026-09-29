import { fail } from './workflow-utils.js';

const API_BASE = 'https://quran-api.lpmqkemenag.id/api-alquran';

const firstText = (...values) => values.find(value => typeof value === 'string' && value.trim())?.trim() || null;

export function normalizeOfficialVerse(payload, surahNumber, ayahNumber, surahName = null) {
  const body = payload?.data ?? payload?.result ?? payload;
  const verses = Array.isArray(body) ? body : Array.isArray(body?.ayat) ? body.ayat : [body];
  const verse = verses.find(item => Number(item?.ayat ?? item?.no_ayat ?? item?.nomor_ayat) === ayahNumber);
  if (!verse) fail(404, 'Ayat yang diminta tidak ditemukan pada respons API Qur’an LPMQ.');
  const arabic = firstText(verse?.teks_msi_usmani, verse?.arab, verse?.arabic, verse?.teks_arab, verse?.teksArab, verse?.text?.arab);
  const translation = firstText(verse?.terjemah, verse?.terjemahan, verse?.teks_terjemah, verse?.translation?.id, verse?.translation);
  const resolvedSurahName = firstText(surahName, verse?.nama_surah, verse?.nama_surat, verse?.surah?.nama, verse?.surah?.name);
  if (!arabic) fail(502, 'Respons ayat API Qur’an LPMQ belum sesuai format yang didukung.');
  return {
    arabic,
    translation,
    footnote: firstText(verse?.teks_foot),
    source: `QS. ${resolvedSurahName || `Surah ${surahNumber}`}: ${ayahNumber}`,
    provider: 'LPMQ',
  };
}

const surahNames = new Map();

async function requestOfficial(path, username, token) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { user: username, Authorization: token, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    fail(502, 'API Qur’an LPMQ belum dapat dihubungi.');
  }
  if (!response.ok) fail(502, 'API Qur’an LPMQ menolak permintaan ayat.');
  let payload;
  try { payload = await response.json(); }
  catch { fail(502, 'Respons API Qur’an LPMQ bukan JSON yang valid.'); }
  if (payload?.error || payload?.res === false || payload?.code === 401) fail(502, 'Autentikasi API Qur’an LPMQ gagal.');
  return payload;
}

export async function getOfficialVerse(surahNumber, ayahNumber) {
  const username = process.env.LPMQ_QURAN_USERNAME;
  const token = process.env.LPMQ_QURAN_TOKEN;
  if (!username || !token) fail(503, 'Akses API Qur’an LPMQ belum dikonfigurasi pada server.');
  const payload = await requestOfficial(`/ayat/local/${surahNumber}`, username, token);
  let surahName = surahNames.get(surahNumber);
  if (!surahName) {
    try {
      const metadata = await requestOfficial(`/surah/local/${surahNumber}/1`, username, token);
      surahName = firstText(metadata?.data?.[0]?.nama, metadata?.data?.nama);
      if (surahName) surahNames.set(surahNumber, surahName);
    } catch {
      // Nomor surah tetap cukup untuk sumber jika metadata tidak tersedia.
    }
  }
  return normalizeOfficialVerse(payload, surahNumber, ayahNumber, surahName);
}
