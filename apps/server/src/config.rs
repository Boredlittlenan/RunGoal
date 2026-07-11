use serde::Deserialize;

/// Application configuration loaded from environment variables.
/// Uses dotenvy to read from a `.env` file when present.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub app_env: String,
    pub database_url: String,
    pub port: u16,
    pub jwt_secret: String,
    pub jwt_refresh_secret: String,
    pub admin_jwt_secret: String,
    pub cors_origins: Vec<String>,
    pub admin_seed_username: Option<String>,
    pub admin_seed_password: Option<String>,
}

impl Config {
    /// Load configuration from environment variables (with `.env` file support).
    ///
    /// Missing values fall back to sensible development defaults so the server
    /// can start with zero configuration during local development.
    pub fn from_env() -> Result<Self, String> {
        // Best-effort load .env – ignore errors when the file does not exist.
        let _ = dotenvy::dotenv();

        let config = Self {
            app_env: std::env::var("APP_ENV").unwrap_or_else(|_| "development".to_string()),
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
            cors_origins: std::env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174".to_string())
                .split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty())
                .map(str::to_owned)
                .collect(),
            admin_seed_username: std::env::var("ADMIN_SEED_USERNAME").ok().filter(|value| !value.trim().is_empty()),
            admin_seed_password: std::env::var("ADMIN_SEED_PASSWORD").ok().filter(|value| !value.trim().is_empty()),
        };

        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<(), String> {
        if self.cors_origins.is_empty() {
            return Err("CORS_ORIGINS must contain at least one origin".into());
        }

        if self.app_env.eq_ignore_ascii_case("production") {
            let secrets = [
                ("JWT_SECRET", self.jwt_secret.as_str()),
                ("JWT_REFRESH_SECRET", self.jwt_refresh_secret.as_str()),
                ("ADMIN_JWT_SECRET", self.admin_jwt_secret.as_str()),
            ];
            for (name, value) in secrets {
                if value.len() < 32 || value.starts_with("dev-") || value.contains("替换") {
                    return Err(format!("{name} must be a unique random value of at least 32 characters in production"));
                }
            }
            if self.jwt_secret == self.jwt_refresh_secret
                || self.jwt_secret == self.admin_jwt_secret
                || self.jwt_refresh_secret == self.admin_jwt_secret
            {
                return Err("JWT secrets must be different in production".into());
            }
        }

        match (&self.admin_seed_username, &self.admin_seed_password) {
            (Some(_), Some(password)) if password.len() < 12 => {
                Err("ADMIN_SEED_PASSWORD must contain at least 12 characters".into())
            }
            (Some(_), None) | (None, Some(_)) => Err(
                "ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD must be configured together".into(),
            ),
            _ => Ok(()),
        }
    }
}
