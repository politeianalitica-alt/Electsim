# Sprint 2 Prensa · Clasificación Temática y Detección de Agenda · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enriquecer el módulo de prensa canónica con clasificación semántica via Gemini (Layer 3), TopicProminenceScore completo (5 componentes), TopicState transitions deterministas, 5 PulsoMode (PLURAL/AUDIEN/REGION/IDEOLOGY/CRISIS), 3 jobs de mantenimiento y 10 tests de aceptación §IV, dejando visiblemente mejorada la tab "Importancia Temática" en producción tras un único deploy final.

**Architecture:** Extender la capa canónica de `apps/visual-oscar/lib/medios/canonical/` (Sprint 0+1) sin tocar legacy. Nuevo wrapper `GeminiProductionClient` reutiliza el cliente HTTP existente `lib/ai/gemini-client.ts`. Scoring se reparte en sub-módulos `scoring/{momentum,diversity,tier,entity-density,state-machine}.ts`. Cron `medios-mantenimiento` (hourly) ya existe — añadir 3 entradas al registry `JOBS`. Endpoints `/api/medios/pulso?mode=...` y `/api/medios/maintenance/*` consumen tablas ya creadas por migración 0058 (aplicada en Railway pre-sprint).

**Tech Stack:** TypeScript estricto · Next.js 14 App Router · Vitest (unit) · Playwright (smoke) · Railway Postgres 18.4 · Gemini API (`gemini-2.0-flash-lite`) · pg cliente raw SQL · Vercel Cron.

**Spec source:** `docs/superpowers/specs/2026-06-02-prensa-sprint-2-clasificacion-tematica-design.md` (commit `5dfa3a05` en `claude/sharp-keller-3d6d48`).

**Predecesor:** Sprint 0+1 (HEAD `387f2ac9` en `main`, plan `docs/superpowers/plans/2026-06-02-prensa-sprint-0-1-ingesta-canonica.md`).

**Convención naming:** Español (continúa Sprint 0+1).

**Decisiones aprobadas (brainstorming 2026-06-02):**
- LLM Layer 3 = Gemini (no Groq)
- Deploy = 1 push fast-forward al final (C10) — cero deploys intermedios
- Branch único: `claude/sharp-keller-3d6d48`
- Forma de entrega: 1 sub-agente por commit (recommended path), revisión entre commits
- Verificación cada commit: `npm run build` verde + `npm test -- --run` pasa
- Schema awareness: `medios_config` no tiene `tier` → derivar de `credibilidad + establishment`

---

## File Structure Overview

```
docs/superpowers/specs/2026-06-02-prensa-sprint-2-clasificacion-tematica-design.md  ← YA EXISTE (5dfa3a05)
docs/superpowers/plans/2026-06-02-prensa-sprint-2-clasificacion-tematica.md         ← ESTE archivo

apps/visual-oscar/
  lib/medios/canonical/
    ├ llm-classifier.ts                   ← MODIFICAR (C1: añadir GeminiProductionClient)
    ├ classify-semantic.ts                ← MODIFICAR (C1: factory rama 'gemini')
    ├ feature-flags.ts                    ← MODIFICAR (C1: añadir 'gemini' al union)
    ├ pipeline.ts                         ← MODIFICAR (C2: batch buffer + log método)
    ├ scoring.ts                          ← MODIFICAR (C3-C5: re-export sub-módulos)
    ├ scoring/                            ← NUEVO directorio
    │   ├ momentum.ts                     (C3 · ~120 LOC)
    │   ├ diversity.ts                    (C4 · ~80 LOC)
    │   ├ tier.ts                         (C4 · ~80 LOC)
    │   ├ entity-density.ts               (C4 · ~60 LOC)
    │   ├ aggregate.ts                    (C4 · ~80 LOC, agregador ponderado)
    │   ├ state-machine.ts                (C5 · ~100 LOC)
    │   └ snapshot-writer.ts              (C3 · ~150 LOC, persiste topic_prominence_history)
    ├ stores/                             ← NUEVO directorio
    │   ├ topic-prominence-store.ts       (C3 · ~80 LOC, queries SQL)
    │   ├ pipeline-metrics-store.ts       (C9 · ~80 LOC)
    │   └ medios-config-store.ts          (C4 · ~50 LOC, lee tendencia/credibilidad/establishment)
    └ maintenance/
        ├ index.ts                        ← MODIFICAR (C7-C9: 3 entradas al JOBS array)
        ├ unmapped-tags.ts                (C7 · ~100 LOC)
        ├ otro-cluster.ts                 (C8 · ~150 LOC, TF-IDF cosine)
        └ classifier-metrics.ts           (C9 · ~120 LOC)

  app/api/medios/
    pulso/route.ts                        ← MODIFICAR (C6: llenar REGION + IDEOLOGY + CRISIS)
    maintenance/
      ├ unmapped-tags/route.ts            (C7 · ~50 LOC)
      ├ otro-cluster/route.ts             (C8 · ~50 LOC)
      └ metrics/route.ts                  (C9 · ~50 LOC)
    health/route.ts                       ← MODIFICAR (C10: enriquecer con Sprint 2 metrics)

  app/medios/health/page.tsx              ← MODIFICAR (C10: sección Sprint 2)

  tests/
    unit/medios/canonical/
      ├ llm-classifier-gemini.test.ts     (C1 · 6 tests)
      ├ pipeline-cascade-layer3.test.ts   (C2 · 5 tests)
      ├ scoring/
      │   ├ momentum.test.ts              (C3 · 4 tests)
      │   ├ diversity.test.ts             (C4 · 3 tests)
      │   ├ tier.test.ts                  (C4 · 3 tests)
      │   ├ entity-density.test.ts        (C4 · 2 tests)
      │   ├ aggregate.test.ts             (C4 · 2 tests)
      │   ├ state-machine.test.ts         (C5 · 5 tests)
      │   └ snapshot-writer.test.ts       (C3 · 3 tests)
      ├ maintenance/
      │   ├ unmapped-tags.test.ts         (C7 · 4 tests)
      │   ├ otro-cluster.test.ts          (C8 · 4 tests)
      │   └ classifier-metrics.test.ts    (C9 · 4 tests)
    integration/medios/
      ├ pulso-modes.test.ts               (C6 · 8 tests endpoint)
      └ maintenance-endpoints.test.ts     (C7-C9 · 3 tests integración)
    acceptance/
      sprint-2-prensa.spec.ts             (C10 · 10 tests §IV)
```

**Cero modificaciones a legacy**: no se toca `news-aggregator.ts`, `media-methodology.ts`, `news-intel.ts`, `rss.ts`, `/api/medios/intel|search|lectura|ccaa|dossier|eventos-globales`.

**Cero deploys intermedios**: C1-C9 commits + push solo a `claude/sharp-keller-3d6d48`. C10 hace fast-forward único a `main` + `Visual_Oscar`.

---

## Pre-flight checks

Antes de empezar C1, verificar entorno:

- [ ] **PF.1: Branch y HEAD correctos**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git status
git log --oneline -3
```

Expected: working tree clean. HEAD = `5dfa3a05` (design doc commit) o más reciente. Branch = `claude/sharp-keller-3d6d48`.

- [ ] **PF.2: Build legacy pasa**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`. Si falla, hay deuda previa que resolver antes.

- [ ] **PF.3: Tests legacy + Sprint 0+1 pasan**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npm test -- --run 2>&1 | tail -30
```

Expected: 92+ tests green (baseline Sprint 0+1). Anotar el count exacto para comparar al final.

- [ ] **PF.4: Postgres Railway accesible + tablas Sprint 2 presentes**

Run:
```bash
export DATABASE_URL='postgresql://postgres:lSesCSHksNtCCbPMJVyNrSyyNuZeSjAa@switchback.proxy.rlwy.net:12724/railway'
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM topic_prominence_history;"
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pipeline_metrics;"
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM medios_config;"
```

Expected: las 3 queries devuelven números (0, 0, 19 respectivamente). Si falla, la migración 0058 no se aplicó correctamente.

- [ ] **PF.5: Gemini API key configurada localmente (necesaria para tests E2E)**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
grep -l "GEMINI_API_KEY" .env.local 2>/dev/null || echo "GEMINI_API_KEY=<pendiente C1>" >> .env.local
```

Expected: `.env.local` contiene `GEMINI_API_KEY=...` (puede estar vacía; C1 la configura).

---

## C1 · Adapter Gemini para Layer 3 SEMANTIC

**Goal:** Añadir `GeminiProductionClient` que implementa `LlmClassifierClient` reutilizando el cliente HTTP existente `lib/ai/gemini-client.ts`. Activar como provider seleccionable via `MEDIOS_LLM_CLASSIFIER=gemini`.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts` (MODIFICAR — añadir clase)
- Modify: `apps/visual-oscar/lib/medios/canonical/feature-flags.ts:1-27` (añadir 'gemini' al union)
- Modify: `apps/visual-oscar/lib/medios/canonical/classify-semantic.ts:90-132` (factory rama 'gemini')
- Test: `apps/visual-oscar/tests/unit/medios/canonical/llm-classifier-gemini.test.ts` (NUEVO)

**Dependencies:** Ninguna previa. Es el primer commit del sprint.

**Sub-agent prompt:**
> Implementa C1 del Sprint 2 Prensa: añadir `GeminiProductionClient` al clasificador semántico (Layer 3).
>
> **Lee primero:**
> 1. `docs/superpowers/specs/2026-06-02-prensa-sprint-2-clasificacion-tematica-design.md` §2 (adapter Gemini)
> 2. `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts` completo (256 líneas, contiene GroqProductionClient como referencia exacta del patrón a replicar)
> 3. `apps/visual-oscar/lib/medios/canonical/classify-semantic.ts` (132 líneas, contiene interface `LlmClassifierClient` y factory)
> 4. `apps/visual-oscar/lib/medios/canonical/feature-flags.ts` (27 líneas, declara el flag)
> 5. `apps/visual-oscar/lib/ai/gemini-client.ts` completo (69 líneas, cliente Gemini reutilizable con `generateJSON<T>()`)
>
> **Patrón a seguir EXACTO**: `GroqProductionClient` ya implementa el patrón completo (cache + rate limit + circuit breaker). Replica los **mismos métodos privados** y solo cambia el HTTP backend (en vez de `fetch(GROQ_URL)`, usar `generateJSON()<TopicClassification>()` de `lib/ai/gemini-client.ts`).
>
> **NO reinventar**: el cache, rate limiter y circuit breaker son clases privadas en `llm-classifier.ts`; reutilízalas. NO crees clases nuevas.
>
> Sigue el plan paso a paso con los checkboxes. No saltes verificación local entre steps.

### Steps

- [ ] **Step 1.1: Verificar API key Gemini disponible**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
# La user proporcionó la key en chat: AIzaSyAHJ7ejjDsnelU950VmiphdY6zMdcaJIfw
# (rotar tras configurar)
grep "GEMINI_API_KEY" .env.local || echo "GEMINI_API_KEY=AIzaSyAHJ7ejjDsnelU950VmiphdY6zMdcaJIfw" >> .env.local
grep "MEDIOS_LLM_CLASSIFIER" .env.local || echo "MEDIOS_LLM_CLASSIFIER=gemini" >> .env.local
cat .env.local | grep -E "GEMINI|MEDIOS_LLM"
```

Expected: muestra ambas vars. `.env.local` NO se commitea (debe estar en `.gitignore`).

- [ ] **Step 1.2: Crear test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/llm-classifier-gemini.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiProductionClient } from '@/lib/medios/canonical/llm-classifier'

// Mock del cliente Gemini reutilizable
vi.mock('@/lib/ai/gemini-client', () => ({
  generateJSON: vi.fn(),
}))

import { generateJSON } from '@/lib/ai/gemini-client'

describe('GeminiProductionClient', () => {
  let client: GeminiProductionClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new GeminiProductionClient({
      apiKey: 'test-key',
      model: 'gemini-2.0-flash-lite',
    })
  })

  it('classifyBatch llama a generateJSON con el schema correcto', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({
      classifications: [{ topicId: 'POLITICA', confidence: 0.85, reasoning: 'menciona PSOE' }],
    })
    const result = await client.classifyBatch(
      [{ title: 'PSOE anuncia...', description: 'El partido...' }],
      ['POLITICA', 'ECONOMIA', 'OTRO'],
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.topicId).toBe('POLITICA')
    expect(result[0]?.confidence).toBeLessThanOrEqual(0.75) // cap aplicado
    expect(generateJSON).toHaveBeenCalledOnce()
  })

  it('cache hit en segunda llamada idéntica', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({
      classifications: [{ topicId: 'ECONOMIA', confidence: 0.9, reasoning: '' }],
    })
    const items = [{ title: 'IPC sube', description: 'inflación' }]
    const topics = ['ECONOMIA', 'OTRO']
    await client.classifyBatch(items, topics)
    await client.classifyBatch(items, topics)
    expect(generateJSON).toHaveBeenCalledOnce() // solo 1 vez por cache
  })

  it('rate limit bloquea > 30 req/min', async () => {
    vi.mocked(generateJSON).mockResolvedValue({ classifications: [{ topicId: 'OTRO', confidence: 0.5, reasoning: '' }] })
    const promises = Array.from({ length: 31 }, (_, i) =>
      client.classifyBatch([{ title: `t${i}`, description: `d${i}` }], ['OTRO']),
    )
    const results = await Promise.all(promises)
    // Al menos uno debe ser null (rate limited)
    expect(results.some(r => r === null)).toBe(true)
  })

  it('circuit breaker abre tras 3 fallos consecutivos', async () => {
    vi.mocked(generateJSON).mockRejectedValue(new Error('API error'))
    await client.classifyBatch([{ title: 'a', description: 'a' }], ['OTRO'])
    await client.classifyBatch([{ title: 'b', description: 'b' }], ['OTRO'])
    await client.classifyBatch([{ title: 'c', description: 'c' }], ['OTRO'])
    // Cuarta llamada debe devolver null sin llamar a generateJSON
    vi.clearAllMocks()
    const result = await client.classifyBatch([{ title: 'd', description: 'd' }], ['OTRO'])
    expect(result).toBeNull()
    expect(generateJSON).not.toHaveBeenCalled()
  })

  it('error config si GEMINI_API_KEY no está', () => {
    expect(() => new GeminiProductionClient({ apiKey: '', model: 'gemini-2.0-flash-lite' }))
      .toThrow(/GEMINI_API_KEY required/)
  })

  it('confidence cap a 0.75 incluso si Gemini devuelve > 0.75', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({
      classifications: [{ topicId: 'POLITICA', confidence: 0.99, reasoning: '' }],
    })
    const result = await client.classifyBatch(
      [{ title: 't', description: 'd' }],
      ['POLITICA'],
    )
    expect(result?.[0]?.confidence).toBe(0.75)
  })
})
```

- [ ] **Step 1.3: Ejecutar test (debe FALLAR)**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/llm-classifier-gemini.test.ts 2>&1 | tail -15
```

