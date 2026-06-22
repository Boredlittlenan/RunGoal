import { useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import api from '@/lib/api';

interface OverviewStats {
  totalDistance: number;
  totalDuration: number;
  totalRuns: number;
}

export default function ProfilePage() {
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const { user, updateUser, logout } = useAuthStore();

  const [stats, setStats] = useState<OverviewStats>({ totalDistance: 0, totalDuration: 0, totalRuns: 0 });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user?.username ?? '',
    nickname: user?.nickname ?? '',
    weight: user?.weight?.toString() ?? '',
    height: user?.height?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/stats/overview').then((res: any) => {
      const d = res?.data ?? res ?? {};
      setStats({
        totalDistance: d.totalDistance ?? 0,
        totalDuration: d.totalDuration ?? 0,
        totalRuns: d.totalRuns ?? 0,
      });
    }).catch(() => {});
  }, []);

  const handleThemeToggle = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    try {
      await api.put('/user/theme', { theme: next });
    } catch {
      setTheme(theme);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
      };
      const res: any = await api.put('/user/profile', payload);
      updateUser(res.data);
      setEditing(false);
    } catch (err: any) {
      alert(err?.error || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-5 pb-28">
      <header className="card flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
          ) : '🏃'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate">{user?.nickname ?? '跑者'}</h2>
          <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
            @{user?.username ?? ''}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            累计跑量 {stats.totalDistance.toFixed(1)} km · 跑步 {stats.totalRuns} 次
          </p>
        </div>
      </header>

      {editing && (
        <section className="card space-y-3">
          <p className="text-sm font-semibold">编辑资料</p>
          <div>
            <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>用户名</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="字母、数字、下划线和.，4-16 位"
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>昵称</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>体重 (kg)</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>身高 (cm)</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1 text-sm" onClick={handleSave} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              className="flex-1 text-sm py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
              onClick={() => {
                setEditing(false);
                setForm({
                  username: user?.username ?? '',
                  nickname: user?.nickname ?? '',
                  weight: user?.weight?.toString() ?? '',
                  height: user?.height?.toString() ?? '',
                });
              }}
            >
              取消
            </button>
          </div>
        </section>
      )}

      <section className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">外观主题</span>
          <button
            onClick={handleThemeToggle}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
          >
            {theme === 'dark' ? '🌙 暗色' : '☀️ 亮色'}
          </button>
        </div>
        {!editing && (
          <div className="flex items-center justify-between py-4 cursor-pointer" onClick={() => setEditing(true)}>
            <span className="text-sm font-medium">编辑资料</span>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>用户名、昵称、体重 →</span>
          </div>
        )}
        <div className="flex items-center justify-between py-4 opacity-40">
          <span className="text-sm font-medium">导出数据</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>CSV / GPX →</span>
        </div>
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">关于 RunGoal</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>v1.0.0</span>
        </div>
      </section>

      <button
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
        style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}
        onClick={() => { if (confirm('确定退出登录？')) logout(); }}
      >
        退出登录
      </button>
    </div>
  );
}
