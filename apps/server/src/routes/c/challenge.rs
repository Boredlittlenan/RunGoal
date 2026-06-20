use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};
use crate::models::challenge::{Challenge, ChallengeListQuery, CreateChallengeRequest};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_challenges).post(create_challenge))
        .route("/{id}", get(get_challenge).delete(delete_challenge))
        .route("/{id}/abandon", post(abandon_challenge))
}

// ---------------------------------------------------------------------------
// GET / — list challenges (optional status filter)
// ---------------------------------------------------------------------------

async fn list_challenges(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ChallengeListQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let challenges = if let Some(ref status) = query.status {
        sqlx::query_as::<_, Challenge>(
            r#"
            SELECT id, "userId", title, "type", "targetValue", unit, status,
                   "startDate", "endDate", progress, "completedAt", "createdAt", "updatedAt"
            FROM "Challenge"
            WHERE "userId" = $1 AND status = $2
            ORDER BY "createdAt" DESC
            "#,
        )
        .bind(&auth.user_id)
        .bind(status)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as::<_, Challenge>(
            r#"
            SELECT id, "userId", title, "type", "targetValue", unit, status,
                   "startDate", "endDate", progress, "completedAt", "createdAt", "updatedAt"
            FROM "Challenge"
            WHERE "userId" = $1
            ORDER BY "createdAt" DESC
            "#,
        )
        .bind(&auth.user_id)
        .fetch_all(&state.pool)
        .await?
    };

    Ok(Json(json!({
        "success": true,
        "data": challenges,
    })))
}

// ---------------------------------------------------------------------------
// POST / — create challenge
// ---------------------------------------------------------------------------

async fn create_challenge(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateChallengeRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if body.title.trim().is_empty() {
        return Err(AppError::BadRequest("Title is required".into()));
    }
    if body.target_value <= 0.0 {
        return Err(AppError::BadRequest("Target value must be positive".into()));
    }
    if body.end_date < body.start_date {
        return Err(AppError::BadRequest(
            "End date must be after start date".into(),
        ));
    }

    let id = ulid::Ulid::new().to_string();
    let now = Utc::now().naive_utc();

    let challenge = sqlx::query_as::<_, Challenge>(
        r#"
        INSERT INTO "Challenge" (id, "userId", title, "type", "targetValue", unit, status,
                                 "startDate", "endDate", progress, "completedAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, 0.0, NULL, $9, $9)
        RETURNING id, "userId", title, "type", "targetValue", unit, status,
                  "startDate", "endDate", progress, "completedAt", "createdAt", "updatedAt"
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .bind(&body.title)
    .bind(&body.challenge_type)
    .bind(body.target_value)
    .bind(&body.unit)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({
        "success": true,
        "data": challenge,
    })))
}

// ---------------------------------------------------------------------------
// GET /:id — get challenge
// ---------------------------------------------------------------------------

async fn get_challenge(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let challenge = sqlx::query_as::<_, Challenge>(
        r#"
        SELECT id, "userId", title, "type", "targetValue", unit, status,
               "startDate", "endDate", progress, "completedAt", "createdAt", "updatedAt"
        FROM "Challenge"
        WHERE id = $1 AND "userId" = $2
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Challenge not found".into()))?;

    Ok(Json(json!({
        "success": true,
        "data": challenge,
    })))
}

// ---------------------------------------------------------------------------
// POST /:id/abandon — set status to "failed"
// ---------------------------------------------------------------------------

async fn abandon_challenge(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = Utc::now().naive_utc();

    let challenge = sqlx::query_as::<_, Challenge>(
        r#"
        UPDATE "Challenge"
        SET status = 'failed', "updatedAt" = $3
        WHERE id = $1 AND "userId" = $2
        RETURNING id, "userId", title, "type", "targetValue", unit, status,
                  "startDate", "endDate", progress, "completedAt", "createdAt", "updatedAt"
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .bind(now)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Challenge not found".into()))?;

    Ok(Json(json!({
        "success": true,
        "data": challenge,
    })))
}

// ---------------------------------------------------------------------------
// DELETE /:id — delete challenge
// ---------------------------------------------------------------------------

async fn delete_challenge(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result =
        sqlx::query(r#"DELETE FROM "Challenge" WHERE id = $1 AND "userId" = $2"#)
            .bind(&id)
            .bind(&auth.user_id)
            .execute(&state.pool)
            .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Challenge not found".into()));
    }

    Ok(Json(json!({
        "success": true,
        "data": null,
    })))
}
