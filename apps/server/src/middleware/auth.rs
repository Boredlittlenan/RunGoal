use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::config::Config;
use crate::error::AppError;

// ---------------------------------------------------------------------------
// AppState – shared application state threaded through every handler.
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
}

// ---------------------------------------------------------------------------
// JWT claim structs
// ---------------------------------------------------------------------------

/// Claims embedded in a regular user access token.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserClaims {
    pub user_id: String,
    pub exp: usize,
    pub iat: usize,
}

/// Claims embedded in an admin access token.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminClaims {
    pub admin_id: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

// ---------------------------------------------------------------------------
// AuthUser extractor – validates a user JWT from the Authorization header.
// ---------------------------------------------------------------------------

/// Extractor that yields the authenticated user's ID.
///
/// Expects an `Authorization: Bearer <token>` header whose payload contains
/// `{ userId: String }` signed with `JWT_SECRET`.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .map(|s| s.to_owned());

        let secret = state.config.jwt_secret.clone();

        let header = auth_header
            .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

        let token = header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Invalid Authorization scheme".to_string()))?;

        let validation = jsonwebtoken::Validation::default();
        let key = jsonwebtoken::DecodingKey::from_secret(secret.as_bytes());

        let token_data = jsonwebtoken::decode::<UserClaims>(token, &key, &validation)
            .map_err(|e| AppError::Unauthorized(format!("Invalid or expired token: {}", e)))?;

        Ok(AuthUser {
            user_id: token_data.claims.user_id,
        })
    }
}

// ---------------------------------------------------------------------------
// AuthAdmin extractor – validates an admin JWT from the Authorization header.
// ---------------------------------------------------------------------------

/// Extractor that yields the authenticated admin's ID and role.
///
/// Expects an `Authorization: Bearer <token>` header whose payload contains
/// `{ adminId: String, role: String }` signed with `ADMIN_JWT_SECRET`.
#[derive(Debug, Clone)]
pub struct AuthAdmin {
    pub admin_id: String,
    pub role: String,
}

impl FromRequestParts<AppState> for AuthAdmin {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .map(|s| s.to_owned());

        let secret = state.config.admin_jwt_secret.clone();

        let header = auth_header
            .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

        let token = header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Invalid Authorization scheme".to_string()))?;

        let validation = jsonwebtoken::Validation::default();
        let key = jsonwebtoken::DecodingKey::from_secret(secret.as_bytes());

        let token_data =
            jsonwebtoken::decode::<AdminClaims>(token, &key, &validation).map_err(|e| {
                AppError::Unauthorized(format!("Invalid or expired admin token: {}", e))
            })?;

        Ok(AuthAdmin {
            admin_id: token_data.claims.admin_id,
            role: token_data.claims.role,
        })
    }
}
