/**
 * GET /api/sectores/defensa/contratos?days=180&limit=20
 * Últimos contratos de defensa España vía TED + PLACSP/Catalunya
 * (todos los CPV que empiezan por 35 = defensa, seguridad, militar).
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchTed } from '@/lib/sources/ted'
import { searchCatalunya } from '@/lib/socrata-catalunya'
import { fetchPlacspFeed } from '@/lib/placsp'
import type { NormalizedContrato } from '@/lib/socrata-catalunya'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const days = clamp(Number(sp.get('days') || 180), 30, 730)
  const limit = clamp(Number(sp.get('limit') || 20), 5, 100)
  const t0 = Date.now()

  const desde = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [ted, ct, placsp] = await Promise.all([
    searchTed({ cpv_div: '35', desde, limit }, 8000),
    searchCatalunya({ cpv_div: '35', desde, limit, order: 'data_publicacio_contracte DESC NULL LAST' }, 8000),
    fetchPlacspFeed('licitacion', 8000),
  ])

  let items: NormalizedContrato[] = [...ted.items, ...ct.items]

  // Filtrar PLACSP a CPV 35
  for (const it of placsp.items || []) {
    if (it.cpv?.startsWith('35')) {
      items.push({
        id: `PL-${it.id}`,
        fuente: 'PLACSP',
        fuente_label: 'Plataforma Nacional',
        expediente: it.expediente,
        organo: it.organismo,
        objeto: it.titulo,
        cpv: it.cpv,
        cpv_div: it.cpv?.slice(0, 2),
        importe_licitacion: it.importe || undefined,
        estado: it.estado_label,
        fecha_publicacion: it.fecha?.slice(0, 10),
        anio: it.fecha ? Number(it.fecha.slice(0, 4)) : undefined,
        url: it.url_detalle,
        lugar_ejecucion: it.ciudad ?? undefined,
      })
    }
  }

  items.sort((a, b) => (b.fecha_publicacion || '').localeCompare(a.fecha_publicacion || ''))
  items = items.slice(0, limit)

  return NextResponse.json({
    items,
    stats: {
      por_fuente: countBy(items, 'fuente'),
      importe_total_M: Math.round(items.reduce((s, it) => s + (it.importe_adjudicacion ?? it.importe_licitacion ?? 0), 0) / 100_000) / 10,
      sources: [
        { fuente: 'TED',               ok: ted.ok, items: ted.items.length, ms: ted.ms },
        { fuente: 'CATALUNYA_SOCRATA', ok: ct.ok,  items: ct.items.length,  ms: ct.ms  },
        { fuente: 'PLACSP',            ok: placsp.ok, items: (placsp.items || []).filter(i => i.cpv?.startsWith('35')).length, ms: 0 },
      ],
      fetch_ms: Date.now() - t0,
    },
    fuente: 'TED + Catalunya Socrata + PLACSP · CPV 35',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
function countBy<T>(items: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const k = String(it[key] ?? '—')
    out[k] = (out[k] || 0) + 1
  }
  return out
}
