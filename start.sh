#!/usr/bin/env bash
# start.sh — Arrancar ElectSim España (PostgreSQL + Dashboard)
# Uso: bash start.sh

set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "========================================================"
echo "  ElectSim España — Arranque"
echo "========================================================"

# 1. PostgreSQL
if pg_isready -h localhost -p 5432 -q; then
    echo "  ✓ PostgreSQL ya está activo"
else
    echo "  → Arrancando PostgreSQL..."
    brew services start postgresql@16
    sleep 3
    pg_isready -h localhost -p 5432 && echo "  ✓ PostgreSQL activo"
fi

# 2. Dashboard
echo ""
echo "  → Arrancando Streamlit dashboard..."
echo "     URL: http://localhost:8501"
echo ""
.venv/bin/pip install -q -r requirements.txt -e .
.venv/bin/streamlit run dashboard/app.py \
    --server.port 8501 \
    --server.headless false \
    --browser.gatherUsageStats false
