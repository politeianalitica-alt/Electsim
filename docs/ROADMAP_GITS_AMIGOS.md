# Roadmap Politeia · adopción crítica de repos amigos

> **Origen**: análisis del mapeo exhaustivo del usuario (~340 repos clasificados
> por módulo, sector y capa de infraestructura) cruzado con la auditoría real
> del código actual (`docs/INGESTA_AUDIT.md`, ~62 000 LOC en `etl/` + `agents/`,
> 65 migraciones Alembic, Pilar 1-5 ya implementados parcialmente).
>
> **Premisa**: ANTES de adoptar cualquier repo, evaluar honestamente si
> mejora el estado actual o duplica capacidad existente. El usuario lo pidió
> textual: *"antes de aplicar nada quiero que estudies si mejora aplicando
> los cambios"*.
>
> **Audiencia**: ingeniería + producto + dirección. Decisiones Go/No-Go por
> adopción con justificación medible.
>
> **Fecha**: mayo 2026.

---

## 0. TL;DR para impacientes

1. El usuario propuso **~140 adopciones distintas** repartidas en 10 pestañas + 10 sectores + 6 capas de infraestructura.
2. De esas 140, **detectamos 47 repos que aparecen en múltiples categorías** (mismo repo justificado por motivos distintos). Consolidados → **~85 candidatos únicos reales**.
3. De esos 85, tras evaluación crítica vs nuestro código actual:
   - **24 "MUST"** · ROI alto + bajo coste + no duplican capacidad existente
   - **31 "NICE"** · valor real pero esperan a que la pieza dependiente esté
   - **30 "SKIP"** · duplican lo que ya tenemos / over-engineering / deps muertas
4. Distribuimos los 24 MUST + las primeras 10 NICE en **6 sprints de 2 semanas**, con dependencias resueltas (no se puede adoptar `graphrag` antes de poblar el grafo `entities`).
5. **Sprint 1** es lo que arranca ya: 4 adopciones que multiplican capacidad sin tocar arquitectura ni romper nada.

---

## 1. Estado actual honesto · qué YA tenemos (no duplicar)

Antes de adoptar nada, hay que reconocer qué ya está construido. La auditoría
documentó:

| Capa | Lo que ya hay | Calidad |
|------|--------------|---------|
| **Orquestación** | Celery Beat con `scheduler/celery_app.py` + APScheduler en `master_pipeline.py` + threading en `brain_auto_ingestion.py` | 3 orquestadores compitiendo. Hay que **consolidar a 1**, no añadir un 4º (Dagster/Prefect/Airflow/Temporal) |
| **LLM Router** | `agents/brain/groq_client.py` con rate-limit + cache TTL + retry + circuit breaker | Calidad producción. `litellm` aportaría poco — solo añade más providers |
| **Filtrado pre-LLM** | `StrategicRelevanceFilter` (5 ejes ponderados) en `agents/intelligence/strategic_news_pipeline.py` | Bien hecho. No reemplazar. |
| **Dedup** | `etl/ingestion/dedup_engine.py` con simhash + Hamming | Funciona. No tocar. |
| **Normalización ES** | `etl/ingestion/normalization.py` (alias partidos, fechas ES, URL cleaning) | Joya escondida. Reutilizar. |
| **Vector DB** | ChromaDB ya en uso por el brain + pg_trgm en analyst_memory | Suficiente para volumen actual. Qdrant solo si crecemos 10x. |
| **Ontología** | `entities` + `entity_links` + 13 EntityKind + 27 LinkKind ya implementado (Pilar 1) | Falta backfill desde `persona_publica`/`organizacion` y conectar los conectores. |
| **OntologyMapper** | `agents/entities/mapper.py` ya escrito (P-INGESTA Sprint 3) | Listo, falta enchufarlo al pipeline real. |
| **NormalizedItem** | `packages/types/normalized_item.py` con Pydantic v2 `extra=forbid` (P-INGESTA Sprint 1) | Listo. Falta migrar conectores existentes. |
| **Schema LinkML** | `packages/ontology/schemas/politeia_v1.yaml` | Listo (P-INGESTA Sprint 1) |
| **PDF parser** | `etl/sources/documents/docling_parser.py` ya existe — Docling YA adoptado parcialmente | Falta extenderlo a más fuentes |
| **53 conectores** | en `etl/sources/` (BOE, BORME, INE, BdE, Eurostat, AEMPS, REE, ACLED, GDELT, …) | Algunos son stubs, otros sólidos. Falta inventariar cuáles producen `NormalizedItem` válido. |
| **18 conectores opendata** | `etl/sources/opendata/` (CKAN, datos.gob, INE, EUR-Lex SPARQL, autonomous, municipales) | Casi todo el "stack open data" que el usuario propone ya está implementado |
| **Pilar 4** | 13/18 archivos UI migrados a tokens + 12 archivos CSS · ~1 545 clases | Falta R3 (5 archivos restantes) bloqueado por límite agentes |
| **Pilar 5** | useUrlState + loading.tsx en 6 rutas top + prefetch audit | Parcial. Falta Server Components agresivo + Optimistic UI. |

