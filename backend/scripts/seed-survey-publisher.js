// Dev saja: akun penerbit contoh yang sudah mengisi semua survei AKTIF (IKM & IPAK), agar laporan
// dan halaman hasil survei punya data. Aman diulang: akun/pengajuan di-upsert, survei yang sudah diisi dilewati.
// Pakai: node scripts/seed-survey-publisher.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database.js';
import { submitSurveyResponse } from '../src/services/survey.service.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const EMAIL = 'penerbit.survei@contoh.id';
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'password123';
const REG_NO = 'REG-SURVEI-CONTOH-0001';

const role = await prisma.role.findUnique({ where: { code: 'PENERBIT' } });
if (!role) throw new Error('Peran PENERBIT belum ada; jalankan prisma seed dulu.');
const serviceType = await prisma.serviceType.findFirst({ where: { name: { contains: '30 Juz' } } }) || await prisma.serviceType.findFirst();
if (!serviceType) throw new Error('Jenis layanan belum ada; jalankan prisma seed dulu.');

const user = await prisma.user.upsert({
  where: { email: EMAIL },
  update: { status: 'ACTIVE' },
  create: { name: 'Penerbit Contoh Survei', email: EMAIL, password_hash: await bcrypt.hash(PASSWORD, 10), status: 'ACTIVE' },
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
    user_id: user.id, legal_name: 'CV Contoh Survei Mushaf', entity_type: 'CV', verification_status: 'VERIFIED',
    address: 'Jl. Contoh No. 1, Kota Bandung, Jawa Barat', phone: '081200000000',
  },
});
const registration = await prisma.registration.upsert({
  where: { registration_no: REG_NO },
  update: {},
  create: { registration_no: REG_NO, publisher_id: publisher.id, service_type_id: serviceType.id, title: 'Mushaf Contoh Pengisian Survei' },
});

const surveys = await prisma.survey.findMany({
  where: { status: 'AKTIF', items: { some: {} } },
  orderBy: { sort_order: 'asc' },
  include: { items: { orderBy: { sort_order: 'asc' }, include: { question: { include: { options: { orderBy: { value: 'desc' } } } } } } },
});
const actor = { id: user.id, roles: ['PENERBIT'] };
const req = { headers: {}, ip: '127.0.0.1', get: () => undefined };

for (const [index, survey] of surveys.entries()) {
  if (await prisma.surveyResponse.findFirst({ where: { survey_id: survey.id, registration_id: registration.id } })) {
    console.log(`- ${survey.name}: sudah diisi, dilewati`);
    continue;
  }
  // Jawaban bervariasi: sebagian besar nilai tertinggi (4), tiap pertanyaan ketiga bernilai 3.
  const answers = survey.items.map((item, i) => (item.question.type === 'ESAI'
    ? { question_id: item.question_id, essay_text: 'Pelayanan sudah baik dan jelas.' }
    : { question_id: item.question_id, option_id: item.question.options[i % 3 === 2 ? 1 : 0].id }));
  const isLast = index === surveys.length - 1;
  await submitSurveyResponse(survey.id, registration.id, {
    answers,
    respondent_name: 'Ahmad Contoh', gender: 'L', age: 35, education: 'S1', occupation: 'SWASTA',
    ...(isLast ? { overall_satisfaction: 5, nps_score: 9, ak_transparency: 5, ak_no_extortion: 5, ak_no_broker: 5, ak_no_gratification: 5, feedback: 'Pertahankan pelayanannya.' } : {}),
  }, actor, req);
  console.log(`✔ ${survey.name}: ${answers.length} jawaban terkirim`);
}

console.log(`\nAkun penerbit: ${EMAIL} / ${PASSWORD} (pengajuan ${REG_NO})`);
await prisma.$disconnect();
