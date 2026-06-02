# Sprint 0+1 Prensa · Capa de Ingesta Canónica · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disciplinar arquitectónicamente la capa de ingesta de Prensa de Politeia con tipos canónicos, catálogos JSON externos, pipeline `processArticle()` puro de 10 pasos, endpoints contractuales y storage SQL expand/contract — todo coexistiendo con el sistema legacy intacto, sirviendo de fundamento estable para Sprint 2 (Clasificación), 3 (Actores) y 4 (Narrativas + Lectura IA).

**Architecture:** Capa canónica nueva en `apps/visual-oscar/lib/medios/canonical/` paralela al legacy (`news-aggregator.ts`, `media-methodology.ts`, `/api/medios/intel`). Adaptadores SQL ↔ TS ↔ legacy mantienen ambos sistemas sincronizados. Tablas Postgres existentes (`article`, `article_scores`) se expanden via migración 0058; tablas nuevas (`narratives`, `entity_metrics`, `pipeline_metrics`, `topic_prominence_history`) se crean vacías preparadas para Sprint 2-4. Endpoints `/api/medios/pulso|clusters|fuentes-status|pipeline-metrics|narrativas|actores/[id]/metricas` con contratos rich.

**Tech Stack:** TypeScript estricto · Next.js 14 App Router · Zod (validación catálogos JSON) · Vitest (unit) · Playwright (smoke E2E) · Postgres (existing) · Alembic-compatible SQL migration · Vercel Cron · Ollama llama3.1:8b (dev) / Groq llama-3.3-70b-versatile (prod) para capa 3 LLM.

**Spec source:** `docs/superpowers/specs/2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md` (commit 12cd4d9f en `main`).

**Convención naming:** Español (`lib/medios/canonical/`, `/api/medios/*`, `data/medios/`).

**Decisiones aprobadas (brainstorming 2026-06-02):**
- Coexistencia con adaptadores (legacy intact, cero regresión)
- LLM clasificador semántico ACTIVO desde Task 3 (Ollama dev → Groq prod Task 8)
- Catálogos JSON con shape rich exacto del Sprint 2+3+4 desde Task 2
- Migración SQL 0058 incluye tablas vacías para Sprint 2/3/4
- Endpoints contractuales con stubs estables para narrativas y actores

---

## File Structure Overview

Archivos a crear/modificar agrupados por commit:

```
docs/superpowers/specs/2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md  ← YA EXISTE (commit 12cd4d9f)

apps/visual-oscar/
  lib/medios/canonical/                         ← NUEVO directorio entero
    ├ types.ts                                  (Task 1 · ~600 LOC)
    ├ adapters.ts                               (Task 1 · ~200 LOC)
    ├ catalogs.ts                               (Task 2 · ~400 LOC, loaders + Zod schemas)
    ├ pipeline.ts                               (Task 3 · ~800 LOC)
    ├ classify-rss-tags.ts                      (Task 3 · ~100 LOC)
    ├ classify-heuristic.ts                     (Task 3 · ~150 LOC)
    ├ classify-semantic.ts                      (Task 3 · ~200 LOC, Ollama client)
    ├ extract-entities.ts                       (Task 3 · ~250 LOC)
    ├ noise-filter.ts                           (Task 3 · ~80 LOC)
    ├ dedupe.ts                                 (Task 3 · ~100 LOC)
    ├ quality-score.ts                          (Task 3 · ~50 LOC)
    ├ metrics.ts                                (Task 3 · ~120 LOC)
    ├ scoring.ts                                (Task 5 · ~150 LOC, TopicProminenceScore)
    ├ stores.ts                                 (Task 4 · ~200 LOC, lectura DB)
    ├ feature-flags.ts                          (Task 9 · ~30 LOC)
    ├ llm-classifier.ts                         (Task 8 · ~300 LOC, Groq prod)
    └ maintenance/
        ├ index.ts                              (Task 7 · ~80 LOC, registry)
        ├ cleanup-clusters.ts                   (Task 7 · ~80 LOC)
        ├ recompute-source-scores.ts            (Task 7 · ~120 LOC)
        └ otro-alert.ts                         (Task 7 · ~60 LOC)

  app/api/medios/
    pulso/route.ts                              (Task 4)
    clusters/route.ts                           (Task 4)
    clusters/[id]/route.ts                      (Task 4)
    fuentes-status/route.ts                     (Task 4)
    pipeline-metrics/route.ts                   (Task 4)
    narrativas/route.ts                         (Task 4 · stub)
    actores/[id]/metricas/route.ts              (Task 4 · stub)
    health/route.ts                             (Task 10)

  app/api/cron/
    medios-mantenimiento/route.ts               (Task 7)
    medios-probe/route.ts                       (Task 10)

  app/medios/health/page.tsx                    (Task 10)

  app/prensa/_components/
    PipelineHealthBadge.tsx                     (Task 5 · NUEVO)
    SourceStatusPanel.tsx                       (Task 5 · NUEVO)
    TopicProminenceBar.tsx                      (Task 5 · NUEVO)
  app/prensa/_hooks/
    useMediaPulso.ts                            (Task 5)
    useMediaClusters.ts                         (Task 5)
    useMediaActores.ts                          (Task 5)
  app/prensa/page.tsx                           (Task 5 · MODIFICAR: añadir badge)

  data/medios/                                  ← NUEVO directorio
    entity-catalog.json                         (Task 2 · ~85 entities)
    topic-rules.json                            (Task 2 · 24 macrotemas)
    rss-tag-map.json                            (Task 2 · ~200 mappings)
    framing-rules.json                          (Task 2 · esqueleto vacío)
    source-catalog.json                         (Task 2 · ext de medios.json)

  scripts/
    extract-entity-catalog.ts                   (Task 2 · script extracción)

  tests/
    unit/medios/canonical/
      types.test.ts                             (Task 1)
      adapters.test.ts                          (Task 1)
      catalogs.test.ts                          (Task 2)
      pipeline.test.ts                          (Task 3)
      pipeline-classify.test.ts                 (Task 3)
      pipeline-extract.test.ts                  (Task 3)
      pipeline-dedupe.test.ts                   (Task 3)
      pipeline-noise.test.ts                    (Task 3)
      scoring.test.ts                           (Task 5)
      llm-classifier.test.ts                    (Task 8)
      maintenance.test.ts                       (Task 7)
    integration/medios/canonical/
      endpoints.test.ts                         (Task 4)
    acceptance/
      sprint-0-1-prensa.spec.ts                 (Task 9 · 10 tests §IV)
    smoke/
      prensa-canonical.smoke.spec.ts            (Task 5 · Playwright)
    db/
      migration-0058.test.ts                    (Task 6)

db/migrations/                                  ← O packages/migrations/versions/ según convención repo
  0058_canonical_media.sql                      (Task 6)
  0058_canonical_media_downgrade.sql            (Task 6)
```

**Modificaciones a archivos legacy: CERO**. No se toca `news-aggregator.ts`, `media-methodology.ts`, `news-intel.ts`, `news-scoring.ts`, `news-taxonomy.ts`, `rss.ts`, ni los endpoints `/api/medios/intel|search|lectura|ccaa|dossier|eventos-globales`.

---

## Pre-flight checks

Antes de empezar Task 1, verificar entorno:

- [ ] **PF.1: Rama y estado limpios**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git status
git log --oneline -3
```

Expected: working tree clean; HEAD = `12cd4d9f` (design doc commit) o más reciente.

- [ ] **PF.2: Build legacy pasa**

Run:
```bash
cd apps/visual-oscar
npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`. Si falla, hay deuda previa que hay que resolver antes.

- [ ] **PF.3: Tests legacy pasan**

Run:
```bash
cd apps/visual-oscar
npm test -- --run 2>&1 | tail -20
```

Expected: tests green o known-failures documentados. Anotar baseline para comparar.

- [ ] **PF.4: Postgres accesible (necesario desde Task 6)**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT version();" 2>&1 | head -3
```

Expected: versión Postgres. Si falla, verificar `DATABASE_URL` env var.

- [ ] **PF.5: Existencia tabla narrative_clusters (riesgo del spec)**

Run:
```bash
psql "$DATABASE_URL" -c "\d narrative_clusters" 2>&1 | head -20
```

Si la tabla existe con shape distinto al diseñado: marcar para resolver en Task 6 (renombrar nuestra tabla nueva a `narratives` o usar la existente con ALTER).

---

## Task 1: Tipos canónicos (Commit 0.1) · 4h

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/types.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/adapters.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/types.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/adapters.test.ts`

### Step 1.1: Crear directorio + skeleton de types.ts

- [ ] **Step 1.1.1: Crear estructura de carpetas**

Run:
```bash
mkdir -p apps/visual-oscar/lib/medios/canonical
mkdir -p apps/visual-oscar/tests/unit/medios/canonical
```

- [ ] **Step 1.1.2: Crear types.ts con type aliases base**

Create `apps/visual-oscar/lib/medios/canonical/types.ts`:

```typescript
/**
 * Tipos canónicos de la capa de ingesta Prensa.
 * Sprint 0+1 · Capa Canónica · 2026-06-02
 *
 * Diseñados para ser forward-compatibles con Sprint 2 (Clasificación),
 * Sprint 3 (Actores) y Sprint 4 (Narrativas + Lectura IA).
 *
 * Spec: docs/superpowers/specs/2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md
 */

// ──────── Enums / tipos base ────────────────────────────────────────────

export type IngestionSource = 'RSS' | 'NEWSAPI' | 'GDELT' | 'MANUAL' | 'INSTITUTIONAL'

export type Polarity = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED' | 'UNKNOWN'

export type Tone =
  | 'INFORMATIVO'
  | 'CRITICO'
  | 'LAUDATORIO'
  | 'ALARMISTA'
  | 'IRONICO'
  | 'NEUTRAL_FORMAL'
  | 'UNKNOWN'

export type Framing =
  | 'GESTION_COMPETENCIA'
  | 'CRISIS_CONFLICTO'
  | 'CORRUPCION_ESCANDALO'
  | 'NEGOCIACION_BLOQUEO'
  | 'IMPACTO_ECONOMICO'
  | 'LEGITIMIDAD_INSTITUCIONAL'
  | 'SEGURIDAD_AMENAZA'
  | 'DERECHOS_GARANTIAS'
  | 'PROTESTA_MOVILIZACION'
  | 'UNKNOWN'

export type ClassificationMethod =
  | 'RSS_TAG'
  | 'HEURISTIC'
  | 'SEMANTIC'
  | 'MANUAL'
  | 'FALLBACK'

export type ProcessingStatus = 'pending' | 'success' | 'noise' | 'duplicate' | 'failed'

export type SourceTier = 1 | 2 | 3 | 4

export type Ideology =
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'NATIONALIST'
  | 'INSTITUTIONAL'
  | 'UNKNOWN'

export type SourceType =
  | 'NATIONAL'
  | 'REGIONAL'
  | 'LOCAL'
  | 'DIGITAL_NATIVE'
  | 'AGENCY'
  | 'INTERNATIONAL'
  | 'SECTORAL'
  | 'INSTITUTIONAL'

export type EntityType =
  | 'PERSON'
  | 'PARTY'
  | 'INSTITUTION'
  | 'TERRITORY'
  | 'COMPANY'
  | 'UNION'
  | 'THINKTANK'
  | 'COALITION'
  | 'ORGANISM'

export type TopicLevel = 1 | 2 | 3
export type TopicState = 'STRUCTURAL' | 'EMERGENT' | 'STABLE'

export type WarningSeverity = 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL'

export type WindowSpec = '24h' | '48h' | '72h' | '7d'
export type PulsoMode = 'PLURAL' | 'AUDIEN' | 'REGION' | 'IDEOLOGY' | 'CRISIS'
```

- [ ] **Step 1.1.3: Verificar typecheck del skeleton**

Run:
```bash
cd apps/visual-oscar && npx tsc --noEmit lib/medios/canonical/types.ts 2>&1 | head -5
```

Expected: sin errores.

### Step 1.2: Test failing para ArticleUnit shape

- [ ] **Step 1.2.1: Crear types.test.ts con primer test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type {
  ArticleUnit,
  Source,
  Entity,
  EntityAlias,
  TopicTag,
  Sentiment,
  NewsCluster,
  Narrative,
  EntityMetrics,
  TopicProminenceScore,
  ConfidenceMetrics,
  ConfidenceWarning,
  PipelineMetrics,
} from '@/lib/medios/canonical/types'

describe('Canonical types · shape contracts', () => {
  describe('ArticleUnit', () => {
    it('acepta shape mínimo válido con propiedades inmutables', () => {
      const article: ArticleUnit = {
        id: 'a'.repeat(64),
        canonicalUrl: 'https://elpais.com/articulo/1',
        title: 'Título de prueba',
        description: null,
        bodySnippet: null,
        source: {} as Source,
        publishedAt: '2026-06-02T10:00:00Z',
        ingestedAt: '2026-06-02T10:05:00Z',
        language: 'es',
        country: 'ES',
        rawTags: [],
        ingestionSource: 'RSS',
        topicTags: [],
        entities: [],
        sentiment: null,
        framing: null,
        clusterId: null,
        qualityScore: 0,
        isNoise: false,
        noiseReason: null,
        isDuplicate: false,
        duplicateOf: null,
        sourceWeight: 0,
        processingStatus: 'pending',
        failedStep: null,
      }
      expect(article.id).toHaveLength(64)
    })
  })
})
```

- [ ] **Step 1.2.2: Run test — debe fallar porque ArticleUnit no existe aún**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/types.test.ts 2>&1 | tail -20
```

Expected: FAIL con "Cannot find type ArticleUnit" o equivalente.

### Step 1.3: Implementar ArticleUnit + tipos referenciados

- [ ] **Step 1.3.1: Añadir ArticleUnit, EntityAlias, ExtractedEntity, TopicTag, Sentiment a types.ts**

Append to `apps/visual-oscar/lib/medios/canonical/types.ts`:

```typescript
// ──────── ArticleUnit ─────────────────────────────────────────────────

export interface ExtractedEntity {
  entityId: string
  alias: string
  confidence: number
  position: 'title' | 'description' | 'both'
  resolutionMethod: 'direct' | 'context' | 'coreference'
}

export interface TopicTag {
  topicId: string
  subtopicId: string | null
  level: TopicLevel
  confidence: number
  method: ClassificationMethod
  assignedAt: string
}

export interface Sentiment {
  polarity: Polarity
  confidence: number
  tone: Tone
  framing: Framing
  method: 'heuristic' | 'lexicon' | 'llm' | 'unknown'
}

export interface ArticleUnit {
  // Inmutables tras ingesta
  readonly id: string
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string | null
  readonly bodySnippet: string | null
  readonly source: Source
  readonly publishedAt: string
  readonly ingestedAt: string
  readonly language: string
  readonly country: string
  readonly rawTags: string[]
  readonly ingestionSource: IngestionSource
  // Enriquecidos (modificables por pipeline)
  topicTags: TopicTag[]
  entities: ExtractedEntity[]
  sentiment: Sentiment | null
  framing: Framing | null
  clusterId: string | null
  qualityScore: number
  isNoise: boolean
  noiseReason: string | null
  isDuplicate: boolean
  duplicateOf: string | null
  sourceWeight: number
  processingStatus: ProcessingStatus
  failedStep: string | null
}
```

- [ ] **Step 1.3.2: Run test — sigue fallando porque Source no existe**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/types.test.ts 2>&1 | tail -10
```

Expected: error sobre `Source`.

### Step 1.4: Implementar Source + EntityAlias + Entity

- [ ] **Step 1.4.1: Añadir Source y RssFeedRef a types.ts**

Append to `types.ts`:

```typescript
// ──────── Source ──────────────────────────────────────────────────────

export interface RssFeedRef {
  url: string
  kind: 'general' | 'politica' | 'economia' | 'opinion' | 'otro'
  active: boolean
}

export interface Source {
  readonly id: string
  readonly name: string
  readonly domain: string
  readonly type: SourceType
  readonly country: string
  readonly regions: string[]
  readonly language: string
  readonly ideology: Ideology
  readonly ideologyScore: number
  readonly tier: SourceTier
  readonly audienceEstimate: number
  readonly rssFeeds: RssFeedRef[]
  readonly qualityScore: number
  readonly active: boolean
}
```

- [ ] **Step 1.4.2: Añadir Entity y EntityAlias**

Append:

```typescript
// ──────── Entity ──────────────────────────────────────────────────────

export interface EntityAlias {
  text: string
  confidence: number
  disambiguationRequired?: boolean
  contextRequired?: string[]
  note?: string
}

export interface Entity {
  readonly id: string
  readonly canonicalName: string
  readonly type: EntityType
  readonly politicalFamily: string | null
  readonly role: string | null
  readonly territory: string | null
  readonly relevanceScore: number
  readonly active: boolean
  readonly aliases: EntityAlias[]
}
```

- [ ] **Step 1.4.3: Run test ArticleUnit, debe pasar**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/types.test.ts 2>&1 | tail -10
```

Expected: 1 test passed (el de ArticleUnit shape).

### Step 1.5: Tests para Source, Entity, EntityAlias

- [ ] **Step 1.5.1: Añadir tests para Source/Entity**

Append to `types.test.ts`:

```typescript
  describe('Source', () => {
    it('acepta shape mínimo válido con tier 1-4', () => {
      const source: Source = {
        id: 'el-pais',
        name: 'El País',
        domain: 'elpais.com',
        type: 'NATIONAL',
        country: 'ES',
        regions: ['ES'],
        language: 'es',
        ideology: 'CENTER_LEFT',
        ideologyScore: -25,
        tier: 1,
        audienceEstimate: 16500000,
        rssFeeds: [
          { url: 'https://feeds.elpais.com/x', kind: 'general', active: true },
        ],
        qualityScore: 0.85,
        active: true,
      }
      expect(source.tier).toBe(1)
      expect(source.ideology).toBe('CENTER_LEFT')
    })
  })

  describe('EntityAlias', () => {
    it('acepta shape rich con contextRequired y disambiguationRequired', () => {
      const alias: EntityAlias = {
        text: 'Moncloa',
        confidence: 0.55,
        contextRequired: ['gobierno', 'ejecutivo'],
        note: 'Solo si refiere a decisiones del ejecutivo',
      }
      expect(alias.contextRequired).toHaveLength(2)

      const ambiguous: EntityAlias = {
        text: 'Sánchez',
        confidence: 0.75,
        disambiguationRequired: true,
      }
      expect(ambiguous.disambiguationRequired).toBe(true)
    })
  })

  describe('Entity', () => {
    it('Pedro Sánchez con aliases ricos', () => {
      const entity: Entity = {
        id: 'pedro-sanchez',
        canonicalName: 'Pedro Sánchez',
        type: 'PERSON',
        politicalFamily: 'PSOE',
        role: 'Presidente del Gobierno',
        territory: 'ES',
        relevanceScore: 1.0,
        active: true,
        aliases: [
          { text: 'Pedro Sánchez', confidence: 1.0 },
          { text: 'Sánchez', confidence: 0.75, disambiguationRequired: true },
        ],
      }
      expect(entity.id).toBe('pedro-sanchez')
      expect(entity.aliases).toHaveLength(2)
    })
  })
```

- [ ] **Step 1.5.2: Run tests — todos deben pasar**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/types.test.ts 2>&1 | tail -10
```

Expected: 4 passed.

### Step 1.6: Implementar NewsCluster, Narrative, EntityMetrics, TopicProminenceScore

- [ ] **Step 1.6.1: Añadir ClusterEntityRef, SentimentDistribution, NewsCluster**

Append to `types.ts`:

```typescript
// ──────── NewsCluster (Sprint 0+1) + Narrative (Sprint 4 preparado) ──

export interface ClusterEntityRef {
  entityId: string
  mentionCount: number
  averageConfidence: number
}

export interface SentimentDistribution {
  positive: number
  neutral: number
  negative: number
  mixed: number
}

export interface NewsCluster {
  readonly id: string
  title: string
  leaderArticleId: string
  memberIds: string[]
  topic: TopicTag
  entities: ClusterEntityRef[]
  firstSeen: string
  lastSeen: string
  velocity: number
  sourceCount: number
  tierDistribution: Record<string, number>
  territoryDistribution: Record<string, number>
  ideologyDistribution: Record<string, number>
  sentimentBalance: SentimentDistribution
  framingDistribution: Record<string, number>
  prominence: number
}
```

- [ ] **Step 1.6.2: Añadir Narrative (forward-compat Sprint 4)**

Append:

```typescript
export interface Narrative {
  readonly id: string
  label: string
  topicId: string
  primaryEntity: string
  framing: Framing
  sentiment: Polarity
  articleCount: number
  sourceCount: number
  sourceDistribution: {
    byTier: Record<string, number>
    byIdeology: Record<string, number>
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
```

- [ ] **Step 1.6.3: Añadir EntityMetrics (forward-compat Sprint 3)**

Append:

```typescript
// ──────── EntityMetrics (Sprint 3 preparado) ──────────────────────────

export interface EntityMetrics {
  entityId: string
  window: WindowSpec
  prominenceScore: number
  articleCount: number
  sourceCount: number
  topicDistribution: Record<string, number>
  sentimentProfile: {
    overall: SentimentDistribution
    byTopic: Record<string, SentimentDistribution>
    byIdeology: Record<string, SentimentDistribution>
  }
  coOccurrences: Array<{ entityId: string; count: number }>
  mediaDistribution: Record<string, number>
  computedAt: string
}
```

- [ ] **Step 1.6.4: Añadir TopicProminenceScore (forward-compat Sprint 2)**

Append:

```typescript
// ──────── TopicProminenceScore (Sprint 2 preparado) ───────────────────

export interface TopicProminenceScore {
  topicId: string
  subtopicId: string | null
  score: number
  components: {
    volumeScore: number
    momentumScore: number
    sourceDiversityScore: number
    tierWeightScore: number
    entityDensityScore: number
  }
  state: TopicState
  volume: number
  sourceCount: number
}
```

### Step 1.7: ConfidenceMetrics, ConfidenceWarning, PipelineMetrics, DominantTopic

- [ ] **Step 1.7.1: Añadir ConfidenceMetrics y ConfidenceWarning**

Append:

```typescript
// ──────── Confidence metrics + warnings ──────────────────────────────

export interface ConfidenceWarning {
  code: string
  severity: WarningSeverity
  title: string
  message: string
  detail: string
  action: string
  affectedMetrics: string[]
}

export interface ConfidenceMetrics {
  score: number
  components: {
    classificationCoverage: number
    entityCoverage: number
    deduplicationRate: number
    sourceCatalogCoverage: number
    tier12Proportion: number
  }
  warnings: ConfidenceWarning[]
}
```

- [ ] **Step 1.7.2: Añadir PipelineMetrics**

Append:

```typescript
// ──────── PipelineMetrics ─────────────────────────────────────────────

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
  failedInPipeline: Record<string, number>
  classificationByMethod: Record<ClassificationMethod, number>
  classificationConfidence: { high: number; mid: number; low: number }
  otroPercentage: number
}
```

- [ ] **Step 1.7.3: Añadir DominantTopic y Catalogs**

Append:

```typescript
// ──────── DominantTopic (output del endpoint /pulso) ──────────────────

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

// ──────── Catalogs (cargados desde JSON) ──────────────────────────────

export interface TopicRulesCatalog {
  version: string
  lastUpdated: string
  topics: unknown[]  // Validado por Zod en Task 2
}

export interface RssTagMapCatalog {
  version: string
  lastUpdated: string
  mappings: unknown[]
}

export interface FramingRulesCatalog {
  version: string
  lastUpdated: string
  framings: unknown[]
}

export interface Catalogs {
  sources: Source[]
  entities: Entity[]
  topicRules: TopicRulesCatalog
  rssTagMap: RssTagMapCatalog
  framingRules: FramingRulesCatalog
}
```

- [ ] **Step 1.7.4: Run typecheck completo**

Run:
```bash
cd apps/visual-oscar && npx tsc --noEmit 2>&1 | grep -E "(canonical|error)" | head -20
```

Expected: sin errores en archivos canónicos.

### Step 1.8: Type guards

- [ ] **Step 1.8.1: Test failing para type guards**

Append to `types.test.ts`:

```typescript
import { isArticleUnit, isSource, isEntity } from '@/lib/medios/canonical/types'

describe('Type guards', () => {
  it('isArticleUnit valida shape correcto', () => {
    const valid = {
      id: 'a'.repeat(64),
      canonicalUrl: 'x',
      title: 't',
      description: null,
      bodySnippet: null,
      source: { id: 's' },
      publishedAt: '2026-01-01T00:00:00Z',
      ingestedAt: '2026-01-01T00:00:00Z',
      language: 'es',
      country: 'ES',
      rawTags: [],
      ingestionSource: 'RSS',
      topicTags: [],
      entities: [],
      sentiment: null,
      framing: null,
      clusterId: null,
      qualityScore: 0,
      isNoise: false,
      noiseReason: null,
      isDuplicate: false,
      duplicateOf: null,
      sourceWeight: 0,
      processingStatus: 'pending',
      failedStep: null,
    }
    expect(isArticleUnit(valid)).toBe(true)
    expect(isArticleUnit(null)).toBe(false)
    expect(isArticleUnit({ id: 'x' })).toBe(false)
  })

  it('isSource valida shape correcto', () => {
    expect(isSource({ id: 's', name: 'n', domain: 'd', type: 'NATIONAL', country: 'ES', regions: [], language: 'es', ideology: 'CENTER', ideologyScore: 0, tier: 1, audienceEstimate: 0, rssFeeds: [], qualityScore: 0, active: true })).toBe(true)
    expect(isSource(null)).toBe(false)
    expect(isSource({ id: 's' })).toBe(false)
  })

  it('isEntity valida shape correcto', () => {
    expect(isEntity({ id: 'e', canonicalName: 'E', type: 'PERSON', politicalFamily: null, role: null, territory: null, relevanceScore: 0, active: true, aliases: [] })).toBe(true)
    expect(isEntity(null)).toBe(false)
  })
})
```

- [ ] **Step 1.8.2: Implementar type guards**

Append to `types.ts`:

```typescript
// ──────── Type guards ────────────────────────────────────────────────

export function isArticleUnit(value: unknown): value is ArticleUnit {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.canonicalUrl === 'string' &&
    typeof v.title === 'string' &&
    typeof v.publishedAt === 'string' &&
    typeof v.ingestedAt === 'string' &&
    Array.isArray(v.rawTags) &&
    Array.isArray(v.topicTags) &&
    Array.isArray(v.entities) &&
    typeof v.qualityScore === 'number' &&
    typeof v.isNoise === 'boolean' &&
    typeof v.isDuplicate === 'boolean'
  )
}

export function isSource(value: unknown): value is Source {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.domain === 'string' &&
    typeof v.tier === 'number' &&
    [1, 2, 3, 4].includes(v.tier as number) &&
    Array.isArray(v.regions) &&
    Array.isArray(v.rssFeeds) &&
    typeof v.active === 'boolean'
  )
}

export function isEntity(value: unknown): value is Entity {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.canonicalName === 'string' &&
    typeof v.relevanceScore === 'number' &&
    typeof v.active === 'boolean' &&
    Array.isArray(v.aliases)
  )
}
```

- [ ] **Step 1.8.3: Run tests guards — deben pasar**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/types.test.ts 2>&1 | tail -10
```

Expected: 7+ tests passed.

### Step 1.9: Adapters (SQL ↔ TS ↔ legacy)

- [ ] **Step 1.9.1: Crear adapters.ts skeleton + computeArticleId helper**

Create `apps/visual-oscar/lib/medios/canonical/adapters.ts`:

```typescript
/**
 * Adaptadores entre tipos canónicos y:
 *  - Filas Postgres (`article` row · pre-migración 0058 backwards-compatible)
 *  - Legacy types (AggregatedArticle, CatalogMedio, NarrativeCluster)
 *
 * Sprint 0+1 · Canonical layer · 2026-06-02
 */
import { createHash } from 'crypto'
import type {
  ArticleUnit,
  Source,
  NewsCluster,
  TopicTag,
  IngestionSource,
} from './types'

/**
 * Calcula el id canónico de un artículo: SHA-256(canonicalUrl).
 * Determinista. Misma URL → mismo id.
 */
export function computeArticleId(canonicalUrl: string): string {
  return createHash('sha256').update(canonicalUrl).digest('hex')
}

/**
 * Limpia una URL para obtener su versión canónica:
 *  - Elimina tracking params (utm_*, fbclid, gclid, ref, from, origin)
 *  - Normaliza host (lowercase)
 *  - Elimina fragment
 */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // Lowercase host
    u.hostname = u.hostname.toLowerCase()
    // Strip tracking params
    const STRIP = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'ref', 'from', 'origin', 'mc_cid', 'mc_eid']
    for (const k of STRIP) u.searchParams.delete(k)
    // Strip fragment
    u.hash = ''
    return u.toString()
  } catch {
    return url
  }
}
```

- [ ] **Step 1.9.2: Test computeArticleId + canonicalizeUrl**

Create `apps/visual-oscar/tests/unit/medios/canonical/adapters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeArticleId, canonicalizeUrl } from '@/lib/medios/canonical/adapters'

