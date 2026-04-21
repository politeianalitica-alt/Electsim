# ElectSim España

**Digital twin** ideológico, social, económico y político de la sociedad española — **fase 1: arquitectura de datos e ingesta** (sin modelos predictivos).

## Stack

| Capa | Tecnología |
|------|------------|
| Lenguaje | Python 3.11+ |
| Base de datos | PostgreSQL 16 + TimescaleDB |
| ORM / acceso | SQLAlchemy 2.0 + psycopg3 |
| Raw / objetos | MinIO o `data/raw/` |
| Procesamiento | Pandas, Polars, PyArrow |
| Orquestación | Prefect 2 |
| Validación | pytest + Great Expectations |
| Contenedores | Docker Compose |

## Estructura

```
electsim-espana/
├── docker-compose.yml      # PostgreSQL+Timescale, MinIO, Prefect UI
├── .env.example
├── requirements.txt
├── pyproject.toml
├── alembic.ini
├── mkdocs.yml              # Documentación (MkDocs Material)
├── docs/                   # Fuentes del sitio de documentación
├── data/
│   ├── raw/                # Inmutables por fuente (cis, ine, bde, …)
│   ├── processed/          # Parquet normalizado
│   └── outputs/            # Reservado para fase 2
├── db/
│   ├── schema.sql          # DDL + hypertables
│   ├── seeds/              # Referencia mínima (CCAA, CIS, partidos)
│   └── migrations/         # Alembic (evolución post-init)
├── etl/
│   ├── base_extractor.py
│   ├── sources/            # cis_barometro, ree_esios, ine_api, …
│   ├── transformers/
│   └── loaders/
├── pipelines/              # Flows Prefect por dominio
├── models/                 # Fase 2: estadísticos, escenarios, riesgos, estrategia
├── agents/                 # Fase 3: agentes LLM sobre perfiles_votante
└── tests/
```

## Inicio rápido

