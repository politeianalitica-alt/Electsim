# Auditoría técnica del pipeline de ingesta — Politeia

> Fecha: 2026-05-19 · Auditor: revisión externa sobre `electsim-espana` (rama `claude/sharp-keller-3d6d48`)
> Alcance: `etl/`, `agents/brain/`, `agents/intelligence/`, `agents/pipelines/`, `agents/entities/`, `api/routers/`, `db/migrations/`, `dashboard/services/` (subset de ingesta), `scheduler/`.

## TL;DR para impacientes

El sistema tiene **>61.700 LOC de Python** dedicadas a ETL + brain + entidades, repartidas en **278 ficheros bajo `etl/`** y **210 bajo `agents/`**. Funcionalmente cubre mucho terreno (BOE, Congreso, RSS, GDELT, ACLED, EUR-Lex, INE, BdE, OpenSanctions, ...) y técnicamente está bien pensado en piezas individuales. Pero **no es un pipeline, son tres pipelines distintos viviendo en paralelo** que persisten en tablas que se solapan, con tres clases base de conector incompatibles, dos orquestadores que no se hablan (`scheduler/celery_app.py` y `agents/pipelines/master_pipeline.py`), y un bug latente que ya está en producción (ver §2.1). La ontología nueva `entities`/`entity_links` (migración 0063) está aislada del flujo de ingesta. Si mañana se quiere escalar a 1000 fuentes o cambiar el modelo de datos, la fricción de mantenimiento sería extrema.

---

## 1. Catálogo de fuentes

> Tres registros distintos de fuentes coexisten en el repo. Lo desglosamos para que el lector vea el solapamiento real.

### 1.1 Registro "nuevo" (`CONNECTOR_REGISTRY` en `etl/sources/registry.py`)

7 tipos de conector formales — la mayoría son **stubs**:

| `source_type` | Clase activa | Fichero | Estado |
|---|---|---|---|
| `legislation_boe` | `BOEConnector` real | `etl/sources/spain/boe.py` | ACTIVO (httpx async, API `boe.es/datosabiertos`) |
| `media_rss` | `RSSMediaConnector` real | `etl/sources/media/rss.py` | ACTIVO (httpx + feedparser, 10 outlets fallback) |
| `polls_cis` | `CISPollsConnector` real | `etl/sources/polls/cis.py` | ACTIVO (scraping HTML del listado CIS) |
| `legislation_bocg` | `BOCGConnector` stub | `etl/sources/stubs.py` | STUB |
| `electoral_interior` | `ElectoralInteriorConnector` stub | `etl/sources/stubs.py` | STUB |
| `demographics_ine` | `DemographicsINEConnector` stub | `etl/sources/stubs.py` | STUB |
| `europarl_agenda` | `EuroparlAgendaConnector` stub | `etl/sources/stubs.py` | STUB |

### 1.2 Registro "old" (`CONNECTOR_REGISTRY` en `etl/factory.py` + `etl/sources/catalog.yml`)

Sistema legacy basado en `BaseExtractor` (`etl/base_extractor.py`). 4 entradas en `catalog.yml`:
- `cis_barometro` (mensual)
- `ine_geografia` (semanal)
- `interior_resultados` (cada 6h)
- `alertas_actuales` (cada 10 min)

### 1.3 Data lake (`DataLakeOrchestrator` en `etl/sources/data_lake_ingestors.py`, 852 líneas)

**19 ingestores propios** monolíticos, todos en un solo fichero:

| Ingestor | Fuente real | Tipo | Frecuencia (vía `master_pipeline`) | Estado |
|---|---|---|---|---|
| `BORMEIngestor` | `boe.es/diario_borme` | scraping HTML (BS4) | diario | activo |
| `ContratacionPublicaIngestor` | feed Atom contratacion del Estado | RSS | diario | activo |
| `BoletinAutonomicoIngestor` | 10 boletines CCAA (DOGC, BOCM, BOJA, ...) | RSS | diario | activo |
| `ConsejoUEIngestor` | API consilium.europa.eu | JSON-API | diario | activo |
| `EuroParliamentVotesIngestor` | API europarl.europa.eu | JSON-API | bajo demanda | activo |
| `INEPadronIngestor` | `ine.es/wstempus` | JSON-API | diario | activo |
| `INEAtlasRentaIngestor` | `ine.es` indicador Atlas | JSON-API | diario | activo |
| `MITMAMovilidadIngestor` | MITMA movilidad | CSV | diario | activo |
| `MediaFeedIngestor` | RSS internos | RSS | diario | activo |
| `GDELTIngestor` | GDELT 2.0 API | JSON-API | diario | activo |
| `WorldBankIngestor` | World Bank Open Data | JSON-API | diario | activo |
| `ACLEDIngestor` | ACLED API | JSON-API | diario | activo |
| `OpenSanctionsIngestor` | OpenSanctions API | JSON-API | diario | activo |
| `OpenCorporatesIngestor` | OpenCorporates API | JSON-API | bajo demanda | activo |
| `NATOPressIngestor` | NATO press releases | scraping HTML | diario | activo |
| `SIPRIMilexIngestor` | SIPRI milex | scraping HTML | bajo demanda | activo |
| `GoogleTrendsIngestor` | pytrends | API | bajo demanda | activo |
| `TelegramChannelIngestor` | Telegram canales | API | diario | activo |
| `MalditaFactCheckIngestor` | Maldita RSS | RSS | diario | activo |

### 1.4 Fuentes específicas por dominio (`etl/sources/<dominio>/*.py`)

Hay además **subsistemas paralelos** sin entrar en ningún registry central:

