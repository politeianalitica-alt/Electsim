import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/rag/search → proxy hacia /api/rag/search del backend
// Body: { query: string, domains?: string[], k?: number }

export interface RagCitation {
  /** Identificador del documento original (ej. "boe:BOE-A-2026-12345"). */
  id: string
  /** Texto resumido del fragmento más relevante. */
  snippet: string
  /** Fuente legible (ej. "BOE", "Congreso", "EUR-Lex"). */
  source: string
  /** Dominio: "legislativo" | "legislativo_ue" | "medios" | etc. */
  domain?: string
  /** URL canónica para enlazar al original. */
  url?: string
  /** Score de relevancia [0,1]. */
  score?: number
  /** Título del documento. */
  title?: string
  /** Fecha publicación. */
  published_at?: string
}

interface SearchRequest {
  query: string
  domains?: string[]
  k?: number
}

interface BackendSearchResponse {
  query: string
  items: Array<{
    id?: string
    snippet?: string
    text?: string
    source?: string
    domain?: string
    url?: string
    score?: number
    title?: string
    published_at?: string
    metadata?: Record<string, unknown>
  }>
  total: number
}

function adaptCitation(r: BackendSearchResponse['items'][number]): RagCitation {
  const meta = (r.metadata ?? {}) as Record<string, string>
  return {
    id: r.id ?? meta.object_id ?? 'unknown',
    snippet: (r.snippet ?? r.text ?? '').slice(0, 500),
    source: r.source ?? meta.source ?? 'unknown',
    domain: r.domain ?? meta.domain,
    url: r.url ?? meta.url,
    score: r.score,
    title: r.title ?? meta.title,
    published_at: r.published_at ?? meta.published_at,
  }
}

export async function POST(req: Request) {
  let body: SearchRequest
  try {
    body = (await req.json()) as SearchRequest
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.query || body.query.length < 2) {
    return NextResponse.json({ error: 'query_too_short' }, { status: 400 })
  }

  const result = await callBackend<BackendSearchResponse>('/api/rag/search', {
    method: 'POST',
    body: JSON.stringify({ query: body.query, domains: body.domains, k: body.k ?? 6 }),
  })

  if (result.data && Array.isArray(result.data.items)) {
    const citations = result.data.items.map(adaptCitation)
    return NextResponse.json(
      withMeta(
        { query: body.query, citations, total: citations.length },
 'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback honesto: array vacío con warning. La UI muestra el badge mock.
  return NextResponse.json(
    withMeta(
      { query: body.query, citations: [] as RagCitation[], total: 0 },
 'mock',
      {
        warnings: result.error
          ? [`backend_unreachable:${result.error}`]
          : ['rag_index_empty_or_unavailable'],
        latency_ms: result.latency_ms,
      },
    ),
  )
}
