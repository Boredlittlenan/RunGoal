import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';
import { achievements } from '@sport-app/shared/achievements';

export const adminAchievementRouter = Router();
adminAchievementRouter.use(adminAuthMiddleware);

// GET /api/admin/achievements/stats
adminAchievementRouter.get('/stats', async (req: AdminRequest, res, next) => {
  try {
    const totalAchievements = await prisma.userAchievement.count();
    const usersWithAchievements = await prisma.userAchievement.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    // 单用户最高解锁数
    const userCounts = await prisma.userAchievement.groupBy({
      by: ['userId'],
      _count: { achievementKey: true },
      orderBy: { _count: { achievementKey: 'desc' } },
      take: 1,
    });

    res.json({
      success: true,
      data: {
        total: achievements.length,
        maxUnlocked: userCounts[0]?._count.achievementKey || 0,
        usersWithAchievements: usersWithAchievements.length,
        totalUnlockRecords: totalAchievements,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/achievements — 每个成就的解锁统计
adminAchievementRouter.get('/', async (_req: AdminRequest, res, next) => {
  try {
    const allUnlocks = await prisma.userAchievement.findMany();

    // 按成就 key 统计
    const countMap = new Map<string, number>();
    for (const u of allUnlocks) {
      countMap.set(u.achievementKey, (countMap.get(u.achievementKey) || 0) + 1);
    }

    const totalUsers = await prisma.user.count();

    const data = achievements.map((def) => ({
      key: def.key,
      name: def.name,
      description: def.description,
      category: def.category,
      rarity: def.rarity,
      unlockCount: countMap.get(def.key) || 0,
      unlockRate: totalUsers > 0 ? Math.round(((countMap.get(def.key) || 0) / totalUsers) * 100) : 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});
