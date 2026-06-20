use chrono::Datelike;
use serde::Serialize;

use crate::error::AppError;

/// Full user statistics used by the achievement detection system.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserStats {
    pub total_runs: i64,
    pub total_distance: f64,
    pub total_duration: i64,
    pub max_single_distance: f64,
    pub best_pace_5k: Option<f64>,
    pub current_streak_days: i32,
    pub longest_streak_days: i32,
    pub weekly_run_count: i32,
    pub monthly_run_count: i32,
    pub early_morning_runs: i32,
    pub late_night_runs: i32,
    pub rain_runs: i32,
    pub consecutive_weekends: i32,
}

/// A single run row used for stats computation.
#[derive(Debug, sqlx::FromRow)]
struct RunRow {
    distance: f64,
    duration: i32,
    #[sqlx(rename = "avgPace")]
    avg_pace: Option<f64>,
    #[sqlx(rename = "startedAt")]
    started_at: chrono::NaiveDateTime,
    weather: Option<String>,
}

pub async fn compute_user_stats(
    pool: &sqlx::PgPool,
    user_id: &str,
) -> Result<UserStats, AppError> {
    let rows = sqlx::query_as::<_, RunRow>(
        r#"SELECT distance, duration, "avgPace", "startedAt", weather
           FROM "Run" WHERE "userId" = $1 ORDER BY "startedAt" ASC"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let mut stats = UserStats::default();
    if rows.is_empty() {
        return Ok(stats);
    }

    stats.total_runs = rows.len() as i64;
    stats.total_distance = rows.iter().map(|r| r.distance).sum();
    stats.total_duration = rows.iter().map(|r| r.duration as i64).sum();
    stats.max_single_distance = rows.iter().map(|r| r.distance).fold(0.0_f64, f64::max);

    // Best 5K pace: min avgPace among runs with distance >= 5km
    stats.best_pace_5k = rows
        .iter()
        .filter(|r| r.distance >= 5.0 && r.avg_pace.is_some())
        .filter_map(|r| r.avg_pace)
        .min_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    // Unique run dates (sorted)
    let mut dates: Vec<chrono::NaiveDate> = rows
        .iter()
        .map(|r| r.started_at.date())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();
    dates.sort();

    // Longest streak
    let mut longest = 0i32;
    let mut temp = 0i32;
    for i in 0..dates.len() {
        if i == 0 {
            temp = 1;
        } else {
            let diff = (dates[i] - dates[i - 1]).num_days();
            temp = if diff == 1 { temp + 1 } else { 1 };
        }
        longest = longest.max(temp);
    }
    stats.longest_streak_days = longest;

    // Current streak (ending today or yesterday)
    if !dates.is_empty() {
        let today = chrono::Utc::now().date_naive();
        let last = dates[dates.len() - 1];
        let diff = (today - last).num_days();
        stats.current_streak_days = if diff <= 1 { temp } else { 0 };
    }

    // Early morning (hour < 6), late night (hour >= 21), rain
    use chrono::Timelike;
    for r in &rows {
        let h = r.started_at.hour();
        if h < 6 {
            stats.early_morning_runs += 1;
        }
        if h >= 21 {
            stats.late_night_runs += 1;
        }
        if r.weather.as_deref() == Some("rain") {
            stats.rain_runs += 1;
        }
    }

    // Consecutive weekends: count the longest streak of consecutive ISO weeks
    // in which the user ran at least once on Saturday or Sunday.
    let mut weekend_weeks: Vec<(i32, u32)> = dates
        .iter()
        .filter(|d| d.weekday() == chrono::Weekday::Sat || d.weekday() == chrono::Weekday::Sun)
        .map(|d| d.iso_week())
        .map(|w| (w.year(), w.week()))
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();
    weekend_weeks.sort();

    let mut max_consec = 0i32;
    let mut cur_consec = 0i32;
    for i in 0..weekend_weeks.len() {
        if i == 0 {
            cur_consec = 1;
        } else {
            let (py, pw) = weekend_weeks[i - 1];
            let (cy, cw) = weekend_weeks[i];
            // Check if current week is exactly 1 week after previous
            let prev_weeks = py * 52 + pw as i32;
            let curr_weeks = cy * 52 + cw as i32;
            cur_consec = if curr_weeks - prev_weeks == 1 { cur_consec + 1 } else { 1 };
        }
        max_consec = max_consec.max(cur_consec);
    }
    stats.consecutive_weekends = max_consec;

    // Weekly / monthly run counts
    let now = chrono::Utc::now();
    let week_start = {
        let d = now.date_naive();
        let wd = d.weekday().num_days_from_sunday();
        d - chrono::Duration::days(wd as i64)
    };
    let month_start = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();

    for r in &rows {
        let rd = r.started_at.date();
        if rd >= week_start {
            stats.weekly_run_count += 1;
        }
        if rd >= month_start {
            stats.monthly_run_count += 1;
        }
    }

    Ok(stats)
}
