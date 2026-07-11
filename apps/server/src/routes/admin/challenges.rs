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
    status: Option<String>,
}

// ─── SQL row types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct ChallengeRow {
    id: String,
    #[sqlx(rename = "userId")]
    user_id: String,
    title: String,
    #[sqlx(rename = "type")]
    challenge_type: String,
    #[sqlx(rename = "targetValue")]
    target_value: f64,
    unit: String,
    status: String,
    #[sqlx(rename = "startDate")]
    start_date: chrono::NaiveDateTime,
    #[sqlx(rename = "endDate")]
    end_date: chrono::NaiveDateTime,
    progress: f64,
    #[sqlx(rename = "completedAt")]
    completed_at: Option<chrono::NaiveDateTime>,
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

    let (challenges, total) = if let Some(ref status) = params.status {
        let total: i64 =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM "Challenge" WHERE status = $1"#)
                .bind(status)
                .fetch_one(&state.pool)
                .await
                .unwrap_or(0);

        let rows = sqlx::query_as::<_, ChallengeRow>(
            r#"
            SELECT c.id, c."userId", c.title, c.type, c."targetValue", c.unit,
                   c.status, c."startDate", c."endDate", c.progress,
                   c."completedAt", c."createdAt", c."updatedAt",
                   u.nickname AS "userNickname"
            FROM "Challenge" c
            JOIN "User" u ON c."userId" = u.id
            WHERE c.status = $1
            ORDER BY c."createdAt" DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        (rows, total)
    } else {
        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "Challenge""#)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

        let rows = sqlx::query_as::<_, ChallengeRow>(
            r#"
            SELECT c.id, c."userId", c.title, c.type, c."targetValue", c.unit,
                   c.status, c."startDate", c."endDate", c.progress,
                   c."completedAt", c."createdAt", c."updatedAt",
                   u.nickname AS "userNickname"
            FROM "Challenge" c
            JOIN "User" u ON c."userId" = u.id
            ORDER BY c."createdAt" DESC
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

    let data: Vec<Value> = challenges
        .iter()
        .map(|c| {
            json!({
                "id": c.id,
                "userId": c.user_id,
                "title": c.title,
                "type": c.challenge_type,
                "targetValue": c.target_value,
                "unit": c.unit,
                "status": c.status,
                "startDate": c.start_date.to_string(),
                "endDate": c.end_date.to_string(),
                "progress": c.progress,
                "completedAt": c.completed_at.map(|t| t.to_string()),
                "createdAt": c.created_at.to_string(),
                "updatedAt": c.updated_at.to_string(),
                "userNickname": c.user_nickname
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
