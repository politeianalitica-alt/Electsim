#!/usr/bin/env bash
# Arranca el backend FastAPI + túnel Cloudflare y actualiza BACKEND_URL en Vercel.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"
VERCEL_ALIAS="politeia-visual-oscar.vercel.app"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "=== Politeia Online Starter ==="

# 1. Verificar backend
if curl -sf http://localhost:8000/api/system/health > /dev/null 2>&1; then
  echo "[✓] Backend ya corriendo en :8000"
else
  echo "[→] Iniciando backend FastAPI..."
  source "$VENV/bin/activate"
  set -a; source "$SCRIPT_DIR/.env"; set +a
  nohup "$VENV/bin/uvicorn" api.main:app --host 0.0.0.0 --port 8000 \
    > "$LOG_DIR/backend.log" 2>&1 &
  echo "[→] Esperando startup (10s)..."
  sleep 10
  if curl -sf http://localhost:8000/api/system/health > /dev/null 2>&1; then
    echo "[✓] Backend listo"
  else
    echo "[✗] Backend no arrancó — revisa logs/backend.log"
    exit 1
  fi
fi

# 2. Tunnel Cloudflare
if pgrep -f "cloudflared tunnel" > /dev/null; then
  echo "[✓] Túnel Cloudflare ya activo"
  TUNNEL_URL=$(ps aux | grep "cloudflared tunnel" | grep -v grep | head -1 | grep -oP 'https://[^\s]+\.trycloudflare\.com' || true)
else
  echo "[→] Iniciando túnel Cloudflare..."
  nohup cloudflared tunnel --url http://localhost:8000 \
    > "$LOG_DIR/cloudflare.log" 2>&1 &
  echo "[→] Esperando URL del túnel (10s)..."
  sleep 10
  TUNNEL_URL=$(grep -oP 'https://[^\s]+\.trycloudflare\.com' "$LOG_DIR/cloudflare.log" | head -1)
fi

if [ -z "${TUNNEL_URL:-}" ]; then
  echo "[→] Reintentando lectura del log..."
  sleep 5
  TUNNEL_URL=$(grep -oP 'https://[^\s]+\.trycloudflare\.com' "$LOG_DIR/cloudflare.log" | head -1)
fi

if [ -z "${TUNNEL_URL:-}" ]; then
  echo "[✗] No se pudo obtener URL del túnel — revisa logs/cloudflare.log"
  exit 1
fi

echo "[✓] Túnel: $TUNNEL_URL"

# 3. Verificar acceso público
if curl -sf "$TUNNEL_URL/api/system/health" > /dev/null 2>&1; then
  echo "[✓] Backend accesible públicamente"
else
  echo "[✗] Backend no accesible desde el exterior"
  exit 1
fi

# 4. Actualizar BACKEND_URL en Vercel
echo "[→] Actualizando BACKEND_URL en Vercel..."
vercel env rm BACKEND_URL production --yes 2>/dev/null || true
echo "$TUNNEL_URL" | vercel env add BACKEND_URL production

echo ""
echo "==================================================="
echo " Politeia está online"
echo " Frontend: https://$VERCEL_ALIAS"
echo " Backend:  $TUNNEL_URL"
echo " Vercel BACKEND_URL: actualizado"
echo "==================================================="
echo ""
echo "Para parar: kill \$(pgrep -f uvicorn) \$(pgrep -f cloudflared)"
