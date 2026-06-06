#!/usr/bin/env bash
# Arranque del scheduler Celery beat en Railway (Sprint Railway R2).
# Servicio always-on de 1 instancia: dispara las tareas programadas
# (ingesta horaria, Ollama 30min, healthcheck 5min, VACUUM semanal, briefings).
set -euo pipefail

exec celery -A scheduler.celery_app beat \
  --loglevel="${CELERY_LOGLEVEL:-info}"
