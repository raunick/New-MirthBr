use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Mapping {
    pub source: String,
    pub target: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Route {
    pub name: String,
    pub condition: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Channel {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub name: String,
    pub enabled: bool,
    pub source: SourceConfig,
    pub processors: Vec<ProcessorConfig>,
    pub destinations: Vec<DestinationConfig>,
    #[serde(default)]
    pub error_destination: Option<DestinationConfig>,
    #[serde(default = "default_max_retries")]
    pub max_retries: Option<i32>,
}

fn default_max_retries() -> Option<i32> {
    Some(3)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MetricUpdate {
    pub channel_id: String,
    pub message_id: Option<String>,
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "config")]
pub enum SourceConfig {
    #[serde(rename = "http_listener")]
    Http { port: u16, path: Option<String>, cert_path: Option<String>, key_path: Option<String> },
    #[serde(rename = "tcp_listener")]
    Tcp { port: u16, cert_path: Option<String>, key_path: Option<String> },
    #[serde(rename = "file_reader")]
    File { path: String, pattern: Option<String> },
    #[serde(rename = "database_poller")]
    Database { url: String, query: String, interval_ms: u64 },
    #[serde(rename = "test_source")]
    Test { payload_type: String, payload: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessorConfig {
    pub id: String,
    pub name: String,
    #[serde(flatten)]
    pub kind: ProcessorType,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "config")]
pub enum ProcessorType {
    #[serde(rename = "lua_script")]
    Lua { code: String },
    #[serde(rename = "mapper")]
    Mapper { mappings: Vec<Mapping> },
    #[serde(rename = "filter")]
    Filter { condition: String },
    #[serde(rename = "router")]
    Router { routes: Vec<Route> },
    #[serde(rename = "hl7_parser")]
    Hl7 { inputFormat: String, outputFormat: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DestinationConfig {
    pub id: String,
    pub name: String,
    #[serde(flatten)]
    pub kind: DestinationType,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "config")]
pub enum DestinationType {
    #[serde(rename = "http_sender")]
    Http { url: String, method: String },
    #[serde(rename = "file_writer")]
    File { path: String, filename: Option<String>, append: Option<bool>, encoding: Option<String> },
    #[serde(rename = "database_writer")]
    Database { url: String, table: Option<String>, mode: String, query: Option<String> },
    #[serde(rename = "tcp_sender")]
    Tcp { host: String, port: u16 },
    #[serde(rename = "lua_script")]
    Lua { code: String },
}


