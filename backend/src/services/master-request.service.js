// Permohonan Master Mushaf Al-Qur'an LPMQ — khusus penerbit terdaftar.
// Alur:
//   1. Penerbit (login) mengajukan permohonan            -> DIAJUKAN
//   2. Admin menyusun surat persetujuan & mengajukan TTE -> MENUNGGU_TTE   (atau menolak -> DITOLAK)
//   3. Kepala LPMQ menandatangani di Pusat Tanda Tangan  -> DITANDATANGANI
//   4. Admin mengirim surat bertanda tangan ke penerbit   -> DIKIRIM
//   5. Penerbit melihat/mengunduh surat dari portalnya
import crypto from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { emailProvider } from './email-provider.service.js';
import { resolveRegion } from './region.service.js';
import { getNextDocumentNumber } from './document-number.service.js';
import { renderMasterLetterPdf } from './master-letter-pdf.service.js';
import {
  saveSecurePublisherDocument,
  readSecurePublisherDocument,
} from './secure-document.service.js';
import { requireParaf, recordParaf, clearParaf } from './paraf.service.js';
import {
  createMasterRequestSchema,
  MASTER_MUSHAF_TYPES,
  MASTER_REQUEST_MAX_FILE_BYTES,
  MASTER_REQUEST_STATUSES,
} from '../validators/master-request.validator.js';

export const MASTER_LETTER_DOCUMENT_TYPE = 'SURAT_PERSETUJUAN_MASTER';

export const MASTER_REQUEST_DOCUMENTS = [
  { field: 'surat_permohonan', type: 'SURAT_PERMOHONAN', label: "Surat Permohonan Master Mushaf Al-Qur'an" },
  { field: 'profil_pemohon', type: 'PROFIL_PEMOHON', label: "Profil Pemohon Master Mushaf Al-Qur'an" },
];

export const STATUS_LABELS = {
  DIAJUKAN: 'Diajukan',
  MENUNGGU_TTE: 'Menunggu TTE Kepala',
  DITANDATANGANI: 'Sudah Ditandatangani',
  DIKIRIM: 'Surat Dikirim',
  DITOLAK: 'Ditolak',
};

export function getMasterRequestDocsDirectory() {
  return process.env.MASTER_REQUEST_DOCS_DIR
    ? path.resolve(process.env.MASTER_REQUEST_DOCS_DIR)
    : path.resolve('storage/private/master-requests');
}

const firstFile = (raw) => (Array.isArray(raw) ? raw[0] : raw) || null;

export function validateMasterRequestFiles(files = {}) {
  const missing = MASTER_REQUEST_DOCUMENTS.filter((doc) => !firstFile(files[doc.field])?.buffer);
  if (missing.length > 0) {
    const err = new Error(`Dokumen berikut belum diunggah: ${missing.map((doc) => doc.label).join(', ')}.`);
    err.statusCode = 400;
    err.code = 'DOCUMENT_REQUIRED';
    err.errors = missing.map((doc) => ({ field: doc.field, message: `${doc.label} wajib diunggah.` }));
    throw err;
  }
}

/** Kode permohonan yang mudah dibaca, mis. PMQ-20261109-7K3QX9 */
export function generateRequestCode(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `PMQ-${ymd}-${suffix}`;
}

