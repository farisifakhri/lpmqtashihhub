import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { executeAntivirusScan } from './clamav.service.js';
import { REGULATION_CATEGORIES } from '../validators/regulation.validator.js';

export const MAX_REGULATION_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * Mendapatkan direktori absolut penyimpanan berkas regulasi
 */
export function getRegulationStorageDirectory() {
  return process.env.REGULATION_STORAGE_DIR
    ? path.resolve(process.env.REGULATION_STORAGE_DIR)
    : path.resolve('storage/regulations');
}

/**
 * Validasi integritas berkas PDF regulasi (magic bytes, batas ukuran, dan malware)
 */
export async function validateRegulationPdf(fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    fail(400, 'Berkas dokumen regulasi tidak boleh kosong.');
  }

  if (fileBuffer.length > MAX_REGULATION_FILE_SIZE) {
    fail(400, 'Ukuran berkas PDF melebihi batas maksimum 15 MB. Silakan kompresi berkas terlebih dahulu.');
  }

  // Wajib diawali %PDF- (5 byte pertama)
  const header = fileBuffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    fail(400, 'Format berkas tidak valid. Berkas wajib berupa dokumen PDF resmi (header %PDF- tidak ditemukan).');
  }

  // Wajib memuat penanda EOF %%EOF pada 1024 byte terakhir
  const tail = fileBuffer.subarray(Math.max(0, fileBuffer.length - 1024)).toString('ascii');
  if (!tail.includes('%%EOF')) {
    fail(400, 'Struktur berkas PDF rusak atau tidak lengkap (penanda %%EOF tidak ditemukan).');
  }

  // Pemindaian malware ClamAV
  const scanResult = await executeAntivirusScan(fileBuffer);
  if (!scanResult.clean) {
    fail(400, `Berkas regulasi terdeteksi mengandung ancaman malware (${scanResult.virus || 'terdeteksi'}). Unggahan ditolak.`);
  }

  return true;
}

/**
 * Menyimpan buffer dokumen regulasi ke media penyimpanan lokal aman
 */
async function saveRegulationFile(fileBuffer, originalName) {
  const dir = getRegulationStorageDirectory();
  await mkdir(dir, { recursive: true });

  const safeFileName = `${randomUUID()}.pdf`;
  const fullPath = path.join(dir, safeFileName);

  await writeFile(fullPath, fileBuffer, { flag: 'wx' });
  return {
    storage_path: safeFileName,
    file_size: fileBuffer.length,
    mime_type: 'application/pdf',
    file_name: path.basename(originalName || 'dokumen-regulasi.pdf'),
  };
}

/**
 * Menghapus fisik berkas dari media penyimpanan
 */
