import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';
import { emailProvider } from './email-provider.service.js';
import { renderPublisherCertificatePdf } from './publisher-certificate-pdf.service.js';
import { getNextDocumentNumber } from './document-number.service.js';
import {
  saveSecurePublisherDocument,
  readSecurePublisherDocument,
} from './secure-document.service.js';
import {
  computeActiveIdentifiers,
  createPublisherRegistrationSchema,
} from '../validators/publisher-registration.validator.js';

const STATUS_LABELS = {
  DIAJUKAN: 'Menunggu Verifikasi Petugas',
  PERLU_PERBAIKAN: 'Perlu Perbaikan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

/**
 * Menghasilkan kode pendaftaran acak berentropi tinggi (REG-PUB-XXXXXXXX)
 */
export function generateRegistrationCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Tanpa karakter ambigu (0, 1, I, O)
  let code = 'REG-PUB-';
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

/**
 * Validasi kelengkapan berkas fisik sesuai jenis penerbit
 */
export function validateRequiredDocuments(jenisPenerbit, files = {}) {
  const missing = [];
  const hasFile = (f) => Boolean(Array.isArray(f) ? f.length > 0 && f[0] : f);
  if (!hasFile(files.dokumen_surat_pendaftaran)) missing.push('Surat Permohonan Pendaftaran');
  if (['PERUSAHAAN', 'YAYASAN'].includes(jenisPenerbit) && !hasFile(files.dokumen_akta_notaris)) {
    missing.push('Akta Notaris & SK Kemenkumham');
  }
  if (!hasFile(files.dokumen_profil)) missing.push('Profil Instansi/Perusahaan');
  if (!hasFile(files.dokumen_npwp)) missing.push('NPWP Badan Hukum');
  if (jenisPenerbit === 'PERUSAHAAN' && !hasFile(files.dokumen_nib)) {
    missing.push('Nomor Induk Berusaha (NIB)');
  }
  if (!hasFile(files.dokumen_ktp)) missing.push('KTP Pimpinan / Penanggung Jawab');

  if (missing.length > 0) {
    const err = new Error(`Dokumen persyaratan berikut belum diunggah: ${missing.join(', ')}.`);
    err.statusCode = 400;
    err.code = 'DOCUMENT_REQUIRED';
    err.errors = missing.map(name => ({ field: name, message: `${name} wajib diunggah.` }));
    throw err;
  }
}

/**
 * Kirim email notifikasi untuk 4 peristiwa pendaftaran penerbit
 */
export async function sendPublisherRegistrationEmail(event, { email, name, code, reason, revisionToken }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let subject = '';
  let template = event;
  let payload = { email, name, code };

  switch (event) {
    case 'PUBLISHER_REGISTRATION_SUBMITTED':
      subject = `[LPMQ] Pendaftaran Akun Penerbit Diterima - ${code}`;
      payload.message = `Permohonan pendaftaran akun penerbit untuk ${name} telah berhasil diterima dengan kode ${code}. Petugas LPMQ akan memverifikasi kelengkapan dokumen Anda.`;
      break;

    case 'PUBLISHER_REGISTRATION_NEEDS_REVISION':
      subject = `[LPMQ] Permintaan Perbaikan Dokumen Pendaftaran - ${code}`;
      payload.reason = reason;
      payload.revision_url = `${frontendUrl}/pendaftaran-penerbit/perbaikan?token=${revisionToken}`;
      payload.message = `Permohonan pendaftaran ${name} memerlukan perbaikan dokumen dengan catatan: ${reason}. Silakan akses tautan berikut dalam 14 hari kalender: ${payload.revision_url}`;
      break;

    case 'PUBLISHER_REGISTRATION_APPROVED':
      subject = `[LPMQ] Pendaftaran Akun Penerbit Disetujui - ${code}`;
      payload.login_url = `${frontendUrl}/login`;
      payload.message = `Selamat! Pendaftaran akun penerbit untuk ${name} telah disetujui. Akun Anda kini aktif dan dapat digunakan untuk masuk ke Sistem Layanan Pentashihan Mushaf Al-Qur'an.`;
      break;

    case 'PUBLISHER_REGISTRATION_REJECTED':
      subject = `[LPMQ] Pemberitahuan Penolakan Pendaftaran Penerbit - ${code}`;
      payload.reason = reason;
      payload.message = `Mohon maaf, permohonan pendaftaran akun penerbit untuk ${name} tidak dapat disetujui dengan alasan: ${reason}. Anda dapat mengajukan permohonan baru setelah melengkapi persyaratan yang sesuai.`;
      break;

    default:
      return;
  }

  try {
    await emailProvider.sendEmail({
      to: email,
      toName: name,
      subject,
      template,
      payload,
    });
  } catch (err) {
    console.error(`Peringatan: Gagal mengirim email ${event} ke ${email}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// 1. PENDAFTARAN PUBLIK
// ---------------------------------------------------------------------------

export async function registerPublisher(body, files = {}) {
  // 1. Validasi skema isian formulir teks
  const validated = createPublisherRegistrationSchema.body.parse(body);

  // 2. Validasi dokumen persyaratan per jenis penerbit
  validateRequiredDocuments(validated.jenis_penerbit, files);

  // 3. Periksa keunikan email di antara akun User aktif dan pendaftaran aktif
  const existingUser = await prisma.user.findFirst({
    where: { email: validated.email },
  });
  if (existingUser) {
    const err = new Error('Alamat email sudah terdaftar di sistem. Gunakan alamat email lain atau masuk ke akun Anda.');
    err.statusCode = 409;
    err.code = 'DUPLICATE_ACTIVE_REGISTRATION';
    throw err;
  }

  // 4. Periksa keunikan NPWP & NIB di antara pendaftaran aktif (bukan DITOLAK)
  const existingActiveNpwp = await prisma.publisherRegistration.findFirst({
    where: { active_npwp: validated.npwp.trim() },
  });
  if (existingActiveNpwp) {
    const err = new Error('Nomor NPWP sudah terdaftar pada permohonan pendaftaran aktif lain. Satu badan hukum hanya dapat memiliki satu permohonan aktif.');
    err.statusCode = 409;
    err.code = 'DUPLICATE_ACTIVE_REGISTRATION';
    throw err;
  }

  if (validated.nib && validated.nib.trim()) {
    const existingActiveNib = await prisma.publisherRegistration.findFirst({
      where: { active_nib: validated.nib.trim() },
    });
    if (existingActiveNib) {
      const err = new Error('Nomor NIB sudah terdaftar pada permohonan pendaftaran aktif lain.');
      err.statusCode = 409;
      err.code = 'DUPLICATE_ACTIVE_REGISTRATION';
      throw err;
    }
  }

  // 5. Simpan dan periksa keamanan seluruh dokumen yang diunggah
  const processedDocs = [];
  const docMapping = [
    { field: 'dokumen_surat_pendaftaran', type: 'SURAT_PENDAFTARAN' },
    { field: 'dokumen_akta_notaris', type: 'AKTA_NOTARIS' },
    { field: 'dokumen_profil', type: 'PROFIL' },
    { field: 'dokumen_npwp', type: 'NPWP' },
    { field: 'dokumen_nib', type: 'NIB' },
    { field: 'dokumen_ktp', type: 'KTP_PENANGGUNG_JAWAB' },
  ];

  for (const item of docMapping) {
    const raw = files[item.field];
    const file = Array.isArray(raw) ? raw[0] : raw;
    if (file && file.buffer) {
      const savedDoc = await saveSecurePublisherDocument(
        file.buffer,
        file.originalname,
        item.type
      );
      processedDocs.push({
        document_type: item.type,
        ...savedDoc,
      });
    }
  }

  // 6. Buat kode pendaftaran unik
  let registrationCode;
  while (!registrationCode) {
    const candidate = generateRegistrationCode();
    const exists = await prisma.publisherRegistration.findUnique({
      where: { registration_code: candidate },
    });
    if (!exists) registrationCode = candidate;
  }

  const activeIdentifiers = computeActiveIdentifiers('DIAJUKAN', validated.npwp, validated.nib);
  const passwordHash = await bcrypt.hash(validated.password, 10);

  // 7. Simpan akun User (status INACTIVE) dan data pendaftaran dalam transaksi
  const result = await prisma.$transaction(async tx => {
    // Cari role PENERBIT
    const penerbitRole = await tx.role.findFirst({ where: { code: 'PENERBIT' } });

    // Buat User akun sementara
    const user = await tx.user.create({
      data: {
        name: validated.nama_penanggung_jawab,
        email: validated.email,
        password_hash: passwordHash,
        status: 'INACTIVE', // Akun tidak dapat login sebelum pendaftaran DISETUJUI
        roles: penerbitRole ? { create: { role_id: penerbitRole.id } } : undefined,
      },
    });

    // Buat PublisherRegistration
    const registration = await tx.publisherRegistration.create({
      data: {
        registration_code: registrationCode,
        publisher_type: validated.jenis_penerbit,
        name: validated.nama_penerbit,
        address: validated.alamat_lengkap,
        pic_name: validated.nama_penanggung_jawab,
        pic_phone: validated.telepon_penanggung_jawab,
        email: validated.email,
        npwp: validated.npwp.trim(),
        nib: validated.nib ? validated.nib.trim() : null,
        active_npwp: activeIdentifiers.active_npwp,
        active_nib: activeIdentifiers.active_nib,
        status: 'DIAJUKAN',
        user_id: user.id,
        documents: {
          create: processedDocs.map(d => ({
            document_type: d.document_type,
            storage_path: d.storage_path,
            original_filename: d.original_filename,
            file_size: d.file_size,
            file_hash: d.file_hash,
            mime_type: d.mime_type,
            has_links: d.has_links,
            detected_links: d.detected_links || [],
          })),
        },
      },
    });

    return registration;
  });

  // 8. Kirim email notifikasi
  await sendPublisherRegistrationEmail('PUBLISHER_REGISTRATION_SUBMITTED', {
    email: validated.email,
    name: validated.nama_penerbit,
    code: registrationCode,
  });

  return {
    kode_pendaftaran: result.registration_code,
    nama_penerbit: result.name,
    email: result.email,
    status: result.status,
    created_at: result.created_at,
  };
}

// ---------------------------------------------------------------------------
// 2. CEK STATUS PUBLIK
// ---------------------------------------------------------------------------

export async function checkPublisherRegistrationStatus(kodePendaftaran) {
  if (!kodePendaftaran || typeof kodePendaftaran !== 'string') {
    const err = new Error('Kode pendaftaran wajib disertakan.');
    err.statusCode = 400;
    throw err;
  }

  const reg = await prisma.publisherRegistration.findUnique({
    where: { registration_code: kodePendaftaran.trim() },
    select: {
      registration_code: true,
      status: true,
      reason: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!reg) {
    const err = new Error('Kode pendaftaran tidak ditemukan. Pastikan Anda memasukkan kode dengan benar sesuai email konfirmasi.');
    err.statusCode = 404;
    err.code = 'REGISTRATION_NOT_FOUND';
    throw err;
  }

  const responseData = {
    kode_pendaftaran: reg.registration_code,
    status: reg.status,
    status_label: STATUS_LABELS[reg.status] || reg.status,
    alasan: ['PERLU_PERBAIKAN', 'DITOLAK'].includes(reg.status) ? reg.reason : null,
    tanggal_pengajuan: reg.created_at,
    tanggal_pembaruan: reg.updated_at,
  };

  if (reg.status === 'PERLU_PERBAIKAN') {
    responseData.instruksi = 'Silakan periksa kotak masuk email terdaftar Anda untuk mengakses tautan perbaikan dokumen.';
  }

  return responseData;
}

// ---------------------------------------------------------------------------
// 3. PERBAIKAN LEWAT TAUTAN SEKALI PAKAI
// ---------------------------------------------------------------------------

export async function getPublisherRegistrationRevision(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    const err = new Error('Token perbaikan tidak valid.');
    err.statusCode = 400;
    err.code = 'TOKEN_INVALID_OR_EXPIRED';
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenRecord = await prisma.publisherRevisionToken.findUnique({
    where: { token_hash: tokenHash },
    include: {
      registration: {
        include: {
          documents: {
            where: { is_replaced: false },
            orderBy: { created_at: 'desc' },
          },
        },
      },
    },
  });

  if (!tokenRecord || tokenRecord.used_at || tokenRecord.expires_at < new Date()) {
    const err = new Error('Tautan perbaikan sudah tidak berlaku atau pernah digunakan. Hubungi petugas loket LPMQ jika Anda memerlukan bantuan.');
    err.statusCode = 410;
    err.code = 'TOKEN_INVALID_OR_EXPIRED';
    throw err;
  }

  const reg = tokenRecord.registration;
  if (reg.status !== 'PERLU_PERBAIKAN') {
    const err = new Error('Permohonan pendaftaran ini tidak sedang dalam status perlu perbaikan.');
    err.statusCode = 400;
    err.code = 'REGISTRATION_NOT_IN_REVISION';
    throw err;
  }

  return {
    kode_pendaftaran: reg.registration_code,
    nama_penerbit: reg.name,
    jenis_penerbit: reg.publisher_type,
    alamat_lengkap: reg.address,
    nama_penanggung_jawab: reg.pic_name,
    telepon_penanggung_jawab: reg.pic_phone,
    email: reg.email,
    npwp: reg.npwp,
    nib: reg.nib,
    alasan_perbaikan: reg.reason,
    dokumen_terunggah: reg.documents.map(d => ({
      id: d.id,
      tipe: d.document_type,
      nama_file: d.original_filename,
      ukuran_bytes: d.file_size,
      status: 'VALID',
    })),
  };
}

export async function submitPublisherRegistrationRevision(rawToken, body = {}, files = {}) {
  if (!rawToken || typeof rawToken !== 'string') {
    const err = new Error('Token perbaikan tidak valid.');
    err.statusCode = 400;
    err.code = 'TOKEN_INVALID_OR_EXPIRED';
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenRecord = await prisma.publisherRevisionToken.findUnique({
    where: { token_hash: tokenHash },
    include: { registration: true },
  });

  if (!tokenRecord || tokenRecord.used_at || tokenRecord.expires_at < new Date()) {
    const err = new Error('Tautan perbaikan sudah tidak berlaku atau pernah digunakan. Hubungi petugas loket LPMQ jika Anda memerlukan bantuan.');
    err.statusCode = 410;
    err.code = 'TOKEN_INVALID_OR_EXPIRED';
    throw err;
  }

  const reg = tokenRecord.registration;
  if (reg.status !== 'PERLU_PERBAIKAN') {
    const err = new Error('Permohonan pendaftaran ini tidak sedang dalam status perlu perbaikan.');
    err.statusCode = 400;
    err.code = 'REGISTRATION_NOT_IN_REVISION';
    throw err;
  }

  // Simpan berkas-berkas pengganti jika diunggah
  const newProcessedDocs = [];
  const docMapping = [
    { field: 'dokumen_surat_pendaftaran', type: 'SURAT_PENDAFTARAN' },
    { field: 'dokumen_akta_notaris', type: 'AKTA_NOTARIS' },
    { field: 'dokumen_profil', type: 'PROFIL' },
    { field: 'dokumen_npwp', type: 'NPWP' },
    { field: 'dokumen_nib', type: 'NIB' },
    { field: 'dokumen_ktp', type: 'KTP_PENANGGUNG_JAWAB' },
  ];

  for (const item of docMapping) {
    const raw = files[item.field];
    const file = Array.isArray(raw) ? raw[0] : raw;
    if (file && file.buffer) {
      const savedDoc = await saveSecurePublisherDocument(
        file.buffer,
        file.originalname,
        item.type
      );
      newProcessedDocs.push({
        document_type: item.type,
        ...savedDoc,
      });
    }
  }

  const updatedReg = await prisma.$transaction(async tx => {
    // 1. Hanguskan token perbaikan (single-use)
    await tx.publisherRevisionToken.update({
      where: { id: tokenRecord.id },
      data: { used_at: new Date() },
    });

    // 2. Tandai dokumen lama yang diperbarui dengan is_replaced = true
    for (const newDoc of newProcessedDocs) {
      await tx.publisherRegistrationDocument.updateMany({
        where: {
          registration_id: reg.id,
          document_type: newDoc.document_type,
          is_replaced: false,
        },
        data: { is_replaced: true },
      });

      // Tambahkan dokumen baru
      await tx.publisherRegistrationDocument.create({
        data: {
          registration_id: reg.id,
          document_type: newDoc.document_type,
          storage_path: newDoc.storage_path,
          original_filename: newDoc.original_filename,
          file_size: newDoc.file_size,
          file_hash: newDoc.file_hash,
          mime_type: newDoc.mime_type,
          has_links: newDoc.has_links,
          detected_links: newDoc.detected_links || [],
          is_replaced: false,
        },
      });
    }

    // 3. Perbarui field teks jika disediakan
    const updateData = {
      status: 'DIAJUKAN',
      version: { increment: 1 },
    };
    if (body.alamat_lengkap) updateData.address = body.alamat_lengkap.trim();
    if (body.nama_penanggung_jawab) updateData.pic_name = body.nama_penanggung_jawab.trim();
    if (body.telepon_penanggung_jawab) updateData.pic_phone = body.telepon_penanggung_jawab.trim();

    return await tx.publisherRegistration.update({
      where: { id: reg.id },
      data: updateData,
    });
  });

  return {
    kode_pendaftaran: updatedReg.registration_code,
    status: updatedReg.status,
    updated_at: updatedReg.updated_at,
  };
}

// ---------------------------------------------------------------------------
// 4. ADMIN: DAFTAR, DETAIL, UNDUH DOKUMEN, & KEPUTUSAN
// ---------------------------------------------------------------------------

export async function listAdminPublisherRegistrations({ page = 1, limit = 10, status, search }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (p - 1) * l;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q } },
      { registration_code: { contains: q } },
      { email: { contains: q } },
      { npwp: { contains: q } },
    ];
  }

  const [totalRecords, records] = await Promise.all([
    prisma.publisherRegistration.count({ where }),
    prisma.publisherRegistration.findMany({
      where,
      skip,
      take: l,
      orderBy: { created_at: 'desc' },
      include: {
        documents: {
          select: { has_links: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalRecords / l);

  const formatted = records.map(r => ({
    id: r.id,
    kode_pendaftaran: r.registration_code,
    nama_penerbit: r.name,
    jenis_penerbit: r.publisher_type,
    email: r.email,
    status: r.status,
    tautan_terdeteksi: r.documents.some(d => d.has_links),
    versi: r.version,
    created_at: r.created_at,
  }));

  return {
    data: formatted,
    pagination: {
      page: p,
      limit: l,
      total_records: totalRecords,
      total_pages: totalPages,
    },
  };
}

export async function getAdminPublisherRegistrationDetail(id) {
  const reg = await prisma.publisherRegistration.findUnique({
    where: { id },
    include: {
      decided_by: {
        select: { id: true, name: true, email: true },
      },
      documents: {
        where: { is_replaced: false },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!reg) {
    fail(404, 'Data pendaftaran penerbit tidak ditemukan.');
  }

  return {
    id: reg.id,
    kode_pendaftaran: reg.registration_code,
    nama_penerbit: reg.name,
    jenis_penerbit: reg.publisher_type,
    alamat_lengkap: reg.address,
    nama_penanggung_jawab: reg.pic_name,
    telepon_penanggung_jawab: reg.pic_phone,
    email: reg.email,
    npwp: reg.npwp,
    nib: reg.nib,
    status: reg.status,
    alasan: reg.reason,
    versi: reg.version,
    dokumen: reg.documents.map(d => ({
      id: d.id,
      tipe: d.document_type,
      nama_asli: d.original_filename,
      ukuran_bytes: d.file_size,
      tautan_terdeteksi: d.has_links,
      daftar_tautan: Array.isArray(d.detected_links) ? d.detected_links : [],
      created_at: d.created_at,
    })),
    created_at: reg.created_at,
    decided_at: reg.decided_at,
    decided_by: reg.decided_by ? reg.decided_by.name : null,
  };
}

export async function getAdminPublisherRegistrationDocument(id, documentId, currentUser, req) {
  const doc = await prisma.publisherRegistrationDocument.findFirst({
    where: {
      id: documentId,
      registration_id: id,
    },
  });

  if (!doc) {
    fail(404, 'Dokumen pendaftaran tidak ditemukan.');
  }

  // Jika dokumen bertipe KTP, catat akses sensitif di audit log
  if (doc.document_type === 'KTP_PENANGGUNG_JAWAB') {
    await audit(
      prisma,
      currentUser,
      'VIEW_SENSITIVE_KTP',
      'PublisherRegistrationDocument',
      doc.id,
      { registration_id: id, document_type: doc.document_type },
      req
    );
  }

  const { content } = await readSecurePublisherDocument(doc.storage_path);
  return {
    content,
    filename: doc.original_filename,
    mime_type: doc.mime_type,
  };
}

export async function decidePublisherRegistration(id, { keputusan, alasan, versi }, currentUser, req) {
  const reg = await prisma.publisherRegistration.findUnique({
    where: { id },
  });

  if (!reg) {
    fail(404, 'Data pendaftaran penerbit tidak ditemukan.');
  }

  // Konkurensi Optimistik
  if (reg.version !== versi) {
    const err = new Error('Data pendaftaran telah diperbarui oleh petugas lain. Muat ulang halaman untuk melihat status terbaru.');
    err.statusCode = 409;
    err.code = 'VERSION_CONFLICT';
    throw err;
  }

  let revisionTokenRaw = null;

  const result = await prisma.$transaction(async tx => {
    let newStatus;
    const updateData = {
      decided_at: new Date(),
      decided_by_id: currentUser.id,
      version: { increment: 1 },
    };

    if (keputusan === 'SETUJUI') {
      newStatus = 'DISETUJUI';
      updateData.status = newStatus;
      updateData.reason = null;

      // 1. Aktifkan akun User
      if (reg.user_id) {
        await tx.user.update({
          where: { id: reg.user_id },
          data: { status: 'ACTIVE' },
        });

        // 2. Tentukan Nomor Induk Penerbit (NIP) resmi (U-06)
        const nipNumber = reg.nomor_induk_penerbit || await getNextDocumentNumber(tx, 'SERTIFIKAT_PENERBIT', new Date());
        updateData.nomor_induk_penerbit = nipNumber;

        // 3. Buat profil Publisher
        const entityType = reg.publisher_type === 'PERUSAHAAN' ? 'PT' : (reg.publisher_type === 'YAYASAN' ? 'YAYASAN' : 'LEMBAGA_PEMERINTAH');
        const pub = await tx.publisher.create({
          data: {
            user_id: reg.user_id,
            legal_name: reg.name,
            entity_type: entityType,
            verification_status: 'VERIFIED',
            address: reg.address,
            phone: reg.pic_phone,
            nomor_induk_penerbit: nipNumber,
            npwp: reg.npwp,
            nib: reg.nib,
          },
        });

        updateData.publisher_id = pub.id;
      }
    } else if (keputusan === 'PERLU_PERBAIKAN') {
      newStatus = 'PERLU_PERBAIKAN';
      updateData.status = newStatus;
      updateData.reason = alasan;

      // Buat token perbaikan sekali pakai (14 hari masa berlaku)
      revisionTokenRaw = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(revisionTokenRaw).digest('hex');
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      await tx.publisherRevisionToken.create({
        data: {
          registration_id: reg.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });
    } else if (keputusan === 'TOLAK') {
      newStatus = 'DITOLAK';
      updateData.status = newStatus;
      updateData.reason = alasan;
      // Bebaskan kolom pembantu NPWP & NIB agar dapat didaftarkan kembali di masa depan
      updateData.active_npwp = null;
      updateData.active_nib = null;
    }

    const updated = await tx.publisherRegistration.update({
      where: { id: reg.id },
      data: updateData,
    });

    await audit(
      tx,
      currentUser,
      'DECIDE_PUBLISHER_REGISTRATION',
      'PublisherRegistration',
      id,
      { keputusan, alasan, previous_status: reg.status, new_status: newStatus },
      req
    );

    return updated;
  });

  // Kirim email notifikasi
  const emailEventMap = {
    SETUJUI: 'PUBLISHER_REGISTRATION_APPROVED',
    PERLU_PERBAIKAN: 'PUBLISHER_REGISTRATION_NEEDS_REVISION',
    TOLAK: 'PUBLISHER_REGISTRATION_REJECTED',
  };

  await sendPublisherRegistrationEmail(emailEventMap[keputusan], {
    email: reg.email,
    name: reg.name,
    code: reg.registration_code,
    reason: alasan,
    revisionToken: revisionTokenRaw,
  });

  return {
    id: result.id,
    kode_pendaftaran: result.registration_code,
    status: result.status,
    versi: result.version,
    decided_at: result.decided_at,
  };
}

/**
 * Mengambil dan merender PDF Sertifikat Penerbit Al-Qur'an (U-06)
 * @param {string} idOrCode ID pendaftaran atau kode registrasi
 * @param {object|null} user User yang mengakses
 * @returns {Promise<{ filename: string, content: Buffer, mime_type: string }>}
 */
export async function getPublisherCertificatePdf(idOrCode, user = null) {
  let reg = await prisma.publisherRegistration.findUnique({
    where: { id: idOrCode },
    include: { publisher: true },
  });

  if (!reg) {
    reg = await prisma.publisherRegistration.findUnique({
      where: { registration_code: idOrCode },
      include: { publisher: true },
    });
  }

  if (!reg) {
    const error = new Error('Pendaftaran penerbit tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (reg.status !== 'DISETUJUI') {
    const error = new Error('Sertifikat Penerbit hanya dapat diunduh untuk pendaftaran yang berstatus DISETUJUI.');
    error.statusCode = 400;
    throw error;
  }

  const nipNumber = reg.nomor_induk_penerbit || reg.publisher?.nomor_induk_penerbit || '31.74.26.10.19.001';

  const pdfBytes = await renderPublisherCertificatePdf({
    name: reg.name,
    address: reg.address,
    pic_phone: reg.pic_phone,
    email: reg.email,
    pic_name: reg.pic_name,
    npwp: reg.npwp,
    nib: reg.nib,
    nomor_induk_penerbit: nipNumber,
    decided_at: reg.decided_at || reg.updated_at,
  });

  const safeName = (reg.name || 'Penerbit').replace(/[^a-zA-Z0-9.-]/g, '_');
  return {
    filename: `Sertifikat-Penerbit-${safeName}.pdf`,
    content: Buffer.from(pdfBytes),
    mime_type: 'application/pdf',
  };
}
