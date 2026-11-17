import apiClient from './client';

export const publicApi = {
  verifyDocument: async (token) => {
    return apiClient(`/public/verify-document/${encodeURIComponent(token)}`);
  },
  publisherMap: () => apiClient('/public/publisher-map'),
};

export default publicApi;
