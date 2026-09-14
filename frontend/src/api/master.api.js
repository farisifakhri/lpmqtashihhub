import apiClient from './client';

export const masterApi = {
  getCategories: async () => {
    return apiClient('/master/categories');
  },

  getServiceTypes: async () => {
    return apiClient('/master/service-types');
  },

  getAddons: async () => {
    return apiClient('/master/addons');
  },

  getDistributionTeams: async () => {
    return apiClient('/master/distribution-teams');
  },
};

export default masterApi;
