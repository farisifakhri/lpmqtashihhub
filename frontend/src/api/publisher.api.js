import apiClient, { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const publisherApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return apiClient(`/publishers${queryString ? `?${queryString}` : ''}`);
  },
  verify: async (id, payload) =>
    apiClient(`/publishers/${id}/verify`, {
      method: 'PATCH',
      body: payload,
    }),
  getMyProfile: async () => apiClient('/publishers/me'),
  getMyCertificate: async (openInNewTab = true) => {
    const token = getAuthToken();
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const url = `${cleanBase}/publishers/me/certificate`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Sertifikat penerbit belum tersedia atau pendaftaran belum disetujui.');
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (openInNewTab) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'sertifikat-penerbit.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  },
  updateMyProfile: async (payload) =>
    apiClient('/publishers/me', {
      method: 'PUT',
      body: payload,
    }),
  permitEdit: async (id, payload) =>
    apiClient(`/publishers/${id}/permit-edit`, {
      method: 'PATCH',
      body: payload,
    }),
  adminUpdate: async (id, payload) =>
    apiClient(`/publishers/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
};

export default publisherApi;
