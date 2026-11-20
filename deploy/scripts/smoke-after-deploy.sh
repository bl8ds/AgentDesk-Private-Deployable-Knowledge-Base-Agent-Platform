#!/bin/bash
set -euo pipefail
cd /opt/agentdesk/deploy
docker compose ps
echo '--- health api ---'
curl -sf https://agentdesk-api.example.com/health && echo
echo '--- admin html ---'
curl -sf https://agentdesk-admin.example.com/ | head -c 180; echo
echo '--- chat html ---'
curl -sf https://agentdesk-chat.example.com/ | head -c 180; echo
echo '--- agent embed models ---'
docker exec agentdesk-agent wget -qO- "${EMBEDDING_BASE_URL:-http://203.0.113.11:11434/v1}/models" 2>/dev/null | head -c 400 || \
  docker exec agentdesk-agent node -e 'fetch("http://203.0.113.11:11434/v1/models").then(r=>r.text()).then(t=>console.log(t.slice(0,400))).catch(e=>console.error(String(e)))'
echo
echo '--- migrations ---'
docker exec postgres-postgres-1 psql -U root -d agentdesk -c 'select version from schema_migrations'
docker exec postgres-postgres-1 psql -U root -d agentdesk -c '\dt user_quotas'
docker exec postgres-postgres-1 psql -U root -d agentdesk -c '\dt usage_events'
echo '--- agentdesk_chunks ---'
docker exec postgres-postgres-1 psql -U root -d agentdesk -c '\d agentdesk_chunks' 2>&1 | head -20 || echo 'agentdesk_chunks not created yet (ok until first ingest)'
echo 'SMOKE_DONE'