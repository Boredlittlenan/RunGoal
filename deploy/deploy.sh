#!/bin/bash
# ═══════════════════════════════════════════════════
# RunGoal 部署脚本 (适配 1Panel 环境)
# 首次部署：bash deploy/deploy.sh
# 更新部署：bash deploy/deploy.sh update
# ═══════════════════════════════════════════════════

set -e

APP_DIR="/opt/rungoal"
LOG_DIR="/var/log/rungoal"
NODE_MIN_VERSION=20

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "🏃 RunGoal 部署脚本"
echo "════════════════════════════════════"

# ─── 判断模式 ───
if [ "$1" = "update" ]; then
  MODE="update"
  log "模式：更新部署"
else
  MODE="install"
  log "模式：首次部署"
fi

# ─── 1. 环境检查 ───
echo ""
echo "→ 检查运行环境..."

# root 权限
if [ "$EUID" -ne 0 ]; then
  err "请使用 root 权限运行此脚本：sudo bash deploy/deploy.sh"
fi

# Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt "$NODE_MIN_VERSION" ]; then
    err "Node.js 版本过低 (当前: v${NODE_VER})，需要 v${NODE_MIN_VERSION}+。请在 1Panel 应用商店安装或使用 nvm 安装。"
  fi
  log "Node.js $(node -v)"
else
  warn "未检测到 Node.js"
  echo "  请在 1Panel 应用商店中安装 Node.js ${NODE_MIN_VERSION}+，或执行："
  echo "  curl -fsSL https://deb.nodesource.com/setup_${NODE_MIN_VERSION}.x | bash -"
  echo "  apt-get install -y nodejs"
  err "安装 Node.js 后请重新运行此脚本"
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  warn "未检测到 pnpm，正在安装..."
  npm install -g pnpm
  log "pnpm 已安装: $(pnpm -v)"
else
  log "pnpm $(pnpm -v)"
fi

# git
if ! command -v git &>/dev/null; then
  err "未检测到 git，请先安装: apt-get install -y git"
fi

# PM2
if ! command -v pm2 &>/dev/null; then
  warn "未检测到 PM2，正在安装..."
  npm install -g pm2
  log "PM2 已安装"
else
  log "PM2 $(pm2 -v)"
fi

# ─── 2. 代码部署 ───
echo ""

if [ "$MODE" = "update" ]; then
  echo "→ 更新代码..."
  if [ ! -d "$APP_DIR/.git" ]; then
    err "未找到 Git 仓库，请先执行首次部署（不带 update 参数）"
  fi
  cd $APP_DIR
  git pull origin master
  log "代码已更新"
else
  echo "→ 部署代码..."
  mkdir -p $APP_DIR $LOG_DIR

  if [ -d "$APP_DIR/.git" ]; then
    warn "目录已存在，将执行 git pull"
    cd $APP_DIR && git pull origin master
  else
    git clone https://github.com/Boredlittlenan/RunGoal.git $APP_DIR
    cd $APP_DIR
  fi
  log "代码已就绪"
fi

# ─── 3. 环境变量配置 ───
echo ""
echo "→ 配置环境变量..."

if [ ! -f "$APP_DIR/apps/server/.env" ]; then
  # 自动生成随机密钥
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  ADMIN_JWT_SECRET=$(openssl rand -hex 32)

  cat > "$APP_DIR/apps/server/.env" << EOF
# ─── 数据库 ───
DATABASE_URL="postgresql://postgres:your_password@127.0.0.1:5432/rungoal"

# ─── JWT 密钥（已自动生成随机值） ───
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET}"

