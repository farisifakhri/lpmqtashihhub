import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import yauzl from 'yauzl';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { executeAntivirusScan } from './clamav.service.js';
import { scanPdfSecurity } from './secure-document.service.js';

export const MAX_GUIDE_DOCUMENT_SIZE = 15 * 1024 * 1024;
export const MAX_GUIDE_IMAGE_SIZE = 5 * 1024 * 1024;
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const IMAGE_PATH_PATTERN = new RegExp(`^/api/v1/information-guides/images/${UUID_PATTERN}$`, 'i');
const STORAGE_PATH_PATTERN = new RegExp(`^(documents|images)/${UUID_PATTERN}\\.(pdf|doc|docx|png|jpg|webp)$`, 'i');

export function getInformationGuideStorageDirectory() {
  return process.env.INFORMATION_GUIDES_STORAGE_DIR
    ? path.resolve(process.env.INFORMATION_GUIDES_STORAGE_DIR)
    : path.resolve('storage/private/information-guides');
}

export function sanitizeGuideHtml(value = '') {
  return sanitizeHtml(value, {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'img', 'span',
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedStyles: {
      '*': {
        color: [/^(#[0-9a-fA-F]{3,8}|rgb(a)?\s*\([^)]*\)|[a-zA-Z]+)$/],
        'text-align': [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: [] },
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === 'img' && !IMAGE_PATH_PATTERN.test(frame.attribs.src || ''),
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: {
          ...attributes,
          ...(attributes.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
    },
  });
}

function validateFileName(file) {
  const fileName = path.basename(file?.originalname || '').replace(/[\r\n"]/g, '_');
  if (!fileName || fileName.length > 255) fail(400, 'Nama berkas tidak valid.');
  return fileName;
}

function detectGuideDocumentType(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const bytes = file.buffer;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail(400, 'Berkas panduan tidak boleh kosong.');
  if (bytes.length > MAX_GUIDE_DOCUMENT_SIZE) fail(413, 'Ukuran berkas panduan melebihi batas maksimum 15 MB.');

  if (extension === '.pdf' && bytes.subarray(0, 5).toString('ascii') === '%PDF-' && bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) {
    return { extension, mimeType: 'application/pdf' };
  }
  if (extension === '.doc' && bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return { extension, mimeType: 'application/msword' };
  }
  if (extension === '.docx' && bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    return { extension, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  fail(400, 'Format berkas tidak sesuai. Unggah file PDF, DOC, atau DOCX yang valid.');
}

async function validateDocxArchive(bytes) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true }, (error, zipFile) => {
      if (error) return reject(Object.assign(new Error('Berkas DOCX rusak atau tidak dapat dibaca.'), { statusCode: 400 }));
      let hasContentTypes = false;
      let entryCount = 0;
      let uncompressedBytes = 0;

      zipFile.on('error', () => reject(Object.assign(new Error('Berkas DOCX rusak atau tidak dapat dibaca.'), { statusCode: 400 })));
      zipFile.on('entry', (entry) => {
        entryCount += 1;
        uncompressedBytes += entry.uncompressedSize;
        if (entry.fileName === '[Content_Types].xml') hasContentTypes = true;
        if (
          entryCount > 10_000 ||
          uncompressedBytes > 150 * 1024 * 1024 ||
          entry.fileName.includes('../') ||
          entry.fileName.includes('..\\') ||
          path.isAbsolute(entry.fileName)
        ) {
          zipFile.close();
          reject(Object.assign(new Error('Struktur arsip DOCX tidak aman atau melebihi batas yang didukung.'), { statusCode: 400 }));
          return;
        }
        zipFile.readEntry();
      });
      zipFile.on('end', () => {
        zipFile.close();
        if (!hasContentTypes) {
          reject(Object.assign(new Error('Berkas DOCX tidak memiliki struktur dokumen Office yang valid.'), { statusCode: 400 }));
          return;
        }
        resolve();
      });
      zipFile.readEntry();
    });
  });
}

async function validateGuideDocument(file) {
  const detected = detectGuideDocumentType(file);
  if (detected.extension === '.docx') await validateDocxArchive(file.buffer);
  if (detected.mimeType === 'application/pdf') {
    await scanPdfSecurity(file.buffer);
  } else {
    const scan = await executeAntivirusScan(file.buffer);
    if (!scan.clean) fail(400, 'Berkas panduan terdeteksi mengandung ancaman malware dan ditolak.');
  }
  return { ...detected, fileName: validateFileName(file) };
}

async function validateGuideImage(file) {
  const extension = path.extname(file?.originalname || '').toLowerCase();
  const bytes = file?.buffer;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail(400, 'Berkas gambar tidak boleh kosong.');
  if (bytes.length > MAX_GUIDE_IMAGE_SIZE) fail(413, 'Ukuran gambar melebihi batas maksimum 5 MB.');

  const imageTypes = [
    { extension: '.png', mimeType: 'image/png', signature: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) },
    { extension: '.jpg', mimeType: 'image/jpeg', signature: Buffer.from([0xff, 0xd8, 0xff]) },
    { extension: '.jpeg', mimeType: 'image/jpeg', signature: Buffer.from([0xff, 0xd8, 0xff]) },
    { extension: '.webp', mimeType: 'image/webp', signature: Buffer.from('RIFF'), suffix: Buffer.from('WEBP') },
  ];
  const detected = imageTypes.find((type) =>
    type.extension === extension &&
    bytes.subarray(0, type.signature.length).equals(type.signature) &&
    (!type.suffix || bytes.subarray(8, 12).equals(type.suffix)) &&
    (type.mimeType !== 'image/jpeg' || bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9])))
  );
  if (!detected) fail(400, 'Format gambar tidak valid. Unggah gambar PNG, JPEG, atau WebP.');
  const scan = await executeAntivirusScan(bytes);
  if (!scan.clean) fail(400, 'Berkas gambar terdeteksi mengandung ancaman malware dan ditolak.');
  return { extension: extension === '.jpeg' ? '.jpg' : extension, mimeType: detected.mimeType, fileName: validateFileName(file) };
}

