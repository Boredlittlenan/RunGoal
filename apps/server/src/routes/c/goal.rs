use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};
use crate::models::goal::{CreateGoalRequest, Goal, GoalListQuery, GoalRecord, GoalWithProgress};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_goals).post(create_goal))
        .route("/{id}", get(get_goal).put(update_goal).delete(delete_goal))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Fetch all goal records for a single goal.
async fn fetch_goal_records(pool: &sqlx::PgPool, goal_id: &str) -> Result<Vec<GoalRecord>, AppError> {
    let records = sqlx::query_as::<_, GoalRecord>(
        r#"
        SELECT id, "goalId", "runId", value, "createdAt"
        FROM "GoalRecord"
        WHERE "goalId" = $1
        ORDER BY "createdAt" DESC
        "#,
    )
    .bind(goal_id)
    .fetch_all(pool)
    .await?;
    Ok(records)
}

/// Compute current_value and progress percentage for a goal.
fn compute_progress(goal: &Goal, records: &[GoalRecord]) -> (f64, f64) {
    let current_value: f64 = records.iter().map(|r| r.value).sum();
    let progress_pct = if goal.target_value > 0.0 {
        ((current_value / goal.target_value) * 100.0).min(100.0)
    } else {
        0.0
    };
    (current_value, progress_pct)
}

// ---------------------------------------------------------------------------
// GET / — list goals with progress
// ---------------------------------------------------------------------------

async fn list_goals(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<GoalListQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Build base query
    let goals = if let Some(ref is_active) = query.is_active {
        if let Some(ref goal_type) = query.goal_type {
            sqlx::query_as::<_, Goal>(
                r#"
                SELECT id, "userId", title, "type", "targetValue", unit, period,
                       "startDate", "endDate", "isActive", "createdAt", "updatedAt"
                FROM "Goal"
                WHERE "userId" = $1 AND "isActive" = $2 AND "type" = $3
                ORDER BY "createdAt" DESC
                "#,
            )
            .bind(&auth.user_id)
            .bind(*is_active)
            .bind(goal_type)
            .fetch_all(&state.pool)
            .await?
        } else {
            sqlx::query_as::<_, Goal>(
                r#"
                SELECT id, "userId", title, "type", "targetValue", unit, period,
                       "startDate", "endDate", "isActive", "createdAt", "updatedAt"
                FROM "Goal"
                WHERE "userId" = $1 AND "isActive" = $2
                ORDER BY "createdAt" DESC
                "#,
            )
            .bind(&auth.user_id)
            .bind(*is_active)
            .fetch_all(&state.pool)
            .await?
        }
    } else if let Some(ref goal_type) = query.goal_type {
        sqlx::query_as::<_, Goal>(
            r#"
            SELECT id, "userId", title, "type", "targetValue", unit, period,
                   "startDate", "endDate", "isActive", "createdAt", "updatedAt"
            FROM "Goal"
            WHERE "userId" = $1 AND "type" = $2
            ORDER BY "createdAt" DESC
            "#,
        )
        .bind(&auth.user_id)
        .bind(goal_type)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as::<_, Goal>(
            r#"
            SELECT id, "userId", title, "type", "targetValue", unit, period,
                   "startDate", "endDate", "isActive", "createdAt", "updatedAt"
            FROM "Goal"
            WHERE "userId" = $1
            ORDER BY "createdAt" DESC
            "#,
        )
        .bind(&auth.user_id)
        .fetch_all(&state.pool)
        .await?
    };

    // Enrich each goal with progress
    let mut result: Vec<serde_json::Value> = Vec::with_capacity(goals.len());
    for goal in &goals {
        let records = fetch_goal_records(&state.pool, &goal.id).await?;
        let (current_value, progress_pct) = compute_progress(goal, &records);

        result.push(json!({
            "goal": goal,
            "currentValue": current_value,
            "progressPct": progress_pct,
            "records": records,
        }));
    }

    Ok(Json(json!({
        "success": true,
        "data": result,
    })))
}

// ---------------------------------------------------------------------------
// POST / — create goal
// ---------------------------------------------------------------------------

