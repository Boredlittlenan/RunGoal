# RunGoal

面向个人跑步爱好者的 H5 运动目标应用，围绕「设定目标 → 记录跑步 → 追踪进度 → 成就激励 → 数据洞察」组织体验，同时提供独立管理后台。

## 应用组成

| 模块 | 技术 | 默认地址 |
| --- | --- | --- |
| C 端 `apps/web` | React 18、TypeScript、Vite、Tailwind、Zustand | `http://localhost:5173` |
| 管理端 `apps/admin` | React 18、TypeScript、Vite、Ant Design | `http://localhost:5174/admin/` |
| API `apps/server` | Rust、Axum 0.8、SQLx 0.9、PostgreSQL | `http://localhost:3000/api` |

前端页面按路由懒加载。C 端 API 层负责 JWT 自动附加、并发刷新合并和统一错误提取；服务端启动时校验生产配置并自动执行 `apps/server/migrations` 中的 SQLx 迁移。更详细的边界和数据流见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 环境要求

- Node.js 20+
- pnpm 10+
- Rust stable
- PostgreSQL 14+

## 本地启动

安装前端依赖：

```bash
pnpm install
```

复制服务端环境变量并配置 PostgreSQL：

```bash
cp apps/server/.env.example apps/server/.env
```

开发环境允许使用示例密钥；数据库存在后，服务端首次启动会自动建表。若需要创建首个后台账号，在 `.env` 中同时设置 `ADMIN_SEED_USERNAME` 和长度至少 12 位的 `ADMIN_SEED_PASSWORD`，首次启动成功后即可删除这两个 seed 配置。

分别启动三个进程：

```bash
pnpm dev:server
pnpm dev:web
pnpm dev:admin
```

也可用 `pnpm dev` 同时启动两个前端。健康检查地址为 `http://localhost:3000/api/health`。

## 配置约束

生产环境必须设置：

```env
APP_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=至少32位随机值
JWT_REFRESH_SECRET=另一组至少32位随机值
ADMIN_JWT_SECRET=再一组至少32位随机值
CORS_ORIGINS=https://你的实际域名
PORT=3000
```

三个 JWT 密钥必须互不相同。生产模式不会接受开发默认密钥，也不再自动创建 `admin / admin123` 弱口令账号。参考模板位于 `deploy/.env.production.example`。

## 检查与构建

```bash
pnpm typecheck
pnpm build
pnpm check:server
```

当前核心功能包括：手动/GPS 跑步记录、归档恢复、目标追踪、成就与挑战、周/月/总排行榜、日历热力图、配速趋势、周期分享卡片，以及用户/跑步/目标/成就/挑战管理。

## 部署

部署文件位于 `deploy/`。典型流程为：

```bash
cargo build --release --manifest-path apps/server/Cargo.toml
pnpm build
pm2 start deploy/ecosystem.config.cjs
```

GPS 追踪需要 HTTPS。反向代理应将 `/api` 转发到 `127.0.0.1:3000`，将 `/admin` 指向管理端构建产物，其余路径指向 C 端构建产物。

## License / 许可

This project is source-available for non-commercial use only. Commercial use is not permitted without explicit written permission from Boredlittlenan. See [LICENSE.md](LICENSE.md).

本项目源代码仅允许非商业用途查看、使用、修改和分发。未经 Boredlittlenan 明确书面许可，不允许商用。详见 [LICENSE.md](LICENSE.md)。