- `etl/sources/legislative/` (4 ficheros): `BOEAdapter`, `BOEClient`, `BOEMonitor` — segunda implementación del BOE, distinta de `etl/sources/spain/boe.py`.
- `etl/sources/parliament/` (4 ficheros): `CongresoAdapter`, `CongresoClient`, `CongresoMonitor`.
- `etl/sources/media/` (10 ficheros): incluye `actor_mentions.py`, `narrative_clusterer.py`, `media_monitor.py`, `topic_classifier.py`, `fundus_client.py`, `rss_client.py` (no confundir con `rss.py`).
- `etl/sources/economy/` (14 ficheros): `BdEProvider`, `EurostatProvider`, `INEProvider`, `OpenBBProvider`, `TradingEconomicsProvider`, `WorldBankProvider`, `BudgetProvider`. Es un mini-data-warehouse económico aparte.
- `etl/sources/electoral/` (12 ficheros): incluye modelos analíticos (nowcasting, soft_vote, coalition) mezclados con `polls_provider.py` y `electoral_monitor.py`.
- `etl/sources/geopolitics/` (14 ficheros): ACLED, GDELT, UCDP clients + risk_scorer, signal_detector, briefing_builder, impact_model.
- `etl/sources/geo/` (11 ficheros) — DISTINTO de `geopolitics/`. Scrapers para ACLED, GDELT, OSINT, energía, diáspora, etc. Solapamiento total con `geopolitics/`.
- `etl/sources/osint/` (8 ficheros): OpenSanctions, Spiderfoot, Maigret, FollowTheMoney.
- `etl/sources/opendata/` (16 ficheros): 18 conectores formales (CKAN, datos.gob.es, INE, EUR-Lex SPARQL, Eurostat, municipales, autonomous, etc.).
- `etl/sources/documents/` (16 ficheros): `pdf_parser` (pdfplumber/docling), `office_parser`, `html_markdown_parser`, chunker, OCR.
- `etl/sources/geospatial/` (10 ficheros): catastro, censo, geometría.

### 1.5 Otra capa de ingesta paralela (`dashboard/services/`)

- `dashboard/services/news_ingestion.py` (564 LOC): ingesta de **350 fuentes RSS internacionales** (`dashboard/services/media_sources.py`, 572 LOC, ~350 feeds con coordenadas geográficas) → análisis con Ollama → tabla `news_articles`. Esta tabla es CREADA con `CREATE TABLE IF NOT EXISTS` desde el propio código (`_CREATE_TABLE_SQL`), saltándose Alembic.
- `dashboard/services/legislation_scraper.py` (1020 LOC): scraping BOE + EUR-Lex SPARQL + Congreso + boletines CCAA + análisis Ollama. Segunda implementación BOE (la tercera, contando `data_lake_ingestors`).
- `dashboard/services/brain_auto_ingestion.py` (568 LOC): worker en thread Python (no Celery) con intervalos hard-codeados (RSS 10min, BOE 30min, briefing 24h).

### 1.6 Catálogo total — números reales

- **Conectores formales DataSourceConnector** (interfaz nueva): **3 reales + 4 stubs**.
- **Ingestores en `data_lake_ingestors.py`**: **19**.
- **Adaptadores/clientes por dominio** (`etl/sources/<dominio>/`): aprox. **78 ficheros**, no centralizados.
- **Pipelines de notebook orquestados**: `etl/pipelines/*.py` → 7 (declaraciones, microdatos, geopolitica×2, mediatico, noticias_actores, tracker).
- **Brain data sources** (`agents/brain/pipelines/data_sources/`): 17 (BORME/SABI, AEMET, CIS, INE municipio, OpenCorporates, Wikidata x2, datos.gob, RSS news, congreso_actividad, transparencia, OCR, taxonomía sectorial, etc.).
- **350 medios RSS** catalogados en `dashboard/services/media_sources.py`.
- **10 medios** fallback en `etl/sources/media/rss.py` (`_FALLBACK_FEEDS`).

**Volumen estimado por logs/configs**: imposible determinar sin ejecutar; los `BEAT_SCHEDULE` y los hard-coded limits sugieren ~20 articulos/medio/hora · 10-30 medios = **2.000–6.000 ítems/día** de medios, +1.000-2.000 de legislativo, +cientos de geopolítica.

---

## 2. Cómo decide qué fuente activar

### 2.1 No hay un único dispatcher central — hay tres

| Orquestador | Fichero | Qué hace | Estado real |
|---|---|---|---|
| **Celery Beat** | `scheduler/celery_app.py` + `scheduler/beat_schedule.py` | Programa 10 tareas (ingesta incremental, completo, Ollama, briefings, mantenimiento) | Definido. Requiere broker Redis. Tareas en `scheduler/tasks/*.py` |
| **MasterPipeline (APScheduler)** | `agents/pipelines/master_pipeline.py` (473 LOC) | Schedule cron Lun-Vie 08/14/20, sábado 10, domingo 03, cada 15min, cada hora | Definido como daemon `python -m agents.pipelines.master_pipeline` |
| **BrainAutoIngestion (threading)** | `dashboard/services/brain_auto_ingestion.py` | Worker en hilos Python con intervalos hard-coded por ENV | Definido — corre en proceso dashboard si se invoca |

### 2.2 Bug confirmado: `master_pipeline.py` línea 79

```python
def step_datalake_priority() -> dict:
    """Ingesta rapida: BOE + GDELT + senales urgentes."""
    from etl.sources.data_lake_ingestors import DataLakeOrchestrator
    orch = DataLakeOrchestrator()
    return orch.run_priority()   # ← MÉTODO NO EXISTE
```

`DataLakeOrchestrator` solo define `run_layer()` y `run_daily()` (`etl/sources/data_lake_ingestors.py:803-818`). `run_priority` se llama desde `step_datalake_priority`, que se invoca desde `run_light()` y `run_signals()`. **El error queda absorbido silenciosamente por `_timed()`** (líneas 56-69): el wrapper captura `Exception` y devuelve `None`, así que el daemon "pasa" pero esta etapa está **muerta sin que nadie se entere**, salvo por logs `ERROR`.

### 2.3 Scheduling declarativo