# ─── 服务端口 ───
PORT=3000
EOF

  warn "已生成 .env 文件，JWT 密钥已自动填写随机值"
  warn "请编辑数据库连接："
  echo "  vi $APP_DIR/apps/server/.env"
  echo ""
  echo "  修改 DATABASE_URL 为服务器上 PostgreSQL 的真实连接信息"
  echo "  格式：postgresql://用户名:密码@127.0.0.1:5432/数据库名"
  echo ""
  echo "  如果还没创建 rungoal 数据库，请执行："
  echo "  sudo -u postgres psql -c 'CREATE DATABASE rungoal;'"
  echo ""
  echo "  编辑完成后重新运行：sudo bash deploy/deploy.sh update"
  exit 1
else
  log ".env 已存在，跳过配置"
fi

# ─── 4. 安装依赖 ───
echo ""
echo "→ 安装依赖..."
cd $APP_DIR
pnpm install --frozen-lockfile
log "依赖安装完成"

# ─── 5. 构建 ───
echo ""
echo "→ 构建项目..."

echo "  构建 C 端前端..."
cd $APP_DIR/apps/web && pnpm build
log "C 端前端构建完成"

echo "  构建 Admin 后台..."
cd $APP_DIR/apps/admin && pnpm build
log "Admin 后台构建完成"

echo "  构建后端服务..."
cd $APP_DIR/apps/server && pnpm build
log "后端服务构建完成"

# ─── 6. 数据库 ───
echo ""
echo "→ 推送数据库 Schema..."
cd $APP_DIR/apps/server
npx prisma db push --accept-data-loss
log "数据库 Schema 已同步"

# ─── 7. 启动/重启后端 ───
echo ""
echo "→ 启动后端服务..."
pm2 delete rungoal-server 2>/dev/null || true
cd $APP_DIR
pm2 start deploy/ecosystem.config.cjs
pm2 save

# 设置开机自启（首次）
if ! pm2 startup 2>/dev/null | grep -q "already"; then
  pm2 startup 2>/dev/null || true
fi

log "后端服务已启动 (PM2: rungoal-server)"

# ─── 8. Nginx 配置提示 ───
echo ""
echo "════════════════════════════════════"
echo "✅ RunGoal 部署完成！"
echo "════════════════════════════════════"
echo ""
echo "📋 后续步骤（在 1Panel 面板中操作）："
echo ""
echo "  1. 创建网站："
echo "     1Panel → 网站 → 创建网站"
echo "     - 主域名：填写你的域名或服务器 IP"
echo "     - 根目录：/opt/rungoal/apps/web/dist"
echo ""
echo "  2. 配置反向代理（在网站的 Nginx 配置中添加）："
echo "     参考文件：$APP_DIR/deploy/nginx.conf"
echo ""
echo "     关键配置片段："
echo "     ┌──────────────────────────────────────┐"
echo "     │ # Admin 后台                          │"
echo "     │ location /admin {                     │"
echo "     │   alias /opt/rungoal/apps/admin/dist; │"
echo "     │   try_files \$uri \$uri/               │"
echo "     │     /admin/index.html;                │"
echo "     │ }                                     │"
echo "     │                                       │"
echo "     │ # API 反向代理                        │"
echo "     │ location /api {                       │"
echo "     │   proxy_pass http://127.0.0.1:3000;   │"
echo "     │   proxy_set_header Host \$host;        │"
echo "     │   proxy_set_header X-Real-IP          │"
echo "     │     \$remote_addr;                     │"
echo "     │   proxy_set_header X-Forwarded-For    │"
echo "     │     \$proxy_add_x_forwarded_for;       │"
echo "     │ }                                     │"
echo "     └──────────────────────────────────────┘"
echo ""
echo "  3. SSL 证书（可选）："
echo "     1Panel → 网站 → 选中网站 → HTTPS"
echo "     → 申请 Let's Encrypt 证书"
echo ""
echo "  访问地址："
echo "    C 端：http://你的域名"
echo "    后台：http://你的域名/admin"
echo "    默认管理员：admin / admin123"
echo ""
echo "  常用命令："
echo "    查看日志：pm2 logs rungoal-server"
echo "    重启后端：pm2 restart rungoal-server"
echo "    更新部署：sudo bash deploy/deploy.sh update"
echo ""
