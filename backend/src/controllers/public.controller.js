import { prisma } from '../config/database.js';

export const verifyDocumentByQrToken = async (req, res, next) => {
  try {
    const { token } = req.params;

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

    if (!doc || doc.status === 'DRAFT' || doc.status === 'SIGNED') {
      return res.status(404).json({
        success: false,
        message: 'Dokumen tanda tashih tidak ditemukan atau QR Token tidak valid.',
      });
    }

    const isExpired = doc.valid_until ? new Date() > new Date(doc.valid_until) : false;

    // Metadata terbatas yang aman untuk publik (tanpa mengekspos link file privat)
    const publicData = {
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
    };

    res.status(200).json({
      success: true,
      message: publicData.is_valid ? 'Dokumen aktif dan terdaftar di LPMQ.' : 'Dokumen terdaftar tetapi tidak berlaku.',
      data: publicData,
    });
  } catch (error) {
    next(error);
  }
};

export default { verifyDocumentByQrToken };
