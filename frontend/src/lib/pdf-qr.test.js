// @vitest-environment node
// Uji tanpa mock: fixture dibuat oleh renderSttPdf backend (QR berisi URL produksi). Kanvas memakai
// @napi-rs/canvas, dependensi opsional pdfjs-dist; dilewati bila paket itu tidak terpasang di platform ini.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const require = createRequire(import.meta.url);
let createCanvas = null;
try { ({ createCanvas } = require('@napi-rs/canvas')); } catch { /* paket opsional tidak tersedia */ }

const TOKEN = 'b3c0c262-d2e5-427b-a8e9-8a330acd3a96';
// Salinan baru tiap pemanggilan karena pdfjs dapat memindahkan (detach) buffer ke worker.
const sttPdf = async () => new Uint8Array(await readFile(new URL('./__fixtures__/stt-qr.pdf', import.meta.url)));
const blankPdf = () => new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
  + '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
);

describe.skipIf(!createCanvas)('pdf-qr (PDF STT sungguhan)', () => {
  let lib;
  beforeAll(async () => {
    globalThis.document = { createElement: () => createCanvas(1, 1) };
    lib = await import('./pdf-qr');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  });
  afterAll(() => { delete globalThis.document; });

  it('membaca token dari QR pada STT terbitan sistem', async () => {
    expect(await lib.findSttTokenInPdf(await sttPdf())).toBe(TOKEN);
  });

  it('mengembalikan null untuk PDF tanpa QR STT', async () => {
    expect(await lib.findSttTokenInPdf(blankPdf())).toBeNull();
  });

  it('merender pratinjau setiap halaman sebagai gambar PNG', async () => {
    const pages = await lib.renderPdfPreview(await sttPdf());
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatch(/^data:image\/png;base64,/);
  });
});
