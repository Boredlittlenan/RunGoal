import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { toNaiveIso } from '@/lib/api';
import ShareModal from '@/components/ShareModal';
import type { RunData } from '@/lib/shareCard';

interface Run {
  id: string;
  distance: number;
  duration: number;
  avgPace?: number;
  source: 'gps' | 'manual';
  feeling?: number;
  startedAt: string;
  endedAt?: string;
  weather?: string;
  note?: string;
  archivedAt?: string;
  calories?: number;
}

const FEELING_EMOJI = ['', '😫', '😓', '😐', '😊', '🔥'];

function formatPace(minPerKm?: number): string {
  if (!minPerKm) return '--';
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  return s > 0 ? `${m}m${s}s` : `${m}min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
}

function daysSinceArchived(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/* ── Edit Modal ── */
function EditModal({ run, onSave, onClose }: {
  run: Run;
  onSave: () => void;
  onClose: () => void;
}) {
  const h = Math.floor(run.duration / 3600);
  const m = Math.floor((run.duration % 3600) / 60);
  const s = run.duration % 60;
  const [form, setForm] = useState({
    distance: run.distance.toString(),
    hours: h.toString(),
    minutes: m.toString(),
    seconds: s.toString(),
    date: run.startedAt.slice(0, 16),
    feeling: run.feeling ?? 3,
    note: run.note ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const distanceKm = parseFloat(form.distance);
    const dur = (parseInt(form.hours) || 0) * 3600 + (parseInt(form.minutes) || 0) * 60 + (parseInt(form.seconds) || 0);
    if (!distanceKm || distanceKm <= 0) { setError('请输入有效距离'); setSaving(false); return; }
    if (dur <= 0) { setError('请输入有效时长'); setSaving(false); return; }

    try {
      await api.put(`/runs/${run.id}`, {
        distance: distanceKm,
        duration: dur,
        startedAt: toNaiveIso(new Date(form.date)),
        feeling: form.feeling,
        note: form.note || null,
      });
      onSave();
    } catch (err: any) {
      setError(err?.error || '保存失败');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">编辑跑步记录</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>距离 (km)</label>
            <input type="number" step="0.01" min="0" className="input" value={form.distance}
              onChange={(e) => setForm({ ...form, distance: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>时长</label>
            <div className="flex gap-2 items-center">
              <input type="number" min="0" max="23" className="input text-center" style={{ width: 64 }} value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              <span className="text-xs">时</span>
              <input type="number" min="0" max="59" className="input text-center" style={{ width: 64 }} value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
              <span className="text-xs">分</span>
              <input type="number" min="0" max="59" className="input text-center" style={{ width: 64 }} value={form.seconds}
                onChange={(e) => setForm({ ...form, seconds: e.target.value })} />
              <span className="text-xs">秒</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>时间</label>
            <input type="datetime-local" className="input" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>感受</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, feeling: v })}
                  className="w-10 h-10 rounded-xl text-lg transition-all"
                  style={{
                    backgroundColor: form.feeling === v ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: form.feeling === v ? '#fff' : 'var(--color-text-secondary)',
                  }}>
                  {['😫', '😓', '😐', '😊', '🔥'][v - 1]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>备注</label>
            <textarea className="input resize-none h-16" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        {error && <p className="text-xs text-center" style={{ color: '#c62828' }}>{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">取消</button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function RunListPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [archivedCount, setArchivedCount] = useState(0);
  const [editingRun, setEditingRun] = useState<Run | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRun, setShareRun] = useState<RunData | undefined>(undefined);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/runs', {
        params: { page: 1, pageSize: 50, archived: tab === 'archived' },
      });
      const items = res?.data ?? res;
      setRuns(Array.isArray(items) ? items : []);
      setArchivedCount(res?.meta?.archivedCount ?? 0);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleArchive = async (id: string) => {
    if (!confirm('确认标记为无效？记录将被归档，30 天内可恢复。')) return;
    try {
      await api.post(`/runs/${id}/archive`);
      fetchRuns();
    } catch {
      alert('操作失败');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/runs/${id}/restore`);
      fetchRuns();
    } catch {
      alert('恢复失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认永久删除这条记录？此操作不可恢复。')) return;
    try {
      await api.delete(`/runs/${id}`);
      fetchRuns();
    } catch {
      alert('删除失败');
    }
  };

  const openShare = (run: Run, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareRun({
      id: run.id, distance: run.distance, duration: run.duration,
      avgPace: run.avgPace, startedAt: run.startedAt,
      feeling: run.feeling, weather: run.weather, note: run.note, source: run.source,
    });
    setShareOpen(true);
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">跑步记录</h1>
        <div className="flex gap-2">
          <Link to="/runs/record" className="btn-secondary text-sm">手动录入</Link>
          <Link to="/runs/gps" className="btn-primary text-sm">GPS 跑步</Link>
        </div>
      </header>

      {/* Tab 切换 */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <button
          onClick={() => setTab('active')}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: tab === 'active' ? 'var(--color-bg-primary)' : 'transparent',
            color: tab === 'active' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          }}
        >
          全部记录
        </button>
        <button
          onClick={() => setTab('archived')}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all relative"
          style={{
            backgroundColor: tab === 'archived' ? 'var(--color-bg-primary)' : 'transparent',
            color: tab === 'archived' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          }}
        >
          归档 {archivedCount > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}>{archivedCount}</span>}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">加载中...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && runs.length === 0 && (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">{tab === 'archived' ? '没有归档记录' : '还没有跑步记录'}</p>
          {tab === 'active' && <p className="text-xs mt-1">去记录你的第一次跑步吧!</p>}
        </div>
      )}

      {/* Run list */}
      {!loading && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="card p-4" style={run.archivedAt ? { opacity: 0.7 } : {}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{formatDate(run.startedAt)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: run.source === 'gps' ? '#e8f5e9' : '#e3f2fd',
                      color: run.source === 'gps' ? '#2e7d32' : '#1565c0',
                    }}>
                    {run.source === 'gps' ? 'GPS' : '手动'}
                  </span>
                  {run.feeling && <span className="text-base">{FEELING_EMOJI[run.feeling]}</span>}
                  {run.archivedAt && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                      已归档
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6" style={{ color: 'var(--color-text-secondary)' }}>
                <div>
                  <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {run.distance.toFixed(2)}
                  </span>
                  <span className="text-xs ml-1">km</span>
                </div>
                <div className="text-sm">{formatDuration(run.duration)}</div>
                <div className="text-sm">
                  配速 <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPace(run.avgPace)}
                  </span>
                </div>
              </div>

              {run.note && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{run.note}</p>
              )}

              {/* Actions */}
              <div className="mt-3 pt-2 flex justify-between items-center" style={{ borderTop: '1px solid var(--color-bg-secondary)' }}>
                <div className="flex gap-2">
                  {!run.archivedAt ? (
                    <>
                      <button onClick={() => setEditingRun(run)}
                        className="text-xs font-medium px-3 py-1 rounded-lg"
                        style={{ color: 'var(--color-accent)' }}>编辑</button>
                      <button onClick={() => handleArchive(run.id)}
                        className="text-xs font-medium px-3 py-1 rounded-lg"
                        style={{ color: '#f59e0b' }}>标记无效</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleRestore(run.id)}
                        className="text-xs font-medium px-3 py-1 rounded-lg"
                        style={{ color: '#10b981' }}>恢复</button>
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {daysSinceArchived(run.archivedAt)} 天前归档
                        {30 - daysSinceArchived(run.archivedAt) > 0
                          ? ` · ${30 - daysSinceArchived(run.archivedAt)} 天后自动删除`
                          : ' · 即将自动删除'}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {run.archivedAt && (
                    <button onClick={() => handleDelete(run.id)}
                      className="text-xs font-medium px-3 py-1 rounded-lg"
                      style={{ color: '#ef4444' }}>永久删除</button>
                  )}
                  {!run.archivedAt && (
                    <button onClick={(e) => openShare(run, e)}
                      className="text-xs font-medium px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(0,210,106,0.1)', color: 'var(--color-accent)' }}>
                      分享
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingRun && (
        <EditModal
          run={editingRun}
          onSave={() => { setEditingRun(null); fetchRuns(); }}
          onClose={() => setEditingRun(null)}
        />
      )}

      {/* Share Modal */}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)}
        initialType={shareRun ? 'single' : undefined} run={shareRun} />
    </div>
  );
}
