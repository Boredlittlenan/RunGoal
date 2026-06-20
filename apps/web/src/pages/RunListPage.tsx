import { Link } from 'react-router-dom';

export default function RunListPage() {
  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">跑步记录</h1>
        <div className="flex gap-2">
          <Link to="/runs/record" className="btn-secondary text-sm">
            手动录入
          </Link>
          <Link to="/runs/gps" className="btn-primary text-sm">
            GPS 跑步
          </Link>
        </div>
      </header>

      {/* 记录列表 */}
      <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
        <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
          <circle cx="13.5" cy="6.5" r="2.5" />
          <path d="M17 2H13.5L10 8l-3.5 2 1 5-3 4h3l3-3 2 3v3h3v-4l-2-4 1-3" />
        </svg>
        <p className="text-sm">还没有跑步记录</p>
        <p className="text-xs mt-1">点击上方按钮开始你的第一次跑步</p>
      </div>
    </div>
  );
}
