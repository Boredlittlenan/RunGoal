import { useState, useEffect } from 'react';
import api from '@/lib/api';
import ShareModal from '@/components/ShareModal';

interface OverviewStats {
  totalDistance: number;
  totalDuration: number;
  totalRuns: number;
  avgPace?: number;
}

function fmtPace(minPerKm?: number): string {
  if (!minPerKm) return '--';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function StatsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    api.get('/stats/overview').then((res: any) => {
      setOverview(res?.data ?? res);
    }).catch(() => {});
  }, []);

  const o = overview ?? { totalDistance: 0, totalDuration: 0, totalRuns: 0 };

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">数据统计</h1>
        <button
          onClick={() => setShareOpen(true)}
          className="btn-secondary text-sm"
        >
          分享报告
        </button>
      </header>

      {/* 总览数据 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          跑步总览
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {o.totalDistance.toFixed(1)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>总跑量(km)</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {o.totalRuns}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>跑步次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {Math.round(o.totalDuration / 60)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>总时长(min)</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {fmtPace(o.avgPace)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>均配速</p>
          </div>
        </div>
      </section>

      {/* 快速分享卡片选择 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          快速分享
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '本周', icon: '📊' },
            { label: '本月', icon: '📈' },
            { label: '本年', icon: '🎯' },
          ].map(({ label, icon }) => (
            <button
              key={label}
              onClick={() => setShareOpen(true)}
              className="text-center py-4 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-sm font-medium">{label}报告</p>
            </button>
          ))}
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

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} initialType="month" />
    </div>
  );
}