**Conclusión brutal**: tenemos ~70% del stack que el usuario propone. Lo que
falta son **piezas concretas de mayor calidad** y **conectar lo existente**.

---

## 2. Categorías repetidas detectadas en la propuesta

El usuario menciona los mismos repos en múltiples secciones. Esto NO es error
suyo — refleja que un mismo repo aporta a varias capas. Pero implementar el
mismo repo 5 veces sería pérdida. Consolidamos:

### 2.1 Repos que aparecen en 4+ secciones

| Repo | Secciones donde aparece | Función real | Adopción única |
|------|-------------------------|--------------|----------------|
| `opensanctions-main` | Política · Riesgo · Defensa · Banca · Inmobiliario · Tercer Sector · OSINT | Screening de sanciones + 250 listas + PEP | **1 servicio Docker compartido** consultable por todas las pestañas |
| `followthemoney-main` | Política · Riesgo · Banca · Inmobiliario · Tercer Sector · OSINT | Ontología de entidades financieras/judiciales | **1 paquete Python instalado** + adapter a nuestro schema LinkML |
| `dagster-master` (×6 secciones) / `prefect-main` (×3) / `temporal-main` (×3) / `airflow-main` (×2) | Orquestación | Orquestador de pipelines | **Mantenemos Celery Beat** (ya está). Consolidamos APScheduler+threading dentro. Ninguno de estos 4. |
| `qdrant-master` / `chroma-main` | RAG · Knowledge graph · Búsqueda · Brain · Vector DB | Vector store | **Mantenemos ChromaDB + pg_trgm**. Migrar a Qdrant solo cuando >10M docs |
| `BERTopic-main` | Brain · Medios · Tercer Sector · Análisis NLP | Topic modeling | **1 servicio Python** + tabla `topics` referenciada por todos |
| `docling-main` | Parsing · Legislativo · Tercer Sector · Compliance | PDF → Markdown | **1 wrapper en `etl/sources/documents/docling_parser.py`** (YA EXISTE) |
| `pysentimiento-master` | Medios · Política · Reputación · Tercer Sector | NER+sentiment ES | **1 pipeline en `agents/sentiment_pipeline.py`** + `agents/ner_pipeline.py` |
| `cytoscape.js-unstable` / `sigma.js-main` | Workspace · Mapa Actores · Investigaciones | Graph visualizer | **1 componente React** con switch automático <1K nodos (cytoscape) / >1K (sigma) |
| `tiptap-main` + `hocuspocus-main` + `yjs-main` | Draft Studio · Workspace · Notebook · Investigaciones · Tercer Sector | Editor colaborativo | **1 stack tiptap+yjs+hocuspocus** en `apps/visual-oscar/components/editor/` |
| `crewAI-main` + `pydantic-ai-main` + `litellm` | Brain · Workspace · Sectores | Multi-agent framework | **Decisión arquitectónica única**: ya tenemos `agents/workflows/` con runner declarativo. Evaluar si crewAI aporta vs nuestro runner. `pydantic-ai` SÍ aporta tipado fuerte — adoptar. |
| `MCP-BOE-main` + `European-Parliament-MCP-Server-main` | Legislativo · Política · Compliance · Sectores | MCP servers | **2 tools MCP únicos** registrados en `agents/brain/tools/` |

### 2.2 Repos de "infraestructura ELT" duplicados entre sí

El usuario propone **simultáneamente**: Airbyte + dlt + Mage.ai + Meltano +
Airflow + Dagster + Prefect + Temporal. Son alternativas competidoras, no
piezas complementarias. **Veredicto**: nos quedamos con Celery (ya hay) +
`dlt` (ligero, pip install, compatible con Celery). El resto se descartan.

