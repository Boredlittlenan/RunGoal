use std::net::SocketAddr;

use axum::http::{HeaderValue, Method};
use axum::routing::get;
use axum::{Json, Router};
use serde_json::json;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;

mod config;
mod db;
mod error;
mod middleware;
mod models;
mod routes;
mod services;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialise structured logging (respects RUST_LOG env var)
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    // Load configuration from environment / .env file
    let config = config::Config::from_env()
        .map_err(|message| std::io::Error::new(std::io::ErrorKind::InvalidInput, message))?;

    // Create database connection pool
    let pool = db::create_pool(&config).await?;

    // Seed the default admin account if the Admin table is empty
    routes::admin::auth::seed_admin(&pool, &config).await?;

    // Build shared application state
    let state = middleware::auth::AppState {
        pool: pool.clone(),
        config: config.clone(),
    };

    // CORS — permissive during development; tighten origins in production
    let allowed_origins = config
        .cors_origins
        .iter()
        .map(|origin| origin.parse::<HeaderValue>())
        .collect::<Result<Vec<_>, _>>()?;
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(tower_http::cors::Any);

    // Assemble the full router: C-side + Admin + health check
    let app = Router::new()
        .merge(routes::c::client_routes())
        .merge(routes::admin::admin_routes())
        .route("/api/health", get(health_check))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("RunGoal server v{}", env!("CARGO_PKG_VERSION"));
    info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, app).await?;
    Ok(())
}

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "success": true,
        "message": "RunGoal API is running",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
