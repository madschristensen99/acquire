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
}

pub struct GameDatabase {
    collection: Collection<Game>,
}

impl GameDatabase {
    pub async fn new(database_url: &str) -> Result<Self> {
        let client = Client::with_uri_str(database_url).await?;
        let db = client.database("acquire");
        let collection = db.collection::<Game>("games");
        
        Ok(Self { collection })
    }
    
    pub async fn create_game(&self, code: String, host: String, players: Vec<String>) -> Result<Game> {
        let game = Game {
            id: None,
            code: code.clone(),
            host,
            players,
            created_at: Utc::now(),
            state: None,
        };
        
        self.collection.insert_one(&game, None).await?;
        Ok(game)
    }
    
    pub async fn get_game(&self, code: &str) -> Result<Option<Game>> {
        let filter = doc! { "code": code };
        Ok(self.collection.find_one(filter, None).await?)
    }
    
    pub async fn update_game_state(&self, code: &str, state: String) -> Result<()> {
        let filter = doc! { "code": code };
        let update = doc! { "$set": { "state": state } };
        self.collection.update_one(filter, update, None).await?;
        Ok(())
    }
}