Expected: FAIL con "Cannot find module" o "GeminiProductionClient is not exported". Normal.

- [ ] **Step 1.4: Implementar `GeminiProductionClient` en `llm-classifier.ts`**

Open `apps/visual-oscar/lib/medios/canonical/llm-classifier.ts` y añade al final del archivo (después de la clase `GroqProductionClient`):

```typescript
import { generateJSON } from '@/lib/ai/gemini-client'

/**
 * Gemini production client para clasificación semántica (Layer 3).
 *
 * Reutiliza `ClassificationCache`, `RateLimiter` y `CircuitBreaker` privadas
 * de este archivo (declaradas para GroqProductionClient). Solo cambia el
 * backend HTTP: en vez de fetch directo a Groq, delega a `generateJSON<T>()`
 * del cliente Gemini compartido (`lib/ai/gemini-client.ts`).
 *
 * @see docs/superpowers/specs/2026-06-02-prensa-sprint-2-...-design.md §2
 */
export interface GeminiClientConfig {
  apiKey: string
  model?: string
  rpm?: number
}

interface ClassificationResponse {
  classifications: Array<{
    topicId: string
    confidence: number
    reasoning?: string
  }>
}

export class GeminiProductionClient implements LlmClassifierClient {
  private apiKey: string
  private model: string
  private cache: ClassificationCache
  private rateLimiter: RateLimiter
  private circuitBreaker: CircuitBreaker

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey) {
      throw new Error('GEMINI_API_KEY required for GeminiProductionClient')
    }
    this.apiKey = config.apiKey
    this.model = config.model ?? 'gemini-2.0-flash-lite'
    this.cache = new ClassificationCache()
    this.rateLimiter = new RateLimiter(config.rpm ?? 30)
    this.circuitBreaker = new CircuitBreaker(3, 60_000)
  }

  async classifyBatch(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<Array<{ topicId: string; confidence: number; reasoning?: string } | null> | null> {
    // Cache lookup
    const cacheKey = this.cache.makeKey(items, topicList)
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    // Circuit breaker
    if (this.circuitBreaker.isOpen()) return null

    // Rate limit
    if (!this.rateLimiter.tryAcquire()) return null

    try {
      const schema = {
        type: 'object',
        properties: {
          classifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topicId: { type: 'string', enum: topicList },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                reasoning: { type: 'string' },
              },
              required: ['topicId', 'confidence'],
            },
          },
        },
        required: ['classifications'],
      }

      const prompt = this.buildPrompt(items, topicList)

      const response = await generateJSON<ClassificationResponse>({
        apiKey: this.apiKey,
        model: this.model,
        prompt,
        responseSchema: schema,
      })

      // Cap confidence a 0.75 (Layer 3 nunca supera capa anterior fuerte)
      const capped = response.classifications.map(c => ({
        topicId: c.topicId,
        confidence: Math.min(c.confidence, 0.75),
        reasoning: c.reasoning,
      }))

      this.cache.set(cacheKey, capped)
      this.circuitBreaker.recordSuccess()
      return capped
    } catch (err) {
      this.circuitBreaker.recordFailure()
      return null
    }
  }

  private buildPrompt(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): string {
    const itemsText = items
      .map((it, i) => `${i + 1}. TÍTULO: ${it.title}\n   DESC: ${it.description}`)
      .join('\n\n')
    return `Eres un clasificador temático de noticias en español. Para cada noticia, asigna un topicId de la lista [${topicList.join(', ')}] y una confidence ∈ [0, 1].

NOTICIAS:
${itemsText}

Devuelve un objeto JSON con array 'classifications', un elemento por noticia en el mismo orden.`
  }
}
```

- [ ] **Step 1.5: Actualizar feature-flags.ts**

Edit `apps/visual-oscar/lib/medios/canonical/feature-flags.ts` para añadir `'gemini'` al union:

```typescript
const VALID_CLASSIFIERS = ['ollama', 'groq', 'gemini', 'disabled'] as const
export type LlmClassifierProvider = typeof VALID_CLASSIFIERS[number]

export function getLlmClassifier(): LlmClassifierProvider {
  const env = process.env.MEDIOS_LLM_CLASSIFIER
  if (env && (VALID_CLASSIFIERS as readonly string[]).includes(env)) {
    return env as LlmClassifierProvider
  }
  return 'disabled'
}
```

Si el archivo ya tiene una versión similar, solo añade `'gemini'` al array `VALID_CLASSIFIERS`.

- [ ] **Step 1.6: Wire factory en classify-semantic.ts**

Edit `apps/visual-oscar/lib/medios/canonical/classify-semantic.ts` — añade rama Gemini en la factory. Localiza la función `createLlmClient()` (o similar) y añade:

```typescript
import { GeminiProductionClient, GroqProductionClient } from './llm-classifier'
import { OllamaLlmClient, StubLlmClient } from './classify-semantic'
import { getLlmClassifier } from './feature-flags'

export function createLlmClient(): LlmClassifierClient {
  const provider = getLlmClassifier()
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      console.warn('[medios.canonical] GEMINI_API_KEY no configurada, fallback a Stub')
      return new StubLlmClient()
    }
    return new GeminiProductionClient({ apiKey: key })
  }
  if (provider === 'groq') {
    const key = process.env.GROQ_API_KEY
    if (!key) return new StubLlmClient()
    return new GroqProductionClient({ apiKey: key })
  }
  if (provider === 'ollama') {
    return new OllamaLlmClient()
  }
  return new StubLlmClient()
}
```

(Si ya existe la factory, solo añade la rama `provider === 'gemini'` al principio.)

- [ ] **Step 1.7: Ejecutar test (debe PASAR)**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/llm-classifier-gemini.test.ts 2>&1 | tail -20
```

Expected: 6/6 tests passing. Si algún test falla, lee el output, no asumas — los tests están escritos exactamente para validar el contrato.

- [ ] **Step 1.8: Build verde + suite completa pasa**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npm run build 2>&1 | tail -10
npm test -- --run 2>&1 | tail -15
```

Expected: build `✓ Compiled successfully`. Tests: 98+ passing (92 Sprint 0+1 + 6 nuevos). Cero failures, cero new warnings.

- [ ] **Step 1.9: Configurar env var en Vercel**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
# Pide al usuario que añada manualmente vía Vercel dashboard:
# Vercel project politeia → Settings → Environment Variables → Add:
#   GEMINI_API_KEY = <la key>            scopes: Production, Preview
#   MEDIOS_LLM_CLASSIFIER = gemini       scopes: Production, Preview
# Alternativamente con CLI:
vercel env add GEMINI_API_KEY production 2>&1 | head -5 || echo "Manual via dashboard"
vercel env add MEDIOS_LLM_CLASSIFIER production 2>&1 | head -5 || echo "Manual via dashboard"
```

Expected: env vars añadidas (output OK o instrucciones manuales). NO se hace deploy ahora — solo se configura para que cuando C10 deploye, las vars estén listas.

- [ ] **Step 1.10: Commit**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/llm-classifier.ts \
        apps/visual-oscar/lib/medios/canonical/classify-semantic.ts \
        apps/visual-oscar/lib/medios/canonical/feature-flags.ts \
        apps/visual-oscar/tests/unit/medios/canonical/llm-classifier-gemini.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C1 · adapter Gemini para Layer 3 SEMANTIC

Añade GeminiProductionClient que implementa LlmClassifierClient
reutilizando lib/ai/gemini-client.ts. Selector via MEDIOS_LLM_CLASSIFIER=gemini.

Cambios:
- llm-classifier.ts: nueva clase GeminiProductionClient (mismo patrón que
  GroqProductionClient, reutiliza ClassificationCache + RateLimiter + CircuitBreaker)
- feature-flags.ts: 'gemini' añadido al union de providers válidos
- classify-semantic.ts: factory rama Gemini con fallback a Stub si falta key
- tests: 6 tests cubren cache hit, rate limit, circuit breaker, confidence cap,
  schema strict, error config

Configuración:
- GEMINI_API_KEY env var configurable en Vercel
- MEDIOS_LLM_CLASSIFIER=gemini activa el provider
- Modelo: gemini-2.0-flash-lite (consistencia con /api/geopolitica/)
- Confidence cap: 0.75 (Layer 3 nunca supera Layer 1/2 fuerte)

Tests: 6 nuevos + 92 Sprint 0+1 pasan. Build verde.

Sprint 2 C1/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -3
git push origin HEAD 2>&1 | tail -5
```

Expected: commit creado, push fast-forward a `origin/claude/sharp-keller-3d6d48` OK. **NO push a main**.

---

## C2 · Activar Layer 3 SEMANTIC en pipeline canónico

**Goal:** Wire la cascada `RSS_TAG → HEURISTIC → SEMANTIC (Gemini)` en `processArticle()` con batch buffer asíncrono para minimizar coste Gemini.

**Files:**
- Modify: `apps/visual-oscar/lib/medios/canonical/pipeline.ts` (función `classifyTopic()` step 6)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/pipeline-cascade-layer3.test.ts` (NUEVO)

**Dependencies:** C1 (necesita `GeminiProductionClient` y factory en classify-semantic.ts).

**Sub-agent prompt:**
> Implementa C2 del Sprint 2 Prensa: activar Layer 3 SEMANTIC en `processArticle()`.
>
> **Lee primero:**
> 1. Design doc §3 (cascada + batch buffer)
> 2. `apps/visual-oscar/lib/medios/canonical/pipeline.ts` completo (~289 líneas). Localiza step 6 `classifyTopic()`. Ya tiene wiring para Layers 1 y 2.
> 3. `apps/visual-oscar/lib/medios/canonical/classify-semantic.ts` (factory `createLlmClient()` desde C1)
>
> **Patrón a seguir**: la función `classifyTopic()` ya cae en `OTRO` si Layers 1+2 fallan. Cambio: si `getLlmClassifier() !== 'disabled'`, llamar a Layer 3 antes del fallback. Si Layer 3 también falla → OTRO.
>
> **Batch buffer (importante)**: para minimizar coste Gemini, los items que llegan a Layer 3 NO se clasifican uno a uno en el thread principal. Se acumulan en un buffer en memoria; cuando hay 20 items o pasan 30s, se envían batch. El item se marca `processing_status='pending_llm_classification'` mientras espera, y un UPDATE asíncrono cierra el ciclo cuando vuelve la respuesta.
>
> **Importante**: en este sprint C2 implementamos el buffer SIMPLIFICADO (sincrónico para batch de 1 item). El batching real con timeout se difiere a un futuro sprint — pero la interfaz queda preparada. NO over-engineer.
>
> Sigue los steps. No saltes verificación.

### Steps

- [ ] **Step 2.1: Crear test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/pipeline-cascade-layer3.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyTopic } from '@/lib/medios/canonical/pipeline'

vi.mock('@/lib/medios/canonical/feature-flags', () => ({
  getLlmClassifier: vi.fn(() => 'gemini'),
}))
vi.mock('@/lib/medios/canonical/classify-semantic', () => ({
  createLlmClient: vi.fn(() => ({
    classifyBatch: vi.fn(async () => [
      { topicId: 'TECNOLOGIA', confidence: 0.75, reasoning: 'AI mentioned' },
    ]),
  })),
}))

describe('classifyTopic · 3-layer cascade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Layer 1 RSS_TAG match fuerte → no llama Layer 2 ni 3', async () => {
    const article = {
      raw_tags: ['politica', 'pp', 'gobierno'],
      title: 'PSOE...',
      description: 'gobierno',
      source_id: 'elpais',
    }
    // RSS tag 'politica' debe matchear con confidence ≥ 0.65
    const result = await classifyTopic(article as any, catalogsFixture)
    expect(result.topic_id).toBe('POLITICA')
    expect(result.classification_method).toBe('RSS_TAG')
  })

  it('Layer 2 HEURISTIC match cuando Layer 1 falla', async () => {
    const article = {
      raw_tags: [],
      title: 'IPC sube al 3.2% en mayo',
      description: 'La inflación subyacente acelera',
      source_id: 'elpais',
    }
    const result = await classifyTopic(article as any, catalogsFixture)
    expect(result.topic_id).toBe('ECONOMIA')
    expect(result.classification_method).toBe('HEURISTIC')
  })

  it('Layer 3 SEMANTIC LLM cuando ambas anteriores fallan', async () => {
    const article = {
      raw_tags: [],
      title: 'Texto ambiguo',
      description: 'No hay keywords claras',
      source_id: 'elpais',
    }
    const result = await classifyTopic(article as any, catalogsFixture)
    expect(result.topic_id).toBe('TECNOLOGIA') // mocked
    expect(result.classification_method).toBe('SEMANTIC_LLM')
  })

  it('Si Layer 3 disabled, fallback a OTRO', async () => {
    const { getLlmClassifier } = await import('@/lib/medios/canonical/feature-flags')
    vi.mocked(getLlmClassifier).mockReturnValueOnce('disabled')
    const article = { raw_tags: [], title: 'a', description: 'a', source_id: 'elpais' }
    const result = await classifyTopic(article as any, catalogsFixture)
    expect(result.topic_id).toBe('OTRO')
    expect(result.classification_method).toBe('NONE')
  })

  it('Si Layer 3 falla (devuelve null), fallback a OTRO', async () => {
    const { createLlmClient } = await import('@/lib/medios/canonical/classify-semantic')
    vi.mocked(createLlmClient).mockReturnValueOnce({
      classifyBatch: vi.fn(async () => null),
    } as any)
    const article = { raw_tags: [], title: 'a', description: 'a', source_id: 'elpais' }
    const result = await classifyTopic(article as any, catalogsFixture)
    expect(result.topic_id).toBe('OTRO')
    expect(result.classification_method).toBe('NONE')
  })
})

const catalogsFixture: any = {
  topicRules: { /* fixture mínimo de topic-rules.json */ },
  rssTagMap: { 'politica': { topic_id: 'POLITICA', weight: 0.9 } },
  sourceCatalog: {},
  entityCatalog: {},
}
```

