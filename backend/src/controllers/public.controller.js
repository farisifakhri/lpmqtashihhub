import { createHash } from 'node:crypto';
import { prisma } from '../config/database.js';
import { readStoredFile } from '../services/storage.service.js';
import { getPublicLandingStatistics } from '../services/landing-statistics.service.js';

export const getLandingStatistics = async (req, res, next) => {
  try {
    const stats = await getPublicLandingStatistics();
    res.set('Cache-Control', 'no-cache');
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return next(error);
  }
};

const findPublicDocument = async (token) => {
  const doc = await prisma.officialDocument.findUnique({
    where: { qr_token: token },
    include: {
      registration: {
        include: {
          publisher: { select: { legal_name: true } },
          service_type: { select: { name: true, service_kind: true } },
        },
      },
      signatories: {
        select: {
          name_position_snapshot: true,
          signing_status: true,
          signed_at: true,
        },
      },
    },
  });
  return !doc || doc.status === 'DRAFT' || doc.status === 'SIGNED' ? null : doc;
};

const toPublicData = (doc) => {
  const isExpired = doc.valid_until ? new Date() > new Date(doc.valid_until) : false;
  return {
    document_type: doc.document_type,
    document_no: doc.document_no,
    title: doc.registration.title,
    publisher_name: doc.registration.publisher.legal_name,
    service_name: doc.registration.service_type.name,
    service_kind: doc.registration.service_type.service_kind,
    status: doc.status === 'REVOKED' ? 'REVOKED' : isExpired ? 'EXPIRED' : doc.status,
    issued_at: doc.issued_at,
    valid_until: doc.valid_until,
    is_valid: doc.status === 'ISSUED' && !isExpired,
    signatories: doc.signatories,
    original_file_available: doc.document_type === 'SURAT_TANDA_TASHIH' && Boolean(doc.file_id),
  };
};

const notFound = (res, message = 'Dokumen tanda tashih tidak ditemukan atau QR Token tidak valid.') =>
  res.status(404).json({ success: false, message });

// Arsip PDF final STT (issue log #40); hanya STT yang dibuka ke publik, dokumen lain tetap metadata saja.
const readOriginalStt = async (doc) => {
  if (doc.document_type !== 'SURAT_TANDA_TASHIH' || !doc.file_id) return null;
  const file = await prisma.storedFile.findUnique({ where: { id: doc.file_id } });
  if (!file || file.mime_type !== 'application/pdf') return null;
  let bytes;
  try { bytes = await readStoredFile(file.id); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (createHash('sha256').update(bytes).digest('hex') !== file.checksum) return null;
  return { bytes, checksum: file.checksum };
};

export const getOriginalSttFile = async (req, res, next) => {
  try {
    const doc = await findPublicDocument(req.params.token);
    const original = doc && await readOriginalStt(doc);
    if (!original) return notFound(res, 'Berkas asli Surat Tanda Tashih tidak tersedia untuk dokumen ini.');
    const filename = `${(doc.document_no || 'STT').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(original.bytes);
  } catch (error) {
    return next(error);
  }
};

export const checkSttFile = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length < 5 || req.body.subarray(0, 5).toString() !== '%PDF-') {
      return res.status(400).json({ success: false, message: 'Unggah berkas PDF untuk dibandingkan dengan arsip.' });
    }
    const doc = await findPublicDocument(req.params.token);
    if (!doc) return notFound(res);
    const original = await readOriginalStt(doc);
    if (!original) return notFound(res, 'Berkas asli Surat Tanda Tashih tidak tersedia untuk dokumen ini.');
    const matches = createHash('sha256').update(req.body).digest('hex') === original.checksum;
    return res.json({ success: true, data: { ...toPublicData(doc), checked_file_integrity: matches ? 'MATCH' : 'MISMATCH' } });
  } catch (error) {
    return next(error);
  }
};

export const verifyDocumentByQrToken = async (req, res, next) => {
  try {
    const doc = await findPublicDocument(req.params.token);
    if (!doc) return notFound(res);
    // Metadata terbatas yang aman untuk publik (tanpa mengekspos link file privat)
    const publicData = toPublicData(doc);
    return res.status(200).json({
      success: true,
      message: publicData.is_valid ? 'Dokumen aktif dan terdaftar di LPMQ.' : 'Dokumen terdaftar tetapi tidak berlaku.',
      data: publicData,
    });
  } catch (error) {
    return next(error);
  }
};

export default { verifyDocumentByQrToken, getOriginalSttFile, checkSttFile, getLandingStatistics };
