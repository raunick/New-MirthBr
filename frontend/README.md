# MirthBR Frontend

Visual flow-based editor for healthcare integration workflows.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_KEY=your-32-character-secret-key-here

# Authentication
NEXT_PUBLIC_AUTH_USERNAME=admin
NEXT_PUBLIC_AUTH_PASSWORD=your-secure-password

# Session Configuration
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30

# Security Configuration
NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS=5
NEXT_PUBLIC_LOCKOUT_DURATION_MINUTES=15
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default credentials:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **IMPORTANT:** Change these credentials in production!

---

## ✨ Features

### Visual Flow Editor
- **Drag & Drop Nodes**: Build integration flows visually
- **Inline Editing**: Edit node properties directly on canvas
- **Connection Validation**: Visual feedback for valid/invalid connections
- **Deploy Node**: One-click deployment with status feedback

### Testing & Debugging
- **Test Node**: Send HTTP requests or inject messages directly into pipeline
- **Real-time Logs**: View processing logs as they happen
- **Error Feedback**: Detailed error messages from Lua scripts

### Monitoring
- **Metrics Dashboard**: Real-time WebSocket-powered metrics
- **Messages Dashboard**: View, filter, and retry messages
- **Channel Status**: Start/stop channels with visual indicators

### Documentation
- **Built-in Docs**: Comprehensive documentation page at `/documentation`
- **Node Tooltips**: Contextual help for each node type

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx            # Login page
│   ├── dashboard/          # Main dashboard
│   ├── messages/           # Messages dashboard
│   └── documentation/      # Documentation page
├── components/
│   ├── flow/               # Flow editor components
│   │   ├── FlowCanvas.tsx  # Main canvas component
│   │   ├── nodes/          # 13+ node types
│   │   └── BaseNode.tsx    # Common node wrapper
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── editor/             # Modal editors
│       ├── LuaEditorModal.tsx
│       └── SettingsModal.tsx
├── stores/                 # Zustand state management
│   ├── flowStore.ts        # Main store
│   └── slices/             # Store slices
│       ├── nodesSlice.ts
│       ├── edgesSlice.ts
│       └── uiSlice.ts
├── lib/                    # Utilities
│   ├── api.ts              # API client
│   └── flow-compiler.ts    # Converts flow to channel config
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript definitions
```

---

## 🔒 Security Features

### Authentication (OWASP Compliant)
- Case-insensitive usernames
- Minimum 8-character password requirement
- Generic error messages (prevents user enumeration)
- Session timeout after inactivity
- Rate limiting with account lockout
- Secure session tokens

### Error Handling
- User-friendly error messages in Portuguese
- Error IDs for support tracking
- No sensitive data in logs
- Proper HTTP status codes

### API Security
- Bearer token authentication
- Request timeout (30s)
- Client-side input validation
- CORS configuration

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_API_KEY` | API authentication key | (required) |
| `NEXT_PUBLIC_AUTH_USERNAME` | Login username | `admin` |
| `NEXT_PUBLIC_AUTH_PASSWORD` | Login password | (required) |
| `NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES` | Session timeout | `30` |
| `NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS` | Max failed logins | `5` |
| `NEXT_PUBLIC_LOCKOUT_DURATION_MINUTES` | Lockout duration | `15` |

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

---

## 🚀 Production Deployment

### 1. Generate Secure Credentials

```bash
# Generate API key
openssl rand -base64 32

# Generate secure password
openssl rand -base64 16
```

### 2. Set Environment Variables

Configure in your deployment platform (Vercel, Docker, etc.)

### 3. Build and Deploy

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔧 Technical Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework |
| **Zustand** | State management (with slices) |
| **React Flow** | Visual flow editor |
| **TailwindCSS** | Styling |
| **Axios** | HTTP client |
| **Lucide React** | Icons |

---

## 📝 Node Types

### Sources (Input)
- **HTTP Listener**: Receive HTTP/REST requests
- **TCP Listener**: Accept TCP connections (MLLP)
- **File Reader**: Monitor directory for files
- **Database Poller**: Query database at intervals

### Processors (Transform)
- **HL7 Parser**: Convert HL7 ↔ JSON
- **Lua Script**: Custom transformation code
- **Field Mapper**: Map source → destination fields
- **Message Filter**: Filter by condition
- **Content Router**: Route to multiple outputs

### Destinations (Output)
- **File Writer**: Write to filesystem
- **HTTP Sender**: Send HTTP requests
- **TCP Sender**: Send via TCP/MLLP
- **Database Writer**: Insert/Update database

### Utility
- **Deploy Node**: Deploy channel to backend
- **Test Node**: Test with HTTP or pipeline injection
- **Text Node**: Documentation/annotations

---

## 📄 License

MIT License
