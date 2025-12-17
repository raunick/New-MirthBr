use axum::{
    extract::{State, Path, Query},
    Json,
    http::StatusCode,
};
use std::sync::Arc;
use crate::engine::channel_manager::ChannelManager;
use crate::storage::messages::{MessageRecord, MessageStatus};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ListMessagesQuery {
    pub channel_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i32>,
}

pub async fn list_messages(
    State(manager): State<Arc<ChannelManager>>,
    Query(params): Query<ListMessagesQuery>,
) -> Result<Json<Vec<MessageRecord>>, StatusCode> {
    match manager.list_messages(params.channel_id, params.status, params.limit.unwrap_or(100)).await {
        Ok(messages) => Ok(Json(messages)),
        Err(e) => {
            tracing::error!("Failed to list messages: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn retry_message(
    State(manager): State<Arc<ChannelManager>>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match manager.retry_message(id).await {
        Ok(_) => Ok(Json(serde_json::json!({ "status": "success", "message": "Message queued for retry" }))),
        Err(e) => {
            tracing::error!("Failed to retry message: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
