# Propuesta arquitectónica · pipeline de ingesta Politeia v2

> **Origen**: síntesis de `docs/INGESTA_AUDIT.md` (auditoría del estado actual)
> + `docs/INGESTA_REPOS_AMIGOS.md` (mapeo de 320 repos amigos).
> **Audiencia**: ingeniería de datos + producto.
> **Objetivo**: pasar del estado actual (3 pipelines paralelos, 3 ontologías
> superpuestas, bugs latentes en producción) a una arquitectura única,
> verificable y escalable, **reutilizando el 80% del código actual** y
> adoptando piezas clave de repos amigos.
>
> **Fecha**: mayo 2026.

---

## 0. Resumen en 5 frases

1. Politeia ya tiene **62 000 LOC de Python de ingesta**, **>200 conectores entre formales y ad-hoc**, **65 migraciones Alembic** y módulos NLP propios. No falta cantidad — falta **coherencia y consolidación**.
2. El estado real es **3 pipelines paralelos** (`etl/sources/` formal, `data_lake_ingestors.py` monolítico, `dashboard/services/news_ingestion.py`) escribiendo en **3 ontologías superpuestas** (`persona_publica`/`organizacion`, `entities_canonical`/`entity_mentions`, `entities`/`entity_links`) — y **ninguno de los tres pipelines escribe en la ontología `entities` nueva**.
3. El stack actual ya cubre el 70% del stack ideal — lo que falta son **5 piezas concretas** que sí están en los repos amigos: parser robusto de PDFs (Docling), NER+sentiment en español (pysentimiento), topic modeling moderno (BERTopic), extracción schema-guided a ontología (OneKE/OntoGPT), grafo temporal (Graphiti).
4. La propuesta es **una sola línea de proceso** (NormalizedItem → Enrichment → OntologyMapper → Persistence) con **un solo orquestador** (Celery Beat, ya configurado) y **una sola ontología viva** (`entities`/`entity_links`, la nueva).
5. **Coste estimado**: 3 sprints. **Impacto**: el sistema deja de escalar peor cuanto más se añade. Cada conector nuevo cuesta 10% de lo que cuesta hoy. La auditoría futura es trivial. Los dos bugs latentes del `master_pipeline` desaparecen.

---

## 1. Diagnóstico ejecutivo (de la auditoría)

### Lo que está roto (5 problemas estructurales)

| # | Problema | Evidencia |
|---|---------|-----------|
| 1 | **Tres pipelines paralelos sin master** | `etl/sources/` formal (3 conectores reales + 4 stubs) vs `data_lake_ingestors.py` (19 ingestores monolíticos en un fichero) vs `dashboard/services/*_ingestion.py` (2 152 LOC fuera de `etl/`) |
| 2 | **Tres orquestadores compitiendo** | Celery Beat + APScheduler en `master_pipeline.py` + threading en `brain_auto_ingestion.py`. Sin lock distribuido. |
| 3 | **Bug en producción silenciado** | `master_pipeline.py:79` llama a `orch.run_priority()` que no existe en `DataLakeOrchestrator`. Atrapado por except genérico. Mismo patrón sospechoso en `step_legislation`. |
| 4 | **Tres ontologías superpuestas, ninguna conectada al pipeline** | Tablas `persona_publica`/`organizacion` (0030, en uso), `entities_canonical`/`entity_mentions` (0034, abandonada), `entities`/`entity_links` (0063, vacía salvo backfill curado). |
| 5 | **Tres tablas distintas para "noticia procesada"** | `media_items` vs `news_articles` vs `strategic_articles`. Schemas distintos. Ningún script de unificación. |

### Lo que está bien (5 fortalezas a preservar)

| Pieza | Por qué importa |
|-------|----------------|
| `agents/brain/groq_client.py` | Rate-limit + cache TTL + retries + circuit-breaker. Calidad producción. Mantener intacto. |
| `agents/intelligence/strategic_news_pipeline.py` (StrategicRelevanceFilter) | 5 ejes ponderados, filtro pre-LLM muy bien hecho. Reutilizar como primer gate. |
| `etl/ingestion/dedup_engine.py` | Simhash + Hamming correcto. Aplicar antes de cualquier persistencia. |
| `etl/ingestion/normalization.py` | Alias partidos + URL cleaning + fechas ES. Joya escondida. |
| `agents/entities/` (Pilar 1 recién implementado) | Ontología object-centric YA EXISTE — solo falta conectarla al pipeline. |

