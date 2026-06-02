# Sprint 2 Prensa · Clasificación Temática y Detección de Agenda · Design

**Fecha:** 2026-06-02
**Autor:** Claude (Antonio + Claude collab)
**Estado:** Aprobado por usuario, listo para `writing-plans`
**Predecesor:** [Sprint 0+1 Prensa · Ingesta Canónica](./2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md)

---

## §0 · Contexto y alcance

Sprint 0+1 dejó funcional el **pipeline canónico de ingesta** de medios:
10 commits subagent-driven, 92 tests passing, build green, mergeado a
`main` + `Visual_Oscar` (HEAD `387f2ac9`). La migración SQL `0058` está
aplicada en Railway Postgres (15 tablas Prensa + 12 cols nuevas en
`article` + seed 19 medios en `medios_config`).

Sprint 2 toma el pipeline y **enriquece la capa de clasificación temática
+ scoring de prominencia + modos de presentación**, dejando visiblemente
mejorada la tab "Importancia Temática" en producción.

**Alcance** (decisión usuario 2026-06-02):
- Spec completo (no MVP).
- 10 commits subagent-driven (mismo formato Sprint 0+1).
- LLM Layer 3 → **Gemini API** (no Groq, decisión revisada).
- Deploy: 1 push fast-forward al final del sprint (no continuo).
- Branch: `claude/sharp-keller-3d6d48` (donde estamos).

**Storage**: Migración 0058 ya aplicada → `pipeline_metrics`,
`topic_prominence_history`, `narratives`, `entity_metrics`, `article+12cols`
disponibles para escritura/lectura desde el primer commit.

---

## §1 · Arquitectura general

```
[Sprint 0+1: processArticle() ya ingestado]
        ↓
┌───────────────────────────────────────────────────────────┐
│ Sprint 2 · Capa de Clasificación Temática (3 capas)       │
│                                                            │
│  Layer 1 · RSS_TAG   (existe, threshold 0.65, 90 mappings)│
│  Layer 2 · HEURISTIC (existe, threshold 0.60, 24 reglas)  │
│  Layer 3 · SEMANTIC  (Gemini API, cap 0.75, batch 20)     │
│                                                            │
│  → topic ∈ taxonomía 24 macrotemas + OTRO + TERRITORIAL   │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Sprint 2 · TopicProminenceScore (5 componentes)           │
│                                                            │
│  volumeScore · momentumScore · sourceDiversityScore       │
│  tierWeightScore · entityDensityScore                     │
│                                                            │
│  → persistido en topic_prominence_history cada 15min      │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Sprint 2 · TopicState (STRUCTURAL | EMERGENT | STABLE)    │
│                                                            │
│  → transición determinista por reglas declarativas        │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Sprint 2 · PulsoMode (5 modos · queries derivadas)        │
│                                                            │
│  PLURAL · AUDIEN · REGION · IDEOLOGY · CRISIS             │
│  → endpoint /api/medios/pulso?mode=...                    │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ Sprint 2 · Jobs mantenimiento (3 crones)                  │
│                                                            │
│  unmapped-tags 6h · terms-not-classified 12h ·            │
│  classifier-metrics 24h                                   │
└───────────────────────────────────────────────────────────┘
```

**Lo que ya quedó listo en Sprint 0+1** (no re-implementar):
- `TopicProminenceScore` type en `lib/medios/canonical/types.ts` (5 componentes
  definidos, `momentumScore=0` placeholder).
- `classify-rss-tags.ts` (Layer 1) funcional con umbral 0.65.
- `classify-heuristic.ts` (Layer 2) funcional con scoring ponderado.
- `classify-semantic.ts` (Layer 3) con `OllamaLlmClient` (dev) y `StubLlmClient` (tests).
- Interfaz `LlmClassifierClient` agnóstica (provider-swappable).
- `topic-rules.json` con 24 macrotemas + OTRO + TERRITORIAL (3 subtopics).
- `rss-tag-map.json` con 90 mappings.
- `TopicState` enum y 5 `PulsoMode` declarados.
- Cache SHA256 TTL 1h + rate limit + circuit breaker (agnósticos al provider).
- Cron registry en `lib/medios/canonical/maintenance/index.ts` con plug points.
- Tablas Railway (`topic_prominence_history`, `pipeline_metrics`).

