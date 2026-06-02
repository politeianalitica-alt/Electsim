/**
 * Capa 3 clasificación: LLM semantic.
 * Sprint 0.3: usa Ollama dev (llama3.1:8b) por default.
 * Sprint 1.3: migra a Groq prod (llama-3.3-70b-versatile).
 *
 * Confidence siempre truncada a 0.75 (spec §2.1.3).
 * Batching: el caller acumula 20 antes de invocar.
 *
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import { FLAGS, type LlmClassifierProvider } from '../feature-flags.ts'
import { GeminiProductionClient, GroqProductionClient } from './llm-classifier.ts'
import type { TopicTag, ClassificationMethod } from './types.ts'

export interface LlmClassifierClient {
  classifyBatch(
    items: Array<{
      title: string
      description: string
    }>,
    topicList: string[],
  ): Promise<
    Array<{
      topicId: string
      confidence: number
      reasoning: string
    } | null>
  >
}

/**
 * Cliente por defecto: Ollama local llama3.1:8b.
 * Lee endpoint de OLLAMA_HOST env var, default http://localhost:11434.
 */
export class OllamaLlmClient implements LlmClassifierClient {
  private host: string
  private model: string

  constructor(
    host: string = process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    model: string = 'llama3.1:8b',
  ) {
    this.host = host
    this.model = model
  }

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
        const data = (await resp.json()) as { response: string }
        const parsed = JSON.parse(data.response) as {
          topicId: string
          confidence: number
          reasoning?: string
        }
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
${topicList.map((t) => `- ${t}`).join('\n')}

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
  async classifyBatch(
    items: Array<{ title: string; description: string }>,
  ): Promise<Array<null>> {
    return items.map(() => null)
  }
}

/**
 * Convierte resultado LLM a TopicTag canónico.
 */
export function semanticResultToTopicTag(result: {
  topicId: string
  confidence: number
}): TopicTag {
  return {
    topicId: result.topicId,
    subtopicId: null,
    level: 1,
    confidence: Math.min(result.confidence, 0.75),
    method: 'SEMANTIC' as ClassificationMethod,
    assignedAt: new Date().toISOString(),
  }
}

/**
 * Factory que construye el cliente LLM apropiado según
 * `FLAGS.MEDIOS_LLM_CLASSIFIER`. Cuando no se inyecta
 * `options.semanticClient` en `processArticle()`, este factory se llama
 * como default (Sprint 2 C2, 2026-06-02 — primer caller). Los callers
 * explícitos (endpoint, cron, tests) pueden seguir construyendo su
 * propio cliente y pasándolo por `ProcessOptions.semanticClient` para
 * tener control fino sobre cache, rate-limit o testing.
 *
 * Esquema:
 *  - 'gemini'   → GeminiProductionClient · fallback a StubLlmClient si
 *                 GEMINI_API_KEY no está configurada (warn).
 *  - 'groq'     → GroqProductionClient · fallback a StubLlmClient si
 *                 GROQ_API_KEY no está configurada (warn).
 *  - 'ollama'   → OllamaLlmClient (dev) · siempre disponible.
 *  - 'disabled' → StubLlmClient (no-op, devuelve null para cada item).
 *
 * Si `MEDIOS_LLM_CLASSIFIER='disabled'`, devuelve `StubLlmClient`.
 * Si el API key del provider falta, también degrada a `StubLlmClient`
 * con warning en stdout (graceful degradation; no crashea la ingesta).
 *
 * I2 fix (2026-06-02): usa `FLAGS.MEDIOS_LLM_CLASSIFIER` (validado vía
 * `readClassifier()` en feature-flags.ts) en lugar de leer `process.env`
 * directo. Switch exhaustivo: si se añade un provider al union
 * `LlmClassifierProvider` y se olvida wirearlo aquí, TS lanza error en
 * compile-time gracias a la asignación `_exhaustive: never`.
 */
export function createLlmClient(): LlmClassifierClient {
  const provider: LlmClassifierProvider = FLAGS.MEDIOS_LLM_CLASSIFIER
  switch (provider) {
    case 'gemini': {
      const key = process.env.GEMINI_API_KEY
      if (!key) {
        // eslint-disable-next-line no-console
        console.warn(
          '[medios.canonical] GEMINI_API_KEY no configurada, fallback a Stub',
        )
        return new StubLlmClient()
      }
      return new GeminiProductionClient({ apiKey: key })
    }
    case 'groq': {
      const key = process.env.GROQ_API_KEY
      if (!key) {
        // eslint-disable-next-line no-console
        console.warn(
          '[medios.canonical] GROQ_API_KEY no configurada, fallback a Stub',
        )
        return new StubLlmClient()
      }
      return new GroqProductionClient(key)
    }
    case 'ollama':
      return new OllamaLlmClient()
    case 'disabled':
      return new StubLlmClient()
    default: {
      // Exhaustiveness check: si se añade un provider nuevo al union
      // y no se wirea arriba, TS lanza error aquí.
      const _exhaustive: never = provider
      return new StubLlmClient()
    }
  }
}
