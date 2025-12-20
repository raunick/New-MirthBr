use std::sync::Arc;
use uuid::Uuid;
use crate::engine::channel_manager::ChannelManager;
use crate::storage::models::{Channel, SourceConfig, ProcessorConfig, ProcessorType, DestinationConfig, DestinationType};

/// Fixed UUID for the "Hello World" channel to ensure idempotency.
/// using a nil-like but valid UUID: 00000000-0000-0000-0000-000000000001
pub const HELLO_WORLD_CHANNEL_ID: Uuid = Uuid::from_u128(1); 

pub async fn ensure_default_channels(channel_manager: Arc<ChannelManager>) {
    tracing::info!("Ensuring default channels exist...");

    // Check if Hello World channel exists
    match channel_manager.get_channel_by_id(HELLO_WORLD_CHANNEL_ID).await {
        Ok(Some(_)) => {
            tracing::info!("✅ Default 'Hello World' channel already exists. Skipping creation.");
        },
        Ok(None) => {
            tracing::info!("✨ Creating default 'Hello World' channel...");
            
            let hello_channel = Channel {
                id: HELLO_WORLD_CHANNEL_ID,
                name: "Hello World Channel".to_string(),
                enabled: true,
                source: SourceConfig::Http { 
                    port: 8090, 
                    path: None, 
                    cert_path: None, 
                    key_path: None 
                },
                processors: vec![
                    ProcessorConfig {
                        id: "proc-1".to_string(),
                        name: "Uppercaser".to_string(),
                        kind: ProcessorType::Lua { 
                            code: "return msg.content:upper()".to_string() 
                        }
                    }
                ],
                destinations: vec![
                    DestinationConfig {
                        id: "dest-1".to_string(),
                        name: "File Out".to_string(),
                        kind: DestinationType::File { 
                            path: "./output".to_string(), 
                            filename: None, 
                            append: None, 
                            encoding: None 
                        }
                    }
                ],
                error_destination: None,
                max_retries: Some(3),
            };

            // Pass None for frontend_schema as this is auto-deployed
            if let Err(e) = channel_manager.start_channel(hello_channel, None).await {
                tracing::error!("❌ Failed to start default Hello World channel: {}", e);
            } else {
                tracing::info!("✅ Default Hello World Channel started successfully.");
            }
        },
        Err(e) => {
            tracing::error!("❌ Failed to check for default channel existence: {}", e);
        }
    }
}