- **Celery Beat** lo tiene declarado en `BEAT_SCHEDULE` (10 entradas, todas con `crontab(...)` o `crontab(minute='*/N')`).
- **APScheduler en master_pipeline.py** lo tiene en código (`scheduler.add_job(..., CronTrigger(...))`), 6 jobs.
- **catalog.yml** declara `schedule:` como string pero **nadie lee ese fichero en runtime** — busqué y no hay ningún `load_yaml('catalog.yml')` activo en el sistema. Es un fichero muerto.

### 2.4 Priorización ante caída / rate limit

- **Groq tiene rate-limit centralizado** (semáforo 30 RPM en `agents/brain/groq_client.py:67-91`), con back-off `Retry-After` y backoff exponencial.
- **Ollama tiene healthcheck con cache de 60s** (`agents/intelligence/strategic_news_pipeline.py:175-190`).
- **Ningún rate-limit centralizado para fuentes externas**: cada conector hace su `httpx.AsyncClient(timeout=X)` por su cuenta. No hay token bucket compartido para ACLED, GDELT, BOE, etc., aunque ACLED y similares tienen sus propios caps.
- **No hay circuit breaker explícito** para fuentes externas (solo para el build del `GroqBrain`, ver `agents/brain/groq_brain.py:338-407`).

---

## 3. Pipeline de extracción

### 3.1 Librerías por formato

| Formato | Librería | Dónde |
|---|---|---|
| **RSS/Atom** | `feedparser` | `etl/sources/media/rss.py`, `etl/sources/data_lake_ingestors.py`, `dashboard/services/news_ingestion.py`, `etl/ingestion/connectors/*` |
| **HTML scraping** | `BeautifulSoup` (bs4) | `etl/sources/data_lake_ingestors.py` (BORMEIngestor), `etl/sources/polls/cis.py`, `etl/sources/legislation_scraper.py` |
| **HTML article extraction** | `trafilatura` | `agents/intelligence/strategic_news_pipeline.py:579-597` (extracción full-text antes de pasar al LLM) |
| **PDF** | `pdfplumber` + `docling` (parser de IBM) | `etl/sources/documents/pdf_parser.py`, `etl/sources/documents/docling_parser.py` |
| **JSON-API** | `httpx` (async) y `requests` (sync) — coexisten | `etl/sources/spain/boe.py`, `etl/sources/economy/*`, `data_lake_ingestors.py` (`requests`) |
| **CSV** | `pandas` | `etl/base_extractor.py`, varios extractors legacy |
| **Webhook** | No detectado · no hay endpoints `POST /webhooks/...` que ingesten datos en `api/routers/` |

### 3.2 ¿Se normaliza a un schema común?

Hay **3 modelos distintos** convivientes:

- **`NormalizedItem`** (`etl/sources/base_connector.py`): `{source_id, source_type, external_id, title, content, published_at, url, metadata}`. Es el "schema nuevo" pero solo lo respetan los 3 conectores reales (`BOE`, `RSS`, `CIS`).
- **`data_lake_staging.payload`** (tabla, migración 0030): JSONB libre — cada `Ingestor` define su shape. **No hay schema unificado**, lo que rompe parcialmente la promesa de "data lake unificado".
- **`media_items`** (migración 0039, 40+ columnas tipadas): `actors[]`, `parties[]`, `sectors[]`, `topics[]`, `sentiment_label`, `narrative_cluster_id`, `raw_payload jsonb`, `content_hash` UNIQUE.

Adicionalmente:
- `news_articles` (creada inline desde `dashboard/services/news_ingestion.py`): otro shape distinto con `ai_sentiment`, `ai_relevance`, `ai_spain_impact`, etc.
- `strategic_articles` (migración 0031): otro shape distinto con `event_type`, `policy_areas`, `strategic_signals`.

**Tres tablas distintas para "noticia procesada"** (`media_items` + `news_articles` + `strategic_articles`) con normalizaciones distintas. Esto es deuda dura.

### 3.3 Deduplicación — `etl/ingestion/dedup_engine.py`

Bien implementado (169 LOC). Resumen:
- `compute_title_hash`: MD5 sobre el título normalizado (`normalize_text` + lowercase + sin puntuación).
- `compute_content_hash`: MD5 sobre los primeros 500 chars normalizados.
- `compute_simhash(text, hash_bits=64)`: simhash clásico sobre tokens MD5.
- `is_near_duplicate(a, b, threshold=5)`: Hamming distance ≤5 sobre 64 bits.
- `dedup_items(...)`: combina **exact-match por título** + **simhash near-duplicate**.

**Críticas**:
1. **No se usa contra `media_items.content_hash`** (que ya tiene UNIQUE constraint). El `dedup_engine` vive solo en el `etl/ingestion/orchestrator.py` (que es una pipeline en demo mode — ver §7.1).
2. **No usa pgvector** para deduplicación semántica multilingüe (el embedding-store existe pero no se cruza con dedup).
3. El umbral `threshold=5` está hard-coded. No hay tuning empírico documentado.

### 3.4 Filtrado por relevancia

`agents/intelligence/strategic_news_pipeline.py:263-462` — `StrategicRelevanceFilter`:

- 5 ejes con pesos fijos: actor 0.30, topic 0.30, evento 0.20, novedad 0.10, credibilidad 0.10.
- Threshold `0.65` para pasar a Fase 2 (LLM).
- **Blacklist** de 18 patrones regex (fútbol, baloncesto, horóscopo, moda, ...).
- Lista de **39 keywords estratégicos** (elecciones, OTAN, BCE, IPC, Pegasus, Gibraltar, ...).
- **Carga actores desde `persona_publica`** (tabla migración 0030) con fallback a 35 hard-coded.
- **Credibilidad por fuente**: 22 fuentes con score `0.55–1.00`. Resto: 0.60 default.

Es **lo único decente que hace pre-filtering en el sistema**. Las otras capas (data_lake_ingestors, news_ingestion) escriben TODO a BD y procesan después.

---

## 4. Pipeline de análisis NLP

### 4.1 Tareas NLP detectadas