---

## §2 · Capa Layer 3 · Adapter Gemini

### 2.1 Por qué Gemini en vez de Groq

Decisión usuario 2026-06-02: cambiar provider de Groq a Google Gemini API.
- API key configurable vía `GEMINI_API_KEY` (Vercel env var).
- Modelo: `gemini-2.0-flash-lite-001` (consistencia con `/api/geopolitica/`
  que ya usa este modelo).
- HTTP directo, sin SDK adicional.

### 2.2 Implementación

Archivo: `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts`

Añadir clase `GeminiProductionClient` que implementa
`LlmClassifierClient` (interfaz ya existente):

```typescript
class GeminiProductionClient implements LlmClassifierClient {
  constructor(
    private apiKey: string,
    private model: string = 'gemini-2.0-flash-lite-001',
    private cache: ClassificationCache,
    private rateLimiter: TokenBucketRateLimiter,
    private circuitBreaker: CircuitBreaker,
  ) {}

  async classifyBatch(items, topicList): Promise<Result[]> {
    // 1. Cache lookup por SHA256(items + topicList)
    // 2. Rate limit check (token bucket 30 req/min, configurable)
    // 3. Circuit breaker check (3 fallos consecutivos → 60s open)
    // 4. POST a generativelanguage.googleapis.com/v1beta/models/${model}:generateContent
    //    - prompt: classify_items prompt template
    //    - schema: response_mime_type='application/json' + response_schema
    // 5. Parse + validate + cache write + return
  }
}
```

Reutilizar de Groq existente:
- `ClassificationCache` (SHA256 TTL 1h)
- `TokenBucketRateLimiter` (30 req/min default)
- `CircuitBreaker` (3 fallos → 60s open)
- Prompt template `classify_items`

### 2.3 Configuración

Archivo: `apps/visual-oscar/lib/medios/canonical/feature-flags.ts`

Añadir valor `'gemini'` al flag:

```typescript
const VALID_CLASSIFIERS = ['ollama', 'groq', 'gemini', 'disabled'] as const
export type LlmClassifierProvider = typeof VALID_CLASSIFIERS[number]

export function getLlmClassifier(): LlmClassifierProvider {
  const env = process.env.MEDIOS_LLM_CLASSIFIER
  if (VALID_CLASSIFIERS.includes(env as any)) return env as LlmClassifierProvider
  return 'disabled'  // safe default
}
```

Factory en `classify-semantic.ts` añade rama Gemini:

```typescript
export function createLlmClient(): LlmClassifierClient {
  const provider = getLlmClassifier()
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new ConfigError('GEMINI_API_KEY required')
    return new GeminiProductionClient(key, ...)
  }
  // ... ollama, groq, stub
}
```

### 2.4 Tests

`tests/lib/medios/llm-classifier-gemini.test.ts`:
- Mock fetch a `generativelanguage.googleapis.com`
- Verifica payload structure (model, prompt, response_schema)
- Verifica cache hit en segunda llamada idéntica
- Verifica rate limit bloquea > 30 req/min
- Verifica circuit breaker abre tras 3 fallos consecutivos
- Verifica error config si `GEMINI_API_KEY` no está

---

## §3 · Pipeline · Activar Layer 3 en cascada

Archivo: `apps/visual-oscar/lib/medios/canonical/pipeline.ts`

`processArticle()` ya tiene step 6 `classifyTopic()` que llama solo a
Layers 1+2. Modificar para añadir Layer 3 cuando ambas fallan:

