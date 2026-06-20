use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::Deserialize;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser, UserClaims};
use crate::models::user::{LoginRequest, RegisterRequest, User, UserPublic};

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RefreshRequest {
    refresh_token: String,
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/// Generate an access token (7-day expiry) signed with `JWT_SECRET`.
fn generate_access_token(user_id: &str, secret: &str) -> Result<String, AppError> {
    let now = Utc::now().timestamp() as usize;
    let claims = UserClaims {
        user_id: user_id.to_string(),
        exp: now + 7 * 24 * 60 * 60,
        iat: now,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to generate access token: {}", e)))
}

/// Generate a refresh token (30-day expiry) signed with `JWT_REFRESH_SECRET`.
fn generate_refresh_token(user_id: &str, secret: &str) -> Result<String, AppError> {
    let now = Utc::now().timestamp() as usize;
    let claims = UserClaims {
        user_id: user_id.to_string(),
        exp: now + 30 * 24 * 60 * 60,
        iat: now,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to generate refresh token: {}", e)))
}

/// Convenience wrapper that produces both tokens at once.
fn generate_token_pair(user_id: &str, config: &crate::config::Config) -> Result<(String, String), AppError> {
    let token = generate_access_token(user_id, &config.jwt_secret)?;
    let refresh_token = generate_refresh_token(user_id, &config.jwt_refresh_secret)?;
    Ok((token, refresh_token))
}

/// Build the standard auth response JSON payload.
fn auth_response(user: &UserPublic, token: &str, refresh_token: &str) -> serde_json::Value {
    json!({
        "user": user,
        "token": token,
        "refreshToken": refresh_token,
    })
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/me", get(me))
}

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------

async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Validate input
    if body.phone.trim().is_empty() {
        return Err(AppError::BadRequest("Phone number is required".into()));
    }
    if body.password.len() < 6 {
        return Err(AppError::BadRequest(
            "Password must be at least 6 characters".into(),
        ));
    }
    if body.nickname.trim().is_empty() {
        return Err(AppError::BadRequest("Nickname is required".into()));
    }

    // Check phone uniqueness
    let existing: Option<String> =
        sqlx::query_scalar(r#"SELECT id FROM "User" WHERE phone = $1"#)
            .bind(&body.phone)
            .fetch_optional(&state.pool)
            .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Phone number already registered".into()));
    }

    // Hash password
    let password_hash = bcrypt::hash(body.password.as_bytes(), 10)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?;

    let id = ulid::Ulid::new().to_string();
    let now = Utc::now().naive_utc();

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO "User" (id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NULL, NULL, NULL, $4, 'system', $5, $5)
        RETURNING id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
        "#,
    )
    .bind(&id)
    .bind(&body.phone)
    .bind(&body.nickname)
    .bind(&password_hash)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    let user_public = UserPublic::from(&user);
    let (token, refresh_token) = generate_token_pair(&user.id, &state.config)?;

    Ok(Json(json!({
        "success": true,
        "data": auth_response(&user_public, &token, &refresh_token),
    })))
}

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Look up user by phone
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
           FROM "User" WHERE phone = $1"#,
    )
    .bind(&body.phone)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid phone or password".into()))?;

    // Verify password
    let valid = bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false);

    if !valid {
        return Err(AppError::Unauthorized("Invalid phone or password".into()));
    }

    let user_public = UserPublic::from(&user);
    let (token, refresh_token) = generate_token_pair(&user.id, &state.config)?;

    Ok(Json(json!({
        "success": true,
        "data": auth_response(&user_public, &token, &refresh_token),
    })))
}

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Decode the refresh token using the refresh secret
    let validation = Validation::default();
    let key = DecodingKey::from_secret(state.config.jwt_refresh_secret.as_bytes());

    let token_data = decode::<UserClaims>(&body.refresh_token, &key, &validation).map_err(|e| {
        AppError::Unauthorized(format!("Invalid or expired refresh token: {}", e))
    })?;

    let user_id = &token_data.claims.user_id;

    // Verify the user still exists
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
           FROM "User" WHERE id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("User no longer exists".into()))?;

    // Issue new token pair
    let (token, refresh_token) = generate_token_pair(&user.id, &state.config)?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "token": token,
            "refreshToken": refresh_token,
        },
    })))
}

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt"
           FROM "User" WHERE id = $1"#,
    )
    .bind(&auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    let user_public = UserPublic::from(&user);

    Ok(Json(json!({
        "success": true,
        "data": user_public,
    })))
}