### 2.3 Repos OSINT con solapamiento masivo

| Repo | Aporte único | Decisión |
|------|--------------|----------|
| `maigret-main` | Búsqueda en 2.500 plataformas por username | MUST · invocable on-demand |
| `spiderfoot-master` | 200 módulos OSINT (WHOIS, brechas, threat intel) | NICE · solo si añadimos pestaña Investigación profunda |
| `recon-ng-master` | Framework modular tipo Metasploit | SKIP · spiderfoot lo cubre |
| `theHarvester-master` | Email/dominio harvesting | NICE · módulo dentro de spiderfoot |
| `holehe-master` | Email check en servicios | SKIP · subset de maigret |
| `Osintgraph-master` | OSINT grafo Neo4j | SKIP · ya tenemos grafo entities con Postgres |
| `deepkrak3nosint-main` | Orquestador OSINT | SKIP · orquestación la hacemos en Politeia |
| `WhatsMyName-main` | Catálogo de detección | SKIP · maigret ya usa esto internamente |

**Conclusión**: de 8 repos OSINT propuestos, **solo maigret entra como MUST**
y spiderfoot como NICE en sprint avanzado.

### 2.4 Repos NLP español duplicados

| Repo | Aporte | Decisión |
|------|--------|----------|
| `pysentimiento-master` | NER + sentiment + hate + emotion + irony | **MUST · es el wrapper** |
| `robertuito-main` | Modelo RoBERTuito (backbone de pysentimiento) | SKIP · ya viene en pysentimiento |
| `beto-master` | Modelo BETO | SKIP · ya viene en transformers |
| `es_spacy_model-master` | spaCy es_core_news_lg | NICE · alternativa rápida para NER masivo |
| `sentiment-elecciones-master` | Dataset etiquetado ES | NICE · usar como eval set, no adoptar |
| `groupmentiondetection-main` | Detección menciones grupos | SKIP · funcionalidad muy nicho |

---

## 3. Evaluación crítica · adoptar SÍ vs NO

### 3.1 Lista MUST (24 adopciones de alto ROI)

Cada una con: qué problema resuelve, esfuerzo (S/M/L), dependencias.

| # | Repo | Resuelve | Esfuerzo | Depende de | Sprint |
|---|------|----------|----------|------------|--------|
| 1 | `docling-main` (ya parcial) | Parser PDFs robusto · BOE+Moncloa+Congreso | S | — | 1 |
| 2 | `markitdown-main` | HTML/DOCX/XLSX → Markdown universal | S | — | 1 |
| 3 | `pysentimiento-master` | NER+sentiment+hate ES con modelos finetuned | M | — | 1 |
| 4 | `BERTopic-main` | Topic modeling moderno · narrativas | M | embeddings working | 1 |
| 5 | `MCP-BOE-main` | Cliente BOE robusto · Pydantic completo | M | — | 2 |
| 6 | `IPTC-Media-Topic-Classification-main` | Clasificación tópicos estándar IPTC | S | — | 2 |
| 7 | `Factual-Reporting-and-Political-Bias` (CSV mbfc) | 3 920 medios etiquetados sesgo+fiabilidad | S | — | 2 |
| 8 | `fundus-master` | Crawler prensa española profesional · 7 medios ES | M | — | 2 |
| 9 | `yake-master` | Keyword extraction sin entrenar | S | — | 2 |
| 10 | `Congreso-Scrapper-main 3` | Lógica de descarga votaciones Congreso | M | — | 3 |
| 11 | `senadoRES-master` | API Senado (cliente R, reimplementar en Python) | M | — | 3 |
| 12 | `infoelectoral-master` | Microdatos electorales Ministerio Interior | M | — | 3 |
| 13 | `BDNS infosubvenciones.es` (NO repo · API REST oficial) | TODA subvención pública española en una API | M | — | 3 |
| 14 | `TED Search API` (NO repo · API REST oficial UE) | Toda licitación pública europea | M | — | 3 |
| 15 | `manifestoR-master` (dato, no código R) | Posiciones programáticas partidos · Manifesto Project | S | — | 4 |
| 16 | `legalize-es-main` (datos) | Corpus legal ES en Markdown/Git | M | — | 4 |
| 17 | `opensanctions-main` (servicio Docker) | Screening sanciones + PEP | L | service infra | 4 |
| 18 | `followthemoney-main` (paquete Python) | Ontología KYC/AML reutilizable | M | adapter LinkML | 4 |
| 19 | `pydantic-ai-main` | Agentes tipados con Pydantic | M | — | 5 |
| 20 | `graphiti-main` | Grafo temporal con valid_from/valid_to | L | entities pobladas | 5 |
| 21 | `xyflow-main` (React Flow) | Canvas de investigación libre | M | tiptap | 5 |
| 22 | `cytoscape.js-unstable` | Grafo interactivo en frontend | M | entity_links data | 5 |
| 23 | `cmdk-main` | Command palette Cmd+K universal | S | — | 6 |
| 24 | `ag-grid-latest` | Data grid producción · tablas operativas | M | — | 6 |

