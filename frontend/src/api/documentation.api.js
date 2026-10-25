import { apiClient, getAuthToken } from './client';

export const documentationApi = {
  getDocumentationDetail: async (registrationId) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/documentation`);
  },

  saveDocumentationArchive: async (registrationId, data) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/documentation`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  requestStt: async (registrationId, notes = '') => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/request-stt`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  sendDraftToDistributor: async (documentId, notes = '') => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/send-to-distributor`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  submitToTu: async (documentId, data = {}) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/submit-to-tu`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  parafTu: async (documentId, order, data = {}) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/paraf-${order}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  signStt: async (documentId) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/sign`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
  getPrintingReports: async (registrationId) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/printing-reports`);
  },

  createPrintingReport: async (registrationId, data) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/printing-reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default documentationApi;