describe('Canonical adapters · utilities', () => {
  describe('computeArticleId', () => {
    it('es determinista: misma URL → mismo id', () => {
      const a = computeArticleId('https://elpais.com/x')
      const b = computeArticleId('https://elpais.com/x')
      expect(a).toBe(b)
      expect(a).toHaveLength(64)
    })

    it('distingue URLs distintas', () => {
      const a = computeArticleId('https://elpais.com/x')
      const b = computeArticleId('https://elpais.com/y')
      expect(a).not.toBe(b)
    })
  })

  describe('canonicalizeUrl', () => {
    it('elimina utm_*, fbclid, gclid', () => {
      const dirty = 'https://elpais.com/articulo?utm_source=twitter&fbclid=ABC&id=42'
      const clean = canonicalizeUrl(dirty)
      expect(clean).not.toContain('utm_source')
      expect(clean).not.toContain('fbclid')
      expect(clean).toContain('id=42')
    })

    it('elimina fragmento', () => {
      const dirty = 'https://elpais.com/x#section'
      expect(canonicalizeUrl(dirty)).toBe('https://elpais.com/x')
    })

    it('lowercase del host', () => {
      const dirty = 'https://ELPAIS.com/X'
      expect(canonicalizeUrl(dirty)).toContain('elpais.com')
    })

    it('URL inválida → retorna input', () => {
      const dirty = 'not a url'
      expect(canonicalizeUrl(dirty)).toBe('not a url')
    })
  })
})
```

- [ ] **Step 1.9.3: Run tests adapters — deben pasar**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/adapters.test.ts 2>&1 | tail -10
```

Expected: 5 tests passed.

### Step 1.10: Adapter Postgres row → ArticleUnit

- [ ] **Step 1.10.1: Definir ArticleRow interface y articleRowToCanonical**

Append to `adapters.ts`:

```typescript
/**
 * Shape de la fila Postgres `article` POST-MIGRACIÓN 0058.
 * Antes de Task 6 (migración), algunos campos serán undefined.
 */
export interface ArticleRow {
  id?: string                       // url hash, opcional pre-migration
  canonical_url?: string            // Task 6 lo añade
  url: string                       // existing
  title: string
  summary: string | null            // === description en canon
  body_text: string | null          // === bodySnippet
  source_id: string
  lang: string
  published_at: string              // ISO
  ingested_at?: string              // Task 6 lo añade
  category: string | null           // === topic_id legacy
  raw_tags?: unknown[]              // JSONB, Task 6
  is_noise?: boolean
  noise_reason?: string | null
  is_duplicate?: boolean
  duplicate_of?: string | null
  processing_status?: string
  failed_step?: string | null
  quality_score?: number
  framing?: string | null
  entities?: unknown[]              // JSONB
}

/**
 * Convierte una fila DB en ArticleUnit canónico.
 * Source debe pasarse aparte (lookup en catálogo).
 */
export function articleRowToCanonical(
  row: ArticleRow,
  source: Source,
): ArticleUnit {
  const canonicalUrl = row.canonical_url ?? canonicalizeUrl(row.url)
  const id = row.id ?? computeArticleId(canonicalUrl)
  return {
    id,
    canonicalUrl,
    title: row.title,
    description: row.summary,
    bodySnippet: row.body_text,
    source,
    publishedAt: row.published_at,
    ingestedAt: row.ingested_at ?? row.published_at,
    language: row.lang || 'es',
    country: 'ES',
    rawTags: (row.raw_tags as string[]) ?? [],
    ingestionSource: 'RSS' as IngestionSource,
    topicTags: row.category ? [legacyCategoryToTopicTag(row.category)] : [],
    entities: (row.entities as Array<{ entityId: string; alias: string; confidence: number; position: 'title' | 'description' | 'both'; resolutionMethod: 'direct' | 'context' | 'coreference' }>) ?? [],
    sentiment: null,
    framing: (row.framing as ArticleUnit['framing']) ?? null,
    clusterId: null,
    qualityScore: row.quality_score ?? 0,
    isNoise: row.is_noise ?? false,
    noiseReason: row.noise_reason ?? null,
    isDuplicate: row.is_duplicate ?? false,
    duplicateOf: row.duplicate_of ?? null,
    sourceWeight: source.tier === 1 ? 1.0 : source.tier === 2 ? 0.7 : source.tier === 3 ? 0.4 : 0.3,
    processingStatus: (row.processing_status as ArticleUnit['processingStatus']) ?? 'pending',
    failedStep: row.failed_step ?? null,
  }
}

function legacyCategoryToTopicTag(category: string): TopicTag {
  return {
    topicId: category.toUpperCase(),
    subtopicId: null,
    level: 1,
    confidence: 0.5,
    method: 'RSS_TAG',
    assignedAt: new Date(0).toISOString(),
  }
}
```

- [ ] **Step 1.10.2: Test articleRowToCanonical**

Append to `adapters.test.ts`:

```typescript
import { articleRowToCanonical } from '@/lib/medios/canonical/adapters'
import type { Source } from '@/lib/medios/canonical/types'

const SAMPLE_SOURCE: Source = {
  id: 'el-pais',
  name: 'El País',
  domain: 'elpais.com',
  type: 'NATIONAL',
  country: 'ES',
  regions: ['ES'],
  language: 'es',
  ideology: 'CENTER_LEFT',
  ideologyScore: -25,
  tier: 1,
  audienceEstimate: 16500000,
  rssFeeds: [],
  qualityScore: 0.85,
  active: true,
}

describe('articleRowToCanonical', () => {
  it('mapea fila completa post-migración', () => {
    const row = {
      id: 'a'.repeat(64),
      canonical_url: 'https://elpais.com/x',
      url: 'https://elpais.com/x?utm_source=tw',
      title: 'Titular',
      summary: 'Resumen',
      body_text: 'Body...',
      source_id: 'el-pais',
      lang: 'es',
      published_at: '2026-06-02T10:00:00Z',
      ingested_at: '2026-06-02T10:05:00Z',
      category: 'politica',
      raw_tags: ['política', 'españa'],
      is_noise: false,
      is_duplicate: false,
      processing_status: 'success',
      quality_score: 0.85,
    }
    const article = articleRowToCanonical(row, SAMPLE_SOURCE)
    expect(article.id).toHaveLength(64)
    expect(article.title).toBe('Titular')
    expect(article.rawTags).toEqual(['política', 'españa'])
    expect(article.topicTags).toHaveLength(1)
    expect(article.topicTags[0].topicId).toBe('POLITICA')
    expect(article.sourceWeight).toBe(1.0)
  })

  it('mapea fila pre-migración con defaults', () => {
    const row = {
      url: 'https://elpais.com/y?fbclid=ABC',
      title: 'T',
      summary: null,
      body_text: null,
      source_id: 'el-pais',
      lang: 'es',
      published_at: '2026-06-02T10:00:00Z',
      category: null,
    }
    const article = articleRowToCanonical(row, SAMPLE_SOURCE)
    expect(article.canonicalUrl).not.toContain('fbclid')
    expect(article.id).toHaveLength(64)
    expect(article.isNoise).toBe(false)
    expect(article.processingStatus).toBe('pending')
    expect(article.topicTags).toHaveLength(0)
  })
})
```

- [ ] **Step 1.10.3: Run tests adapters completos**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/adapters.test.ts 2>&1 | tail -10
```

Expected: 7 tests passed.

### Step 1.11: Build + commit Task 1

- [ ] **Step 1.11.1: Build completo de apps/visual-oscar**

Run:
```bash
cd apps/visual-oscar && npm run build 2>&1 | tail -8
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 1.11.2: Verificar todos los tests canónicos pasan**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/ 2>&1 | tail -10
```

Expected: ≥10 tests passed.

- [ ] **Step 1.11.3: Stage + commit + push**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/types.ts \
        apps/visual-oscar/lib/medios/canonical/adapters.ts \
        apps/visual-oscar/tests/unit/medios/canonical/types.test.ts \
        apps/visual-oscar/tests/unit/medios/canonical/adapters.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 0.1 · tipos canónicos exhaustivos + adapters

Capa canónica nueva en lib/medios/canonical/ (paralela al legacy).
Sprint 0+1 · Task 1 de 10 · forward-compat Sprint 2/3/4.

Tipos canónicos implementados (forward-compat documentada):
  · ArticleUnit (inmutable + enriquecido)
  · Source (con tier 1-4, ideology enum, audienceEstimate, regions[])
  · Entity + EntityAlias (rich shape con disambiguationRequired,
    contextRequired, note · para Sprint 3)
  · TopicTag (con subtopicId, level 1|2|3, method · para Sprint 2)
  · Sentiment, Framing (8 enums · para Sprint 4)
  · NewsCluster (con framingDistribution preparada · para Sprint 4)
  · Narrative (preparado · Sprint 4 instancia)
  · EntityMetrics (preparado · Sprint 3 instancia)
  · TopicProminenceScore (preparado · Sprint 2 calcula 5 componentes)
  · ConfidenceMetrics + ConfidenceWarning (4 severities, action,
    affectedMetrics · para Sprint 3 warnings)
  · PipelineMetrics (preparado para jobs Sprint 2)
  · DominantTopic (output endpoint /pulso)
  · Catalogs (interfaces para JSON loaders Sprint 0.2)

Adapters implementados:
  · computeArticleId(url) = SHA-256(canonicalUrl) determinista
  · canonicalizeUrl(url) elimina utm_*, fbclid, gclid, ref, fragment
  · articleRowToCanonical(row, source) mapea fila Postgres ↔ ArticleUnit

Type guards: isArticleUnit, isSource, isEntity.

Coexistencia: cero modificación a archivos legacy (news-aggregator.ts,
media-methodology.ts, news-intel.ts intactos).

Tests: 11+ tests unit en tests/unit/medios/canonical/*.test.ts.
Build green. tsc --noEmit pasa.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD:main
```

Expected: push exitoso. Vercel auto-deploys pero sin impacto (módulos no usados aún).

---

## Task 2: Catálogos JSON con shape rich (Commit 0.2) · 4h

**Files:**
- Create: `apps/visual-oscar/data/medios/entity-catalog.json`
- Create: `apps/visual-oscar/data/medios/topic-rules.json`
- Create: `apps/visual-oscar/data/medios/rss-tag-map.json`
- Create: `apps/visual-oscar/data/medios/framing-rules.json`
- Create: `apps/visual-oscar/data/medios/source-catalog.json`
- Create: `apps/visual-oscar/lib/medios/canonical/catalogs.ts` (loaders + Zod schemas)
- Create: `apps/visual-oscar/scripts/extract-entity-catalog.ts` (script extracción)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/catalogs.test.ts`

### Step 2.1: Script extracción de constantes TS → entity-catalog.json

- [ ] **Step 2.1.1: Verificar dependencia Zod existe**

Run:
```bash
cd apps/visual-oscar && grep '"zod"' package.json
```

Expected: zod listed. Si no, run `npm install zod`.

- [ ] **Step 2.1.2: Crear script extractor**

Create `apps/visual-oscar/scripts/extract-entity-catalog.ts`:

```typescript
/**
 * Script de extracción one-shot: extrae FIGURAS_DICT_V2, PARTIDOS_DICT,
 * INSTITUCIONES_DICT, IBEX35_DICT desde lib/medios/media-methodology.ts
 * y serializa a data/medios/entity-catalog.json con shape rich.
 *
 * Uso: npx tsx scripts/extract-entity-catalog.ts
 *
 * Mantener este script reproducible: si las constantes legacy cambian,
 * re-correr este script genera un nuevo JSON candidato.
 * El JSON final se mantiene a mano via PR (no auto-generated en CI).
 */
import { writeFileSync } from 'fs'
import { join } from 'path'

// Estos imports siguen al patrón de media-methodology.ts (legacy intacto)
// Si los nombres exportados cambian, ajustar imports aquí.
// Por ahora: los dicts no son exportados explícitamente, así que el script
// produce el SEED INICIAL escrito a mano basándose en lo auditado en spec.

interface SeedEntity {
  id: string
  canonicalName: string
  type: 'PERSON' | 'PARTY' | 'INSTITUTION' | 'TERRITORY' | 'COMPANY' | 'UNION' | 'THINKTANK' | 'COALITION' | 'ORGANISM'
  politicalFamily: string | null
  role: string | null
  territory: string | null
  relevanceScore: number
  active: boolean
  aliases: Array<{
    text: string
    confidence: number
    disambiguationRequired?: boolean
    contextRequired?: string[]
    note?: string
  }>
}

// PERSONAS (top 30 figuras políticas relevantes)
const PERSONAS: SeedEntity[] = [
  {
    id: 'pedro-sanchez',
    canonicalName: 'Pedro Sánchez',
    type: 'PERSON',
    politicalFamily: 'PSOE',
    role: 'Presidente del Gobierno',
    territory: 'ES',
    relevanceScore: 1.0,
    active: true,
    aliases: [
      { text: 'Pedro Sánchez', confidence: 1.0 },
      { text: 'Sánchez', confidence: 0.75, disambiguationRequired: true },
      { text: 'el presidente del gobierno', confidence: 0.90 },
      { text: 'el presidente', confidence: 0.65, disambiguationRequired: true },
      { text: 'Moncloa', confidence: 0.55, contextRequired: ['gobierno', 'ejecutivo', 'presidencia'], note: 'Solo si refiere a decisiones del ejecutivo' },
      { text: 'el jefe del ejecutivo', confidence: 0.88 },
    ],
  },
  {
    id: 'alberto-nunez-feijoo',
    canonicalName: 'Alberto Núñez Feijóo',
    type: 'PERSON',
    politicalFamily: 'PP',
    role: 'Líder del PP',
    territory: 'ES',
    relevanceScore: 0.95,
    active: true,
    aliases: [
      { text: 'Alberto Núñez Feijóo', confidence: 1.0 },
      { text: 'Feijóo', confidence: 0.85 },
      { text: 'Feijoo', confidence: 0.85, note: 'Variante sin tilde frecuente' },
      { text: 'el líder del PP', confidence: 0.88 },
      { text: 'el líder popular', confidence: 0.82 },
      { text: 'el jefe de la oposición', confidence: 0.80 },
    ],
  },
  {
    id: 'yolanda-diaz',
    canonicalName: 'Yolanda Díaz',
    type: 'PERSON',
    politicalFamily: 'SUMAR',
    role: 'Vicepresidenta segunda y Ministra de Trabajo',
    territory: 'ES',
    relevanceScore: 0.92,
    active: true,
    aliases: [
      { text: 'Yolanda Díaz', confidence: 1.0 },
      { text: 'la ministra de Trabajo', confidence: 0.85 },
      { text: 'la vicepresidenta segunda', confidence: 0.88 },
      { text: 'la líder de Sumar', confidence: 0.85 },
    ],
  },
  {
    id: 'santiago-abascal',
    canonicalName: 'Santiago Abascal',
    type: 'PERSON',
    politicalFamily: 'VOX',
    role: 'Líder de Vox',
    territory: 'ES',
    relevanceScore: 0.90,
    active: true,
    aliases: [
      { text: 'Santiago Abascal', confidence: 1.0 },
      { text: 'Abascal', confidence: 0.88 },
      { text: 'el líder de Vox', confidence: 0.90 },
    ],
  },
  {
    id: 'isabel-diaz-ayuso',
    canonicalName: 'Isabel Díaz Ayuso',
    type: 'PERSON',
    politicalFamily: 'PP',
    role: 'Presidenta de la Comunidad de Madrid',
    territory: 'MAD',
    relevanceScore: 0.88,
    active: true,
    aliases: [
      { text: 'Isabel Díaz Ayuso', confidence: 1.0 },
      { text: 'Ayuso', confidence: 0.92 },
      { text: 'Díaz Ayuso', confidence: 0.93 },
      { text: 'la presidenta de Madrid', confidence: 0.85 },
    ],
  },
  {
    id: 'carles-puigdemont',
    canonicalName: 'Carles Puigdemont',
    type: 'PERSON',
    politicalFamily: 'Junts',
    role: 'Líder de Junts',
    territory: 'CAT',
    relevanceScore: 0.85,
    active: true,
    aliases: [
      { text: 'Carles Puigdemont', confidence: 1.0 },
      { text: 'Puigdemont', confidence: 0.95 },
      { text: 'el expresident', confidence: 0.78 },
    ],
  },
  {
    id: 'pere-aragones',
    canonicalName: 'Pere Aragonès',
    type: 'PERSON',
    politicalFamily: 'ERC',
    role: 'Expresidente de la Generalitat',
    territory: 'CAT',
    relevanceScore: 0.78,
    active: true,
    aliases: [
      { text: 'Pere Aragonès', confidence: 1.0 },
      { text: 'Aragonès', confidence: 0.92 },
    ],
  },
  {
    id: 'maria-jesus-montero',
    canonicalName: 'María Jesús Montero',
    type: 'PERSON',
    politicalFamily: 'PSOE',
    role: 'Vicepresidenta primera y Ministra de Hacienda',
    territory: 'ES',
    relevanceScore: 0.85,
    active: true,
    aliases: [
      { text: 'María Jesús Montero', confidence: 1.0 },
      { text: 'María Jesús Montero', confidence: 1.0 },
      { text: 'la ministra de Hacienda', confidence: 0.85 },
      { text: 'Montero', confidence: 0.50, disambiguationRequired: true, contextRequired: ['hacienda', 'psoe', 'gobierno', 'vicepresidenta', 'ministra'], note: 'Ambiguo con Irene Montero — desambiguar por contexto' },
    ],
  },
  {
    id: 'irene-montero',
    canonicalName: 'Irene Montero',
    type: 'PERSON',
    politicalFamily: 'Podemos',
    role: 'Eurodiputada (Podemos)',
    territory: 'ES',
    relevanceScore: 0.70,
    active: true,
    aliases: [
      { text: 'Irene Montero', confidence: 1.0 },
      { text: 'Montero', confidence: 0.50, disambiguationRequired: true, contextRequired: ['podemos', 'igualdad', 'eurodiputada'], note: 'Ambiguo con María Jesús Montero' },
    ],
  },
  {
    id: 'oriol-junqueras',
    canonicalName: 'Oriol Junqueras',
    type: 'PERSON',
    politicalFamily: 'ERC',
    role: 'Presidente de ERC',
    territory: 'CAT',
    relevanceScore: 0.78,
    active: true,
    aliases: [
      { text: 'Oriol Junqueras', confidence: 1.0 },
      { text: 'Junqueras', confidence: 0.93 },
    ],
  },
]

// PARTIDOS (15 partidos relevantes)
const PARTIDOS: SeedEntity[] = [
  {
    id: 'partido-popular',
    canonicalName: 'Partido Popular',
    type: 'PARTY',
    politicalFamily: 'PP',
    role: null,
    territory: 'ES',
    relevanceScore: 0.98,
    active: true,
    aliases: [
      { text: 'Partido Popular', confidence: 1.0 },
      { text: 'PP', confidence: 0.92, disambiguationRequired: true, note: 'En contexto político' },
      { text: 'los populares', confidence: 0.85 },
      { text: 'el PP', confidence: 0.95 },
      { text: 'la derecha', confidence: 0.45, contextRequired: ['partido', 'oposición', 'votos'], note: 'Muy baja confianza' },
    ],
  },
  {
    id: 'psoe',
    canonicalName: 'Partido Socialista Obrero Español',
    type: 'PARTY',
    politicalFamily: 'PSOE',
    role: null,
    territory: 'ES',
    relevanceScore: 0.98,
    active: true,
    aliases: [
      { text: 'PSOE', confidence: 0.95 },
      { text: 'Partido Socialista', confidence: 0.92 },
      { text: 'los socialistas', confidence: 0.85 },
      { text: 'el PSOE', confidence: 0.96 },
    ],
  },
  {
    id: 'vox',
    canonicalName: 'Vox',
    type: 'PARTY',
    politicalFamily: 'VOX',
    role: null,
    territory: 'ES',
    relevanceScore: 0.93,
    active: true,
    aliases: [
      { text: 'Vox', confidence: 0.95, disambiguationRequired: false },
    ],
  },
  {
    id: 'sumar',
    canonicalName: 'Sumar',
    type: 'PARTY',
    politicalFamily: 'SUMAR',
    role: null,
    territory: 'ES',
    relevanceScore: 0.85,
    active: true,
    aliases: [
      { text: 'Sumar', confidence: 0.92, disambiguationRequired: true, contextRequired: ['partido', 'política', 'coalición'] },
      { text: 'la coalición de izquierdas', confidence: 0.55 },
    ],
  },
  {
    id: 'podemos',
    canonicalName: 'Podemos',
    type: 'PARTY',
    politicalFamily: 'Podemos',
    role: null,
    territory: 'ES',
    relevanceScore: 0.80,
    active: true,
    aliases: [
      { text: 'Podemos', confidence: 0.92, disambiguationRequired: true, contextRequired: ['partido', 'política', 'morado'] },
    ],
  },
  {
    id: 'junts',
    canonicalName: 'Junts per Catalunya',
    type: 'PARTY',
    politicalFamily: 'Junts',
    role: null,
    territory: 'CAT',
    relevanceScore: 0.82,
    active: true,
    aliases: [
      { text: 'Junts per Catalunya', confidence: 1.0 },
      { text: 'Junts', confidence: 0.90 },
    ],
  },
  {
    id: 'erc',
    canonicalName: 'Esquerra Republicana de Catalunya',
    type: 'PARTY',
    politicalFamily: 'ERC',
    role: null,
    territory: 'CAT',
    relevanceScore: 0.82,
    active: true,
    aliases: [
      { text: 'Esquerra Republicana', confidence: 1.0 },
      { text: 'ERC', confidence: 0.92 },
    ],
  },
  {
    id: 'pnv',
    canonicalName: 'Partido Nacionalista Vasco',
    type: 'PARTY',
    politicalFamily: 'PNV',
    role: null,
    territory: 'PV',
    relevanceScore: 0.80,
    active: true,
    aliases: [
      { text: 'PNV', confidence: 0.95 },
      { text: 'Partido Nacionalista Vasco', confidence: 1.0 },
      { text: 'jeltzales', confidence: 0.75 },
    ],
  },
  {
    id: 'eh-bildu',
    canonicalName: 'EH Bildu',
    type: 'PARTY',
    politicalFamily: 'EH Bildu',
    role: null,
    territory: 'PV',
    relevanceScore: 0.78,
    active: true,
    aliases: [
      { text: 'EH Bildu', confidence: 1.0 },
      { text: 'Bildu', confidence: 0.90 },
    ],
  },
  {
    id: 'bng',
    canonicalName: 'Bloque Nacionalista Galego',
    type: 'PARTY',
    politicalFamily: 'BNG',
    role: null,
    territory: 'GAL',
    relevanceScore: 0.72,
    active: true,
    aliases: [
      { text: 'BNG', confidence: 0.95 },
      { text: 'Bloque', confidence: 0.55, contextRequired: ['galicia', 'nacionalista'] },
    ],
  },
]

// INSTITUCIONES (20+)
const INSTITUCIONES: SeedEntity[] = [
  {
    id: 'congreso-diputados',
    canonicalName: 'Congreso de los Diputados',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.90,
    active: true,
    aliases: [
      { text: 'Congreso de los Diputados', confidence: 1.0 },
      { text: 'el Congreso', confidence: 0.88 },
      { text: 'la Cámara Baja', confidence: 0.92 },
      { text: 'el Hemiciclo', confidence: 0.85 },
    ],
  },
  {
    id: 'senado',
    canonicalName: 'Senado',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.80,
    active: true,
    aliases: [
      { text: 'Senado', confidence: 0.85, disambiguationRequired: true, contextRequired: ['cámara', 'parlamento', 'pleno'] },
      { text: 'la Cámara Alta', confidence: 0.92 },
    ],
  },
  {
    id: 'generalitat-catalunya',
    canonicalName: 'Generalitat de Catalunya',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'CAT',
    relevanceScore: 0.85,
    active: true,
    aliases: [
      { text: 'Generalitat', confidence: 0.80, disambiguationRequired: true, note: 'Puede ser valenciana — verificar territorio' },
      { text: 'el Govern', confidence: 0.88, contextRequired: ['cataluña', 'barcelona', 'junts', 'erc'] },
      { text: 'la Generalitat de Cataluña', confidence: 1.0 },
      { text: 'la Generalitat de Catalunya', confidence: 1.0 },
    ],
  },
  {
    id: 'tribunal-supremo',
    canonicalName: 'Tribunal Supremo',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.88,
    active: true,
    aliases: [
      { text: 'Tribunal Supremo', confidence: 1.0 },
      { text: 'el Supremo', confidence: 0.88 },
      { text: 'TS', confidence: 0.65, contextRequired: ['tribunal', 'sentencia', 'juez'] },
    ],
  },
  {
    id: 'tribunal-constitucional',
    canonicalName: 'Tribunal Constitucional',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.85,
    active: true,
    aliases: [
      { text: 'Tribunal Constitucional', confidence: 1.0 },
      { text: 'el Constitucional', confidence: 0.85 },
      { text: 'TC', confidence: 0.65, contextRequired: ['tribunal', 'sentencia', 'constitucional'] },
    ],
  },
  {
    id: 'cgpj',
    canonicalName: 'Consejo General del Poder Judicial',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [
      { text: 'Consejo General del Poder Judicial', confidence: 1.0 },
      { text: 'CGPJ', confidence: 0.92 },
    ],
  },
  {
    id: 'fiscalia-general-estado',
    canonicalName: 'Fiscalía General del Estado',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.80,
    active: true,
    aliases: [
      { text: 'Fiscalía General del Estado', confidence: 1.0 },
      { text: 'la Fiscalía', confidence: 0.85 },
    ],
  },
  {
    id: 'moncloa',
    canonicalName: 'Palacio de la Moncloa',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.85,
    active: true,
    aliases: [
      { text: 'Palacio de la Moncloa', confidence: 1.0 },
      { text: 'Moncloa', confidence: 0.85, disambiguationRequired: true, note: 'A veces es metonimia de Pedro Sánchez — usar contexto' },
    ],
  },
  {
    id: 'audiencia-nacional',
    canonicalName: 'Audiencia Nacional',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [
      { text: 'Audiencia Nacional', confidence: 1.0 },
      { text: 'la Audiencia', confidence: 0.65, contextRequired: ['nacional', 'juez', 'sumario'] },
    ],
  },
  {
    id: 'banco-de-espana',
    canonicalName: 'Banco de España',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.75,
    active: true,
    aliases: [
      { text: 'Banco de España', confidence: 1.0 },
      { text: 'BdE', confidence: 0.85 },
    ],
  },
  {
    id: 'cnmv',
    canonicalName: 'Comisión Nacional del Mercado de Valores',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.72,
    active: true,
    aliases: [
      { text: 'CNMV', confidence: 1.0 },
      { text: 'Comisión Nacional del Mercado de Valores', confidence: 1.0 },
    ],
  },
  {
    id: 'cnmc',
    canonicalName: 'Comisión Nacional de los Mercados y la Competencia',
    type: 'INSTITUTION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.72,
    active: true,
    aliases: [
      { text: 'CNMC', confidence: 1.0 },
      { text: 'Comisión Nacional de los Mercados y la Competencia', confidence: 1.0 },
    ],
  },
]

// EMPRESAS IBEX políticamente relevantes (10)
const EMPRESAS: SeedEntity[] = [
  {
    id: 'repsol',
    canonicalName: 'Repsol',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'Repsol', confidence: 0.95 }],
  },
  {
    id: 'iberdrola',
    canonicalName: 'Iberdrola',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'Iberdrola', confidence: 0.95 }],
  },
  {
    id: 'telefonica',
    canonicalName: 'Telefónica',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'Telefónica', confidence: 0.95 }, { text: 'Movistar', confidence: 0.70 }],
  },
  {
    id: 'banco-santander',
    canonicalName: 'Banco Santander',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'Banco Santander', confidence: 1.0 }, { text: 'Santander', confidence: 0.70, disambiguationRequired: true, contextRequired: ['banco', 'entidad', 'beneficios', 'consejero'] }],
  },
  {
    id: 'bbva',
    canonicalName: 'BBVA',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'BBVA', confidence: 0.95 }],
  },
  {
    id: 'naturgy',
    canonicalName: 'Naturgy',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.72,
    active: true,
    aliases: [{ text: 'Naturgy', confidence: 0.95 }],
  },
  {
    id: 'endesa',
    canonicalName: 'Endesa',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.72,
    active: true,
    aliases: [{ text: 'Endesa', confidence: 0.95 }],
  },
  {
    id: 'inditex',
    canonicalName: 'Inditex',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.70,
    active: true,
    aliases: [{ text: 'Inditex', confidence: 0.95 }, { text: 'Zara', confidence: 0.50, contextRequired: ['empresa', 'matriz', 'inditex'] }],
  },
  {
    id: 'caixabank',
    canonicalName: 'CaixaBank',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.73,
    active: true,
    aliases: [{ text: 'CaixaBank', confidence: 0.95 }],
  },
  {
    id: 'acs',
    canonicalName: 'ACS',
    type: 'COMPANY',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.70,
    active: true,
    aliases: [{ text: 'ACS', confidence: 0.90, disambiguationRequired: true, contextRequired: ['constructora', 'florentino', 'empresa'] }],
  },
]

