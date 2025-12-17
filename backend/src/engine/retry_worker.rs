use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::sleep;
use tokio::sync::mpsc;
use crate::storage::messages::MessageStatus;
use crate::engine::message::Message;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;
use anyhow::Result;

pub struct RetryWorker {
    pool: sqlx::SqlitePool,
    senders: Arc<Mutex<HashMap<Uuid, mpsc::Sender<Message>>>>,
    interval: Duration,
}

impl RetryWorker {
    pub fn new(pool: sqlx::SqlitePool, senders: Arc<Mutex<HashMap<Uuid, mpsc::Sender<Message>>>>) -> Self {
        Self {
            pool,
            senders,
            interval: Duration::from_secs(60), // Check every minute
        }
    }

    pub async fn start(self) {
        tracing::info!("Starting RetryWorker...");
        let pool = self.pool.clone();
        let senders = self.senders.clone();

        loop {
            if let Err(e) = Self::process_retries(&pool, &senders).await {
                tracing::error!("RetryWorker passed error: {}", e);
            }
            sleep(self.interval).await;
        }
    }

    async fn process_retries(pool: &sqlx::SqlitePool, senders: &Arc<Mutex<HashMap<Uuid, mpsc::Sender<Message>>>>) -> anyhow::Result<()> {
        // Query for messages with status ERROR using generic query to avoid build-time DB check
        let messages = sqlx::query(
            r#"
            SELECT id, channel_id, content, status, retry_count, created_at, updated_at
            FROM messages
            WHERE status = 'ERROR'
            "#
        )
        .fetch_all(pool)
        .await?;

        for record in messages {
            use sqlx::Row;
            let id: String = record.get("id");
            let channel_id_str: String = record.get("channel_id");
            let content: String = record.get("content");
            let retry_count: i32 = record.get("retry_count");
            let updated_at: chrono::DateTime<Utc> = record.get("updated_at"); // Ensure type matches DB

            // Check max_retries. 
            // Backoff: 2^retry_count * 1 minute
            let backoff_minutes = 2u64.pow(retry_count as u32);
            let next_retry_time = updated_at.checked_add_signed(chrono::Duration::minutes(backoff_minutes as i64)).unwrap_or(Utc::now());

            if Utc::now() >= next_retry_time {
                 let channel_id_uuid = match Uuid::parse_str(&channel_id_str) {
                     Ok(u) => u,
                     Err(_) => continue,
                 };
                 
                 let sender = {
                     let map = senders.lock().unwrap();
                     map.get(&channel_id_uuid).cloned()
                 };
                 
                 if let Some(sender) = sender {
                     let new_retry_count = retry_count + 1;
                     
                     let mut msg = Message {
                        id: Uuid::parse_str(&id).unwrap_or_default(),
                        channel_id: channel_id_uuid,
                        content: content.clone(),
                        metadata: HashMap::new(),
                        origin: Some("retry_worker".to_string()),
                        timestamp: Utc::now(),
                        response_tx: None,
                     };
                     
                     // Update DB to PROCESSING
                     let _ = sqlx::query("UPDATE messages SET status = 'PROCESSING', retry_count = ?, updated_at = ? WHERE id = ?")
                         .bind(new_retry_count)
                         .bind(Utc::now())
                         .bind(&id)
                         .execute(pool).await;
                     
                     tracing::info!("Retrying message {} for channel {} (Attempt {})", id, channel_id_str, new_retry_count);
                     
                     if let Err(e) = sender.send(msg).await {
                         tracing::error!("Failed to re-queue message {}: {}", id, e);
                     }
                 }
            }
        }
        
        Ok(())
    }
}
