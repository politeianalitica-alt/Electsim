/**
 * /api/tercer-sector/organizaciones · Directorio de ONGs/entidades del tercer
 * sector. Sprint Tercer Sector v3 · TS2-orgs (route).
 *
 * Sirve el catálogo de `lib/tercer-sector/organizaciones-catalog.ts` con filtros
 * (tipo, sector, ccaa, ambito, q) + paginación + facetas. El catálogo es curado
 * y datado (cada entrada con `fuente`/`fecha_ref`); los importes null NO se
 * inventan. La vista TS4 enriquece con datos vivos (BDNS/IATI) por entidad.
 *
 * Query: tipo, sector, ccaa, ambito, q, page, pageSize, sort(ingresos|nombre).
 * Cache: s-maxage=86400 (catálogo curado · cambia poco).
 */
import { NextResponse } from 'next/server'
import {
  ORGANIZACIONES,
  ORGANIZACIONES_COUNT,
  catalogCcaa,
  catalogSectores,
  catalogTipos,
  type Organizacion,
} from '@/lib/tercer-sector/organizaciones-catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  try {
    const sp = new URL(req.url).searchParams
    const tipo = (sp.get('tipo') || '').trim()
    const sector = (sp.get('sector') || '').trim()
    const ccaa = (sp.get('ccaa') || '').trim()
    const ambito = (sp.get('ambito') || '').trim()
    const q = (sp.get('q') || '').trim().toLowerCase()
    const sort = (sp.get('sort') || 'ingresos').trim()
    const page = clampInt(sp.get('page'), 1, 1, 10000)
    const pageSize = clampInt(sp.get('pageSize'), 24, 1, 100)

    let rows: Organizacion[] = ORGANIZACIONES.filter((o) => {
      if (tipo && o.tipo !== tipo) return false
      if (sector && o.sector !== sector) return false
      if (ccaa && o.ccaa !== ccaa) return false
      if (ambito && o.ambito !== ambito) return false
      if (q) {
        const hay = `${o.nombre || ''} ${o.sector || ''} ${o.nif || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    if (sort === 'nombre') {
      rows = rows.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    } else {
      // ingresos desc; null al final
      rows = rows.slice().sort((a, b) => (b.ingresos_eur ?? -1) - (a.ingresos_eur ?? -1))
    }

    const total = rows.length
    const start = (page - 1) * pageSize
    const pageItems = rows.slice(start, start + pageSize)

    return NextResponse.json(
      {
        ok: true,
        data: {
          organizaciones: pageItems,
          total,
          page,
          page_size: pageSize,
          catalogo_total: ORGANIZACIONES_COUNT,
          facetas: {
            tipos: catalogTipos(),
            sectores: catalogSectores(),
            ccaa: catalogCcaa(),
          },
          source: 'catalog',
        },
        fetched_at,
        source_url: 'https://www.plataformatercersector.es/',
        _meta: {
          source: 'tercer-sector/organizaciones',
          cache_ttl_seconds: 86400,
          note: 'Directorio curado y datado del tercer sector (fuente/fecha por entidad). Importes null no se inventan. Enriquecimiento vivo (BDNS/IATI) en la ficha.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: 'https://www.plataformatercersector.es/',
      },
      { status: 200 },
    )
  }
}
