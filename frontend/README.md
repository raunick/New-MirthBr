# MirthBR Frontend

Healthcare Integration Engine - Visual Flow-Based Editor

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_KEY=your-32-character-secret-key-here

# Authentication Configuration
# Username is case-insensitive per OWASP guidelines
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

Open [http://localhost:3000](http://localhost:3000) with your browser.

**Default credentials for development:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **IMPORTANT:** Change these credentials in production!

## Security Features

This application implements the following security measures based on OWASP guidelines:

### Authentication
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

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_API_KEY` | API authentication key | `dev-key-...` (change in prod!) |
| `NEXT_PUBLIC_AUTH_USERNAME` | Login username | `admin` |
| `NEXT_PUBLIC_AUTH_PASSWORD` | Login password | `admin123` (change in prod!) |
| `NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES` | Session timeout | `30` |
| `NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS` | Max failed logins before lockout | `5` |
| `NEXT_PUBLIC_LOCKOUT_DURATION_MINUTES` | Lockout duration | `15` |

## Production Deployment

1. Generate secure credentials:
   ```bash
   # Generate API key
   openssl rand -base64 32
   
   # Generate secure password
   openssl rand -base64 16
   ```

2. Set environment variables in your deployment platform (Vercel, Docker, etc.)

3. Build and deploy:
   ```bash
   npm run build
   npm start
   ```

## Technical Stack

- **Framework:** Next.js 16
- **State Management:** Zustand
- **Styling:** TailwindCSS
- **Flow Editor:** React Flow
- **HTTP Client:** Axios
- **Icons:** Lucide React