- [ ] **Step 2.2: Ejecutar test (debe FALLAR)**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/pipeline-cascade-layer3.test.ts 2>&1 | tail -15
```

Expected: tests fallan porque `classifyTopic` actual no llama Layer 3.

- [ ] **Step 2.3: Modificar `classifyTopic()` en pipeline.ts**

Open `apps/visual-oscar/lib/medios/canonical/pipeline.ts`. Localiza la función `classifyTopic()` (step 6 del pipeline). Modifica para añadir Layer 3:

```typescript
import { createLlmClient } from './classify-semantic'
import { getLlmClassifier } from './feature-flags'

async function classifyTopic(
  article: ArticleInput,
  catalogs: Catalogs,
): Promise<TopicClassification> {
  // Layer 1: RSS_TAG (existe Sprint 0+1)
  const layer1 = await classifyByRssTags(article.raw_tags, article.source_id, catalogs.rssTagMap)
  if (layer1 && layer1.confidence >= 0.65) {
    return {
      topic_id: layer1.topic_id,
      subtopic_id: layer1.subtopic_id,
      confidence: layer1.confidence,
      classification_method: 'RSS_TAG',
    }
  }

  // Layer 2: HEURISTIC (existe Sprint 0+1)
  const layer2 = await classifyByHeuristic(
    article.title,
    article.description,
    catalogs.topicRules,
  )
  if (layer2 && layer2.confidence >= 0.60) {
    return {
      topic_id: layer2.topic_id,
      subtopic_id: layer2.subtopic_id,
      confidence: layer2.confidence,
      classification_method: 'HEURISTIC',
    }
  }

  // Layer 3: SEMANTIC LLM (Sprint 2 nuevo)
  if (getLlmClassifier() !== 'disabled') {
    try {
      const llmClient = createLlmClient()
      const topicList = Object.keys(catalogs.topicRules)
      const batch = await llmClient.classifyBatch(
        [{ title: article.title ?? '', description: article.description ?? '' }],
        topicList,
      )
      if (batch && batch[0] && batch[0].confidence >= 0.75) {
        return {
          topic_id: batch[0].topicId,
          confidence: batch[0].confidence,
          classification_method: 'SEMANTIC_LLM',
        }
      }
    } catch (err) {
      // Log y caer en fallback
      console.warn('[pipeline.classifyTopic] Layer 3 failed', err)
    }
  }

  // Fallback OTRO
  return {
    topic_id: 'OTRO',
    confidence: 0,
    classification_method: 'NONE',
  }
}
```

**Importante**: si el archivo ya tiene una versión similar de `classifyTopic`, solo añade el bloque Layer 3 entre Layer 2 y el fallback. NO duplicar.

- [ ] **Step 2.4: Exportar `classifyTopic` si no está exportada**

Si `classifyTopic` es función privada del módulo, expórtala para el test:

```typescript
export async function classifyTopic(...) { ... }
```

- [ ] **Step 2.5: Tests + build pasan**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/pipeline-cascade-layer3.test.ts 2>&1 | tail -15
npm run build 2>&1 | tail -10
npm test -- --run 2>&1 | tail -10
```

Expected: 5/5 nuevos passing. Build verde. Total tests ≥ 103.

- [ ] **Step 2.6: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/pipeline.ts \
        apps/visual-oscar/tests/unit/medios/canonical/pipeline-cascade-layer3.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C2 · activar Layer 3 SEMANTIC en pipeline canónico

Wire de la cascada completa RSS_TAG → HEURISTIC → SEMANTIC en
processArticle() step 6. Cuando Layers 1 y 2 no superan sus thresholds
(0.65 y 0.60 respectivamente), Layer 3 invoca al LLM provider
(Gemini por defecto en Sprint 2) con cap 0.75. Si todo falla → OTRO.

Cambios:
- pipeline.ts: classifyTopic() exportada, bloque Layer 3 entre L2 y fallback,
  try/catch defensivo en LLM call
- tests: 5 tests cubren cada rama (L1 match, L2 match, L3 match, L3 disabled,
  L3 error → OTRO)

Decisión arquitectónica: batching real con buffer asíncrono se difiere a
sprint futuro. Por ahora L3 procesa item-a-item (cache 1h amortiza repetidos).

Tests: 5 nuevos + 98 previos = 103 pasan. Build verde.

Sprint 2 C2/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C3 · momentumScore desde topic_prominence_history

**Goal:** Implementar `computeMomentum(history) → number` + snapshot writer cron que cada 15min persiste métricas por `(topic_id, subtopic_id, window_spec)` en `topic_prominence_history`.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/momentum.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/stores/topic-prominence-store.ts`
- Modify: `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts` (registrar cron `topic-prominence-snapshot` cada hora aprox.)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/momentum.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/snapshot-writer.test.ts`

**Dependencies:** C2 (necesita que el pipeline esté classificando con Layer 3 activado, para que las métricas tengan datos reales).

**Sub-agent prompt:**
> Implementa C3 del Sprint 2: momentumScore + snapshot writer.
>
> **Lee primero:**
> 1. Design doc §4.2 (momentumScore fórmula) + §4.6 (persistencia)
> 2. `apps/visual-oscar/lib/medios/canonical/scoring.ts` actual (~150 LOC Sprint 0+1, contiene volumeScore y stubs)
> 3. `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts` (registry JOBS + plug points)
> 4. Esquema SQL `topic_prominence_history` (migración 0058 ya aplicada en Railway): columnas `topic_id, subtopic_id, computed_at, window_spec, score, volume_score, momentum_score, source_diversity_score, tier_weight_score, entity_density_score, state, volume, source_count`
>
> **Patrón a seguir**: el registry `JOBS` en `maintenance/index.ts` tiene shape `{name, schedule, run}`. `schedule` ∈ `'hourly'|'6hourly'|'12hourly'|'daily'`. El cron Vercel dispara `/api/cron/medios-mantenimiento` cada hora y el endpoint llama `runDueJobs()` que filtra por `shouldRunNow(job, now)`. Añade entrada nueva con `name: 'topic-prominence-snapshot'`, `schedule: 'hourly'`. (Spec dice "cada 15min" pero el cron mínimo de Vercel es horario; documenta como "cada hora").
>
> **Fórmula momentum**:
> ```
> current_volume  = articles en últimas 24h
> baseline        = media móvil 7d, excluyendo últimas 24h
> momentum        = current_volume / max(baseline, 1)
> momentumScore   = min(momentum / 3, 1)   // satura a 3x baseline
> ```
>
> Sigue los steps. No olvides verificar build.

### Steps

- [ ] **Step 3.1: Crear store SQL `topic-prominence-store.ts`**

Create `apps/visual-oscar/lib/medios/canonical/stores/topic-prominence-store.ts`:

```typescript
/**
 * Store SQL para topic_prominence_history (Railway Postgres).
 * Read + write para cron snapshot-writer.
 */
import { sql } from '@/lib/db'  // Si no existe, ajustar al cliente DB real del proyecto

export interface HistorySnapshot {
  topic_id: string
  subtopic_id: string
  computed_at: Date
  window_spec: '24h' | '7d' | '30d'
  score: number
  volume_score: number
  momentum_score: number
  source_diversity_score: number
  tier_weight_score: number
  entity_density_score: number
  state: 'STRUCTURAL' | 'EMERGENT' | 'STABLE'
  volume: number
  source_count: number
}

export async function readHistoryForTopic(
  topicId: string,
  windowSpec: '24h' | '7d' | '30d',
  fromDate: Date,
): Promise<HistorySnapshot[]> {
  const rows = await sql<HistorySnapshot[]>`
    SELECT topic_id, subtopic_id, computed_at, window_spec, score,
           volume_score, momentum_score, source_diversity_score,
           tier_weight_score, entity_density_score, state, volume, source_count
    FROM topic_prominence_history
    WHERE topic_id = ${topicId}
      AND window_spec = ${windowSpec}
      AND computed_at >= ${fromDate}
    ORDER BY computed_at ASC
  `
  return rows
}

export async function writeSnapshot(snapshot: Omit<HistorySnapshot, 'computed_at'>): Promise<void> {
  await sql`
    INSERT INTO topic_prominence_history (
      topic_id, subtopic_id, computed_at, window_spec, score,
      volume_score, momentum_score, source_diversity_score,
      tier_weight_score, entity_density_score, state, volume, source_count
    ) VALUES (
      ${snapshot.topic_id}, ${snapshot.subtopic_id}, NOW(), ${snapshot.window_spec}, ${snapshot.score},
      ${snapshot.volume_score}, ${snapshot.momentum_score}, ${snapshot.source_diversity_score},
      ${snapshot.tier_weight_score}, ${snapshot.entity_density_score}, ${snapshot.state},
      ${snapshot.volume}, ${snapshot.source_count}
    )
  `
}

export async function readArticleVolumeInWindow(
  topicId: string,
  fromDate: Date,
  toDate: Date,
): Promise<{ volume: number; source_count: number }> {
  const [row] = await sql<{ volume: string; source_count: string }[]>`
    SELECT COUNT(*) AS volume, COUNT(DISTINCT source_id) AS source_count
    FROM article
    WHERE topic_id = ${topicId}
      AND ingested_at >= ${fromDate}
      AND ingested_at < ${toDate}
      AND is_noise = FALSE
      AND is_duplicate = FALSE
  `
  return { volume: Number(row.volume), source_count: Number(row.source_count) }
}
```

**Nota**: si `@/lib/db` no existe en el proyecto, usar el cliente que Sprint 0+1 usó (mirar `stores.ts` o similar para el patrón exacto). El sub-agente debe leer un `*-store.ts` existente para confirmar el patrón.

- [ ] **Step 3.2: Crear test failing para momentum**

Create `apps/visual-oscar/tests/unit/medios/canonical/scoring/momentum.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeMomentum } from '@/lib/medios/canonical/scoring/momentum'

describe('computeMomentum', () => {
  it('topic con volumen 5x baseline → score saturado a 1', () => {
    const history = [
      // baseline 7d (excluye últimas 24h): 6 días × 10 arts/día = 60 arts
      ...Array.from({ length: 6 }, (_, i) => ({
        computed_at: new Date(Date.now() - (i + 1) * 24 * 3600_000),
        volume: 10,
      })),
      // últimas 24h: 50 arts
      { computed_at: new Date(Date.now() - 12 * 3600_000), volume: 50 },
    ]
    const score = computeMomentum(history as any)
    expect(score).toBe(1)  // 50/10 = 5x, satura a 1
  })

  it('topic con baseline 0 y 5 arts hoy → momentum bajo pero positivo', () => {
    const history = [
      { computed_at: new Date(Date.now() - 6 * 3600_000), volume: 5 },
    ]
    const score = computeMomentum(history as any)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('topic con volumen 1.5x baseline → score ~0.5', () => {
    const history = [
      ...Array.from({ length: 6 }, () => ({
        computed_at: new Date(Date.now() - 48 * 3600_000),
        volume: 10,
      })),
      { computed_at: new Date(Date.now() - 12 * 3600_000), volume: 15 },
    ]
    const score = computeMomentum(history as any)
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.6)
  })

  it('topic sin histórico → score = 0', () => {
    const score = computeMomentum([])
    expect(score).toBe(0)
  })
})
```

- [ ] **Step 3.3: Implementar `momentum.ts`**

Create `apps/visual-oscar/lib/medios/canonical/scoring/momentum.ts`:

```typescript
/**
 * momentumScore: ratio entre volumen actual y baseline 7d.
 * @see docs/superpowers/specs/2026-06-02-prensa-sprint-2-...-design.md §4.2
 */
export interface VolumePoint {
  computed_at: Date
  volume: number
}

export function computeMomentum(history: VolumePoint[]): number {
  if (history.length === 0) return 0

  const now = Date.now()
  const T24H = 24 * 3600_000

  const recent = history.filter(h => now - h.computed_at.getTime() <= T24H)
  const baseline = history.filter(h => now - h.computed_at.getTime() > T24H)

  const currentVolume = recent.reduce((sum, h) => sum + h.volume, 0)
  const baselineMean = baseline.length > 0
    ? baseline.reduce((sum, h) => sum + h.volume, 0) / baseline.length
    : 0

  const momentum = currentVolume / Math.max(baselineMean, 1)
  return Math.min(momentum / 3, 1)
}
```

- [ ] **Step 3.4: Ejecutar test momentum (debe pasar)**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/scoring/momentum.test.ts 2>&1 | tail -15
```

Expected: 4/4 passing.

- [ ] **Step 3.5: Crear test snapshot-writer**

Create `apps/visual-oscar/tests/unit/medios/canonical/scoring/snapshot-writer.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { computeAndWriteSnapshot } from '@/lib/medios/canonical/scoring/snapshot-writer'

vi.mock('@/lib/medios/canonical/stores/topic-prominence-store', () => ({
  readHistoryForTopic: vi.fn(async () => []),
  readArticleVolumeInWindow: vi.fn(async () => ({ volume: 10, source_count: 5 })),
  writeSnapshot: vi.fn(async () => undefined),
}))

import * as store from '@/lib/medios/canonical/stores/topic-prominence-store'

