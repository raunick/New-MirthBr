use sqlx::{AnyPool, Row, Column, TypeInfo};
use tokio::sync::mpsc;
use crate::engine::message::Message;
use crate::storage::messages::MessageStore;
use uuid::Uuid;
use std::time::Duration;
use serde_json::Value;

pub struct DatabasePoller {
    pub url: String,
    pub query: String,
    pub interval_ms: u64,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
    pub store: Option<MessageStore>,
}

impl DatabasePoller {
    pub fn new(
        url: String,
        query: String,
        interval_ms: u64,
        channel_id: Uuid,
        sender: mpsc::Sender<Message>,
        store: Option<MessageStore>,
    ) -> Self {
        Self {
            url,
            query,
            interval_ms,
            channel_id,
            sender,
            store,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        let channel_id = self.channel_id;
        tracing::info!("🔌 Connecting to database for Channel {}...", channel_id);
        
        // Create connection pool
        // sqlx::AnyPool allows connecting to Postgres, MySQL, SQLite based on URL scheme
        let pool = AnyPool::connect(&self.url).await.map_err(|e| {
            tracing::error!("❌ Failed to connect to database for Channel {}: {}", channel_id, e);
            e
        })?;

        tracing::info!("✅ Connected to database. Starting poll loop every {}ms", self.interval_ms);

        let mut interval = tokio::time::interval(Duration::from_millis(self.interval_ms));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        // First tick completes immediately
        interval.tick().await;

        loop {
            interval.tick().await;
            tracing::debug!("Poll tick for channel {}", channel_id);

            // Execute Query
            match sqlx::query(&self.query).fetch_all(&pool).await {
                Ok(rows) => {
                    if !rows.is_empty() {
                         tracing::info!("Found {} rows in poll", rows.len());
                    }
                    
                    for row in rows {
                        let mut row_map = serde_json::Map::new();
                        
                        // Dynamically map columns to JSON
                        for col in row.columns() {
                            let col_name = col.name();
                            // Attempt to decode common types as string or number
                            // Note: This is a simplification. For robust ANY support, we need more type checks.
                            // For now, we try string representation or defaults.
                            let value_str = row.try_get::<String, _>(col_name)
                                .or_else(|_| row.try_get::<i64, _>(col_name).map(|v| v.to_string()))
                                .or_else(|_| row.try_get::<f64, _>(col_name).map(|v| v.to_string()))
                                .or_else(|_| row.try_get::<bool, _>(col_name).map(|v| v.to_string()))
                                .unwrap_or_else(|_| "null".to_string());
                                
                            row_map.insert(col_name.to_string(), Value::String(value_str));
                        }

                        let payload = Value::Object(row_map).to_string();
                        let origin = "Database Poller".to_string();

                        // 1. Create Message
                        let mut msg = Message::new(channel_id, payload.clone(), origin.clone());

                        // 2. Persist
                         if let Some(s) = &self.store {
                            match s.save_message(&channel_id.to_string(), &payload).await {
                                Ok(id) => {
                                    tracing::info!("Message persisted to disk with ID: {}", id);
                                    if let Ok(uuid) = Uuid::parse_str(&id) {
                                        msg.id = uuid;
                                    }
                                },
                                Err(e) => {
                                    tracing::error!("Failed to persist database message: {}", e);
                                }
                            }
                        }

                        // 3. Send to pipeline
                        if let Err(e) = self.sender.send(msg).await {
                             tracing::error!("Failed to send database message to pipeline: {}", e);
                             break; // Channel closed?
                        }
                    }
                },
                Err(e) => {
                    tracing::error!("Database poll query failed: {}", e);
                }
            }
        }
    }
}
