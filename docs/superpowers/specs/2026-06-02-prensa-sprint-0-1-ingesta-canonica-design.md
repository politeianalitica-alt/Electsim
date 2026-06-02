# Sprint 0+1 Prensa · Capa de Ingesta Canónica · Design Doc

| | |
|---|---|
| **Fecha** | 2026-06-02 |
| **Estado** | APPROVED (brainstorming → writing-plans next) |
| **Sprints siguientes** | 2 (Clasificación) → 3 (Actores) → 4 (Narrativas + Lectura IA) |
| **Inversión estimada** | ~42h · 10 commits atómicos a `main` |
| **Spec source** | `/Users/antoniolegaz/Downloads/sprints 0-1 prensa.md` (614 líneas) |
| **Spec dependientes** | Sprint 2+3+4 (pegado en chat 2026-06-02) |
| **Trabajo previo en main** | G15-FIX merged (commits 2242b7da/dedf6ac0/745bd90d) |

---

## 1 · Contexto y problema

El módulo Prensa de Politeia (`/prensa` con 7 tabs + 20 componentes) **funciona** y muestra datos, pero su capa de ingesta es un conector directo frontend ↔ APIs externas (RSS/NewsAPI fetched at request-time desde Next.js routes). Esto rompe la regla arquitectónica del spec §2.1:

> "La capa de ingesta no debe ser un conector directo entre el frontend y APIs externas. Debe ser una capa de procesamiento propia que consume fuentes externas, normaliza, enriquece, **almacena** y sirve datos ya tratados."

**Auditoría del estado actual revela** (ver §2 más abajo): el backend Python tiene una infraestructura sustancial ya operativa pero infraconsumida — pipeline NLP real (`narrative_engine.py` con sentence-transformers + UMAP + HDBSCAN + LLM frame extraction), scheduler APScheduler activo (cada 30min + 2h), tablas Postgres con seeds (19 medios + 220 medios JSON), módulo `media_intelligence/` con 11 archivos Python. El frontend NO consume nada de esto: lee `news-aggregator.ts` (1038 LOC) que hace fetch-on-demand contra RSS sin storage intermedio.

**La carencia real no es construir capacidades nuevas; es disciplinar arquitectónicamente las existentes** y exponerlas en endpoints contractuales que sirvan de fundamento estable para Sprint 2 (Clasificación temática), Sprint 3 (Actores) y Sprint 4 (Narrativas + Lectura Politeia IA).

---

## 2 · Estado actual auditado

### 2.1 Backend Python operativo (no exploratorio)

| Módulo | Capacidad |
|---|---|
| `media_intelligence/acquisition.py` | RSS paralelo 10 workers · timeout 10s · dedup + source_health |
| `media_intelligence/narrative_pipeline.py` | Clustering con graceful degradation + caché en memoria |
| `media_intelligence/source_health.py` | Tracking salud por fuente (latency, freshness, error rate) |
| `media_intelligence/article_quality.py`, `article_ranker.py`, `editorial_selector.py` | Scoring + curación |
| `media_intelligence/language_detection.py`, `translation_service.py`, `rss_validator.py` | Auxiliares |
| `analytics/narrative_engine.py` | Pipeline NLP real: `paraphrase-multilingual-mpnet-base-v2` (768d) → UMAP 5d → HDBSCAN → fallback KMeans → LLM frame extraction (Ollama `llama3.1:8b` / litellm). Ventana 2 días, min 5 arts/cluster, 3 fuentes únicas |
| `news_scheduler.py` (APScheduler ACTIVO) | Cada 30min ingesta 150 fuentes prioritarias · cada 2h ingesta 350 fuentes con stats fetched/inserted/skipped/errors |

### 2.2 Tablas Postgres existentes con seeds

| Tabla | Columnas | Estado |
|---|--:|---|
| `article` | 19 | Activa: `url_canonical`, `title`, `body_text`, `lang`, `published_at`, `category`, `partidos_mencionados`, `sentimiento_score`, `relevancia_score` |
| `article_scores` | 6 | Activa: `sentiment_global`, `relevance_score`, `novelty_score`, `impact_score`, `misinfo_risk_score` |
| `articulos_prensa` | 25+ | Activa: `topic_id` BERTopic, `frame_dominante`, `fimi_score`, `hate_label`, IPTC |
| `medios_config` | 8 | Activa con seed 19 medios ES (El País, El Mundo, ABC, La Vanguardia, ...) |
| `source_health`, `scraper_incident`, `fact_check` | varias | Activas |
| `narrative_clusters` | (línea 343 narrative_pipeline.py) | Mencionada, requiere verificación |

### 2.3 Frontend `lib/medios/media-methodology.ts` (2129 LOC)

SOBRE-implementa muchas capacidades fuera del Sprint 0+1 spec base:

- `FIGURAS_DICT_V2` (29 figuras con desambiguación contextual: "Sánchez" cross-context; "Montero" María Jesús vs Irene)
- `PARTIDOS_DICT` (13), `INSTITUCIONES_DICT` (20+), `IBEX35_DICT` (23)
- `detectActorsList()`, `assessSentiment()` con `actor_sentiment` HACIA cada actor
- 6 dimensiones de risk (institutional, electoral, geopolitical, economic, media, social)
- Geopolitical OSINT (44 países con lat/lon)
- Story clustering Jaccard 0.30
- Dynamic Topic Discovery TF-IDF bigramas/trigramas

### 2.4 Catálogos JSON existentes

| Archivo | Contenido |
|---|---|
| `apps/visual-oscar/data/medios.json` | 220 medios con `id`, `nombre`, `grupo`, `tipo`, `ambito`, `ccaa`, `ideologia` (-100..+100), `audiencia_M`, `credibilidad` (0-1), `rss`, `web`, `color` |
| `data/actores/` | Fichas por figura (pedro-sanchez.json, alberto-nunez-feijoo.json) con DAFO |
| `data/medios/periodistas.json` | 90 periodistas + tags |

### 2.5 Vercel cron existente

`apps/visual-oscar/vercel.json` define 2 crons (04:00 UTC daily-ingest, 07:00 UTC daily-refresh) pero ninguno específico para Prensa.

### 2.6 Tests existentes

`apps/visual-oscar/tests/unit/medios-methodology.test.ts` (8 unit tests sobre normalizeCredibility + selectPrioritySources + buildNarrativeClustersDetailed) + `tests/smoke/prensa-g15.spec.ts` (5 smoke Playwright).

---

## 3 · Decisiones arquitectónicas tomadas

### 3.1 Coexistencia con adaptadores (no reemplazo)

Sistema legacy (`/api/medios/intel`, `news-aggregator.ts`, `media-methodology.ts`) **sigue intacto** sirviendo al dashboard actual. La capa canónica se construye en paralelo con sus propios módulos, endpoints, catálogos y storage. Adaptadores mapean entre legacy y canónico. Migración del frontend a canónico ocurre en Sprint 1.4 con feature flag.

**Razón**: cero regresión durante construcción; tests existentes siguen pasando; cualquier paso del Sprint puede revertirse.

### 3.2 Naming en español

- Path TS: `apps/visual-oscar/lib/medios/canonical/` (no `media/`)
- Endpoints: `/api/medios/pulso`, `/api/medios/clusters`, `/api/medios/fuentes-status`, `/api/medios/pipeline-metrics`
- Catálogos: `data/medios/{entity,topic-rules,rss-tag-map,framing-rules,source}-catalog.json`
- Frontend: `/prensa` (sin cambio)

**Razón**: consistencia con resto del repo (CLAUDE.md §0.5 marca naming en español como prioritario; `/api/medios/*` ya existe).

### 3.3 LLM clasificador semántico ACTIVO desde Sprint 0.3

Cascada 3 capas estricta: RSS_TAG (umbral 0.65) → HEURISTIC (umbral 0.60) → SEMANTIC LLM. La capa 3 usa Ollama `llama3.1:8b` en Sprint 0.3 (ya integrado en `narrative_pipeline.py`) y migra a Groq prod en Sprint 1.3 con batching 20 artículos/call + cache SHA256(title+desc) + confidence truncada a 0.75.

**Razón**: Sprint 2 §2.1 exige capa 3 real; añadirla después rompe el pipeline base + requiere re-testing del flujo. Coste estimado con cache + batching: ~$0.50/día.

### 3.4 Solo RSS curado en Sprint 0+1 (NewsAPI/GDELT diferido)

Las 219 entradas de `medios.json` + 19 de `medios_config` cubren el 70-80% del volumen según el propio spec §2.2. NewsAPI/GDELT son optimizaciones de cobertura que entran en Sprint 2+.

**Razón**: spec dice "RSS debe ser 70-80% del volumen" y "NewsAPI no se usa para fuentes ya cubiertas por RSS"; validar pipeline con RSS primero.

### 3.5 Catálogos JSON con shape RICH desde Sprint 0.2

Los catálogos JSON usan los shapes EXACTOS del Sprint 2+3+4 desde el inicio, no shapes simplificados:

- `entity-catalog.json` con aliases rich: `{text, confidence, disambiguationRequired, contextRequired[], note}`
- `topic-rules.json` con subtopics nesteados + rules con `field`, `type: contains_any|contains_all`, `terms`, `score`, `note`
- `rss-tag-map.json` con `sources: ["*"]` wildcard + `confidence` por entrada
- `framing-rules.json` con estructura preparada (vacía, Sprint 4 la llena)
- `source-catalog.json` extiende `medios.json` con `tier` (1-4), `ideology` enum, `regions[]`, `audienceEstimate`, `qualityScore`