async function saveGuideFile(file, folder, extension) {
  const storagePath = `${folder}/${randomUUID()}${extension}`;
  const absolutePath = path.join(getInformationGuideStorageDirectory(), storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.buffer, { flag: 'wx', mode: 0o600 });
  return storagePath;
}

async function removeGuideFile(storagePath) {
  if (!storagePath || !STORAGE_PATH_PATTERN.test(storagePath)) {
    console.error('[InformationGuideService] Rejected an unexpected stored file path.');
    fail(500, 'Berkas panduan tidak dapat dihapus dengan aman.');
  }
  const root = getInformationGuideStorageDirectory();
  const target = path.resolve(root, storagePath);
  const rootRealPath = await realpath(root).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!rootRealPath) return;
  const targetStat = await lstat(target).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!targetStat) return;
  if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
    console.error('[InformationGuideService] Refused to remove a non-regular stored file.');
    fail(500, 'Berkas panduan tidak dapat dihapus dengan aman.');
  }
  const targetRealPath = await realpath(target);
  if (!targetRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
    console.error('[InformationGuideService] Refused to remove a file outside the guide storage root.');
    fail(500, 'Berkas panduan tidak dapat dihapus dengan aman.');
  }
  await unlink(targetRealPath);
}

async function resolveGuideFile(storagePath) {
  if (!storagePath || !STORAGE_PATH_PATTERN.test(storagePath)) fail(404, 'Berkas panduan tidak ditemukan.');
  const root = getInformationGuideStorageDirectory();
  const rootRealPath = await realpath(root).catch((error) => {
    if (error.code === 'ENOENT') fail(404, 'Berkas panduan tidak ditemukan.');
    throw error;
  });
  const target = path.resolve(root, storagePath);
  const targetStat = await lstat(target).catch((error) => {
    if (error.code === 'ENOENT') fail(404, 'Berkas panduan tidak ditemukan.');
    throw error;
  });
  if (!targetStat.isFile() || targetStat.isSymbolicLink()) fail(404, 'Berkas panduan tidak ditemukan.');
  const targetRealPath = await realpath(target);
  if (!targetRealPath.startsWith(`${rootRealPath}${path.sep}`)) fail(404, 'Berkas panduan tidak ditemukan.');
  return targetRealPath;
}

function fileUrlForImage(id) {
  return `/api/v1/information-guides/images/${id}`;
}

function imageIdsFromHtml(html) {
  return [...html.matchAll(/\/api\/v1\/information-guides\/images\/([0-9a-f-]{36})/gi)].map((match) => match[1]);
}

function assertGuidePayload(contentType, contentHtml, isPublished, hasFile) {
  if (contentType === 'DOCUMENT' && isPublished && !hasFile) fail(400, 'Unggah berkas PDF, DOC, atau DOCX sebelum memublikasikan panduan.');
  const cleanHtml = sanitizeGuideHtml(contentHtml || '');
  if (contentType === 'EDITOR' && isPublished && !cleanHtml.replace(/<[^>]*>/g, '').trim() && !/<img\b/i.test(cleanHtml)) {
    fail(400, 'Isi panduan wajib dilengkapi sebelum dipublikasikan.');
  }
}

