use axum::{
    routing::{get, post},
    Router,
    http::{Request, StatusCode, HeaderValue},
    middleware::{self, Next},
    response::Response,
};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tower_http::cors::{CorsLayer, Any};

mod api;
mod config;
mod engine;
mod storage;
mod lua_helpers;
mod logging;

use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use crate::storage::logs::LogEntry;

/// Get API key from environment - REQUIRED in production
/// Called once at startup
fn get_api_key() -> String {
    match std::env::var("API_KEY") {
        Ok(key) if key.len() >= 32 => key,
        Ok(key) if !key.is_empty() => {
            tracing::warn!("API_KEY is set but less than 32 characters. Consider using a stronger key.");
            key
        }
        _ => {
            // In development, allow a default key with warning
            if std::env::var("RUST_ENV").unwrap_or_default() == "production" {
                panic!("FATAL: API_KEY environment variable MUST be set in production. Generate with: openssl rand -base64 32");
            }
            tracing::warn!("⚠️  Using default API key for development. Set API_KEY env var for production!");
            "dev-key-change-in-production-32chars".to_string()
        }
    }
}

/// Shared API key state
#[derive(Clone)]
struct ApiKeyState(String);

// Auth Middleware
async fn auth_middleware(
    axum::extract::State(api_key_state): axum::extract::State<ApiKeyState>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req.headers().get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(t) => Some(t),
        None => {
            // Fallback to query param 'token' (e.g. for WebSocket)
            req.uri().query().and_then(|q| {
                url::form_urlencoded::parse(q.as_bytes())
                    .find(|(k, _)| k == "token")
                    .map(|(_, v)| v.into_owned())
            }).as_deref().map(|s| &*Box::leak(s.to_string().into_boxed_str())); // A bit hacky to extend lifetime, but we just need to compare.
            // Actually, we can just return String from helper or handle lifetime better.
            // Simplified approach: don't leak, just compare below.
            // Let's refactor the match block instead.
            None
        }
    };
    
    // Easier way: get string value
    let token_str = if let Some(h) = auth_header {
        Some(h.to_string())
    } else {
         req.uri().query().and_then(|q| {
             url::form_urlencoded::parse(q.as_bytes())
                .find(|(k, _)| k == "token")
                .map(|(_, v)| v.into_owned())
         })
    };

    match token_str {
        Some(token) if token == api_key_state.0 => {
            Ok(next.run(req).await)
        }
        _ => {
            tracing::warn!("Unauthorized access attempt from {:?}", req.headers().get("x-forwarded-for"));
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

#[tokio::main]
async fn main() {
    // Shared Log Buffer
    let log_buffer = Arc::new(Mutex::new(VecDeque::with_capacity(100)));
    
    // Initialize logging with two layers: stdout and memory buffer
    let fmt_layer = tracing_subscriber::fmt::layer();
    let memory_layer = logging::VecDequeLayer {
        logs: log_buffer.clone(),
    };

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mirthbr_backend=info,tower_http=debug".into()),
        )
        .with(fmt_layer)
        .with(memory_layer)
        .init();

    tracing::info!("Starting MirthBR Backend...");

    tracing::info!("Starting MirthBR Backend...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:mirth.db".to_string());
    let db = match storage::db::Database::new(&database_url).await {
        Ok(db) => {
            tracing::info!("Database connected successfully.");
            Some(db)
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            None
        }
    };
    
    // Load channels from DB if present
    let mut initial_channels = Vec::new();
    if let Some(ref db) = db {
        match db.get_all_channels().await {
            Ok(channels) => {
                tracing::info!("Found {} channels in database", channels.len());
                for (id, name, config, _) in channels {
                    if let Ok(channel) = serde_json::from_value::<storage::models::Channel>(config) {
                        initial_channels.push(channel);
                    } else {
                        tracing::error!("Failed to deserialize config for channel {}", name);
                    }
                }
            },
            Err(e) => tracing::error!("Failed to load channels from db: {}", e),
        }
    }

    let channel_manager = std::sync::Arc::new(engine::channel_manager::ChannelManager::new(db.clone(), log_buffer));

    // Deploy loaded channels
    for channel in initial_channels {
        tracing::info!("Deploying stored channel: {}", channel.name);
        if let Err(e) = channel_manager.start_channel(channel, None).await {
            tracing::error!("Failed to start stored channel: {}", e);
        }
    }
    
    // Trigger Recovery of Pending Messages
    channel_manager.recover_pending_messages().await;

    // Start Retry Worker
    if let Some(ref database) = db {
        let retry_pool = database.pool.clone();
        let retry_senders = channel_manager.get_senders();
        let worker = engine::retry_worker::RetryWorker::new(retry_pool, retry_senders);
        tokio::spawn(async move {
            worker.start().await;
        });
        tracing::info!("RetryWorker started");
    }

    // Start CleanupWorker for deduplication entries
    if let Some(dedup_store) = channel_manager.get_dedup_store() {
        let worker = engine::cleanup_worker::CleanupWorker::new(dedup_store);
        tokio::spawn(async move {
            worker.start().await;
        });
        tracing::info!("CleanupWorker started");
    }

    // Auto-deploy "Hello World" Channel
    let hello_channel = storage::models::Channel {
        id: uuid::Uuid::new_v4(), // or fixed: uuid::uuid!("...")
        name: "Hello World Channel".to_string(),
        enabled: true,
        source: storage::models::SourceConfig::Http { port: 8090, path: None, cert_path: None, key_path: None },
        processors: vec![
            storage::models::ProcessorConfig {
                id: "proc-1".to_string(),
                name: "Uppercaser".to_string(),
                kind: storage::models::ProcessorType::Lua { code: "return msg.content:upper()".to_string() }
            }
        ],
        destinations: vec![
            storage::models::DestinationConfig {
                id: "dest-1".to_string(),
                name: "File Out".to_string(),
                kind: storage::models::DestinationType::File { path: "./output".to_string(), filename: None, append: None, encoding: None }
            }
        ],
        error_destination: None,
        max_retries: Some(3),
    };

    tracing::info!("Auto-deploying Hello World Channel on Port 8090...");
    // Pass None for frontend_schema as this is auto-deployed
    if let Err(e) = channel_manager.start_channel(hello_channel, None).await {
        tracing::error!("Failed to start Hello World channel: {}", e);
    }

    // CORS: Allow only frontend (localhost:3000)
    let cors = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_methods(Any)
        .allow_headers(Any);

    // Get API key once at startup
    let api_key = ApiKeyState(get_api_key());

    // Protected API routes
    let protected_routes = Router::new()
        .route("/channels", post(api::handlers::channels::create_channel))
        .route("/channels", get(api::handlers::channels::list_channels))
        .route("/channels/status", get(api::handlers::channels::get_active_channels))
        .route("/channels/:id/start", post(api::handlers::channels::start_channel))
        .route("/channels/:id/stop", post(api::handlers::channels::stop_channel))
        .route("/channels/:id/test", post(api::handlers::test::test_channel))
        .route("/test/tcp", post(api::handlers::test::test_tcp_dispatch))
        .route("/logs", get(api::handlers::logs::get_logs))
        .route("/messages", get(api::messages::list_messages))
        .route("/messages/:id/retry", post(api::messages::retry_message))
        .route("/ws/metrics", get(api::handlers::websocket::ws_handler))
        .layer(middleware::from_fn_with_state(api_key, auth_middleware));

    // Build our application
    let app = Router::new()
        .route("/api/health", get(health_check))
        .nest("/api", protected_routes) // Nests under /api, so /channels becomes /api/channels
        .layer(cors)
        .with_state(channel_manager.clone());

    // Run it with hyper - configurable bind address
    let bind_addr: std::net::IpAddr = std::env::var("BIND_ADDRESS")
        .unwrap_or_else(|_| "127.0.0.1".to_string())
        .parse()
        .expect("Invalid BIND_ADDRESS format");
    
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse()
        .expect("Invalid PORT format");
    
    let addr = SocketAddr::from((bind_addr, port));
    
    // Config TLS
    let cert_path = std::env::var("TLS_CERT_PATH").ok();
    let key_path = std::env::var("TLS_KEY_PATH").ok();

    if let (Some(cert), Some(key)) = (cert_path, key_path) {
        tracing::info!("🔒 Server listening on HTTPS {}", addr);
        use axum_server::tls_rustls::RustlsConfig;
        
        let config = RustlsConfig::from_pem_file(cert, key).await.expect("Failed to load TLS keys");
        
        let handle = axum_server::Handle::new();
        let shutdown_handle = handle.clone();
        let cm = channel_manager.clone();
        
        tokio::spawn(async move {
            shutdown_signal(cm).await;
            shutdown_handle.graceful_shutdown(None);
        });

        axum_server::bind_rustls(addr, config)
            .handle(handle)
            .serve(app.into_make_service())
            .await
            .unwrap();
    } else {
        tracing::info!("🚀 Server listening on {}", addr);
        tracing::info!("📝 Set BIND_ADDRESS=0.0.0.0 to listen on all interfaces");
        
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal(channel_manager))
            .await
            .unwrap();
    }
}

async fn health_check() -> &'static str {
    "OK"
}

async fn shutdown_signal(channel_manager: Arc<engine::channel_manager::ChannelManager>) {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("🛑 Signal received, starting graceful shutdown...");
    
    // Create a timeout for the shutdown process
    let cm = channel_manager.clone();
    tokio::select! {
        _ = cm.shutdown_all() => {
            tracing::info!("✅ Channel Manager shutdown complete.");
        },
        _ = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
            tracing::warn!("⚠️ Shutdown timed out after 10s, forcing exit...");
        }
    }
    
    tracing::info!("Stopping API server...");
}
