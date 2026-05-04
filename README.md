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
6. Validar entorno antes de arrancar: `python bin/check_env.py`

### Variables críticas (obligatorias)

- `DATABASE_URL`: obligatoria para Dashboard, API, Prefect worker y Alembic.
- Si falta, los módulos de DB/migraciones abortan con error explícito.
- Formato local recomendado:

```bash
DATABASE_URL=postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana
```

### Modos de ejecución recomendados

- **Modo local puro**:
  - Postgres instalado en host.
  - `DATABASE_URL` apunta a `localhost`.
- **Modo Docker completo**:
  - `docker compose up -d postgres prefect api`.
  - Desde host, `DATABASE_URL` también puede apuntar a `localhost:5432` (puerto publicado).
  - Dentro de contenedores se usa host `postgres`.

### Frontend SPA (si lo vais a usar)

El frontend de `dashboard/spa/` **no** versiona `node_modules`.

```bash
cd dashboard/spa
npm install
npm run dev
```

Para producción:

```bash
cd dashboard/spa
npm run build
```

## Convenciones de repositorio (equipo)

- No subir artefactos locales: `.venv/`, `.etl_cache/`, `logs/`, `data1/`, `Microdatos/`, `dashboard/spa/node_modules/`.
- Mantener `requirements.txt` como fuente de verdad de dependencias (y `requirements.lock` opcional como snapshot local).
- Arranque local estándar del dashboard: `bash start.sh`.

### Dependencias en Docker

- Las imágenes de API y Prefect worker instalan dependencias desde `requirements.txt`.
- Si tocas dependencias, reconstruye imágenes:

```bash
docker compose build api prefect-worker
```

### Arranque canónico local

Usar siempre el entrypoint del proyecto:

```bash
bash start.sh
```

`start.sh` activa `.venv`, carga `.env`, exporta `PYTHONPATH` y arranca Streamlit desde `app.py`.

Variables `RAW_DATA_PATH` y `PROCESSED_DATA_PATH` pueden apuntar a rutas absolutas si Prefect o los extractores corren fuera del directorio del proyecto.

## Artefactos locales (no versionables)

- `.etl_cache/`
- `data/raw/`
- `data/processed/`
- Ficheros grandes de ingestión (`*.zip`, `*.DAT`, `*.sav`)

Estos artefactos son de ejecución local/operativa y no deben commitearse.

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

- Ingesta simplificada (recomendada): `python -m pipelines.ingesta_simple --modo rapido`
- Ingesta completa (base + medios + declaraciones): `python -m pipelines.ingesta_simple --modo completo`
- Dry-run: `python -m pipelines.ingesta_simple --modo completo --dry-run`
- Orquestación global legacy: `python -m pipelines.ingest_all`
- Por dominio: `ingest_electoral`, `ingest_economico`, `ingest_sectorial`, `ingest_social`

Las tareas están preparadas como esqueleto: implemente extractores en `etl/sources/` y loaders en `etl/loaders/`.

## IA local sobre scrapers

Politeia incluye una capa local de inteligencia en `agents.local_intelligence` y `agents.ai_engine`: ingiere CSV/JSON/JSONL/Parquet/TXT/HTML de scrapers, extrae hechos electorales, políticos, económicos y sociales, mantiene una ontología local y expone chatbot/API. El motor común usa Ollama (`politeia-brain:latest`), embeddings locales (`nomic-embed-text`), ChromaDB persistente, NER en español y sentimiento multilingüe.

```bash
python -m agents.local_intelligence ingest data/raw --max-records 500
python -m agents.local_intelligence chat "Resume las señales electorales y económicas" --no-llm
python -m agents.git_amigos_indexer build
python bin/setup_ollama_brain.py
python -m agents.backend_manager chat "Qué repos de gits amigos uso para montar el backend IA?"
uvicorn api.main:app --reload
```

Ollama queda configurado como `politeia-brain:latest` sobre `qwen2.5:7b`, con contexto 8192 y memoria persistente. Endpoints: `POST /ai/ingest/path`, `POST /ai/search`, `POST /ai/chat`, `GET /ai/ontology/summary`, `GET /ai/manager/ui`, `POST /ai/manager/chat`. Documentación: `docs/ia_local.md`.

