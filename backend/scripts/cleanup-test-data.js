import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Exact fixtures in the checked-in integration runner. Never LIKE '%uji%'.
const fixtures = [
  "Mushaf Al-Qur'an Standar Indonesia Uji Coba Sprint 0",
  'Pengujian Alur Pembayaran dan Sidang', 'Naskah Intake SOP Verifikasi',
  'Naskah Master Dikembalikan', 'Naskah Uji Review Verifikator',
  'Mushaf Standar Indonesia Uji Persetujuan & Pembayaran',
  "Mushaf Al-Qur'an Uji RBAC Hardening PR-VER-07",
  'Mushaf Pengujian Timeline Lintas Peran Sanitasi',
  'Mushaf Standar Uji Serah Terima Master Fisik',
  'Mushaf Uji Pengembalian Fisik', 'Naskah Unggah Privat',
];
const db = new PrismaClient();
try {
  const target = new URL(process.env.DATABASE_URL);
  const candidates = await db.registration.findMany({ where: { title: { in: fixtures } }, select: { id: true, registration_no: true, title: true }, orderBy: { registration_no: 'asc' } });
  // JavaScript comparison is case-sensitive even when MySQL collation is not.
  if (candidates.some(item => !fixtures.includes(item.title))) throw new Error('Non-exact fixture match; refusing cleanup.');
  console.log(JSON.stringify({ database: target.pathname.slice(1), total: await db.registration.count(), fixture_candidates: candidates.length, preserved: await db.registration.count() - candidates.length }));
  if (!process.argv.includes('--execute')) {
    console.log('Preview only. Execution requires --expected=N --backup=FULL_DUMP_PATH --execute.');
  } else {
    const expected = Number(process.argv.find(arg => arg.startsWith('--expected='))?.slice(11));
    const backupArg = process.argv.find(arg => arg.startsWith('--backup='))?.slice(9);
    if (!backupArg || !Number.isSafeInteger(expected) || expected < 1 || candidates.length !== expected) throw new Error('Explicit expected count / backup missing or candidate count changed.');
    const backup = path.resolve(backupArg);
    const metadata = JSON.parse(await readFile(`${backup}.json`, 'utf8'));
    if (metadata.database !== decodeURIComponent(target.pathname.slice(1)) || metadata.host !== target.hostname) throw new Error('Backup belongs to a different database.');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(backup)) hash.update(chunk);
    if (hash.digest('hex') !== metadata.sha256) throw new Error('Backup checksum mismatch.');
    const ids = candidates.map(item => item.id);
    if (ids.some(id => !/^[a-f0-9-]{36}$/i.test(id))) throw new Error('Unexpected registration ID.');
    const sqlIds = ids.map(id => `'${id}'`).join(',');
    const manifest = `${backup}.cleanup.json`;
    await writeFile(manifest, JSON.stringify({ database: metadata.database, backup, expected, candidates, completed: false }, null, 2), { flag: 'wx' });
    const result = await db.$transaction(async tx => {
      const parents = await tx.$queryRawUnsafe(`SELECT id, title FROM registrations WHERE id IN (${sqlIds}) FOR UPDATE`);
      if (parents.length !== expected || parents.some(item => !fixtures.includes(item.title))) throw new Error('Targets changed; cleanup rolled back.');
      const foreignKeys = await tx.$queryRaw`SELECT TABLE_NAME AS table_name, DELETE_RULE AS delete_rule FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'registrations'`;
      if (foreignKeys.some(fk => fk.table_name !== 'registrations' && fk.delete_rule !== 'CASCADE')) throw new Error('Unexpected non-cascading FK; refusing cleanup.');
      const externalExtensions = await tx.$queryRawUnsafe(`SELECT id FROM registrations WHERE previous_registration_id IN (${sqlIds}) AND id NOT IN (${sqlIds})`);
      if (externalExtensions.length) throw new Error('A retained extension references a fixture; refusing cleanup.');
      const preservedAccounts = await tx.user.count();
      const preservedPublishers = await tx.publisher.count();
      const preservedAudit = await tx.auditLog.count();
      const before = await tx.registration.count();
      const deleted = await tx.$executeRawUnsafe(`DELETE FROM registrations WHERE id IN (${sqlIds})`);
      const after = await tx.registration.count();
      if (deleted !== expected || before - after !== expected || await tx.user.count() !== preservedAccounts || await tx.publisher.count() !== preservedPublishers || await tx.auditLog.count() !== preservedAudit) throw new Error('Post-delete count mismatch; rolling back.');
      return { deleted, remaining: after, accounts: preservedAccounts, publishers: preservedPublishers, audit_logs: preservedAudit };
    }, { timeout: 60000, isolationLevel: 'Serializable' });
    await writeFile(manifest, JSON.stringify({ database: metadata.database, backup, expected, candidates, completed: true, result, completed_at: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ ...result, manifest, backup, restored_by: 'Restore the full SQL backup to a separate database first. Do not overwrite live changes.' }));
  }
} finally { await db.$disconnect(); }
