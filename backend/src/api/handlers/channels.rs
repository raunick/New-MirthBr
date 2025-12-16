use axum::{Json, extract::State, response::IntoResponse, http::StatusCode};
use std::sync::Arc;
use uuid::Uuid;
use crate::engine::channel_manager::ChannelManager;
use crate::storage::models::Channel;

/// Generate a unique error ID for logging
fn generate_error_id() -> String {
    Uuid::new_v4().to_string()[..8].to_string()
}

pub async fn create_channel(
    State(manager): State<Arc<ChannelManager>>,
    Json(payload): Json<Channel>
) -> impl IntoResponse {
    tracing::info!("📥 Received deploy request for channel: {:?}", payload.name);
    
    match manager.start_channel(payload.clone()).await {
        Ok(_) => {
            tracing::info!("✅ Channel {} deployed successfully", payload.id);
            (
                StatusCode::OK,
                Json(serde_json::json!({ 
                    "status": "deployed", 
                    "id": payload.id,
                    "message": "Channel deployed successfully"
                }))
            )
        },
        Err(e) => {
            // Generate error ID and log full details internally
            let error_id = generate_error_id();
            tracing::error!(
                error_id = %error_id,
                channel_id = %payload.id,
                channel_name = %payload.name,
                error = ?e,
                "Failed to deploy channel"
            );
            
            // Return sanitized error to client
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ 
                    "status": "error", 
                    "error_id": error_id,
                    "message": "Failed to deploy channel. Check server logs or contact support with error_id."
                }))
            )
        }
    }
}

pub async fn list_channels() -> impl IntoResponse {
    // TODO: Fetch from DB
    Json(serde_json::json!([
        { "id": "1", "name": "Test Channel" }
    ]))
}
