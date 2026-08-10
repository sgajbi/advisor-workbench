.PHONY: install security lint typecheck test test-coverage test-runtime-ownership test-e2e build check ci-local ci-local-docker ci-local-docker-down run clean docker-up docker-down

install:
	npm ci --no-audit --no-fund

security:
	npm run security:audit

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test:coverage

test-coverage:
	npm run test:coverage

test-runtime-ownership:
	npm run test:runtime-ownership

test-e2e:
	npm run test:e2e

build:
	npm run build

check: security lint typecheck test-coverage build

ci-local: check

ci-local-docker:
	docker compose -f docker-compose.ci-local.yml up --build --abort-on-container-exit --exit-code-from ci-local ci-local

ci-local-docker-down:
	docker compose -f docker-compose.ci-local.yml down -v --remove-orphans

run:
	npm run dev

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

clean:
	rm -rf .next node_modules
