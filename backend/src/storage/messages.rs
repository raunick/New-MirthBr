use sqlx::{sqlite::SqlitePool, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageStatus {
    PENDING,
    PROCESSING,
    SENT,
    ERROR,
}

impl ToString for MessageStatus {
    fn to_string(&self) -> String {
        match self {
            MessageStatus::PENDING => "PENDING".to_string(),
            MessageStatus::PROCESSING => "PROCESSING".to_string(),
            MessageStatus::SENT => "SENT".to_string(),
            MessageStatus::ERROR => "ERROR".to_string(),
        }
    }
}

impl From<String> for MessageStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "PENDING" => MessageStatus::PENDING,
            "PROCESSING" => MessageStatus::PROCESSING,
            "SENT" => MessageStatus::SENT,
            "ERROR" => MessageStatus::ERROR,
            _ => MessageStatus::ERROR, // Default to error if unknown
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRecord {
    pub id: String,
    pub channel_id: String,
    pub content: String,
    pub status: String,
    pub error_message: Option<String>,
    pub retry_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct MessageStore {
    pool: SqlitePool,
}

impl MessageStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn save_message(&self, channel_id: &str, content: &str) -> Result<String, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        sqlx::query(
            "INSERT INTO messages (id, channel_id, content, status, retry_count, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(channel_id)
        .bind(content)
        .bind(MessageStatus::PENDING.to_string())
        .bind(0)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    pub async fn update_status(&self, id: &str, status: MessageStatus, error_message: Option<String>) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        let status_str = status.to_string();

        let query = if error_message.is_some() {
             "UPDATE messages SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"
        } else {
             "UPDATE messages SET status = ?, updated_at = ? WHERE id = ?"
        };

        let mut q = sqlx::query(query).bind(status_str);
        
        if let Some(err) = error_message {
            q = q.bind(err);
        }
        
        q.bind(now)
         .bind(id)
         .execute(&self.pool)
         .await?;

        Ok(())
    }

    pub async fn increment_retry(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE messages SET retry_count = retry_count + 1 WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_pending_messages(&self) -> Result<Vec<MessageRecord>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM messages WHERE status = 'PENDING' OR status = 'PROCESSING'")
            .fetch_all(&self.pool)
            .await?;

        let mut messages = Vec::new();
        for row in rows {
            messages.push(self.row_to_message(row));
        }
        Ok(messages)
    }

    pub async fn get_messages(&self, channel_id: Option<String>, status: Option<String>, limit: i32) -> Result<Vec<MessageRecord>, sqlx::Error> {
        let mut query_str = "SELECT * FROM messages".to_string();
        let mut conditions = Vec::new();

        if channel_id.is_some() {
            conditions.push("channel_id = ?");
        }
        if status.is_some() {
            conditions.push("status = ?");
        }

        if !conditions.is_empty() {
            query_str.push_str(" WHERE ");
            query_str.push_str(&conditions.join(" AND "));
        }

        query_str.push_str(" ORDER BY created_at DESC LIMIT ?");

        let mut query = sqlx::query(&query_str);
        
        if let Some(c) = channel_id {
            query = query.bind(c);
        }
        if let Some(s) = status {
            query = query.bind(s);
        }
        query = query.bind(limit);

        let rows = query.fetch_all(&self.pool).await?;
        
        let mut messages = Vec::new();
        for row in rows {
            messages.push(self.row_to_message(row));
        }
        Ok(messages)
    }
    
    pub async fn get_message_by_id(&self, id: &str) -> Result<Option<MessageRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM messages WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
            
        Ok(row.map(|r| self.row_to_message(r)))
    }

    fn row_to_message(&self, row: sqlx::sqlite::SqliteRow) -> MessageRecord {
        MessageRecord {
            id: row.get("id"),
            channel_id: row.get("channel_id"),
            content: row.get("content"),
            status: row.get("status"),
            error_message: row.get("error_message"),
            retry_count: row.get("retry_count"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }
    }
    
    // Pruning
    pub async fn prune_messages(&self, days: i64) -> Result<u64, sqlx::Error> {
        // Delete messages older than X days
         let result = sqlx::query("DELETE FROM messages WHERE created_at < datetime('now', ?)")
            .bind(format!("-{} days", days))
            .execute(&self.pool)
            .await?;
            
        Ok(result.rows_affected())
    }
}
