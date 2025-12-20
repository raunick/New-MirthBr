use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::sync::{broadcast, mpsc};
use uuid::Uuid;
use crate::storage::models::{Channel, SourceConfig, ProcessorType};
use crate::engine::listeners::http::HttpListener;
use crate::engine::listeners::tcp::TcpListener;
use crate::engine::listeners::database::DatabasePoller;
use crate::engine::listeners::file::FileReader;
use crate::engine::destinations::http::HttpSender;
use crate::engine::destinations::file::FileWriter;
use crate::engine::destinations::tcp::TcpSender;
use crate::engine::destinations::database::DatabaseWriter;
use crate::engine::message::Message;
use std::future::Future;
use std::pin::Pin;
use crate::storage::messages::{MessageStore, MessageStatus};

use std::collections::VecDeque;
use crate::storage::logs::LogEntry;
use chrono::Utc;

pub struct ChannelManager {
    channels: Arc<Mutex<HashMap<Uuid, tokio::task::JoinHandle<()>>>>,
    senders: Arc<Mutex<HashMap<Uuid, mpsc::Sender<Message>>>>,
    shutdown_tx: broadcast::Sender<()>,
    metrics_tx: broadcast::Sender<crate::storage::models::MetricUpdate>,

    logs: Arc<Mutex<VecDeque<LogEntry>>>,
    // Rate Limiting: ChannelID -> (Last Message, Last Time)
    last_logs: Arc<Mutex<HashMap<Option<Uuid>, (String, Instant)>>>,
    
    db: Option<crate::storage::db::Database>,
    message_store: Option<MessageStore>,
    dedup_store: Option<Arc<crate::storage::deduplication::DeduplicationStore>>,
}

impl ChannelManager {
    pub fn new(db: Option<crate::storage::db::Database>, logs: Arc<Mutex<VecDeque<LogEntry>>>) -> Self {
        let message_store = db.as_ref().map(|d| MessageStore::new(d.pool.clone()));
        let dedup_store = db.as_ref().map(|d| Arc::new(crate::storage::deduplication::DeduplicationStore::new(d.pool.clone())));
        let (shutdown_tx, _) = broadcast::channel(1);
        let (metrics_tx, _) = broadcast::channel(100);
        
        Self {
            channels: Arc::new(Mutex::new(HashMap::new())),
            senders: Arc::new(Mutex::new(HashMap::new())),
            shutdown_tx,
            metrics_tx,
            logs,
            last_logs: Arc::new(Mutex::new(HashMap::new())),
            db,
            message_store,
            dedup_store,
        }
    }

    pub fn add_log(&self, level: &str, message: String, channel_id: Option<Uuid>) {
        // Rate Limiting
        if let Ok(mut last_logs) = self.last_logs.lock() {
            if let Some((last_msg, last_time)) = last_logs.get(&channel_id) {
                if last_msg == &message && last_time.elapsed().as_millis() < 1000 {
                   // Skip duplicate log within 1 second
                   return;
                }
            }
            last_logs.insert(channel_id, (message.clone(), Instant::now()));
        }

        if let Ok(mut logs) = self.logs.lock() {
            if logs.len() >= 100 {
                logs.pop_front();
            }
            logs.push_back(LogEntry {
                timestamp: Utc::now(),
                level: level.to_string(),
                message,
                channel_id,
            });
        }
    }
    
    pub fn subscribe_metrics(&self) -> broadcast::Receiver<crate::storage::models::MetricUpdate> {
        self.metrics_tx.subscribe()
    }

    pub fn get_dedup_store(&self) -> Option<Arc<crate::storage::deduplication::DeduplicationStore>> {
        self.dedup_store.clone()
    }

    pub fn get_logs(&self) -> Vec<LogEntry> {
        if let Ok(logs) = self.logs.lock() {
            logs.iter().cloned().collect()
        } else {
            vec![]
        }
    }

    pub fn get_senders(&self) -> Arc<Mutex<HashMap<Uuid, mpsc::Sender<Message>>>> {
        self.senders.clone()
    }

