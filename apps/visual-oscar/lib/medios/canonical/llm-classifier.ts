/**
 * Production LLM Topic Classifier.
 * Sprint 1.3 · Groq default, Ollama fallback en dev.
 *
 * Features:
 *  - Batching 20 items per LLM call (spec §2.1.3)
 *  - Cache SHA256(title|description) TTL 1h en memoria
 *  - Rate limiter 30 req/min token bucket
 *  - Circuit breaker: 3 failures consecutivas → bloquea 60s, retorna null
 *  - Confidence cap 0.75 (spec §2.1.3)
 *  - Model llama-3.3-70b-versatile por defecto
 *  - response_format json_object
 *
 * Sprint 0+1 · Task 8 · 2026-06-02
 */
import { createHash } from 'node:crypto'
import type { LlmClassifierClient } from './classify-semantic'

interface CacheEntry {
  result: { topicId: string; confidence: number; reasoning: string } | null
  expiresAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const BATCH_SIZE = 20
const CIRCUIT_OPEN_MS = 60 * 1000 // 60s
const MAX_CONSECUTIVE_FAILURES = 3
const CONFIDENCE_CAP = 0.75

/**
 * Token bucket rate limiter.
 * capacity tokens, refilled at refillPerMin rate.
 */
class RateLimiter {
  private capacity: number
  private refillPerMin: number
  private tokens: number
  private lastRefill: number

  constructor(capacity: number, refillPerMin: number) {
    this.capacity = capacity
    this.refillPerMin = refillPerMin
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  acquire(): boolean {
    const now = Date.now()
    const elapsedMin = (now - this.lastRefill) / 60000
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedMin * this.refillPerMin,
    )
    this.lastRefill = now
    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  }

  async waitForToken(): Promise<void> {
    while (!this.acquire()) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

/**
 * Cliente de producción que usa Groq Cloud API (compatible OpenAI).
 *
 * Activar con feature flag MEDIOS_LLM_CLASSIFIER=groq + ENV GROQ_API_KEY.
 */
export class GroqProductionClient implements LlmClassifierClient {
  private apiKey: string
  private model: string
  private cache = new Map<string, CacheEntry>()
  private rateLimiter: RateLimiter
  private consecutiveFailures = 0
  private circuitOpen = false
  private circuitOpenedAt = 0

  constructor(
    apiKey: string = process.env.GROQ_API_KEY ?? '',
    model: string = 'llama-3.3-70b-versatile',
    rpm = 30,
  ) {
    this.apiKey = apiKey
    this.model = model
    this.rateLimiter = new RateLimiter(rpm, rpm)
  }

  private keyForItem(title: string, description: string): string {
    return createHash('sha256').update(`${title}|${description}`).digest('hex')
  }

  async classifyBatch(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<
    Array<{ topicId: string; confidence: number; reasoning: string } | null>
  > {
    if (items.length === 0) return []

    // Circuit breaker check
    if (this.circuitOpen) {
      if (Date.now() - this.circuitOpenedAt < CIRCUIT_OPEN_MS) {
        return items.map(() => null)
      }
      // Circuit timeout expired: half-open, reset state
      this.circuitOpen = false
      this.consecutiveFailures = 0
    }

    const results: Array<
      { topicId: string; confidence: number; reasoning: string } | null
    > = new Array(items.length).fill(null)
    const toCall: Array<{
      idx: number
      key: string
      title: string
      description: string
    }> = []

    // Cache lookup per item
    items.forEach((it, idx) => {
      const key = this.keyForItem(it.title, it.description)
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        results[idx] = cached.result
      } else {
        toCall.push({ idx, key, title: it.title, description: it.description })
      }
    })

    // Batch LLM calls (BATCH_SIZE per fetch)
    for (let i = 0; i < toCall.length; i += BATCH_SIZE) {
      const batch = toCall.slice(i, i + BATCH_SIZE)
      await this.rateLimiter.waitForToken()
      try {
        const batchResults = await this.callGroq(
          batch.map((b) => ({ title: b.title, description: b.description })),
          topicList,
        )
        batch.forEach((b, j) => {
          const r = batchResults[j] ?? null
          results[b.idx] = r
          this.cache.set(b.key, {
            result: r,
            expiresAt: Date.now() + CACHE_TTL_MS,
          })
        })
        // Successful batch: reset failure counter
        this.consecutiveFailures = 0
      } catch {
        this.consecutiveFailures++
        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.circuitOpen = true
          this.circuitOpenedAt = Date.now()
        }
        batch.forEach((b) => {
          results[b.idx] = null
        })
      }
    }
    return results
  }

  /**
   * Construye prompt + invoca Groq Cloud, parsea respuesta.
   *
   * Acepta dos shapes de respuesta:
   *  - {results: [{topicId, confidence, reasoning}]}
   *  - [{topicId, confidence, reasoning}]
   */
  private async callGroq(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<
    Array<{ topicId: string; confidence: number; reasoning: string } | null>
  > {
    const prompt = `Eres clasificador de temas de prensa política española.
Para cada artículo asigna UNO de estos topicIds: ${topicList.join(', ')}.
Si no encaja → "OTRO" con confidence 0.30.
Confidence entre 0.0 y 1.0 (será truncada a ${CONFIDENCE_CAP} max).

Responde JSON con shape: {"results":[{"topicId":"...","confidence":0.X,"reasoning":"frase"}]}.
El array results DEBE tener exactamente ${items.length} elementos en el mismo orden que los artículos.

ARTÍCULOS:
${items
  .map(
    (it, i) =>
      `${i + 1}. Título: ${it.title}\n   Descripción: ${it.description}`,
  )
  .join('\n')}`

    const resp = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
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
      },
    )
    if (!resp.ok) {
      throw new Error(`Groq HTTP ${resp.status}`)
    }
    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Groq empty response')
    }
    const parsed = JSON.parse(content) as
      | {
          results?: Array<{
            topicId: string
            confidence: number
            reasoning?: string
          }>
        }
      | Array<{ topicId: string; confidence: number; reasoning?: string }>

