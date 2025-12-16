use crate::engine::message::Message;
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;

use chrono::Utc;

pub struct FileWriter {
    path: String,
    filename_pattern: Option<String>,
}

impl FileWriter {
    pub fn new(path: String, filename_pattern: Option<String>) -> Self {
        Self { path, filename_pattern }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        let full_path_str = if let Some(pattern) = &self.filename_pattern {
            let mut filename = pattern.clone();
            // Replace variables
            if filename.contains("${timestamp}") {
                let ts = Utc::now().format("%Y%m%d-%H%M%S").to_string();
                filename = filename.replace("${timestamp}", &ts);
            }
            if filename.contains("${id}") {
                filename = filename.replace("${id}", &msg.id.to_string());
            }
            
            let dir = std::path::Path::new(&self.path);
            dir.join(filename).to_string_lossy().to_string()
        } else {
            self.path.clone()
        };

        let path = std::path::Path::new(&full_path_str);
        if let Some(parent) = path.parent() {
            if let Err(e) = tokio::fs::create_dir_all(parent).await {
                // Improve error if parent exists but is a file
                if e.kind() == std::io::ErrorKind::AlreadyExists {
                    if let Ok(metadata) = tokio::fs::metadata(parent).await {
                        if !metadata.is_dir() {
                            let msg = format!("Cannot create directory {:?} because a file with that name exists. Please delete the file or change the path.", parent);
                            tracing::error!("{}", msg);
                            return Err(anyhow::anyhow!(msg));
                        }
                    }
                }
                return Err(e.into());
            }
        }

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&full_path_str)
            .await?;

        file.write_all(msg.content.as_bytes()).await?;
        file.write_all(b"\n").await?;
        
        tracing::info!("Written to file: {}", full_path_str);
        Ok(())
    }
}
