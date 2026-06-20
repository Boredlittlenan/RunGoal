import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { checkAchievements, type AchievementDef } from '@sport-app/shared/achievements';
import type { UserStats } from '@sport-app/shared/types';

export const runRouter = Router();
runRouter.use(authMiddleware);

// GET /api/runs — 跑步记录列表
runRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const [runs, total] = await Promise.all([
      prisma.run.findMany({
        where: { userId: req.userId },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.run.count({ where: { userId: req.userId } }),
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

// POST /api/runs — 创建跑步记录（核心：触发成就检测 + 挑战进度更新）
runRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { distance, duration, source, trackPoints, feeling, note, weather, startedAt, endedAt } = req.body;

    if (!distance || !duration || !startedAt) {
      throw createError('距离、时长和开始时间不能为空', 400);
    }

    const avgPace = distance > 0 ? (duration / 60) / distance : null;

    // 1. 保存跑步记录
    const run = await prisma.run.create({
      data: {
        userId: req.userId!,
        distance,
        duration,
        avgPace,
        source: source || 'manual',
        trackPoints: trackPoints || null,
        feeling: feeling || null,
        note: note || null,
        weather: weather || null,
        startedAt: new Date(startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
      },
    });

    // 2. 计算用户统计数据（用于成就检测）
    const userStats = await computeUserStats(req.userId!);

    // 3. 成就检测
    const alreadyUnlocked = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      select: { achievementKey: true },
    });
    const unlockedKeys = alreadyUnlocked.map((a: { achievementKey: string }) => a.achievementKey);
    const { newlyUnlocked } = checkAchievements(userStats, unlockedKeys);

    // 写入新解锁的成就
    if (newlyUnlocked.length > 0) {
      await prisma.userAchievement.createMany({
        data: newlyUnlocked.map((a) => ({
          userId: req.userId!,
          achievementKey: a.key,
          unlockedByRun: run.id,
        })),
      });
    }

    // 4. 更新进行中的挑战进度
    const activeChallenges = await prisma.challenge.findMany({
      where: { userId: req.userId, status: 'active' },
    });

    const challengeUpdates = [];
    for (const challenge of activeChallenges) {
      let newProgress = challenge.progress;

      if (challenge.type === 'cumulative') {
        newProgress += distance;
      } else if (challenge.type === 'single_breakthrough') {
        newProgress = Math.max(newProgress, distance);
      }
      // consecutive 类型需要更复杂的连续天数计算，这里简化

      const status = newProgress >= challenge.targetValue ? 'completed' : 'active';
      const completedAt = status === 'completed' ? new Date() : null;

      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { progress: newProgress, status, completedAt },
      });

      challengeUpdates.push({
        challengeId: challenge.id,
        title: challenge.title,
        progress: newProgress,
        targetValue: challenge.targetValue,
        status,
      });
    }

    // 5. 返回完整响应
    res.status(201).json({
      success: true,
      data: {
        run,
        newAchievements: newlyUnlocked.map((a: AchievementDef) => ({
          key: a.key,
          name: a.name,
          description: a.description,
          rarity: a.rarity,
          unlockedAt: new Date().toISOString(),
        })),
        challengeUpdates,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id
runRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const run = await prisma.run.findFirst({
      where: { id, userId: req.userId },
    });
    if (!run) throw createError('记录不存在', 404);
    res.json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

// PUT /api/runs/:id
runRouter.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const run = await prisma.run.findFirst({
      where: { id, userId: req.userId },
    });
    if (!run) throw createError('记录不存在', 404);

    const updated = await prisma.run.update({
      where: { id },
      data: { ...req.body, avgPace: req.body.distance && req.body.duration ? (req.body.duration / 60) / req.body.distance : null },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/runs/:id
runRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const run = await prisma.run.findFirst({
      where: { id, userId: req.userId },
    });
    if (!run) throw createError('记录不存在', 404);

    await prisma.run.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── 辅助函数 ───

async function computeUserStats(userId: string): Promise<UserStats> {
  const runs = await prisma.run.findMany({
    where: { userId },
    orderBy: { startedAt: 'asc' },
  });

  const totalRuns = runs.length;
  const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
  const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
  const maxSingleDistance = runs.reduce((max, r) => Math.max(max, r.distance), 0);

  // 最佳 5K 配速
  const fiveKRuns = runs.filter((r) => r.distance >= 5 && r.avgPace);
  const bestPace5k = fiveKRuns.length > 0
    ? Math.min(...fiveKRuns.map((r) => r.avgPace!))
    : null;

  // 连续天数（简化计算）
  const runDates = [...new Set(runs.map((r) => r.startedAt.toISOString().slice(0, 10)))].sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < runDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(runDates[i - 1]);
      const curr = new Date(runDates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // 检查当前连续天数
  if (runDates.length > 0) {
    const lastDate = new Date(runDates[runDates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    currentStreak = daysDiff <= 1 ? tempStreak : 0;
  }

  // 晨跑/夜跑
  const earlyMorningRuns = runs.filter((r) => new Date(r.startedAt).getHours() < 6).length;
  const lateNightRuns = runs.filter((r) => new Date(r.startedAt).getHours() >= 21).length;
  const rainRuns = runs.filter((r) => r.weather === 'rain').length;

  // 连续周末（简化）
  const weekendDates = runDates.filter((d) => {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  });
  const consecutiveWeekends = weekendDates.length > 0 ? 1 : 0; // 简化

  // 周/月跑次
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const weeklyRunCount = runs.filter((r) => r.startedAt >= weekStart).length;
  const monthlyRunCount = runs.filter((r) => r.startedAt >= monthlyStart).length;

  return {
    totalRuns,
    totalDistance,
    totalDuration,
    maxSingleDistance,
    bestPace5k,
    currentStreakDays: currentStreak,
    longestStreakDays: longestStreak,
    weeklyRunCount,
    monthlyRunCount,
    earlyMorningRuns,
    lateNightRuns,
    rainRuns,
    consecutiveWeekends,
  };
}
