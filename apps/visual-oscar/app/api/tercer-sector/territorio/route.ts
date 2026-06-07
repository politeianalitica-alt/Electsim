/**
 * /api/tercer-sector/territorio · Capa TERRITORIAL del cockpit de Tercer Sector.
 * Sprint TS-Cockpit W1c (route).
 *
 * Devuelve una foto por CCAA cruzando: catálogo de organizaciones (presencia,
 * ingresos, empleados), concesiones + convocatorias BDNS (dinero recibido y
 * oportunidades abiertas) y licitaciones PLACE/BDNS (contratos + compradores).
 * Calcula rankings (sectores/compradores/beneficiarios) y ALERTAS de hueco.
 *
 * Toda la red la hace `fetchTerritorio` con degradación honesta por fuente:
 * una fuente caída no tumba la respuesta (HTTP 200 aun degradado), se reporta
 * en `fuentes_error`. El catálogo de organizaciones es local → siempre hay al
 * menos la foto de presencia de entidades.
 *
 * Importes: NO se inventan; los agregados sin dato son `null` (regla CLAUDE.md).
 *
 * LEY VERCEL HOBBY: maxDuration = 30 (config existente; no crea función nueva).
 * Cache: s-maxage=10800 (3h · la foto territorial cambia despacio).
 */
import { NextResponse } from 'next/server'
import { fetchTerritorio } from '@/lib/tercer-sector/territorio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const SOURCE_URL = 'https://www.infosubvenciones.es/'

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  try {
    const sp = new URL(req.url).searchParams
    const pages = Math.max(1, Math.min(8, Number(sp.get('pages')) || 3))
    const topN = Math.max(1, Math.min(20, Number(sp.get('topN')) || 5))

    const { territorios, fuentes_ok, fuentes_error, detalle_fuentes } =
      await fetchTerritorio({ pages, buildOpts: { topN } })

    // Resumen agregado (contadores reales; importes null-safe a nivel nacional).
    const total_entidades = territorios.reduce((s, t) => s + t.entidades, 0)
    const total_concesiones = territorios.reduce((s, t) => s + t.concesiones, 0)
    const total_convocatorias = territorios.reduce(
      (s, t) => s + t.convocatorias_abiertas,
      0,
    )
    const total_licitaciones = territorios.reduce((s, t) => s + t.licitaciones, 0)
    const total_alertas = territorios.reduce((s, t) => s + t.alertas.length, 0)
    const ccaa_con_alertas = territorios.filter((t) => t.alertas.length > 0).length

    return NextResponse.json(
      {
        ok: territorios.length > 0,
        data: {
          territorios,
          total_ccaa: territorios.length,
          fuentes_ok,
          fuentes_error,
          resumen: {
            total_entidades,
            total_concesiones,
            total_convocatorias,
            total_licitaciones,
            total_alertas,
            ccaa_con_alertas,
          },
        },
        fetched_at,
        source_url: SOURCE_URL,
        _meta: {
          source: 'tercer-sector/territorio',
          source_label:
            'Catálogo ONGs + BDNS (concesiones/convocatorias) + licitaciones PLACE/BDNS, agregado por CCAA',
          cache_ttl_seconds: 10800,
          fuentes_detalle: detalle_fuentes,
          note: 'Foto territorial del tercer sector por comunidad autónoma. Importes null cuando la fuente no los informa (no se inventan). Alertas de hueco: (1) muchas entidades + poca financiación reciente; (2) muchas convocatorias + poca presencia de entidades del catálogo. Degradación honesta por fuente (fuentes_error).',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600',
        },
      },
    )
  } catch (e: unknown) {
    // Salvaguarda final: HTTP 200 con envelope degradado (nunca 500).
    return NextResponse.json(
      {
        ok: false,
        data: {
          territorios: [],
          total_ccaa: 0,
          fuentes_ok: [],
          fuentes_error: [{ fuente: 'territorio', error: String((e as Error)?.message ?? e) }],
        },
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: SOURCE_URL,
      },
      { status: 200 },
    )
  }
}
