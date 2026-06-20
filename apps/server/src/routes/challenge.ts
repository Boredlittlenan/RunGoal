import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const challengeRouter = Router();
challengeRouter.use(authMiddleware);

// GET /api/challenges
challengeRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = { userId: req.userId };
    if (status) where.status = status;

    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: challenges });
  } catch (err) {
    next(err);
  }
});

// POST /api/challenges
challengeRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { title, type, targetValue, unit, startDate, endDate } = req.body;

    if (!title || !type || !targetValue || !unit || !startDate || !endDate) {
      throw createError('缺少必要字段', 400);
    }

    const challenge = await prisma.challenge.create({
      data: {
        userId: req.userId!,
        title,
        type,
        targetValue,
        unit,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    res.status(201).json({ success: true, data: challenge });
  } catch (err) {
    next(err);
  }
});

// GET /api/challenges/:id
challengeRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const challenge = await prisma.challenge.findFirst({
      where: { id, userId: req.userId },
    });
    if (!challenge) throw createError('挑战不存在', 404);
    res.json({ success: true, data: challenge });
  } catch (err) {
    next(err);
  }
});

// POST /api/challenges/:id/abandon
challengeRouter.post('/:id/abandon', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const challenge = await prisma.challenge.findFirst({
      where: { id, userId: req.userId, status: 'active' },
    });
    if (!challenge) throw createError('挑战不存在或已结束', 404);

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: 'failed' },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/challenges/:id
challengeRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const challenge = await prisma.challenge.findFirst({
      where: { id, userId: req.userId },
    });
    if (!challenge) throw createError('挑战不存在', 404);

    await prisma.challenge.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
