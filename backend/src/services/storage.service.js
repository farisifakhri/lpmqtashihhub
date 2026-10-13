import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';

const root = fileURLToPath(new URL('../../storage/private/', import.meta.url));
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB global body limit
export const MAX_APK_BYTES = 10 * 1024 * 1024; // 10 MB for APK files
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

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
    // Tolak dokumen Microsoft Office (.docx/.xlsx/.pptx) atau Java Archive (.jar) yang bertopeng awalan ZIP PK
    if (bytes.includes(Buffer.from('[Content_Types].xml')) || bytes.includes(Buffer.from('word/')) || bytes.includes(Buffer.from('xl/'))) {
      fail(400, 'Berkas dikenali sebagai dokumen Microsoft Office (.docx/.xlsx), bukan berkas APK Android yang sah.');
    }
    // Jika berkas berupa arsip nyata (>100 bytes), pastikan memuat AndroidManifest.xml
    if (bytes.length > 100 && !bytes.includes(Buffer.from('AndroidManifest.xml'))) {
      fail(400, 'Berkas ZIP tidak memuat AndroidManifest.xml. Berkas ini bukan paket aplikasi Android (APK) yang sah.');
    }
    return 'application/vnd.android.package-archive';
  }
  fail(400, 'Berkas tidak dikenali sebagai PDF, PNG, JPEG, atau APK Android yang didukung. Ekspor ulang ke salah satu format tersebut; mengganti nama atau ekstensi berkas saja tidak cukup.');
}

export async function upload(bytes, mime, user) {
  const detected = detectMime(bytes);
  const isApkCompatible = detected === 'application/vnd.android.package-archive' &&
    ['application/vnd.android.package-archive', 'application/octet-stream', 'application/zip', 'application/x-zip-compressed'].includes(mime);
  if (mime !== detected && !isApkCompatible) {
    fail(400, 'Jenis berkas yang dikirim tidak sesuai dengan isi berkasnya. Pilih ulang berkas asli dalam format PDF, PNG, JPEG, atau APK, lalu unggah kembali.');
  }

  // Pemindaian malware signature (EICAR & ancaman umum)
  const eicarSig = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  if (bytes.includes(Buffer.from(eicarSig))) {
    fail(400, 'Berkas terdeteksi mengandung ancaman keamanan/malware.');
  }

  const id = randomUUID();
  await mkdir(root, { recursive: true });
  const targetPath = path.join(root, id);
  await writeFile(targetPath, bytes, { flag: 'wx' });

  // Pemindaian malware menggunakan ClamAV jika terpasang pada sistem operasi
  try {
    const { execFile } = await import('node:child_process');
    await new Promise((resolve, reject) => {
      execFile('clamscan', ['--no-summary', targetPath], (err, stdout) => {
        if (err && (err.code === 1 || stdout?.includes('FOUND'))) {
          return reject(new Error('Berkas terdeteksi mengandung malware oleh pemindai ClamAV.'));
        }
        resolve();
      });
    });
  } catch (scanErr) {
    if (scanErr.message.includes('malware')) {
      await unlink(targetPath).catch(() => {});
      fail(400, scanErr.message);
    }
    // Jika clamscan tidak terpasang di host, lanjutkan dengan aman
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

