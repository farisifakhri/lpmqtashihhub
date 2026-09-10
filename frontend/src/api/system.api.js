import apiClient from './client';

export const systemApi = {
  /**
   * Health check server dan koneksi database MySQL
   */
  getHealth: async () => {
    return await apiClient('/health');
  },

  /**
   * Mengambil statistik jumlah baris data di seluruh tabel database
   */
  getTableCounts: async () => {
    return await apiClient('/system/tables');
  },

  /**
   * Mengambil diagnostik spesifik modul dan data sampel dari MySQL
   */
  getModuleDiagnostics: async (moduleCode) => {
    return await apiClient(`/system/diagnostics/${moduleCode}`);
  },

  /**
   * Menjalankan custom probe / test call ke endpoint tertentu
   */
  testEndpoint: async (path, method = 'GET', body = null) => {
    const options = { method };
    if (body && method !== 'GET') {
      options.body = body;
    }
    return await apiClient(path, options);
  },
};

export default systemApi;
