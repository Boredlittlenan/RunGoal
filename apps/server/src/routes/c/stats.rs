use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/overview", get(overview))
        .route("/calendar", get(calendar))
        .route("/pace-trend", get(pace_trend))
        .route("/weekly", get(weekly))
        .route("/monthly", get(monthly))
        .route("/period", get(period_stats))
}

// ---------------------------------------------------------------------------
// GET /overview — total distance, duration, runs, avg pace
// ---------------------------------------------------------------------------

async fn overview(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let row: (f64, i64, i64) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(distance), 0.0)::float8,
               COALESCE(SUM(duration), 0)::bigint,
               COUNT(*)::bigint
        FROM "Run"
        WHERE "userId" = $1 AND "archivedAt" IS NULL
        "#,
    )
    .bind(&auth.user_id)
    .fetch_one(&state.pool)
    .await?;

    let (total_distance, total_duration, total_runs) = row;

    // avgPace in min/km: total_duration (seconds) / 60 / total_distance
    let avg_pace = if total_distance > 0.0 {
        Some((total_duration as f64) / 60.0 / total_distance)
    } else {
        None
    };

    Ok(Json(json!({
        "success": true,
        "data": {
            "totalDistance": total_distance,
            "totalDuration": total_duration,
            "totalRuns": total_runs,
            "avgPace": avg_pace,
        },
    })))
}

// ---------------------------------------------------------------------------
// GET /calendar — calendar heatmap data by year
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalendarQuery {
    year: Option<i32>,
}

/// One day's aggregated run data for the calendar heatmap.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CalendarDay {
    date: String,
    distance: f64,
    duration: i64,
    count: i64,
}

async fn calendar(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<CalendarQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let year = query.year.unwrap_or_else(|| chrono::Utc::now().format("%Y").to_string().parse().unwrap_or(2026));

    let rows: Vec<(chrono::NaiveDate, f64, i64, i64)> = sqlx::query_as(
        r#"
        SELECT "startedAt"::date AS date,
               COALESCE(SUM(distance), 0.0)::float8 AS distance,
               COALESCE(SUM(duration), 0)::bigint    AS duration,
               COUNT(*)::bigint                      AS count
        FROM "Run"
        WHERE "userId" = $1
          AND EXTRACT(YEAR FROM "startedAt") = $2
        GROUP BY "startedAt"::date
        ORDER BY date ASC
        "#,
    )
    .bind(&auth.user_id)
    .bind(year)
    .fetch_all(&state.pool)
    .await?;

    let days: Vec<CalendarDay> = rows
        .into_iter()
        .map(|(date, distance, duration, count)| CalendarDay {
            date: date.format("%Y-%m-%d").to_string(),
            distance,
            duration,
            count,
        })
        .collect();

    Ok(Json(json!({
        "success": true,
        "data": days,
        "meta": {
            "year": year,
        },
    })))
}

// ---------------------------------------------------------------------------
// GET /pace-trend — last N runs with avgPace
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaceTrendQuery {
    limit: Option<i64>,
}

/// A single data-point in the pace trend series.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PaceTrendPoint {
    id: String,
    date: String,
    avg_pace: f64,
    distance: f64,
    duration: i32,
}

async fn pace_trend(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<PaceTrendQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);

    let rows: Vec<(String, chrono::NaiveDateTime, Option<f64>, f64, i32)> = sqlx::query_as(
        r#"
        SELECT id, "startedAt", "avgPace", distance, duration
        FROM "Run"
        WHERE "userId" = $1 AND "avgPace" IS NOT NULL
        ORDER BY "startedAt" DESC
        LIMIT $2
        "#,
    )
    .bind(&auth.user_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    // Reverse to chronological order for the trend line
    let mut points: Vec<PaceTrendPoint> = rows
        .into_iter()
        .filter_map(|(id, started_at, avg_pace, distance, duration)| {
            avg_pace.map(|pace| PaceTrendPoint {
                id,
                date: started_at.format("%Y-%m-%d").to_string(),
                avg_pace: pace,
                distance,
                duration,
            })
        })
        .collect();

    points.reverse();

    Ok(Json(json!({
        "success": true,
        "data": points,
    })))
}

// ---------------------------------------------------------------------------
// GET /weekly — this week's stats (ISO week, Mon-Sun)
// ---------------------------------------------------------------------------

async fn weekly(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let row: (f64, i64, i64) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(distance), 0.0)::float8,
               COALESCE(SUM(duration), 0)::bigint,
               COUNT(*)::bigint
        FROM "Run"
        WHERE "userId" = $1
          AND "startedAt" >= date_trunc('week', NOW())
          AND "startedAt" <  date_trunc('week', NOW()) + interval '1 week'
        "#,
    )
    .bind(&auth.user_id)
    .fetch_one(&state.pool)
    .await?;

    let (total_distance, total_duration, total_runs) = row;

    Ok(Json(json!({
        "success": true,
        "data": {
            "totalDistance": total_distance,
            "totalDuration": total_duration,
            "totalRuns": total_runs,
        },
    })))
}

// ---------------------------------------------------------------------------
// GET /monthly — this month's stats
// ---------------------------------------------------------------------------

async fn monthly(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let row: (f64, i64, i64) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(distance), 0.0)::float8,
               COALESCE(SUM(duration), 0)::bigint,
               COUNT(*)::bigint
        FROM "Run"
        WHERE "userId" = $1
          AND "startedAt" >= date_trunc('month', NOW())
          AND "startedAt" <  date_trunc('month', NOW()) + interval '1 month'
        "#,
    )
    .bind(&auth.user_id)
    .fetch_one(&state.pool)
    .await?;

    let (total_distance, total_duration, total_runs) = row;

    Ok(Json(json!({
        "success": true,
        "data": {
            "totalDistance": total_distance,
            "totalDuration": total_duration,
            "totalRuns": total_runs,
        },
    })))
}

