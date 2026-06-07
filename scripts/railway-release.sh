#!/usr/bin/env bash
# Release command de Railway (Sprint Railway R3).
# Se configura en el dashboard del servicio `api` como "release command" (o
# pre-deploy). Aplica migraciones Alembic de forma idempotente ANTES de que
# arranque la nueva versión, para que el esquema esté siempre al día.
#
#   alembic upgrade head  → seguro e idempotente (nunca hace downgrade).
#
# Si DATABASE_URL no está, sale 0 (no rompe el deploy; útil en previews).
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway-release] DATABASE_URL no definida · se saltan las migraciones"
  exit 0
fi

echo "[railway-release] Aplicando migraciones · alembic upgrade head"
alembic upgrade head
echo "[railway-release] Migraciones al día ✓"
