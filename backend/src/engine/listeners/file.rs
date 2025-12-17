use tokio::sync::mpsc;
use crate::engine::message::Message;
use crate::storage::messages::MessageStore;
use uuid::Uuid;
use std::time::Duration;
use glob::glob;
use std::path::Path;

pub struct FileReader {
    pub path: String,
    pub pattern: String,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
    pub store: Option<MessageStore>,
}

impl FileReader {
    pub fn new(
        path: String,
        pattern: Option<String>,
        channel_id: Uuid,
        sender: mpsc::Sender<Message>,
        store: Option<MessageStore>,
    ) -> Self {
        Self {
            path,
            pattern: pattern.unwrap_or_else(|| "*".to_string()),
            channel_id,
            sender,
            store,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        let channel_id = self.channel_id;
        tracing::info!("📂 File Reader watch started on {}/{}", self.path, self.pattern);

        let mut interval = tokio::time::interval(Duration::from_millis(1000)); // Poll every 1s
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        // Ensure directory exists
        if !Path::new(&self.path).exists() {
             tracing::warn!("Warning: Directory {} does not exist. Reader will retry...", self.path);
        }

        loop {
            interval.tick().await;

            let glob_pattern = format!("{}/{}", self.path, self.pattern);
            
            // Note: glob() is synchronous and blocking. In a high-perf scenario, use spawn_blocking.
            // For MVP/lower volume, it's acceptable in async context if directory listing isn't massive.
            // Ideally: use tokio::task::spawn_blocking around glob call.
            
            let paths: Vec<_> = match glob(&glob_pattern) {
                Ok(paths) => paths.filter_map(Result::ok).collect(),
                Err(e) => {
                    tracing::error!("Glob pattern error: {}", e);
                    continue;
                }
            };

            for path in paths {
                if path.is_file() {
                    let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                    
                    // Skip already processed files if pattern overlaps (e.g. * matches *.processed)
                    // Strategy: We strictly rename to .processed, so user pattern shouldn't match .processed ideally.
                    // Or we explicitly check suffix.
                    if file_name.ends_with(".processed") {
                        continue;
                    }

                    tracing::info!("Found file: {:?}", path);

                    // READ content
                    match tokio::fs::read_to_string(&path).await {
                        Ok(content) => {
                            let origin = format!("File: {}", file_name);
                            let mut msg = Message::new(channel_id, content.clone(), origin.clone());

                            // PERSIST
                            if let Some(s) = &self.store {
                                if let Ok(id) = s.save_message(&channel_id.to_string(), &content).await {
                                    if let Ok(uuid) = Uuid::parse_str(&id) {
                                        msg.id = uuid;
                                    }
                                }
                            }

                            // SEND
                            if let Err(e) = self.sender.send(msg).await {
                                tracing::error!("Failed to send file message to pipeline: {}", e);
                                // Don't rename if we failed to enqueue? Or retry?
                                // Break to avoid losing data or infinite loop
                                break;
                            } else {
                                // RENAME on success
                                let mut new_path = path.clone();
                                new_path.set_extension("processed");
                                // Or append extension if you want to keep original extension: input.txt -> input.txt.processed
                                
                                // Proper append style:
                                let new_name = format!("{}.processed", file_name);
                                let new_path_buf = path.with_file_name(new_name);

                                if let Err(e) = tokio::fs::rename(&path, &new_path_buf).await {
                                    tracing::error!("Failed to rename processed file {:?} to {:?}: {}", path, new_path_buf, e);
                                } else {
                                    tracing::info!("Processed file: {:?}", path);
                                }
                            }
                        },
                        Err(e) => {
                            tracing::error!("Failed to read file {:?}: {}", path, e);
                        }
                    }
                }
            }
        }
    }
}
