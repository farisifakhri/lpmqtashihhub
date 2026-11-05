import apiClient, { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

function createQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category && params.category !== 'ALL') query.set('category', params.category);
  if (params.is_published !== undefined && params.is_published !== 'ALL') {
    query.set('is_published', params.is_published);
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

async function downloadFile(id, fileName, admin = false) {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const prefix = admin ? '/admin/service-documents' : '/service-documents';
  const token = getAuthToken();
  const response = await fetch(
    `${base}${prefix}/${encodeURIComponent(id)}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!response.ok) throw new Error('Dokumen tidak dapat diunduh. Silakan coba kembali.');

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = (fileName || 'dokumen.pdf').replace(/[\\/:*?"<>|]/g, '-');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export const serviceDocumentApi = {
  listPublic: (params = {}) => apiClient(`/service-documents${createQuery(params)}`, { method: 'GET' }),
  listAdmin: (params = {}) => apiClient(`/admin/service-documents${createQuery(params)}`, { method: 'GET' }),
  create: (formData) => apiClient('/admin/service-documents', { method: 'POST', body: formData }),
  update: (id, formData) => apiClient(`/admin/service-documents/${encodeURIComponent(id)}`, { method: 'PUT', body: formData }),
  delete: (id) => apiClient(`/admin/service-documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  download: (id, fileName) => downloadFile(id, fileName),
  downloadAdmin: (id, fileName) => downloadFile(id, fileName, true),
};

export default serviceDocumentApi;
