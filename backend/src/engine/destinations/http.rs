use crate::engine::message::Message;
use reqwest::Client;

pub struct HttpSender {
    url: String,
    method: String,
    client: Client,
}

impl HttpSender {
    pub fn new(url: String, method: String) -> Self {
        Self {
            url,
            method,
            client: Client::new(),
        }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        let req = match self.method.as_str() {
            "POST" => self.client.post(&self.url),
            "PUT" => self.client.put(&self.url),
            _ => self.client.post(&self.url),
        };

        let res = req.body(msg.content.clone()).send().await?;
        
        if !res.status().is_success() {
            tracing::warn!("HTTP Sender failed with status: {}", res.status());
        } else {
            tracing::info!("HTTP Sender delivered to {}", self.url);
        }

        Ok(())
    }
}
