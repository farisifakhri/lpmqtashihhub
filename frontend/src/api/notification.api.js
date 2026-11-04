import apiClient from './client';

export const notificationApi = {
  getNotifications: async () => {
    return apiClient('/notifications', {
      method: 'GET',
    });
  },

  // Peta { kunci_antrean: jumlah } untuk badge merah di menu sidebar, dicakup sesuai peran user.
  getSidebarBadges: async () => {
    return apiClient('/sidebar-badges', {
      method: 'GET',
      silent: true,
    });
  },

  markAsRead: async (id) => {
    return apiClient(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },
};

export default notificationApi;
