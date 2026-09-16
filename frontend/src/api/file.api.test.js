import { describe, it, expect, vi, afterEach } from 'vitest';
import { fileApi } from './file.api';
describe('Publisher private file API', () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
  it('uploads binary bytes using the authenticated session', async () => {
    localStorage.setItem('lpmq_token', 'session-token');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'file1' } }), { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const file = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' });
    expect(await fileApi.upload(file)).toEqual({ id: 'file1' });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/uploads'), expect.objectContaining({ headers: { 'Content-Type': 'application/pdf', Authorization: 'Bearer session-token' }, body: file }));
  });
  it('preserves a permission error without initiating a download', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Akses ditolak' }), { status: 403 })));
    await expect(fileApi.downloadDocument('other-publisher')).rejects.toThrow('Akses ditolak');
  });
  it('refuses a success response that is not an official PDF', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })));
    await expect(fileApi.downloadDocument('doc1')).rejects.toThrow('PDF resmi');
  });
});
