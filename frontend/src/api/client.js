/**
 * API Client untuk Sistem Pentashihan Mushaf LPMQ
 * Menangani base URL, header otentikasi JWT, dan error response envelope.
 */

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

const responseError = (status) => ({
  400: 'Data belum dapat diproses. Periksa kembali isian formulir Anda.',
  401: 'Sesi masuk Anda berakhir atau tidak valid. Silakan masuk kembali.',
  403: 'Akun Anda tidak memiliki izin untuk tindakan ini. Hubungi petugas yang berwenang.',
  404: 'Data atau halaman yang diminta tidak ditemukan. Muat ulang daftar dan pilih kembali.',
  409: 'Data sudah berubah atau sedang diproses. Muat ulang detail sebelum mencoba lagi.',
  413: 'Data atau berkas terlalu besar. Kurangi ukurannya sebelum mengirim kembali.',
  422: 'Data belum memenuhi ketentuan. Periksa kembali isian atau berkas yang Anda kirim.',
  429: 'Terlalu banyak permintaan dalam waktu singkat. Tunggu beberapa saat sebelum mencoba lagi.',
  502: 'Layanan belum dapat dihubungi. Coba lagi beberapa saat kemudian.',
  503: 'Layanan sedang sibuk atau belum tersedia. Coba lagi beberapa saat kemudian.',
  504: 'Server belum merespons tepat waktu. Muat ulang untuk memeriksa hasilnya sebelum mengirim ulang.',
}[status] || 'Permintaan belum dapat diproses. Muat ulang untuk memeriksa hasilnya; hubungi administrator jika masalah berlanjut.');

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
      try { data = await response.json(); }
      catch {
        throw new ApiError(response.ok
          ? 'Jawaban server tidak dapat dibaca. Muat ulang untuk memeriksa hasilnya sebelum mengirim ulang.'
          : responseError(response.status), response.status);
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const details = Array.isArray(data?.errors)
        ? [...new Set(data.errors.map(item => item?.message).filter(message => typeof message === 'string' && message.trim()))]
        : [];
      let errorMessage = typeof data?.message === 'string' && data.message.trim() ? data.message : responseError(response.status);
      if (details.length && !details.some(message => errorMessage.includes(message))) {
        errorMessage = `Periksa isian Anda: ${details.slice(0, 3).join(' ')}${details.length > 3 ? ' Periksa juga isian lainnya.' : ''}`;
      }
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === 'AbortError') throw new ApiError('Permintaan dibatalkan. Periksa hasilnya sebelum mengirim ulang.', 0);
    throw new ApiError('Tidak dapat menghubungi server. Periksa koneksi internet Anda, lalu muat ulang untuk memastikan hasil permintaan sebelum mengirim ulang.', 0);
  }
}

export default apiClient;
