import { createHash } from 'node:crypto';
import { prisma } from '../config/database.js';
import { audit, fail, requireRole } from './workflow-utils.js';

/**
 * P0-02 & §4.3: Layanan Penandatanganan Dokumen Verifikasi Multi-Signatory
 */

export function computeDocumentHash(document) {
  const content = JSON.stringify(document.content_snapshot || {});
  const payload = `${document.id}:${document.document_type}:${document.version}:${content}`;
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Inisialisasi daftar penandatangan dokumen berdasarkan jenis dokumen resmi
 */
export async function initVerificationSignatories(tx, document, verifierUser, kepalaUser) {
  if (document.document_type === 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI' || document.document_type === 'SURAT_HASIL_VERIFIKASI') {
    // Surat Pemberitahuan ditandatangani oleh Kepala LPMQ
    if (kepalaUser?.id) {
      await tx.verificationDocumentSignatory.create({
        data: {
          document_id: document.id,
          signer_user_id: kepalaUser.id,
          name_position_snapshot: `${kepalaUser.name} (Kepala LPMQ)`,
          sign_order: 1,
          method: 'DIGITAL',
          status: 'PENDING',
        },
      });
    }
  } else if (document.document_type === 'BERITA_ACARA_VERIFIKASI') {
    // Berita Acara ditandatangani oleh Verifikator (urutan 1) dan Kepala LPMQ (urutan 2)
    if (verifierUser?.id) {
      await tx.verificationDocumentSignatory.create({
        data: {
          document_id: document.id,
          signer_user_id: verifierUser.id,
          name_position_snapshot: `${verifierUser.name} (Verifikator Naskah)`,
          sign_order: 1,
          method: 'DIGITAL',
          status: 'PENDING',
        },
      });
    }
    if (kepalaUser?.id) {
      await tx.verificationDocumentSignatory.create({
        data: {
          document_id: document.id,
          signer_user_id: kepalaUser.id,
          name_position_snapshot: `${kepalaUser.name} (Kepala LPMQ)`,
          sign_order: 2,
          method: 'DIGITAL',
          status: 'PENDING',
        },
      });
    }
  }
}

/**
 * Eksekusi penandatanganan dokumen oleh penandatangan yang sah
 */
export async function signVerificationDocument(documentId, user, req) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.verificationDocument.findUnique({
      where: { id: documentId },
      include: {
        signatories: {
          orderBy: { sign_order: 'asc' },
          include: { signer: { select: { id: true, name: true, nip: true } } },
        },
        registration: true,
      },
    });

    if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');

    if (!['APPROVED', 'SIGNING'].includes(doc.status)) {
      fail(409, `Dokumen saat ini berstatus "${doc.status}". Penandatanganan hanya dapat dilakukan setelah dokumen disetujui Kepala LPMQ.`);
    }

    const mySignatory = doc.signatories.find((s) => s.signer_user_id === user.id);
    if (!mySignatory) {
      fail(403, 'Anda bukan penandatangan yang terdaftar untuk dokumen verifikasi ini.');
    }

    if (mySignatory.status === 'SIGNED') {
      fail(409, 'Anda telah menandatangani dokumen ini sebelumnya.');
    }

    // Periksa urutan tanda tangan (sign_order)
    const pendingPrior = doc.signatories.find(
      (s) => s.sign_order < mySignatory.sign_order && s.status !== 'SIGNED'
    );
    if (pendingPrior) {
      fail(409, `Dokumen harus ditandatangani terlebih dahulu oleh ${pendingPrior.name_position_snapshot} (urutan ${pendingPrior.sign_order}).`);
    }

    const now = new Date();
    const hash = computeDocumentHash(doc);

    // Update signatory record
    await tx.verificationDocumentSignatory.update({
      where: { id: mySignatory.id },
      data: {
        status: 'SIGNED',
        signed_at: now,
        document_hash: hash,
      },
    });

    // Cek apakah seluruh penandatangan telah selesai
    const remainingPending = await tx.verificationDocumentSignatory.count({
      where: {
        document_id: documentId,
        status: { not: 'SIGNED' },
      },
    });

    const isAllSigned = remainingPending === 0;
    const newDocStatus = isAllSigned ? 'SIGNED' : 'SIGNING';
    const newSigStatus = isAllSigned ? 'SIGNED' : 'PENDING';

    const updatedDoc = await tx.verificationDocument.update({
      where: { id: documentId },
      data: {
        status: newDocStatus,
        signature_status: newSigStatus,
        signed_at: isAllSigned ? now : doc.signed_at,
      },
      include: {
        signatories: {
          orderBy: { sign_order: 'asc' },
          include: { signer: { select: { id: true, name: true, nip: true } } },
        },
      },
    });

    await audit(tx, user, 'SIGN_VERIFICATION_DOCUMENT', 'VerificationDocument', doc.id, {
      signatory_id: mySignatory.id,
      sign_order: mySignatory.sign_order,
      is_all_signed: isAllSigned,
      status: newDocStatus,
    }, req);

    // 1. Notifikasi penandatangan PENDING berikutnya pada dokumen ini
    const nextSignatory = await tx.verificationDocumentSignatory.findFirst({
      where: {
        document_id: documentId,
        status: 'PENDING',
      },
      orderBy: { sign_order: 'asc' },
    });

    if (nextSignatory?.signer_user_id) {
      const docLabel = doc.document_type === 'BERITA_ACARA_VERIFIKASI'
        ? 'Berita Acara Verifikasi'
        : 'Surat Hasil Verifikasi';
      await tx.notification.create({
        data: {
          user_id: nextSignatory.signer_user_id,
          registration_id: doc.registration_id,
          type: 'SIGNATURE_REQUEST',
          title: `Permohonan tanda tangan ${docLabel}: ${doc.registration?.registration_no || ''}`,
          payload: {
            assignment_id: doc.assignment_id,
            document_id: doc.id,
            document_type: doc.document_type,
            registration_no: doc.registration?.registration_no,
            sign_order: nextSignatory.sign_order,
            link: doc.assignment_id ? `/internal/verifications/${doc.assignment_id}` : '/internal/verifications',
          },
        },
      });
    }

    // 2. Jika dokumen ini telah lengkap ditandatangani, cek apakah seluruh dokumen pada assignment selesai
    if (isAllSigned && doc.assignment_id) {
      const remainingUnsignedDocs = await tx.verificationDocument.count({
        where: {
          assignment_id: doc.assignment_id,
          document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'] },
          status: { notIn: ['SIGNED', 'SENT'] },
        },
      });

      if (remainingUnsignedDocs === 0) {
        // Seluruh dokumen verifikasi selesai ditandatangani -> transisi ke READY_TO_SEND
        await tx.verificationAssignment.update({
          where: { id: doc.assignment_id },
          data: { status: 'READY_TO_SEND' },
        });

        // Notifikasi ke Verifikator: Dokumen siap dikirim kepada Penerbit
        const assignment = await tx.verificationAssignment.findUnique({
          where: { id: doc.assignment_id },
          select: { verifier_id: true },
        });

        if (assignment?.verifier_id) {
          await tx.notification.create({
            data: {
              user_id: assignment.verifier_id,
              registration_id: doc.registration_id,
              type: 'READY_TO_SEND',
              title: `Dokumen siap dikirim kepada Penerbit: ${doc.registration?.registration_no || ''}`,
              payload: {
                assignment_id: doc.assignment_id,
                document_id: doc.id,
                registration_no: doc.registration?.registration_no,
                link: `/internal/verifications/${doc.assignment_id}`,
              },
            },
          });
        }
      }
    }

    return updatedDoc;
  }, { isolationLevel: 'ReadCommitted' });
}

/**
 * Memastikan dokumen telah selesai ditandatangani oleh seluruh signatory
 */
export async function assertDocumentFullySigned(tx, documentId) {
  const doc = await tx.verificationDocument.findUnique({
    where: { id: documentId },
    include: { signatories: true },
  });

  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');

  if (doc.status !== 'SIGNED') {
    fail(409, `Dokumen belum dapat dikirim karena tanda tangan belum lengkap (status dokumen: ${doc.status}).`);
  }

  const pending = doc.signatories.filter((s) => s.status !== 'SIGNED');
  if (pending.length > 0) {
    fail(409, `Dokumen masih menunggu tanda tangan dari: ${pending.map((p) => p.name_position_snapshot).join(', ')}.`);
  }

  return doc;
}