1. Copiar entorno: `cp .env.example .env` y revisar credenciales.
2. Levantar servicios: `docker compose up -d postgres minio`
3. La primera vez, Postgres ejecuta `db/schema.sql` y `db/seeds/02_seeds.sql`.
4. Entorno Python: `python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
5. Tests: `pytest` (marcar integración: `pytest -m integration` si hay Postgres con `DATABASE_URL`).

Variables `RAW_DATA_PATH` y `PROCESSED_DATA_PATH` pueden apuntar a rutas absolutas si Prefect o los extractores corren fuera del directorio del proyecto.

## Módulos de base de datos

1. **Geografía**: `comunidades_autonomas`, `provincias`, `municipios`, `secciones_censales`
2. **Electoral**: `elecciones`, `partidos`, `relaciones_partidos`, `resultados_electorales`, `resultados_seccion_censal`
3. **Encuestas**: `fuentes_encuesta`, `encuestas`, `preguntas_encuesta`, `microdatos_encuesta`, `respuestas_encuesta`, `resultados_agregados_encuesta`
4. **Demografía / INE**: `demografia_municipal`, `mercado_laboral_provincial`, `renta_municipal`
5. **Macroeconomía**: `indicadores_macroeconomicos`, `pib_ccaa`, `presupuestos_generales_estado`
6. **Sectores**: `sector_energetico`, `sector_inmobiliario`, `sector_agroalimentario`, `sector_textil`, `sector_defensa`, `sector_turismo`, `sector_maritimo`, `sector_tecnologia`, `sector_industrial`
7. **Institucional**: `legislaturas`, `parlamentarios`, `votaciones_parlamentarias`, `votos_individuales`, `gobierno_composicion`
8. **Medios y redes**: `medios_comunicacion`, `metricas_medios`, `posts_redes_sociales`
9. **Series temporales**: `tracking_opinion_publica`, `tracking_indicadores_economicos` (hypertables TimescaleDB)

## Pipelines

- Orquestación global: `python -m pipelines.ingest_all`
- Por dominio: `ingest_electoral`, `ingest_economico`, `ingest_sectorial`, `ingest_social`
- Dashboard electoral diario: `python -m pipelines.electoral_dashboard_ingestion --mode daily`

Las tareas están preparadas como esqueleto: implemente extractores en `etl/sources/` y loaders en `etl/loaders/`.

## Ingesta diaria del dashboard electoral

La ingesta del dashboard electoral queda separada del resto del ETL en
`pipelines/electoral_dashboard_ingestion.py` y `etl/electoral/`.

### Qué hace

- refresca diariamente fuentes electorales ya usadas por el proyecto
- soporta carga completa, diaria incremental y backfill por rango
- guarda snapshot raw por fuente en `data/raw/electoral_dashboard/`
- registra trazabilidad en `ingestion_run`, `ingestion_run_source`, `ingestion_watermark`
- actualiza `scraping_log` y `source_health` para observabilidad operativa
- recalcula `estimaciones_voto_agregadas` al final, salvo que se desactive por entorno

### Modos de ejecución

- Carga diaria: `python -m pipelines.electoral_dashboard_ingestion --mode daily`
- Carga completa: `python -m pipelines.electoral_dashboard_ingestion --mode full`
- Backfill manual: `python -m pipelines.electoral_dashboard_ingestion --mode backfill --from-date 2023-01-01 --to-date 2023-12-31`
- Deployment Prefect diario: `python -m pipelines.electoral_dashboard_ingestion --deploy`

### Precedencia entre fuentes

- Resultados oficiales: `interior_resultados` es la fuente prioritaria para voto y escaños.
- Encuestas oficiales: `cis_monitor` y la materialización de microdatos CIS tienen prioridad sobre fuentes derivadas.
- Encuestas publicadas: `wikipedia_polls` complementa el histórico cuando no hay microdato oficial.
- Encuestas en prensa: `prensa_encuestas` solo complementa el modelo, con menor precedencia y sin sustituir fuentes oficiales.

### Validaciones mínimas incluidas

- claves no nulas y unicidad por clave natural
- coerción de numéricos y fechas
- detección de duplicados post-normalización
- alerta por caída brusca de volumen frente a la última ejecución exitosa
- alerta por cambios relevantes en resultados oficiales ya publicados

## Documentación

- Sitio local: `mkdocs serve`
- Metadatos de URLs y formatos por fuente: `etl/sources/config_fuentes.py`

## Loaders concretos (Fase 1)

- **Geografía INE**: `python -m etl.sources.ine_geografia` — API `VALORES_VARIABLE` (variables 70, 115, 19) con paginación.
- **Resultados Congreso (Interior)**: tras tener provincias en BD, con `ELECTSIM_CONGRESO=año:mes` (p. ej. `2023:7`) ejecute el flow `ingest_electoral` o en Python `InteriorResultadosExtractor(año=2023, mes=7).run()`. Opcional `INTERIOR_SSL_VERIFY=false` si hay problemas de cadena TLS en su entorno.

## Alembic

Modelos en `db/models.py`. Tras el primer `docker compose up` de Postgres: `alembic stamp 0001_baseline`. Detalle en `db/migrations/README.md`.

Fase 2 (tablas de salida): `alembic upgrade head` aplica la revisión `0002_fase2_output_tables`. Compruebe con `alembic current`.

## Fase 2 — Ejecución

### Orden de tickets

1. **2.0** — Migración Alembic `0002_fase2_output_tables` (tablas de salida) y modelos ORM en `db/models.py`.
2. **2.1** — Pedersen: `models/estadisticos/pedersen.py`
3. **2.2** — Nowcasting: `models/estadisticos/nowcasting.py`
4. **2.3** — IPF: `models/estadisticos/ipf.py`
5. **2.4** — Clustering: `models/estadisticos/clustering_votantes.py`
6. **2.5** — Coaliciones: `models/estrategicos/coaliciones.py`
7. **2.6** — Escenarios morfológicos: `models/escenarios/morfologico.py`
8. **2.7** — Monte Carlo escaños: `models/escenarios/monte_carlo_escanos.py`
9. **2.8** — Riesgo político: `models/riesgos/riesgo_politico.py`
10. **2.9** — Stress testing: `models/riesgos/stress_testing.py`
11. **2.10** — DAFO + pipeline Prefect (`models/estrategicos/dafo.py`, `pipelines/fase2_modelos.py`)

Cada módulo es importable/ejecutable por separado; no hace falta anticipar módulos aún no creados.

### Comandos por módulo

Desde el directorio `electsim-espana`, con `DATABASE_URL` definido en el entorno:

| Ticket | Comando |
|--------|---------|
| 2.1 | `python -m models.estadisticos.pedersen` |
| 2.2 | `python -m models.estadisticos.nowcasting` |
| 2.3 | `python -m models.estadisticos.ipf <encuesta_id>` |
| 2.4 | `python -m models.estadisticos.clustering_votantes` |
| 2.5 | `python -m models.estrategicos.coaliciones` |
| 2.6 | `python -m models.escenarios.morfologico` |
| 2.7 | `python -m models.escenarios.monte_carlo_escanos` |
| 2.8 | `python -m models.riesgos.riesgo_politico` |
| 2.9 | `python -m models.riesgos.stress_testing` |
| 2.10 (DAFO) | `python -m models.estrategicos.dafo` |

IPF opcional: variable `ELECTSIM_IPF_ENCUESTA_ID` para el flow completo.

Tests unitarios de los modelos: `pytest tests/test_models/`.

### Pipeline completo (Prefect)

Orden en el flow: IPF → clustering → nowcasting → pedersen → coaliciones → morfológico → Monte Carlo → DAFO → riesgo → stress.

- Ejecución directa del módulo: `python -m pipelines.fase2_modelos`
- Con CLI Prefect (si su versión lo admite): `prefect run pipelines/fase2_modelos.py`

## Fase 3 — Motor de agentes LLM

### Migraciones Alembic

- `0003_agent_memory_log` — trazas de conversación y simulaciones.
- `0004_fase3_simulaciones` — `simulaciones_encuesta`, `simulaciones_campana`, `propagaciones_red`.

Ejecute `alembic upgrade head` y compruebe con `alembic current`.

### Árbol `agents/`

```
agents/
├── __init__.py
├── llm.py                 # Stub + OpenAI vía HTTPX
├── prompts.py             # System prompt desde perfiles_votante
├── memory_log.py          # INSERT en agent_memory_log
├── rag_retriever.py       # RAG ligero (macro + posts_redes_sociales)
├── runner.py              # VoterAgent, run_turn, RAG opcional (--no-rag)
├── simulador_cis.py       # Cuestionario sintético + agregación + comparación microdatos
├── simulador_campana.py   # Evaluación de mensajes de campaña por perfil
└── red_social.py          # Grafo perfiles + Friedkin–Johnsen + métricas (networkx)
```

### Variables de entorno

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Obligatoria para agentes y pipelines (Postgres recomendado). |
| `OPENAI_API_KEY` | Si falta, se usa `StubLLMClient` (respuestas ficticias repetibles). |
| `ELECTSIM_OPENAI_MODEL` | Modelo chat (por defecto `gpt-4o-mini`). |
| `OPENAI_BASE_URL` | Opcional (API compatible OpenAI). |

### Comandos por módulo (`__main__`)

| Módulo | Comando |
|--------|---------|
| RAG (smoke) | `python -m agents.rag_retriever` |
| Agente (1 turno) | `python -m agents.runner <cluster_id> "mensaje" [--no-persist] [--no-rag]` |
| Simulador CIS | `python -m agents.simulador_cis [--n-perfiles N] [--no-rag] [--comparar-encuesta ID] [--nombre slug]` |
| Simulador campaña | `python -m agents.simulador_campana --partido PP --texto "..." --tipo propuesta_concreta --tema economia` |
| Red social | `python -m agents.red_social` o `--simular-campana '{"1": 2.0}'` |
| Pipeline Fase 3 | `python -m pipelines.fase3_agentes` |

### Pipeline Prefect

Flow `ElectSim-España: Fase 3 — Agentes LLM`: verifica perfiles → simula CIS básico → campaña de ejemplo → propagación en red → resumen. Requiere `perfiles_votante` poblados (clustering Fase 2).

### Tests

`pytest tests/test_agents/` (incluye RAG, CIS, campaña, red y pipeline con tareas sustituidas).

### Advertencias

- Sin `OPENAI_API_KEY`, las salidas del LLM son **stub**: sirven para tests e integración, no para inferencia real.
- Los agentes representan **segmentos estadísticos** construidos a partir de datos agregados; no son personas identificables ni deben interpretarse como encuestas reales.

### Nota ética

Uso responsable: transparencia metodológica, no atribuir cita literal a ciudadanos reales y cumplir RGPD en datos personales si se enlazan microdatos reales.

## Fase 4 — Sistema autónomo

Migraciones Alembic: `0005_realtime_tables` (``scraping_log``, ``alertas_sistema``, ``encuestas_tracking``, ``cache_http``) y `0006_realtime_extras` (columnas en ``elecciones``, ``indicadores_macroeconomicos``, ``resultados_electorales``). Ejecute `alembic upgrade head` y `alembic current` (debe mostrar `0006`).

### Variables de entorno

| Variable | Uso |
|----------|-----|
| `ELECTSIM_DRY_RUN` | Por defecto `true`: ningún scraper hace peticiones HTTP reales ni escribe en BD (adecuado para CI). En producción use `ELECTSIM_DRY_RUN=false`. |
| `ELECTSIM_SMTP_HOST` | Opcional: alertas por email (`ELECTSIM_SMTP_PORT`, `ELECTSIM_SMTP_USER`, `ELECTSIM_SMTP_PASSWORD`, `ELECTSIM_ALERT_EMAIL_TO`). |
| `ELECTSIM_SLACK_WEBHOOK` | Opcional: alertas WARNING/CRITICAL a Slack. |
| `ELECTSIM_TELEGRAM_TOKEN` / `ELECTSIM_TELEGRAM_CHAT_ID` | Opcional: alertas CRITICAL por Telegram. |

### Módulos tiempo real (`etl/realtime/`)

Cada scraper es ejecutable en standalone, por ejemplo:

- `python -m etl.realtime.cis_monitor`
- `python -m etl.realtime.prensa_encuestas`
- `python -m etl.realtime.macro_monitor`
- `python -m etl.realtime.interior_noche_electoral`
- `python -m etl.realtime.alertas`

### Scheduler Prefect

- Orquestación: `python pipelines/realtime_scheduler.py --flow prensa|macro|cis|diario|alertas|noche`
- Registro de deployments (API Prefect 2): `python pipelines/realtime_scheduler.py --deploy`
- Worker en Docker (tras `alembic upgrade` y `.env` con `DATABASE_URL` y `PREFECT_API_URL`): `docker compose up prefect-worker -d`

### Consultas útiles

Alertas no leídas:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM alertas_sistema WHERE leida=false ORDER BY created_at DESC;"
```