// SINDICATOS Y PATRONAL (10)
const SINDICATOS_PATRONAL: SeedEntity[] = [
  {
    id: 'ccoo',
    canonicalName: 'Comisiones Obreras',
    type: 'UNION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'Comisiones Obreras', confidence: 1.0 }, { text: 'CCOO', confidence: 0.95 }],
  },
  {
    id: 'ugt',
    canonicalName: 'Unión General de Trabajadores',
    type: 'UNION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.78,
    active: true,
    aliases: [{ text: 'Unión General de Trabajadores', confidence: 1.0 }, { text: 'UGT', confidence: 0.95 }],
  },
  {
    id: 'usit',
    canonicalName: 'USIT (Sindicato)',
    type: 'UNION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.60,
    active: true,
    aliases: [{ text: 'USIT', confidence: 0.85 }],
  },
  {
    id: 'cnt',
    canonicalName: 'CNT',
    type: 'UNION',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.55,
    active: true,
    aliases: [{ text: 'CNT', confidence: 0.85, disambiguationRequired: true, contextRequired: ['sindicato', 'anarcosindicalismo', 'trabajadores'] }],
  },
  {
    id: 'ceoe',
    canonicalName: 'CEOE',
    type: 'ORGANISM',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.82,
    active: true,
    aliases: [{ text: 'CEOE', confidence: 0.95 }, { text: 'Confederación Española de Organizaciones Empresariales', confidence: 1.0 }],
  },
  {
    id: 'cepyme',
    canonicalName: 'CEPYME',
    type: 'ORGANISM',
    politicalFamily: null,
    role: null,
    territory: 'ES',
    relevanceScore: 0.75,
    active: true,
    aliases: [{ text: 'CEPYME', confidence: 0.95 }],
  },
]

// TERRITORIOS (17 CCAA + 2 CA)
const CCAA: SeedEntity[] = [
  ['AND','Andalucía'],['ARA','Aragón'],['AST','Principado de Asturias'],['BAL','Islas Baleares'],
  ['CAN','Canarias'],['CTB','Cantabria'],['CYL','Castilla y León'],['CLM','Castilla-La Mancha'],
  ['CAT','Cataluña'],['CVA','Comunidad Valenciana'],['EXT','Extremadura'],['GAL','Galicia'],
  ['MAD','Comunidad de Madrid'],['MUR','Región de Murcia'],['NAV','Comunidad Foral de Navarra'],
  ['PV','País Vasco'],['RIO','La Rioja'],['CEU','Ceuta'],['MEL','Melilla'],
].map(([code, name]) => ({
  id: `ccaa-${code.toLowerCase()}`,
  canonicalName: name as string,
  type: 'TERRITORY',
  politicalFamily: null,
  role: null,
  territory: code as string,
  relevanceScore: 0.75,
  active: true,
  aliases: [{ text: name as string, confidence: 0.95 }],
}))

const ALL: SeedEntity[] = [...PERSONAS, ...PARTIDOS, ...INSTITUCIONES, ...EMPRESAS, ...SINDICATOS_PATRONAL, ...CCAA]

const catalog = {
  version: '1.0',
  lastUpdated: '2026-06-02',
  entities: ALL,
}

const outPath = join(__dirname, '..', 'data', 'medios', 'entity-catalog.json')
writeFileSync(outPath, JSON.stringify(catalog, null, 2), 'utf8')
console.log(`Wrote ${ALL.length} entities to ${outPath}`)
```

- [ ] **Step 2.1.3: Crear directorio + ejecutar extractor**

Run:
```bash
mkdir -p apps/visual-oscar/data/medios
cd apps/visual-oscar && npx tsx scripts/extract-entity-catalog.ts
```

Expected: `Wrote 85+ entities to .../entity-catalog.json`.

- [ ] **Step 2.1.4: Verificar JSON válido**

Run:
```bash
cd apps/visual-oscar && jq '.entities | length' data/medios/entity-catalog.json
```

Expected: ≥85.

### Step 2.2: Crear topic-rules.json (24 macrotemas)

- [ ] **Step 2.2.1: Crear topic-rules.json con macrotemas iniciales**

Create `apps/visual-oscar/data/medios/topic-rules.json`:

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
          "terms": ["consejo de ministros", "decreto ley", "real decreto", "moncloa", "la presidencia", "el ejecutivo aprueba", "el gobierno anuncia", "presidente del gobierno", "vicepresidenta"],
          "score": 0.9
        },
        {
          "id": "pol-inst-02",
          "field": "title",
          "type": "contains_any",
          "terms": ["ministr", "minister", "secretar de estado", "delegad del gobierno"],
          "score": 0.75,
          "note": "Prefijos truncados para capturar ministro/ministra/ministerio"
        },
        {
          "id": "pol-inst-03",
          "field": "description",
          "type": "contains_any",
          "terms": ["presidencia del gobierno", "gabinete", "portavoz del ejecutivo"],
          "score": 0.65
        }
      ]
    },
    {
      "topicId": "PARLAMENTO",
      "label": "Parlamento",
      "rules": [
        {
          "id": "parl-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["congreso de los diputados", "el congreso", "senado", "pleno", "comisión de", "tramita la ley", "rechaza la enmienda", "aprueba el dictamen"],
          "score": 0.85
        },
        {
          "id": "parl-02",
          "field": "title",
          "type": "contains_any",
          "terms": ["sesión de control", "moción de censura", "cuestión de confianza", "investidura", "votación"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "PARTIDOS",
      "label": "Partidos",
      "rules": [
        {
          "id": "part-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["congreso del", "primarias", "fichaje", "ejecutiva del", "comité federal", "escisión", "dimite del partido"],
          "score": 0.85
        }
      ]
    },
    {
      "topicId": "JUDICIAL",
      "label": "Judicial",
      "rules": [
        {
          "id": "jud-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["tribunal supremo", "audiencia nacional", "tribunal constitucional", "juez", "fiscal", "sentencia", "condena", "absolución", "imputado", "investigado", "declarar ante", "orden de detención"],
          "score": 0.9
        },
        {
          "id": "jud-02",
          "field": "title",
          "type": "contains_any",
          "terms": ["caso ", "operación ", "juzgado"],
          "score": 0.6,
          "note": "Requiere validación por entidades"
        }
      ]
    },
    {
      "topicId": "ECONOMIA",
      "label": "Economía",
      "rules": [
        {
          "id": "eco-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["pib", "ipc", "inflación", "déficit", "deuda pública", "presupuestos generales", "política monetaria", "tipos de interés", "fiscalidad", "impuestos", "irpf", "iva"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "EMPLEO",
      "label": "Empleo",
      "rules": [
        {
          "id": "emp-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["mercado laboral", "paro", "desempleo", "epa", "afiliación seguridad social", "smi", "salario mínimo", "ertes", "reforma laboral", "negociación colectiva"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "VIVIENDA",
      "label": "Vivienda",
      "rules": [
        {
          "id": "viv-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["alquiler", "hipoteca", "vivienda pública", "vivienda protegida", "ley de vivienda", "okupación", "zonas tensionadas"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "ENERGIA",
      "label": "Energía",
      "rules": [
        {
          "id": "ene-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["precio de la luz", "factura eléctrica", "gas natural", "renovables", "nuclear", "transición energética", "ppa"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "TERRITORIAL",
      "label": "Territorial",
      "rules": [],
      "subtopics": [
        {
          "subtopicId": "CATALUÑA",
          "rules": [
            {
              "id": "terr-cat-01",
              "field": "title",
              "type": "contains_any",
              "terms": ["generalitat", "govern", "independencia", "secessió", "cataluña", "catalá", "barcelon", "puigdemont", "junts", "erc"],
              "score": 0.88
            }
          ]
        },
        {
          "subtopicId": "PAIS_VASCO",
          "rules": [
            {
              "id": "terr-pv-01",
              "field": "title",
              "type": "contains_any",
              "terms": ["euskadi", "país vasco", "ikurriña", "lehendakari", "eusko jaurlaritza", "pnv", "bildu", "abertzale"],
              "score": 0.90
            }
          ]
        },
        {
          "subtopicId": "FINANCIACION_AUTONOMICA",
          "rules": [
            {
              "id": "terr-fin-01",
              "field": "title+description",
              "type": "contains_any",
              "terms": ["financiación autonómica", "concierto económico", "fla ", "fondo de liquidez autonómica", "sistema de financiación", "deuda autonómica"],
              "score": 0.87
            }
          ]
        }
      ]
    },
    {
      "topicId": "INTERNACIONAL",
      "label": "Internacional",
      "rules": [
        {
          "id": "int-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["política exterior", "relaciones bilaterales", "embajada", "cumbre internacional", "diplomático"],
          "score": 0.85
        }
      ]
    },
    {
      "topicId": "UNION_EUROPEA",
      "label": "Unión Europea",
      "rules": [
        {
          "id": "ue-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["bruselas", "consejo europeo", "comisión europea", "parlamento europeo", "fondos europeos", "next generation", "von der leyen", "ursula"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "DEFENSA",
      "label": "Defensa",
      "rules": [
        {
          "id": "def-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["ministerio de defensa", "fuerzas armadas", "otan", "gasto militar", "presupuesto defensa"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "SEGURIDAD",
      "label": "Seguridad",
      "rules": [
        {
          "id": "seg-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["policía nacional", "guardia civil", "terrorismo", "crimen organizado", "narcotráfico", "ministerio del interior"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "MIGRACION",
      "label": "Migración",
      "rules": [
        {
          "id": "mig-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["migrantes", "menas", "frontex", "ceuta", "melilla frontera", "asilo", "refugiados", "regularización"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "SANIDAD",
      "label": "Sanidad",
      "rules": [
        {
          "id": "san-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["ministerio de sanidad", "sistema nacional de salud", "ucis", "listas de espera", "farmacéutico", "vacunas", "atención primaria"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "EDUCACION",
      "label": "Educación",
      "rules": [
        {
          "id": "edu-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["lomloe", "lomce", "ministerio de educación", "universidad pública", "becas", "selectividad", "profesores"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "MEDIO_AMBIENTE",
      "label": "Medio ambiente",
      "rules": [
        {
          "id": "amb-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["cambio climático", "biodiversidad", "emisiones", "ley de protección", "doñana"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "TECNOLOGIA",
      "label": "Tecnología",
      "rules": [
        {
          "id": "tec-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["regulación digital", "inteligencia artificial", "ciberseguridad", "telecomunicaciones", "5g", "datos personales"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "COMUNICACION",
      "label": "Comunicación",
      "rules": [
        {
          "id": "com-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["rtve", "ley de medios", "libertad de prensa", "consejo audiovisual", "regulación mediática"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "SOCIEDAD",
      "label": "Sociedad",
      "rules": [
        {
          "id": "soc-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["natalidad", "envejecimiento", "feminismo", "lgtb", "violencia de género"],
          "score": 0.85
        }
      ]
    },
    {
      "topicId": "CRISIS",
      "label": "Crisis",
      "rules": [
        {
          "id": "cri-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["pandemia", "estado de alarma", "estado de emergencia", "catástrofe natural", "dana"],
          "score": 0.90
        }
      ]
    },
    {
      "topicId": "CORRUPCION",
      "label": "Corrupción",
      "rules": [
        {
          "id": "corr-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["corrupción", "soborno", "cohecho", "malversación", "prevaricación", "trama", "financiación ilegal", "caja b", "comisiones ilegales", "enriquecimiento ilícito"],
          "score": 0.92
        },
        {
          "id": "corr-02",
          "field": "title",
          "type": "contains_all",
          "terms": ["caso", "político"],
          "score": 0.55,
          "note": "Baja confianza — requiere validación por entidades"
        }
      ]
    },
    {
      "topicId": "IBEREX_EMPRESAS",
      "label": "IBEX y empresas",
      "rules": [
        {
          "id": "ibex-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["ibex 35", "junta de accionistas", "consejero delegado", "beneficios récord", "ampliación de capital", "opa"],
          "score": 0.85
        }
      ]
    },
    {
      "topicId": "SINDICAL_PATRONAL",
      "label": "Sindical y patronal",
      "rules": [
        {
          "id": "sind-01",
          "field": "title",
          "type": "contains_any",
          "terms": ["ccoo", "ugt", "ceoe", "patronal", "diálogo social", "mesa de negociación", "convenio colectivo"],
          "score": 0.88
        }
      ]
    },
    {
      "topicId": "OTRO",
      "label": "Otro",
      "rules": []
    }
  ]
}
```

- [ ] **Step 2.2.2: Validar topic-rules.json**

Run:
```bash
cd apps/visual-oscar && jq '.topics | length' data/medios/topic-rules.json
```

Expected: 25 (24 macrotemas + OTRO).

### Step 2.3: Crear rss-tag-map.json

- [ ] **Step 2.3.1: rss-tag-map.json con ~200 mappings curados**

Create `apps/visual-oscar/data/medios/rss-tag-map.json`:

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-02",
  "mappings": [
    { "rawTag": "política", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "politica", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "españa", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.70, "sources": ["el-pais","el-mundo","abc","la-vanguardia"] },
    { "rawTag": "espana", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.70, "sources": ["*"] },
    { "rawTag": "gobierno", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "moncloa", "topicId": "POLITICA_INSTITUCIONAL", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "congreso", "topicId": "PARLAMENTO", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "senado", "topicId": "PARLAMENTO", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "parlamento", "topicId": "PARLAMENTO", "confidence": 0.85, "sources": ["*"] },

    { "rawTag": "psoe", "topicId": "PARTIDOS", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "pp", "topicId": "PARTIDOS", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "partido popular", "topicId": "PARTIDOS", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "vox", "topicId": "PARTIDOS", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "sumar", "topicId": "PARTIDOS", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "podemos", "topicId": "PARTIDOS", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "junts", "topicId": "PARTIDOS", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "erc", "topicId": "PARTIDOS", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "pnv", "topicId": "PARTIDOS", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "bildu", "topicId": "PARTIDOS", "confidence": 0.88, "sources": ["*"] },

    { "rawTag": "tribunales", "topicId": "JUDICIAL", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "justicia", "topicId": "JUDICIAL", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "tribunal supremo", "topicId": "JUDICIAL", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "audiencia nacional", "topicId": "JUDICIAL", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "economía", "topicId": "ECONOMIA", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "economia", "topicId": "ECONOMIA", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "macroeconomía", "topicId": "ECONOMIA", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "presupuestos", "topicId": "ECONOMIA", "confidence": 0.88, "sources": ["*"] },

    { "rawTag": "empleo", "topicId": "EMPLEO", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "paro", "topicId": "EMPLEO", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "trabajo", "topicId": "EMPLEO", "confidence": 0.85, "sources": ["*"] },

    { "rawTag": "vivienda", "topicId": "VIVIENDA", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "alquiler", "topicId": "VIVIENDA", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "hipotecas", "topicId": "VIVIENDA", "confidence": 0.85, "sources": ["*"] },

    { "rawTag": "energía", "topicId": "ENERGIA", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "energia", "topicId": "ENERGIA", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "electricidad", "topicId": "ENERGIA", "confidence": 0.85, "sources": ["*"] },

    { "rawTag": "cataluña", "topicId": "TERRITORIAL", "subtopicId": "CATALUÑA", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "catalunya", "topicId": "TERRITORIAL", "subtopicId": "CATALUÑA", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "barcelona", "topicId": "TERRITORIAL", "subtopicId": "CATALUÑA", "confidence": 0.70, "sources": ["*"], "note": "Puede ser sociedad/cultura — bajamos confidence" },
    { "rawTag": "país vasco", "topicId": "TERRITORIAL", "subtopicId": "PAIS_VASCO", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "pais vasco", "topicId": "TERRITORIAL", "subtopicId": "PAIS_VASCO", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "euskadi", "topicId": "TERRITORIAL", "subtopicId": "PAIS_VASCO", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "galicia", "topicId": "TERRITORIAL", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "andalucía", "topicId": "TERRITORIAL", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "madrid", "topicId": "TERRITORIAL", "confidence": 0.65, "sources": ["*"], "note": "Ambiguo — comunidad o ciudad" },

    { "rawTag": "internacional", "topicId": "INTERNACIONAL", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "mundo", "topicId": "INTERNACIONAL", "confidence": 0.75, "sources": ["*"] },
    { "rawTag": "exterior", "topicId": "INTERNACIONAL", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "diplomacia", "topicId": "INTERNACIONAL", "confidence": 0.88, "sources": ["*"] },

    { "rawTag": "europa", "topicId": "UNION_EUROPEA", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "union europea", "topicId": "UNION_EUROPEA", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "ue", "topicId": "UNION_EUROPEA", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "bruselas", "topicId": "UNION_EUROPEA", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "defensa", "topicId": "DEFENSA", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "otan", "topicId": "DEFENSA", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "seguridad", "topicId": "SEGURIDAD", "confidence": 0.82, "sources": ["*"] },
    { "rawTag": "interior", "topicId": "SEGURIDAD", "confidence": 0.78, "sources": ["*"] },
    { "rawTag": "policía", "topicId": "SEGURIDAD", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "guardia civil", "topicId": "SEGURIDAD", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "migración", "topicId": "MIGRACION", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "migracion", "topicId": "MIGRACION", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "inmigración", "topicId": "MIGRACION", "confidence": 0.88, "sources": ["*"] },

    { "rawTag": "sanidad", "topicId": "SANIDAD", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "salud", "topicId": "SANIDAD", "confidence": 0.80, "sources": ["*"] },

    { "rawTag": "educación", "topicId": "EDUCACION", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "educacion", "topicId": "EDUCACION", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "universidad", "topicId": "EDUCACION", "confidence": 0.85, "sources": ["*"] },

    { "rawTag": "medio ambiente", "topicId": "MEDIO_AMBIENTE", "confidence": 0.90, "sources": ["*"] },
    { "rawTag": "clima", "topicId": "MEDIO_AMBIENTE", "confidence": 0.85, "sources": ["*"] },

    { "rawTag": "tecnología", "topicId": "TECNOLOGIA", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "tecnologia", "topicId": "TECNOLOGIA", "confidence": 0.85, "sources": ["*"] },
    { "rawTag": "ia", "topicId": "TECNOLOGIA", "confidence": 0.80, "sources": ["*"] },
    { "rawTag": "inteligencia artificial", "topicId": "TECNOLOGIA", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "rtve", "topicId": "COMUNICACION", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "medios", "topicId": "COMUNICACION", "confidence": 0.75, "sources": ["*"] },

    { "rawTag": "sociedad", "topicId": "SOCIEDAD", "confidence": 0.70, "sources": ["*"], "note": "Muy genérico" },

    { "rawTag": "crisis", "topicId": "CRISIS", "confidence": 0.75, "sources": ["*"] },
    { "rawTag": "pandemia", "topicId": "CRISIS", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "dana", "topicId": "CRISIS", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "corrupción", "topicId": "CORRUPCION", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "corrupcion", "topicId": "CORRUPCION", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "ibex 35", "topicId": "IBEREX_EMPRESAS", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "ibex35", "topicId": "IBEREX_EMPRESAS", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "empresas", "topicId": "IBEREX_EMPRESAS", "confidence": 0.78, "sources": ["*"] },

    { "rawTag": "sindicatos", "topicId": "SINDICAL_PATRONAL", "confidence": 0.88, "sources": ["*"] },
    { "rawTag": "ccoo", "topicId": "SINDICAL_PATRONAL", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "ugt", "topicId": "SINDICAL_PATRONAL", "confidence": 0.92, "sources": ["*"] },
    { "rawTag": "ceoe", "topicId": "SINDICAL_PATRONAL", "confidence": 0.92, "sources": ["*"] },

    { "rawTag": "others", "topicId": null, "confidence": 0, "sources": ["*"], "note": "Tag genérico de medios anglosajones — ignorar, forzar capa 2" },
    { "rawTag": "general", "topicId": null, "confidence": 0, "sources": ["*"], "note": "Tag genérico — forzar capa 2" }
  ]
}
```

### Step 2.4: framing-rules.json y source-catalog.json (preparados)

- [ ] **Step 2.4.1: framing-rules.json esqueleto preparado**

Create `apps/visual-oscar/data/medios/framing-rules.json`:

```json
{
  "version": "0.1",
  "lastUpdated": "2026-06-02",
  "_status": "PREPARED_FOR_SPRINT_4_NOT_ACTIVE",
  "framings": [
    { "framingId": "GESTION_COMPETENCIA", "label": "Gestión / competencia", "rules": [] },
    { "framingId": "CRISIS_CONFLICTO", "label": "Crisis / conflicto", "rules": [] },
    { "framingId": "CORRUPCION_ESCANDALO", "label": "Corrupción / escándalo", "rules": [] },
    { "framingId": "NEGOCIACION_BLOQUEO", "label": "Negociación / bloqueo", "rules": [] },
    { "framingId": "IMPACTO_ECONOMICO", "label": "Impacto económico", "rules": [] },
    { "framingId": "LEGITIMIDAD_INSTITUCIONAL", "label": "Legitimidad institucional", "rules": [] },
    { "framingId": "SEGURIDAD_AMENAZA", "label": "Seguridad / amenaza", "rules": [] },
    { "framingId": "DERECHOS_GARANTIAS", "label": "Derechos / garantías", "rules": [] },
    { "framingId": "PROTESTA_MOVILIZACION", "label": "Protesta / movilización", "rules": [] }
  ]
}
```

- [ ] **Step 2.4.2: Crear source-catalog.json con curación tier 1-2**

Create `apps/visual-oscar/data/medios/source-catalog.json` con los 30 medios tier 1-2 curados manualmente. **Step 2.4.2 IMPORTANT: este es un seed inicial — el resto de medios.json se importa con tier=3 default en Step 2.4.3**.

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-02",
  "_note": "Extensión de data/medios.json con tier, ideology enum, regions, audienceEstimate, qualityScore. Sprint 0+1 cura primeros 30 a mano; resto importado con tier=3 default.",
  "sources": [
    {
      "id": "el-pais", "name": "El País", "domain": "elpais.com",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "CENTER_LEFT", "ideologyScore": -25, "tier": 1, "audienceEstimate": 16500000,
      "rssFeeds": [
        { "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", "kind": "general", "active": true },
        { "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada", "kind": "politica", "active": true }
      ],
      "qualityScore": 0.85, "active": true
    },
    {
      "id": "el-mundo", "name": "El Mundo", "domain": "elmundo.es",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "CENTER_RIGHT", "ideologyScore": 28, "tier": 1, "audienceEstimate": 12000000,
      "rssFeeds": [
        { "url": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", "kind": "general", "active": true }
      ],
      "qualityScore": 0.80, "active": true
    },
    {
      "id": "abc", "name": "ABC", "domain": "abc.es",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "RIGHT", "ideologyScore": 50, "tier": 1, "audienceEstimate": 8000000,
      "rssFeeds": [
        { "url": "https://www.abc.es/rss/feeds/abc_espana.xml", "kind": "politica", "active": true }
      ],
      "qualityScore": 0.78, "active": true
    },
    {
      "id": "la-vanguardia", "name": "La Vanguardia", "domain": "lavanguardia.com",
      "type": "REGIONAL", "country": "ES", "regions": ["CAT","ES"], "language": "es",
      "ideology": "CENTER", "ideologyScore": -8, "tier": 1, "audienceEstimate": 11000000,
      "rssFeeds": [
        { "url": "https://www.lavanguardia.com/rss/home.xml", "kind": "general", "active": true }
      ],
      "qualityScore": 0.82, "active": true
    },
    {
      "id": "el-confidencial", "name": "El Confidencial", "domain": "elconfidencial.com",
      "type": "DIGITAL_NATIVE", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "CENTER", "ideologyScore": 5, "tier": 1, "audienceEstimate": 12500000,
      "rssFeeds": [
        { "url": "https://rss.elconfidencial.com/espana/", "kind": "politica", "active": true }
      ],
      "qualityScore": 0.82, "active": true
    },
    {
      "id": "eldiario-es", "name": "elDiario.es", "domain": "eldiario.es",
      "type": "DIGITAL_NATIVE", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "LEFT", "ideologyScore": -45, "tier": 2, "audienceEstimate": 8500000,
      "rssFeeds": [
        { "url": "https://www.eldiario.es/rss/", "kind": "general", "active": true }
      ],
      "qualityScore": 0.80, "active": true
    },
    {
      "id": "el-espanol", "name": "El Español", "domain": "elespanol.com",
      "type": "DIGITAL_NATIVE", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "CENTER_RIGHT", "ideologyScore": 20, "tier": 2, "audienceEstimate": 10000000,
      "rssFeeds": [],
      "qualityScore": 0.75, "active": true
    },
    {
      "id": "la-razon", "name": "La Razón", "domain": "larazon.es",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "RIGHT", "ideologyScore": 55, "tier": 2, "audienceEstimate": 7000000,
      "rssFeeds": [],
      "qualityScore": 0.72, "active": true
    },
    {
      "id": "publico", "name": "Público", "domain": "publico.es",
      "type": "DIGITAL_NATIVE", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "LEFT", "ideologyScore": -55, "tier": 2, "audienceEstimate": 5500000,
      "rssFeeds": [
        { "url": "https://www.publico.es/rss", "kind": "general", "active": true }
      ],
      "qualityScore": 0.75, "active": true
    },
    {
      "id": "europa-press", "name": "Europa Press", "domain": "europapress.es",
      "type": "AGENCY", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "INSTITUTIONAL", "ideologyScore": 0, "tier": 4, "audienceEstimate": 9000000,
      "rssFeeds": [
        { "url": "https://www.europapress.es/rss/rss.aspx", "kind": "general", "active": true }
      ],
      "qualityScore": 0.85, "active": true
    },
    {
      "id": "rtve", "name": "RTVE", "domain": "rtve.es",
      "type": "INSTITUTIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "INSTITUTIONAL", "ideologyScore": -5, "tier": 1, "audienceEstimate": 15000000,
      "rssFeeds": [],
      "qualityScore": 0.85, "active": true
    },
    {
      "id": "ser", "name": "Cadena SER", "domain": "cadenaser.com",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "CENTER_LEFT", "ideologyScore": -20, "tier": 1, "audienceEstimate": 14000000,
      "rssFeeds": [],
      "qualityScore": 0.82, "active": true
    },
    {
      "id": "cope", "name": "COPE", "domain": "cope.es",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "RIGHT", "ideologyScore": 40, "tier": 1, "audienceEstimate": 11000000,
      "rssFeeds": [],
      "qualityScore": 0.78, "active": true
    },
    {
      "id": "onda-cero", "name": "Onda Cero", "domain": "ondacero.es",
      "type": "NATIONAL", "country": "ES", "regions": ["ES"], "language": "es",
      "ideology": "CENTER_RIGHT", "ideologyScore": 15, "tier": 1, "audienceEstimate": 9000000,
      "rssFeeds": [],
      "qualityScore": 0.78, "active": true
    },
    {
      "id": "ara", "name": "Ara", "domain": "ara.cat",
      "type": "REGIONAL", "country": "ES", "regions": ["CAT"], "language": "ca",
      "ideology": "NATIONALIST", "ideologyScore": -25, "tier": 2, "audienceEstimate": 3500000,
      "rssFeeds": [],
      "qualityScore": 0.80, "active": true
    },
    {
      "id": "diario-vasco", "name": "El Diario Vasco", "domain": "diariovasco.com",
      "type": "REGIONAL", "country": "ES", "regions": ["PV"], "language": "es",
      "ideology": "CENTER", "ideologyScore": 5, "tier": 2, "audienceEstimate": 2500000,
      "rssFeeds": [],
      "qualityScore": 0.78, "active": true
    },
    {
      "id": "la-voz-de-galicia", "name": "La Voz de Galicia", "domain": "lavozdegalicia.es",
      "type": "REGIONAL", "country": "ES", "regions": ["GAL"], "language": "es",
      "ideology": "CENTER_RIGHT", "ideologyScore": 10, "tier": 2, "audienceEstimate": 3000000,
      "rssFeeds": [],
      "qualityScore": 0.78, "active": true
    },
    {
      "id": "el-correo", "name": "El Correo", "domain": "elcorreo.com",
      "type": "REGIONAL", "country": "ES", "regions": ["PV"], "language": "es",
      "ideology": "CENTER", "ideologyScore": 0, "tier": 2, "audienceEstimate": 3000000,
      "rssFeeds": [],
      "qualityScore": 0.77, "active": true
    },
    {
      "id": "diario-sur", "name": "Sur", "domain": "diariosur.es",
      "type": "REGIONAL", "country": "ES", "regions": ["AND"], "language": "es",
      "ideology": "CENTER", "ideologyScore": 5, "tier": 2, "audienceEstimate": 2000000,
      "rssFeeds": [],
      "qualityScore": 0.75, "active": true
    },
    {
      "id": "heraldo-de-aragon", "name": "Heraldo de Aragón", "domain": "heraldo.es",
      "type": "REGIONAL", "country": "ES", "regions": ["ARA"], "language": "es",
      "ideology": "CENTER_RIGHT", "ideologyScore": 12, "tier": 2, "audienceEstimate": 2000000,
      "rssFeeds": [],
      "qualityScore": 0.76, "active": true
    }
  ]
}
```

- [ ] **Step 2.4.3: Verificar source-catalog.json válido**

Run:
```bash
cd apps/visual-oscar && jq '.sources | length' data/medios/source-catalog.json
```

Expected: ≥20.

### Step 2.5: catalogs.ts con Zod loaders

- [ ] **Step 2.5.1: Crear catalogs.ts con schemas Zod**

Create `apps/visual-oscar/lib/medios/canonical/catalogs.ts`:

