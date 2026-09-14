import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const reply = (status, data, contentType = 'application/json') => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => contentType }, json: async () => data, text: async () => data,
});

describe('pesan kesalahan API', () => {
  it('menampilkan detail validasi pada formulir yang hanya membaca error.message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { message: 'Validasi input gagal', errors: [{ field: 'notes', message: 'Catatan wajib diisi.' }] })));
    await expect(apiClient('/test')).rejects.toMatchObject({ status: 400, message: 'Periksa isian Anda: Catatan wajib diisi.' });
  });
  it('mempertahankan petunjuk backend tanpa mengulang detail', async () => {
    const message = 'Periksa isian Anda: Catatan wajib diisi.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { message, errors: [{ message: 'Catatan wajib diisi.' }] })));
    await expect(apiClient('/test')).rejects.toMatchObject({ message });
  });
  it('menjelaskan gangguan koneksi tanpa menampilkan Failed to fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiClient('/test')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Periksa koneksi internet') });
  });
  it('menggunakan pesan layanan untuk halaman error HTML dari proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(503, '<html>internal proxy configuration</html>', 'text/html')));
    await expect(apiClient('/test')).rejects.toMatchObject({ status: 503, message: 'Layanan sedang sibuk atau belum tersedia. Coba lagi beberapa saat kemudian.' });
  });
  it('membedakan respons JSON rusak dari putus koneksi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ...reply(200), json: async () => { throw new SyntaxError('Unexpected token'); } }));
    await expect(apiClient('/test')).rejects.toMatchObject({ status: 200, message: expect.stringContaining('Jawaban server tidak dapat dibaca') });
  });
});
