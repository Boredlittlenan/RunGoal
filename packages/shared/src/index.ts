// 共享类型
export type {
  RunSource,
  Feeling,
  TrackPoint,
  RunRecord,
  GoalType,
  GoalPeriod,
  Goal,
  AchievementCategory,
  AchievementRarity,
  AchievementStatus,
  ChallengeType,
  ChallengeStatus,
  Challenge,
  UserStats,
  ApiResponse,
  RunSaveResponse,
} from './types/index.js';

// 成就系统
export { achievements, checkAchievements } from './achievements/index.js';
export type { AchievementDef } from './achievements/index.js';