```typescript
async function classifyTopic(article: Article): Promise<TopicClassification> {
  // Layer 1: RSS_TAG (existe)
  const layer1 = await classifyByRssTags(article)
  if (layer1.confidence >= 0.65) {
    return { ...layer1, method: 'RSS_TAG' }
  }

  // Layer 2: HEURISTIC (existe)
  const layer2 = await classifyByHeuristics(article)
  if (layer2.confidence >= 0.60) {
    return { ...layer2, method: 'HEURISTIC' }
  }

  // Layer 3: SEMANTIC LLM (Sprint 2 nuevo)
  if (getLlmClassifier() !== 'disabled') {
    const llmClient = createLlmClient()
    const batch = await llmClient.classifyBatch([article], TOPIC_LIST)
    if (batch[0] && batch[0].confidence >= 0.75) {
      return { ...batch[0], method: 'SEMANTIC_LLM' }
    }
  }

  // Fallback: OTRO
  return { topicId: 'OTRO', confidence: 0, method: 'NONE' }
}
```

### 3.1 Batching Layer 3

Para minimizar costo Gemini, los items que llegan a Layer 3 se acumulan
en buffer y se envían en batch de 20 cada 30s. Mientras el buffer no se
llene, el pipeline marca `processing_status='pending_llm_classification'`
y continúa con el resto de steps. Cuando llega la respuesta, se hace
UPDATE en background.

Trade-off: latencia ~30s para clasificación de items raros, pero costo
~20x menor (Gemini cobra por request, no por token).

### 3.2 Tests

`tests/lib/medios/pipeline-cascade.test.ts`:
- Item con RSS tag claro → solo Layer 1 ejecutado
- Item sin RSS tag pero con palabras clave → Layer 2 ejecutado
- Item ambiguo → Layer 3 ejecutado con Gemini stub
- Verifica `classification_method` correcto en cada caso
- Verifica que confidence < threshold pasa a siguiente layer

---

## §4 · TopicProminenceScore · 5 componentes

Cada componente devuelve [0, 1]. Score agregado ponderado:

```
score = 0.30·volume + 0.25·momentum + 0.20·sourceDiversity
      + 0.15·tierWeight + 0.10·entityDensity
```

### 4.1 volumeScore (existe, Sprint 0+1)

```
volumeScore = log(article_count) / log(p99(últimas 7d))
```

Persistido en cada snapshot.

### 4.2 momentumScore (Sprint 2 nuevo)

```
momentumScore = current_volume / max(baseline, ε)
donde:
  current_volume  = articles en últimas 24h
  baseline        = media móvil 7d, excluyendo últimas 24h
  ε               = 1 (evitar div/0)
```

Resultado normalizado a [0, 1] con `min(momentum / 3, 1)` (un topic con
3x el baseline ya satura).

Persistido en `topic_prominence_history.momentum_score`.

### 4.3 sourceDiversityScore

```
sourceDiversityScore = 1 − Herfindahl_tier_weighted
donde:
  Herfindahl = Σ (share_medio_i)²
  share_medio = articles_medio_i / total
```

Penaliza topics dominados por 1-2 medios. Topic con 10 medios distintos
y reparto uniforme → ~0.9. Topic con 1 medio → 0.

### 4.4 tierWeightScore

**⚠️ NOTA SCHEMA**: `medios_config` no tiene columna `tier`. Tiene
`tendencia, establishment, credibilidad, rss_urls`. El `tier_weight`
se deriva:

```
tier_weight(medio) = 0.6·credibilidad + 0.4·(establishment ? 1 : 0)
                   ∈ [0, 1]
```

Donde:
- `credibilidad` es NUMERIC en `medios_config` (escala 0-1 según seed)
- `establishment` es BOOLEAN (true = medio establecido, peso mayor)

```
tierWeightScore = (Σ tier_weight(medio_i) · n_articulos_i) / total_articulos
```

Esto significa: si todos los artículos vienen de medios con
`credibilidad=1.0` y `establishment=true`, el score es 1.0. Si vienen
solo de medios `credibilidad=0.3, establishment=false`, score ≈ 0.18.

