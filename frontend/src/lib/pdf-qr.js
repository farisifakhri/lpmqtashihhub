// Membaca QR verifikasi STT dan merender pratinjau PDF di browser (issue log #40).
// Build legacy: build standar pdfjs v6 memakai Uint8Array#toHex (Chrome 140+/Safari 18.2+); legacy menyertakan polyfill.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import jsQR from 'jsqr';
import { sttTokenFromText } from './stt-token';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Di pdfjs v6 destroy() hanya ada pada loading task, bukan pada dokumen.
const withPdf = async (bytes, use) => {
  const task = pdfjs.getDocument({ data: bytes });
  try {
    return await use(await task.promise);
  } finally {
    task.destroy();
  }
};

const renderPage = async (pdf, pageNo, scale) => {
  const page = await pdf.getPage(pageNo);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return canvas;
};

const pageNumbers = (pdf, maxPages) => Array.from({ length: Math.min(pdf.numPages, maxPages) }, (_, index) => index + 1);

// shortcut: hanya 5 halaman pertama dan skala 2/3; naikkan bila hasil pindai buram sering gagal terbaca.
export const findSttTokenInPdf = (bytes, { maxPages = 5, scales = [2, 3] } = {}) => withPdf(bytes, async (pdf) => {
  for (const pageNo of pageNumbers(pdf, maxPages)) {
    for (const scale of scales) {
      const canvas = await renderPage(pdf, pageNo, scale);
      const image = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
      const token = sttTokenFromText(jsQR(image.data, canvas.width, canvas.height)?.data);
      if (token) return token;
    }
  }
  return null;
});

// Pratinjau berupa gambar agar tetap tampil di peramban ponsel yang tidak dapat menampilkan PDF di dalam iframe.
export const renderPdfPreview = (bytes, { maxPages = 5, scale = 1.5 } = {}) => withPdf(bytes, async (pdf) => {
  const pages = [];
  for (const pageNo of pageNumbers(pdf, maxPages)) pages.push((await renderPage(pdf, pageNo, scale)).toDataURL('image/png'));
  return pages;
});
