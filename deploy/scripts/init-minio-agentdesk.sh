#!/usr/bin/env bash
# Ensure MinIO bucket + optional policy for agentdesk. Idempotent. Trace log under ops-log/.
set -euo pipefail
LOG_DIR="${AGENTDESK_OPS_LOG_DIR:-/opt/agentdesk/deploy/ops-log}"
mkdir -p "$LOG_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="$LOG_DIR/minio-init-$STAMP.log"

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-CHANGE_ME}"
BUCKET="${S3_BUCKET:-agentdesk}"

{
  echo "=== minio init @ $STAMP endpoint=$MINIO_ENDPOINT bucket=$BUCKET ==="
  docker pull minio/mc:latest >/dev/null
  docker run --rm --network agentdesk-network --entrypoint /bin/sh minio/mc:latest -c "
    mc alias set local '$MINIO_ENDPOINT' '$MINIO_USER' '$MINIO_PASS' &&
    mc mb -p local/$BUCKET &&
    mc anonymous set none local/$BUCKET &&
    mc ls local/
  "
  echo "=== done ==="
} | tee "$LOG"

echo "wrote $LOG"