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

/// Get API key from environment - REQUIRED in production
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

// Auth Middleware
async fn auth_middleware(req: Request<axum::body::Body>, next: Next) -> Result<Response, StatusCode> {
    let api_key = get_api_key();
    
    let auth_header = req.headers().get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    match auth_header {
        Some(token) if token == api_key => {
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
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mirthbr_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
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

    let channel_manager = std::sync::Arc::new(engine::channel_manager::ChannelManager::new(db));

    // Deploy loaded channels
    for channel in initial_channels {
        tracing::info!("Deploying stored channel: {}", channel.name);
        if let Err(e) = channel_manager.start_channel(channel, None).await {
            tracing::error!("Failed to start stored channel: {}", e);
        }
    }
    
    // Trigger Recovery of Pending Messages
    channel_manager.recover_pending_messages().await;

    // Auto-deploy "Hello World" Channel
    let hello_channel = storage::models::Channel {
        id: uuid::Uuid::new_v4(), // or fixed: uuid::uuid!("...")
        name: "Hello World Channel".to_string(),
        enabled: true,
        source: storage::models::SourceConfig::Http { port: 8090, path: None },
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
                kind: storage::models::DestinationType::File { path: "./output".to_string(), filename: None }
            }
        ],
        error_destination: None,
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

    // Protected API routes
    let protected_routes = Router::new()
        .route("/channels", post(api::handlers::channels::create_channel))
        .route("/channels", get(api::handlers::channels::list_channels))
        .route("/channels/:id/test", post(api::handlers::test::test_channel))
        .route("/test/tcp", post(api::handlers::test::test_tcp_dispatch))
        .route("/logs", get(api::handlers::logs::get_logs))
        .route("/messages", get(api::messages::list_messages))
        .route("/messages/:id/retry", post(api::messages::retry_message))
        .layer(middleware::from_fn(auth_middleware));

    // Build our application
    let app = Router::new()
        .route("/api/health", get(health_check))
        .nest("/api", protected_routes) // Nests under /api, so /channels becomes /api/channels
        .layer(cors)
        .with_state(channel_manager);

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
    tracing::info!("🚀 Server listening on {}", addr);
    tracing::info!("📝 Set BIND_ADDRESS=0.0.0.0 to listen on all interfaces");
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}
