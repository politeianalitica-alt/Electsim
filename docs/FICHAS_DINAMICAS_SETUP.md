# Fichas Dinámicas · Setup de producción

Esta guía describe cómo activar las fichas dinámicas (territorios y políticos)
en producción con caché Postgres y backfill nocturno automático.

## 1. Variables de entorno requeridas

### En el host del FastAPI (Railway, Render, etc.)

```bash
# LLM (Groq · obligatorio)
ELECTSIM_LLM_PROVIDER=openai
OPENAI_API_KEY=gsk_...                 # tu clave Groq
OPENAI_BASE_URL=https://api.groq.com/openai/v1
ELECTSIM_OPENAI_MODEL=llama-3.3-70b-versatile
GROQ_MAX_TOKENS=4096
GROQ_TEMPERATURE=0.3

# Postgres para caché de fichas (obligatorio en producción)
DATABASE_URL=postgresql://user:pwd@host:5432/db

# Connectors externos (opcionales · sin ellos se omiten bloques)
OPENCORPORATES_API_KEY=...             # opcional · sube 500→10000 req/mes
SABI_API_KEY=...                       # opcional · cuando se contrate licencia
SABI_TOKEN=...
AEMET_API_KEY=...                      # opendata.aemet.es · clima/alertas
IDEALISTA_API_KEY=...                  # opcional · cuando se contrate
IDEALISTA_SECRET=...
```

### Deploy backend con Docker (Railway, Render, Fly.io, AWS ECS)

El repo incluye:
- `Dockerfile.railway` — imagen Python 3.11-slim con todas las deps
- `railway.toml` — config Railway con healthcheck `/health`
- `render.yaml` — blueprint Render con `dockerfilePath: ./Dockerfile.railway`

**Railway** (recomendado, free tier $5/mes):
```bash
railway init
railway link <project-id>
railway up   # construye Docker y despliega
```

**Render** (alternativa):
```bash
# Dashboard → New Blueprint → conectar repo → render.yaml detectado
```

**Fly.io** (más control):
```bash
fly launch --dockerfile Dockerfile.railway
fly secrets set OPENAI_API_KEY=... DATABASE_URL=...
fly deploy
```

### En Vercel (visual-oscar)

```bash
BACKEND_URL=https://tu-fastapi.example.com   # apunta al host del FastAPI
BACKEND_TIMEOUT_MS=60000                      # las fichas tardan hasta 40s la 1ª vez
# (no necesita DATABASE_URL · Vercel solo proxea)
```

## 2. Crear las tablas Postgres

Hay dos formas:

### 2a. Alembic (recomendado · pasa por la migración versionada)

```bash
alembic upgrade head
```

Esto aplica la migración `0061_brain_fichas` que crea las 7 tablas:
- `brain_fichas_territoriales`
- `brain_fichas_politicos`
- `brain_territory_profiles`
- `brain_actor_dossiers`
- `brain_issue_dossiers`
- `brain_actor_graph_edges`
- `brain_actor_proposals`

### 2b. Auto-creación (sin Alembic)

Si no usas Alembic, las tablas se crean automáticamente la primera vez
que un pipeline intenta persistir (las funciones `persist_ficha_*`
ejecutan `CREATE TABLE IF NOT EXISTS` antes del INSERT). No hace falta
intervención manual — pero las primeras peticiones serán algo más
lentas mientras se crean los esquemas.

## 3. Backfill nocturno (GitHub Actions)

El workflow `.github/workflows/fichas-backfill.yml` ejecuta cada noche
a las 03:00 UTC:

1. Construye fichas de los políticos activos en Wikidata (50 por noche).
2. Construye fichas de los 20 municipios más relevantes.
3. Construye fichas de las 17 CCAA + 2 ciudades autónomas.

### Activación

En GitHub → Settings → Secrets and variables → Actions añade:

```
GROQ_API_KEY    = gsk_...                  # clave Groq
DATABASE_URL    = postgresql://...          # mismo Postgres que el backend
```

Una vez configurados, el cron se ejecuta automáticamente. También puedes
lanzar manualmente:

```
GitHub Actions → Fichas backfill nocturno → Run workflow
  └─ limit_politicos: 100
  └─ limit_territorios: 100
```

Los artefactos JSONL se guardan en cada run (30 días de retención).

## 4. Ejecución manual desde CLI

Sin GitHub Actions, puedes ejecutar el backfill desde cualquier host con
acceso a la BD:

```bash
# Una ficha territorial
python -m pipelines.brain_enrich_existing ficha-territorio \
    --cod-ine 30027 --persist

# Una CCAA
python -m pipelines.brain_enrich_existing ficha-territorio \
    --ccaa "Andalucía" --persist

# Una ficha de político por QID
python -m pipelines.brain_enrich_existing ficha-politico \
    --qid Q186200 --persist

# Backfill batch de TODOS los políticos activos en Wikidata
python -m pipelines.brain_enrich_existing backfill-politicos \
    --limit 500 --persist
```

## 5. Cron en host propio (alternativa al workflow)

Si prefieres correrlo en tu servidor en lugar de GitHub Actions, instala
un cron equivalente:

```cron
# /etc/cron.d/politeia-fichas-backfill
# Cada noche a las 03:30
30 3 * * * politeia cd /opt/politeia && \
  .venv/bin/python -m pipelines.brain_enrich_existing backfill-politicos \
    --limit 50 --persist >> /var/log/politeia-fichas.log 2>&1
```

## 6. Verificación

Tras configurar todo, prueba:

```bash
# Que el FastAPI tiene la tabla
curl https://tu-fastapi/api/v2/ficha/territorio/28079
# Debería devolver {found: true, source: "cache"} en la 2ª llamada

# Que el frontend Vercel resuelve
curl https://politeia-visual-oscar.vercel.app/api/ficha/territorio/28079
# Mismo resultado
```

Si el primer GET devuelve `source: "fresh"` y tarda 30-40s, está
construyendo en caliente. El segundo GET sale de Postgres en <100ms.

## 7. Costes esperados (Groq tier free)

- **Por ficha territorial**: ~3.000-4.000 tokens (Groq cobra <0.001 €/k)
- **Por ficha de político**: ~3.500-5.000 tokens
- **Backfill nocturno completo (50 políticos + 39 territorios)**: ~400k
  tokens diarios. Holgado dentro del rate limit free (14.4k/min,
  500k/día en tier dev gratis).
