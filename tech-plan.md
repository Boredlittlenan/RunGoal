## RunGoal - 跑步目标记录 App 技术方案

### 产品定位

面向个人跑步爱好者的 H5 运动目标管理应用，核心围绕"设定目标 → 记录跑步 → 追踪进度 → 成就激励 → 数据洞察"展开。第一期以跑步为主，架构预留后续扩展至骑行、健走等运动的能力。

---

### 技术栈总览

| 层次 | 选型 | 理由 |
|------|------|------|
| 前端框架 | React 18 + TypeScript + Vite | 生态成熟，TS 保证代码质量，Vite 构建快 |
| UI 方案 | Tailwind CSS + CSS Variables | 原子化 CSS 开发效率高，变量方案天然支持亮暗双主题 |
| 组件库 | 自定义组件（Radix UI 作无样式基础） | 运动 App 需要高度定制 UI，不适合直接用 Ant Design 这类企业风格库 |
| 状态管理 | Zustand | 轻量、直观、TS 友好，适合中等复杂度应用 |
| 路由 | React Router v6 | 标准选择 |
| 图表 | ECharts (via echarts-for-react) | 功能全面，跑量热力图、配速趋势图、日历视图都能覆盖 |
| 本地缓存 | IndexedDB (Dexie.js) | GPS 追踪数据量大，需要本地暂存再同步 |
| 后端框架 | Node.js + Express + TypeScript | 前后端统一语言，降低心智负担 |
| ORM | Prisma | 类型安全，迁移管理方便，与 TS 深度集成 |
| 数据库 | PostgreSQL | 可靠、功能丰富，JSON 列支持灵活扩展 |
| 认证 | JWT (access + refresh token) | 无状态，H5 友好 |
| 地图 | 第一期不做，预留接口 | 后续接入高德 JS SDK 或 Mapbox GL |
| 后台管理 | Ant Design 5 + Axios | 后台标配组件库，开箱即用，和 C 端共用后端 API |

---

### 功能模块规划

#### 第一期 (MVP)

**1. 用户系统**
- 手机号 + 验证码注册/登录（或用户名 + 密码，看接入成本）
- 个人基础信息：昵称、头像、体重、身高
- 亮暗主题切换偏好

**2. 跑步记录**
- **手动录入**：距离(km)、时长、配速(自动算)、日期时间、备注、主观感受评分
- **GPS 实时追踪**：
  - 基于浏览器 Geolocation API 采集坐标点
  - 用 Haversine 公式实时计算距离
  - 本地 IndexedDB 暂存轨迹点，完成后一次性提交服务端
  - 实时显示：距离、时长、当前配速、平均配速
  - 支持暂停/继续/结束操作
  - 注意：GPS 追踪需要 HTTPS 环境，且 iOS Safari 对后台定位有限制
- 跑步记录列表（按时间倒序）
- 记录详情查看和编辑

**3. 目标系统**
- 支持创建多个并行目标：
  - **累计型**：月跑量 100km、年跑量 1000km
  - **频次型**：每周跑步 3 次
  - **配速型**：5km 配速进入 5:30
  - **距离型**：单次跑完半马 21km
- 每个目标有独立的周期（周/月/季度/年/自定义日期范围）
- 目标进度实时计算和可视化
- 目标到期提醒（第一期可先做页面内提醒，后续做推送）

**4. 数据可视化**
- **首页仪表盘**：本周/本月跑量概览、目标进度环形图、最近跑步记录
- **统计页**：
  - 跑量日历热力图（类 GitHub 贡献图）
  - 周/月跑量柱状图
  - 配速趋势折线图
  - 跑步时长分布
- **个人中心**：累计数据（总跑量、总次数、总时长）

