import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { achievements } from '@sport-app/shared/achievements';

export const achievementRouter = Router();
achievementRouter.use(authMiddleware);

// GET /api/achievements — 成就墙（全部成就 + 解锁状态 + 进度）
achievementRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
    });
    const unlockedMap = new Map(unlocked.map((a) => [a.achievementKey, a]));

    const all = achievements.map((def) => {
      const record = unlockedMap.get(def.key);
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        unlocked: !!record,
        unlockedAt: record?.unlockedAt?.toISOString() || null,
      };
    });

    res.json({ success: true, data: all });
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements/recent — 最近解锁的成就
achievementRouter.get('/recent', async (req: AuthRequest, res, next) => {
  try {
    const recent = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      orderBy: { unlockedAt: 'desc' },
      take: 10,
    });

    const withDetails = recent.map((record) => {
      const def = achievements.find((a) => a.key === record.achievementKey);
      return {
        key: record.achievementKey,
        name: def?.name || '未知成就',
        description: def?.description || '',
        icon: def?.icon || '',
        rarity: def?.rarity || 'common',
        unlockedAt: record.unlockedAt.toISOString(),
      };
    });

    res.json({ success: true, data: withDetails });
  } catch (err) {
    next(err);
  }
});

// GET /api/achievements/stats — 成就统计
achievementRouter.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const unlockedCount = await prisma.userAchievement.count({
      where: { userId: req.userId },
    });

    res.json({
      success: true,
      data: {
        unlocked: unlockedCount,
        total: achievements.length,
        rate: achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