### Las 3 deudas técnicas críticas (en este orden)

1. **Decidir qué ontología vive** → `entities`/`entity_links` (es la única object-centric). Deprecar las otras dos. Backfill desde `persona_publica`/`organizacion`.
2. **Consolidar el scheduling en Celery Beat** → matar APScheduler de `master_pipeline.py` y el threading de `brain_auto_ingestion.py`. Mover su lógica a tareas Celery.
3. **Forzar un único `NormalizedItem`** (Pydantic v2 con `extra=forbid`) como contrato entre conectores y el resto del pipeline. Tests de contrato.

---

## 2. Arquitectura objetivo · un solo pipeline

```
                                                 ┌─────────────────────┐
                                                 │  Celery Beat        │
                                                 │  (único scheduler)  │
                                                 └──────────┬──────────┘
                                                            │ dispara
                                                            ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│              │    │                  │    │                  │    │                  │
│  Connector   │───▶│  NormalizedItem  │───▶│  Enrichment      │───▶│  OntologyMapper  │
│  (1 contrato)│    │  Pydantic v2     │    │  (NLP + LLM)     │    │  (LinkML)        │
│              │    │  extra='forbid'  │    │                  │    │                  │
└──────────────┘    └──────────────────┘    └──────────────────┘    └────────┬─────────┘
       │                     │                                                │
       │                     │  Dedup (simhash) ⟵──────────────────────────  │
       │                                                                     │
       ▼                                                                     ▼
┌──────────────┐                                                ┌──────────────────────┐
│  raw_items   │ ←──── audit trail ────                         │  entities +          │
│  (cold log)  │                                                │  entity_links        │
└──────────────┘                                                │  (única ontología)   │
                                                                │  + valid_from/to     │
                                                                └──────────────────────┘
```

**Reglas no negociables:**

1. **Una sola interfaz de conector**: `DataSourceConnector` ABC con `fetch() -> Iterable[NormalizedItem]`. Las 3 actuales (`BaseExtractor`, `DataSourceConnector` v1, `Layer*Ingestor`) se unifican en esta.
2. **Un solo contrato de payload**: `NormalizedItem(BaseModel, extra='forbid')`. Cualquier campo no contemplado falla la validación. Conector que produce diccionarios sueltos → error de contrato → no llega a Enrichment.
3. **Un solo orquestador**: Celery Beat. `master_pipeline.py` y `brain_auto_ingestion.py` se reescriben como tareas Celery.
4. **Una sola tabla de raw**: `raw_items` (jsonb), append-only, retenida 30 días. Las 3 tablas actuales (`media_items`, `news_articles`, `strategic_articles`) se consolidan o se mantienen como views materializadas sobre `raw_items`+`entities`.
5. **Una sola ontología viva**: `entities`/`entity_links`. Las antiguas se marcan deprecated en SQL comments y se vacían progresivamente.

---

## 3. Stack final · qué viene de dónde

### Capa 1 · Conectores

| Fuente | Implementación | De dónde viene |
|--------|----------------|---------------|
| BOE legislación + sumarios + BORME | Reescribir conectores actuales (`etl/sources/spain/boe.py`, `dashboard/services/legislation_scraper.py`) usando los modelos Pydantic + tools de **`MCP-BOE-main`** (`src/mcp_boe/`) | Repo amigo `MCP-BOE-main` |
| Congreso votaciones + iniciativas | Reescribir `etl/sources/parliament/` usando lógica de descarga de **`Congreso-Scrapper-main 3`** (`requestutils.py`, `votesutils.py`) | Repo amigo |
| Boletines CCAA (DOGC, BOCM, BOJA, etc.) | Mantener `BoletinAutonomicoIngestor` actual (funciona) → migrar a interfaz `DataSourceConnector` | Politeia |
| Prensa española (10+ medios) | Reemplazar `MediaFeedIngestor` actual por **`fundus-master`** — parsers profesionales con RSS+Sitemaps+News-Maps para 7 medios ES ya escritos | Repo amigo `fundus-master` |
| RSS general 350 medios | Mantener `dashboard/services/media_sources.py` (datos) + `news_ingestion.py` (lógica) → mover a `etl/sources/media/rss_global.py` y conectar al nuevo pipeline | Politeia |
| GDELT + ACLED + UCDP | Mantener `etl/sources/geo*/` (consolidar geo/+geopolitics/ que están duplicados) | Politeia |
| INE + BdE + Eurostat | Mantener `etl/sources/economy/` (está bien) | Politeia |
| OpenSanctions + OpenCorporates | Mantener `etl/sources/osint/` + **adoptar `followthemoney-main`** como schema reutilizable | Repo amigo `followthemoney-main` |
| Encuestas CIS | Mantener `etl/sources/polls/cis.py` | Politeia |
| Datos abiertos (CKAN, datos.gob) | Mantener `etl/sources/opendata/` (16 conectores ya formales) | Politeia |

