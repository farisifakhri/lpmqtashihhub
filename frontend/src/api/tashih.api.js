import apiClient from './client';

export const tashihApi = {
  /**
   * Mengambil daftar penugasan sidang khusus untuk pentashih yang sedang login
   * @param {Object} params - { status: 'ACTIVE' | 'COMPLETED' }
   */
  getMyAssignments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    const queryString = query.toString();
    return apiClient(queryString ? `/assignments/my-tasks?${queryString}` : '/assignments/my-tasks');
  },

  /**
   * Pentashih mencatat hasil sidang naskah (PASSED / REVISION_REQUIRED / REJECTED)
   * @param {string} assignmentId - UUID Assignment
   * @param {Object} payload - { result: 'PASSED'|'REVISION_REQUIRED'|'REJECTED', notes: string }
   */
  recordReview: async (assignmentId, payload) => {
    return apiClient(`/assignments/${assignmentId}/review`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Distributor mengompilasi dan mereviu rekomendasi seluruh pentashih
   * @param {string} registrationId - UUID Registrasi
   * @param {Object} payload - { result: 'PASSED'|'REVISION_REQUIRED', notes: string }
   */
  approveDistribution: async (registrationId, payload) => {
    return apiClient(`/registrations/${registrationId}/distribution-review`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengambil beban kerja (workload) tim pentashihan
   * @param {string} teamId - UUID Tim Distribusi
   */
  getTeamWorkload: async (teamId) => {
    return apiClient(`/distribution-teams/${teamId}/workload`);
  },
};

export default tashihApi;