Últimos scrapes:

```bash
psql "$DATABASE_URL" -c "SELECT fuente, estado, n_registros_nuevos, created_at FROM scraping_log ORDER BY created_at DESC LIMIT 20;"
```

### Tests

`pytest tests/test_realtime/ -v`

### Aviso ético

Solo se debe scrapear **fuentes públicas**, respetando `robots.txt` y ritmos razonables (delays en `BaseRealTimeScraper`). **No almacenar datos personales identificables.** Uso previsto: investigación académica y transparencia metodológica.

## Fase 5 — Ontología operativa + API + War Room

Se añade una capa "Palantir-like" compuesta por:

- `ontology/`: tipos, relaciones y acciones operativas sobre datos electorales.
- `api/`: FastAPI con endpoints de ontología (`/ontology/*`), acciones (`/actions/*`), analytics y búsqueda semántica.
- `agents/tools.py` + `agents/semantic_search.py`: registro de tools y semantic search con `pgvector`.
- `dashboard/pages/18_War_Room_Espana.py`: centro de mando operacional para España.

Comandos:

- API: `uvicorn api.main:app --reload`
- Ingesta declarativa: `python -m pipelines.ingest_all`
- Backfill embeddings: `python -m etl.quality.backfill_embeddings_posts`
- Worker embeddings realtime: `python -m etl.realtime.embed_posts_worker`
- SPA opcional: `cd dashboard/spa && npm install && npm run dev`

## Notas de diseño

- **`resultados_electorales`**: la restricción `UNIQUE(eleccion_id, partido_id, provincia_id)` coincide con el diseño original; si se cargan resultados municipales con la misma provincia y partido, habrá que ampliar la clave (p. ej. incluir `municipio_id` o tipo de agregación).
- **Seeds**: incluyen las 19 CCAA (INE), fuente CIS si no existe y partidos nacionales frecuentes; provincias y municipios deben cargarse vía ETL desde el INE.
- **Prefect en Docker**: el servicio `prefect` usa la imagen oficial; monte el código en `/app` y configure `PREFECT_API_URL` según su despliegue.

## Licencia

Definir según el titular del proyecto.
