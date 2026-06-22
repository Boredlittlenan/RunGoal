import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

type Period = 'week' | 'month' | 'all';

interface RankItem {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string | null;
  totalDistance: number;
  runCount: number;
}

interface MyRank {
  rank: number;
  totalDistance: number;
  runCount: number;
}

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: 'week', label: '周榜' },
  { key: 'month', label: '月榜' },
  { key: 'all', label: '总榜' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [list, setList] = useState<RankItem[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res: any = await api.get('/ranking', { params: { period: p } });
      const data = res?.data ?? [];
      setList(Array.isArray(data) ? data : []);
      setMyRank(res?.myRank ?? null);
    } catch {
      setList([]);
      setMyRank(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking(period);
  }, [period, fetchRanking]);

  return (
    <div className="px-4 py-6 space-y-5 pb-28">
      <header>
        <h1 className="text-xl font-bold">排行榜</h1>
      </header>

      {/* 周期切换 */}
      <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: period === tab.key ? 'var(--color-accent)' : 'transparent',
              color: period === tab.key ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 加载中 */}
      {loading ? (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">加载中...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-3xl mb-2">🏃</p>
          <p className="text-sm">暂无排名数据</p>
          <p className="text-xs mt-1">去跑个步，成为第一个上榜的人吧</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {list.map((item, i) => (
              <div key={item.userId} className="card flex items-center gap-3">
                {/* 排名 */}
                {i < 3 ? (
                  <span className="text-xl w-8 text-center shrink-0">{MEDALS[i]}</span>
                ) : (
                  <span
                    className="w-8 text-center text-sm font-bold shrink-0"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {item.rank}
                  </span>
                )}
                {/* 头像 */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: i === 0 ? '2px solid #ffd700' : i === 1 ? '2px solid #c0c0c0' : i === 2 ? '2px solid #cd7f32' : 'none',
                  }}
                >
                  {item.avatar ? (
                    <img src={item.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '🏃'
                  )}
                </div>
                {/* 昵称 + 次数 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.nickname}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.runCount} 次
                  </p>
                </div>
                {/* 跑量 */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {item.totalDistance.toFixed(1)} km
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 我的排名 - 固定底部 */}
      {myRank && (
        <div
          className="fixed left-0 right-0 bottom-16 border-t px-4 py-3"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <span
              className="w-7 text-center text-sm font-bold shrink-0"
              style={{ color: myRank.rank <= 3 ? '#ecc94b' : 'var(--color-text-secondary)' }}
            >
              {myRank.rank}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              🏃
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">我的排名</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                {myRank.totalDistance.toFixed(1)} km
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {myRank.runCount} 次
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
