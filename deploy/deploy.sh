#!/bin/bash
# RunGoal 部署脚本
# 在服务器上执行：bash deploy/deploy.sh

set -e

APP_DIR="/var/www/rungoal"
LOG_DIR="/var/log/rungoal"

echo "🏃 RunGoal 部署开始..."

# 1. 创建目录
echo "→ 创建目录..."
mkdir -p $APP_DIR $LOG_DIR

# 2. 拉取代码（首次）或更新
if [ -d "$APP_DIR/.git" ]; then
  echo "→ 更新代码..."
  cd $APP_DIR && git pull origin master
else
  echo "→ 克隆代码..."
  git clone https://github.com/Boredlittlenan/RunGoal.git $APP_DIR
  cd $APP_DIR
fi

# 3. 安装依赖
echo "→ 安装依赖..."
cd $APP_DIR
pnpm install --frozen-lockfile

# 4. 配置环境变量（首次部署时）
if [ ! -f "$APP_DIR/apps/server/.env" ]; then
  echo "→ 复制生产环境配置..."
  cp $APP_DIR/deploy/.env.production $APP_DIR/apps/server/.env
  echo "⚠️  请编辑 $APP_DIR/apps/server/.env 填入真实的数据库连接和密钥！"
  echo "   编辑完成后重新运行此脚本。"
  exit 1
fi

# 5. 构建前端
echo "→ 构建 C 端前端..."
cd $APP_DIR/apps/web && pnpm build

echo "→ 构建 Admin 后台..."
cd $APP_DIR/apps/admin && pnpm build

# 6. 构建后端
echo "→ 构建后端..."
cd $APP_DIR/apps/server && pnpm build

# 7. 数据库迁移
echo "→ 推送数据库 Schema..."
cd $APP_DIR/apps/server && npx prisma db push

# 8. 重启后端服务
echo "→ 重启后端..."
pm2 stop rungoal-server 2>/dev/null || true
pm2 delete rungoal-server 2>/dev/null || true
pm2 start $APP_DIR/deploy/ecosystem.config.cjs
pm2 save

# 9. 重载 Nginx
echo "→ 重载 Nginx..."
nginx -t && systemctl reload nginx

echo "✅ RunGoal 部署完成！"
echo ""
echo "C 端前端：https://your-domain.com"
echo "Admin 后台：https://your-domain.com/admin"
echo "API 服务：https://your-domain.com/api/health"
