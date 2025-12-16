use axum::{
    extract::{Path, State},
    Json,
    http::StatusCode,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;
use crate::engine::channel_manager::ChannelManager;

/// Maximum payload size (1MB)
const MAX_PAYLOAD_SIZE: usize = 1024 * 1024;

/// Allowed payload types
const ALLOWED_PAYLOAD_TYPES: &[&str] = &["hl7", "fhir", "json", "xml", "text", "raw"];

#[derive(Deserialize)]
pub struct TestMessageRequest {
    pub payload_type: String,
    pub payload: String,
}

impl TestMessageRequest {
    /// Validate the request
    fn validate(&self) -> Result<(), String> {
        // Validate payload_type
        let payload_type_lower = self.payload_type.to_lowercase();
        if !ALLOWED_PAYLOAD_TYPES.contains(&payload_type_lower.as_str()) {
            return Err(format!(
                "Invalid payload_type '{}'. Allowed types: {:?}",
                self.payload_type, ALLOWED_PAYLOAD_TYPES
            ));
        }

        // Validate payload size
        if self.payload.len() > MAX_PAYLOAD_SIZE {
            return Err(format!(
                "Payload too large. Maximum size is {} bytes, got {} bytes",
                MAX_PAYLOAD_SIZE,
                self.payload.len()
            ));
        }

        // Validate payload is not empty
        if self.payload.trim().is_empty() {
            return Err("Payload cannot be empty".to_string());
        }

        Ok(())
    }
}

/// Generate a unique error ID for logging
fn generate_error_id() -> String {
    Uuid::new_v4().to_string()[..8].to_string()
}

pub async fn test_channel(
    State(manager): State<Arc<ChannelManager>>,
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<TestMessageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Validate input
    if let Err(validation_error) = payload.validate() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "error": "validation_failed",
                "message": validation_error
            }))
        ));
    }

    match manager.inject_message(channel_id, payload.payload).await {
        Ok(_) => Ok(Json(serde_json::json!({ 
            "success": true, 
            "message": "Message injected successfully" 
        }))),
        Err(e) => {
            // Log the full error internally with an error ID
            let error_id = generate_error_id();
            tracing::error!(
                error_id = %error_id,
                channel_id = %channel_id,
                error = ?e,
                "Failed to inject message"
            );
            
            // Return generic error message to client
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ 
                    "success": false, 
                    "error": "injection_failed",
                    "error_id": error_id,
                    "message": "Failed to inject message. Contact support with error_id."
                }))
            ))
        }
    }
}