**Razón**: cambiar shape de JSON con datos ya seedeados es costoso; pagar el shape rich una vez evita migración.

### 3.6 Migración SQL EXPAND incluye tablas Sprint 2-4

Migración 0058 crea **vacías** las tablas que Sprint 2-4 llenarán: `narratives`, `entity_metrics`, `pipeline_metrics`, `topic_prominence_history`. Además, `ALTER TABLE article ADD COLUMN` añade campos canónicos (`is_noise`, `noise_reason`, `is_duplicate`, `duplicate_of`, `processing_status`, `failed_step`, `ingested_at`, `raw_tags JSONB`, `quality_score`, `framing`, `entities JSONB`).

**Razón**: una migración ahora vs. tres migraciones después; reduce riesgo expand/contract.

### 3.7 Endpoints canónicos con contratos COMPLETOS desde Sprint 0.4

`/api/medios/pulso` soporta 5 modos (PLURAL, AUDIEN, REGION, IDEOLOGY, CRISIS) desde día uno. `/api/medios/narrativas` y `/api/medios/actores/[id]/metricas` existen como **stubs estables** que devuelven shape canónico (con valores vacíos o cero) hasta que Sprint 3+4 los llenen. Frontend puede empezar a consumirlos sin esperar.

**Razón**: el frontend no debe re-acoplar componentes cuando Sprint 3+4 llegue; el shape estable desde Sprint 0+1 permite UI iteration en paralelo.

### 3.8 Coexistencia documentada con backend Python

El backend Python (`media_intelligence/`, `news_scheduler.py`) sigue corriendo. Sprint 0+1 expone endpoints Next.js que pueden delegar al backend Python cuando esté wireado (Sprint 2+), pero por defecto lee de Postgres directo (tablas `article`, `article_scores`, `narrative_clusters`). No hay rewrite Python en este sprint.

---

## 4 · Arquitectura general

```
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND /prensa (Next.js) — 7 tabs + 20 componentes              │
│                                                                    │
│  Sprint 0+1: dashboard consume /api/medios/intel LEGACY            │
│              + /api/medios/pulso CANÓNICO (read-only, parallel)    │
│  Sprint 1.4: migrar componentes con feature flag                   │
└────────────────────────────────────────────────────────────────────┘
                          │                            │
                  LEGACY  │                            │  CANÓNICO (NUEVO)
                          ▼                            ▼
   ┌──────────────────────────────┐   ┌─────────────────────────────────┐
   │ /api/medios/intel  (existing)│   │ /api/medios/pulso               │
   │ /api/medios/search           │   │ /api/medios/clusters[+/[id]]    │
   │ /api/medios/lectura          │   │ /api/medios/fuentes-status      │
   │ /api/medios/ccaa             │   │ /api/medios/pipeline-metrics    │
   │ /api/medios/dossier          │   │ /api/medios/narrativas (stub)   │
   │ /api/medios/eventos-globales │   │ /api/medios/actores/[id]/...    │
   └──────────────────────────────┘   │ /api/medios/health              │
                  │                   │ /api/cron/medios-mantenimiento  │
                  ▼                   └─────────────────────────────────┘
   ┌──────────────────────────────┐                  │
   │ lib/news-aggregator.ts (1038)│                  ▼
   │ lib/medios/media-methodology │   ┌─────────────────────────────────┐
   │   (2129 LOC, intacto)        │   │  lib/medios/canonical/  (NUEVO) │
   │ lib/news-intel.ts            │   │    ├ types.ts                   │
   │ lib/rss.ts                   │   │    ├ catalogs.ts (Zod loaders)  │
   └──────────────────────────────┘   │    ├ pipeline.ts (processArtcl)│
                  │                   │    ├ adapters.ts (SQL↔TS↔leg)  │
                  ▼                   │    ├ scoring.ts (prominence)   │
                Fetch on-demand       │    ├ stores.ts                 │
                RSS externos          │    └ metrics.ts                │
                (volátil)             └─────────────────────────────────┘
                                                      │
                                                      ▼
                          ┌──────────────────────────────────────────┐
                          │  POSTGRES (existing + migration 0058)    │
                          │                                          │
                          │  article + article_scores (existing)     │
                          │    + columns nuevas SPRINT 0+1           │
                          │                                          │
                          │  medios_config (existing 19 seed)        │
                          │  source_health, scraper_incident, fact_  │
                          │  articulos_prensa (BERTopic existing)    │
                          │                                          │
                          │  ─────── NUEVAS Sprint 1.1 ───────       │
                          │  narratives                              │
                          │  entity_metrics                          │
                          │  pipeline_metrics                        │
                          │  topic_prominence_history                │
                          └──────────────────────────────────────────┘
                                                      │
                                                      │  consumes
                                                      ▼
                          ┌──────────────────────────────────────────┐
                          │  BACKEND PYTHON (existing, intact)       │
                          │  media_intelligence/* (11 módulos)       │
                          │  analytics/narrative_engine.py           │
                          │  news_scheduler.py (APScheduler)         │
                          └──────────────────────────────────────────┘

                          ┌──────────────────────────────────────────┐
                          │  data/medios/ (NUEVO Sprint 0.2)         │
                          │    ├ entity-catalog.json (85+ entries)   │
                          │    ├ topic-rules.json (24 macrotemas)    │
                          │    ├ rss-tag-map.json (~200 mappings)    │
                          │    ├ framing-rules.json (vacío Sprint 4) │
                          │    └ source-catalog.json (ext medios.json│
                          │                                          │
                          │  data/medios/medios.json (existing 220)  │
                          │  data/actores/* (existing)               │
                          └──────────────────────────────────────────┘
```

---

## 5 · Detalle por commit

### Commit 0.1 · Tipos canónicos exhaustivos · 4h

**Archivo**: `apps/visual-oscar/lib/medios/canonical/types.ts` (~600 LOC).

Implementa los siguientes tipos como interfaces TS exportables, con `Readonly<>` sobre campos inmutables:

