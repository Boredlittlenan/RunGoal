import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';
import { createError } from '../middleware/errorHandler.js';

export const adminUserRouter = Router();
adminUserRouter.use(adminAuthMiddleware);

// GET /api/admin/users
adminUserRouter.get('/', async (req: AdminRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { nickname: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { runs: true } },
          runs: { orderBy: { startedAt: 'desc' }, take: 1, select: { startedAt: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: { total, page, pageSize },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id
adminUserRouter.get('/:id', async (req: AdminRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        runs: { orderBy: { startedAt: 'desc' } },
        goals: { orderBy: { createdAt: 'desc' }, include: { records: true } },
        achievements: { orderBy: { unlockedAt: 'desc' } },
        challenges: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) throw createError('用户不存在', 404);

    // 脱敏密码
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id
adminUserRouter.put('/:id', async (req: AdminRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const { nickname, weight, height } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: { nickname, weight, height },
      select: { id: true, nickname: true, weight: true, height: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
