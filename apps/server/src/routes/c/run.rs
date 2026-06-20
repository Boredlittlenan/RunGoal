use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Serialize;
use serde_json::json;
use sqlx::AssertSqlSafe;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};
use crate::models::run::{CreateRunRequest, Run, RunListQuery};

// Shared SELECT columns (including archivedAt)
const RUN_COLUMNS: &str = r#"id, "userId", distance, duration, "avgPace", source, "trackPoints",
    calories, feeling, note, weather, "startedAt", "endedAt", "createdAt", "updatedAt", "archivedAt""#;

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/// Summary of a challenge whose progress was updated by a new run.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChallengeUpdateInfo {
    id: String,
    title: String,
    progress: f64,
    target_value: f64,
    completed: bool,
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_runs).post(create_run))
        .route("/{id}", get(get_run).put(update_run).delete(delete_run))
        .route("/{id}/archive", post(archive_run))
        .route("/{id}/restore", post(restore_run))
        .route("/cleanup", post(cleanup_archived))
}

// ---------------------------------------------------------------------------
// GET / — paginated run list
// ---------------------------------------------------------------------------

async fn list_runs(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<RunListQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    // archived=true → show only archived; archived=false/None → show only active
    let show_archived = query.archived.unwrap_or(false);

    let total: i64 = if show_archived {
        sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "Run" WHERE "userId" = $1 AND "archivedAt" IS NOT NULL"#,
        )
        .bind(&auth.user_id)
        .fetch_one(&state.pool)
        .await?
    } else {
        sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM "Run" WHERE "userId" = $1 AND "archivedAt" IS NULL"#,
        )
        .bind(&auth.user_id)
        .fetch_one(&state.pool)
        .await?
    };

    let runs = if show_archived {
        sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
            r#"SELECT {} FROM "Run"
               WHERE "userId" = $1 AND "archivedAt" IS NOT NULL
               ORDER BY "archivedAt" DESC LIMIT $2 OFFSET $3"#,
            RUN_COLUMNS
        )))
    } else {
        sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
            r#"SELECT {} FROM "Run"
               WHERE "userId" = $1 AND "archivedAt" IS NULL
               ORDER BY "startedAt" DESC LIMIT $2 OFFSET $3"#,
            RUN_COLUMNS
        )))
    }
    .bind(&auth.user_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    // Count archived (for badge display)
    let archived_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Run" WHERE "userId" = $1 AND "archivedAt" IS NOT NULL"#,
    )
    .bind(&auth.user_id)
    .fetch_one(&state.pool)
    .await?;

    let total_pages = if total == 0 { 0 } else { (total + page_size - 1) / page_size };

    Ok(Json(json!({
        "success": true,
        "data": runs,
        "meta": {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages,
            "archivedCount": archived_count,
        },
    })))
}

// ---------------------------------------------------------------------------
// POST / — create run + achievement pipeline
// ---------------------------------------------------------------------------

