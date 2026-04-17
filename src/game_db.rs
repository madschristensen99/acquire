use mongodb::{Client, Collection, bson::doc};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub code: String,
    pub host: String,
    pub players: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub state: Option<String>, // JSON serialized game state
    pub current_player: Option<usize>,
    pub last_updated: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerSubscription {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub player_name: String,
    pub game_code: String,
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
    pub created_at: DateTime<Utc>,
}

pub struct GameDatabase {
    games_collection: Collection<Game>,
    subscriptions_collection: Collection<PlayerSubscription>,
}

impl GameDatabase {
    pub async fn new(database_url: &str) -> Result<Self> {
        let client = Client::with_uri_str(database_url).await?;
        let db = client.database("acquire");
        let games_collection = db.collection::<Game>("games");
        let subscriptions_collection = db.collection::<PlayerSubscription>("player_subscriptions");
        
        Ok(Self { 
            games_collection,
            subscriptions_collection,
        })
    }
    
    pub async fn create_game(&self, code: String, host: String, players: Vec<String>) -> Result<Game> {
        let game = Game {
            id: None,
            code: code.clone(),
            host,
            players,
            created_at: Utc::now(),
            state: None,
            current_player: Some(0),
            last_updated: Some(Utc::now()),
        };
        
        self.games_collection.insert_one(&game, None).await?;
        Ok(game)
    }
    
    pub async fn get_game(&self, code: &str) -> Result<Option<Game>> {
        let filter = doc! { "code": code };
        Ok(self.games_collection.find_one(filter, None).await?)
    }
    
    pub async fn update_game_state(&self, code: &str, state: String, current_player: usize) -> Result<()> {
        let filter = doc! { "code": code };
        let now = mongodb::bson::DateTime::now();
        let update = doc! { 
            "$set": { 
                "state": state,
                "current_player": current_player as i32,
                "last_updated": now,
            } 
        };
        self.games_collection.update_one(filter, update, None).await?;
        Ok(())
    }
    
    // Subscription management
    pub async fn subscribe_player(&self, player_name: String, game_code: String, endpoint: String, p256dh: String, auth: String) -> Result<()> {
        let subscription = PlayerSubscription {
            id: None,
            player_name: player_name.clone(),
            game_code: game_code.clone(),
            endpoint,
            p256dh,
            auth,
            created_at: Utc::now(),
        };
        
        // Remove existing subscription for this player/game combo
        let filter = doc! { "player_name": &player_name, "game_code": &game_code };
        self.subscriptions_collection.delete_many(filter, None).await?;
        
        // Insert new subscription
        self.subscriptions_collection.insert_one(&subscription, None).await?;
        Ok(())
    }
    
    pub async fn get_player_subscriptions(&self, game_code: &str) -> Result<Vec<PlayerSubscription>> {
        let filter = doc! { "game_code": game_code };
        let mut cursor = self.subscriptions_collection.find(filter, None).await?;
        let mut subscriptions = Vec::new();
        
        use futures::stream::StreamExt;
        while let Some(result) = cursor.next().await {
            if let Ok(sub) = result {
                subscriptions.push(sub);
            }
        }
        
        Ok(subscriptions)
    }
    
    pub async fn unsubscribe_player(&self, player_name: &str, game_code: &str) -> Result<()> {
        let filter = doc! { "player_name": player_name, "game_code": game_code };
        self.subscriptions_collection.delete_many(filter, None).await?;
        Ok(())
    }
}
