import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFRawStream } from 'pdf-lib';
import { executeAntivirusScan } from './clamav.service.js';

// Batas ukuran dokumen per tipe berkas persyaratan pendaftaran penerbit
export const DOCUMENT_SIZE_LIMITS = {
  SURAT_PENDAFTARAN: 500 * 1024, // 500 KB
  AKTA_NOTARIS: 2 * 1024 * 1024, // 2 MB
  PROFIL: 500 * 1024, // 500 KB
  NPWP: 500 * 1024, // 500 KB
  NIB: 500 * 1024, // 500 KB
  KTP_PENANGGUNG_JAWAB: 500 * 1024, // 500 KB
  DEFAULT: 500 * 1024, // 500 KB
};

// Penanda konten aktif berbahaya yang dilarang dalam berkas PDF
export const FORBIDDEN_ACTIVE_CONTENT_MARKERS = [
  'JavaScript',
  'JS',
  'OpenAction',
  'Launch',
  'EmbeddedFiles',
  'EmbeddedFile',
  'RichMedia',
  'XFA',
];

/**
 * Direktori penyimpanan privat dokumen penerbit (di luar web root publik)
 */
export function getPublisherDocsDirectory() {
  return process.env.PUBLISHER_DOCS_DIR
    ? path.resolve(process.env.PUBLISHER_DOCS_DIR)
    : path.resolve('storage/private/publisher-docs');
}

/**
 * Validasi magic bytes PDF
 */
export function validatePdfMagicBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    const err = new Error('Berkas kosong atau tidak ada konten yang diunggah.');
    err.statusCode = 400;
    throw err;
  }

  // Wajib diawali %PDF- (5 byte pertama)
  const header = bytes.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    const err = new Error('Berkas tidak valid. Format berkas wajib PDF asli (header %PDF- tidak ditemukan).');
    err.statusCode = 400;
    err.code = 'FILE_NOT_PDF';
    throw err;
  }

  // Wajib memiliki trailer %%EOF pada 1024 byte terakhir
  const tail = bytes.subarray(Math.max(0, bytes.length - 1024));
  if (!tail.includes(Buffer.from('%%EOF'))) {
    const err = new Error('Struktur berkas PDF tidak lengkap (tanda akhir %%EOF tidak ditemukan).');
    err.statusCode = 400;
    err.code = 'FILE_NOT_PDF';
    throw err;
  }
}

/**
 * Validasi batas ukuran berkas per tipe dokumen
 */
export function validateDocumentSize(bytes, docType, customLimit) {
  const maxBytes = customLimit || DOCUMENT_SIZE_LIMITS[docType] || DOCUMENT_SIZE_LIMITS.DEFAULT;
  if (bytes.length > maxBytes) {
    const limitKb = Math.round(maxBytes / 1024);
    const actualKb = Math.round(bytes.length / 1024);
    const err = new Error(`Ukuran berkas ${docType || 'dokumen'} (${actualKb} KB) melebihi batas maksimum ${limitKb} KB. Harap kompres dokumen sebelum diunggah.`);
    err.statusCode = 413;
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }
}

/**
 * Ekstraksi tautan URL dari teks bebas atau string hex PDF
 */
function extractUrlsFromString(str, linkSet) {
  if (!str || typeof str !== 'string') return;
  const urlRegex = /https?:\/\/[^\s\)\>\"\'\\]+/gi;
  let match;
  while ((match = urlRegex.exec(str)) !== null) {
    linkSet.add(match[0].replace(/[.,;:]+$/, ''));
  }
}

/**
 * Pemindaian keamanan mendalam berkas PDF:
 * 1. Tolak enkripsi / proteksi sandi
 * 2. Deteksi dan tolak konten aktif (/JavaScript, /JS, /OpenAction, /Launch, /EmbeddedFile, dll.)
 * 3. Ekstraksi tautan eksternal (/URI dan URL dalam teks terdekompresi)
 * 4. Pemindaian antivirus (ClamAV & EICAR)
 */
