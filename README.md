# RunGoal

面向个人跑步爱好者的 H5 运动目标管理应用，核心围绕"设定目标 - 记录跑步 - 追踪进度 - 成就激励 - 数据洞察"展开。

## 技术栈

**前端 C 端 (apps/web)**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + ECharts

**前端管理后台 (apps/admin)**: React 18 + TypeScript + Vite + Ant Design 5

**后端 (apps/server)**: Rust + Axum 0.8 + SQLx 0.9 + PostgreSQL

**Monorepo**: pnpm workspace + Turborepo

## 项目结构

```
sport-app/
├── apps/
│   ├── web/        # C 端 H5 应用
│   ├── admin/      # 管理后台
│   └── server/     # Rust 后端 API 服务
├── deploy/         # 部署配置
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 环境要求

- Node.js 18+
- pnpm 9+
- Rust 1.75+ (stable)
- PostgreSQL 14+

## 开发

### 安装依赖

```bash
# 前端依赖
pnpm install
```

后端依赖由 Cargo 管理，首次编译时自动下载。

### 环境变量

在 `apps/server/` 下创建 `.env` 文件：

```env
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/rungoal
JWT_SECRET=your-jwt-secret-here
ADMIN_JWT_SECRET=your-admin-jwt-secret-here
PORT=3000
```

### 启动开发

```bash
# C 端前端
pnpm --filter web dev

# 管理后台
pnpm --filter admin dev

# 后端 (Rust)
cd apps/server && cargo run
```

### 编译后端

```bash
cd apps/server && cargo build --release
# 二进制产物: apps/server/target/release/rungoal-server (~7MB)
```

## 核心功能

**跑步记录**: 手动录入 / GPS 追踪，距离、时长、配速自动计算，卡路里、天气、心情标注

**目标系统**: 支持累计距离、跑步频次、配速目标等多种类型，进度实时追踪

**成就系统**: 20 个成就徽章，涵盖里程碑、累计、连续打卡、配速表现、趣味隐藏五大类别，跑步保存后自动检测解锁

**挑战系统**: 用户自建限时挑战，累计型 / 单次突破型，进度实时更新

**数据可视化**: 跑量日历热力图、配速趋势、周月统计图表

**管理后台**: 仪表盘、用户管理、跑步记录管理、成就统计、挑战管理

## 部署

项目使用 1Panel + Docker + OpenResty(Nginx) 部署在 Oracle Cloud ARM64 服务器上。

```bash
# 后端编译
cd apps/server && cargo build --release

# 前端构建
pnpm --filter web build
pnpm --filter admin build

# PM2 启动后端
pm2 start deploy/ecosystem.config.cjs
```

详细部署配置参见 `deploy/` 目录。

## 数据库

数据库 schema 通过 Prisma 管理（仅用于建表和迁移），后端运行时通过 SQLx 直连 PostgreSQL。

首次部署时需要先通过 Prisma 创建表结构，后端启动时会自动 seed 默认管理员账号（admin / admin123）。

## 认证

- **C 端**: JWT Token（7 天有效）+ Refresh Token（30 天），使用 `JWT_SECRET` 签名
- **Admin**: 独立 JWT Token（12 小时有效），使用 `ADMIN_JWT_SECRET` 签名，两套密钥互不干扰
