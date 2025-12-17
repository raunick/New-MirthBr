use std::net::SocketAddr;
use tokio::net::{TcpListener as TokioTcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;
use crate::engine::message::Message;
use crate::storage::messages::MessageStore;
use uuid::Uuid;

pub struct TcpListener {
    pub port: u16,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
    pub store: Option<MessageStore>,
}

impl TcpListener {
    pub fn new(port: u16, channel_id: Uuid, sender: mpsc::Sender<Message>, store: Option<MessageStore>) -> Self {
        Self {
            port,
            channel_id,
            sender,
            store,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        let port = self.port;
        let channel_id = self.channel_id;
        let sender = self.sender.clone();
        let store = self.store.clone();

        // Configurable bind address for listeners
        let bind_addr: std::net::IpAddr = std::env::var("LISTENER_BIND_ADDRESS")
            .unwrap_or_else(|_| "0.0.0.0".to_string())
            .parse()
            .unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)));

        let addr = SocketAddr::from((bind_addr, port));
        tracing::info!("📡 Channel {} listening on TCP {}:{}", channel_id, bind_addr, port);

        let listener = TokioTcpListener::bind(addr).await.map_err(|e| {
            tracing::error!("❌ Failed to bind port {} for channel {}: {}", port, channel_id, e);
            e
        })?;

        loop {
            // Use a timeout or select to allow distinct cancellation points if needed
            match listener.accept().await {
                Ok((socket, addr)) => {
                    let sender_clone = sender.clone();
                    let store_clone = store.clone();
                    tokio::spawn(async move {
                        handle_connection(socket, addr, channel_id, sender_clone, store_clone).await;
                    });
                }
                Err(e) => {
                    tracing::error!("Failed to accept TCP connection: {}", e);
                }
            }
        }
    }
}

async fn handle_connection(mut socket: TcpStream, addr: SocketAddr, channel_id: Uuid, sender: mpsc::Sender<Message>, store: Option<MessageStore>) {
    tracing::info!("Accepted TCP connection from {}", addr);
    let mut buffer = [0u8; 4096]; // Buffer size

    loop {
        match socket.read(&mut buffer).await {
            Ok(0) => {
                tracing::info!("TCP connection closed by client {}", addr);
                break;
            } // Connection closed
            Ok(n) => {
                tracing::info!("Received {} bytes from {}", n, addr);
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
                
                // 1. Persist Message (Critical for Data Safety)
                let mut msg_id_str = Uuid::new_v4().to_string(); // Default if not using store
                
                if let Some(s) = &store {
                    match s.save_message(&channel_id.to_string(), &content).await {
                        Ok(id) => {
                            msg_id_str = id;
                            tracing::info!("Message persisted to disk with ID: {}", msg_id_str);
                        },
                        Err(e) => {
                             tracing::error!("CRITICAL: Failed to persist message to disk: {}", e);
                             // If we can't persist, we probably shouldn't ACK success? or send NACK?
                             // For now, we log and proceed but this is risky.
                             // Ideally send NACK here.
                        }
                    }
                }
                
                // 2. Send ACK (After Persistence)
                if is_mllp {
                    // Extract Message Control ID directly from content if possible
                    // MSH|^~\&|...|...|...|...|...|...|MSGID|...
                    let msg_control_id = content.split('|').nth(9).unwrap_or("UNKNOWN_ID");
                    
                    let ack = format!("\x0BMSA|AA|{}\x1C\x0D", msg_control_id);
                    if let Err(e) = socket.write_all(ack.as_bytes()).await {
                        tracing::error!("Failed to send ACK: {}", e);
                        // If ACK fails, equipment might resend. That's okay, we have it persisted (dedup ID needed later).
                        break;
                    } else {
                        tracing::info!("ACK sent for HL7 Message ID: {}", msg_control_id);
                    }
                }

                // 3. Create Internal Message & Send to Pipeline
                let mut msg = Message::new(channel_id, content, origin);
                // Override ID with the one from DB
                if let Ok(uuid) = Uuid::parse_str(&msg_id_str) {
                    msg.id = uuid;
                }

                // Send to processing
                if let Err(e) = sender.send(msg).await {
                    tracing::error!("Failed to send message to pipeline: {}", e);
                    break;
                }
            }
            Err(e) => {
                tracing::error!("TCP read error: {}", e);
                break;
            }
        }
    }
}
