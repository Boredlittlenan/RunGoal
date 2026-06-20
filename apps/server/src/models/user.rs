use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Full User row from the database. `password_hash` is skipped during serialization
/// so it never leaks into JSON responses.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub phone: String,
    pub nickname: String,
    pub avatar: Option<String>,
    pub weight: Option<f64>,
    pub height: Option<f64>,
    #[serde(skip_serializing)]
    #[sqlx(rename = "passwordHash")]
    pub password_hash: String,
    pub theme: String,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

/// A safe, public-facing user representation that omits sensitive fields.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPublic {
    pub id: String,
    pub phone: String,
    pub nickname: String,
    pub avatar: Option<String>,
    pub weight: Option<f64>,
    pub height: Option<f64>,
    pub theme: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            avatar: user.avatar,
            weight: user.weight,
            height: user.height,
            theme: user.theme,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}

impl From<&User> for UserPublic {
    fn from(user: &User) -> Self {
        Self {
            id: user.id.clone(),
            phone: user.phone.clone(),
            nickname: user.nickname.clone(),
            avatar: user.avatar.clone(),
            weight: user.weight,
            height: user.height,
            theme: user.theme.clone(),
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}

/// Request body for user registration.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    pub phone: String,
    pub password: String,
    pub nickname: String,
}

/// Request body for user login.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub phone: String,
    pub password: String,
}

/// Request body for updating the user's profile information.
/// All fields are optional — only the provided fields will be updated.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdateRequest {
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    pub weight: Option<f64>,
    pub height: Option<f64>,
}

/// Request body for updating the user's preferred theme.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeUpdateRequest {
    pub theme: String,
}
