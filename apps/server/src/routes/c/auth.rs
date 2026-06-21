use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use regex::Regex;
use serde::Deserialize;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser, UserClaims};
use crate::models::user::{LoginRequest, RegisterRequest, User, UserPublic};

/// Shared SELECT columns for User queries.
const USER_COLS: &str = r#"id, username, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt""#;

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

fn generate_token_pair(user_id: &str, config: &crate::config::Config) -> Result<(String, String), AppError> {
    let token = generate_access_token(user_id, &config.jwt_secret)?;
    let refresh_token = generate_refresh_token(user_id, &config.jwt_refresh_secret)?;
    Ok((token, refresh_token))
}

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
    // Validate username: non-empty, alphanumeric + underscore, 3-20 chars
    let username = body.username.trim().to_lowercase();
    if username.is_empty() {
        return Err(AppError::BadRequest("用户名不能为空".into()));
    }
    let username_re = Regex::new(r"^[a-zA-Z0-9_.]{4,16}$").unwrap();
    if !username_re.is_match(&username) {
        return Err(AppError::BadRequest(
            "用户名只能由字母、数字、下划线和.组成，长度 4-16 位".into(),
        ));
    }

    if body.password.len() < 6 {
        return Err(AppError::BadRequest(
            "密码至少 6 位".into(),
        ));
    }

    // Nickname defaults to username if not provided
    let nickname = body.nickname
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or(&username)
        .to_string();

    // Check username uniqueness
    let existing: Option<String> =
        sqlx::query_scalar(r#"SELECT id FROM "User" WHERE username = $1"#)
            .bind(&username)
            .fetch_optional(&state.pool)
            .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("用户名已被注册".into()));
    }

    // Hash password
    let password_hash = bcrypt::hash(body.password.as_bytes(), 10)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?;

    let id = ulid::Ulid::new().to_string();
    let now = Utc::now().naive_utc();

    let user = sqlx::query_as::<_, User>(
        sqlx::AssertSqlSafe(format!(
            r#"INSERT INTO "User" (id, username, phone, nickname, avatar, weight, height, "passwordHash", theme, "createdAt", "updatedAt")
            VALUES ($1, $2, '', $3, NULL, NULL, NULL, $4, 'system', $5, $5)
            RETURNING {}"#,
            USER_COLS
        )),
    )
    .bind(&id)
    .bind(&username)
    .bind(&nickname)
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
// POST /login — accepts username or phone
// ---------------------------------------------------------------------------

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let account = body.account.trim();
    if account.is_empty() {
        return Err(AppError::BadRequest("请输入用户名或手机号".into()));
    }

    // Look up user by username or phone
    let user = sqlx::query_as::<_, User>(
        sqlx::AssertSqlSafe(format!(
            r#"SELECT {} FROM "User" WHERE username = $1 OR phone = $1"#,
            USER_COLS
        )),
    )
    .bind(account)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("账号或密码错误".into()))?;

    // Verify password
    let valid = bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false);

    if !valid {
        return Err(AppError::Unauthorized("账号或密码错误".into()));
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
    let validation = Validation::default();
    let key = DecodingKey::from_secret(state.config.jwt_refresh_secret.as_bytes());

    let token_data = decode::<UserClaims>(&body.refresh_token, &key, &validation).map_err(|e| {
        AppError::Unauthorized(format!("Invalid or expired refresh token: {}", e))
    })?;

    let user_id = &token_data.claims.user_id;

    let user = sqlx::query_as::<_, User>(
        sqlx::AssertSqlSafe(format!(r#"SELECT {} FROM "User" WHERE id = $1"#, USER_COLS)),
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("User no longer exists".into()))?;

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
        sqlx::AssertSqlSafe(format!(r#"SELECT {} FROM "User" WHERE id = $1"#, USER_COLS)),
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
