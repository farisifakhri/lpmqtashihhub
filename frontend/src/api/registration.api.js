import apiClient from './client';

export const registrationApi = {
  listRegistrations: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.my_tasks !== undefined) query.append('my_tasks', params.my_tasks);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/registrations?${queryString}` : '/registrations';
    return apiClient(endpoint);
  },

  getDetail: async (id) => {
    return apiClient(`/registrations/${id}`);
  },

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
};

export default registrationApi;
