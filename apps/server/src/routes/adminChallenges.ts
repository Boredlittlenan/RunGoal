import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';

export const adminChallengeRouter = Router();
adminChallengeRouter.use(adminAuthMiddleware);

// GET /api/admin/challenges
adminChallengeRouter.get('/', async (req: AdminRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) where.status = status;

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true } } },
      }),
      prisma.challenge.count({ where }),
    ]);

    res.json({ success: true, data: challenges, meta: { total, page, pageSize } });
  } catch (err) {
    next(err);
  }
});
