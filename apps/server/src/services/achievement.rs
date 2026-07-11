use crate::services::stats::UserStats;

/// Static definition of a single achievement.
pub struct AchievementDef {
    pub key: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub icon: &'static str,
    pub category: &'static str,
    pub rarity: &'static str,
    pub check: fn(&UserStats) -> bool,
}

/// All 20 achievements, matching the Express/TypeScript definitions exactly.
pub static ACHIEVEMENTS: &[AchievementDef] = &[
    // ─── Milestone ───
    AchievementDef {
        key: "first_run",
        name: "初出茅庐",
        description: "完成第一次跑步记录",
        icon: "badge-first-run",
        category: "milestone",
        rarity: "common",
        check: |s| s.total_runs >= 1,
    },
    AchievementDef {
        key: "5k_runner",
        name: "5K 跑者",
        description: "单次跑步达到 5km",
        icon: "badge-5k",
        category: "milestone",
        rarity: "common",
        check: |s| s.max_single_distance >= 5.0,
    },
    AchievementDef {
        key: "10k_runner",
        name: "10K 跑者",
        description: "单次跑步达到 10km",
        icon: "badge-10k",
        category: "milestone",
        rarity: "rare",
        check: |s| s.max_single_distance >= 10.0,
    },
    AchievementDef {
        key: "half_marathon",
        name: "半马达成",
        description: "单次跑步达到 21.0975km",
        icon: "badge-half-marathon",
        category: "milestone",
        rarity: "epic",
        check: |s| s.max_single_distance >= 21.0975,
    },
    AchievementDef {
        key: "full_marathon",
        name: "全马达成",
        description: "单次跑步达到 42.195km",
        icon: "badge-full-marathon",
        category: "milestone",
        rarity: "legendary",
        check: |s| s.max_single_distance >= 42.195,
    },
    // ─── Volume ───
    AchievementDef {
        key: "volume_100km",
        name: "百公里俱乐部",
        description: "累计跑量达到 100km",
        icon: "badge-100km",
        category: "volume",
        rarity: "rare",
        check: |s| s.total_distance >= 100.0,
    },
    AchievementDef {
        key: "volume_500km",
        name: "五百公里",
        description: "累计跑量达到 500km",
        icon: "badge-500km",
        category: "volume",
        rarity: "epic",
        check: |s| s.total_distance >= 500.0,
    },
    AchievementDef {
        key: "volume_1000km",
        name: "千公里达人",
        description: "累计跑量达到 1000km",
        icon: "badge-1000km",
        category: "volume",
        rarity: "epic",
        check: |s| s.total_distance >= 1000.0,
    },
    AchievementDef {
        key: "volume_earth",
        name: "地球环跑",
        description: "累计跑量达到 40075km",
        icon: "badge-earth",
        category: "volume",
        rarity: "legendary",
        check: |s| s.total_distance >= 40075.0,
    },
    // ─── Streak ───
    AchievementDef {
        key: "streak_3days",
        name: "三日连续",
        description: "连续 3 天有跑步记录",
        icon: "badge-streak-3",
        category: "streak",
        rarity: "common",
        check: |s| s.longest_streak_days >= 3,
    },
    AchievementDef {
        key: "streak_4weeks",
        name: "周周不断",
        description: "连续 4 周每周至少跑 1 次",
        icon: "badge-streak-4w",
        category: "streak",
        rarity: "rare",
        check: |s| s.consecutive_weekends >= 4,
    },
    AchievementDef {
        key: "streak_30days",
        name: "月度铁人",
        description: "连续 30 天每天至少跑 1 次",
        icon: "badge-streak-30",
        category: "streak",
        rarity: "epic",
        check: |s| s.longest_streak_days >= 30,
    },
    AchievementDef {
        key: "streak_100days",
        name: "百日修行",
        description: "连续 100 天有跑步记录",
        icon: "badge-streak-100",
        category: "streak",
        rarity: "legendary",
        check: |s| s.longest_streak_days >= 100,
    },
    // ─── Performance ───
    AchievementDef {
        key: "pace_sub6",
        name: "破 6",
        description: "5km 配速进入 6:00/km",
        icon: "badge-pace-sub6",
        category: "performance",
        rarity: "rare",
        check: |s| s.best_pace_5k.is_some_and(|p| p <= 6.0),
    },
    AchievementDef {
        key: "pace_sub5",
        name: "破 5",
        description: "5km 配速进入 5:00/km",
        icon: "badge-pace-sub5",
        category: "performance",
        rarity: "epic",
        check: |s| s.best_pace_5k.is_some_and(|p| p <= 5.0),
    },
    AchievementDef {
        key: "pace_sub4",
        name: "破 4",
        description: "5km 配速进入 4:00/km",
        icon: "badge-pace-sub4",
        category: "performance",
        rarity: "legendary",
        check: |s| s.best_pace_5k.is_some_and(|p| p <= 4.0),
    },
    AchievementDef {
        key: "early_bird",
        name: "晨跑达人",
        description: "累计 20 次早晨 6 点前开跑",
        icon: "badge-early-bird",
        category: "performance",
        rarity: "rare",
        check: |s| s.early_morning_runs >= 20,
    },
    AchievementDef {
        key: "night_runner",
        name: "夜跑侠",
        description: "累计 20 次晚上 9 点后开跑",
        icon: "badge-night-runner",
        category: "performance",
        rarity: "rare",
        check: |s| s.late_night_runs >= 20,
    },
    // ─── Fun ───
    AchievementDef {
        key: "rain_hero",
        name: "雨战英雄",
        description: "在雨天完成一次跑步",
        icon: "badge-rain",
        category: "fun",
        rarity: "rare",
        check: |s| s.rain_runs >= 1,
    },
    AchievementDef {
        key: "weekend_warrior",
        name: "周末战士",
        description: "连续 8 个周末都有跑步",
        icon: "badge-weekend",
        category: "fun",
        rarity: "epic",
        check: |s| s.consecutive_weekends >= 8,
    },
];

/// Check all achievements against user stats. Returns the keys of newly unlocked
/// achievements (those that pass the check but aren't in `already_unlocked`).
pub fn check_achievements(
    stats: &UserStats,
    already_unlocked: &[String],
) -> Vec<&'static AchievementDef> {
    ACHIEVEMENTS
        .iter()
        .filter(|def| (def.check)(stats) && !already_unlocked.iter().any(|k| k == def.key))
        .collect()
}
