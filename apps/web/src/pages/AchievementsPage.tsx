import { useState, useEffect } from 'react';
import api, { getApiErrorMessage, toNaiveIso } from '@/lib/api';
import ShareModal from '@/components/ShareModal';

type Tab = 'achievements' | 'challenges';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'milestone' | 'volume' | 'streak' | 'performance' | 'fun';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string | null;
}

interface Challenge {
  id: string;
  title: string;
  type: string;
  targetValue: number;
  unit: string;
  status: 'active' | 'completed' | 'failed';
  startDate: string;
  endDate: string;
  progress: number;
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  milestone:   { label: '里程碑',   icon: '🏅' },
  volume:      { label: '累计跑量', icon: '📏' },
  streak:      { label: '连续打卡', icon: '🔥' },
  performance: { label: '配速表现', icon: '⚡' },
  fun:         { label: '趣味成就', icon: '🎉' },
};

const RARITY_META: Record<string, { label: string; color: string }> = {
  common:    { label: '普通', color: '#9ca3af' },
  rare:      { label: '稀有', color: '#3b82f6' },
  epic:      { label: '史诗', color: '#a855f7' },
  legendary: { label: '传说', color: '#f59e0b' },
};

const CHALLENGE_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: '进行中', color: '#10b981' },
  completed: { label: '已完成', color: '#3b82f6' },
  failed:    { label: '未完成', color: '#9ca3af' },
};

const CHALLENGE_TYPE: Record<string, string> = {
  cumulative: '累计挑战',
  consecutive: '连续挑战',
  single_breakthrough: '单次突破',
};

function defaultEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function MedalIcon({ unlocked }: { unlocked: boolean }) {
  return (
    <div
      className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        opacity: unlocked ? 1 : 0.4,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity={unlocked ? 1 : 0.4}
      >
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    </div>
  );
}

