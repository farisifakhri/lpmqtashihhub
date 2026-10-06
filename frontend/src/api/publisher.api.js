import apiClient from './client';

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
