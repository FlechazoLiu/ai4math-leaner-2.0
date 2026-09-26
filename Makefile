.PHONY: init-services up up-verifier down prepare-pg-image build-images export-images load-images db-export db-import fmt lint proto

init-services:
	docker compose up --wait

up:
	docker compose up -d

# Start with verifier enabled (requires 4+ GB RAM server with mathlib4 built)
up-verifier:
	docker compose --profile verifier up -d

down:
	docker compose --profile verifier down

prepare-pg-image:
	@bash -lc '[ -f .env ] && source .env || true; \
	PG_IMAGE_VAL=$${PG_IMAGE:-leaner/postgres:17}; \
	docker pull postgres:17; \
	docker tag postgres:17 $$PG_IMAGE_VAL'

build-images: prepare-pg-image
	docker compose -f compose.build.yaml build

export-images:
	@bash -lc '[ -f .env ] && source .env || true; \
	docker save \
		$${PG_IMAGE:-leaner/postgres:17} \
		$${LEANER_BE_IMAGE:-leaner/leaner-be:latest} \
		$${LEANER_FE_IMAGE:-leaner/leaner-fe:latest} \
		$${VERIFIER_IMAGE:-leaner/verifier:latest} \
		-o leaner-images.tar'

load-images:
	docker load -i leaner-images.tar

db-export:
	./scripts/db_migration.sh export "$(DUMP_FILE)"

db-import:
	@test -n "$(DUMP_FILE)" || (echo "Usage: make db-import DUMP_FILE=backups/leaner.dump" && exit 1)
	./scripts/db_migration.sh import "$(DUMP_FILE)"

fmt:
	(cd protos && buf format -w)
	(cd leaner-fe && prettier . -w)
	(cd leaner-be && ruff format .)

lint:
	(cd leaner-fe && pnpm i && pnpm lint)
	(cd leaner-be && ruff check .)
	(cd protos && buf lint)

proto:
	(cd protos && buf generate)
	(cd leaner-fe && pnpm i && rm -rf lib/gen && pnpm exec buf generate ../protos/leaner/v1/leaner.proto)