**Resultado**: ~25 fuentes reales, cada una bajo el contrato `DataSourceConnector`. El número de archivos se **reduce** porque consolidamos duplicados (geo/+geopolitics/, boe x3, congreso x2).

### Capa 2 · Parsing y normalización

| Necesidad | Pieza | De dónde viene |
|-----------|-------|---------------|
| Parser robusto de PDFs (BOE, Moncloa, Congreso) | **`docling-main`** (IBM Research, Pydantic v2, OCR + tablas + layout) | Repo amigo |
| Conversor universal a Markdown (HTML/DOCX/XLSX/audio) | **`markitdown-main`** (Microsoft AutoGen) | Repo amigo |
| Fallback PDFs simples | `pdfplumber` (ya en deps) | Existente |
| Dedup | Mantener `etl/ingestion/dedup_engine.py` (simhash). Aplicar en el step Connector → NormalizedItem. | Politeia |
| Normalización | Mantener `etl/ingestion/normalization.py` (alias partidos, fechas ES, URL cleaning) | Politeia |

### Capa 3 · NLP en español

| Tarea | Pieza | De dónde viene |
|-------|-------|---------------|
| NER + POS + sentiment + hate + emotion en español | **`pysentimiento-master`** (RoBERTuito finetuned, mantenido) | Repo amigo |
| Topic modeling moderno | **`BERTopic-master`** (c-TF-IDF + transformers + LLM-labeling) | Repo amigo |
| Clasificación de tópicos estándar IPTC | **`IPTC-Media-Topic-Classification-main`** (XLM-RoBERTa, F1 0.746, estándar internacional) | Repo amigo |
| Keywords baseline | **`yake-master`** (unsupervised, sin entrenamiento) | Repo amigo |
| Sesgo y fiabilidad de medios | Dataset `mbfc.csv` de **`Factual-Reporting-and-Political-Bias-Web-Interactions-main`** (3 920 fuentes etiquetadas) | Repo amigo (datos) |
| Clustering de narrativas | Mantener `etl/sources/media/narrative_clusterer.py` (está bien) | Politeia |

### Capa 4 · Extracción schema-guided a ontología

| Pieza | Función | De dónde viene |
|-------|---------|---------------|
| **OneKE-main** (idea + reflection loop + schema agent) | Multi-agent extraction guiada por schema. NO importar el código (vllm/torch pesados) — **reimplementar el patrón** con Groq + nuestros 27 tools | Repo amigo (patrón) |
| **OntoGPT** (LinkML schema validation) | Definir un schema LinkML que describa `entities`/`entity_links` y validar las salidas LLM contra él | Repo amigo (patrón) |
| `agents/entities/` (Pilar 1 ya hecho) | Repository + service para upsert + link | Politeia |

### Capa 5 · RAG / Recuperación

| Pieza | Función | De dónde viene |
|-------|---------|---------------|
| **`FlashRAG-main`** | Banco de eval para decidir qué RAG aplicar (23 algoritmos SOTA + benchmarks) | Repo amigo (eval) |
| **`graphrag-main` (Microsoft)** | RAG sobre KG cuando tengamos el grafo poblado | Repo amigo (futuro) |
| ChromaDB actual | Mantener — ya está en uso por el brain | Politeia |
| pg_trgm (memoria del brain) | Mantener — implementado en Pilar 3 | Politeia |

### Capa 6 · Orquestación

| Pieza | Decisión |
|-------|----------|
| **Celery Beat** | Único orquestador. Mantener `scheduler/celery_app.py` + `beat_schedule.py`. |
| APScheduler en `master_pipeline.py` | **Borrar**. Migrar sus 6 jobs a Celery Beat. |
| Threading en `brain_auto_ingestion.py` | **Borrar**. Migrar a tareas Celery con `bind=True, max_retries=...`. |
| Sentry + structured logs | Añadir (ya documentado en VISION_2027 §5.4 como pendiente) |
| Prefect | **NO ADOPTAR** ahora. Si Celery se queda corto en 12 meses, evaluar entonces. |

