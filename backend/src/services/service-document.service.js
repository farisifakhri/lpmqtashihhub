import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { executeAntivirusScan } from './clamav.service.js';

export const MAX_SERVICE_DOCUMENT_SIZE = 15 * 1024 * 1024;
const STORAGE_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

export function getServiceDocumentStorageDirectory() {
  return process.env.SERVICE_DOCUMENTS_STORAGE_DIR
    ? path.resolve(process.env.SERVICE_DOCUMENTS_STORAGE_DIR)
    : path.resolve('storage/service-documents');
}

export async function validateServiceDocumentPdf(file) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) fail(400, 'Berkas dokumen PDF wajib diunggah.');
  if (buffer.length > MAX_SERVICE_DOCUMENT_SIZE) fail(413, 'Ukuran berkas PDF melebihi batas maksimum 15 MB.');

  const originalName = String(file.originalname || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\\:*?"<>\u0000-\u001f\u007f]/g, '_');
  if (!originalName || !originalName.toLowerCase().endsWith('.pdf') || originalName.length > 255) {
    fail(400, 'Nama berkas tidak valid. Unggah dokumen PDF.');
  }
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    fail(400, 'Format berkas tidak valid. Berkas wajib berupa dokumen PDF.');
  }
  if (!buffer.subarray(Math.max(0, buffer.length - 1024)).includes(Buffer.from('%%EOF'))) {
    fail(400, 'Struktur berkas PDF rusak atau tidak lengkap.');
  }

  const scan = await executeAntivirusScan(buffer);
  if (!scan.clean) fail(400, 'Berkas dokumen terdeteksi mengandung ancaman malware dan ditolak.');

  return { fileName: originalName };
}

async function saveServiceDocumentFile(file, fileName) {
  const storagePath = `${randomUUID()}.pdf`;
  const directory = getServiceDocumentStorageDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storagePath), file.buffer, { flag: 'wx', mode: 0o600 });
  return {
    storage_path: storagePath,
    file_name: fileName,
    file_size: file.buffer.length,
    mime_type: 'application/pdf',
  };
}

async function removeServiceDocumentFile(storagePath) {
  if (!STORAGE_FILE_PATTERN.test(storagePath || '')) {
    console.error('[ServiceDocumentService] Rejected an unexpected stored file path.');
    fail(500, 'Berkas dokumen tidak dapat dihapus dengan aman.');
  }
  const root = getServiceDocumentStorageDirectory();
  const rootRealPath = await realpath(root).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!rootRealPath) return;
  const target = path.join(root, storagePath);
  const targetStat = await lstat(target).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!targetStat) return;
  if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
    console.error('[ServiceDocumentService] Refused to remove a non-regular stored file.');
    fail(500, 'Berkas dokumen tidak dapat dihapus dengan aman.');
  }
  const targetRealPath = await realpath(target);
  if (!targetRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
    console.error('[ServiceDocumentService] Refused to remove a file outside the storage root.');
    fail(500, 'Berkas dokumen tidak dapat dihapus dengan aman.');
  }
  await unlink(targetRealPath);
}

async function resolveServiceDocumentFile(storagePath) {
  if (!STORAGE_FILE_PATTERN.test(storagePath || '')) fail(404, 'Berkas dokumen tidak ditemukan.');
  const root = getServiceDocumentStorageDirectory();
  const rootRealPath = await realpath(root).catch((error) => {
    if (error.code === 'ENOENT') fail(404, 'Berkas dokumen tidak ditemukan.');
    throw error;
  });
  const target = path.join(root, storagePath);
  const targetStat = await lstat(target).catch((error) => {
    if (error.code === 'ENOENT') fail(404, 'Berkas dokumen tidak ditemukan.');
    throw error;
  });
  if (!targetStat.isFile() || targetStat.isSymbolicLink()) fail(404, 'Berkas dokumen tidak ditemukan.');
  const targetRealPath = await realpath(target);
  if (!targetRealPath.startsWith(`${rootRealPath}${path.sep}`)) fail(404, 'Berkas dokumen tidak ditemukan.');
  return targetRealPath;
}

function paginationShape(total, page, limit) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export async function listPublicServiceDocuments({ page = 1, limit = 10, category } = {}) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const where = { is_published: true, ...(category ? { category } : {}) };
  const [total, items] = await Promise.all([
    prisma.serviceDocument.count({ where }),
    prisma.serviceDocument.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        file_name: true,
        created_at: true,
      },
    }),
  ]);
  return { items, pagination: paginationShape(total, pageNumber, pageSize) };
}

export async function listAdminServiceDocuments({ page = 1, limit = 10, category, is_published } = {}) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const where = {
    ...(category ? { category } : {}),
    ...(is_published === undefined ? {} : { is_published }),
  };
  const [total, items] = await Promise.all([
    prisma.serviceDocument.count({ where }),
    prisma.serviceDocument.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: { created_at: 'desc' },
    }),
  ]);
  return { items, pagination: paginationShape(total, pageNumber, pageSize) };
}

export async function getServiceDocumentFile(id, allowDraft = false) {
  const document = await prisma.serviceDocument.findUnique({ where: { id } });
  if (!document || (!allowDraft && !document.is_published)) fail(404, 'Dokumen tidak tersedia atau belum dipublikasikan.');
  const absolutePath = await resolveServiceDocumentFile(document.storage_path);
  const bytes = await readFile(absolutePath);
  return { bytes, document };
}

export async function createServiceDocument({ data, file, user, req }) {
  const { fileName } = await validateServiceDocumentPdf(file);
  const fileInfo = await saveServiceDocumentFile(file, fileName);
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.serviceDocument.create({
        data: {
          title: data.title.trim(),
          category: data.category,
          ...fileInfo,
          is_published: data.is_published ?? true,
          created_by_id: user.id,
        },
      });
      await audit(tx, user, 'CREATE_SERVICE_DOCUMENT', 'ServiceDocument', created.id, created, req);
      return created;
    });
  } catch (error) {
    await removeServiceDocumentFile(fileInfo.storage_path);
    throw error;
  }
}

export async function updateServiceDocument({ id, data, file, user, req }) {
  const existing = await prisma.serviceDocument.findUnique({ where: { id } });
  if (!existing) fail(404, 'Dokumen tidak ditemukan.');

  let newFileInfo;
  if (file) {
    const { fileName } = await validateServiceDocumentPdf(file);
    newFileInfo = await saveServiceDocumentFile(file, fileName);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updateData = {
        updated_by_id: user.id,
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.is_published !== undefined ? { is_published: data.is_published } : {}),
        ...(newFileInfo || {}),
      };
      const result = await tx.serviceDocument.update({ where: { id }, data: updateData });
      await audit(tx, user, 'UPDATE_SERVICE_DOCUMENT', 'ServiceDocument', id, result, req, existing);
      return result;
    });
    if (newFileInfo) await removeServiceDocumentFile(existing.storage_path);
    return updated;
  } catch (error) {
    if (newFileInfo) await removeServiceDocumentFile(newFileInfo.storage_path);
    throw error;
  }
}

export async function deleteServiceDocument({ id, user, req }) {
  const existing = await prisma.serviceDocument.findUnique({ where: { id } });
  if (!existing) fail(404, 'Dokumen tidak ditemukan.');
  await prisma.$transaction(async (tx) => {
    await tx.serviceDocument.delete({ where: { id } });
    await audit(tx, user, 'DELETE_SERVICE_DOCUMENT', 'ServiceDocument', id, null, req, existing);
  });
  await removeServiceDocumentFile(existing.storage_path);
}