### 4.5 entityDensityScore

```
entityDensityScore = unique_entities / article_count
```

Normalizado a [0, 1] con `min(density / 5, 1)` (un topic con 5 entidades
únicas por artículo ya satura — es un topic muy "nombrado").

`article.entities` JSONB array contiene `[{type, id, label}, ...]` —
contar unique por `(type, id)`.

### 4.6 Persistencia

Cada 15 min, un cron `topic-prominence-snapshot` (plug point declarado en
Sprint 0+1, **implementación efectiva en C3 de este sprint**) calcula y
persiste, por cada `(topic_id, subtopic_id, window_spec)`:

```sql
INSERT INTO topic_prominence_history (
  topic_id, subtopic_id, computed_at, window_spec, score,
  volume_score, momentum_score, source_diversity_score,
  tier_weight_score, entity_density_score, state, volume, source_count
) VALUES (...);
```

`window_spec` ∈ `['24h', '7d', '30d']`. Snapshots se acumulan,
no se borran (gestión por retention policy futura).

### 4.7 Tests

`tests/lib/medios/scoring.test.ts`:
- volumeScore con fixture de 100 articles → score ∈ [0, 1]
- momentumScore con fixture de spike 24h vs baseline 7d → score > 0.7
- sourceDiversityScore con fixture de 10 medios uniformes → score > 0.85
- sourceDiversityScore con fixture de 1 medio dominante → score < 0.2
- tierWeightScore con mix establishment/no-establishment
- entityDensityScore con fixture de 5 entidades por article

---

## §5 · TopicState · transiciones automáticas

Cada snapshot 15min evalúa el estado del topic:

```typescript
function deriveTopicState(history: HistorySnapshot[]): TopicState {
  const last14d = history.filter(h => h.computed_at >= NOW - 14d)
  const last24h = history.filter(h => h.computed_at >= NOW - 24h)

  // STRUCTURAL: volume sostenido 14d
  const avgVolume14d = mean(last14d.map(h => h.volume_score))
  if (avgVolume14d >= 0.5) return 'STRUCTURAL'

  // EMERGENT: momentum alto pero volume aún bajo
  const recentMomentum = mean(last24h.map(h => h.momentum_score))
  const recentVolume = mean(last24h.map(h => h.volume_score))
  if (recentMomentum >= 0.7 && recentVolume < 0.4) return 'EMERGENT'

  return 'STABLE'
}
```

Persistido en `topic_prominence_history.state`. Determinista: misma serie
histórica → mismo estado.

### 5.1 Tests

`tests/lib/medios/state-machine.test.ts`:
- Fixture 14d volumen sostenido → STRUCTURAL
- Fixture spike último día sin historial → EMERGENT
- Fixture volumen variable bajo → STABLE
- Verifica determinismo (mismo input × 2 → mismo output)

---

## §6 · PulsoMode · 5 modos de presentación

Endpoint existente `/api/medios/pulso?mode=...` ya devuelve
`DominantTopic[]` (Sprint 0+1). Sprint 2 añade 3 nuevos modos
(`REGION`, `IDEOLOGY`, `CRISIS`) y enriquece los 2 existentes.

### 6.1 PLURAL (enriquecido)

Top topics ponderados por diversidad ideológica de medios que cubren.

```sql
-- ranking por (score · diversity_ideologica) donde diversity =
-- 1 - Herfindahl(tendencia_medios)
SELECT topic_id, score, ideological_distribution
FROM aggregate_topics(window='24h')
ORDER BY (score * (1 - herfindahl(tendencias))) DESC
LIMIT 12;
```

`ideological_distribution`: `{izquierda: 0.4, centro: 0.3, derecha: 0.3}`.

### 6.2 AUDIEN (enriquecido)

Top topics ponderados por audiencia estimada de medios que cubren.

