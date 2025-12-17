use std::sync::Arc;
use tokio::time::{interval, Duration};
use crate::storage::deduplication::DeduplicationStore;

/// Background worker to clean up expired deduplication entries
pub struct CleanupWorker {
    dedup_store: Arc<DeduplicationStore>,
    interval_hours: u64,
}

impl CleanupWorker {
    pub fn new(dedup_store: Arc<DeduplicationStore>) -> Self {
        Self {
            dedup_store,
            interval_hours: 1, // Run every hour
        }
    }

    pub fn with_interval(dedup_store: Arc<DeduplicationStore>, interval_hours: u64) -> Self {
        Self { dedup_store, interval_hours }
    }

    pub async fn start(&self) {
        let mut ticker = interval(Duration::from_secs(self.interval_hours * 3600));
        
        tracing::info!("CleanupWorker started, running every {} hour(s)", self.interval_hours);

        loop {
            ticker.tick().await;
            
            match self.dedup_store.cleanup_expired().await {
                Ok(count) => {
                    if count > 0 {
                        tracing::info!("CleanupWorker: Removed {} expired deduplication entries", count);
                    }
                }
                Err(e) => {
                    tracing::error!("CleanupWorker: Failed to cleanup expired entries: {}", e);
                }
            }
        }
    }
}
