import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const userRouter = Router();
userRouter.use(authMiddleware);

// PUT /api/user/profile
userRouter.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const { nickname, avatar, weight, height } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { nickname, avatar, weight, height },
      select: { id: true, nickname: true, avatar: true, weight: true, height: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/theme
userRouter.put('/theme', async (req: AuthRequest, res, next) => {
  try {
    const { theme } = req.body;
    if (!['light', 'dark', 'system'].includes(theme)) {
      throw createError('无效的主题值', 400);
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { theme },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
