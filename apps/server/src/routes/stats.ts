import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

export const statsRouter = Router();
statsRouter.use(authMiddleware);

// GET /api/stats/overview
statsRouter.get('/overview', async (req: AuthRequest, res, next) => {
  try {
    const runs = await prisma.run.findMany({
      where: { userId: req.userId },
    });

    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
    const totalRuns = runs.length;
    const avgPace = totalDistance > 0 ? (totalDuration / 60) / totalDistance : null;

    res.json({
      success: true,
      data: { totalDistance, totalDuration, totalRuns, avgPace },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/calendar — 日历热力图数据
statsRouter.get('/calendar', async (req: AuthRequest, res, next) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const runs = await prisma.run.findMany({
      where: {
        userId: req.userId,
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { startedAt: true, distance: true },
    });

    // 按日期聚合
    const calendar: Record<string, { distance: number; count: number }> = {};
    for (const run of runs) {
      const date = run.startedAt.toISOString().slice(0, 10);
      if (!calendar[date]) calendar[date] = { distance: 0, count: 0 };
      calendar[date].distance += run.distance;
      calendar[date].count += 1;
    }

    res.json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/pace-trend — 配速趋势
statsRouter.get('/pace-trend', async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const runs = await prisma.run.findMany({
      where: { userId: req.userId, avgPace: { not: null } },
      orderBy: { startedAt: 'asc' },
      take: limit,
      select: { startedAt: true, avgPace: true, distance: true },
    });

    const trend = runs.map((r) => ({
      date: r.startedAt.toISOString().slice(0, 10),
      pace: r.avgPace,
      distance: r.distance,
    }));

    res.json({ success: true, data: trend });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/weekly
statsRouter.get('/weekly', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const runs = await prisma.run.findMany({
      where: { userId: req.userId, startedAt: { gte: weekStart } },
    });

    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);

    res.json({
      success: true,
      data: { totalDistance, totalDuration, runCount: runs.length, weekStart: weekStart.toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/monthly
statsRouter.get('/monthly', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const runs = await prisma.run.findMany({
      where: { userId: req.userId, startedAt: { gte: monthStart } },
    });

    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);

    res.json({
      success: true,
      data: { totalDistance, totalDuration, runCount: runs.length, monthStart: monthStart.toISOString() },
    });
  } catch (err) {
    next(err);
  }
});
