.PHONY: install lint typecheck test build check ci-local run clean

install:
	npm install

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

build:
	npm run build

check: lint typecheck test build

ci-local: check

run:
	npm run dev

clean:
	rm -rf .next node_modules
