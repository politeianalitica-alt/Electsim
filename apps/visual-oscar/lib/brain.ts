/**
 * GroqBrain · cliente TypeScript transversal para el workspace.
 *
 * Consume el router FastAPI `/api/v2/brain/*` (29 tools razonadoras Groq).
 * Diseñado para usarse desde Server Components / Route Handlers · jamás
 * desde el cliente directamente (no exponemos BACKEND_URL al browser).
 *
 * Filosofía de la librería:
 *  · Resiliente — nunca lanza, siempre devuelve { ok, ... } o mock.
 *  · Cacheable — opcional via `cache: 'no-store' | { revalidate: N }`.
 *  · Tipado mínimo — el shape JSON del brain se mantiene como `unknown`
 *    para que cada caller declare su propio narrowing.
 *
 * Uso típico (en un Server Component):
 *
 *   import { callBrainTool } from '@/lib/brain'
 *   const out = await callBrainTool('analyze_narrative', {
 *     pieces: titulares,
 *     topic: 'amnistía',
 *     time_window: 'última semana',
 *   })
 *   if (out.ok) {
 *     return <BrainPanel data={out} />
 *   }
 */

import { callBackend } from './backend'

export type BrainToolResponse<T = unknown> = {
  ok: boolean
  tool: string
  result?: T | null
  confidence?: number
  sources?: string[]
  reasoning_steps?: string[]
  model?: string
  tokens_used?: number
  latency_ms?: number
  error?: string | null
  prompt_name?: string
  from_fallback?: boolean
}

export type BrainToolListItem = {
  name: string
  doc: string
  params: Array<{
    name: string
    kind: string
    required: boolean
    default: unknown
  }>
}

/**
 * Llama una tool del brain por nombre con kwargs JSON.
 *
 * Devuelve siempre un objeto BrainToolResponse. Si el backend está caído,
 * `ok=false, error='backend_unavailable'`. No lanza nunca.
 */
export async function callBrainTool<T = unknown>(
  toolName: string,
  kwargs: Record<string, unknown>,
  opts?: { revalidateSeconds?: number },
): Promise<BrainToolResponse<T>> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kwargs }),
  }
  if (opts?.revalidateSeconds !== undefined) {
    // Next.js fetch cache hint
    ;(init as RequestInit & { next?: { revalidate: number } }).next = {
      revalidate: opts.revalidateSeconds,
    }
  } else {
    init.cache = 'no-store'
  }
  const res = await callBackend<BrainToolResponse<T>>(
    `/api/v2/brain/tool/${encodeURIComponent(toolName)}`,
    init,
  )
  if (res.error || !res.data) {
    return {
      ok: false,
      tool: toolName,
      result: null,
      error: res.error || 'backend_unavailable',
    }
  }
  return res.data
}

/**
 * Lista las 29 tools del brain (descubrimiento dinámico, sirve para UI).
 */
export async function listBrainTools(): Promise<BrainToolListItem[]> {
  const res = await callBackend<{ count: number; tools: BrainToolListItem[] }>(
    '/api/v2/brain/tools',
    { next: { revalidate: 600 } } as RequestInit,
  )
  return res.data?.tools ?? []
}

/**
 * Atajo para la tool orquestadora — ReAct loop.
 */
export async function brainPoliticalQuery(
  query: string,
  opts?: { context?: string; maxIterations?: number },
): Promise<{
  answer: string
  steps: Array<Record<string, unknown>>
  tools_used: string[]
  iterations: number
  error?: string | null
}> {
  const res = await callBackend<{
    answer: string
    steps: Array<Record<string, unknown>>
    tools_used: string[]
    iterations: number
    error?: string | null
  }>(`/api/v2/brain/political_query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      context: opts?.context,
      max_iterations: opts?.maxIterations ?? 10,
    }),
    cache: 'no-store',
  })
  return (
    res.data ?? {
      answer: '',
      steps: [],
      tools_used: [],
      iterations: 0,
      error: res.error || 'backend_unavailable',
    }
  )
}

/**
 * Ontology enrichment: extrae propuestas de nuevos actores/leyes/eventos
 * desde un texto crudo.
 */
export async function brainEnrichOntology(
  text: string,
  opts?: {
    source?: string
    knownActors?: string[]
    knownParties?: string[]
    knownInstitutions?: string[]
    knownLaws?: string[]
  },
): Promise<Record<string, unknown> | null> {
  const res = await callBackend<Record<string, unknown>>(
    `/api/v2/brain/ontology/enrich`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source: opts?.source ?? '',
        known_actors: opts?.knownActors ?? [],
        known_parties: opts?.knownParties ?? [],
        known_institutions: opts?.knownInstitutions ?? [],
        known_laws: opts?.knownLaws ?? [],
      }),
      cache: 'no-store',
    },
  )
  return res.data ?? null
}

/**
 * Forecast cuantitativo + razonado para una serie temporal.
 */
export async function brainForecastSerie(
  points: Array<{ fecha: string; valor: number }>,
  opts?: {
    horizonteDias?: number
    etiqueta?: string
    eventosRecientes?: string[]
    pedirEscenarios?: boolean
  },
): Promise<Record<string, unknown> | null> {
  const res = await callBackend<Record<string, unknown>>(
    `/api/v2/brain/forecast/serie`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points,
        fecha_col: 'fecha',
        valor_col: 'valor',
        horizonte_dias: opts?.horizonteDias ?? 14,
        etiqueta: opts?.etiqueta ?? 'serie',
        eventos_recientes: opts?.eventosRecientes ?? [],
        pedir_brain: true,
        pedir_escenarios: opts?.pedirEscenarios ?? false,
      }),
      cache: 'no-store',
    },
  )
  return res.data ?? null
}