### 3.2 Lista NICE (10 adopciones que esperan)

| # | Repo | Cuándo adoptar |
|---|------|----------------|
| 25 | `maigret-main` | Cuando exista pestaña Investigación |
| 26 | `graphrag-main` | Cuando `entities` tenga ≥10 000 nodos |
| 27 | `FlashRAG-main` | Cuando necesitemos benchmark formal de RAG |
| 28 | `dlt-devel` | Cuando consolidemos los 3 pipelines de ingesta |
| 29 | `qhld.es-main` | Si añadimos backend de fichas de diputados estilo QHLD |
| 30 | `coalitions-master` (R) | Si reimplementamos modelo bayesiano en Python (PyMC) |
| 31 | `pymc` | Sprint dedicado a nowcasting bayesiano |
| 32 | `tiptap-main` + `hocuspocus-main` + `yjs-main` | Sprint Draft Studio colaborativo |
| 33 | `pdfplumber-stable` | Fallback ya cubierto · adoptar si docling tiene gaps |
| 34 | `chainlit-main` | Si rediseñamos el Brain como producto chat separado |

### 3.3 Lista SKIP (30 propuestas descartadas)

| Repo | Por qué descartar |
|------|-------------------|
| `dagster-master` / `prefect-main` / `airflow-main` / `temporal-main` | Ya hay Celery. Adoptar otro = 4º orquestador. Solo consolidar APScheduler+threading dentro de Celery. |
| `kafka-master` / `redpanda-dev` | Sobreingeniería para nuestro volumen (~5K items/día). Cuando lleguemos a 100K/día reevaluar. |
| `airbyte-master` × 2 copias | Plataforma para enterprise. Pip + Celery + conectores Python son suficientes. |
| `meltano_example_implementations` | Solo ejemplos, sin valor añadido |
| `unstructured-main` | Docling + markitdown cubren · unstructured añade 173 MB de deps |
| `panda-etl-main` | App monolítica · solo robar idea, no código |
| `gpt-rag-ingestion-main` | Azure vendor lock-in |
| `ragflow-main` | Plataforma enterprise · sobreingeniería |
| `OpenBB-develop` | 1.208 archivos para datos de mercado · Yahoo Finance + scrapers propios suficientes |
| `litellm` | Ya tenemos `groq_client` + fallback OpenAI. Migrar = perder rate-limit/CB propios. |
| `crewAI-main` | Ya tenemos `agents/workflows/runner.py` con recipes declarativos |
| `mem0-main` | Ya tenemos `analyst_memory` con pg_trgm (Pilar 3) |
| `cognee-main` | Solapamiento con graphiti + entities. Elegir 1. |
| `graphiti-main` SÍ + `cognee-main` NO | Graphiti tiene API más limpia y MCP server. |
| `Osintgraph-master` / `recon-ng-master` / `holehe-master` / `WhatsMyName-main` | Subsumidos por spiderfoot (si lo adoptamos) |
| `Spanish-Newspapers-Scraper-master` | Selectores CSS de 2020 muertos. Usar fundus. |
| `news-crawlers-main` | Solo README comparativo |
| `newspaper-scraping-master` | 40 líneas Procfile Heroku · feedparser está mejor en fundus |
| `China-Media-main` | Dataset cerrado · útil como referencia académica, no adoptable |
| `theyworkforyou-master` | PHP · referencia arquitectónica, no código |
| `riksdagsmonitor-main` | Plataforma sueca · referencia, no código |
| `bislai-master` | Solo Ayuntamiento Zaragoza · alcance muy local |
| `KeywordExplorer-main` | Apps tkinter desktop, no librería |
| `parltrack-master` | Patrón notificaciones interesante · solo robar, no adoptar |
| `openstates-scrapers-main` | US-centric, framework Pupa no encaja |
| `eurlex-master` (cliente R) | Cliente R · Python ya tiene eurlex via `MCP-BOE` adaptado |
| `BOE-master` (cliente R) | Cliente R · MCP-BOE en Python sirve |
| `tidyBdE-main` (cliente R) | Cliente R · scraping HTTP simple en Python |
| `ineapir-main` (cliente R) | Cliente R · INE tiene JSON API que ya consumimos |
| `eurostat-master` (cliente R) | Cliente R · existe `eurostat` Python pip package |
| `manifestoR-master` (R wrapper) | Es wrapper R · descargar dataset CSV del Manifesto Project directamente |

