use serde::Deserialize;

/// Application configuration loaded from environment variables.
/// Uses dotenvy to read from a `.env` file when present.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub jwt_secret: String,
    pub jwt_refresh_secret: String,
    pub admin_jwt_secret: String,
}

impl Config {
    /// Load configuration from environment variables (with `.env` file support).
    ///
    /// Missing values fall back to sensible development defaults so the server
    /// can start with zero configuration during local development.
    pub fn from_env() -> Self {
        // Best-effort load .env – ignore errors when the file does not exist.
        let _ = dotenvy::dotenv();

        Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://localhost:5432/rungoal".to_string()),
            port: std::env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3000),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-jwt-secret".to_string()),
            jwt_refresh_secret: std::env::var("JWT_REFRESH_SECRET")
                .unwrap_or_else(|_| "dev-refresh-secret".to_string()),
            admin_jwt_secret: std::env::var("ADMIN_JWT_SECRET")
                .unwrap_or_else(|_| "dev-admin-secret".to_string()),
        }
    }
}
