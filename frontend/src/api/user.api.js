import apiClient from './client';

export const userApi = {
  /**
   * Mengambil daftar pengguna sistem dengan filter dan pagination
   * @param {Object} params - { search, role, status, page, limit }
   */
  listUsers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    return apiClient(endpoint);
  },

  /**
   * Mengambil daftar role yang tersedia di sistem
   */
  getRoles: async () => {
    return apiClient('/users/roles');
  },

  /**
   * Mengambil detail pengguna berdasarkan ID
   * @param {string} id
   */
  getUserDetail: async (id) => {
    return apiClient(`/users/${id}`);
  },

  /**
   * Menambahkan pengguna baru ke sistem
   * @param {Object} payload - { name, email, password, nip, status, roles, publisher }
   */
  createUser: async (payload) => {
    return apiClient('/users', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Memperbarui data pengguna
   * @param {string} id
   * @param {Object} payload - { name, email, password, nip, status, roles, publisher }
   */
  updateUser: async (id, payload) => {
    return apiClient(`/users/${id}`, {
      method: 'PUT',
      body: payload,
    });
  },

  /**
   * Menghapus atau menonaktifkan pengguna
   * @param {string} id
   */
  deleteUser: async (id) => {
    return apiClient(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Memberikan seluruh role sistem (Superadmin All-Role)
   * @param {string} id
   */
  grantAllRoles: async (id) => {
    return apiClient(`/users/${id}/grant-all-roles`, {
      method: 'POST',
    });
  },
};

export default userApi;

