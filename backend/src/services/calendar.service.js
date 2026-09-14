import { prisma } from '../config/database.js';
import { audit, requireRole } from './workflow-utils.js';

export const updateCalendar = (days, user) => prisma.$transaction(async tx => {
  requireRole(user, ['SUPERADMIN']);
  for (const day of days) {
    const data = { ...day, date: new Date(`${day.date}T00:00:00Z`), updated_by: user.id };
    await tx.workingDay.upsert({ where: { date: data.date }, create: data, update: data });
  }
  await audit(tx, user, 'UPDATE_WORKING_CALENDAR', 'WorkingDay', null, { days });
  return { count: days.length };
});