```ts
export type IngestionSource = 'RSS' | 'NEWSAPI' | 'GDELT' | 'MANUAL' | 'INSTITUTIONAL'
export type Polarity = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED' | 'UNKNOWN'
export type Tone = 'INFORMATIVO' | 'CRITICO' | 'LAUDATORIO' | 'ALARMISTA'
  | 'IRONICO' | 'NEUTRAL_FORMAL' | 'UNKNOWN'
export type Framing = 'GESTION_COMPETENCIA' | 'CRISIS_CONFLICTO'
  | 'CORRUPCION_ESCANDALO' | 'NEGOCIACION_BLOQUEO' | 'IMPACTO_ECONOMICO'
  | 'LEGITIMIDAD_INSTITUCIONAL' | 'SEGURIDAD_AMENAZA' | 'DERECHOS_GARANTIAS'
  | 'PROTESTA_MOVILIZACION' | 'UNKNOWN'
export type ClassificationMethod = 'RSS_TAG' | 'HEURISTIC' | 'SEMANTIC' | 'MANUAL' | 'FALLBACK'
export type ProcessingStatus = 'pending' | 'success' | 'noise' | 'duplicate' | 'failed'
export type SourceTier = 1 | 2 | 3 | 4
export type Ideology = 'LEFT' | 'CENTER_LEFT' | 'CENTER'
  | 'CENTER_RIGHT' | 'RIGHT' | 'NATIONALIST' | 'INSTITUTIONAL' | 'UNKNOWN'
export type SourceType = 'NATIONAL' | 'REGIONAL' | 'LOCAL' | 'DIGITAL_NATIVE'
  | 'AGENCY' | 'INTERNATIONAL' | 'SECTORAL' | 'INSTITUTIONAL'
export type EntityType = 'PERSON' | 'PARTY' | 'INSTITUTION' | 'TERRITORY'
  | 'COMPANY' | 'UNION' | 'THINKTANK' | 'COALITION' | 'ORGANISM'
export type TopicLevel = 1 | 2 | 3
export type TopicState = 'STRUCTURAL' | 'EMERGENT' | 'STABLE'
export type WarningSeverity = 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL'
export type WindowSpec = '24h' | '48h' | '72h' | '7d'
export type PulsoMode = 'PLURAL' | 'AUDIEN' | 'REGION' | 'IDEOLOGY' | 'CRISIS'

export interface ArticleUnit {
  // Inmutables tras ingesta
  readonly id: string                    // SHA-256(canonicalUrl)
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string | null
  readonly bodySnippet: string | null
  readonly source: Source
  readonly publishedAt: string           // ISO8601 con tz
  readonly ingestedAt: string            // ISO8601
  readonly language: string              // ISO 639-1
  readonly country: string               // ISO 3166-1 alpha-2
  readonly rawTags: string[]
  readonly ingestionSource: IngestionSource

  // Enriquecidos (modificables por pipeline)
  topicTags: TopicTag[]
  entities: ExtractedEntity[]
  sentiment: Sentiment | null
  framing: Framing | null
  clusterId: string | null
  qualityScore: number                   // 0..1
  isNoise: boolean
  noiseReason: string | null
  isDuplicate: boolean
  duplicateOf: string | null
  sourceWeight: number                   // 0..1
  processingStatus: ProcessingStatus
  failedStep: string | null
}

export interface Source {
  readonly id: string                    // slug: 'el-pais'
  readonly name: string
  readonly domain: string
  readonly type: SourceType
  readonly country: string
  readonly regions: string[]             // ISO CCAA codes
  readonly language: string
  readonly ideology: Ideology
  readonly ideologyScore: number         // -100..100 (legacy)
  readonly tier: SourceTier
  readonly audienceEstimate: number      // visitas/mes
  readonly rssFeeds: RssFeedRef[]
  readonly qualityScore: number          // 0..1
  readonly active: boolean
}

export interface RssFeedRef {
  url: string
  kind: 'general' | 'politica' | 'economia' | 'opinion' | 'otro'
  active: boolean
}

export interface Entity {
  readonly id: string                    // slug: 'pedro-sanchez'
  readonly canonicalName: string
  readonly type: EntityType
  readonly politicalFamily: string | null
  readonly role: string | null
  readonly territory: string | null
  readonly relevanceScore: number        // 0..1
  readonly active: boolean
  readonly aliases: EntityAlias[]
}

export interface EntityAlias {
  text: string
  confidence: number                     // 0..1 base
  disambiguationRequired?: boolean
  contextRequired?: string[]             // términos que deben aparecer cerca
  note?: string
}

export interface ExtractedEntity {
  entityId: string
  alias: string                          // qué alias matched
  confidence: number                     // 0..1 efectivo (post-context)
  position: 'title' | 'description' | 'both'
  resolutionMethod: 'direct' | 'context' | 'coreference'
}

export interface TopicTag {
  topicId: string                        // 'TERRITORIAL'
  subtopicId: string | null              // 'CATALUÑA'
  level: TopicLevel
  confidence: number                     // 0..1
  method: ClassificationMethod
  assignedAt: string                     // ISO8601
}

export interface Sentiment {
  polarity: Polarity
  confidence: number
  tone: Tone
  framing: Framing                       // duplicado, ver §2129 LOC legacy
  method: 'heuristic' | 'lexicon' | 'llm' | 'unknown'
}

export interface NewsCluster {
  readonly id: string                    // UUID
  title: string
  leaderArticleId: string
  memberIds: string[]
  topic: TopicTag
  entities: ClusterEntityRef[]
  firstSeen: string
  lastSeen: string
  velocity: number                       // miembros última hora
  sourceCount: number
  tierDistribution: Record<SourceTier, number>
  territoryDistribution: Record<string, number>
  ideologyDistribution: Record<Ideology, number>
  sentimentBalance: SentimentDistribution
  framingDistribution: Record<Framing, number>  // Sprint 4
  prominence: number                     // 0..1
}

export interface ClusterEntityRef {
  entityId: string
  mentionCount: number
  averageConfidence: number
}

export interface SentimentDistribution {
  positive: number                       // 0..1, sums to 1.0
  neutral: number
  negative: number
  mixed: number
}

export interface Narrative {              // ← preparado, Sprint 4 lo instancia
  readonly id: string
  label: string
  topicId: string
  primaryEntity: string
  framing: Framing
  sentiment: Polarity
  articleCount: number
  sourceCount: number
  sourceDistribution: {
    byTier: Record<SourceTier, number>
    byIdeology: Record<Ideology, number>
  }
  momentum: number
  firstDetected: string
  lastUpdated: string
  representativeArticles: string[]
  auditTrail: {
    matchingArticleIds: string[]
    detectionCriteria: string
    confidenceScore: number
  }
}

export interface EntityMetrics {          // ← preparado, Sprint 3 lo instancia
  entityId: string
  window: WindowSpec
  prominenceScore: number
  articleCount: number
  sourceCount: number
  topicDistribution: Record<string, number>
  sentimentProfile: {
    overall: SentimentDistribution
    byTopic: Record<string, SentimentDistribution>
    byIdeology: Record<Ideology, SentimentDistribution>
  }
  coOccurrences: Array<{ entityId: string; count: number }>
  mediaDistribution: Record<string, number>  // sourceId -> count
  computedAt: string
}

export interface TopicProminenceScore {   // ← preparado, Sprint 2 lo calcula real
  topicId: string
  subtopicId: string | null
  score: number                          // composite 0..1
  components: {
    volumeScore: number                  // weight 0.30
    momentumScore: number                // weight 0.25
    sourceDiversityScore: number         // weight 0.20
    tierWeightScore: number              // weight 0.15
    entityDensityScore: number           // weight 0.10
  }
  state: TopicState                      // STRUCTURAL | EMERGENT | STABLE
  volume: number
  sourceCount: number
}

export interface ConfidenceMetrics {
  score: number                          // 0..1
  components: {
    classificationCoverage: number       // weight 0.30
    entityCoverage: number               // weight 0.25
    deduplicationRate: number            // weight 0.20
    sourceCatalogCoverage: number        // weight 0.15
    tier12Proportion: number             // weight 0.10
  }
  warnings: ConfidenceWarning[]
}

export interface ConfidenceWarning {
  code: string                           // 'LOW_ENTITY_COVERAGE'
  severity: WarningSeverity
  title: string
  message: string
  detail: string
  action: string
  affectedMetrics: string[]
}

export interface PipelineMetrics {
  windowFrom: string
  windowTo: string
  fetchedTotal: number
  duplicatesExact: number
  duplicatesTitular: number
  noiseFiltered: number
  processedSuccessfully: number
  classifiedWithTaxonomy: number
  withEntities: number
  clusteredExisting: number
  clusteredNew: number
  failedInPipeline: Record<string, number>   // step -> count
  classificationByMethod: Record<ClassificationMethod, number>
  classificationConfidence: { high: number; mid: number; low: number }
  otroPercentage: number
}

export interface DominantTopic {
  topicId: string
  label: string
  volume: number
  volumePct: number
  momentum: number
  state: TopicState
  sentimentBalance: SentimentDistribution
  topEntities: string[]
  topSources: string[]
  rawTagsRepresentative: string[]
  leadClusters: string[]
  representativeTitles: string[]
  confidence: number
}

export type Catalogs = {
  sources: Source[]
  entities: Entity[]
  topicRules: TopicRulesCatalog
  rssTagMap: RssTagMapCatalog
  framingRules: FramingRulesCatalog
}
```

**Adaptadores** (`canonical/adapters.ts`):

```ts
export function articleRowToCanonical(row: ArticleRow): ArticleUnit
export function articleCanonicalToRow(unit: ArticleUnit): ArticleRowInsert
export function legacyArticleToCanonical(item: AggregatedArticle): ArticleUnit
export function legacySourceToCanonical(catalog: CatalogMedio): Source
export function legacyClusterToCanonical(cluster: NarrativeCluster): NewsCluster
```

**Tests** (`canonical/__tests__/types.test.ts`): 80+ tests cubriendo:
- Shape válido pasa, shape inválido (campo faltante o tipo erróneo) rompe en TS type narrowing
- `id = sha256(canonicalUrl)` se calcula determinísticamente (5 URLs distintas)
- Type guards: `isArticleUnit`, `isSource`, `isEntity`, etc.
- Adapters round-trip: `articleRowToCanonical(articleCanonicalToRow(unit)) === unit`
- Adapters legacy: `legacyArticleToCanonical(aggregated)` produce shape válido

**Criterios de aceptación**:
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Todos los tests en green
- [ ] Build de `apps/visual-oscar` no rompe
- [ ] No se ha tocado ningún archivo existente (solo creaciones nuevas)

**Rollback**: `rm -rf lib/medios/canonical/` y commit revert. Cero impacto en sistema corriendo.

---

### Commit 0.2 · Catálogos JSON con shape rich · 4h

**5 archivos nuevos en `apps/visual-oscar/data/medios/`**:

**Proceso de extracción de constantes TS → JSON**: Sprint 0.2 incluye un script TS `scripts/extract-entity-catalog.ts` que importa `FIGURAS_DICT_V2`, `PARTIDOS_DICT`, `INSTITUCIONES_DICT`, `IBEX35_DICT` desde `lib/medios/media-methodology.ts` y los serializa al JSON con shape rich. El script corre una sola vez para semilla inicial; mantenimiento posterior es manual via PR editando los JSON. Las constantes TS originales **permanecen en `media-methodology.ts`** porque el sistema legacy las consume y no toca el sprint actual.

#### 5.1 `entity-catalog.json`

