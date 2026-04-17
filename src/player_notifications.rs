use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
};
use crate::{ApiResponse, GameDb, SubscribePlayerRequest, NotifyTurnRequest};
use tracing::{info, error};
use std::env;

pub async fn subscribe_player(
    State((_, game_db)): State<(crate::Subscriptions, GameDb)>,
    Json(req): Json<SubscribePlayerRequest>,
) -> impl IntoResponse {
    match game_db.subscribe_player(
        req.player_name.clone(),
        req.game_code.clone(),
        req.endpoint,
        req.p256dh,
        req.auth,
    ).await {
        Ok(_) => {
            info!("✅ Player subscribed: {} for game {}", req.player_name, req.game_code);
            (
                StatusCode::OK,
                Json(ApiResponse {
                    success: true,
                    message: "Player subscribed successfully".to_string(),
                }),
            )
        }
        Err(e) => {
            error!("❌ Failed to subscribe player: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to subscribe player: {}", e),
                }),
            )
        }
    }
}

pub async fn notify_game_players(
    State((_, game_db)): State<(crate::Subscriptions, GameDb)>,
    Json(req): Json<NotifyTurnRequest>,
) -> impl IntoResponse {
    // Get all subscriptions for this game
    let subscriptions = match game_db.get_player_subscriptions(&req.game_code).await {
        Ok(subs) => subs,
        Err(e) => {
            error!("❌ Failed to get subscriptions: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: format!("Failed to get subscriptions: {}", e),
                }),
            );
        }
    };

    let vapid_private = match env::var("VAPID_PRIVATE_KEY") {
        Ok(key) => key,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    message: "VAPID keys not configured".to_string(),
                }),
            );
        }
    };

    let vapid_email = env::var("VAPID_EMAIL").unwrap_or_else(|_| "mailto:admin@example.com".to_string());

    let mut success_count = 0;
    let mut error_count = 0;

    // Send notifications to all players except the current player
    for sub in subscriptions {
        if sub.player_name == req.current_player_name {
            continue; // Don't notify the player whose turn it is
        }

        let message = format!("It's {}'s turn!", req.current_player_name);
        
        let payload = serde_json::json!({
            "title": "Acquire - Your Turn!",
            "body": message,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-72x72.png",
            "tag": "turn-notification",
            "requireInteraction": true,
            "data": { "url": "/" }
        });

        let subscription_info = web_push::SubscriptionInfo {
            endpoint: sub.endpoint.clone(),
            keys: web_push::SubscriptionKeys {
                p256dh: sub.p256dh.clone(),
                auth: sub.auth.clone(),
            },
        };

        match web_push::VapidSignatureBuilder::from_base64(
            &vapid_private,
            web_push::URL_SAFE_NO_PAD,
            &subscription_info,
        ) {
            Ok(mut sig_builder) => {
                sig_builder.add_claim("sub", vapid_email.clone());
                sig_builder.add_claim("aud", sub.endpoint.clone());
                
                match sig_builder.build() {
                    Ok(signature) => {
                        match web_push::WebPushMessageBuilder::new(&subscription_info) {
                            Ok(mut builder) => {
                                let payload_str = payload.to_string();
                                builder.set_payload(
                                    web_push::ContentEncoding::Aes128Gcm,
                                    payload_str.as_bytes()
                                );
                                builder.set_vapid_signature(signature);
                                
                                match builder.build() {
                                    Ok(message) => {
                                        match web_push::WebPushClient::new() {
                                            Ok(client) => {
                                                match tokio::task::spawn(async move {
                                                    client.send(message).await
                                                }).await {
                                                    Ok(Ok(_)) => {
                                                        info!("✅ Notification sent to {}", sub.player_name);
                                                        success_count += 1;
                                                    }
                                                    _ => {
                                                        error!("❌ Failed to send notification to {}", sub.player_name);
                                                        error_count += 1;
                                                    }
                                                }
                                            }
                                            Err(e) => {
                                                error!("❌ Failed to create push client: {}", e);
                                                error_count += 1;
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        error!("❌ Failed to build message: {}", e);
                                        error_count += 1;
                                    }
                                }
                            }
                            Err(e) => {
                                error!("❌ Failed to create message builder: {}", e);
                                error_count += 1;
                            }
                        }
                    }
                    Err(e) => {
                        error!("❌ Failed to build signature: {}", e);
                        error_count += 1;
                    }
                }
            }
            Err(e) => {
                error!("❌ Failed to create signature builder: {}", e);
                error_count += 1;
            }
        }
    }

    info!("📊 Notifications sent: {} success, {} errors", success_count, error_count);

    (
        StatusCode::OK,
        Json(ApiResponse {
            success: true,
            message: format!("Sent {} notifications ({} errors)", success_count, error_count),
        }),
    )
}
