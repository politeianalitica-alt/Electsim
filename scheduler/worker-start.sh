#!/usr/bin/env bash
# Arranque del worker Celery en Railway (Sprint Railway R2).
# Procesa las 5 colas. Concurrencia y memoria por env para right-sizing.
set -euo pipefail

exec celery -A scheduler.celery_app worker \
  -Q "${CELERY_QUEUES:-ingesta,nlp,ollama,intelligence,mantenimiento}" \
  --concurrency="${CELERY_CONCURRENCY:-4}" \
  --max-memory-per-child="${CELERY_MAX_MEM_KB:-1500000}" \
  --loglevel="${CELERY_LOGLEVEL:-info}"
