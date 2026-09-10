import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';

const root = fileURLToPath(new URL('../../storage/private/', import.meta.url));
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function detectMime(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_UPLOAD_BYTES) fail(400, 'Berkas belum dipilih, kosong, atau melebihi batas 10 MB. Pilih berkas yang berisi data dengan ukuran maksimal 10 MB, lalu unggah kembali.');
  if (bytes.subarray(0, 5).toString() === '%PDF-' && bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) return 'application/pdf';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217) return 'image/jpeg';
  fail(400, 'Berkas tidak dikenali sebagai PDF, PNG, atau JPEG yang didukung. Ekspor ulang ke salah satu format tersebut; mengganti nama atau ekstensi berkas saja tidak cukup.');
}

export async function upload(bytes, mime, user) {
  const detected = detectMime(bytes);
  if (mime !== detected) fail(400, 'Jenis berkas yang dikirim tidak sesuai dengan isi berkasnya. Pilih ulang berkas asli dalam format PDF, PNG, atau JPEG, lalu unggah kembali.');
  const id = randomUUID();
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, id), bytes, { flag: 'wx' });
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
    await unlink(path.join(root, id));
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
  return readFile(path.join(root, id));
}