### Capa 7 · Análisis político específico (sin código nuevo)

| Pieza | Reutilización |
|-------|--------------|
| `agents/intelligence/strategic_news_pipeline.py` (StrategicRelevanceFilter) | **Mantener como primer filtro pre-LLM** en el step Enrichment. 5 ejes ponderados ya bien hechos. |
| 27 tools del brain (`agents/brain/*.py`) | Mantener intactos. Son la capa de razonamiento — son ortogonales al pipeline de ingesta. |
| Workflows agentic (`agents/workflows/`) | Mantener (Pilar 3 ya hecho) |

---

## 4. El schema LinkML · pegamento central

**Esto es lo que falta para cerrar el ciclo.** Define un schema LinkML en `packages/ontology/schemas/politeia_v1.yaml` que describa las clases `entities`/`entity_links` ya existentes:

```yaml
# packages/ontology/schemas/politeia_v1.yaml
id: https://politeia-analitica.es/schemas/v1
name: politeia-v1
description: Schema LinkML para la ontología object-centric de Politeia
default_prefix: pol

classes:
  Entity:
    description: Cualquier objeto canónico (persona, organización, partido, ley, evento, territorio, medio, documento)
    attributes:
      id:
        identifier: true
        range: uriorcurie
      kind:
        range: EntityKind
        required: true
      display_name:
        range: string
        required: true
      qid:
        range: string
        description: Wikidata ID
      slug:
        range: string
      payload:
        range: string
        description: jsonb con atributos del subtipo
      valid_from:
        range: datetime
      valid_to:
        range: datetime
      confidence:
        range: float
        minimum_value: 0.0
        maximum_value: 1.0

  EntityLink:
    description: Relación tipada entre dos entidades
    attributes:
      source_id:
        range: Entity
        required: true
      target_id:
        range: Entity
        required: true
      link_kind:
        range: LinkKind
        required: true
      confidence:
        range: float
      evidence_doc_id:
        range: string
      valid_from:
        range: datetime
      valid_to:
        range: datetime

enums:
  EntityKind:
    permissible_values:
      person:
      organization:
      party:
      law:
      event:
      territory:
      media:
      document:
      sector:
      regulator:

  LinkKind:
    permissible_values:
      author_of:
      voted_for:
      voted_against:
      president_of:
      member_of:
      criticized_by:
      ally_of:
      regulates:
      mentions:
      cites:
```

**Beneficios concretos:**

1. **OntoGPT puede ground LLM outputs contra este schema** sin que el modelo invente clases.
2. **OneKE-pattern**: el `SchemaAgent` recibe este YAML y guía la extracción.
3. **Tests de contrato**: cada conector se valida contra LinkML — si una migración rompe el contrato, el test salta.
4. **Documentación auto-generada** del modelo de datos para terceros (API portal).
5. **Multi-formato**: LinkML genera JSON Schema, OWL, SHACL — útiles para distintos consumidores.

---

## 5. Plan de migración · 3 sprints

### Sprint 1 (Semana 1-2) · **Consolidación sin romper**

| Día | Entregable |
|-----|-----------|
| 1-2 | Schema LinkML `politeia_v1.yaml` + test que valida que `entities`/`entity_links` cumplen el schema |
| 3-4 | `NormalizedItem(BaseModel, extra='forbid')` en `packages/types/` + tests de contrato para 5 conectores existentes |
| 5-6 | **Fix bug master_pipeline**: borrar `run_priority()` o implementarlo en `DataLakeOrchestrator`. Auditar `step_legislation` igual. Reemplazar `except Exception: pass` por logging + Sentry. |
| 7-8 | Consolidar `etl/sources/geo/` + `etl/sources/geopolitics/` (mismo dominio, hoy duplicados). Borrar duplicados de BOE (`etl/sources/legislative/` vs `etl/sources/spain/boe.py` vs `dashboard/services/legislation_scraper.py`). |
| 9-10 | Migrar 6 jobs de APScheduler (master_pipeline.py) a Celery Beat. Matar APScheduler. |

