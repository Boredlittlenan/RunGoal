import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import ShareModal from '@/components/ShareModal';
import type { RunData } from '@/lib/shareCard';

interface Run {
  id: string;
  distance: number;       // km
  duration: number;       // seconds
  avgPace?: number;       // min/km
  source: 'gps' | 'manual';
  feeling?: number;       // 1-5
  startedAt: string;      // ISO datetime
  weather?: string;
  note?: string;
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
  if (h > 0) return `${h}h${m}m`;
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

export default function RunListPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRun, setShareRun] = useState<RunData | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const res: any = await api.get('/runs', { params: { page: 1, pageSize: 20 } });
        if (!cancelled) {
          const items = res?.data ?? res;
          setRuns(Array.isArray(items) ? items : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || '加载跑步记录失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchRuns();
    return () => { cancelled = true; };
  }, []);

  const openShare = (run: Run, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareRun({
      id: run.id,
      distance: run.distance,
      duration: run.duration,
      avgPace: run.avgPace,
      startedAt: run.startedAt,
      feeling: run.feeling,
      weather: run.weather,
      note: run.note,
      source: run.source,
    });
    setShareOpen(true);
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">跑步记录</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShareRun(undefined); setShareOpen(true); }}
            className="btn-secondary text-sm"
            title="分享成绩"
          >
            分享
          </button>
          <Link to="/runs/record" className="btn-secondary text-sm">
            手动录入
          </Link>
          <Link to="/runs/gps" className="btn-primary text-sm">
            GPS 跑步
          </Link>
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="animate-spin mx-auto mb-4 w-8 h-8 border-2 border-current border-t-transparent rounded-full opacity-50" />
          <p className="text-sm">加载中...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="card text-center py-8" style={{ color: '#e74c3c' }}>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && runs.length === 0 && (
        <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
            <circle cx="13.5" cy="6.5" r="2.5" />
            <path d="M17 2H13.5L10 8l-3.5 2 1 5-3 4h3l3-3 2 3v3h3v-4l-2-4 1-3" />
          </svg>
          <p className="text-sm">还没有跑步记录</p>
          <p className="text-xs mt-1">每一次出发都算数，点击上方按钮开始你的第一次跑步吧!</p>
        </div>
      )}

      {/* Run records list */}
      {!loading && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="card p-4 transition-opacity hover:opacity-90"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {formatDate(run.startedAt)}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: run.source === 'gps' ? '#e8f5e9' : '#e3f2fd',
                      color: run.source === 'gps' ? '#2e7d32' : '#1565c0',
                    }}
                  >
                    {run.source === 'gps' ? 'GPS' : '手动'}
                  </span>
                  {run.feeling && (
                    <span className="text-base">{FEELING_EMOJI[run.feeling]}</span>
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
                <div className="text-sm">
                  {formatDuration(run.duration)}
                </div>
                <div className="text-sm">
                  <span style={{ color: 'var(--color-text-secondary)' }}>配速 </span>
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPace(run.avgPace)}
                  </span>
                </div>
              </div>
              {/* Share button per run */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={(e) => openShare(run, e)}
                  className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: 'rgba(0,210,106,0.1)',
                    color: 'var(--color-accent)',
                  }}
                >
                  分享这次跑步
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        initialType={shareRun ? 'single' : undefined}
        run={shareRun}
      />
    </div>
  );
}
