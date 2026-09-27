# leaner-be

The backend of [Leaner](../README.md) — an async Python gRPC service (`leaner.v1`) holding all business logic: users and roles, courses, assignments, submissions, grading, discussions, and notifications. It talks to PostgreSQL via Prisma and forwards Lean verification requests to the `verifier` service.

## Stack

- Python 3.13, [grpc.aio](https://grpc.github.io/grpc/python/) async server on `:7720`
- [Prisma (Python)](https://prisma-client-py.readthedocs.io/) with the schema in `prisma/schema.prisma`
- [uv](https://docs.astral.sh/uv/) for dependency management (`pyproject.toml` + `uv.lock`)

## Development

From the repository root (`nix develop` provides Python and uv):

```bash
uv venv && source .venv/bin/activate
uv sync
uv run prisma db push    # apply schema to the running PostgreSQL
make proto               # regenerate gRPC stubs from ../protos (root Makefile)
uv run python main.py    # start the gRPC server
```

Requires a running PostgreSQL (see [../docs/setup.md](../docs/setup.md)); connection string goes in `.env` as `DATABASE_URL`.

Production runs as a container built from this directory's `Dockerfile` (target `production`); `scripts/bootstrap_db.sh` (run by the `leaner-db-bootstrap` Compose service) pushes the schema and optionally creates the initial admin from `INITIAL_ADMIN_*` variables.

## Layout

- `main.py` — server entry point
- `leaner_be/services/` — gRPC service implementations (users, courses, assignments, questions, answers, grading, comments, notifications, resources, …)
- `prisma/schema.prisma` — data model
- `scripts/` — DB bootstrap (`bootstrap_db.sh`, `bootstrap_admin.py`) and admin utilities
- `config.yaml` — runtime configuration
