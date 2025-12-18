use std::net::SocketAddr;
use tokio::net::{TcpListener as TokioTcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;
use crate::engine::message::Message;
use crate::storage::messages::MessageStore;
use crate::engine::listeners::mllp::{MllpFrameAccumulator, generate_ack};
use uuid::Uuid;
use std::time::Duration;

use crate::config::TlsConfig;
use tokio_rustls::TlsAcceptor;
use tokio_rustls::rustls::{ServerConfig, pki_types::{CertificateDer, PrivateKeyDer}};
use std::sync::Arc;
use std::io::BufReader;
use std::fs::File;

pub struct TcpListener {
    pub port: u16,
    pub channel_id: Uuid,
    pub sender: mpsc::Sender<Message>,
    pub store: Option<MessageStore>,
    pub tls_config: Option<TlsConfig>,
}

impl TcpListener {
    pub fn new(port: u16, channel_id: Uuid, sender: mpsc::Sender<Message>, store: Option<MessageStore>, tls_config: Option<TlsConfig>) -> Self {
        Self {
            port,
            channel_id,
            sender,
            store,
            tls_config,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        let port = self.port;
        let channel_id = self.channel_id;
        
        // TLS Setup
        let tls_acceptor = if let Some(cfg) = &self.tls_config {
            tracing::info!("🔒 Configuring TLS for Channel {}", channel_id);
             // Load certs
            let certs = rustls_pemfile::certs(&mut BufReader::new(File::open(&cfg.cert_path)?))
                .collect::<Result<Vec<_>, _>>()?;
            let key = rustls_pemfile::private_key(&mut BufReader::new(File::open(&cfg.key_path)?))?
                .ok_or_else(|| anyhow::anyhow!("No private key found"))?;

            let config = ServerConfig::builder()
                .with_no_client_auth()
                .with_single_cert(certs, key)?;
            
            Some(TlsAcceptor::from(Arc::new(config)))
        } else {
            None
        };

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
            match listener.accept().await {
                Ok((socket, addr)) => {
                    let sender_clone = self.sender.clone();
                    let store_clone = self.store.clone();
                    let acceptor = tls_acceptor.clone();

                    if let Some(acceptor) = acceptor {
                        tokio::spawn(async move {
                            match acceptor.accept(socket).await {
                                Ok(stream) => {
                                    handle_connection(stream, addr, channel_id, sender_clone, store_clone, port).await;
                                },
                                Err(e) => tracing::error!("TLS Handshake failed from {}: {}", addr, e),
                            }
                        });
                    } else {
                        tokio::spawn(async move {
                            handle_connection(socket, addr, channel_id, sender_clone, store_clone, port).await;
                        });
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to accept TCP connection: {}", e);
                }
            }
        }
    }
}

async fn handle_connection<S>(mut socket: S, addr: SocketAddr, channel_id: Uuid, sender: mpsc::Sender<Message>, store: Option<MessageStore>, local_port: u16) 
where S: AsyncReadExt + AsyncWriteExt + Unpin
{
    tracing::info!("Accepted connection from {}", addr);
    let mut buffer = [0u8; 4096];
    
    // MLLP Accumulator with 30s timeout logic (checked manually or via read timeout)
    const TIMEOUT_SECS: u64 = 30;
    let mut accumulator = MllpFrameAccumulator::new(TIMEOUT_SECS * 1000);

    loop {
        // Read with timeout
        let read_result = tokio::time::timeout(
            Duration::from_secs(TIMEOUT_SECS),
            socket.read(&mut buffer)
        ).await;

        match read_result {
            Ok(Ok(0)) => {
                tracing::info!("TCP connection closed by client {}", addr);
                break;
            }
            Ok(Ok(n)) => {
                let data = &buffer[0..n];
                tracing::debug!("Received {} bytes from {}", n, addr);
                
                let messages = accumulator.feed(data);
                
                for content in messages {
                    let origin = format!("TCP :{} from {}", local_port, addr);
                    tracing::info!("Received complete MLLP message from {}", origin);
                    
                    // 2. Persist
                    let mut persistence_id = Uuid::new_v4().to_string();
                    let mut persisted = false;
                    
                    if let Some(s) = &store {
                         match s.save_message(&channel_id.to_string(), &content).await {
                            Ok(id) => {
                                persistence_id = id;
                                persisted = true;
                                tracing::info!("Message persisted to disk with ID: {}", persistence_id);
                            },
                            Err(e) => {
                                tracing::error!("CRITICAL: Failed to persist message: {}", e);
                            }
                        }
                    } else {
                        persisted = true; 
                    }
                    
                    if persisted {
                        // 3. Send ACK
                        let ack = generate_ack(&content);
                        if let Err(e) = socket.write_all(ack.as_bytes()).await {
                            tracing::error!("Failed to send ACK to {}: {}", addr, e);
                            break; 
                        } else {
                            tracing::info!("ACK sent to {}", addr);
                        }
                        
                        // 4. Dispatch to Pipeline
                        let mut msg = Message::new(channel_id, content, origin);
                        if let Ok(uuid) = Uuid::parse_str(&persistence_id) {
                            msg.id = uuid;
                        }
                        
                        if let Err(e) = sender.send(msg).await {
                             tracing::error!("Failed to send message to pipeline: {}", e);
                             break;
                        }
                    }
                }
            },
            Ok(Err(e)) => {
                tracing::error!("TCP read error from {}: {}", addr, e);
                break;
            },
            Err(_) => {
                // Timeout
                tracing::info!("Connection timeout from {}", addr);
                if accumulator.check_timeout() {
                     tracing::warn!("Timeout waiting for MLLP frame completion from {}", addr);
                }
                break; 
            }
        }
    }
}
