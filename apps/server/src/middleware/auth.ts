import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rungoal-dev-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('未提供认证令牌', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    next(createError('认证令牌无效或已过期', 401));
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function generateRefreshToken(userId: string): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'rungoal-dev-refresh-secret';
  return jwt.sign({ userId }, refreshSecret, { expiresIn: '30d' });
}