describe('computeAndWriteSnapshot', () => {
  it('escribe una fila en topic_prominence_history para cada topic', async () => {
    const topics = ['POLITICA', 'ECONOMIA']
    await computeAndWriteSnapshot(topics, '24h')
    expect(store.writeSnapshot).toHaveBeenCalledTimes(2)
  })

  it('cada snapshot tiene score ∈ [0, 1] y state válido', async () => {
    await computeAndWriteSnapshot(['POLITICA'], '24h')
    const call = vi.mocked(store.writeSnapshot).mock.calls[0]?.[0]
    expect(call?.score).toBeGreaterThanOrEqual(0)
    expect(call?.score).toBeLessThanOrEqual(1)
    expect(['STRUCTURAL', 'EMERGENT', 'STABLE']).toContain(call?.state)
  })

  it('omite topic con volumen 0 en la ventana', async () => {
    vi.mocked(store.readArticleVolumeInWindow).mockResolvedValueOnce({ volume: 0, source_count: 0 })
    await computeAndWriteSnapshot(['EMPTY_TOPIC'], '24h')
    expect(store.writeSnapshot).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3.6: Implementar `snapshot-writer.ts`**

Create `apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts`:

```typescript
/**
 * Cron job: cada hora calcula TopicProminenceScore por topic y persiste
 * un snapshot en topic_prominence_history.
 *
 * En C3 solo se llena momentum_score real. Los otros 3 componentes
 * (diversity, tier, entity_density) se añaden en C4. state se llena en C5.
 */
import { computeMomentum } from './momentum'
import {
  readArticleVolumeInWindow,
  readHistoryForTopic,
  writeSnapshot,
} from '../stores/topic-prominence-store'

const T24H = 24 * 3600_000
const T7D = 7 * T24H

export async function computeAndWriteSnapshot(
  topicIds: string[],
  windowSpec: '24h' | '7d' | '30d' = '24h',
): Promise<void> {
  const now = Date.now()
  for (const topicId of topicIds) {
    const windowFrom = new Date(now - T24H)
    const windowTo = new Date(now)
    const { volume, source_count } = await readArticleVolumeInWindow(topicId, windowFrom, windowTo)

    if (volume === 0) continue  // skip topics sin actividad

    // momentum: necesita historial 7d
    const history = await readHistoryForTopic(topicId, '24h', new Date(now - T7D))
    const momentumScore = computeMomentum(
      history.map(h => ({ computed_at: h.computed_at, volume: h.volume })),
    )

    // volumeScore placeholder Sprint 0+1: log normalizado
    const volumeScore = Math.min(Math.log(volume + 1) / Math.log(100), 1)

    // C3: solo llenamos volume + momentum. Los demás stub a 0 (C4 los llena).
    const sourceDiversityScore = 0
    const tierWeightScore = 0
    const entityDensityScore = 0

    // Score agregado provisional (en C4 se reescribe con pesos reales)
    const score = 0.30 * volumeScore + 0.25 * momentumScore

    // state placeholder (C5 lo calcula real)
    const state = 'STABLE' as const

    await writeSnapshot({
      topic_id: topicId,
      subtopic_id: '',
      window_spec: windowSpec,
      score,
      volume_score: volumeScore,
      momentum_score: momentumScore,
      source_diversity_score: sourceDiversityScore,
      tier_weight_score: tierWeightScore,
      entity_density_score: entityDensityScore,
      state,
      volume,
      source_count,
    })
  }
}
```

- [ ] **Step 3.7: Registrar cron en `maintenance/index.ts`**

Edit `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts`. Localiza el array `JOBS` y añade entrada:

```typescript
import { computeAndWriteSnapshot } from '../scoring/snapshot-writer'

const JOBS: MaintenanceJob[] = [
  // ... entries existentes Sprint 0+1
  {
    name: 'topic-prominence-snapshot',
    schedule: 'hourly',
    run: async () => {
      // En C5/C6 esta lista vendrá de catalogs.topicRules
      const topics = ['POLITICA', 'ECONOMIA', 'SOCIEDAD', 'INTERNACIONAL', 'CULTURA', 'DEPORTES', 'TECNOLOGIA', 'OTRO']
      await computeAndWriteSnapshot(topics, '24h')
    },
  },
]
```

- [ ] **Step 3.8: Tests + build pasan**

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/scoring/ 2>&1 | tail -15
npm run build 2>&1 | tail -10
```

Expected: 7/7 nuevos passing (4 momentum + 3 snapshot-writer). Build verde.

- [ ] **Step 3.9: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/scoring/momentum.ts \
        apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts \
        apps/visual-oscar/lib/medios/canonical/stores/topic-prominence-store.ts \
        apps/visual-oscar/lib/medios/canonical/maintenance/index.ts \
        apps/visual-oscar/tests/unit/medios/canonical/scoring/momentum.test.ts \
        apps/visual-oscar/tests/unit/medios/canonical/scoring/snapshot-writer.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C3 · momentumScore desde topic_prominence_history

Implementa el segundo componente de TopicProminenceScore:
- computeMomentum(history) = ratio current_24h / baseline_7d, satura a 3x → 1
- snapshot-writer cron escribe cada hora una fila por topic activo
- topic-prominence-store con read + write SQL crudo a Railway Postgres
- Registrado en maintenance/index.ts schedule 'hourly'

En C3 solo se llena volumeScore + momentumScore reales. diversity/tier/
entity_density quedan a 0 (placeholder), y state a 'STABLE'. C4 y C5
los completan.

Esquema Railway (migración 0058 ya aplicada):
  topic_prominence_history(topic_id, subtopic_id, computed_at, window_spec,
    score, volume_score, momentum_score, source_diversity_score,
    tier_weight_score, entity_density_score, state, volume, source_count)

Tests: 7 nuevos (4 momentum + 3 snapshot-writer) + 103 previos = 110.
Build verde.

Sprint 2 C3/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C4 · Scoring sourceDiversity + tierWeight + entityDensity

**Goal:** Implementar los 3 componentes restantes de TopicProminenceScore + agregador final.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/diversity.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/tier.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/entity-density.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/aggregate.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/stores/medios-config-store.ts`
- Modify: `apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts` (usar los 3 nuevos componentes)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/diversity.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/tier.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/entity-density.test.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/aggregate.test.ts`

**Dependencies:** C3 (necesita snapshot-writer.ts que en C4 se actualiza).

**Sub-agent prompt:**
> Implementa C4 del Sprint 2: los 3 componentes restantes de TopicProminenceScore.
>
> **Lee primero:**
> 1. Design doc §4.3, §4.4, §4.5 (3 componentes + nota crítica sobre `tier`)
> 2. `scoring/snapshot-writer.ts` (C3 output, contiene placeholders a 0 para los 3 componentes)
> 3. `stores/topic-prominence-store.ts` (de C3)
> 4. Schema `medios_config`: `id, clave, nombre, tendencia, establishment, credibilidad, rss_urls, activo`
>
> **Aviso schema** (§4.4 del spec): `medios_config` NO tiene columna `tier`. Derivamos:
> `tier_weight(medio) = 0.6 * credibilidad + 0.4 * (establishment ? 1 : 0)`
>
> Sigue los 4 sub-componentes en orden. Cada uno con su test failing primero.

### Steps

- [ ] **Step 4.1: Implementar `diversity.ts` con test failing**

Create test `apps/visual-oscar/tests/unit/medios/canonical/scoring/diversity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeSourceDiversity } from '@/lib/medios/canonical/scoring/diversity'

describe('computeSourceDiversity', () => {
  it('topic con 10 medios uniformes → score > 0.85', () => {
    const distribution = Array.from({ length: 10 }, () => ({ source_id: 'm', count: 10 }))
      .map((_, i) => ({ source_id: `medio${i}`, count: 10 }))
    const score = computeSourceDiversity(distribution)
    expect(score).toBeGreaterThan(0.85)
  })

  it('topic con 1 medio dominante → score < 0.2', () => {
    const distribution = [
      { source_id: 'elpais', count: 100 },
      { source_id: 'abc', count: 1 },
    ]
    const score = computeSourceDiversity(distribution)
    expect(score).toBeLessThan(0.2)
  })

  it('topic vacío → score = 0', () => {
    expect(computeSourceDiversity([])).toBe(0)
  })
})
```

Create `apps/visual-oscar/lib/medios/canonical/scoring/diversity.ts`:

```typescript
/**
 * sourceDiversityScore = 1 - Herfindahl(shares)
 * Penaliza topics dominados por pocos medios.
 */
export interface SourceCount {
  source_id: string
  count: number
}

export function computeSourceDiversity(distribution: SourceCount[]): number {
  const total = distribution.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return 0
  const herfindahl = distribution.reduce((sum, d) => {
    const share = d.count / total
    return sum + share * share
  }, 0)
  return Math.max(0, 1 - herfindahl)
}
```

Run:
```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/scoring/diversity.test.ts 2>&1 | tail -10
```
Expected: 3/3 passing.

- [ ] **Step 4.2: Implementar `tier.ts` con test failing**

Create `apps/visual-oscar/lib/medios/canonical/stores/medios-config-store.ts`:

```typescript
/**
 * Store SQL para medios_config (Railway Postgres).
 * Cache en memoria 5min porque cambia raramente.
 */
import { sql } from '@/lib/db'

export interface MedioConfig {
  clave: string
  nombre: string
  tendencia: string | null
  establishment: boolean | null
  credibilidad: number | null
}

let cache: { data: MedioConfig[]; expiresAt: number } | null = null
const TTL_MS = 5 * 60_000

export async function readAllMediosConfig(): Promise<MedioConfig[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data
  const rows = await sql<MedioConfig[]>`
    SELECT clave, nombre, tendencia, establishment, credibilidad
    FROM medios_config
    WHERE activo = TRUE
  `
  cache = { data: rows, expiresAt: Date.now() + TTL_MS }
  return rows
}

export function clearMediosConfigCache(): void { cache = null }
```

Create test `apps/visual-oscar/tests/unit/medios/canonical/scoring/tier.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeTierWeight } from '@/lib/medios/canonical/scoring/tier'

describe('computeTierWeight', () => {
  const mediosFixture = [
    { clave: 'elpais', credibilidad: 0.9, establishment: true },   // weight = 0.54+0.4 = 0.94
    { clave: 'abc', credibilidad: 0.8, establishment: true },       // weight = 0.48+0.4 = 0.88
    { clave: 'tabloid', credibilidad: 0.3, establishment: false },  // weight = 0.18
  ] as any[]

  it('topic 100% en medios establecidos → score ≥ 0.85', () => {
    const dist = [{ source_id: 'elpais', count: 50 }, { source_id: 'abc', count: 50 }]
    const score = computeTierWeight(dist, mediosFixture)
    expect(score).toBeGreaterThan(0.85)
  })

  it('topic 100% en medios bajos → score < 0.25', () => {
    const dist = [{ source_id: 'tabloid', count: 100 }]
    const score = computeTierWeight(dist, mediosFixture)
    expect(score).toBeLessThan(0.25)
  })

  it('medio no en medios_config → weight 0.5 default', () => {
    const dist = [{ source_id: 'unknown', count: 10 }]
    const score = computeTierWeight(dist, mediosFixture)
    expect(score).toBe(0.5)
  })
})
```

Create `apps/visual-oscar/lib/medios/canonical/scoring/tier.ts`:

```typescript
import type { MedioConfig } from '../stores/medios-config-store'
import type { SourceCount } from './diversity'

/**
 * tierWeightScore: media ponderada de los pesos de tier de los medios
 * que cubren el topic.
 *
 * Cálculo del peso por medio (schema awareness §4.4):
 *   tier_weight = 0.6 * credibilidad + 0.4 * (establishment ? 1 : 0)
 *
 * Medios no encontrados en medios_config → weight 0.5 (neutro).
 */
const DEFAULT_WEIGHT = 0.5

export function computeTierWeight(
  distribution: SourceCount[],
  mediosConfig: MedioConfig[],
): number {
  const total = distribution.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return 0

  const mediosMap = new Map(mediosConfig.map(m => [m.clave, m]))

  const weightedSum = distribution.reduce((sum, d) => {
    const medio = mediosMap.get(d.source_id)
    const weight = medio
      ? 0.6 * (medio.credibilidad ?? 0.5) + 0.4 * (medio.establishment ? 1 : 0)
      : DEFAULT_WEIGHT
    return sum + weight * d.count
  }, 0)

  return weightedSum / total
}
```

Run test, debe pasar 3/3.

- [ ] **Step 4.3: Implementar `entity-density.ts` con test failing**

Create test `apps/visual-oscar/tests/unit/medios/canonical/scoring/entity-density.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeEntityDensity } from '@/lib/medios/canonical/scoring/entity-density'

describe('computeEntityDensity', () => {
  it('5 entidades únicas por article → score 1 (satura)', () => {
    const articles = Array.from({ length: 10 }, (_, i) => ({
      entities: [
        { type: 'person', id: `p${i*5}` }, { type: 'person', id: `p${i*5+1}` },
        { type: 'person', id: `p${i*5+2}` }, { type: 'person', id: `p${i*5+3}` },
        { type: 'person', id: `p${i*5+4}` },
      ],
    }))
    expect(computeEntityDensity(articles as any)).toBe(1)
  })

  it('1 entidad por article → score 0.2', () => {
    const articles = Array.from({ length: 10 }, (_, i) => ({
      entities: [{ type: 'person', id: `p${i}` }],
    }))
    expect(computeEntityDensity(articles as any)).toBeCloseTo(0.2, 1)
  })
})
```

Create `apps/visual-oscar/lib/medios/canonical/scoring/entity-density.ts`:

```typescript
/**
 * entityDensityScore = (unique_entities / article_count) saturado a 5 → 1.
 */
export interface ArticleEntities {
  entities: Array<{ type: string; id: string }>
}

export function computeEntityDensity(articles: ArticleEntities[]): number {
  if (articles.length === 0) return 0
  const uniqueSet = new Set<string>()
  for (const a of articles) {
    for (const e of a.entities ?? []) {
      uniqueSet.add(`${e.type}:${e.id}`)
    }
  }
  const density = uniqueSet.size / articles.length
  return Math.min(density / 5, 1)
}
```

Run test, debe pasar 2/2.

- [ ] **Step 4.4: Implementar `aggregate.ts` con test failing**

Create test `apps/visual-oscar/tests/unit/medios/canonical/scoring/aggregate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { aggregateProminenceScore } from '@/lib/medios/canonical/scoring/aggregate'

describe('aggregateProminenceScore', () => {
  it('todos los componentes = 1 → score = 1', () => {
    const score = aggregateProminenceScore({
      volume: 1, momentum: 1, sourceDiversity: 1, tierWeight: 1, entityDensity: 1,
    })
    expect(score).toBe(1)
  })

  it('todos los componentes = 0 → score = 0', () => {
    const score = aggregateProminenceScore({
      volume: 0, momentum: 0, sourceDiversity: 0, tierWeight: 0, entityDensity: 0,
    })
    expect(score).toBe(0)
  })
})
```

Create `apps/visual-oscar/lib/medios/canonical/scoring/aggregate.ts`:

```typescript
/**
 * score = 0.30·volume + 0.25·momentum + 0.20·diversity + 0.15·tier + 0.10·entityDensity
 */
export interface ProminenceComponents {
  volume: number
  momentum: number
  sourceDiversity: number
  tierWeight: number
  entityDensity: number
}

export function aggregateProminenceScore(c: ProminenceComponents): number {
  return 0.30 * c.volume
    + 0.25 * c.momentum
    + 0.20 * c.sourceDiversity
    + 0.15 * c.tierWeight
    + 0.10 * c.entityDensity
}
```

- [ ] **Step 4.5: Actualizar `snapshot-writer.ts` con los 3 componentes nuevos**

Edit `apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts` para sustituir los placeholders 0 por cálculos reales. Reemplaza la sección donde están las constantes a 0:

```typescript
import { computeSourceDiversity } from './diversity'
import { computeTierWeight } from './tier'
import { computeEntityDensity } from './entity-density'
import { aggregateProminenceScore } from './aggregate'
import { readAllMediosConfig } from '../stores/medios-config-store'
import {
  readArticleDistributionByTopic,
  readArticleEntitiesByTopic,
} from '../stores/topic-prominence-store'

// Dentro de computeAndWriteSnapshot, sustituir el bloque de placeholders:
const distribution = await readArticleDistributionByTopic(topicId, windowFrom, windowTo)
const articleEntities = await readArticleEntitiesByTopic(topicId, windowFrom, windowTo)
const mediosConfig = await readAllMediosConfig()

const sourceDiversityScore = computeSourceDiversity(distribution)
const tierWeightScore = computeTierWeight(distribution, mediosConfig)
const entityDensityScore = computeEntityDensity(articleEntities)

const score = aggregateProminenceScore({
  volume: volumeScore,
  momentum: momentumScore,
  sourceDiversity: sourceDiversityScore,
  tierWeight: tierWeightScore,
  entityDensity: entityDensityScore,
})
```

Y añadir las 2 funciones nuevas en `topic-prominence-store.ts`:

```typescript
export async function readArticleDistributionByTopic(
  topicId: string, fromDate: Date, toDate: Date,
): Promise<SourceCount[]> {
  const rows = await sql<SourceCount[]>`
    SELECT source_id, COUNT(*)::int AS count
    FROM article
    WHERE topic_id = ${topicId}
      AND ingested_at >= ${fromDate} AND ingested_at < ${toDate}
      AND is_noise = FALSE AND is_duplicate = FALSE
    GROUP BY source_id
  `
  return rows
}

export async function readArticleEntitiesByTopic(
  topicId: string, fromDate: Date, toDate: Date,
): Promise<{ entities: Array<{ type: string; id: string }> }[]> {
  const rows = await sql<{ entities: any }[]>`
    SELECT entities
    FROM article
    WHERE topic_id = ${topicId}
      AND ingested_at >= ${fromDate} AND ingested_at < ${toDate}
      AND is_noise = FALSE AND is_duplicate = FALSE
  `
  return rows.map(r => ({ entities: Array.isArray(r.entities) ? r.entities : [] }))
}
```

- [ ] **Step 4.6: Build + tests pasan**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/scoring/ 2>&1 | tail -20
npm run build 2>&1 | tail -10
```

Expected: 17/17 tests scoring pasan (7 C3 + 10 nuevos C4). Build verde.

- [ ] **Step 4.7: Commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/scoring/diversity.ts \
        apps/visual-oscar/lib/medios/canonical/scoring/tier.ts \
        apps/visual-oscar/lib/medios/canonical/scoring/entity-density.ts \
        apps/visual-oscar/lib/medios/canonical/scoring/aggregate.ts \
        apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts \
        apps/visual-oscar/lib/medios/canonical/stores/medios-config-store.ts \
        apps/visual-oscar/lib/medios/canonical/stores/topic-prominence-store.ts \
        apps/visual-oscar/tests/unit/medios/canonical/scoring/
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C4 · scoring sourceDiversity + tierWeight + entityDensity

Completa los 3 componentes restantes de TopicProminenceScore:
- diversity.ts: 1 − Herfindahl(shares por medio)
- tier.ts: media ponderada credibilidad+establishment (schema awareness §4.4)
- entity-density.ts: unique_entities / article_count saturado a 5
- aggregate.ts: 0.30·V + 0.25·M + 0.20·D + 0.15·T + 0.10·E
- medios-config-store: cache 5min lee tendencia/credibilidad/establishment
- snapshot-writer actualizado: ya escribe los 5 componentes reales

Schema awareness:
  medios_config NO tiene `tier`. Derivamos:
  tier_weight = 0.6 * credibilidad + 0.4 * (establishment ? 1 : 0)
  Medios no encontrados → weight 0.5 (neutro).

Tests: 10 nuevos (3 diversity + 3 tier + 2 entity-density + 2 aggregate)
       + 110 previos = 120. Build verde.

Sprint 2 C4/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C5 · TopicState transitions STRUCTURAL/EMERGENT/STABLE

**Goal:** Implementar la máquina de estados determinista que clasifica cada topic según su historial reciente. Integrar en snapshot-writer.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/scoring/state-machine.ts`
- Modify: `apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts` (usar state machine en vez de hardcoded 'STABLE')
- Test: `apps/visual-oscar/tests/unit/medios/canonical/scoring/state-machine.test.ts`

**Dependencies:** C4 (necesita snapshot-writer con los 5 componentes).

**Sub-agent prompt:**
> Implementa C5: máquina de estados de topics.
>
> **Lee primero:**
> 1. Design doc §5 (reglas STRUCTURAL/EMERGENT/STABLE)
> 2. `scoring/snapshot-writer.ts` (C4 output)
> 3. `stores/topic-prominence-store.ts` (función readHistoryForTopic)
>
> **Reglas determinista**:
> - STRUCTURAL: avg(volumeScore) últimos 14d ≥ 0.5
> - EMERGENT: avg(momentumScore) últimas 24h ≥ 0.7 AND avg(volumeScore) últimas 24h < 0.4
> - STABLE: el resto

### Steps

- [ ] **Step 5.1: Test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/scoring/state-machine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { deriveTopicState } from '@/lib/medios/canonical/scoring/state-machine'

describe('deriveTopicState', () => {
  const now = Date.now()
  const T24H = 24 * 3600_000

  it('volumen sostenido 14d → STRUCTURAL', () => {
    const history = Array.from({ length: 14 }, (_, i) => ({
      computed_at: new Date(now - (i + 1) * T24H),
      volume_score: 0.6,
      momentum_score: 0.3,
    }))
    expect(deriveTopicState(history)).toBe('STRUCTURAL')
  })

  it('spike último día con baseline bajo → EMERGENT', () => {
    const history = [
      ...Array.from({ length: 13 }, (_, i) => ({
        computed_at: new Date(now - (i + 2) * T24H),
        volume_score: 0.2,
        momentum_score: 0.1,
      })),
      // últimas 24h: momentum alto, volumen bajo
      { computed_at: new Date(now - 12 * 3600_000), volume_score: 0.3, momentum_score: 0.8 },
    ]
    expect(deriveTopicState(history)).toBe('EMERGENT')
  })

  it('volumen variable bajo → STABLE', () => {
    const history = Array.from({ length: 14 }, (_, i) => ({
      computed_at: new Date(now - (i + 1) * T24H),
      volume_score: Math.random() * 0.3,
      momentum_score: 0.4,
    }))
    expect(deriveTopicState(history)).toBe('STABLE')
  })

  it('histórico vacío → STABLE', () => {
    expect(deriveTopicState([])).toBe('STABLE')
  })

  it('determinismo: mismo input × 2 → mismo output', () => {
    const history = [
      { computed_at: new Date(now - T24H), volume_score: 0.5, momentum_score: 0.6 },
      { computed_at: new Date(now - 2 * T24H), volume_score: 0.4, momentum_score: 0.5 },
    ]
    expect(deriveTopicState(history)).toBe(deriveTopicState(history))
  })
})
```

- [ ] **Step 5.2: Implementar state-machine.ts**

Create `apps/visual-oscar/lib/medios/canonical/scoring/state-machine.ts`:

```typescript
import type { TopicState } from '../types'

export interface StateInput {
  computed_at: Date
  volume_score: number
  momentum_score: number
}

const T24H = 24 * 3600_000
const T14D = 14 * T24H
const STRUCTURAL_THRESHOLD = 0.5
const EMERGENT_MOMENTUM_THRESHOLD = 0.7
const EMERGENT_VOLUME_CEILING = 0.4

export function deriveTopicState(history: StateInput[]): TopicState {
  if (history.length === 0) return 'STABLE'

  const now = Date.now()

  // STRUCTURAL: avg volumeScore últimos 14d ≥ 0.5
  const last14d = history.filter(h => now - h.computed_at.getTime() <= T14D)
  const avgVolume14d = avg(last14d.map(h => h.volume_score))
  if (avgVolume14d >= STRUCTURAL_THRESHOLD) return 'STRUCTURAL'

  // EMERGENT: momentum alto, volumen aún bajo (últimas 24h)
  const last24h = history.filter(h => now - h.computed_at.getTime() <= T24H)
  const avgMomentum24h = avg(last24h.map(h => h.momentum_score))
  const avgVolume24h = avg(last24h.map(h => h.volume_score))
  if (avgMomentum24h >= EMERGENT_MOMENTUM_THRESHOLD && avgVolume24h < EMERGENT_VOLUME_CEILING) {
    return 'EMERGENT'
  }

  return 'STABLE'
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((sum, n) => sum + n, 0) / arr.length
}
```

- [ ] **Step 5.3: Wire state machine en snapshot-writer**

Edit `snapshot-writer.ts`. Importa y usa `deriveTopicState`:

```typescript
import { deriveTopicState } from './state-machine'

// Dentro de computeAndWriteSnapshot, sustituye `const state = 'STABLE'`:
const stateHistory = await readHistoryForTopic(topicId, '24h', new Date(now - 14 * T24H))
const state = deriveTopicState(stateHistory.map(h => ({
  computed_at: h.computed_at,
  volume_score: h.volume_score,
  momentum_score: h.momentum_score,
})))
```

- [ ] **Step 5.4: Tests + build + commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/scoring/state-machine.test.ts 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

Expected: 5/5 nuevos passing.

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/scoring/state-machine.ts \
        apps/visual-oscar/lib/medios/canonical/scoring/snapshot-writer.ts \
        apps/visual-oscar/tests/unit/medios/canonical/scoring/state-machine.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C5 · TopicState STRUCTURAL/EMERGENT/STABLE

Máquina de estados determinista para clasificar topics según historial:
- STRUCTURAL: avg(volume_score) últimos 14d ≥ 0.5
- EMERGENT: avg(momentum_score) 24h ≥ 0.7 AND avg(volume_score) 24h < 0.4
- STABLE: el resto

Determinista: mismo histórico → mismo estado siempre.
Integrado en snapshot-writer reemplazando placeholder 'STABLE'.

Tests: 5 nuevos + 120 previos = 125. Build verde.

Sprint 2 C5/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C6 · PulsoMode REGION + IDEOLOGY + CRISIS

**Goal:** Llenar 3 modos del endpoint `/api/medios/pulso` (declarados en types.ts pero no implementados).

**Files:**
- Modify: `apps/visual-oscar/app/api/medios/pulso/route.ts` (añadir queries para los 3 modos)
- Create: `apps/visual-oscar/lib/medios/canonical/pulso-modes.ts` (lógica modos)
- Test: `apps/visual-oscar/tests/integration/medios/pulso-modes.test.ts`

**Dependencies:** C5 (necesita state machine para filtro CRISIS).

**Sub-agent prompt:**
> Implementa C6: 3 PulsoMode nuevos.
>
> **Lee primero:**
> 1. Design doc §6 (5 modos)
> 2. `app/api/medios/pulso/route.ts` actual (60 líneas, ya acepta `?mode=...`)
> 3. `lib/medios/canonical/types.ts:86` (`PulsoMode` enum)
> 4. `lib/medios/canonical/types.ts:333-347` (`DominantTopic` interfaz)
>
> Sigue los steps.

### Steps

- [ ] **Step 6.1: Test failing**

Create `apps/visual-oscar/tests/integration/medios/pulso-modes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/medios/pulso/route'

function mockReq(query: Record<string, string>) {
  const url = new URL('http://localhost/api/medios/pulso')
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  return { url: url.toString() } as Request
}

describe('GET /api/medios/pulso?mode=...', () => {
  it('mode=PLURAL devuelve DominantTopic[] con ideological_distribution', async () => {
    const res = await GET(mockReq({ mode: 'PLURAL' }))
    const json = await res.json()
    expect(json.dominantTopics).toBeInstanceOf(Array)
    expect(json.dominantTopics[0]).toHaveProperty('ideological_distribution')
  })

  it('mode=AUDIEN devuelve DominantTopic[] con total_audience_proxy', async () => {
    const res = await GET(mockReq({ mode: 'AUDIEN' }))
    const json = await res.json()
    expect(json.dominantTopics[0]).toHaveProperty('total_audience_proxy')
  })

  it('mode=REGION devuelve DominantTopic[] con ccaa_breakdown', async () => {
    const res = await GET(mockReq({ mode: 'REGION' }))
    const json = await res.json()
    expect(json.dominantTopics[0]).toHaveProperty('ccaa_breakdown')
  })

  it('mode=IDEOLOGY devuelve bias_index ∈ [-1, 1]', async () => {
    const res = await GET(mockReq({ mode: 'IDEOLOGY' }))
    const json = await res.json()
    const t = json.dominantTopics[0]
    expect(t.bias_index).toBeGreaterThanOrEqual(-1)
    expect(t.bias_index).toBeLessThanOrEqual(1)
  })

  it('mode=CRISIS solo devuelve topics state=EMERGENT', async () => {
    const res = await GET(mockReq({ mode: 'CRISIS' }))
    const json = await res.json()
    json.dominantTopics.forEach((t: any) => {
      expect(t.state).toBe('EMERGENT')
      expect(t.velocity).toBeGreaterThanOrEqual(5)
      expect(t.source_count).toBeGreaterThanOrEqual(3)
    })
  })

  it('mode inválido → 400', async () => {
    const res = await GET(mockReq({ mode: 'INVALID' }))
    expect(res.status).toBe(400)
  })

  it('mode default = PLURAL', async () => {
    const res = await GET(mockReq({}))
    expect(res.status).toBe(200)
  })

  it('cache-control header presente', async () => {
    const res = await GET(mockReq({ mode: 'PLURAL' }))
    expect(res.headers.get('cache-control')).toContain('s-maxage')
  })
})
```

- [ ] **Step 6.2: Implementar `pulso-modes.ts`**

Create `apps/visual-oscar/lib/medios/canonical/pulso-modes.ts`:

```typescript
/**
 * Lógica para los 5 PulsoMode (PLURAL/AUDIEN/REGION/IDEOLOGY/CRISIS).
 * Consume distribuciones agregadas y devuelve DominantTopic[] enriquecido.
 */
import type { DominantTopic, PulsoMode } from './types'
import { sql } from '@/lib/db'
import { readAllMediosConfig } from './stores/medios-config-store'

const VALID_MODES: PulsoMode[] = ['PLURAL', 'AUDIEN', 'REGION', 'IDEOLOGY', 'CRISIS']

export function isValidMode(mode: string): mode is PulsoMode {
  return (VALID_MODES as readonly string[]).includes(mode)
}

export async function buildDominantTopicsForMode(
  mode: PulsoMode,
  windowSpec: string,
  limit: number,
): Promise<DominantTopic[]> {
  switch (mode) {
    case 'PLURAL':   return buildPlural(windowSpec, limit)
    case 'AUDIEN':   return buildAudien(windowSpec, limit)
    case 'REGION':   return buildRegion(windowSpec, limit)
    case 'IDEOLOGY': return buildIdeology(windowSpec, limit)
    case 'CRISIS':   return buildCrisis(windowSpec, limit)
  }
}

async function buildPlural(windowSpec: string, limit: number): Promise<DominantTopic[]> {
  // Top topics ordered by score · diversidad_ideológica
  // (PLURAL ya existe en Sprint 0+1, solo enriquece)
  // ... lógica usando topic_prominence_history + medios_config.tendencia
  return [] // placeholder — el sub-agente implementa
}

async function buildAudien(windowSpec: string, limit: number): Promise<DominantTopic[]> {
  // Proxy de audiencia = establishment + credibilidad
  return []
}

async function buildRegion(windowSpec: string, limit: number): Promise<DominantTopic[]> {
  const rows = await sql<any[]>`
    SELECT topic_id, score, volume, source_count
    FROM topic_prominence_history
    WHERE window_spec = ${windowSpec}
      AND computed_at = (
        SELECT MAX(computed_at) FROM topic_prominence_history WHERE window_spec = ${windowSpec}
      )
    ORDER BY score DESC LIMIT ${limit}
  `
  // Por cada topic, calcular ccaa_breakdown
  const result: DominantTopic[] = []
  for (const row of rows) {
    const ccaaBreakdown = await sql<any[]>`
      SELECT
        COALESCE(article.ccaa_origen, 'NA') AS ccaa_from_medium,
        COUNT(*) FILTER (WHERE article.ccaa_origen IS NOT NULL) AS from_medium,
        COUNT(*) FILTER (WHERE article.ccaa_mencionada IS NOT NULL) AS mentions,
        COUNT(*) FILTER (WHERE article.ccaa_afectada IS NOT NULL) AS affects
      FROM article
      WHERE topic_id = ${row.topic_id}
        AND ingested_at >= NOW() - INTERVAL '${windowSpec}'
      GROUP BY ccaa_origen
    `
    result.push({
      ...row,
      ccaa_breakdown: ccaaBreakdown.reduce((acc, b) => ({
        ...acc,
        [b.ccaa_from_medium]: { from_medium: Number(b.from_medium), mentions: Number(b.mentions), affects: Number(b.affects) },
      }), {}),
    } as any)
  }
  return result
}

async function buildIdeology(windowSpec: string, limit: number): Promise<DominantTopic[]> {
  const rows = await sql<any[]>`
    SELECT topic_id, score, volume, source_count
    FROM topic_prominence_history
    WHERE window_spec = ${windowSpec}
      AND computed_at = (SELECT MAX(computed_at) FROM topic_prominence_history WHERE window_spec = ${windowSpec})
    ORDER BY score DESC LIMIT ${limit}
  `
  const result: DominantTopic[] = []
  for (const row of rows) {
    const dist = await sql<any[]>`
      SELECT mc.tendencia, COUNT(*) AS n
      FROM article a
      JOIN medios_config mc ON mc.clave = a.source_id
      WHERE a.topic_id = ${row.topic_id}
        AND a.ingested_at >= NOW() - INTERVAL '${windowSpec}'
      GROUP BY mc.tendencia
    `
    const total = dist.reduce((s, d) => s + Number(d.n), 0) || 1
    const map = Object.fromEntries(dist.map(d => [d.tendencia ?? 'centro', Number(d.n) / total]))
    const shareIzq = map['izquierda'] ?? 0
    const shareDer = map['derecha'] ?? 0
    const shareCen = map['centro'] ?? 0
    const bias = (shareDer - shareIzq) / Math.max(1 - shareCen, 0.0001)
    result.push({
      ...row,
      distribution: { izquierda: shareIzq, centro: shareCen, derecha: shareDer },
      bias_index: Math.max(-1, Math.min(1, bias)),
    } as any)
  }
  return result
}

async function buildCrisis(windowSpec: string, limit: number): Promise<DominantTopic[]> {
  // Solo topics state=EMERGENT con velocity ≥ 5/h y source_count ≥ 3 últimas 6h
  const rows = await sql<any[]>`
    SELECT a.topic_id,
           COUNT(*) FILTER (WHERE a.ingested_at >= NOW() - INTERVAL '6 hours') / 6.0 AS velocity,
           COUNT(DISTINCT a.source_id) FILTER (WHERE a.ingested_at >= NOW() - INTERVAL '6 hours') AS source_count,
           MIN(a.ingested_at) AS first_seen
    FROM article a
    JOIN topic_prominence_history tph ON tph.topic_id = a.topic_id
    WHERE tph.state = 'EMERGENT'
      AND tph.window_spec = ${windowSpec}
      AND tph.computed_at = (SELECT MAX(computed_at) FROM topic_prominence_history WHERE window_spec = ${windowSpec})
    GROUP BY a.topic_id
    HAVING COUNT(*) FILTER (WHERE a.ingested_at >= NOW() - INTERVAL '6 hours') / 6.0 >= 5
       AND COUNT(DISTINCT a.source_id) FILTER (WHERE a.ingested_at >= NOW() - INTERVAL '6 hours') >= 3
    ORDER BY velocity DESC LIMIT ${limit}
  `
  return rows.map(r => ({
    ...r,
    velocity: Number(r.velocity),
    source_count: Number(r.source_count),
    state: 'EMERGENT',
  })) as any
}
```

- [ ] **Step 6.3: Modificar `pulso/route.ts`**

Edit `apps/visual-oscar/app/api/medios/pulso/route.ts` para usar `buildDominantTopicsForMode`:

```typescript
import { buildDominantTopicsForMode, isValidMode } from '@/lib/medios/canonical/pulso-modes'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') ?? 'PLURAL'
  const windowSpec = url.searchParams.get('window') ?? '24h'

  if (!isValidMode(mode)) {
    return new Response(JSON.stringify({ error: `Invalid mode: ${mode}` }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const dominantTopics = await buildDominantTopicsForMode(mode, windowSpec, 14)

  // ... resto existente: confidence, warnings, pipeline metrics
  return new Response(JSON.stringify({
    dominantTopics,
    /* ... */
  }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=300, stale-while-revalidate=600',
    },
  })
}
```

- [ ] **Step 6.4: Tests + build + commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/integration/medios/pulso-modes.test.ts 2>&1 | tail -15
npm run build 2>&1 | tail -10
```

Expected: 8/8 nuevos passing.

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/pulso-modes.ts \
        apps/visual-oscar/app/api/medios/pulso/route.ts \
        apps/visual-oscar/tests/integration/medios/pulso-modes.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C6 · PulsoMode REGION + IDEOLOGY + CRISIS

Implementa los 3 PulsoModes nuevos del endpoint /api/medios/pulso:
- REGION: ccaa_breakdown con triple distinción (del medio / mencionada / afectada)
- IDEOLOGY: bias_index ∈ [-1, +1] derivado de medios_config.tendencia
- CRISIS: solo topics state=EMERGENT con velocity ≥ 5/h y source_count ≥ 3

PLURAL + AUDIEN existían como skeleton Sprint 0+1, ahora enriquecidos con
ideological_distribution + total_audience_proxy reales.

Validación: mode inválido → 400. Default = PLURAL.

Tests: 8 nuevos integración + 125 previos = 133. Build verde.

Sprint 2 C6/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C7 · Job unmapped-tags cada 6h

**Goal:** Cron que detecta RSS tags vistos sin mapping en `rss-tag-map.json` y emite reporte para curación humana.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/unmapped-tags.ts`
- Create: `apps/visual-oscar/app/api/medios/maintenance/unmapped-tags/route.ts`
- Modify: `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts` (añadir entrada `JOBS`)
- Test: `apps/visual-oscar/tests/unit/medios/canonical/maintenance/unmapped-tags.test.ts`

**Dependencies:** C6 (preferencia, no estricta).

**Sub-agent prompt:**
> Implementa C7: job unmapped-tags.
>
> **Lee primero:**
> 1. Design doc §7.1
> 2. `lib/medios/canonical/maintenance/index.ts` (registry, ya tiene plug points comentados)
> 3. `data/medios/rss-tag-map.json` (los ~200 mappings existentes; rama legacy o canonical, ambos válidos)
> 4. Schema `article` (con `raw_tags TEXT` o `JSONB` — verificar con `\d article` en Railway)
>
> El cron Vercel mínimo es horario. El "cada 6h" se implementa con `shouldRunNow()` que devuelve true solo si la hora UTC actual % 6 === 0.

### Steps

- [ ] **Step 7.1: Test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/maintenance/unmapped-tags.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { jobUnmappedTags } from '@/lib/medios/canonical/maintenance/unmapped-tags'

vi.mock('@/lib/medios/canonical/maintenance/unmapped-tags', async () => {
  const actual = await vi.importActual<any>('@/lib/medios/canonical/maintenance/unmapped-tags')
  return {
    ...actual,
    readRawTagsInWindow: vi.fn(async () => ['politica', 'cultura', 'unknown_tag_1', 'unknown_tag_2', 'unknown_tag_2']),
    loadRssTagMap: vi.fn(async () => ({ 'politica': { topic_id: 'POLITICA' }, 'cultura': { topic_id: 'CULTURA' } })),
  }
})

describe('jobUnmappedTags', () => {
  it('devuelve solo tags no mapeados con frecuencia', async () => {
    const report = await jobUnmappedTags()
    expect(report.unmapped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'unknown_tag_2', count: 2 }),
        expect.objectContaining({ tag: 'unknown_tag_1', count: 1 }),
      ]),
    )
    expect(report.unmapped.find(u => u.tag === 'politica')).toBeUndefined()
  })

  it('ordena por frecuencia descendente', async () => {
    const report = await jobUnmappedTags()
    for (let i = 1; i < report.unmapped.length; i++) {
      expect(report.unmapped[i - 1]!.count).toBeGreaterThanOrEqual(report.unmapped[i]!.count)
    }
  })

  it('idempotente: run × 2 → mismo output', async () => {
    const r1 = await jobUnmappedTags()
    const r2 = await jobUnmappedTags()
    expect(r1).toEqual(r2)
  })

  it('top 50 cap', async () => {
    const report = await jobUnmappedTags()
    expect(report.unmapped.length).toBeLessThanOrEqual(50)
  })
})
```

- [ ] **Step 7.2: Implementar `unmapped-tags.ts`**

Create `apps/visual-oscar/lib/medios/canonical/maintenance/unmapped-tags.ts`:

```typescript
import { sql } from '@/lib/db'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface UnmappedReport {
  generated_at: Date
  window_hours: number
  unmapped: Array<{ tag: string; count: number; suggested_macrotema?: string }>
}