| Tarea | Implementación principal | Modelo activo |
|---|---|---|
| **NER** | `etl/nlp/ner.py` → delega en `etl/transformers/mediatico.py` (spaCy con fallback regex) y `agents/ner_pipeline.py` (spaCy directo) | `es_core_news_lg` (>`md`>`sm` fallback) |
| **Sentimiento (texto general)** | `etl/nlp/sentiment.py` y `agents/sentiment_pipeline.py` | `cardiffnlp/twitter-xlm-roberta-base-sentiment` + fallback léxico |
| **Sentimiento (refinado)** | `agents/intelligence/strategic_news_pipeline.py` | `pysentimiento` (es) → fallback léxico |
| **Clasificación IPTC** | `etl/nlp/topic_classification.py` + `etl/transformers/mediatico.py` + `agents/intelligence/strategic_news_pipeline.py` | `TajaKuzman/IPTC-Media-Topic-Classification` (HuggingFace) |
| **Clustering narrativo** | `etl/sources/media/narrative_clusterer.py` (335 LOC) | BERTopic + UMAP + HDBSCAN (mencionado) |
| **Resumen / Extracción** | `agents/intelligence/strategic_news_pipeline.py` Phase 2 | Ollama `qwen3:8b` (`MODEL_RESUMEN`) |
| **Enriquecimiento entidades (cargo/partido)** | `agents/intelligence/strategic_news_pipeline.py` | Ollama `llama3.2:3b` (`MODEL_ENTIDADES`) |
| **Análisis profundo / briefings** | `agents/brain/groq_brain.py` (29 tools) | Groq `llama-3.3-70b-versatile` |
| **Detección de citas** | regex en `etl/ingestion/enrichment.py:156-177` y `strategic_news_pipeline.py:693-715` | regex (sin LLM) |

Hay **al menos 2 sentiment pipelines y 2 NER pipelines** funcionalmente equivalentes — los del `etl/` y los del `agents/`. **No hay routing claro de cuál se usa cuándo**.

### 4.2 Embeddings semánticos

`etl/nlp/embedding.py`:
- Prioridad 1: **Ollama** (`nomic-embed-text`, 768d), sync via `httpx.post(/api/embeddings)`.
- Prioridad 2: **SentenceTransformer** local (`paraphrase-multilingual-MiniLM-L12-v2`, 384d).
- Prioridad 3: hash determinista (fallback solo para tests).

**Persistencia**: `agents/brain/rag_indexer.py` usa `AIEngine.upsert_documents(...)` que escribe a **Chroma** (la `.chroma_db/` está checked-in en el repo). NO se usa pgvector — la extensión está mencionada en migraciones (`002_create_vector_index.sql`) pero el código activo es Chroma.

Colecciones Chroma (`rag_indexer.py:27-35`):
- `electsim_legal`, `electsim_media`, `electsim_narratives`, `electsim_briefings`, `electsim_actors`, `electsim_electoral`.

Tabla auxiliar `rag_documents` (migración 0040) **solo registra metadatos** (qué se indexó cuándo) — los vectores viven en Chroma. Si Chroma desaparece, el sistema pierde búsqueda semántica sin trazas en Postgres.

### 4.3 Clasificación de sesgo / orientación política

- `_SOURCE_CREDIBILITY` (`strategic_news_pipeline.py:331-342`): 22 fuentes con score editorial (`okdiario: 0.55`, `el_pais: 0.95`). Es un **diccionario hard-coded**, no se aprende, no se valida.
- `media_intelligence_v2` (migración 0062) tiene una noción de **espectro ideológico** que se consulta via tools (`consultar_espectro_ideologico_v2`), pero el modelo etiquetador no está en `etl/nlp/`. Está en `media_intelligence/` (paquete aparte) que no inspeccioné, pero **el pipeline de ingesta no escribe ese campo** — debe haber una capa intermedia.
- `agents/brain/analysis.py:analyze_media_bias` (tool 5 del bloque 2): el brain razona sobre sesgo a la carta, no como pipeline estable.

---

## 5. Papel de la IA (Groq / OpenAI / Ollama)

### 5.1 Las "27 tools" — recuento real

Las docs mencionan 27. El código vivo es:

- `GroqBrain` (`agents/brain/groq_brain.py`): docstring dice **"29 tools" en 7 bloques**, con 7 mixins:
  - Bloque 1 (`IngestionMixin`): **5 tools** — `identify_source_relevance`, `extract_political_entities`, `classify_document`, `detect_source_change`, `discover_new_sources`. Verificado.
  - Bloque 2 (`AnalysisMixin`): **5 tools** declaradas — `analyze_sentiment_deep`, `analyze_narrative`, `analyze_discourse`, `detect_disinformation_signals`, `analyze_media_bias`.
  - Bloque 3 (`ForecastingMixin`): **5 tools** según docstring.
  - Bloque 4 (`IntelligenceMixin`): **5 tools**.
  - Bloque 5 (`ContentMixin`): **5 tools**.
  - Bloque 6 (`MemoryToolsMixin`): **3 tools** (no 5 — docstring del brain dice 3).
  - Bloque 7 (`OrchestratorMixin`): **1 tool** (`political_query`, ReAct loop sobre `agents.orchestrator.react_agent`).

  Total declarado: **29 tools del Brain razonador**.

- `agents/tools/registry.py` carga TOOLS_AGENTE desde 16 módulos distintos en `agents/tools/`:
  - `CAMPAIGN_TOOLS`, `COMMS_TOOLS`, `CRM_TOOLS`, `DATA_OPS_TOOLS`, `DOCUMENT_TOOLS`, `ECONOMY_TOOLS`, `ELECTORAL_TOOLS`, `GEOPOLITICS_TOOLS`, `OPENDATA_TOOLS`, `RISK_TOOLS`, `SECURITY_TOOLS`, `SIMULATION_TOOLS`, `SYSTEM_TOOLS`, `TERRITORIAL_TOOLS`, plus `legislative_tools` y `media_tools` declarados inline (~7+9 tools).

  Por ejemplo, en `media_tools` registry inline: **12 tools** (`search_media_items`, `get_recent_narratives`, `get_actor_media_profile`, ..., `consultar_terminos_calientes_v2`). En `legislative_tools`: **7 tools**. Si extrapolamos x16 módulos a ~5-12 tools cada uno, hay **>100 tools de dominio**, no 27.

