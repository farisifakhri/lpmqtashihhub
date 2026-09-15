import apiClient from './client';

export const reportApi = {
  /**
   * Mengambil Laporan Kinerja dan Kepatuhan SLA Verifikasi (VER-I06)
   * @param {Object} params
   */
  getVerificationPerformance: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    const qs = query.toString();
    const endpoint = qs ? `/reports/verification-performance?${qs}` : '/reports/verification-performance';
    return apiClient(endpoint);
  },

  /**
   * Mengambil Timeline Status Naskah Lintas Peran dengan Sanitasi (VER-I05)
   * @param {string} registrationId
   */
  getRegistrationTimeline: async (registrationId) => {
    return apiClient(`/registrations/${registrationId}/timeline`);
  },
};