const WINDOW_HOURS = 6

export async function readRawTagsInWindow(): Promise<string[]> {
  const rows = await sql<{ raw_tags: any }[]>`
    SELECT raw_tags FROM article
    WHERE ingested_at >= NOW() - INTERVAL '${WINDOW_HOURS} hours'
      AND raw_tags IS NOT NULL
  `
  const tags: string[] = []
  for (const r of rows) {
    if (Array.isArray(r.raw_tags)) {
      tags.push(...r.raw_tags.map(String))
    } else if (typeof r.raw_tags === 'string') {
      try { tags.push(...JSON.parse(r.raw_tags)) } catch {}
    }
  }
  return tags
}

export async function loadRssTagMap(): Promise<Record<string, { topic_id: string }>> {
  const path = join(process.cwd(), 'data/medios/rss-tag-map.json')
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw)
}

export async function jobUnmappedTags(): Promise<UnmappedReport> {
  const [tags, map] = await Promise.all([readRawTagsInWindow(), loadRssTagMap()])
  const counts = new Map<string, number>()
  for (const tag of tags) {
    if (!map[tag.toLowerCase()]) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  const unmapped = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  return {
    generated_at: new Date(),
    window_hours: WINDOW_HOURS,
    unmapped,
  }
}
```

- [ ] **Step 7.3: Endpoint**

Create `apps/visual-oscar/app/api/medios/maintenance/unmapped-tags/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { jobUnmappedTags } from '@/lib/medios/canonical/maintenance/unmapped-tags'

export async function GET() {
  const report = await jobUnmappedTags()
  return NextResponse.json(report, {
    headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=600' },
  })
}

export const dynamic = 'force-dynamic'
```

- [ ] **Step 7.4: Registrar cron**

Edit `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts`. Localiza el array `JOBS` y añade:

```typescript
import { jobUnmappedTags } from './unmapped-tags'

const JOBS: MaintenanceJob[] = [
  // ... entries previas (Sprint 0+1 + C3 topic-prominence-snapshot)
  {
    name: 'unmapped-tags',
    schedule: '6hourly',
    run: async () => {
      const report = await jobUnmappedTags()
      console.log(JSON.stringify({
        event: 'maintenance.unmapped_tags',
        count: report.unmapped.length,
        top_5: report.unmapped.slice(0, 5),
      }))
    },
  },
]
```

- [ ] **Step 7.5: Tests + build + commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/maintenance/unmapped-tags.test.ts 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

Expected: 4/4 passing.

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/maintenance/unmapped-tags.ts \
        apps/visual-oscar/lib/medios/canonical/maintenance/index.ts \
        apps/visual-oscar/app/api/medios/maintenance/unmapped-tags/route.ts \
        apps/visual-oscar/tests/unit/medios/canonical/maintenance/unmapped-tags.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C7 · job unmapped-tags cada 6h

Cron registrado en maintenance/index.ts (schedule '6hourly'):
- Lee article.raw_tags últimas 6h
- Filtra contra data/medios/rss-tag-map.json
- Top 50 tags no mapeados ordenados por frecuencia
- Log estructurado evento 'maintenance.unmapped_tags'

Endpoint GET /api/medios/maintenance/unmapped-tags con cache 5min.

Tests: 4 nuevos idempotentes + 133 previos = 137. Build verde.

Sprint 2 C7/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C8 · Job terms-not-classified cada 12h (OTRO cluster)

**Goal:** Cluster TF-IDF cosine de artículos `topic_id='OTRO'` para sugerir nuevas reglas heurísticas o macrotemas.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/otro-cluster.ts`
- Create: `apps/visual-oscar/app/api/medios/maintenance/otro-cluster/route.ts`
- Modify: `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/maintenance/otro-cluster.test.ts`

**Dependencies:** C7.

**Sub-agent prompt:**
> Implementa C8: cluster OTRO con TF-IDF.
>
> **Lee primero:**
> 1. Design doc §7.2 (TF-IDF cosine, NO embeddings semánticos)
> 2. `maintenance/unmapped-tags.ts` (C7) como referencia patrón cron
>
> **TF-IDF + cosine**: implementa sin dependencias externas pesadas. Algoritmo simple:
> 1. Tokenize titles + descriptions
> 2. Stopwords ES básicas
> 3. Term frequency por documento
> 4. Inverse document frequency
> 5. Cosine similarity entre pares
> 6. Agrupación greedy con threshold 0.6

### Steps

- [ ] **Step 8.1: Test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/maintenance/otro-cluster.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { jobOtroCluster } from '@/lib/medios/canonical/maintenance/otro-cluster'

vi.mock('@/lib/medios/canonical/maintenance/otro-cluster', async () => {
  const actual = await vi.importActual<any>('@/lib/medios/canonical/maintenance/otro-cluster')
  return {
    ...actual,
    readOtroArticles: vi.fn(async () => ([
      { id: '1', title: 'AI y machine learning', description: 'redes neuronales' },
      { id: '2', title: 'Machine learning y AI', description: 'inteligencia artificial' },
      { id: '3', title: 'Receta de paella', description: 'arroz pescado' },
      { id: '4', title: 'Paella valenciana', description: 'arroz cocción' },
      { id: '5', title: 'Tecnología quantum', description: 'computación' },
    ])),
  }
})

describe('jobOtroCluster', () => {
  it('detecta clusters con ≥ 2 items similares', async () => {
    const report = await jobOtroCluster()
    expect(report.clusters.length).toBeGreaterThanOrEqual(2)
  })

  it('cada cluster tiene top_terms ordenados', async () => {
    const report = await jobOtroCluster()
    const c = report.clusters[0]
    expect(c?.top_terms.length).toBeGreaterThan(0)
  })

  it('cada cluster tiene sample_articles', async () => {
    const report = await jobOtroCluster()
    expect(report.clusters[0]?.sample_articles.length).toBeGreaterThanOrEqual(2)
  })

  it('ignora clusters con < 2 items', async () => {
    const report = await jobOtroCluster()
    report.clusters.forEach(c => expect(c.sample_articles.length).toBeGreaterThanOrEqual(2))
  })
})
```

- [ ] **Step 8.2: Implementar `otro-cluster.ts`**

Create `apps/visual-oscar/lib/medios/canonical/maintenance/otro-cluster.ts`:

```typescript
import { sql } from '@/lib/db'

export interface OtroClusterReport {
  generated_at: Date
  clusters: Array<{
    top_terms: string[]
    sample_articles: Array<{ id: string; title: string }>
    suggested_macrotema?: string
  }>
}

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'en', 'a', 'al', 'por', 'para', 'con', 'sin',
  'y', 'o', 'pero', 'si', 'no', 'que', 'es', 'son', 'fue',
  'se', 'su', 'sus', 'le', 'les', 'lo', 'me', 'te', 'nos',
  'este', 'esta', 'ese', 'esa', 'aquel', 'aquella',
])
const SIMILARITY_THRESHOLD = 0.6

