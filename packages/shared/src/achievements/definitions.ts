import type { AchievementCategory, AchievementRarity, UserStats } from '../types/index.js';

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;               // SVG 图标标识
  category: AchievementCategory;
  rarity: AchievementRarity;
  check: (stats: UserStats) => {
    unlocked: boolean;
    progress: number;
    target: number;
  };
}

export const achievements: AchievementDef[] = [
  // ──────────────────────── 里程碑类 ────────────────────────
  {
    key: 'first_run',
    name: '初出茅庐',
    description: '完成第一次跑步记录',
    icon: 'badge-first-run',
    category: 'milestone',
    rarity: 'common',
    check: (stats) => ({
      unlocked: stats.totalRuns >= 1,
      progress: Math.min(stats.totalRuns, 1),
      target: 1,
    }),
  },
  {
    key: '5k_runner',
    name: '5K 跑者',
    description: '单次跑步达到 5km',
    icon: 'badge-5k',
    category: 'milestone',
    rarity: 'common',
    check: (stats) => ({
      unlocked: stats.maxSingleDistance >= 5,
      progress: Math.min(stats.maxSingleDistance, 5),
      target: 5,
    }),
  },
  {
    key: '10k_runner',
    name: '10K 跑者',
    description: '单次跑步达到 10km',
    icon: 'badge-10k',
    category: 'milestone',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.maxSingleDistance >= 10,
      progress: Math.min(stats.maxSingleDistance, 10),
      target: 10,
    }),
  },
  {
    key: 'half_marathon',
    name: '半马达成',
    description: '单次跑步达到 21.0975km',
    icon: 'badge-half-marathon',
    category: 'milestone',
    rarity: 'epic',
    check: (stats) => ({
      unlocked: stats.maxSingleDistance >= 21.0975,
      progress: Math.min(stats.maxSingleDistance, 21.0975),
      target: 21.0975,
    }),
  },
  {
    key: 'full_marathon',
    name: '全马达成',
    description: '单次跑步达到 42.195km',
    icon: 'badge-full-marathon',
    category: 'milestone',
    rarity: 'legendary',
    check: (stats) => ({
      unlocked: stats.maxSingleDistance >= 42.195,
      progress: Math.min(stats.maxSingleDistance, 42.195),
      target: 42.195,
    }),
  },

  // ──────────────────────── 累计类 ────────────────────────
  {
    key: 'volume_100km',
    name: '百公里俱乐部',
    description: '累计跑量达到 100km',
    icon: 'badge-100km',
    category: 'volume',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.totalDistance >= 100,
      progress: Math.min(stats.totalDistance, 100),
      target: 100,
    }),
  },
  {
    key: 'volume_500km',
    name: '五百公里',
    description: '累计跑量达到 500km',
    icon: 'badge-500km',
    category: 'volume',
    rarity: 'epic',
    check: (stats) => ({
      unlocked: stats.totalDistance >= 500,
      progress: Math.min(stats.totalDistance, 500),
      target: 500,
    }),
  },
  {
    key: 'volume_1000km',
    name: '千公里达人',
    description: '累计跑量达到 1000km',
    icon: 'badge-1000km',
    category: 'volume',
    rarity: 'epic',
    check: (stats) => ({
      unlocked: stats.totalDistance >= 1000,
      progress: Math.min(stats.totalDistance, 1000),
      target: 1000,
    }),
  },
  {
    key: 'volume_earth',
    name: '地球环跑',
    description: '累计跑量达到 40075km（赤道周长）',
    icon: 'badge-earth',
    category: 'volume',
    rarity: 'legendary',
    check: (stats) => ({
      unlocked: stats.totalDistance >= 40075,
      progress: Math.min(stats.totalDistance, 40075),
      target: 40075,
    }),
  },

  // ──────────────────────── 连续打卡类 ────────────────────────
  {
    key: 'streak_3days',
    name: '三日连续',
    description: '连续 3 天有跑步记录',
    icon: 'badge-streak-3',
    category: 'streak',
    rarity: 'common',
    check: (stats) => ({
      unlocked: stats.longestStreakDays >= 3,
      progress: Math.min(stats.currentStreakDays, 3),
      target: 3,
    }),
  },
  {
    key: 'streak_4weeks',
    name: '周周不断',
    description: '连续 4 周每周至少跑 1 次',
    icon: 'badge-streak-4w',
    category: 'streak',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.consecutiveWeekends >= 4,
      progress: Math.min(stats.consecutiveWeekends, 4),
      target: 4,
    }),
  },
  {
    key: 'streak_30days',
    name: '月度铁人',
    description: '连续 30 天每天至少跑 1 次',
    icon: 'badge-streak-30',
    category: 'streak',
    rarity: 'epic',
    check: (stats) => ({
      unlocked: stats.longestStreakDays >= 30,
      progress: Math.min(stats.currentStreakDays, 30),
      target: 30,
    }),
  },
  {
    key: 'streak_100days',
    name: '百日修行',
    description: '连续 100 天有跑步记录',
    icon: 'badge-streak-100',
    category: 'streak',
    rarity: 'legendary',
    check: (stats) => ({
      unlocked: stats.longestStreakDays >= 100,
      progress: Math.min(stats.longestStreakDays, 100),
      target: 100,
    }),
  },

  // ──────────────────────── 配速/表现类 ────────────────────────
  {
    key: 'pace_sub6',
    name: '破 6',
    description: '5km 配速进入 6:00/km',
    icon: 'badge-pace-sub6',
    category: 'performance',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.bestPace5k !== null && stats.bestPace5k <= 6.0,
      progress: stats.bestPace5k !== null ? Math.max(0, 6.0 - stats.bestPace5k + 6.0) : 0,
      target: 6.0,
    }),
  },
  {
    key: 'pace_sub5',
    name: '破 5',
    description: '5km 配速进入 5:00/km',
    icon: 'badge-pace-sub5',
    category: 'performance',
    rarity: 'epic',
    check: (stats) => ({
      unlocked: stats.bestPace5k !== null && stats.bestPace5k <= 5.0,
      progress: stats.bestPace5k !== null ? Math.max(0, 5.0 - stats.bestPace5k + 5.0) : 0,
      target: 5.0,
    }),
  },
  {
    key: 'pace_sub4',
    name: '破 4',
    description: '5km 配速进入 4:00/km',
    icon: 'badge-pace-sub4',
    category: 'performance',
    rarity: 'legendary',
    check: (stats) => ({
      unlocked: stats.bestPace5k !== null && stats.bestPace5k <= 4.0,
      progress: stats.bestPace5k !== null ? Math.max(0, 4.0 - stats.bestPace5k + 4.0) : 0,
      target: 4.0,
    }),
  },
  {
    key: 'early_bird',
    name: '晨跑达人',
    description: '累计 20 次早晨 6 点前开跑',
    icon: 'badge-early-bird',
    category: 'performance',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.earlyMorningRuns >= 20,
      progress: Math.min(stats.earlyMorningRuns, 20),
      target: 20,
    }),
  },
  {
    key: 'night_runner',
    name: '夜跑侠',
    description: '累计 20 次晚上 9 点后开跑',
    icon: 'badge-night-runner',
    category: 'performance',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.lateNightRuns >= 20,
      progress: Math.min(stats.lateNightRuns, 20),
      target: 20,
    }),
  },

  // ──────────────────────── 趣味隐藏类 ────────────────────────
  {
    key: 'rain_hero',
    name: '雨战英雄',
    description: '在雨天完成一次跑步',
    icon: 'badge-rain',
    category: 'fun',
    rarity: 'rare',
    check: (stats) => ({
      unlocked: stats.rainRuns >= 1,
      progress: Math.min(stats.rainRuns, 1),
      target: 1,
    }),
  },
  {
    key: 'weekend_warrior',
    name: '周末战士',
    description: '连续 8 个周末都有跑步',
    icon: 'badge-weekend',
    category: 'fun',
    rarity: 'epic',
    check: (stats) => ({
      unlocked: stats.consecutiveWeekends >= 8,
      progress: Math.min(stats.consecutiveWeekends, 8),
      target: 8,
    }),
  },
];

/**
 * 检测所有成就的解锁状态
 * @param stats 用户统计数据
 * @param alreadyUnlocked 已解锁的成就 key 列表
 * @returns 所有成就状态 + 本次新解锁的成就 key 列表
 */
export function checkAchievements(
  stats: UserStats,
  alreadyUnlocked: string[]
): {
  all: Array<{ def: AchievementDef; unlocked: boolean; progress: number; target: number }>;
  newlyUnlocked: AchievementDef[];
} {
  const unlockedSet = new Set(alreadyUnlocked);
  const all: Array<{ def: AchievementDef; unlocked: boolean; progress: number; target: number }> = [];
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of achievements) {
    const result = def.check(stats);
    const wasUnlocked = unlockedSet.has(def.key);

    all.push({
      def,
      unlocked: result.unlocked,
      progress: result.progress,
      target: result.target,
    });

    if (result.unlocked && !wasUnlocked) {
      newlyUnlocked.push(def);
    }
  }

  return { all, newlyUnlocked };
}
