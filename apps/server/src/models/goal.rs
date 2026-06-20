use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// A user-defined fitness goal (e.g. "Run 50 km this month").
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    #[serde(rename = "userId")]
    #[sqlx(rename = "userId")]
    pub user_id: String,
    pub title: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub goal_type: String,
    #[serde(rename = "targetValue")]
    #[sqlx(rename = "targetValue")]
    pub target_value: f64,
    pub unit: String,
    pub period: String,
    #[serde(rename = "startDate")]
    #[sqlx(rename = "startDate")]
    pub start_date: NaiveDateTime,
    #[serde(rename = "endDate")]
    #[sqlx(rename = "endDate")]
    pub end_date: Option<NaiveDateTime>,
    #[serde(rename = "isActive")]
    #[sqlx(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    #[sqlx(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[serde(rename = "updatedAt")]
    #[sqlx(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

/// A record that ties a run's contribution toward a specific goal.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct GoalRecord {
    pub id: String,
    #[serde(rename = "goalId")]
    #[sqlx(rename = "goalId")]
    pub goal_id: String,
    #[serde(rename = "runId")]
    #[sqlx(rename = "runId")]
    pub run_id: String,
    pub value: f64,
    #[serde(rename = "createdAt")]
    #[sqlx(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

/// Request body for creating a new goal.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGoalRequest {
    pub title: String,
    #[serde(rename = "type")]
    pub goal_type: String,
    pub target_value: f64,
    pub unit: String,
    pub period: String,
    pub start_date: NaiveDateTime,
    pub end_date: Option<NaiveDateTime>,
}

/// Query parameters for listing goals.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalListQuery {
    pub is_active: Option<bool>,
    pub goal_type: Option<String>,
}

/// A goal enriched with its current progress (aggregated from goal records).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalWithProgress {
    pub goal: Goal,
    pub current_value: f64,
    pub progress_pct: f64,
    pub records: Vec<GoalRecord>,
}