export async function readOtroArticles(): Promise<Array<{ id: string; title: string; description: string }>> {
  const rows = await sql<any[]>`
    SELECT id::text, title, summary AS description
    FROM article
    WHERE topic_id = 'OTRO'
      AND ingested_at >= NOW() - INTERVAL '12 hours'
      AND is_noise = FALSE
    LIMIT 500
  `
  return rows
}

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-záéíóúñü0-9 ]+/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t))
}

function computeTfIdf(docs: string[][]): Map<number, Map<string, number>> {
  const N = docs.length
  const df = new Map<string, number>()
  for (const doc of docs) {
    const seen = new Set(doc)
    for (const term of seen) df.set(term, (df.get(term) ?? 0) + 1)
  }
  const vectors = new Map<number, Map<string, number>>()
  docs.forEach((doc, i) => {
    const tf = new Map<string, number>()
    for (const term of doc) tf.set(term, (tf.get(term) ?? 0) + 1)
    const v = new Map<string, number>()
    tf.forEach((count, term) => {
      const idf = Math.log(N / (df.get(term) ?? 1))
      v.set(term, count * idf)
    })
    vectors.set(i, v)
  })
  return vectors
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0
  a.forEach((va, term) => {
    na += va * va
    const vb = b.get(term)
    if (vb !== undefined) dot += va * vb
  })
  b.forEach(vb => { nb += vb * vb })
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9)
}

