import apiClient from './client';

export const publicApi = {
  verifyDocument: async (token) => {
    return apiClient(`/public/verify-document/${encodeURIComponent(token)}`);
  },
  publisherMap: () => apiClient('/public/publisher-map'),
  // Mengambil angka statistik ringkasan agregat (STT Terbit, Penerbit, Pentashih) untuk Landing Page
  getStatistics: () => apiClient('/public/statistics', { silent: true }),
  // { letter, province, search, page, limit } — tanpa NPWP/NIB
  publisherDirectory: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
    });
    const queryString = query.toString();
    return apiClient(`/public/publisher-directory${queryString ? `?${queryString}` : ''}`);
  },
  surveys: () => apiClient('/public/surveys'),
  // { from, to } dalam format YYYY-MM-DD, opsional
  surveyReport: (id, { from, to } = {}) => {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const queryString = query.toString();
    return apiClient(`/public/surveys/${encodeURIComponent(id)}/report${queryString ? `?${queryString}` : ''}`);
  },
};

export default publicApi;
