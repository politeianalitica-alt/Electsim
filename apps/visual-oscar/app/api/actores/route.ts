import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { ACTORES as FIXTURE_ACTORES } from '@/data/actores-fixture'
import type { Categoria, ActorVO } from '@/lib/actor-utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Backend → /api/actors devuelve `Actor[]` con shape distinto. Adaptamos
// al shape `ActorVO` que la UI espera. Si el backend no responde, usamos
// el fixture local (con _meta.source='mock' para señalar la fuente).
interface BackendActor {
  id: string
  name: string
  party: string | null
  role: string | null
  party_color: string
  relevance_score: number
  exposure: number
  approval: number
  sentiment: 'up' | 'down' | 'stable'
  mention_count_24h: number
  mention_count_7d: number
}

function mapBackend(a: BackendActor): ActorVO {
  // Cat por defecto: parlamento; el backend aún no exporta cat directa.
  return {
    id: a.id,
    nombre: a.name,
    partido: a.party ?? 'Independiente',
    cargo: a.role ?? '',
    cat: 'parlamento' as Categoria,
    color: a.party_color ?? '#6e6e73',
    ejeX: 0,
    ejeY: 0,
    val: Math.max(0, Math.min(10, a.approval * 10)),
    delta: a.sentiment === 'up' ? 0.3 : a.sentiment === 'down' ? -0.3 : 0,
    inf: Math.max(0, Math.min(100, a.relevance_score * 100)),
    forts: [],
    debs: [],
    evs: [],
    seg: {
      f: String(a.mention_count_24h ?? 0),
      eng: `${Math.round(a.exposure * 100)}%`,
      tono: a.sentiment === 'up' ? 0.5 : a.sentiment === 'down' ? -0.5 : 0,
    },
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const cat = url.searchParams.get('cat')
  const search = url.searchParams.get('search')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '500', 10), 1000)

  // Intento backend real
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', String(limit))
  const result = await callBackend<BackendActor[]>(`/api/actors?${params}`)

  if (Array.isArray(result.data) && result.data.length > 0) {
    let items = result.data.map(mapBackend)
    if (cat && cat !== 'Todos') items = items.filter(a => a.cat === cat)
    return NextResponse.json(
      withMeta({ items, total: items.length }, 'backend', { latency_ms: result.latency_ms }),
    )
  }

  // Fallback: fixture local (los 300+ actores curados). El _meta.source='mock'
  // hace que la UI muestre el badge "DATOS DE DEMO".
  let items = FIXTURE_ACTORES as ActorVO[]
  if (cat && cat !== 'Todos') items = items.filter(a => a.cat === cat)
  if (search) {
    const q = search.toLowerCase()
    items = items.filter(a => a.nombre.toLowerCase().includes(q) || a.partido.toLowerCase().includes(q))
  }
  items = items.slice(0, limit)
  return NextResponse.json(
    withMeta({ items, total: items.length }, 'mock', {
      warnings: result.error ? [`backend_unreachable:${result.error}`] : ['empty_backend'],
      latency_ms: result.latency_ms,
    }),
  )
}
