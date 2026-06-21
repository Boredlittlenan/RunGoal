import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import ReactECharts from 'echarts-for-react';
import ShareModal from '@/components/ShareModal';

interface OverviewStats {
  totalDistance: number;
  totalDuration: number;
  totalRuns: number;
  avgPace?: number;
}

interface CalendarDay {
  date: string;
  distance: number;
  duration: number;
  count: number;
}

interface PaceTrendPoint {
  id: string;
  date: string;
  avgPace: number;
  distance: number;
  duration: number;
}

function fmtPace(minPerKm?: number): string {
  if (!minPerKm) return '--';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ── Calendar Heatmap ── */
const WEEKDAYS = ['一', '三', '五'];
const WEEKDAY_INDICES = [1, 3, 5]; // Mon, Wed, Fri (0=Sun)
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function getHeatColor(distance: number, max: number): string {
  if (!distance) return 'var(--color-bg-secondary)';
  const ratio = Math.min(distance / (max || 1), 1);
  if (ratio < 0.25) return '#c6e48b';
  if (ratio < 0.5)  return '#7ac74f';
  if (ratio < 0.75) return '#3da639';
  return '#196128';
}

function CalendarHeatmap({ days, year }: { days: CalendarDay[]; year: number }) {
  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    days.forEach((d) => m.set(d.date, d));
    return m;
  }, [days]);

  const maxDist = useMemo(() => Math.max(...days.map((d) => d.distance), 1), [days]);

  // Build all dates in the year
  const { cells, monthOffsets } = useMemo(() => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const allCells: { date: string; dayOfWeek: number; weekIndex: number; dist: number }[] = [];

    // Find the Monday on or before Jan 1
    const jan1Dow = start.getDay(); // 0=Sun
    const daysToMonday = jan1Dow === 0 ? 6 : jan1Dow - 1;
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - daysToMonday);

    let weekIdx = 0;
    const cursor = new Date(gridStart);
    while (cursor <= end || cursor.getDay() !== 1) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dow = cursor.getDay();
      const inYear = cursor.getFullYear() === year;
      const dayData = dayMap.get(dateStr);
      allCells.push({
        date: dateStr,
        dayOfWeek: dow,
        weekIndex: weekIdx,
        dist: inYear ? (dayData?.distance ?? 0) : -1, // -1 = out of year
      });
      cursor.setDate(cursor.getDate() + 1);
      if (dow === 0) weekIdx++;
      if (cursor > end && cursor.getDay() === 1) break;
    }

    // Compute month start week indices
    const mo: number[] = [];
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(year, m, 1);
      const diff = Math.floor((firstDay.getTime() - gridStart.getTime()) / 86400000);
      mo.push(Math.floor(diff / 7));
    }

    return { cells: allCells, monthOffsets: mo };
  }, [year, dayMap]);

  const totalWeeks = cells.length > 0 ? cells[cells.length - 1].weekIndex + 1 : 53;
  const cellSize = 11;
  const cellGap = 3;
  const labelWidth = 24;
  const headerHeight = 18;
  const svgWidth = labelWidth + totalWeeks * (cellSize + cellGap);
  const svgHeight = headerHeight + 7 * (cellSize + cellGap);

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} style={{ minWidth: svgWidth }}>
        {/* Month labels */}
        {monthOffsets.map((weekIdx, m) => (
          <text
            key={m}
            x={labelWidth + weekIdx * (cellSize + cellGap)}
            y={12}
            fontSize={10}
            fill="var(--color-text-secondary)"
          >
            {MONTHS[m]}
          </text>
        ))}

        {/* Weekday labels */}
        {WEEKDAY_INDICES.map((dow, i) => (
          <text
            key={dow}
            x={0}
            y={headerHeight + dow * (cellSize + cellGap) + cellSize - 1}
            fontSize={9}
            fill="var(--color-text-secondary)"
          >
            {WEEKDAYS[i]}
          </text>
        ))}

        {/* Cells */}
        {cells.map((c) => {
          const dow = c.dayOfWeek === 0 ? 6 : c.dayOfWeek - 1; // convert to Mon=0
          const x = labelWidth + c.weekIndex * (cellSize + cellGap);
          const y = headerHeight + dow * (cellSize + cellGap);
          const color = c.dist < 0 ? 'transparent' : getHeatColor(c.dist, maxDist);
          return (
            <rect
              key={c.date}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={color}
            >
              <title>{c.date}: {c.dist > 0 ? `${c.dist.toFixed(1)} km` : '无跑步'}</title>
            </rect>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <span>少</span>
        <rect width={10} height={10} rx={2} fill="var(--color-bg-secondary)" style={{ display: 'inline-block' }} />
        <rect width={10} height={10} rx={2} fill="#c6e48b" style={{ display: 'inline-block' }} />
        <rect width={10} height={10} rx={2} fill="#7ac74f" style={{ display: 'inline-block' }} />
        <rect width={10} height={10} rx={2} fill="#3da639" style={{ display: 'inline-block' }} />
        <rect width={10} height={10} rx={2} fill="#196128" style={{ display: 'inline-block' }} />
        <span>多</span>
      </div>
    </div>
  );
}

/* ── Pace Trend Chart ── */
function PaceTrendChart({ points }: { points: PaceTrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-40 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          至少需要 2 次跑步记录才能显示趋势
        </p>
      </div>
    );
  }

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        const pace = p.value as number;
        const m = Math.floor(pace);
        const s = Math.round((pace - m) * 60);
        const pt = points[p.dataIndex];
        return `${p.name}<br/>配速 ${m}:${s.toString().padStart(2, '0')} /km<br/>距离 ${pt.distance.toFixed(1)} km`;
      },
    },
    grid: { left: 40, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.date.slice(5)), // MM-DD
      axisLabel: { fontSize: 10, rotate: 45 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      inverse: true, // lower pace = better, show at top
      axisLabel: {
        fontSize: 10,
        formatter: (v: number) => {
          const m = Math.floor(v);
          const s = Math.round((v - m) * 60);
          return `${m}:${s.toString().padStart(2, '0')}`;
        },
      },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    series: [{
      type: 'line',
      data: points.map((p) => p.avgPace),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#6366f1', width: 2 },
      itemStyle: { color: '#6366f1' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.25)' },
            { offset: 1, color: 'rgba(99,102,241,0.02)' },
          ],
        },
      },
    }],
  }), [points]);

  return (
    <ReactECharts
      option={option}
      style={{ height: 200 }}
      opts={{ renderer: 'svg' }}
    />
  );
}

