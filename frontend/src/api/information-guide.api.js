import apiClient, { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

function getApiUrl(endpoint) {
  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${cleanBase}${endpoint}`;
}

async function fetchProtectedBlob(endpoint) {
  const token = getAuthToken();
  const response = await fetch(getApiUrl(endpoint), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Berkas panduan tidak dapat dimuat. Muat ulang halaman atau coba kembali.');
  }
  return response.blob();
}

function triggerDownload(blob, fileName) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName.replace(/[\\/:*?"<>|]/g, '-');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function createQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.section) query.set('section', params.section);
  if (params.is_published !== undefined && params.is_published !== 'ALL') {
    query.set('is_published', params.is_published);
  }
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const informationGuideApi = {
  listPublic: (params = {}) => apiClient(`/information-guides${createQuery(params)}`, { method: 'GET' }),
  getPublic: (id, { section } = {}) => apiClient(`/information-guides/${encodeURIComponent(id)}${createQuery({ section })}`, { method: 'GET' }),
  listAdmin: (params = {}) => apiClient(`/admin/information-guides${createQuery(params)}`, { method: 'GET' }),
  getAdmin: (id, { section } = {}) => apiClient(`/admin/information-guides/${encodeURIComponent(id)}${createQuery({ section })}`, { method: 'GET' }),
  create: (data) => apiClient('/admin/information-guides', { method: 'POST', body: data }),
  update: (id, data, { section } = {}) => apiClient(`/admin/information-guides/${encodeURIComponent(id)}${createQuery({ section })}`, { method: 'PUT', body: data }),
  delete: (id, { section } = {}) => apiClient(`/admin/information-guides/${encodeURIComponent(id)}${createQuery({ section })}`, { method: 'DELETE' }),
  uploadImage: (id, file, { section } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient(`/admin/information-guides/${encodeURIComponent(id)}/images${createQuery({ section })}`, {
      method: 'POST',
      body: formData,
    });
  },
  fetchFileBlobUrl: async (id, { admin = false, section } = {}) => {
    const endpoint = admin
      ? `/admin/information-guides/${encodeURIComponent(id)}/file`
      : `/information-guides/${encodeURIComponent(id)}/file`;
    return URL.createObjectURL(await fetchProtectedBlob(`${endpoint}${createQuery({ section })}`));
  },
  fetchImageBlobUrl: async (id, { admin = false, section } = {}) => {
    const endpoint = admin
      ? `/admin/information-guides/images/${encodeURIComponent(id)}`
      : `/information-guides/images/${encodeURIComponent(id)}`;
    return URL.createObjectURL(await fetchProtectedBlob(`${endpoint}${createQuery({ section })}`));
  },
  download: async (id, fileName, { admin = false, section } = {}) => {
    const endpoint = admin
      ? `/admin/information-guides/${encodeURIComponent(id)}/download`
      : `/information-guides/${encodeURIComponent(id)}/download`;
    triggerDownload(await fetchProtectedBlob(`${endpoint}${createQuery({ section })}`), fileName || 'panduan');
  },
};

export default informationGuideApi;