async fn create_run(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateRunRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if body.distance <= 0.0 {
        return Err(AppError::BadRequest("Distance must be positive".into()));
    }
    if body.duration <= 0 {
        return Err(AppError::BadRequest("Duration must be positive".into()));
    }

    let avg_pace = if body.distance > 0.0 {
        Some((body.duration as f64) / 60.0 / body.distance)
    } else {
        None
    };

    let source = body.source.as_deref().unwrap_or("manual");
    let run_id = ulid::Ulid::new().to_string();
    let now = Utc::now().naive_utc();

    let run = sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
        r#"
        INSERT INTO "Run" (id, "userId", distance, duration, "avgPace", source, "trackPoints",
                           calories, feeling, note, weather, "startedAt", "endedAt", "createdAt", "updatedAt", "archivedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, NULL)
        RETURNING {}
        "#,
        RUN_COLUMNS
    )))
    .bind(&run_id)
    .bind(&auth.user_id)
    .bind(body.distance)
    .bind(body.duration)
    .bind(avg_pace)
    .bind(source)
    .bind(&body.track_points)
    .bind(body.calories)
    .bind(body.feeling)
    .bind(&body.note)
    .bind(&body.weather)
    .bind(body.started_at)
    .bind(body.ended_at)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    // 3. Compute updated user stats (exclude archived)
    let user_stats =
        crate::services::stats::compute_user_stats(&state.pool, &auth.user_id).await?;

    // 4. Get already unlocked achievement keys
    let existing_keys: Vec<String> = sqlx::query_scalar(
        r#"SELECT "achievementKey" FROM "UserAchievement" WHERE "userId" = $1"#,
    )
    .bind(&auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    // 5. Check achievements
    let newly_unlocked =
        crate::services::achievement::check_achievements(&user_stats, &existing_keys);

    // 6. Insert newly unlocked achievements
    let mut new_achievements: Vec<serde_json::Value> = Vec::new();

    for def in &newly_unlocked {
        let ua_id = ulid::Ulid::new().to_string();

        sqlx::query(
            r#"
            INSERT INTO "UserAchievement" (id, "userId", "achievementKey", "unlockedAt", "unlockedByRun")
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT ON CONSTRAINT "UserAchievement_userId_achievementKey_key" DO NOTHING
            "#,
        )
        .bind(&ua_id)
        .bind(&auth.user_id)
        .bind(def.key)
        .bind(now)
        .bind(&run.id)
        .execute(&state.pool)
        .await?;

        new_achievements.push(json!({
            "key": def.key,
            "name": def.name,
            "description": def.description,
            "rarity": def.rarity,
            "unlockedAt": now.to_string(),
        }));
    }

    // 7. Update active challenge progress
    let active_challenges: Vec<(String, String, String, f64, f64)> = sqlx::query_as(
        r#"SELECT id, title, "type", progress, "targetValue"
           FROM "Challenge"
           WHERE "userId" = $1 AND status = 'active'"#,
    )
    .bind(&auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    let mut challenge_updates: Vec<ChallengeUpdateInfo> = Vec::new();

    for (cid, title, ctype, current_progress, target) in &active_challenges {
        let new_progress = match ctype.as_str() {
            "cumulative" => (current_progress + run.distance).min(*target),
            "single_breakthrough" => current_progress.max(run.distance).min(*target),
            _ => *current_progress,
        };
        let completed = new_progress >= *target;

        let completed_at_value: Option<chrono::NaiveDateTime> = if completed { Some(now) } else { None };

        sqlx::query(
            r#"
            UPDATE "Challenge"
            SET progress = $2,
                status = CASE WHEN $3 THEN 'completed' ELSE status END,
                "completedAt" = $4,
                "updatedAt" = $5
            WHERE id = $1
            "#,
        )
        .bind(cid)
        .bind(new_progress)
        .bind(completed)
        .bind(completed_at_value)
        .bind(now)
        .execute(&state.pool)
        .await?;

        challenge_updates.push(ChallengeUpdateInfo {
            id: cid.clone(),
            title: title.clone(),
            progress: new_progress,
            target_value: *target,
            completed,
        });
    }

    // 8. Update active goal progress (insert GoalRecord for matching goals)
    let active_goals: Vec<(String, String, String)> = sqlx::query_as(
        r#"SELECT id, type, unit FROM "Goal"
           WHERE "userId" = $1 AND "isActive" = true"#,
    )
    .bind(&auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    for (goal_id, goal_type, unit) in &active_goals {
        let value: Option<f64> = match (goal_type.as_str(), unit.as_str()) {
            ("cumulative", "km") => Some(run.distance),
            ("cumulative", "min") => Some(run.duration as f64 / 60.0),
            ("frequency", _) => Some(1.0),
            ("distance", "km") => Some(run.distance),
            ("pace", _) if run.avg_pace.is_some() => run.avg_pace,
            ("run_count", _) => Some(1.0),
            ("duration", "min") => Some(run.duration as f64 / 60.0),
            _ => None,
        };
        if let Some(v) = value {
            let gr_id = ulid::Ulid::new().to_string();
            sqlx::query(
                r#"INSERT INTO "GoalRecord" (id, "goalId", "runId", value, "createdAt")
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT ON CONSTRAINT "GoalRecord_goalId_runId_key" DO NOTHING"#,
            )
            .bind(&gr_id)
            .bind(goal_id)
            .bind(&run.id)
            .bind(v)
            .bind(now)
            .execute(&state.pool)
            .await?;
        }
    }

    Ok(Json(json!({
        "success": true,
        "data": {
            "run": run,
            "newAchievements": new_achievements,
            "challengeUpdates": challenge_updates,
        },
    })))
}

// ---------------------------------------------------------------------------
// GET /:id — single run
// ---------------------------------------------------------------------------

async fn get_run(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let run = sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
        r#"SELECT {} FROM "Run" WHERE id = $1 AND "userId" = $2"#,
        RUN_COLUMNS
    )))
    .bind(&id)
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Run not found".into()))?;

    Ok(Json(json!({
        "success": true,
        "data": run,
    })))
}