**La cifra "27 tools" es marketing**. La realidad: **29 del brain razonador + ~100 de dominio**, repartidas entre el `GroqBrain` (LLM razonador) y el `TOOLS_AGENTE` registry (tool-use para Ollama/LiteLLM).

### 5.2 Intervención de la IA en el pipeline

Cuatro modos detectados:

1. **Post-extracción, pre-persistencia** — `agents/intelligence/strategic_news_pipeline.py:805-862`: tras NER + sentimiento, Ollama enriquece personas + genera resumen ejecutivo antes de `INSERT INTO strategic_articles`.
2. **Post-persistencia (re-enriquecimiento batch)** — `dashboard/services/news_ingestion.py:_analyze_with_ollama()`: tras INSERT, llamada Ollama actualiza `ai_*` columnas.
3. **Bajo demanda del usuario** — `api/routers/brain.py` `/api/brain/chat-with-tools`: tool-use real con Ollama llamando al `TOOLS_AGENTE` registry.
4. **Bloque 1 del Brain — razonamiento sobre fuentes** (`agents/brain/ingestion.py`): el LLM puede sugerir qué fuentes ingestar (`discover_new_sources`), pero **esto no está conectado al pipeline real de ingesta**. Es una herramienta que el analista puede invocar, no algo que el pipeline ejecute automáticamente.

### 5.3 Router de modelos

**Dos routers coexisten**:

- `agents/brain/llm_router.py` (395 LOC): clasifica por `task_type` ("translation", "classification", "extraction", "narrative_frame", "briefing", "comms_strategy", "qna", "red_team", "deep_analysis", "evidence_check"). Cada task tiene `speed` (fast/normal/deep), `timeout`, `json` bool, `cache_ttl`. Lee envs `LLM_FAST_MODEL`, `LLM_NORMAL_MODEL`, `LLM_DEEP_MODEL` (defaults Ollama: `llama3.2:3b`, `qwen2.5:7b`, `qwen2.5:7b`). Comprueba si Ollama está alcanzable (cache 60s); si no, va directo a Groq.

- `agents/brain/model_router.py` (80+ LOC): otra tabla `_ROUTES` con `fast/normal/deep/legal/media/electoral/system/embeddings`. Cada uno tiene `provider`, `fallback_provider`, `fallback_model`, `params` (`num_predict`, `temperature`, `top_p`). El fallback es Anthropic (`claude-3-5-sonnet-20241022`).

**Solapamiento total**: hay dos sistemas para decidir el modelo. No es claro cuál gana ni cuándo se usa cada uno.

### 5.4 Rate-limiter / retries / circuit breaker

`agents/brain/groq_client.py` (376 LOC) es **el módulo mejor diseñado del proyecto**:
- **Rate limiter**: ventana deslizante de 60s, default 30 RPM (`GROQ_RATE_LIMIT_RPM` env), implementado con `threading.Lock` y `deque`. Bloqueante con timeout configurable.
- **Retry**: hasta 3 intentos por defecto, respeta `Retry-After` y `retry-after-ms` headers, backoff exponencial para 5xx (`2^attempt`).
- **Caché**: LRU con TTL, key = `SHA256(model:system:prompt:expect_json)`, eviction al llegar a 1000 entradas (borra 10% por timestamp).
- **Circuit breaker**: en `agents/brain/groq_brain.py:338-407`, si la construcción del `GroqBrain` falla, devuelve un stub que captura cada llamada y devuelve `ok=False`. Cooldown 60s antes de reintentar el build.

Resto de clientes (Ollama, conectores externos): **sin rate-limiter centralizado, sin retry estructurado**, solo timeouts y `try/except` que loggean y devuelven `[]`.

---

## 6. Persistencia y ontología

### 6.1 Tablas relacionadas con ingesta — inventario por migración

| Migración | Tablas creadas | Comentario |
|---|---|---|
| `0030_palantir_layer` | `persona_publica`, `organizacion`, `relacion_politeia`, `propensity_score`, `signal_politeia`, `sentiment_history`, `entity_review_queue`, `data_lake_staging` | El "core ontológico v1". `persona_publica` y `organizacion` son las tablas vivas que usan `strategic_news_pipeline` y `EntityResolver`. |
| `0031_strategic_articles` | `strategic_articles` | Output del pipeline estratégico (con `event_type`, `policy_areas`, `strategic_signals`, JSONB de personas/orgs/locs/citas). |
| `0034_entity_resolution` | `entities_canonical`, `entity_aliases`, `raw_mentions`, `entity_mentions`, `resolution_review_queue` | **Segundo intento** de ontología. **No se usa** por los pipelines de noticias actuales. |
| `0039_media_core` | `media_items`, `media_actor_mentions`, `narrative_clusters`, `narrative_cluster_items` | El "media core v1" — tabla ancha con sentiment, topics, content_hash UNIQUE, RLS multi-tenant. |
| `0040_brain_core` | `agent_runs`, `tool_calls`, `rag_documents` | Audit del Brain (qué prompts, qué tools, cuándo). `rag_documents` es solo registro de metadata Chroma. |
| `0055_media_source_health` | health metrics de fuentes | Estado de scrapers. |
| `0062_media_intelligence_v2` | tabla(s) v2 de media intelligence | Espectro ideológico. |
| `0063_ontology_and_investigations` | **`entities`**, **`entity_links`**, `investigations`, `inv_pinned`, `inv_artifacts`, `analyst_events` | **Tercer intento** de ontología — la "object-centric" nueva. |

Adicional: `news_articles` la crea el código (no Alembic) desde `dashboard/services/news_ingestion.py`.

