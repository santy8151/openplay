.PHONY: all install build test test-go test-rust wasm e2e up down

all: build test

install:
	npm install

build:
	npm run build

test:
	npm test

test-go:
	cd apps/node && go test ./... && go vet ./...

test-rust:
	cargo test --workspace
	cargo build -p pong --target wasm32-unknown-unknown --release
	cargo build -p arena --target wasm32-unknown-unknown --release

e2e:
	npm run e2e

up:
	docker compose -f deploy/docker-compose.yml up --build

down:
	docker compose -f deploy/docker-compose.yml down -v
