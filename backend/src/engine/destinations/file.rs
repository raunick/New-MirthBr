use crate::engine::message::Message;
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;

pub struct FileWriter {
    path: String,
}

impl FileWriter {
    pub fn new(path: String) -> Self {
        Self { path }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
            .await?;

        file.write_all(msg.content.as_bytes()).await?;
        file.write_all(b"\n").await?;
        
        tracing::info!("Written to file: {}", self.path);
        Ok(())
    }
}
