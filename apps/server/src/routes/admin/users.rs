use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::middleware::auth::{AppState, AuthAdmin};

// ─── Query / body types ──────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct ListParams {
    page: Option<i64>,
    #[serde(rename = "pageSize")]
    page_size: Option<i64>,
    search: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateUserRequest {
    nickname: Option<String>,
    weight: Option<f64>,
    height: Option<f64>,
}

// ─── SQL row types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct UserListRow {
    id: String,
    phone: String,
    nickname: String,
    avatar: Option<String>,
    weight: Option<f64>,
    height: Option<f64>,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
    #[sqlx(rename = "runCount")]
    run_count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct UserDetailRow {
    id: String,
    phone: String,
    nickname: String,
    avatar: Option<String>,
    weight: Option<f64>,
    height: Option<f64>,
    theme: String,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
    #[sqlx(rename = "updatedAt")]
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, sqlx::FromRow)]
struct UserRunRow {
    id: String,
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
    started_at: chrono::DateTime<chrono::Utc>,
    #[sqlx(rename = "endedAt")]
    ended_at: Option<chrono::DateTime<chrono::Utc>>,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, sqlx::FromRow)]
struct UserGoalRow {
    id: String,
    title: String,
    #[sqlx(rename = "type")]
    goal_type: String,
    #[sqlx(rename = "targetValue")]
    target_value: f64,
    unit: String,
    period: String,
    #[sqlx(rename = "startDate")]
    start_date: NaiveDate,
    #[sqlx(rename = "endDate")]
    end_date: Option<NaiveDate>,
    #[sqlx(rename = "isActive")]
    is_active: bool,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, sqlx::FromRow)]
