# --- Stage 1: Build Rust Brain ---
FROM node:20-slim AS builder

# Install Rust toolchain and build requirements
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy brain source
COPY evertext_brain ./evertext_brain

# Build release binary
WORKDIR /app/evertext_brain
RUN cargo build --release

# --- Stage 2: Runtime Environment ---
FROM node:20-slim AS runner

WORKDIR /app

# Install Chromium dependencies for Puppeteer (Runtime only)
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files and install PROD dependencies
COPY package*.json ./
RUN npm install --production --ignore-scripts

# Copy React Brain Binary from builder stage
COPY --from=builder /app/evertext_brain/target/release/evertext_brain ./evertext_brain/target/release/
# Note: On Windows host -> Linux container, binary name might need adjustment if cross-compiling,
# but here we build IN container so it's correct.
# Handle potential windows extension if builder runs on windows (not typical for Dockerfile but safe)
# In Linux container it won't have .exe.

# Copy application source code
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