async function removeRegulationFile(storagePath) {
  if (!storagePath) return;
  try {
    const dir = getRegulationStorageDirectory();
    const safePath = path.join(dir, path.basename(storagePath));
    await unlink(safePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[RegulationService] Gagal menghapus berkas fisik ${storagePath}:`, err.message);
    }
  }
}

/**
 * 1. Daftar Regulasi Publik
 */
export async function listPublicRegulations({ page = 1, limit = 10, category, search }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * take;

  const where = {
    is_published: true,
  };

  if (category && category !== 'Semua Kategori' && category !== 'ALL') {
    where.category = category;
  }

  if (search && search.trim()) {
    const cleanSearch = search.trim();
    where.OR = [
      { title: { contains: cleanSearch } },
      { document_number: { contains: cleanSearch } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.regulationDocument.count({ where }),
    prisma.regulationDocument.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        document_number: true,
        file_name: true,
        file_size: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
}

/**
 * 2. Daftar Regulasi Internal Admin
 */
export async function listAdminRegulations({ page = 1, limit = 10, category, search, is_published }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * take;

  const where = {};

  if (is_published !== undefined && is_published !== null && is_published !== '') {
    where.is_published = is_published === true || is_published === 'true' || is_published === 1;
  }

  if (category && category !== 'Semua Kategori' && category !== 'ALL') {
    where.category = category;
  }

  if (search && search.trim()) {
    const cleanSearch = search.trim();
    where.OR = [
      { title: { contains: cleanSearch } },
      { document_number: { contains: cleanSearch } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.regulationDocument.count({ where }),
    prisma.regulationDocument.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        created_by: {
          select: { id: true, name: true, email: true },
        },
        updated_by: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
}

/**
 * 3. Ringkasan Statistik Regulasi
 */
export async function getRegulationSummary() {
  const [totalAll, totalPublished, totalUnpublished, categoryCounts] = await Promise.all([
    prisma.regulationDocument.count(),
    prisma.regulationDocument.count({ where: { is_published: true } }),
    prisma.regulationDocument.count({ where: { is_published: false } }),
    prisma.regulationDocument.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    }),
  ]);

  const categories = REGULATION_CATEGORIES.map((cat) => {
    const found = categoryCounts.find((c) => c.category === cat);
    return {
      category: cat,
      count: found ? found._count.id : 0,
    };
  });

  return {
    totalAll,
    totalPublished,
    totalUnpublished,
    categories,
  };
}

/**
 * 4. Detail Dokumen Regulasi Berdasarkan ID
 */
export async function getRegulationById(id, requirePublished = false) {
  const doc = await prisma.regulationDocument.findUnique({
    where: { id },
    include: {
      created_by: { select: { id: true, name: true } },
    },
  });

  if (!doc) {
    fail(404, 'Dokumen regulasi tidak ditemukan.');
  }

  if (requirePublished && !doc.is_published) {
    fail(404, 'Dokumen regulasi tidak tersedia atau belum dipublikasikan.');
  }

  return doc;
}

/**
 * 5. Membaca berkas fisik regulasi untuk Pratinjau (Lihat) atau Unduh
 */
export async function getRegulationFileContent(id, currentUser = null) {
  const doc = await prisma.regulationDocument.findUnique({ where: { id } });
  if (!doc) {
    fail(404, 'Dokumen regulasi tidak ditemukan.');
  }

  if (!doc.is_published) {
    const isAuthorized =
      currentUser &&
      (currentUser.roles.includes('SUPERADMIN') || currentUser.roles.includes('ADMIN_INTERNAL'));
    if (!isAuthorized) {
      fail(404, 'Dokumen regulasi belum dipublikasikan.');
    }
  }

  const dir = getRegulationStorageDirectory();
  const safePath = path.join(dir, path.basename(doc.storage_path));

  let bytes;
  try {
    bytes = await readFile(safePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      fail(404, 'Berkas fisik dokumen regulasi tidak ditemukan pada penyimpanan server.');
    }
    throw err;
  }

  // Format nama file unduhan yang ramah dan aman
  const safeDownloadName = doc.file_name.endsWith('.pdf') ? doc.file_name : `${doc.file_name}.pdf`;

  return {
    bytes,
    fileName: safeDownloadName,
    mimeType: doc.mime_type || 'application/pdf',
    fileSize: doc.file_size,
    document: doc,
  };
}

/**
 * 6. Tambah Dokumen Regulasi Baru (Admin)
 */
export async function createRegulation({ file, data, user, req }) {
  if (!file || !file.buffer) {
    fail(400, 'Berkas dokumen PDF wajib diunggah.');
  }

  await validateRegulationPdf(file.buffer);

  const fileInfo = await saveRegulationFile(file.buffer, file.originalname);

  try {
    const newDoc = await prisma.$transaction(async (tx) => {
      const created = await tx.regulationDocument.create({
        data: {
          title: data.title.trim(),
          category: data.category,
          document_number: data.document_number.trim(),
          file_name: fileInfo.file_name,
          storage_path: fileInfo.storage_path,
          file_size: fileInfo.file_size,
          mime_type: fileInfo.mime_type,
          is_published: data.is_published !== undefined ? Boolean(data.is_published) : true,
          created_by_id: user?.id || null,
        },
      });

      await audit(tx, user, 'CREATE_REGULATION', 'RegulationDocument', created.id, created, req);
      return created;
    });

    return newDoc;
  } catch (dbErr) {
    await removeRegulationFile(fileInfo.storage_path);
    throw dbErr;
  }
}

/**
 * 7. Perbarui Dokumen Regulasi (Admin)
 */
export async function updateRegulation(id, { file, data, user, req }) {
  const existing = await prisma.regulationDocument.findUnique({ where: { id } });
  if (!existing) {
    fail(404, 'Dokumen regulasi tidak ditemukan.');
  }

  let newFileInfo = null;
  if (file && file.buffer) {
    await validateRegulationPdf(file.buffer);
    newFileInfo = await saveRegulationFile(file.buffer, file.originalname);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatePayload = {
        updated_by_id: user?.id || null,
      };

      if (data.title !== undefined) updatePayload.title = data.title.trim();
      if (data.category !== undefined) updatePayload.category = data.category;
      if (data.document_number !== undefined) updatePayload.document_number = data.document_number.trim();
      if (data.is_published !== undefined) updatePayload.is_published = Boolean(data.is_published);

      if (newFileInfo) {
        updatePayload.file_name = newFileInfo.file_name;
        updatePayload.storage_path = newFileInfo.storage_path;
        updatePayload.file_size = newFileInfo.file_size;
        updatePayload.mime_type = newFileInfo.mime_type;
      }

      const result = await tx.regulationDocument.update({
        where: { id },
        data: updatePayload,
      });

      await audit(tx, user, 'UPDATE_REGULATION', 'RegulationDocument', id, result, req, existing);
      return result;
    });

    // Jika penggantian file berhasil di DB, hapus file lama
    if (newFileInfo && existing.storage_path) {
      await removeRegulationFile(existing.storage_path);
    }

    return updated;
  } catch (err) {
    if (newFileInfo) {
      await removeRegulationFile(newFileInfo.storage_path);
    }
    throw err;
  }
}

/**
 * 8. Hapus Dokumen Regulasi (Admin)
 */
export async function deleteRegulation(id, { user, req }) {
  const existing = await prisma.regulationDocument.findUnique({ where: { id } });
  if (!existing) {
    fail(404, 'Dokumen regulasi tidak ditemukan.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.regulationDocument.delete({ where: { id } });
    await audit(tx, user, 'DELETE_REGULATION', 'RegulationDocument', id, null, req, existing);
  });

  // Hapus berkas fisik setelah transaksi DB berhasil tuntas
  if (existing.storage_path) {
    await removeRegulationFile(existing.storage_path);
  }

  return { success: true, message: 'Dokumen regulasi berhasil dihapus.' };
}