export default function AchievementsPage() {
  const [tab, setTab] = useState<Tab>('achievements');
  const [shareOpen, setShareOpen] = useState(false);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAch, setLoadingAch] = useState(true);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [chFetched, setChFetched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: '', type: 'cumulative', targetValue: '50', unit: 'km', endDate: defaultEndDate(),
  });

  // Fetch achievements on mount
  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.get('/achievements');
        setAchievements(Array.isArray(res) ? res : res?.data ?? []);
      } catch {
        setAchievements([]);
      } finally {
        setLoadingAch(false);
      }
    })();
  }, []);

  // Fetch challenges lazily when tab is opened
  useEffect(() => {
    if (tab !== 'challenges' || chFetched) return;
    setLoadingCh(true);
    (async () => {
      try {
        const res: any = await api.get('/challenges');
        setChallenges(Array.isArray(res) ? res : res?.data ?? []);
      } catch {
        setChallenges([]);
      } finally {
        setLoadingCh(false);
        setChFetched(true);
      }
    })();
  }, [tab, chFetched]);

  const createChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetValue = Number(challengeForm.targetValue);
    if (!challengeForm.title.trim() || targetValue <= 0) {
      setCreateError('请填写挑战名称和有效目标');
      return;
    }
    setSavingChallenge(true);
    setCreateError('');
    try {
      const response = await api.post('/challenges', {
        title: challengeForm.title.trim(),
        type: challengeForm.type,
        targetValue,
        unit: challengeForm.unit,
        startDate: toNaiveIso(new Date()),
        endDate: `${challengeForm.endDate}T23:59:59`,
      }) as unknown as { data: Challenge };
      setChallenges((items) => [response.data, ...items]);
      setChallengeForm({ title: '', type: 'cumulative', targetValue: '50', unit: 'km', endDate: defaultEndDate() });
      setCreating(false);
    } catch (error) {
      setCreateError(getApiErrorMessage(error));
    } finally {
      setSavingChallenge(false);
    }
  };

  const abandonChallenge = async (id: string) => {
    if (!confirm('确认结束这个挑战？')) return;
    try {
      const response = await api.post(`/challenges/${id}/abandon`) as unknown as { data: Challenge };
      setChallenges((items) => items.map((item) => item.id === id ? response.data : item));
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  // Group achievements by category
  const grouped = Object.keys(CATEGORY_META).reduce<Record<string, Achievement[]>>((acc, cat) => {
    acc[cat] = achievements.filter((a) => a.category === cat);
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">成就 & 挑战</h1>
        {tab === 'achievements' && (
          <button
            onClick={() => setShareOpen(true)}
            className="btn-secondary text-sm"
          >
            分享成就
          </button>
        )}
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
          {loadingAch ? (
            <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="text-sm">加载中…</p>
            </div>
          ) : (
            <>
              {/* 成就统计 */}
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    已解锁成就
                  </p>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-accent)' }}>
                    {unlockedCount}{' '}
                    <span className="text-base font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                      / {totalCount}
                    </span>
                  </p>
                </div>
              </div>

              {/* 按类别分组展示 */}
              {Object.entries(grouped).map(([cat, items]) => {
                if (items.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <section key={cat} className="space-y-3">
                    <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {meta.icon} {meta.label}
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                      {items.map((ach) => {
                        const rarity = RARITY_META[ach.rarity] ?? RARITY_META.common;
                        return (
                          <div
                            key={ach.id}
                            className="card text-center py-4 flex flex-col items-center"
                            style={{ opacity: ach.unlocked ? 1 : 0.4 }}
                          >
                            <MedalIcon unlocked={ach.unlocked} />
                            <p className="text-xs font-medium leading-tight">{ach.name}</p>
                            <p
                              className="text-xs mt-0.5 leading-tight"
                              style={{ color: 'var(--color-text-secondary)' }}
                              title={ach.description}
                            >
                              {ach.description.length > 12
                                ? ach.description.slice(0, 12) + '…'
                                : ach.description}
                            </p>
                            <span
                              className="text-xs mt-1 px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: `${rarity.color}22`, color: rarity.color }}
                            >
                              {rarity.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {totalCount === 0 && (
                <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
                  <p className="text-sm">暂无成就数据</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          <button
            className="btn-primary w-full"
            onClick={() => { setCreating((value) => !value); setCreateError(''); }}
          >
            {creating ? '收起创建表单' : '+ 发起新挑战'}
          </button>

          {creating && (
            <form onSubmit={createChallenge} className="card space-y-3">
              <div><label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>挑战名称</label>
                <input className="input mt-1" placeholder="例如：30 天累计跑 50 km" value={challengeForm.title}
                  onChange={(event) => setChallengeForm({ ...challengeForm, title: event.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>挑战类型</label>
                  <select className="input mt-1" value={challengeForm.type} onChange={(event) => setChallengeForm({ ...challengeForm, type: event.target.value })}>
                    {Object.entries(CHALLENGE_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>目标数值</label>
                  <input type="number" min="0.1" step="0.1" className="input mt-1" value={challengeForm.targetValue}
                    onChange={(event) => setChallengeForm({ ...challengeForm, targetValue: event.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>单位</label>
                  <select className="input mt-1" value={challengeForm.unit} onChange={(event) => setChallengeForm({ ...challengeForm, unit: event.target.value })}>
                    <option value="km">公里</option><option value="times">次数</option><option value="days">天</option>
                  </select></div>
                <div><label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>结束日期</label>
                  <input type="date" className="input mt-1" min={new Date().toISOString().slice(0, 10)} value={challengeForm.endDate}
                    onChange={(event) => setChallengeForm({ ...challengeForm, endDate: event.target.value })} /></div>
              </div>
              {createError && <div className="form-alert" role="alert">{createError}</div>}
              <button className="btn-primary w-full" disabled={savingChallenge}>{savingChallenge ? '创建中…' : '创建挑战'}</button>
            </form>
          )}

          {loadingCh ? (
            <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="text-sm">加载中…</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="text-sm">还没有挑战</p>
              <p className="text-xs mt-1">发起一个限时挑战，给自己加点压力</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((ch) => {
                const status = CHALLENGE_STATUS[ch.status] ?? CHALLENGE_STATUS.active;
                const progressPct = Math.min(Math.max(ch.progress / Math.max(ch.targetValue, 1) * 100, 0), 100);
                return (
                  <div key={ch.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{ch.title}</p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {CHALLENGE_TYPE[ch.type] ?? ch.type} · 目标 {ch.targetValue} {ch.unit}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          截止：{new Date(ch.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium shrink-0 px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${status.color}22`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3">
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: 'var(--color-accent)',
                            }}
                          />
                        </div>
                        <p
                          className="text-xs mt-1 text-right"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {ch.progress.toFixed(1)} / {ch.targetValue} {ch.unit} · {progressPct.toFixed(0)}%
                        </p>
                      {ch.status === 'active' && <button className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }} onClick={() => abandonChallenge(ch.id)}>结束挑战</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        initialType="achievement"
      />
    </div>
  );
}