Shape Zod-validado, 85+ entidades iniciales extraídas de `media-methodology.ts` (FIGURAS_DICT_V2, PARTIDOS_DICT, INSTITUCIONES_DICT, IBEX35_DICT):

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-02",
  "entities": [
    {
      "id": "pedro-sanchez",
      "canonicalName": "Pedro Sánchez",
      "type": "PERSON",
      "politicalFamily": "PSOE",
      "role": "Presidente del Gobierno",
      "territory": "ES",
      "relevanceScore": 1.0,
      "active": true,
      "aliases": [
        { "text": "Pedro Sánchez", "confidence": 1.0 },
        { "text": "Sánchez", "confidence": 0.75, "disambiguationRequired": true },
        { "text": "el presidente del gobierno", "confidence": 0.90 },
        { "text": "el presidente", "confidence": 0.65, "disambiguationRequired": true },
        { "text": "Moncloa", "confidence": 0.55, "contextRequired": ["gobierno","ejecutivo","presidencia"] },
        { "text": "el jefe del ejecutivo", "confidence": 0.88 }
      ]
    }
  ]
}
```

**Mínimo cubierto**: 30 personas (presidentes autonómicos, ministros, líderes oposición, líderes partido), 15 partidos, 20 instituciones, 10 empresas IBEX, 10 sindicatos/patronales, 17 CCAA + 2 CA.

#### 5.2 `topic-rules.json`

Shape rich del Sprint 2 con subtopics nesteados:

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-02",
  "topics": [
    {
      "topicId": "POLITICA_INSTITUCIONAL",
      "label": "Política institucional",
      "rules": [
        {
          "id": "pol-inst-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["consejo de ministros","decreto ley","moncloa","la presidencia"],
          "score": 0.9
        }
      ]
    },
    {
      "topicId": "TERRITORIAL",
      "label": "Territorial",
      "subtopics": [
        {
          "subtopicId": "CATALUÑA",
          "rules": [
            {
              "id": "terr-cat-01",
              "field": "title",
              "type": "contains_any",
              "terms": ["generalitat","govern","cataluña","puigdemont","junts","erc"],
              "score": 0.88
            }
          ]
        }
      ]
    }
  ]
}
```

24 macrotemas del spec §1.4, ~10-20 reglas iniciales por tema, ~6 subtopics en TERRITORIAL.

#### 5.3 `rss-tag-map.json`

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-02",
  "mappings": [
    { "rawTag": "política", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "economía", "topicId": "ECONOMIA", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "cataluña", "topicId": "TERRITORIAL", "subtopicId": "CATALUÑA", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "others", "topicId": null, "confidence": 0, "sources": ["*"], "note": "Tag genérico — ignorar, forzar capa 2" }
  ]
}
```

~200 mappings iniciales curados de los rawTags que aparecen en `medios.json` feeds.

#### 5.4 `framing-rules.json` (preparado, Sprint 4)

```json
{
  "version": "0.1",
  "lastUpdated": "2026-06-02",
  "_status": "PREPARED_FOR_SPRINT_4_NOT_ACTIVE",
  "framings": [
    {
      "framingId": "GESTION_COMPETENCIA",
      "label": "Gestión / competencia",
      "rules": []
    }
  ]
}
```

Esqueleto vacío con las 8 framings declaradas. Sprint 4 llena `rules[]`.

#### 5.5 `source-catalog.json`

Extiende `medios.json` (220 medios actuales) añadiendo campos canónicos:

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-02",
  "sources": [
    {
      "id": "el-pais",
      "name": "El País",
      "domain": "elpais.com",
      "type": "NATIONAL",
      "country": "ES",
      "regions": ["ES"],
      "language": "es",
      "ideology": "CENTER_LEFT",
      "ideologyScore": -25,
      "tier": 1,
      "audienceEstimate": 16500000,
      "rssFeeds": [
        { "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", "kind": "general", "active": true },
        { "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada", "kind": "politica", "active": true }
      ],
      "qualityScore": 0.85,
      "active": true
    }
  ]
}
```

Los primeros 30 medios tier 1-2 reciben curación humana del `tier`, `rssFeeds` (general + política + economía), `ideology` enum derivado de `ideologia` numérico (-100..+100). Los restantes 190 quedan con tier=3 default; `regions` derivada de `ambito`/`ccaa`.

#### 5.6 Loaders + validación Zod

`apps/visual-oscar/lib/medios/canonical/catalogs.ts`:

```ts
import { z } from 'zod'

export const EntityAliasSchema = z.object({
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  disambiguationRequired: z.boolean().optional(),
  contextRequired: z.array(z.string()).optional(),
  note: z.string().optional(),
})

export const EntitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  canonicalName: z.string().min(1),
  type: z.enum(['PERSON','PARTY','INSTITUTION','TERRITORY','COMPANY','UNION','THINKTANK','COALITION','ORGANISM']),
  politicalFamily: z.string().nullable(),
  role: z.string().nullable(),
  territory: z.string().nullable(),
  relevanceScore: z.number().min(0).max(1),
  active: z.boolean(),
  aliases: z.array(EntityAliasSchema).min(1),
})

export const EntityCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  entities: z.array(EntitySchema),
})

export async function loadEntityCatalog(): Promise<Entity[]> { ... }
export async function loadTopicRules(): Promise<TopicRulesCatalog> { ... }
export async function loadRssTagMap(): Promise<RssTagMapCatalog> { ... }
export async function loadFramingRules(): Promise<FramingRulesCatalog> { ... }
export async function loadSourceCatalog(): Promise<Source[]> { ... }

// Memoria cache: carga una vez por instancia
let _entityCache: Entity[] | null = null
let _topicRulesCache: TopicRulesCatalog | null = null
// ... etc

// Helpers de lookup
export function findSourceByDomain(catalog: Source[], domain: string): Source | null
export function findEntityById(catalog: Entity[], id: string): Entity | null
export function findEntitiesByAlias(catalog: Entity[], alias: string): Entity[]
```

**Tests** (`catalogs.test.ts`, 30+ tests):
- Cada JSON pasa validación Zod
- JSON malformado (campo faltante, tipo erróneo) rechazado con error claro
- `findSourceByDomain('elpais.com')` devuelve El País
- `findEntitiesByAlias('Sánchez')` devuelve al menos Pedro Sánchez (otros si hay homónimos)
- Cache: segunda llamada no relee disco
- Carga inicial < 100ms

**Criterios de aceptación**:
- [ ] 5 archivos JSON existen y validan Zod
- [ ] Tests green
- [ ] `entity-catalog.json` tiene ≥85 entities con shape rich
- [ ] `topic-rules.json` tiene 24 macrotemas (puede tener menos de 24 con reglas — los restantes con reglas vacías son aceptables, llegada Sprint 2)
- [ ] `source-catalog.json` tiene 220 medios con `tier` asignado

**Rollback**: borrar `data/medios/*.json` y `canonical/catalogs.ts`. Cero impacto.

---

### Commit 0.3 · Pipeline `processArticle()` completo · 8h

**Archivo**: `apps/visual-oscar/lib/medios/canonical/pipeline.ts` (~800 LOC).

```ts
export interface RawArticle {
  url: string
  title: string
  description?: string
  bodySnippet?: string
  publishedAt: string
  language?: string
  country?: string
  rawTags?: string[]
  ingestionSource: IngestionSource
  sourceDomain?: string
}

export interface ProcessOptions {
  knownIds?: Set<string>                 // dedupe exacto in-memory
  recentTitleHashes?: Map<string, { id: string; ts: string }>  // dedupe titular ±30min
  semanticEnabled?: boolean              // true Sprint 0+1 con Ollama
  semanticClient?: LlmClient
}

export interface ProcessOutcome {
  article: ArticleUnit | null            // null si filtered antes de ingerirse
  outcome: ProcessingStatus
  failedStep: string | null
  error: string | null
  metricsDelta: PipelineMetricsDelta
}

export async function processArticle(
  raw: RawArticle,
  catalogs: Catalogs,
  options: ProcessOptions = {},
): Promise<ProcessOutcome>
```

**Implementación de los 10 pasos del spec §2.3**:

1. **Fetch/parse**: la entrada `raw` viene parseada por el caller (handler `/api/medios/cron/refresh` o test). Aquí solo limpiamos: HTML entities, normalizar espacios, eliminar tracking params (`utm_*`, `fbclid`, `gclid`, `ref`, `from`, `origin`). Calculamos `canonicalUrl` + `id = sha256(canonicalUrl)`.

2. **Dedupe exacta**: `if (knownIds.has(id))` → outcome=`duplicate`, no avanza.

3. **Dedupe titular**: hash de primeros 8 tokens significativos del título normalizado (lowercase + sin stopwords ES). Buscar en `recentTitleHashes` (TTL 30min) con `sourceId` match. Si hay match → `isDuplicate=true`, `duplicateOf=match.id`, no avanza más.

4. **Filtro ruido**: aplicar 7 reglas spec §Paso 4. Si alguna match → `isNoise=true` con `noiseReason`, no continúa.

5. **Source weight**: lookup `canonical.findSourceByDomain(sourceDomain)`. Calcular `sourceWeight = tierBaseWeight × source.qualityScore`. Tier1=1.0, T2=0.7, T3=0.4, T4=0.3. Si no encontrado → `source=UNKNOWN`, `sourceWeight=0.1`.

6. **Clasificación temática** (cascada 3 capas):

   **Capa 1 — RSS_TAG**:
   ```ts
   for (const tag of raw.rawTags ?? []) {
     const mapping = rssTagMap.findMapping(tag, source.id)
     if (mapping && mapping.confidence >= 0.65) {
       return { topicId, subtopicId, confidence, method: 'RSS_TAG' }
     }
   }
   ```

   **Capa 2 — HEURISTIC**:
   ```ts
   const scores = new Map<string, number>()
   for (const topic of topicRules.topics) {
     let score = 0, maxPossible = 0
     for (const rule of topic.rules) {
       const text = rule.field === 'title' ? title :
                    rule.field === 'description' ? description :
                    `${title} ${description}`
       const weight = rule.field === 'title' ? 1.5 :
                      rule.field === 'description' ? 1.0 : 1.2
       maxPossible += rule.score * weight
       if (matchRule(text, rule)) score += rule.score * weight
     }
     scores.set(topic.topicId, score / maxPossible)  // 0..1
   }
   const sorted = [...scores.entries()].sort((a,b) => b[1] - a[1])
   if (sorted[0][1] >= 0.60) {
     return { topicId: sorted[0][0], confidence: sorted[0][1], method: 'HEURISTIC' }
   }
   ```

   **Capa 3 — SEMANTIC** (Ollama dev / Groq prod):
   ```ts
   if (options.semanticEnabled && options.semanticClient) {
     // Batching: caller acumula 20 antes de invocar
     const result = await options.semanticClient.classify(title, description, topicList)
     const conf = Math.min(result.confidence, 0.75)  // truncado spec §2.1.3
     return { topicId: result.topicId, confidence: conf, method: 'SEMANTIC' }
   }
   ```

   **Fallback**: `{ topicId: 'OTRO', confidence: 0.3, method: 'FALLBACK' }`