    const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? [])

    // Mapeo posicional: items.length salidas exactas.
    const out: Array<
      { topicId: string; confidence: number; reasoning: string } | null
    > = []
    for (let i = 0; i < items.length; i++) {
      const r = arr[i]
      if (!r || typeof r.topicId !== 'string' || !topicList.includes(r.topicId)) {
        out.push(null)
        continue
      }
      const rawConf = typeof r.confidence === 'number' ? r.confidence : 0.5
      const clamped = Math.min(Math.max(rawConf, 0), CONFIDENCE_CAP)
      out.push({
        topicId: r.topicId,
        confidence: clamped,
        reasoning: typeof r.reasoning === 'string' ? r.reasoning : '',
      })
    }
    return out
  }
}

// ─── Sprint 2 C1 · Gemini provider ──────────────────────────────────
//
// Reutiliza lib/ai/gemini-client.ts (generateJSON con responseSchema nativo).
// Activar con MEDIOS_LLM_CLASSIFIER=gemini + ENV GEMINI_API_KEY.
//
// Mantiene el mismo patrón interno que GroqProductionClient:
//  - cache Map<sha256, CacheEntry> con TTL 1h
//  - RateLimiter token bucket (la misma clase de arriba)
//  - circuit breaker inline (3 fails → 60s open)
//  - confidence cap 0.75
//  - batching BATCH_SIZE (20) per LLM call
//
// El cliente `generateJSON` se inyecta vía constructor para que los tests
// puedan pasar un stub sin tener que monkey-patchear el namespace ESM
// (Node congela los exports de módulos ESM).

interface GeminiGenerateJSONOptions {
  model?: string
  messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>
  jsonSchema?: Record<string, unknown>
  temperature?: number
  maxTokens?: number
}

type GeminiGenerateJSON = <T>(opts: GeminiGenerateJSONOptions) => Promise<T>

export interface GeminiClientConfig {
  apiKey: string
  model?: string
  rpm?: number
  /**
   * Inyectable para tests. Default: el `generateJSON` real de
   * `lib/ai/gemini-client.ts`, importado dinámicamente para evitar el
   * ciclo de resolución Node ESM (gemini-client.ts importa './ai-config'
   * sin extensión, válido en Next pero no en Node bare).
   */
  generateJSON?: GeminiGenerateJSON
}

interface GeminiClassificationResult {
  topicId: string
  confidence: number
  reasoning?: string
}

const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash-lite'

/**
 * Cliente de producción que usa Google Gemini (Generative Language API
 * v1beta) via `generateJSON` con responseSchema nativo.
 *
 * Activar con feature flag MEDIOS_LLM_CLASSIFIER=gemini + ENV GEMINI_API_KEY.
 */
