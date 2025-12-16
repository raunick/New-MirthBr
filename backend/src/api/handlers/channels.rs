use axum::{Json, extract::State, response::IntoResponse, http::StatusCode};
use std::sync::Arc;
use uuid::Uuid;
use crate::engine::channel_manager::ChannelManager;
use crate::storage::models::Channel;

/// Generate a unique error ID for logging
fn generate_error_id() -> String {
    Uuid::new_v4().to_string()[..8].to_string()
}

#[derive(serde::Deserialize)]
pub struct DeployRequest {
    pub channel: Channel,
    pub frontend_schema: Option<serde_json::Value>,
}

pub async fn create_channel(
    State(manager): State<Arc<ChannelManager>>,
    Json(payload): Json<DeployRequest>
) -> impl IntoResponse {
    let channel = payload.channel;
    tracing::info!("📥 Received deploy request for channel: {:?}", channel.name);
    
    match manager.start_channel(channel.clone(), payload.frontend_schema).await {
        Ok(_) => {
            tracing::info!("✅ Channel {} deployed successfully", channel.id);
            (
                StatusCode::OK,
                Json(serde_json::json!({ 
                    "status": "deployed", 
                    "id": channel.id,
                    "message": "Channel deployed successfully"
                }))
            )
        },
        Err(e) => {
            // Generate error ID and log full details internally
            let error_id = generate_error_id();
            tracing::error!(
                error_id = %error_id,
                channel_id = %channel.id,
                channel_name = %channel.name,
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

pub async fn list_channels(State(manager): State<Arc<ChannelManager>>) -> impl IntoResponse {
    // If DB is available, return all channels
    // We cannot access manager.db directly because it's private, but we can assume we only want
    // to list channels if we have the DB.
    // However, since `manager` has the DB, we might want to expose a method on manager
    // or just execute a query directly if we had the pool.
    // But since `db` is private in `ChannelManager` and we don't have a getter, 
    // we should really be passing the DB pool to the handlers or exposing a method on ChannelManager.
    // For now, let's expose `get_channels_from_db` on ChannelManager or make `db` public.
    // Making `db` public/accessible is easier.
    
    // Actually, let's check ChannelManager again. 
    // I previously injected `db` into `ChannelManager`. 
    // I should add a method `get_stored_channels` to `ChannelManager`.
    
    match manager.get_stored_channels().await {
        Ok(channels) => {
            let response_list: Vec<serde_json::Value> = channels.into_iter().map(|(id, name, config, schema)| {
                serde_json::json!({
                    "id": id,
                    "name": name,
                    "config": config,
                    "frontend_schema": schema
                })
            }).collect();
             Json(response_list)
        },
        Err(_) => {
             Json(vec![])
        }
    }
}
