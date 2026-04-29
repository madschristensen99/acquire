use mongodb::{Client, Collection, bson::doc, bson::oid::ObjectId};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use mongodb::bson::DateTime as BsonDateTime;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub code: String,
    pub host: String,
    pub players: Vec<String>,
    pub max_players: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub state: Option<String>, // JSON serialized game state
    pub current_player: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_updated: Option<BsonDateTime>,
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
    
    pub async fn create_game(&self, code: String, host: String, max_players: Option<i32>) -> Result<Game> {
        let now = chrono::Utc::now();
        let bson_now = BsonDateTime::now();
        
        let game = Game {
            id: None,
            code: code.clone(),
            host,
            players: vec![],
            max_players,
            state: None,
            current_player: None,
            created_at: now,
            last_updated: Some(bson_now),
        };
        
        self.games_collection.insert_one(&game, None).await?;
        Ok(game)
    }
    
    pub async fn get_game(&self, code: &str) -> Result<Option<Game>> {
        let filter = doc! { "code": code };
        match self.games_collection.find_one(filter, None).await {
            Ok(game) => Ok(game),
            Err(e) => {
                // Log the error but don't crash - might be malformed data
                tracing::error!("❌ Failed to get game: {}", e);
                Ok(None)
            }
        }
    }
    
    pub async fn add_player_to_game(&self, code: &str, player_name: &str) -> Result<()> {
        let filter = doc! { "code": code };
        let update = doc! {
            "$addToSet": { "players": player_name }
        };
        
        self.games_collection.update_one(filter, update, None).await?;
        Ok(())
    }

    pub async fn update_game_state(&self, code: &str, state: String, current_player: usize) -> Result<()> {
        let filter = doc! { "code": code };
        let update = doc! {
            "$set": {
                "state": state,
                "current_player": current_player as i64,
                "last_updated": BsonDateTime::now()
            }
        };
        self.games_collection.update_one(filter, update, None).await?;
        Ok(())
    }
    
    pub async fn get_all_players(&self) -> Result<Vec<String>> {
        use futures::stream::StreamExt;
        
        let mut cursor = self.games_collection.find(None, None).await?;
        let mut players = std::collections::HashSet::new();
        
        while let Some(result) = cursor.next().await {
            if let Ok(game) = result {
                for player in game.players {
                    players.insert(player);
                }
                players.insert(game.host);
            }
        }
        
        Ok(players.into_iter().collect())
    }
    
    pub async fn get_player_games(&self, player_name: &str) -> Result<Vec<Game>> {
        let filter = doc! { 
            "$or": [
                { "host": player_name },
                { "players": player_name }
            ]
        };
        
        let mut cursor = self.games_collection.find(filter, None).await?;
        let mut games = Vec::new();
        
        use futures::stream::StreamExt;
        while let Some(result) = cursor.next().await {
            // Skip games that fail to deserialize
            if let Ok(game) = result {
                games.push(game);
            }
        }
        
        Ok(games)
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
