// Sistem Pengaduan LPMQ Tashih Hub (publik, tanpa login).
//   1. Pengadu mengirim formulir (kesalahan cetak mushaf / pelayanan STT) + CAPTCHA -> MENUNGGU_VERIFIKASI
//   2. Admin (Helper Admin/ADMIN_INTERNAL, SUPERADMIN) menerima -> DITERIMA, atau menolak dengan alasan -> DITOLAK
//   3. Penanganan: DITERIMA -> DALAM_PROSES <-> MENUNGGU_TINDAK_LANJUT
//   4. Laporan akhir (hasil, keterangan, tanggal selesai) -> SELESAI
//   5. Pengadu memantau perkembangan melalui kode pengaduan (tanpa data pribadi).
// Setiap perubahan status dicatat pada complaint_status_histories dan audit log.
import crypto from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { emailProvider } from './email-provider.service.js';
import { resolveRegion } from './region.service.js';
import { verifyCaptcha } from './captcha.service.js';
import { executeAntivirusScan } from './clamav.service.js';
import { scanPdfSecurity, readSecurePublisherDocument } from './secure-document.service.js';
import {
  COMPLAINT_MAX_ERROR_ITEMS,
  COMPLAINT_MAX_FILE_BYTES,
  COMPLAINT_SERVICE_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
  PRINT_ERROR_TYPES,
  createPrintErrorComplaintSchema,
  createServiceComplaintSchema,
} from '../validators/complaint.validator.js';

export const COMPLAINT_FILE_FIELDS = {
  gambar_surat_tashih: { type: 'SURAT_TANDA_TASHIH', label: 'Gambar Surat Tanda Tashih' },
  gambar_cover: { type: 'COVER_MUSHAF', label: 'Gambar Cover Mushaf' },
  gambar_kesalahan: { type: 'HALAMAN_SALAH', label: 'Gambar Halaman Salah' },
};

const CODE_PREFIX = { KESALAHAN_CETAK: 'ADU-KC', PELAYANAN: 'ADU-PL' };
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function getComplaintFilesDirectory() {
  return process.env.COMPLAINT_FILES_DIR
    ? path.resolve(process.env.COMPLAINT_FILES_DIR)
    : path.resolve('storage/private/complaints');
}

