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

  forgotPassword: async (identifier, method = 'email') => {
    return apiClient('/auth/forgot-password', {
      method: 'POST',
      body: method === 'whatsapp' ? { phone: identifier, method } : { email: identifier, method },
    });
  },

  resetPassword: async ({ token, new_password }) => {
    return apiClient('/auth/reset-password', {
      method: 'POST',
      body: { token, new_password },
    });
  },

  changePassword: async ({ current_password, new_password }) => {
    return apiClient('/auth/change-password', {
      method: 'POST',
      body: { current_password, new_password },
    });
  },
};

export default authApi;