**5. 成就挑战系统**
- **成就（Achievement）**：系统预设的里程碑徽章，达成条件后自动解锁
  - **里程碑类**：
    - 初出茅庐 — 完成第一次跑步记录
    - 5K 跑者 — 单次跑步达到 5km
    - 10K 跑者 — 单次跑步达到 10km
    - 半马达成 — 单次跑步达到 21.0975km
    - 全马达成 — 单次跑步达到 42.195km
  - **累计类**：
    - 百公里俱乐部 — 累计跑量 100km
    - 五百公里 — 累计跑量 500km
    - 千公里达人 — 累计跑量 1000km
    - 地球环跑 — 累计跑量 40075km（彩蛋成就）
  - **连续打卡类**：
    - 三日连续 — 连续 3 天有跑步记录
    - 周周不断 — 连续 4 周每周至少跑 1 次
    - 月度铁人 — 连续 30 天每天至少跑 1 次
    - 百日修行 — 连续 100 天有跑步记录
  - **配速/表现类**：
    - 破 6 — 5km 配速进入 6:00/km
    - 破 5 — 5km 配速进入 5:00/km
    - 破 4 — 5km 配速进入 4:00/km
    - 晨跑达人 — 累计 20 次早晨 6 点前开跑
    - 夜跑侠 — 累计 20 次晚上 9 点后开跑
  - **趣味隐藏类**：
    - 雨战英雄 — 手动标记雨天跑步
    - 配速过山车 — 同一次跑步内配速波动超过 2min/km
    - 周末战士 — 连续 8 个周末都有跑步
  - 每个成就包含：名称、描述、图标/徽章（SVG）、解锁条件（代码定义，非数据库配置）、解锁时间
  - 成就墙展示：已解锁高亮 + 未解锁灰色带进度提示（如 "已累计 78km / 100km"）

- **挑战（Challenge）**：用户主动发起的限时目标挑战
  - 用户可以创建自定义挑战：
    - 限时挑战：7 天内累计跑 30km
    - 连续挑战：连续 14 天每天跑 3km
    - 单次突破：一次跑完 15km
  - 挑战状态：进行中 / 挑战成功 / 挑战失败
  - 挑战有明确的开始时间和截止时间
  - 挑战进度实时可视化（进度条 + 剩余天数/次数）
  - 挑战完成后获得对应成就徽章（如果有匹配的成就）
  - 挑战历史记录列表

- **解锁动效和通知**：
  - 跑步记录保存后，服务端计算是否有新成就解锁
  - 如果解锁了新成就，返回数据中带上成就信息
  - 前端展示解锁动效（徽章从模糊到清晰的动画 + 粒子效果）
  - 成就解锁时可选触发浏览器通知（Notification API）

#### 第二期 (增强)

- 地图轨迹显示（高德 JS SDK）
- 跑步记录分享（生成图片海报，含成就徽章）
- 跑鞋里程追踪
- 数据导出（CSV/GPX）
- 成就分享到社交平台

#### 第三期 (社交)

- 好友系统
- 排行榜
- 好友间挑战赛（互相发起挑战 PK）
- 约跑/挑战赛
- 动态广场

---

### 项目结构

```
sport-app/
├── apps/
│   ├── web/                    # C 端 H5 应用
│   │   ├── src/
│   │   │   ├── components/     # 通用 UI 组件
│   │   │   ├── features/       # 功能模块
│   │   │   │   ├── auth/       # 登录注册
│   │   │   │   ├── run/        # 跑步记录（手动+GPS）
│   │   │   │   ├── goal/       # 目标管理
│   │   │   │   ├── achievement/ # 成就徽章 + 挑战
│   │   │   │   ├── stats/      # 数据统计和图表
│   │   │   │   └── profile/    # 个人中心
│   │   │   ├── hooks/          # 自定义 hooks
│   │   │   ├── lib/            # 工具函数（GPS 计算、时间处理等）
│   │   │   ├── stores/         # Zustand 状态
│   │   │   ├── styles/         # 全局样式、主题变量
│   │   │   ├── types/          # TypeScript 类型定义
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── admin/                  # 后台管理系统
│   │   ├── src/
│   │   │   ├── components/     # AdminLayout（侧边栏+内容区）
│   │   │   ├── pages/          # 页面
│   │   │   │   ├── LoginPage         # 管理员登录
│   │   │   │   ├── DashboardPage     # 仪表盘
│   │   │   │   ├── UsersPage         # 用户列表
│   │   │   │   ├── UserDetailPage    # 用户详情
│   │   │   │   ├── RunsPage          # 跑步记录列表
│   │   │   │   ├── RunDetailPage     # 记录详情
│   │   │   │   ├── GoalsPage         # 目标管理
│   │   │   │   ├── AchievementsPage  # 成就统计
│   │   │   │   └── ChallengesPage    # 挑战管理
│   │   │   ├── lib/            # API 客户端（axios 封装）
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                 # 后端 API 服务（C 端 + Admin 共用）
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts, run.ts, goal.ts ...     # C 端路由
│       │   │   ├── adminAuth.ts                     # 管理员认证
│       │   │   ├── adminDashboard.ts                # 仪表盘数据
│       │   │   ├── adminUsers.ts, adminRuns.ts ...  # Admin CRUD
│       │   ├── controllers/
│       │   ├── services/       # 业务逻辑（含成就检测引擎）
│       │   ├── middleware/
│       │   │   ├── auth.ts          # C 端 JWT 认证
│       │   │   ├── adminAuth.ts     # Admin JWT 认证（独立密钥）
│       │   │   └── errorHandler.ts
│       │   ├── prisma/
│       │   └── app.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # 前后端共享代码
│       ├── src/
│       │   ├── achievements/   # 成就定义 + 检测函数
│       │   ├── types/          # 共享类型
│       │   └── index.ts
│       └── package.json
│
├── package.json                # monorepo 根配置
├── pnpm-workspace.yaml         # pnpm workspace
└── turbo.json                  # Turborepo 构建编排
```

