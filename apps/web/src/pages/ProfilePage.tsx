import { useThemeStore } from '@/stores/useThemeStore';

export default function ProfilePage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold">个人中心</h1>
      </header>

      {/* 用户信息卡片 */}
      <section className="card flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          🏃
        </div>
        <div>
          <h2 className="text-lg font-semibold">跑者</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            累计跑量 0 km · 跑步 0 次
          </p>
        </div>
      </section>

      {/* 设置列表 */}
      <section className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {/* 主题切换 */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">外观主题</span>
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {theme === 'dark' ? '🌙 暗色' : '☀️ 亮色'}
          </button>
        </div>

        {/* 编辑资料 */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">编辑资料</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            昵称、体重、头像 →
          </span>
        </div>

        {/* 数据导出 */}
        <div className="flex items-center justify-between py-4 opacity-40">
          <span className="text-sm font-medium">导出数据</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            CSV / GPX →
          </span>
        </div>

        {/* 关于 */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">关于 RunGoal</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            v0.1.0
          </span>
        </div>
      </section>
    </div>
  );
}