function guideSelect(includeContent = false, includeStoragePath = false) {
  return {
    id: true,
    title: true,
    content_type: true,
    ...(includeContent ? { content_html: true } : {}),
    ...(includeStoragePath ? { storage_path: true } : {}),
    file_name: true,
    file_size: true,
    mime_type: true,
    is_published: true,
    created_by_id: true,
    updated_by_id: true,
    created_at: true,
    updated_at: true,
  };
}

export async function listPublicInformationGuides({ page = 1, limit = 10, search = '' }) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const where = {
    is_published: true,
    ...(search.trim() ? { title: { contains: search.trim() } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.informationGuide.count({ where }),
    prisma.informationGuide.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        content_type: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);
  return { items, pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) || 1 } };
}

export async function listAdminInformationGuides({ page = 1, limit = 10, search = '', is_published }) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const where = {
    ...(is_published === undefined ? {} : { is_published }),
    ...(search.trim() ? { title: { contains: search.trim() } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.informationGuide.count({ where }),
    prisma.informationGuide.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: guideSelect(),
    }),
  ]);
  return { items, pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) || 1 } };
}

export async function getInformationGuide(id, publishedOnly = false) {
  const guide = await prisma.informationGuide.findFirst({
    where: { id, ...(publishedOnly ? { is_published: true } : {}) },
    select: guideSelect(true, true),
  });
  if (!guide) fail(404, 'Panduan tidak ditemukan atau belum dipublikasikan.');
  return guide;
}

export async function createInformationGuide({ data, file, user, req }) {
  const contentType = data.content_type;
  const isPublished = data.is_published ?? false;
  let savedPath = null;
  let fileDetails = null;
  if (file && contentType !== 'DOCUMENT') fail(400, 'Berkas hanya dapat diunggah untuk panduan dengan mode Dokumen.');
  if (contentType === 'DOCUMENT' && file) {
    fileDetails = await validateGuideDocument(file);
    savedPath = await saveGuideFile(file, 'documents', fileDetails.extension);
  }
  try {
    assertGuidePayload(contentType, data.content_html, isPublished, Boolean(savedPath));
    const contentHtml = contentType === 'EDITOR' ? sanitizeGuideHtml(data.content_html || '') : null;
    const guide = await prisma.$transaction(async (tx) => {
      const created = await tx.informationGuide.create({
        data: {
          title: data.title,
          content_type: contentType,
          content_html: contentHtml,
          storage_path: savedPath,
          file_name: fileDetails?.fileName,
          file_size: file?.buffer.length,
          mime_type: fileDetails?.mimeType,
          is_published: isPublished,
          created_by_id: user.id,
          updated_by_id: user.id,
        },
        select: guideSelect(true),
      });
      await audit(tx, user, 'INFORMATION_GUIDE_CREATED', 'InformationGuide', created.id, {
        title: created.title, content_type: created.content_type, is_published: created.is_published,
      }, req);
      return created;
    });
    return guide;
  } catch (error) {
    if (savedPath) await removeGuideFile(savedPath);
    throw error;
  }
}

export async function updateInformationGuide({ id, data, file, user, req }) {
  const previous = await getInformationGuide(id);
  const contentType = data.content_type || previous.content_type;
  const contentHtmlInput = data.content_html ?? previous.content_html ?? '';
  const isPublished = data.is_published ?? previous.is_published;
  let fileDetails = null;
  let savedPath = null;

  if (file) {
    if (contentType !== 'DOCUMENT') fail(400, 'Berkas hanya dapat diunggah untuk panduan dengan mode Dokumen.');
    fileDetails = await validateGuideDocument(file);
    savedPath = await saveGuideFile(file, 'documents', fileDetails.extension);
  }
  try {
    const nextPath = contentType === 'DOCUMENT' ? savedPath || previous.storage_path : null;
    assertGuidePayload(contentType, contentHtmlInput, isPublished, Boolean(nextPath));
    const contentHtml = contentType === 'EDITOR' ? sanitizeGuideHtml(contentHtmlInput) : null;
    const imageIds = contentHtml ? [...new Set(imageIdsFromHtml(contentHtml))] : [];
    const ownedImages = imageIds.length
      ? await prisma.informationGuideImage.findMany({ where: { id: { in: imageIds }, guide_id: id }, select: { id: true } })
      : [];
    if (ownedImages.length !== imageIds.length) {
      fail(400, 'Konten berisi gambar yang tidak terhubung dengan panduan ini. Unggah gambar kembali melalui editor.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.informationGuide.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          content_type: contentType,
          content_html: contentHtml,
          storage_path: nextPath,
          file_name: contentType === 'DOCUMENT' ? fileDetails?.fileName ?? previous.file_name : null,
          file_size: contentType === 'DOCUMENT' ? file?.buffer.length ?? previous.file_size : null,
          mime_type: contentType === 'DOCUMENT' ? fileDetails?.mimeType ?? previous.mime_type : null,
          is_published: isPublished,
          updated_by_id: user.id,
        },
        select: guideSelect(true),
      });
      const unusedImages = await tx.informationGuideImage.findMany({
        where: { guide_id: id, ...(imageIds.length ? { id: { notIn: imageIds } } : {}) },
        select: { id: true, storage_path: true },
      });
      if (unusedImages.length) {
        await tx.informationGuideImage.deleteMany({ where: { id: { in: unusedImages.map((image) => image.id) } } });
      }
      await audit(tx, user, 'INFORMATION_GUIDE_UPDATED', 'InformationGuide', id, {
        title: result.title, content_type: result.content_type, is_published: result.is_published,
      }, req, { title: previous.title, content_type: previous.content_type, is_published: previous.is_published });
      return { result, unusedImages };
    });
    await Promise.all(updated.unusedImages.map((image) => removeGuideFile(image.storage_path)));
    if (previous.storage_path && previous.storage_path !== nextPath) await removeGuideFile(previous.storage_path);
    return updated.result;
  } catch (error) {
    if (savedPath) await removeGuideFile(savedPath);
    throw error;
  }
}