    pub fn get_active_channel_ids(&self) -> Vec<Uuid> {
        self.channels.lock().unwrap().keys().cloned().collect()
    }

    pub async fn stop_channel(&self, channel_id: Uuid) -> anyhow::Result<()> {
        let handle = {
            let mut channels = self.channels.lock().unwrap();
            channels.remove(&channel_id)
        };

        if let Some(handle) = handle {
            tracing::info!("Stopping channel: {}", channel_id);
            handle.abort();
            
            // Remove sender
            self.senders.lock().unwrap().remove(&channel_id);
            
            self.add_log("INFO", format!("Channel {} stopped", channel_id), Some(channel_id));
            Ok(())
        } else {
            Err(anyhow::anyhow!("Channel {} not running", channel_id))
        }
    }

    pub async fn delete_channel(&self, channel_id: Uuid) -> anyhow::Result<()> {
        // 1. Stop channel if running (ignore if not running)
        match self.stop_channel(channel_id).await {
            Ok(_) => tracing::info!("Channel {} stopped before deletion", channel_id),
            Err(e) => tracing::warn!("Channel {} was not running or failed to stop: {}", channel_id, e),
        }

        // 2. Delete from DB
        if let Some(db) = &self.db {
            db.delete_channel(&channel_id.to_string()).await.map_err(|e| anyhow::anyhow!("DB Error: {}", e))?;
        }
        
        tracing::info!("Channel {} deleted (stopped and removed from DB)", channel_id);
        self.add_log("INFO", format!("Channel {} deleted", channel_id), None);
        Ok(())
    }