Los scrapers y pipelines enriquecen registros con IA local y sincronizan la memoria vectorial cuando están activadas `ELECTSIM_AI_ENRICH_SCRAPERS=1`, `ELECTSIM_AI_VECTOR_SYNC=1` y `ELECTSIM_AI_REASON_PIPELINES=1`. Estado y reindexado: `GET /ai/engine/status` y `POST /ai/engine/reindex-local`.

## Documentación

- Sitio local: `mkdocs serve`
- Metadatos de URLs y formatos por fuente: `etl/sources/config_fuentes.py`

## Loaders concretos (Fase 1)

- **Geografía INE**: `python -m etl.sources.ine_geografia` — API `VALORES_VARIABLE` (variables 70, 115, 19) con paginación.
- **Resultados Congreso (Interior)**: tras tener provincias en BD, con `ELECTSIM_CONGRESO=año:mes` (p. ej. `2023:7`) ejecute el flow `ingest_electoral` o en Python `InteriorResultadosExtractor(año=2023, mes=7).run()`. Opcional `INTERIOR_SSL_VERIFY=false` si hay problemas de cadena TLS en su entorno.

## Alembic

Modelos en `db/models.py`. Tras el primer `docker compose up` de Postgres: `alembic stamp 0001_baseline`. Detalle en `db/migrations/README.md`.

Fase 2 (tablas de salida): `alembic upgrade head` aplica la revisión `0002_fase2_output_tables`. Compruebe con `alembic current`.

Migración recomendada (con el mismo `.env` de la app):

```bash
python bin/check_env.py
alembic upgrade head
```

Atajo equivalente:

```bash
make migrate
```

Si ejecutas desde host con stack Docker, asegúrate de usar la misma `DATABASE_URL` que el dashboard.

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

Si lanzas comandos `prefect` desde el host (fuera de contenedor), exporta:

```bash
export PREFECT_API_URL="http://localhost:4200/api"
```

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

## Bloque 4 — OSINT & Risk Graph Core

Capa de inteligencia de riesgo defensiva y auditable para D2 (Mapa de Actores),
D3 (Termómetro de Riesgo), D8 (Geopolítica) y Politeia Brain.

### Principios de diseño

- **OSINT defensivo**: solo se importan datos de fuentes públicas ya procesadas. No se ejecutan scans activos.
- **Verificación humana obligatoria**: ningún candidato de identidad social se marca como verificado automáticamente.
- **Trazabilidad completa**: todos los scores incluyen un `breakdown` auditado.
- **Gradación de confianza**: confianza máxima 0.60 para candidatos de identidad; SpiderFoot imports máximo 0.55.

### Nuevas tablas (migración 0041)

| Tabla | Descripción |
|-------|-------------|
| `risk_entities` | Entidades de riesgo (personas, empresas, países). FTS + GIN indexes. |
| `risk_relations` | Relaciones entre entidades (Directorship, Ownership, etc.). |
| `risk_flags` | Flags de riesgo por entidad (sanctioned, pep, jurisdiction_risk, etc.). |
| `social_identity_candidates` | Candidatos de identidad social pendientes de verificación manual. |

```bash
alembic upgrade head  # aplica migración 0041
```

### Fuentes de datos soportadas

