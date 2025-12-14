use axum::{Json, extract::State, response::IntoResponse};
// use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::engine::channel_manager::ChannelManager;
use crate::storage::models::Channel;

pub async fn create_channel(
    State(manager): State<Arc<ChannelManager>>,
    Json(payload): Json<Channel>
) -> impl IntoResponse {
    tracing::info!("Received deploy request for channel: {}", payload.name);
    
    // In a real app we would save to DB first.
    // Here we just start it in memory.
    
    match manager.start_channel(payload.clone()).await {
        Ok(_) => {
            Json(serde_json::json!({ "status": "deployed", "id": payload.id }))
        },
        Err(e) => {
            tracing::error!("Failed to deploy: {}", e);
             Json(serde_json::json!({ "status": "error", "message": e.to_string() }))
        }
    }
}

pub async fn list_channels() -> impl IntoResponse {
    // TODO: Fetch from DB
    Json(serde_json::json!([
        { "id": "1", "name": "Test Channel" }
    ]))
}

