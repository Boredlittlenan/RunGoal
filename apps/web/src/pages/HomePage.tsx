import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

interface WeeklyStats {
  totalDistance: number;
  runCount: number;
  totalDuration: number;
}

interface RunRecord {
  id: string;
  startedAt: string;
  distance: number;
  duration: number;
  avgPace: number | null;
}

interface GoalCard {
  goal: {
    id: string;
    title: string;
    type: string;
    targetValue: number;
    unit: string;
    period: string;
    isActive: boolean;
  };
  currentValue: number;
  progressPct: number;
}

const GOAL_TYPE_META: Record<string, { color: string; icon: string }> = {
  cumulative: { color: '#6366f1', icon: '📊' },
  frequency:  { color: '#10b981', icon: '🔄' },
  pace:       { color: '#f59e0b', icon: '⚡' },
  distance:   { color: '#ef4444', icon: '🏃' },
};

function formatPace(pace: number): string {
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  return Math.round(seconds / 60).toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalDistance: 0,
    runCount: 0,
    totalDuration: 0,
  });
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [activeGoals, setActiveGoals] = useState<GoalCard[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);

  useEffect(() => {
    // Fetch weekly stats
    api
      .get('/stats/weekly')
      .then((res: any) => {
        const data = res.data;
        setWeeklyStats({
          totalDistance: data.totalDistance ?? 0,
          runCount: data.runCount ?? 0,
          totalDuration: data.totalDuration ?? 0,
        });
      })
      .catch(() => {
        // Silently ignore — show zeros
      });

    // Fetch recent runs
    api
      .get('/runs', { params: { pageSize: 5 } })
      .then((res: any) => {
        const data = res.data;
        const list = data.list ?? data.records ?? data ?? [];
        setRecentRuns(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setRecentRuns([]);
      });

    // Fetch active goals with progress
    api
      .get('/goals', { params: { isActive: true } })
      .then((res: any) => {
        const items = Array.isArray(res) ? res : res?.data ?? [];
        setActiveGoals(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        setActiveGoals([]);
      })
      .finally(() => {
        setGoalsLoaded(true);
      });
  }, []);

  const nickname = user?.nickname ?? '跑者';
  const distanceDisplay = weeklyStats.totalDistance.toFixed(1);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 顶部问候 */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hi，{nickname}</h1>
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
            {distanceDisplay}
          </span>
          <span className="text-lg pb-1" style={{ color: 'var(--color-text-secondary)' }}>
            km
          </span>
        </div>
        <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>跑步 {weeklyStats.runCount} 次</span>
          <span>累计 {formatDuration(weeklyStats.totalDuration)} 分钟</span>
        </div>
      </section>

      {/* 目标进度 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">进行中的目标</h2>
          {activeGoals.length > 0 && (
            <Link to="/goals" className="text-sm" style={{ color: 'var(--color-accent)' }}>
              查看全部
            </Link>
          )}
        </div>
        {!goalsLoaded ? (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">目标加载中...</p>
          </div>
        ) : activeGoals.length === 0 ? (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">还没有设定目标</p>
            <Link to="/goals" className="btn-primary mt-4 inline-block text-sm">
              创建第一个目标
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeGoals.map((item) => {
              const g = item.goal;
              const meta = GOAL_TYPE_META[g.type] ?? { color: '#888', icon: '🎯' };
              const pct = Math.min(item.progressPct, 100);
              const isCompleted = pct >= 100;

              return (
                <div key={g.id} className="card">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: `${meta.color}22` }}
                    >
                      {isCompleted ? '✅' : meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{g.title}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{
                            backgroundColor: isCompleted ? '#10b98122' : `${meta.color}22`,
                            color: isCompleted ? '#10b981' : meta.color,
                          }}
                        >
                          {isCompleted ? '已完成' : '进行中'}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {item.currentValue.toFixed(1)} / {g.targetValue} {g.unit}
                          </span>
                          <span style={{ color: isCompleted ? '#10b981' : meta.color, fontWeight: 600 }}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isCompleted ? '#10b981' : meta.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 最近跑步记录 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近跑步</h2>
          {recentRuns.length > 0 && (
            <Link to="/runs" className="text-sm" style={{ color: 'var(--color-accent)' }}>
              查看全部
            </Link>
          )}
        </div>
        {recentRuns.length > 0 ? (
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{formatDate(run.startedAt)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {run.distance.toFixed(2)} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDuration(run.duration)} 分钟</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    配速 {run.avgPace ? formatPace(run.avgPace) : '--:--'} /km
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">还没有跑步记录</p>
            <p className="text-xs mt-1">去记录你的第一次跑步吧！迈出第一步，每一步都算数。</p>
          </div>
        )}
      </section>
    </div>
  );
}
