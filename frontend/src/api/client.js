/**
 * API Client untuk Sistem Pentashihan Mushaf LPMQ
 * Menangani base URL, header otentikasi JWT, dan error response envelope.
 */

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const getAuthToken = () => {
  return localStorage.getItem('lpmq_token');
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('lpmq_token', token);
  } else {
    localStorage.removeItem('lpmq_token');
  }
};

export async function apiClient(endpoint, options = {}) {
  const { body, headers = {}, ...customConfig } = options;
  const token = getAuthToken();

  const defaultHeaders = {
    Accept: 'application/json',
  };

  if (!(body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `${API_BASE}${cleanEndpoint}`;

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request gagal dengan status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Gagal terhubung ke server', 0);
  }
}

export default apiClient;
