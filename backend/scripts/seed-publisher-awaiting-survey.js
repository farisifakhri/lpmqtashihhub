// Dev saja: akun penerbit yang pengajuannya sudah melewati semua tahap (STT terbit),
// tinggal mengisi survei sebelum STT bisa dibuka/diunduh. Survei sengaja TIDAK diisi.
// Aman diulang: akun, pengajuan, dan STT di-upsert; berkas PDF dibuat sekali.
// Pakai: node scripts/seed-publisher-awaiting-survey.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prisma } from '../src/config/database.js';
import { upload } from '../src/services/storage.service.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const EMAIL = 'penerbit.siapsurvei@contoh.id';
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'password123';
const REG_NO = 'REG-SIAP-SURVEI-0001';
const STT_NO = 'STT-CONTOH-SIAP-SURVEI-0001';

const role = await prisma.role.findUnique({ where: { code: 'PENERBIT' } });
const serviceType = await prisma.serviceType.findFirst({ where: { name: { contains: '30 Juz' } } }) || await prisma.serviceType.findFirst();
const admin = await prisma.user.findFirst({ where: { roles: { some: { role: { code: 'SUPERADMIN' } } } } });
if (!role || !serviceType || !admin) throw new Error('Data dasar (peran, jenis layanan, Super Admin) belum ada; jalankan prisma seed dulu.');

const user = await prisma.user.upsert({
  where: { email: EMAIL },
  update: { status: 'ACTIVE' },
  create: { name: 'Penerbit Siap Survei', email: EMAIL, password_hash: await bcrypt.hash(PASSWORD, 10), status: 'ACTIVE' },
});
await prisma.userRole.upsert({
  where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
  update: {},
  create: { user_id: user.id, role_id: role.id },
});
const publisher = await prisma.publisher.upsert({
  where: { user_id: user.id },
  update: { verification_status: 'VERIFIED' },
  create: {
    user_id: user.id, legal_name: 'CV Siap Survei Mushaf', entity_type: 'CV', verification_status: 'VERIFIED',
    address: 'Jl. Contoh No. 2, Kota Yogyakarta, DI Yogyakarta', phone: '081200000001',
  },
});
// Semua tahap dilewati: pengajuan langsung berstatus STT terbit.
const registration = await prisma.registration.upsert({
  where: { registration_no: REG_NO },
  update: { status: 'STT_ISSUED' },
  create: {
    registration_no: REG_NO, publisher_id: publisher.id, service_type_id: serviceType.id,
    title: 'Mushaf Contoh Siap Survei', status: 'STT_ISSUED',
  },
});

let stt = await prisma.officialDocument.findUnique({ where: { document_no: STT_NO } });
if (!stt) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('SURAT TANDA TASHIH (CONTOH)', { x: 150, y: 760, size: 18, font });
  [`Nomor: ${STT_NO}`, `Pengajuan: ${REG_NO}`, 'Judul: Mushaf Contoh Siap Survei', 'Penerbit: CV Siap Survei Mushaf',
    'Dokumen ini hanya data contoh untuk pengujian alur survei.'].forEach((line, i) => page.drawText(line, { x: 72, y: 700 - i * 22, size: 12, font: body }));
  const file = await upload(Buffer.from(await pdf.save()), 'application/pdf', admin);
  const issued = new Date();
  stt = await prisma.officialDocument.create({
    data: {
      registration_id: registration.id, document_type: 'SURAT_TANDA_TASHIH', document_no: STT_NO, status: 'ISSUED',
      file_id: file.id, issued_at: issued, valid_until: new Date(issued.getTime() + 2 * 365 * 24 * 3600 * 1000),
    },
  });
}

const pending = await prisma.survey.findMany({ where: { status: 'AKTIF', items: { some: {} } }, select: { name: true } });
console.log(`Akun penerbit: ${EMAIL} / ${PASSWORD}`);
console.log(`Pengajuan ${REG_NO} (STT_ISSUED), STT ${STT_NO} terbit. Survei yang perlu diisi: ${pending.map((s) => s.name).join(', ') || '-'}`);
await prisma.$disconnect();
