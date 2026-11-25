import { apiClient, getAuthToken } from './client';

export const documentationApi = {
  getDocumentationDetail: async (registrationId) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/documentation`);
  },

  saveDocumentationArchive: async (registrationId, data) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/documentation`, {
      method: 'POST',
      body: data,
    });
  },

  requestStt: async (registrationId, notes = '') => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/request-stt`, {
      method: 'POST',
      body: { notes },
    });
  },

  sendDraftToDistributor: async (documentId, notes = '') => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/send-to-distributor`, {
      method: 'POST',
      body: { notes },
    });
  },

  submitToTu: async (documentId, data = {}) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/submit-to-tu`, {
      method: 'POST',
      body: data,
    });
  },

  createOfficialDocument: async (registrationId, data) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/official-documents`, {
      method: 'POST',
      body: data,
    });
  },

  // Satu paraf draf STT oleh akun berperan Pemaraf
  parafTu: async (documentId, data = {}) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/paraf`, {
      method: 'POST',
      body: data,
    });
  },

  signStt: async (documentId) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/sign`, {
      method: 'POST',
      body: {},
    });
  },

  overrideSttParaf: async (documentId, reason) => {
    return apiClient(`/official-documents/${encodeURIComponent(documentId)}/paraf-override`, {
      method: 'POST',
      body: { reason },
    });
  },
  getPrintingReports: async (registrationId) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/printing-reports`);
  },

  createPrintingReport: async (registrationId, data) => {
    return apiClient(`/registrations/${encodeURIComponent(registrationId)}/printing-reports`, {
      method: 'POST',
      body: data,
    });
  },
};

export default documentationApi;

