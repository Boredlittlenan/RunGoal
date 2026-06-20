use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

use crate::config::Config;

/// Create a connection pool for PostgreSQL using the provided [`Config`].
///
/// The pool is configured with sensible defaults:
/// - max 10 connections
/// - min 2 idle connections
/// - 30-second acquire timeout
pub async fn create_pool(config: &Config) -> PgPool {
    info!("Connecting to database...");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect(&config.database_url)
        .await
        .expect("Failed to create database connection pool");

    info!("Database connection pool established");
    pool
}