7. **Extracción entidades** (algoritmo spec §3.2):

   ```ts
   const extracted: ExtractedEntity[] = []
   const titleNorm = normalize(title)       // lowercase + sin acentos
   const descNorm = normalize(description ?? '')

   for (const alias of allAliasesIndex) {   // pre-indexado
     const aliasNorm = normalize(alias.text)
     const inTitle = wordBoundaryMatch(titleNorm, aliasNorm)
     const inDesc = wordBoundaryMatch(descNorm, aliasNorm)
     if (!inTitle && !inDesc) continue

     const entities = alias.candidates       // múltiples si ambiguo
     let entity: Entity | null = null

     if (entities.length === 1 && !alias.disambiguationRequired) {
       entity = entities[0]
     } else if (alias.contextRequired) {
       const fullText = `${titleNorm} ${descNorm}`
       const hasContext = alias.contextRequired.some(c => fullText.includes(normalize(c)))
       if (hasContext) entity = entities[0]  // o pick por relevanceScore
     } else if (alias.disambiguationRequired) {
       // co-reference: ¿alguna entity ya extraída con high conf?
       const prior = extracted.find(e => entities.some(c => c.id === e.entityId)
         && e.confidence >= 0.85)
       if (prior) entity = findById(entities, prior.entityId)
     }

     if (!entity) continue

     let conf = alias.confidence
     if (inTitle) conf *= 1.0
     else conf *= 0.75
     if (alias.text.split(' ').length === 1) conf *= 0.85
     if (alias.text.split(' ').length >= 3) conf = Math.min(conf * 1.10, 1.0)

     if (conf >= 0.55) {
       extracted.push({
         entityId: entity.id,
         alias: alias.text,
         confidence: conf,
         position: inTitle && inDesc ? 'both' : inTitle ? 'title' : 'description',
         resolutionMethod: alias.contextRequired ? 'context' :
                           alias.disambiguationRequired ? 'coreference' : 'direct',
       })
     }
   }
   ```

8. **Quality score** (6 componentes spec §Paso 8):
   - `+0.2` descripción no vacía
   - `+0.1` descripción ≠ título
   - `+0.1` título 6-20 palabras
   - `+0.2` ≥1 entidad reconocida
   - `+0.2` TopicTag con `confidence ≥ 0.7`
   - `+0.2` source tier ∈ {1,2}

9. **Storage**: en Sprint 0.3 retorna el `ArticleUnit` completo en memoria. Caller decide persistencia (Sprint 1.1 conecta a Postgres).

10. **Clustering**: en Sprint 0.3 retorna `clusterId: null`. Sprint 1.1+ activa clustering incremental (delega al pipeline Python `narrative_engine.py` o implementa Jaccard ligero TS).

**Métricas** (`metrics.ts`): incrementa contadores por outcome (fetchedTotal, duplicatesExact, duplicatesTitular, noiseFiltered, processedSuccessfully, classifiedWithTaxonomy, withEntities, classificationByMethod, classificationConfidence buckets, failedInPipeline by step).

**Tests** (`pipeline.test.ts`, 50+ tests):

- 7 reglas de ruido, una por test
- Dedupe URL: id repetido → outcome=duplicate
- Dedupe titular: mismo título normalizado en source en ventana 30min → isDuplicate=true
- Capa 1: artículo con rawTag "política" → POLITICA_INSTITUCIONAL conf 0.85
- Capa 2: título con "tribunal supremo" → JUDICIAL conf ≥0.9
- Capa 3 (mock LLM): título sin match capa 1/2 → llama LLM
- Capa 3 truncado: si LLM devuelve 0.99 → conf=0.75
- Fallback: ninguna capa match → OTRO conf 0.3 method FALLBACK
- Entity "Pedro Sánchez" en título → conf ≥0.95
- Entity "Sánchez" sin contexto → no extraído (conf < 0.75)
- Entity "Moncloa" + contexto "gobierno" → pedro-sanchez extraído
- Co-reference: "Pedro Sánchez ... el presidente" → segunda mención también → pedro-sanchez
- Quality score: artículo con descripción + 1 entidad + topic conf 0.8 + tier 1 → ≥0.7
- Pipeline pure: misma entrada + mismos catálogos + mismo knownIds → misma salida
- Métricas delta: cada outcome incrementa contador correcto

**Criterios de aceptación**:
- [ ] `tsc --noEmit` pasa
- [ ] 50+ tests green
- [ ] Pipeline < 50ms por artículo (sin LLM) o < 500ms con LLM batch
- [ ] Tests de los 10 pasos cubren cada rama
- [ ] Cobertura ≥ 85% en `pipeline.ts`

**Rollback**: borrar `canonical/pipeline.ts` y `canonical/metrics.ts`. Sin uso por otras partes.

---

### Commit 0.4 · Endpoints canónicos con contratos rich · 4h

**Archivos**:

1. `apps/visual-oscar/app/api/medios/pulso/route.ts`
2. `apps/visual-oscar/app/api/medios/clusters/route.ts`
3. `apps/visual-oscar/app/api/medios/clusters/[id]/route.ts`
4. `apps/visual-oscar/app/api/medios/fuentes-status/route.ts`
5. `apps/visual-oscar/app/api/medios/pipeline-metrics/route.ts`
6. `apps/visual-oscar/app/api/medios/narrativas/route.ts` (stub)
7. `apps/visual-oscar/app/api/medios/actores/[id]/metricas/route.ts` (stub)
8. Middleware: `apps/visual-oscar/middleware.ts` añadir `/api/medios/` a PUBLIC_PREFIXES no necesario (`/api/medios/` ya implícitamente requiere auth; pero los nuevos son lectura → respetar auth global)

#### 7.1 `GET /api/medios/pulso`

**Query params**:
- `window`: `24h|48h|72h|7d` (default `72h`)
- `mode`: `PLURAL|AUDIEN|REGION|IDEOLOGY|CRISIS` (default `PLURAL`)
- `region`: ISO CCAA opcional para `REGION`/filtros

**Response** (shape canónico spec §3.1):

```json
{
  "generatedAt": "2026-06-02T10:15:30Z",
  "window": "72h",
  "mode": "PLURAL",
  "confidence": {
    "score": 0.66,
    "components": {
      "classificationCoverage": 0.82,
      "entityCoverage": 0.45,
      "deduplicationRate": 0.91,
      "sourceCatalogCoverage": 0.78,
      "tier12Proportion": 0.61
    },
    "warnings": [
      {
        "code": "LOW_ENTITY_COVERAGE",
        "severity": "WARNING",
        "title": "Pocas entidades políticas reconocidas",
        "message": "...",
        "detail": "131/240 artículos sin entidades (54.6%)",
        "action": "Prueba una query más específica con actor/partido",
        "affectedMetrics": ["entityCoverage","actorRanking","sentimentByActor"]
      }
    ]
  },
  "volume": {
    "total": 2297,
    "analyzed": 240,
    "noise": 180,
    "duplicates": 890,
    "unique": 1227,
    "clustered": 210
  },
  "balance": {
    "ideological": 0.90,
    "territorial": 0.53,
    "tierDistribution": { "T1": 0.35, "T2": 0.28, "T3": 0.25, "T4": 0.12 }
  },
  "latency": 3708,
  "dominantTopics": [
    {
      "topicId": "TERRITORIAL",
      "label": "Territorial",
      "volume": 238,
      "volumePct": 0.10,
      "momentum": 0.34,
      "state": "STRUCTURAL",
      "sentimentBalance": { "positive": 0.12, "neutral": 0.58, "negative": 0.30, "mixed": 0 },
      "topEntities": ["generalitat-catalunya","pedro-sanchez","partido-popular"],
      "topSources": ["el-pais","la-vanguardia","abc"],
      "rawTagsRepresentative": ["#Cataluña","#España","#Política"],
      "leadClusters": ["uuid-1","uuid-2"],
      "representativeTitles": ["...","...","..."],
      "confidence": 0.81
    }
  ],
  "topClusters": [ /* ClusterSummary[] */ ],
  "sourcesActive": 87,
  "lastUpdated": "2026-06-02T10:15:30Z"
}
```

**Implementación Sprint 0.4** (modo `adapter`):