/** Kode pengaduan acak (40 bit) agar tidak dapat ditebak, mis. ADU-KC-20261111-7K3QX9AB */
export function generateComplaintCode(type, date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${CODE_PREFIX[type]}-${ymd}-${suffix}`;
}

/** Samarkan nama untuk halaman pelacakan publik: "Ahmad Fauzi" -> "Ah*** Fa***" */
export function maskName(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean)
    .map((word) => `${word.slice(0, Math.min(2, word.length - 1) || 1)}***`)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Berkas lampiran (JPG/JPEG/PNG/PDF, maks. 2 MB, diperiksa berdasarkan isi berkas)
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] };

export function detectComplaintFileType(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 8) return null;
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

const fileError = (label, message, field) => Object.assign(new Error(`${label}: ${message}`), {
  statusCode: 400,
  code: 'INVALID_FILE',
  errors: field ? [{ field, message }] : undefined,
});

/** Validasi satu berkas pengaduan dari isi (magic bytes), ekstensi, ukuran, konten aktif PDF, dan antivirus. */
export async function inspectComplaintFile(file, label, field) {
  const bytes = file?.buffer;
  if (!bytes || bytes.length === 0) throw fileError(label, 'berkas wajib diunggah.', field);
  if (bytes.length > COMPLAINT_MAX_FILE_BYTES) throw fileError(label, 'ukuran berkas melebihi 2 MB.', field);
  const mimeType = detectComplaintFileType(bytes);
  if (!mimeType) throw fileError(label, 'format berkas harus JPG, JPEG, PNG, atau PDF.', field);
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS[mimeType].includes(ext)) {
    throw fileError(label, 'ekstensi berkas tidak sesuai dengan isinya (gunakan JPG, JPEG, PNG, atau PDF).', field);
  }

  let fileHash;
  if (mimeType === 'application/pdf') {
    // Menolak PDF berisi JavaScript, aksi otomatis, berkas tertanam, dsb. (sudah termasuk antivirus)
    const scan = await scanPdfSecurity(bytes);
    fileHash = scan.file_hash;
  } else {
    fileHash = crypto.createHash('sha256').update(bytes).digest('hex');
    try {
      const av = await executeAntivirusScan(bytes);
      if (!av.clean) throw fileError(label, 'berkas terdeteksi mengandung ancaman oleh pemindai antivirus.', field);
    } catch (error) {
      if (error.code === 'INVALID_FILE') throw error;
      if (error.statusCode !== 503) throw error;
      console.warn(`[ClamAV Warning]: ${error.message}. Unggahan pengaduan diteruskan demi ketersediaan layanan.`);
    }
  }
  return { bytes, mimeType, fileHash, ext };
}

async function storeComplaintFile(inspected, originalName) {
  const dir = getComplaintFilesDirectory();
  await mkdir(dir, { recursive: true });
  const id = crypto.randomUUID();
  const ext = inspected.mimeType === 'application/pdf' ? '.pdf' : inspected.mimeType === 'image/png' ? '.png' : '.jpg';
  const absolutePath = path.join(dir, `${id}${ext}`);
  await writeFile(absolutePath, inspected.bytes, { flag: 'wx' });
  return {
    absolute_path: absolutePath,
    storage_path: path.relative(process.cwd(), absolutePath).replace(/\\/g, '/'),
    original_filename: path.basename(originalName || `lampiran${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200),
    file_size: inspected.bytes.length,
    file_hash: inspected.fileHash,
    mime_type: inspected.mimeType,
  };
}

const filesOf = (files, field) => {
  const raw = files?.[field];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
};

// ---------------------------------------------------------------------------
// Notifikasi email (best-effort; kegagalan email tidak membatalkan proses)
// ---------------------------------------------------------------------------

async function emailReporter(complaint, event, extra = '') {
  const typeLabel = COMPLAINT_TYPE_LABELS[complaint.type];
  const statusLabel = COMPLAINT_STATUS_LABELS[complaint.status];
  const subject = event === 'SUBMITTED'
    ? `[LPMQ] Pengaduan Anda Diterima Sistem - ${complaint.complaint_code}`
    : `[LPMQ] Status Pengaduan ${complaint.complaint_code}: ${statusLabel}`;
  const message = event === 'SUBMITTED'
    ? `Terima kasih, ${typeLabel.toLowerCase()} Anda telah kami terima dengan kode ${complaint.complaint_code}. Simpan kode ini untuk memantau perkembangan pengaduan melalui menu Pengaduan > Lacak Pengaduan di situs LPMQ Tashih Hub.`
    : `Status pengaduan Anda dengan kode ${complaint.complaint_code} kini: ${statusLabel}.${extra ? ` ${extra}` : ''} Detail dapat dipantau melalui menu Pengaduan > Lacak Pengaduan.`;
  try {
    await emailProvider.sendEmail({
      to: complaint.email,
      toName: complaint.reporter_name,
      subject,
      template: `COMPLAINT_${event}`,
      payload: { kode_pengaduan: complaint.complaint_code, jenis_pengaduan: typeLabel, status: statusLabel, message },
    });
  } catch (error) {
    console.error(`Peringatan: Gagal mengirim email pengaduan ${event} (${complaint.complaint_code}):`, error.message);
  }
}

// ---------------------------------------------------------------------------
// Publik: referensi, kirim pengaduan, lacak
// ---------------------------------------------------------------------------

