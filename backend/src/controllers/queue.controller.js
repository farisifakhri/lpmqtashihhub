import { prisma } from '../config/database.js';
import { QUEUE_CONFIG } from '../services/queue.config.js';

export const getQueueCounts = async (req, res, next) => {
  try {
    const queues = QUEUE_CONFIG[req.activeRole] || [];
    const counts = await Promise.all(queues.map(async ({ key, model, buildWhere }) => {
      const count = await prisma[model].count({ where: buildWhere(req.user) });
      return [key, count];
    }));

    res.status(200).json({
      success: true,
      data: Object.fromEntries(counts),
    });
  } catch (error) {
    next(error);
  }
};