```sql
-- audiencia = log(audiencia_mensual_estimada)
-- no tenemos audiencia exacta → usar `establishment AS boolean` como proxy
-- + `credibilidad`
SELECT topic_id, score, total_audience_proxy
FROM aggregate_topics(window='24h')
ORDER BY (score * sum_audience) DESC
LIMIT 12;
```

### 6.3 REGION (nuevo)

Distribución territorial con la triple distinción del strip metodológico
ya existente en `MapasImpacto.tsx`:

- **CCAA del medio**: `medios_config.tendencia` + scrape de CCAA origen
- **CCAA mencionada**: extraída de `article.body_text` por NER
- **CCAA afectada**: extraída de `article.entities` (políticos afectados)

```typescript
interface RegionPulse {
  topic_id: string
  ccaa_breakdown: {
    [ccaa: string]: {
      from_medium: number     // arts de medios de ese CCAA
      mentions: number         // arts que mencionan ese CCAA
      affects: number          // arts que afectan políticamente
    }
  }
}
```

### 6.4 IDEOLOGY (nuevo)

Balance ideológico por topic:

```typescript
interface IdeologyPulse {
  topic_id: string
  distribution: {
    izquierda: number
    centro: number
    derecha: number
  }
  bias_index: number  // -1 (izq) to +1 (der), 0 = balanced
}
```

`bias_index = (share_derecha − share_izquierda) / (1 − share_centro)`

### 6.5 CRISIS (nuevo)

Solo topics con `state='EMERGENT'` + multi-medio últimas 6h:

```typescript
interface CrisisPulse {
  topic_id: string
  velocity: number              // articles/hour últimas 6h
  source_count: number
  first_seen: timestamp
  representative_articles: Article[]
}
```

Filtro: `velocity ≥ 5/h` AND `source_count ≥ 3` AND `state='EMERGENT'`.

### 6.6 Tests

`tests/api/medios/pulso-modes.test.ts`:
- GET `/api/medios/pulso?mode=PLURAL` → array de DominantTopic con
  `ideological_distribution`
- GET `/api/medios/pulso?mode=REGION` → array con `ccaa_breakdown`
- GET `/api/medios/pulso?mode=CRISIS` → solo topics EMERGENT
- Mode inválido → 400 con error claro

---

## §7 · Jobs de mantenimiento

3 crones nuevos en `lib/medios/canonical/maintenance/`. Plug points ya
declarados en Sprint 0+1.

### 7.1 unmapped-tags (cada 6h)

```typescript
async function jobUnmappedTags(): Promise<UnmappedReport> {
  // 1. SELECT DISTINCT raw_tags FROM article WHERE ingested_at >= NOW - 6h
  // 2. Para cada tag, verificar si existe en rss-tag-map.json
  // 3. Agregar tags no-mapeados con frecuencia
  // 4. Log estructurado + persist en pipeline_metrics.failed_in_pipeline.unmapped_tags
  // 5. Top 50 ordered por frecuencia
}
```

Endpoint: `GET /api/medios/maintenance/unmapped-tags`
- Devuelve top 50 + sugerencias macrotema (por similitud léxica)
- UI futura: panel "Tags no clasificados" para curación humana

### 7.2 terms-not-classified (cada 12h)

```typescript
async function jobOtroCluster(): Promise<OtroClusterReport> {
  // 1. SELECT articles WHERE topic_id='OTRO' AND ingested_at >= NOW - 12h
  // 2. Vectorización TF-IDF + clustering por cosine similarity
  //    (NO embeddings semánticos · NO LLM · sin costo externo)
  // 3. Top clusters >= 5 articles
  // 4. Para cada cluster: top terms + sample articles + sugerencia macrotema
  // 5. Persist en pipeline_metrics
}
```

Endpoint: `GET /api/medios/maintenance/otro-cluster`
- Devuelve clusters propuestos
- UI futura: panel "OTRO inspector" para añadir reglas heurísticas