| Fuente | Formato | Licencia | Comando |
|--------|---------|----------|---------|
| [OpenSanctions](https://www.opensanctions.org/docs/bulk/) | FtM JSONL | CC BY-NC 4.0 (no comercial) | `--source opensanctions --file` |
| [SpiderFoot](https://github.com/smicallef/spiderfoot) | JSON / GEXF | LGPL | `--import-spiderfoot` |
| Maigret | Candidatos URL | MIT | `--username-candidates` |

### Pipeline CLI

```bash
# Cargar OpenSanctions (formato FtM)
python -m pipelines.osint_core --source opensanctions --file data/raw/opensanctions/entities.ftm.jsonl

# Resolver entidades duplicadas
python -m pipelines.osint_core --resolve

# Recalcular risk scores
python -m pipelines.osint_core --score

# Importar export de SpiderFoot
python -m pipelines.osint_core --import-spiderfoot report.json

# Generar candidatos de identidad social (requiere revisión manual)
python -m pipelines.osint_core --username-candidates ACTOR_ID USERNAME

# Pipeline completo (todas las fuentes)
python -m pipelines.osint_core --source all
```

### Árbol `etl/sources/osint/`

```
etl/sources/osint/
  __init__.py                  # Exporta todos los schemas
  schemas.py                   # RiskEntity, RiskRelation, RiskFlag, SocialIdentityCandidate, ...
  followthemoney_mapper.py     # Mapper FtM (FollowTheMoney schema → RiskEntity)
  opensanctions_adapter.py     # Carga ficheros OpenSanctions (JSONL / JSON array)
  entity_resolver.py           # Deduplicación por Levenshtein + Jaccard (umbral 0.90)
  risk_scorer.py               # Cálculo de risk score con breakdown auditado
  maigret_adapter.py           # Candidatos de identidad social (never auto-verified)
  spiderfoot_adapter.py        # Import-only adapter (is_scan_disabled() → True siempre)
  osint_monitor.py             # ETL orchestrator (upsert entities + flags + alerts)
```

### Herramientas para Politeia Brain

7 tools registradas en `agents/tools/risk_tools.py`:

- `search_risk_entities(query, k)` — búsqueda full-text
- `get_entity_risk_profile(entity_id)` — perfil completo con flags, relaciones, identidades
- `get_high_risk_relations(entity_id, depth)` — subgrafo filtrado por confianza ≥ 0.60
- `get_top_risk_entities(limit)` — top por risk score
- `get_unverified_social_identities(limit)` — cola de revisión manual
- `explain_risk_score(entity_id)` — Markdown con breakdown del score
- `get_geopolitical_exposure()` — exposición por país para D8

### Risk Score

| Nivel | Rango | Color |
|-------|-------|-------|
| LOW | 0–20 | 🟢 Verde |
| MEDIUM | 21–45 | 🟡 Amarillo |
| HIGH | 46–70 | 🟠 Ámbar |
| CRITICAL | 71–100 | 🔴 Rojo |

Factores de scoring: `sanctions_status` (+70), `pep_status` (+25),
`jurisdiction_risk` (+10 cada uno, máx 20), `adverse_media` (+5, máx 15),
`contracting_risk` (+10, máx 20), `conflict_of_interest` (+8), `opacity_risk` (+6),
`regulatory_action` (+7), `high_risk_relations` (+4, máx 16).

### Tests

```bash
.venv/bin/pytest tests/test_osint_core.py -v  # 71 tests
```

### Nota ética y legal

- OpenSanctions: licencia CC BY-NC 4.0. Solo para uso no comercial.
- SpiderFoot: solo se importan exports externos. No se lanzan scans desde ElectSim.
- Maigret: solo genera candidatos URL. Requieren verificación humana antes de cualquier uso.
- No se almacenan datos biométricos ni se cruzan con datos personales no públicos.

## Bloque 5 — Economic Intelligence Core

Módulo de inteligencia económica que conecta datos macro con riesgo político, voto electoral, narrativas mediáticas y análisis sectorial.

### Filosofía

**No es un terminal Bloomberg/OpenBB.** Es una capa de inteligencia política que explica cómo la economía afecta a la política:
- Por qué sube o baja el voto al gobierno
- Qué sectores están bajo presión y qué narrativas dominan
- Cómo se comporta el mercado de deuda y qué señala para la gobernabilidad
- Qué territorios divergen económicamente y cómo afecta eso al mapa electoral

### Tablas DB (migración 0042)

| Tabla | Descripción |
|-------|-------------|
| `economic_series` | Metadatos de series macroeconómicas |
| `macro_indicators` | Observaciones puntuales (1 dato por serie/fecha) |
| `economic_signals` | Señales económico-políticas detectadas |
| `economic_forecasts` | Proyecciones generadas por el forecaster |
| `budget_items` | Partidas de presupuesto público |

### Proveedores

| Proveedor | Series | Activación |
|-----------|--------|------------|
| INE | IPC, Paro EPA, PIB, Confianza Consumidor, Precio Vivienda | Default |
| BdE | Prima riesgo, Euribor, Bono 10Y, Deuda, Crédito | Default |
| Eurostat | HICP, Paro EU, PIB EU, Déficit, Deuda Maastricht | Default |
| World Bank | WDI: PIB per cápita, paro, inflación, educación, salud | Default |
| TradingEconomics | 100+ series (requiere `TRADINGECONOMICS_API_KEY`) | Opcional |
| OpenBB | Hub ampliado (requiere `ELECTSIM_ECON_USE_OPENBB=true`, AGPL) | Desactivado |

### CLI — Comandos

```bash
# Fetch de todos los proveedores
python -m pipelines.economy_core --source all

# Proveedor específico
python -m pipelines.economy_core --provider ine
python -m pipelines.economy_core --provider eurostat --geography EU27_2020

# Detectar señales económico-políticas
python -m pipelines.economy_core --signals

# Forecast de un indicador
python -m pipelines.economy_core --forecast ipc --horizon 12 --model arima

# ITPE Económico
python -m pipelines.economy_core --itpe

# Importar presupuesto
python -m pipelines.economy_core --budget data/presupuesto_2024.csv --budget-year 2024

# Backtest de modelo
python -m pipelines.economy_core --backtest paro_epa --model ols_trend

# Pipeline completo
python -m pipelines.economy_core --run-all --dry-run
```

### ITPE Económico

Índice de Tensión Político-Económica (0-100):

| Dimensión | Peso | Umbral crítico |
|-----------|------|---------------|
| Inflación (IPC) | 20% | > 5% |
| Desempleo (Paro EPA) | 20% | > 18% |
| Crecimiento (PIB YoY) | 15% | < -2% |
| Fiscal (Deuda + Déficit) | 15% | Deuda > 130% |
| Vivienda | 10% | Var. > 10% |
| Energía | 10% | Delta > 30% |
| Mercados (Prima riesgo) | 5% | > 400pb |
| Confianza consumidor | 5% | ICC < -20 |

Niveles: **BAJO** (0-34) · **MODERADO** (35-49) · **ALTO** (50-69) · **CRÍTICO** (70-100)

### Modelo de Voto Económico (Lewis-Beck)

```python
from models.economic_vote import EconomicVoteModel
model = EconomicVoteModel()
pred = model.predict_from_macro({
    "pib_yoy": 2.1, "paro_epa": 11.4, "ipc": 2.8,
    "prima_riesgo": 87, "deficit_pib": 3.2,
}, base_vote_share=28.0)
print(f"Δvoto estimado: {pred.delta_vote:+.1f}pp")
print(pred.explanation)
```

### Brain Tools (N8_ChatIA)

| Herramienta | Descripción |
|-------------|-------------|
| `get_macro_indicators` | Indicadores macroeconómicos recientes |
| `get_economic_signals` | Señales económico-políticas activas |
| `get_itpe_economic` | Cálculo del ITPE Económico |
| `forecast_macro_indicator` | Forecast de un indicador |
| `predict_economic_vote` | Impacto económico sobre voto al gobierno |
| `explain_economic_risk` | Narrativa de riesgo económico-político |

### Estructura de archivos

```
etl/sources/economy/
├── __init__.py
├── schemas.py               ← MacroIndicator, EconomicSignal, EconomicRiskScore...
├── provider_base.py         ← BaseEconomicProvider (ABC)
├── provider_registry.py     ← EconomyProviderRegistry singleton
├── ine_provider.py          ← INE REST API
├── bde_provider.py          ← Banco de España
├── eurostat_provider.py     ← Eurostat JSON-stat 2.0
├── worldbank_provider.py    ← World Bank WDI v2
├── tradingeconomics_provider.py  ← TradingEconomics (API key)
├── openbb_provider.py       ← OpenBB (AGPL, desactivado por defecto)
├── budget_provider.py       ← CSV presupuestario
├── economic_adapter.py      ← validate, deduplicate, upsert, freshness
├── economic_signal_detector.py  ← detect_signals, upsert_signals, create_signal_alerts
├── economic_forecaster.py   ← forecast_indicator, backtest_indicator, compute_itpe_economic
└── economy_monitor.py       ← EconomyMonitor ETL orchestrator

dashboard/services/economy_core.py   ← Capa de servicio (8 funciones)
models/economic_vote.py              ← EconomicVoteModel (Lewis-Beck)
agents/tools/economy_tools.py        ← 6 Brain tools
pipelines/economy_core.py            ← CLI principal
db/migrations/versions/0042_economy_core.py  ← 5 tablas
tests/test_economy_core.py           ← 86 tests
```

### Tests

```bash
.venv/bin/pytest tests/test_economy_core.py -v
```

86 tests cubriendo: schemas, providers, adapter, signal detector, ITPE, economic vote model,
forecaster (naive/MA/OLS/ARIMA), service layer empty-DB, CLI parser, Brain tools.

---

## Licencia

Definir según el titular del proyecto.
