use sqlx::{sqlite::{SqlitePool, SqlitePoolOptions}, Row};


#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        // Use SqliteConnectOptions to handle file creation and path parsing
        let options = std::str::FromStr::from_str(database_url)
            .map(|opt: sqlx::sqlite::SqliteConnectOptions| opt.create_if_missing(true))
            .map_err(|e| sqlx::Error::Configuration(Box::new(e)))?;

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        let db = Self { pool };
        db.init().await?;
        
        Ok(db)
    }

    async fn init(&self) -> Result<(), sqlx::Error> {
        // Create channels table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                config JSON NOT NULL,
                frontend_schema JSON
            )"
        )
        .execute(&self.pool)
        .await?;

        // Create messages table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT NOT NULL,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )"
        )
        .execute(&self.pool)
        .await?;
        
        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_channel_status ON messages(channel_id, status)")
            .execute(&self.pool)
            .await?;

        // Create processed_ids table for deduplication
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS processed_ids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                message_hash TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(channel_id, message_hash)
            )"
        )
        .execute(&self.pool)
        .await?;

        // Index for cleanup
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_processed_ids_expires ON processed_ids(expires_at)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn save_channel(&self, id: &str, name: &str, config: serde_json::Value, frontend_schema: Option<serde_json::Value>) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO channels (id, name, config, frontend_schema) 
             VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET 
                name = excluded.name,
                config = excluded.config,
                frontend_schema = excluded.frontend_schema"
        )
        .bind(id)
        .bind(name)
        .bind(config)
        .bind(frontend_schema)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn delete_channel(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM channels WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_all_channels(&self) -> Result<Vec<(String, String, serde_json::Value, Option<serde_json::Value>)>, sqlx::Error> {
        let rows = sqlx::query("SELECT id, name, config, frontend_schema FROM channels")
            .fetch_all(&self.pool)
            .await?;

        let mut channels = Vec::new();
        for row in rows {
            let id: String = row.get("id");
            let name: String = row.get("name");
            let config: serde_json::Value = row.get("config");
            let frontend_schema: Option<serde_json::Value> = row.get("frontend_schema");
            
            channels.push((id, name, config, frontend_schema));
        }

        Ok(channels)
    }
}
