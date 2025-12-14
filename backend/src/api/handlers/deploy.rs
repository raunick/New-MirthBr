use axum::response::IntoResponse;

pub async fn deploy_channel() -> impl IntoResponse {
    "Deployed"
}
