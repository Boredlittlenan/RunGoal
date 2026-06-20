import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { runRouter } from './routes/run.js';
import { goalRouter } from './routes/goal.js';
import { achievementRouter } from './routes/achievement.js';
import { challengeRouter } from './routes/challenge.js';
import { statsRouter } from './routes/stats.js';
import { userRouter } from './routes/user.js';
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

// 路由
app.use('/api/auth', authRouter);
app.use('/api/runs', runRouter);
app.use('/api/goals', goalRouter);
app.use('/api/achievements', achievementRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/stats', statsRouter);
app.use('/api/user', userRouter);

// 全局错误处理
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🏃 RunGoal Server running on http://localhost:${PORT}`);
});

export default app;