**Total**: hay **3 ontologías superpuestas en BD** + **3 tablas distintas de noticia procesada**. Ninguna de las migraciones más recientes (0063) deprecia las anteriores.

### 6.2 ¿Se mapean a la ontología `entities` + `entity_links` recién creada?

**No.** Ninguno de los pipelines de ingesta activos (master_pipeline, news_ingestion, strategic_news, legislation_scraper, data_lake_ingestors) escribe en la tabla `entities` ni en `entity_links`.

Hoy, la tabla `entities` se rellena exclusivamente por `agents/entities/backfill.py` desde **catálogos curados** (15 partidos, 19 CCAA, 17 sectores) — NO desde fuentes vivas.

Para que llegara, faltarían:
- Adaptador: tras `EntityResolver.resolve_persona/_organizacion` (que escribe en `persona_publica`/`organizacion`), un `EntityRepository.upsert()` con `kind="actor_person"` o `"organization"`.
- Backfill de `entities_canonical` → `entities` (las dos viven en BD pero no se enlazan).
- Versionado `valid_from`/`valid_to` en cada link (el schema lo soporta, las migraciones tienen los campos).

### 6.3 Versionado temporal

La tabla `entities` (0063) **sí tiene** `valid_from`/`valid_to`. La tabla `entity_links` igual. Sin embargo:
- `persona_publica` (0030, en uso real) **no** tiene versionado (`created_at`/`updated_at` solo).
- `media_items` (0039, en uso real) **no** tiene versionado — solo `fetched_at`.
- `strategic_articles` solo `processed_at`.
- `analyst_events` (0063) sí: `ts` + `payload` JSONB para diff trails.

**Versionado existe en el papel, no en el flujo.**

### 6.4 Audit trail

- `analyst_events` (migración 0063): existe, pero ningún componente del pipeline escribe ahí.
- `agent_runs` + `tool_calls` (migración 0040): el `GroqBrain` los rellena cuando se invocan tools.
- `signal_politeia` (migración 0030): señales emitidas por el `strategic_news_pipeline` cuando un artículo crítico (score ≥ 0.80) tiene señales estratégicas — esto sí está vivo.

---

## 7. Orquestación

### 7.1 ¿Hay un master_pipeline o cada cosa corre suelta?

Existe `agents/pipelines/master_pipeline.py` (473 LOC). **Cubre 6 pasos**:
1. `step_datalake_full / step_datalake_priority` (el segundo está roto, ver §2.2)
2. `step_legislation` (delega en `dashboard/services/legislation_scraper.py:run_full_pipeline` — buscando, esta función ni siquiera existe con ese nombre: las funciones públicas son `scrape_eurlex`, `scrape_europarl`, `scrape_boe`, `scrape_congreso`, `scrape_regional`. **El import probablemente falla y se cae en el except del wrapper**, sin error visible.)
3. `step_entity_resolution` (procesa cola `entity_review_queue`)
4. `step_sentiment` (`SentimentTracker.run_full_update`)
5. `step_propensity_predict` / `step_propensity_retrain` (XGBoost)
6. `step_refresh_views` (REFRESH MATERIALIZED VIEW)
7. `step_strategic_news` (lo cita el código pero no está dentro del array original; sí en `run_full` y como job de 15 min)

**Pero no orquesta** los pipelines de `news_ingestion.py` ni `brain_auto_ingestion.py` — esos corren por su lado.

Adicionalmente existe `etl/ingestion/orchestrator.py` (139 LOC), que es **otro orquestador en demo mode**:
- Tiene un `_DEFAULT_SOURCES = ["twitter", "parliamentary", "ine", "eurostat", "bde", "cis"]`.
- Llama a conectores en `etl/ingestion/connectors/` (BdE, CIS, Eurostat, INE, Parliamentary, Twitter — diferentes de los conectores en `etl/sources/`).
- **No persiste en BD**: el `enrich_batch(dedup.kept)` se asigna a `_enriched` con `# noqa: F841 — solo en memoria por ahora`.

### 7.2 Celery / APScheduler / cron en producción

| Sistema | Activo en producción | Evidencia |
|---|---|---|
| **Celery Beat** | Probable — `docker-compose.yml` define worker + beat | `scheduler/celery_app.py`, `scheduler/beat_schedule.py` |
| **APScheduler (master_pipeline)** | Posible — daemon manual | `python -m agents.pipelines.master_pipeline` en CLI |
| **APScheduler (legislation_scraper)** | El docstring lo menciona | `dashboard/services/legislation_scraper.py` |
| **Cron** | No detectado | Sin `crontab` en repo |
| **Threading (brain_auto_ingestion)** | Manual, en proceso dashboard | `dashboard/services/brain_auto_ingestion.py` |
| **Prefect** | Sí — referenced en `api/routers/pipelines.py` | `from prefect.client.orchestration import get_client` |

**Diagnóstico**: en producción probablemente corren a la vez **Celery Beat + algún uso ad-hoc del master_pipeline + brain_auto_ingestion en threads**. Tres scheduler distintos compitiendo por la misma BD.

### 7.3 Monitorización de fallos

- **Logging estructurado**: `etl/logger.py` existe. Se usa irregularmente — la mitad del código importa `import logging` y se hace su `logger = logging.getLogger(__name__)` directo.
- **Sentry / APM**: no detectado. No hay `sentry_sdk.init(...)` en el código que examiné.
- **OTel**: hay `observability/otel.py` (mencionado en docs) y `docker-compose.observability.yml`, pero los pipelines **no llaman a `ETLMetrics.record_step` consistentemente**. Es opt-in donde el autor original lo añadió.
- **Métricas Prometheus**: no detectadas en los pipelines de ingesta.

---

## 8. Métricas reales

