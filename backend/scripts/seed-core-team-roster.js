import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database.js';
import { configureCoreTeams } from '../src/services/core-team.service.js';
import { CORE_TEAM_NAMES } from '../prisma/core-team-roster.js';

const positions = [
  ['verifier_id', 'VERIFIKATOR'],
  ['distributor_id', 'DISTRIBUTOR'],
  ['documenter_id', 'DOKUMENTATOR'],
];
const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
const directory = path.resolve('storage/credentials');
const file = path.join(directory, `core-team-${database}.json`);
const entries = CORE_TEAM_NAMES.flatMap((names, index) => positions.map(([, role], position) => ({
  team_number: index + 1,
  role,
  name: names[position],
  email: `tim${String(index + 1).padStart(2, '0')}-${role.toLowerCase()}@roster.lpmq.invalid`,
})));

const normalize = (str) =>
  (str || '')
    .toLowerCase()
    .replace(/\b(dr|dra|drs|h|hj|lc|ma|m\.ag|m\.a|s\.ag|s\.th\.i|s\.s|s\.s\.i|s\.pd|s\.h|m\.si)\.?\s*/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

try {
  if (await prisma.coreTeamRoster.count()) throw new Error('Roster sudah tersedia. Tidak ada akun atau tim yang diubah.');
  await mkdir(directory, { recursive: true });
  let credentials;
  try { credentials = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    credentials = entries.map(entry => ({ ...entry, password: randomBytes(18).toString('base64url') }));
    await writeFile(file, JSON.stringify(credentials, null, 2), { flag: 'wx', mode: 0o600 });
  }
  if (credentials.length !== 27 || credentials.some((item, index) => item.email !== entries[index].email || item.name !== entries[index].name)) {
    // Regenerate credentials if name format in core-team-roster was standardized
    credentials = entries.map(entry => ({ ...entry, password: randomBytes(18).toString('base64url') }));
    await writeFile(file, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  }
  const roles = Object.fromEntries(await Promise.all(positions.map(async ([, code]) => {
    const role = await prisma.role.findUnique({ where: { code } });
    if (!role) throw new Error(`Peran ${code} belum tersedia; jalankan seed dasar terlebih dahulu.`);
    return [code, role];
  })));
  const ids = new Map();
  for (const entry of credentials) {
    let account = await prisma.user.findUnique({ where: { email: entry.email }, include: { roles: { include: { role: true } } } });
    if (!account) {
      let matches = await prisma.user.findMany({
        where: { name: entry.name, status: 'ACTIVE' },
        include: { roles: { include: { role: true } } },
      });
      if (matches.length === 0) {
        const allActive = await prisma.user.findMany({
          where: { status: 'ACTIVE' },
          include: { roles: { include: { role: true } } },
        });
        const targetNorm = normalize(entry.name);
        matches = allActive.filter((u) => normalize(u.name) === targetNorm);
      }
      if (matches.length > 0) {
        account = matches[0];
      }
    }
    if (!account) {
      account = await prisma.user.create({ data: {
        name: entry.name,
        email: entry.email,
        whatsapp_number: null,
        password_hash: await bcrypt.hash(entry.password, 10),
        status: 'ACTIVE',
        roles: { create: { role_id: roles[entry.role].id } },
      }, include: { roles: { include: { role: true } } } });
    } else {
      // Pastikan peran posisi tim inti ditambahkan ke akun resmi tanpa membuat akun ganda
      if (!account.roles.some((item) => item.role.code === entry.role)) {
        await prisma.userRole.upsert({
          where: {
            user_id_role_id: {
              user_id: account.id,
              role_id: roles[entry.role].id,
            },
          },
          update: {},
          create: {
            user_id: account.id,
            role_id: roles[entry.role].id,
          },
        });
        account = await prisma.user.findUnique({
          where: { id: account.id },
          include: { roles: { include: { role: true } } },
        });
      }
    }
    if (account.status !== 'ACTIVE' || !account.roles.some(item => item.role.code === entry.role)) {
      throw new Error(`Akun ${account.email} tidak cocok dengan posisi ${entry.role}.`);
    }
    ids.set(`${entry.team_number}:${entry.role}`, account.id);
  }
  const teams = CORE_TEAM_NAMES.map((_, index) => ({
    team_number: index + 1,
    ...Object.fromEntries(positions.map(([field, role]) => [field, ids.get(`${index + 1}:${role}`)])),
  }));
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'SUPERADMIN' } } } } });
  if (!admin) throw new Error('Superadmin aktif diperlukan untuk mengaudit aktivasi roster.');
  await configureCoreTeams(teams, 'Aktivasi sembilan tim dari daftar resmi 24 September 2026', { id: admin.id, name: admin.name, roles: ['SUPERADMIN'] });
  console.log(JSON.stringify({ created_or_matched: ids.size, roster_teams: teams.length, credential_file: file, whatsapp: 'Belum diisi dan belum diverifikasi' }));
} finally {
  await prisma.$disconnect();
}
