import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

interface GoalItem {
  goal: {
    id: string;
    title: string;
    type: string;
    targetValue: number;
    unit: string;
    period: string;
    isActive: boolean;
    startDate: string;
    endDate?: string;
  };
  currentValue: number;
  progressPct: number;
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
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/goals');
      const items = Array.isArray(res) ? res : res?.data ?? [];
      setGoals(items);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个目标吗？')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch {
      alert('删除失败');
    }
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">我的目标</h1>
        <button
          onClick={() => navigate('/goals/create')}
          className="btn-primary text-sm"
        >
          + 新建目标
        </button>
      </header>

      {/* 目标类型说明 */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <div key={key} className="card text-center py-2">
            <p className="text-xl mb-0.5">{meta.icon}</p>
            <p className="text-xs font-medium">{meta.label}</p>
          </div>
        ))}
      </div>

      {/* 目标列表 */}
      {loading ? (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">加载中...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">还没有创建目标</p>
          <p className="text-xs mt-1">设定你的第一个跑步目标吧</p>
          <button
            onClick={() => navigate('/goals/create')}
            className="btn-primary text-sm mt-4"
          >
            创建第一个目标
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((item) => {
            const g = item.goal;
            const meta = TYPE_META[g.type] ?? { label: g.type, color: '#888', icon: '🎯' };
            const pct = Math.min(item.progressPct, 100);
            const isCompleted = pct >= 100;

            // 状态标签：已完成 > 进行中 > 已暂停
            const statusLabel = isCompleted ? '已完成' : g.isActive ? '进行中' : '已暂停';
            const statusColor = isCompleted ? '#10b981' : g.isActive ? '#10b981' : 'var(--color-text-secondary)';

            return (
              <div key={g.id} className="card">
                <div className="flex items-center gap-3">
                  {/* 类型图标 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${meta.color}22` }}
                  >
                    {isCompleted ? '✅' : meta.icon}
                  </div>

                  {/* 主内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{g.title}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {g.targetValue} {g.unit}
                      {g.period && ` · ${PERIOD_LABEL[g.period] ?? g.period}`}
                    </p>
                  </div>

                  {/* 状态 */}
                  <div className="text-right shrink-0">
                    <span
                      className="text-xs font-medium"
                      style={{ color: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {item.currentValue.toFixed(1)} / {g.targetValue} {g.unit}
                    </span>
                    <span style={{ color: isCompleted ? '#10b981' : meta.color, fontWeight: 600 }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
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

                {/* 操作区 */}
                <div className="flex justify-end mt-2 pt-2" style={{ borderTop: '1px solid var(--color-bg-secondary)' }}>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-xs px-3 py-1 rounded-lg transition-colors"
                    style={{ color: '#ef4444' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
