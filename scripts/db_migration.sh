#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PG_SERVICE="${PG_SERVICE:-pg}"
DB_NAME="${DB_NAME:-leaner}"
DB_USER="${DB_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

usage() {
  cat <<'EOF'
Usage:
  scripts/db_migration.sh export [output_file]
  scripts/db_migration.sh import <input_file>

Description:
  export  Export full PostgreSQL schema + data from compose service "pg".
  import  Restore a dump file into target DB (drop + recreate database first).

Environment variables (optional):
  PG_SERVICE          Compose postgres service name (default: pg)
  DB_NAME             Target database name (default: leaner)
  DB_USER             Target database user (default: postgres)
  POSTGRES_PASSWORD   Database password (required)

Examples:
  scripts/db_migration.sh export backups/leaner.dump
  scripts/db_migration.sh import backups/leaner.dump
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1"
    exit 1
  fi
}

require_compose() {
  if ! docker compose version >/dev/null 2>&1; then
    echo "Error: Docker Compose plugin is unavailable."
    exit 1
  fi
}

require_db_password() {
  if [[ -z "${POSTGRES_PASSWORD}" ]]; then
    echo "Error: POSTGRES_PASSWORD is empty. Set it in .env or environment."
    exit 1
  fi
}

ensure_pg_running() {
  if ! docker compose ps --services --status running | grep -Fxq "${PG_SERVICE}"; then
    echo "Error: postgres service '${PG_SERVICE}' is not running."
    echo "Run: docker compose up -d ${PG_SERVICE}"
    exit 1
  fi
}

export_db() {
  local output_file="${1:-}"
  if [[ -z "${output_file}" ]]; then
    local ts
    ts="$(date +%Y%m%d_%H%M%S)"
    output_file="backups/leaner_${ts}.dump"
  fi

  mkdir -p "$(dirname "${output_file}")"
  echo "Exporting database '${DB_NAME}' to ${output_file} ..."

  docker compose exec -T \
    -e "PGPASSWORD=${POSTGRES_PASSWORD}" \
    "${PG_SERVICE}" \
    pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --no-owner \
    --no-privileges > "${output_file}"

  if [[ ! -s "${output_file}" ]]; then
    echo "Error: dump file is empty: ${output_file}"
    exit 1
  fi

  echo "Export complete: ${output_file}"
}

import_db() {
  local input_file="${1:-}"
  if [[ -z "${input_file}" ]]; then
    echo "Error: import requires input file."
    usage
    exit 1
  fi
  if [[ ! -f "${input_file}" ]]; then
    echo "Error: input file does not exist: ${input_file}"
    exit 1
  fi

  echo "Restoring '${input_file}' to database '${DB_NAME}' ..."

  docker compose exec -T \
    -e "PGPASSWORD=${POSTGRES_PASSWORD}" \
    "${PG_SERVICE}" \
    psql \
    -U "${DB_USER}" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" \
    -c "CREATE DATABASE \"${DB_NAME}\";"

  docker compose exec -T \
    -e "PGPASSWORD=${POSTGRES_PASSWORD}" \
    "${PG_SERVICE}" \
    pg_restore \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-privileges < "${input_file}"

  echo "Restore complete."
}

main() {
  local action="${1:-}"
  case "${action}" in
    -h|--help|help)
      usage
      ;;
    export|import)
      require_cmd docker
      require_compose
      require_db_password
      ensure_pg_running
      ;;
    "")
      echo "Error: missing action."
      usage
      exit 1
      ;;
    *)
      echo "Error: unknown action '${action}'."
      usage
      exit 1
      ;;
  esac

  case "${action}" in
    export)
      export_db "${2:-}"
      ;;
    import)
      import_db "${2:-}"
      ;;
  esac
}

main "$@"
