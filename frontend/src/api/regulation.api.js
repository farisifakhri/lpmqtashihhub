import apiClient, { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const regulationApi = {
  /**
   * Mengambil daftar regulasi publik
   * GET /api/v1/regulations
   */
  getPublicRegulations: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.category && params.category !== 'Semua Kategori' && params.category !== 'ALL') {
      query.append('category', params.category);
    }
    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/regulations?${queryString}` : '/regulations';
    return apiClient(endpoint, { method: 'GET' });
  },

  /**
   * Mengambil 7 kategori master dokumen regulasi
   * GET /api/v1/regulations/categories
   */
  getCategories: async () => {
    return apiClient('/regulations/categories', { method: 'GET' });
  },

  /**
   * Mengambil detail regulasi publik
   * GET /api/v1/regulations/:id
   */
  getRegulationDetail: async (id) => {
    return apiClient(`/regulations/${encodeURIComponent(id)}`, { method: 'GET' });
  },

  /**
   * Mendapatkan blob URL untuk pratinjau dokumen PDF regulasi publik
   */
  fetchPreviewBlobUrl: async (id) => {
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const url = `${cleanBase}/regulations/${encodeURIComponent(id)}/view`;
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Gagal memuat pratinjau berkas regulasi.');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Mengunduh berkas fisik regulasi
   */
  downloadRegulation: async (id, fileName = 'dokumen-regulasi.pdf') => {
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const url = `${cleanBase}/regulations/${encodeURIComponent(id)}/download`;
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Gagal mengunduh dokumen regulasi.');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  },

  /**
   * Mengambil daftar regulasi untuk admin internal
   * GET /api/v1/admin/regulations
   */
  listAdmin: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.category && params.category !== 'Semua Kategori' && params.category !== 'ALL') {
      query.append('category', params.category);
    }
    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }
    if (params.is_published !== undefined && params.is_published !== '' && params.is_published !== 'ALL') {
      query.append('is_published', params.is_published);
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/admin/regulations?${queryString}` : '/admin/regulations';
    return apiClient(endpoint, { method: 'GET' });
  },

  /**
   * Mengambil ringkasan data regulasi untuk dashboard admin
   * GET /api/v1/admin/regulations/summary
   */
  getAdminSummary: async () => {
    return apiClient('/admin/regulations/summary', { method: 'GET' });
  },

  /**
   * Mengunggah dokumen regulasi baru (multipart/form-data)
   * POST /api/v1/admin/regulations
   */
  createRegulation: async (formData) => {
    return apiClient('/admin/regulations', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Memperbarui dokumen regulasi (multipart/form-data)
   * PUT /api/v1/admin/regulations/:id
   */
  updateRegulation: async (id, formData) => {
    return apiClient(`/admin/regulations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: formData,
    });
  },

  /**
   * Menghapus dokumen regulasi
   * DELETE /api/v1/admin/regulations/:id
   */
  deleteRegulation: async (id) => {
    return apiClient(`/admin/regulations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export default regulationApi;