**Salida del sprint 1**: 1 orquestador (Celery), 1 contrato (NormalizedItem), 0 bugs latentes conocidos, schema LinkML versionado.

### Sprint 2 (Semana 3-4) · **Adopción de repos amigos**

| Día | Entregable |
|-----|-----------|
| 1-2 | Adoptar `docling-main` para parsing PDF: reemplazar `etl/sources/documents/pdf_parser.py` por wrapper de Docling. Mantener pdfplumber como fallback. |
| 3 | Adoptar `markitdown-main` para HTML/DOCX/XLSX (un solo conversor universal). |
| 4-5 | Adoptar `pysentimiento-master` como reemplazo del NER+sentiment actual. Migrar `agents/sentiment_pipeline.py` + `agents/ner_pipeline.py`. |
| 6-7 | Adoptar `BERTopic-master` para topic modeling. Migrar `etl/sources/media/narrative_clusterer.py` a usar BERTopic backend. |
| 8 | Adoptar `IPTC-Media-Topic-Classification-main`: añadir clasificador de tópico estándar en el step Enrichment. |
| 9 | Cargar dataset `mbfc.csv` (3 920 fuentes etiquetadas) → tabla `media_reliability` → usar en StrategicRelevanceFilter como input ponderado. |
| 10 | Adoptar `fundus-master` como reemplazo de scrapers ad-hoc de prensa española. |

**Salida del sprint 2**: parsers, NLP y topic modeling profesionales sustituyen las implementaciones ad-hoc. Calidad de NER/sentiment en español sube significativamente.

### Sprint 3 (Semana 5-6) · **Cerrar el ciclo ontológico**

| Día | Entregable |
|-----|-----------|
| 1-2 | OntologyMapper: módulo `agents/entities/mapper.py` que recibe `NormalizedItem` enriquecido y produce `EntityUpsertOp[]` + `EntityLinkOp[]` validados contra el schema LinkML. |
| 3-4 | Implementar el **patrón OneKE** en Politeia: `SchemaAgent` (LinkML) + `ExtractionAgent` (Groq tool calling con el schema como JSON Schema) + `ReflectionAgent` (re-prompt si no valida). |
| 5 | Conectar el mapper al pipeline real: cualquier ítem ingerido pasa por el mapper antes de persistir. Resultado: `entities` y `entity_links` se pueblan automáticamente. |
| 6 | Backfill: migrar `persona_publica`/`organizacion` actuales hacia `entities`. Mantener vistas SQL para que el código que aún lee de las viejas no se rompa. |
| 7 | Audit trail: cada operación de upsert se persiste en `analyst_events` (`actor_id`, `verb`, `target_kind`, `target_id`, `payload`, `ts`). |
| 8 | Consolidar `media_items`/`news_articles`/`strategic_articles` en una sola tabla `raw_items` + vista materializada por dominio. |
| 9 | Adoptar `followthemoney-main` schema para enriquecer actores políticos con datos OpenSanctions. |
| 10 | Documentación: `docs/INGESTA_PIPELINE_V2.md` con el flujo final + ejemplos de cada step + métricas. |

**Salida del sprint 3**: pipeline único cerrado. Toda fuente que entra acaba ground sobre la ontología `entities`. Auditoría completa. Las antiguas ontologías se vacían progresivamente.

---

## 6. Lo que NO se hace en esta fase

- **No** Prefect/Dagster: Celery ya está, sustituirlo es coste sin upside ahora.
- **No** Airbyte ni Mage: too much. Nuestro stack Python encaja mejor con tareas Celery + Pydantic.
- **No** triple store (Oxigraph/Jena): Postgres + `entities`/`entity_links` es suficiente para el volumen actual. Si el grafo crece más de 10M nodos en 12 meses, evaluar Graphiti / Neo4j.
- **No** Microsoft GraphRAG todavía: tiene sentido cuando el grafo esté poblado al final del sprint 3, no antes.
- **No** rebuild desde cero: el 80% del código actual es bueno — el problema es que está disperso en 3 silos.

---

## 7. Métricas de éxito

Al cierre del sprint 3:

