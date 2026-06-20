export default function StatsPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold">数据统计</h1>
      </header>

      {/* 总览数据 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          跑步总览
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>0</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>总跑量 (km)</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>0</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>跑步次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>0</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>总时长 (min)</p>
          </div>
        </div>
      </section>

      {/* 日历热力图占位 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          跑量日历
        </h2>
        <div className="h-32 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            热力图（接入 ECharts 后展示）
          </p>
        </div>
      </section>

      {/* 配速趋势占位 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          配速趋势
        </h2>
        <div className="h-40 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            趋势图（接入 ECharts 后展示）
          </p>
        </div>
      </section>

      {/* 周/月统计占位 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          本周跑量
        </h2>
        <div className="h-40 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            柱状图（接入 ECharts 后展示）
          </p>
        </div>
      </section>
    </div>
  );
}
