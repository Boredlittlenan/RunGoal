use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// A single run record persisted in the database.
///
/// Column names use camelCase to match the Prisma-generated schema
/// (e.g. `"userId"`, `"startedAt"`, `"avgPace"`).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Run {
    pub id: String,
    #[serde(rename = "userId")]
    #[sqlx(rename = "userId")]
    pub user_id: String,
    pub distance: f64,
    pub duration: i32,
    #[serde(rename = "avgPace")]
    #[sqlx(rename = "avgPace")]
    pub avg_pace: Option<f64>,
    pub source: String,
    #[serde(rename = "trackPoints")]
    #[sqlx(rename = "trackPoints")]
    pub track_points: Option<serde_json::Value>,
    pub calories: Option<f64>,
    pub feeling: Option<i32>,
    pub note: Option<String>,
    pub weather: Option<String>,
    #[serde(rename = "startedAt")]
    #[sqlx(rename = "startedAt")]
    pub started_at: NaiveDateTime,
    #[serde(rename = "endedAt")]
    #[sqlx(rename = "endedAt")]
    pub ended_at: Option<NaiveDateTime>,
    #[serde(rename = "createdAt")]
    #[sqlx(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[serde(rename = "updatedAt")]
    #[sqlx(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
    #[serde(rename = "archivedAt")]
    #[sqlx(rename = "archivedAt")]
    pub archived_at: Option<NaiveDateTime>,
}

/// Request body for creating a new run.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRunRequest {
    pub distance: f64,
    pub duration: i32,
    pub source: Option<String>,
    pub track_points: Option<serde_json::Value>,
    pub calories: Option<f64>,
    pub feeling: Option<i32>,
    pub note: Option<String>,
    pub weather: Option<String>,
    pub started_at: NaiveDateTime,
    pub ended_at: Option<NaiveDateTime>,
}

/// Query parameters for paginated run listing.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub archived: Option<bool>,
}