// ---------------------------------------------------------------------------
// GET /period — flexible period-based stats for share cards
// Query: type=day|week|month|quarter|year&date=YYYY-MM-DD (optional)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct PeriodQuery {
    #[serde(rename = "type")]
    period_type: Option<String>,
    date: Option<String>,
}

async fn period_stats(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<PeriodQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    use chrono::{Datelike, NaiveDate, Utc};

    let period_type = query.period_type.as_deref().unwrap_or("month");

    let ref_date = query
        .date
        .as_deref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .unwrap_or_else(|| Utc::now().date_naive());

    let (start, end, label) = match period_type {
        "day" => {
            let s = ref_date.and_hms_opt(0, 0, 0).unwrap();
            let e = (ref_date + chrono::Duration::days(1)).and_hms_opt(0, 0, 0).unwrap();
            (s, e, ref_date.format("%Y年%m月%d日").to_string())
        }
        "week" => {
            let wd = ref_date.weekday().num_days_from_monday() as i64;
            let week_start = ref_date - chrono::Duration::days(wd);
            let week_end = week_start + chrono::Duration::days(7);
            let s = week_start.and_hms_opt(0, 0, 0).unwrap();
            let e = week_end.and_hms_opt(0, 0, 0).unwrap();
            (s, e, format!("{}年 第{}周", week_start.year(), ref_date.iso_week().week()))
        }
        "month" => {
            let month_start = NaiveDate::from_ymd_opt(ref_date.year(), ref_date.month(), 1).unwrap();
            let next_month = if ref_date.month() == 12 {
                NaiveDate::from_ymd_opt(ref_date.year() + 1, 1, 1).unwrap()
            } else {
                NaiveDate::from_ymd_opt(ref_date.year(), ref_date.month() + 1, 1).unwrap()
            };
            let s = month_start.and_hms_opt(0, 0, 0).unwrap();
            let e = next_month.and_hms_opt(0, 0, 0).unwrap();
            (s, e, format!("{}年{}月", ref_date.year(), ref_date.month()))
        }
        "quarter" => {
            let q = (ref_date.month() - 1) / 3;
            let q_start_month = q * 3 + 1;
            let q_end_month = q_start_month + 3;
            let q_start = NaiveDate::from_ymd_opt(ref_date.year(), q_start_month, 1).unwrap();
            let q_end = if q_end_month > 12 {
                NaiveDate::from_ymd_opt(ref_date.year() + 1, 1, 1).unwrap()
            } else {
                NaiveDate::from_ymd_opt(ref_date.year(), q_end_month, 1).unwrap()
            };
            let s = q_start.and_hms_opt(0, 0, 0).unwrap();
            let e = q_end.and_hms_opt(0, 0, 0).unwrap();
            (s, e, format!("{}年 Q{}", ref_date.year(), q + 1))
        }
        "year" => {
            let year_start = NaiveDate::from_ymd_opt(ref_date.year(), 1, 1).unwrap();
            let year_end = NaiveDate::from_ymd_opt(ref_date.year() + 1, 1, 1).unwrap();
            let s = year_start.and_hms_opt(0, 0, 0).unwrap();
            let e = year_end.and_hms_opt(0, 0, 0).unwrap();
            (s, e, format!("{}年", ref_date.year()))
        }
        _ => return Err(AppError::BadRequest("Invalid period type".into())),
    };

    let agg: (f64, i64, i64) = sqlx::query_as(
        r#"SELECT COALESCE(SUM(distance),0.0)::float8, COALESCE(SUM(duration),0)::bigint, COUNT(*)::bigint
           FROM "Run" WHERE "userId"=$1 AND "archivedAt" IS NULL AND "startedAt">=$2 AND "startedAt"<$3"#,
    )
    .bind(&auth.user_id).bind(start).bind(end)
    .fetch_one(&state.pool).await?;

    let (total_distance, total_duration, total_runs) = agg;
    let avg_pace = if total_distance > 0.0 { Some((total_duration as f64)/60.0/total_distance) } else { None };

    let best_pace: Option<f64> = sqlx::query_scalar(
        r#"SELECT MIN("avgPace") FROM "Run" WHERE "userId"=$1 AND "archivedAt" IS NULL AND "startedAt">=$2 AND "startedAt"<$3 AND distance>=3.0 AND "avgPace" IS NOT NULL"#,
    ).bind(&auth.user_id).bind(start).bind(end).fetch_one(&state.pool).await?;

    let max_distance: Option<f64> = sqlx::query_scalar(
        r#"SELECT MAX(distance) FROM "Run" WHERE "userId"=$1 AND "archivedAt" IS NULL AND "startedAt">=$2 AND "startedAt"<$3"#,
    ).bind(&auth.user_id).bind(start).bind(end).fetch_one(&state.pool).await?;

    let running_days: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(DISTINCT "startedAt"::date) FROM "Run" WHERE "userId"=$1 AND "archivedAt" IS NULL AND "startedAt">=$2 AND "startedAt"<$3"#,
    ).bind(&auth.user_id).bind(start).bind(end).fetch_one(&state.pool).await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "totalDistance": total_distance,
            "totalDuration": total_duration,
            "totalRuns": total_runs,
            "avgPace": avg_pace,
            "bestPace": best_pace,
            "maxDistance": max_distance.unwrap_or(0.0),
            "runningDays": running_days,
            "periodType": period_type,
            "label": label,
        },
    })))
}