export function getComplaintReference() {
  return {
    jenis_pengaduan_pelayanan: COMPLAINT_SERVICE_CATEGORIES,
    jenis_kesalahan_cetak: PRINT_ERROR_TYPES,
    maks_ukuran_berkas: COMPLAINT_MAX_FILE_BYTES,
    maks_informasi_kesalahan: COMPLAINT_MAX_ERROR_ITEMS,
    format_berkas: ['JPG', 'JPEG', 'PNG', 'PDF'],
  };
}

function reporterData(data) {
  const region = resolveRegion(data.provinsi_kode, data.kabupaten_kode, data.kecamatan_kode);
  return {
    reporter_name: data.nama,
    reporter_gender: data.jenis_kelamin,
    reporter_age: data.usia,
    reporter_occupation: data.pekerjaan,
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
  };
}

const SUBMITTED_NOTE = 'Pengaduan berhasil dikirim dan menunggu verifikasi petugas LPMQ.';

function submissionResult(complaint) {
  return {
    kode_pengaduan: complaint.complaint_code,
    jenis_pengaduan: complaint.type,
    jenis_pengaduan_label: COMPLAINT_TYPE_LABELS[complaint.type],
    status: complaint.status,
    status_label: COMPLAINT_STATUS_LABELS[complaint.status],
    tanggal_pengaduan: complaint.created_at,
    email: complaint.email,
  };
}

/** Simpan pengaduan dengan kode unik; ulangi dengan kode baru bila terjadi tabrakan (sangat jarang). */
async function createWithUniqueCode(type, build) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await build(generateComplaintCode(type));
    } catch (error) {
      if (error?.code === 'P2002' && attempt < 2) continue;
      throw error;
    }
  }
  return null;
}

export async function createPrintErrorComplaint(body, files = {}) {
  const data = createPrintErrorComplaintSchema.body.parse(body);
  verifyCaptcha(data.captcha_token, data.captcha_jawaban);
  const reporter = reporterData(data);

  // Periksa semua berkas lebih dulu sebelum ada yang disimpan
  const tashihFiles = filesOf(files, 'gambar_surat_tashih');
  const coverFiles = filesOf(files, 'gambar_cover');
  const errorFiles = filesOf(files, 'gambar_kesalahan');
  if (tashihFiles.length !== 1) throw fileError('Gambar Surat Tanda Tashih', 'berkas wajib diunggah.', 'gambar_surat_tashih');
  if (coverFiles.length !== 1) throw fileError('Gambar Cover Mushaf', 'berkas wajib diunggah.', 'gambar_cover');
  if (errorFiles.length !== data.kesalahan.length) {
    throw fileError('Gambar Halaman Salah', `setiap informasi kesalahan wajib dilampiri gambar halaman salah (${errorFiles.length} dari ${data.kesalahan.length} diunggah).`, 'gambar_kesalahan');
  }
  const inspectedTashih = await inspectComplaintFile(tashihFiles[0], 'Gambar Surat Tanda Tashih', 'gambar_surat_tashih');
  const inspectedCover = await inspectComplaintFile(coverFiles[0], 'Gambar Cover Mushaf', 'gambar_cover');
  const inspectedErrors = [];
  for (let i = 0; i < errorFiles.length; i += 1) {
    inspectedErrors.push(await inspectComplaintFile(errorFiles[i], `Gambar Halaman Salah (kesalahan ke-${i + 1})`, `kesalahan.${i}.gambar`));
  }

  const stored = [];
  try {
    const tashih = await storeComplaintFile(inspectedTashih, tashihFiles[0].originalname);
    stored.push(tashih);
    const cover = await storeComplaintFile(inspectedCover, coverFiles[0].originalname);
    stored.push(cover);
    const errorImages = [];
    for (let i = 0; i < inspectedErrors.length; i += 1) {
      const saved = await storeComplaintFile(inspectedErrors[i], errorFiles[i].originalname);
      stored.push(saved);
      errorImages.push(saved);
    }
    const attachmentData = ({ absolute_path, ...file }) => file;

    const complaint = await createWithUniqueCode('KESALAHAN_CETAK', (code) => prisma.$transaction(async (tx) => {
      const created = await tx.complaint.create({
        data: {
          complaint_code: code,
          type: 'KESALAHAN_CETAK',
          ...reporter,
          publisher_name: data.nama_penerbit,
          mushaf_name: data.nama_mushaf,
          tashih_number: data.nomor_surat_tashih,
          attachments: {
            create: [
              { attachment_type: 'SURAT_TANDA_TASHIH', ...attachmentData(tashih) },
              { attachment_type: 'COVER_MUSHAF', ...attachmentData(cover) },
            ],
          },
          histories: { create: { status: 'MENUNGGU_VERIFIKASI', note: SUBMITTED_NOTE } },
        },
      });
      for (let i = 0; i < data.kesalahan.length; i += 1) {
        const item = data.kesalahan[i];
        await tx.complaintErrorItem.create({
          data: {
            complaint_id: created.id,
            position: i + 1,
            surah_ayat: item.surah_ayat,
            error_type: item.jenis_kesalahan,
            description: item.deskripsi,
            attachments: {
              create: { complaint_id: created.id, attachment_type: 'HALAMAN_SALAH', ...attachmentData(errorImages[i]) },
            },
          },
        });
      }
      return created;
    }));

    await emailReporter(complaint, 'SUBMITTED');
    return submissionResult(complaint);
  } catch (error) {
    // Jangan tinggalkan berkas yatim bila pengaduan gagal disimpan
    await Promise.all(stored.map((file) => unlink(file.absolute_path).catch(() => {})));
    throw error;
  }
}

