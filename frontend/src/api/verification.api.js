import apiClient from './client';

export const verificationApi = {
  /**
   * Mengambil daftar penugasan verifikasi
   * @param {Object} params - { status, my_tasks, search, page, limit }
   */
  listAssignments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.registration_status) query.append('registration_status', params.registration_status);
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
   * Menyetujui draf hasil verifikasi oleh Kepala LPMQ (melanjutkan ke proses penandatanganan)
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
  /**
   * Menandatangani dokumen verifikasi resmi (P0-02 / §4.3)
   * @param {string} documentId - Verification Document ID
   */
  signDocument: async (documentId) => {
    return apiClient(`/verification-documents/${documentId}/sign`, {
      method: 'POST',
    });
  },

  /**
   * Mengirim ulang email hasil verifikasi yang gagal (KB-07 / P0-03)
   * @param {string} documentId - Verification Document ID
   */
  retryEmail: async (documentId) => {
    return apiClient(`/verification-documents/${documentId}/retry-email`, {
      method: 'POST',
    });
  },

  /**
   * Menerima atau mengembalikan master fisik mushaf di loket (Admin Loket Intake)
   * @param {string} registrationId
   * @param {Object} payload - { decision, volume_count, condition, receipt_no, notes }
   */
  receivePhysicalMaster: async (registrationId, payload) => {
    return apiClient(`/registrations/${registrationId}/physical-master/receive`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengambil tanda terima penerimaan master fisik
   * @param {string} registrationId
   */
  getRegistrationReceipt: async (registrationId) => {
    return apiClient(`/registrations/${registrationId}/receipt`);
  },

  /**
   * Menugaskan Verifikator dan menerbitkan Nota Dinas oleh Kepala LPMQ
   * @param {string} registrationId
   * @param {Object} payload - { verifier_id, nota_no, notes }
   */
  /**
   * Menugaskan Verifikator dan menerbitkan Nota Dinas oleh Kepala LPMQ (P0-06)
   * @param {string} registrationId
   * @param {Object} payload - { verifier_id, nota_no, notes }
   */
  createAssignment: async (registrationId, payload) => {
    return apiClient(`/registrations/${registrationId}/verification-assignments`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengambil direktori verifikator aktif beserta beban tugas aktif (P0-02, P0-06)
   * @param {Object} params - { search, status }
   */
  listActiveVerifiers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    query.append('status', params.status || 'ACTIVE');
    const queryString = query.toString();
    const endpoint = queryString ? `/verification-verifiers?${queryString}` : '/verification-verifiers';
    return apiClient(endpoint);
  },

  /**
   * Alias untuk listActiveVerifiers (kompatibilitas mundur)
   */
  getVerifiers: async (params = {}) => {
    return verificationApi.listActiveVerifiers(params);
  },

  /**
   * Mengambil antrean pendaftaran yang master fisiknya sudah diterima namun belum memiliki penugasan (P0-01, P0-06)
   * @param {Object} params - { search, page, limit }
   */
  listAssignmentCandidates: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/verification-assignment-candidates?${queryString}` : '/verification-assignment-candidates';
    return apiClient(endpoint);
  },

  /**
   * Alias untuk listAssignmentCandidates (kompatibilitas mundur)
   */
  listUnassignedRegistrations: async (params = {}) => {
    return verificationApi.listAssignmentCandidates(params);
  },
};

export default verificationApi;