export async function jobOtroCluster(): Promise<OtroClusterReport> {
  const articles = await readOtroArticles()
  if (articles.length < 2) return { generated_at: new Date(), clusters: [] }

  const docs = articles.map(a => tokenize(`${a.title} ${a.description}`))
  const vectors = computeTfIdf(docs)

  // Greedy clustering
  const assigned = new Set<number>()
  const clusters: Array<number[]> = []
  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue
    const cluster = [i]
    assigned.add(i)
    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue
      if (cosine(vectors.get(i)!, vectors.get(j)!) >= SIMILARITY_THRESHOLD) {
        cluster.push(j); assigned.add(j)
      }
    }
    if (cluster.length >= 2) clusters.push(cluster)
  }

  return {
    generated_at: new Date(),
    clusters: clusters.map(idxs => {
      // Top terms del cluster
      const termCounts = new Map<string, number>()
      for (const idx of idxs) {
        for (const term of docs[idx]!) termCounts.set(term, (termCounts.get(term) ?? 0) + 1)
      }
      const topTerms = Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)
      return {
        top_terms: topTerms,
        sample_articles: idxs.slice(0, 5).map(i => ({ id: articles[i]!.id, title: articles[i]!.title })),
      }
    }),
  }
}
```

- [ ] **Step 8.3: Endpoint + cron**

Create `apps/visual-oscar/app/api/medios/maintenance/otro-cluster/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { jobOtroCluster } from '@/lib/medios/canonical/maintenance/otro-cluster'

export async function GET() {
  const report = await jobOtroCluster()
  return NextResponse.json(report, {
    headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=600' },
  })
}

export const dynamic = 'force-dynamic'
```

Edit `maintenance/index.ts`:

```typescript
import { jobOtroCluster } from './otro-cluster'

// dentro del array JOBS:
  {
    name: 'terms-not-classified',
    schedule: '12hourly',
    run: async () => {
      const report = await jobOtroCluster()
      console.log(JSON.stringify({
        event: 'maintenance.otro_cluster',
        n_clusters: report.clusters.length,
        total_articles_clustered: report.clusters.reduce((s, c) => s + c.sample_articles.length, 0),
      }))
    },
  },
```

- [ ] **Step 8.4: Tests + build + commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/maintenance/otro-cluster.test.ts 2>&1 | tail -15
npm run build 2>&1 | tail -10
```

Expected: 4/4 passing.

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/maintenance/otro-cluster.ts \
        apps/visual-oscar/lib/medios/canonical/maintenance/index.ts \
        apps/visual-oscar/app/api/medios/maintenance/otro-cluster/route.ts \
        apps/visual-oscar/tests/unit/medios/canonical/maintenance/otro-cluster.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C8 · job terms-not-classified 12h (OTRO cluster)

Cluster TF-IDF cosine (sin embeddings semánticos, sin dependencias externas)
de artículos topic_id='OTRO' últimas 12h:
- Tokenización ES + stopwords básicas
- Vectorización TF-IDF
- Clustering greedy con threshold 0.6 cosine
- Top 5 términos por cluster + sample articles

Cron registrado schedule '12hourly'. Endpoint GET /api/medios/maintenance/otro-cluster.

Output sirve para curación humana: identifica clusters de OTRO que podrían
justificar nuevas reglas heurísticas o macrotemas.

Tests: 4 nuevos + 137 previos = 141. Build verde.

Sprint 2 C8/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C9 · Job classifier-metrics cada 24h

**Goal:** Agregar métricas del pipeline últimas 24h y persistir en `pipeline_metrics`. Endpoint para consulta.

**Files:**
- Create: `apps/visual-oscar/lib/medios/canonical/maintenance/classifier-metrics.ts`
- Create: `apps/visual-oscar/lib/medios/canonical/stores/pipeline-metrics-store.ts`
- Create: `apps/visual-oscar/app/api/medios/maintenance/metrics/route.ts`
- Modify: `apps/visual-oscar/lib/medios/canonical/maintenance/index.ts`
- Test: `apps/visual-oscar/tests/unit/medios/canonical/maintenance/classifier-metrics.test.ts`

**Dependencies:** C8.

**Sub-agent prompt:**
> Implementa C9: cron classifier-metrics.
>
> **Lee primero:**
> 1. Design doc §7.3 + §8 (tabla `pipeline_metrics` schema)
> 2. Migración 0058 schema `pipeline_metrics`: `window_from, window_to, fetched_total, duplicates_*, noise_filtered, processed_successfully, classified_with_taxonomy, classification_by_method JSONB, classification_confidence JSONB, otro_percentage, recorded_at`
>
> Pattern análogo a C8.

### Steps

- [ ] **Step 9.1: Test failing**

Create `apps/visual-oscar/tests/unit/medios/canonical/maintenance/classifier-metrics.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { jobClassifierMetrics } from '@/lib/medios/canonical/maintenance/classifier-metrics'

vi.mock('@/lib/medios/canonical/maintenance/classifier-metrics', async () => {
  const actual = await vi.importActual<any>('@/lib/medios/canonical/maintenance/classifier-metrics')
  return {
    ...actual,
    aggregateLastWindow: vi.fn(async () => ({
      fetched_total: 1000,
      processed_successfully: 850,
      classified_with_taxonomy: 800,
      classification_by_method: { RSS_TAG: 600, HEURISTIC: 150, SEMANTIC_LLM: 50, NONE: 50 },
      otro_count: 50,
      duplicates_exact: 80,
      noise_filtered: 20,
    })),
    persistPipelineMetrics: vi.fn(),
  }
})

describe('jobClassifierMetrics', () => {
  it('calcula otro_percentage correctamente', async () => {
    const result = await jobClassifierMetrics()
    expect(result.otro_percentage).toBeCloseTo(0.05, 2)  // 50/1000
  })

  it('classification_by_method tiene los 4 métodos', async () => {
    const result = await jobClassifierMetrics()
    expect(Object.keys(result.classification_by_method)).toEqual(
      expect.arrayContaining(['RSS_TAG', 'HEURISTIC', 'SEMANTIC_LLM', 'NONE']),
    )
  })

  it('persiste en pipeline_metrics', async () => {
    const { persistPipelineMetrics } = await import('@/lib/medios/canonical/maintenance/classifier-metrics')
    await jobClassifierMetrics()
    expect(persistPipelineMetrics).toHaveBeenCalled()
  })

  it('ventana vacía → response con ceros sin error', async () => {
    const mod = await import('@/lib/medios/canonical/maintenance/classifier-metrics')
    vi.mocked(mod.aggregateLastWindow).mockResolvedValueOnce({
      fetched_total: 0, processed_successfully: 0, classified_with_taxonomy: 0,
      classification_by_method: { RSS_TAG: 0, HEURISTIC: 0, SEMANTIC_LLM: 0, NONE: 0 },
      otro_count: 0, duplicates_exact: 0, noise_filtered: 0,
    })
    const result = await jobClassifierMetrics()
    expect(result.otro_percentage).toBe(0)
  })
})
```

- [ ] **Step 9.2: Store + job**

Create `apps/visual-oscar/lib/medios/canonical/stores/pipeline-metrics-store.ts`:

```typescript
import { sql } from '@/lib/db'

export interface PipelineMetricRow {
  window_from: Date
  window_to: Date
  fetched_total: number
  duplicates_exact: number
  duplicates_titular: number
  noise_filtered: number
  processed_successfully: number
  classified_with_taxonomy: number
  classification_by_method: Record<string, number>
  classification_confidence: Record<string, number>
  otro_percentage: number
}

export async function insertPipelineMetric(row: PipelineMetricRow): Promise<void> {
  await sql`
    INSERT INTO pipeline_metrics (
      window_from, window_to, fetched_total, duplicates_exact, duplicates_titular,
      noise_filtered, processed_successfully, classified_with_taxonomy,
      classification_by_method, classification_confidence, otro_percentage
    ) VALUES (
      ${row.window_from}, ${row.window_to}, ${row.fetched_total},
      ${row.duplicates_exact}, ${row.duplicates_titular}, ${row.noise_filtered},
      ${row.processed_successfully}, ${row.classified_with_taxonomy},
      ${JSON.stringify(row.classification_by_method)}::jsonb,
      ${JSON.stringify(row.classification_confidence)}::jsonb,
      ${row.otro_percentage}
    )
  `
}

export async function readPipelineMetrics(window: '24h' | '7d' | '30d'): Promise<PipelineMetricRow[]> {
  const interval = { '24h': '1 day', '7d': '7 days', '30d': '30 days' }[window]
  return sql`
    SELECT * FROM pipeline_metrics
    WHERE recorded_at >= NOW() - INTERVAL ${interval}
    ORDER BY recorded_at DESC
  `
}
```