| Métrica | Valor |
|---|---|
| Ficheros Python en `etl/` | **278** (no incluye `__pycache__`) |
| Ficheros Python en `agents/` | **210** |
| LOC totales en `etl/` | **59.793** |
| LOC totales en `agents/brain/` | **17.915** (incluye `pipelines/data_sources/`) |
| LOC totales en `agents/brain/*.py` (raíz brain) | **5.902** |
| LOC en `agents/intelligence/strategic_news_pipeline.py` | **1.058** |
| LOC en `agents/pipelines/master_pipeline.py` | **473** |
| LOC en `etl/sources/data_lake_ingestors.py` | **852** |
| LOC en `dashboard/services/news_ingestion.py` | **564** |
| LOC en `dashboard/services/legislation_scraper.py` | **1.020** |
| LOC en `dashboard/services/brain_auto_ingestion.py` | **568** |
| LOC en `politeia_spain_pipeline.py` (root, "single-file") | **1.422** |
| Tests totales | **~2.670 funciones** en **135 ficheros** |
| Tests directamente relacionados con ingesta | test_etl (21), test_brain (45), test_intelligence (55), test_pipeline (63), test_ontology (29), test_agents (42), `test_ingestion_engine.py` (48). **Aprox. 250-300 tests "tocan" ingesta**. |
| Migraciones DB totales | **65 ficheros** en `db/migrations/versions/` + 17 `.sql` sueltos |
| Migraciones relacionadas con ingesta/ontología | **10+**: 0008, 0010, 0021, 0022, 0030, 0031, 0034, 0036, 0039, 0040, 0055, 0061, 0062, 0063 |
| Cobertura aproximada | No medida en este audit; el CLAUDE.md exige **80% en `packages/`, 70% en `apps/api`**. Para `etl/` y `agents/` no hay objetivo. |

---

## 9. Diagnóstico honesto

### 9.1 Cinco problemas estructurales que limitan escalar

1. **Triplicación de capas de ingesta sin contrato común**. Coexisten:
   - `etl/sources/<dominio>/*.py` con `DataSourceConnector` (3 reales activos).
   - `etl/sources/data_lake_ingestors.py` con clase ad-hoc por ingestor (19 ingestores en un solo fichero, sin interfaz común).
   - `dashboard/services/news_ingestion.py` + `legislation_scraper.py` + `brain_auto_ingestion.py` que ni siquiera están en `etl/`.
   - `etl/ingestion/orchestrator.py` + `etl/ingestion/connectors/*` (otra capa más, en modo demo).

   Si mañana se quiere añadir una fuente, hay que decidir **a qué capa pertenece**, y la decisión no es trivial: el código histórico ha ido eligiendo por accidente. No hay tabla de decisión documentada.

2. **Tres ontologías superpuestas sin migración entre ellas**. `persona_publica`/`organizacion` (0030) → `entities_canonical`/`entity_mentions` (0034) → `entities`/`entity_links` (0063). La última (0063) es la "object-centric" recién creada y promovida por `agents/entities/`, pero **ningún pipeline de ingesta la rellena**. Para llegar al estado prometido por la migración 0063 hay que escribir un adaptador que traduzca eventos del pipeline a `EntityRepository.upsert(...)`. Mientras tanto, las nuevas features que asuman `entities` (investigations) verán los datos vacíos o duplicados.

3. **Tres orquestadores compitiendo**. Celery Beat, APScheduler (master_pipeline) y threading (brain_auto_ingestion). Cada uno define su propia cadencia, sin coordinación. Resultado: el BOE se puede estar scrapeando **3 veces en paralelo** desde 3 procesos distintos en pico horario. Sin lock distribuido (`pg_advisory_lock` o Redlock), eso es duplicidad y race conditions sobre `data_lake_staging`.

4. **El `data_lake_staging.payload` es JSONB libre sin schema**. La promesa de "Foundry-like pipeline" requiere un schema unificado para que los pasos downstream operen sobre forma conocida. Hoy, cada `Ingestor` mete cualquier dict — `_strategic_news_pipeline` solo asume `{title, summary/raw, source, published_at, url}` y los demás campos los ignora. Eso significa que **el 50% de los datos crudos extraídos se está perdiendo o no se está aprovechando**.

5. **Bug latente confirmado + import frágil silenciado**. `master_pipeline.step_datalake_priority` llama a `orch.run_priority()` que no existe (§2.2), y `step_legislation` importa `dashboard.services.legislation_scraper.run_full_pipeline` que tampoco existe con ese nombre. Ambos errores quedan absorbidos por `_timed()` y el daemon parece sano en los logs. Esto sugiere que **el master_pipeline nunca se ha probado en producción** o que se han ignorado los errores silenciosamente durante meses.

### 9.2 Cinco fortalezas no obvias que conviene preservar

1. **`StrategicRelevanceFilter` es excelente**. (`agents/intelligence/strategic_news_pipeline.py:263-462`). 5 ejes ponderados, blacklist de ruido, carga de actores desde BD, threshold ajustable. Es exactamente el tipo de filtro pre-LLM que evita gastar tokens en el 70% del material. **Conservarlo y replicarlo** para BOE/legislativo.

2. **`GroqClient` con rate-limit + cache + retry + circuit-breaker es de nivel producción**. (`agents/brain/groq_client.py`). Mejor que muchos clientes comerciales. Hay que extraerlo como package separado (`packages/llm_client/`) y usarlo para todos los providers, no solo Groq.

3. **El sistema de normalización (`etl/ingestion/normalization.py`)** está bien: NFKC unicode, partido aliases con merge desde `dashboard.shared`, eliminación de tracking params en URLs, fechas en español. Es reutilizable cross-pipeline si se le da visibilidad — hoy lo usan 2 sitios.

4. **`dedup_engine.py`** (simhash + Hamming) es matemáticamente correcto y aislado. Solo necesita gancho en los flujos donde hoy se hace `INSERT ... ON CONFLICT` por hash exacto (que NO detecta near-duplicates).

5. **El `agents/brain/groq_brain.py` con mixins por bloque (Ingestion/Analysis/...)** es una arquitectura limpia. La idea de **"el LLM razona sobre qué fuente vale la pena ingestar"** (`identify_source_relevance`, `discover_new_sources`) es valiosa. Hoy está desconectada del pipeline real pero la pieza está construida.

