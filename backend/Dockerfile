# =====================================
# MirthBR Backend - Multi-stage Dockerfile
# =====================================
# Optimized for production with minimal image size (~50MB)

# ----- Stage 1: Build -----
FROM rust:1.75-bookworm AS builder

WORKDIR /app

# Install build dependencies for SQLite and Lua
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first (better cache utilization)
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer is cached if Cargo.toml/Cargo.lock don't change)
RUN cargo build --release && rm -rf src

# Copy actual source code
COPY src ./src
COPY tests ./tests

# Build the application (touch to invalidate cache)
RUN touch src/main.rs && cargo build --release

# ----- Stage 2: Runtime -----
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libsqlite3-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/target/release/mirthbr-backend ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Declare volume for persistent data
VOLUME /app/data

# Environment variables with defaults
ENV DATABASE_URL=sqlite:/app/data/mirth.db
ENV BIND_ADDRESS=0.0.0.0
ENV PORT=3001
ENV RUST_LOG=info

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:3001/api/health || exit 1

# Run the application
CMD ["./mirthbr-backend"]
