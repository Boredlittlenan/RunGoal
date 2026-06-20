import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { generateAdminToken, adminAuthMiddleware, type AdminRequest } from '../middleware/adminAuth.js';
import { createError } from '../middleware/errorHandler.js';

export const adminAuthRouter = Router();

// POST /api/admin/auth/login
adminAuthRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw createError('用户名和密码不能为空', 400);

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !admin.isActive) throw createError('账号不存在或已禁用', 401);

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw createError('密码错误', 401);

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const token = generateAdminToken(admin.id, admin.role);
    res.json({
      success: true,
      data: {
        admin: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/auth/me
adminAuthRouter.get('/me', adminAuthMiddleware, async (req: AdminRequest, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.adminId },
      select: { id: true, username: true, nickname: true, role: true, lastLoginAt: true },
    });
    if (!admin) throw createError('管理员不存在', 404);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
});

// ─── 初始化管理员（仅当 Admin 表为空时可用） ───
export async function seedAdmin() {
  const count = await prisma.admin.count();
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
      data: { username: 'admin', passwordHash: hash, nickname: '超级管理员', role: 'superadmin' },
    });
    console.log('🔑 Default admin created: admin / admin123');
  }
}
