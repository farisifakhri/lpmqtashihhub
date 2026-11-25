import apiClient, { ApiError } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
const sttUrl = (token, suffix) => `${API_BASE}/public/verify-document/${encodeURIComponent(token)}/${suffix}`;
// Status ikut dibawa agar halaman dapat membedakan 404 (QR tidak terdaftar) dari gangguan lain.
const failWith = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  const message = response.status === 429 ? 'Terlalu banyak pemeriksaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.' : body.message || fallback;
  throw new ApiError(message, response.status, body);
};

export const publicApi = {
  verifyDocument: async (token) => {
    return apiClient(`/public/verify-document/${encodeURIComponent(token)}`);
  },
  // PDF biner, jadi memakai fetch langsung (apiClient selalu mengirim JSON).
  getOriginalSttFile: async (token) => {
    const response = await fetch(sttUrl(token, 'file'));
    if (!response.ok) await failWith(response, 'Berkas asli STT tidak tersedia.');
    return response.blob();
  },
  checkSttFile: async (token, file) => {
    const response = await fetch(sttUrl(token, 'check-file'), {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file,
    });
    if (!response.ok) await failWith(response, 'PDF belum dapat diperiksa.');
    return (await response.json()).data;
  },
  publisherMap: () => apiClient('/public/publisher-map'),
  // Mengambil angka statistik ringkasan agregat (STT Terbit, Penerbit, Pentashih) untuk Landing Page
  getStatistics: () => apiClient('/public/statistics', { silent: true }),
  // { letter, province, search, page, limit } — tanpa NPWP/NIB
  publisherDirectory: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
    });
    const queryString = query.toString();
    return apiClient(`/public/publisher-directory${queryString ? `?${queryString}` : ''}`);
  },
  surveys: () => apiClient('/public/surveys'),
  // { from, to } dalam format YYYY-MM-DD, opsional
  surveyReport: (id, { from, to } = {}) => {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const queryString = query.toString();
    return apiClient(`/public/surveys/${encodeURIComponent(id)}/report${queryString ? `?${queryString}` : ''}`);
  },
};

export default publicApi;
