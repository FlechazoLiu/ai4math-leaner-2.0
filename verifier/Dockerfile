# Multi-stage Dockerfile for Python backend using UV
FROM python:3.13-slim-bookworm AS base

# Install system dependencies
RUN echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian bookworm main" > /etc/apt/sources.list && \
    echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main" >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y \
    curl git build-essential zstd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker.io/astral/uv:latest /uv /uvx /bin/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
# ENV UV_CACHE_DIR=/tmp/uv-cache

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

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN groupadd --gid 1001 --system app && \
    useradd --uid 1001 --system --gid app --create-home --shell /bin/bash app

# Copy virtual environment from deps stage
COPY --from=deps --chown=app:app /app/.venv /app/.venv

# Copy source code
COPY --chown=app:app . .

# Install the project in production mode
RUN uv sync --frozen --no-dev

ARG LEAN_VERSION=v4.22.0
ARG MATHLIB4_VERSION=v4.22.0
ARG MATHLIB4_RETRY_COUNT=5
ARG MATHLIB4_RETRY_DELAY_SECONDS=10

ENV LEAN_TOOLCHAIN=leanprover/lean4:${LEAN_VERSION}
ENV MATHLIB4_VERSION=${MATHLIB4_VERSION}

ENV ELAN_HOME=/usr/local/elan PATH=/usr/local/elan/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Install elan (Lean version manager) — skip toolchain download, we do that separately
RUN curl https://elan.lean-lang.org/elan-init.sh -sSf | sh -s -- -y --no-modify-path --default-toolchain none && \
    chmod -R a+w $ELAN_HOME && \
    elan --version

# Download Lean toolchain from GitHub releases (releases.lean-lang.org is too slow from China)
RUN TOOLCHAIN_DIR="$ELAN_HOME/toolchains/leanprover_lean4_${LEAN_VERSION}" && \
    mkdir -p "$TOOLCHAIN_DIR" && \
    curl -fsSL --retry 5 --retry-delay 10 \
      "https://github.com/leanprover/lean4/releases/download/${LEAN_VERSION}/lean-${LEAN_VERSION#v}-linux.tar.zst" \
      -o /tmp/lean.tar.zst && \
    tar --zstd -xf /tmp/lean.tar.zst -C "$TOOLCHAIN_DIR" && \
    rm /tmp/lean.tar.zst && \
    chmod -R a+w "$TOOLCHAIN_DIR" && \
    elan default leanprover/lean4:${LEAN_VERSION} && \
    lean --version && \
    lake --version

# Build mathlib4 during image build so runtime can stay offline.
# Uses lake exe cache get to download prebuilt .olean files (much faster than building from source).
# Retry logic tolerates transient network instability.
RUN set -eux; \
    retry() { \
      max_attempts="$1"; \
      base_delay="$2"; \
      shift 2; \
      attempt=1; \
      until "$@"; do \
        if [ "$attempt" -ge "$max_attempts" ]; then \
          echo "Command failed after $attempt attempts: $*"; \
          return 1; \
        fi; \
        sleep_for=$((attempt * base_delay)); \
        echo "Attempt $attempt failed. Retrying in ${sleep_for}s: $*"; \
        attempt=$((attempt + 1)); \
        sleep "$sleep_for"; \
      done; \
    }; \
    echo "Cloning mathlib4 (tag: $MATHLIB4_VERSION)..."; \
    retry "$MATHLIB4_RETRY_COUNT" "$MATHLIB4_RETRY_DELAY_SECONDS" sh -c \
      'rm -rf /opt/mathlib4 && git clone --depth 1 --branch "$MATHLIB4_VERSION" \
       https://github.com/leanprover-community/mathlib4.git /opt/mathlib4'; \
    cd /opt/mathlib4; \
    echo "Downloading prebuilt .olean cache..."; \
    retry "$MATHLIB4_RETRY_COUNT" "$MATHLIB4_RETRY_DELAY_SECONDS" lake exe cache get; \
    echo "Building Mathlib (this may take 10-30 minutes)..."; \
    retry "$MATHLIB4_RETRY_COUNT" "$MATHLIB4_RETRY_DELAY_SECONDS" lake build Mathlib; \
    echo "Mathlib build complete."

# Set PATH to include virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Set default environment variables
ENV PYTHONPATH="/app"
ENV REPO_URL_OR_PATH="/opt/mathlib4"
ENV WORKERS="1"

# Expose port
EXPOSE 8030

# Run the application
CMD ["uv", "run", "python", "main.py"]
