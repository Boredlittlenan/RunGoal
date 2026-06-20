import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const goalRouter = Router();
goalRouter.use(authMiddleware);

// GET /api/goals
goalRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { records: true },
    });
    res.json({ success: true, data: goals });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals
goalRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { title, type, targetValue, unit, period, startDate, endDate } = req.body;

    if (!title || !type || !targetValue || !unit || !period || !startDate) {
      throw createError('缺少必要字段', 400);
    }

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title,
        type,
        targetValue,
        unit,
        period,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id
goalRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.userId },
      include: { records: { include: { run: true } } },
    });
    if (!goal) throw createError('目标不存在', 404);
    res.json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
});

// PUT /api/goals/:id
goalRouter.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.userId },
    });
    if (!goal) throw createError('目标不存在', 404);

    const updated = await prisma.goal.update({
      where: { id },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/goals/:id
goalRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.userId },
    });
    if (!goal) throw createError('目标不存在', 404);

    await prisma.goal.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
