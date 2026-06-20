import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';

export const adminDashboardRouter = Router();
adminDashboardRouter.use(adminAuthMiddleware);

// GET /api/admin/dashboard
adminDashboardRouter.get('/', async (req: AdminRequest, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      todayNewUsers,
      totalRuns,
      todayRuns,
      distanceAgg,
      todayDistanceAgg,
      activeUsers7d,
      recentRuns,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.run.count(),
      prisma.run.count({ where: { startedAt: { gte: todayStart } } }),
      prisma.run.aggregate({ _sum: { distance: true } }),
      prisma.run.aggregate({ _sum: { distance: true }, where: { startedAt: { gte: todayStart } } }),
      prisma.run.findMany({
        where: { startedAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.run.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { user: { select: { nickname: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, nickname: true, phone: true, createdAt: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        todayNewUsers,
        totalRuns,
        todayRuns,
        totalDistance: distanceAgg._sum.distance || 0,
        todayDistance: todayDistanceAgg._sum.distance || 0,
        activeUsers7d: activeUsers7d.length,
        recentRuns,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
});
