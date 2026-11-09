import apiClient, { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const publisherRegistrationApi = {
  /**
   * Mengajukan pendaftaran akun penerbit baru (multipart/form-data)
   * POST /api/v1/publisher-registrations
   */
  register: async (formData) => {
    return apiClient('/publisher-registrations', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Memeriksa status pendaftaran secara mandiri via HTTP Body (anti-enumeration)
   * POST /api/v1/publisher-registrations/check-status
   */
  checkStatus: async (kodePendaftaran) => {
    return apiClient('/publisher-registrations/check-status', {
      method: 'POST',
      body: {
        kode_pendaftaran: kodePendaftaran,
      },
    });
  },

  /**
   * Memuat data perbaikan pendaftaran via token sekali pakai (14 hari)
   * GET /api/v1/publisher-registrations/revision/:token
   */
  getRevision: async (token) => {
    return apiClient(`/publisher-registrations/revision/${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  },

  /**
   * Mengirimkan data dan berkas revisi pendaftaran (multipart/form-data)
   * PUT /api/v1/publisher-registrations/revision/:token
   */
  submitRevision: async (token, formData) => {
    return apiClient(`/publisher-registrations/revision/${encodeURIComponent(token)}`, {
      method: 'PUT',
      body: formData,
    });
  },

  /**
   * Mengambil daftar pendaftaran penerbit untuk internal admin
   * GET /api/v1/admin/publisher-registrations
   */
  listAdmin: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'SEMUA') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return apiClient(`/admin/publisher-registrations${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Mengambil rincian lengkap pendaftaran penerbit
   * GET /api/v1/admin/publisher-registrations/:id
   */
  getAdminDetail: async (id) => {
    return apiClient(`/admin/publisher-registrations/${encodeURIComponent(id)}`);
  },

  /**
   * Mengambil keputusan verifikasi (SETUJUI, PERLU_PERBAIKAN, TOLAK) dengan konkurensi versi
   * POST /api/v1/admin/publisher-registrations/:id/decision
   */
  decideAdmin: async (id, { keputusan, alasan, versi }) => {
    return apiClient(`/admin/publisher-registrations/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: {
        keputusan,
        alasan: alasan || null,
        versi,
      },
    });
  },

  /**
   * Menerbitkan ulang (regenerate) token perbaikan pendaftaran penerbit oleh admin
   * POST /api/v1/admin/publisher-registrations/:id/resend-revision-token
   */
  resendRevisionToken: async (id) => {
    return apiClient(`/admin/publisher-registrations/${encodeURIComponent(id)}/resend-revision-token`, {
      method: 'POST',
    });
  },

  /**
   * Mengunduh dokumen persyaratan pendaftaran dengan otorisasi JWT
   */
  downloadDocument: async (registrationId, documentId, fileName = 'dokumen.pdf') => {
    const token = getAuthToken();
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const url = `${cleanBase}/admin/publisher-registrations/${encodeURIComponent(registrationId)}/documents/${encodeURIComponent(documentId)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Gagal mengunduh dokumen dari server.');
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
   * Mengunduh sertifikat penerbit resmi (U-06)
   */
  downloadCertificate: async (registrationId, fileName = 'sertifikat-penerbit.pdf') => {
    const token = getAuthToken();
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const url = `${cleanBase}/admin/publisher-registrations/${encodeURIComponent(registrationId)}/certificate`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Gagal mengunduh sertifikat penerbit.');
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
   * Mengunduh sertifikat penerbit resmi secara publik berdasarkan ID atau kode pendaftaran
   */
  downloadPublicCertificate: async (idOrCode, fileName = 'sertifikat-penerbit.pdf') => {
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const url = `${cleanBase}/publisher-registrations/${encodeURIComponent(idOrCode)}/certificate`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Gagal mengunduh sertifikat penerbit dari server.');
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
};

export default publisherRegistrationApi;
