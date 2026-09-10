import { statusLabel, roleLabel } from '../utils/user-messages.js';

export function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

export function requireRole(user, roles) {
  if (!user.roles.some(role => roles.includes(role))) fail(403, `Tindakan ini hanya dapat dilakukan oleh ${roles.map(roleLabel).join(' atau ')}. Gunakan akun dengan kewenangan tersebut atau hubungi petugas terkait.`);
}

export async function registration(tx, id) {
  const reg = await tx.registration.findUnique({ where: { id } });
  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');
  // Serialize every domain mutation against the parent registration.
  await tx.$queryRaw`SELECT id FROM registrations WHERE id = ${id} FOR UPDATE`;
  return tx.registration.findUnique({ where: { id } });
}

export async function audit(tx, user, action, subjectType, subjectId, after) {
  await tx.auditLog.create({ data: {
    actor_id: user.id, action, subject_type: subjectType, subject_id: subjectId,
    after_json: JSON.parse(JSON.stringify(after)),
  } });
}

export async function move(tx, reg, status, user, notes) {
  const result = await tx.registration.updateMany({
    where: { id: reg.id, status: reg.status }, data: { status },
  });
  if (result.count !== 1) fail(409, 'Status pengajuan berubah. Muat ulang dan coba kembali.');
  await tx.statusHistory.create({ data: {
    registration_id: reg.id, from_status: reg.status, to_status: status, actor_id: user.id, notes,
  } });
  await audit(tx, user, 'STATUS_TRANSITION', 'Registration', reg.id, { from: reg.status, to: status, notes });
}

export function requireStatus(reg, statuses) {
  if (!statuses.includes(reg.status)) fail(409, `Pengajuan saat ini berstatus "${statusLabel(reg.status)}". Tindakan ini tersedia pada status "${statuses.map(statusLabel).join('" atau "')}". Muat ulang detail pengajuan untuk melihat langkah berikutnya.`);
}

export function requireOwner(reg, user) {
  requireRole(user, ['ADMIN_PENERBIT']);
  if (!user.publisherId || reg.publisher_id !== user.publisherId) fail(403, 'Pengajuan bukan milik penerbit Anda.');
}