async fn create_goal(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<CreateGoalRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if body.title.trim().is_empty() {
        return Err(AppError::BadRequest("Title is required".into()));
    }
    if body.target_value <= 0.0 {
        return Err(AppError::BadRequest("Target value must be positive".into()));
    }

    let id = ulid::Ulid::new().to_string();
    let now = Utc::now().naive_utc();

    let goal = sqlx::query_as::<_, Goal>(
        r#"
        INSERT INTO "Goal" (id, "userId", title, "type", "targetValue", unit, period,
                            "startDate", "endDate", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $10)
        RETURNING id, "userId", title, "type", "targetValue", unit, period,
                  "startDate", "endDate", "isActive", "createdAt", "updatedAt"
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .bind(&body.title)
    .bind(&body.goal_type)
    .bind(body.target_value)
    .bind(&body.unit)
    .bind(&body.period)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({
        "success": true,
        "data": goal,
    })))
}

// ---------------------------------------------------------------------------
// GET /:id — single goal with records
// ---------------------------------------------------------------------------

async fn get_goal(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let goal = sqlx::query_as::<_, Goal>(
        r#"
        SELECT id, "userId", title, "type", "targetValue", unit, period,
               "startDate", "endDate", "isActive", "createdAt", "updatedAt"
        FROM "Goal"
        WHERE id = $1 AND "userId" = $2
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Goal not found".into()))?;

    let records = fetch_goal_records(&state.pool, &goal.id).await?;
    let (current_value, progress_pct) = compute_progress(&goal, &records);

    let data = GoalWithProgress {
        goal,
        current_value,
        progress_pct,
        records,
    };

    Ok(Json(json!({
        "success": true,
        "data": data,
    })))
}

// ---------------------------------------------------------------------------
// PUT /:id — update goal
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateGoalRequest {
    title: Option<String>,
    #[serde(rename = "type")]
    goal_type: Option<String>,
    target_value: Option<f64>,
    unit: Option<String>,
    period: Option<String>,
    start_date: Option<NaiveDate>,
    end_date: Option<NaiveDate>,
    is_active: Option<bool>,
}

async fn update_goal(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateGoalRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Fetch existing goal (ownership check)
    let existing = sqlx::query_as::<_, Goal>(
        r#"
        SELECT id, "userId", title, "type", "targetValue", unit, period,
               "startDate", "endDate", "isActive", "createdAt", "updatedAt"
        FROM "Goal"
        WHERE id = $1 AND "userId" = $2
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Goal not found".into()))?;

    // Merge fields
    let title = body.title.as_deref().unwrap_or(&existing.title);
    let goal_type = body.goal_type.as_deref().unwrap_or(&existing.goal_type);
    let target_value = body.target_value.unwrap_or(existing.target_value);
    let unit = body.unit.as_deref().unwrap_or(&existing.unit);
    let period = body.period.as_deref().unwrap_or(&existing.period);
    let start_date = body.start_date.map(|d| d.and_hms_opt(0, 0, 0).unwrap()).unwrap_or(existing.start_date);
    let end_date = body.end_date.map(|d| d.and_hms_opt(0, 0, 0).unwrap()).or(existing.end_date);
    let is_active = body.is_active.unwrap_or(existing.is_active);
    let now = Utc::now().naive_utc();

    let goal = sqlx::query_as::<_, Goal>(
        r#"
        UPDATE "Goal"
        SET title = $3, "type" = $4, "targetValue" = $5, unit = $6, period = $7,
            "startDate" = $8, "endDate" = $9, "isActive" = $10, "updatedAt" = $11
        WHERE id = $1 AND "userId" = $2
        RETURNING id, "userId", title, "type", "targetValue", unit, period,
                  "startDate", "endDate", "isActive", "createdAt", "updatedAt"
        "#,
    )
    .bind(&id)
    .bind(&auth.user_id)
    .bind(title)
    .bind(goal_type)
    .bind(target_value)
    .bind(unit)
    .bind(period)
    .bind(start_date)
    .bind(end_date)
    .bind(is_active)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(json!({
        "success": true,
        "data": goal,
    })))
}

// ---------------------------------------------------------------------------
// DELETE /:id — delete goal
// ---------------------------------------------------------------------------

async fn delete_goal(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Delete associated records first
    sqlx::query(r#"DELETE FROM "GoalRecord" WHERE "goalId" IN (SELECT id FROM "Goal" WHERE id = $1 AND "userId" = $2)"#)
        .bind(&id)
        .bind(&auth.user_id)
        .execute(&state.pool)
        .await?;

    let result = sqlx::query(r#"DELETE FROM "Goal" WHERE id = $1 AND "userId" = $2"#)
        .bind(&id)
        .bind(&auth.user_id)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Goal not found".into()));
    }

    Ok(Json(json!({
        "success": true,
        "data": null,
    })))
}
