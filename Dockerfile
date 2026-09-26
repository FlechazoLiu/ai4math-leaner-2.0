# Multi-stage Dockerfile for Python backend using UV
FROM python:3.13-slim-bullseye AS base

# Install system dependencies
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list && \
    apt-get update && apt-get install -y \
    curl git libatomic1 libstdc++6 xz-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker.io/astral/uv:latest /uv /uvx /bin/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# --- Pre-populate prisma-python nodeenv cache ---
# prisma-python's ensure_cached() checks /root/.cache/prisma-python/nodeenv/
# If the directory exists with a valid node binary, it skips the nodejs.org download.
# We download Node.js from npmmirror and place it where nodeenv expects it.
ARG NODE_VERSION=26.5.0
RUN mkdir -p /root/.cache/prisma-python/nodeenv && \
    curl -fsSL --retry 5 --retry-delay 5 \
      "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
      -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz -C /tmp && \
    cp -r /tmp/node-v${NODE_VERSION}-linux-x64/* /root/.cache/prisma-python/nodeenv/ && \
    rm -rf /tmp/node.tar.xz /tmp/node-v${NODE_VERSION}-linux-x64 && \
    /root/.cache/prisma-python/nodeenv/bin/node --version && \
    PATH=/root/.cache/prisma-python/nodeenv/bin:$PATH \
    /root/.cache/prisma-python/nodeenv/bin/npm config set registry https://registry.npmmirror.com/ && \
    echo "Node.js pre-cached for prisma-python"

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies with UV
RUN uv sync --frozen --no-install-project --no-dev

# Development stage (optional for development builds)
FROM deps AS dev
WORKDIR /app

# Copy source code
COPY . .

# Install the project in development mode
RUN uv sync --frozen --no-dev

# Generate Prisma client (uses pre-cached nodeenv, skips nodejs.org download)
RUN uv run prisma generate

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN groupadd --gid 1001 --system app && \
    useradd --uid 1001 --system --gid app --create-home --shell /bin/bash app

# Copy pre-cached nodeenv for prisma generate in production stage too
COPY --from=deps --chown=app:app /app/.venv /app/.venv

# Copy source code
COPY --chown=app:app . .

# Install the project in production mode
RUN uv sync --frozen --no-dev

# Ensure bootstrap script is executable in image
RUN chmod +x /app/scripts/bootstrap_db.sh

# Generate Prisma client (uses pre-cached nodeenv, skips nodejs.org download)
RUN uv run prisma generate
# Set PATH to include virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Set default environment variables
ENV BACKEND_PORT="7720"
ENV PYTHONPATH="/app"


# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import grpc; channel = grpc.insecure_channel('localhost:7720'); channel.close()" || exit 1

# Expose port
EXPOSE 7720

# Run the application
CMD ["uv", "run", "python", "main.py"]
