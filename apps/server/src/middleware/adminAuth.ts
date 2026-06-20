import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'rungoal-admin-secret-2026';

export interface AdminRequest extends Request {
  adminId?: string;
  adminRole?: string;
}

export function adminAuthMiddleware(req: AdminRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('未提供管理员认证令牌', 401));
  }

  try {
    const payload = jwt.verify(authHeader.split(' ')[1], ADMIN_JWT_SECRET) as { adminId: string; role: string };
    req.adminId = payload.adminId;
    req.adminRole = payload.role;
    next();
  } catch {
    next(createError('管理员令牌无效或已过期', 401));
  }
}

export function generateAdminToken(adminId: string, role: string): string {
  return jwt.sign({ adminId, role }, ADMIN_JWT_SECRET, { expiresIn: '12h' });
}
