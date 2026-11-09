import apiClient from './client';

// Survei kepuasan yang wajib diisi penerbit sebelum mencetak STT.
export const publisherSurveyApi = {
  listForRegistration: (registrationId) => apiClient(`/registrations/${registrationId}/surveys`),
  submit: (registrationId, surveyId, body) =>
    apiClient(`/registrations/${registrationId}/surveys/${surveyId}/response`, { method: 'POST', body }),
};
