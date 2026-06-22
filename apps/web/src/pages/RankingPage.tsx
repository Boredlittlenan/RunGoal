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

function formatDistance(km: number): string {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k` : km.toFixed(1);
}

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

  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

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
          {/* 前三名领奖台 */}
          {top3.length >= 3 ? (
            <div className="flex items-end justify-center gap-3 pt-4 pb-2">
              {/* 第二名 */}
              <div className="flex flex-col items-center w-24">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '3px solid #c0c0c0' }}
                >
                  {top3[1].avatar ? (
                    <img src={top3[1].avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '🏃'
                  )}
                </div>
                <span className="text-xl">{MEDALS[1]}</span>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">{top3[1].nickname}</span>
                <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDistance(top3[1].totalDistance)} km
                </span>
                <div
                  className="w-full rounded-t-lg mt-2 flex items-center justify-center text-white font-bold text-sm"
                  style={{ height: 60, backgroundColor: '#a0aec0' }}
                >
                  2
                </div>
              </div>

              {/* 第一名 */}
              <div className="flex flex-col items-center w-24">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '3px solid #ffd700' }}
                >
                  {top3[0].avatar ? (
                    <img src={top3[0].avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '🏃'
                  )}
                </div>
                <span className="text-xl">{MEDALS[0]}</span>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">{top3[0].nickname}</span>
                <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDistance(top3[0].totalDistance)} km
                </span>
                <div
                  className="w-full rounded-t-lg mt-2 flex items-center justify-center text-white font-bold text-sm"
                  style={{ height: 80, backgroundColor: '#ecc94b' }}
                >
                  1
                </div>
              </div>

              {/* 第三名 */}
              <div className="flex flex-col items-center w-24">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '3px solid #cd7f32' }}
                >
                  {top3[2].avatar ? (
                    <img src={top3[2].avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    '🏃'
                  )}
                </div>
                <span className="text-xl">{MEDALS[2]}</span>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">{top3[2].nickname}</span>
                <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDistance(top3[2].totalDistance)} km
                </span>
                <div
                  className="w-full rounded-t-lg mt-2 flex items-center justify-center text-white font-bold text-sm"
                  style={{ height: 45, backgroundColor: '#c68642' }}
                >
                  3
                </div>
              </div>
            </div>
          ) : (
            /* 不足 3 人时用简单列表 */
            <div className="space-y-2">
              {top3.map((item, i) => (
                <div key={item.userId} className="card flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{MEDALS[i]}</span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    {item.avatar ? (
                      <img src={item.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      '🏃'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nickname}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.runCount} 次
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                      {item.totalDistance.toFixed(1)} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 第 4 名起 */}
          {rest.length > 0 && (
            <div className="space-y-1">
              {rest.map((item) => (
                <div key={item.userId} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className="w-7 text-center text-sm font-semibold shrink-0"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {item.rank}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    {item.avatar ? (
                      <img src={item.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      '🏃'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nickname}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {item.runCount} 次
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                      {item.totalDistance.toFixed(1)} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