### 7.3 classifier-metrics (cada 24h)

```typescript
async function jobClassifierMetrics(): Promise<void> {
  // 1. Agregar últimas 24h:
  //    - fetched_total, duplicates_*, noise_filtered
  //    - processed_successfully, classified_with_taxonomy
  //    - classification_by_method (RSS_TAG/HEURISTIC/SEMANTIC_LLM/NONE)
  //    - classification_confidence (distribution)
  //    - otro_percentage
  // 2. INSERT INTO pipeline_metrics (...)
  // 3. Log estructurado
}
```

Endpoint: `GET /api/medios/maintenance/metrics?window=24h|7d|30d`
- Devuelve serie histórica
- UI: tab "Salud del clasificador" en `/medios/health`

### 7.4 Tests

`tests/lib/medios/maintenance.test.ts`:
- Jobs idempotentes (run × 2 → mismo resultado)
- Jobs persisten en BD esperada
- Endpoints devuelven JSON valid
- Edge cases: ventana vacía → response vacío sin error

---

## §8 · Tests de aceptación §IV (10 tests, deben pasar al final del Sprint)

`tests/lib/medios/acceptance/sprint-2.test.ts`

1. **OTRO ≤ 8%** en ventana 7d
   ```typescript
   const metrics = await loadPipelineMetrics(window='7d')
   assert(metrics.otro_percentage <= 0.08)
   ```

2. **Layer 1 (RSS_TAG) cubre ≥ 60%**
   ```typescript
   assert(metrics.classification_by_method.RSS_TAG >= 0.60)
   ```

3. **Layer 2 (HEURISTIC) cubre ≥ 20%**
   ```typescript
   assert(metrics.classification_by_method.HEURISTIC >= 0.20)
   ```

4. **Layer 3 (LLM) cubre ≤ 20% con cache hit ≥ 70%**
   ```typescript
   assert(metrics.classification_by_method.SEMANTIC_LLM <= 0.20)
   assert(geminiClient.cacheHitRate >= 0.70)
   ```

5. **sourceDiversityScore correlaciona con n_sources** (Spearman ≥ 0.8)
   ```typescript
   const sample = await sampleTopics(n=50)
   const spearman = computeSpearman(
     sample.map(t => t.source_diversity_score),
     sample.map(t => t.source_count)
   )
   assert(spearman >= 0.8)
   ```

6. **momentumScore detecta spike sintético**
   ```typescript
   // Fixture: topic con 5 arts/día durante 7d, luego 50 arts/día
   // momentumScore debe ser > 0.7
   const result = computeMomentum(spikeFixture)
   assert(result >= 0.7)
   ```

7. **TopicState determinista**
   ```typescript
   const state1 = deriveTopicState(fixture)
   const state2 = deriveTopicState(fixture)
   assert(state1 === state2)
   ```

8. **PulsoMode REGION distribuye correctamente**
   ```typescript
   const region = await fetch('/api/medios/pulso?mode=REGION')
   // verificar que cada topic tiene ccaa_breakdown con keys válidas
   assert(region.every(t => Object.keys(t.ccaa_breakdown).every(k => VALID_CCAA.includes(k))))
   ```

9. **CrisisMode filtra correctamente**
   ```typescript
   const crisis = await fetch('/api/medios/pulso?mode=CRISIS')
   assert(crisis.every(t =>
     t.velocity >= 5 && t.source_count >= 3 && t.state === 'EMERGENT'
   ))
   ```

10. **Confidence aggregation correcto**
    ```typescript
    // Mockear Layer 1 a confidence=0.7 → no debe llamar Layer 2 ni 3
    // Mockear Layer 1 a confidence=0.3, Layer 2 confidence=0.5 → debe llamar Layer 3
    const callCounts = await runClassifyWithMocks(...)
    assert(callCounts.layer2 === 0 when layer1 >= 0.65)
    assert(callCounts.layer3 > 0 when layer1 < 0.65 && layer2 < 0.60)
    ```

