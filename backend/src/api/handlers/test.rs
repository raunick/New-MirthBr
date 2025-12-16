use axum::{
    extract::{Path, State},
    Json,
    http::StatusCode,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;
use crate::engine::channel_manager::ChannelManager;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::{timeout, Duration};


/// Maximum payload size (1MB)
const MAX_PAYLOAD_SIZE: usize = 1024 * 1024;

/// Allowed payload types
const ALLOWED_PAYLOAD_TYPES: &[&str] = &["hl7", "fhir", "json", "xml", "text", "raw"];

#[derive(Deserialize)]
pub struct TestMessageRequest {
    pub payload_type: String,
    pub payload: String,
}

#[derive(Deserialize)]
pub struct TestTcpRequest {
    pub host: String,
    pub port: u16,
    pub payload: String,
    pub timeout_seconds: Option<u64>,
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


pub async fn test_tcp_dispatch(
    Json(req): Json<TestTcpRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let timeout_duration = Duration::from_secs(req.timeout_seconds.unwrap_or(30));
    let addr = format!("{}:{}", req.host, req.port);

    // MLLP wrappers
    let sb = b"\x0B";
    let eb_cr = b"\x1C\x0D";
    
    // Prepare message (replace \n with \r as per HL7 standard if needed, or just send valid HL7)
    // Most devices expect \r as segment terminator.
    let payload = req.payload.replace('\n', "\r");
    let mut message = Vec::new();
    message.extend_from_slice(sb);
    message.extend_from_slice(payload.as_bytes());
    message.extend_from_slice(eb_cr);

    let result = timeout(timeout_duration, async {
        let mut stream = TcpStream::connect(&addr).await.map_err(|e| format!("Connection failed: {}", e))?;
        
        stream.write_all(&message).await.map_err(|e| format!("Write failed: {}", e))?;
        
        // Read response
        let mut buffer = Vec::new();
        let mut temp_buf = [0u8; 1024];
        
        // Simple read loop - in production needs better framing detection
        // For now, read until we see end block or timeout
        loop {
            let n = stream.read(&mut temp_buf).await.map_err(|e| format!("Read failed: {}", e))?;
            if n == 0 {
                break; // Connection closed
            }
            buffer.extend_from_slice(&temp_buf[0..n]);
            
            // Check for end block
            if buffer.windows(2).any(|w| w == b"\x1C\x0D") {
                break;
            }
        }
        
        Ok::<Vec<u8>, String>(buffer)
    }).await;

    match result {
        Ok(Ok(response_bytes)) => {
            // Unwrap MLLP
            let response_str = String::from_utf8_lossy(&response_bytes);
            let clean_response = response_str
                .trim_start_matches('\x0B')
                .trim_end_matches('\r')
                .trim_end_matches('\n') // Handle potential trailing newlines
                .trim_end_matches('\x1C'); // Remove FS
                
            Ok(Json(serde_json::json!({
                "success": true,
                "response": clean_response,
                "raw_response": response_str
            })))
        },
        Ok(Err(e)) => Err((
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "success": false,
                "error": e
            }))
        )),
        Err(_) => Err((
            StatusCode::GATEWAY_TIMEOUT,
            Json(serde_json::json!({
                "success": false,
                "error": "Operation timed out"
            }))
        )),
    }
}
