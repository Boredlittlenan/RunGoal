import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

type GpsStatus = 'idle' | 'running' | 'paused' | 'saving';

export default function GpsRunPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [distance, setDistance] = useState(0);       // km
  const [duration, setDuration] = useState(0);       // 秒
  const [pace, setPace] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const trackPointsRef = useRef<Array<{ lat: number; lng: number; timestamp: number }>>([]);

  // Haversine 公式计算两点距离（米）
  const haversine = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    []
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      alert('您的设备不支持 GPS 定位');
      return;
    }

    setStatus('running');

    // Only initialize on fresh start (not resume)
    if (!startTimeRef.current) {
      startTimeRef.current = new Date();
    }

    // Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // GPS 监听
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // 精度过滤：丢弃 > 50m 的点
        if (pos.coords.accuracy > 50) return;

        const { latitude: lat, longitude: lng } = pos.coords;
        if (lastPointRef.current) {
          const dist = haversine(lastPointRef.current.lat, lastPointRef.current.lng, lat, lng);
          // 过滤掉异常大的跳动（> 100m 单次）
          if (dist < 100) {
            setDistance((prev) => prev + dist / 1000);
          }
        }
        trackPointsRef.current.push({ lat, lng, timestamp: Date.now() });
        lastPointRef.current = { lat, lng };
      },
      (err) => {
        console.error('GPS error:', err);
        alert('GPS 定位失败，请检查权限设置');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  }, [haversine]);

  const pauseTracking = useCallback(() => {
    setStatus('paused');
    if (timerRef.current) clearInterval(timerRef.current);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const resumeTracking = useCallback(() => {
    // Clear old timer if any (set during pause shouldn't happen, but be safe)
    if (timerRef.current) clearInterval(timerRef.current);
    // Don't reset startTimeRef or trackPointsRef — preserve accumulated data
    startTracking();
  }, [startTracking]);

  const stopTracking = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);

    if (distance < 0.01 && duration < 10) {
      // 太短的记录直接丢弃
      navigate('/runs');
      return;
    }

    setStatus('saving');
    try {
      await api.post('/runs', {
        source: 'gps',
        distance: Math.round(distance * 100) / 100, // km
        duration,
        startedAt: startTimeRef.current?.toISOString() ?? new Date().toISOString(),
        endedAt: new Date().toISOString(),
        trackPoints: trackPointsRef.current.length > 0 ? JSON.stringify(trackPointsRef.current) : null,
      });
      navigate('/runs');
    } catch {
      alert('保存失败，请检查网络连接后重试');
      setStatus('paused');
    }
  }, [navigate, distance, duration]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatPace = (distKm: number, durSec: number): string => {
    if (distKm <= 0 || durSec <= 0) return '--:--';
    const paceMin = durSec / 60 / distKm;
    const min = Math.floor(paceMin);
    const sec = Math.round((paceMin - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部返回 */}
      <div className="px-4 py-3">
        <button
          onClick={() => (status === 'idle' ? navigate(-1) : null)}
          className="text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          {status === 'idle' ? '← 返回' : ''}
        </button>
      </div>

      {/* 数据展示区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-8">
        {/* 距离 */}
        <div className="text-center">
          <p className="text-7xl font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
            {distance.toFixed(2)}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            公里
          </p>
        </div>

        {/* 时长和配速 */}
        <div className="flex gap-12">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums">{formatTime(duration)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              时长
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums">{formatPace(distance, duration)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              配速 (min/km)
            </p>
          </div>
        </div>
      </div>

      {/* 控制按钮区 */}
      <div className="px-4 pb-12 safe-area-bottom flex justify-center gap-6">
        {status === 'idle' && (
          <button onClick={startTracking} className="btn-primary text-lg px-12 py-4">
            开始跑步
          </button>
        )}
        {status === 'running' && (
          <>
            <button onClick={pauseTracking} className="btn-secondary text-lg px-8 py-4">
              暂停
            </button>
            <button
              onClick={stopTracking}
              className="px-8 py-4 rounded-xl text-lg font-medium text-white transition-all active:scale-95"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              结束
            </button>
          </>
        )}
        {status === 'paused' && (
          <>
            <button onClick={resumeTracking} className="btn-primary text-lg px-8 py-4">
              继续
            </button>
            <button
              onClick={stopTracking}
              className="px-8 py-4 rounded-xl text-lg font-medium text-white transition-all active:scale-95"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              结束
            </button>
          </>
        )}
        {status === 'saving' && (
          <button className="btn-primary text-lg px-12 py-4" disabled>
            保存中...
          </button>
        )}
      </div>
    </div>
  );
}
