#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

if [ ! -f "$VENV/bin/activate" ]; then
  echo "ERROR: .venv no encontrado."
  echo "Ejecuta: python3.11 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt"
  exit 1
fi

# shellcheck disable=SC1090
source "$VENV/bin/activate"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "ERROR: .env no encontrado."
  echo "Ejecuta: cp .env.example .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$SCRIPT_DIR/.env"
set +a

for VAR in POSTGRES_PASSWORD DATABASE_URL; do
  if ! grep -q "^${VAR}=" "$SCRIPT_DIR/.env"; then
    echo "ADVERTENCIA: ${VAR} no está definida en .env"
  fi
done

LLM_PROVIDER="${ELECTSIM_LLM_PROVIDER:-anthropic}"
case "${LLM_PROVIDER}" in
  openai)
    if [ -z "${OPENAI_API_KEY:-}" ]; then
      echo "ADVERTENCIA: ELECTSIM_LLM_PROVIDER=openai pero OPENAI_API_KEY está vacío"
    fi
    ;;
  anthropic)
    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
      echo "ADVERTENCIA: ELECTSIM_LLM_PROVIDER=anthropic pero ANTHROPIC_API_KEY está vacío"
    fi
    ;;
  ollama|stub)
    ;;
  *)
    echo "ADVERTENCIA: ELECTSIM_LLM_PROVIDER desconocido (${LLM_PROVIDER})"
    ;;
esac

export PYTHONPATH="$SCRIPT_DIR${PYTHONPATH:+:$PYTHONPATH}"

exec streamlit run app.py \
  --server.port "${STREAMLIT_PORT:-8501}" \
  --server.headless "${STREAMLIT_HEADLESS:-false}" \
  --browser.gatherUsageStats false "$@"