    pub async fn start_channel(&self, channel: Channel, frontend_schema: Option<serde_json::Value>) -> anyhow::Result<()> {
        let channel_id = channel.id;
        tracing::info!("Starting channel: {} ({})", channel.name, channel_id);

        // Persist to DB if available
        if let Some(db) = &self.db {
             let config = serde_json::to_value(&channel).unwrap_or(serde_json::Value::Null);
             if let Err(e) = db.save_channel(&channel_id.to_string(), &channel.name, config, frontend_schema).await {
                 tracing::error!("Failed to save channel to DB: {}", e);
             } else {
                 tracing::info!("Channel {} saved to DB", channel.name);
             }
        }

        // Stop existing channel if redeploying
        {
            let mut channels = self.channels.lock().unwrap();
            if let Some(handle) = channels.remove(&channel_id) {
                tracing::info!("Stopping existing instance of channel: {}", channel_id);
                handle.abort(); 
            }
        }
        
        // Remove old sender to ensure no stale references
        self.senders.lock().unwrap().remove(&channel_id);

        // Clear dedup cache for this channel on start/deploy to allow re-testing
        if let Some(dedup) = &self.dedup_store {
            if let Err(e) = dedup.clear_channel(&channel_id.to_string()).await {
                tracing::warn!("Failed to clear deduplication cache for channel {}: {}", channel_id, e);
            } else {
                tracing::info!("Cleared deduplication cache for channel {}", channel_id);
            }
        }

        // 1. Create communication channel (MPSC)
        let (tx, rx) = mpsc::channel(100);

        // Store sender for manual injection AND for listeners to pick up if they need it (though listeners usually take a clone)
        self.senders.lock().unwrap().insert(channel_id, tx.clone());
        
        // Prepare store for listeners
        let store_for_listener = self.message_store.clone();

        // 2. Start Source Listener (Create Future)
        // We will run this concurrent with the processor
        let listener_fut: Pin<Box<dyn Future<Output = ()> + Send>> = match channel.source {
            SourceConfig::Http { port, path, cert_path, key_path } => {
                let mut path = path.unwrap_or_else(|| "/".to_string());
                if !path.starts_with('/') {
                    path = format!("/{}", path);
                }
                
                let tls_config = if let (Some(cert), Some(key)) = (cert_path, key_path) {
                    Some(crate::config::TlsConfig::new(std::path::PathBuf::from(cert), std::path::PathBuf::from(key)))
                } else {
                    None
                };
                
                let listener = HttpListener::new(
                    port,
                    path.clone(),
                    channel_id,
                    tx.clone(),
                    store_for_listener,
                    tls_config,
                );
                
                Box::pin(async move {
                    listener.start().await;
                    std::future::pending::<()>().await;
                })
            },
            SourceConfig::Test { payload_type, .. } => {
                self.add_log("INFO", format!("Test Channel {} ready for manual injection (Format: {})", channel.name, payload_type), Some(channel_id));
                Box::pin(std::future::pending())
            },
            SourceConfig::Tcp { port, cert_path, key_path } => {
                let tls_config = if let (Some(cert), Some(key)) = (cert_path, key_path) {
                    Some(crate::config::TlsConfig::new(std::path::PathBuf::from(cert), std::path::PathBuf::from(key)))
                } else {
                    None
                };

                let listener = TcpListener::new(
                    port,
                    channel_id,
                    tx, 
                    store_for_listener,
                    tls_config,
                );
                let channel_name_clone = channel.name.clone();
                let logs_arc_clone = self.logs.clone();
                
                self.add_log("INFO", format!("Channel {} started on TCP port {}", channel.name, port), Some(channel_id));

                Box::pin(async move {
                    if let Err(e) = listener.run().await {
                         tracing::error!("TCP Listener failed: {}", e);
                         // Log error to system logs (Note: we duplicate log logic here because we don't carry 'self' into async block easily)
                         // But we can improve this by carrying 'logs_arc_clone' which is done.
                         if let Ok(mut logs) = logs_arc_clone.lock() {
                            if logs.len() >= 100 { logs.pop_front(); }
                            logs.push_back(LogEntry {
                                timestamp: Utc::now(),
                                level: "ERROR".to_string(),
                                message: format!("[Channel: {}] TCP Listener Error: {}", channel_name_clone, e),
                                channel_id: Some(channel_id),
                            });
                        }
                    }
                })
            },
            SourceConfig::Database { url, query, interval_ms } => {
                let poller = DatabasePoller::new(
                    url,
                    query,
                    interval_ms,
                    channel_id,
                    tx,
                    store_for_listener,
                );
                
                self.add_log("INFO", format!("Channel {} started Database Poller", channel.name), Some(channel_id));

                Box::pin(async move {
                    if let Err(e) = poller.run().await {
                         tracing::error!("Database Poller failed: {}", e);
                    }
                })
            },
            SourceConfig::File { path, pattern } => {
                 let reader = FileReader::new(
                     path,
                     pattern,
                     channel_id,
                     tx,
                     store_for_listener,
                 );
                 
                 self.add_log("INFO", format!("Channel {} started File Reader", channel.name), Some(channel_id));

                 Box::pin(async move {
                     if let Err(e) = reader.run().await {
                          tracing::error!("File Reader failed: {}", e);
                     }
                 })
            },

        };

        // 3. Spawn Processing Loop (Using new PipelineProcessor)
        let processors = channel.processors.clone();
        let destinations = channel.destinations.clone();
        let logs_arc = self.logs.clone(); 
        let channel_name = channel.name.clone();
        let metrics_tx = self.metrics_tx.clone();
        let store_for_processor = self.message_store.clone();
        let dedup_store_for_processor = self.dedup_store.clone();

        let mut shutdown_rx = self.shutdown_tx.subscribe();
        
        let processor_channel_name = channel_name.clone();
        
        // 3. Spawn Supervisor Task (runs both listener and processor)
        let handle = tokio::spawn(async move {
            let processor_fut = async move {
                 let pipeline = crate::engine::pipeline::processor::PipelineProcessor::new(
                     channel_id,
                     processor_channel_name,
                     processors,
                     destinations,
                     store_for_processor,
                     dedup_store_for_processor,
                     metrics_tx,
                     logs_arc,
                 );
                 pipeline.run(rx).await;
            };

            // Spawn independent tasks managed by this supervisor
            let mut listener_handle = tokio::spawn(listener_fut);
            let mut processor_handle = tokio::spawn(processor_fut);

            tokio::select! {
                _ = shutdown_rx.recv() => {
                    tracing::info!("Channel {} shutting down (signal received)...", channel_name);
                    listener_handle.abort();
                    
                    let processor_drain = async {
                        match processor_handle.await {
                            Ok(_) => tracing::info!("Channel {} processor drained.", channel_name),
                            Err(e) => tracing::warn!("Channel {} processor join error: {}", channel_name, e),
                        }
                    };

                    tokio::select! {
                        _ = processor_drain => {},
                        _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => {
                            tracing::warn!("Channel {} drain timed out, stopping anyway.", channel_name);
                        }
                    }
                },
                res = &mut listener_handle => {
                    match res {
                       Ok(_) => tracing::warn!("Channel {} listener exited unexpectedly", channel_name),
                       Err(e) => tracing::error!("Channel {} listener task failed: {}", channel_name, e),
                    }
                    processor_handle.abort();
                },
                res = &mut processor_handle => {
                     match res {
                        Ok(_) => tracing::info!("Channel {} processor exited", channel_name),
                        Err(e) => tracing::error!("Channel {} processor task failed: {}", channel_name, e),
                     }
                     listener_handle.abort();
                }
            }
        });

        // Store handle
        self.channels.lock().unwrap().insert(channel_id, handle);

        Ok(())
    }

