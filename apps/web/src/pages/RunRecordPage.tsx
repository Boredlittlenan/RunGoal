import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RunRecordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    distance: '',
    duration: '',
    date: new Date().toISOString().slice(0, 16),
    feeling: 3,
    note: '',
    weather: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 调用 API 保存记录
    navigate('/runs');
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
        <h1 className="text-xl font-bold">手动录入跑步记录</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 距离 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            跑步距离 (km)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="例如 5.0"
            value={form.distance}
            onChange={(e) => setForm({ ...form, distance: e.target.value })}
            required
          />
        </div>

        {/* 时长 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            跑步时长 (分钟)
          </label>
          <input
            type="number"
            min="1"
            className="input"
            placeholder="例如 30"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            required
          />
        </div>

        {/* 日期时间 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            跑步时间
          </label>
          <input
            type="datetime-local"
            className="input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>

        {/* 感受评分 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            主观感受
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, feeling: v })}
                className="w-12 h-12 rounded-xl text-lg font-bold transition-all duration-200"
                style={{
                  backgroundColor: form.feeling === v ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  color: form.feeling === v ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {['😫', '😓', '😐', '😊', '🔥'][v - 1]}
              </button>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            备注
          </label>
          <textarea
            className="input resize-none h-20"
            placeholder="记录一下这次跑步的感受..."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          保存记录
        </button>
      </form>
    </div>
  );
}
