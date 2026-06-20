use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};

use crate::middleware::auth::{AppState, AuthAdmin};

// ─── SQL row types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct RecentRunRow {
    id: String,
    distance: f64,
    duration: i32,
    #[sqlx(rename = "startedAt")]
    started_at: chrono::DateTime<chrono::Utc>,
    #[sqlx(rename = "userNickname")]
    user_nickname: String,
}

#[derive(Debug, sqlx::FromRow)]
struct RecentUserRow {
    id: String,
    nickname: String,
    phone: String,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async fn stats(
    _admin: AuthAdmin,
    State(state): State<AppState>,
) -> Json<Value> {
    // ── Scalar counters (run concurrently) ──────────────────────────────────

    let total_users_fut = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User""#,
    )
    .fetch_one(&state.pool);

    let today_new_users_fut = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "User" WHERE "createdAt" >= CURRENT_DATE"#,
    )
    .fetch_one(&state.pool);

    let total_runs_fut = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "Run""#,
    )
    .fetch_one(&state.pool);

    let today_runs_fut = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM "Run" WHERE "startedAt" >= CURRENT_DATE"#,
    )
    .fetch_one(&state.pool);

    let total_distance_fut = sqlx::query_scalar::<_, Option<f64>>(
        r#"SELECT COALESCE(SUM(distance), 0) FROM "Run""#,
    )
    .fetch_one(&state.pool);

    let today_distance_fut = sqlx::query_scalar::<_, Option<f64>>(
        r#"SELECT COALESCE(SUM(distance), 0) FROM "Run" WHERE "startedAt" >= CURRENT_DATE"#,
    )
    .fetch_one(&state.pool);

    let active_users_7d_fut = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(DISTINCT "userId") FROM "Run" WHERE "startedAt" >= NOW() - INTERVAL '7 days'"#,
    )
    .fetch_one(&state.pool);

    let recent_runs_fut = sqlx::query_as::<_, RecentRunRow>(
        r#"
        SELECT r.id, r.distance, r.duration, r."startedAt", u.nickname AS "userNickname"
        FROM "Run" r
        JOIN "User" u ON r."userId" = u.id
        ORDER BY r."startedAt" DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool);

    let recent_users_fut = sqlx::query_as::<_, RecentUserRow>(
        r#"
        SELECT id, nickname, phone, "createdAt"
        FROM "User"
        ORDER BY "createdAt" DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool);

    // ── Await all ───────────────────────────────────────────────────────────

    let (
        total_users,
        today_new_users,
        total_runs,
        today_runs,
        total_distance,
        today_distance,
        active_users_7d,
        recent_runs,
        recent_users,
    ) = tokio::try_join!(
        total_users_fut,
        today_new_users_fut,
        total_runs_fut,
        today_runs_fut,
        total_distance_fut,
        today_distance_fut,
        active_users_7d_fut,
        recent_runs_fut,
        recent_users_fut,
    )
    .unwrap_or_default();

    Json(json!({
        "success": true,
        "data": {
            "totalUsers": total_users,
            "todayNewUsers": today_new_users,
            "totalRuns": total_runs,
            "todayRuns": today_runs,
            "totalDistance": total_distance.unwrap_or(0.0),
            "todayDistance": today_distance.unwrap_or(0.0),
            "activeUsers7d": active_users_7d,
            "recentRuns": recent_runs.iter().map(|r| json!({
                "id": r.id,
                "distance": r.distance,
                "duration": r.duration,
                "startedAt": r.started_at.to_rfc3339(),
                "userNickname": r.user_nickname
            })).collect::<Vec<_>>(),
            "recentUsers": recent_users.iter().map(|u| json!({
                "id": u.id,
                "nickname": u.nickname,
                "phone": u.phone,
                "createdAt": u.created_at.to_rfc3339()
            })).collect::<Vec<_>>()
        }
    }))
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(stats))
}
