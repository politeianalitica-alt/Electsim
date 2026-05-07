import { NextRequest, NextResponse } from 'next/server'
import mediosData from '@/data/medios.json'
import { fromBackend, withMeta, backendConfigured } from '@/lib/backend'

// GET /api/medios
//   ?tipo=Prensa|Digital|TV|Radio|Agencias|Revista
//   ?ambito=Nacional|Autonomico|Provincial|Local
//   ?ccaa=MAD|CAT|AND|...
//   ?lean=izquierda|centro|derecha
//   ?has_rss=true (solo medios con RSS configurada)
//   ?limit=N
//
// Si BACKEND_URL está configurada y responde a /api/medios, mezcla esos
// datos con el catálogo estático (preferencia: backend para campos solapados).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Medio {
  id: string
  nombre: string
  grupo: string
  tipo: string
  ambito: string
  ccaa: string | null
  ideologia: number
  audiencia_M: number
  credibilidad: number
  rss: string | null
  web: string
  color?: string
}

const CATALOG: Medio[] = (mediosData as { medios: Medio[] }).medios

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  let medios: Medio[] = CATALOG

  // Intenta complementar con backend (no bloqueante: si falla, seguimos con estático)
  if (backendConfigured()) {
    const real = await fromBackend<{ medios: Medio[] }>('/api/medios')
    if (real?.medios && Array.isArray(real.medios)) {
      // Mezcla: backend gana en colisión por id
      const map = new Map<string, Medio>()
      for (const m of CATALOG) map.set(m.id, m)
      for (const m of real.medios) map.set(m.id, m)
      medios = Array.from(map.values())
    }
  }

  // Filtros
  const tipo = searchParams.get('tipo')
  const ambito = searchParams.get('ambito')
  const ccaa = searchParams.get('ccaa')
  const lean = searchParams.get('lean')
  const hasRss = searchParams.get('has_rss')
  const limit = Number(searchParams.get('limit') || 1000)

  if (tipo)   medios = medios.filter(m => m.tipo === tipo)
  if (ambito) medios = medios.filter(m => m.ambito === ambito)
  if (ccaa)   medios = medios.filter(m => m.ccaa === ccaa)
  if (hasRss === 'true') medios = medios.filter(m => !!m.rss)
  if (lean) {
    if (lean === 'izquierda') medios = medios.filter(m => m.ideologia < -20)
    else if (lean === 'derecha') medios = medios.filter(m => m.ideologia > 20)
    else if (lean === 'centro') medios = medios.filter(m => m.ideologia >= -20 && m.ideologia <= 20)
  }

  // Orden por audiencia desc por defecto
  medios.sort((a, b) => b.audiencia_M - a.audiencia_M)
  if (limit) medios = medios.slice(0, limit)

  // Stats agregadas
  const stats = {
    total: medios.length,
    por_tipo: countBy(medios, 'tipo'),
    por_ambito: countBy(medios, 'ambito'),
    con_rss: medios.filter(m => !!m.rss).length,
    audiencia_total_M: round1(medios.reduce((s, m) => s + m.audiencia_M, 0)),
  }

  return NextResponse.json(withMeta({
    medios,
    stats,
  }, backendConfigured() ? 'backend' : 'mock'))
}

function countBy<K extends keyof Medio>(items: Medio[], key: K): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const v = String(it[key] ?? 'null')
    out[v] = (out[v] || 0) + 1
  }
  return out
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
