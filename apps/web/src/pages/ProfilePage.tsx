import { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import api from '@/lib/api';

/* ─────────────────────────── Types ─────────────────────────── */

interface OverviewStats {
  totalDistance: number;
  totalDuration: number;
  totalRuns: number;
  avgPace?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  unlocked: boolean;
  unlockedAt?: string | null;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'expired';
  deadline?: string;
  progress?: number;
  target?: string;
}

/* ─────────────────────────── Constants ─────────────────────────── */

const RARITY: Record<string, { label: string; color: string }> = {
  common:    { label: '普通', color: '#9ca3af' },
  rare:      { label: '稀有', color: '#3b82f6' },
  epic:      { label: '史诗', color: '#a855f7' },
  legendary: { label: '传说', color: '#f59e0b' },
};

const CHALLENGE_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: '进行中', color: '#10b981' },
  completed: { label: '已完成', color: '#3b82f6' },
  expired:   { label: '已过期', color: '#9ca3af' },
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ─────────────────────────── Helpers ─────────────────────────── */

function fmtPace(minPerKm?: number): string {
  if (!minPerKm) return '--:--';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  return `${m} 分钟`;
}

/** Compress an image file using Canvas and return a base64 JPEG data URL */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
        } else {
          if (height > MAX) { width = (width * MAX) / height; height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────── Component ─────────────────────────── */

export default function ProfilePage() {
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const { user, updateUser, logout } = useAuthStore();

  const [stats, setStats] = useState<OverviewStats>({ totalDistance: 0, totalDuration: 0, totalRuns: 0 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user?.username ?? '',
    nickname: user?.nickname ?? '',
    weight: user?.weight?.toString() ?? '',
    height: user?.height?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Fetch data on mount ── */
  useEffect(() => {
    api.get('/stats/overview').then((res: any) => {
      const d = res?.data ?? res ?? {};
      setStats({ totalDistance: d.totalDistance ?? 0, totalDuration: d.totalDuration ?? 0, totalRuns: d.totalRuns ?? 0, avgPace: d.avgPace });
    }).catch(() => {});

    api.get('/achievements').then((res: any) => {
      const items = Array.isArray(res) ? res : res?.data ?? [];
      setAchievements(items);
    }).catch(() => {});

    api.get('/challenges').then((res: any) => {
      const items = Array.isArray(res) ? res : res?.data ?? [];
      setChallenges(items);
    }).catch(() => {});
  }, []);

  /* ── Theme ── */
  const handleThemeToggle = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    try { await api.put('/user/theme', { theme: next }); } catch { setTheme(theme); }
  };

  /* ── Save profile ── */
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
    } finally { setSaving(false); }
  };

  /* ── Avatar upload ── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('仅支持 JPG、PNG、WebP、GIF 格式');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('图片不能超过 10 MB');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      const res: any = await api.put('/user/profile', { avatar: dataUrl });
      updateUser(res.data);
    } catch {
      alert('头像上传失败，请重试');
    } finally { setUploading(false); }
  };

  /* ── Derived ── */
  const unlockedAch = achievements.filter(a => a.unlocked);
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  return (
    <div className="pb-8">
      {/* ═══ Header ═══ */}
      <div
        className="px-4 pt-8 pb-6"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent) 0%, #6366f1 100%)',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.5)' }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : '🏃'}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: '#fff', color: 'var(--color-accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
              {uploading ? '…' : '📷'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-0 text-white">
            <h2 className="text-xl font-bold truncate">{user?.nickname ?? '跑者'}</h2>
            <p className="text-sm opacity-80">@{user?.username ?? ''}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-around mt-5 rounded-xl py-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{stats.totalDistance.toFixed(1)}</p>
            <p className="text-xs text-white opacity-70">总公里</p>
          </div>
          <div className="text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
            <p className="text-lg font-bold text-white">{stats.totalRuns}</p>
            <p className="text-xs text-white opacity-70">跑步次数</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{fmtDuration(stats.totalDuration)}</p>
            <p className="text-xs text-white opacity-70">总时长</p>
          </div>
          <div className="text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
            <p className="text-lg font-bold text-white">{fmtPace(stats.avgPace)}</p>
            <p className="text-xs text-white opacity-70">平均配速</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* ═══ 成就 ═══ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">我的成就</h3>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              已解锁 {unlockedAch.length}/{achievements.length}
            </span>
          </div>
          {achievements.length === 0 ? (
            <div className="card text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="text-sm">暂无成就</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {achievements.map(ach => {
                const r = RARITY[ach.rarity] ?? RARITY.common;
                return (
                  <div
                    key={ach.id}
                    className="card text-center py-3 flex flex-col items-center"
                    style={{ opacity: ach.unlocked ? 1 : 0.35 }}
                    title={ach.description}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                      style={{ backgroundColor: ach.unlocked ? `${r.color}22` : 'var(--color-bg-secondary)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ach.unlocked ? r.color : 'var(--color-text-secondary)'} strokeWidth="2">
                        <circle cx="12" cy="8" r="6" />
                        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium leading-tight truncate w-full px-1">{ach.name}</p>
                    <span
                      className="text-xs mt-0.5 px-1 py-px rounded"
                      style={{ backgroundColor: `${r.color}22`, color: r.color, fontSize: 10 }}
                    >
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ 挑战 ═══ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">我的挑战</h3>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {activeChallenges.length} 个进行中
            </span>
          </div>
          {challenges.length === 0 ? (
            <div className="card text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="text-sm">还没有挑战</p>
              <p className="text-xs mt-1">给自己设定一个目标吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...activeChallenges, ...completedChallenges].map(ch => {
                const st = CHALLENGE_STATUS[ch.status] ?? CHALLENGE_STATUS.active;
                return (
                  <div key={ch.id} className="card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{ch.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                          {ch.description}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${st.color}22`, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                    {ch.progress != null && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                          <div className="h-full rounded-full" style={{ width: `${ch.progress}%`, backgroundColor: 'var(--color-accent)' }} />
                        </div>
                        <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                          {ch.progress}%{ch.target ? ` · ${ch.target}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ 编辑资料 ═══ */}
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
                  setForm({ username: user?.username ?? '', nickname: user?.nickname ?? '', weight: user?.weight?.toString() ?? '', height: user?.height?.toString() ?? '' });
                }}
              >
                取消
              </button>
            </div>
          </section>
        )}

        {/* ═══ 设置列表 ═══ */}
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

        {/* ═══ 退出 ═══ */}
        <button
          className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}
          onClick={() => { if (confirm('确定退出登录？')) logout(); }}
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
