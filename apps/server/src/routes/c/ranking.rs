use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::{Datelike, NaiveDate, Utc};
use serde::Deserialize;
use serde_json::json;

use crate::error::AppError;
use crate::middleware::auth::{AppState, AuthUser};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(ranking))
}

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RankingQuery {
    /// "week" | "month" | "all" (default: "all")
    period: Option<String>,
}

// ---------------------------------------------------------------------------
// GET / — ranked list by total distance
// ---------------------------------------------------------------------------

async fn ranking(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<RankingQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let period = query.period.as_deref().unwrap_or("all");

    let today = Utc::now().date_naive();

    // Compute the start-of-period date
    let period_start: Option<chrono::NaiveDateTime> = match period {
        "week" => {
            let wd = today.weekday().num_days_from_monday() as i64; // Mon=0
            let monday = today - chrono::Duration::days(wd);
            Some(monday.and_hms_opt(0, 0, 0).unwrap())
        }
        "month" => {
            let first = NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap();
            Some(first.and_hms_opt(0, 0, 0).unwrap())
        }
        _ => None, // "all" — no time filter
    };

    // Fetch ranked users
    let rows: Vec<(String, String, Option<String>, f64, i32)> = if let Some(start) = period_start {
        sqlx::query_as(
            r#"
            SELECT u.id, u.nickname, u.avatar,
                   COALESCE(SUM(r.distance), 0.0)::float8 AS "totalDistance",
                   COUNT(r.id)::int                        AS "runCount"
            FROM "User" u
            INNER JOIN "Run" r
              ON r."userId" = u.id
              AND r."archivedAt" IS NULL
              AND r."startedAt" >= $2
            GROUP BY u.id, u.nickname, u.avatar
            ORDER BY "totalDistance" DESC
            LIMIT 50
            "#,
        )
        .bind(&auth.user_id) // $1 unused but kept for bind consistency
        .bind(start)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as(
            r#"
            SELECT u.id, u.nickname, u.avatar,
                   COALESCE(SUM(r.distance), 0.0)::float8 AS "totalDistance",
                   COUNT(r.id)::int                        AS "runCount"
            FROM "User" u
            INNER JOIN "Run" r
              ON r."userId" = u.id
              AND r."archivedAt" IS NULL
            GROUP BY u.id, u.nickname, u.avatar
            ORDER BY "totalDistance" DESC
            LIMIT 50
            "#,
        )
        .fetch_all(&state.pool)
        .await?
    };

    // Build ranked list
    let mut list: Vec<serde_json::Value> = Vec::with_capacity(rows.len());
    let mut my_rank: Option<serde_json::Value> = None;

    for (i, (uid, nickname, avatar, total_distance, run_count)) in rows.iter().enumerate() {
        let rank = i + 1;
        let entry = json!({
            "rank": rank,
            "userId": uid,
            "nickname": nickname,
            "avatar": avatar,
            "totalDistance": total_distance,
            "runCount": run_count,
        });

        if uid == &auth.user_id {
            my_rank = Some(json!({
                "rank": rank,
                "totalDistance": total_distance,
                "runCount": run_count,
            }));
        }

        list.push(entry);
    }

    // If current user is not in top 50, fetch their own stats separately
    if my_rank.is_none() {
        let my_stats: Option<(f64, i32)> = if let Some(start) = period_start {
            sqlx::query_as(
                r#"
                SELECT COALESCE(SUM(distance), 0.0)::float8, COUNT(*)::int
                FROM "Run"
                WHERE "userId" = $1 AND "archivedAt" IS NULL AND "startedAt" >= $2
                "#,
            )
            .bind(&auth.user_id)
            .bind(start)
            .fetch_optional(&state.pool)
            .await?
        } else {
            sqlx::query_as(
                r#"
                SELECT COALESCE(SUM(distance), 0.0)::float8, COUNT(*)::int
                FROM "Run"
                WHERE "userId" = $1 AND "archivedAt" IS NULL
                "#,
            )
            .bind(&auth.user_id)
            .fetch_optional(&state.pool)
            .await?
        };

        if let Some((dist, count)) = my_stats {
            if dist > 0.0 {
                // Compute the user's actual rank (count users with more distance)
                let rank_row: (i64,) = if let Some(start) = period_start {
                    sqlx::query_as(
                        r#"
                        SELECT COUNT(DISTINCT "userId")::bigint
                        FROM (
                            SELECT "userId", SUM(distance) AS d
                            FROM "Run"
                            WHERE "archivedAt" IS NULL AND "startedAt" >= $1
                            GROUP BY "userId"
                            HAVING SUM(distance) > $2
                        ) sub
                        "#,
                    )
                    .bind(start)
                    .bind(dist)
                    .fetch_one(&state.pool)
                    .await?
                } else {
                    sqlx::query_as(
                        r#"
                        SELECT COUNT(DISTINCT "userId")::bigint
                        FROM (
                            SELECT "userId", SUM(distance) AS d
                            FROM "Run"
                            WHERE "archivedAt" IS NULL
                            GROUP BY "userId"
                            HAVING SUM(distance) > $1
                        ) sub
                        "#,
                    )
                    .bind(dist)
                    .fetch_one(&state.pool)
                    .await?
                };

                my_rank = Some(json!({
                    "rank": rank_row.0 + 1,
                    "totalDistance": dist,
                    "runCount": count,
                }));
            }
        }
    }

    Ok(Json(json!({
        "success": true,
        "data": list,
        "myRank": my_rank,
    })))
}
