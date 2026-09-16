import apiClient from './client';

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
  createAssignments: async (id, payload) => apiClient(`/registrations/${id}/assignments`, { method: 'POST', body: payload }),
};

export default registrationApi;
