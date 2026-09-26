#!/usr/bin/env sh
set -eu

RETRIES="${DB_BOOTSTRAP_RETRIES:-60}"
DELAY_SECONDS="${DB_BOOTSTRAP_DELAY_SECONDS:-2}"

echo "Bootstrapping database resources with Prisma..."
echo "Retries: ${RETRIES}, delay: ${DELAY_SECONDS}s"

retry_cmd() {
  description="$1"
  shift
  attempt=1

  while [ "$attempt" -le "$RETRIES" ]; do
    if "$@"; then
      echo "${description} succeeded."
      return 0
    fi

    echo "Attempt ${attempt}/${RETRIES} failed for ${description}; retrying in ${DELAY_SECONDS}s..."
    attempt=$((attempt + 1))
    sleep "$DELAY_SECONDS"
  done

  echo "${description} failed after ${RETRIES} attempts."
  return 1
}

retry_cmd "Database schema bootstrap (prisma db push)" uv run prisma db push --accept-data-loss

if [ -n "${INITIAL_ADMIN_EMAIL:-}" ] || [ -n "${INITIAL_ADMIN_USERNAME:-}" ] || [ -n "${INITIAL_ADMIN_PASSWORD:-}" ]; then
  retry_cmd "Initial admin bootstrap" uv run python scripts/bootstrap_admin.py
else
  echo "Initial admin bootstrap skipped: admin env vars are empty."
fi

echo "Database bootstrap completed."
