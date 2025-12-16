use axum::{
    routing::post,
    Router,
    extract::State,
    http::{header::{CONTENT_TYPE, AUTHORIZATION}, HeaderValue, Method},
};
use std::net::SocketAddr;
use std::time::Duration;
use tokio::sync::mpsc;
use crate::engine::message::Message;
use uuid::Uuid;
use tower_http::cors::CorsLayer;
use tower_http::limit::RequestBodyLimitLayer;

/// Maximum request body size (1MB)
const MAX_BODY_SIZE: usize = 1024 * 1024;

pub struct HttpListener {
    pub port: u16,
    pub path: String,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
    pub allowed_origins: Option<Vec<String>>,
}

impl HttpListener {
    pub fn new(port: u16, path: String, channel_id: Uuid, sender: mpsc::Sender<Message>) -> Self {
        Self {
            port,
            path,
            channel_id,
            sender,
            allowed_origins: None,
        }
    }

    /// Build a secure CORS layer based on allowed origins configuration
    fn build_cors_layer(&self) -> CorsLayer {
        // In development mode, allow all origins for easier testing
        let is_dev = std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()) != "production";
        
        if is_dev {
            // Development mode: Permissive CORS for local testing
            tracing::info!(
                "Channel {}: CORS open for development (all origins allowed)",
                self.channel_id
            );
            CorsLayer::new()
                .allow_origin(tower_http::cors::Any)
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
                .allow_headers([CONTENT_TYPE, AUTHORIZATION])
                .max_age(Duration::from_secs(3600))
        } else {
            // Production mode: Strict CORS
            match &self.allowed_origins {
                Some(origins) if !origins.is_empty() => {
                    // Parse allowed origins into HeaderValues
                    let parsed_origins: Vec<HeaderValue> = origins
                        .iter()
                        .filter_map(|o| o.parse::<HeaderValue>().ok())
                        .collect();

                    if parsed_origins.is_empty() {
                        tracing::warn!(
                            "Channel {}: No valid CORS origins parsed, defaulting to restrictive policy",
                            self.channel_id
                        );
                        CorsLayer::new()
                            .allow_methods([Method::POST])
                            .allow_headers([CONTENT_TYPE])
                            .max_age(Duration::from_secs(3600))
                    } else {
                        tracing::info!(
                            "Channel {}: CORS enabled for {} origins",
                            self.channel_id,
                            parsed_origins.len()
                        );
                        CorsLayer::new()
                            .allow_origin(parsed_origins)
                            .allow_methods([Method::POST, Method::OPTIONS])
                            .allow_headers([CONTENT_TYPE, AUTHORIZATION])
                            .max_age(Duration::from_secs(3600))
                    }
                }
                _ => {
                    // Default: Restrictive CORS (same-origin only effectively)
                    // No explicit origins = browsers will block cross-origin requests
                    tracing::info!(
                        "Channel {}: CORS restricted (no cross-origin allowed)",
                        self.channel_id
                    );
                    CorsLayer::new()
                        .allow_methods([Method::POST])
                        .allow_headers([CONTENT_TYPE])
                        .max_age(Duration::from_secs(3600))
                }
            }
        }
    }

    pub async fn start(&self) {
        let cors = self.build_cors_layer();

        let app = Router::new()
            .route(&self.path, post(handler))
            .layer(cors)
            .layer(RequestBodyLimitLayer::new(MAX_BODY_SIZE)) // Limit body size
            .with_state(AppState {
                channel_id: self.channel_id,
                sender: self.sender.clone(),
            });

        // Configurable bind address for listeners
        let bind_addr: std::net::IpAddr = std::env::var("LISTENER_BIND_ADDRESS")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)));

        let addr = SocketAddr::from((bind_addr, self.port));
        tracing::info!("📡 Channel {} listening on HTTP {}:{}", self.channel_id, bind_addr, self.port);

        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                tracing::error!("❌ Failed to bind port {} for channel {}: {}", self.port, self.channel_id, e);
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
