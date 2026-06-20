use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use tracing::info;

use crate::middleware::auth::{AppState, AuthAdmin, AdminClaims};

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct AdminLoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, sqlx::FromRow)]
struct AdminRow {
    id: String,
    username: String,
    #[sqlx(rename = "passwordHash")]
    password_hash: String,
    nickname: String,
    role: String,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn sign_token(admin_id: &str, role: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let claims = AdminClaims {
        admin_id: admin_id.to_string(),
        role: role.to_string(),
        iat: now.timestamp() as usize,
        exp: (now + Duration::hours(12)).timestamp() as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async fn login(
    State(state): State<AppState>,
    Json(body): Json<AdminLoginRequest>,
) -> Json<Value> {
    let admin = sqlx::query_as::<_, AdminRow>(
        r#"
        SELECT id, username, "passwordHash", nickname, role
        FROM "Admin"
        WHERE username = $1 AND "isActive" = true
        "#,
    )
    .bind(&body.username)
    .fetch_optional(&state.pool)
    .await;

    let admin = match admin {
        Ok(Some(a)) => a,
        Ok(None) => {
            return Json(json!({
                "success": false,
                "error": "用户名或密码错误"
            }));
        }
        Err(e) => {
            tracing::error!("login db error: {}", e);
            return Json(json!({
                "success": false,
                "error": "服务器错误"
            }));
        }
    };

    let valid = bcrypt::verify(&body.password, &admin.password_hash).unwrap_or(false);
    if !valid {
        return Json(json!({
            "success": false,
            "error": "用户名或密码错误"
        }));
    }

    // Update lastLoginAt
    if let Err(e) = sqlx::query(
        r#"UPDATE "Admin" SET "lastLoginAt" = NOW() WHERE id = $1"#,
    )
    .bind(&admin.id)
    .execute(&state.pool)
    .await
    {
        tracing::warn!("failed to update lastLoginAt: {}", e);
    }

    let token = match sign_token(&admin.id, &admin.role, &state.config.admin_jwt_secret) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("token sign error: {}", e);
            return Json(json!({
                "success": false,
                "error": "令牌生成失败"
            }));
        }
    };

    Json(json!({
        "success": true,
        "data": {
            "admin": {
                "id": admin.id,
                "username": admin.username,
                "nickname": admin.nickname,
                "role": admin.role
            },
            "token": token
        }
    }))
}

async fn me(admin: AuthAdmin) -> Json<Value> {
    Json(json!({
        "success": true,
        "data": {
            "admin": {
                "id": admin.admin_id,
                "role": admin.role
            }
        }
    }))
}

// ─── Seed ────────────────────────────────────────────────────────────────────

pub async fn seed_admin(pool: &PgPool) {
    let count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "Admin""#)
        .fetch_one(pool)
        .await
        .expect("failed to count admins");

    if count == 0 {
        let hash = bcrypt::hash("admin123", 12).expect("failed to hash password");
        sqlx::query(
            r#"
            INSERT INTO "Admin" (id, username, "passwordHash", nickname, role, "isActive")
            VALUES ($1, $2, $3, $4, $5, true)
            "#,
        )
        .bind(format!("seed-{}", Utc::now().timestamp_millis()))
        .bind("admin")
        .bind(&hash)
        .bind("管理员")
        .bind("superadmin")
        .execute(pool)
        .await
        .expect("failed to seed admin");

        info!("Seeded default admin account: admin / admin123");
    }
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/me", get(me))
}