    pub async fn inject_message(&self, channel_id: Uuid, payload: String) -> anyhow::Result<String> {
        let sender = {
            let senders = self.senders.lock().unwrap();
            senders.get(&channel_id).cloned()
        };

        if let Some(tx) = sender {
             let mut msg = crate::engine::message::Message::new(channel_id, payload, "Manual Injection".to_string());
             
             // Create response channel
             let (resp_tx, resp_rx) = tokio::sync::oneshot::channel();
             msg.response_tx = Some(Arc::new(Mutex::new(Some(resp_tx))));

            tx.send(msg).await.map_err(|_| anyhow::anyhow!("Channel receiver dropped"))?;
            self.add_log("INFO", "Manual message injected".to_string(), Some(channel_id));
            
            // Wait for response (Sync wait just like HTTP listener)
            match tokio::time::timeout(std::time::Duration::from_secs(30), resp_rx).await {
                Ok(Ok(Ok(response))) => Ok(response),
                Ok(Ok(Err(proc_err))) => Err(anyhow::anyhow!("{}", proc_err)), // Return purely the error string, don't wrap in "Processing Error"
                 Ok(Err(_)) => Err(anyhow::anyhow!("Response channel closed unexpectedly")),
                Err(_) => Err(anyhow::anyhow!("Timeout waiting for processing"))
            }

        } else {
            Err(anyhow::anyhow!("Channel not found or not running"))
        }
    }

    pub async fn get_stored_channels(&self) -> anyhow::Result<Vec<(String, String, serde_json::Value, Option<serde_json::Value>)>> {
        if let Some(db) = &self.db {
             let channels = db.get_all_channels().await?;
             Ok(channels)
        } else {
             Ok(vec![])
        }
    }

    /// Get a specific channel by ID from database
    pub async fn get_channel_by_id(&self, channel_id: Uuid) -> anyhow::Result<Option<Channel>> {
        if let Some(db) = &self.db {
            let channels = db.get_all_channels().await?;
            for (id, _name, config, _schema) in channels {
                if id == channel_id.to_string() {
                    let channel: Channel = serde_json::from_value(config)?;
                    return Ok(Some(channel));
                }
            }
            Ok(None)
        } else {
            Ok(None)
        }
    }

