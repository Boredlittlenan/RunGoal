pub mod auth;
pub mod run;
pub mod goal;
pub mod achievement;
pub mod challenge;
pub mod stats;
pub mod user;

use axum::Router;
use crate::middleware::auth::AppState;

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
}
