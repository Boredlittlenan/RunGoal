// 跑步记录来源
export type RunSource = 'manual' | 'gps';

// 用户主观感受评分
export type Feeling = 1 | 2 | 3 | 4 | 5;

// GPS 坐标点
export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
}

// 跑步记录
export interface RunRecord {
  id: string;
  userId: string;
  distance: number;       // 公里
  duration: number;       // 秒
  avgPace: number | null; // 分钟/公里
  source: RunSource;
  trackPoints?: TrackPoint[];
  calories?: number;
  feeling?: Feeling;
  note?: string;
  weather?: string;
  startedAt: string;      // ISO datetime
  endedAt?: string;
}

// 目标类型
export type GoalType = 'cumulative' | 'frequency' | 'pace' | 'distance';

// 目标周期
export type GoalPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

// 目标
export interface Goal {
  id: string;
  userId: string;
  title: string;
  type: GoalType;
  targetValue: number;
  unit: string;
  period: GoalPeriod;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  currentProgress?: number;
}

// 成就分类
export type AchievementCategory = 'milestone' | 'volume' | 'streak' | 'performance' | 'fun';

// 成就稀有度
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

// 成就解锁状态
export interface AchievementStatus {
  key: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  target: number;
}

// 挑战类型
export type ChallengeType = 'cumulative' | 'consecutive' | 'single_breakthrough';

// 挑战状态
export type ChallengeStatus = 'active' | 'completed' | 'failed';

// 挑战
export interface Challenge {
  id: string;
  userId: string;
  title: string;
  type: ChallengeType;
  targetValue: number;
  unit: string;
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
  progress: number;
  completedAt?: string;
}

// 用户统计概览（用于成就检测）
export interface UserStats {
  totalRuns: number;
  totalDistance: number;       // km
  totalDuration: number;       // 秒
  maxSingleDistance: number;   // km
  bestPace5k: number | null;   // 分钟/公里
  currentStreakDays: number;
  longestStreakDays: number;
  weeklyRunCount: number;
  monthlyRunCount: number;
  earlyMorningRuns: number;   // 6 点前开跑
  lateNightRuns: number;      // 21 点后开跑
  rainRuns: number;           // 雨天标记
  consecutiveWeekends: number;
}

// API 响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// 保存跑步记录后的联动响应
export interface RunSaveResponse {
  run: RunRecord;
  goalUpdates?: Array<{
    goalId: string;
    title: string;
    progress: number;
    targetValue: number;
    completed: boolean;
  }>;
  newAchievements?: Array<{
    key: string;
    name: string;
    description: string;
    rarity: AchievementRarity;
    unlockedAt: string;
  }>;
  challengeUpdates?: Array<{
    challengeId: string;
    title: string;
    progress: number;
    targetValue: number;
    status: ChallengeStatus;
  }>;
}
