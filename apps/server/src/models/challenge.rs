use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// A time-bound challenge that a user creates for themselves.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Challenge {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub challenge_type: String,
    #[serde(rename = "targetValue")]
    pub target_value: f64,
    pub unit: String,
    pub status: String,
    #[serde(rename = "startDate")]
    pub start_date: NaiveDate,
    #[serde(rename = "endDate")]
    pub end_date: NaiveDate,
    pub progress: f64,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
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
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

/// Query parameters for listing challenges, optionally filtered by status.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChallengeListQuery {
    pub status: Option<String>,
}
