import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// 优雅退出时关闭连接
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