/** Hash isi surat yang ditandatangani; perubahan data surat setelah TTE akan menghasilkan hash berbeda. */
export function computeLetterHash(request, signerId, signedAt) {
  const canonical = JSON.stringify({
    request_code: request.request_code,
    letter_number: request.letter_number,
    letter_subject: request.letter_subject,
    letter_body: request.letter_body,
    publisher_id: request.publisher_id,
    applicant_name: request.applicant_name,
    mushaf_type: request.mushaf_type,
    signer_id: signerId,
    signed_at: new Date(signedAt).toISOString(),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/** Pastikan pengguna adalah penerbit yang akunnya sudah diverifikasi LPMQ. */
export function requireVerifiedPublisher(user) {
  if (!user?.publisherId) fail(403, 'Permohonan master hanya dapat diajukan oleh akun penerbit terdaftar.');
  if (user.publisher?.verification_status && user.publisher.verification_status !== 'VERIFIED') {
    fail(403, 'Akun penerbit Anda belum diverifikasi LPMQ sehingga belum dapat mengajukan permohonan master.');
  }
  return user.publisherId;
}

async function notifyPublisher(request, event) {
  const publisherName = request.publisher?.legal_name || request.institution;
  let subject;
  let message;
  if (event === 'SUBMITTED') {
    subject = `[LPMQ] Permohonan Master Mushaf Diterima - ${request.request_code}`;
    message = `Permohonan master mushaf Al-Qur'an (${request.mushaf_type_label}) dari ${publisherName} telah kami terima dengan kode ${request.request_code}. Pantau prosesnya melalui menu Permohonan Master di portal penerbit.`;
  } else if (event === 'DIKIRIM') {
    subject = `[LPMQ] Surat Persetujuan Master Mushaf - ${request.request_code}`;
    message = `Surat persetujuan master mushaf Al-Qur'an (${request.mushaf_type_label}) nomor ${request.letter_number} telah ditandatangani Kepala LPMQ. Silakan masuk ke portal penerbit, menu Permohonan Master, untuk melihat dan mengunduh surat.`;
  } else if (event === 'DITOLAK') {
    subject = `[LPMQ] Permohonan Master Mushaf Tidak Dapat Disetujui - ${request.request_code}`;
    message = `Mohon maaf, permohonan master mushaf Al-Qur'an (${request.mushaf_type_label}) tidak dapat disetujui. Alasan: ${request.admin_note}.`;
  } else {
    return;
  }

  try {
    if (request.submitted_by_id) {
      await prisma.notification.create({
        data: {
          user_id: request.submitted_by_id,
          type: `MASTER_REQUEST_${event}`,
          title: subject.replace(/^\[LPMQ\]\s*/, ''),
          payload: { master_request_id: request.id, request_code: request.request_code, message },
        },
      });
    }
  } catch (err) {
    console.error('Peringatan: Gagal membuat notifikasi permohonan master:', err.message);
  }
  try {
    await emailProvider.sendEmail({
      to: request.email,
      toName: request.applicant_name,
      subject,
      template: `MASTER_REQUEST_${event}`,
      payload: { kode_permohonan: request.request_code, jenis_mushaf: request.mushaf_type_label, message },
    });
  } catch (err) {
    console.error(`Peringatan: Gagal mengirim email permohonan master ${event} ke ${request.email}:`, err.message);
  }
}

const withPublisher = { publisher: { select: { id: true, legal_name: true } } };

// ---------------------------------------------------------------------------
// Data referensi (publik, tanpa data pribadi)
// ---------------------------------------------------------------------------

export function listMushafTypes() {
  return MASTER_MUSHAF_TYPES;
}

// ---------------------------------------------------------------------------
// Penerbit
// ---------------------------------------------------------------------------

export async function createMasterRequest(body, files = {}, user) {
  const publisherId = requireVerifiedPublisher(user);
  const data = createMasterRequestSchema.body.parse(body);
  validateMasterRequestFiles(files);
  const region = resolveRegion(data.provinsi_kode, data.kabupaten_kode, data.kecamatan_kode);
  const mushaf = MASTER_MUSHAF_TYPES.find((type) => type.kode === data.jenis_mushaf);

  // Validasi & simpan berkas lebih dulu (magic bytes PDF, maks. 500 KB, pemindaian konten aktif)
  const saved = [];
  try {
    for (const doc of MASTER_REQUEST_DOCUMENTS) {
      const file = firstFile(files[doc.field]);
      try {
        const stored = await saveSecurePublisherDocument(file.buffer, file.originalname, doc.type, {
          maxBytes: MASTER_REQUEST_MAX_FILE_BYTES,
          directory: getMasterRequestDocsDirectory(),
        });
        saved.push({ ...stored, document_type: doc.type });
      } catch (error) {
        error.message = `${doc.label}: ${error.message}`;
        throw error;
      }
    }

    let created = null;
    for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
      try {
        created = await prisma.masterMushafRequest.create({
          data: {
            request_code: generateRequestCode(),
            publisher_id: publisherId,
            submitted_by_id: user.id,
            applicant_name: data.nama_pemohon,
            address: data.alamat,
            province_code: region.province.kode,
            province_name: region.province.nama,
            regency_code: region.regency.kode,
            regency_name: region.regency.nama,
            district_code: region.district.kode,
            district_name: region.district.nama,
            postal_code: data.kode_pos,
            phone: data.telepon,
            email: data.email,
            institution: data.lembaga,
            mushaf_type: mushaf.kode,
            mushaf_type_label: mushaf.label,
            intended_use: data.penggunaan,
            statement_agreed_at: new Date(),
            documents: {
              create: saved.map((doc) => ({
                document_type: doc.document_type,
                storage_path: doc.storage_path,
                original_filename: doc.original_filename,
                file_size: doc.file_size,
                file_hash: doc.file_hash,
                mime_type: doc.mime_type,
              })),
            },
          },
          include: withPublisher,
        });
      } catch (error) {
        // Tabrakan kode permohonan (sangat jarang): coba kode baru
        if (error?.code === 'P2002' && attempt < 2) continue;
        throw error;
      }
    }

    await notifyPublisher(created, 'SUBMITTED');
    return {
      id: created.id,
      kode_permohonan: created.request_code,
      status: created.status,
      jenis_mushaf: created.mushaf_type_label,
      created_at: created.created_at,
    };
  } catch (error) {
    // Jangan tinggalkan berkas yatim bila permohonan gagal disimpan
    await Promise.all(saved.map((doc) => unlink(doc.absolute_path).catch(() => {})));
    throw error;
  }
}

const publisherSelect = {
  id: true,
  request_code: true,
  applicant_name: true,
  institution: true,
  mushaf_type_label: true,
  intended_use: true,
  regency_name: true,
  province_name: true,
  status: true,
  admin_note: true,
  letter_number: true,
  signed_at: true,
  sent_at: true,
  created_at: true,
  updated_at: true,
};

export async function listPublisherMasterRequests(user) {
  const publisherId = requireVerifiedPublisher(user);
  return prisma.masterMushafRequest.findMany({
    where: { publisher_id: publisherId },
    select: publisherSelect,
    orderBy: { created_at: 'desc' },
    take: 100,
  });
}

async function findOwnRequest(id, user) {
  const publisherId = requireVerifiedPublisher(user);
  const request = await prisma.masterMushafRequest.findFirst({
    where: { id, publisher_id: publisherId },
    include: { ...withPublisher, signed_by: { select: { id: true, name: true, nip: true } } },
  });
  // 404 (bukan 403) agar keberadaan permohonan penerbit lain tidak terungkap
  if (!request) fail(404, 'Permohonan master tidak ditemukan.');
  return request;
}

export async function getPublisherMasterRequest(id, user) {
  const request = await findOwnRequest(id, user);
  return Object.fromEntries(Object.keys(publisherSelect).map((key) => [key, request[key]]));
}

/** Surat persetujuan hanya dapat dibuka penerbit setelah dikirim admin. */
export async function getPublisherLetterPdf(id, user) {
  const request = await findOwnRequest(id, user);
  if (request.status !== 'DIKIRIM') fail(409, 'Surat persetujuan belum dikirim oleh LPMQ.');
  return { content: await renderMasterLetterPdf(request, { draft: false }), filename: letterFilename(request) };
}

const letterFilename = (request) =>
  `Surat-Persetujuan-Master-${(request.letter_number || request.request_code).replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;

// ---------------------------------------------------------------------------
// Admin (ADMIN_INTERNAL, SUPERADMIN)
// ---------------------------------------------------------------------------

const summarySelect = {
  id: true,
  request_code: true,
  applicant_name: true,
  institution: true,
  email: true,
  phone: true,
  province_name: true,
  regency_name: true,
  mushaf_type_label: true,
  status: true,
  letter_number: true,
  created_at: true,
  processed_at: true,
  publisher: { select: { id: true, legal_name: true } },
};

export async function listAdminMasterRequests({ page = 1, limit = 10, status, search } = {}) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { request_code: { contains: search } },
      { applicant_name: { contains: search } },
      { institution: { contains: search } },
      { email: { contains: search } },
      { letter_number: { contains: search } },
    ];
  }
  const [total, rows, grouped] = await Promise.all([
    prisma.masterMushafRequest.count({ where }),
    prisma.masterMushafRequest.findMany({
      where,
      select: summarySelect,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.masterMushafRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(MASTER_REQUEST_STATUSES.map((key) => [key, 0]));
  for (const row of grouped) counts[row.status] = row._count._all;
  return {
    data: rows,
    counts,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Aksi yang tersedia bagi admin pada tiap status. */
export function adminActionsFor(status) {
  return {
    DIAJUKAN: ['AJUKAN_TTE', 'TOLAK'],
    MENUNGGU_TTE: ['PERBARUI_SURAT'],
    DITANDATANGANI: ['KIRIM_KE_PENERBIT'],
    DIKIRIM: [],
    DITOLAK: [],
  }[status] || [];
}

const userBrief = { select: { id: true, name: true } };

export async function getAdminMasterRequestDetail(id) {
  const request = await prisma.masterMushafRequest.findUnique({
    where: { id },
    include: {
      documents: {
        select: { id: true, document_type: true, original_filename: true, file_size: true, created_at: true },
        orderBy: { created_at: 'asc' },
      },
      publisher: { select: { id: true, legal_name: true, nomor_induk_penerbit: true } },
      submitted_by: userBrief,
      processed_by: userBrief,
      letter_drafted_by: userBrief,
      signed_by: userBrief,
      sent_by: userBrief,
    },
  });
  if (!request) fail(404, 'Permohonan master mushaf tidak ditemukan.');
  return { ...request, allowed_actions: adminActionsFor(request.status) };
}

export async function getAdminMasterRequestDocument(id, documentId, user, req) {
  const doc = await prisma.masterMushafRequestDocument.findFirst({
    where: { id: documentId, request_id: id },
  });
  if (!doc) fail(404, 'Dokumen permohonan tidak ditemukan.');
  const content = await readSecurePublisherDocument(doc.storage_path);
  await audit(prisma, user, 'MASTER_REQUEST_DOCUMENT_DOWNLOADED', 'MasterMushafRequest', id, {
    document_id: doc.id,
    document_type: doc.document_type,
  }, req);
  return { content, filename: doc.original_filename, mime_type: doc.mime_type };
}

/**
 * Ubah status secara atomik: hanya berhasil bila status saat ini masih `from`
 * (mencegah dua petugas memproses permohonan yang sama bersamaan).
 */
async function transition(tx, id, from, data) {
  const result = await tx.masterMushafRequest.updateMany({ where: { id, status: { in: [].concat(from) } }, data });
  if (result.count !== 1) {
    fail(409, 'Status permohonan sudah berubah. Muat ulang data sebelum mencoba lagi.');
  }
}

async function loadForAction(id) {
  const request = await prisma.masterMushafRequest.findUnique({ where: { id }, include: withPublisher });
  if (!request) fail(404, 'Permohonan master mushaf tidak ditemukan.');
  return request;
}

export async function rejectMasterRequest(id, { alasan }, user, req) {
  const current = await loadForAction(id);
  if (current.status !== 'DIAJUKAN') {
    fail(409, `Permohonan berstatus ${STATUS_LABELS[current.status]} tidak dapat ditolak.`);
  }
  const updated = await prisma.$transaction(async (tx) => {
    await transition(tx, id, 'DIAJUKAN', {
      status: 'DITOLAK',
      admin_note: alasan,
      processed_at: new Date(),
      processed_by_id: user.id,
    });
    await audit(tx, user, 'MASTER_REQUEST_REJECTED', 'MasterMushafRequest', id, { alasan }, req, { status: current.status });
    return tx.masterMushafRequest.findUnique({ where: { id }, include: withPublisher });
  });
  await notifyPublisher(updated, 'DITOLAK');
  return getAdminMasterRequestDetail(id);
}

/**
 * Admin menyusun surat persetujuan dan mengajukannya ke Kepala LPMQ (Pusat Tanda Tangan).
 * Boleh dipanggil ulang selama surat belum ditandatangani untuk memperbaiki isi; nomor surat tetap.
 */
export async function submitLetterForSignature(id, { perihal, isi }, user, req) {
  const current = await loadForAction(id);
  if (!['DIAJUKAN', 'MENUNGGU_TTE'].includes(current.status)) {
    fail(409, `Surat tidak dapat disusun untuk permohonan berstatus ${STATUS_LABELS[current.status]}.`);
  }
  if (!current.publisher_id) {
    fail(409, 'Permohonan dari formulir publik lama tidak terhubung ke akun penerbit sehingga surat tidak dapat dikirim. Tolak permohonan ini dan minta pemohon mengajukan ulang melalui portal penerbit.');
  }
  await prisma.$transaction(async (tx) => {
    const letterNumber = current.letter_number || await getNextDocumentNumber(tx, MASTER_LETTER_DOCUMENT_TYPE);
    await transition(tx, id, current.status, {
      status: 'MENUNGGU_TTE',
      letter_number: letterNumber,
      letter_subject: perihal,
      letter_body: isi,
      letter_drafted_at: new Date(),
      letter_drafted_by_id: user.id,
      processed_at: new Date(),
      processed_by_id: user.id,
    });
    await clearParaf(tx, 'MASTER_LETTER', id);
    await audit(tx, user, current.status === 'DIAJUKAN' ? 'MASTER_LETTER_SUBMITTED_FOR_TTE' : 'MASTER_LETTER_REVISED',
      'MasterMushafRequest', id, { letter_number: letterNumber, perihal }, req, { status: current.status });
  });
  return getAdminMasterRequestDetail(id);
}

export async function sendLetterToPublisher(id, user, req) {
  const current = await loadForAction(id);
  if (current.status !== 'DITANDATANGANI') {
    fail(409, 'Surat hanya dapat dikirim setelah ditandatangani Kepala LPMQ.');
  }
  const updated = await prisma.$transaction(async (tx) => {
    await transition(tx, id, 'DITANDATANGANI', {
      status: 'DIKIRIM',
      sent_at: new Date(),
      sent_by_id: user.id,
      processed_at: new Date(),
      processed_by_id: user.id,
    });
    await audit(tx, user, 'MASTER_LETTER_SENT_TO_PUBLISHER', 'MasterMushafRequest', id,
      { letter_number: current.letter_number, publisher_id: current.publisher_id }, req, { status: current.status });
    return tx.masterMushafRequest.findUnique({ where: { id }, include: withPublisher });
  });
  await notifyPublisher(updated, 'DIKIRIM');
  return getAdminMasterRequestDetail(id);
}

/** Pratinjau surat untuk admin & Kepala (DRAF bila belum ditandatangani). */
export async function getInternalLetterPdf(id) {
  const request = await prisma.masterMushafRequest.findUnique({
    where: { id },
    include: { ...withPublisher, signed_by: { select: { id: true, name: true, nip: true } } },
  });
  if (!request) fail(404, 'Permohonan master mushaf tidak ditemukan.');
  if (!request.letter_number) fail(409, 'Surat persetujuan belum disusun.');
  return { content: await renderMasterLetterPdf(request), filename: letterFilename(request) };
}

// ---------------------------------------------------------------------------
// Kepala LPMQ — Pusat Tanda Tangan (TTE)
// ---------------------------------------------------------------------------

export async function listLettersForSignature() {
  const letters = await prisma.masterMushafRequest.findMany({
    where: { status: { in: ['MENUNGGU_TTE', 'DITANDATANGANI', 'DIKIRIM'] } },
    select: {
      id: true,
      request_code: true,
      applicant_name: true,
      institution: true,
      mushaf_type_label: true,
      status: true,
      letter_number: true,
      letter_subject: true,
      letter_drafted_at: true,
      signed_at: true,
      created_at: true,
      publisher: { select: { id: true, legal_name: true } },
      letter_drafted_by: userBrief,
      signed_by: userBrief,
    },
    orderBy: [{ letter_drafted_at: 'desc' }],
    take: 100,
  });
  const parafs = await prisma.approvalParaf.findMany({
    where: { subject_type: 'MASTER_LETTER', subject_id: { in: letters.map(l => l.id) }, signed_at: { not: null } },
    select: { subject_id: true, signed_at: true },
  });
  const parafAt = new Map(parafs.map(p => [p.subject_id, p.signed_at]));
  return letters.map(l => ({ ...l, paraf_signed_at: parafAt.get(l.id) || null }));
}

export async function signMasterLetter(id, user, req) {
  const current = await prisma.masterMushafRequest.findUnique({ where: { id } });
  if (!current) fail(404, 'Surat persetujuan master tidak ditemukan.');
  if (current.status !== 'MENUNGGU_TTE') fail(409, 'Surat ini tidak sedang menunggu tanda tangan Kepala LPMQ.');
  // Pemisahan peran: penyusun surat tidak boleh menandatangani suratnya sendiri
  if (current.letter_drafted_by_id === user.id) {
    fail(403, 'Penyusun surat tidak dapat menandatangani surat yang disusunnya sendiri.');
  }
  // Pemaraf membubuhkan paraf lebih dulu; TTE tetap oleh Kepala LPMQ.
  if (user.isPemaraf) {
    await prisma.$transaction(tx => recordParaf(tx, 'MASTER_LETTER', id, user, req));
    return { id, status: current.status, letter_number: current.letter_number, paraf_only: true };
  }
  await requireParaf(prisma, 'MASTER_LETTER', id);
  const signedAt = new Date();
  const signatureHash = computeLetterHash(current, user.id, signedAt);
  await prisma.$transaction(async (tx) => {
    await transition(tx, id, 'MENUNGGU_TTE', {
      status: 'DITANDATANGANI',
      signed_at: signedAt,
      signed_by_id: user.id,
      signature_hash: signatureHash,
    });
    await audit(tx, user, 'MASTER_LETTER_SIGNED', 'MasterMushafRequest', id,
      { letter_number: current.letter_number, signature_hash: signatureHash }, req, { status: current.status });
  });
  return { id, status: 'DITANDATANGANI', letter_number: current.letter_number, signed_at: signedAt };
}
