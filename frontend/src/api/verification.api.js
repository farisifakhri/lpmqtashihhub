import apiClient from './client';

export const verificationApi = {
  /**
   * Mengambil daftar penugasan verifikasi
   * @param {Object} params - { status, my_tasks, search, page, limit }
   */
  listAssignments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.my_tasks !== undefined) query.append('my_tasks', params.my_tasks);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/verification-assignments?${queryString}` : '/verification-assignments';
    return apiClient(endpoint);
  },

  /**
   * Mengambil detail penugasan verifikasi beserta naskah, berkas digital, master fisik, dan draf hasil
   * @param {string} id - Assignment ID
   */
  getAssignmentDetail: async (id) => {
    return apiClient(`/verification-assignments/${id}`);
  },

  /**
   * Memulai pemeriksaan berkas & naskah (ASSIGNED -> IN_PROGRESS)
   * @param {string} id - Assignment ID
   */
  startVerification: async (id) => {
    return apiClient(`/verification-assignments/${id}/start`, {
      method: 'PATCH',
    });
  },

  /**
   * Menyimpan draf checklist dan catatan verifikasi (status SURAT_HASIL_VERIFIKASI = DRAFT)
   * @param {string} id - Assignment ID
   * @param {Object} payload - { checklist, decision, notes, letter_text, attachment_file_ids }
   */
  saveDraft: async (id, payload) => {
    return apiClient(`/verification-assignments/${id}/checklist`, {
      method: 'PUT',
      body: payload,
    });
  },

  /**
   * Mengajukan draf surat hasil verifikasi ke Kepala LPMQ (status SURAT_HASIL_VERIFIKASI = SUBMITTED)
   * @param {string} id - Assignment ID
   * @param {Object} payload - { checklist, decision, notes, letter_text, attachment_file_ids }
   */
  submitDraft: async (id, payload) => {
    return apiClient(`/verification-assignments/${id}/result-drafts`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Menyetujui dan menandatangani surat hasil verifikasi oleh Kepala LPMQ
   * @param {string} documentId - Verification Document ID
   */
  approveDocument: async (documentId) => {
    return apiClient(`/verification-documents/${documentId}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Mengembalikan draf surat hasil verifikasi ke verifikator dengan alasan perbaikan
   * @param {string} documentId - Verification Document ID
   * @param {Object} payload - { reason }
   */
  returnDocument: async (documentId, payload) => {
    return apiClient(`/verification-documents/${documentId}/return`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengirimkan surat hasil verifikasi ke akun penerbit oleh verifikator
   * @param {string} documentId - Verification Document ID
   * @param {Object} payload - { channel, notes }
   */
  sendDocument: async (documentId, payload = {}) => {
    return apiClient(`/verification-documents/${documentId}/send`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengambil detail dokumen verifikasi
   * @param {string} documentId - Verification Document ID
   */
  getDocumentDetail: async (documentId) => {
    return apiClient(`/verification-documents/${documentId}`);
  },
};

export default verificationApi;


