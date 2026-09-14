import apiClient from './client';

export const publicApi = {
  verifyDocument: async (token) => {
    return apiClient(`/public/verify-document/${encodeURIComponent(token)}`);
  },
};

export default publicApi;