---

## §9 · Observabilidad y health endpoint

`/medios/health` (página existente Sprint 1.5) enriquecida con:

- **Clasificador (24h)**: distribución por método (gráfico stacked area)
- **OTRO trend (7d)**: serie temporal de `otro_percentage`
- **Gemini API status**: cache hit rate, rate limit usage, circuit breaker state
- **Jobs mantenimiento**: última ejecución de cada cron + status
- **Topic state distribution**: pie chart STRUCTURAL/EMERGENT/STABLE
- **Top OTRO clusters**: top 5 clusters detectados por `terms-not-classified`

Logs estructurados nuevos:
- `classifier.gemini.call` (model, batch_size, latency_ms, cache_hit, tokens)
- `classifier.layer_dispatch` (article_id, layer, confidence, threshold)
- `scoring.topic_prominence` (topic_id, window, score, components)
- `state.transition` (topic_id, from, to, reason)
- `maintenance.unmapped_tags` (count, top_5)
- `maintenance.otro_cluster` (n_clusters, total_articles)
- `maintenance.classifier_metrics` (window, otro_pct, layer_distribution)

---

## §10 · Estructura 10 commits

| # | Subject | Archivos clave | Tests |
|---|---------|----------------|-------|
| **C1** | `feat(medios): adapter Gemini para Layer 3 SEMANTIC` | `lib/medios/canonical/llm-classifier.ts`, `feature-flags.ts`, `classify-semantic.ts` factory | `tests/lib/medios/llm-classifier-gemini.test.ts` (6 tests) |
| **C2** | `feat(medios): activar Layer 3 SEMANTIC en pipeline canónico` | `lib/medios/canonical/pipeline.ts`, batch buffer | `tests/lib/medios/pipeline-cascade.test.ts` (5 tests) |
| **C3** | `feat(medios): momentumScore desde topic_prominence_history` | `lib/medios/canonical/scoring/momentum.ts`, snapshot writer | `tests/lib/medios/scoring/momentum.test.ts` (4 tests) |
| **C4** | `feat(medios): scoring sourceDiversity + tierWeight + entityDensity` | `scoring/diversity.ts`, `scoring/tier.ts`, `scoring/entity-density.ts`, agregador `scoring/index.ts` | `tests/lib/medios/scoring/*.test.ts` (8 tests) |
| **C5** | `feat(medios): TopicState transitions STRUCTURAL/EMERGENT/STABLE` | `scoring/state-machine.ts`, integration en snapshot writer | `tests/lib/medios/state-machine.test.ts` (5 tests) |
| **C6** | `feat(medios): PulsoMode REGION + IDEOLOGY + CRISIS` | `app/api/medios/pulso/route.ts`, queries derivadas, types | `tests/api/medios/pulso-modes.test.ts` (8 tests) |
| **C7** | `feat(medios): job unmapped-tags cada 6h` | `maintenance/unmapped-tags.ts`, endpoint, cron config | `tests/lib/medios/maintenance/unmapped-tags.test.ts` (4 tests) |
| **C8** | `feat(medios): job terms-not-classified cada 12h (OTRO cluster)` | `maintenance/otro-cluster.ts`, TF-IDF cluster, endpoint | `tests/lib/medios/maintenance/otro-cluster.test.ts` (4 tests) |
| **C9** | `feat(medios): job classifier-metrics cada 24h` | `maintenance/classifier-metrics.ts`, endpoint, persistencia `pipeline_metrics` | `tests/lib/medios/maintenance/classifier-metrics.test.ts` (4 tests) |
| **C10** | `feat(medios): tests aceptación §IV + /medios/health Sprint 2 + push prod` | 10 tests aceptación, página health enriquecida, fast-forward main+Visual_Oscar | `tests/lib/medios/acceptance/sprint-2.test.ts` (10 tests) |

**Total estimado**: ~60 tests nuevos + ~3000-4000 LOC nuevos.

---

