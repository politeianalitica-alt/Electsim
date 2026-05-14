# ElectSim — Guía de arquitectura para Claude Code

> Este archivo es la fuente de verdad para cualquier sesión de Claude Code.
> Léelo antes de generar, mover o refactorizar cualquier archivo.

---

## 0. REGLAS CRÍTICAS (lee primero, no son opcionales)

Hemos perdido trabajo varias veces por confusión entre ramas y force-pushes.
**Estas reglas son obligatorias para cualquier Claude o humano que toque el repo.**

### 0.1 Rama canónica = `main`

`origin/main` es la única fuente de verdad. Lo que esté en `origin/main` es lo
que está desplegado en producción: <https://politeia-visual-oscar.vercel.app>.

- Antes de empezar: `git fetch origin && git checkout main && git pull`.
- Si trabajas en otra rama, **mergea o rebasea desde `main` antes** de seguir.
- Ramas como `Visual_Oscar`, `Visual_Oscar_local`, `codex/*`, `feature/*`,
  `tab-*`, `claude/*` → **asume obsoletas** salvo prueba en contra. Se conservan
  por historia, no son fuentes activas.

### 0.2 Force-push está PROHIBIDO sobre `main`

**NUNCA** ejecutes:
- `git push --force` sobre main
- `git push +HEAD:main`
- `git push -f origin main`

Si tu rama está detrás de `main`, mergea (no fuerces):
```bash
git fetch origin
git merge origin/main          # resuelve conflictos
git push origin HEAD           # push normal, sin --force
```

Si crees que necesitas reescribir historia: pregunta al humano antes.

### 0.3 Antes de cualquier operación destructiva: backup

Antes de `reset --hard`, `checkout --`, `clean -f`, eliminar archivos ajenos,
**crea un backup**:

```bash
git branch backup/<descripcion>-$(date +%s) HEAD
git tag    backup-<descripcion>-$(date +%s) origin/main
```

### 0.4 Antes de desplegar a producción

```bash
# 1) Verifica que tu rama tiene todo lo de main
git fetch origin && git log --oneline HEAD..origin/main

# 2) Si hay commits que no tienes → mergea primero
git merge origin/main

# 3) Build local pasa
cd apps/visual-oscar && npm run build

# 4) Deploy SIEMPRE desde la raíz del monorepo, no desde apps/visual-oscar/
cd <raíz-del-repo>
vercel --prod --yes
```

### 0.5 Naming y convenciones intocables

| Concepto | Nombre correcto | Nombre incorrecto |
|---|---|---|
| Módulo de Business Intelligence | **Estudio** (`/estudio`) | Domo, BI, Centro de Datos |
| Emojis en UI | Prohibidos | Usa Unicode (`⬡ ⊞ ⊟ ⇡ ⟶ ◐ ◉ ✦ ✓ !`) o letras |
| Rama de producción | `main` | `master`, `develop`, `Visual_Oscar` |
| Frontend Vercel | `apps/visual-oscar` | `apps/web`, raíz |
| Pantalla post-login | `/inicio` | `/dashboard` (pero `/dashboard` sigue existiendo como panel ejecutivo completo) |

### 0.6 Fuente única de verdad

- **Navegación principal**: `apps/visual-oscar/app/_components/navigation.ts`
- **Auth post-login**: `apps/visual-oscar/app/login/page.tsx` redirige a `/inicio`
- **Vercel project**: `politeia-visual-oscar` (Root Directory: `apps/visual-oscar`,
  branch de producción: `main`)

### 0.7 Rutas importantes que no deben romperse

Si editas la nav o mueves archivos, verifica que estas rutas siguen
respondiendo (HTTP 200 o 307 = OK; 404 = roto):