| Métrica | Hoy | Objetivo |
|---------|-----|----------|
| Interfaces de conector distintas | 3 | **1** (`DataSourceConnector` ABC) |
| Orquestadores en producción | 3 | **1** (Celery Beat) |
| Tablas de "noticia procesada" | 3 (`media_items`, `news_articles`, `strategic_articles`) | **1** (`raw_items` + vistas) |
| Ontologías "vivas" | 3 | **1** (`entities`/`entity_links`) |
| Conectores que escriben en la ontología nueva | 0 | **100%** |
| Conectores con tests de contrato | 0 | **100% (>= 25 conectores)** |
| Bugs latentes en orquestadores | ≥ 2 conocidos | **0** |
| LOC en pipelines ad-hoc fuera de `etl/` | 2 152 | **0** (consolidado en `etl/`) |
| Cobertura NER en español (modelo finetuned) | Stub | **`pysentimiento` RoBERTuito** |
| Schema LinkML versionado | ❌ | ✅ |
| Audit trail completo (`analyst_events`) | Parcial | **100%** |

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Romper consumidores que leen `persona_publica`/`organizacion` | Mantener las tablas + crear VIEWs SQL que apunten a `entities` durante 1 mes (deprecation window). |
| `docling` añade ~150 MB de dependencias | Aislar en worker dedicado (Celery queue separada). El brain/API no carga docling. |
| `pysentimiento` baja inferencia ~50 ms/item por GPU/CPU load | Pre-batch en cola Celery, GPU opcional. Si no hay GPU, fallback a heurística actual. |
| OneKE pattern necesita más LLM calls (reflection loop) | Cache de schema validation por hash. Si el ítem es similar a uno ya extraído, skip. |
| Sprint 1 toca código en producción | Feature flags por conector. Si `feature_flag.use_v2_pipeline=false`, sigue el path viejo. |

---

## 9. Anexo · mapeo conector ↔ tabla nueva ontología

Ejemplo de cómo un ítem del BOE pasa al modelo `entities`/`entity_links`:

```python
# Input: una norma del BOE recién ingerida
raw_item = NormalizedItem(
    source="boe",
    item_id="BOE-A-2026-12345",
    title="Real Decreto 234/2026 ...",
    body="...",
    published_at=datetime(2026, 5, 19),
    url="https://www.boe.es/diario_boe/...",
    payload={"departamento": "Industria", "rango": "Real Decreto"},
)

# Tras Enrichment (Docling + pysentimiento + IPTC + OneKE pattern):
enriched = EnrichedItem(
    **raw_item.dict(),
    iptc_topics=["politics/government"],
    sentiment={"label": "neutral", "score": 0.92},
    entities_extracted=[
        ExtractedEntity(kind="law", display_name="Real Decreto 234/2026", qid=None),
        ExtractedEntity(kind="organization", display_name="Ministerio de Industria", qid="Q42302"),
    ],
    links_extracted=[
        ExtractedLink(source_idx=0, target_idx=1, kind="emitido_por", confidence=0.98),
    ],
)

# Tras OntologyMapper:
upserts = [
    EntityUpsertOp(
        kind="law",
        display_name="Real Decreto 234/2026",
        payload={"rango": "Real Decreto", "iptc": ["politics/government"]},
        valid_from=raw_item.published_at,
    ),
    EntityUpsertOp(
        kind="organization",
        qid="Q42302",
        display_name="Ministerio de Industria",
    ),
]
links = [
    EntityLinkOp(
        source_slug="ley/real-decreto-234-2026",
        target_qid="Q42302",
        link_kind="emitido_por",
        confidence=0.98,
        evidence_doc_id="BOE-A-2026-12345",
    ),
]
# Persistir → entities + entity_links (con audit trail)
# Persistir raw_item en raw_items (jsonb)
# Persistir vector embedding en pgvector (opcional, depende del dominio)
```

Una sola línea, una sola persistencia, ontología poblada automáticamente.

---

## 10. Próximas decisiones para el equipo

Antes de empezar Sprint 1, hay que cerrar 3 decisiones:

1. **¿Mantenemos pgvector o ChromaDB?** Hoy hay ambos. Recomendación: **pgvector** por uniformidad con la BD principal.
2. **¿Quién posee el schema LinkML?** Recomendación: `packages/ontology/schemas/` (paquete dedicado, versionado independiente).
3. **¿Cuántas Celery workers / queues?** Recomendación: 3 queues (`ingestion_heavy` para Docling/PDFs, `enrichment` para NLP/LLM, `mapping` para entity ops). Aislar para que un PDF pesado no bloquee la ingesta de RSS.

Una vez decidido esto, el sprint 1 arranca sin bloqueos.
