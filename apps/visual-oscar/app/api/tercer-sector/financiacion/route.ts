/**
 * /api/tercer-sector/financiacion · Dinero HACIA el tercer sector.
 * Sprint Tercer Sector v3 · TS2-orgs (route).
 *
 * Agrega financiación pública al tercer sector:
 *   - BDNS (Base de Datos Nacional de Subvenciones, keyless): convocatorias
 *     abiertas + concesiones recientes clasificadas como tercer sector.
 *   - SEDIA (EU Funding & Tenders, apiKey pública): grants UE (CERV/ESF+/Horizon
 *     social) reutilizando el conector de licitaciones.
 *   - IRPF 0,7% Fines Sociales: dato curado+datado.
 *
 * Degradación honesta por fuente. HTTP 200 aun degradado.
 * Cache: s-maxage=10800 (3h).
 */
import { NextResponse } from 'next/server'
import { fetchConcesiones, fetchConvocatorias } from '@/lib/tercer-sector/bdns'
import { fetchSedia } from '@/lib/tercer-sector/licitaciones/sedia'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// IRPF 0,7% Fines Sociales — convocatoria estatal (curado + datado).
const IRPF_07 = {
  ejercicio: 2024,
  recaudacion_estimada_meur: 396,
  beneficiarias_aprox: 500,
  fuente: 'Ministerio de Derechos Sociales · convocatoria IRPF 0,7% Fines Sociales',
  fuente_url: 'https://www.mdsocialesa2030.gob.es/derechos-sociales/ong/subvenciones.htm',
  fecha_ref: '2024',
  nota: 'Tramo estatal del 0,7% del IRPF a fines sociales. Las CCAA gestionan un tramo autonómico adicional.',
}

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  try {
    const sp = new URL(req.url).searchParams
    const pages = Math.max(1, Math.min(4, Number(sp.get('pages')) || 2))

    const [conv, conc, sedia] = await Promise.all([
      fetchConvocatorias({ pages }).catch(() => null),
      fetchConcesiones({ pages }).catch(() => null),
      fetchSedia({}).catch(() => null),
    ])

    const convocatorias = conv?.ok && conv.data ? conv.data : []
    const concesiones = conc?.ok && conc.data ? conc.data : []
    const grants_ue = sedia?.ok ? sedia.licitaciones : []

    const fuentes_error: { fuente: string; error: string }[] = []
    if (!conv?.ok) fuentes_error.push({ fuente: 'bdns_convocatorias', error: conv?.error || 'error' })
    if (!conc?.ok) fuentes_error.push({ fuente: 'bdns_concesiones', error: conc?.error || 'error' })
    if (!sedia?.ok) fuentes_error.push({ fuente: 'sedia', error: sedia?.error || 'error' })

    const total_concedido_eur = concesiones.reduce(
      (s, c: { importe_eur?: number | null }) =>
        s + (typeof c.importe_eur === 'number' ? c.importe_eur : 0),
      0,
    )

    return NextResponse.json(
      {
        ok: convocatorias.length > 0 || concesiones.length > 0 || grants_ue.length > 0,
        data: {
          convocatorias,
          concesiones,
          grants_ue,
          irpf_07: IRPF_07,
          resumen: {
            n_convocatorias: convocatorias.length,
            n_concesiones: concesiones.length,
            n_grants_ue: grants_ue.length,
            total_concedido_eur: total_concedido_eur || null,
          },
          fuentes_error,
        },
        fetched_at,
        source_url: 'https://www.infosubvenciones.es/',
        _meta: {
          source: 'tercer-sector/financiacion',
          source_label: 'BDNS subvenciones + SEDIA grants UE + IRPF 0,7%',
          cache_ttl_seconds: 10800,
          note: 'Financiación pública al tercer sector. BDNS y SEDIA en vivo (degradan por fuente); IRPF 0,7% curado+datado.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: 'https://www.infosubvenciones.es/',
      },
      { status: 200 },
    )
  }
}