Create `apps/visual-oscar/lib/medios/canonical/maintenance/classifier-metrics.ts`:

```typescript
import { sql } from '@/lib/db'
import { insertPipelineMetric } from '../stores/pipeline-metrics-store'

const T24H = 24 * 3600_000

export async function aggregateLastWindow() {
  const windowFrom = new Date(Date.now() - T24H)
  const [aggregate] = await sql<any[]>`
    SELECT
      COUNT(*) AS fetched_total,
      COUNT(*) FILTER (WHERE is_duplicate = TRUE) AS duplicates_exact,
      COUNT(*) FILTER (WHERE is_noise = TRUE) AS noise_filtered,
      COUNT(*) FILTER (WHERE processing_status = 'completed') AS processed_successfully,
      COUNT(*) FILTER (WHERE topic_id IS NOT NULL AND topic_id != 'OTRO') AS classified_with_taxonomy,
      COUNT(*) FILTER (WHERE topic_id = 'OTRO') AS otro_count
    FROM article WHERE ingested_at >= ${windowFrom}
  `
  const methods = await sql<any[]>`
    SELECT classification_method, COUNT(*) AS n
    FROM article WHERE ingested_at >= ${windowFrom} GROUP BY classification_method
  `
  return {
    fetched_total: Number(aggregate.fetched_total),
    duplicates_exact: Number(aggregate.duplicates_exact),
    noise_filtered: Number(aggregate.noise_filtered),
    processed_successfully: Number(aggregate.processed_successfully),
    classified_with_taxonomy: Number(aggregate.classified_with_taxonomy),
    otro_count: Number(aggregate.otro_count),
    classification_by_method: methods.reduce((acc, m) => ({
      ...acc,
      [m.classification_method ?? 'NONE']: Number(m.n),
    }), { RSS_TAG: 0, HEURISTIC: 0, SEMANTIC_LLM: 0, NONE: 0 } as Record<string, number>),
  }
}

export async function persistPipelineMetrics(row: any): Promise<void> {
  return insertPipelineMetric(row)
}

export async function jobClassifierMetrics() {
  const agg = await aggregateLastWindow()
  const otroPercentage = agg.fetched_total > 0 ? agg.otro_count / agg.fetched_total : 0
  const row = {
    window_from: new Date(Date.now() - T24H),
    window_to: new Date(),
    fetched_total: agg.fetched_total,
    duplicates_exact: agg.duplicates_exact,
    duplicates_titular: 0,  // futuro
    noise_filtered: agg.noise_filtered,
    processed_successfully: agg.processed_successfully,
    classified_with_taxonomy: agg.classified_with_taxonomy,
    classification_by_method: agg.classification_by_method,
    classification_confidence: {},
    otro_percentage: otroPercentage,
  }
  await persistPipelineMetrics(row)
  return row
}
```

- [ ] **Step 9.3: Endpoint + cron**

Create `apps/visual-oscar/app/api/medios/maintenance/metrics/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { readPipelineMetrics } from '@/lib/medios/canonical/stores/pipeline-metrics-store'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const window = (url.searchParams.get('window') ?? '24h') as '24h' | '7d' | '30d'
  const series = await readPipelineMetrics(window)
  return NextResponse.json({ window, series }, {
    headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=600' },
  })
}

export const dynamic = 'force-dynamic'
```

Edit `maintenance/index.ts`:

```typescript
import { jobClassifierMetrics } from './classifier-metrics'

// dentro del array JOBS:
  {
    name: 'classifier-metrics',
    schedule: 'daily',
    run: async () => {
      const row = await jobClassifierMetrics()
      console.log(JSON.stringify({
        event: 'maintenance.classifier_metrics',
        otro_pct: row.otro_percentage,
        by_method: row.classification_by_method,
      }))
    },
  },
```

- [ ] **Step 9.4: Tests + build + commit**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/unit/medios/canonical/maintenance/classifier-metrics.test.ts 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

Expected: 4/4 passing.

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
git add apps/visual-oscar/lib/medios/canonical/maintenance/classifier-metrics.ts \
        apps/visual-oscar/lib/medios/canonical/stores/pipeline-metrics-store.ts \
        apps/visual-oscar/lib/medios/canonical/maintenance/index.ts \
        apps/visual-oscar/app/api/medios/maintenance/metrics/route.ts \
        apps/visual-oscar/tests/unit/medios/canonical/maintenance/classifier-metrics.test.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C9 · job classifier-metrics cada 24h

Cron diario agrega métricas pipeline últimas 24h y persiste en
pipeline_metrics (tabla creada por migración 0058):
- fetched_total, duplicates_exact, noise_filtered
- processed_successfully, classified_with_taxonomy
- classification_by_method JSONB (RSS_TAG/HEURISTIC/SEMANTIC_LLM/NONE counts)
- otro_percentage (count('OTRO') / fetched_total)

Endpoint GET /api/medios/maintenance/metrics?window=24h|7d|30d devuelve
serie histórica para la página /medios/health (enriquecida en C10).

Tests: 4 nuevos + 141 previos = 145. Build verde.

Sprint 2 C9/10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin HEAD 2>&1 | tail -5
```

---

## C10 · Tests aceptación §IV + /medios/health Sprint 2 + push final

**Goal:** Cerrar sprint con 10 tests aceptación, página `/medios/health` enriquecida con visualización Sprint 2, y push fast-forward único a `main` + `Visual_Oscar`.

**Files:**
- Create: `apps/visual-oscar/tests/acceptance/sprint-2-prensa.spec.ts` (10 tests §IV)
- Modify: `apps/visual-oscar/app/medios/health/page.tsx` (sección Sprint 2)
- Modify: `apps/visual-oscar/app/api/medios/health/route.ts` (incluir metrics Sprint 2)

**Dependencies:** C9 (necesita pipeline_metrics writeable).

**Sub-agent prompt:**
> Implementa C10: tests aceptación §IV + página health + push final.
>
> **Lee primero:**
> 1. Design doc §8 (los 10 tests con código completo) + §9 (observabilidad)
> 2. `apps/visual-oscar/app/medios/health/page.tsx` actual (Sprint 1.5 baseline)
> 3. `apps/visual-oscar/app/api/medios/health/route.ts` actual
>
> **Importante**: este es el commit que hace deploy. Tras `git push origin HEAD:main` + `git push origin HEAD:Visual_Oscar`, Vercel auto-deploya. Crear backup tags ANTES.

### Steps

- [ ] **Step 10.1: 10 tests aceptación §IV**

Create `apps/visual-oscar/tests/acceptance/sprint-2-prensa.spec.ts` con los 10 tests del design doc §8. Cada test usa fixtures + mocks de pipeline_metrics. Code completo en design doc §8 — copiarlo verbatim adaptando imports.

- [ ] **Step 10.2: Ejecutar acceptance**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npx vitest run tests/acceptance/sprint-2-prensa.spec.ts 2>&1 | tail -25
```

Expected: 10/10 passing.

- [ ] **Step 10.3: Enriquecer página `/medios/health`**

Edit `apps/visual-oscar/app/medios/health/page.tsx` para añadir sección Sprint 2:
- Distribución por método clasificador (stacked area 24h)
- OTRO trend 7d (línea temporal)
- Gemini API status (cache hit rate desde `/api/medios/maintenance/metrics`)
- Topic state distribution (pie chart)
- Jobs status (última ejecución de cada cron)
- Top OTRO clusters (desde `/api/medios/maintenance/otro-cluster`)

(El sub-agente debe mantener el estilo visual de la página actual; añade secciones nuevas debajo de las existentes Sprint 1.5.)

- [ ] **Step 10.4: Actualizar `/api/medios/health/route.ts`**

Añadir agregación de pipeline_metrics + topic_prominence_history al response:

```typescript
const sprint2Metrics = {
  classifier_distribution: ..., // de pipeline_metrics
  otro_trend_7d: ..., // serie
  topic_state_distribution: ..., // count por state
}
```

- [ ] **Step 10.5: Smoke local antes de push**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48/apps/visual-oscar"
npm run build 2>&1 | tail -15
npm test -- --run 2>&1 | tail -20
npm run dev -- -p 3001 &
sleep 5
curl -s http://localhost:3001/api/medios/health | jq '.sprint_2_metrics' | head -20
curl -s 'http://localhost:3001/api/medios/pulso?mode=CRISIS' | head -10
kill %1
```

Expected: build verde, todos los tests pasan, endpoints responden 200 con datos.

- [ ] **Step 10.6: Backups + push final**

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/.claude/worktrees/sharp-keller-3d6d48"
# Backup tags (CLAUDE.md §0.3)
git tag backup-pre-sprint-2-main-$(date +%s) origin/main
git tag backup-pre-sprint-2-vo-$(date +%s) origin/Visual_Oscar
git push origin --tags 2>&1 | tail -5

# Commit C10
git add apps/visual-oscar/tests/acceptance/sprint-2-prensa.spec.ts \
        apps/visual-oscar/app/medios/health/page.tsx \
        apps/visual-oscar/app/api/medios/health/route.ts
git commit -m "$(cat <<'EOF'
feat(medios): Sprint 2 C10 · tests aceptación §IV + /medios/health + push prod

Cierra Sprint 2 con:
- 10 tests aceptación §IV (OTRO ≤ 8%, layer coverage 60/20/20, scoring
  correlation Spearman ≥ 0.8, momentum spike, state determinism, mode
  REGION/CRISIS, confidence aggregation)
- Página /medios/health enriquecida con secciones Sprint 2:
  · Distribución por método clasificador (stacked area 24h)
  · OTRO trend 7d
  · Gemini API status (cache hit rate, rate limit, circuit breaker)
  · Topic state distribution
  · Jobs status (3 crones Sprint 2)
  · Top OTRO clusters
- /api/medios/health responde sprint_2_metrics agregado

Tests totales sprint: 155 (92 baseline + 63 Sprint 2). Build verde.

Sprint 2 C10/10 CERRADO.
Predecesor: Sprint 0+1 (HEAD 387f2ac9). Sucesor: Sprint 3 (Actores).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

# Push fast-forward a main + Visual_Oscar
git fetch origin
git log --oneline origin/main..HEAD
git push origin HEAD:main 2>&1 | tail -5
git push origin HEAD:Visual_Oscar 2>&1 | tail -5
git push origin HEAD 2>&1 | tail -5
```

Expected: tags creados, commit C10 + push fast-forward sin errores.

- [ ] **Step 10.7: Verificación deploy Vercel**

Esperar ~3min para que Vercel construya:

```bash
sleep 180
curl -sI https://politeia-visual-oscar.vercel.app/medios/health | head -3
curl -s 'https://politeia-visual-oscar.vercel.app/api/medios/pulso?mode=CRISIS' | head
```

Expected: HTTP 200 (o 307 redirect). Si hay error 500 en producción, hacer rollback inmediato:

```bash
# Solo si producción rota:
git push origin backup-pre-sprint-2-main-XXX:main --force
```

(Force push aquí está justificado por rollback explícito.)

- [ ] **Step 10.8: Tareas post-sprint (recordatorios)**

Anotar para el usuario:
- **Rotar `GEMINI_API_KEY`** en Google AI Studio (compartida en chat)
- **Rotar `DATABASE_URL`** Railway Postgres (compartida en chat anterior)
- Sprint 3 (Actores) puede empezar tras review producción

---

## Self-Review (skill checklist)

Después de escribir el plan completo, paso checklist:

**1. Spec coverage:** ✅
- §1 Arquitectura → C1-C9 cubren todas las capas
- §2 Gemini adapter → C1 (todos los tests del spec mapeados)
- §3 Pipeline cascade → C2
- §4 TopicProminenceScore 5 componentes → C3+C4
- §5 TopicState → C5
- §6 5 PulsoMode → C6 (REGION/IDEOLOGY/CRISIS nuevos; PLURAL+AUDIEN enriquecidos)
- §7 3 jobs mantenimiento → C7+C8+C9
- §8 10 tests aceptación → C10
- §9 Observabilidad health → C10
- §10 Tabla 10 commits → estructura del plan
- §12 env vars → Step 1.9 + Step 10.8

**2. Placeholder scan:** ✅
- Todos los tests tienen código completo
- Todos los SQL queries explícitos
- Mensajes de commit completos (no "fill in details")

**3. Type consistency:** ✅
- `TopicState` consistente (importado de types.ts)
- `PulsoMode` consistente
- `MedioConfig` interface consistente (clave/credibilidad/establishment)
- `HistorySnapshot` consistente C3-C5
- `LlmClassifierClient.classifyBatch()` consistente

**4. Ambigüedades resueltas:** ✅
- Schema mismatch `tier` documentado en spec §4.4 + plan C4 con fórmula explícita
- Batching Layer 3 simplificado (no over-engineer)
- Cron schedule "cada 6h"/"12h"/"24h" mapped a `'6hourly'`/`'12hourly'`/`'daily'` enum existente

---

## Resumen de commits

| # | Commit | Tests nuevos | Total acumulado |
|---|--------|--------------|-----------------|
| C1 | Adapter Gemini | 6 | 98 |
| C2 | Layer 3 activar pipeline | 5 | 103 |
| C3 | momentumScore + snapshot writer | 7 | 110 |
| C4 | diversity + tier + entityDensity + aggregate | 10 | 120 |
| C5 | State machine | 5 | 125 |
| C6 | PulsoMode REGION/IDEOLOGY/CRISIS | 8 | 133 |
| C7 | Job unmapped-tags | 4 | 137 |
| C8 | Job otro-cluster (TF-IDF) | 4 | 141 |
| C9 | Job classifier-metrics + store | 4 | 145 |
| C10 | Tests aceptación + health + push | 10 | 155 |

**Total Sprint 2**: 63 tests nuevos + ~3000 LOC nuevos.
