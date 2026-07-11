use axum::{extract::State, routing::get, Json, Router};
use serde_json::{json, Value};

use crate::middleware::auth::{AppState, AuthAdmin};
use crate::services::achievement::{AchievementDef, ACHIEVEMENTS};

// ─── SQL row types ───────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct UnlockCountRow {
    #[sqlx(rename = "achievementKey")]
    achievement_key: String,
    cnt: i64,
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async fn list(_admin: AuthAdmin, State(state): State<AppState>) -> Json<Value> {
    let total_users: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "User""#)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(1);

    let unlock_counts = sqlx::query_as::<_, UnlockCountRow>(
        r#"
        SELECT "achievementKey" AS "achievementKey", COUNT(*) AS cnt
        FROM "UserAchievement"
        GROUP BY "achievementKey"
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    // Build a lookup map
    let count_map: std::collections::HashMap<String, i64> = unlock_counts
        .iter()
        .map(|r| (r.achievement_key.clone(), r.cnt))
        .collect();

    let data: Vec<Value> = ACHIEVEMENTS
        .iter()
        .map(|a: &AchievementDef| {
            let unlocked = count_map.get(a.key).copied().unwrap_or(0);
            let rate = if total_users > 0 {
                (unlocked as f64 / total_users as f64 * 10000.0).round() / 100.0
            } else {
                0.0
            };
            json!({
                "key": a.key,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "category": a.category,
                "rarity": a.rarity,
                "unlockedCount": unlocked,
                "unlockRate": rate
            })
        })
        .collect();

    Json(json!({
        "success": true,
        "data": data,
        "meta": {
            "totalAchievements": ACHIEVEMENTS.len(),
            "totalUsers": total_users
        }
    }))
}

async fn summary_stats(_admin: AuthAdmin, State(state): State<AppState>) -> Json<Value> {
    let total_achievements = ACHIEVEMENTS.len() as i64;

    let total_unlock_records: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "UserAchievement""#)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let users_with_achievements: i64 =
        sqlx::query_scalar(r#"SELECT COUNT(DISTINCT "userId") FROM "UserAchievement""#)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let max_unlocked_per_user: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT MAX(cnt) FROM (
            SELECT COUNT(*) AS cnt FROM "UserAchievement" GROUP BY "userId"
        ) sub
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(None);

    Json(json!({
        "success": true,
        "data": {
            "totalAchievements": total_achievements,
            "totalUnlockRecords": total_unlock_records,
            "usersWithAchievements": users_with_achievements,
            "maxUnlockedPerUser": max_unlocked_per_user.unwrap_or(0)
        }
    }))
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list))
        .route("/stats", get(summary_stats))
}
