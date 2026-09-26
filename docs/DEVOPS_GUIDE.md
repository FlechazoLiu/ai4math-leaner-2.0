---
version: 2.0.0
last_updated: 2026-07-15
---

# DevOps Guide — Leaner

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [Deployment](#4-deployment)
5. [Configuration Reference](#5-configuration-reference)
6. [Admin Operations](#6-admin-operations)
7. [Troubleshooting](#7-troubleshooting)
8. [Architecture](#8-architecture)

---

## 1. System Overview

Leaner is a formal verification learning platform for Lean 4 mathematical proofs. It consists of 4 Docker containers:

| Container | Role | Port |
|-----------|------|------|
| `leaner-db` | PostgreSQL database | 5432 |
| `leaner-be` | Python gRPC backend | 7720 |
| `leaner-fe` | Next.js frontend (SSR) | 3000 |
| `verifier` | Lean 4 proof verifier (optional) | 8030 |

### Tech Stack
- **Frontend**: Next.js 15.3 (App Router), React 19, Tailwind CSS v4, shadcn/ui, @connectrpc/connect (gRPC)
- **Backend**: Python 3.13, gRPC (aio), Prisma ORM
- **Verifier**: Lean 4 v4.22.0 + mathlib4
- **Database**: PostgreSQL 17

---

## 2. Prerequisites

### Hardware Requirements
| Mode | RAM | Disk | Use Case |
|------|-----|------|----------|
| **Basic** (no verifier) | 2 GB | 10 GB | Low-traffic, learning |
| **Full** (with verifier) | 4+ GB | 20 GB | Production with proof checking |

### Software
- Docker + Docker Compose v2
- Python 3.12+ (for local backend dev)
- Node.js 22+ (for local frontend dev)
- Buf CLI (for proto code generation)

---

## 3. Local Development Setup

### 3.1 Clone & Configure

```bash
git clone <repo-url> leaner
cd leaner
cp .env.example .env
# Edit .env with your settings
```

### 3.2 Environment Variables

Minimal `.env` configuration:

```env
POSTGRES_PASSWORD=your_secure_password
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# Admin bootstrap (optional)
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=your_admin_password
```

### 3.3 Start Database

```bash
docker compose up -d pg
```

### 3.4 Generate Proto Code

```bash
# Install Buf CLI first
cd protos
buf generate
```

### 3.5 Run Backend

```bash
cd leaner-be
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Generate Prisma client
prisma generate
# Run migrations (first time)
prisma db push
# Start the server
python main.py
```

### 3.6 Run Frontend

```bash
cd leaner-fe
npm install
# Generate proto TypeScript types (if proto changed)
npm run gen
# Start dev server
npm run dev
```

The frontend will be at `http://localhost:3000`.

---

## 4. Deployment

### 4.1 Build Images

```bash
# Build all images
cd leaner
docker build -t leaner/leaner-fe:latest leaner-fe/
docker build -t leaner/leaner-be:latest leaner-be/
docker build -t leaner/verifier:latest verifier/
```

### 4.2 Deploy (Single Server)

```bash
# Save images
docker save leaner/leaner-fe:latest > /tmp/leaner-fe.tar
docker save leaner/leaner-be:latest > /tmp/leaner-be.tar

# Upload to server
rsync -P /tmp/leaner-fe.tar user@server:/path/to/deploy/
rsync -P /tmp/leaner-be.tar user@server:/path/to/deploy/

# On the server
cd /path/to/deploy
docker load < leaner-fe.tar
docker load < leaner-be.tar

# Start without verifier
docker compose up -d

# Or start with verifier
docker compose --profile verifier up -d
```

### 4.3 First-Time Setup

On first boot, the `leaner-db-bootstrap` container:
1. Waits for PostgreSQL to be healthy
2. Runs `prisma db push` to create/migrate tables
3. Creates the initial admin account (if configured via `INITIAL_ADMIN_*` env vars)
4. Exits

If `prisma db push` shows a data loss warning, re-run with `--accept-data-loss`:

```bash
docker compose run leaner-db-bootstrap sh -c "cd /app && npx prisma db push --accept-data-loss"
```

### 4.4 Updating

```bash
# Build new images locally
# Save & upload to server
# On server:
docker load < leaner-fe.tar
docker load < leaner-be.tar
docker compose up -d
```

---

## 5. Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | — | PostgreSQL password (required) |
| `DATABASE_URL` | `postgresql://postgres:${POSTGRES_PASSWORD}@pg:5432/leaner` | DB connection string |
| `AUTH_SECRET` | — | NextAuth JWT encryption secret (required) |
| `NEXTAUTH_URL` | — | Public URL of the frontend (required for production) |
| `INITIAL_ADMIN_EMAIL` | — | Email for the initial admin account |
| `INITIAL_ADMIN_USERNAME` | — | Username for the initial admin account |
| `INITIAL_ADMIN_PASSWORD` | — | Password for the initial admin account |
| `DISABLE_SELF_REGISTRATION` | `true` | Set to `false` to allow self-registration |
| `LEANER_FE_IMAGE` | `leaner/leaner-fe:latest` | Frontend Docker image tag |
| `LEANER_BE_IMAGE` | `leaner/leaner-be:latest` | Backend Docker image tag |
| `PG_IMAGE` | `leaner/postgres:17` | PostgreSQL Docker image tag |

### Verifier Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_VERIFIER` | `false` | Enable Lean code verification |
| `VERIFIER_MEM_LIMIT` | `4g` | Memory limit for the verifier container |
| `VERIFIER_MEMSWAP_LIMIT` | `8g` | Swap limit for the verifier container |

---

## 6. Admin Operations

### 6.1 Creating Users

**Single user:**
1. Login as admin → **User Management**
2. Click **Create User**
3. Fill in: Student ID, Display Name, Email (optional), Role
4. Click **Create User**

**Batch import:**
1. Go to **User Management** → **Batch Import**
2. Select role (default: Student)
3. Upload a CSV file or paste data:
   ```
   student_id,display_name,email
   2024000001,Alice Chen,alice@example.com
   ```
4. Click **Import N user(s)**

### 6.2 Managing Roles

Change a user's role using the **Role dropdown** in the User Management table:
- **Admin** — full system access
- **Teacher** — can create courses, manage assignments, grade
- **Assistant (TA)** — can manage assigned courses
- **Student** — can view courses and submit answers

### 6.3 Resetting Passwords

Click **Reset** next to a user in User Management. Their password resets to `1234567890` and they will be forced to change it on next login.

### 6.4 Deleting Users

Click **Delete** (trash icon) next to a user. Admin users cannot be deleted.

### 6.5 Checking Verifier Status

Go to **Settings** (admin only) to see verifier health, user count, and deployment mode.

---

## 7. Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker compose logs leaner-db --tail=50
docker compose logs leaner-be --tail=50
docker compose logs leaner-fe --tail=50

# Restart everything
docker compose down
docker compose up -d
```

### Database Issues

```bash
# Check if DB is healthy
docker compose ps pg

# Restart DB
docker compose restart pg

# If DB fails to start with "No space left on device"
df -h
docker system prune -f
```

### Prisma Migration Issues

```bash
# Run with data loss acceptance (adds new columns)
docker compose run --no-deps leaner-be sh -c "cd /app && npx prisma db push --accept-data-loss"
```

### Frontend Build Fails

```bash
# Google Fonts not accessible (in China)
# Layout uses system fonts instead of Inter
# If changing fonts, ensure they work in your network

# Check if build succeeds locally
cd leaner-fe
npm run build
```

### Verifier Not Working

```bash
# Check verifier health
curl http://localhost:8030/health

# Memory issues? Check limits
docker compose logs verifier --tail=20

# The verifier requires 4GB+ RAM. Consider disabling if resources are tight:
# Remove --profile verifier from docker compose command
```

### Student Search Not Working

Ensure the backend is running the latest code. The `ListUsers` method searches across `username`, `displayName`, `email`, and `studentId` fields.

---

## 8. Architecture

```
┌─────────────┐     gRPC (7720)     ┌──────────────┐
│             │ ◄───────────────── │              │
│  leaner-fe  │                     │  leaner-be   │
│  (Next.js)  │ ─────────────────► │  (Python)    │
│  Port 3000  │     HTTP/JSON       │              │
└─────────────┘                     └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │  PostgreSQL  │
                                    │  leaner-db   │
                                    │  Port 5432   │
                                    └──────────────┘
                                           │
                                    ┌──────▼───────┐
                                    │  Verifier    │
                                    │  (Lean 4)    │
                                    │  Port 8030   │
                                    └──────────────┘
```

### v2.0.0 New Features

| Feature | Description |
|---------|-------------|
| **Gradebook** | GradebookTab component showing student×assignment score matrix |
| **ReturnAssignmentAnswer** | Teachers can return submissions (sets isDraft=true, clears grades) |
| **BatchReturnAssignmentAnswers** | Return all submissions for an assignment question at once |
| **Compile-fail resubmit** | Students can revise answers that failed Lean verification |
| **Delete Assignment** | Delete assignments from the management tab |
| **Author names** | AssignmentAnswer now includes authorName and questionTitle |
| **DB Backup** | Automatic backup script, 8-hour cron job |

### Proto Structure
All API definitions are in `protos/leaner/v1/leaner.proto`:
- **UserService** — login, user management, batch import
- **CourseService** — courses, enrollment, teaching assignments
- **AssignmentService** — assignments and questions
- **AnswerService** — submissions, grading, verification
- **NotificationService** — course notifications
- **PostService / CommentService** — discussions
- **ResourceService** — resource management
- **TagService** — question tagging

### Code Generation
After modifying `protos/leaner/v1/leaner.proto`:
```bash
cd protos
buf generate
```

This generates:
- `leaner-be/leaner_be/gen/` — Python gRPC stubs
- `leaner-fe/lib/gen/` — TypeScript types and clients
