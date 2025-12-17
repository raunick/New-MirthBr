use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::Response,
};
use std::sync::Arc;
use crate::engine::channel_manager::ChannelManager;
use futures::{sink::SinkExt, stream::StreamExt};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(channel_manager): State<Arc<ChannelManager>>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, channel_manager))
}

async fn handle_socket(mut socket: WebSocket, channel_manager: Arc<ChannelManager>) {
    // Subscribe to metrics
    let mut rx = channel_manager.subscribe_metrics();
    
    while let Ok(msg) = rx.recv().await {
        if let Ok(json) = serde_json::to_string(&msg) {
            if socket.send(Message::Text(json)).await.is_err() {
                 break;
            }
        }
    }
}
