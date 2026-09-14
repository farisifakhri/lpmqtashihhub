import { prisma } from '../config/database.js';

export const logAudit = async ({
  actorId = null,
  action,
  subjectType,
  subjectId = null,
  beforeJson = null,
  afterJson = null,
  req = null,
}) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      userAgent = req.headers['user-agent'] || null;
      if (!actorId && req.user) {
        actorId = req.user.id;
      }
    }

    return await prisma.auditLog.create({
      data: {
        actor_id: actorId,
        action,
        subject_type: subjectType,
        subject_id: subjectId ? String(subjectId) : null,
        before_json: beforeJson,
        after_json: afterJson,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  } catch (error) {
    console.error('[Audit Log Error]: Gagal mencatat audit log:', error);
    // Audit log failure should not crash main transaction unless required by strict compliance
    return null;
  }
};

export default { logAudit };
