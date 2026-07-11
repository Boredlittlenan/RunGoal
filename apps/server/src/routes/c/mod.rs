pub mod achievement;
pub mod auth;
pub mod challenge;
pub mod goal;
pub mod ranking;
pub mod run;
pub mod stats;
pub mod user;

use crate::middleware::auth::AppState;
use axum::Router;

/// Assembles all client-facing (C-side) routes under their respective prefixes.
pub fn client_routes() -> Router<AppState> {
    Router::new()
        .nest("/api/auth", auth::routes())
        .nest("/api/runs", run::routes())
        .nest("/api/goals", goal::routes())
        .nest("/api/achievements", achievement::routes())
        .nest("/api/challenges", challenge::routes())
        .nest("/api/stats", stats::routes())
        .nest("/api/user", user::routes())
        .nest("/api/ranking", ranking::routes())
}
