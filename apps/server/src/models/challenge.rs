use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// A time-bound challenge that a user creates for themselves.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Challenge {
    pub id: String,
    #[serde(rename = "userId")]
    #[sqlx(rename = "userId")]
    pub user_id: String,
    pub title: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub challenge_type: String,
    #[serde(rename = "targetValue")]
    #[sqlx(rename = "targetValue")]
    pub target_value: f64,
    pub unit: String,
    pub status: String,
    #[serde(rename = "startDate")]
    #[sqlx(rename = "startDate")]
    pub start_date: NaiveDateTime,
    #[serde(rename = "endDate")]
    #[sqlx(rename = "endDate")]
    pub end_date: NaiveDateTime,
    pub progress: f64,
    #[serde(rename = "completedAt")]
    #[sqlx(rename = "completedAt")]
    pub completed_at: Option<NaiveDateTime>,
    #[serde(rename = "createdAt")]
    #[sqlx(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[serde(rename = "updatedAt")]
    #[sqlx(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

/// Request body for creating a new challenge.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChallengeRequest {
    pub title: String,
    #[serde(rename = "type")]
    pub challenge_type: String,
    pub target_value: f64,
    pub unit: String,
    pub start_date: NaiveDateTime,
    pub end_date: NaiveDateTime,
}

/// Query parameters for listing challenges, optionally filtered by status.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChallengeListQuery {
    pub status: Option<String>,
}