## §11 · Forma de trabajo

- **Branch**: `claude/sharp-keller-3d6d48` (estamos aquí)
- **Sub-agentes**: cada commit ejecuta un sub-agente con prompt explícito,
  archivos a tocar, tests a escribir y verificación local
- **Verificación local cada commit**:
  - `cd apps/visual-oscar && npm run build` (verde)
  - `cd apps/visual-oscar && npm run test:unit` (todos passing)
  - `git diff` review human-style por mí antes de commit
- **0 deploys durante el sprint** (decisión usuario)
- **Final**:
  - Backup tags antes de push
  - Fast-forward único a `main` (`git push origin HEAD:main`)
  - Fast-forward único a `Visual_Oscar` (`git push origin HEAD:Visual_Oscar`)
  - Vercel auto-deploya desde `Visual_Oscar`
  - Smoke en producción: `/medios/health` + tab "Importancia Temática"

---

## §12 · Variables de entorno necesarias

| Variable | Valor | Dónde | Cuándo |
|----------|-------|-------|--------|
| `GEMINI_API_KEY` | (proporcionada por usuario) | Vercel Production + Preview | C1 (con `vercel env add`) |
| `MEDIOS_LLM_CLASSIFIER` | `gemini` | Vercel Production + Preview | C1 |
| `MEDIOS_LLM_BATCH_SIZE` | `20` | Vercel Production (override default) | C2 (opcional) |
| `MEDIOS_LLM_RATE_LIMIT_RPM` | `30` | Vercel Production (override default) | C2 (opcional) |
| `DATABASE_URL` | (Railway URL ya configurada) | Railway + Vercel | Ya configurada |

**⚠️ SECURITY**: usuario compartió `GEMINI_API_KEY` en chat 2026-06-02. Tras
configurarla en Vercel, rotarla en Google AI Studio → "Get API key" → regenerar
la clave + actualizar `GEMINI_API_KEY` en Vercel.

---

## §13 · Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Gemini quota / rate limit en producción | Media | Alto | Rate limit 30/min + cache 1h + batch 20 + circuit breaker |
| Gemini latencia > 30s | Baja | Medio | Batch buffer asíncrono · pipeline no bloquea |
| Schema mismatch (tier no existe) | Detectado pre-sprint | Bajo | Documentado en §4.4, usar `establishment + credibilidad` como proxy. No bloquea ningún commit. |
| Tests aceptación fallan en C10 | Media | Alto | Cada commit verifica métricas parciales · C10 solo cierra |
| Vercel build > 45min al final del sprint | Baja | Bajo | Build incremental Next.js + ya verificamos npm run build pasa local |
| Deploy final rompe producción | Baja | Alto | Backup tag pre-deploy + smoke immediately post |
| Costo Gemini > $10/día en producción | Baja | Bajo | Cache 1h + rate limit + monitoring en `/medios/health` |

---

## §14 · Out of scope (NO en este sprint)

- Onboarding manual de tags en `rss-tag-map.json` (es output de job
  `unmapped-tags`, curación es UX futura).
- Embeddings vectorial real para `terms-not-classified` (usaremos TF-IDF
  cosine, suficiente para clustering inicial).
- Predicción `STRUCTURAL` automática con ML (es heurística determinista
  por ahora).
- Multi-language (sigue ES-only Sprint 0+1).
- Topic ontology versionada (`topic_id` strings, sin schema versioning).
- UI de administración de la taxonomía (será Sprint 3+).

---

## §15 · Predecesores y sucesores

**Predecesor**: Sprint 0+1 Prensa · Ingesta Canónica
([design](./2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md),
[plan](../plans/2026-06-02-prensa-sprint-0-1-ingesta-canonica.md))

**Sucesores planificados** (no parte de este sprint):
- Sprint 3 · Detección de Actores y entity ProminenceScore
- Sprint 4 · Detección de Narrativas y framing
- Sprint 5 · Multi-language y federación europea
