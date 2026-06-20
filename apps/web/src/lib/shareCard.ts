/**
 * Canvas-based share card renderer for RunGoal.
 * Generates beautiful, social-media-ready images at 750×1334 (9:16).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type CardType = 'single' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'achievement';

export interface RunData {
  id: string;
  distance: number;   // km
  duration: number;   // seconds
  avgPace?: number;   // min/km
  startedAt: string;
  feeling?: number;
  weather?: string;
  note?: string;
  source: string;
}

export interface PeriodData {
  totalDistance: number;
  totalDuration: number;
  totalRuns: number;
  avgPace?: number;
  bestPace?: number;
  maxDistance: number;
  runningDays: number;
  periodType: string;
  label: string;
}

export interface AchievementData {
  key: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface ShareCardData {
  type: CardType;
  nickname: string;
  run?: RunData;
  period?: PeriodData;
  achievements?: AchievementData[];
  totalUnlocked?: number;
  totalAchievements?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const W = 750;
const H = 1334;
const PAD = 64;
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

// Color palette
const C = {
  bg1: '#0a0e1a',
  bg2: '#111827',
  card: '#1a2236',
  accent: '#00d26a',
  accent2: '#00ff88',
  blue: '#3b82f6',
  purple: '#a855f7',
  amber: '#f59e0b',
  red: '#ef4444',
  textW: '#ffffff',
  textG: '#9ca3af',
  textD: '#6b7280',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const FEELING_EMOJI = ['', '😫', '😓', '😐', '😊', '🔥'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtPace(pace?: number): string {
  if (!pace) return '--';
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
}

function fmtDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

function fmtDistance(km: number): string {
  return km >= 100 ? km.toFixed(0) : km.toFixed(2);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

// ─── Canvas drawing primitives ───────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGradientBg(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, C.bg1);
  g.addColorStop(0.5, '#0d1424');
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(W + 80, -60, 280, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-100, H + 50, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawAccentLine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, C.accent);
  g.addColorStop(1, 'rgba(0,210,106,0)');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, 4, 2);
  ctx.fill();
}

function drawBrandFooter(ctx: CanvasRenderingContext2D) {
  // Subtle footer
  ctx.fillStyle = C.textD;
  ctx.font = `500 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('RunGoal · 跑步目标记录', W / 2, H - 80);

  // Small running icon
  ctx.font = `32px ${FONT}`;
  ctx.fillText('🏃', W / 2, H - 40);
}

function drawStatBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  value: string, label: string, valueColor = C.textW,
) {
  ctx.fillStyle = valueColor;
  ctx.font = `bold 52px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(value, x + w / 2, y);

  ctx.fillStyle = C.textG;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(label, x + w / 2, y + 36);
}

function drawTitle(ctx: CanvasRenderingContext2D, text: string, subtitle?: string) {
  ctx.fillStyle = C.textW;
  ctx.font = `bold 42px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, PAD, 130);

  if (subtitle) {
    ctx.fillStyle = C.textG;
    ctx.font = `400 26px ${FONT}`;
    ctx.fillText(subtitle, PAD, 172);
  }

  drawAccentLine(ctx, PAD, subtitle ? 192 : 155, 120);
}

// ─── Card renderers ─────────────────────────────────────────────────────────

function renderSingleRun(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  const run = data.run!;
  drawGradientBg(ctx);

  // Title
  ctx.fillStyle = C.textG;
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('RUN RECORD', PAD, 90);

  ctx.fillStyle = C.textW;
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText('跑步成绩', PAD, 140);

  ctx.fillStyle = C.textG;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(fmtDate(run.startedAt), PAD, 178);
  drawAccentLine(ctx, PAD, 198, 100);

  // Big distance
  const distStr = fmtDistance(run.distance);
  ctx.fillStyle = C.accent2;
  ctx.font = `bold 140px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(distStr, W / 2, 370);

  ctx.fillStyle = C.textG;
  ctx.font = `400 30px ${FONT}`;
  ctx.fillText('km', W / 2, 415);

  // Stats row
  const rowY = 520;
  const colW = (W - PAD * 2) / 3;
  drawStatBlock(ctx, PAD, rowY, colW, fmtDuration(run.duration), '时长');
  drawStatBlock(ctx, PAD + colW, rowY, colW, fmtPace(run.avgPace), '配速 /km');
  const calStr = run.source === 'gps' ? 'GPS' : '手动';
  drawStatBlock(ctx, PAD + colW * 2, rowY, colW, calStr, '来源');

  // Decorative card section
  roundRect(ctx, PAD, 620, W - PAD * 2, 200, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();

  ctx.fillStyle = C.textG;
  ctx.font = `400 24px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${data.nickname} 的跑步记录`, PAD + 30, 680);

  // Feeling
  if (run.feeling) {
    ctx.font = `48px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(FEELING_EMOJI[run.feeling] || '', W / 2, 770);
  }

  // Note
  if (run.note) {
    ctx.fillStyle = C.textG;
    ctx.font = `400 26px ${FONT}`;
    ctx.textAlign = 'center';
    const noteText = run.note.length > 28 ? run.note.slice(0, 28) + '…' : run.note;
    ctx.fillText(`"${noteText}"`, W / 2, 820);
  }

  drawBrandFooter(ctx);
}

function renderPeriodCard(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  const p = data.period!;
  drawGradientBg(ctx);

  // Period type labels
  const typeLabels: Record<string, string> = {
    day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY',
    quarter: 'QUARTERLY', year: 'YEARLY',
  };

  ctx.fillStyle = C.textG;
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(typeLabels[p.periodType] || 'SUMMARY', PAD, 90);

  ctx.fillStyle = C.textW;
  ctx.font = `bold 42px ${FONT}`;
  ctx.fillText(p.label, PAD, 142);

  ctx.fillStyle = C.textG;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(`${data.nickname} 的跑步报告`, PAD, 182);
  drawAccentLine(ctx, PAD, 202, 120);

  // Big distance
  ctx.fillStyle = C.accent2;
  ctx.font = `bold 130px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(fmtDistance(p.totalDistance), W / 2, 380);

  ctx.fillStyle = C.textG;
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText('km 总跑量', W / 2, 425);

  // Stats grid (2x2)
  const gridTop = 510;
  const halfW = (W - PAD * 2 - 24) / 2;

  // Top-left card
  roundRect(ctx, PAD, gridTop, halfW, 130, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.fillStyle = C.textW;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(p.totalRuns.toString(), PAD + halfW / 2, gridTop + 65);
  ctx.fillStyle = C.textG;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('跑步次数', PAD + halfW / 2, gridTop + 100);

  // Top-right card
  const rx = PAD + halfW + 24;
  roundRect(ctx, rx, gridTop, halfW, 130, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.fillStyle = C.textW;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(fmtDuration(p.totalDuration), rx + halfW / 2, gridTop + 65);
  ctx.fillStyle = C.textG;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('总时长', rx + halfW / 2, gridTop + 100);

  // Bottom-left card
  const gridBot = gridTop + 155;
  roundRect(ctx, PAD, gridBot, halfW, 130, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.fillStyle = C.textW;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(fmtPace(p.avgPace), PAD + halfW / 2, gridBot + 65);
  ctx.fillStyle = C.textG;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('平均配速', PAD + halfW / 2, gridBot + 100);

  // Bottom-right card
  roundRect(ctx, rx, gridBot, halfW, 130, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.fillStyle = C.textW;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(p.runningDays.toString(), rx + halfW / 2, gridBot + 65);
  ctx.fillStyle = C.textG;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('跑步天数', rx + halfW / 2, gridBot + 100);

  // Best pace highlight
  if (p.bestPace) {
    const bpY = gridBot + 190;
    roundRect(ctx, PAD, bpY, W - PAD * 2, 90, 16);
    ctx.fillStyle = 'rgba(0,210,106,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,210,106,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = C.accent;
    ctx.font = `bold 32px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`最佳配速 ${fmtPace(p.bestPace)} /km`, W / 2, bpY + 55);
  }

  // Max distance
  if (p.maxDistance > 0) {
    ctx.fillStyle = C.textG;
    ctx.font = `400 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`最远单次 ${fmtDistance(p.maxDistance)} km`, W / 2, gridBot + 330);
  }

  drawBrandFooter(ctx);
}

function renderAchievementCard(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  const achs = data.achievements || [];
  const unlocked = achs.filter(a => a.unlocked);
  drawGradientBg(ctx);

  ctx.fillStyle = C.textG;
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('ACHIEVEMENTS', PAD, 90);

  ctx.fillStyle = C.textW;
  ctx.font = `bold 42px ${FONT}`;
  ctx.fillText('我的成就墙', PAD, 142);
  drawAccentLine(ctx, PAD, 165, 100);

  // Stats
  ctx.fillStyle = C.accent2;
  ctx.font = `bold 100px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${data.totalUnlocked || unlocked.length}`, W / 2 - 40, 310);

  ctx.fillStyle = C.textG;
  ctx.font = `400 36px ${FONT}`;
  ctx.fillText(`/ ${data.totalAchievements || achs.length}`, W / 2 + 60, 310);

  ctx.font = `400 24px ${FONT}`;
  ctx.fillText('已解锁成就', W / 2, 355);

  // Achievement grid (top 6 unlocked, or first 6)
  const displayAchs = unlocked.length > 0 ? unlocked.slice(0, 6) : achs.slice(0, 6);
  const cols = 3;
  const cellW = (W - PAD * 2 - 24 * (cols - 1)) / cols;
  const cellH = 160;
  const gridStartY = 420;

  displayAchs.forEach((ach, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (cellW + 24);
    const y = gridStartY + row * (cellH + 20);

    roundRect(ctx, x, y, cellW, cellH, 16);
    ctx.fillStyle = ach.unlocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
    ctx.fill();

    // Rarity indicator line at top
    const rarityColor = RARITY_COLORS[ach.rarity] || C.textD;
    roundRect(ctx, x + 20, y + 8, cellW - 40, 3, 2);
    ctx.fillStyle = ach.unlocked ? rarityColor : 'rgba(255,255,255,0.1)';
    ctx.fill();

    // Medal icon
    ctx.font = `36px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = ach.unlocked ? 1 : 0.3;
    ctx.fillText('🏅', x + cellW / 2, y + 68);

    // Name
    ctx.fillStyle = C.textW;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(ach.name.slice(0, 6), x + cellW / 2, y + 108);

    // Rarity label
    const rarityLabels: Record<string, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
    ctx.fillStyle = rarityColor;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText(rarityLabels[ach.rarity] || ach.rarity, x + cellW / 2, y + 140);
    ctx.globalAlpha = 1;
  });

  // Encouraging text
  ctx.fillStyle = C.textG;
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = 'center';
  const unlockedPct = achs.length > 0 ? Math.round(unlocked.length / achs.length * 100) : 0;
  ctx.fillText(`已达成 ${unlockedPct}% 的成就，继续加油！`, W / 2, gridStartY + 2 * (cellH + 20) + 60);

  drawBrandFooter(ctx);
}

// ─── Main render function ───────────────────────────────────────────────────

export function renderShareCard(data: ShareCardData): HTMLCanvasElement {
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Reset
  ctx.clearRect(0, 0, W, H);

  switch (data.type) {
    case 'single':
      renderSingleRun(ctx, data);
      break;
    case 'achievement':
      renderAchievementCard(ctx, data);
      break;
    default:
      renderPeriodCard(ctx, data);
      break;
  }

  return canvas;
}

/** Convert a rendered canvas to a blob URL for display / download. */
export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png', 1.0);
  });
}

/** Trigger download of the share card image. */
export function downloadCardImage(canvas: HTMLCanvasElement, filename = 'rungoal-share.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
