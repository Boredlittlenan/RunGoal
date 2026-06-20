import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';

export const adminGoalRouter = Router();
adminGoalRouter.use(adminAuthMiddleware);

// GET /api/admin/goals
adminGoalRouter.get('/', async (req: AdminRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as string | undefined;

    const where: any = {};
    if (type) where.type = type;

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true } } },
      }),
      prisma.goal.count({ where }),
    ]);

    res.json({ success: true, data: goals, meta: { total, page, pageSize } });
  } catch (err) {
    next(err);
  }
});
