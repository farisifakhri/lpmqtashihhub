import test from 'node:test';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';
import {
  validatePdfMagicBytes,
  validateDocumentSize,
  scanPdfSecurity,
  saveSecurePublisherDocument,
  readSecurePublisherDocument,
  DOCUMENT_SIZE_LIMITS,
} from '../src/services/secure-document.service.js';

// Helper membuat PDF dasar yang valid
async function createBasePdf(text = 'Dokumen Resmi LPMQ') {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 700]);
  page.drawText(text);
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

test('T-F05: validatePdfMagicBytes memvalidasi header %PDF- dan trailer %%EOF', async () => {
  const validPdf = await createBasePdf();
  assert.doesNotThrow(() => validatePdfMagicBytes(validPdf));

  // Berkas teks bukan PDF
  const textBuffer = Buffer.from('Ini bukan berkas PDF');
  assert.throws(() => validatePdfMagicBytes(textBuffer), /Format berkas wajib PDF asli/);

  // PDF terpangkas tanpa %%EOF
  const truncatedPdf = validPdf.subarray(0, validPdf.length - 200);
  assert.throws(() => validatePdfMagicBytes(truncatedPdf), /%%EOF tidak ditemukan/);

  // Buffer kosong
  assert.throws(() => validatePdfMagicBytes(Buffer.alloc(0)), /Berkas kosong/);
});

test('T-F05: validateDocumentSize membatasi ukuran per jenis dokumen', async () => {
  const smallBuffer = Buffer.alloc(100 * 1024); // 100 KB
  assert.doesNotThrow(() => validateDocumentSize(smallBuffer, 'SURAT_PENDAFTARAN'));

  const largeBuffer = Buffer.alloc(600 * 1024); // 600 KB (batas 500 KB)
  assert.throws(
    () => validateDocumentSize(largeBuffer, 'SURAT_PENDAFTARAN'),
    /melebihi batas maksimum 500 KB/
  );

  // Akta Notaris memiliki batas 2 MB
  const aktaBuffer = Buffer.alloc(1500 * 1024); // 1.5 MB
  assert.doesNotThrow(() => validateDocumentSize(aktaBuffer, 'AKTA_NOTARIS'));

  const aktaTooLarge = Buffer.alloc(2500 * 1024); // 2.5 MB
  assert.throws(
    () => validateDocumentSize(aktaTooLarge, 'AKTA_NOTARIS'),
    /melebihi batas maksimum 2048 KB/
  );
});

test('T-F05: scanPdfSecurity menolak PDF terenkripsi dan mengandung EICAR', async () => {
  // PDF terenkripsi simulasi
  const encryptedSimulated = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Encrypt 3 0 R >>\nendobj\n%%EOF');
  await assert.rejects(
    () => scanPdfSecurity(encryptedSimulated),
    /PDF terenkripsi atau dilindungi kata sandi/
  );

  // PDF dengan string uji antivirus EICAR
  const eicarPdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n% '),
    Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
    Buffer.from('\n%%EOF'),
  ]);
  await assert.rejects(
    () => scanPdfSecurity(eicarPdf),
    /string uji antivirus \(EICAR\)/
  );
});

test('T-F05: scanPdfSecurity mendeteksi dan menolak konten aktif (/JavaScript, /OpenAction, /Launch)', async () => {
  // 1. PDF dengan /OpenAction & /JavaScript
  const docJs = await PDFDocument.create();
  docJs.addPage();
  docJs.catalog.set(PDFName.of('OpenAction'), docJs.context.obj({
    S: 'JavaScript',
    JS: PDFString.of('app.alert("XSS");'),
  }));
  const jsBytes = Buffer.from(await docJs.save());

  await assert.rejects(
    () => scanPdfSecurity(jsBytes),
    /konten aktif yang dilarang/
  );

  // 2. PDF dengan /Launch
  const docLaunch = await PDFDocument.create();
  docLaunch.addPage();
  docLaunch.catalog.set(PDFName.of('Launch'), docLaunch.context.obj({
    F: PDFString.of('calc.exe'),
  }));
  const launchBytes = Buffer.from(await docLaunch.save());

  await assert.rejects(
    () => scanPdfSecurity(launchBytes),
    /konten aktif yang dilarang/
  );

  // 3. PDF dengan /EmbeddedFiles
  const docEmbedded = await PDFDocument.create();
  docEmbedded.addPage();
  docEmbedded.catalog.set(PDFName.of('EmbeddedFiles'), docEmbedded.context.obj({}));
  const embeddedBytes = Buffer.from(await docEmbedded.save());

  await assert.rejects(
    () => scanPdfSecurity(embeddedBytes),
    /konten aktif yang dilarang/
  );
});

test('T-F05: scanPdfSecurity mengekstrak tautan /URI tanpa menolak dokumen sah', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 700]);
  page.drawText('Kunjungi website kami di https://penerbit-mushaf.co.id/profil untuk info lengkap.');

  // Tambahkan anotasi tautan /URI
  const linkDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [50, 50, 200, 100],
    A: {
      S: 'URI',
      URI: PDFString.of('https://kemenag.go.id/lpmq'),
    },
  });
  page.node.set(PDFName.of('Annots'), doc.context.obj([linkDict]));

  const pdfBytes = Buffer.from(await doc.save());
  const result = await scanPdfSecurity(pdfBytes);

  assert.equal(result.is_clean, true);
  assert.equal(result.has_links, true);
  assert.ok(result.detected_links.some(link => link.includes('kemenag.go.id/lpmq')));
  assert.ok(result.file_hash.length === 64);
});

test('T-F05: saveSecurePublisherDocument & readSecurePublisherDocument menyimpan dengan nama acak dan mencegah traversal', async () => {
  const validPdf = await createBasePdf('Surat Pendaftaran Resmi PT Penerbit Barokah');
  const saved = await saveSecurePublisherDocument(validPdf, 'surat permohonan penerbit.pdf', 'SURAT_PENDAFTARAN');

  try {
    assert.ok(saved.file_id);
    assert.ok(saved.storage_path.endsWith('.pdf'));
    assert.equal(saved.original_filename, 'surat_permohonan_penerbit.pdf');
    assert.equal(saved.file_size, validPdf.length);
    assert.equal(saved.has_links, false);

    // Baca kembali berkas
    const read = await readSecurePublisherDocument(saved.storage_path);
    assert.equal(read.size, validPdf.length);
    assert.equal(read.content.subarray(0, 5).toString('ascii'), '%PDF-');

    // Uji penolakan path traversal
    await assert.rejects(
      () => readSecurePublisherDocument('../../../etc/passwd'),
      /path traversal terdeteksi/
    );
  } finally {
    // Bersihkan berkas uji
    await unlink(saved.absolute_path).catch(() => {});
  }
});
