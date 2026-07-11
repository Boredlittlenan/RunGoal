import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { type ApiEnvelope } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

interface WeeklyStats { totalDistance: number; totalRuns: number; totalDuration: number }
interface RunRecord { id: string; startedAt: string; distance: number; duration: number; avgPace: number | null }
interface GoalProgress {
  goal: { id: string; title: string; targetValue: number; unit: string; isActive: boolean };
  currentValue: number;
  progressPct: number;
}
interface RunListEnvelope extends ApiEnvelope<RunRecord[]> { meta?: { total: number } }

const emptyStats: WeeklyStats = { totalDistance: 0, totalRuns: 0, totalDuration: 0 };

function formatPace(pace: number | null) {
  if (!pace || !Number.isFinite(pace)) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  return `${Math.floor(seconds / 3600)} 小时 ${Math.round((seconds % 3600) / 60)} 分`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(value));
}

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const [weeklyStats, setWeeklyStats] = useState(emptyStats);
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [activeGoal, setActiveGoal] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      const results = await Promise.allSettled([
        api.get('/stats/weekly') as unknown as Promise<ApiEnvelope<WeeklyStats>>,
        api.get('/runs', { params: { pageSize: 3 } }) as unknown as Promise<RunListEnvelope>,
        api.get('/goals') as unknown as Promise<ApiEnvelope<GoalProgress[]>>,
      ]);
      if (!active) return;

      const [statsResult, runsResult, goalsResult] = results;
      if (statsResult.status === 'fulfilled') setWeeklyStats(statsResult.value.data);
      if (runsResult.status === 'fulfilled') setRecentRuns(runsResult.value.data);
      if (goalsResult.status === 'fulfilled') {
        setActiveGoal(goalsResult.value.data.find((item) => item.goal.isActive) ?? null);
      }
      setHasError(results.every((result) => result.status === 'rejected'));
      setLoading(false);
    }
    void loadDashboard();
    return () => { active = false; };
  }, []);

  const nickname = user?.nickname?.trim() || '跑者';
  const greeting = new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好';
  const goalPct = Math.min(Math.max(activeGoal?.progressPct ?? 0, 0), 100);

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div>
          <p className="eyebrow">{greeting} · {nickname}</p>
          <h1>今天，也为目标<br />多走一步。</h1>
        </div>
        <Link to="/profile" className="runner-avatar" aria-label="打开个人中心">
          {user?.avatar ? <img src={user.avatar} alt="" /> : nickname.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      {hasError && (
        <div className="dashboard-alert" role="alert">
          <span>数据暂时没有跟上</span><button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      )}

      <section className="weekly-hero">
        <div className="weekly-hero__orbit" aria-hidden="true" />
        <div className="weekly-hero__heading">
          <span>本周跑量</span><span>MON — SUN</span>
        </div>
        <div className="weekly-hero__distance">
          <strong>{loading ? '—' : weeklyStats.totalDistance.toFixed(1)}</strong><span>KM</span>
        </div>
        <div className="weekly-hero__footer">
          <div><strong>{weeklyStats.totalRuns}</strong><span>次训练</span></div>
          <div><strong>{formatDuration(weeklyStats.totalDuration)}</strong><span>运动时长</span></div>
          <Link to="/runs/gps" className="run-cta"><span>开始跑步</span><b>↗</b></Link>
        </div>
      </section>

      <section className="quick-grid" aria-label="快捷操作">
        <Link to="/runs/record"><span className="quick-grid__icon">＋</span><div><strong>手动记录</strong><small>补录一次训练</small></div><b>→</b></Link>
        <Link to="/goals/create"><span className="quick-grid__icon">◎</span><div><strong>新建目标</strong><small>给下一程定方向</small></div><b>→</b></Link>
      </section>

      <section className="home-section">
        <div className="section-heading"><div><p className="eyebrow">Next milestone</p><h2>当前目标</h2></div><Link to="/goals">全部目标</Link></div>
        {loading ? (
          <div className="card home-skeleton"><span /><span /><span /></div>
        ) : activeGoal ? (
          <Link to="/goals" className="goal-spotlight card">
            <div className="goal-spotlight__dial" style={{ '--goal-progress': `${goalPct * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{goalPct.toFixed(0)}</strong><span>%</span></div>
            </div>
            <div className="goal-spotlight__copy">
              <p>{activeGoal.goal.title}</p>
              <strong>{activeGoal.currentValue.toFixed(1)} <small>/ {activeGoal.goal.targetValue} {activeGoal.goal.unit}</small></strong>
              <div><span style={{ width: `${goalPct}%` }} /></div>
            </div>
            <span className="goal-spotlight__arrow">↗</span>
          </Link>
        ) : (
          <Link to="/goals/create" className="empty-goal card"><span>＋</span><div><strong>建立第一个目标</strong><p>有方向的每一步，更容易坚持。</p></div></Link>
        )}
      </section>

      <section className="home-section">
        <div className="section-heading"><div><p className="eyebrow">Recent activity</p><h2>最近跑步</h2></div>{recentRuns.length > 0 && <Link to="/runs">查看全部</Link>}</div>
        <div className="recent-list">
          {loading ? <div className="card home-skeleton"><span /><span /></div> : recentRuns.length > 0 ? recentRuns.map((run, index) => (
            <article key={run.id} className="recent-run card">
              <span className="recent-run__index">{String(index + 1).padStart(2, '0')}</span>
              <div><p>{formatDate(run.startedAt)}</p><strong>{run.distance.toFixed(2)} <small>km</small></strong></div>
              <div className="recent-run__meta"><span>{formatDuration(run.duration)}</span><span>{formatPace(run.avgPace)} /km</span></div>
            </article>
          )) : <div className="empty-runs card"><span>⌁</span><div><strong>还没有跑步记录</strong><p>第一次不必很远，出发就好。</p></div><Link to="/runs/record">去记录</Link></div>}
        </div>
      </section>
    </div>
  );
}
