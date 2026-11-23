// Dev saja: 3 akun Pemaraf uji (agar ada pilihan: 2 ditunjuk, 1 tidak) + cek akun internal bawaan seed.
// Aman diulang: akun di-upsert; password akun yang sudah ada tidak diubah.
// Pakai: node scripts/seed-pemaraf-uji.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'password123';
const PEMARAF = [
  { email: 'pemaraf.satu@lpmq.kemenag.go.id', name: 'Pemaraf Satu (Uji)' },
  { email: 'pemaraf.dua@lpmq.kemenag.go.id', name: 'Pemaraf Dua (Uji)' },
  { email: 'pemaraf.tiga@lpmq.kemenag.go.id', name: 'Pemaraf Tiga (Uji)' },
];

const role = await prisma.role.findUnique({ where: { code: 'PEMARAF' } });
if (!role) throw new Error('Role PEMARAF belum ada. Jalankan seed utama dulu.');
const hash = await bcrypt.hash(PASSWORD, 10);
for (const { email, name } of PEMARAF) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { status: 'ACTIVE' },
    create: { name, email, password_hash: hash, status: 'ACTIVE' },
  });
  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
    update: {},
    create: { user_id: user.id, role_id: role.id },
  });
}

console.log('Akun uji (password: %s):', PASSWORD);
const emails = [
  ...PEMARAF.map(p => p.email),
  'verifikator@lpmq.kemenag.go.id', 'distributor@lpmq.kemenag.go.id', 'dokumentator@lpmq.kemenag.go.id',
  'admin.internal@lpmq.kemenag.go.id', 'kepala@lpmq.kemenag.go.id',
];
for (const email of emails) {
  const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
  if (!user) { console.log(`  - ${email}: TIDAK ADA`); continue; }
  const ok = user.password_hash && await bcrypt.compare(PASSWORD, user.password_hash);
  console.log(`  - ${email} [${user.roles.map(r => r.role.code).join(', ')}] ${user.status}${ok ? '' : ' (password BUKAN default, tidak diubah)'}`);
}
await prisma.$disconnect();
