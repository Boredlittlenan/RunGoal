import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';
import { createError } from '../middleware/errorHandler.js';

export const adminRunRouter = Router();
adminRunRouter.use(adminAuthMiddleware);

// GET /api/admin/runs
adminRunRouter.get('/', async (req: AdminRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const source = req.query.source as string | undefined;

    const where: any = {};
    if (source) where.source = source;

    const [runs, total] = await Promise.all([
      prisma.run.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true } } },
      }),
      prisma.run.count({ where }),
    ]);

    res.json({
      success: true,
      data: runs,
      meta: { total, page, pageSize },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/runs/:id
adminRunRouter.get('/:id', async (req: AdminRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        user: { select: { nickname: true, phone: true } },
        goalRecords: { include: { goal: { select: { title: true } } } },
      },
    });
    if (!run) throw createError('记录不存在', 404);
    res.json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/runs/:id
adminRunRouter.delete('/:id', async (req: AdminRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const run = await prisma.run.findUnique({ where: { id } });
    if (!run) throw createError('记录不存在', 404);

    await prisma.run.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