export async function deleteInformationGuide({ id, user, req }) {
  const guide = await prisma.informationGuide.findUnique({
    where: { id },
    include: { images: { select: { storage_path: true } } },
  });
  if (!guide) fail(404, 'Panduan tidak ditemukan.');
  await prisma.$transaction(async (tx) => {
    await tx.informationGuide.delete({ where: { id } });
    await audit(tx, user, 'INFORMATION_GUIDE_DELETED', 'InformationGuide', id, {
      title: guide.title, content_type: guide.content_type, is_published: guide.is_published,
    }, req);
  });
  await Promise.all([
    ...(guide.storage_path ? [removeGuideFile(guide.storage_path)] : []),
    ...guide.images.map((image) => removeGuideFile(image.storage_path)),
  ]);
}

export async function addInformationGuideImage({ id, file, user, req }) {
  const guide = await prisma.informationGuide.findUnique({ where: { id }, select: { id: true, content_type: true } });
  if (!guide) fail(404, 'Panduan tidak ditemukan.');
  if (guide.content_type !== 'EDITOR') fail(400, 'Gambar hanya dapat ditambahkan pada panduan mode Editor.');
  const details = await validateGuideImage(file);
  const storagePath = await saveGuideFile(file, 'images', details.extension);
  try {
    const image = await prisma.$transaction(async (tx) => {
      const created = await tx.informationGuideImage.create({
        data: {
          guide_id: id,
          storage_path: storagePath,
          file_name: details.fileName,
          file_size: file.buffer.length,
          mime_type: details.mimeType,
          created_by_id: user.id,
        },
        select: { id: true, mime_type: true, file_size: true },
      });
      await audit(tx, user, 'INFORMATION_GUIDE_IMAGE_ADDED', 'InformationGuideImage', created.id, {
        guide_id: id, mime_type: created.mime_type, file_size: created.file_size,
      }, req);
      return created;
    });
    return { ...image, url: fileUrlForImage(image.id) };
  } catch (error) {
    await removeGuideFile(storagePath);
    throw error;
  }
}

export async function getInformationGuideFile(id, publishedOnly = false) {
  const guide = await prisma.informationGuide.findFirst({
    where: { id, ...(publishedOnly ? { is_published: true } : {}) },
    select: { storage_path: true, file_name: true, mime_type: true, file_size: true },
  });
  if (!guide?.storage_path) fail(404, 'Berkas panduan tidak ditemukan atau belum dipublikasikan.');
  const bytes = await readFile(await resolveGuideFile(guide.storage_path));
  return { bytes, ...guide, file_size: guide.file_size || bytes.length };
}

export async function getInformationGuideImage(id, publishedOnly = false) {
  const image = await prisma.informationGuideImage.findFirst({
    where: { id, ...(publishedOnly ? { guide: { is_published: true } } : {}) },
    select: { storage_path: true, mime_type: true, file_size: true },
  });
  if (!image) fail(404, 'Gambar panduan tidak ditemukan atau belum dipublikasikan.');
  const bytes = await readFile(await resolveGuideFile(image.storage_path));
  return { bytes, ...image, file_size: image.file_size || bytes.length };
}
