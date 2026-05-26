import { NextRequest, NextResponse } from 'next/server'
import mediosData from '@/data/medios.json'
import mediosLocalesOverlay from '@/data/medios-locales.json'
import { withMeta } from '@/lib/backend'

// GET /api/medios
//   ?tipo=Prensa|Digital|TV|Radio|Agencias|Revista
//   ?ambito=Nacional|Autonomico|Provincial|Local
//   ?ccaa=MAD|CAT|AND|...
//   ?lean=izquierda|centro|derecha
//   ?has_rss=true (solo medios con RSS configurada)
//   ?limit=N
//
// Sirve el catálogo estático de medios con filtros opcionales.
// El backend FastAPI no expone un endpoint /api/medios, así que la fuente
// de datos es siempre el JSON estático (medios.json).

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
  // Sprint G15 FASE H · enriquecido vía overlay medios-locales.json
  provincia?: string | null
  municipio?: string | null
  scope_level?: 'nacional' | 'autonomico' | 'provincial' | 'local' | 'europeo' | null
}

type OverlayEntry = { provincia?: string; municipio?: string; scope_level?: Medio['scope_level'] }
const OVERLAYS: Record<string, OverlayEntry> =
  (mediosLocalesOverlay as { overlays?: Record<string, OverlayEntry> }).overlays || {}

// Sprint G15 FASE H · deriva scope_level si no viene en overlay
function deriveScope(ambito: string | undefined, ccaa: string | null | undefined): Medio['scope_level'] {
  const a = (ambito || '').toLowerCase()
  if (a.includes('europ') || a.includes('intern')) return 'europeo'
  if (a.includes('local')) return 'local'
  if (a.includes('provincial')) return 'provincial'
  if (a.includes('auton') || ccaa) return 'autonomico'
  return 'nacional'
}

const CATALOG: Medio[] = (mediosData as { medios: Medio[] }).medios.map((m) => {
  const ov = OVERLAYS[m.id]
  return {
    ...m,
    provincia: m.provincia ?? ov?.provincia ?? null,
    municipio: m.municipio ?? ov?.municipio ?? null,
    scope_level: m.scope_level ?? ov?.scope_level ?? deriveScope(m.ambito, m.ccaa),
  }
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  let medios: Medio[] = CATALOG

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

  // Stats agregadas · enriquecidas Sprint G15 FASE H
  const ideologyBuckets = { izquierda: 0, 'centro-izquierda': 0, centro: 0, 'centro-derecha': 0, derecha: 0 }
  for (const m of medios) {
    if (m.ideologia <= -40) ideologyBuckets.izquierda++
    else if (m.ideologia <= -10) ideologyBuckets['centro-izquierda']++
    else if (m.ideologia < 10) ideologyBuckets.centro++
    else if (m.ideologia < 40) ideologyBuckets['centro-derecha']++
    else ideologyBuckets.derecha++
  }

  // Concentración por grupo (top 12)
  const porGrupoMap = countBy(medios, 'grupo')
  const porGrupo = Object.entries(porGrupoMap)
    .map(([grupo, n]) => ({
      grupo,
      n,
      share: medios.length > 0 ? n / medios.length : 0,
      audiencia_M: round1(medios.filter(m => m.grupo === grupo).reduce((s, m) => s + m.audiencia_M, 0)),
    }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)

  const stats = {
    total: medios.length,
    por_tipo: countBy(medios, 'tipo'),
    por_ambito: countBy(medios, 'ambito'),
    por_scope: countBy(medios, 'scope_level'),
    por_ccaa: countBy(medios, 'ccaa'),
    por_ideologia: ideologyBuckets,
    por_grupo: porGrupo,
    con_rss: medios.filter(m => !!m.rss).length,
    rss_share: medios.length > 0 ? medios.filter(m => !!m.rss).length / medios.length : 0,
    audiencia_total_M: round1(medios.reduce((s, m) => s + m.audiencia_M, 0)),
    credibilidad_media: medios.length > 0
      ? round1(medios.reduce((s, m) => s + (m.credibilidad <= 1 ? m.credibilidad * 100 : m.credibilidad), 0) / medios.length)
      : 0,
    n_grupos_distintos: Object.keys(porGrupoMap).length,
  }

  return NextResponse.json(withMeta({
    medios,
    stats,
  }, 'mock'))
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
