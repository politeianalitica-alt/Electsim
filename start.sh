#!/usr/bin/env bash
# start.sh — Arrancar ElectSim España
set -e
cd "$(dirname "$0")"

echo "========================================================"
echo "  ElectSim España — Arranque Local"
echo "========================================================"

# 1. PostgreSQL
if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    echo "  ✓ PostgreSQL activo"
else
    echo "  → Arrancando PostgreSQL..."
    # Linux (systemd / pg_ctlcluster)
    if command -v pg_ctlcluster &>/dev/null; then
        sudo pg_ctlcluster 16 main start 2>/dev/null || true
    elif command -v brew &>/dev/null; then
        brew services start postgresql@16
    fi
    sleep 2
    pg_isready -h localhost -p 5432 -q && echo "  ✓ PostgreSQL activo" || echo "  ! No se pudo iniciar PostgreSQL"
fi

# 2. Ollama (si está instalado)
if command -v ollama &>/dev/null; then
    if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
        echo "  → Arrancando Ollama..."
        ollama serve &>/dev/null &
        sleep 3
        echo "  ✓ Ollama activo ($(ollama list 2>/dev/null | tail -n +2 | wc -l) modelos)"
    else
        echo "  ✓ Ollama ya activo"
    fi
else
    echo "  - Ollama no instalado — usando fallback Claude API"
fi

# 3. Dashboard
echo ""
echo "  → Arrancando dashboard en http://localhost:8501"
echo ""

# Virtual env
if [ -f ".venv/bin/streamlit" ]; then
    STREAMLIT=".venv/bin/streamlit"
elif command -v streamlit &>/dev/null; then
    STREAMLIT="streamlit"
else
    echo "ERROR: streamlit no encontrado. Ejecuta: python -m venv .venv && .venv/bin/pip install -r requirements.txt"
    exit 1
fi

export DATABASE_URL="postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana"

$STREAMLIT run dashboard/app.py \
    --server.port 8501 \
    --server.headless false \
    --browser.gatherUsageStats false
