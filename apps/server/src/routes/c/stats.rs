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
        WHERE "userId" = $1
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

    let rows: Vec<(String, chrono::DateTime<chrono::Utc>, Option<f64>, f64, i32)> = sqlx::query_as(
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
