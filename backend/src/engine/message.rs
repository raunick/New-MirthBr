use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub content: String,
    pub metadata: HashMap<String, String>,
    pub timestamp: DateTime<Utc>,
    #[serde(default)]
    pub origin: Option<String>,
}

impl Message {
    pub fn new(channel_id: Uuid, content: String, origin: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            channel_id,
            content,
            metadata: HashMap::new(),
            timestamp: Utc::now(),
            origin: Some(origin),
        }
    }
}