---

## 4. Roadmap · 6 sprints de 2 semanas

### Sprint 1 (semanas 1-2) · **NLP español + Parsing universal**

**Objetivo**: subir calidad de análisis lingüístico × 5 con 4 adopciones que
no tocan arquitectura ni rompen nada.

| Día | Entregable |
|-----|-----------|
| 1-2 | Adoptar `pysentimiento` · `pip install pysentimiento` + envolver en `agents/sentiment_pipeline.py` y `agents/ner_pipeline.py` (ya existen, falta el motor) |
| 3-4 | Adoptar `BERTopic` · servicio en `agents/topics/bertopic_service.py` + tabla `topics` |
| 5-6 | Adoptar `markitdown` · complementa `docling` para HTML/DOCX/XLSX/audio |
| 7-8 | Refactor `etl/sources/documents/docling_parser.py` · extender a BOE/Moncloa/Congreso PDFs |
| 9-10 | Tests + integrar en `EnrichedItem.sentiment` + `EnrichedItem.iptc_topics` + `EnrichedItem.topic_label` |

**Acceptance**: 1 conector existente (RSS de medios) produce `EnrichedItem`
con NER de actores + sentiment ES + topic ID. Test verifica calidad superior
a heurística actual.

### Sprint 2 (semanas 3-4) · **Cobertura BOE + IPTC + Fiabilidad medios**

**Objetivo**: cubrir el 100% del flujo legislativo y clasificar todos los
items con estándares profesionales.

| Día | Entregable |
|-----|-----------|
| 1-3 | Adoptar `MCP-BOE-main` · servicio MCP registrado en `agents/brain/tools/` con todas las funciones (legislacion-consolidada, sumario, BORME, tablas) |
| 4-5 | Adoptar `IPTC-Media-Topic-Classification` · classifier multilingüe · etiqueta cada `EnrichedItem.iptc_topics` |
| 6-7 | Importar dataset `mbfc.csv` (3 920 medios) → tabla `media_reliability` + cruce con `EnrichedItem.source` para añadir `media_bias`/`media_factuality` |
| 8 | Adoptar `yake` para `EnrichedItem.keywords` (3 líneas, sin entrenar) |
| 9-10 | Adoptar `fundus-master` · 7 medios españoles (El País, El Mundo, ABC, La Vanguardia, El Diario, Público) reemplazando scrapers ad-hoc |

**Acceptance**: `/medios-narrativa` muestra para cada artículo: topic IPTC,
sentiment ES finetuned, sesgo del medio (left/right/neutral) y fiabilidad
(high/mixed/low).

### Sprint 3 (semanas 5-6) · **Cobertura legislativa y de subvenciones nacional**

**Objetivo**: ingestar TODAS las fuentes oficiales de licitaciones, subvenciones
y actividad parlamentaria de España.

| Día | Entregable |
|-----|-----------|
| 1-2 | Conector `BDNS infosubvenciones.es` (API REST) · todas las convocatorias y resoluciones de subvención de España desde 2013 → tabla `subvenciones` |
| 3-4 | Conector `TED Search API` (UE) · licitaciones europeas con CPV codes para sectores cubiertos |
| 5-6 | Reimplementar lógica de `Congreso-Scrapper-main 3` en Python en `etl/sources/parliament/` (votaciones + iniciativas + sesiones) |
| 7-8 | Reimplementar `senadoRES-master` en Python para completar el ciclo bicameral |
| 9-10 | Conector `infoelectoral-master` (microdatos electorales) · resultados por sección censal de todas las elecciones desde 1977 → tabla `electoral_results` |

