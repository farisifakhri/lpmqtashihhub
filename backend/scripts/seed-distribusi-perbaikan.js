// Dev saja: memajukan naskah yang berstatus "Perlu Perbaikan" (hasil sidang tashih) sampai "Menunggu Penugasan"
// tahap Perbaikan, lewat fungsi service asli: penerbit unggah rekap + kirim resi -> Admin Internal terima di loket
// -> Distributor terima serah-terima. Pakai: node scripts/seed-distribusi-perbaikan.js [REG_NO]
// Bawaan REG_NO: REG-PENUGASAN-UJI-0001 (jalankan seed-distribusi-penugasan.js + sidang + keputusan perbaikan dulu).
import 'dotenv/config';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prisma } from '../src/config/database.js';
import { upload } from '../src/services/storage.service.js';
import { dispatchPhysical } from '../src/services/registration.service.js';
import { receivePhysicalMaster } from '../src/services/verification-intake.service.js';
import { receiveHandover } from '../src/services/handover.service.js';
import { resolveTashihRound } from '../src/services/workflow-utils.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const REG_NO = process.argv[2] || 'REG-PENUGASAN-UJI-0001';
const req = { ip: '127.0.0.1', headers: { 'user-agent': 'seed-distribusi-perbaikan' } };
const asUser = async (id) => {
  const u = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } }, publisher: true } });
  const roles = u.roles.map(r => r.role.code);
  return { id: u.id, name: u.name, email: u.email, roles, activeRole: roles[0], isPemaraf: false, publisherId: u.publisher?.id || null, publisher: u.publisher };
};

const reg = await prisma.registration.findUnique({ where: { registration_no: REG_NO }, include: { publisher: true } });
if (!reg) throw new Error(`${REG_NO} tidak ditemukan.`);
const round = await resolveTashihRound(prisma, reg);
if (reg.status !== 'REVISION_REQUIRED' || !round.isTashihRevision || round.revisionKind !== 'CORRECTION') {
  throw new Error(`${REG_NO} harus berstatus Perlu Perbaikan dengan surat pengembalian jenis Naskah Perbaikan (sekarang: ${reg.status}, ${round.lastRevLetter?.content_snapshot?.revision_kind || 'tanpa surat'}).`);
}
const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'ADMIN_INTERNAL' } } } }, select: { id: true } });
if (!reg.publisher?.user_id || !admin || !reg.core_distributor_id) throw new Error('Butuh akun penerbit, Admin Internal aktif, dan distributor tim inti.');
const publisher = await asUser(reg.publisher.user_id);

// 1. Penerbit: unggah rekap perbaikan lalu kirim naskah perbaikan via kurir.
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
doc.addPage([595, 842]).drawText(`Rekap Perbaikan Ronde #${round.roundNumber}: ${REG_NO}`, { x: 50, y: 780, size: 14, font });
const recap = await upload(Buffer.from(await doc.save()), 'application/pdf', publisher);
const trackingNo = `JNE-PERBAIKAN-${Date.now()}`;
await dispatchPhysical(reg.id, { courier: 'JNE', tracking_no: trackingNo, recap_file_id: recap.id }, publisher, req);

// 2. Admin Internal: terima naskah perbaikan di loket (otomatis membuat BAST ke distributor).
await receivePhysicalMaster(reg.id, { decision: 'RECEIVED', receipt_no: `TT-PERBAIKAN-${Date.now()}`, condition: 'BAIK', volume_count: 30 }, await asUser(admin.id), req);

// 3. Distributor: terima serah-terima -> Menunggu Penugasan.
const handover = await prisma.physicalManuscriptHandover.findFirst({ where: { registration_id: reg.id, status: 'PENDING' }, orderBy: { created_at: 'desc' } });
if (!handover) throw new Error('BAST Admin -> Distributor tidak terbentuk.');
await receiveHandover(handover.id, { condition: 'BAIK', volume_count: 30 }, await asUser(reg.core_distributor_id), req);

const after = await prisma.registration.findUnique({ where: { id: reg.id }, select: { status: true } });
console.log(`Siap diuji: ${REG_NO} -> ${after.status} (Perbaikan Ronde #${round.roundNumber}, resi ${trackingNo})`);
console.log('Buka sebagai distributor: /internal/distributions/assignment -> tab 2 -> "Mulai Penugasan" (tahap Perbaikan)');
await prisma.$disconnect();
