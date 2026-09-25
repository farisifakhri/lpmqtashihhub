import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

export function listMyNotifications(user) {
  return prisma.notification.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

export async function markNotificationRead(id, user) {
  const notification = await prisma.notification.findFirst({
    where: { id, user_id: user.id },
  });
  if (!notification) fail(404, 'Notifikasi tidak ditemukan.');
  await prisma.notification.updateMany({
    where: { id, user_id: user.id, read_at: null },
    data: { read_at: new Date() },
  });
  return prisma.notification.findUnique({ where: { id } });
}
