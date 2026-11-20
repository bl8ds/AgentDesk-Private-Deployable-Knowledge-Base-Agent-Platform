#!/bin/bash
set -euo pipefail
docker run --rm --network agentdesk-network --entrypoint /bin/sh minio/mc -c '
mc alias set m http://minio:9000 minioadmin CHANGE_ME
mc mb -p m/agentdesk || true
mc ls m
'