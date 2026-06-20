import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password || !nickname) {
      throw createError('手机号、密码和昵称不能为空', 400);
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw createError('该手机号已注册', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { phone, passwordHash, nickname },
      select: { id: true, phone: true, nickname: true, avatar: true, theme: true },
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      success: true,
      data: { user, token, refreshToken },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      throw createError('手机号和密码不能为空', 400);
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw createError('手机号或密码错误', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw createError('手机号或密码错误', 401);
    }

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          theme: user.theme,
        },
        token,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw createError('refresh token 不能为空', 400);
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'rungoal-dev-refresh-secret';
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(refreshToken, refreshSecret) as { userId: string };

    const token = generateToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    res.json({
      success: true,
      data: { token, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(createError('refresh token 无效或已过期', 401));
  }
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, phone: true, nickname: true, avatar: true, weight: true, height: true, theme: true, createdAt: true },
    });

    if (!user) {
      throw createError('用户不存在', 404);
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});
