import apiClient from './client';

export const masterApi = {
  // Categories
  getCategories: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/master/categories${query ? `?${query}` : ''}`);
  },

  createCategory: async (data) => {
    return apiClient('/master/categories', { method: 'POST', body: data });
  },

  updateCategory: async (id, data) => {
    return apiClient(`/master/categories/${id}`, { method: 'PUT', body: data });
  },

  deleteCategory: async (id) => {
    return apiClient(`/master/categories/${id}`, { method: 'DELETE' });
  },

  // Service Types
  getServiceTypes: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/master/service-types${query ? `?${query}` : ''}`);
  },

  getServiceTypeById: async (id) => {
    return apiClient(`/master/service-types/${id}`);
  },

  createServiceType: async (data) => {
    return apiClient('/master/service-types', { method: 'POST', body: data });
  },

  updateServiceType: async (id, data) => {
    return apiClient(`/master/service-types/${id}`, { method: 'PUT', body: data });
  },

  deleteServiceType: async (id) => {
    return apiClient(`/master/service-types/${id}`, { method: 'DELETE' });
  },

  // Addons
  getAddons: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/master/addons${query ? `?${query}` : ''}`);
  },

  createAddon: async (data) => {
    return apiClient('/master/addons', { method: 'POST', body: data });
  },

  updateAddon: async (id, data) => {
    return apiClient(`/master/addons/${id}`, { method: 'PUT', body: data });
  },

  deleteAddon: async (id) => {
    return apiClient(`/master/addons/${id}`, { method: 'DELETE' });
  },

  // Distribution Teams
  getDistributionTeams: async () => {
    return apiClient('/master/distribution-teams');
  },
};

export default masterApi;
