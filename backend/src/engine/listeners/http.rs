use axum::{
    routing::post,
    Router,
    extract::State,
};
use std::net::SocketAddr;
use tokio::sync::mpsc;
use crate::engine::message::Message;
use uuid::Uuid;
use std::sync::Arc;
use axum::http::Method;

pub struct HttpListener {
    pub port: u16,
    pub path: String,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
}

use tower_http::cors::CorsLayer;

impl HttpListener {

    pub async fn start(&self) {
        let app = Router::new()
            .route(&self.path, post(handler))
            .layer(
                CorsLayer::new()
                    .allow_origin(tower_http::cors::Any)
                    .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                    .allow_headers(tower_http::cors::Any)
            ) // Add CORS explicitly
            .with_state(AppState {
                channel_id: self.channel_id,
                sender: self.sender.clone(),
            });

        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        tracing::info!("Channel {} listening on HTTP port {}", self.channel_id, self.port);

        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                tracing::error!("Failed to bind port {} for channel {}: {}", self.port, self.channel_id, e);
                return;
            }
        };
        
        // Spawn the server in a new task
        tokio::spawn(async move {
            if let Err(e) = axum::serve(listener, app).await {
                tracing::error!("Channel server error: {}", e);
            }
        });
    }
}

#[derive(Clone)]
struct AppState {
    channel_id: Uuid,
    sender: mpsc::Sender<Message>,
}

async fn handler(
    State(state): State<AppState>,
    body: String
) -> &'static str {
    let msg = Message::new(state.channel_id, body);
    
    // Send to channel processing loop
    if let Err(e) = state.sender.send(msg).await {
        tracing::error!("Failed to send message to channel pipeline: {}", e);
        return "Internal Error";
    }

    "Received"
}