// ---------------------------------------------------------------------------
// PUT /:id — update run
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateRunRequest {
    distance: Option<f64>,
    duration: Option<i32>,
    feeling: Option<i32>,
    note: Option<String>,
    weather: Option<String>,
    started_at: Option<chrono::NaiveDateTime>,
    ended_at: Option<chrono::NaiveDateTime>,
    track_points: Option<serde_json::Value>,
    calories: Option<f64>,
    source: Option<String>,
}

async fn update_run(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateRunRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let existing = sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
        r#"SELECT {} FROM "Run" WHERE id = $1 AND "userId" = $2"#,
        RUN_COLUMNS
    )))
    .bind(&id)
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Run not found".into()))?;

    let distance = body.distance.unwrap_or(existing.distance);
    let duration = body.duration.unwrap_or(existing.duration);
    let feeling = body.feeling.or(existing.feeling);
    let note = body.note.or(existing.note);
    let weather = body.weather.or(existing.weather);
    let started_at = body.started_at.unwrap_or(existing.started_at);
    let ended_at = body.ended_at.or(existing.ended_at);
    let track_points = body.track_points.or(existing.track_points);
    let calories = body.calories.or(existing.calories);
    let source = body.source.unwrap_or(existing.source);

    let avg_pace = if distance > 0.0 {
        Some((duration as f64) / 60.0 / distance)
    } else {
        None
    };

    let now = Utc::now().naive_utc();

    let run = sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
        r#"
        UPDATE "Run"
        SET distance = $3, duration = $4, "avgPace" = $5, source = $6, "trackPoints" = $7,
            calories = $8, feeling = $9, note = $10, weather = $11,
            "startedAt" = $12, "endedAt" = $13, "updatedAt" = $14
        WHERE id = $1 AND "userId" = $2
        RETURNING {}
        "#,
        RUN_COLUMNS
    )))
    .bind(&id)
    .bind(&auth.user_id)
    .bind(distance)
    .bind(duration)
    .bind(avg_pace)
    .bind(&source)
    .bind(&track_points)
    .bind(calories)
    .bind(feeling)
    .bind(&note)
    .bind(&weather)
    .bind(started_at)
    .bind(ended_at)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({
        "success": true,
        "data": run,
    })))
}

// ---------------------------------------------------------------------------
// DELETE /:id — permanently delete run
// ---------------------------------------------------------------------------