- Lee Postgres tabla `article` filtrado por `published_at >= now - window`
- Aplica `articleRowToCanonical()` adapter
- Calcula `volume`, `balance` desde counts
- Para `dominantTopics`: agrupa por `topic_id`, calcula scores básicos (Sprint 2 lo refinará con TopicProminenceScore real)
- `confidence.warnings`: emite los 4 warnings cuando condiciones se cumplen
- `mode=AUDIEN`: aplica `× audienceEstimate` al ranking
- `mode=REGION`: filtra por `source.regions ∋ region`
- `mode=IDEOLOGY`: añade `byIdeology` breakdown en cada `DominantTopic`
- `mode=CRISIS`: filtra topics con `momentum > 0.5` (estimación inicial)

**Cache**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.

#### 7.2 `GET /api/medios/clusters`

Query: `topic`, `window`, `minSources`, `sortBy: prominence|velocity|recency|sourceCount`, `page`, `pageSize`.

Lee tabla `narrative_clusters` con join a `article`. Devuelve `NewsCluster[]` shape canónico.

#### 7.3 `GET /api/medios/clusters/[id]`

Devuelve `NewsCluster` con `memberIds` resueltos a `ArticleUnit[]` completos.

#### 7.4 `GET /api/medios/fuentes-status`

Lee tabla `source_health` + cruza con `source-catalog.json`. Devuelve:

```json
{
  "generatedAt": "...",
  "summary": {
    "total": 220,
    "alive": 187,
    "errored": 12,
    "stale": 21
  },
  "sources": [
    {
      "sourceId": "el-pais",
      "lastSuccessfulFetch": "...",
      "lastErrorCode": null,
      "articlesLastRun": 35,
      "newArticlesLastRun": 12,
      "noiseFlaggedLastRun": 3,
      "status": "alive"
    }
  ]
}
```

#### 7.5 `GET /api/medios/pipeline-metrics`

Lee tabla `pipeline_metrics` (Sprint 1.1) o calcula on-demand desde `article` en Sprint 0.4. Devuelve `PipelineMetrics` shape canónico.

#### 7.6 `GET /api/medios/narrativas` (stub)

Sprint 0.4: devuelve `{ narratives: [], note: "Sprint 4 lo llenará" }` con shape canónico.

#### 7.7 `GET /api/medios/actores/[id]/metricas` (stub)

Sprint 0.4: devuelve `EntityMetrics` con counts en 0 + `note`.

**Tests** (`endpoints.test.ts`, integration, 25+ tests):