export class GeminiProductionClient implements LlmClassifierClient {
  private apiKey: string
  private model: string
  private cache = new Map<string, CacheEntry>()
  private rateLimiter: RateLimiter
  private consecutiveFailures = 0
  private circuitOpen = false
  private circuitOpenedAt = 0
  private generateJSON: GeminiGenerateJSON

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey) {
      throw new Error('GEMINI_API_KEY required for GeminiProductionClient')
    }
    this.apiKey = config.apiKey
    this.model = config.model ?? GEMINI_DEFAULT_MODEL
    const rpm = config.rpm ?? 30
    this.rateLimiter = new RateLimiter(rpm, rpm)
    this.generateJSON = config.generateJSON ?? lazyGenerateJSON
  }

  private keyForItem(title: string, description: string): string {
    return createHash('sha256').update(`${title}|${description}`).digest('hex')
  }

  async classifyBatch(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<
    Array<{ topicId: string; confidence: number; reasoning: string } | null>
  > {
    if (items.length === 0) return []

    // Circuit breaker check
    if (this.circuitOpen) {
      if (Date.now() - this.circuitOpenedAt < CIRCUIT_OPEN_MS) {
        return items.map(() => null)
      }
      this.circuitOpen = false
      this.consecutiveFailures = 0
    }

    const results: Array<
      { topicId: string; confidence: number; reasoning: string } | null
    > = new Array(items.length).fill(null)
    const toCall: Array<{
      idx: number
      key: string
      title: string
      description: string
    }> = []

    items.forEach((it, idx) => {
      const key = this.keyForItem(it.title, it.description)
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        results[idx] = cached.result
      } else {
        toCall.push({ idx, key, title: it.title, description: it.description })
      }
    })

    for (let i = 0; i < toCall.length; i += BATCH_SIZE) {
      const batch = toCall.slice(i, i + BATCH_SIZE)
      await this.rateLimiter.waitForToken()
      try {
        const batchResults = await this.callGemini(
          batch.map((b) => ({ title: b.title, description: b.description })),
          topicList,
        )
        batch.forEach((b, j) => {
          const r = batchResults[j] ?? null
          results[b.idx] = r
          this.cache.set(b.key, {
            result: r,
            expiresAt: Date.now() + CACHE_TTL_MS,
          })
        })
        this.consecutiveFailures = 0
      } catch {
        this.consecutiveFailures++
        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.circuitOpen = true
          this.circuitOpenedAt = Date.now()
        }
        batch.forEach((b) => {
          results[b.idx] = null
        })
      }
    }
    return results
  }

  /**
   * Invoca Gemini vía `generateJSON` con responseSchema strict, parsea
   * respuesta. Schema fuerza enum sobre topicList → menos parsing errors.
   *
   * Acepta dos shapes (igual que Groq):
   *  - {results: [{topicId, confidence, reasoning}]}
   *  - [{topicId, confidence, reasoning}]
   */
  private async callGemini(
    items: Array<{ title: string; description: string }>,
    topicList: string[],
  ): Promise<
    Array<{ topicId: string; confidence: number; reasoning: string } | null>
  > {
    const schema = {
      type: 'object',
      properties: {
        results: {
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
      required: ['results'],
    } satisfies Record<string, unknown>

    const prompt = `Eres clasificador de temas de prensa política española.
Para cada artículo asigna UNO de estos topicIds: ${topicList.join(', ')}.
Si no encaja → "OTRO" con confidence 0.30.
Confidence entre 0.0 y 1.0 (será truncada a ${CONFIDENCE_CAP} max).

Devuelve un objeto JSON con shape:
{"results":[{"topicId":"...","confidence":0.X,"reasoning":"frase"}]}.
El array results DEBE tener exactamente ${items.length} elementos en el
mismo orden que los artículos.

ARTÍCULOS:
${items
  .map(
    (it, i) =>
      `${i + 1}. Título: ${it.title}\n   Descripción: ${it.description}`,
  )
  .join('\n')}`

    const parsed = (await this.generateJSON({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      jsonSchema: schema,
      temperature: 0.1,
    })) as
      | { results?: GeminiClassificationResult[] }
      | GeminiClassificationResult[]

    const arr: GeminiClassificationResult[] = Array.isArray(parsed)
      ? parsed
      : (parsed.results ?? [])

    const out: Array<
      { topicId: string; confidence: number; reasoning: string } | null
    > = []
    for (let i = 0; i < items.length; i++) {
      const r = arr[i]
      if (!r || typeof r.topicId !== 'string' || !topicList.includes(r.topicId)) {
        out.push(null)
        continue
      }
      const rawConf = typeof r.confidence === 'number' ? r.confidence : 0.5
      const clamped = Math.min(Math.max(rawConf, 0), CONFIDENCE_CAP)
      out.push({
        topicId: r.topicId,
        confidence: clamped,
        reasoning: typeof r.reasoning === 'string' ? r.reasoning : '',
      })
    }
    return out
  }
}

/**
 * Default `generateJSON` resolver: dynamic import del módulo real
 * `@/lib/ai/gemini-client`. Es lazy porque ese módulo tiene imports
 * relativos sin `.ts` (válidos en Next.js, no en Node ESM "bare"), así
 * que sólo se carga cuando una request real lo necesita (en runtime
 * Next.js o Vercel functions, donde la resolución TS funciona).
 *
 * Los tests inyectan su propio stub via `config.generateJSON` y nunca
 * tocan esta rama.
 */
async function lazyGenerateJSON<T>(
  opts: GeminiGenerateJSONOptions,
): Promise<T> {
  const mod = (await import(
    /* @vite-ignore */ '@/lib/ai/gemini-client'
  )) as {
    generateJSON: GeminiGenerateJSON
  }
  return mod.generateJSON<T>(opts)
}
