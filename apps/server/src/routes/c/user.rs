use axum::{
    extract::State,
    routing::put,
    Json, Router,
};
use chrono::Utc;
use regex::Regex;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};
use crate::models::user::{ProfileUpdateRequest, ThemeUpdateRequest, User, UserPublic};

/// Shared SELECT columns for User queries.
const USER_COLS: &str = r#"id, username, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt""#;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/profile", put(update_profile))
        .route("/theme", put(update_theme))
}

// ---------------------------------------------------------------------------
// PUT /profile — update username, nickname, avatar, weight, height
// ---------------------------------------------------------------------------

async fn update_profile(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<ProfileUpdateRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Fetch current user to merge fields
    let existing = sqlx::query_as::<_, User>(
        sqlx::AssertSqlSafe(format!(r#"SELECT {} FROM "User" WHERE id = $1"#, USER_COLS)),
    )
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Validate nickname if provided
    if let Some(ref nick) = body.nickname {
        if nick.trim().is_empty() {
            return Err(AppError::BadRequest("昵称不能为空".into()));
        }
    }

    // Validate username if provided
    let username = if let Some(ref u) = body.username {
        let u = u.trim().to_lowercase();
        if u.is_empty() {
            return Err(AppError::BadRequest("用户名不能为空".into()));
        }
        let username_re = Regex::new(r"^[a-zA-Z0-9_.]{4,16}$").unwrap();
        if !username_re.is_match(&u) {
            return Err(AppError::BadRequest(
                "用户名只能由字母、数字、下划线和.组成，长度 4-16 位".into(),
            ));
        }
        // Check uniqueness (only if changed)
        if u != existing.username {
            let dup: Option<String> =
                sqlx::query_scalar(r#"SELECT id FROM "User" WHERE username = $1 AND id != $2"#)
                    .bind(&u)
                    .bind(&auth.user_id)
                    .fetch_optional(&state.pool)
                    .await?;
            if dup.is_some() {
                return Err(AppError::Conflict("用户名已被使用".into()));
            }
        }
        u
    } else {
        existing.username.clone()
    };

    let nickname = body.nickname.as_deref().unwrap_or(&existing.nickname);
    let avatar = body.avatar.as_deref().or(existing.avatar.as_deref());
    let weight = body.weight.or(existing.weight);
    let height = body.height.or(existing.height);
    let now = Utc::now().naive_utc();

    let user = sqlx::query_as::<_, User>(
        sqlx::AssertSqlSafe(format!(
            r#"UPDATE "User"
            SET username = $2, nickname = $3, avatar = $4, weight = $5, height = $6, "updatedAt" = $7
            WHERE id = $1
            RETURNING {}"#,
            USER_COLS
        )),
    )
    .bind(&auth.user_id)
    .bind(&username)
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
        sqlx::AssertSqlSafe(format!(
            r#"UPDATE "User"
            SET theme = $2, "updatedAt" = $3
            WHERE id = $1
            RETURNING {}"#,
            USER_COLS
        )),
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
