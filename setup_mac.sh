#!/usr/bin/env bash
# setup_mac.sh — ElectSim España en macOS (sin Docker)
# Requisitos: macOS con Homebrew y Ollama instalado
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; AMBER='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${CYAN}  →${NC} $*"; }
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${AMBER}  !${NC} $*"; }
err()  { echo -e "${RED}  ✗${NC} $*"; exit 1; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}  ElectSim España — Setup macOS         ${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# ── 1. Homebrew ───────────────────────────────────────────────────────────────
command -v brew &>/dev/null || err "Homebrew no encontrado. Instala desde https://brew.sh"
ok "Homebrew disponible"

# ── 2. Python ─────────────────────────────────────────────────────────────────
PYTHON=$(command -v python3.11 || command -v python3 || echo "")
[ -z "$PYTHON" ] && err "Python 3 no encontrado"
PY_VER=$($PYTHON --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
ok "Python $PY_VER"

# ── 3. PostgreSQL via Homebrew ─────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
    info "Instalando PostgreSQL 16..."
    brew install postgresql@16
fi

export PATH="/opt/homebrew/opt/postgresql@16/bin:/usr/local/opt/postgresql@16/bin:$PATH"

if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    info "Arrancando PostgreSQL..."
    brew services start postgresql@16
    sleep 3
    pg_isready -h localhost -p 5432 -q || err "PostgreSQL no arrancó"
fi
ok "PostgreSQL activo"

# Crear usuario y BD
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='electsim'" | grep -q 1 || \
    psql postgres -c "CREATE USER electsim WITH PASSWORD 'electsim';"
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='electsim_espana'" | grep -q 1 || \
    psql postgres -c "CREATE DATABASE electsim_espana OWNER electsim;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE electsim_espana TO electsim;" &>/dev/null
ok "Base de datos lista"

# ── 4. Entorno Python ─────────────────────────────────────────────────────────
if [ ! -f ".venv/bin/activate" ]; then
    info "Creando entorno virtual..."
    $PYTHON -m venv .venv
fi
source .venv/bin/activate
ok "Virtualenv activo"

info "Instalando dependencias..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
pip install -q ollama anthropic chromadb httpx
ok "Dependencias instaladas"

# ── 5. Ollama ─────────────────────────────────────────────────────────────────
if command -v ollama &>/dev/null; then
    # Arrancar servidor si no está corriendo
    if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
        info "Arrancando Ollama..."
        ollama serve &>/dev/null &
        sleep 3
    fi

    # Modelo más ligero primero (1.3GB vs 4.7GB)
    MODELOS=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')
    MODELO_ELEGIDO=""

    for m in "llama3.2:3b" "qwen2.5:7b" "llama3.2:1b" "mistral:7b"; do
        if echo "$MODELOS" | grep -q "^${m}"; then
            MODELO_ELEGIDO="$m"
            ok "Modelo disponible: $m"
            break
        fi
    done

    if [ -z "$MODELO_ELEGIDO" ]; then
        # Verificar espacio libre (necesitamos al menos 3GB)
        LIBRE_GB=$(df -g "$HOME" | tail -1 | awk '{print $4}')
        if [ "${LIBRE_GB:-0}" -ge 3 ] 2>/dev/null; then
            info "Descargando llama3.2:3b (2GB)..."
            ollama pull llama3.2:3b && MODELO_ELEGIDO="llama3.2:3b" || warn "Descarga fallida"
        else
            warn "Poco espacio en disco (${LIBRE_GB}GB libres). Libera espacio y ejecuta: ollama pull llama3.2:3b"
        fi
    fi

    # Embedding model (pequeño, necesario para RAG)
    if ! echo "$MODELOS" | grep -q "nomic-embed-text"; then
        info "Descargando nomic-embed-text (274MB)..."
        ollama pull nomic-embed-text || warn "No se pudo descargar nomic-embed-text"
    fi

    MODELO_ELEGIDO="${MODELO_ELEGIDO:-llama3.2:3b}"
    ok "Ollama listo — modelo: $MODELO_ELEGIDO"
else
    warn "Ollama no instalado. Instala desde https://ollama.com"
    MODELO_ELEGIDO="llama3.2:3b"
fi

# ── 6. Secrets de Streamlit ───────────────────────────────────────────────────
mkdir -p .streamlit
cat > .streamlit/secrets.toml << TOML
DATABASE_URL = "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana"
POSTGRES_USER = "electsim"
POSTGRES_PASSWORD = "electsim"
ELECTSIM_OLLAMA_MODEL = "${MODELO_ELEGIDO}"
ELECTSIM_OLLAMA_FAST_MODEL = "llama3.2:3b"
ELECTSIM_OLLAMA_GENERAL_MODEL = "${MODELO_ELEGIDO}"
ELECTSIM_OLLAMA_EMBEDDING_MODEL = "nomic-embed-text"
# ANTHROPIC_API_KEY = "sk-ant-..."
TOML
ok "Configuración guardada en .streamlit/secrets.toml"

# ── 7. Tablas y datos ─────────────────────────────────────────────────────────
info "Creando tablas..."
python - << 'PYEOF'
import sys, os
sys.path.insert(0, '.')
os.environ['DATABASE_URL'] = 'postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana'
from sqlalchemy import create_engine, text
from db.models import Base
eng = create_engine(os.environ['DATABASE_URL'])
with eng.connect() as c:
    c.execute(text('GRANT ALL ON SCHEMA public TO electsim'))
    c.commit()
Base.metadata.create_all(eng, checkfirst=True)
print(f'  {len(Base.metadata.tables)} tablas creadas')
PYEOF

# Poblar solo si está vacío
N=$(python -c "
import sys, os; sys.path.insert(0,'.')
os.environ['DATABASE_URL']='postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana'
from sqlalchemy import create_engine, text
eng = create_engine(os.environ['DATABASE_URL'])
with eng.connect() as c:
    print(c.execute(text('SELECT COUNT(*) FROM elecciones')).scalar())
" 2>/dev/null || echo 0)

if [ "$N" -lt 5 ]; then
    info "Poblando base de datos..."
    DATABASE_URL=postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana \
        python db/seeds/populate_all.py --seccion todas
else
    ok "Base de datos ya tiene datos ($N elecciones)"
fi
ok "Base de datos lista"

# ── 8. Script de arranque rápido ──────────────────────────────────────────────
cat > run.sh << 'RUN'
#!/usr/bin/env bash
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/postgresql@16/bin:/usr/local/opt/postgresql@16/bin:$PATH"

# PostgreSQL
pg_isready -h localhost -p 5432 -q 2>/dev/null || brew services start postgresql@16

# Ollama
if command -v ollama &>/dev/null && ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    ollama serve &>/dev/null &
    sleep 2
fi

source .venv/bin/activate
echo "Abriendo http://localhost:8501 ..."
open "http://localhost:8501" 2>/dev/null || true
streamlit run dashboard/app.py --server.port 8501 --browser.gatherUsageStats false
RUN
chmod +x run.sh

# ── Listo ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Todo listo                            ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Arranca con:  ${CYAN}bash run.sh${NC}"
echo ""
echo -e "  O manualmente:"
echo -e "  ${AMBER}source .venv/bin/activate${NC}"
echo -e "  ${AMBER}streamlit run dashboard/app.py${NC}"
echo ""

# Arrancar directamente
read -rp "  ¿Arrancar el dashboard ahora? [S/n] " resp
resp="${resp:-S}"
if [[ "$resp" =~ ^[Ss]$ ]]; then
    source .venv/bin/activate
    open "http://localhost:8501" 2>/dev/null || true
    streamlit run dashboard/app.py --server.port 8501 --browser.gatherUsageStats false
fi
