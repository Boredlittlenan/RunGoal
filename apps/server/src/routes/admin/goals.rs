use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::middleware::auth::{AppState, AuthAdmin};
use crate::models::goal::GoalRecord;

// ─── Query types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct ListParams {
    page: Option<i64>,
    #[serde(rename = "pageSize")]
    page_size: Option<i64>,
    #[serde(rename = "type")]
    goal_type: Option<String>,
}

// ─── SQL row types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct GoalRow {
    id: String,
    #[sqlx(rename = "userId")]
    user_id: String,
    title: String,
    #[sqlx(rename = "type")]
    goal_type: String,
    #[sqlx(rename = "targetValue")]
    target_value: f64,
    unit: String,
    period: String,
    #[sqlx(rename = "startDate")]
    start_date: chrono::NaiveDateTime,
    #[sqlx(rename = "endDate")]
    end_date: Option<chrono::NaiveDateTime>,
    #[sqlx(rename = "isActive")]
    is_active: bool,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    updated_at: chrono::NaiveDateTime,
    #[sqlx(rename = "userNickname")]
    user_nickname: String,
}

// ─── Progress computation ────────────────────────────────────────────────────

async fn fetch_goal_records(pool: &sqlx::PgPool, goal_id: &str) -> Vec<GoalRecord> {
    sqlx::query_as::<_, GoalRecord>(
        r#"
        SELECT id, "goalId", "runId", value, "createdAt"
        FROM "GoalRecord"
        WHERE "goalId" = $1
        ORDER BY "createdAt" DESC
        "#,
    )
    .bind(goal_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
}

fn compute_progress(goal_type: &str, target_value: f64, records: &[GoalRecord]) -> (f64, f64) {
    let current_value: f64 = match goal_type {
        "pace" => records.iter().map(|r| r.value).fold(f64::INFINITY, f64::min),
        "distance" => records.iter().map(|r| r.value).fold(0.0_f64, f64::max),
        _ => records.iter().map(|r| r.value).sum(),
    };
    let current_value = if records.is_empty() { 0.0 } else { current_value };

    let progress_pct = if target_value > 0.0 {
        match goal_type {
            "pace" => {
                if current_value > 0.0 && current_value <= target_value {
                    100.0
                } else if current_value > 0.0 {
                    ((target_value / current_value) * 100.0).min(100.0)
                } else {
                    0.0
                }
            }
            _ => ((current_value / target_value) * 100.0).min(100.0),
        }
    } else {
        0.0
    };
    (current_value, progress_pct)
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async fn list(
    _admin: AuthAdmin,
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let (goals, total) = if let Some(ref goal_type) = params.goal_type {
        let total: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "Goal" WHERE type = $1"#,
        )
        .bind(goal_type)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

        let rows = sqlx::query_as::<_, GoalRow>(
            r#"
            SELECT g.id, g."userId", g.title, g.type, g."targetValue", g.unit,
                   g.period, g."startDate", g."endDate", g."isActive",
                   g."createdAt", g."updatedAt",
                   u.nickname AS "userNickname"
            FROM "Goal" g
            JOIN "User" u ON g."userId" = u.id
            WHERE g.type = $1
            ORDER BY g."createdAt" DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(goal_type)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        (rows, total)
    } else {
        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "Goal""#)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

        let rows = sqlx::query_as::<_, GoalRow>(
            r#"
            SELECT g.id, g."userId", g.title, g.type, g."targetValue", g.unit,
                   g.period, g."startDate", g."endDate", g."isActive",
                   g."createdAt", g."updatedAt",
                   u.nickname AS "userNickname"
            FROM "Goal" g
            JOIN "User" u ON g."userId" = u.id
            ORDER BY g."createdAt" DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        (rows, total)
    };

    // Enrich each goal with computed progress
    let mut data: Vec<Value> = Vec::with_capacity(goals.len());
    for g in &goals {
        let records = fetch_goal_records(&state.pool, &g.id).await;
        let (_current_value, progress_pct) = compute_progress(&g.goal_type, g.target_value, &records);
        let is_completed = progress_pct >= 100.0;

        data.push(json!({
            "id": g.id,
            "userId": g.user_id,
            "title": g.title,
            "type": g.goal_type,
            "targetValue": g.target_value,
            "unit": g.unit,
            "period": g.period,
            "startDate": g.start_date.to_string(),
            "endDate": g.end_date.map(|t| t.to_string()),
            "isActive": g.is_active,
            "progressPct": (progress_pct * 10.0).round() / 10.0,
            "isCompleted": is_completed,
            "createdAt": g.created_at.to_string(),
            "updatedAt": g.updated_at.to_string(),
            "userNickname": g.user_nickname
        }));
    }

    Json(json!({
        "success": true,
        "data": data,
        "meta": {
            "page": page,
            "pageSize": page_size,
            "total": total
        }
    }))
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(list))
}