| Categoría | Rutas |
|---|---|
| Inicio | `/inicio`, `/briefing`, `/dashboard`, `/alertas` |
| Política | `/mapa-actores`, `/partidos`, `/gobierno-coalicion`, `/instituciones` |
| Legislativo | `/monitor-legislativo`, `/trazabilidad`, `/huella-legislativa` |
| Riesgo | `/riesgo`, `/crisis`, `/medios-narrativa`, `/ataques-narrativos` |
| Electoral | `/nowcasting`, `/escenarios`, `/microdatos`, `/war-room`, `/adversarios` |
| Macro/Geo | `/geopolitica`, `/macro` |
| Medios | `/medios-narrativa`, `/prensa` |
| Sectoriales | `/sector-{energia,farma,defensa,vivienda,banca,agro,telecom,infraestructuras,turismo}` |
| Contratación | `/licitaciones`, `/adjudicaciones`, `/contratos-vigentes`, `/competidores`, `/fondos-europeos`, `/litigios-contratacion` |
| Workspace | `/workspaces`, `/workspaces/[id]/{overview,inbox,terminal,docs,tables,slides,reporting,canvas,research,radar,simulator,crm,projects}` |
| Estudio (BI) | `/estudio`, `/estudio/{fuentes,pipeline,dataset,dashboard,query,alertas,notificaciones,gobernanza,health,warehouse,charts,jobs}` |

### 0.8 Resumen ejecutivo

- `main` = verdad
- `force-push` = prohibido
- Antes de tocar = backup
- Antes de deploy = `npm run build` local pasa
- Estudio (no Domo)
- Cero emojis
- Post-login → `/inicio`

---

## 1. Estructura del monorepo

```text
electsim/
  apps/
    api/        ← FastAPI: endpoints, servicios, RLS, tenancy
    workers/    ← Celery/ETL: scrapers, NLP pipelines, jobs background
    web/        ← Next.js 14: UI del analista (App Router)
  packages/
    electoral/  ← D'Hondt, nowcasting, simulación de escaños (Python puro)
    nlp/        ← NLP no-LLM: NER, sentimiento, normalización (Python puro)
    ontology/   ← Modelos de dominio y repositorios (Python)
    prompts/    ← Biblioteca versionada de prompts (Markdown + metadata)
    ui/         ← Componentes React compartidos (TypeScript + Tailwind)
    types/      ← Contratos API: schemas TS + Python (Pydantic / zod)
    infra/      ← Terraform por entorno (db, redis, ecs, observabilidad)
    docker/     ← Dockerfiles base y compose templates
    k8s/        ← Manifiestos Helm/K8s para v3.0
    data_seeds/ ← YAML/CSV con actores, partidos, medios iniciales
    migrations/ ← Alembic migrations Postgres (expand/contract)
  observability/  ← OTel SDK, logging JSON, métricas (Bloque 7)
  config/         ← Configs de producto/mercado YAML (Bloque 6)
  docs/           ← Documentación técnica
  tests/          ← Tests de integración cross-dominio
```

### Mapeo actual → target

Durante la migración, el código existente vive en:
- `api/` → target: `apps/api/`
- `etl/` → target: `apps/workers/`
- `etl/nlp/` → target: `packages/nlp/`
- `etl/electoral_math.py` → target: `packages/electoral/`
- `db/migrations/` → target: `packages/migrations/`
- `db/models.py` → target: `packages/ontology/models.py`
- `agents/prompts.py` + templates → target: `packages/prompts/`
- `docker/` → target: `packages/docker/`

**IMPORTANTE**: Hasta completar la migración, el código existente sigue en su ubicación
actual y los tests continúan pasando. No muevas archivos sin actualizar los imports.

---

## 2. Reglas de dependencias (LAW — no negociable)

### Regla de capas (más restrictiva primero)

```
packages/*  ←  apps/*
               ↑
           solo hacia abajo
```

| Quién | Puede importar de | NUNCA puede importar de |
|-------|------------------|------------------------|
| `packages/electoral` | stdlib, numpy, pandas | `apps/*`, `packages/nlp`, `observability` |
| `packages/nlp` | stdlib, spacy, transformers | `apps/*`, `packages/electoral` |
| `packages/ontology` | stdlib, sqlalchemy, `packages/types` | `apps/*`, `packages/nlp`, `packages/electoral` |
| `packages/prompts` | stdlib, jinja2 | cualquier `apps/*` o `packages/` con lógica |
| `packages/types` | stdlib, pydantic | cualquier `apps/*` o `packages/` con lógica |
| `apps/api` | `packages/*`, `observability`, `config` | `apps/web`, `apps/workers` |
| `apps/workers` | `packages/*`, `observability`, `config` | `apps/web`, `apps/api` |
| `apps/web` | `packages/ui`, `packages/types` | cualquier Python, `apps/api` directamente |

### Capas internas de `apps/api`