export async function createServiceComplaint(body) {
  const data = createServiceComplaintSchema.body.parse(body);
  verifyCaptcha(data.captcha_token, data.captcha_jawaban);
  const reporter = reporterData(data);
  const complaint = await createWithUniqueCode('PELAYANAN', (code) => prisma.complaint.create({
    data: {
      complaint_code: code,
      type: 'PELAYANAN',
      ...reporter,
      registration_number: data.nomor_pendaftaran,
      registrant_publisher: data.penerbit_pendaftar,
      service_category: data.jenis_pengaduan,
      description: data.deskripsi,
      histories: { create: { status: 'MENUNGGU_VERIFIKASI', note: SUBMITTED_NOTE } },
    },
  }));
  await emailReporter(complaint, 'SUBMITTED');
  return submissionResult(complaint);
}

/**
 * Pelacakan publik berdasarkan kode. Hanya informasi yang diperlukan untuk memantau pengaduan:
 * tanpa email, telepon, alamat, lampiran, atau identitas petugas; nama pengadu disamarkan.
 */
export async function trackComplaint(kode) {
  const complaint = await prisma.complaint.findUnique({
    where: { complaint_code: String(kode || '').trim().toUpperCase() },
    select: {
      complaint_code: true,
      type: true,
      status: true,
      reporter_name: true,
      created_at: true,
      rejection_reason: true,
      final_result: true,
      final_explanation: true,
      resolved_on: true,
      histories: { select: { status: true, note: true, created_at: true }, orderBy: { created_at: 'asc' } },
    },
  });
  if (!complaint) fail(404, 'Kode pengaduan tidak ditemukan. Silakan periksa kembali kode yang Anda masukkan.');
  return {
    kode_pengaduan: complaint.complaint_code,
    jenis_pengaduan: complaint.type,
    jenis_pengaduan_label: COMPLAINT_TYPE_LABELS[complaint.type],
    tanggal_pengaduan: complaint.created_at,
    nama_pengadu: maskName(complaint.reporter_name),
    status: complaint.status,
    status_label: COMPLAINT_STATUS_LABELS[complaint.status],
    riwayat: complaint.histories.map((item) => ({
      status: item.status,
      status_label: COMPLAINT_STATUS_LABELS[item.status],
      keterangan: item.note,
      tanggal: item.created_at,
    })),
    alasan_penolakan: complaint.status === 'DITOLAK' ? complaint.rejection_reason : null,
    hasil_penanganan: complaint.status === 'SELESAI'
      ? { hasil: complaint.final_result, keterangan: complaint.final_explanation, tanggal_selesai: complaint.resolved_on }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Admin (Helper Admin/ADMIN_INTERNAL, SUPERADMIN)
// ---------------------------------------------------------------------------

/** Aksi yang tersedia untuk tiap status (juga dipakai untuk validasi di server). */
export function adminActionsFor(status) {
  switch (status) {
    case 'MENUNGGU_VERIFIKASI': return ['TERIMA', 'TOLAK'];
    case 'DITERIMA': return ['DALAM_PROSES'];
    case 'DALAM_PROSES': return ['MENUNGGU_TINDAK_LANJUT', 'LAPORAN_AKHIR'];
    case 'MENUNGGU_TINDAK_LANJUT': return ['DALAM_PROSES', 'LAPORAN_AKHIR'];
    default: return [];
  }
}

const listSelect = {
  id: true,
  complaint_code: true,
  type: true,
  status: true,
  reporter_name: true,
  email: true,
  publisher_name: true,
  mushaf_name: true,
  registration_number: true,
  registrant_publisher: true,
  service_category: true,
  created_at: true,
  updated_at: true,
};

export async function listAdminComplaints({ type, page = 1, limit = 10, status, search } = {}) {
  const base = { type };
  const where = { ...base };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { complaint_code: { contains: search } },
      { reporter_name: { contains: search } },
      { email: { contains: search } },
      ...(type === 'KESALAHAN_CETAK'
        ? [{ publisher_name: { contains: search } }, { mushaf_name: { contains: search } }, { tashih_number: { contains: search } }]
        : [{ registration_number: { contains: search } }, { registrant_publisher: { contains: search } }]),
    ];
  }
  const [total, rows, grouped] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({ where, select: listSelect, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.complaint.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(Object.keys(COMPLAINT_STATUS_LABELS).map((key) => [key, 0]));
  for (const row of grouped) counts[row.status] = row._count._all;
  return {
    data: rows.map((row) => ({ ...row, allowed_actions: adminActionsFor(row.status) })),
    counts,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

const userBrief = { select: { id: true, name: true } };
const attachmentSelect = {
  id: true, attachment_type: true, original_filename: true, file_size: true, mime_type: true, error_item_id: true,
};

export async function getAdminComplaintDetail(id) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      decided_by: userBrief,
      final_report_by: userBrief,
      attachments: { select: attachmentSelect, orderBy: { created_at: 'asc' } },
      error_items: { orderBy: { position: 'asc' }, include: { attachments: { select: attachmentSelect } } },
      histories: { orderBy: { created_at: 'asc' }, include: { changed_by: userBrief } },
    },
  });
  if (!complaint) fail(404, 'Pengaduan tidak ditemukan.');
  return { ...complaint, allowed_actions: adminActionsFor(complaint.status) };
}

