import apiClient from './client';

export const publisherApi = {
  getMyProfile: async () => apiClient('/publishers/me'),
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
};

export default publisherApi;

