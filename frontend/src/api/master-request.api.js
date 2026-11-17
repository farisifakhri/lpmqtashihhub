import apiClient, { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
const enc = encodeURIComponent;

/**
 * Buka PDF terproteksi (JWT) di tab baru. Tab dibuka lebih dulu secara sinkron dengan klik
 * agar tidak diblokir popup blocker, lalu diarahkan ke blob PDF setelah selesai diunduh.
 */
export async function openProtectedPdf(path) {
  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const tab = window.open('', '_blank');
  const headers = { Authorization: `Bearer ${getAuthToken()}` };
  try {
    const activeRole = localStorage.getItem('lpmq_active_role');
    if (activeRole) headers['X-Active-Role'] = activeRole;
  } catch { /* localStorage tidak tersedia */ }
  const response = await fetch(`${cleanBase}${path}`, { headers });
  if (!response.ok) {
    tab?.close();
    let message = 'Dokumen belum dapat dibuka.';
    try { message = (await response.json())?.message || message; } catch { /* bukan JSON */ }
    throw new Error(message);
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  if (tab) tab.location.href = blobUrl;
  else window.location.assign(blobUrl);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/** Permohonan Master Mushaf Al-Qur'an: penerbit -> admin -> Kepala (TTE) -> admin -> penerbit */
export const masterRequestApi = {
  // ---- Referensi ----
  getProvinces: () => apiClient('/regions/provinces', { silent: true }),
  getRegencies: (provinceCode) => apiClient(`/regions/provinces/${enc(provinceCode)}/regencies`, { silent: true }),
  getDistricts: (regencyCode) => apiClient(`/regions/regencies/${enc(regencyCode)}/districts`, { silent: true }),
  getMushafTypes: () => apiClient('/master-requests/mushaf-types', { silent: true }),

  // ---- Penerbit ----
  submit: (formData) => apiClient('/publisher/master-requests', { method: 'POST', body: formData }),
  listMine: () => apiClient('/publisher/master-requests'),
  getMine: (id) => apiClient(`/publisher/master-requests/${enc(id)}`),
  openMyLetter: (id) => openProtectedPdf(`/publisher/master-requests/${enc(id)}/letter`),

  // ---- Admin ----
  listAdmin: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'SEMUA') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return apiClient(`/admin/master-requests${qs ? `?${qs}` : ''}`);
  },
  getAdminDetail: (id) => apiClient(`/admin/master-requests/${enc(id)}`),
  reject: (id, alasan) => apiClient(`/admin/master-requests/${enc(id)}/reject`, { method: 'POST', body: { alasan } }),
  submitLetter: (id, { perihal, isi }) =>
    apiClient(`/admin/master-requests/${enc(id)}/letter`, { method: 'POST', body: { perihal, isi } }),
  sendToPublisher: (id) => apiClient(`/admin/master-requests/${enc(id)}/send`, { method: 'POST' }),
  openDocument: (requestId, documentId) =>
    openProtectedPdf(`/admin/master-requests/${enc(requestId)}/documents/${enc(documentId)}`),
  openAdminLetter: (id) => openProtectedPdf(`/admin/master-requests/${enc(id)}/letter`),

  // ---- Kepala LPMQ (Pusat Tanda Tangan) ----
  listForSignature: () => apiClient('/signatures/master-letters'),
  sign: (id) => apiClient(`/signatures/master-letters/${enc(id)}/sign`, { method: 'POST' }),
  openSignatureLetter: (id) => openProtectedPdf(`/signatures/master-letters/${enc(id)}/pdf`),
};

export default masterRequestApi;