export async function getComplaintAttachment(id, attachmentId, user, req) {
  const attachment = await prisma.complaintAttachment.findFirst({ where: { id: attachmentId, complaint_id: id } });
  if (!attachment) fail(404, 'Lampiran pengaduan tidak ditemukan.');
  const file = await readSecurePublisherDocument(attachment.storage_path);
  await audit(prisma, user, 'COMPLAINT_ATTACHMENT_VIEWED', 'Complaint', id, {
    attachment_id: attachment.id,
    attachment_type: attachment.attachment_type,
  }, req);
  return { content: file.content, filename: attachment.original_filename, mime_type: attachment.mime_type };
}

/**
 * Ubah status secara atomik: hanya berhasil bila status saat ini masih salah satu dari `from`
 * (mencegah dua petugas memproses pengaduan yang sama bersamaan), lalu catat riwayat & audit.
 */
async function transition(id, from, to, data, note, user, req, action) {
  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) fail(404, 'Pengaduan tidak ditemukan.');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.updateMany({ where: { id, status: { in: [].concat(from) } }, data: { ...data, status: to } });
    if (result.count !== 1) fail(409, 'Status pengaduan sudah berubah atau tindakan ini tidak tersedia. Muat ulang data sebelum mencoba lagi.');
    await tx.complaintStatusHistory.create({ data: { complaint_id: id, status: to, note, changed_by_id: user.id } });
    await audit(tx, user, action, 'Complaint', id, { from: complaint.status, to, note }, req);
    return tx.complaint.findUnique({ where: { id } });
  });
  return updated;
}

