use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;
use crate::engine::channel_manager::ChannelManager;

#[derive(Deserialize)]
pub struct TestMessageRequest {
    pub payload_type: String, // e.g., "hl7", "json", etc. (Logged but not strictly validated yet)
    pub payload: String,
}

pub async fn test_channel(
    State(manager): State<Arc<ChannelManager>>,
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<TestMessageRequest>,
) -> Json<serde_json::Value> {
    match manager.inject_message(channel_id, payload.payload).await {
        Ok(_) => Json(serde_json::json!({ "success": true, "message": "Message injected" })),
        Err(e) => Json(serde_json::json!({ "success": false, "error": e.to_string() })),
    }
}
