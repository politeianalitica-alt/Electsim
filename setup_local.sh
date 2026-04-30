#!/usr/bin/env bash
# setup_local.sh — Arranque completo de ElectSim España en local
# Uso: bash setup_local.sh
# Requisitos: Docker Desktop (o docker + docker compose), Ollama instalado
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${CYAN}  →${NC} $*"; }
ok()      { echo -e "${GREEN}  ✓${NC} $*"; }
warn()    { echo -e "${AMBER}  !${NC} $*"; }
error()   { echo -e "${RED}  ✗${NC} $*"; exit 1; }

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  ElectSim España — Setup Local                 ${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

# ── 1. Requisitos ─────────────────────────────────────────────────────────────
info "Comprobando requisitos..."

command -v docker   &>/dev/null || error "Docker no encontrado. Instala Docker Desktop: https://docs.docker.com/get-docker/"
command -v python3  &>/dev/null || error "Python 3 no encontrado."

DOCKER_COMPOSE="docker compose"
$DOCKER_COMPOSE version &>/dev/null || DOCKER_COMPOSE="docker-compose"
$DOCKER_COMPOSE version &>/dev/null || error "docker compose no disponible."
ok "Docker y docker compose OK"

# ── 2. Ollama ─────────────────────────────────────────────────────────────────
info "Comprobando Ollama..."
if command -v ollama &>/dev/null; then
    # Arrancar si no está corriendo
    if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
        info "Arrancando Ollama..."
        ollama serve &>/dev/null &
        sleep 3
    fi
    ok "Ollama activo en localhost:11434"

    # Descargar modelos si no están
    MODELOS_NECESARIOS=("qwen2.5:7b" "nomic-embed-text")
    MODELOS_OPCIONALES=("llama3.2:3b")
    MODELOS_DISPONIBLES=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')

    for m in "${MODELOS_NECESARIOS[@]}"; do
        if echo "$MODELOS_DISPONIBLES" | grep -q "^${m}"; then
            ok "Modelo $m ya disponible"
        else
            info "Descargando $m (puede tardar varios minutos)..."
            ollama pull "$m" && ok "Modelo $m descargado"
        fi
    done
    for m in "${MODELOS_OPCIONALES[@]}"; do
        if echo "$MODELOS_DISPONIBLES" | grep -q "^${m}"; then
            ok "Modelo $m ya disponible"
        else
            warn "Modelo opcional $m no descargado. Puedes añadirlo con: ollama pull $m"
        fi
    done

    # En Linux, Docker necesita la IP del host en lugar de host.docker.internal
    if [[ "$(uname)" == "Linux" ]]; then
        export OLLAMA_HOST="http://172.17.0.1:11434"
        ok "Linux detectado — Ollama host: $OLLAMA_HOST"
    fi
else
    warn "Ollama no instalado. El dashboard usará Claude API como fallback si ANTHROPIC_API_KEY está configurada."
    warn "Para instalar Ollama: https://ollama.com"
fi

# ── 3. Secrets / configuración ────────────────────────────────────────────────
info "Configurando secrets..."
mkdir -p .streamlit

if [ ! -f ".streamlit/secrets.toml" ]; then
    cat > .streamlit/secrets.toml << 'TOML'
# ElectSim España — Configuración local
DATABASE_URL = "postgresql+psycopg://electsim:electsim@postgres:5432/electsim_espana"
POSTGRES_USER = "electsim"
POSTGRES_PASSWORD = "electsim"

# Ollama — se conecta al host automáticamente
ELECTSIM_OLLAMA_MODEL = "qwen2.5:7b"
ELECTSIM_OLLAMA_FAST_MODEL = "llama3.2:3b"
ELECTSIM_OLLAMA_GENERAL_MODEL = "qwen2.5:7b"
ELECTSIM_OLLAMA_EMBEDDING_MODEL = "nomic-embed-text"

# Claude API fallback (opcional)
# ANTHROPIC_API_KEY = "sk-ant-..."
TOML
    ok "secrets.toml creado"
else
    ok "secrets.toml ya existe"
fi

# ── 4. Build y arranque ───────────────────────────────────────────────────────
info "Construyendo y arrancando contenedores..."
$DOCKER_COMPOSE -f docker-compose.local.yml up -d --build

# Esperar a que Postgres esté listo
info "Esperando a que PostgreSQL esté listo..."
for i in $(seq 1 30); do
    if $DOCKER_COMPOSE -f docker-compose.local.yml exec -T postgres \
        pg_isready -U electsim -d electsim_espana &>/dev/null; then
        ok "PostgreSQL listo"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        error "PostgreSQL no respondió en 60 segundos"
    fi
done

# ── 5. Poblar base de datos ───────────────────────────────────────────────────
info "Creando tablas y poblando datos..."
$DOCKER_COMPOSE -f docker-compose.local.yml exec -T dashboard \
    python -c "
import sys, os
sys.path.insert(0, '.')
os.environ['DATABASE_URL'] = 'postgresql+psycopg://electsim:electsim@postgres:5432/electsim_espana'
from sqlalchemy import create_engine, text
from db.models import Base
eng = create_engine(os.environ['DATABASE_URL'])
with eng.connect() as c:
    c.execute(text('GRANT ALL ON SCHEMA public TO electsim'))
    c.commit()
Base.metadata.create_all(eng, checkfirst=True)
print(f'  Tablas: {len(Base.metadata.tables)}')
" && ok "Tablas creadas"

# Poblar solo si está vacío
ELECCIONES=$($DOCKER_COMPOSE -f docker-compose.local.yml exec -T dashboard \
    python -c "
import os
os.environ['DATABASE_URL']='postgresql+psycopg://electsim:electsim@postgres:5432/electsim_espana'
from sqlalchemy import create_engine, text
eng = create_engine(os.environ['DATABASE_URL'])
with eng.connect() as c:
    print(c.execute(text('SELECT COUNT(*) FROM elecciones')).scalar())
" 2>/dev/null || echo "0")

if [ "$ELECCIONES" -lt 5 ] 2>/dev/null; then
    info "Poblando base de datos con datos demo..."
    $DOCKER_COMPOSE -f docker-compose.local.yml exec -T dashboard \
        bash -c "DATABASE_URL=postgresql+psycopg://electsim:electsim@postgres:5432/electsim_espana \
                 python db/seeds/populate_all.py --seccion todas" \
        && ok "Base de datos poblada"
else
    ok "Base de datos ya tiene datos ($ELECCIONES elecciones)"
fi

# ── 6. Listo ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ElectSim España corriendo localmente          ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Dashboard:   ${CYAN}http://localhost:8501${NC}"
echo -e "  PostgreSQL:  ${CYAN}localhost:5432${NC}  (electsim/electsim)"
if command -v ollama &>/dev/null; then
echo -e "  Ollama:      ${CYAN}http://localhost:11434${NC}  ($(ollama list 2>/dev/null | grep -c ':' || echo 0) modelos)"
fi
echo ""
echo -e "  Para parar:  ${AMBER}docker compose -f docker-compose.local.yml down${NC}"
echo -e "  Para logs:   ${AMBER}docker compose -f docker-compose.local.yml logs -f dashboard${NC}"
echo ""
