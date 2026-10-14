import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yauzl from 'yauzl';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { executeAntivirusScan } from './clamav.service.js';

const root = fileURLToPath(new URL('../../storage/private/', import.meta.url));
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB global body limit
export const MAX_APK_BYTES = 10 * 1024 * 1024; // 10 MB for APK files
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 10000;

export function detectMime(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_UPLOAD_BYTES) {
    fail(400, 'Berkas belum dipilih, kosong, atau melebihi batas yang didukung (PDF/gambar max 10 MB, APK max 10 MB, total max 15 MB). Pilih berkas yang lebih kecil, lalu unggah kembali.');
  }
  if (bytes.subarray(0, 5).toString() === '%PDF-' && bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) {
    if (bytes.length > MAX_DOC_BYTES) fail(400, 'Berkas PDF melebihi batas ukuran 10 MB. Harap perkecil ukuran dokumen PDF, lalu unggah kembali.');
    return 'application/pdf';
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (bytes.length > MAX_DOC_BYTES) fail(400, 'Berkas gambar PNG melebihi batas ukuran 10 MB. Harap perkecil ukuran gambar, lalu unggah kembali.');
    return 'image/png';
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    if (bytes.length > MAX_DOC_BYTES) fail(400, 'Berkas gambar JPEG melebihi batas ukuran 10 MB. Harap perkecil ukuran gambar, lalu unggah kembali.');
    return 'image/jpeg';
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
    if (bytes.length > MAX_APK_BYTES) fail(400, 'Berkas APK Android melebihi batas ukuran 10 MB. Harap kompres atau gunakan versi yang lebih kecil.');
    return 'application/vnd.android.package-archive';
  }
  fail(400, 'Berkas tidak dikenali sebagai PDF, PNG, JPEG, atau APK Android yang didukung. Ekspor ulang ke salah satu format tersebut; mengganti nama atau ekstensi berkas saja tidak cukup.');
}

/**
 * Validates APK archive structure by reading ZIP entries with yauzl.
 *
 * Rules:
 * 1. Must contain AndroidManifest.xml
 * 2. Must contain classes.dex (or classes*.dex) or resources.arsc
 * 3. Must not contain directory traversal paths ('../' or '..\')
 * 4. Must not exceed MAX_ZIP_ENTRIES
 */
export async function validateApkArchive(bytes) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true }, (err, zipfile) => {
      if (err) {
        return reject({
          statusCode: 400,
          message: `Berkas arsip APK rusak atau tidak dapat dibaca: ${err.message}`,
        });
      }

      let entryCount = 0;
      let hasManifest = false;
      let hasDexOrArsc = false;

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        entryCount++;
        if (entryCount > MAX_ZIP_ENTRIES) {
          zipfile.close();
          return reject({
            statusCode: 400,
            message: `Berkas APK melebihi batas maksimum ${MAX_ZIP_ENTRIES} entri berkas.`,
          });
        }

        const fileName = entry.fileName;
        if (fileName.includes('../') || fileName.includes('..\\') || path.isAbsolute(fileName)) {
          zipfile.close();
          return reject({
            statusCode: 400,
            message: 'Berkas APK memuat entri jalur tidak aman (directory traversal).',
          });
        }

        if (fileName === 'AndroidManifest.xml') {
          hasManifest = true;
        }

        if (
          fileName === 'classes.dex' ||
          (fileName.startsWith('classes') && fileName.endsWith('.dex')) ||
          fileName === 'resources.arsc'
        ) {
          hasDexOrArsc = true;
        }

        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        if (!hasManifest) {
          return reject({
            statusCode: 400,
            message: 'Berkas ZIP tidak memuat AndroidManifest.xml. Berkas ini bukan paket aplikasi Android (APK) yang sah.',
          });
        }

        if (!hasDexOrArsc) {
          return reject({
            statusCode: 400,
            message: 'Berkas APK tidak memuat classes.dex atau resources.arsc. Berkas ini bukan paket aplikasi Android (APK) yang lengkap dan sah.',
          });
        }

        resolve({ entryCount, hasManifest, hasDexOrArsc });
      });

      zipfile.on('error', (zipErr) => {
        let msg = zipErr.message;
        if (msg.includes('invalid relative path') || msg.includes('..')) {
          msg = `Berkas APK memuat entri jalur tidak aman (directory traversal): ${zipErr.message}`;
        } else {
          msg = `Terjadi kesalahan saat membaca paket APK: ${zipErr.message}`;
        }
        reject({
          statusCode: 400,
          message: msg,
        });
      });
    });
  });
}

export async function upload(bytes, mime, user) {
  const detected = detectMime(bytes);
  const isApkCompatible = detected === 'application/vnd.android.package-archive' &&
    ['application/vnd.android.package-archive', 'application/octet-stream', 'application/zip', 'application/x-zip-compressed'].includes(mime);
  if (mime !== detected && !isApkCompatible) {
    fail(400, 'Jenis berkas yang dikirim tidak sesuai dengan isi berkasnya. Pilih ulang berkas asli dalam format PDF, PNG, JPEG, atau APK, lalu unggah kembali.');
  }

  // Validasi struktur berkas paket APK Android menggunakan daftar entri ZIP riil
  if (detected === 'application/vnd.android.package-archive') {
    try {
      await validateApkArchive(bytes);
    } catch (apkErr) {
      fail(apkErr.statusCode || 400, apkErr.message || 'Validasi paket APK gagal.');
    }
  }

  // Pemeriksaan string uji standar antivirus EICAR (hanya untuk pengujian integrasi non-destruktif)
  const eicarSig = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  if (bytes.includes(Buffer.from(eicarSig))) {
    fail(400, 'Berkas terdeteksi mengandung string uji standar antivirus (EICAR). Unggahan ditolak.');
  }

  const id = randomUUID();
  await mkdir(root, { recursive: true });
  const targetPath = path.join(root, id);
  await writeFile(targetPath, bytes, { flag: 'wx' });

  // Pemindaian malware menggunakan ClamAV clamd daemon (INSTREAM socket)
  try {
    const scanResult = await executeAntivirusScan(bytes);
    if (!scanResult.clean) {
      await unlink(targetPath).catch(() => {});
      fail(400, `Berkas terdeteksi mengandung malware (${scanResult.virus || 'ancaman terdeteksi'}) oleh pemindai ClamAV.`);
    }
  } catch (scanErr) {
    await unlink(targetPath).catch(() => {});
    if (scanErr.statusCode) {
      fail(scanErr.statusCode, scanErr.message);
    }
    throw scanErr;
  }

  try {
    return await prisma.$transaction(async tx => {
      const file = await tx.storedFile.create({ data: {
        id, owner_id: user.id, mime_type: detected, file_size: bytes.length,
        checksum: createHash('sha256').update(bytes).digest('hex'),
      } });
      await audit(tx, user, 'UPLOAD', 'StoredFile', id, file);
      return file;
    });
  } catch (error) {
    await unlink(targetPath).catch(() => {});
    throw error;
  }
}

export async function ownedFile(db, id, user) {
  const file = await db.storedFile.findUnique({ where: { id } });
  if (!file || file.owner_id !== user.id) fail(403, 'Berkas tidak tersedia untuk akun Anda. Unggah berkas menggunakan akun yang sedang masuk, lalu pilih hasil unggahan tersebut.');
  return file;
}

export async function readStoredFile(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) fail(404, 'Berkas tidak ditemukan.');
  try {
    return await readFile(path.join(root, id));
  } catch (err) {
    if (err.code === 'ENOENT') fail(404, 'Fisik berkas tidak ditemukan di penyimpanan server.');
    throw err;
  }
}

