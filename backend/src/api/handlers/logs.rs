use axum::{
    extract::State,
    Json,
};
use std::sync::Arc;
use crate::engine::channel_manager::ChannelManager;
use crate::storage::logs::LogEntry;

pub async fn get_logs(
    State(manager): State<Arc<ChannelManager>>
) -> Json<Vec<LogEntry>> {
    let mut logs = manager.get_logs();
    // Sort by timestamp desc
    logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Json(logs)
}
