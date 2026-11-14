import apiClient from './client';

const FAQ_API = '/faqs';
const FAQ_CATEGORIES = ['LAYANAN_TASHIH_ONLINE', 'MUSHAF_STANDAR_INDONESIA', 'REGULASI'];

function createQuery({ page, limit, search, category, is_published } = {}) {
  const query = new URLSearchParams();
  if (page) query.set('page', String(page));
  if (limit) query.set('limit', String(limit));
  if (search?.trim()) query.set('search', search.trim());
  if (category && FAQ_CATEGORIES.includes(category)) query.set('category', category);
  if (is_published !== undefined && is_published !== 'ALL') {
    query.set('is_published', String(is_published));
  }
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const faqApi = {
  listPublic: (params = {}) => apiClient(`${FAQ_API}${createQuery(params)}`, { method: 'GET' }),
  listAdmin: (params = {}) => apiClient(`/admin${FAQ_API}${createQuery(params)}`, { method: 'GET' }),
  getAdmin: (id) => apiClient(`/admin${FAQ_API}/${encodeURIComponent(id)}`, { method: 'GET' }),
  create: (data) => apiClient(`/admin${FAQ_API}`, { method: 'POST', body: data }),
  update: (id, data) => apiClient(`/admin${FAQ_API}/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/admin${FAQ_API}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const FAQ_CATEGORIES_OPTIONS = [
  { value: 'LAYANAN_TASHIH_ONLINE', label: 'Layanan Tashih Online' },
  { value: 'MUSHAF_STANDAR_INDONESIA', label: 'Mushaf Standar Indonesia' },
  { value: 'REGULASI', label: 'Regulasi' },
];
