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
import { fetchConcesiones, fetchConvocatorias, rankBeneficiarios } from '@/lib/tercer-sector/bdns'
import { enrichConcesion } from '@/lib/tercer-sector/bdns-enrichment'
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
    const concesionesRaw = conc?.ok && conc.data ? conc.data : []
    const grants_ue = sedia?.ok ? sedia.licitaciones : []

    const fuentes_error: { fuente: string; error: string }[] = []
    if (!conv?.ok) fuentes_error.push({ fuente: 'bdns_convocatorias', error: conv?.error || 'error' })
    if (!conc?.ok) fuentes_error.push({ fuente: 'bdns_concesiones', error: conc?.error || 'error' })
    if (!sedia?.ok) fuentes_error.push({ fuente: 'sedia', error: sedia?.error || 'error' })

    // TS-Deep B6: Enrich concesiones with NIF classification, TS detection, territory
    const concesiones_enriched = concesionesRaw.map((c) =>
      enrichConcesion({
        codigo: c.id,
        beneficiario: c.beneficiario_nombre,
        nif: c.beneficiario_nif,
        importe_eur: c.importe_eur,
        organo: c.organo,
      }),
    )

    // Filter to tercer sector only for enriched view
    const concesiones_ts = concesiones_enriched.filter((c) => c.es_tercer_sector)

    const total_concedido_eur = concesionesRaw.reduce(
      (s, c: { importe_eur?: number | null }) =>
        s + (typeof c.importe_eur === 'number' ? c.importe_eur : 0),
      0,
    )

    // TS-Deep B6: Financiadores activos (top organs by count+amount)
    const financiadores: Record<string, { organo: string; count: number; total_eur: number; nivel: string }> = {}
    for (const c of concesiones_ts) {
      const key = c.organo || 'desconocido'
      if (!financiadores[key]) {
        financiadores[key] = { organo: key, count: 0, total_eur: 0, nivel: c.nivel }
      }
      financiadores[key].count++
      financiadores[key].total_eur += c.importe_eur ?? 0
    }
    const financiadores_activos = Object.values(financiadores)
      .sort((a, b) => b.total_eur - a.total_eur)
      .slice(0, 20)

    // TS-Deep B6: Territory breakdown
    const por_territorio: Record<string, { count: number; total_eur: number }> = {}
    for (const c of concesiones_ts) {
      const key = c.ccaa || c.nivel || 'otro'
      if (!por_territorio[key]) por_territorio[key] = { count: 0, total_eur: 0 }
      por_territorio[key].count++
      por_territorio[key].total_eur += c.importe_eur ?? 0
    }

    // Ranking de beneficiarios TS
    const ranking_beneficiarios = rankBeneficiarios(
      concesionesRaw.filter((c) => c.es_tercer_sector),
      20,
    )

    return NextResponse.json(
      {
        ok: convocatorias.length > 0 || concesionesRaw.length > 0 || grants_ue.length > 0,
        data: {
          convocatorias,
          concesiones: concesionesRaw,
          concesiones_ts,
          grants_ue,
          irpf_07: IRPF_07,
          financiadores_activos,
          ranking_beneficiarios,
          por_territorio,
          resumen: {
            n_convocatorias: convocatorias.length,
            n_concesiones: concesionesRaw.length,
            n_concesiones_ts: concesiones_ts.length,
            n_grants_ue: grants_ue.length,
            total_concedido_eur: total_concedido_eur || null,
            total_concedido_ts_eur: concesiones_ts.reduce(
              (s, c) => s + (c.importe_eur ?? 0),
              0,
            ) || null,
          },
          fuentes_error,
        },
        fetched_at,
        source_url: 'https://www.infosubvenciones.es/',
        _meta: {
          source: 'tercer-sector/financiacion',
          source_label: 'BDNS subvenciones + SEDIA grants UE + IRPF 0,7%',
          cache_ttl_seconds: 10800,
          note:
            'Financiacion publica al tercer sector. BDNS y SEDIA en vivo (degradan por fuente); ' +
            'IRPF 0,7% curado+datado. concesiones_ts: solo tercer sector enriquecido (NIF+keyword). ' +
            'financiadores_activos: top 20 organos por importe. por_territorio: distribucion CCAA.',
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