```
api.routers.*       ← solo llama a services.*
services.*          ← solo llama a repositories.* / clients.*
repositories.*      ← solo llama a ORM/SQL, packages/ontology
clients.*           ← wrappers de servicios externos (LLM, Redis, S3)
```

**Violaciones detectadas con**: `ruff check --select I` + `import-linter`

---

## 3. ¿Dónde pongo X?

### Nuevo endpoint FastAPI

```
apps/api/routers/<dominio>.py       ← router con decoradores
apps/api/services/<dominio>_service.py ← lógica de negocio
apps/api/repositories/<dominio>_repo.py ← acceso a BD
tests/test_<dominio>/               ← tests del dominio
```

Dominios disponibles: `electoral`, `legislative`, `media`, `workspace`,
`risk`, `alerts`, `actors`, `products`, `tenancy`, `intelligence`.

### Nuevo producto/DLC

```
config/products/<codigo_producto>.yaml    ← definición YAML
packages/prompts/src/intelligence/        ← prompts específicos del producto
tests/test_products/                      ← tests del loader
```

### Nueva fuente ETL

```
apps/workers/connectors/<fuente>/          ← extractor específico
apps/workers/pipelines/<fuente>_pipeline.py ← pipeline completo
packages/nlp/                             ← si añades lógica NLP reutilizable
tests/test_workers/test_<fuente>.py       ← tests
```

### Nuevo componente React

```
packages/ui/src/components/<Componente>/
  index.tsx          ← export por defecto
  <Componente>.tsx   ← implementación
  <Componente>.test.tsx  ← Vitest
packages/ui/src/index.ts  ← re-export
```

### Nuevo prompt

```
packages/prompts/src/<categoria>/<nombre>.md   ← plantilla Markdown
packages/prompts/src/<categoria>/<nombre>.json ← metadata (inputs, schema salida, modelo)
packages/prompts/index.py                      ← loader Python
packages/prompts/index.ts                      ← loader TypeScript
```

### Nueva migración DB

```
packages/migrations/versions/<NNNN>_<descripcion>.py
```
Siguiendo el patrón expand/contract:
1. Expand: añadir columna nullable / tabla nueva
2. Migrate: rellenar datos
3. Contract: añadir NOT NULL / eliminar columna vieja

### Documentación técnica

```
docs/ARCHITECTURE.md       ← visión general de bloques
docs/API_GUIDE.md          ← autenticación, tenancy, versionado
docs/FRONTEND_GUIDE.md     ← patrones UI, componentes base
docs/ETL_PIPELINES.md      ← fuentes, pasos NLP, scheduling
docs/LLM_STACK.md          ← modelos, routing, eval pipeline
docs/OBSERVABILITY.md      ← OTel, métricas, alertas SLO
```

---

## 4. Estándares de código

### Python (`apps/api`, `apps/workers`, `packages/`)

- Python 3.11 (target 3.12 cuando se actualice el venv)
- `ruff` para linting + formato (`ruff check` + `ruff format`)
- `mypy` en modo estricto para código nuevo en `packages/`
- Pydantic v2 (`model_config = ConfigDict(...)`, `@field_validator`)
- Arquitectura service-repository: routers **nunca** tocan BD directamente
- Logging: `from observability.logging import get_logger; log = get_logger(__name__)`
- Métricas: `from observability.metrics import ETLMetrics, LLMMetrics, APIMetrics`
- Trazas: `from observability.otel import get_tracer; _tracer = get_tracer(__name__)`

### TypeScript (`apps/web`, `packages/ui`, `packages/types`)

- TypeScript estricto (`strict: true` en tsconfig)
- ESLint + Prettier
- Componentes funcionales + hooks; cero clases
- Tailwind v3, Radix UI, Zustand, React Query v5
- Rutas Next.js: `app/(workspace)/[workspaceId]/...`

### Tests

| App/Package | Framework | Qué testear |
|-------------|-----------|-------------|
| `packages/electoral` | pytest | d'Hondt, nowcasting, edge cases matemáticos |
| `packages/nlp` | pytest | NER precision/recall, normalización |
| `packages/ontology` | pytest + mocks | repositorios, consultas, RLS |
| `apps/api` | pytest | endpoints (TestClient), servicios (mocks), RLS multitenancy |
| `apps/workers` | pytest | pipelines ETL, deduplicación, transformaciones |
| `apps/web` | Vitest + Playwright | componentes, e2e Command Center |

