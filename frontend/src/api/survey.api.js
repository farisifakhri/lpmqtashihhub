import apiClient from './client';

const qs = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));
  const s = query.toString();
  return s ? `?${s}` : '';
};

// Modul Survei Layanan (khusus Super Admin) — /api/v1/admin/survey*
export const surveyApi = {
  listUnsur: (params) => apiClient(`/admin/survey-unsur${qs(params)}`),
  createUnsur: (body) => apiClient('/admin/survey-unsur', { method: 'POST', body }),
  updateUnsur: (id, body) => apiClient(`/admin/survey-unsur/${id}`, { method: 'PUT', body }),
  deleteUnsur: (id, force) => apiClient(`/admin/survey-unsur/${id}${qs({ force })}`, { method: 'DELETE' }),
  reorderUnsur: (ids) => apiClient('/admin/survey-unsur/reorder', { method: 'PUT', body: { ids } }),

  listQuestions: (params) => apiClient(`/admin/survey-questions${qs(params)}`),
  createQuestion: (body) => apiClient('/admin/survey-questions', { method: 'POST', body }),
  updateQuestion: (id, body) => apiClient(`/admin/survey-questions/${id}`, { method: 'PUT', body }),
  duplicateQuestion: (id) => apiClient(`/admin/survey-questions/${id}/duplicate`, { method: 'POST' }),
  deleteQuestion: (id, force) => apiClient(`/admin/survey-questions/${id}${qs({ force })}`, { method: 'DELETE' }),

  listSurveys: (params) => apiClient(`/admin/surveys${qs(params)}`),
  getSurvey: (id) => apiClient(`/admin/surveys/${id}`),
  createSurvey: (body) => apiClient('/admin/surveys', { method: 'POST', body }),
  updateSurvey: (id, body) => apiClient(`/admin/surveys/${id}`, { method: 'PUT', body }),
  deleteSurvey: (id, force) => apiClient(`/admin/surveys/${id}${qs({ force })}`, { method: 'DELETE' }),
  reorderSurveys: (ids) => apiClient('/admin/surveys/reorder', { method: 'PUT', body: { ids } }),
  setSurveyItems: (id, items) => apiClient(`/admin/surveys/${id}/items`, { method: 'PUT', body: { items } }),
  activateSurvey: (id) => apiClient(`/admin/surveys/${id}/activate`, { method: 'POST' }),
  deactivateSurvey: (id) => apiClient(`/admin/surveys/${id}/deactivate`, { method: 'POST' }),
  duplicateSurvey: (id) => apiClient(`/admin/surveys/${id}/duplicate`, { method: 'POST' }),
  listResponses: (id, params) => apiClient(`/admin/surveys/${id}/responses${qs(params)}`),
  getReport: (id) => apiClient(`/admin/surveys/${id}/report`),
  restoreStandardUnsur: () => apiClient('/admin/survey-unsur/restore-standard', { method: 'POST' }),
  seedStandardQuestions: () => apiClient('/admin/survey-questions/seed-standard', { method: 'POST' }),
};