**Acceptance**: `/monitor-legislativo` muestra timeline bicameral completo de
una norma desde Congreso → Senado → BOE. `/adjudicaciones` y `/fondos-europeos`
ingestan en tiempo real. `/electoral` permite analizar resultados por sección.

### Sprint 4 (semanas 7-8) · **Compliance + OSINT + Datos políticos**

**Objetivo**: módulos de compliance/sanciones/PEP listos para clientes IBEX.

| Día | Entregable |
|-----|-----------|
| 1-3 | `opensanctions-main` desplegado como servicio Docker interno · API REST consumida por todas las pestañas + screening automático en `entities` |
| 4-5 | `followthemoney-main` instalado como paquete Python · adapter a nuestro schema LinkML · enriquecimiento de actores con datos OpenSanctions |
| 6-7 | Descargar dataset Manifesto Project (CSV) · cargar posiciones programáticas de partidos ES → tabla `party_positions` |
| 8 | Importar corpus `legalize-es-main` (Markdown legal ES) → indexar en ChromaDB para búsqueda semántica |
| 9-10 | Endpoint `/api/v1/compliance/screen` que recibe nombre + país y devuelve: sanciones, PEP, vínculos empresariales, contratos públicos en <30s |

**Acceptance**: cualquier ficha de actor en `/figuras` muestra automáticamente
badge de screening OpenSanctions. Endpoint de compliance funciona.

### Sprint 5 (semanas 9-10) · **Grafo temporal + Frontend de investigación**

**Objetivo**: workspace investigation-centric (Pilar 2) llega a producto real.

| Día | Entregable |
|-----|-----------|
| 1-3 | `graphiti-main` desplegado · sustituye/complementa `entity_links.valid_from/valid_to` con grafo temporal queryeable por fecha |
| 4-5 | `cytoscape.js` integrado en `/investigations/[id]` · render del grafo de actores/links/evidencias |
| 6-7 | `xyflow-main` como canvas libre en `/investigations/[id]/canvas` (modo investigación) |
| 8 | `pydantic-ai-main` adoptado · agentes del workflow runner ahora tipados estrictamente |
| 9-10 | Endpoint `/api/v1/entities/timeline?at=2024-01-01` devuelve estado del grafo en cualquier fecha pasada |

**Acceptance**: analista crea investigación · pinea entidades · arrastra al
canvas · genera grafo temporal · pregunta al Brain "¿cómo era esta red hace
6 meses?" y obtiene respuesta visual.

### Sprint 6 (semanas 11-12) · **UX premium + sectoriales piloto**

**Objetivo**: pulir UX + arrancar el primer sector vertical end-to-end.

| Día | Entregable |
|-----|-----------|
| 1-2 | `cmdk-main` · command palette global `Cmd+K` con búsqueda de actores/normas/investigaciones/comandos |
| 3-4 | `ag-grid-latest` reemplaza tablas custom en `/adjudicaciones`, `/contratos-vigentes`, `/litigios-contratacion`, `/fondos-europeos` |
| 5-7 | Sector piloto **Energía** completo (sub-pestañas: regulatorio CNMC+MITECO, mercado pool+ETS+gas, contratos REE/Enagás, mapa actores energéticos) reutilizando piezas de sprints anteriores |
| 8 | Endpoint `/api/v1/sectors/energia/briefing` genera briefing diario automático con LLM |
| 9-10 | Frontend `/sector-energia` consume todo lo anterior + tests + deploy |

**Acceptance**: cliente del sector energético tiene dashboard funcional con
datos reales actualizados diariamente + briefing automático.

---

## 5. Lo que NO se hace (decisión consciente)

Para evitar "yes-yes-yes" sin priorización, esta es la **lista de NO** explícita:

- **NO** Kafka/Redpanda · sobreingeniería para 5K items/día
- **NO** Dagster/Prefect/Airflow/Temporal · Celery ya está
- **NO** Airbyte · plataforma enterprise innecesaria
- **NO** Qdrant ahora · ChromaDB+pg_trgm suficiente · reevaluar a 10x volumen
- **NO** litellm · groq_client propio tiene calidad superior (rate-limit+CB)
- **NO** crewAI · runner declarativo propio es más simple
- **NO** mem0 · analyst_memory propia con pg_trgm cubre el caso
- **NO** unstructured · docling+markitdown suficiente y 5x más ligero
- **NO** ragflow · plataforma · solo robar patrón si necesitamos
- **NO** spiderfoot/recon-ng en sprint 1-4 · solo si pestaña Investigación se prioriza
- **NO** OpenBB en pestaña Macro · scraping Yahoo Finance + BdE directo es suficiente
- **NO** clientes R (BOE-master, eurlex-master, ineapir-main, tidyBdE-main, eurostat-master) · todo se hace en Python
- **NO** reescribir desde cero ninguna pieza que ya funciona (groq_client, dedup_engine, StrategicRelevanceFilter, normalization)

