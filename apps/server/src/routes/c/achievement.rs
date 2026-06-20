use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};
use crate::services::achievement::ACHIEVEMENTS;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(achievement_wall))
        .route("/recent", get(recent_achievements))
        .route("/stats", get(achievement_stats))
}

// GET / — achievement wall
async fn achievement_wall(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let unlocked: Vec<(String, DateTime<Utc>)> = sqlx::query_as(
        r#"SELECT "achievementKey", "unlockedAt" FROM "UserAchievement" WHERE "userId" = $1"#,
    )
    .bind(&auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    let wall: Vec<serde_json::Value> = ACHIEVEMENTS
        .iter()
        .map(|def| {
            let record = unlocked.iter().find(|(key, _)| key == def.key);
            json!({
                "key": def.key,
                "name": def.name,
                "description": def.description,
                "icon": def.icon,
                "category": def.category,
                "rarity": def.rarity,
                "unlocked": record.is_some(),
                "unlockedAt": record.map(|(_, t)| t.to_rfc3339()),
            })
        })
        .collect();

    Ok(Json(json!({ "success": true, "data": wall })))
}

// GET /recent — last 10 unlocked
async fn recent_achievements(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let rows: Vec<(String, DateTime<Utc>, Option<String>)> = sqlx::query_as(
        r#"SELECT "achievementKey", "unlockedAt", "unlockedByRun"
           FROM "UserAchievement" WHERE "userId" = $1 ORDER BY "unlockedAt" DESC LIMIT 10"#,
    )
    .bind(&auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    let recent: Vec<serde_json::Value> = rows
        .into_iter()
        .filter_map(|(key, unlocked_at, unlocked_by_run)| {
            ACHIEVEMENTS.iter().find(|d| d.key == key).map(|def| {
                json!({
                    "key": def.key,
                    "name": def.name,
                    "description": def.description,
                    "icon": def.icon,
                    "rarity": def.rarity,
                    "unlockedAt": unlocked_at.to_rfc3339(),
                    "unlockedByRun": unlocked_by_run,
                })
            })
        })
        .collect();

    Ok(Json(json!({ "success": true, "data": recent })))
}

// GET /stats
async fn achievement_stats(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let unlocked: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "UserAchievement" WHERE "userId" = $1"#,
    )
    .bind(&auth.user_id)
    .fetch_one(&state.pool)
    .await?;

    let total = ACHIEVEMENTS.len() as i64;
    let rate = if total > 0 { (unlocked as f64 / total as f64 * 100.0).round() as i64 } else { 0 };

    Ok(Json(json!({ "success": true, "data": { "unlocked": unlocked, "total": total, "rate": rate } })))
}
