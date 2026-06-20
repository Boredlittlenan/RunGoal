import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { toNaiveIso } from '@/lib/api';

const GOAL_TYPES = [
  { key: 'cumulative', label: '累计型', icon: '📊', desc: '累计跑量达标', unit: 'km' },
  { key: 'frequency',  label: '频次型', icon: '🔄', desc: '跑步次数达标', unit: '次' },
  { key: 'pace',       label: '配速型', icon: '⚡', desc: '平均配速达标', unit: 'min/km' },
  { key: 'distance',   label: '距离型', icon: '🏃', desc: '单次距离达标', unit: 'km' },
];

const PERIODS = [
  { key: 'weekly',  label: '每周' },
  { key: 'monthly', label: '每月' },
  { key: 'once',    label: '一次性' },
];

export default function GoalCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    type: 'cumulative',
    targetValue: '',
    unit: 'km',
    period: 'monthly',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (key: string) => {
    const meta = GOAL_TYPES.find((t) => t.key === key);
    setForm({ ...form, type: key, unit: meta?.unit ?? 'km' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetValue = parseFloat(form.targetValue);
    if (!form.title.trim()) { setError('请输入目标名称'); return; }
    if (!targetValue || targetValue <= 0) { setError('请输入有效的目标值'); return; }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: form.title.trim(),
        type: form.type,
        targetValue,
        unit: form.unit,
        period: form.period,
        startDate: toNaiveIso(new Date(form.startDate)),
      };
      if (form.endDate) {
        body.endDate = toNaiveIso(new Date(form.endDate));
      }
      await api.post('/goals', body);
      navigate('/goals');
    } catch (err: any) {
      setError(err?.error || err?.message || '创建失败，请重试');
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <button
          onClick={() => navigate(-1)}
          className="text-sm mb-2"
          style={{ color: 'var(--color-accent)' }}
        >
          &larr; 返回
        </button>
        <h1 className="text-xl font-bold">新建目标</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 目标名称 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            目标名称
          </label>
          <input
            type="text"
            className="input"
            placeholder="例如：6月跑量100公里"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        {/* 目标类型 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            目标类型
          </label>
          <div className="grid grid-cols-2 gap-3">
            {GOAL_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTypeChange(t.key)}
                className="card text-center py-3 transition-all"
                style={{
                  borderColor: form.type === t.key ? 'var(--color-accent)' : 'transparent',
                  borderWidth: 2,
                  opacity: form.type === t.key ? 1 : 0.6,
                }}
              >
                <p className="text-2xl mb-1">{t.icon}</p>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 目标值 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            目标值
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              className="input flex-1"
              placeholder="100"
              value={form.targetValue}
              onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
              required
            />
            <div
              className="flex items-center px-4 rounded-xl text-sm font-medium shrink-0"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              {form.unit}
            </div>
          </div>
        </div>

        {/* 周期 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            目标周期
          </label>
          <div className="flex gap-3">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setForm({ ...form, period: p.key })}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all text-center"
                style={{
                  backgroundColor: form.period === p.key ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  color: form.period === p.key ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 开始时间 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            开始时间
          </label>
          <input
            type="datetime-local"
            className="input"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </div>

        {/* 结束时间（可选） */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            结束时间（可选）
          </label>
          <input
            type="datetime-local"
            className="input"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-center text-sm py-2 rounded-lg" style={{ backgroundColor: '#fdecea', color: '#c62828' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={saving}
          style={saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
        >
          {saving ? '创建中...' : '创建目标'}
        </button>
      </form>
    </div>
  );
}
