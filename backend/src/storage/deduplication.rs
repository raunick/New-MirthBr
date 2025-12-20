use sqlx::sqlite::SqlitePool;
use sqlx::Row;
use chrono::{DateTime, Utc, Duration};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Store for message deduplication
#[derive(Clone)]
pub struct DeduplicationStore {
    pool: SqlitePool,
    ttl_hours: i64,
}

impl DeduplicationStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { 
            pool,
            ttl_hours: 24, // Default 24h TTL
        }
    }

    pub fn with_ttl(pool: SqlitePool, ttl_hours: i64) -> Self {
        Self { pool, ttl_hours }
    }

    /// Generate hash from message content
    fn hash_content(content: &str) -> String {
        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    /// Check if message is duplicate. Returns true if duplicate.
    pub async fn is_duplicate(&self, channel_id: &str, content: &str) -> Result<bool, sqlx::Error> {
        let hash = Self::hash_content(content);
        let now = Utc::now();

        let result = sqlx::query(
            "SELECT id FROM processed_ids 
             WHERE channel_id = ? AND message_hash = ? AND expires_at > ?"
        )
        .bind(channel_id)
        .bind(&hash)
        .bind(now)
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.is_some())
    }

    /// Mark message as processed (insert into dedup table)
    pub async fn mark_processed(&self, channel_id: &str, content: &str) -> Result<(), sqlx::Error> {
        let hash = Self::hash_content(content);
        let expires_at = Utc::now() + Duration::hours(self.ttl_hours);

        sqlx::query(
            "INSERT OR IGNORE INTO processed_ids (channel_id, message_hash, expires_at) 
             VALUES (?, ?, ?)"
        )
        .bind(channel_id)
        .bind(&hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Cleanup expired entries
    pub async fn cleanup_expired(&self) -> Result<u64, sqlx::Error> {
        let now = Utc::now();
        
        let result = sqlx::query("DELETE FROM processed_ids WHERE expires_at < ?")
            .bind(now)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }

    /// Clear all dedup entries for a specific channel
    pub async fn clear_channel(&self, channel_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM processed_ids WHERE channel_id = ?")
            .bind(channel_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