**Cobertura mínima exigida en CI**: 80% en `packages/`, 70% en `apps/api`.

---

## 5. Convenciones de nombrado

| Concepto | Convención |
|----------|-----------|
| Archivo Python | `snake_case.py` |
| Clase Python | `PascalCase` |
| Función Python | `snake_case` |
| Constante Python | `UPPER_SNAKE_CASE` |
| Archivo TypeScript | `PascalCase.tsx` (componentes), `camelCase.ts` (utils) |
| Tabla DB | `snake_case` (plural) |
| Columna DB | `snake_case` |
| Migración | `NNNN_descripcion_breve.py` |
| Producto config | `<tipo>_<mercado>.yaml` ej: `war_room_electoral_spain.yaml` |
| Rama git | `feature/<bloque>-<descripcion>`, `hotfix/<descripcion>` |
| Prompt file | `<accion>_<objeto>.md` ej: `morning_briefing.md` |

---

## 6. Bloques implementados

| Bloque | Estado | Archivos clave |
|--------|--------|---------------|
| B1-B4 | Completo | `etl/`, `agents/`, `analytics/`, `models/` |
| B5 — Multi-tenant SaaS | Completo | `api/auth.py`, `api/tenancy.py`, `services/tenant_provisioning.py`, `db/migrations/0025_*.py` |
| B6 — Product & Module Config | Completo | `config/products/*.yaml`, `config/product_loader.py`, `api/modules.py`, `db/migrations/0026_*.py` |
| B7 — Observabilidad | Completo | `observability/otel.py`, `observability/metrics.py`, `observability/logging.py`, `services/llm_eval.py`, `docker-compose.observability.yml` |
| B8 — Arquitectura monorepo | En progreso | `CLAUDE.md`, `turbo.json`, `packages/`, `docs/`, `.github/workflows/` |

**Tests**: 207 tests pasan (`tests/test_multitenant/`, `tests/test_products/`, `tests/test_observability/`).

---

## 7. Variables de entorno clave

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel Collector gRPC | `http://otel-collector:4317` |
| `OTEL_SDK_DISABLED` | `true` en tests unitarios | `false` |
| `LOG_FORMAT` | `json` (prod) o `text` (dev) | `json` |
| `LLM_EVAL_SAMPLE_RATE` | Tasa de sampling para LLM-as-judge | `0.05` |
| `LITELLM_BASE_URL` | Proxy LiteLLM | `http://litellm-proxy:4000` |
| `LOG_LEVEL` | Nivel de logging global | `INFO` |
| `JWT_SECRET` | Clave para verificar JWT | — |
| `DEV_MODE` | Salta verificación JWT en local | `false` |

---

## 8. Comandos frecuentes

```bash
# Tests
.venv/bin/pytest tests/ -q                          # todos los tests
.venv/bin/pytest tests/test_observability/ -v        # bloque específico
.venv/bin/pytest -m "not integration" -q             # excluir integración

# Linting
.venv/bin/ruff check . --fix                         # lint + autofix
.venv/bin/ruff format .                              # formato

# Migraciones
alembic upgrade head                                 # aplicar todas
alembic revision --autogenerate -m "descripcion"     # nueva migración

# Docker
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d

# Turborepo (cuando esté activo)
npx turbo run build                                  # build todos los packages
npx turbo run test                                   # test en paralelo
npx turbo run lint                                   # lint en paralelo
```

---

## 9. Checklist antes de hacer un PR

- [ ] Tests pasan: `.venv/bin/pytest tests/ -q`
- [ ] Ruff clean: `.venv/bin/ruff check .`
- [ ] El código nuevo está en el directorio correcto (ver sección 3)
- [ ] Si hay nueva tabla: migración en `packages/migrations/` (o `db/migrations/` hasta migración completa)
- [ ] Si hay nuevo endpoint: tests de contrato en `tests/test_<dominio>/`
- [ ] Si hay nuevo prompt: metadata JSON completo
- [ ] Si hay cambio de schema API: tipos actualizados en `packages/types/`
- [ ] Observabilidad: logs estructurados con `get_logger`, métricas con `record_*`
- [ ] RLS: tablas nuevas con `ENABLE ROW LEVEL SECURITY` y política `tenant_isolation_*`
