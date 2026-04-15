#!/usr/bin/env bash
# run_seeds.sh — Población completa de ElectSim España
# Uso: bash db/seeds/run_seeds.sh [--solo-sql | --solo-python]

set -e
cd "$(dirname "$0")/../.."
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
DB_URL="postgresql://electsim:electsim@localhost:5432/electsim_espana"

echo "========================================================"
echo "  ElectSim España — Seeds"
echo "========================================================"

MODE="${1:-todo}"

if [[ "$MODE" != "--solo-python" ]]; then
    echo "→ Aplicando seeds SQL..."
    psql "$DB_URL" -f db/seeds/02_seeds.sql 2>&1 | grep -E "INSERT|ERROR" || true
    psql "$DB_URL" -f db/seeds/03_provincias_partidos.sql 2>&1 | grep -E "INSERT|ERROR" || true
    echo "  ✓ SQL seeds aplicados"
fi

if [[ "$MODE" != "--solo-sql" ]]; then
    echo "→ Ejecutando populate_all.py..."
    .venv/bin/python db/seeds/populate_all.py
fi

echo "========================================================"
echo "  LISTO. Arranca con: bash start.sh"
echo "========================================================"
