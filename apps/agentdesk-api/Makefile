.PHONY: migrate-up migrate-down run test build tidy

migrate-up:
	go run ./cmd/migrate -cmd up

migrate-down:
	go run ./cmd/migrate -cmd down -steps 1

run:
	go run ./cmd/app

test:
	go test ./... -count=1

tidy:
	go mod tidy

build:
	go build -o bin/agentdesk-api ./cmd/app
	go build -o bin/agentdesk-migrate ./cmd/migrate