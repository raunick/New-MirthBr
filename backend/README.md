# MirthBR Backend

High-performance healthcare integration engine built with Rust and Axum.

---

## 🚀 Quick Start

```bash
# Development
cargo run

# Production
cargo build --release
./target/release/mirthbr
```

The server starts on `http://localhost:3001` with:
- REST API at `/api/*`
- WebSocket metrics at `/ws/metrics`
- Auto-deployed Hello World channel on port `1234`

---

## 📋 Environment Variables

Create a `.env` file in the backend directory:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=3001

# Database
DATABASE_URL=sqlite:./mirthbr.db

# Security
API_KEY=your-32-character-secret-key-here

# TLS (optional)
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem

# Logging
RUST_LOG=info
```

---

## 🔌 API Endpoints

### Channels
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/channels` | `GET` | List all channels |
| `/api/channels` | `POST` | Deploy a new channel |
| `/api/channels/:id` | `GET` | Get channel details |
| `/api/channels/:id` | `DELETE` | Remove a channel |
| `/api/channels/:id/start` | `POST` | Start a stopped channel |
| `/api/channels/:id/stop` | `POST` | Stop a running channel |

### Messages
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages` | `GET` | List messages (with filters) |
| `/api/messages/:id` | `GET` | Get message details |
| `/api/messages/:id/retry` | `POST` | Retry a failed message |

### System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | `GET` | Health check |
| `/api/logs` | `GET` | Get recent system logs |
| `/ws/metrics` | `WS` | Real-time metrics stream |

---

## 🏗️ Architecture

```
src/
├── api/                    # REST API handlers
│   ├── channels.rs         # Channel CRUD operations
│   ├── messages.rs         # Message management
│   ├── logs.rs             # Log retrieval
│   └── metrics.rs          # WebSocket metrics
├── engine/                 # Core processing engine
│   ├── channel_manager.rs  # Channel lifecycle management
│   ├── listeners/          # HTTP, TCP, File, Database sources
│   ├── processors/         # HL7 Parser, Lua Script, Mapper, Filter
│   └── destinations/       # File, HTTP, TCP, Database writers
├── lua_helpers/            # Lua runtime modules
│   ├── json_module.rs      # JSON encode/decode
│   ├── hl7_module.rs       # HL7 parsing
│   └── log_module.rs       # Logging (with error propagation)
├── storage/                # Persistence layer
│   ├── message_store.rs    # SQLite message storage
│   └── models.rs           # Data models
├── utils/                  # Utilities
│   ├── dedup.rs            # Message deduplication
│   └── retry_worker.rs     # Automatic retry with backoff
└── main.rs                 # Application entry point
```

---

## 🔒 Security & TLS

### Generating Self-Signed Certificates

For testing purposes:

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365
```

### Configuring TLS

Enable HTTPS for the Admin API:

```bash
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
```

For individual channels (`http_listener`, `tcp_listener`), specify in channel config:

```json
{
  "type": "http_listener",
  "config": {
    "port": 8443,
    "cert_path": "/path/to/cert.pem",
    "key_path": "/path/to/key.pem"
  }
}
```

---

## 📊 Message Processing Features

### Persistence
- All messages saved to SQLite **before** processing
- Automatic recovery of pending messages on restart
- Full audit trail with timestamps and status

### Automatic Retry
- Failed messages retried with exponential backoff
- Configurable `max_retries` per channel (default: 5)
- Background worker checks every 30 seconds

### Deduplication
- SHA-based content hashing per channel
- 24-hour TTL for duplicate detection
- Automatic cleanup of expired entries

### Dead Letter Queue
- Configure error destination per channel
- Failed messages routed after max retries
- Accessible via Messages API

---

## 🔧 Channel Configuration

### Source Types

**HTTP Listener**
```json
{ "type": "http_listener", "config": { "port": 8080, "path": "/api/hl7" } }
```

**TCP Listener (MLLP)**
```json
{ "type": "tcp_listener", "config": { "port": 2575 } }
```

**File Reader**
```json
{ "type": "file_reader", "config": { "path": "./input", "pattern": "*.hl7" } }
```

**Database Poller**
```json
{ "type": "database_poller", "config": { "interval": 60, "query": "SELECT * FROM messages WHERE processed = false" } }
```

### Processor Types

**HL7 Parser**
```json
{ "type": "hl7_parser", "config": { "inputFormat": "hl7v2", "outputFormat": "json" } }
```

**Lua Script**
```json
{ "type": "lua_script", "config": { "code": "return msg.content:upper()" } }
```

**Field Mapper**
```json
{ "type": "mapper", "config": { "mappings": [{ "source": "PID.5", "target": "patient.name" }] } }
```

### Destination Types

**File Writer**
```json
{ "type": "file_writer", "config": { "path": "./output", "filename": "${uuid}.json" } }
```

**HTTP Sender**
```json
{ "type": "http_sender", "config": { "url": "https://api.example.com/receive", "method": "POST" } }
```

**TCP Sender (MLLP)**
```json
{ "type": "tcp_sender", "config": { "host": "192.168.1.100", "port": 2575 } }
```

---

## 📝 Lua Scripting

### Available Modules

| Module | Functions | Description |
|--------|-----------|-------------|
| `json` | `encode(val)`, `decode(str)` | JSON serialization |
| `hl7` | `parse(str)`, `to_json(str)` | HL7 v2 parsing |
| `log` | `log(msg)`, `log.error(msg)` | Logging |

### Error Propagation

`log.error()` stops the pipeline and returns the error to the HTTP client:

```lua
local data = json.decode(msg.content)
if not data["PID"] then
    log.error("Missing PID segment")  -- Returns 400 Bad Request
end
return json.encode(data)
```

### Example: HL7 to JSON

```lua
local hl7_data = hl7.parse(msg.content)
local patient = {
    id = hl7_data.PID[3],
    name = hl7_data.PID[5],
    dob = hl7_data.PID[7]
}
return json.encode(patient)
```

---

## 🧪 Development

```bash
# Run with debug logging
RUST_LOG=debug cargo run

# Run tests
cargo test

# Format code
cargo fmt

# Check lints
cargo clippy
```

---

## 📄 License

MIT License
