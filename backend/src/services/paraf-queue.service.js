// Antrean Paraf: seluruh dokumen yang menunggu paraf Pemaraf yang sedang login, dari keempat alur
// (hasil verifikasi, keputusan sidang distributor, surat persetujuan master, draf STT) dalam satu daftar.
// Hanya membaca; paraf tetap dibubuhkan lewat endpoint masing-masing alur sehingga semua aturannya berlaku.
import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';
import { parafSigners, assignedPemarafIds } from './paraf.service.js';
import { sttParafsOf, sttParafRequired, isSttParafComplete } from './official-document.service.js';

const VERIFICATION_DOC_TYPES = ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'];
const DECISION_LABELS = { PASSED: 'Lulus tashih', REVISION_REQUIRED: 'Perlu perbaikan', REJECTED: 'Ditolak' };
const regSelect = {
  id: true, registration_no: true, title: true, status: true, created_at: true,
  publisher: { select: { legal_name: true } },
  service_type: { select: { name: true, category: { select: { name: true } } } },
};
// Kolom bersama untuk item berbasis pengajuan naskah (referensi, naskah, profil layanan).
const regFields = (reg) => ({
  reference: reg?.registration_no, title: reg?.title, publisher: reg?.publisher?.legal_name || null, submitted_at: reg?.created_at,
  service: { name: reg?.service_type?.name || null, category: reg?.service_type?.category?.name || null },
});

/** Pemaraf ini ditunjuk (atau dokumen lama tanpa penunjukan) dan belum memaraf. */
export const isWaitingForMe = (userId, assigned, signerIds) =>
  (!Array.isArray(assigned) || assigned.includes(userId)) && !signerIds.includes(userId);