    pub async fn recover_pending_messages(&self) {
        if let Some(store) = &self.message_store {
            tracing::info!("Checking for pending messages to recover...");
             match store.get_pending_messages().await {
                 Ok(messages) => {
                     let count = messages.len();
                     if count > 0 {
                         tracing::info!("Found {} pending/processing messages. Attempting recovery...", count);
                         for msg_record in messages {
                             if let Ok(channel_uuid) = Uuid::parse_str(&msg_record.channel_id) {
                                 let sender = {
                                     let senders = self.senders.lock().unwrap();
                                     senders.get(&channel_uuid).cloned()
                                 };

                                 if let Some(tx) = sender {
                                     let mut msg = Message::new(channel_uuid, msg_record.content, "RECOVERY".to_string());
                                     if let Ok(id) = Uuid::parse_str(&msg_record.id) {
                                         msg.id = id;
                                     }
                                     
                                     tokio::spawn(async move {
                                         if let Err(e) = tx.send(msg).await {
                                             tracing::error!("Failed to re-inject recovered message {}: {}", msg_record.id, e);
                                         } else {
                                             tracing::info!("Recovered message {} re-injected into channel {}", msg_record.id, channel_uuid);
                                         }
                                     });
                                 } else {
                                     tracing::warn!("Channel {} not found for recovered message {}. Keeping as PENDING.", channel_uuid, msg_record.id);
                                 }
                             }
                         }
                     } else {
                         tracing::info!("No pending messages found.");
                     }
                 },
                 Err(e) => tracing::error!("Failed to fetch pending messages for recovery: {}", e),
             }
        }
    }

    pub async fn list_messages(&self, channel_id: Option<String>, status: Option<String>, limit: i32) -> anyhow::Result<Vec<crate::storage::messages::MessageRecord>> {
        if let Some(store) = &self.message_store {
            Ok(store.get_messages(channel_id, status, limit).await?)
        } else {
            Ok(vec![])
        }
    }

    pub async fn retry_message(&self, id: String) -> anyhow::Result<()> {
        if let Some(store) = &self.message_store {
            // 1. Get message
            let msg_record = store.get_message_by_id(&id).await?
                .ok_or_else(|| anyhow::anyhow!("Message not found"))?;
                
            // 2. Increment retry count
            store.increment_retry(&id).await?;
            
            // 3. Update status to PENDING
            store.update_status(&id, MessageStatus::PENDING, None).await?;
            
            // 4. Re-inject
            if let Ok(channel_uuid) = Uuid::parse_str(&msg_record.channel_id) {
                 let sender = {
                     let senders = self.senders.lock().unwrap();
                     senders.get(&channel_uuid).cloned()
                 };

                 if let Some(tx) = sender {
                     let mut msg = Message::new(channel_uuid, msg_record.content, "RETRY_API".to_string());
                     // RESTORE ID
                     if let Ok(uuid) = Uuid::parse_str(&msg_record.id) {
                         msg.id = uuid;
                     }
                     
                     tx.send(msg).await.map_err(|_| anyhow::anyhow!("Channel receiver dropped"))?;
                     Ok(())
                 } else {
                     Err(anyhow::anyhow!("Channel not running"))
                 }
            } else {
                Err(anyhow::anyhow!("Invalid channel ID"))
            }
        } else {
            Err(anyhow::anyhow!("Message store not configured"))
        }
    }

    pub async fn shutdown_all(&self) {
        tracing::info!("Initiating system shutdown...");
        // 1. Send shutdown signal to all supervisors
        let _ = self.shutdown_tx.send(());
        
        // 2. Clear senders map to ensure processors stop when their listeners abort
        {
            let mut senders = self.senders.lock().unwrap();
            senders.clear();
        }
        
        // 3. Join all channel tasks
        let mut handles = Vec::new();
        {
            let mut channels = self.channels.lock().unwrap();
            // Move handles out of the map
            handles.extend(channels.drain());
        }
        
        for (id, handle) in handles {
            tracing::info!("Waiting for channel {} to shutdown...", id);
            
            // Add a timeout for each channel join to prevent total system hang
            let _ = tokio::time::timeout(
                std::time::Duration::from_secs(3),
                handle
            ).await;
        }
        
        tracing::info!("All channels shutdown gracefully.");
    }
}
