import { useState } from 'react';

type Tab = 'achievements' | 'challenges';

export default function AchievementsPage() {
  const [tab, setTab] = useState<Tab>('achievements');

  return (
    <div className="px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-bold">成就 & 挑战</h1>
      </header>

      {/* Tab 切换 */}
      <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        {(['achievements', 'challenges'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-sm font-medium transition-colors duration-200"
            style={{
              backgroundColor: tab === t ? 'var(--color-accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {t === 'achievements' ? '成就墙' : '我的挑战'}
          </button>
        ))}
      </div>

      {tab === 'achievements' && (
        <div className="space-y-4">
          {/* 成就统计 */}
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                已解锁成就
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-accent)' }}>
                0 <span className="text-base font-normal" style={{ color: 'var(--color-text-secondary)' }}>/ 19</span>
              </p>
            </div>
          </div>

          {/* 里程碑类 */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              里程碑
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {['初出茅庐', '5K 跑者', '10K 跑者', '半马达成', '全马达成'].map((name) => (
                <div key={name} className="card text-center py-4 opacity-40">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium">{name}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 累计类 */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              累计跑量
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {['百公里俱乐部', '五百公里', '千公里达人', '地球环跑'].map((name) => (
                <div key={name} className="card text-center py-4 opacity-40">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium">{name}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          <button className="btn-primary w-full">+ 发起新挑战</button>

          <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">还没有挑战</p>
            <p className="text-xs mt-1">发起一个限时挑战，给自己加点压力</p>
          </div>
        </div>
      )}
    </div>
  );
}