---

### 数据库核心模型（初版）

```prisma
model User {
  id           String           @id @default(cuid())
  phone        String           @unique
  nickname     String
  avatar       String?
  weight       Float?
  height       Float?
  theme        String           @default("system")   // light / dark / system
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  runs         Run[]
  goals        Goal[]
  achievements UserAchievement[]
  challenges   Challenge[]
}

model Run {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  distance     Float                          // 公里
  duration     Int                            // 秒
  avgPace      Float?                         // 分钟/公里
  source       String                         // manual / gps
  trackPoints  Json?                          // GPS 坐标点数组 (第一期不解析，存原始)
  calories     Float?
  feeling      Int?                           // 1-5 主观感受
  note         String?
  weather      String?
  startedAt    DateTime
  endedAt      DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  goalRecords  GoalRecord[]
}

model Goal {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  title       String
  type        String                          // cumulative / frequency / pace / distance
  targetValue Float                           // 目标数值
  unit        String                          // km / times / min_per_km 等
  period      String                          // week / month / quarter / year / custom
  startDate   DateTime
  endDate     DateTime?
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  records     GoalRecord[]
}

model GoalRecord {
  id        String   @id @default(cuid())
  goalId    String
  goal      Goal     @relation(fields: [goalId], references: [id])
  runId     String
  run       Run      @relation(fields: [runId], references: [id])
  value     Float                             // 本次贡献值
  createdAt DateTime @default(now())
}

// 成就解锁记录 — 成就定义在代码中（achievement-definitions.ts），这里只记录解锁状态
model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  achievementKey String                      // 代码中的成就唯一标识，如 "first_run", "10k_runner"
  unlockedAt    DateTime @default(now())
  unlockedByRun String?                      // 触发解锁的跑步记录 ID（可选）

  @@unique([userId, achievementKey])          // 同一成就只解锁一次
}

model Challenge {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  title       String
  type        String                         // cumulative / consecutive / single_breakthrough
  targetValue Float                          // 目标数值（km / 次数 / 天数）
  unit        String                         // km / times / days
  status      String   @default("active")    // active / completed / failed
  startDate   DateTime
  endDate     DateTime
  progress    Float    @default(0)           // 当前进度值
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, status])
}

// ─── Admin 管理后台 ───

model Admin {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  nickname     String
  role         String   @default("admin")   // superadmin / admin / viewer
  isActive     Boolean  @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Announcement {
  id        String   @id @default(cuid())
  title     String
  content   String
  status    String   @default("draft")      // draft / published / archived
  publishAt DateTime?
  expireAt  DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OperationLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String                          // 操作类型
  target    String?                         // 操作对象描述
  detail    Json?                           // 操作详情
  ip        String?
  createdAt DateTime @default(now())

  @@index([adminId, createdAt])
}
```

---

### API 设计（RESTful）

