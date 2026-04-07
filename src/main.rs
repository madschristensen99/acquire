use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, env, sync::Arc};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, error};

type Subscriptions = Arc<RwLock<HashMap<String, PushSubscription>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PushSubscription {
    endpoint: String,
    keys: PushKeys,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PushKeys {
    p256dh: String,
    auth: String,
}

#[derive(Debug, Deserialize)]
struct SubscribeRequest {
    endpoint: String,
    keys: PushKeys,
    #[serde(rename = "playerAddress")]
    player_address: String,
}

#[derive(Debug, Deserialize)]
struct UnsubscribeRequest {
    #[serde(rename = "playerAddress")]
    player_address: String,
}

#[derive(Debug, Deserialize)]
struct NotifyRequest {
    #[serde(rename = "playerAddress")]
    player_address: String,
    message: Option<String>,
}

#[derive(Debug, Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();
    
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let subscriptions: Subscriptions = Arc::new(RwLock::new(HashMap::new()));
    
    let port = env::var("NOTIFICATION_PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .unwrap_or(3001);

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/subscribe", post(subscribe))
        .route("/api/unsubscribe", post(unsubscribe))
        .route("/api/notify-turn", post(notify_turn))
        .layer(cors)
        .with_state(subscriptions.clone());

    let addr = format!("0.0.0.0:{}", port);
    info!("🚀 Notification server starting on {}", addr);
    
    let vapid_configured = env::var("VAPID_PUBLIC_KEY").is_ok() 
        && env::var("VAPID_PRIVATE_KEY").is_ok();
    info!("🔑 VAPID configured: {}", vapid_configured);
    
    if !vapid_configured {
        info!("⚠️  VAPID keys not configured!");
        info!("Generate keys with: npm run generate-vapid");
        info!("Then add them to your .env file");
    }

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    // Start blockchain monitoring in background
    let contract_address = env::var("CONTRACT_ADDRESS").ok();
    let rpc_url = env::var("RPC_URL").ok();
    
    if let (Some(addr), Some(url)) = (contract_address, rpc_url) {
        let subs = subscriptions.clone();
        tokio::spawn(async move {
            if let Err(e) = monitor_blockchain_events(addr, url, subs).await {
                error!("Blockchain monitoring error: {}", e);
            }
        });
    } else {
        info!("⚠️  Contract monitoring disabled: Missing CONTRACT_ADDRESS or RPC_URL");
    }

    axum::serve(listener, app).await?;
    
    Ok(())
}

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "acquire-notification-server"
    }))
}

async fn subscribe(
    State(subscriptions): State<Subscriptions>,
    Json(payload): Json<SubscribeRequest>,
) -> impl IntoResponse {
    let player_address = payload.player_address.to_lowercase();
    
    let subscription = PushSubscription {
        endpoint: payload.endpoint,
        keys: payload.keys,
    };
    
    subscriptions.write().await.insert(player_address.clone(), subscription);
    
    info!("✅ Subscribed player: {}", player_address);
    
    (
        StatusCode::OK,
        Json(ApiResponse {
            success: true,
            message: "Subscribed successfully".to_string(),
        }),
    )
}

async fn unsubscribe(
    State(subscriptions): State<Subscriptions>,
    Json(payload): Json<UnsubscribeRequest>,
) -> impl IntoResponse {
    let player_address = payload.player_address.to_lowercase();
    
    subscriptions.write().await.remove(&player_address);
    
    info!("✅ Unsubscribed player: {}", player_address);
    
    (
        StatusCode::OK,
        Json(ApiResponse {
            success: true,
            message: "Unsubscribed successfully".to_string(),
        }),
    )
}

async fn notify_turn(
    State(subscriptions): State<Subscriptions>,
    Json(payload): Json<NotifyRequest>,
) -> impl IntoResponse {
    let player_address = payload.player_address.to_lowercase();
    
    let subs = subscriptions.read().await;
    let subscription = match subs.get(&player_address) {
        Some(sub) => sub.clone(),
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiResponse {
                    success: false,
                    message: "No subscription found for this player".to_string(),
                }),
            )
        }
    };
    drop(subs);
    
    let message = payload.message.unwrap_or_else(|| "It's your turn to play".to_string());
    
    match send_push_notification(&subscription, &message).await {
        Ok(_) => {
            info!("📤 Notification sent to {}", player_address);
            (
                StatusCode::OK,
                Json(ApiResponse {
                    success: true,
                    message: "Notification sent".to_string(),
                }),
            )
        }
        Err(e) => {
            error!("❌ Failed to send notification: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to send notification: {}", e),
                }),
            )
        }
    }
}

async fn send_push_notification(
    subscription: &PushSubscription,
    message: &str,
) -> anyhow::Result<()> {
    let _vapid_public = env::var("VAPID_PUBLIC_KEY")?;
    let vapid_private = env::var("VAPID_PRIVATE_KEY")?;
    let vapid_email = env::var("VAPID_EMAIL")?;
    
    let payload = serde_json::json!({
        "title": "Acquire - Your Turn!",
        "body": message,
        "icon": "/icons/icon-192x192.png",
        "badge": "/icons/icon-72x72.png",
        "tag": "turn-notification",
        "requireInteraction": true,
        "data": { "url": "/" }
    });
    let payload_str = payload.to_string();
    
    let subscription_info = web_push::SubscriptionInfo {
        endpoint: subscription.endpoint.clone(),
        keys: web_push::SubscriptionKeys {
            p256dh: subscription.keys.p256dh.clone(),
            auth: subscription.keys.auth.clone(),
        },
    };
    
    let mut sig_builder = web_push::VapidSignatureBuilder::from_base64(
        &vapid_private,
        web_push::URL_SAFE_NO_PAD,
        &subscription_info,
    )?;
    
    sig_builder.add_claim("sub", vapid_email.clone());
    sig_builder.add_claim("aud", subscription.endpoint.clone());
    let signature = sig_builder.build()?;
    
    let mut builder = web_push::WebPushMessageBuilder::new(&subscription_info)?;
    builder.set_payload(web_push::ContentEncoding::Aes128Gcm, payload_str.as_bytes());
    builder.set_vapid_signature(signature);
    
    let client = web_push::WebPushClient::new()?;
    let message = builder.build()?;
    
    client.send(message).await?;
    
    Ok(())
}

async fn monitor_blockchain_events(
    contract_address: String,
    rpc_url: String,
    _subscriptions: Subscriptions,
) -> anyhow::Result<()> {
    use ethers::prelude::*;
    
    info!("🔍 Starting blockchain event monitoring...");
    info!("📍 Contract: {}", contract_address);
    info!("🌐 RPC: {}", rpc_url);
    
    let provider = Provider::<Http>::try_from(rpc_url)?;
    let contract_addr: Address = contract_address.parse()?;
    
    // Event signature for TilePlaced(uint256 playerId, uint8 x, uint8 y)
    let tile_placed_sig = "TilePlaced(uint256,uint8,uint8)";
    let filter = Filter::new()
        .address(contract_addr)
        .event(tile_placed_sig);
    
    let mut stream = provider.watch(&filter).await?;
    
    info!("✅ Monitoring game events...");
    
    while let Some(log) = stream.next().await {
        info!("📝 Event detected: {:?}", log);
        
        // Get current player from contract
        // This is a simplified version - you'd need the actual contract ABI
        // For now, we'll just log the event
        info!("🎲 Tile placed event detected");
    }
    
    Ok(())
}
