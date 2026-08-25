use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rewear_relay_rig::{build_prompt, validate_plan, RelayPlan, RelayRequest};
use rig::{prelude::*, providers::openai};
use serde::Serialize;
use std::{env, sync::Arc};
use tracing::{error, info};

#[derive(Clone)]
struct AppState {
    model: Option<String>,
}

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
    runtime: &'static str,
    rig_version: &'static str,
    model_configured: bool,
}

struct ApiError {
    status: StatusCode,
    code: &'static str,
}

impl ApiError {
    fn bad_request() -> Self {
        Self { status: StatusCode::BAD_REQUEST, code: "INVALID_RELAY_REQUEST" }
    }

    fn unavailable() -> Self {
        Self { status: StatusCode::SERVICE_UNAVAILABLE, code: "RIG_RUNTIME_UNAVAILABLE" }
    }

    fn invalid_plan() -> Self {
        Self { status: StatusCode::BAD_GATEWAY, code: "RIG_PLAN_REJECTED" }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(serde_json::json!({ "error": self.code }))).into_response()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let model = env::var("RIG_MODEL").ok().filter(|value| !value.trim().is_empty());
    let bind = env::var("RELAY_RIG_BIND").unwrap_or_else(|_| "127.0.0.1:8788".to_string());
    let state = Arc::new(AppState { model });

    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/relay/rank", post(rank))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind).await?;
    info!(bind = %bind, "rewear relay Rig runtime listening");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        runtime: "rig",
        rig_version: "0.42.0",
        model_configured: state.model.is_some() && env::var("OPENAI_API_KEY").is_ok(),
    })
}

async fn rank(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RelayRequest>,
) -> Result<Json<RelayPlan>, ApiError> {
    let prompt = build_prompt(&request).map_err(|cause| {
        error!(error = %cause, "relay request rejected before model execution");
        ApiError::bad_request()
    })?;

    let model = state.model.as_deref().ok_or_else(ApiError::unavailable)?;

    let client = openai::Client::from_env().map_err(|cause| {
        error!(error = %cause, "Rig provider configuration unavailable");
        ApiError::unavailable()
    })?;

    let agent = client
        .agent(model)
        .preamble(
            "You are Rewear Relay's bounded recommendation reasoner. You may rank only supplied candidates. \
             You do not browse, purchase, invoke virtual try-on, change source identity, or claim physical fit. \
             Return only evidence-bounded structured recommendations.",
        )
        .build();

    let plan: RelayPlan = agent.prompt_typed(prompt).await.map_err(|cause| {
        error!(error = %cause, "Rig typed ranking failed");
        ApiError::unavailable()
    })?;

    validate_plan(&request, &plan).map_err(|cause| {
        error!(error = %cause, "Rig plan failed post-model contract validation");
        ApiError::invalid_plan()
    })?;

    Ok(Json(plan))
}
