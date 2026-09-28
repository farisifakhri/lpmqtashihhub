import apiClient, { getAuthToken } from './client';

export const registrationApi = {
  listRegistrations: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.my_tasks !== undefined) query.append('my_tasks', params.my_tasks);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.segment) query.append('segment', params.segment);
    if (params.queue_only !== undefined) query.append('queue_only', params.queue_only);

    const queryString = query.toString();
    const endpoint = queryString ? `/registrations?${queryString}` : '/registrations';
    return apiClient(endpoint);
  },

  getDetail: async (id) => {
    return apiClient(`/registrations/${id}`);
  },
  getDocumentArchive: async (id) => apiClient(`/registrations/${id}/document-archive`),

  createDraft: async (payload) => {
    return apiClient('/registrations', {
      method: 'POST',
      body: payload,
    });
  },

  submitRegistration: async (id) => {
    return apiClient(`/registrations/${id}/submit`, {
      method: 'POST',
    });
  },

  transitionStatus: async (id, to_status, notes = '') => {
    return apiClient(`/registrations/${id}/transition`, {
      method: 'POST',
      body: { to_status, notes },
    });
  },
  addManuscript: async (id, payload) => apiClient(`/registrations/${id}/manuscripts`, { method: 'POST', body: payload }),
  declarePhysicalMaster: async (id, payload) => apiClient(`/registrations/${id}/physical-master`, { method: 'PUT', body: payload }),
  dispatchPhysical: async (id, payload) => apiClient(`/registrations/${id}/dispatch-physical`, { method: 'POST', body: payload }),
  createAssignments: async (id, payload) => apiClient(`/registrations/${id}/assignments`, { method: 'POST', body: payload }),
  deleteRegistration: async (id) => apiClient(`/registrations/${id}`, { method: 'DELETE' }),
  downloadReceiptPdf: async (id, filename = 'Tanda-Terima.pdf') => {
    const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const response = await fetch(`${base}/registrations/${encodeURIComponent(id)}/receipt-pdf`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!response.ok) {
      throw new Error('Gagal mengunduh tanda terima PDF.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export default registrationApi;