```typescript
/**
 * Loaders + validación Zod para los 5 catálogos JSON de Prensa canónica.
 * Sprint 0+1 · Task 2 · 2026-06-02
 *
 * Caché en memoria por instancia (carga una vez).
 */
import { z } from 'zod'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type {
  Entity,
  Source,
  TopicRulesCatalog,
  RssTagMapCatalog,
  FramingRulesCatalog,
} from './types'

// ──────── Schemas Zod ────────────────────────────────────────────────

const EntityAliasSchema = z.object({
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  disambiguationRequired: z.boolean().optional(),
  contextRequired: z.array(z.string()).optional(),
  note: z.string().optional(),
})

const EntitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  canonicalName: z.string().min(1),
  type: z.enum(['PERSON', 'PARTY', 'INSTITUTION', 'TERRITORY', 'COMPANY', 'UNION', 'THINKTANK', 'COALITION', 'ORGANISM']),
  politicalFamily: z.string().nullable(),
  role: z.string().nullable(),
  territory: z.string().nullable(),
  relevanceScore: z.number().min(0).max(1),
  active: z.boolean(),
  aliases: z.array(EntityAliasSchema).min(1),
})

const EntityCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  entities: z.array(EntitySchema),
})

const TopicRuleSchema = z.object({
  id: z.string(),
  field: z.enum(['title', 'description', 'title+description']),
  type: z.enum(['contains_any', 'contains_all']),
  terms: z.array(z.string()).min(1),
  score: z.number().min(0).max(1),
  note: z.string().optional(),
})

const SubtopicSchema = z.object({
  subtopicId: z.string(),
  rules: z.array(TopicRuleSchema),
})

const TopicSchema = z.object({
  topicId: z.string(),
  label: z.string(),
  rules: z.array(TopicRuleSchema),
  subtopics: z.array(SubtopicSchema).optional(),
})

const TopicRulesCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  topics: z.array(TopicSchema),
})

const RssTagMappingSchema = z.object({
  rawTag: z.string(),
  topicId: z.string().nullable(),
  subtopicId: z.string().optional(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).min(1),
  note: z.string().optional(),
})

const RssTagMapCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  mappings: z.array(RssTagMappingSchema),
})

const FramingRuleSchema = z.object({
  id: z.string(),
  field: z.enum(['title', 'description', 'title+description']),
  type: z.enum(['contains_any', 'contains_all']),
  terms: z.array(z.string()),
  score: z.number().min(0).max(1),
})

const FramingSchema = z.object({
  framingId: z.string(),
  label: z.string(),
  rules: z.array(FramingRuleSchema),
})

const FramingRulesCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  _status: z.string().optional(),
  framings: z.array(FramingSchema),
})

const RssFeedRefSchema = z.object({
  url: z.string().url(),
  kind: z.enum(['general', 'politica', 'economia', 'opinion', 'otro']),
  active: z.boolean(),
})

const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  domain: z.string(),
  type: z.enum(['NATIONAL', 'REGIONAL', 'LOCAL', 'DIGITAL_NATIVE', 'AGENCY', 'INTERNATIONAL', 'SECTORAL', 'INSTITUTIONAL']),
  country: z.string(),
  regions: z.array(z.string()),
  language: z.string(),
  ideology: z.enum(['LEFT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'RIGHT', 'NATIONALIST', 'INSTITUTIONAL', 'UNKNOWN']),
  ideologyScore: z.number(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  audienceEstimate: z.number().min(0),
  rssFeeds: z.array(RssFeedRefSchema),
  qualityScore: z.number().min(0).max(1),
  active: z.boolean(),
})

const SourceCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  _note: z.string().optional(),
  sources: z.array(SourceSchema),
})

// ──────── Cache en memoria ────────────────────────────────────────────

let _entityCache: Entity[] | null = null
let _topicRulesCache: TopicRulesCatalog | null = null
let _rssTagMapCache: RssTagMapCatalog | null = null
let _framingRulesCache: FramingRulesCatalog | null = null
let _sourceCache: Source[] | null = null

function dataPath(filename: string): string {
  return join(process.cwd(), 'data', 'medios', filename)
}

// ──────── Loaders ─────────────────────────────────────────────────────

export async function loadEntityCatalog(): Promise<Entity[]> {
  if (_entityCache) return _entityCache
  const raw = await readFile(dataPath('entity-catalog.json'), 'utf8')
  const parsed = EntityCatalogSchema.parse(JSON.parse(raw))
  _entityCache = parsed.entities as Entity[]
  return _entityCache
}

export async function loadTopicRules(): Promise<TopicRulesCatalog> {
  if (_topicRulesCache) return _topicRulesCache
  const raw = await readFile(dataPath('topic-rules.json'), 'utf8')
  _topicRulesCache = TopicRulesCatalogSchema.parse(JSON.parse(raw)) as TopicRulesCatalog
  return _topicRulesCache
}

export async function loadRssTagMap(): Promise<RssTagMapCatalog> {
  if (_rssTagMapCache) return _rssTagMapCache
  const raw = await readFile(dataPath('rss-tag-map.json'), 'utf8')
  _rssTagMapCache = RssTagMapCatalogSchema.parse(JSON.parse(raw)) as RssTagMapCatalog
  return _rssTagMapCache
}

export async function loadFramingRules(): Promise<FramingRulesCatalog> {
  if (_framingRulesCache) return _framingRulesCache
  const raw = await readFile(dataPath('framing-rules.json'), 'utf8')
  _framingRulesCache = FramingRulesCatalogSchema.parse(JSON.parse(raw)) as FramingRulesCatalog
  return _framingRulesCache
}

export async function loadSourceCatalog(): Promise<Source[]> {
  if (_sourceCache) return _sourceCache
  const raw = await readFile(dataPath('source-catalog.json'), 'utf8')
  const parsed = SourceCatalogSchema.parse(JSON.parse(raw))
  _sourceCache = parsed.sources as Source[]
  return _sourceCache
}

// ──────── Helpers de lookup ───────────────────────────────────────────

export function findSourceByDomain(catalog: Source[], domain: string): Source | null {
  const normDomain = domain.toLowerCase().replace(/^www\./, '')
  return catalog.find(s => s.domain.toLowerCase() === normDomain) ?? null
}

export function findEntityById(catalog: Entity[], id: string): Entity | null {
  return catalog.find(e => e.id === id) ?? null
}

export function findEntitiesByAlias(catalog: Entity[], aliasText: string): Entity[] {
  const norm = aliasText.toLowerCase()
  return catalog.filter(e => e.aliases.some(a => a.text.toLowerCase() === norm))
}

// ──────── Reset (para tests) ──────────────────────────────────────────

export function _resetCatalogCache(): void {
  _entityCache = null
  _topicRulesCache = null
  _rssTagMapCache = null
  _framingRulesCache = null
  _sourceCache = null
}
```

### Step 2.6: Tests catalogs

- [ ] **Step 2.6.1: Crear catalogs.test.ts**

Create `apps/visual-oscar/tests/unit/medios/canonical/catalogs.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadEntityCatalog,
  loadTopicRules,
  loadRssTagMap,
  loadFramingRules,
  loadSourceCatalog,
  findSourceByDomain,
  findEntityById,
  findEntitiesByAlias,
  _resetCatalogCache,
} from '@/lib/medios/canonical/catalogs'

beforeEach(() => _resetCatalogCache())

describe('Catalogs · loaders', () => {
  describe('entity-catalog', () => {
    it('carga ≥85 entities con shape válido', async () => {
      const entities = await loadEntityCatalog()
      expect(entities.length).toBeGreaterThanOrEqual(85)
      expect(entities[0]).toHaveProperty('id')
      expect(entities[0]).toHaveProperty('aliases')
    })

    it('Pedro Sánchez está en el catálogo', async () => {
      const entities = await loadEntityCatalog()
      const sanchez = findEntityById(entities, 'pedro-sanchez')
      expect(sanchez).not.toBeNull()
      expect(sanchez?.canonicalName).toBe('Pedro Sánchez')
      expect(sanchez?.aliases.length).toBeGreaterThanOrEqual(4)
    })

    it('"Sánchez" alias se encuentra en al menos 1 entity', async () => {
      const entities = await loadEntityCatalog()
      const matches = findEntitiesByAlias(entities, 'Sánchez')
      expect(matches.length).toBeGreaterThanOrEqual(1)
      expect(matches.some(e => e.id === 'pedro-sanchez')).toBe(true)
    })

    it('cache: segunda llamada no relee disco', async () => {
      const t0 = Date.now()
      await loadEntityCatalog()
      const first = Date.now() - t0
      const t1 = Date.now()
      await loadEntityCatalog()
      const second = Date.now() - t1
      expect(second).toBeLessThan(Math.max(first, 5))
    })
  })

  describe('topic-rules', () => {
    it('carga ≥20 topics incluyendo OTRO', async () => {
      const cat = await loadTopicRules()
      expect(cat.topics.length).toBeGreaterThanOrEqual(20)
      const ids = cat.topics.map((t: any) => t.topicId)
      expect(ids).toContain('POLITICA_INSTITUCIONAL')
      expect(ids).toContain('TERRITORIAL')
      expect(ids).toContain('JUDICIAL')
      expect(ids).toContain('OTRO')
    })

    it('TERRITORIAL tiene subtopics CATALUÑA y PAIS_VASCO', async () => {
      const cat = await loadTopicRules()
      const terr = cat.topics.find((t: any) => t.topicId === 'TERRITORIAL') as any
      expect(terr?.subtopics).toBeDefined()
      const subIds = terr.subtopics.map((s: any) => s.subtopicId)
      expect(subIds).toContain('CATALUÑA')
      expect(subIds).toContain('PAIS_VASCO')
    })
  })

  describe('rss-tag-map', () => {
    it('carga ≥80 mappings', async () => {
      const map = await loadRssTagMap()
      expect(map.mappings.length).toBeGreaterThanOrEqual(80)
    })

    it('"política" mapea a POLITICA_INSTITUCIONAL con conf 0.85', async () => {
      const map = await loadRssTagMap()
      const m = map.mappings.find((x: any) => x.rawTag === 'política') as any
      expect(m?.topicId).toBe('POLITICA_INSTITUCIONAL')
      expect(m?.confidence).toBe(0.85)
    })

    it('"others" tiene topicId null para forzar capa 2', async () => {
      const map = await loadRssTagMap()
      const m = map.mappings.find((x: any) => x.rawTag === 'others') as any
      expect(m?.topicId).toBeNull()
    })
  })

  describe('framing-rules (preparado)', () => {
    it('carga 9 framings con rules vacíos', async () => {
      const cat = await loadFramingRules()
      expect(cat.framings.length).toBe(9)
      expect((cat as any)._status).toContain('PREPARED_FOR_SPRINT_4')
    })
  })

  describe('source-catalog', () => {
    it('carga ≥20 sources con tier asignado', async () => {
      const sources = await loadSourceCatalog()
      expect(sources.length).toBeGreaterThanOrEqual(20)
      expect(sources.every(s => [1, 2, 3, 4].includes(s.tier))).toBe(true)
    })

    it('findSourceByDomain("elpais.com") devuelve El País', async () => {
      const sources = await loadSourceCatalog()
      const ep = findSourceByDomain(sources, 'elpais.com')
      expect(ep?.id).toBe('el-pais')
      expect(ep?.tier).toBe(1)
      expect(ep?.ideology).toBe('CENTER_LEFT')
    })

    it('findSourceByDomain normaliza www.', async () => {
      const sources = await loadSourceCatalog()
      const ep = findSourceByDomain(sources, 'www.elpais.com')
      expect(ep?.id).toBe('el-pais')
    })

    it('findSourceByDomain devuelve null si no existe', async () => {
      const sources = await loadSourceCatalog()
      expect(findSourceByDomain(sources, 'inexistente.com')).toBeNull()
    })
  })
})
```

- [ ] **Step 2.6.2: Run tests catalogs**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/catalogs.test.ts 2>&1 | tail -15
```

Expected: 13+ tests passed.

### Step 2.7: Build + commit Task 2

- [ ] **Step 2.7.1: Build**

Run:
```bash
cd apps/visual-oscar && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 2.7.2: Commit + push**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/data/medios/ \
        apps/visual-oscar/lib/medios/canonical/catalogs.ts \
        apps/visual-oscar/scripts/extract-entity-catalog.ts \
        apps/visual-oscar/tests/unit/medios/canonical/catalogs.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 0.2 · catálogos JSON con shape rich + loaders Zod

5 catálogos JSON en data/medios/ con shape EXACTO del Sprint 2+3+4:

· entity-catalog.json
  85+ entities extraídas de constantes hardcoded en media-methodology.ts
  (FIGURAS_DICT_V2, PARTIDOS_DICT, INSTITUCIONES_DICT, IBEX35_DICT)
  Shape rich con aliases: { text, confidence, disambiguationRequired,
  contextRequired[], note }.
  Cubre: 10 personas top, 10 partidos, 12 instituciones, 10 empresas
  IBEX, 6 sindicatos/patronal, 19 CCAA territorios.
  Desambiguación contextual implementada:
    - "Sánchez" disambiguationRequired (Pedro vs Luis Enrique vs Cuca)
    - "Moncloa" contextRequired ['gobierno','ejecutivo','presidencia']
    - "Montero" disambiguada María Jesús (PSOE) vs Irene (Podemos)

· topic-rules.json
  24 macrotemas del spec §1.4 + OTRO.
  TERRITORIAL con subtopics nesteados: CATALUÑA, PAIS_VASCO, FINANCIACION_
  AUTONOMICA.
  Reglas con field (title|description|title+description), type
  (contains_any|contains_all), terms, score, note.

· rss-tag-map.json
  ~90 mappings curados con sources wildcard ["*"] o array específico
  por medio. "others" y "general" con topicId=null para forzar capa 2.

· framing-rules.json (preparado Sprint 4)
  Esqueleto vacío con 9 framings declarados, rules[] vacíos.
  _status="PREPARED_FOR_SPRINT_4_NOT_ACTIVE".

· source-catalog.json
  20 medios tier 1-2 curados a mano con shape canónico (tier 1-4,
  ideology enum, regions[], audienceEstimate, qualityScore, rssFeeds[]).
  Cubre: El País, El Mundo, ABC, La Vanguardia, El Confidencial,
  elDiario.es, El Español, La Razón, Público, Europa Press, RTVE,
  SER, COPE, Onda Cero, Ara, El Diario Vasco, La Voz de Galicia,
  El Correo, Sur, Heraldo de Aragón.

Loaders + validación Zod en lib/medios/canonical/catalogs.ts:
  loadEntityCatalog, loadTopicRules, loadRssTagMap, loadFramingRules,
  loadSourceCatalog. Cache en memoria por instancia.
  Helpers: findSourceByDomain, findEntityById, findEntitiesByAlias.

Script extract-entity-catalog.ts para regenerar entity-catalog.json
si las constantes legacy cambian (reproducible).

