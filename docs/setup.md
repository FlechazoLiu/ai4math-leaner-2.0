# Environment Setup Guide

This guide will help you set up the development environment for the Leaner project.

## Prerequisites

- [Nix](https://zero-to-nix.com/start/install/) - Package manager
- [Docker](https://docs.docker.com/get-docker/) - Container platform
- [Docker Compose](https://docs.docker.com/compose/install/) - Container orchestration

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/FlechazoLiu/ai4math-leaner-2.0.git
   cd ai4math-leaner-2.0
   ```

2. **Set up Nix environment**
   ```bash
   nix develop
   ```
   This will set up all the necessary development tools and dependencies.

3. **Environment Variables**
   Create a `.env` file in the root directory with the following content:
   ```
   POSTGRES_PASSWORD=your_secure_password
   AUTH_SECRET=your_auth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```
   Create a `.env` file in `leaner-be` directory containing:
   ```
   DATABASE_URL="postgresql://postgres:${YOUR DATABASE PASSWORD}@localhost:5432/${YOUR DATABASE NAME}"
   ```
4. **Install dependencies**
   Enter the `leaner-be` directory and run the command below to create a virtual environment for python and install dependencies.
   ```
   uv venv # Create a .venv directory
   source .venv/bin/activate
   uv sync
   uv run prisma db push
   ```
   Enter the `leaner-fe` directory and run the command below to install nodejs dependencies.
   ```
   pnpm i
   ```
   You also need to generate an `AUTH_SECRET`. Use the command below to generate a `.env.local` in `leaner-fe`:
   ```
   npx auth secret
   ```
   Add a `AUTH_TRUST_HOST=true` to that file.

## Starting Services

1. **Build images (development machine)**
   ```bash
   cp .env.example .env
   make proto
   make build-images
   ```

2. **Initialize Services**
   ```bash
   make init-services
   ```
   This will start `pg`, `leaner-be`, and `leaner-fe` using local images. The
   `verifier` runs behind the `verifier` Compose profile — start it separately:
   ```bash
   make up-verifier
   ```
   The verifier maintains its own Lean 4 + Mathlib environment and needs roughly
   8 GB of RAM; on low-memory machines set `ENABLE_VERIFIER_PROFILE=false` (the
   verifier service is then skipped entirely). See
   [DEVOPS_GUIDE.md](DEVOPS_GUIDE.md) for details.

3. **Generate Protocol Buffers**
   ```bash
   make proto
   ```
   This will generate the necessary protocol buffer code for both frontend and backend.

## Offline Deployment

On development machine (with network):

```bash
cp .env.example .env
make proto
make build-images
make export-images
```

If the network is unstable when building verifier (mathlib4 clone/cache/build),
increase `MATHLIB4_RETRY_COUNT` and `MATHLIB4_RETRY_DELAY_SECONDS` in `.env`.

Copy `compose.yaml`, `.env`, and `leaner-images.tar` to production machine.

On production machine (no network required):

```bash
make load-images
make up
```

`compose.yaml` now includes a one-shot `leaner-db-bootstrap` service that runs
`prisma db push` with retries. In a blank environment, schema creation is automatic
before `leaner-be` starts.

You can also set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_USERNAME`, and
`INITIAL_ADMIN_PASSWORD` in `.env`. If provided, the bootstrap service will
create (or update) the initial admin account automatically during startup.

## Database Migration (Cross-machine)

You can export the full PostgreSQL schema + data from one machine and restore it
to another machine with the same project `.env` and `compose.yaml`.

On source machine:

```bash
make db-export
# or specify output path:
make db-export DUMP_FILE=backups/leaner-prod.dump
```

Copy the generated dump file (default path: `backups/leaner_<timestamp>.dump`)
to the target machine.

On target machine:

```bash
make load-images
docker compose up -d pg
make db-import DUMP_FILE=backups/leaner-prod.dump
make up
```

Notes:
- `db-import` will terminate active connections and recreate `DB_NAME` before restore.
- Script file: `scripts/db_migration.sh`
- Optional env overrides: `PG_SERVICE`, `DB_NAME`, `DB_USER`, `POSTGRES_PASSWORD`

## Development Workflow

### Formatting Code
```bash
make fmt
```
This will format code in:
- Protocol buffer definitions
- Frontend code (using Prettier)
- Backend code (using Ruff)

### Linting
```bash
make lint
```
This will run linters on:
- Frontend code
- Backend code
- Protocol buffer definitions

## Project Structure

- `leaner-fe/` - Frontend application
- `leaner-be/` - Backend application
- `protos/` - Protocol buffer definitions
- `docs/` - Documentation

## Database

The project uses PostgreSQL as its database. The database is containerized and managed through Docker Compose.

- Host: localhost
- Port: 5432
- Username: postgres
- Password: (set in .env file)
- Database: postgres

## Troubleshooting

If you encounter any issues:

1. Ensure all prerequisites are installed
2. Check if Docker containers are running properly
3. Verify environment variables are set correctly
4. Try running `make init-services` again if services fail to start
