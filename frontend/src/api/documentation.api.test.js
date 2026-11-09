import { describe, it, expect, vi, afterEach } from 'vitest';
import { documentationApi } from './documentation.api';

describe('Documentation API', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('sends the printing report as a JSON object, not a double-encoded string', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'r1' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    await documentationApi.createPrintingReport('reg1', { batch_no: 1, oplah_printed: 5 });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ batch_no: 1, oplah_printed: 5 });
  });
});
