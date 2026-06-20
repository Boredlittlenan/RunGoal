pub mod achievements;
pub mod auth;
pub mod challenges;
pub mod dashboard;
pub mod goals;
pub mod runs;
pub mod users;

use axum::Router;

use crate::middleware::auth::AppState;

pub fn admin_routes() -> Router<AppState> {
    Router::new()
        .nest("/api/admin/auth", auth::routes())
        .nest("/api/admin/dashboard", dashboard::routes())
        .nest("/api/admin/users", users::routes())
        .nest("/api/admin/runs", runs::routes())
        .nest("/api/admin/achievements", achievements::routes())
        .nest("/api/admin/goals", goals::routes())
        .nest("/api/admin/challenges", challenges::routes())
}