export async function listMyParafQueue(user) {
  if (!user?.isPemaraf) fail(403, 'Antrean paraf hanya untuk akun dengan peran Pemaraf.');

  // shortcut: hanya paraf yang permohonannya sudah dibuka (baris approval_parafs ada); alur lama tanpa penunjukan
  // Pemaraf tidak tampil di sini dan tetap diparaf dari halaman asalnya.
  const rows = (await prisma.approvalParaf.findMany({
    where: { signed_at: null, subject_type: { in: ['VERIFICATION_RESULT', 'DISTRIBUTOR_REVIEW', 'MASTER_LETTER'] } },
    orderBy: { created_at: 'asc' },
    take: 300,
  })).filter(row => isWaitingForMe(user.id, assignedPemarafIds(row), parafSigners(row).map(s => s.id)));
  const idsOf = (type) => rows.filter(row => row.subject_type === type).map(row => row.subject_id);
  const parafOf = (type, id) => rows.find(row => row.subject_type === type && row.subject_id === id);
  const progressOf = (row) => ({ paraf_done: parafSigners(row).length, paraf_required: row.required_count || 2, requested_at: row.created_at });

  const requesterIds = [...new Set(rows.filter(row => row.subject_type === 'DISTRIBUTOR_REVIEW').map(row => row.requested_by_id).filter(Boolean))];
  const [assignments, verificationDocs, registrations, letters, sttDocs, requesters] = await Promise.all([
    prisma.verificationAssignment.findMany({
      where: { id: { in: idsOf('VERIFICATION_RESULT') } },
      select: { id: true, verifier: { select: { name: true } }, registration: { select: regSelect } },
    }),
    prisma.verificationDocument.findMany({
      where: { assignment_id: { in: idsOf('VERIFICATION_RESULT') }, status: 'SUBMITTED', document_type: { in: VERIFICATION_DOC_TYPES } },
      select: { id: true, assignment_id: true, document_type: true },
    }),
    prisma.registration.findMany({ where: { id: { in: idsOf('DISTRIBUTOR_REVIEW') } }, select: regSelect }),
    prisma.masterMushafRequest.findMany({
      where: { id: { in: idsOf('MASTER_LETTER') }, status: 'MENUNGGU_TTE' },
      select: { id: true, request_code: true, letter_number: true, mushaf_type_label: true, institution: true, created_at: true, letter_drafted_by_id: true, letter_drafted_by: { select: { name: true } }, publisher: { select: { legal_name: true } } },
    }),
    prisma.officialDocument.findMany({
      where: { document_type: 'SURAT_TANDA_TASHIH', status: 'DRAFT' },
      select: { id: true, document_no: true, content_snapshot: true, created_at: true, registration: { select: regSelect } },
      take: 300,
    }),
    prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, name: true } }),
  ]);

  const items = [];
  for (const assignment of assignments) {
    const reg = assignment.registration;
    // Dokumen dikembalikan/sudah disahkan -> tidak lagi menunggu paraf.
    if (reg?.status !== 'WAITING_VERIFICATION_APPROVAL') continue;
    const docs = verificationDocs.filter(doc => doc.assignment_id === assignment.id);
    const doc = docs.find(d => d.document_type !== 'BERITA_ACARA_VERIFIKASI') || docs[0];
    if (!doc) continue;
    items.push({
      type: 'VERIFICATION_RESULT', type_label: 'Hasil Verifikasi', subject_id: assignment.id, action_id: doc.id,
      ...regFields(reg), people: [{ role: 'Verifikator', name: assignment.verifier?.name }],
      detail: 'Surat Hasil & Berita Acara Verifikasi',
      link: `/internal/verifications/${assignment.id}`, ...progressOf(parafOf('VERIFICATION_RESULT', assignment.id)),
    });
  }
  for (const reg of registrations) {
    const row = parafOf('DISTRIBUTOR_REVIEW', reg.id);
    if (row.head_approved_at) continue;
    items.push({
      type: 'DISTRIBUTOR_REVIEW', type_label: 'Keputusan Sidang', subject_id: reg.id, action_id: reg.id,
      ...regFields(reg), people: [{ role: 'Distributor', name: requesters.find(u => u.id === row.requested_by_id)?.name }],
      detail: `Keputusan: ${DECISION_LABELS[row.payload?.result] || row.payload?.result || '-'}`,
      link: `/internal/distributions/monitoring?review=${reg.id}`, ...progressOf(row),
    });
  }
  for (const letter of letters) {
    // Penyusun surat tidak memaraf/menandatangani suratnya sendiri.
    if (letter.letter_drafted_by_id === user.id) continue;
    items.push({
      type: 'MASTER_LETTER', type_label: 'Surat Master', subject_id: letter.id, action_id: letter.id,
      reference: letter.letter_number || letter.request_code, title: letter.mushaf_type_label,
      publisher: letter.publisher?.legal_name || letter.institution, submitted_at: letter.created_at,
      service: { name: 'Master Mushaf', category: `Permohonan ${letter.request_code}` },
      people: [{ role: 'Admin', name: letter.letter_drafted_by?.name }],
      detail: 'Surat Persetujuan Master',
      link: '/internal/signatures', ...progressOf(parafOf('MASTER_LETTER', letter.id)),
    });
  }
  for (const doc of sttDocs) {
    const snapshot = typeof doc.content_snapshot === 'string' ? JSON.parse(doc.content_snapshot) : (doc.content_snapshot || {});
    const tu = snapshot.tu_workflow;
    if (!tu?.submitted_at || isSttParafComplete(tu)) continue;
    if (!['READY_FOR_STT', 'STT_ISSUED'].includes(doc.registration?.status)) continue;
    const parafs = sttParafsOf(tu);
    if (!isWaitingForMe(user.id, tu.pemaraf_ids, parafs.map(p => p.signed_by?.id))) continue;
    items.push({
      type: 'STT', type_label: 'Draf STT', subject_id: doc.id, action_id: doc.id,
      ...regFields(doc.registration), reference: doc.registration?.registration_no || doc.document_no,
      people: [{ role: 'Pengaju', name: tu.submitted_by?.name }],
      detail: 'Surat Tanda Tashih',
      link: '/internal/signatures', paraf_done: parafs.length, paraf_required: sttParafRequired(tu),
      requested_at: tu.submitted_at,
    });
  }

  // Yang paling lama menunggu di atas.
  return items
    .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at))
    .map((item, index) => ({ ...item, queue_position: index + 1 }));
}
