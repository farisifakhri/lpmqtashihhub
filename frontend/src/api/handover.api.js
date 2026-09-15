import apiClient from './client';

export const handoverApi = {
  /**
   * Verifikator mencatat penyerahan master fisik kepada Distributor (Langkah 7 SOP)
   * @param {string} registrationId - UUID Registrasi
   * @param {Object} payload - { to_user_id, condition, volume_count, notes }
   */
  createHandover: async (registrationId, payload) => {
    return apiClient(`/registrations/${registrationId}/physical-master/handovers`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengambil riwayat serah-terima fisik untuk satu registrasi
   * @param {string} registrationId - UUID Registrasi
   */
  getRegistrationHandovers: async (registrationId) => {
    return apiClient(`/registrations/${registrationId}/physical-master/handovers`);
  },

  /**
   * Mengambil daftar antrean serah-terima master fisik (Inbox Distributor/Verifikator)
   * @param {Object} params - { status, stage, search, my_tasks, page, limit }
   */
  listHandovers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.stage) query.append('stage', params.stage);
    if (params.search) query.append('search', params.search);
    if (params.my_tasks !== undefined) query.append('my_tasks', params.my_tasks);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/physical-master/handovers?${queryString}` : '/physical-master/handovers';
    return apiClient(endpoint);
  },

  /**
   * Mengambil detail satu catatan serah-terima fisik
   * @param {string} id - UUID Handover
   */
  getHandoverDetail: async (id) => {
    return apiClient(`/physical-master/handovers/${id}`);
  },

  /**
   * Distributor mengonfirmasi penerimaan fisik dan menetapkan tenggat pentashihan (Langkah 8 SOP)
   * @param {string} id - UUID Handover
   * @param {Object} payload - { condition, volume_count, tashih_due_at, notes }
   */
  receiveHandover: async (id, payload = {}) => {
    return apiClient(`/physical-master/handovers/${id}/receive`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Distributor menolak/mengembalikan master fisik yang cacat/tidak lengkap
   * @param {string} id - UUID Handover
   * @param {Object} payload - { reason }
   */
  returnHandover: async (id, payload) => {
    return apiClient(`/physical-master/handovers/${id}/return`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengambil daftar petugas Distributor aktif untuk dropdown pilihan Verifikator
   */
  listDistributors: async () => {
    return apiClient('/master/distributors');
  },
};

export default handoverApi;