/* ── Stats Page ── */
export default function StatsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [paceTrend, setPaceTrend] = useState<PaceTrendPoint[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    api.get('/stats/overview').then((res: any) => {
      setOverview(res?.data ?? res);
    }).catch(() => {});

    api.get('/stats/pace-trend?limit=30').then((res: any) => {
      setPaceTrend(res?.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/stats/calendar?year=${calendarYear}`).then((res: any) => {
      setCalendarDays(res?.data ?? []);
    }).catch(() => {});
  }, [calendarYear]);

  const o = overview ?? { totalDistance: 0, totalDuration: 0, totalRuns: 0 };
  const currentYear = new Date().getFullYear();

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">数据统计</h1>
        <button
          onClick={() => setShareOpen(true)}
          className="btn-secondary text-sm"
        >
          分享报告
        </button>
      </header>

      {/* 总览数据 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          跑步总览
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {o.totalDistance.toFixed(1)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>总跑量(km)</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {o.totalRuns}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>跑步次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {Math.round(o.totalDuration / 60)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>总时长(min)</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
              {fmtPace(o.avgPace)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>均配速</p>
          </div>
        </div>
      </section>

      {/* 日历热力图 */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            跑量日历
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalendarYear((y) => y - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              &larr;
            </button>
            <span className="text-sm font-medium w-12 text-center">{calendarYear}</span>
            <button
              onClick={() => setCalendarYear((y) => Math.min(y + 1, currentYear))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                opacity: calendarYear >= currentYear ? 0.4 : 1,
              }}
              disabled={calendarYear >= currentYear}
            >
              &rarr;
            </button>
          </div>
        </div>
        <CalendarHeatmap days={calendarDays} year={calendarYear} />
      </section>

      {/* 配速趋势 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          配速趋势
        </h2>
        <PaceTrendChart points={paceTrend} />
      </section>

      {/* 快速分享 */}
      <section className="card">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          快速分享
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '本周', icon: '📊' },
            { label: '本月', icon: '📈' },
            { label: '本年', icon: '🎯' },
          ].map(({ label, icon }) => (
            <button
              key={label}
              onClick={() => setShareOpen(true)}
              className="text-center py-4 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-sm font-medium">{label}报告</p>
            </button>
          ))}
        </div>
      </section>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} initialType="month" />
    </div>
  );
}
