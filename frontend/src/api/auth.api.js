import apiClient from './client';

export const authApi = {
  login: async (credentials) => {
    return apiClient('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  },

  registerPublisher: async (payload) => {
    return apiClient('/auth/register-publisher', {
      method: 'POST',
      body: payload,
    });
  },

  getMe: async () => {
    return apiClient('/auth/me', {
      method: 'GET',
    });
  },
};

export default authApi;