struct UserAchievementRow {
    id: String,
    #[sqlx(rename = "achievementKey")]
    achievement_key: String,
    #[sqlx(rename = "unlockedAt")]
    unlocked_at: chrono::DateTime<chrono::Utc>,
    #[sqlx(rename = "unlockedByRun")]
    unlocked_by_run: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct UserChallengeRow {
    id: String,
    title: String,
    #[sqlx(rename = "type")]
    challenge_type: String,
    #[sqlx(rename = "targetValue")]
    target_value: f64,
    unit: String,
    status: String,
    #[sqlx(rename = "startDate")]
    start_date: NaiveDate,
    #[sqlx(rename = "endDate")]
    end_date: NaiveDate,
    progress: f64,
    #[sqlx(rename = "completedAt")]
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
    #[sqlx(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
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

    let (users, total) = if let Some(ref search) = params.search {
        let pattern = format!("%{}%", search);

        let total: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "User" WHERE nickname ILIKE $1 OR phone ILIKE $1"#,
        )
        .bind(&pattern)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

        let rows = sqlx::query_as::<_, UserListRow>(
            r#"
            SELECT u.id, u.phone, u.nickname, u.avatar, u.weight, u.height, u."createdAt",
                   COALESCE(rc.cnt, 0) AS "runCount"
            FROM "User" u
            LEFT JOIN (
                SELECT "userId", COUNT(*) AS cnt FROM "Run" GROUP BY "userId"
            ) rc ON rc."userId" = u.id
            WHERE u.nickname ILIKE $1 OR u.phone ILIKE $1
            ORDER BY u."createdAt" DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&pattern)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        (rows, total)
    } else {
        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "User""#)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

        let rows = sqlx::query_as::<_, UserListRow>(
            r#"
            SELECT u.id, u.phone, u.nickname, u.avatar, u.weight, u.height, u."createdAt",
                   COALESCE(rc.cnt, 0) AS "runCount"
            FROM "User" u
            LEFT JOIN (
                SELECT "userId", COUNT(*) AS cnt FROM "Run" GROUP BY "userId"
            ) rc ON rc."userId" = u.id
            ORDER BY u."createdAt" DESC
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

    let data: Vec<Value> = users
        .iter()
        .map(|u| {
            json!({
                "id": u.id,
                "phone": u.phone,
                "nickname": u.nickname,
                "avatar": u.avatar,
                "weight": u.weight,
                "height": u.height,
                "createdAt": u.created_at.to_rfc3339(),
                "runCount": u.run_count
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

async fn detail(
    _admin: AuthAdmin,
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<Value> {
    // Fetch user
    let user = sqlx::query_as::<_, UserDetailRow>(
        r#"
        SELECT id, phone, nickname, avatar, weight, height, theme, "createdAt", "updatedAt"
        FROM "User"
        WHERE id = $1
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await;

    let user = match user {
        Ok(Some(u)) => u,
        Ok(None) => {
            return Json(json!({
                "success": false,
                "error": "用户不存在"
            }));
        }
        Err(e) => {
            tracing::error!("user detail error: {}", e);
            return Json(json!({ "success": false, "error": "服务器错误" }));
        }
    };

    // Fetch related data concurrently
    let runs_fut = sqlx::query_as::<_, UserRunRow>(
        r#"
        SELECT id, distance, duration, "avgPace", source, calories, feeling,
               note, weather, "startedAt", "endedAt", "createdAt"
        FROM "Run"
        WHERE "userId" = $1
        ORDER BY "startedAt" DESC
        "#,
    )
    .fetch_all(&state.pool);

    let goals_fut = sqlx::query_as::<_, UserGoalRow>(
        r#"
        SELECT id, title, type, "targetValue", unit, period,
               "startDate", "endDate", "isActive", "createdAt"
        FROM "Goal"
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        "#,
    )
    .fetch_all(&state.pool);

    let achievements_fut = sqlx::query_as::<_, UserAchievementRow>(
        r#"
        SELECT id, "achievementKey", "unlockedAt", "unlockedByRun"
        FROM "UserAchievement"
        WHERE "userId" = $1
        ORDER BY "unlockedAt" DESC
        "#,
    )
    .fetch_all(&state.pool);

    let challenges_fut = sqlx::query_as::<_, UserChallengeRow>(
        r#"
        SELECT id, title, type, "targetValue", unit, status,
               "startDate", "endDate", progress, "completedAt", "createdAt"
        FROM "Challenge"
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        "#,
    )
    .fetch_all(&state.pool);

    let (runs, goals, achievements, challenges) =
        tokio::try_join!(runs_fut, goals_fut, achievements_fut, challenges_fut)
            .unwrap_or_default();

    Json(json!({
        "success": true,
        "data": {
            "user": {
                "id": user.id,
                "phone": user.phone,
                "nickname": user.nickname,
                "avatar": user.avatar,
                "weight": user.weight,
                "height": user.height,
                "theme": user.theme,
                "createdAt": user.created_at.to_rfc3339(),
                "updatedAt": user.updated_at.to_rfc3339()
            },
            "runs": runs.iter().map(|r| json!({
                "id": r.id,
                "distance": r.distance,
                "duration": r.duration,
                "avgPace": r.avg_pace,
                "source": r.source,
                "calories": r.calories,
                "feeling": r.feeling,
                "note": r.note,
                "weather": r.weather,
                "startedAt": r.started_at.to_rfc3339(),
                "endedAt": r.ended_at.map(|t| t.to_rfc3339()),
                "createdAt": r.created_at.to_rfc3339()
            })).collect::<Vec<_>>(),
            "goals": goals.iter().map(|g| json!({
                "id": g.id,
                "title": g.title,
                "type": g.goal_type,
                "targetValue": g.target_value,
                "unit": g.unit,
                "period": g.period,
                "startDate": g.start_date.to_string(),
                "endDate": g.end_date.map(|t| t.to_string()),
                "isActive": g.is_active,
                "createdAt": g.created_at.to_rfc3339()
            })).collect::<Vec<_>>(),
            "achievements": achievements.iter().map(|a| json!({
                "id": a.id,
                "achievementKey": a.achievement_key,
                "unlockedAt": a.unlocked_at.to_rfc3339(),
                "unlockedByRun": a.unlocked_by_run
            })).collect::<Vec<_>>(),
            "challenges": challenges.iter().map(|c| json!({
                "id": c.id,
                "title": c.title,
                "type": c.challenge_type,
                "targetValue": c.target_value,
                "unit": c.unit,
                "status": c.status,
                "startDate": c.start_date.to_string(),
                "endDate": c.end_date.to_string(),
                "progress": c.progress,
                "completedAt": c.completed_at.map(|t| t.to_rfc3339()),
                "createdAt": c.created_at.to_rfc3339()
            })).collect::<Vec<_>>()
        }
    }))
}

async fn update(
    _admin: AuthAdmin,
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateUserRequest>,
) -> Json<Value> {
    let result = sqlx::query_as::<_, UserDetailRow>(
        r#"
        UPDATE "User" SET
            nickname  = COALESCE($2, nickname),
            weight    = COALESCE($3, weight),
            height    = COALESCE($4, height),
            "updatedAt" = NOW()
        WHERE id = $1
        RETURNING id, phone, nickname, avatar, weight, height, theme, "createdAt", "updatedAt"
        "#,
    )
    .bind(&id)
    .bind(body.nickname)
    .bind(body.weight)
    .bind(body.height)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(user)) => Json(json!({
            "success": true,
            "data": {
                "id": user.id,
                "phone": user.phone,
                "nickname": user.nickname,
                "avatar": user.avatar,
                "weight": user.weight,
                "height": user.height,
                "theme": user.theme,
                "createdAt": user.created_at.to_rfc3339(),
                "updatedAt": user.updated_at.to_rfc3339()
            }
        })),
        Ok(None) => Json(json!({
            "success": false,
            "error": "用户不存在"
        })),
        Err(e) => {
            tracing::error!("update user error: {}", e);
            Json(json!({ "success": false, "error": "更新失败" }))
        }
    }
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list))
        .route("/{id}", get(detail).put(update))
}
