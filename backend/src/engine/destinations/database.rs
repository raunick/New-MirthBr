use sqlx::{AnyPool};
use crate::engine::message::Message;
use uuid::Uuid;
use anyhow::anyhow;

pub struct DatabaseWriter {
    pub url: String,
    pub table: Option<String>,
    pub mode: String, // "INSERT", "UPDATE", "CUSTOM"
    pub query: Option<String>,
    pub channel_id: String,
}

impl DatabaseWriter {
    pub fn new(
        url: String,
        table: Option<String>,
        mode: String,
        query: Option<String>,
        channel_id: String,
    ) -> Self {
        Self {
            url,
            table,
            mode: mode.to_uppercase(),
            query,
            channel_id,
        }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        let channel_id = &self.channel_id; // Borrow here
        tracing::debug!("🔌 Database Writer (Channel {}) connecting to {}", channel_id, self.url);

        // 1. Connect
        let pool = AnyPool::connect(&self.url).await.map_err(|e| {
            tracing::error!("❌ Failed to connect to database for Channel {}: {}", channel_id, e);
            e
        })?;

        // 2. Prepare Query
        let sql = if let Some(q) = &self.query {
             q.clone()
        } else if let Some(table) = &self.table {
             // Basic INSERT support if no custom query provided
             // This is a naive implementation: "INSERT INTO table (content) VALUES (msg.content)"
             // Ideally we would parse JSON content and map to columns, but that requires mapping config.
             // For MVP, we'll assume a 'content' column or similar if using 'table' mode without mapping.
             // Better yet: Rely on CUSTOM query mode for now as 'table' auto-mapping is complex without schema awareness.
             
             if self.mode == "INSERT" {
                 format!("INSERT INTO {} (content, origin, created_at) VALUES ($1, $2, NOW())", table)
             } else {
                 return Err(anyhow!("Auto-generation for mode {} not supported yet. Use CUSTOM query.", self.mode));
             }
        } else {
             return Err(anyhow!("No query or table configured"));
        };

        // 3. Execute
        // For MVP, we support simple replacements or just execution
        // We will try to bind: content, origin.
        
        // This is tricky with sqlx::query and dynamic SQL.
        // We'll use sqlx::query() with bind, assuming the user knows to use $1, $2 placeholders for Postgres/SQLite or ? for MySQL.
        // Unifying this is hard. SQLx doesn't fully abstract placeholders across drivers in raw query string.
        // Postgres: $1, MySQL: ?, SQLite: ? or $1
        
        let result = sqlx::query(&sql)
            .bind(&msg.content)
            .bind(msg.origin.as_deref().unwrap_or("unknown"))
            .execute(&pool)
            .await;

        match result {
            Ok(done) => {
                tracing::info!("✅ Database Write Success. Rows affected: {}", done.rows_affected());
                Ok(())
            },
            Err(e) => {
                tracing::error!("❌ Database Write Failed: {}", e);
                Err(e.into())
            }
        }
    }
}