export async function acceptComplaint(id, { catatan } = {}, user, req) {
  const now = new Date();
  const note = catatan?.trim() || 'Pengaduan telah diverifikasi dan diterima untuk ditindaklanjuti oleh LPMQ.';
  const updated = await transition(id, 'MENUNGGU_VERIFIKASI', 'DITERIMA', { decided_at: now, decided_by_id: user.id }, note, user, req, 'COMPLAINT_ACCEPTED');
  await emailReporter(updated, 'STATUS');
  return getAdminComplaintDetail(id);
}

export async function rejectComplaint(id, { alasan }, user, req) {
  const now = new Date();
  const updated = await transition(id, 'MENUNGGU_VERIFIKASI', 'DITOLAK', {
    decided_at: now, decided_by_id: user.id, rejection_reason: alasan,
  }, alasan, user, req, 'COMPLAINT_REJECTED');
  await emailReporter(updated, 'STATUS', `Alasan: ${alasan}`);
  return getAdminComplaintDetail(id);
}

const STATUS_SOURCES = {
  DALAM_PROSES: ['DITERIMA', 'MENUNGGU_TINDAK_LANJUT'],
  MENUNGGU_TINDAK_LANJUT: ['DALAM_PROSES'],
};

export async function updateComplaintStatus(id, { status, keterangan }, user, req) {
  const from = STATUS_SOURCES[status];
  if (!from) fail(400, 'Status tujuan tidak valid.');
  const updated = await transition(id, from, status, {}, keterangan, user, req, 'COMPLAINT_STATUS_CHANGED');
  await emailReporter(updated, 'STATUS', keterangan);
  return getAdminComplaintDetail(id);
}

const toDateOnly = (value) => new Date(`${value}T00:00:00.000Z`);
const todayJakarta = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export async function submitFinalReport(id, { hasil, keterangan, tanggal_selesai }, user, req) {
  const complaint = await prisma.complaint.findUnique({ where: { id }, select: { created_at: true } });
  if (!complaint) fail(404, 'Pengaduan tidak ditemukan.');
  if (Number.isNaN(toDateOnly(tanggal_selesai).getTime())) fail(400, 'Tanggal penyelesaian tidak valid.');
  if (tanggal_selesai > todayJakarta()) fail(400, 'Tanggal penyelesaian tidak boleh melewati hari ini.');
  const submittedOn = new Date(complaint.created_at.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (tanggal_selesai < submittedOn) fail(400, 'Tanggal penyelesaian tidak boleh sebelum tanggal pengaduan.');

  const updated = await transition(id, ['DALAM_PROSES', 'MENUNGGU_TINDAK_LANJUT'], 'SELESAI', {
    final_result: hasil,
    final_explanation: keterangan,
    resolved_on: toDateOnly(tanggal_selesai),
    final_report_at: new Date(),
    final_report_by_id: user.id,
  }, `Laporan akhir: ${hasil}`, user, req, 'COMPLAINT_FINAL_REPORT_SUBMITTED');
  await emailReporter(updated, 'STATUS', `Hasil penanganan: ${hasil}.`);
  return getAdminComplaintDetail(id);
}

/** Jumlah pengaduan yang menunggu verifikasi (badge menu Kelola Landing Page). */
export function countPendingComplaints() {
  return prisma.complaint.count({ where: { status: 'MENUNGGU_VERIFIKASI' } });
}