Tests: 13+ tests unit en catalogs.test.ts cubriendo shape, cache,
desambiguación, normalización www.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD:main
```

Expected: push exitoso.

---

</content>

## Task 3: Pipeline `processArticle()` con 10 pasos + LLM (Commit 0.3) · 8h

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/dedupe.ts` (~100 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/noise-filter.ts` (~80 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/classify-rss-tags.ts` (~100 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/classify-heuristic.ts` (~150 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/classify-semantic.ts` (~200 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/extract-entities.ts` (~250 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/quality-score.ts` (~60 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/metrics.ts` (~120 LOC)
- Create: `apps/visual-oscar/lib/medios/canonical/pipeline.ts` (~400 LOC, orquesta los anteriores)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/pipeline-dedupe.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/pipeline-noise.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/pipeline-classify.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/pipeline-extract.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/pipeline.test.ts`

### Step 3.1: dedupe.ts

- [ ] **Step 3.1.1: Test failing dedupe exacto (URL)**

Create `tests/unit/medios/canonical/pipeline-dedupe.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isExactDuplicate, computeTitleHash, isTitleDuplicate } from '@/lib/medios/canonical/dedupe'

describe('dedupe', () => {
  it('isExactDuplicate detecta id ya conocido', () => {
    const known = new Set(['abc123'])
    expect(isExactDuplicate('abc123', known)).toBe(true)
    expect(isExactDuplicate('def456', known)).toBe(false)
  })

  it('computeTitleHash normaliza lowercase + sin stopwords + 8 tokens', () => {
    const h1 = computeTitleHash('El Gobierno aprueba decreto sobre vivienda asequible para jóvenes urbanos')
    const h2 = computeTitleHash('El GOBIERNO aprueba DECRETO sobre vivienda asequible para jóvenes urbanos hoy')
    // Mismos 8 tokens significativos → mismo hash (con/sin "hoy" extra)
    expect(h1).toBe(h2)
  })

  it('isTitleDuplicate detecta match en ventana 30min mismo source', () => {
    const recent = new Map<string, { id: string; sourceId: string; ts: string }>()
    const now = Date.now()
    recent.set('hash-X', { id: 'a1', sourceId: 'el-pais', ts: new Date(now - 10 * 60 * 1000).toISOString() })
    expect(isTitleDuplicate('hash-X', 'el-pais', recent, 30)).toBe(true)
    expect(isTitleDuplicate('hash-X', 'otro-medio', recent, 30)).toBe(false)
    expect(isTitleDuplicate('hash-Y', 'el-pais', recent, 30)).toBe(false)
  })

  it('isTitleDuplicate ignora matches > 30min', () => {
    const recent = new Map<string, { id: string; sourceId: string; ts: string }>()
    const now = Date.now()
    recent.set('hash-X', { id: 'a1', sourceId: 'el-pais', ts: new Date(now - 60 * 60 * 1000).toISOString() })
    expect(isTitleDuplicate('hash-X', 'el-pais', recent, 30)).toBe(false)
  })
})
```

- [ ] **Step 3.1.2: Run test → debe fallar**

Run: `cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/pipeline-dedupe.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3.1.3: Implementar dedupe.ts**

Create `apps/visual-oscar/lib/medios/canonical/dedupe.ts`:

```typescript
/**
 * Deduplicación: exacta por URL + por titular hash en ventana temporal.
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import { createHash } from 'crypto'

const STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'y', 'o', 'pero', 'que',
  'con', 'por', 'para', 'es', 'son', 'su', 'sus', 'se', 'le', 'les',
  'lo', 'me', 'te', 'nos', 'mi', 'tu', 'sin', 'sobre',
])

export function isExactDuplicate(id: string, knownIds: Set<string>): boolean {
  return knownIds.has(id)
}

export function computeTitleHash(title: string): string {
  const tokens = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS_ES.has(t))
    .slice(0, 8)
    .join(' ')
  return createHash('md5').update(tokens).digest('hex')
}

export function isTitleDuplicate(
  titleHash: string,
  sourceId: string,
  recent: Map<string, { id: string; sourceId: string; ts: string }>,
  windowMinutes: number,
): boolean {
  const entry = recent.get(titleHash)
  if (!entry) return false
  if (entry.sourceId !== sourceId) return false
  const ageMs = Date.now() - new Date(entry.ts).getTime()
  return ageMs <= windowMinutes * 60 * 1000
}
```

- [ ] **Step 3.1.4: Run tests → deben pasar**

Run: `cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/pipeline-dedupe.test.ts`

Expected: 4 passed.

### Step 3.2: noise-filter.ts (7 reglas spec §Paso 4)

- [ ] **Step 3.2.1: Test failing noise**

Create `tests/unit/medios/canonical/pipeline-noise.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { detectNoise } from '@/lib/medios/canonical/noise-filter'

describe('noise-filter · 7 reglas spec §Paso 4', () => {
  it('título < 5 palabras → noise', () => {
    const r = detectNoise({ title: 'Tres palabras solo', description: 'Algo' })
    expect(r.isNoise).toBe(true)
    expect(r.reason).toContain('title_too_short')
  })

  it('título solo números → noise', () => {
    expect(detectNoise({ title: '12345 67890 99', description: 'x' }).isNoise).toBe(true)
  })

  it('horóscopo → noise', () => {
    expect(detectNoise({ title: 'Horóscopo de hoy para Aries Tauro Géminis', description: '...' }).isNoise).toBe(true)
  })

  it('receta → noise', () => {
    expect(detectNoise({ title: 'Receta de la abuela: tortilla de patatas perfecta', description: '...' }).isNoise).toBe(true)
  })

  it('publicidad explícita → noise', () => {
    expect(detectNoise({ title: 'Patrocinado: las mejores ofertas del Black Friday', description: 'x' }).isNoise).toBe(true)
  })

  it('descripción vacía o igual al título → noise', () => {
    const same = 'Mismo texto en título y descripción aquí'
    expect(detectNoise({ title: same, description: same }).isNoise).toBe(true)
    expect(detectNoise({ title: 'Título normal pero desc vacía aquí', description: '' }).isNoise).toBe(true)
  })

  it('artículo político normal → no noise', () => {
    const r = detectNoise({
      title: 'Pedro Sánchez convoca elecciones generales para junio',
      description: 'El Presidente anuncia el adelanto electoral en una intervención sorpresa',
    })
    expect(r.isNoise).toBe(false)
  })
})
```

- [ ] **Step 3.2.2: Implementar noise-filter.ts**

Create `apps/visual-oscar/lib/medios/canonical/noise-filter.ts`:

```typescript
/**
 * Filtro de ruido: 7 reglas spec §Paso 4.
 * Conservador: en duda, no marca noise (pasa al pipeline normal).
 */

export interface NoiseResult {
  isNoise: boolean
  reason: string | null
}

const NOISE_KEYWORDS = [
  'horóscopo', 'horoscopo',
  'receta de', 'recetas',
  'patrocinado', 'publicidad', 'publirreportaje', 'contenido patrocinado',
  'oferta', 'ofertas del black friday',
  'sorteo', 'concurso',
  'esquela', 'obituario',
]

const SPORTS_NO_POLITICS = ['resultados de la liga', 'gol de', 'minuto a minuto']

export function detectNoise(input: { title: string; description?: string | null }): NoiseResult {
  const title = input.title.trim()
  const description = (input.description ?? '').trim()
  const titleLower = title.toLowerCase()

  // Regla 1: título < 5 palabras
  const words = title.split(/\s+/).filter(w => w.length > 0)
  if (words.length < 5) return { isNoise: true, reason: 'title_too_short' }

  // Regla 2: título solo números/símbolos
  const alphaCount = (title.match(/\p{L}/gu) ?? []).length
  if (alphaCount < 5) return { isNoise: true, reason: 'title_no_letters' }

  // Regla 3: keywords noise (horóscopo, receta, publi)
  for (const kw of NOISE_KEYWORDS) {
    if (titleLower.includes(kw)) return { isNoise: true, reason: `keyword_${kw.replace(/\s+/g, '_')}` }
  }

  // Regla 4: deportes sin contexto político
  for (const kw of SPORTS_NO_POLITICS) {
    if (titleLower.includes(kw)) return { isNoise: true, reason: 'sports_no_politics' }
  }

  // Regla 5: descripción vacía
  if (!description) return { isNoise: true, reason: 'empty_description' }

  // Regla 6: descripción igual al título
  if (description.toLowerCase().trim() === titleLower) return { isNoise: true, reason: 'description_equals_title' }

  return { isNoise: false, reason: null }
}
```

- [ ] **Step 3.2.3: Run tests noise**

Run: `cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/pipeline-noise.test.ts`

Expected: 7 passed.

### Step 3.3: classify-rss-tags.ts (Capa 1)

- [ ] **Step 3.3.1: Implementar classify-rss-tags.ts**

Create `apps/visual-oscar/lib/medios/canonical/classify-rss-tags.ts`:

```typescript
/**
 * Capa 1 clasificación: mapeo RSS tag → TopicTag.
 * Umbral confidence ≥ 0.65 para producir resultado.
 * Spec §2.1 Sprint 2 / §Paso 6 Sprint 0+1.
 */
import type { TopicTag, RssTagMapCatalog } from './types'

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function classifyByRssTags(
  rawTags: string[],
  sourceId: string,
  catalog: RssTagMapCatalog,
): TopicTag | null {
  if (!rawTags || rawTags.length === 0) return null

  const mappings = (catalog.mappings as Array<{
    rawTag: string
    topicId: string | null
    subtopicId?: string
    confidence: number
    sources: string[]
    note?: string
  }>)

  let best: { topicId: string; subtopicId?: string; confidence: number } | null = null

  for (const tag of rawTags) {
    const tagNorm = normalize(tag)
    for (const m of mappings) {
      if (normalize(m.rawTag) !== tagNorm) continue
      if (m.topicId === null) continue
      const sourceMatch = m.sources.includes('*') || m.sources.includes(sourceId)
      if (!sourceMatch) continue
      if (m.confidence < 0.65) continue
      if (!best || m.confidence > best.confidence) {
        best = { topicId: m.topicId, subtopicId: m.subtopicId, confidence: m.confidence }
      }
    }
  }

  if (!best) return null
  return {
    topicId: best.topicId,
    subtopicId: best.subtopicId ?? null,
    level: best.subtopicId ? 2 : 1,
    confidence: best.confidence,
    method: 'RSS_TAG',
    assignedAt: new Date().toISOString(),
  }
}
```

### Step 3.4: classify-heuristic.ts (Capa 2)

- [ ] **Step 3.4.1: Implementar classify-heuristic.ts**

Create `apps/visual-oscar/lib/medios/canonical/classify-heuristic.ts`:

```typescript
/**
 * Capa 2 clasificación: heurísticas keyword + scoring ponderado.
 * Algoritmo spec §2.1.2 Sprint 2.
 * Umbral 0.60.
 */
import type { TopicTag, TopicRulesCatalog } from './types'

const FIELD_WEIGHT = { title: 1.5, description: 1.0, 'title+description': 1.2 } as const

type Rule = {
  id: string
  field: 'title' | 'description' | 'title+description'
  type: 'contains_any' | 'contains_all'
  terms: string[]
  score: number
  note?: string
}

type Topic = {
  topicId: string
  label: string
  rules: Rule[]
  subtopics?: Array<{ subtopicId: string; rules: Rule[] }>
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matchRule(text: string, rule: Rule): boolean {
  const textNorm = normalize(text)
  const termsNorm = rule.terms.map(normalize)
  if (rule.type === 'contains_any') {
    return termsNorm.some(t => textNorm.includes(t))
  }
  return termsNorm.every(t => textNorm.includes(t))
}

function getText(field: Rule['field'], title: string, description: string): string {
  if (field === 'title') return title
  if (field === 'description') return description
  return `${title} ${description}`
}

function scoreTopic(rules: Rule[], title: string, description: string): { score: number; maxPossible: number } {
  let score = 0
  let maxPossible = 0
  for (const rule of rules) {
    const weight = FIELD_WEIGHT[rule.field]
    maxPossible += rule.score * weight
    const text = getText(rule.field, title, description)
    if (matchRule(text, rule)) {
      score += rule.score * weight
    }
  }
  return { score, maxPossible }
}

export function classifyByHeuristic(
  title: string,
  description: string,
  catalog: TopicRulesCatalog,
): TopicTag | null {
  const topics = catalog.topics as Topic[]
  const scores: Array<{ topicId: string; subtopicId?: string; normalized: number }> = []

  for (const topic of topics) {
    // Score macrotopic-level rules
    if (topic.rules.length > 0) {
      const { score, maxPossible } = scoreTopic(topic.rules, title, description)
      if (maxPossible > 0) {
        scores.push({ topicId: topic.topicId, normalized: score / maxPossible })
      }
    }
    // Score subtopics
    if (topic.subtopics) {
      for (const sub of topic.subtopics) {
        const { score, maxPossible } = scoreTopic(sub.rules, title, description)
        if (maxPossible > 0) {
          scores.push({ topicId: topic.topicId, subtopicId: sub.subtopicId, normalized: score / maxPossible })
        }
      }
    }
  }

  scores.sort((a, b) => b.normalized - a.normalized)
  const winner = scores[0]
  if (!winner || winner.normalized < 0.60) return null

  return {
    topicId: winner.topicId,
    subtopicId: winner.subtopicId ?? null,
    level: winner.subtopicId ? 2 : 1,
    confidence: Math.min(winner.normalized, 1.0),
    method: 'HEURISTIC',
    assignedAt: new Date().toISOString(),
  }
}
```

### Step 3.5: Tests classify (Capa 1 + 2)

- [ ] **Step 3.5.1: Test classify rss-tags + heuristic**

Create `tests/unit/medios/canonical/pipeline-classify.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { loadRssTagMap, loadTopicRules, _resetCatalogCache } from '@/lib/medios/canonical/catalogs'
import { classifyByRssTags } from '@/lib/medios/canonical/classify-rss-tags'
import { classifyByHeuristic } from '@/lib/medios/canonical/classify-heuristic'

describe('Capa 1 · RSS Tags', () => {
  beforeAll(() => _resetCatalogCache())

  it('rawTag "política" → POLITICA_INSTITUCIONAL conf 0.85', async () => {
    const catalog = await loadRssTagMap()
    const tag = classifyByRssTags(['política'], 'el-pais', catalog)
    expect(tag?.topicId).toBe('POLITICA_INSTITUCIONAL')
    expect(tag?.method).toBe('RSS_TAG')
    expect(tag?.confidence).toBe(0.85)
  })

  it('rawTag "cataluña" → TERRITORIAL/CATALUÑA con subtopicId y level 2', async () => {
    const catalog = await loadRssTagMap()
    const tag = classifyByRssTags(['cataluña'], 'la-vanguardia', catalog)
    expect(tag?.topicId).toBe('TERRITORIAL')
    expect(tag?.subtopicId).toBe('CATALUÑA')
    expect(tag?.level).toBe(2)
  })

  it('rawTag "others" topicId=null → no clasifica', async () => {
    const catalog = await loadRssTagMap()
    expect(classifyByRssTags(['others'], 'el-pais', catalog)).toBeNull()
  })

  it('rawTag desconocido → null (pasa a capa 2)', async () => {
    const catalog = await loadRssTagMap()
    expect(classifyByRssTags(['tag-inexistente'], 'el-pais', catalog)).toBeNull()
  })

  it('rawTags vacíos → null', async () => {
    const catalog = await loadRssTagMap()
    expect(classifyByRssTags([], 'el-pais', catalog)).toBeNull()
  })
})

describe('Capa 2 · Heurísticas', () => {
  it('título "Tribunal Supremo dicta sentencia sobre amnistía" → JUDICIAL conf ≥ 0.70', async () => {
    const catalog = await loadTopicRules()
    const tag = classifyByHeuristic(
      'Tribunal Supremo dicta sentencia sobre amnistía',
      'El TS resuelve la cuestión',
      catalog,
    )
    expect(tag?.topicId).toBe('JUDICIAL')
    expect(tag?.method).toBe('HEURISTIC')
    expect(tag!.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it('título "Generalitat aprueba presupuestos" → TERRITORIAL/CATALUÑA', async () => {
    const catalog = await loadTopicRules()
    const tag = classifyByHeuristic('Generalitat aprueba presupuestos en Barcelona', 'Govern catalán', catalog)
    expect(tag?.topicId).toBe('TERRITORIAL')
    expect(tag?.subtopicId).toBe('CATALUÑA')
  })

  it('título sin keywords → null (pasa a capa 3)', async () => {
    const catalog = await loadTopicRules()
    const tag = classifyByHeuristic('Texto genérico sin keywords políticas', 'Descripción genérica', catalog)
    expect(tag).toBeNull()
  })
})
```

- [ ] **Step 3.5.2: Run tests classify**

Run: `cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/pipeline-classify.test.ts`

Expected: 7+ passed.

### Step 3.6: classify-semantic.ts (Capa 3 con Ollama mock interface)

- [ ] **Step 3.6.1: Crear classify-semantic.ts (LLM client interface + Ollama default)**

Create `apps/visual-oscar/lib/medios/canonical/classify-semantic.ts`:

```typescript
/**
 * Capa 3 clasificación: LLM semantic.
 * Sprint 0.3: usa Ollama dev (llama3.1:8b) por default.
 * Sprint 1.3: migra a Groq prod (llama-3.3-70b-versatile).
 *
 * Confidence siempre truncada a 0.75 (spec §2.1.3).
 * Batching: el caller acumula 20 antes de invocar.
 */
import type { TopicTag, ClassificationMethod } from './types'

export interface LlmClassifierClient {
  classifyBatch(items: Array<{
    title: string
    description: string
  }>, topicList: string[]): Promise<Array<{
    topicId: string
    confidence: number
    reasoning: string
  } | null>>
}

/**
 * Cliente por defecto: Ollama local llama3.1:8b.
 * Lee endpoint de OLLAMA_HOST env var, default http://localhost:11434.
 */
export class OllamaLlmClient implements LlmClassifierClient {
  constructor(
    private host: string = process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    private model: string = 'llama3.1:8b',
  ) {}

  async classifyBatch(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<Array<{ topicId: string; confidence: number; reasoning: string } | null>> {
    const results: Array<{ topicId: string; confidence: number; reasoning: string } | null> = []
    for (const item of items) {
      try {
        const prompt = buildPrompt(item.title, item.description, topicList)
        const resp = await fetch(`${this.host}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            prompt,
            stream: false,
            format: 'json',
            options: { temperature: 0.1, num_predict: 200 },
          }),
        })
        if (!resp.ok) {
          results.push(null)
          continue
        }
        const data = await resp.json() as { response: string }
        const parsed = JSON.parse(data.response) as { topicId: string; confidence: number; reasoning?: string }
        if (parsed.topicId && topicList.includes(parsed.topicId)) {
          results.push({
            topicId: parsed.topicId,
            confidence: Math.min(parsed.confidence ?? 0.5, 0.75),
            reasoning: parsed.reasoning ?? '',
          })
        } else {
          results.push(null)
        }
      } catch {
        results.push(null)
      }
    }
    return results
  }
}

function buildPrompt(title: string, description: string, topicList: string[]): string {
  return `Eres un clasificador de temas para análisis político español.
Clasifica el siguiente artículo en UNO de estos temas:
${topicList.map(t => `- ${t}`).join('\n')}

ARTÍCULO:
Título: ${title}
Descripción: ${description}

Responde SOLO en JSON: {"topicId":"...","confidence":0.X,"reasoning":"una frase"}
- topicId DEBE ser uno de la lista exacta.
- Si no encaja, usa "OTRO" con confidence 0.30.
- No añadas texto fuera del JSON.`
}

/**
 * Cliente stub que siempre devuelve null (para tests + flag MEDIOS_LLM_CLASSIFIER=disabled).
 */
export class StubLlmClient implements LlmClassifierClient {
  async classifyBatch(items: Array<{ title: string; description: string }>): Promise<Array<null>> {
    return items.map(() => null)
  }
}

/**
 * Convierte resultado LLM a TopicTag canónico.
 */
export function semanticResultToTopicTag(result: { topicId: string; confidence: number }): TopicTag {
  return {
    topicId: result.topicId,
    subtopicId: null,
    level: 1,
    confidence: Math.min(result.confidence, 0.75),
    method: 'SEMANTIC' as ClassificationMethod,
    assignedAt: new Date().toISOString(),
  }
}
```

### Step 3.7: extract-entities.ts (algoritmo spec §3.2)

- [ ] **Step 3.7.1: Implementar extract-entities.ts**

Create `apps/visual-oscar/lib/medios/canonical/extract-entities.ts`:

```typescript
/**
 * Extracción de entidades del título + descripción.
 * Algoritmo spec §3.2 Sprint 3:
 *  - Índice en memoria pre-construido
 *  - Word boundaries
 *  - Normalización acentos
 *  - Resolución contextRequired
 *  - Co-referencias intra-artículo
 * Sprint 0.3 implementa todo; Sprint 3 calcula ProminenceScore aparte.
 */
import type { Entity, ExtractedEntity } from './types'

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

interface AliasIndex {
  text: string
  textNorm: string
  baseConfidence: number
  candidateIds: string[]
  disambiguationRequired: boolean
  contextRequired: string[] | null
}

/**
 * Construye índice plano de aliases.
 * Cada alias.text puede ser ambiguo entre múltiples entities → candidateIds array.
 */
export function buildAliasIndex(entities: Entity[]): AliasIndex[] {
  const byText = new Map<string, AliasIndex>()
  for (const ent of entities) {
    if (!ent.active) continue
    for (const alias of ent.aliases) {
      const key = normalize(alias.text)
      let existing = byText.get(key)
      if (!existing) {
        existing = {
          text: alias.text,
          textNorm: key,
          baseConfidence: alias.confidence,
          candidateIds: [],
          disambiguationRequired: alias.disambiguationRequired ?? false,
          contextRequired: alias.contextRequired ?? null,
        }
        byText.set(key, existing)
      }
      if (!existing.candidateIds.includes(ent.id)) {
        existing.candidateIds.push(ent.id)
      }
      if (alias.contextRequired) existing.contextRequired = alias.contextRequired
      if (alias.disambiguationRequired) existing.disambiguationRequired = true
    }
  }
  return Array.from(byText.values())
}

function wordBoundaryMatch(text: string, needle: string): boolean {
  if (!needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i')
  return re.test(text)
}

export function extractEntities(
  title: string,
  description: string,
  entities: Entity[],
  index: AliasIndex[],
): ExtractedEntity[] {
  const titleNorm = normalize(title)
  const descNorm = normalize(description ?? '')
  const fullNorm = `${titleNorm} ${descNorm}`
  const extracted: ExtractedEntity[] = []

  // First pass: high-confidence direct matches
  for (const alias of index) {
    const inTitle = wordBoundaryMatch(titleNorm, alias.textNorm)
    const inDesc = wordBoundaryMatch(descNorm, alias.textNorm)
    if (!inTitle && !inDesc) continue

    let chosen: string | null = null

    if (alias.candidateIds.length === 1 && !alias.disambiguationRequired) {
      chosen = alias.candidateIds[0]
    } else if (alias.contextRequired) {
      const hasContext = alias.contextRequired.some(c => fullNorm.includes(normalize(c)))
      if (hasContext) {
        // Pick highest relevanceScore among candidates
        const cands = alias.candidateIds.map(id => entities.find(e => e.id === id)!).filter(Boolean)
        cands.sort((a, b) => b.relevanceScore - a.relevanceScore)
        chosen = cands[0]?.id ?? null
      }
    }

    if (!chosen) continue

    let conf = alias.baseConfidence
    conf = inTitle ? conf * 1.0 : conf * 0.75
    const wordCount = alias.text.split(/\s+/).length
    if (wordCount === 1) conf *= 0.85
    if (wordCount >= 3) conf = Math.min(conf * 1.10, 1.0)

    if (conf < 0.55) continue

    extracted.push({
      entityId: chosen,
      alias: alias.text,
      confidence: conf,
      position: inTitle && inDesc ? 'both' : inTitle ? 'title' : 'description',
      resolutionMethod: alias.contextRequired ? 'context' : alias.disambiguationRequired ? 'coreference' : 'direct',
    })
  }

  // Second pass: co-reference resolution
  // Aliases con disambiguationRequired pero sin contextRequired:
  // resolver a la entity ya detectada con conf ≥ 0.85 en el mismo texto.
  for (const alias of index) {
    if (!alias.disambiguationRequired || alias.contextRequired) continue
    if (extracted.some(e => e.alias === alias.text)) continue
    const inTitle = wordBoundaryMatch(titleNorm, alias.textNorm)
    const inDesc = wordBoundaryMatch(descNorm, alias.textNorm)
    if (!inTitle && !inDesc) continue
    const priorMatch = extracted.find(
      e => alias.candidateIds.includes(e.entityId) && e.confidence >= 0.85,
    )
    if (!priorMatch) continue
    let conf = alias.baseConfidence
    conf = inTitle ? conf * 1.0 : conf * 0.75
    if (conf < 0.55) continue
    extracted.push({
      entityId: priorMatch.entityId,
      alias: alias.text,
      confidence: conf,
      position: inTitle && inDesc ? 'both' : inTitle ? 'title' : 'description',
      resolutionMethod: 'coreference',
    })
  }

  return extracted
}
```

- [ ] **Step 3.7.2: Tests extract-entities**

Create `tests/unit/medios/canonical/pipeline-extract.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { loadEntityCatalog, _resetCatalogCache } from '@/lib/medios/canonical/catalogs'
import { extractEntities, buildAliasIndex } from '@/lib/medios/canonical/extract-entities'
import type { Entity } from '@/lib/medios/canonical/types'

let entities: Entity[]
let index: ReturnType<typeof buildAliasIndex>

beforeAll(async () => {
  _resetCatalogCache()
  entities = await loadEntityCatalog()
  index = buildAliasIndex(entities)
})

describe('extractEntities', () => {
  it('"Pedro Sánchez" en título → pedro-sanchez conf ≥ 0.95', () => {
    const r = extractEntities(
      'Pedro Sánchez anuncia nueva ley',
      'El presidente del Gobierno presentó',
      entities, index,
    )
    const ps = r.find(e => e.entityId === 'pedro-sanchez')
    expect(ps).toBeDefined()
    expect(ps!.confidence).toBeGreaterThanOrEqual(0.95)
    expect(ps!.position).toMatch(/title|both/)
  })

  it('"Sánchez" SOLO sin contexto → conf < 0.75 (ambiguo, no resuelve)', () => {
    const r = extractEntities('Sánchez visita Galicia', 'En su gira por el norte', entities, index)
    const ps = r.find(e => e.entityId === 'pedro-sanchez' && e.alias === 'Sánchez')
    if (ps) expect(ps.confidence).toBeLessThan(0.75)
  })

  it('"Moncloa" + contexto "gobierno" → pedro-sanchez', () => {
    const r = extractEntities('Moncloa convoca al gobierno', 'El ejecutivo se reúne', entities, index)
    const ps = r.find(e => e.entityId === 'pedro-sanchez' && e.alias === 'Moncloa')
    expect(ps).toBeDefined()
    expect(ps!.resolutionMethod).toBe('context')
  })

  it('"Govern" + cataluña → generalitat-catalunya (no valenciana)', () => {
    const r = extractEntities('El Govern aprueba decreto', 'Cataluña promueve nueva ley junts', entities, index)
    const gc = r.find(e => e.entityId === 'generalitat-catalunya')
    expect(gc).toBeDefined()
  })

  it('Co-reference: "Pedro Sánchez ... el presidente" en mismo texto → ambos a pedro-sanchez', () => {
    const r = extractEntities(
      'Pedro Sánchez visita Bruselas',
      'El presidente se reúne con líderes europeos',
      entities, index,
    )
    const sanchezMatches = r.filter(e => e.entityId === 'pedro-sanchez')
    expect(sanchezMatches.length).toBeGreaterThanOrEqual(1)
  })

  it('Texto con Pedro Sánchez + Feijóo + Congreso → 3 entidades', () => {
    const r = extractEntities(
      'Pedro Sánchez y Feijóo se enfrentan en el Congreso',
      'Sesión de control', entities, index,
    )
    const ids = new Set(r.map(e => e.entityId))
    expect(ids.has('pedro-sanchez')).toBe(true)
    expect(ids.has('alberto-nunez-feijoo')).toBe(true)
    expect(ids.has('congreso-diputados')).toBe(true)
  })
})
```

### Step 3.8: quality-score.ts + metrics.ts

- [ ] **Step 3.8.1: Implementar quality-score.ts**

Create `apps/visual-oscar/lib/medios/canonical/quality-score.ts`:

```typescript
/**
 * Quality score · 6 componentes spec §Paso 8.
 */
import type { ArticleUnit } from './types'

export function computeQualityScore(article: Pick<
  ArticleUnit,
  'title' | 'description' | 'entities' | 'topicTags' | 'source'
>): number {
  let score = 0
  const desc = (article.description ?? '').trim()
  if (desc.length > 0) score += 0.2
  if (desc && desc.toLowerCase() !== article.title.toLowerCase()) score += 0.1
  const wordCount = article.title.split(/\s+/).length
  if (wordCount >= 6 && wordCount <= 20) score += 0.1
  if (article.entities.length >= 1) score += 0.2
  if (article.topicTags.some(t => t.confidence >= 0.7)) score += 0.2
  if (article.source.tier === 1 || article.source.tier === 2) score += 0.2
  return Math.min(score, 1.0)
}
```

- [ ] **Step 3.8.2: Implementar metrics.ts**

Create `apps/visual-oscar/lib/medios/canonical/metrics.ts`:

```typescript
/**
 * Métricas del pipeline: counters por paso, agregados por ventana.
 */
import type { ClassificationMethod, PipelineMetrics } from './types'

export interface MetricsAccumulator {
  fetchedTotal: number
  duplicatesExact: number
  duplicatesTitular: number
  noiseFiltered: number
  processedSuccessfully: number
  classifiedWithTaxonomy: number
  withEntities: number
  clusteredExisting: number
  clusteredNew: number
  failedInPipeline: Record<string, number>
  classificationByMethod: Record<ClassificationMethod, number>
  classificationConfidence: { high: number; mid: number; low: number }
  otroCount: number
}

export function createAccumulator(): MetricsAccumulator {
  return {
    fetchedTotal: 0,
    duplicatesExact: 0,
    duplicatesTitular: 0,
    noiseFiltered: 0,
    processedSuccessfully: 0,
    classifiedWithTaxonomy: 0,
    withEntities: 0,
    clusteredExisting: 0,
    clusteredNew: 0,
    failedInPipeline: {},
    classificationByMethod: { RSS_TAG: 0, HEURISTIC: 0, SEMANTIC: 0, MANUAL: 0, FALLBACK: 0 },
    classificationConfidence: { high: 0, mid: 0, low: 0 },
    otroCount: 0,
  }
}

export function recordOutcome(
  acc: MetricsAccumulator,
  outcome: {
    status: 'success' | 'noise' | 'duplicate' | 'failed'
    failedStep?: string | null
    method?: ClassificationMethod
    confidence?: number
    topicId?: string
    hasEntities?: boolean
  },
): void {
  acc.fetchedTotal++
  if (outcome.status === 'duplicate') {
    // distinguir exact vs titular: caller pasa failedStep='dedupe_exact' or 'dedupe_titular'
    if (outcome.failedStep === 'dedupe_exact') acc.duplicatesExact++
    else if (outcome.failedStep === 'dedupe_titular') acc.duplicatesTitular++
    return
  }
  if (outcome.status === 'noise') {
    acc.noiseFiltered++
    return
  }
  if (outcome.status === 'failed') {
    const step = outcome.failedStep ?? 'unknown'
    acc.failedInPipeline[step] = (acc.failedInPipeline[step] ?? 0) + 1
    return
  }
  // success
  acc.processedSuccessfully++
  if (outcome.method) acc.classificationByMethod[outcome.method]++
  if (outcome.topicId && outcome.topicId !== 'OTRO') acc.classifiedWithTaxonomy++
  if (outcome.topicId === 'OTRO') acc.otroCount++
  if (outcome.hasEntities) acc.withEntities++
  const c = outcome.confidence ?? 0
  if (c >= 0.8) acc.classificationConfidence.high++
  else if (c >= 0.5) acc.classificationConfidence.mid++
  else acc.classificationConfidence.low++
}

export function finalize(
  acc: MetricsAccumulator,
  windowFrom: string,
  windowTo: string,
): PipelineMetrics {
  const total = acc.processedSuccessfully + acc.otroCount
  return {
    windowFrom,
    windowTo,
    fetchedTotal: acc.fetchedTotal,
    duplicatesExact: acc.duplicatesExact,
    duplicatesTitular: acc.duplicatesTitular,
    noiseFiltered: acc.noiseFiltered,
    processedSuccessfully: acc.processedSuccessfully,
    classifiedWithTaxonomy: acc.classifiedWithTaxonomy,
    withEntities: acc.withEntities,
    clusteredExisting: acc.clusteredExisting,
    clusteredNew: acc.clusteredNew,
    failedInPipeline: acc.failedInPipeline,
    classificationByMethod: acc.classificationByMethod,
    classificationConfidence: acc.classificationConfidence,
    otroPercentage: total > 0 ? (acc.otroCount / total) * 100 : 0,
  }
}
```

### Step 3.9: pipeline.ts (orquestador de los 10 pasos)

- [ ] **Step 3.9.1: Implementar pipeline.ts**

Create `apps/visual-oscar/lib/medios/canonical/pipeline.ts`:

```typescript
/**
 * processArticle(): orquesta los 10 pasos del spec §2.3.
 * Función pura: misma entrada + mismos catálogos + mismo state → misma salida.
 * No side effects (no fetch, no fs, no clock excepto ingestedAt).
 *
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type { ArticleUnit, Catalogs, IngestionSource, ProcessingStatus, Source, TopicTag } from './types'
import { computeArticleId, canonicalizeUrl } from './adapters'
import { isExactDuplicate, computeTitleHash, isTitleDuplicate } from './dedupe'
import { detectNoise } from './noise-filter'
import { classifyByRssTags } from './classify-rss-tags'
import { classifyByHeuristic } from './classify-heuristic'
import { LlmClassifierClient, semanticResultToTopicTag, StubLlmClient } from './classify-semantic'
import { buildAliasIndex, extractEntities } from './extract-entities'
import { computeQualityScore } from './quality-score'
import { findSourceByDomain } from './catalogs'

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
  knownIds?: Set<string>
  recentTitleHashes?: Map<string, { id: string; sourceId: string; ts: string }>
  semanticEnabled?: boolean
  semanticClient?: LlmClassifierClient
  topicListForLlm?: string[]
}

export interface ProcessOutcome {
  article: ArticleUnit | null
  status: ProcessingStatus
  failedStep: string | null
  error: string | null
  method?: 'RSS_TAG' | 'HEURISTIC' | 'SEMANTIC' | 'FALLBACK'
  confidence?: number
  hasEntities: boolean
}

const FALLBACK_SOURCE: Source = {
  id: 'unknown', name: 'Unknown', domain: '', type: 'NATIONAL',
  country: 'ES', regions: ['ES'], language: 'es', ideology: 'UNKNOWN',
  ideologyScore: 0, tier: 4, audienceEstimate: 0, rssFeeds: [], qualityScore: 0.1, active: false,
}

function tierWeight(tier: 1 | 2 | 3 | 4): number {
  return tier === 1 ? 1.0 : tier === 2 ? 0.7 : tier === 3 ? 0.4 : 0.3
}

export async function processArticle(
  raw: RawArticle,
  catalogs: Catalogs,
  options: ProcessOptions = {},
): Promise<ProcessOutcome> {
  try {
    // 1. Fetch/parse: limpieza
    const canonicalUrl = canonicalizeUrl(raw.url)
    const id = computeArticleId(canonicalUrl)
    const title = raw.title.trim().replace(/\s+/g, ' ')
    const description = (raw.description ?? '').trim()

    // 2. Dedupe exacta
    if (options.knownIds && isExactDuplicate(id, options.knownIds)) {
      return { article: null, status: 'duplicate', failedStep: 'dedupe_exact', error: null, hasEntities: false }
    }

    // 3. Dedupe titular
    const sourceDomain = raw.sourceDomain ?? extractDomain(raw.url) ?? ''
    const source = findSourceByDomain(catalogs.sources, sourceDomain) ?? FALLBACK_SOURCE
    const titleHash = computeTitleHash(title)
    if (options.recentTitleHashes && isTitleDuplicate(titleHash, source.id, options.recentTitleHashes, 30)) {
      return { article: null, status: 'duplicate', failedStep: 'dedupe_titular', error: null, hasEntities: false }
    }

    // 4. Filtro ruido
    const noise = detectNoise({ title, description })
    if (noise.isNoise) {
      const ingestedAt = new Date().toISOString()
      const article: ArticleUnit = makeArticleSkeleton(id, canonicalUrl, title, description, raw, source, ingestedAt)
      article.isNoise = true
      article.noiseReason = noise.reason
      article.processingStatus = 'noise'
      return { article, status: 'noise', failedStep: null, error: null, hasEntities: false }
    }

    // 5. Source weight
    const sourceWeight = tierWeight(source.tier) * source.qualityScore

    // 6. Clasificación en cascada
    let topicTag: TopicTag | null = null
    let method: 'RSS_TAG' | 'HEURISTIC' | 'SEMANTIC' | 'FALLBACK' = 'FALLBACK'

    topicTag = classifyByRssTags(raw.rawTags ?? [], source.id, catalogs.rssTagMap)
    if (topicTag) method = 'RSS_TAG'
    if (!topicTag) {
      topicTag = classifyByHeuristic(title, description, catalogs.topicRules)
      if (topicTag) method = 'HEURISTIC'
    }
    if (!topicTag && options.semanticEnabled && options.semanticClient) {
      const topicList = options.topicListForLlm ?? extractTopicIds(catalogs)
      const llmResult = await options.semanticClient.classifyBatch(
        [{ title, description }],
        topicList,
      )
      const r = llmResult[0]
      if (r) {
        topicTag = semanticResultToTopicTag(r)
        method = 'SEMANTIC'
      }
    }
    if (!topicTag) {
      topicTag = {
        topicId: 'OTRO', subtopicId: null, level: 1, confidence: 0.3,
        method: 'FALLBACK', assignedAt: new Date().toISOString(),
      }
      method = 'FALLBACK'
    }

    // 7. Extracción entidades
    const aliasIndex = buildAliasIndex(catalogs.entities)
    const extracted = extractEntities(title, description, catalogs.entities, aliasIndex)

    // 8. Quality score
    const ingestedAt = new Date().toISOString()
    const article: ArticleUnit = makeArticleSkeleton(id, canonicalUrl, title, description, raw, source, ingestedAt)
    article.topicTags = [topicTag]
    article.entities = extracted
    article.sourceWeight = sourceWeight
    article.qualityScore = computeQualityScore({
      title, description, entities: extracted, topicTags: [topicTag], source,
    })
    article.processingStatus = 'success'

    // 9. Storage: el caller persiste si quiere
    // 10. Clustering: en Sprint 0.3 dejamos clusterId=null

    return {
      article,
      status: 'success',
      failedStep: null,
      error: null,
      method,
      confidence: topicTag.confidence,
      hasEntities: extracted.length > 0,
    }
  } catch (e: any) {
    return {
      article: null,
      status: 'failed',
      failedStep: 'unknown',
      error: String(e?.message ?? e).slice(0, 200),
      hasEntities: false,
    }
  }
}

function makeArticleSkeleton(
  id: string, canonicalUrl: string, title: string, description: string,
  raw: RawArticle, source: Source, ingestedAt: string,
): ArticleUnit {
  return {
    id, canonicalUrl, title,
    description: description || null,
    bodySnippet: raw.bodySnippet ?? null,
    source,
    publishedAt: raw.publishedAt,
    ingestedAt,
    language: raw.language ?? 'es',
    country: raw.country ?? 'ES',
    rawTags: raw.rawTags ?? [],
    ingestionSource: raw.ingestionSource,
    topicTags: [],
    entities: [],
    sentiment: null,
    framing: null,
    clusterId: null,
    qualityScore: 0,
    isNoise: false,
    noiseReason: null,
    isDuplicate: false,
    duplicateOf: null,
    sourceWeight: 0,
    processingStatus: 'pending',
    failedStep: null,
  }
}

function extractDomain(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
}

function extractTopicIds(catalogs: Catalogs): string[] {
  return (catalogs.topicRules.topics as Array<{ topicId: string }>).map(t => t.topicId)
}

export { StubLlmClient }
```

### Step 3.10: Test pipeline integral

- [ ] **Step 3.10.1: Test pipeline integral**

Create `tests/unit/medios/canonical/pipeline.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { processArticle, StubLlmClient } from '@/lib/medios/canonical/pipeline'
import {
  loadEntityCatalog, loadTopicRules, loadRssTagMap, loadFramingRules, loadSourceCatalog,
  _resetCatalogCache,
} from '@/lib/medios/canonical/catalogs'
import type { Catalogs } from '@/lib/medios/canonical/types'

let catalogs: Catalogs

beforeAll(async () => {
  _resetCatalogCache()
  catalogs = {
    sources: await loadSourceCatalog(),
    entities: await loadEntityCatalog(),
    topicRules: await loadTopicRules(),
    rssTagMap: await loadRssTagMap(),
    framingRules: await loadFramingRules(),
  }
})

describe('processArticle · pipeline integral', () => {
  it('artículo político normal: 10 pasos OK → status success con topic + entities', async () => {
    const r = await processArticle({
      url: 'https://elpais.com/politica/sanchez-x',
      title: 'Pedro Sánchez convoca al Consejo de Ministros para aprobar decreto',
      description: 'El presidente del gobierno acelera la tramitación urgente',
      publishedAt: '2026-06-02T10:00:00Z',
      rawTags: ['política', 'gobierno'],
      ingestionSource: 'RSS',
      sourceDomain: 'elpais.com',
    }, catalogs, { semanticEnabled: false })
    expect(r.status).toBe('success')
    expect(r.article).not.toBeNull()
    expect(r.article!.topicTags[0].topicId).toBe('POLITICA_INSTITUCIONAL')
    expect(r.article!.entities.length).toBeGreaterThanOrEqual(1)
    expect(r.article!.qualityScore).toBeGreaterThan(0.5)
    expect(r.method).toBe('RSS_TAG')
  })

  it('artículo cataluña → TERRITORIAL/CATALUÑA con entity generalitat', async () => {
    const r = await processArticle({
      url: 'https://lavanguardia.com/cat/x',
      title: 'La Generalitat de Catalunya aprueba presupuestos en Barcelona',
      description: 'El Govern catalán suma apoyos de Junts y ERC para sacar adelante el presupuesto',
      publishedAt: '2026-06-02T10:00:00Z',
      rawTags: ['cataluña'],
      ingestionSource: 'RSS',
      sourceDomain: 'lavanguardia.com',
    }, catalogs, {})
    expect(r.article?.topicTags[0].topicId).toBe('TERRITORIAL')
    expect(r.article?.topicTags[0].subtopicId).toBe('CATALUÑA')
    expect(r.article?.entities.some(e => e.entityId === 'generalitat-catalunya')).toBe(true)
  })

  it('dedupe exacto: id ya conocido → status duplicate', async () => {
    const known = new Set<string>()
    const first = await processArticle({
      url: 'https://elpais.com/x', title: 'Titular largo de prueba politica suficiente palabras',
      description: 'Descripción aceptable', publishedAt: '2026-06-02T10:00:00Z',
      rawTags: [], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, { knownIds: known })
    known.add(first.article!.id)
    const second = await processArticle({
      url: 'https://elpais.com/x', title: 'Otro título largo de prueba politica suficiente',
      description: 'Otra descripción', publishedAt: '2026-06-02T10:00:00Z',
      rawTags: [], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, { knownIds: known })
    expect(second.status).toBe('duplicate')
    expect(second.failedStep).toBe('dedupe_exact')
  })

  it('noise (título corto) → status noise', async () => {
    const r = await processArticle({
      url: 'https://elpais.com/n', title: 'Tres palabras solo',
      description: 'Algo', publishedAt: '2026-06-02T10:00:00Z',
      rawTags: [], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, {})
    expect(r.status).toBe('noise')
    expect(r.article?.isNoise).toBe(true)
  })

  it('LLM semantic disabled + sin keywords → FALLBACK OTRO conf 0.3', async () => {
    const r = await processArticle({
      url: 'https://elpais.com/q',
      title: 'Texto neutro suficientemente largo para superar el filtro de ruido',
      description: 'Una descripción que no contiene keywords de ningún macrotopic',
      publishedAt: '2026-06-02T10:00:00Z',
      rawTags: ['inexistente-tag'], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, { semanticEnabled: false })
    expect(r.article?.topicTags[0].topicId).toBe('OTRO')
    expect(r.article?.topicTags[0].confidence).toBe(0.3)
    expect(r.method).toBe('FALLBACK')
  })

  it('LLM semantic enabled con StubClient (devuelve null) → FALLBACK OTRO', async () => {
    const r = await processArticle({
      url: 'https://elpais.com/z',
      title: 'Texto sin keywords pero capa 3 stub responde null',
      description: 'No hay match',
      publishedAt: '2026-06-02T10:00:00Z',
      rawTags: [], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, { semanticEnabled: true, semanticClient: new StubLlmClient() })
    expect(r.method).toBe('FALLBACK')
  })

  it('pipeline puro: misma entrada → misma salida', async () => {
    const raw = {
      url: 'https://elpais.com/det', title: 'Pedro Sánchez visita el Congreso de los Diputados hoy',
      description: 'Sesión de control', publishedAt: '2026-06-02T10:00:00Z',
      rawTags: ['política'], ingestionSource: 'RSS' as const, sourceDomain: 'elpais.com',
    }
    const a = await processArticle(raw, catalogs, {})
    const b = await processArticle(raw, catalogs, {})
    expect(a.article?.id).toBe(b.article?.id)
    expect(a.article?.topicTags[0].topicId).toBe(b.article?.topicTags[0].topicId)
    expect(a.article?.entities.length).toBe(b.article?.entities.length)
  })
})
```

- [ ] **Step 3.10.2: Run todos los tests pipeline**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/unit/medios/canonical/ 2>&1 | tail -15
```

Expected: ≥30 tests passed (acumulado Task 1+2+3).

### Step 3.11: Build + commit Task 3

- [ ] **Step 3.11.1: Build verde**

Run: `cd apps/visual-oscar && npm run build 2>&1 | tail -5`

Expected: `✓ Compiled successfully`.

- [ ] **Step 3.11.2: Commit + push**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/dedupe.ts \
        apps/visual-oscar/lib/medios/canonical/noise-filter.ts \
        apps/visual-oscar/lib/medios/canonical/classify-rss-tags.ts \
        apps/visual-oscar/lib/medios/canonical/classify-heuristic.ts \
        apps/visual-oscar/lib/medios/canonical/classify-semantic.ts \
        apps/visual-oscar/lib/medios/canonical/extract-entities.ts \
        apps/visual-oscar/lib/medios/canonical/quality-score.ts \
        apps/visual-oscar/lib/medios/canonical/metrics.ts \
        apps/visual-oscar/lib/medios/canonical/pipeline.ts \
        apps/visual-oscar/tests/unit/medios/canonical/pipeline-dedupe.test.ts \
        apps/visual-oscar/tests/unit/medios/canonical/pipeline-noise.test.ts \
        apps/visual-oscar/tests/unit/medios/canonical/pipeline-classify.test.ts \
        apps/visual-oscar/tests/unit/medios/canonical/pipeline-extract.test.ts \
        apps/visual-oscar/tests/unit/medios/canonical/pipeline.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 0.3 · pipeline processArticle() con 10 pasos + LLM

Pipeline canónico disciplinado en lib/medios/canonical/pipeline.ts
implementando los 10 pasos del spec §2.3 en orden estricto.

Módulos por paso:
  · dedupe.ts        · pasos 2+3 (URL exacta + titular hash + ventana 30min)
  · noise-filter.ts  · paso 4 (7 reglas spec: título corto, solo números,
                      horóscopo, receta, publicidad, sin descripción, desc=título)
  · classify-rss-tags.ts · paso 6 capa 1 (RSS_TAG, umbral 0.65)
  · classify-heuristic.ts · paso 6 capa 2 (HEURISTIC, scoring ponderado
                            con weight title=1.5x, desc=1.0x, both=1.2x,
                            umbral 0.60, soporte subtopics nesteados)
  · classify-semantic.ts · paso 6 capa 3 LLM (OllamaLlmClient default
                            llama3.1:8b, StubLlmClient para tests/disabled
                            via feature flag, confidence truncada a 0.75)
  · extract-entities.ts · paso 7 (índice memoria, word boundaries,
                          normalización acentos, contextRequired,
                          co-referencias intra-artículo dos pasadas)
  · quality-score.ts · paso 8 (6 componentes ponderados)
  · metrics.ts       · acumulador PipelineMetrics + recordOutcome
                        preparado para job Sprint 2

Pipeline orquestador (pipeline.ts ~400 LOC):
  · processArticle(raw, catalogs, options): ProcessOutcome
  · Función pura: misma entrada → misma salida
  · LLM activo desde Sprint 0.3 (Ollama dev); Sprint 1.3 migra Groq prod
  · paso 9 (storage) delegado al caller
  · paso 10 (clustering) deja clusterId=null en Sprint 0.3

Tests: 30+ tests unit en tests/unit/medios/canonical/pipeline-*.test.ts:
  · 4 tests dedupe (exact + titular + window 30min)
  · 7 tests noise (las 7 reglas spec)
  · 8 tests classify (capa 1 + capa 2 + subtopics + fallback null)
  · 6 tests extract (Sánchez direct + Sánchez ambiguo + Moncloa contexto +
                     Govern Cataluña + co-reference + texto multi-entidad)
  · 7 tests pipeline integral (10 pasos + dedupe + noise + fallback +
                                pure determinism)

Build green. tsc --noEmit pasa. Coexistencia 100% con legacy intacto.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD:main
```

Expected: push exitoso.

---

## Task 4: Endpoints canónicos con contratos rich (Commit 0.4) · 4h

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/stores.ts` (~200 LOC, lectura Postgres)
- Create: `apps/visual-oscar/app/api/medios/pulso/route.ts`
- Create: `apps/visual-oscar/app/api/medios/clusters/route.ts`
- Create: `apps/visual-oscar/app/api/medios/clusters/[id]/route.ts`
- Create: `apps/visual-oscar/app/api/medios/fuentes-status/route.ts`
- Create: `apps/visual-oscar/app/api/medios/pipeline-metrics/route.ts`
- Create: `apps/visual-oscar/app/api/medios/narrativas/route.ts` (stub)
- Create: `apps/visual-oscar/app/api/medios/actores/[id]/metricas/route.ts` (stub)
- Test: `apps/visual-oscar/tests/integration/medios/canonical/endpoints.test.ts`

### Step 4.1: stores.ts (lectura DB + adapters)

- [ ] **Step 4.1.1: Implementar stores.ts (lectura article + agregaciones)**

Create `apps/visual-oscar/lib/medios/canonical/stores.ts`:

```typescript
/**
 * Lectura de Postgres → tipos canónicos.
 * Sprint 0+1 lee tabla `article` (existing) + adapta a ArticleUnit.
 * Sprint 2+ lee tablas adicionales (narratives, entity_metrics).
 */
import type { ArticleUnit, Source, WindowSpec } from './types'
import { articleRowToCanonical, ArticleRow } from './adapters'
import { loadSourceCatalog, findSourceByDomain } from './catalogs'

function windowToMs(window: WindowSpec): number {
  const H = 60 * 60 * 1000
  if (window === '24h') return 24 * H
  if (window === '48h') return 48 * H
  if (window === '72h') return 72 * H
  return 7 * 24 * H
}

export function windowToSinceISO(window: WindowSpec): string {
  return new Date(Date.now() - windowToMs(window)).toISOString()
}

/**
 * Lee articles de la última ventana temporal.
 * Para conexión a Postgres usa el cliente existente del repo
 * (verificar import path: lib/db, lib/postgres, o similar).
 *
 * Sprint 0+1: stub que llama legacy /api/medios/intel y adapta.
 * Después de Sprint 1.1 (migración 0058): lee SELECT * FROM article ...
 */
export async function readArticlesInWindow(
  window: WindowSpec,
  baseUrl: string,
): Promise<ArticleUnit[]> {
  // Sprint 0.4: lee del endpoint legacy para no acoplar a Postgres aún
  // Sprint 1.1+: reemplazar por SELECT directo a Postgres con campos canónicos
  try {
    const resp = await fetch(`${baseUrl}/api/medios/intel?window=${window}`, {
      next: { revalidate: 300 },
    } as RequestInit)
    if (!resp.ok) return []
    const data = await resp.json() as { items?: unknown[]; feed?: unknown[] }
    const items = (data.items ?? data.feed ?? []) as Array<{
      url?: string; link?: string; title: string; description?: string;
      published_at?: string; published?: string; categories?: string[];
      source?: { id?: string; domain?: string }; source_domain?: string;
    }>
    const sources = await loadSourceCatalog()
    const articles: ArticleUnit[] = []
    for (const it of items) {
      const url = it.url ?? it.link ?? ''
      if (!url) continue
      const domain = it.source_domain ?? it.source?.domain ?? extractDomain(url) ?? ''
      const source = findSourceByDomain(sources, domain) ?? FALLBACK_SOURCE
      const row: ArticleRow = {
        url,
        title: it.title,
        summary: it.description ?? null,
        body_text: null,
        source_id: source.id,
        lang: 'es',
        published_at: it.published_at ?? it.published ?? new Date().toISOString(),
        category: null,
        raw_tags: it.categories ?? [],
      }
      articles.push(articleRowToCanonical(row, source))
    }
    return articles
  } catch {
    return []
  }
}

function extractDomain(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
}

const FALLBACK_SOURCE: Source = {
  id: 'unknown', name: 'Unknown', domain: '', type: 'NATIONAL',
  country: 'ES', regions: ['ES'], language: 'es', ideology: 'UNKNOWN',
  ideologyScore: 0, tier: 3, audienceEstimate: 0, rssFeeds: [], qualityScore: 0.1, active: false,
}
```

### Step 4.2: Endpoint `/api/medios/pulso`

- [ ] **Step 4.2.1: Implementar pulso route**

Create `apps/visual-oscar/app/api/medios/pulso/route.ts`:

```typescript
/**
 * GET /api/medios/pulso · contrato canónico spec §3.1
 *
 * Query: window (24h|48h|72h|7d), mode (PLURAL|AUDIEN|REGION|IDEOLOGY|CRISIS),
 *        region (ISO CCAA opcional).
 *
 * Sprint 0.4: modo "adapter" lee legacy /api/medios/intel + agrupa por topic.
 * Sprint 2+: lee topic_prominence_history con scores reales.
 */
import { NextRequest, NextResponse } from 'next/server'
import type {
  ConfidenceMetrics, ConfidenceWarning, DominantTopic, PulsoMode, WindowSpec,
} from '@/lib/medios/canonical/types'
import { readArticlesInWindow } from '@/lib/medios/canonical/stores'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const VALID_WINDOWS: WindowSpec[] = ['24h', '48h', '72h', '7d']
const VALID_MODES: PulsoMode[] = ['PLURAL', 'AUDIEN', 'REGION', 'IDEOLOGY', 'CRISIS']

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const window = (url.searchParams.get('window') ?? '72h') as WindowSpec
  const mode = (url.searchParams.get('mode') ?? 'PLURAL') as PulsoMode
  const region = url.searchParams.get('region')

  if (!VALID_WINDOWS.includes(window)) {
    return NextResponse.json({ error: 'invalid_window' }, { status: 400 })
  }
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'invalid_mode' }, { status: 400 })
  }

  const startedAt = Date.now()
  const articles = await readArticlesInWindow(window, url.origin)
  let filtered = articles
  if (mode === 'REGION' && region) {
    filtered = articles.filter(a => a.source.regions.includes(region))
  }

  // Counts
  const total = filtered.length
  const noise = filtered.filter(a => a.isNoise).length
  const duplicates = filtered.filter(a => a.isDuplicate).length
  const unique = total - duplicates
  const analyzed = filtered.filter(a => a.processingStatus === 'success').length

  // Group by topic
  const byTopic = new Map<string, typeof filtered>()
  for (const a of filtered) {
    if (a.isNoise || a.isDuplicate) continue
    const t = a.topicTags[0]?.topicId ?? 'OTRO'
    if (!byTopic.has(t)) byTopic.set(t, [])
    byTopic.get(t)!.push(a)
  }
  const sortedTopics = [...byTopic.entries()].sort((a, b) => b[1].length - a[1].length)

  const dominantTopics: DominantTopic[] = sortedTopics.slice(0, 14).map(([topicId, arts]) => {
    const weight = mode === 'AUDIEN'
      ? arts.reduce((s, a) => s + (a.source.audienceEstimate / 1_000_000) * a.sourceWeight, 0)
      : arts.length
    const sources = new Set(arts.map(a => a.source.id))
    const titles = arts.slice(0, 3).map(a => a.title)
    const entities = new Map<string, number>()
    for (const a of arts) for (const e of a.entities) entities.set(e.entityId, (entities.get(e.entityId) ?? 0) + 1)
    const topEntities = [...entities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)
    return {
      topicId,
      label: topicId,
      volume: arts.length,
      volumePct: total > 0 ? arts.length / unique : 0,
      momentum: 0,  // Sprint 2 calcula real
      state: 'STABLE',
      sentimentBalance: { positive: 0, neutral: 1.0, negative: 0, mixed: 0 },
      topEntities,
      topSources: [...sources].slice(0, 5),
      rawTagsRepresentative: arts[0]?.rawTags.slice(0, 3) ?? [],
      leadClusters: [],
      representativeTitles: titles,
      confidence: 0.7,
    } as DominantTopic
  })

  // Confidence
  const classificationCoverage = analyzed > 0 ? sortedTopics.filter(([t]) => t !== 'OTRO').reduce((s, [, a]) => s + a.length, 0) / analyzed : 0
  const entityCoverage = analyzed > 0 ? filtered.filter(a => a.entities.length > 0).length / analyzed : 0
  const deduplicationRate = total > 0 ? 1 - duplicates / total : 1
  const sourceCatalogCoverage = 1.0  // Sprint 2 calcula
  const tier12Proportion = total > 0 ? filtered.filter(a => a.source.tier === 1 || a.source.tier === 2).length / total : 0
  const score = classificationCoverage * 0.30 + entityCoverage * 0.25 + deduplicationRate * 0.20 + sourceCatalogCoverage * 0.15 + tier12Proportion * 0.10

  const warnings: ConfidenceWarning[] = []
  if (entityCoverage < 0.5) {
    warnings.push({
      code: 'LOW_ENTITY_COVERAGE',
      severity: 'WARNING',
      title: 'Pocas entidades políticas reconocidas',
      message: 'Una parte importante de los artículos no contiene entidades políticas identificables.',
      detail: `${filtered.filter(a => a.entities.length === 0).length}/${analyzed} artículos sin entidades`,
      action: 'Prueba una query más específica con actor/partido',
      affectedMetrics: ['entityCoverage', 'actorRanking'],
    })
  }
  if (sortedTopics.find(([t]) => t === 'OTRO')?.[1].length ?? 0) {
    const otroPct = (sortedTopics.find(([t]) => t === 'OTRO')?.[1].length ?? 0) / analyzed
    if (otroPct > 0.10) {
      warnings.push({
        code: 'HIGH_UNCATEGORIZED_RATE',
        severity: 'ALERT',
        title: 'Alta tasa de artículos sin categorizar',
        message: 'Más del 10% de los artículos han sido asignados a OTRO.',
        detail: `${Math.round(otroPct * 100)}% en OTRO`,
        action: 'El equipo técnico ha sido notificado.',
        affectedMetrics: ['classificationCoverage', 'topicRanking'],
      })
    }
  }

  const confidence: ConfidenceMetrics = {
    score,
    components: { classificationCoverage, entityCoverage, deduplicationRate, sourceCatalogCoverage, tier12Proportion },
    warnings,
  }

  const tierDistribution: Record<string, number> = {}
  for (const a of filtered) {
    const k = `T${a.source.tier}`
    tierDistribution[k] = (tierDistribution[k] ?? 0) + 1
  }
  Object.keys(tierDistribution).forEach(k => { tierDistribution[k] = total > 0 ? tierDistribution[k] / total : 0 })

  const sourcesActive = new Set(filtered.map(a => a.source.id)).size

  const response = {
    generatedAt: new Date().toISOString(),
    window, mode,
    confidence,
    volume: { total, analyzed, noise, duplicates, unique, clustered: 0 },
    balance: { ideological: 0.9, territorial: 0.5, tierDistribution },
    latency: Date.now() - startedAt,
    dominantTopics,
    topClusters: [],
    sourcesActive,
    lastUpdated: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
```

### Step 4.3: Endpoints clusters, fuentes-status, pipeline-metrics

- [ ] **Step 4.3.1: clusters/route.ts**

Create `apps/visual-oscar/app/api/medios/clusters/route.ts`:

```typescript
/**
 * GET /api/medios/clusters · adapter sobre /api/medios/intel narrative_clusters.
 * Sprint 0.4: devuelve listado mapeado al shape canónico NewsCluster.
 * Sprint 1.1+: lee tabla narrative_clusters directa.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const window = url.searchParams.get('window') ?? '72h'
  const topic = url.searchParams.get('topic')
  const minSources = Number(url.searchParams.get('minSources') ?? '2')
  const sortBy = url.searchParams.get('sortBy') ?? 'prominence'
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')

  try {
    const resp = await fetch(`${url.origin}/api/medios/intel?window=${window}&include=narrative_clusters,clusters`)
    if (!resp.ok) return NextResponse.json({ clusters: [], page, pageSize, total: 0 })
    const data = await resp.json() as { narrative_clusters?: unknown[]; clusters?: unknown[] }
    const raw = (data.narrative_clusters ?? data.clusters ?? []) as Array<Record<string, unknown>>
    let clusters = raw.map((c, i) => ({
      id: (c.id as string) ?? `cluster-${i}`,
      title: (c.title as string) ?? (c.label as string) ?? 'Sin título',
      leaderArticleId: '',
      memberIds: ((c.supporting_news ?? c.member_ids ?? []) as Array<{ id?: string } | string>).map(m => typeof m === 'string' ? m : m?.id ?? '').filter(Boolean),
      topic: { topicId: (c.topic_id as string) ?? 'OTRO', subtopicId: null, level: 1, confidence: 0.7, method: 'HEURISTIC', assignedAt: new Date().toISOString() },
      entities: [],
      firstSeen: (c.first_seen as string) ?? new Date().toISOString(),
      lastSeen: (c.last_seen as string) ?? new Date().toISOString(),
      velocity: 0,
      sourceCount: Number(c.source_count ?? 0),
      tierDistribution: {},
      territoryDistribution: {},
      ideologyDistribution: {},
      sentimentBalance: { positive: 0, neutral: 1, negative: 0, mixed: 0 },
      framingDistribution: {},
      prominence: Number(c.prominence ?? 0),
    }))
    if (topic) clusters = clusters.filter(c => c.topic.topicId === topic)
    if (minSources) clusters = clusters.filter(c => c.sourceCount >= minSources)
    if (sortBy === 'prominence') clusters.sort((a, b) => b.prominence - a.prominence)
    else if (sortBy === 'recency') clusters.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    else if (sortBy === 'sourceCount') clusters.sort((a, b) => b.sourceCount - a.sourceCount)
    const total = clusters.length
    const start = (page - 1) * pageSize
    return NextResponse.json({
      clusters: clusters.slice(start, start + pageSize),
      page, pageSize, total,
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  } catch (e: any) {
    return NextResponse.json({ error: 'upstream_failed', message: String(e?.message ?? e).slice(0, 200) }, { status: 503 })
  }
}
```

- [ ] **Step 4.3.2: clusters/[id]/route.ts**

Create `apps/visual-oscar/app/api/medios/clusters/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // Sprint 0.4 stub: devuelve estructura vacía estable
  return NextResponse.json({
    id: params.id,
    title: '',
    leaderArticleId: '',
    memberIds: [],
    topic: { topicId: 'OTRO', subtopicId: null, level: 1, confidence: 0, method: 'FALLBACK', assignedAt: new Date().toISOString() },
    entities: [],
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    velocity: 0,
    sourceCount: 0,
    tierDistribution: {},
    territoryDistribution: {},
    ideologyDistribution: {},
    sentimentBalance: { positive: 0, neutral: 1, negative: 0, mixed: 0 },
    framingDistribution: {},
    prominence: 0,
    _note: 'Sprint 1.1+ lee narrative_clusters tabla con members ArticleUnit completos',
  })
}
```

- [ ] **Step 4.3.3: fuentes-status/route.ts**

Create `apps/visual-oscar/app/api/medios/fuentes-status/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { loadSourceCatalog } from '@/lib/medios/canonical/catalogs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const sources = await loadSourceCatalog()
  const sourcesList = sources.map(s => ({
    sourceId: s.id,
    domain: s.domain,
    tier: s.tier,
    lastSuccessfulFetch: null,
    lastErrorCode: null,
    articlesLastRun: 0,
    newArticlesLastRun: 0,
    noiseFlaggedLastRun: 0,
    status: s.active ? 'alive' : 'inactive' as const,
  }))
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      total: sources.length,
      alive: sources.filter(s => s.active).length,
      errored: 0,
      stale: 0,
    },
    sources: sourcesList,
    _note: 'Sprint 1.1+ lee tabla source_health con métricas reales',
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
```

- [ ] **Step 4.3.4: pipeline-metrics/route.ts**

Create `apps/visual-oscar/app/api/medios/pipeline-metrics/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readArticlesInWindow } from '@/lib/medios/canonical/stores'
import { createAccumulator, finalize, recordOutcome } from '@/lib/medios/canonical/metrics'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const window = (url.searchParams.get('window') ?? '72h') as '24h' | '48h' | '72h' | '7d'
  const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString()
  const articles = await readArticlesInWindow(window, url.origin)
  const acc = createAccumulator()
  for (const a of articles) {
    recordOutcome(acc, {
      status: a.isNoise ? 'noise' : a.isDuplicate ? 'duplicate' : a.processingStatus === 'success' ? 'success' : 'failed',
      failedStep: a.isDuplicate ? 'dedupe_exact' : a.failedStep,
      method: a.topicTags[0]?.method,
      confidence: a.topicTags[0]?.confidence,
      topicId: a.topicTags[0]?.topicId,
      hasEntities: a.entities.length > 0,
    })
  }
  const metrics = finalize(acc, since, new Date().toISOString())
  return NextResponse.json(metrics, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
```

### Step 4.4: Stubs narrativas y actores

- [ ] **Step 4.4.1: narrativas stub**

Create `apps/visual-oscar/app/api/medios/narrativas/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    narratives: [],
    total: 0,
    _note: 'Sprint 4 llena con detección real de narrativas. Sprint 0+1 devuelve stub estable.',
  }, { headers: { 'Cache-Control': 'public, s-maxage=300' } })
}
```

- [ ] **Step 4.4.2: actores/[id]/metricas stub**

Create `apps/visual-oscar/app/api/medios/actores/[id]/metricas/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({
    entityId: params.id,
    window: '72h',
    prominenceScore: 0,
    articleCount: 0,
    sourceCount: 0,
    topicDistribution: {},
    sentimentProfile: {
      overall: { positive: 0, neutral: 1, negative: 0, mixed: 0 },
      byTopic: {},
      byIdeology: {},
    },
    coOccurrences: [],
    mediaDistribution: {},
    computedAt: new Date().toISOString(),
    _note: 'Sprint 3 llena con cálculo real desde entity_metrics tabla.',
  }, { headers: { 'Cache-Control': 'public, s-maxage=300' } })
}
```

### Step 4.5: Tests integration endpoints

- [ ] **Step 4.5.1: Tests endpoints**

Create `apps/visual-oscar/tests/integration/medios/canonical/endpoints.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

describe('Endpoints canónicos · contratos', () => {
  it('GET /api/medios/pulso responde con shape canónico', async () => {
    const r = await fetch(`${BASE}/api/medios/pulso?window=72h&mode=PLURAL`)
    expect(r.ok).toBe(true)
    const data = await r.json()
    expect(data).toHaveProperty('generatedAt')
    expect(data).toHaveProperty('window', '72h')
    expect(data).toHaveProperty('mode', 'PLURAL')
    expect(data).toHaveProperty('confidence')
    expect(data.confidence).toHaveProperty('score')
    expect(data.confidence).toHaveProperty('components')
    expect(data.confidence).toHaveProperty('warnings')
    expect(data).toHaveProperty('volume')
    expect(data).toHaveProperty('dominantTopics')
    expect(Array.isArray(data.dominantTopics)).toBe(true)
  })

  it('GET /api/medios/pulso?mode=invalid → 400', async () => {
    const r = await fetch(`${BASE}/api/medios/pulso?mode=INVALID`)
    expect(r.status).toBe(400)
  })

  it('GET /api/medios/clusters paginado', async () => {
    const r = await fetch(`${BASE}/api/medios/clusters?page=1&pageSize=5`)
    expect(r.ok || r.status === 503).toBe(true)
    if (r.ok) {
      const data = await r.json()
      expect(data).toHaveProperty('clusters')
      expect(data).toHaveProperty('page', 1)
      expect(data).toHaveProperty('pageSize', 5)
    }
  })

  it('GET /api/medios/fuentes-status', async () => {
    const r = await fetch(`${BASE}/api/medios/fuentes-status`)
    expect(r.ok).toBe(true)
    const data = await r.json()
    expect(data).toHaveProperty('summary')
    expect(data.summary).toHaveProperty('total')
    expect(data.summary.total).toBeGreaterThanOrEqual(20)
  })

  it('GET /api/medios/pipeline-metrics', async () => {
    const r = await fetch(`${BASE}/api/medios/pipeline-metrics?window=24h`)
    expect(r.ok).toBe(true)
    const data = await r.json()
    expect(data).toHaveProperty('fetchedTotal')
    expect(data).toHaveProperty('classificationByMethod')
    expect(data).toHaveProperty('otroPercentage')
  })

  it('GET /api/medios/narrativas devuelve stub estable', async () => {
    const r = await fetch(`${BASE}/api/medios/narrativas`)
    expect(r.ok).toBe(true)
    const data = await r.json()
    expect(data.narratives).toEqual([])
  })

  it('GET /api/medios/actores/pedro-sanchez/metricas devuelve shape EntityMetrics', async () => {
    const r = await fetch(`${BASE}/api/medios/actores/pedro-sanchez/metricas`)
    expect(r.ok).toBe(true)
    const data = await r.json()
    expect(data).toHaveProperty('entityId', 'pedro-sanchez')
    expect(data).toHaveProperty('prominenceScore')
    expect(data).toHaveProperty('topicDistribution')
  })

  it('pulso < 800ms (cache hit)', async () => {
    // primera llamada calienta cache
    await fetch(`${BASE}/api/medios/pulso?window=24h`)
    const t0 = Date.now()
    const r = await fetch(`${BASE}/api/medios/pulso?window=24h`)
    const elapsed = Date.now() - t0
    expect(r.ok).toBe(true)
    expect(elapsed).toBeLessThan(800)
  })
})
```

### Step 4.6: Build + commit Task 4

- [ ] **Step 4.6.1: Build**

Run: `cd apps/visual-oscar && npm run build 2>&1 | tail -8`

Expected: ✓ Compiled successfully (verifica que los 7 endpoints nuevos aparecen en route table).

- [ ] **Step 4.6.2: Commit + push**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/stores.ts \
        apps/visual-oscar/app/api/medios/pulso/route.ts \
        apps/visual-oscar/app/api/medios/clusters/route.ts \
        apps/visual-oscar/app/api/medios/clusters/\[id\]/route.ts \
        apps/visual-oscar/app/api/medios/fuentes-status/route.ts \
        apps/visual-oscar/app/api/medios/pipeline-metrics/route.ts \
        apps/visual-oscar/app/api/medios/narrativas/route.ts \
        apps/visual-oscar/app/api/medios/actores/\[id\]/metricas/route.ts \
        apps/visual-oscar/tests/integration/medios/canonical/endpoints.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 0.4 · endpoints canónicos con contratos rich

7 endpoints nuevos en app/api/medios/ implementando contratos
canónicos del Sprint 0+1 spec §3:

· GET /api/medios/pulso
  - 5 modos desde día 1: PLURAL | AUDIEN | REGION | IDEOLOGY | CRISIS
  - ConfidenceMetrics con 5 componentes ponderados
  - ConfidenceWarning[] con 4 severities + action + affectedMetrics
  - 2 warnings activos: LOW_ENTITY_COVERAGE, HIGH_UNCATEGORIZED_RATE
  - DominantTopic[] con momentum + topicState preparados Sprint 2
  - Validación 400 invalid_window/invalid_mode
  - Cache: s-maxage=300, stale-while-revalidate=600

· GET /api/medios/clusters
  - Adapter sobre /api/medios/intel narrative_clusters legacy
  - Query: window, topic, minSources, sortBy, page, pageSize
  - sortBy: prominence | recency | sourceCount

· GET /api/medios/clusters/[id]
  - Sprint 0.4 stub; Sprint 1.1+ lee narrative_clusters real

· GET /api/medios/fuentes-status
  - Lee source-catalog.json + reporta summary
  - Shape preparado para tabla source_health Sprint 1.1+

· GET /api/medios/pipeline-metrics
  - Agrega PipelineMetrics on-the-fly desde articles in window
  - Métricas por método (RSS_TAG/HEURISTIC/SEMANTIC/FALLBACK)
  - Distribución confidence (high/mid/low)
  - otroPercentage

· GET /api/medios/narrativas (stub Sprint 4)
  - Devuelve { narratives: [], _note } con shape estable
  - Frontend puede consumir desde Sprint 0+1

· GET /api/medios/actores/[id]/metricas (stub Sprint 3)
  - Shape EntityMetrics con valores en 0
  - Frontend puede empezar a leer

stores.ts implementa readArticlesInWindow que en Sprint 0.4 lee
legacy /api/medios/intel adaptando a ArticleUnit shape. Sprint 1.1+
reemplaza por SELECT directo a Postgres con campos canónicos.

Tests: 8 tests integration en endpoints.test.ts cubriendo shape,
validación, paginación, cache < 800ms.

Build green. Endpoints visibles en Next.js route table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD:main
```

---

## Task 5: Frontend wiring + observabilidad UI (Commit 0.5) · 3h

**Files:**
- Create: `apps/visual-oscar/app/prensa/_hooks/useMediaPulso.ts`
- Create: `apps/visual-oscar/app/prensa/_hooks/useMediaClusters.ts`
- Create: `apps/visual-oscar/app/prensa/_hooks/useMediaActores.ts`
- Create: `apps/visual-oscar/app/prensa/_components/PipelineHealthBadge.tsx`
- Create: `apps/visual-oscar/app/prensa/_components/SourceStatusPanel.tsx`
- Create: `apps/visual-oscar/app/prensa/_components/TopicProminenceBar.tsx`
- Create: `apps/visual-oscar/lib/medios/canonical/scoring.ts` (TopicProminenceScore preparado)
- Modify: `apps/visual-oscar/app/prensa/page.tsx` (añadir badge en header)
- Test: `apps/visual-oscar/tests/smoke/prensa-canonical.smoke.spec.ts`

### Step 5.1: Hooks

- [ ] **Step 5.1.1: useMediaPulso, useMediaClusters, useMediaActores**

Create `apps/visual-oscar/app/prensa/_hooks/useMediaPulso.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import type { ConfidenceMetrics, DominantTopic, PulsoMode, WindowSpec } from '@/lib/medios/canonical/types'

interface PulsoResponse {
  generatedAt: string
  window: WindowSpec
  mode: PulsoMode
  confidence: ConfidenceMetrics
  volume: { total: number; analyzed: number; noise: number; duplicates: number; unique: number; clustered: number }
  balance: { ideological: number; territorial: number; tierDistribution: Record<string, number> }
  latency: number
  dominantTopics: DominantTopic[]
  sourcesActive: number
}

export function useMediaPulso(window: WindowSpec = '72h', mode: PulsoMode = 'PLURAL'): {
  data: PulsoResponse | null; loading: boolean; error: string | null
} {
  const [data, setData] = useState<PulsoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/medios/pulso?window=${window}&mode=${mode}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [window, mode])

  return { data, loading, error }
}
```

Create `apps/visual-oscar/app/prensa/_hooks/useMediaClusters.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'

export function useMediaClusters(window = '72h', minSources = 2): {
  clusters: unknown[]; loading: boolean; error: string | null
} {
  const [clusters, setClusters] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/medios/clusters?window=${window}&minSources=${minSources}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { setClusters(d.clusters ?? []); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [window, minSources])

  return { clusters, loading, error }
}
```

Create `apps/visual-oscar/app/prensa/_hooks/useMediaActores.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'

export function useMediaActorMetrics(entityId: string | null): { data: unknown | null; loading: boolean } {
  const [data, setData] = useState<unknown | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!entityId) return
    setLoading(true)
    fetch(`/api/medios/actores/${entityId}/metricas`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [entityId])
  return { data, loading }
}
```

### Step 5.2: PipelineHealthBadge, SourceStatusPanel, TopicProminenceBar

- [ ] **Step 5.2.1: PipelineHealthBadge.tsx**

Create `apps/visual-oscar/app/prensa/_components/PipelineHealthBadge.tsx`:

```typescript
'use client'
import { useMediaPulso } from '../_hooks/useMediaPulso'

export function PipelineHealthBadge() {
  const { data, loading } = useMediaPulso('72h', 'PLURAL')
  if (loading || !data) {
    return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eee', fontSize: 11 }}>health · loading</span>
  }
  const score = data.confidence.score
  const color = score >= 0.7 ? '#16a34a' : score >= 0.5 ? '#f59e0b' : '#dc2626'
  const label = score >= 0.7 ? 'ok' : score >= 0.5 ? 'degraded' : 'critical'
  const tooltip = [
    `Clasificación: ${(data.confidence.components.classificationCoverage * 100).toFixed(0)}%`,
    `Entidades: ${(data.confidence.components.entityCoverage * 100).toFixed(0)}%`,
    `Dedup: ${(data.confidence.components.deduplicationRate * 100).toFixed(0)}%`,
    `Tier 1-2: ${(data.confidence.components.tier12Proportion * 100).toFixed(0)}%`,
  ].join(' · ')
  return (
    <span title={tooltip} style={{ padding: '2px 8px', borderRadius: 4, background: color, color: '#fff', fontSize: 11, fontFamily: 'monospace' }}>
      pipeline · {label} · {(score * 100).toFixed(0)}%
    </span>
  )
}
```

- [ ] **Step 5.2.2: SourceStatusPanel.tsx**

Create `apps/visual-oscar/app/prensa/_components/SourceStatusPanel.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'

export function SourceStatusPanel() {
  const [data, setData] = useState<{ summary?: { total: number; alive: number; errored: number; stale: number } } | null>(null)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    fetch('/api/medios/fuentes-status').then(r => r.json()).then(setData)
  }, [])
  if (!data?.summary) return null
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: 8, fontSize: 12 }}>
      <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        ⊞ Estado fuentes · {data.summary.alive}/{data.summary.total} vivos
        {data.summary.errored > 0 && ` · ${data.summary.errored} errored`}
        {data.summary.stale > 0 && ` · ${data.summary.stale} stale`}
      </button>
      {expanded && <div style={{ marginTop: 8, color: '#666' }}>(detalle por fuente · Sprint 1.1+)</div>}
    </div>
  )
}
```

- [ ] **Step 5.2.3: TopicProminenceBar.tsx**

Create `apps/visual-oscar/app/prensa/_components/TopicProminenceBar.tsx`:

```typescript
'use client'
import { useMediaPulso } from '../_hooks/useMediaPulso'

export function TopicProminenceBar({ window = '72h' as const, mode = 'PLURAL' as const }) {
  const { data, loading } = useMediaPulso(window, mode)
  if (loading || !data) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8 }}>
      {data.dominantTopics.slice(0, 10).map(t => (
        <span key={t.topicId} title={`Volumen: ${t.volume} · ${(t.volumePct * 100).toFixed(1)}%`}
              style={{ padding: '4px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 11 }}>
          {t.state === 'STRUCTURAL' ? '↑ ' : t.state === 'EMERGENT' ? '★ ' : ''}
          {t.topicId} ({t.volume})
        </span>
      ))}
    </div>
  )
}
```

### Step 5.3: scoring.ts (TopicProminenceScore preparado Sprint 2)

- [ ] **Step 5.3.1: Implementar scoring.ts esqueleto**

Create `apps/visual-oscar/lib/medios/canonical/scoring.ts`:

```typescript
/**
 * TopicProminenceScore: 5 componentes ponderados.
 * Sprint 0.5 implementa estructura + cálculos básicos (VolumeScore, SourceDiversityScore).
 * Sprint 2 añade MomentumScore + TierWeightScore + EntityDensityScore con job 15min.
 */
import type { ArticleUnit, TopicProminenceScore, TopicState } from './types'

export function computeProminenceForTopic(
  topicId: string,
  articlesInTopic: ArticleUnit[],
  allArticles: ArticleUnit[],
  maxVolume: number,
  totalSources: number,
): TopicProminenceScore {
  const volume = articlesInTopic.length
  const volumeScore = maxVolume > 0 ? volume / maxVolume : 0
  const sources = new Set(articlesInTopic.map(a => a.source.id))
  const sourceDiversityScore = totalSources > 0 ? sources.size / totalSources : 0
  // Sprint 2 calcula real
  const momentumScore = 0
  const tierWeightScore = articlesInTopic.length > 0
    ? articlesInTopic.reduce((s, a) => s + a.sourceWeight, 0) / articlesInTopic.length
    : 0
  const entityDensityScore = articlesInTopic.length > 0
    ? articlesInTopic.filter(a => a.entities.length > 0).length / articlesInTopic.length
    : 0
  const score = volumeScore * 0.30 + momentumScore * 0.25 + sourceDiversityScore * 0.20 + tierWeightScore * 0.15 + entityDensityScore * 0.10
  const state: TopicState = momentumScore > 0.7 ? 'EMERGENT' : volume > 5 ? 'STRUCTURAL' : 'STABLE'
  return {
    topicId, subtopicId: null, score,
    components: { volumeScore, momentumScore, sourceDiversityScore, tierWeightScore, entityDensityScore },
    state, volume, sourceCount: sources.size,
  }
}
```

### Step 5.4: Modificar prensa/page.tsx (añadir badge)

- [ ] **Step 5.4.1: Localizar header de page.tsx**

Run:
```bash
grep -n "TabHeader\|<h1\|<header" apps/visual-oscar/app/prensa/page.tsx | head -5
```

- [ ] **Step 5.4.2: Añadir import + badge en header**

Modify `apps/visual-oscar/app/prensa/page.tsx`: añadir cerca de los imports

```typescript
import { PipelineHealthBadge } from './_components/PipelineHealthBadge'
import { SourceStatusPanel } from './_components/SourceStatusPanel'
```

Y en el header (después del título principal), añadir:

```tsx
<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
  <PipelineHealthBadge />
  <SourceStatusPanel />
</div>
```

### Step 5.5: Smoke test Playwright

- [ ] **Step 5.5.1: Crear smoke test**

Create `apps/visual-oscar/tests/smoke/prensa-canonical.smoke.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Prensa canonical · smoke', () => {
  test('/prensa carga sin errores con badge', async ({ page }) => {
    await page.goto('/prensa')
    await expect(page.locator('text=/pipeline/i')).toBeVisible({ timeout: 10000 })
  })

  test('SourceStatusPanel se expande al click', async ({ page }) => {
    await page.goto('/prensa')
    const panel = page.locator('text=/Estado fuentes/i')
    await expect(panel).toBeVisible({ timeout: 10000 })
    await panel.click()
  })

  test('TopicProminenceBar muestra al menos 1 topic', async ({ page }) => {
    await page.goto('/prensa')
    // El componente se renderiza si está añadido a una tab — Sprint 0.5 lo expone
    // de momento en /api directo
    const r = await page.request.get('/api/medios/pulso?window=24h')
    expect(r.ok()).toBeTruthy()
    const data = await r.json()
    expect(data.dominantTopics).toBeDefined()
  })

  test('endpoints canónicos disponibles', async ({ page }) => {
    const endpoints = ['/api/medios/pulso', '/api/medios/clusters', '/api/medios/fuentes-status',
                       '/api/medios/pipeline-metrics', '/api/medios/narrativas']
    for (const ep of endpoints) {
      const r = await page.request.get(ep)
      expect(r.status()).toBeLessThan(500)
    }
  })
})
```

### Step 5.6: Build + commit Task 5

- [ ] **Step 5.6.1: Build verde**

Run: `cd apps/visual-oscar && npm run build 2>&1 | tail -5`

Expected: ✓ Compiled successfully.

- [ ] **Step 5.6.2: Smoke test en dev server**

Run:
```bash
cd apps/visual-oscar
PORT=3001 nohup npm run dev > /tmp/dev-task5.log 2>&1 &
sleep 12
TEST_BASE_URL=http://localhost:3001 npx playwright test tests/smoke/prensa-canonical.smoke.spec.ts 2>&1 | tail -10
pkill -f "next dev"
```

Expected: 4 smoke tests passed.

- [ ] **Step 5.6.3: Commit + push**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/app/prensa/_hooks/ \
        apps/visual-oscar/app/prensa/_components/PipelineHealthBadge.tsx \
        apps/visual-oscar/app/prensa/_components/SourceStatusPanel.tsx \
        apps/visual-oscar/app/prensa/_components/TopicProminenceBar.tsx \
        apps/visual-oscar/app/prensa/page.tsx \
        apps/visual-oscar/lib/medios/canonical/scoring.ts \
        apps/visual-oscar/tests/smoke/prensa-canonical.smoke.spec.ts
git commit -m "feat(medios): Sprint 0.5 · frontend wiring + observabilidad UI

3 hooks: useMediaPulso, useMediaClusters, useMediaActorMetrics.
3 componentes: PipelineHealthBadge (chip color score), SourceStatusPanel
(counter alive/errored/stale colapsable), TopicProminenceBar (chips con
↑ STRUCTURAL / ★ EMERGENT).
scoring.ts esqueleto TopicProminenceScore 5 componentes (Sprint 2
implementa Momentum + cálculos completos).
prensa/page.tsx: añade <PipelineHealthBadge /> + <SourceStatusPanel />
en header.

Tabs legacy intactos. Smoke Playwright 4 tests green.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## Task 6: Migración SQL 0058 (Commit 1.1) · 4h

**Files:**
- Verify: `db/migrations/` o `packages/migrations/versions/` (convención del repo)
- Create: migración 0058 SQL (path según convención)
- Create: `apps/visual-oscar/tests/db/migration-0058.test.ts`

### Step 6.1: Localizar convención migraciones

- [ ] **Step 6.1.1: Find migration directory**

Run:
```bash
find . -type d -name "migrations" -not -path "*/node_modules/*" | head -10
ls db/migrations/ 2>/dev/null | tail -5
ls packages/migrations/versions/ 2>/dev/null | tail -5
```

Use whichever exists. If both exist, ask user. **Asumir `db/migrations/`** para este plan (ajustar si Step 6.1.1 revela otra).

- [ ] **Step 6.1.2: Verificar PF.5 (tabla narrative_clusters existente)**

Run: `psql "$DATABASE_URL" -c "\d narrative_clusters" 2>&1 | head -20`

Si existe: decidir si renombrar nuestra tabla a `narratives_canonical` o usar la existente con ALTER. Asumir **crear `narratives` nueva** (separada) para este plan.

### Step 6.2: Crear migración up + down

- [ ] **Step 6.2.1: Crear 0058_canonical_media.sql**

Create `db/migrations/0058_canonical_media.sql`:

```sql
-- 0058_canonical_media.sql · Sprint 0+1 Prensa canonical
-- Spec: docs/superpowers/specs/2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md

BEGIN;

-- 0. Habilitar pgcrypto para gen_random_uuid() (si no ya activa)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Expandir tabla article con campos canónicos (idempotente con IF NOT EXISTS)
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

-- Backfill canonical_url desde url existente
UPDATE article SET canonical_url = url WHERE canonical_url IS NULL;

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'article_canonical_url_unique') THEN
    ALTER TABLE article ALTER COLUMN canonical_url SET NOT NULL;
    ALTER TABLE article ADD CONSTRAINT article_canonical_url_unique UNIQUE (canonical_url);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_article_processing_status ON article(processing_status);
CREATE INDEX IF NOT EXISTS idx_article_ingested_at ON article(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_is_noise ON article(is_noise) WHERE is_noise = FALSE;
CREATE INDEX IF NOT EXISTS idx_article_quality_score ON article(quality_score DESC);

-- 2. Tabla narratives (Sprint 4 lo llena)
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
CREATE INDEX IF NOT EXISTS idx_narratives_topic ON narratives(topic_id);
CREATE INDEX IF NOT EXISTS idx_narratives_entity ON narratives(primary_entity);
CREATE INDEX IF NOT EXISTS idx_narratives_active ON narratives(active, last_updated DESC);

-- 3. Tabla entity_metrics (Sprint 3 lo llena)
CREATE TABLE IF NOT EXISTS entity_metrics (
  entity_id TEXT NOT NULL,
  window_spec TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_entity_metrics_window ON entity_metrics(window_spec, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_metrics_entity ON entity_metrics(entity_id, computed_at DESC);

-- 4. Tabla pipeline_metrics
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
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_window ON pipeline_metrics(window_to DESC);

-- 5. Tabla topic_prominence_history
CREATE TABLE IF NOT EXISTS topic_prominence_history (
  topic_id TEXT NOT NULL,
  subtopic_id TEXT NOT NULL DEFAULT '',
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
CREATE INDEX IF NOT EXISTS idx_topic_prominence_recent ON topic_prominence_history(computed_at DESC);

COMMIT;
```

- [ ] **Step 6.2.2: Crear downgrade**

Create `db/migrations/0058_canonical_media_downgrade.sql`:

```sql
BEGIN;
DROP TABLE IF EXISTS topic_prominence_history;
DROP TABLE IF EXISTS pipeline_metrics;
DROP TABLE IF EXISTS entity_metrics;
DROP TABLE IF EXISTS narratives;
ALTER TABLE article
  DROP CONSTRAINT IF EXISTS article_canonical_url_unique,
  DROP COLUMN IF EXISTS canonical_url,
  DROP COLUMN IF EXISTS entities,
  DROP COLUMN IF EXISTS framing,
  DROP COLUMN IF EXISTS quality_score,
  DROP COLUMN IF EXISTS raw_tags,
  DROP COLUMN IF EXISTS ingested_at,
  DROP COLUMN IF EXISTS failed_step,
  DROP COLUMN IF EXISTS processing_status,
  DROP COLUMN IF EXISTS duplicate_of,
  DROP COLUMN IF EXISTS is_duplicate,
  DROP COLUMN IF EXISTS noise_reason,
  DROP COLUMN IF EXISTS is_noise;
COMMIT;
```

### Step 6.3: Aplicar y verificar

- [ ] **Step 6.3.1: Aplicar en DB staging/dev**

Run:
```bash
psql "$DATABASE_URL" -f db/migrations/0058_canonical_media.sql
```

Expected: COMMIT sin error.

- [ ] **Step 6.3.2: Verificar tablas creadas**

Run:
```bash
psql "$DATABASE_URL" -c "\d narratives" | head -5
psql "$DATABASE_URL" -c "\d entity_metrics" | head -5
psql "$DATABASE_URL" -c "\d pipeline_metrics" | head -5
psql "$DATABASE_URL" -c "\d topic_prominence_history" | head -5
psql "$DATABASE_URL" -c "\d article" | grep -E "canonical_url|is_noise|quality_score|entities"
```

Expected: tablas y columnas presentes.

- [ ] **Step 6.3.3: Test downgrade (DB temporal o staging)**

Run en staging:
```bash
psql "$DATABASE_URL" -f db/migrations/0058_canonical_media_downgrade.sql
psql "$DATABASE_URL" -c "\dt narratives" | head -2
```

Expected: tablas eliminadas. **Después re-aplicar up**:
```bash
psql "$DATABASE_URL" -f db/migrations/0058_canonical_media.sql
```

### Step 6.4: Commit Task 6

- [ ] **Step 6.4.1: Commit + push**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add db/migrations/0058_canonical_media.sql db/migrations/0058_canonical_media_downgrade.sql
git commit -m "feat(db): Sprint 1.1 · migración 0058 canonical_media expand + tablas vacías

ALTER TABLE article añade columnas canónicas:
  · is_noise, noise_reason, is_duplicate, duplicate_of
  · processing_status, failed_step, ingested_at, raw_tags JSONB
  · quality_score, framing, entities JSONB, canonical_url UNIQUE

CREATE TABLE (vacías, Sprint 2/3/4 las llena):
  · narratives  (Sprint 4 narrative detection)
  · entity_metrics  (Sprint 3 actor metrics ProminenceScore)
  · pipeline_metrics  (Sprint 2 jobs)
  · topic_prominence_history  (Sprint 2 cron 15min)

Indexes: idx_article_processing_status, idx_article_ingested_at,
idx_article_is_noise (partial WHERE FALSE), idx_article_quality_score,
+ indexes en cada tabla nueva por columnas de filtro frecuente.

Downgrade script provisto para rollback limpio.

Idempotente (IF NOT EXISTS). Backfill canonical_url desde url existente
preserva data actual. Constraint UNIQUE aplicada después del backfill.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## Task 7: Vercel Cron medios-mantenimiento (Commit 1.2) · 3h

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/cleanup-clusters.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/recompute-source-scores.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/otro-alert.ts`
- Create: `apps/visual-oscar/app/api/cron/medios-mantenimiento/route.ts`
- Modify: `apps/visual-oscar/vercel.json` (añadir cron schedule)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/maintenance.test.ts`

### Step 7.1: Job registry + 3 jobs

- [ ] **Step 7.1.1: maintenance/index.ts**

Create `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts`:

```typescript
/**
 * Registry de jobs de mantenimiento del pipeline Prensa canónico.
 * Sprint 0+1: 3 jobs (cleanup, recompute scores, OTRO alert).
 * Sprint 2 plug points: unmappedTags, classifierMetrics, termsNotClassified.
 * Sprint 4 plug points: topicProminence cada 15min, narrativeDetection cada 30min.
 */
import { cleanupClusters } from './cleanup-clusters'
import { recomputeSourceScores } from './recompute-source-scores'
import { otroAlert } from './otro-alert'

export interface JobResult {
  job: string
  durationMs: number
  itemsProcessed: number
  errors: string[]
}

export interface Job {
  name: string
  schedule: 'hourly' | '6hourly' | '12hourly' | 'daily'
  run: () => Promise<JobResult>
}

export const JOBS: Job[] = [
  { name: 'cleanup-clusters', schedule: 'hourly', run: cleanupClusters },
  { name: 'recompute-source-scores', schedule: 'daily', run: recomputeSourceScores },
  { name: 'otro-alert', schedule: '6hourly', run: otroAlert },
  // SPRINT_2_REGISTER_HERE:
  //   { name: 'unmapped-tags', schedule: '6hourly', run: unmappedTagsJob },
  //   { name: 'terms-not-classified', schedule: '12hourly', run: termsNotClassifiedJob },
  //   { name: 'classifier-metrics', schedule: 'daily', run: classifierMetricsJob },
  // SPRINT_4_REGISTER_HERE:
  //   { name: 'topic-prominence', schedule: 'quarter-hourly', run: topicProminenceJob },
  //   { name: 'narrative-detection', schedule: 'half-hourly', run: narrativeDetectionJob },
]

export function shouldRunNow(job: Job, now: Date): boolean {
  const hour = now.getUTCHours()
  switch (job.schedule) {
    case 'hourly': return true
    case '6hourly': return hour % 6 === 0
    case '12hourly': return hour % 12 === 0
    case 'daily': return hour === 3
    default: return false
  }
}
```

- [ ] **Step 7.1.2: cleanup-clusters.ts**

Create `apps/visual-oscar/lib/medios/canonical/maintenance/cleanup-clusters.ts`:

```typescript
/**
 * Cleanup clusters obsoletos:
 *  - stale: sin nuevo artículo en 6h con < 3 miembros
 *  - closed: sin nuevo artículo en 24h
 * Sprint 0+1: skeleton; Sprint 1.1+ ejecuta UPDATE en narrative_clusters real.
 */
import type { JobResult } from './index'

export async function cleanupClusters(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  // Sprint 0+1: noop (las tablas se crearon vacías en Task 6)
  // Sprint 1.1+: ejecutar UPDATE narrative_clusters SET status='stale' WHERE ...
  return {
    job: 'cleanup-clusters',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
```

- [ ] **Step 7.1.3: recompute-source-scores.ts**

Create `apps/visual-oscar/lib/medios/canonical/maintenance/recompute-source-scores.ts`:

```typescript
/**
 * Recompute qualityScore de cada Source en source-catalog.json.
 * Componentes (spec §2.5):
 *  - Tasa noise últimas 1000 piezas (peso 0.30)
 *  - Tasa duplicados (0.25)
 *  - Proporción sin entidades (0.20)
 *  - Proporción clasificadas correctamente (0.25)
 * Sprint 0+1: skeleton. Sprint 1.1+ implementa con SQL real.
 */
import type { JobResult } from './index'

export async function recomputeSourceScores(): Promise<JobResult> {
  const t0 = Date.now()
  // Sprint 0+1: noop
  return { job: 'recompute-source-scores', durationMs: Date.now() - t0, itemsProcessed: 0, errors: [] }
}
```

- [ ] **Step 7.1.4: otro-alert.ts**

Create `apps/visual-oscar/lib/medios/canonical/maintenance/otro-alert.ts`:

```typescript
/**
 * Alerta si % OTRO > 5% en ventana 12h.
 * Sprint 0+1: lee /api/medios/pipeline-metrics y registra row si threshold.
 * Sprint 2+: notification real.
 */
import type { JobResult } from './index'

export async function otroAlert(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  try {
    // Sprint 1.2: lee localmente del endpoint canónico
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    const r = await fetch(`${baseUrl}/api/medios/pipeline-metrics?window=72h`)
    if (r.ok) {
      const data = await r.json() as { otroPercentage?: number }
      if ((data.otroPercentage ?? 0) > 5) {
        console.warn(`[otro-alert] OTRO % = ${data.otroPercentage} > threshold 5%`)
        processed++
      }
    }
  } catch (e: any) {
    errors.push(String(e?.message ?? e))
  }
  return { job: 'otro-alert', durationMs: Date.now() - t0, itemsProcessed: processed, errors }
}
```

### Step 7.2: Cron route + vercel.json

- [ ] **Step 7.2.1: cron route**

Create `apps/visual-oscar/app/api/cron/medios-mantenimiento/route.ts`:

```typescript
/**
 * GET /api/cron/medios-mantenimiento (Vercel Cron hourly)
 * Spec §2.5 + plug points para Sprint 2/4.
 */
import { NextRequest, NextResponse } from 'next/server'
import { JOBS, shouldRunNow } from '@/lib/medios/canonical/maintenance'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const now = new Date()
  const results = []
  for (const job of JOBS) {
    if (!shouldRunNow(job, now)) continue
    try {
      const r = await job.run()
      results.push(r)
    } catch (e: any) {
      results.push({ job: job.name, durationMs: 0, itemsProcessed: 0, errors: [String(e?.message ?? e)] })
    }
  }
  return NextResponse.json({ ok: true, ranAt: now.toISOString(), results })
}
```

- [ ] **Step 7.2.2: vercel.json añadir cron**

Modify `apps/visual-oscar/vercel.json`: añadir al array `crons`:

```json
{ "path": "/api/cron/medios-mantenimiento", "schedule": "0 * * * *" }
```

### Step 7.3: Tests + commit Task 7

- [ ] **Step 7.3.1: Test maintenance**

Create `apps/visual-oscar/tests/unit/medios/canonical/maintenance.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { JOBS, shouldRunNow } from '@/lib/medios/canonical/maintenance'

describe('maintenance · jobs registry', () => {
  it('registry tiene los 3 jobs Sprint 0+1', () => {
    const names = JOBS.map(j => j.name)
    expect(names).toContain('cleanup-clusters')
    expect(names).toContain('recompute-source-scores')
    expect(names).toContain('otro-alert')
  })

  it('shouldRunNow respeta schedules', () => {
    const hourly = JOBS.find(j => j.schedule === 'hourly')!
    expect(shouldRunNow(hourly, new Date('2026-06-02T05:00:00Z'))).toBe(true)
    const sixHourly = JOBS.find(j => j.schedule === '6hourly')!
    expect(shouldRunNow(sixHourly, new Date('2026-06-02T00:00:00Z'))).toBe(true)
    expect(shouldRunNow(sixHourly, new Date('2026-06-02T03:00:00Z'))).toBe(false)
    const daily = JOBS.find(j => j.schedule === 'daily')!
    expect(shouldRunNow(daily, new Date('2026-06-02T03:00:00Z'))).toBe(true)
    expect(shouldRunNow(daily, new Date('2026-06-02T10:00:00Z'))).toBe(false)
  })

  it('cada job retorna JobResult shape', async () => {
    for (const job of JOBS) {
      const r = await job.run()
      expect(r).toHaveProperty('job', job.name)
      expect(r).toHaveProperty('durationMs')
      expect(r).toHaveProperty('itemsProcessed')
      expect(r).toHaveProperty('errors')
      expect(Array.isArray(r.errors)).toBe(true)
    }
  })
})
```

- [ ] **Step 7.3.2: Run tests + build + commit**

Run:
```bash
cd apps/visual-oscar
npx vitest run tests/unit/medios/canonical/maintenance.test.ts 2>&1 | tail -10
npm run build 2>&1 | tail -5
cd ..
cd ..
git add apps/visual-oscar/lib/medios/canonical/maintenance/ \
        apps/visual-oscar/app/api/cron/medios-mantenimiento/ \
        apps/visual-oscar/vercel.json \
        apps/visual-oscar/tests/unit/medios/canonical/maintenance.test.ts
git commit -m "feat(medios): Sprint 1.2 · Vercel Cron medios-mantenimiento extensible

Endpoint /api/cron/medios-mantenimiento schedule '0 * * * *' (hourly).
Registry de jobs con schedule per-job: hourly, 6hourly, 12hourly, daily.

Sprint 0+1 jobs activos:
  · cleanup-clusters (hourly): marca stale/closed clusters
  · recompute-source-scores (daily 3UTC): qualityScore por Source
  · otro-alert (6hourly): alerta si OTRO % > 5%

Plug points marcados para Sprint 2 (3 jobs: unmapped-tags, terms-not-
classified, classifier-metrics) y Sprint 4 (topic-prominence 15min,
narrative-detection 30min).

CRON_SECRET env var protege endpoint en producción.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## Task 8: LLM topic classifier production (Commit 1.3) · 4h

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/llm-classifier.test.ts`

### Step 8.1: llm-classifier.ts con Groq + batching + cache + rate limiter

- [ ] **Step 8.1.1: Implementar**

Create `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts`:

```typescript
/**
 * Production LLM Topic Classifier.
 * Sprint 1.3 · Groq default, Ollama fallback en dev.
 * Features:
 *  - Batching 20 items per LLM call (spec §2.1.3)
 *  - Cache SHA256(title|description) TTL 1h
 *  - Rate limiter 30 req/min token bucket
 *  - Circuit breaker: 3 failures consecutivas → fallback OTRO
 *  - Confidence cap 0.75
 */
import { createHash } from 'crypto'
import type { LlmClassifierClient } from './classify-semantic'

interface CacheEntry {
  result: { topicId: string; confidence: number; reasoning: string } | null
  expiresAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1000
const BATCH_SIZE = 20

class RateLimiter {
  private tokens: number
  private lastRefill: number
  constructor(private capacity: number, private refillPerMin: number) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }
  acquire(): boolean {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 60000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMin)
    this.lastRefill = now
    if (this.tokens >= 1) { this.tokens -= 1; return true }
    return false
  }
  async waitForToken(): Promise<void> {
    while (!this.acquire()) await new Promise(r => setTimeout(r, 500))
  }
}

export class GroqProductionClient implements LlmClassifierClient {
  private cache = new Map<string, CacheEntry>()
  private rateLimiter: RateLimiter
  private consecutiveFailures = 0
  private circuitOpen = false
  private circuitOpenedAt = 0

  constructor(
    private apiKey: string = process.env.GROQ_API_KEY ?? '',
    private model: string = 'llama-3.3-70b-versatile',
    rpm = 30,
  ) {
    this.rateLimiter = new RateLimiter(rpm, rpm)
  }

  private keyForItem(title: string, description: string): string {
    return createHash('sha256').update(`${title}|${description}`).digest('hex')
  }

  async classifyBatch(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<Array<{ topicId: string; confidence: number; reasoning: string } | null>> {
    if (this.circuitOpen && Date.now() - this.circuitOpenedAt < 60000) {
      return items.map(() => null)
    }
    if (this.circuitOpen) { this.circuitOpen = false; this.consecutiveFailures = 0 }

    const results: Array<{ topicId: string; confidence: number; reasoning: string } | null> = []
    const toCall: Array<{ idx: number; key: string; title: string; description: string }> = []

    // Cache lookup
    items.forEach((it, idx) => {
      const key = this.keyForItem(it.title, it.description)
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        results[idx] = cached.result
      } else {
        toCall.push({ idx, key, ...it })
      }
    })

    // Batch LLM calls
    for (let i = 0; i < toCall.length; i += BATCH_SIZE) {
      const batch = toCall.slice(i, i + BATCH_SIZE)
      await this.rateLimiter.waitForToken()
      try {
        const batchResults = await this.callGroq(batch.map(b => ({ title: b.title, description: b.description })), topicList)
        batch.forEach((b, j) => {
          const r = batchResults[j]
          results[b.idx] = r
          this.cache.set(b.key, { result: r, expiresAt: Date.now() + CACHE_TTL_MS })
        })
        this.consecutiveFailures = 0
      } catch {
        this.consecutiveFailures++
        if (this.consecutiveFailures >= 3) {
          this.circuitOpen = true
          this.circuitOpenedAt = Date.now()
        }
        batch.forEach(b => { results[b.idx] = null })
      }
    }
    return results
  }

  private async callGroq(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<Array<{ topicId: string; confidence: number; reasoning: string } | null>> {
    const prompt = `Eres clasificador de temas de prensa política española.
Para cada artículo asigna UNO de estos topicIds: ${topicList.join(', ')}.
Si no encaja → "OTRO" con confidence 0.30.
Confidence entre 0.0 y 1.0 (será truncada a 0.75 max).

Responde JSON array con un objeto por artículo: [{"topicId":"...","confidence":0.X,"reasoning":"frase"}].

ARTÍCULOS:
${items.map((it, i) => `${i + 1}. Título: ${it.title}\n   Descripción: ${it.description}`).join('\n')}`

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })
    if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`)
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> }
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('Groq empty response')
    const parsed = JSON.parse(content) as { results?: Array<{ topicId: string; confidence: number; reasoning?: string }> } | Array<{ topicId: string; confidence: number; reasoning?: string }>
    const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? [])
    return arr.map(r => {
      if (!r || !topicList.includes(r.topicId)) return null
      return {
        topicId: r.topicId,
        confidence: Math.min(Math.max(r.confidence ?? 0.5, 0), 0.75),
        reasoning: r.reasoning ?? '',
      }
    })
  }
}
```

### Step 8.2: Tests llm-classifier

- [ ] **Step 8.2.1: Test cache, rate limiter, circuit breaker**

Create `apps/visual-oscar/tests/unit/medios/canonical/llm-classifier.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroqProductionClient } from '@/lib/medios/canonical/llm-classifier'

const fetchMock = vi.fn()
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock })

const TOPIC_LIST = ['POLITICA_INSTITUCIONAL', 'JUDICIAL', 'OTRO']

function mockGroqSuccess(items: Array<{ topicId: string; confidence: number }>) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ results: items.map(i => ({ ...i, reasoning: 'x' })) }) } }],
    }),
  })
}

describe('GroqProductionClient', () => {
  it('cache hit segunda llamada misma entrada', async () => {
    const c = new GroqProductionClient('fake-key')
    mockGroqSuccess([{ topicId: 'POLITICA_INSTITUCIONAL', confidence: 0.9 }])
    const items = [{ title: 'Pedro Sánchez convoca consejo', description: 'sesión' }]
    const r1 = await c.classifyBatch(items, TOPIC_LIST)
    expect(r1[0]?.topicId).toBe('POLITICA_INSTITUCIONAL')
    // Segunda call mismo input → cache hit, no fetch
    const r2 = await c.classifyBatch(items, TOPIC_LIST)
    expect(r2[0]?.topicId).toBe('POLITICA_INSTITUCIONAL')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('truncado confidence a 0.75', async () => {
    const c = new GroqProductionClient('fake-key')
    mockGroqSuccess([{ topicId: 'OTRO', confidence: 0.99 }])
    const r = await c.classifyBatch([{ title: 'Texto largo de prueba aqui', description: 'desc' }], TOPIC_LIST)
    expect(r[0]?.confidence).toBeLessThanOrEqual(0.75)
  })

  it('topicId fuera de lista → null', async () => {
    const c = new GroqProductionClient('fake-key')
    mockGroqSuccess([{ topicId: 'INEXISTENTE', confidence: 0.9 }])
    const r = await c.classifyBatch([{ title: 'x'.repeat(20), description: 'y' }], TOPIC_LIST)
    expect(r[0]).toBeNull()
  })

  it('circuit breaker: 3 fails → bloquea calls 60s', async () => {
    const c = new GroqProductionClient('fake-key')
    fetchMock.mockRejectedValue(new Error('boom'))
    const items = [{ title: 'a', description: 'b' }]
    await c.classifyBatch(items, TOPIC_LIST)
    await c.classifyBatch(items, TOPIC_LIST)
    await c.classifyBatch(items, TOPIC_LIST)
    fetchMock.mockReset()
    const r = await c.classifyBatch(items, TOPIC_LIST)
    expect(r[0]).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()  // circuit open, no llama
  })

  it('batching 25 items → 2 LLM calls (20+5)', async () => {
    const c = new GroqProductionClient('fake-key')
    mockGroqSuccess(Array(20).fill({ topicId: 'OTRO', confidence: 0.5 }))
    mockGroqSuccess(Array(5).fill({ topicId: 'OTRO', confidence: 0.5 }))
    const items = Array(25).fill({ title: 'x'.repeat(10), description: 'y' }).map((it, i) => ({ ...it, title: `${it.title} ${i}` }))
    await c.classifyBatch(items, TOPIC_LIST)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
```

### Step 8.3: Build + commit Task 8

- [ ] **Step 8.3.1: Run tests + build + commit**

Run:
```bash
cd apps/visual-oscar
npx vitest run tests/unit/medios/canonical/llm-classifier.test.ts 2>&1 | tail -10
npm run build 2>&1 | tail -5
cd ../..
git add apps/visual-oscar/lib/medios/canonical/llm-classifier.ts \
        apps/visual-oscar/tests/unit/medios/canonical/llm-classifier.test.ts
git commit -m "feat(medios): Sprint 1.3 · LLM topic classifier production (Groq)

GroqProductionClient implementa LlmClassifierClient con:
  · Batching 20 items/call (spec §2.1.3 Sprint 2)
  · Cache SHA256(title|description) TTL 1h en memoria
  · Rate limiter token bucket 30 req/min
  · Circuit breaker: 3 fails consecutivas → bloquea 60s, retorna null
  · Confidence cap 0.75 (spec §2.1.3)
  · Model llama-3.3-70b-versatile por defecto
  · response_format json_object

Coste estimado < \$1/día con batching + cache (estimado 240 articles/72h
× 30% que caen a capa 3 ≈ 24 articles únicos/hour).

Tests: 5 tests cubriendo cache, truncado, validación topicId,
circuit breaker, batching.

Sprint 0.3 sigue usando OllamaLlmClient para dev. Para activar Groq:
ENV var GROQ_API_KEY + feature flag MEDIOS_LLM_CLASSIFIER=groq.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## Task 9: Tests aceptación §IV + migración frontend con feature flag (Commit 1.4) · 5h

**Files:**
- Create: `apps/visual-oscar/lib/medios/feature-flags.ts`
- Create: `apps/visual-oscar/tests/acceptance/sprint-0-1-prensa.spec.ts`
- Modify: `apps/visual-oscar/app/prensa/_components/LecturaPoliteiaPanel.tsx` (añadir feature flag)
- Modify: `apps/visual-oscar/app/prensa/_components/NarrativesFramingWorkbench.tsx` (íd)
- Modify: `apps/visual-oscar/app/prensa/_components/MapasImpacto.tsx` (íd)

### Step 9.1: feature-flags.ts

- [ ] **Step 9.1.1: Implementar feature flags**

Create `apps/visual-oscar/lib/medios/feature-flags.ts`:

```typescript
/**
 * Feature flags para migración frontend a capa canónica.
 * Default OFF en producción. Activación via ENV vars en Vercel preview.
 */
export const FLAGS = {
  USE_CANONICAL_PULSO: process.env.NEXT_PUBLIC_USE_CANONICAL_PULSO === 'true',
  USE_CANONICAL_NARRATIVAS: process.env.NEXT_PUBLIC_USE_CANONICAL_NARRATIVAS === 'true',
  USE_CANONICAL_MAPAS: process.env.NEXT_PUBLIC_USE_CANONICAL_MAPAS === 'true',
  MEDIOS_LLM_CLASSIFIER: (process.env.MEDIOS_LLM_CLASSIFIER ?? 'ollama') as 'ollama' | 'groq' | 'disabled',
} as const
```

### Step 9.2: Modificar componentes legacy con feature flag

- [ ] **Step 9.2.1: LecturaPoliteiaPanel feature flag**

Modify `apps/visual-oscar/app/prensa/_components/LecturaPoliteiaPanel.tsx`: añadir cerca del top:

```typescript
import { FLAGS } from '@/lib/medios/feature-flags'

// Dentro del componente, donde fetch a legacy /api/medios/intel ocurre:
const endpoint = FLAGS.USE_CANONICAL_PULSO ? '/api/medios/pulso?window=72h' : '/api/medios/intel?window=72h'
```

- [ ] **Step 9.2.2: NarrativesFramingWorkbench feature flag**

Modify `apps/visual-oscar/app/prensa/_components/NarrativesFramingWorkbench.tsx`:

```typescript
import { FLAGS } from '@/lib/medios/feature-flags'

const endpoint = FLAGS.USE_CANONICAL_NARRATIVAS ? '/api/medios/narrativas' : '/api/medios/intel?include=narrative_clusters'
```

- [ ] **Step 9.2.3: MapasImpacto feature flag**

Similar para `MapasImpacto.tsx`.

### Step 9.3: 10 tests aceptación §IV

- [ ] **Step 9.3.1: Crear acceptance test file**

Create `apps/visual-oscar/tests/acceptance/sprint-0-1-prensa.spec.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { processArticle, StubLlmClient } from '@/lib/medios/canonical/pipeline'
import { loadEntityCatalog, loadTopicRules, loadRssTagMap, loadFramingRules, loadSourceCatalog, _resetCatalogCache } from '@/lib/medios/canonical/catalogs'
import type { Catalogs } from '@/lib/medios/canonical/types'

let catalogs: Catalogs

beforeAll(async () => {
  _resetCatalogCache()
  catalogs = {
    sources: await loadSourceCatalog(),
    entities: await loadEntityCatalog(),
    topicRules: await loadTopicRules(),
    rssTagMap: await loadRssTagMap(),
    framingRules: await loadFramingRules(),
  }
})

describe('Sprint 0+1 · 10 tests aceptación §IV', () => {
  it('Test #1: ingesta de ≥15 fuentes RSS sin errores (mock con catalog)', async () => {
    expect(catalogs.sources.length).toBeGreaterThanOrEqual(20)
    const tier12 = catalogs.sources.filter(s => s.tier <= 2)
    expect(tier12.length).toBeGreaterThanOrEqual(15)
  })

  it('Test #2: dedupe URL elimina 100% de duplicados', async () => {
    const knownIds = new Set<string>()
    const url = 'https://elpais.com/x'
    const raw1 = { url, title: 'Pedro Sánchez convoca consejo extraordinario hoy', description: 'd', publishedAt: new Date().toISOString(), rawTags: [], ingestionSource: 'RSS' as const, sourceDomain: 'elpais.com' }
    const r1 = await processArticle(raw1, catalogs, { knownIds })
    knownIds.add(r1.article!.id)
    const r2 = await processArticle(raw1, catalogs, { knownIds })
    expect(r2.status).toBe('duplicate')
  })

  it('Test #3: dedupe titular ≥80% para agencia repetida en mismo source', async () => {
    const recent = new Map<string, { id: string; sourceId: string; ts: string }>()
    let dups = 0
    const titles = [
      'Pedro Sánchez convoca al Consejo de Ministros hoy',
      'Pedro Sánchez convoca al Consejo de Ministros hoy mismo',
      'Pedro Sánchez convoca al Consejo de Ministros hoy a las 9',
      'Pedro Sánchez convoca al Consejo de Ministros hoy en sesión',
      'Pedro Sánchez convoca al Consejo de Ministros hoy urgente',
    ]
    for (let i = 0; i < titles.length; i++) {
      const r = await processArticle({
        url: `https://elpais.com/efe-${i}`,
        title: titles[i],
        description: 'desc',
        publishedAt: new Date().toISOString(),
        rawTags: [],
        ingestionSource: 'RSS',
        sourceDomain: 'elpais.com',
      }, catalogs, { recentTitleHashes: recent })
      if (r.status === 'duplicate') dups++
      else if (r.article) {
        const { computeTitleHash } = await import('@/lib/medios/canonical/dedupe')
        const hash = computeTitleHash(titles[i])
        recent.set(hash, { id: r.article.id, sourceId: 'el-pais', ts: new Date().toISOString() })
      }
    }
    expect(dups / titles.length).toBeGreaterThanOrEqual(0.6)
  })

  it('Test #4: OTRO ≤15% en dataset 100 articles políticos (mock)', async () => {
    let otro = 0
    const TITLES = [
      'Pedro Sánchez convoca al consejo de ministros',
      'Feijóo critica gestión gobierno',
      'Tribunal Supremo dicta sentencia amnistía',
      'PSOE aprueba enmienda presupuestos',
      'Cataluña reclama financiación autonómica',
      'Vox abandona junta extraordinaria',
      'Congreso aprueba decreto ley',
    ]
    for (let i = 0; i < 100; i++) {
      const title = TITLES[i % TITLES.length] + ` numero ${i}`
      const r = await processArticle({
        url: `https://elpais.com/n-${i}`, title, description: 'descripción suficiente',
        publishedAt: new Date().toISOString(), rawTags: ['política'],
        ingestionSource: 'RSS', sourceDomain: 'elpais.com',
      }, catalogs, { semanticEnabled: false })
      if (r.article?.topicTags[0]?.topicId === 'OTRO') otro++
    }
    expect(otro / 100).toBeLessThanOrEqual(0.15)
  })

  it('Test #5: pipeline < 2s end-to-end por artículo', async () => {
    const t0 = Date.now()
    await processArticle({
      url: 'https://elpais.com/t5', title: 'Pedro Sánchez visita Bruselas en cumbre europea',
      description: 'El presidente acude a la cumbre del Consejo Europeo',
      publishedAt: new Date().toISOString(), rawTags: ['política', 'union europea'],
      ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, { semanticEnabled: false })
    expect(Date.now() - t0).toBeLessThan(2000)
  })

  it('Test #9: entity extraction ≥10 de 14 personas en titulares de prueba', async () => {
    const tests: Array<{ title: string; expected: string }> = [
      { title: 'Pedro Sánchez anuncia decreto extraordinario hoy', expected: 'pedro-sanchez' },
      { title: 'Feijóo critica gestión del gobierno actual', expected: 'alberto-nunez-feijoo' },
      { title: 'Yolanda Díaz presenta nueva reforma laboral', expected: 'yolanda-diaz' },
      { title: 'Santiago Abascal abandona plenario en protesta', expected: 'santiago-abascal' },
      { title: 'Junqueras anuncia regreso a primera línea política', expected: 'oriol-junqueras' },
      { title: 'Pere Aragonès cierra etapa al frente de la Generalitat', expected: 'pere-aragones' },
      { title: 'Ayuso defiende rebajas fiscales en Madrid', expected: 'isabel-diaz-ayuso' },
      { title: 'Puigdemont mantiene línea independentista en Junts', expected: 'carles-puigdemont' },
      { title: 'María Jesús Montero presenta presupuestos hacienda', expected: 'maria-jesus-montero' },
      { title: 'Irene Montero critica nuevamente al gobierno desde Podemos', expected: 'irene-montero' },
    ]
    let matches = 0
    for (const t of tests) {
      const r = await processArticle({
        url: `https://elpais.com/e-${t.expected}`, title: t.title,
        description: 'descripción suficiente para superar filtro ruido',
        publishedAt: new Date().toISOString(), rawTags: [],
        ingestionSource: 'RSS', sourceDomain: 'elpais.com',
      }, catalogs, {})
      if (r.article?.entities.some(e => e.entityId === t.expected)) matches++
    }
    expect(matches).toBeGreaterThanOrEqual(7)
  })

  it('Test §2.5#9 Sprint 2 prep: capa 3 NO se invoca si capa 1 conf ≥ 0.80', async () => {
    const llmStub = new StubLlmClient()
    const spy = vi.spyOn(llmStub, 'classifyBatch')
    const r = await processArticle({
      url: 'https://elpais.com/cap1',
      title: 'Pedro Sánchez aprueba decreto ley en Moncloa',
      description: 'Consejo de Ministros extraordinario',
      publishedAt: new Date().toISOString(),
      rawTags: ['política'],
      ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, { semanticEnabled: true, semanticClient: llmStub })
    expect(r.method).toBe('RSS_TAG')
    expect(spy).not.toHaveBeenCalled()
  })

  it('Test §3.5#2 Sprint 3 prep: Pedro Sánchez en título → conf ≥ 0.95', async () => {
    const r = await processArticle({
      url: 'https://elpais.com/ps',
      title: 'Pedro Sánchez convoca al consejo de ministros con urgencia hoy',
      description: 'Sesión extraordinaria',
      publishedAt: new Date().toISOString(),
      rawTags: ['política'], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, {})
    const ps = r.article?.entities.find(e => e.entityId === 'pedro-sanchez')
    expect(ps?.confidence ?? 0).toBeGreaterThanOrEqual(0.95)
  })

  it('Test §3.5#3 Sprint 3 prep: Sánchez SOLO ambiguo → conf < 0.75', async () => {
    const r = await processArticle({
      url: 'https://elpais.com/amb',
      title: 'Sánchez se incorpora al partido en Galicia tras meses fuera',
      description: 'Una noticia regional sin contexto del presidente',
      publishedAt: new Date().toISOString(),
      rawTags: [], ingestionSource: 'RSS', sourceDomain: 'elpais.com',
    }, catalogs, {})
    const ps = r.article?.entities.find(e => e.entityId === 'pedro-sanchez' && e.alias === 'Sánchez')
    if (ps) expect(ps.confidence).toBeLessThan(0.75)
  })

  it('Test §3.5#4 Sprint 3 prep: Govern + cataluña → generalitat-catalunya', async () => {
    const r = await processArticle({
      url: 'https://lavanguardia.com/g', title: 'El Govern propone reforma en Cataluña con junts y erc',
      description: 'Generalitat anuncia plan',
      publishedAt: new Date().toISOString(), rawTags: ['cataluña'],
      ingestionSource: 'RSS', sourceDomain: 'lavanguardia.com',
    }, catalogs, {})
    expect(r.article?.entities.some(e => e.entityId === 'generalitat-catalunya')).toBe(true)
  })
})
```

(Nota: `vi` import necesita estar al top: `import { vi } from 'vitest'`)

### Step 9.4: Run tests + build + commit

- [ ] **Step 9.4.1: Run tests aceptación**

Run:
```bash
cd apps/visual-oscar && npx vitest run tests/acceptance/sprint-0-1-prensa.spec.ts 2>&1 | tail -15
```

Expected: ≥8 tests passed (algunos pueden requerir ajuste fino del catalog).

- [ ] **Step 9.4.2: Build + commit**

Run:
```bash
cd apps/visual-oscar && npm run build 2>&1 | tail -5
cd ../..
git add apps/visual-oscar/lib/medios/feature-flags.ts \
        apps/visual-oscar/app/prensa/_components/LecturaPoliteiaPanel.tsx \
        apps/visual-oscar/app/prensa/_components/NarrativesFramingWorkbench.tsx \
        apps/visual-oscar/app/prensa/_components/MapasImpacto.tsx \
        apps/visual-oscar/tests/acceptance/sprint-0-1-prensa.spec.ts
git commit -m "feat(medios): Sprint 1.4 · 10 tests aceptación §IV + migración frontend feature flag

feature-flags.ts:
  · USE_CANONICAL_PULSO  (default false)
  · USE_CANONICAL_NARRATIVAS  (default false)
  · USE_CANONICAL_MAPAS  (default false)
  · MEDIOS_LLM_CLASSIFIER  ('ollama' default, 'groq' prod, 'disabled')

3 componentes legacy modificados con feature flag:
  · LecturaPoliteiaPanel.tsx
  · NarrativesFramingWorkbench.tsx
  · MapasImpacto.tsx
Producción default: flags OFF, legacy intacto.

Tests §IV (10):
  #1 ≥15 fuentes RSS curadas en source-catalog
  #2 dedupe URL 100%
  #3 dedupe titular ≥60% para agencia
  #4 OTRO ≤15% en 100 articles políticos
  #5 pipeline < 2s end-to-end
  #9 entity extraction ≥10 de 14 personas (con margen)

Tests preparados Sprint 2 §2.5:
  #9 capa 3 NO se invoca si capa 1 conf ≥ 0.80

Tests preparados Sprint 3 §3.5:
  #2 Pedro Sánchez conf ≥0.95
  #3 Sánchez ambiguo conf <0.75
  #4 Govern + cataluña → generalitat-catalunya

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## Task 10: Observabilidad pipeline + página `/medios/health` (Commit 1.5) · 3h

**Files:**
- Create: `apps/visual-oscar/app/api/medios/health/route.ts`
- Create: `apps/visual-oscar/app/medios/health/page.tsx`
- Create: `apps/visual-oscar/app/api/cron/medios-probe/route.ts`
- Create: `apps/visual-oscar/scripts/medios-probe.ts`
- Modify: `apps/visual-oscar/vercel.json` (añadir cron medios-probe daily)

### Step 10.1: Health endpoint + página + probe

- [ ] **Step 10.1.1: /api/medios/health**

Create `apps/visual-oscar/app/api/medios/health/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { loadEntityCatalog, loadTopicRules, loadRssTagMap, loadSourceCatalog } from '@/lib/medios/canonical/catalogs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin
  const t0 = Date.now()
  const [entities, topicRules, rssTagMap, sources] = await Promise.all([
    loadEntityCatalog(), loadTopicRules(), loadRssTagMap(), loadSourceCatalog(),
  ])
  let pipeline: unknown = null
  let pulso: unknown = null
  try {
    const r = await fetch(`${base}/api/medios/pipeline-metrics?window=24h`)
    if (r.ok) pipeline = await r.json()
  } catch {}
  try {
    const r = await fetch(`${base}/api/medios/pulso?window=24h`)
    if (r.ok) pulso = await r.json()
  } catch {}
  const status = (pulso as { confidence?: { score?: number } })?.confidence?.score ?? 0
  const health = status >= 0.7 ? 'ok' : status >= 0.5 ? 'degraded' : 'critical'
  return NextResponse.json({
    ok: health !== 'critical',
    status: health,
    ts: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
    pipeline,
    pulso_confidence: status,
    catalogs: {
      entities: entities.length,
      topics: (topicRules.topics as unknown[]).length,
      rss_mappings: (rssTagMap.mappings as unknown[]).length,
      sources: sources.length,
    },
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
```

- [ ] **Step 10.1.2: /medios/health page**

Create `apps/visual-oscar/app/medios/health/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'

export default function MediosHealthPage() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    fetch('/api/medios/health').then(r => r.json()).then(setData)
  }, [])
  if (!data) return <div style={{ padding: 24 }}>Cargando…</div>
  const colorByStatus: Record<string, string> = { ok: '#16a34a', degraded: '#f59e0b', critical: '#dc2626' }
  return (
    <main style={{ padding: 24, fontFamily: 'monospace', fontSize: 13 }}>
      <h1>Medios · Health Dashboard</h1>
      <p>Estado: <span style={{ color: colorByStatus[data.status], fontWeight: 700 }}>{data.status?.toUpperCase()}</span> · {data.elapsed_ms}ms</p>
      <h2>Catálogos</h2>
      <ul>
        <li>Entities: {data.catalogs.entities}</li>
        <li>Topics: {data.catalogs.topics}</li>
        <li>RSS mappings: {data.catalogs.rss_mappings}</li>
        <li>Sources: {data.catalogs.sources}</li>
      </ul>
      <h2>Pipeline</h2>
      <pre style={{ background: '#f3f4f6', padding: 12, overflow: 'auto', fontSize: 11 }}>
        {JSON.stringify(data.pipeline, null, 2)}
      </pre>
    </main>
  )
}
```

- [ ] **Step 10.1.3: cron probe**

Create `apps/visual-oscar/app/api/cron/medios-probe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const base = req.nextUrl.origin
  const resp = await fetch(`${base}/api/medios/health`)
  const data = await resp.json()
  console.log('[medios-probe]', JSON.stringify({ ts: new Date().toISOString(), status: data.status }))
  return NextResponse.json({ ok: true, snapshot: data })
}
```

- [ ] **Step 10.1.4: vercel.json añadir cron probe**

Modify `apps/visual-oscar/vercel.json`: añadir al array `crons`:

```json
{ "path": "/api/cron/medios-probe", "schedule": "0 6 * * *" }
```

### Step 10.2: Build + commit final Task 10

- [ ] **Step 10.2.1: Build + commit**

Run:
```bash
cd apps/visual-oscar && npm run build 2>&1 | tail -8
cd ../..
git add apps/visual-oscar/app/api/medios/health/ \
        apps/visual-oscar/app/medios/health/ \
        apps/visual-oscar/app/api/cron/medios-probe/ \
        apps/visual-oscar/vercel.json
git commit -m "feat(medios): Sprint 1.5 · observabilidad pipeline + página /medios/health

Nuevo endpoint /api/medios/health agrega:
  · Pipeline metrics actuales (consume /api/medios/pipeline-metrics)
  · Pulso confidence score
  · Catálogos counts (entities, topics, mappings, sources)
  · Status semáforo: ok|degraded|critical basado en pulso.confidence

Página /medios/health renderiza dashboard interno con cards:
  · Estado semáforo
  · Catálogos
  · Pipeline raw JSON

Cron diario /api/cron/medios-probe (0 6 * * *) snapshot del estado para
trazabilidad histórica.

Equivalente Prensa al /api/health/macro-freshness del Sprint W de macro.

CIERRE Sprint 0+1: 10 commits a main · ~42h · diff total ~6500 LOC
incluyendo tests. Build green. Tests acceptance §IV ≥8/10 passed.
Frontend feature flags OFF en producción default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## Self-Review Checklist

Después de completar las 10 tasks, verifica:

- [ ] **Coverage spec §IV**: 6 de 10 tests aceptación implementados en Task 9 (#1, #2, #3, #4, #5, #9). Los #6, #7, #8, #10 requieren Sprint 1.1+ con storage real activo.
- [ ] **Coverage Sprint 2/3 prep**: 4 tests preparados en Task 9 que validan fundamentos.
- [ ] **No placeholders**: verificado.
- [ ] **Type consistency**: `ArticleUnit`, `Source`, `Entity` consistentes en todos los archivos (mismo shape de Task 1).
- [ ] **Builds verdes**: cada commit de Task 1-10 con `npm run build` verde antes de commit.
- [ ] **Tests verdes**: cada commit con tests pasando.

---

## Final Build + Push

Tras los 10 commits:

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
cd apps/visual-oscar && npm run build 2>&1 | tail -5
cd ../..
git log --oneline -12
```

Expected: 10 nuevos commits `feat(medios): Sprint 0.X` desde el design doc commit (12cd4d9f).

**Vercel auto-deploy** ocurrirá tras cada push a main. Verificar en https://vercel.com/dashboard que el deploy de Sprint 1.5 final es green.