- Shape conforme al contrato (Zod validation post-response)
- `mode=AUDIEN` vs `mode=PLURAL` produce rankings distintos sobre dataset fixture
- Cache headers presentes
- 503 cuando legacy underlying call falla con `Retry-After`
- Tiempo de respuesta < 800ms (spec §IV test #6)

**Criterios de aceptación**:
- [ ] 7 endpoints responden 200 con shape canónico
- [ ] `tsc --noEmit` pasa
- [ ] Tests integration green
- [ ] `vercel deploy --target preview` funciona

**Rollback**: borrar endpoints. Legacy intact, no rompe nada.

---

### Commit 0.5 · Frontend wiring + observabilidad UI · 3h

**Archivos**:

1. `apps/visual-oscar/app/prensa/_hooks/useMediaPulso.ts`
2. `apps/visual-oscar/app/prensa/_hooks/useMediaClusters.ts`
3. `apps/visual-oscar/app/prensa/_hooks/useMediaActores.ts`
4. `apps/visual-oscar/app/prensa/_components/PipelineHealthBadge.tsx` (nuevo)
5. `apps/visual-oscar/app/prensa/_components/SourceStatusPanel.tsx` (nuevo)
6. `apps/visual-oscar/app/prensa/_components/TopicProminenceBar.tsx` (nuevo)
7. `apps/visual-oscar/app/prensa/page.tsx` (edit: añadir badge en header)

**Componentes**:

- `<PipelineHealthBadge />`: chip pequeño junto al título con color (verde/ámbar/rojo) basado en `confidence.score`. Tooltip muestra desglose de los 5 componentes.
- `<SourceStatusPanel />`: card colapsable con counters "187 vivos · 12 errored · 21 stale". Click expande lista.
- `<TopicProminenceBar />`: similar al actual de "Importancia Temática" pero con indicador `↑` (ESTRUCTURAL) y `★` (EMERGENT) al lado de cada tema. Tooltip muestra los 5 componentes del score.

**Tabs legacy**: intactos. Los nuevos componentes son **additivos** en el header `/prensa`.

**Tests E2E** (`prensa-canonical.smoke.spec.ts`, Playwright, 5 tests):

- `/prensa` carga sin errores con badge visible
- Badge muestra score (no NaN)
- SourceStatusPanel responde a click
- TopicProminenceBar muestra al menos 5 temas

**Criterios de aceptación**:
- [ ] Build green
- [ ] Smoke pasa
- [ ] No regresión visual de tabs existentes (manual check con screenshot diff)

**Rollback**: revertir `page.tsx` edit + borrar nuevos componentes.

---

### Commit 1.1 · Migración SQL 0058 expand · 4h

**Archivo**: `db/migrations/0058_canonical_media.sql` (o `packages/migrations/versions/0058_*.py` Alembic según convención del repo).

```sql
-- 0058_canonical_media.sql · Sprint 0+1 Prensa canonical

BEGIN;

-- 0. Habilitar pgcrypto para gen_random_uuid() (si no ya activa)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Expandir tabla article con campos canónicos
ALTER TABLE article
  ADD COLUMN IF NOT EXISTS is_noise BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS noise_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_of TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS failed_step TEXT,
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS raw_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(4,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS framing TEXT,
  ADD COLUMN IF NOT EXISTS entities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Backfill canonical_url desde url existente (asumimos que url ya es canónica)
UPDATE article SET canonical_url = url WHERE canonical_url IS NULL;

-- Constraints después del backfill
ALTER TABLE article
  ALTER COLUMN canonical_url SET NOT NULL,
  ADD CONSTRAINT article_canonical_url_unique UNIQUE (canonical_url);

CREATE INDEX IF NOT EXISTS idx_article_processing_status ON article(processing_status);
CREATE INDEX IF NOT EXISTS idx_article_ingested_at ON article(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_is_noise ON article(is_noise) WHERE is_noise = FALSE;
CREATE INDEX IF NOT EXISTS idx_article_quality_score ON article(quality_score DESC);

-- 2. Tabla narratives (Sprint 4 lo llena, creada vacía ya)
CREATE TABLE IF NOT EXISTS narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  subtopic_id TEXT,
  primary_entity TEXT NOT NULL,
  framing TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  source_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  momentum NUMERIC(4,3) NOT NULL DEFAULT 0,
  first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  representative_articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_trail JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_narratives_topic ON narratives(topic_id);
CREATE INDEX idx_narratives_entity ON narratives(primary_entity);
CREATE INDEX idx_narratives_active ON narratives(active, last_updated DESC);

-- 3. Tabla entity_metrics (Sprint 3 lo llena)
CREATE TABLE IF NOT EXISTS entity_metrics (
  entity_id TEXT NOT NULL,
  window_spec TEXT NOT NULL,  -- '24h','48h','72h','7d'
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prominence_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  article_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  topic_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  sentiment_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  co_occurrences JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (entity_id, window_spec, computed_at)
);
CREATE INDEX idx_entity_metrics_window ON entity_metrics(window_spec, computed_at DESC);
CREATE INDEX idx_entity_metrics_entity ON entity_metrics(entity_id, computed_at DESC);

-- 4. Tabla pipeline_metrics (Sprint 0+1 lo llena; Sprint 2 jobs leen y escriben)
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  id BIGSERIAL PRIMARY KEY,
  window_from TIMESTAMPTZ NOT NULL,
  window_to TIMESTAMPTZ NOT NULL,
  fetched_total INTEGER NOT NULL DEFAULT 0,
  duplicates_exact INTEGER NOT NULL DEFAULT 0,
  duplicates_titular INTEGER NOT NULL DEFAULT 0,
  noise_filtered INTEGER NOT NULL DEFAULT 0,
  processed_successfully INTEGER NOT NULL DEFAULT 0,
  classified_with_taxonomy INTEGER NOT NULL DEFAULT 0,
  with_entities INTEGER NOT NULL DEFAULT 0,
  clustered_existing INTEGER NOT NULL DEFAULT 0,
  clustered_new INTEGER NOT NULL DEFAULT 0,
  failed_in_pipeline JSONB NOT NULL DEFAULT '{}'::jsonb,
  classification_by_method JSONB NOT NULL DEFAULT '{}'::jsonb,
  classification_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  otro_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pipeline_metrics_window ON pipeline_metrics(window_to DESC);

-- 5. Tabla topic_prominence_history (Sprint 2 calcula cada 15min, lee `dominantTopics`)
CREATE TABLE IF NOT EXISTS topic_prominence_history (
  topic_id TEXT NOT NULL,
  subtopic_id TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_spec TEXT NOT NULL,
  score NUMERIC(4,3) NOT NULL DEFAULT 0,
  volume_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  momentum_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  source_diversity_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  tier_weight_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  entity_density_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'STABLE',
  volume INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (topic_id, subtopic_id, computed_at, window_spec)
);
CREATE INDEX idx_topic_prominence_recent ON topic_prominence_history(computed_at DESC);

COMMIT;
```

**Tests** (`tests/db/test_migration_0058.py` o equivalente TS):
- Migración corre sin error en DB limpia
- Migración corre sin error en DB con data existente (backfill funciona)
- Constraints están aplicados
- Downgrade revierte limpiamente

**Criterios de aceptación**:
- [ ] `alembic upgrade head` corre limpio
- [ ] `alembic downgrade -1` revierte limpio
- [ ] Indexes presentes (`\di` en psql)
- [ ] Backfill no destruye data existente

**Rollback**: `alembic downgrade <previous>` o ejecutar el `DROP TABLE` + `ALTER TABLE DROP COLUMN` manualmente.

---

### Commit 1.2 · Vercel Cron `/api/cron/medios-mantenimiento` · 3h

**Archivos**:

1. `apps/visual-oscar/app/api/cron/medios-mantenimiento/route.ts`
2. `apps/visual-oscar/vercel.json` o `vercel.ts`: añadir cron schedule
3. `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts` (registry de jobs)
4. `apps/visual-oscar/lib/medios/canonical/maintenance/cleanup-clusters.ts`
5. `apps/visual-oscar/lib/medios/canonical/maintenance/recompute-source-scores.ts`
6. `apps/visual-oscar/lib/medios/canonical/maintenance/otro-alert.ts`

**Vercel cron**: schedule `0 * * * *` (cada hora). El endpoint multiplexa por hora del día qué jobs corre:

```ts
const HOURLY: Job[] = [cleanupClusters]                       // every hour
const SIXHOURLY: Job[] = [otroAlertJob]                       // hours: 0, 6, 12, 18
const DAILY: Job[] = [recomputeSourceScores]                  // hour 3

// Sprint 2 añadirá:
// SIXHOURLY.push(unmappedTagsJob, classifierMetricsJob)
// TWELVEHOURLY.push(termsNotClassifiedJob)
// Sprint 4 añadirá:
// QUARTERHOURLY.push(topicProminenceJob)
// HALFHOURLY.push(narrativeDetectionJob)
```

**Job: cleanup-clusters**:
- Marca como `stale` clusters sin nuevo artículo en 6h con < 3 miembros
- Marca como `closed` clusters sin nuevo artículo en 24h
- Update `narrative_clusters` tabla

**Job: recompute-source-scores**:
- Por cada source en `source-catalog.json`: recalcula `qualityScore` basado en:
  - Tasa noise últimas 1000 piezas (peso 0.30)
  - Tasa duplicados (0.25)
  - Proporción sin entidades (0.20)
  - Proporción clasificadas correctamente (0.25)
- Update field `qualityScore` (en memoria si JSON, o tabla `medios_config`)

**Job: otro-alert**:
- Calcula % OTRO en última ventana 12h
- Si > 5%: insert row en `pipeline_metrics` con flag `otro_threshold_exceeded=true` + log estructurado
- (Sprint 2 añadirá notification real)

**Tests**:
- Jobs corren idempotentes (segunda ejecución no rompe estado)
- Logs estructurados con `{job, duration_ms, items_processed, errors}`

**Criterios de aceptación**:
- [ ] `/api/cron/medios-mantenimiento` responde 200 con summary
- [ ] Vercel cron schedule active en `vercel.ts`
- [ ] 3 jobs Sprint 0+1 corren sin error
- [ ] Plug points para Sprint 2/4 documentados con `// SPRINT_X_REGISTER_HERE` comments

**Rollback**: quitar cron de `vercel.ts`, borrar endpoint. Jobs no se ejecutan más.

---

### Commit 1.3 · LLM topic classifier production · 4h

**Archivo**: `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts` + edita `pipeline.ts` para usar production client.

**Lógica**:

```ts
export interface LlmClassifierConfig {
  provider: 'ollama' | 'groq'
  endpoint: string
  apiKey?: string
  model: string                          // 'llama-3.3-70b-versatile' Groq
  batchSize: number                      // 20
  rateLimit: { rpm: number }            // 30 default
  cacheTtlSec: number                    // 3600
  confidenceCap: number                  // 0.75
}

export class LlmTopicClassifier {
  async classifyBatch(items: Array<{title: string, description: string}>): Promise<Array<{topicId: string, confidence: number, reasoning: string}>>

  // Internal:
  // - sha256(title|description) → cache lookup
  // - Si miss: añade a batch buffer
  // - Cuando buffer llena 20 o pasa 500ms: invoca LLM
  // - Rate limiter token bucket 30/min
  // - Respuesta del LLM: parse JSON estructurado
  // - Cap confidence a 0.75
  // - Cachea result con TTL 1h
}
```

**Migración Ollama → Groq**:
- Sprint 0.3 usaba Ollama dev (local)
- Sprint 1.3 default a Groq prod (env var `GROQ_API_KEY` ya existe per memoria task #3)
- Fallback a Ollama si Groq falla 3 veces consecutivas (circuit breaker)

**Tests**:
- Batching: 25 calls → 2 LLM invocations
- Cache hit segunda llamada misma entrada
- Rate limit respetado (mock timer)
- Cap confidence: LLM devuelve 0.99 → resultado 0.75
- Circuit breaker: tras 3 fallos abre, retorna fallback OTRO

**A/B con stub**: feature flag `MEDIOS_LLM_CLASSIFIER=disabled` retorna OTRO. Métricas comparativas en log para validar mejora real.

**Criterios de aceptación**:
- [ ] Coste estimado < $1/día con batching + cache
- [ ] p95 latencia < 800ms para batch de 20
- [ ] Tests green
- [ ] Documented en CLAUDE.md sección de costes

**Rollback**: feature flag `MEDIOS_LLM_CLASSIFIER=disabled` → pipeline retorna OTRO en capa 3.

---

### Commit 1.4 · Tests aceptación §IV + migración frontend · 5h

**Archivos**:

1. `apps/visual-oscar/tests/acceptance/sprint-0-1-prensa.spec.ts` (10 tests del spec §IV)
2. Edits en componentes:
   - `LecturaPoliteiaPanel.tsx`: feature flag `useCanonical` para leer `/api/medios/pulso`
   - `NarrativesFramingWorkbench.tsx`: feature flag para leer `/api/medios/narrativas` (stub vacío en Sprint 0+1, Sprint 4 lo llena)
   - `MapasImpacto.tsx`: feature flag para leer `/api/medios/pulso?mode=REGION&region=X`

**10 tests aceptación spec §IV**:

1. ✓ Sistema ingesta ≥15 fuentes RSS sin errores → mock 20 feeds, count successes
2. ✓ Dedupe URL 100% → insertar 100 articles con 50 URLs únicas y 50 duplicadas → resultado 50 únicos
3. ✓ Dedupe titular ≥80% para agencia → fixture EFE feed con 30 articles + 5 medios con mismo content → reducción ≥80%
4. ✓ OTRO ≤15% en dataset 500 articles política → preparar fixture + correr pipeline
5. ✓ Pipeline < 2s end-to-end por artículo individual
6. ✓ `/pulso` < 800ms con datos pre-calculados
7. ✓ ConfidenceMetrics distintos entre ventanas 24h vs 7d
8. ✓ Cluster agencia: 1 article EFE replicado en 5 medios → 1 cluster con 5 miembros
9. ✓ Entity extraction ≥10 de 14 personas en titulares de prueba (Sánchez, Feijóo, Díaz, Abascal, Junqueras, Aragonès, Juan Carlos I, Ayuso, Puigdemont, Ana Belén Vázquez, +4)
10. ✓ Cleanup job clusters obsoletos no aparecen en trending

**Tests preparados Sprint 2 §2.5** (los que no requieren lógica Sprint 2 aún):
- #2 RSS_TAG conf ≥0.85 si rawTag mapeado
- #6 5 modos producen rankings distintos
- #9 capa 3 no se invoca si capa 1 conf ≥0.80

**Tests preparados Sprint 3 §3.5**:
- #1 EntityCatalog ≥85 entities activas
- #2 "Pedro Sánchez" → conf ≥0.95
- #3 "Sánchez" solo → conf <0.75
- #4 "Govern + cataluña" → generalitat-catalunya

**Migración frontend con feature flag**:

`apps/visual-oscar/lib/medios/feature-flags.ts`:

```ts
export const FLAGS = {
  USE_CANONICAL_PULSO: process.env.NEXT_PUBLIC_USE_CANONICAL_PULSO === 'true',
  USE_CANONICAL_NARRATIVAS: process.env.NEXT_PUBLIC_USE_CANONICAL_NARRATIVAS === 'true',
  USE_CANONICAL_MAPAS: process.env.NEXT_PUBLIC_USE_CANONICAL_MAPAS === 'true',
}
```

Default: `false`. Producción Vercel env: `false` hasta validar. Activación manual ENV → vercel preview.

**Criterios de aceptación**:
- [ ] 10 tests §IV green
- [ ] Tests preparados Sprint 2/3 green (sobre la lógica disponible)
- [ ] Feature flags wireados en 3 componentes
- [ ] Producción default: flags OFF, legacy intact

**Rollback**: `FLAGS = { ALL: false }` o quitar imports.

---

### Commit 1.5 · Observabilidad pipeline + página `/medios/health` · 3h

**Archivos**:

1. `apps/visual-oscar/app/api/medios/health/route.ts`
2. `apps/visual-oscar/app/medios/health/page.tsx` (página interna)
3. `apps/visual-oscar/app/api/cron/medios-probe/route.ts` (probe diario)
4. `apps/visual-oscar/scripts/medios-probe.ts` (probe manual local)

**Endpoint `/api/medios/health`**:

```json
{
  "ok": true,
  "status": "ok|degraded|critical",
  "ts": "...",
  "pipeline": {
    "last_window_metrics": { ... PipelineMetrics ... },
    "method_distribution": { "RSS_TAG": 0.55, "HEURISTIC": 0.30, "SEMANTIC": 0.10, "FALLBACK": 0.05 },
    "confidence_distribution": { "high": 0.42, "mid": 0.31, "low": 0.27 },
    "otro_percentage_7d": [4.2, 4.1, 5.0, 4.8, 4.5, 4.7, 4.6]
  },
  "sources": {
    "alive": 187,
    "errored": 12,
    "stale": 21,
    "top_errors": [{"sourceId":"...","errorCode":"timeout"}]
  },
  "catalogs": {
    "entityCatalog": { "version": "1.0", "entities": 87 },
    "topicRules": { "version": "1.0", "macrotopics": 24 },
    "rssTagMap": { "version": "1.0", "mappings": 198 }
  }
}
```

**Página `/medios/health`**: dashboard interno con cards:
- Pipeline metrics actuales
- Distribución de método (gráfico)
- Evolución `OTRO` últimos 7 días (sparkline)
- Lista de feeds caídos
- Top errores por source

Es el equivalente de `/api/health/macro-freshness` que cerré en Sprint W, aplicado a Prensa.

**Cron diario** (`/api/cron/medios-probe` schedule `0 6 * * *`): ejecuta probe completo, persiste snapshot en `pipeline_metrics`, commitea reporte markdown a `docs/audits/YYYY-MM-DD_medios_health.md`.

**Tests**:
- `/api/medios/health` responde 200 con shape
- `medios/health` page renderiza sin error
- Probe diario produce reporte válido

**Criterios de aceptación**:
- [ ] `/api/medios/health` deployado y accesible
- [ ] Página `/medios/health` carga
- [ ] Probe cron schedulea
- [ ] Build green

**Rollback**: quitar endpoint + página + cron.

---

## 6 · Mapeo Sprint 0+1 → Sprint 2/3/4

| Componente Sprint 0+1 | Sprint que lo consume | Cómo |
|---|---|---|
| `types.ts::TopicTag` (con `subtopicId`, `level`, `method`) | Sprint 2 | Capa 1/2/3 retornan este shape |
| `types.ts::TopicProminenceScore` (preparado) | Sprint 2 | Sprint 2 calcula los 5 componentes reales |
| `types.ts::TopicState` ('STRUCTURAL', 'EMERGENT') | Sprint 2 | Cron de Sprint 2 actualiza estado |
| `topic-rules.json` shape (con subtopics) | Sprint 2 | Sprint 2 llena reglas adicionales + mantiene |
| `rss-tag-map.json` shape | Sprint 2 | Sprint 2 mantiene + add nuevos mappings |
| `framing-rules.json` shape (vacío) | Sprint 4 | Sprint 4 llena con 8 framings + reglas |
| Pipeline capa 3 LLM (Groq) | Sprint 2 §2.1.3 | Sprint 2 lo usa, ya está construido |
| `processArticle()` con 10 pasos | Sprint 2/3 | Sprint 2 modifica step 6 con TopicProminence; Sprint 3 step 7 con métricas |
| `types.ts::Entity` (con aliases rich) | Sprint 3 | Algoritmo extracción Sprint 3.2 ya implementado en Sprint 0.3 |
| `entity-catalog.json` (85+ entities) | Sprint 3 | Sprint 3 expande catalog según necesidad |
| `types.ts::EntityMetrics` | Sprint 3 | Tabla `entity_metrics` ya creada; Sprint 3 llena |
| `types.ts::ConfidenceWarning` (4 severities) | Sprint 3 | Los 4 warnings emiten desde Sprint 0+1; Sprint 3 añade granularidad |
| `types.ts::Narrative` | Sprint 4 | Tabla `narratives` ya creada; Sprint 4 implementa detección |
| `types.ts::Framing` (8 enums) | Sprint 4 | Sprint 4 implementa classifier de framing |
| `/api/medios/pulso` 5 modos | Sprint 2 (refina) + Sprint 4 (Lectura) | Sprint 4 lee `dominantTopics` + `topClusters` para generar lectura |
| `/api/medios/narrativas` stub | Sprint 4 | Sprint 4 lo llena con detección real |
| `/api/medios/actores/[id]/metricas` stub | Sprint 3 | Sprint 3 lo llena |
| Cron `medios-mantenimiento` con plug points | Sprint 2 (3 jobs) + Sprint 4 (2 jobs) | Sprint 2/4 registran jobs en el registry |
| `pipeline_metrics` tabla | Sprint 2 | Jobs de Sprint 2 leen y escriben |
| `topic_prominence_history` tabla | Sprint 2 | Sprint 2 cron 15min escribe |

---

## 7 · Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración SQL 0058 rompe data existente | Media | Alto | Backfill testeado en clone DB local antes de prod; downgrade probado |
| Coste LLM Groq excesivo | Media | Medio | Cache SHA256 + batching 20 + rate limit + feature flag para disable |
| Frontend feature flag activado prematuro rompe UX | Baja | Alto | Default OFF en prod; activación manual con preview deploy primero |
| Cron Vercel timeout en jobs largos | Media | Medio | `maxDuration=300s` (default 300s); jobs idempotentes; chunking |
| Entity catalog incompleto causa false negatives | Alta | Medio | Sprint 3 está dedicado a expandir; Sprint 0+1 entrega 85+ como floor |
| Tests E2E flaky en CI | Media | Bajo | Tests deterministas con fixtures; no `sleep`; mock LLM con stub |
| Backend Python `news_scheduler` colisiona con cron Vercel | Baja | Alto | Sprint 0+1 NO toca scheduler Python; coexistencia documentada |
| Tabla `narrative_clusters` ya existe con shape distinto | Media | Alto | Verificar antes de migración 0058 con `\d narrative_clusters`; usar tabla existente con ALTER si encaja, o crear `narratives` separada |
| Backend Python `news_scheduler` ya inserta en `article` con shape pre-canónico | **Confirmado** | Alto | Tras migración 0058, campos canónicos quedan en NULL para inserts del scheduler legacy. **Acción**: backfill en cron `recompute-source-scores` que recalcula `quality_score`, `is_noise`, `entities`, `framing` para articles con `processing_status='pending'`. Esto evita acoplar este sprint con refactor del scheduler Python |

---

## 8 · Decisiones diferidas a Sprint 2+

- **NewsAPI / GDELT integration**: el `news_scheduler.py` ya ingesta 350 fuentes RSS; NewsAPI se evalúa en Sprint 2 cuando se vea si hay gaps de cobertura
- **Almacenamiento de framing por artículo en SQL**: columna `framing` añadida en migración 0058 pero permanece NULL hasta que Sprint 4 implemente classifier
- **Reescritura del clustering Python en TypeScript**: NO, el `narrative_engine.py` con sentence-transformers se mantiene en Python; Sprint 4 expone vía endpoint
- **MBFC dataset integration**: tarea S2.3 marca como completada pero no wireada; se valida en Sprint 2
- **Modelo embeddings local custom (sustituir LLM capa 3)**: spec dice "Future"; queda para Sprint 5+
- **Vercel KV/Marketplace DB**: descartado porque tablas Postgres ya existen

---

## 9 · Criterios de "DONE" Sprint 0+1

El sprint se considera entregado cuando:

- [ ] **10 commits** a `main` con build green cada uno
- [ ] `tsc --noEmit` pasa en cada commit
- [ ] **80+ tests unit** (types + catalogs) green
- [ ] **50+ tests pipeline** green
- [ ] **25+ tests integration endpoints** green
- [ ] **10 tests aceptación §IV** green
- [ ] **5+ smoke E2E** green
- [ ] Migración 0058 corre limpia en DB de staging
- [ ] Vercel deploy producción exitoso con feature flags OFF
- [ ] Endpoint `/api/medios/pulso` responde < 800ms p95
- [ ] Cron `/api/cron/medios-mantenimiento` ejecuta sin error 3 días seguidos
- [ ] Página `/medios/health` accesible en producción
- [ ] Documentation actualizada (este design doc + `CLAUDE.md` mención de capa canónica + commit log claro)
- [ ] Diff total < 8000 LOC (tests incluidos) para revisión razonable
- [ ] **El dashboard `/prensa` legacy sigue funcionando idéntico al actual** (cero regresión visual ni funcional)

---

## 10 · Anexos · Decisiones tomadas en brainstorming

| # | Decisión | Tomada |
|---|----------|--------|
| Q1 | **Opción C** decomposición en pasos atómicos (no MVP ni full spec) | 2026-06-02 |
| Q2 | **Opción A** coexistencia con adaptadores (no reemplazo ni refactor profundo) | 2026-06-02 |
| Q3 | **Opción A** naming español: `lib/medios/canonical/`, `/api/medios/*` | 2026-06-02 |
| Q4a | **CAMBIO Opción i** LLM clasificador activo Sprint 0.3 (Ollama dev → Groq prod) | 2026-06-02 |
| Q4b | **Opción i** solo RSS curado en Sprint 0+1, NewsAPI diferido | 2026-06-02 |
| Q5 | **Plan ambicioso 10 commits** confirmando A+B+C+D | 2026-06-02 |

---

*Fin del documento de diseño.*
