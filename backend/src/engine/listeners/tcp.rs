use std::net::SocketAddr;
use tokio::net::{TcpListener as TokioTcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;
use crate::engine::message::Message;
use uuid::Uuid;

pub struct TcpListener {
    pub port: u16,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
}

impl TcpListener {
    pub fn new(port: u16, channel_id: Uuid, sender: mpsc::Sender<Message>) -> Self {
        Self {
            port,
            channel_id,
            sender,
        }
    }

    pub async fn start(&self) {
        let port = self.port;
        let channel_id = self.channel_id;
        let sender = self.sender.clone();

        // Configurable bind address for listeners
        let bind_addr: std::net::IpAddr = std::env::var("LISTENER_BIND_ADDRESS")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)));

        let addr = SocketAddr::from((bind_addr, port));
        tracing::info!("📡 Channel {} listening on TCP {}:{}", channel_id, bind_addr, port);

        let listener = match TokioTcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                tracing::error!("❌ Failed to bind port {} for channel {}: {}", port, channel_id, e);
                return;
            }
        };

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((socket, addr)) => {
                        let sender_clone = sender.clone();
                        tokio::spawn(async move {
                            handle_connection(socket, addr, channel_id, sender_clone).await;
                        });
                    }
                    Err(e) => {
                        tracing::error!("Failed to accept TCP connection: {}", e);
                    }
                }
            }
        });
    }
}

async fn handle_connection(mut socket: TcpStream, addr: SocketAddr, channel_id: Uuid, sender: mpsc::Sender<Message>) {
    let mut buffer = [0u8; 4096]; // Buffer size

    loop {
        match socket.read(&mut buffer).await {
            Ok(0) => break, // Connection closed
            Ok(n) => {
                let data = &buffer[0..n];
                // Check if MLLP
                // MLLP: <SB> Content <EB><CR>
                // SB = 0x0B, EB = 0x1C, CR = 0x0D
                
                // For MVP: Simple detection. If starts with 0x0B, treat as MLLP.
                // If not, treat as raw.
                // Accumulate logic omitted for brevity, assuming small messages fit in buffer or are sent at once.
                
                let (content, is_mllp) = if data.starts_with(&[0x0B]) {
                    // Try to find end
                    if let Some(end_idx) = data.iter().position(|&b| b == 0x1C) {
                        let content_bytes = &data[1..end_idx];
                        (String::from_utf8_lossy(content_bytes).to_string(), true)
                    } else {
                        // Incomplete MLLP frame? Or split packet?
                        // For MVP: Treat as raw if we can't find end immediately
                         (String::from_utf8_lossy(data).to_string(), false)
                    }
                } else {
                     (String::from_utf8_lossy(data).to_string(), false)
                };

                let origin = format!("TCP :{} from {}", addr.port(), addr.ip());
                let msg = Message::new(channel_id, content, origin);

                // Send to processing
                if let Err(e) = sender.send(msg).await {
                    tracing::error!("Failed to send message to pipeline: {}", e);
                    break;
                }
                
                // Send ACK if MLLP
                if is_mllp {
                    let ack = format!("\x0BMSA|AA|{}\x1C\x0D", "MSGID"); // Minimal ACK
                    if let Err(e) = socket.write_all(ack.as_bytes()).await {
                        tracing::error!("Failed to send ACK: {}", e);
                        break;
                    }
                }
            }
            Err(e) => {
                tracing::error!("TCP read error: {}", e);
                break;
            }
        }
    }
}
