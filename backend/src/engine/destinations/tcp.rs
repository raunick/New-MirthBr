use crate::engine::message::Message;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use std::time::Duration;
use crate::engine::listeners::mllp::MllpFrameAccumulator;

pub struct TcpSender {
    host: String,
    port: u16,
    channel_name: String,
}

impl TcpSender {
    pub fn new(host: String, port: u16, channel_name: String) -> Self {
        Self {
            host,
            port,
            channel_name,
        }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        let addr = format!("{}:{}", self.host, self.port);
        tracing::info!("Connecting to TCP destination {} for channel {}", addr, self.channel_name);

        // 1. Connect with Timeout
        let mut stream = tokio::time::timeout(
            Duration::from_secs(5),
            TcpStream::connect(&addr)
        ).await.map_err(|_| anyhow::anyhow!("Connection timeout to {}", addr))??;

        // 2. Wrap in MLLP
        // <SB>Data<EB><CR>
        let mllp_frame = format!("\x0B{}\x1C\x0D", msg.content);
        
        // 3. Send
        stream.write_all(mllp_frame.as_bytes()).await?;
        
        // 4. Wait for ACK with Timeout
        let mut buffer = [0u8; 1024];
        let read_result = tokio::time::timeout(
            Duration::from_secs(10), // 10s wait for ACK
            stream.read(&mut buffer)
        ).await;

        match read_result {
            Ok(Ok(n)) => {
                if n == 0 {
                    return Err(anyhow::anyhow!("Connection closed by remote host before ACK"));
                }
                
                // Parse ACK using MLLP Accumulator logic?
                // For simplified sender, we just expect one ACK frame.
                // But let's verify it starts with SB and ends with EB+CR?
                // Or just assume it's the ACK.
                
                let data = &buffer[0..n];
                // Simple validation
                if data[0] != 0x0B {
                     tracing::warn!("Response did not start with SB (0x0B). Raw: {:?}", data);
                }
                
                let response = String::from_utf8_lossy(data);
                if response.contains("|AA|") || response.contains("|CA|") {
                    tracing::info!("Received positive ACK from {}", addr);
                    Ok(())
                } else if response.contains("|AE|") || response.contains("|CE|") || response.contains("|AR|") || response.contains("|CR|") {
                     Err(anyhow::anyhow!("Received NACK/Reject from remote: {}", response))
                } else {
                    tracing::warn!("Received unknown response format: {}", response);
                    // Assume OK if it's an ACK message?
                    if response.contains("MSA|") {
                         Ok(())
                    } else {
                         Err(anyhow::anyhow!("Invalid ACK response: {}", response))
                    }
                }
            },
            Ok(Err(e)) => Err(anyhow::anyhow!("Failed to read ACK: {}", e)),
            Err(_) => Err(anyhow::anyhow!("Timeout waiting for ACK from {}", addr)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::net::TcpListener;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_tcp_send_ack() {
        // Start a mock server
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut buf = [0u8; 1024];
            let n = socket.read(&mut buf).await.unwrap();
            
            // Check MLLP framing
            assert_eq!(buf[0], 0x0B);
            
            // Send ACK
            let ack = "\x0BMSH|^~\\&|||||||ACK||P|2.3\rMSA|AA|123\x1C\x0D";
            socket.write_all(ack.as_bytes()).await.unwrap();
        });

        let sender = TcpSender::new("127.0.0.1".to_string(), port, "TestChannel".to_string());
        
        let msg = Message {
            id: Uuid::new_v4(),
            channel_id: Uuid::new_v4(),
            content: "MSH|^~\\&|Test|...".to_string(),
            metadata: std::collections::HashMap::new(),
            timestamp: chrono::Utc::now(),
            origin: None,
            response_tx: None,
        };

        let result = sender.send(&msg).await;
        assert!(result.is_ok());
    }
}