```
POST   /api/auth/register         注册
POST   /api/auth/login            登录
POST   /api/auth/refresh          刷新 token
GET    /api/auth/me               获取当前用户信息

GET    /api/runs                  跑步记录列表（分页+筛选）
POST   /api/runs                  创建跑步记录（同时触发成就检测 + 挑战进度更新）
GET    /api/runs/:id              记录详情
PUT    /api/runs/:id              更新记录
DELETE /api/runs/:id              删除记录

GET    /api/goals                 目标列表
POST   /api/goals                 创建目标
GET    /api/goals/:id             目标详情（含进度计算）
PUT    /api/goals/:id             更新目标
DELETE /api/goals/:id             删除目标

GET    /api/achievements          成就墙（全部成就 + 解锁状态 + 进度）
GET    /api/achievements/recent   最近解锁的成就
GET    /api/achievements/stats    成就统计（已解锁数/总数、解锁率）

GET    /api/challenges            挑战列表（按状态筛选：进行中/已完成/已失败）
POST   /api/challenges            创建挑战
GET    /api/challenges/:id        挑战详情（含进度和剩余时间）
PUT    /api/challenges/:id        更新挑战（仅限未开始的）
DELETE /api/challenges/:id        取消挑战
POST   /api/challenges/:id/abandon  主动放弃挑战

GET    /api/stats/overview        总览统计
GET    /api/stats/calendar        日历热力图数据
GET    /api/stats/pace-trend      配速趋势数据
GET    /api/stats/weekly          周统计
GET    /api/stats/monthly         月统计

PUT    /api/user/profile          更新个人资料
PUT    /api/user/theme            更新主题偏好

# ─── Admin 后台管理 API ───

POST   /api/admin/auth/login      管理员登录
GET    /api/admin/auth/me          获取管理员信息

GET    /api/admin/dashboard       仪表盘汇总数据
GET    /api/admin/users           用户列表（分页+搜索）
GET    /api/admin/users/:id       用户详情（含跑步/目标/成就/挑战）
PUT    /api/admin/users/:id       编辑用户资料

GET    /api/admin/runs            全量跑步记录（管理员视角）
GET    /api/admin/runs/:id        记录详情（含 GPS 轨迹）
DELETE /api/admin/runs/:id        删除记录

GET    /api/admin/goals           全量目标列表
GET    /api/admin/achievements    成就解锁统计（每个成就的解锁人数/解锁率）
GET    /api/admin/achievements/stats  成就概览数据
GET    /api/admin/challenges      全量挑战列表
```

**关键：POST /api/runs 的联动逻辑**

每次保存跑步记录后，服务端需要执行以下流水线：

```
保存跑步记录
  ↓
1. 更新相关目标进度 (GoalRecord)
  ↓
2. 成就检测引擎遍历所有未解锁成就，判断是否满足解锁条件
   → 命中则写入 UserAchievement，收集新解锁列表
  ↓
3. 更新所有进行中的挑战进度 (Challenge)
   → 判断是否有挑战因本次跑步而完成或失败
  ↓
4. 返回响应 = { run, goalUpdates, newAchievements, challengeUpdates }
```

前端收到响应后，如果有 newAchievements，触发解锁动效弹窗。

---

### GPS 追踪技术方案

```
核心流程：

开始跑步
  ↓
navigator.geolocation.watchPosition() 持续采集坐标
  ↓
每个坐标点写入 IndexedDB (Dexie.js)
  ↓
用 Haversine 公式实时累加距离
  ↓
暂停 → 停止采集，保留已记录点
继续 → 恢复采集
结束 → 汇总数据 + 坐标点数组 → POST /api/runs → 清空本地缓存
```

关键注意事项：

1. **精度过滤**：丢弃 accuracy > 50m 的漂移点
2. **采样频率**：watchPosition 的 enableHighAccuracy + maximumAge 配合控制，建议每 3-5 秒一个有效点
3. **后台限制**：iOS Safari 在页面不可见时会暂停 Geolocation，需要提示用户保持 App 在前台，后续可通过 Capacitor 打包解决
4. **断网容错**：所有数据先存 IndexedDB，网络恢复后自动同步

---

### 主题方案

```css
/* Tailwind + CSS Variables 双主题方案 */
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-bg-card: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #00d26a;          /* 运动绿 */
  --color-accent-secondary: #0ea5e9;
  /* ... */
}

[data-theme="dark"] {
  --color-bg-primary: #0f0f0f;
  --color-bg-secondary: #1a1a1a;
  --color-bg-card: #1e1e1e;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #999999;
  --color-accent: #00ff88;
  --color-accent-secondary: #38bdf8;
  /* ... */
}
```

