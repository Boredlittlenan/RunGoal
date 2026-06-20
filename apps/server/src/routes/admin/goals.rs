use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::middleware::auth::{AppState, AuthAdmin};

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

    let data: Vec<Value> = goals
        .iter()
        .map(|g| {
            json!({
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
                "createdAt": g.created_at.to_string(),
                "updatedAt": g.updated_at.to_string(),
                "userNickname": g.user_nickname
            })
        })
        .collect();

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
