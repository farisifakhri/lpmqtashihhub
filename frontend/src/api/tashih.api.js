import apiClient from './client';

export const tashihApi = {
  /**
   * Mengambil daftar penugasan sidang khusus untuk pentashih yang sedang login
   * @param {Object} params - { status: 'ACTIVE' | 'COMPLETED' }
   */
  getMyAssignments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
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

  recordJuzChecklist: async (assignmentId, juzNumber, payload) => apiClient(`/assignments/${assignmentId}/juz/${juzNumber}`, {
    method: 'PATCH', body: payload,
  }),

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

  listPemaraf: async () => apiClient('/pemaraf'),
  getDistributionParaf: async (registrationId) => apiClient(`/registrations/${registrationId}/distribution-review/paraf`),
  parafDistribution: async (registrationId) => apiClient(`/registrations/${registrationId}/distribution-review/paraf`, { method: 'POST', body: {} }),

  /**
   * Mengambil beban kerja (workload) tim pentashihan
   * @param {string} teamId - UUID Tim Distribusi
   */
  recordOutgoingDispatch: async (registrationId, payload) => {
    return apiClient(`/registrations/${registrationId}/outgoing-dispatch`, {
      method: 'POST',
      body: payload,
    });
  },

  getTeamWorkload: async (teamId) => {
    return apiClient(`/distribution-teams/${teamId}/workload`);
  },

  /**
   * Admin / Distributor mencabut penugasan pentashih (misal karena cuti/sakit)
   * @param {string} assignmentId - UUID Assignment
   * @param {Object} payload - { reason: string }
   */
  revokeAssignment: async (assignmentId, payload) => {
    return apiClient(`/assignments/${assignmentId}/revoke`, {
      method: 'POST',
      body: payload,
    });
  },
};

export default tashihApi;
