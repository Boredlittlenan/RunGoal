use axum::{
    extract::{Path, Query, State},
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
    source: Option<String>,
}

// ─── SQL row types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct RunListRow {
    id: String,
    #[sqlx(rename = "userId")]
    user_id: String,
    distance: f64,
    duration: i32,
    #[sqlx(rename = "avgPace")]
    avg_pace: Option<f64>,
    source: String,
    calories: Option<f64>,
    feeling: Option<i32>,
    note: Option<String>,
    weather: Option<String>,
    #[sqlx(rename = "startedAt")]
    started_at: chrono::NaiveDateTime,
    #[sqlx(rename = "endedAt")]
    ended_at: Option<chrono::NaiveDateTime>,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::NaiveDateTime,
    #[sqlx(rename = "userNickname")]
    user_nickname: String,
}

#[derive(Debug, sqlx::FromRow)]
struct RunDetailRow {
    id: String,
    #[sqlx(rename = "userId")]
    user_id: String,
    distance: f64,
    duration: i32,
    #[sqlx(rename = "avgPace")]
    avg_pace: Option<f64>,
    source: String,
    calories: Option<f64>,
    feeling: Option<i32>,
    note: Option<String>,
    weather: Option<String>,
    #[sqlx(rename = "startedAt")]
    started_at: chrono::NaiveDateTime,
    #[sqlx(rename = "endedAt")]
    ended_at: Option<chrono::NaiveDateTime>,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    updated_at: chrono::NaiveDateTime,
    // User fields
    #[sqlx(rename = "userPhone")]
    user_phone: String,
    #[sqlx(rename = "userNickname")]
    user_nickname: String,
    #[sqlx(rename = "userAvatar")]
    user_avatar: Option<String>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn run_list_to_json(r: &RunListRow) -> Value {
    json!({
        "id": r.id,
        "userId": r.user_id,
        "distance": r.distance,
        "duration": r.duration,
        "avgPace": r.avg_pace,
        "source": r.source,
        "calories": r.calories,
        "feeling": r.feeling,
        "note": r.note,
        "weather": r.weather,
        "startedAt": r.started_at.to_string(),
        "endedAt": r.ended_at.map(|t| t.to_string()),
        "createdAt": r.created_at.to_string(),
        "userNickname": r.user_nickname
    })
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

    let (runs, total) = if let Some(ref source) = params.source {
        let total: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "Run" WHERE source = $1"#,
        )
        .bind(source)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

        let rows = sqlx::query_as::<_, RunListRow>(
            r#"
            SELECT r.id, r."userId", r.distance, r.duration, r."avgPace", r.source,
                   r.calories, r.feeling, r.note, r.weather,
                   r."startedAt", r."endedAt", r."createdAt",
                   u.nickname AS "userNickname"
            FROM "Run" r
            JOIN "User" u ON r."userId" = u.id
            WHERE r.source = $1
            ORDER BY r."startedAt" DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(source)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        (rows, total)
    } else {
        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "Run""#)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

        let rows = sqlx::query_as::<_, RunListRow>(
            r#"
            SELECT r.id, r."userId", r.distance, r.duration, r."avgPace", r.source,
                   r.calories, r.feeling, r.note, r.weather,
                   r."startedAt", r."endedAt", r."createdAt",
                   u.nickname AS "userNickname"
            FROM "Run" r
            JOIN "User" u ON r."userId" = u.id
            ORDER BY r."startedAt" DESC
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

    Json(json!({
        "success": true,
        "data": runs.iter().map(run_list_to_json).collect::<Vec<_>>(),
        "meta": {
            "page": page,
            "pageSize": page_size,
            "total": total
        }
    }))
}

async fn detail(
    _admin: AuthAdmin,
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<Value> {
    let row = sqlx::query_as::<_, RunDetailRow>(
        r#"
        SELECT r.id, r."userId", r.distance, r.duration, r."avgPace", r.source,
               r.calories, r.feeling, r.note, r.weather,
               r."startedAt", r."endedAt", r."createdAt", r."updatedAt",
               u.phone     AS "userPhone",
               u.nickname  AS "userNickname",
               u.avatar    AS "userAvatar"
        FROM "Run" r
        JOIN "User" u ON r."userId" = u.id
        WHERE r.id = $1
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => Json(json!({
            "success": true,
            "data": {
                "id": r.id,
                "userId": r.user_id,
                "distance": r.distance,
                "duration": r.duration,
                "avgPace": r.avg_pace,
                "source": r.source,
                "calories": r.calories,
                "feeling": r.feeling,
                "note": r.note,
                "weather": r.weather,
                "startedAt": r.started_at.to_string(),
                "endedAt": r.ended_at.map(|t| t.to_string()),
                "createdAt": r.created_at.to_string(),
                "updatedAt": r.updated_at.to_string(),
                "user": {
                    "id": r.user_id,
                    "phone": r.user_phone,
                    "nickname": r.user_nickname,
                    "avatar": r.user_avatar
                }
            }
        })),
        Ok(None) => Json(json!({
            "success": false,
            "error": "跑步记录不存在"
        })),
        Err(e) => {
            tracing::error!("run detail error: {}", e);
            Json(json!({ "success": false, "error": "服务器错误" }))
        }
    }
}

async fn remove(
    _admin: AuthAdmin,
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<Value> {
    let result = sqlx::query(r#"DELETE FROM "Run" WHERE id = $1"#)
        .bind(&id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Json(json!({
                    "success": false,
                    "error": "跑步记录不存在"
                }));
            }
            Json(json!({
                "success": true,
                "data": { "deleted": true }
            }))
        }
        Err(e) => {
            tracing::error!("delete run error: {}", e);
            Json(json!({ "success": false, "error": "删除失败" }))
        }
    }
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list))
        .route("/{id}", get(detail).delete(remove))
}
