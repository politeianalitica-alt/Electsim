/**
 * /api/bde/[...path] · Banco de España · webstat / Boletín Estadístico.
 *
 * Sprint N15 · Source: bde.es webstat CSV API
 * https://app.bde.es/webstat/api/series/{SeriesCode}/format/csv
 *
 * Cubre series clave NO disponibles vía Eurostat:
 *  - EURIBOR (3M, 6M, 12M) mensual
 *  - Tipos hipotecarios medios nuevas operaciones
 *  - NPL banca · CET1 · ratio crédito/depósitos
 *  - Tenedores extranjeros deuda pública
 *  - Cuentas financieras AAPP/hogares/empresas
 *  - Remesas emigrantes
 *
 * Rutas:
 *   GET /api/bde/series/{seriesCode}?n=24  → últimos N puntos de una serie
 *   GET /api/bde/euribor                    → snapshot 3M+6M+12M
 *   GET /api/bde/tipos-hipotecarios         → tipo medio hipoteca nuevo
 *   GET /api/bde/health                     → diagnóstico endpoint
 *
 * BdE webstat es CSV plano sin auth. Cache 6h.
 */
import { NextResponse } from 'next/server'

export const revalidate = 21600 // 6h
export const runtime = 'nodejs'

const BDE_BASE = 'https://app.bde.es/webstat/api/series'

// Series clave verificadas BdE Boletín Estadístico
const BDE_SERIES = {
  // EURIBOR (Capítulo 19 · tipos interés)
  EURIBOR_3M: 'TI_1_1.4',
  EURIBOR_6M: 'TI_1_1.5',
  EURIBOR_12M: 'TI_1_1.6',
  // Hipotecas (Capítulo 19 · tipos)
  HIPOTECA_VIVIENDA: 'TI_1_1240',
  PRESTAMO_EMPRESAS_PEQ: 'TI_1_1245',
  // Deuda Tesoro (Capítulo 11 · deuda Estado)
  DEUDA_NO_RESIDENTES_PCT: 'BE_11_3.4',
  // Banca (Capítulo 4 · entidades crédito)
  CREDITO_NPL_RATIO: 'BE_4_18',
}

async function bdeFetch(seriesCode: string): Promise<any[]> {
  try {
    const url = `${BDE_BASE}/${seriesCode}/format/csv`
    const r = await fetch(url, {
      headers: { Accept: 'text/csv' },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (!r.ok) return []
    const csv = await r.text()
    // BdE CSV: encabezado + lines "fecha;valor"
    const lines = csv.split('\n').filter((l) => l.trim() && !l.startsWith('"'))
    const rows: { period: string; value: number | null }[] = []
    for (const line of lines.slice(1)) {
      const [datePart, valPart] = line.split(/[;,]/).map((s) => s.trim().replace(/"/g, ''))
      if (!datePart) continue
      const value = valPart ? Number(valPart.replace(',', '.')) : null
      if (datePart.match(/^\d{4}/)) {
        rows.push({ period: datePart.slice(0, 10), value: Number.isFinite(value) ? value : null })
      }
    }
    return rows.filter((r) => r.value != null)
  } catch {
    return []
  }
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    const probe = await bdeFetch(BDE_SERIES.EURIBOR_3M)
    return NextResponse.json({
      ok: probe.length > 0,
      auth_required: false,
      n_points_probe: probe.length,
      last_value: probe[probe.length - 1] ?? null,
      base_url: BDE_BASE,
    })
  }

  // /api/bde/series/{code}?n=24
  if (action === 'series' && segs[1]) {
    const code = segs[1]
    const n = Number(url.searchParams.get('n') || 60)
    const points = await bdeFetch(code)
    return NextResponse.json({
      ok: points.length > 0,
      series_code: code,
      n_points: points.length,
      points: points.slice(-n),
      source: 'BdE · webstat',
    })
  }

  // /api/bde/euribor → snapshot 3 plazos
  if (action === 'euribor') {
    const [m3, m6, m12] = await Promise.all([
      bdeFetch(BDE_SERIES.EURIBOR_3M),
      bdeFetch(BDE_SERIES.EURIBOR_6M),
      bdeFetch(BDE_SERIES.EURIBOR_12M),
    ])
    return NextResponse.json({
      ok: m3.length > 0 || m6.length > 0 || m12.length > 0,
      EURIBOR_3M: m3[m3.length - 1] ?? null,
      EURIBOR_6M: m6[m6.length - 1] ?? null,
      EURIBOR_12M: m12[m12.length - 1] ?? null,
      n_points: { m3: m3.length, m6: m6.length, m12: m12.length },
    })
  }

  return NextResponse.json({
    ok: false,
    available_endpoints: [
      'GET /api/bde/health',
      'GET /api/bde/series/{code}?n=24',
      'GET /api/bde/euribor',
    ],
    series_curated: Object.entries(BDE_SERIES).map(([k, v]) => `${k} = ${v}`),
  }, { status: 404 })
}
