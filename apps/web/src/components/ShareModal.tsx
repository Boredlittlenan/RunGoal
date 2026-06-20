import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import {
  renderShareCard,
  downloadCardImage,
  type CardType,
  type ShareCardData,
  type RunData,
  type PeriodData,
  type AchievementData,
} from '@/lib/shareCard';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected card type (e.g. 'single' when triggered from a run detail). */
  initialType?: CardType;
  /** Run data for 'single' card type. */
  run?: RunData;
}

const CARD_TYPES: { key: CardType; label: string; icon: string }[] = [
  { key: 'single',      label: '单次成绩', icon: '🏃' },
  { key: 'day',         label: '今日',     icon: '📅' },
  { key: 'week',        label: '本周',     icon: '📊' },
  { key: 'month',       label: '本月',     icon: '📈' },
  { key: 'quarter',     label: '本季度',   icon: '📉' },
  { key: 'year',        label: '本年',     icon: '🎯' },
  { key: 'achievement', label: '成就墙',   icon: '🏅' },
];

export default function ShareModal({ open, onClose, initialType, run }: ShareModalProps) {
  const [activeType, setActiveType] = useState<CardType>(initialType || 'single');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setActiveType(initialType || 'single');
      setImageUrl(null);
      canvasRef.current = null;
    }
  }, [open, initialType]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const generateCard = useCallback(async (type: CardType) => {
    setLoading(true);
    setImageUrl(null);

    try {
      // Fetch user info
      const userRes: any = await api.get('/auth/me');
      const nickname = userRes?.data?.nickname ?? userRes?.nickname ?? '跑者';

      let cardData: ShareCardData;

      if (type === 'single' && run) {
        cardData = { type: 'single', nickname, run };
      } else if (type === 'single' && !run) {
        // Fetch latest run
        const res: any = await api.get('/runs', { params: { page: 1, pageSize: 1 } });
        const runs = res?.data ?? res;
        const latest = Array.isArray(runs) && runs.length > 0 ? runs[0] : null;
        if (!latest) {
          alert('还没有跑步记录');
          setLoading(false);
          return;
        }
        cardData = { type: 'single', nickname, run: latest };
      } else if (type === 'achievement') {
        const achRes: any = await api.get('/achievements');
        const achievements: AchievementData[] = Array.isArray(achRes) ? achRes : achRes?.data ?? [];
        const unlocked = achievements.filter(a => a.unlocked).length;
        cardData = {
          type: 'achievement',
          nickname,
          achievements,
          totalUnlocked: unlocked,
          totalAchievements: achievements.length,
        };
      } else {
        // Period-based card
        const periodRes: any = await api.get('/stats/period', { params: { type } });
        const period: PeriodData = periodRes?.data ?? periodRes;
        cardData = { type, nickname, period };
      }

      const canvas = renderShareCard(cardData);
      canvasRef.current = canvas;

      canvas.toBlob((blob) => {
        if (blob) {
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setImageUrl(url);
        }
        setLoading(false);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Share card generation failed:', err);
      alert('生成分享图失败，请稍后重试');
      setLoading(false);
    }
  }, [run]);

  // Generate card when type changes
  useEffect(() => {
    if (open) {
      generateCard(activeType);
    }
  }, [open, activeType, generateCard]);

  const handleSave = () => {
    if (canvasRef.current) {
      downloadCardImage(canvasRef.current, `rungoal-${activeType}-${Date.now()}.png`);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          关闭
        </button>
        <span className="text-sm font-semibold" style={{ color: '#fff' }}>
          分享成绩
        </span>
        <button
          onClick={handleSave}
          disabled={!imageUrl || loading}
          className="text-sm font-medium disabled:opacity-30"
          style={{ color: 'var(--color-accent)' }}
        >
          保存图片
        </button>
      </div>

      {/* Card type tabs */}
      <div
        className="flex gap-1.5 px-4 py-2 overflow-x-auto shrink-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {CARD_TYPES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveType(key)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all"
            style={{
              backgroundColor: activeType === key ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)',
              color: activeType === key ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Image preview area */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 overflow-auto">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin mx-auto mb-3 w-8 h-8 border-2 border-current border-t-transparent rounded-full opacity-50" style={{ color: 'var(--color-accent)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              生成分享图中...
            </p>
          </div>
        ) : imageUrl ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={imageUrl}
              alt="share card"
              className="rounded-2xl max-h-[70vh] w-auto"
              style={{ maxWidth: '100%', objectFit: 'contain' }}
            />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
              长按图片可保存到相册，转发到朋友圈
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              暂无数据
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
