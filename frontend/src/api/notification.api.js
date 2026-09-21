import apiClient from './client';

export const notificationApi = {
  getNotifications: async () => {
    return apiClient('/notifications', {
      method: 'GET',
    });
  },

  markAsRead: async (id) => {
    return apiClient(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },
};

export default notificationApi;

