import { useState } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import api from '@/lib/api';

export default function ProfilePage() {
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const { user, updateUser, logout } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user?.username ?? '',
    nickname: user?.nickname ?? '',
    weight:   user?.weight?.toString() ?? '',
    height:   user?.height?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleThemeToggle = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    try {
      await api.put('/user/theme', { theme: nextTheme });
    } catch {
      // 同步失败时回滚本地主题
      setTheme(theme);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        weight:   form.weight ? Number(form.weight) : undefined,
        height:   form.height ? Number(form.height) : undefined,
      };
      const res: any = await api.put('/user/profile', payload);
      const updatedUser = res.data;
      updateUser(updatedUser);
      setEditing(false);
    } catch (err: any) {
      alert(err?.error || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold">个人中心</h1>
      </header>

      {/* 用户信息卡片 */}
      <section className="card flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            '🏃'
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user?.nickname ?? '跑者'}</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            @{user?.username ?? ''}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            累计跑量 {(user as any)?.totalDistance ?? 0} km · 跑步 {(user as any)?.totalRuns ?? 0} 次
          </p>
        </div>
      </section>

      {/* 编辑资料内联表单 */}
      {editing && (
        <section className="card space-y-3">
          <p className="text-sm font-semibold">编辑资料</p>
          <div>
            <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>用户名</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="字母、数字、下划线和.，4-16 位"
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>昵称</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
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
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>身高 (cm)</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              className="btn-primary flex-1 text-sm"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              className="flex-1 text-sm py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              onClick={() => {
                setEditing(false);
                setForm({
                  username: user?.username ?? '',
                  nickname: user?.nickname ?? '',
                  weight:   user?.weight?.toString() ?? '',
                  height:   user?.height?.toString() ?? '',
                });
              }}
            >
              取消
            </button>
          </div>
        </section>
      )}

      {/* 设置列表 */}
      <section className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {/* 主题切换 */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">外观主题</span>
          <button
            onClick={handleThemeToggle}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {theme === 'dark' ? '🌙 暗色' : '☀️ 亮色'}
          </button>
        </div>

        {/* 编辑资料 */}
        {!editing && (
          <div
            className="flex items-center justify-between py-4 cursor-pointer"
            onClick={() => setEditing(true)}
          >
            <span className="text-sm font-medium">编辑资料</span>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              用户名、昵称、体重、头像 →
            </span>
          </div>
        )}

        {/* 数据导出 */}
        <div className="flex items-center justify-between py-4 opacity-40">
          <span className="text-sm font-medium">导出数据</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            CSV / GPX →
          </span>
        </div>

        {/* 关于 */}
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">关于 RunGoal</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            v1.0.0
          </span>
        </div>
      </section>

      {/* 退出登录 */}
      <button
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
        }}
        onClick={() => {
          if (confirm('确定退出登录？')) logout();
        }}
      >
        退出登录
      </button>
    </div>
  );
}