async fn delete_run(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Clean up related records first
    sqlx::query(r#"DELETE FROM "GoalRecord" WHERE "runId" = $1"#)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    let result = sqlx::query(r#"DELETE FROM "Run" WHERE id = $1 AND "userId" = $2"#)
        .bind(&id)
        .bind(&auth.user_id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Run not found".into()));
    }

    Ok(Json(json!({
        "success": true,
        "data": null,
    })))
}

// ---------------------------------------------------------------------------
// POST /:id/archive — soft-delete (archive) a run
// ---------------------------------------------------------------------------

async fn archive_run(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"UPDATE "Run" SET "archivedAt" = $3, "updatedAt" = $3
           WHERE id = $1 AND "userId" = $2 AND "archivedAt" IS NULL"#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .bind(now)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Run not found or already archived".into()));
    }

    // Remove related GoalRecords so archived runs don't count toward goals
    sqlx::query(r#"DELETE FROM "GoalRecord" WHERE "runId" = $1"#)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": null,
    })))
}

// ---------------------------------------------------------------------------
// POST /:id/restore — restore an archived run
// ---------------------------------------------------------------------------

async fn restore_run(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = Utc::now().naive_utc();

    let run = sqlx::query_as::<_, Run>(AssertSqlSafe(format!(
        r#"
        UPDATE "Run" SET "archivedAt" = NULL, "updatedAt" = $3
        WHERE id = $1 AND "userId" = $2 AND "archivedAt" IS NOT NULL
        RETURNING {}
        "#,
        RUN_COLUMNS
    )))
    .bind(&id)
    .bind(&auth.user_id)
    .bind(now)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Run not found or not archived".into()))?;

    // Re-create GoalRecord for active goals
    let active_goals: Vec<(String, String, String)> = sqlx::query_as(
        r#"SELECT id, type, unit FROM "Goal"
           WHERE "userId" = $1 AND "isActive" = true"#,
    )
    .bind(&auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    for (goal_id, goal_type, unit) in &active_goals {
        let value: Option<f64> = match (goal_type.as_str(), unit.as_str()) {
            ("cumulative", "km") => Some(run.distance),
            ("cumulative", "min") => Some(run.duration as f64 / 60.0),
            ("frequency", _) => Some(1.0),
            ("distance", "km") => Some(run.distance),
            ("pace", _) if run.avg_pace.is_some() => run.avg_pace,
            ("run_count", _) => Some(1.0),
            ("duration", "min") => Some(run.duration as f64 / 60.0),
            _ => None,
        };
        if let Some(v) = value {
            let gr_id = ulid::Ulid::new().to_string();
            sqlx::query(
                r#"INSERT INTO "GoalRecord" (id, "goalId", "runId", value, "createdAt")
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT ON CONSTRAINT "GoalRecord_goalId_runId_key" DO NOTHING"#,
            )
            .bind(&gr_id)
            .bind(goal_id)
            .bind(&run.id)
            .bind(v)
            .bind(now)
            .execute(&state.pool)
            .await?;
        }
    }

    Ok(Json(json!({
        "success": true,
        "data": run,
    })))
}

// ---------------------------------------------------------------------------
// POST /cleanup — permanently delete archived runs older than 30 days
// ---------------------------------------------------------------------------

async fn cleanup_archived(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let cutoff = Utc::now().naive_utc() - chrono::Duration::days(30);

    // Get IDs of runs to clean up
    let run_ids: Vec<String> = sqlx::query_scalar(
        r#"SELECT id FROM "Run"
           WHERE "userId" = $1 AND "archivedAt" IS NOT NULL AND "archivedAt" < $2"#,
    )
    .bind(&auth.user_id)
    .bind(cutoff)
    .fetch_all(&state.pool)
    .await?;

    if !run_ids.is_empty() {
        // Clean up GoalRecords
        sqlx::query(r#"DELETE FROM "GoalRecord" WHERE "runId" = ANY($1)"#)
            .bind(&run_ids)
            .execute(&state.pool)
            .await?;

        // Delete the runs
        sqlx::query(r#"DELETE FROM "Run" WHERE id = ANY($1)"#)
            .bind(&run_ids)
            .execute(&state.pool)
            .await?;
    }

    Ok(Json(json!({
        "success": true,
        "data": {
            "deleted": run_ids.len(),
        },
    })))
}
