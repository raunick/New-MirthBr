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

// Auth Middleware
async fn auth_middleware(req: Request<axum::body::Body>, next: Next) -> Result<Response, StatusCode> {
    // Default key for dev simplicity, in prod should be forced env var
    let api_key = std::env::var("API_KEY").unwrap_or_else(|_| "secret-123".to_string());
    
    let auth_header = req.headers().get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    match auth_header {
        Some(token) if token == api_key => {
            Ok(next.run(req).await)
        }
        _ => {
            tracing::warn!("Unauthorized access attempt");
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

    let channel_manager = std::sync::Arc::new(engine::channel_manager::ChannelManager::new());

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
                kind: storage::models::DestinationType::File { path: "hello_output.txt".to_string(), filename: None }
            }
        ]
    };

    tracing::info!("Auto-deploying Hello World Channel on Port 8090...");
    if let Err(e) = channel_manager.start_channel(hello_channel).await {
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
        .route("/logs", get(api::handlers::logs::get_logs))
        .layer(middleware::from_fn(auth_middleware));

    // Build our application
    let app = Router::new()
        .route("/api/health", get(health_check))
        .nest("/api", protected_routes) // Nests under /api, so /channels becomes /api/channels
        .layer(cors)
        .with_state(channel_manager);

    // Run it with hyper on localhost:3000
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::info!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}
