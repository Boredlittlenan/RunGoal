import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { runRouter } from './routes/run.js';
import { goalRouter } from './routes/goal.js';
import { achievementRouter } from './routes/achievement.js';
import { challengeRouter } from './routes/challenge.js';
import { statsRouter } from './routes/stats.js';
import { userRouter } from './routes/user.js';
import { adminAuthRouter, seedAdmin } from './routes/adminAuth.js';
import { adminDashboardRouter } from './routes/adminDashboard.js';
import { adminUserRouter } from './routes/adminUsers.js';
import { adminRunRouter } from './routes/adminRuns.js';
import { adminAchievementRouter } from './routes/adminAchievements.js';
import { adminGoalRouter } from './routes/adminGoals.js';
import { adminChallengeRouter } from './routes/adminChallenges.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// C 端路由
app.use('/api/auth', authRouter);
app.use('/api/runs', runRouter);
app.use('/api/goals', goalRouter);
app.use('/api/achievements', achievementRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/stats', statsRouter);
app.use('/api/user', userRouter);

// Admin 后台路由
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/users', adminUserRouter);
app.use('/api/admin/runs', adminRunRouter);
app.use('/api/admin/achievements', adminAchievementRouter);
app.use('/api/admin/goals', adminGoalRouter);
app.use('/api/admin/challenges', adminChallengeRouter);

// 全局错误处理
app.use(errorHandler);

// 启动
app.listen(PORT, async () => {
  console.log(`🏃 RunGoal Server running on http://localhost:${PORT}`);
  await seedAdmin();
});

export default app;