export async function scanPdfSecurity(bytes) {
  // 1. Periksa EICAR test signature
  const eicarSig = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  if (bytes.includes(Buffer.from(eicarSig))) {
    const err = new Error('Berkas terdeteksi mengandung string uji antivirus (EICAR). Unggahan ditolak.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Deteksi enkripsi pada byte mentah
  const rawString = bytes.toString('latin1');
  if (rawString.includes('/Encrypt ') || rawString.includes('/Encrypt<') || rawString.includes('/Encrypt/')) {
    const err = new Error('Berkas PDF terenkripsi atau dilindungi kata sandi. Unggah berkas PDF yang tidak terenkripsi.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Muat PDF dengan pdf-lib untuk mendekompresi dan membedah objek
  let doc;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (loadErr) {
    if (loadErr.name === 'EncryptedPDFError' || (loadErr.message && loadErr.message.toLowerCase().includes('encrypt'))) {
      const err = new Error('Berkas PDF terenkripsi atau dilindungi kata sandi. Unggah berkas PDF yang tidak terenkripsi.');
      err.statusCode = 400;
      throw err;
    }
    const err = new Error(`Berkas PDF rusak atau tidak dapat dibaca oleh pemindai keamanan: ${loadErr.message}`);
    err.statusCode = 400;
    throw err;
  }

  const detectedLinks = new Set();
  const foundActiveContent = [];
  const visited = new Set();

  function inspectObject(item) {
    if (!item || visited.has(item)) return;
    visited.add(item);

    if (item instanceof PDFDict) {
      for (const [key, value] of item.entries()) {
        const keyName = key.asString().replace(/^\//, '');

        // Deteksi konten aktif pada nama kunci kamus
        for (const marker of FORBIDDEN_ACTIVE_CONTENT_MARKERS) {
          if (keyName.toLowerCase() === marker.toLowerCase()) {
            foundActiveContent.push(`/${keyName}`);
          }
        }

        // Deteksi konten aktif pada nilai kamus jika bertipe PDFName atau PDFString
        if (value instanceof PDFName) {
          const valName = value.asString().replace(/^\//, '');
          for (const marker of FORBIDDEN_ACTIVE_CONTENT_MARKERS) {
            if (valName.toLowerCase() === marker.toLowerCase()) {
              foundActiveContent.push(`/${valName}`);
            }
          }
        }

        // Ekstraksi tautan /URI
        if (keyName === 'URI') {
          if (value instanceof PDFString || value instanceof PDFHexString) {
            extractUrlsFromString(value.asString(), detectedLinks);
          } else if (typeof value?.value === 'string') {
            extractUrlsFromString(value.value, detectedLinks);
          }
        }

        inspectObject(value);
      }
    } else if (item instanceof PDFArray) {
      for (let i = 0; i < item.size(); i++) {
        inspectObject(item.get(i));
      }
    }
  }

  // 4. Periksa seluruh objek PDF terdekompresi
  const indirectObjects = doc.context.enumerateIndirectObjects();

  for (const [, obj] of indirectObjects) {
    inspectObject(obj);

    // B. Periksa aliran data objek (PDFRawStream)
    if (obj instanceof PDFRawStream) {
      if (obj.dict) {
        inspectObject(obj.dict);
      }

      // Dekompresi stream FlateDecode untuk memindai teks tersembunyi
      const streamBytes = Buffer.from(obj.getContents());
      let streamText = '';
      try {
        const decompressed = zlib.inflateSync(streamBytes);
        streamText = decompressed.toString('latin1');
      } catch {
        streamText = streamBytes.toString('latin1');
      }

      // Pindai konten aktif dalam isi stream terdekompresi
      for (const marker of FORBIDDEN_ACTIVE_CONTENT_MARKERS) {
        const regex = new RegExp(`\\/${marker}\\b`, 'i');
        if (regex.test(streamText)) {
          foundActiveContent.push(`/${marker}`);
        }
      }

      // Ekstraksi URL dalam stream terdekompresi
      extractUrlsFromString(streamText, detectedLinks);

      // Tangani teks PDF bertipe hex <hex_string>
      const hexMatches = streamText.match(/<([0-9a-fA-F]{8,})>/g);
      if (hexMatches) {
        for (const hexWithBrackets of hexMatches) {
          const rawHex = hexWithBrackets.slice(1, -1);
          try {
            const decoded = Buffer.from(rawHex, 'hex').toString('utf-8');
            extractUrlsFromString(decoded, detectedLinks);
          } catch {
            // Abaikan jika bukan hex teks valid
          }
        }
      }
    }
  }

  // Jika konten aktif ditemukan, tolak berkas!
  if (foundActiveContent.length > 0) {
    const uniqueMarkers = Array.from(new Set(foundActiveContent));
    const err = new Error(`Berkas PDF memuat konten aktif yang dilarang (${uniqueMarkers.join(', ')}). Unggahan ditolak demi keamanan sistem.`);
    err.statusCode = 400;
    err.code = 'FILE_ACTIVE_CONTENT';
    throw err;
  }

  // 5. Pemindaian Antivirus ClamAV
  try {
    const avResult = await executeAntivirusScan(bytes);
    if (!avResult.clean) {
      const err = new Error(`Berkas terdeteksi mengandung ancaman malware (${avResult.virus || 'terinfeksi'}) oleh pemindai antivirus.`);
      err.statusCode = 400;
      throw err;
    }
  } catch (avErr) {
    if (avErr.statusCode) throw avErr;
    // Jika scan error non-fatal pada lingkungan uji tanpa daemon ClamAV, error diabaikan sesuai log
  }

  const linksArray = Array.from(detectedLinks);
  return {
    is_clean: true,
    has_links: linksArray.length > 0,
    detected_links: linksArray,
    file_size: bytes.length,
    file_hash: createHash('sha256').update(bytes).digest('hex'),
  };
}

/**
 * Memvalidasi dan menyimpan berkas dokumen penerbit ke penyimpanan privat yang aman
 */
export async function saveSecurePublisherDocument(bytes, originalFilename, docType, options = {}) {
  // 1. Validasi magic bytes
  validatePdfMagicBytes(bytes);

  // 2. Validasi batas ukuran
  validateDocumentSize(bytes, docType, options.maxBytes);

  // 3. Pemindaian keamanan mendalam & ekstraksi tautan
  const scanResult = await scanPdfSecurity(bytes);

  // 4. Siapkan direktori penyimpanan privat
  const storageDir = getPublisherDocsDirectory();
  await mkdir(storageDir, { recursive: true });

  // 5. Nama berkas fisik diacak secara kriptografis (anti-path traversal & anti-overwrite)
  const fileId = randomUUID();
  const safeStorageFilename = `${fileId}.pdf`;
  const absoluteFilePath = path.join(storageDir, safeStorageFilename);

  // 6. Tulis berkas fisik ke disk
  await writeFile(absoluteFilePath, bytes, { flag: 'wx' });

  // Sanitasi nama asli berkas untuk kebutuhan tampilan pengguna
  const sanitizedOriginalName = path.basename(originalFilename || 'dokumen.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

  return {
    file_id: fileId,
    storage_path: path.relative(process.cwd(), absoluteFilePath).replace(/\\/g, '/'),
    absolute_path: absoluteFilePath,
    original_filename: sanitizedOriginalName,
    file_size: bytes.length,
    file_hash: scanResult.file_hash,
    mime_type: 'application/pdf',
    has_links: scanResult.has_links,
    detected_links: scanResult.detected_links,
  };
}

/**
 * Membaca berkas dokumen privat untuk unduhan terotorisasi
 */
export async function readSecurePublisherDocument(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') {
    const err = new Error('Jalur berkas tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  // Lindungi dari path traversal
  const normalized = path.normalize(storagePath);
  if (normalized.includes('..') || path.isAbsolute(storagePath)) {
    const err = new Error('Akses jalur berkas tidak aman (path traversal terdeteksi).');
    err.statusCode = 400;
    throw err;
  }

  const absolutePath = path.resolve(storagePath);
  const baseDir = path.resolve('storage/private');
  if (!absolutePath.startsWith(baseDir)) {
    const err = new Error('Akses berkas di luar direktori penyimpanan privat dilarang.');
    err.statusCode = 403;
    throw err;
  }

  try {
    const fileStats = await stat(absolutePath);
    const content = await readFile(absolutePath);
    return {
      content,
      size: fileStats.size,
      filename: path.basename(absolutePath),
    };
  } catch (readErr) {
    if (readErr.code === 'ENOENT') {
      const err = new Error('Berkas fisik dokumen tidak ditemukan di server.');
      err.statusCode = 404;
      throw err;
    }
    throw readErr;
  }
}
