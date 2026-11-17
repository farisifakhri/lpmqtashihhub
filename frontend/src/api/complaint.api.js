import apiClient from './client';
import { masterRequestApi, openProtectedPdf } from './master-request.api';

const enc = encodeURIComponent;

/** Sistem Pengaduan: formulir publik, pelacakan dengan kode, dan pengelolaan oleh admin. */
export const complaintApi = {
  // ---- Publik ----
  getProvinces: masterRequestApi.getProvinces,
  getRegencies: masterRequestApi.getRegencies,
  getDistricts: masterRequestApi.getDistricts,
  getReference: () => apiClient('/complaints/reference', { silent: true }),
  getCaptcha: () => apiClient('/complaints/captcha', { silent: true }),
  submitPrintError: (formData) => apiClient('/complaints/print-errors', { method: 'POST', body: formData, silent: true }),
  submitService: (formData) => apiClient('/complaints/services', { method: 'POST', body: formData, silent: true }),
  track: (kode) => apiClient('/complaints/track', { method: 'POST', body: { kode }, silent: true }),

  // ---- Admin (Helper Admin & Super Admin) ----
  listAdmin: (params = {}) => {
    const query = new URLSearchParams({ type: params.type });
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'SEMUA') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return apiClient(`/admin/complaints?${query.toString()}`);
  },
  getAdminDetail: (id) => apiClient(`/admin/complaints/${enc(id)}`),
  accept: (id, catatan = '') => apiClient(`/admin/complaints/${enc(id)}/accept`, { method: 'POST', body: { catatan } }),
  reject: (id, alasan) => apiClient(`/admin/complaints/${enc(id)}/reject`, { method: 'POST', body: { alasan } }),
  updateStatus: (id, status, keterangan) =>
    apiClient(`/admin/complaints/${enc(id)}/status`, { method: 'POST', body: { status, keterangan } }),
  submitFinalReport: (id, { hasil, keterangan, tanggal_selesai }) =>
    apiClient(`/admin/complaints/${enc(id)}/final-report`, { method: 'POST', body: { hasil, keterangan, tanggal_selesai } }),
  openAttachment: (complaintId, attachmentId) =>
    openProtectedPdf(`/admin/complaints/${enc(complaintId)}/attachments/${enc(attachmentId)}`),
};

export default complaintApi;
