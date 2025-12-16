use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use uuid::Uuid;
use crate::storage::models::{Channel, SourceConfig, ProcessorType};
use crate::engine::listeners::http::HttpListener;
use crate::engine::processors::lua::LuaProcessor;
use crate::engine::destinations::http::HttpSender;
use crate::engine::destinations::file::FileWriter;
use crate::engine::message::Message;

use std::collections::VecDeque;
use crate::storage::logs::LogEntry;
use chrono::Utc;

pub struct ChannelManager {
    channels: Arc<Mutex<HashMap<Uuid, tokio::task::JoinHandle<()>>>>,
    senders: Arc<Mutex<HashMap<Uuid, mpsc::Sender<Message>>>>,

    logs: Arc<Mutex<VecDeque<LogEntry>>>,
    db: Option<crate::storage::db::Database>,
}

impl ChannelManager {
    pub fn new(db: Option<crate::storage::db::Database>) -> Self {
        Self {
            channels: Arc::new(Mutex::new(HashMap::new())),
            senders: Arc::new(Mutex::new(HashMap::new())),
            logs: Arc::new(Mutex::new(VecDeque::with_capacity(100))),
            db,
        }
    }

    pub fn add_log(&self, level: &str, message: String, channel_id: Option<Uuid>) {
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

    pub fn get_logs(&self) -> Vec<LogEntry> {
        if let Ok(logs) = self.logs.lock() {
            logs.iter().cloned().collect()
        } else {
            vec![]
        }
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

        // 1. Create communication channel (MPSC)
        let (tx, mut rx) = mpsc::channel(100);

        // Store sender for manual injection
        self.senders.lock().unwrap().insert(channel_id, tx.clone());

        // 2. Start Source Listener
        match channel.source {
            SourceConfig::Http { port, path } => {
                let mut path = path.unwrap_or_else(|| "/".to_string());
                if !path.starts_with('/') {
                    path = format!("/{}", path);
                }
                
                let listener = HttpListener::new(
                    port,
                    path.clone(),
                    channel_id,
                    tx,
                );
                // TODO: In future, allow configuring CORS origins per channel
                // listener.allowed_origins = Some(vec!["http://localhost:3000".to_string()]);
                listener.start().await;
                
                // Log startup
                self.add_log("INFO", format!("Channel {} started on port {} (path: {})", channel.name, port, path), Some(channel_id));
            },
            SourceConfig::Test { payload_type, .. } => {
                // No listener to start, just waiting for manual injection
                self.add_log("INFO", format!("Test Channel {} ready for manual injection (Format: {})", channel.name, payload_type), Some(channel_id));
            },
            _ => tracing::warn!("Unsupported source type"),
        }

        // 3. Spawn Processing Loop
        let processors = channel.processors.clone();
        let destinations = channel.destinations.clone();
        let logs_arc = self.logs.clone(); // Clone ARC for task

        // Cloning data needed for the async task
        let handle = tokio::spawn(async move {
            while let Some(mut msg) = rx.recv().await {
                tracing::info!("Processing message: {}", msg.id);
                // Log to buffer
                {
                   if let Ok(mut logs) = logs_arc.lock() {
                       if logs.len() >= 100 { logs.pop_front(); }
                       logs.push_back(LogEntry {
                           timestamp: Utc::now(),
                           level: "INFO".to_string(),
                           message: format!("Processing message {}", msg.id),
                           channel_id: Some(channel_id),
                       });
                   }
                }
                
                // A. Run Processors (Sequential)
                let mut failed = false;
                for proc_config in &processors {
                    match &proc_config.kind {
                        ProcessorType::Lua { code } => {
                            let processor = LuaProcessor::new(code.clone());
                            match processor.process(msg.clone()) {
                                Ok(new_msg) => msg = new_msg,
                                Err(e) => {
                                    tracing::error!("Processor {} failed: {}", proc_config.name, e);
                                    
                                     // Log Error
                                    {
                                        if let Ok(mut logs) = logs_arc.lock() {
                                            if logs.len() >= 100 { logs.pop_front(); }
                                            logs.push_back(LogEntry {
                                                timestamp: Utc::now(),
                                                level: "ERROR".to_string(),
                                                message: format!("Processor {} failed: {}", proc_config.name, e),
                                                channel_id: Some(channel_id),
                                            });
                                        }
                                    }

                                    failed = true;
                                    break; 
                                }
                            }
                        },
                        ProcessorType::Hl7 { inputFormat: _, outputFormat: _ } => {
                            // Simple HL7 to JSON conversion for MVP
                            // Ignoring input/output format specifics and assuming HL7v2 -> JSON
                            
                            // Security: Limit parsing to prevent DoS
                            const MAX_HL7_SEGMENTS: usize = 1000;
                            const MAX_HL7_FIELDS: usize = 100;
                            
                            let content = msg.content.clone();
                            let mut map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
                            
                            // Handle both \r and \n just in case, though HL7 standard is \r
                            let lines: Vec<&str> = if content.contains('\r') {
                                content.split('\r').take(MAX_HL7_SEGMENTS).collect()
                            } else {
                                content.split('\n').take(MAX_HL7_SEGMENTS).collect()
                            };

                            if lines.len() >= MAX_HL7_SEGMENTS {
                                tracing::warn!("HL7 message truncated at {} segments", MAX_HL7_SEGMENTS);
                            }

                            for segment in lines {
                                if segment.trim().is_empty() { continue; }
                                let fields: Vec<&str> = segment.split('|').take(MAX_HL7_FIELDS).collect();
                                if fields.is_empty() { continue; }
                                
                                let segment_name = fields[0].to_string();
                                let field_values: Vec<String> = fields.iter().map(|s| s.to_string()).collect();
                                
                                // Note: This simple map overwrites repeating segments (like OBX). 
                                // For MVP it's sufficient to demonstrate flow.
                                map.insert(segment_name, field_values);
                            }
                            
                            match serde_json::to_string(&map) {
                                Ok(json) => {
                                    msg.content = json;
                                    tracing::info!("HL7 Parser converted message to JSON");
                                },
                                Err(e) => {
                                     tracing::error!("HL7 Parser serialization failed: {}", e);
                                     // Log error ...
                                     failed = true;
                                     break; 
                                }
                            }
                        },
                        _ => {
                            tracing::warn!("Processor type {} not implemented yet", proc_config.name);
                        }
                    }
                }

                if failed { continue; } // Skip destinations if processing failed

                // B. Send to Destinations (Parallel-ish or Sequential)
                for dest_config in &destinations {
                    match &dest_config.kind {
                        crate::storage::models::DestinationType::File { path, filename } => {
                            let writer = FileWriter::new(path.clone(), filename.clone());
                            if let Err(e) = writer.send(&msg).await {
                                tracing::error!("Destination File failed: {}", e);
                                // Log Error
                                {
                                    if let Ok(mut logs) = logs_arc.lock() {
                                        if logs.len() >= 100 { logs.pop_front(); }
                                        logs.push_back(LogEntry {
                                            timestamp: Utc::now(),
                                            level: "ERROR".to_string(),
                                            message: format!("Destination File failed: {}", e),
                                            channel_id: Some(channel_id),
                                        });
                                    }
                                }
                            } else {
                                // Log Success
                                {
                                    if let Ok(mut logs) = logs_arc.lock() {
                                        if logs.len() >= 100 { logs.pop_front(); }
                                        logs.push_back(LogEntry {
                                            timestamp: Utc::now(),
                                            level: "INFO".to_string(),
                                            message: format!("Written to file: {}", path),
                                            channel_id: Some(channel_id),
                                        });
                                    }
                                }
                            }
                        },
                        crate::storage::models::DestinationType::Http { url, method } => {
                             let sender = HttpSender::new(url.clone(), method.clone());
                             if let Err(e) = sender.send(&msg).await {
                                tracing::error!("Destination HTTP failed: {}", e);
                             }
                        },
                        _ => tracing::warn!("Destination type not implemented yet"),
                    }
                }
            }
        });

        // Store handle
        self.channels.lock().unwrap().insert(channel_id, handle);

        Ok(())
    }

    pub async fn inject_message(&self, channel_id: Uuid, payload: String) -> anyhow::Result<()> {
        let sender = {
            let senders = self.senders.lock().unwrap();
            senders.get(&channel_id).cloned()
        };

        if let Some(tx) = sender {
             let msg = crate::engine::message::Message::new(channel_id, payload);
            tx.send(msg).await.map_err(|_| anyhow::anyhow!("Channel receiver dropped"))?;
            self.add_log("INFO", "Manual message injected".to_string(), Some(channel_id));
            Ok(())
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
}

