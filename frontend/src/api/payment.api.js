import apiClient from './client';

export const paymentApi = {
  /**
   * Mengambil daftar pembayaran / antrean billing
   * @param {Object} params - { status, search, page, limit }
   */
  listPayments: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/payments?${queryString}` : '/payments';
    return apiClient(endpoint);
  },

  /**
   * Mengambil detail satu tagihan pembayaran
   * @param {string} id - Payment ID
   */
  getPaymentDetail: async (id) => {
    return apiClient(`/payments/${id}`);
  },

  /**
   * Mengambil tagihan aktif berdasarkan registration ID
   * @param {string} registrationId
   */
  getRegistrationPayment: async (registrationId) => {
    return apiClient(`/registrations/${registrationId}/payment`);
  },

  /**
   * Konfirmasi pembayaran oleh penerbit (mengunggah bukti bayar & mengisi NTPN)
   * @param {string} id - Payment ID
   * @param {Object} payload - { receipt_file_id, external_ref }
   */
  confirmPayment: async (id, payload) => {
    return apiClient(`/payments/${id}/confirm`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Verifikasi pembayaran sah oleh Verifikator
   * @param {string} id - Payment ID
   */
  verifyPayment: async (id) => {
    return apiClient(`/payments/${id}/verify`, {
      method: 'PATCH',
    });
  },

  /**
   * Menolak / mengembalikan bukti pembayaran untuk diperbaiki
   * @param {string} id - Payment ID
   * @param {Object} payload - { reason }
   */
  returnPayment: async (id, payload) => {
    return apiClient(`/payments/${id}/return`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Mengunggah berkas bukti pembayaran (PDF / JPEG / PNG) ke storage aman
   * @param {File} file
   */
  uploadReceipt: async (file) => {
    const token = localStorage.getItem('lpmq_token');
    const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const response = await fetch(`${apiBase}/uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Gagal mengunggah bukti pembayaran.');
    }
    return result.data;
  },
};

export default paymentApi;
