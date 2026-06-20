use axum::{
    extract::State,
    routing::put,
    Json, Router,
};
use chrono::Utc;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};
use crate::models::user::{ProfileUpdateRequest, ThemeUpdateRequest, User, UserPublic};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/profile", put(update_profile))
        .route("/theme", put(update_theme))
}

// ---------------------------------------------------------------------------
// PUT /profile — update nickname, avatar, weight, height
// ---------------------------------------------------------------------------

async fn update_profile(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<ProfileUpdateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Fetch current user to merge fields
    let existing = sqlx::query_as::<_, User>(
        r#"SELECT id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
           FROM "User" WHERE id = $1"#,
    )
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Validate theme values if provided
    if let Some(ref nick) = body.nickname {
        if nick.trim().is_empty() {
            return Err(AppError::BadRequest("Nickname cannot be empty".into()));
        }
    }

    let nickname = body.nickname.as_deref().unwrap_or(&existing.nickname);
    let avatar = body.avatar.as_deref().or(existing.avatar.as_deref());
    let weight = body.weight.or(existing.weight);
    let height = body.height.or(existing.height);
    let now = Utc::now().naive_utc();

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE "User"
        SET nickname = $2, avatar = $3, weight = $4, height = $5, "updatedAt" = $6
        WHERE id = $1
        RETURNING id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
        "#,
    )
    .bind(&auth.user_id)
    .bind(nickname)
    .bind(avatar)
    .bind(weight)
    .bind(height)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    let user_public = UserPublic::from(&user);

    Ok(Json(json!({
        "success": true,
        "data": user_public,
    })))
}

// ---------------------------------------------------------------------------
// PUT /theme — update theme (light/dark/system)
// ---------------------------------------------------------------------------

async fn update_theme(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<ThemeUpdateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let valid_themes = ["light", "dark", "system"];
    if !valid_themes.contains(&body.theme.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Invalid theme '{}'. Must be one of: light, dark, system",
            body.theme
        )));
    }

    let now = Utc::now().naive_utc();

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE "User"
        SET theme = $2, "updatedAt" = $3
        WHERE id = $1
        RETURNING id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
        "#,
    )
    .bind(&auth.user_id)
    .bind(&body.theme)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    let user_public = UserPublic::from(&user);

    Ok(Json(json!({
        "success": true,
        "data": user_public,
    })))
}
