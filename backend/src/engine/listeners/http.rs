use axum::{
    routing::post,
    Router,
    extract::{State, ConnectInfo},
    http::{header::{CONTENT_TYPE, AUTHORIZATION}, HeaderValue, Method, StatusCode},
};
use std::net::SocketAddr;
use std::time::Duration;
use tokio::sync::mpsc;
use crate::engine::message::Message;
use crate::storage::messages::MessageStore;
use uuid::Uuid;
use tower_http::cors::CorsLayer;
use tower_http::limit::RequestBodyLimitLayer;
use std::sync::{Arc, Mutex};

/// Maximum request body size (1MB)
const MAX_BODY_SIZE: usize = 1024 * 1024;

use crate::config::TlsConfig;

pub struct HttpListener {
    pub port: u16,
    pub path: String,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
    pub allowed_origins: Option<Vec<String>>,
    pub store: Option<MessageStore>,
    pub tls_config: Option<TlsConfig>,
}

impl HttpListener {
    pub fn new(port: u16, path: String, channel_id: Uuid, sender: mpsc::Sender<Message>, store: Option<MessageStore>, tls_config: Option<TlsConfig>) -> Self {
        Self {
            port,
            path,
            channel_id,
            sender,
            allowed_origins: None,
            store,
            tls_config,
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
                port: self.port,
                path: self.path.clone(),
                store: self.store.clone(),
            });

        // Configurable bind address for listeners
        let bind_addr: std::net::IpAddr = std::env::var("LISTENER_BIND_ADDRESS")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)));

        let addr = SocketAddr::from((bind_addr, self.port));
        
        if let Some(tls_config) = &self.tls_config {
            tracing::info!("🔒 Channel {} listening on HTTPS {}:{}", self.channel_id, bind_addr, self.port);
            
            // Load TLS Config
            let rustls_config = match axum_server::tls_rustls::RustlsConfig::from_pem_file(
                &tls_config.cert_path,
                &tls_config.key_path
            ).await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("❌ Failed to load TLS certificates for channel {}: {}", self.channel_id, e);
                    return;
                }
            };

            // Spawn HTTPS server
            tokio::spawn(async move {
                if let Err(e) = axum_server::bind_rustls(addr, rustls_config)
                    .serve(app.into_make_service_with_connect_info::<SocketAddr>())
                    .await 
                {
                    tracing::error!("Channel HTTPS server error: {}", e);
                }
            });

        } else {
            tracing::info!("📡 Channel {} listening on HTTP {}:{}", self.channel_id, bind_addr, self.port);

            let listener = match tokio::net::TcpListener::bind(addr).await {
                Ok(l) => l,
                Err(e) => {
                    tracing::error!("❌ Failed to bind port {} for channel {}: {}", self.port, self.channel_id, e);
                    return;
                }
            };
            
            // Spawn HTTP server
            tokio::spawn(async move {
                if let Err(e) = axum::serve(
                    listener,
                    app.into_make_service_with_connect_info::<SocketAddr>()
                ).await {
                    tracing::error!("Channel HTTP server error: {}", e);
                }
            });
        }
    }
}

#[derive(Clone)]
struct AppState {
    channel_id: Uuid,
    sender: mpsc::Sender<Message>,
    port: u16,
    path: String,
    store: Option<MessageStore>,
}

async fn handler(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    body: String
) -> impl axum::response::IntoResponse {
    let origin = format!("HTTP :{}{} from {}", state.port, state.path, addr.ip());
    
    // 1. Persist Message
    let mut msg_id_str = Uuid::new_v4().to_string(); // Default if not using store
    
    if let Some(s) = &state.store {
        match s.save_message(&state.channel_id.to_string(), &body).await {
            Ok(id) => {
                msg_id_str = id;
                tracing::info!("HTTP Message persisted to disk with ID: {}", msg_id_str);
            },
            Err(e) => {
                 tracing::error!("CRITICAL: Failed to persist HTTP message: {}", e);
                 return (StatusCode::INTERNAL_SERVER_ERROR, "Persistence Failed".to_string());
            }
        }
    }

    // 2. create Message
    let mut msg = Message::new(state.channel_id, body, origin);
    // Override ID
    if let Ok(uuid) = Uuid::parse_str(&msg_id_str) {
        msg.id = uuid;
    }
    
    // 3. Prepare Response Channel (Sync Wait)
    let (tx, rx) = tokio::sync::oneshot::channel();
    msg.response_tx = Some(Arc::new(Mutex::new(Some(tx))));

    // 4. Send to channel processing loop
    if let Err(e) = state.sender.send(msg).await {
        tracing::error!("Failed to send message to channel pipeline: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Internal Error".to_string());
    }

    // 5. Wait for Result (Sync Mode)
    // Wait up to 30 seconds for processing
    match tokio::time::timeout(Duration::from_secs(30), rx).await {
        Ok(result) => {
            match result {
                Ok(Ok(_)) => (StatusCode::OK, "Message Processed Successfully".to_string()),
                Ok(Err(error_msg)) => {
                    tracing::warn!("Request failed validation/processing: {}", error_msg);
                    (StatusCode::BAD_REQUEST, error_msg) 
                },
                Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Channel Dropped Response".to_string()),
            }
        },
        Err(_) => {
             tracing::error!("Request timed out waiting for processing");
             (StatusCode::GATEWAY_TIMEOUT, "Processing Timeout".to_string())
        }
    }
}