### 9.3 Tres deudas técnicas críticas

1. **Adoptar `entities`/`entity_links` como única ontología, o eliminarla**. Hoy es esquizofrénico: la migración existe, los `EntityRepository` y `backfill` están escritos y testeados, pero nada del pipeline en vivo escribe ahí. O bien (a) se escribe un adaptador en `etl/ingestion/enrichment.py` que invoque `EntityRepository.upsert` después de cada NER + resolución, **deprecando `persona_publica`/`organizacion`/`entities_canonical`**, o bien (b) se borra la migración 0063 y el código de `agents/entities/`. Mantener tres capas vivas es la peor opción.

2. **Centralizar el scheduling en Celery Beat y desmantelar APScheduler + threading**. El master_pipeline debe convertirse en `scheduler/tasks/master.py` con sus 7 steps como subtareas Celery. `brain_auto_ingestion` debe morir o convertirse en `scheduler/tasks/brain_warmup.py`. Razón: un único punto de verdad para "qué corre y cuándo", y el rate-limit por fuente se puede aplicar con `app.conf.task_annotations` (que ya se usa para BERTopic, ver `celery_app.py:88-93`).

3. **Documentar y forzar un único contrato `NormalizedItem` con tests de contrato**. El `etl/sources/base_connector.py:NormalizedItem` debería ser un Pydantic model (no un `Dict[str, Any]` con alias), con `extra="forbid"`, y los 3 conectores reales deben pasar tests de contrato (`tests/test_etl/test_connector_contract.py`). Los 19 ingestores de `data_lake_ingestors.py` deben migrar a esta interfaz **uno por uno**, no de golpe. Hoy, añadir una fuente requiere copiar-pegar el patrón de la fuente más parecida porque no hay schema.

---

## Apéndice A — Mapa de ficheros relevantes citados

```
etl/
  base_extractor.py                          # Legacy BaseExtractor (Pandas + Polars)
  connectors/base.py                         # Otra BaseConnector
  factory.py                                 # Old registry
  ingestion/
    orchestrator.py                          # Demo orchestrator (no persiste)
    dedup_engine.py                          # Simhash + Hamming (excelente)
    normalization.py                         # NFKC + party aliases + URL clean
    enrichment.py                            # Heurísticas básicas (regex, no LLM)
    connectors/                              # 6 conectores demo (CIS, BdE, INE, Eurostat, Parliamentary, Twitter)
  sources/
    base_connector.py                        # DataSourceConnector (interfaz nueva)
    registry.py                              # CONNECTOR_REGISTRY (3 reales + 4 stubs)
    catalog.yml                              # YAML muerto (nadie lo lee)
    stubs.py                                 # 4 stubs
    data_lake_ingestors.py                   # 19 Ingestores + DataLakeOrchestrator
    spain/boe.py                             # BOE real
    media/rss.py                             # RSS real
    polls/cis.py                             # CIS real
    legislative/ parliament/ media/ ...      # Subsistemas paralelos por dominio
    geo/ geopolitics/ osint/ documents/      # Más subsistemas
  nlp/
    ner.py sentiment.py embedding.py topic_classification.py    # NLP pipeline event-driven
  pipelines/                                                    # 7 pipelines monolíticos
agents/
  brain/
    groq_client.py                           # Rate-limit + cache + retry (excelente)
    groq_brain.py                            # 29 tools en 7 mixins (con circuit breaker)
    llm_router.py model_router.py            # DOS routers de modelos
    rag_indexer.py                           # Indexación a Chroma
    ingestion.py analysis.py forecasting.py intelligence.py content.py memory_tools.py orchestrator.py
    pipelines/data_sources/                  # 17 data sources del brain
  intelligence/strategic_news_pipeline.py    # 1058 LOC · pipeline estratégico (filter + extract)
  pipelines/master_pipeline.py               # 473 LOC · daemon APScheduler (con bug)
  entities/                                  # Ontología "object-centric" nueva (aislada)
  ontology/                                  # Ontología vieja: dynamic_ontology + entity_resolver
  entity_resolution/                         # Tercer sistema de resolución
  tools/                                     # 16 módulos de tools de dominio (~100+ tools)
api/routers/
  brain.py brain_copilot.py groq_brain.py    # Endpoints LLM
  news_intelligence.py rag.py search.py      # Endpoints de búsqueda/ingesta
  investigations.py entities.py              # Endpoints ontología 0063
db/migrations/versions/
  0030 0031 0034 0039 0040 0055 0062 0063   # Migraciones ingesta/ontología/medios/brain
dashboard/services/
  news_ingestion.py legislation_scraper.py brain_auto_ingestion.py   # Tres pipelines paralelos
  media_sources.py                                                    # 350 RSS feeds catalogados
scheduler/
  celery_app.py beat_schedule.py             # Celery (10 tareas declaradas)
  tasks/ingesta.py tasks/ollama.py tasks/intelligence.py tasks/mantenimiento.py
```

---

## Apéndice B — Comandos de verificación independiente

```bash
# Confirma el bug master_pipeline:
grep -n "run_priority\|def run_" etl/sources/data_lake_ingestors.py

# Confirma el import frágil de step_legislation:
grep -n "run_full_pipeline\|^def " dashboard/services/legislation_scraper.py

# Confirma que entities no se rellena en el flujo:
grep -rn "EntityRepository.upsert" etl/ agents/intelligence/ scheduler/

# Confirma las 3 tablas de noticia procesada:
grep -l "INSERT INTO media_items\|INSERT INTO news_articles\|INSERT INTO strategic_articles" \
  etl/ agents/ dashboard/services/ -r

# Confirma las dos rutas de modelos:
diff <(grep "^_ROUTES\|provider" agents/brain/model_router.py) \
     <(grep "^_TASK_CONFIG\|speed" agents/brain/llm_router.py)
```

— Fin de la auditoría.
