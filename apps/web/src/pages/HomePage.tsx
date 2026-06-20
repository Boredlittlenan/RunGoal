import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* 顶部问候 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hi，跑者</h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            今天准备跑多少？
          </p>
        </div>
        <Link to="/runs/gps" className="btn-primary text-sm">
          开始跑步
        </Link>
      </header>

      {/* 本周概览卡片 */}
      <section className="card space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          本周跑量
        </h2>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold" style={{ color: 'var(--color-accent)' }}>
            0
          </span>
          <span className="text-lg pb-1" style={{ color: 'var(--color-text-secondary)' }}>
            km
          </span>
        </div>
        <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>跑步 0 次</span>
          <span>累计 0 分钟</span>
        </div>
      </section>

      {/* 目标进度 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">进行中的目标</h2>
          <Link to="/goals" className="text-sm" style={{ color: 'var(--color-accent)' }}>
            查看全部
          </Link>
        </div>
        <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">还没有设定目标</p>
          <Link to="/goals" className="btn-primary mt-4 inline-block text-sm">
            创建第一个目标
          </Link>
        </div>
      </section>

      {/* 最近跑步记录 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近跑步</h2>
          <Link to="/runs" className="text-sm" style={{ color: 'var(--color-accent)' }}>
            查看全部
          </Link>
        </div>
        <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">还没有跑步记录</p>
          <p className="text-xs mt-1">去记录你的第一次跑步吧</p>
        </div>
      </section>
    </div>
  );
}