主色调选用运动感较强的绿色系，搭配中性灰。亮色模式干净清爽，暗色模式沉浸有力量感。

---

### 部署方案

```
自有服务器部署建议：

C 端前端 (apps/web)：
  → Vite 构建静态产物
  → Nginx 托管静态文件 + SPA 路由 fallback

后台管理 (apps/admin)：
  → Vite 构建静态产物
  → Nginx 配置子路径 /admin 或独立端口
  → 与 C 端共用后端 API，通过 /api/admin/* 路由区分

后端 (apps/server)：
  → PM2 管理 Node.js 进程
  → Nginx 反向代理 /api → Node
  → PostgreSQL 直接装在服务器或用云数据库
  → Admin 和 C 端使用独立的 JWT 密钥，互不干扰

HTTPS：
  → Let's Encrypt 免费证书 + certbot 自动续期
  → GPS 追踪强制要求 HTTPS
```

---

### 开发里程碑

| 阶段 | 内容 | 预估时间 |
|------|------|----------|
| M1 | 项目初始化 + 用户系统 + 手动录入跑步记录 | 1-2 周 |
| M2 | 目标系统 + 目标进度追踪 | 1 周 |
| M3 | 成就系统（成就定义 + 解锁引擎 + 成就墙 UI） | 1-2 周 |
| M4 | 挑战系统（创建挑战 + 进度追踪 + 完成/失败判定） | 1 周 |
| M5 | 数据可视化（仪表盘 + 图表） | 1-2 周 |
| M6 | GPS 实时追踪 | 1-2 周 |
| M7 | 亮暗主题 + UI 打磨 + 移动端适配 + 成就解锁动效 | 1-2 周 |
| M8 | 后台管理系统（仪表盘 + 用户/记录/成就/挑战管理） | 1-2 周 |
| M9 | 部署上线 + 性能优化 | 0.5-1 周 |

总计约 8-13 周，一个人开发的话按自己节奏来就行。

---

### 成就系统架构设计

**成就定义方式**：成就的元数据（名称、描述、图标、解锁条件）全部定义在前端代码中，不存数据库。数据库只记录"谁在什么时候解锁了什么成就"。

```typescript
// apps/web/src/lib/achievements/definitions.ts

interface AchievementDef {
  key: string;              // 唯一标识，如 "first_run"
  name: string;             // 显示名称
  description: string;      // 描述
  icon: string;             // SVG 图标路径或组件名
  category: 'milestone' | 'volume' | 'streak' | 'performance' | 'fun';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  check: (stats: UserStats) => { unlocked: boolean; progress?: number; target?: number };
}

const achievements: AchievementDef[] = [
  {
    key: 'first_run',
    name: '初出茅庐',
    description: '完成第一次跑步记录',
    icon: 'badge-first-run',
    category: 'milestone',
    rarity: 'common',
    check: (stats) => ({
      unlocked: stats.totalRuns >= 1,
      progress: Math.min(stats.totalRuns, 1),
      target: 1
    })
  },
  {
    key: '10k_runner',
    name: '10K 跑者',
    description: '单次跑步达到 10km',
    icon: 'badge-10k',
    category: 'milestone',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.maxSingleDistance >= 10,
      progress: Math.min(stats.maxSingleDistance, 10),
      target: 10
    })
  },
  {
    key: 'volume_100km',
    name: '百公里俱乐部',
    description: '累计跑量达到 100km',
    icon: 'badge-100km',
    category: 'volume',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.totalDistance >= 100,
      progress: Math.min(stats.totalDistance, 100),
      target: 100
    })
  },
  // ... 更多成就
];
```

**服务端检测流程**：POST /api/runs 保存记录后，服务端拉取该用户的汇总统计数据（totalRuns, totalDistance, maxSingleDistance, consecutiveDays 等），然后调用与前端相同的成就检测逻辑（可提取为共享包），把新解锁的成就写入 UserAchievement 表。

**前后端共享检测逻辑**：可以把成就定义和检测函数抽到 monorepo 的 `packages/shared` 包中，前后端共用同一份代码，保证判定逻辑一致。

```
sport-app/
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── achievements/
│       │   │   ├── definitions.ts    # 成就元数据和检测函数
│       │   │   ├── types.ts          # 成就相关类型
│       │   │   └── index.ts
│       │   └── index.ts
│       └── package.json
```
