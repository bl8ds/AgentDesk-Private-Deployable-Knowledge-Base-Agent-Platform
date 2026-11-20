#!/usr/bin/env bash
# Deploy agentdesk stack via Compose on agentdesk-network (run on Tencent host under /opt/agentdesk).
set -euo pipefail

ROOT="${1:-/opt/agentdesk}"
cd "$ROOT/deploy"

if [[ ! -f agentdesk-api.env ]]; then
  cp agentdesk-api.env.example agentdesk-api.env
  echo "wrote agentdesk-api.env from example — review secrets if needed"
fi
if [[ ! -f agentdesk-agent.env ]]; then
  cp agentdesk-agent.env.example agentdesk-agent.env
  echo "wrote agentdesk-agent.env from example — fill OPENAI_* before real chat"
fi

# Ensure DB exists (idempotent)
docker exec postgres-postgres-1 psql -U root -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='agentdesk'" | grep -q 1 \
  || docker exec postgres-postgres-1 psql -U root -d postgres -c "CREATE DATABASE agentdesk;"

# MinIO bucket (best-effort; may already exist)
docker run --rm --network agentdesk-network minio/mc:latest \
  alias set local http://minio:9000 minioadmin CHANGE_ME \
  && docker run --rm --network agentdesk-network minio/mc:latest mb -p local/agentdesk \
  || true

docker compose up -d --build

echo "=== compose ps ==="
docker compose ps
echo "=== agentdesk-network ==="
docker network inspect agentdesk-network --format '{{range .Containers}}{{.Name}} {{end}}'