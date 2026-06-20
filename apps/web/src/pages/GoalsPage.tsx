import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Goal {
  id: string;
  title: string;
  type: string;          // cumulative | frequency | pace | distance
  targetValue: number;
  unit: string;
  period: string;        // weekly | monthly | once
  isActive: boolean;
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  cumulative: { label: '累计型', color: '#6366f1', icon: '📊' },
  frequency:  { label: '频次型', color: '#10b981', icon: '🔄' },
  pace:       { label: '配速型', color: '#f59e0b', icon: '⚡' },
  distance:   { label: '距离型', color: '#ef4444', icon: '🏃' },
};

const PERIOD_LABEL: Record<string, string> = {
  weekly:  '每周',
  monthly: '每月',
  once:    '一次性',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.get('/goals');
        // handle both { data: [...] } and plain array
        setGoals(Array.isArray(res) ? res : res?.data ?? []);
      } catch {
        setGoals([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = () => {
    alert('功能开发中');
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">我的目标</h1>
        <button
          onClick={handleCreate}
          className="btn-primary text-sm"
        >
          + 新建目标
        </button>
      </header>

      {/* 目标类型说明 */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <div key={key} className="card text-center py-3 cursor-pointer hover:opacity-80 transition-opacity">
            <p className="text-2xl mb-1">{meta.icon}</p>
            <p className="text-sm font-medium">{meta.label}</p>
          </div>
        ))}
      </div>

      {/* 目标列表 */}
      {loading ? (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">加载中…</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">还没有创建目标</p>
          <p className="text-xs mt-1">设定你的第一个跑步目标吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const meta = TYPE_META[goal.type] ?? { label: goal.type, color: '#888', icon: '🎯' };
            return (
              <div key={goal.id} className="card flex items-center gap-3">
                {/* 类型图标 */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${meta.color}22` }}
                >
                  {meta.icon}
                </div>

                {/* 主内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{goal.title}</span>
                    {/* 类型标签 */}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    目标：{goal.targetValue} {goal.unit}
                    {goal.period && ` · ${PERIOD_LABEL[goal.period] ?? goal.period}`}
                  </p>
                </div>

                {/* 状态 */}
                <span
                  className="text-xs font-medium shrink-0"
                  style={{ color: goal.isActive ? '#10b981' : 'var(--color-text-secondary)' }}
                >
                  {goal.isActive ? '进行中' : '已暂停'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
