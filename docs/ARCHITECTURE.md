# ElectSim — Arquitectura Técnica

> Documento vivo. Última actualización: Bloque 8.

## Visión general

ElectSim es una plataforma de inteligencia política que combina:
- Ingesta y análisis de datos electorales, legislativos y mediáticos
- Modelos LLM locales para análisis semántico y generación de informes
- Motor de alertas y briefings automáticos
- Workspace multi-tenant por organización/cliente

## Bloques implementados

| Bloque | Descripción | Estado |
|--------|-------------|--------|
| B1-B4 | ETL, modelos analíticos, LLM, visualizaciones | Completo |
| B5 | Multi-tenant SaaS (Org/Workspace/RLS) | Completo |
| B6 | Product & Module Config (YAML) | Completo |
| B7 | Observabilidad (OTel, métricas, eval LLM) | Completo |
| B8 | Arquitectura monorepo, dominios, CI/CD | En progreso |
| B9 | Frontend Next.js (Centro de Operaciones) | Pendiente |

## Estructura de directorios

Ver `CLAUDE.md` para el mapa completo y las reglas de dependencias.

## Stack tecnológico

### Backend
- **Python 3.11** + FastAPI + SQLAlchemy 2.0 (sync)
- **PostgreSQL 16** con Row Level Security (RLS)
- **Redis** para cache y colas Celery
- **LiteLLM Proxy** → vLLM / Ollama (modelos locales: Qwen 14B/72B)

### Frontend (B9)
- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** + Radix UI
- **Zustand** (estado cliente) + **React Query** (server state)
- **Plotly** / **deck.gl** / **D3** para visualizaciones

### Observabilidad (B7)
- **OpenTelemetry SDK** → OTel Collector → Tempo + Prometheus
- **Grafana** (dashboards Command Center + LLM Quality)
- **Loki** + Promtail (logs JSON estructurados)
- **LLM-as-judge** eval pipeline (5% sampling, almacenado en `llm_eval` tabla)

### Infraestructura
- **Docker Compose** (dev/staging): `docker-compose.yml` + `docker-compose.observability.yml`
- **ECS Fargate** (producción v2.x)
- **Helm/K8s** (target v3.0)

## Flujo de datos

```
Fuentes externas           ETL (apps/workers)         Base de datos
─────────────────     →    ─────────────────    →     ─────────────
BOE, BOCG, RSS              Scraper → NLP →            PostgreSQL
Encuestas, OSINT            Transform → Embed          (RLS por tenant)
Parlamentos, CNMC           → Upsert                   pgvector
                                  ↓
                          Intelligence Layer
                          (Morning Briefing,
                           Risk Scoring,
                           Narrative Tracker)
                                  ↓
                          API (apps/api)
                                  ↓
                          Frontend (apps/web)
```

## Multi-tenancy (B5)

Cada petición lleva JWT con `org_id` + `workspace_id`. El middleware
`enforce_tenancy` ejecuta `SET LOCAL app.current_org_id = '...'` antes
de cada query. Las políticas RLS de PostgreSQL aíslan automáticamente los datos.

Ver `api/auth.py`, `api/tenancy.py`, `db/migrations/0025_multitenant_saas.py`.

## Product System (B6)

Los productos se definen en `config/products/*.yaml`. Cada producto activa
módulos, alertas y saved searches en el workspace del cliente.

Ver `config/product_loader.py`, `config/product_models.py`.

## Tests

```bash
# Todos los tests (207 pasan en B7)
.venv/bin/pytest tests/ -q

# Por bloque
.venv/bin/pytest tests/test_multitenant/ -v   # B5
.venv/bin/pytest tests/test_products/ -v      # B6
.venv/bin/pytest tests/test_observability/ -v # B7
```
