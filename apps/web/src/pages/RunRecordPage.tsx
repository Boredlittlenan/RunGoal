import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { toNaiveIso } from '@/lib/api';

export default function RunRecordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    distance: '',
    hours: '',
    minutes: '',
    seconds: '',
    date: new Date().toISOString().slice(0, 16),
    feeling: 3,
    note: '',
    weather: '',
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const distanceKm = parseFloat(form.distance);
    const h = parseInt(form.hours) || 0;
    const m = parseInt(form.minutes) || 0;
    const s = parseInt(form.seconds) || 0;
    const durationSeconds = h * 3600 + m * 60 + s;

    if (!distanceKm || distanceKm <= 0) { setErrorMsg('请输入有效的跑步距离'); return; }
    if (durationSeconds <= 0) { setErrorMsg('请输入有效的跑步时长'); return; }

    setSaving(true);
    try {
      await api.post('/runs', {
        distance: distanceKm,
        duration: durationSeconds,
        source: 'manual',
        startedAt: toNaiveIso(new Date(form.date)),
        feeling: form.feeling,
        note: form.note || undefined,
      });

      setSuccessMsg('保存成功！');
      setTimeout(() => navigate('/runs'), 800);
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || '保存失败，请重试');
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

        {/* 时长：时/分/秒 */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            跑步时长
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              max="23"
              className="input text-center"
              style={{ width: 72 }}
              placeholder="0"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>时</span>
            <input
              type="number"
              min="0"
              max="59"
              className="input text-center"
              style={{ width: 72 }}
              placeholder="30"
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>分</span>
            <input
              type="number"
              min="0"
              max="59"
              className="input text-center"
              style={{ width: 72 }}
              placeholder="0"
              value={form.seconds}
              onChange={(e) => setForm({ ...form, seconds: e.target.value })}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>秒</span>
          </div>
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

        {/* Success message */}
        {successMsg && (
          <div className="text-center text-sm py-2 rounded-lg" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="text-center text-sm py-2 rounded-lg" style={{ backgroundColor: '#fdecea', color: '#c62828' }}>
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={saving || !!successMsg}
          style={saving || successMsg ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
        >
          {saving ? '保存中...' : successMsg ? '已保存' : '保存记录'}
        </button>
      </form>
    </div>
  );
}