---

## 6. Sectoriales · decisión arquitectónica

El usuario detalló 10 sectores (Energía, Farma, Defensa, Vivienda, Banca,
Agroalimentario, Telecom, Infraestructuras, Turismo, Tercer Sector).
Implementarlos todos en paralelo = explosión combinatoria.

**Decisión**: **un sector cada Sprint 6+ como piloto**, en este orden de
prioridad por ROI cliente:

1. **Sprint 6**: Energía (regulación intensa + IBEX + datos disponibles)
2. **Sprint 7**: Banca & Seguros (compliance crítico para grandes clientes)
3. **Sprint 8**: Farma & Salud (perfil profesional comprometido con dato)
4. **Sprint 9**: Tercer Sector & Financiación Pública (BDNS + UE + bancos desarrollo)
5. **Sprint 10**: Infraestructuras & Movilidad (PRTR + grandes constructoras)
6. **Sprint 11**: Defensa & Industria (DGAM + PERTEs)
7. **Sprint 12**: Telecom & Digital (AI Act + DMA + NIS2)
8. **Sprint 13**: Inmobiliario (ZMT + LAU + datos catastro)
9. **Sprint 14**: Agroalimentario (PAC + MAPA + RASFF)
10. **Sprint 15**: Turismo (autonómico + FRONTUR + reputación online)

Cada sector reutiliza el 80% de las piezas de Sprints 1-5 + 20% específico
del dominio (fuentes específicas, prompts especializados, tabla de KPIs).

---

## 7. Decisiones que necesito de ti antes de Sprint 1

1. **¿Sprint 1 ahora?** Confirmar que arranco con pysentimiento + BERTopic + markitdown + extensión de docling. Coste: ~10 días de trabajo. Riesgo: bajo (no toca arquitectura).
2. **¿Servicio OpenSanctions self-hosted o usar su API pública?** Self-hosted = Docker + setup ~1 día + zero coste por request. Cloud = más rápido arrancar, coste creciente.
3. **¿Confirmar NO migrar a Qdrant?** Mi recomendación: NO hasta 10x volumen. ChromaDB + pg_trgm funciona.
4. **¿OK con orden de sectoriales? (Energía → Banca → Farma → Tercer Sector → Infraestructuras → …)** Si tienes cliente concreto pidiendo otro sector primero, ajustamos.
5. **¿Mantenemos branch `claude/sharp-keller-3d6d48` o mergeamos a main antes de Sprint 1?** Recomiendo PR a main → deploy producción del estado actual → arrancar Sprint 1 sobre main.

---

## 8. Métricas de éxito globales (después de los 6 sprints base)

| Métrica | Hoy | Tras Sprint 6 | Objetivo año |
|---------|----:|--------------:|-------------:|
| Conectores con `NormalizedItem` válido | 0 | 25 | 50+ |
| Items procesados/día | ~5K | ~30K | ~200K |
| Cobertura NER actores españoles | heurística | pysentimiento finetuned | + custom finetuning |
| Sources con sesgo/fiabilidad clasificado | 0 | 3 920 | 10 000+ |
| Subvenciones públicas trackeadas | 0 | TODAS (BDNS) | + portales europeos |
| Licitaciones UE en tiempo real | 0 | TED completo | + análisis predictivo |
| Sectores con dashboard piloto | 0 | 1 (Energía) | 5+ |
| Tiempo medio compliance check | manual | <30 segundos | <10 segundos |
| Bugs latentes orquestador | 0 (post P-INGESTA) | 0 | 0 |

---

## 9. Próximo paso recomendado

Espero tu OK a:

A) **Sprint 1 arranca con pysentimiento + BERTopic + markitdown + extensión Docling** (10 días, riesgo bajo)
B) **Resto de decisiones (3-5 de la sección 7) las cierro contigo en mensaje breve**

Cuando me digas adelante, ejecuto Sprint 1 en chunks committeables (1 commit por adopción · tests verdes · build OK).
