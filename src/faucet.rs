use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
};
use ethers::prelude::*;
use serde::{Deserialize, Serialize};
use std::env;
use tracing::{info, error};

#[derive(Debug, Deserialize)]
pub struct FaucetRequest {
    pub address: String,
}

#[derive(Debug, Serialize)]
pub struct BalanceResponse {
    pub success: bool,
    pub balance: String,
    pub needs_funding: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct FundResponse {
    pub success: bool,
    pub tx_hash: Option<String>,
    pub message: String,
}

const MIN_BALANCE: u64 = 5_000_000_000_000_000; // 0.005 ETH
const FUND_AMOUNT: u64 = 10_000_000_000_000_000; // 0.01 ETH

pub async fn check_balance(
    Json(req): Json<FaucetRequest>,
) -> impl IntoResponse {
    let rpc_url = env::var("ARBITRUM_SEPOLIA_RPC").unwrap_or_else(|_| 
        "https://sepolia-rollup.arbitrum.io/rpc".to_string()
    );
    
    match check_wallet_balance(&req.address, &rpc_url).await {
        Ok((balance, needs_funding)) => {
            let balance_eth = ethers::utils::format_ether(balance);
            info!("💰 Balance check for {}: {} ETH", req.address, balance_eth);
            
            (
                StatusCode::OK,
                Json(BalanceResponse {
                    success: true,
                    balance: balance_eth.to_string(),
                    needs_funding,
                    message: if needs_funding {
                        "Wallet needs funding".to_string()
                    } else {
                        "Wallet has sufficient balance".to_string()
                    },
                }),
            )
        }
        Err(e) => {
            error!("❌ Failed to check balance: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(BalanceResponse {
                    success: false,
                    balance: "0".to_string(),
                    needs_funding: true,
                    message: format!("Failed to check balance: {}", e),
                }),
            )
        }
    }
}

pub async fn fund_wallet(
    Json(req): Json<FaucetRequest>,
) -> impl IntoResponse {
    let rpc_url = env::var("ARBITRUM_SEPOLIA_RPC").unwrap_or_else(|_| 
        "https://sepolia-rollup.arbitrum.io/rpc".to_string()
    );
    
    let faucet_private_key = match env::var("FAUCET_PRIVATE_KEY") {
        Ok(key) => key,
        Err(_) => {
            error!("❌ FAUCET_PRIVATE_KEY not configured");
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(FundResponse {
                    success: false,
                    tx_hash: None,
                    message: "Faucet not configured".to_string(),
                }),
            );
        }
    };
    
    // Check if wallet needs funding
    match check_wallet_balance(&req.address, &rpc_url).await {
        Ok((_, needs_funding)) => {
            if !needs_funding {
                return (
                    StatusCode::OK,
                    Json(FundResponse {
                        success: true,
                        tx_hash: None,
                        message: "Wallet already has sufficient balance".to_string(),
                    }),
                );
            }
        }
        Err(e) => {
            error!("❌ Failed to check balance before funding: {}", e);
        }
    }
    
    // Fund the wallet
    match send_funds(&req.address, &faucet_private_key, &rpc_url).await {
        Ok(tx_hash) => {
            info!("💧 Funded wallet {}: {}", req.address, tx_hash);
            (
                StatusCode::OK,
                Json(FundResponse {
                    success: true,
                    tx_hash: Some(tx_hash),
                    message: format!("Sent {} ETH", ethers::utils::format_ether(U256::from(FUND_AMOUNT))),
                }),
            )
        }
        Err(e) => {
            error!("❌ Failed to fund wallet: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(FundResponse {
                    success: false,
                    tx_hash: None,
                    message: format!("Failed to fund wallet: {}", e),
                }),
            )
        }
    }
}

async fn check_wallet_balance(address: &str, rpc_url: &str) -> anyhow::Result<(U256, bool)> {
    let provider = Provider::<Http>::try_from(rpc_url)?;
    let address: Address = address.parse()?;
    let balance = provider.get_balance(address, None).await?;
    let needs_funding = balance < U256::from(MIN_BALANCE);
    Ok((balance, needs_funding))
}

async fn send_funds(to_address: &str, private_key: &str, rpc_url: &str) -> anyhow::Result<String> {
    let provider = Provider::<Http>::try_from(rpc_url)?;
    let wallet: LocalWallet = private_key.parse()?;
    let client = SignerMiddleware::new(provider, wallet);
    
    let to: Address = to_address.parse()?;
    let tx = TransactionRequest::new()
        .to(to)
        .value(U256::from(FUND_AMOUNT));
    
    let pending_tx = client.send_transaction(tx, None).await?;
    let receipt = pending_tx.await?;
    
    match receipt {
        Some(r) => Ok(format!("{:?}", r.transaction_hash)),
        None => Err(anyhow::anyhow!("Transaction failed")),
    }
}
