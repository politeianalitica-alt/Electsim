/**
 * /api/entsoe/[...path] · ENTSO-E Transparency Platform.
 *
 * Fuente: web-api.tp.entsoe.eu · datos oficiales del sistema eléctrico
 * europeo (TSOs UE) en granularidad horaria. Precios día-anterior,
 * generación por tecnología, demanda, flujos transfronterizos,
 * indisponibilidades, capacidad interconexión.
 *
 * Auth: Web API requiere `securityToken` que se activa contactando a
 *   transparency@entsoe.eu (no se genera en self-service). Mientras no
 *   esté activado, el endpoint degrada a empty state didáctico con la
 *   plantilla de email para solicitarlo.
 *
 * Rutas:
 *   GET /api/entsoe/health
 *     → Diagnóstico · ¿token activado?
 *
 *   GET /api/entsoe/spain-prices?days=7
 *     → Precios día-anterior España (SP zona, A65 document type).
 *
 *   GET /api/entsoe/spain-generation?days=1
 *     → Generación por tipo (A75) últimas 24h España.
 *
 *   GET /api/entsoe/spain-load?days=1
 *     → Demanda eléctrica España.
 *
 *   GET /api/entsoe/cross-border?neighbor=PT|FR|MA
 *     → Flujos físicos transfronterizos ES↔vecino.
 *
 * Cache HTTP 1h (granularidad horaria, no necesita ser inmediato).
 *
 * Zonas EIC España y vecinos:
 *   ES (península) · 10YES-REE------0
 *   PT             · 10YPT-REN------W
 *   FR             · 10YFR-RTE------C
 *   MA (Marruecos) · 10Y_DOM-1001A1064L (cross-border ES-MA)
 */
import { NextResponse } from 'next/server'

export const revalidate = 3600

const ENTSOE_API = 'https://web-api.tp.entsoe.eu/api'

const EIC = {
  ES: '10YES-REE------0',
  PT: '10YPT-REN------W',
  FR: '10YFR-RTE------C',
  MA: '10Y_DOM-1001A1064L',
}

// Mapping de PSR Types (Power System Resource) a etiquetas humanas
const PSR_TYPE_LABELS: Record<string, string> = {
  B01: 'Biomasa',
  B02: 'Lignito',
  B03: 'Gas (turbina ciclo abierto)',
  B04: 'Gas (ciclo combinado)',
  B05: 'Hulla',
  B06: 'Gasoil',
  B07: 'Shale gas',
  B08: 'Turba',
  B09: 'Geotérmica',
  B10: 'Hidro embalse',
  B11: 'Hidro fluyente',
  B12: 'Hidro bombeo',
  B13: 'Marina',
  B14: 'Nuclear',
  B15: 'Otras renovables',
  B16: 'Solar',
  B17: 'Residuos',
  B18: 'Eólica offshore',
  B19: 'Eólica onshore',
  B20: 'Otras',
  B25: 'Almacenamiento energía',
}

function quality(t: 'live' | 'cache' | 'missing', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

function fmtPeriodUTC(d: Date): string {
  // YYYYMMDDHHmm en UTC, formato ENTSO-E
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}00`
}

interface EntsoeQuery {
  documentType: string
  in_Domain?: string
  out_Domain?: string
  periodStart: string
  periodEnd: string
  processType?: string
  psrType?: string
  contract_MarketAgreement_Type?: string
}

async function entsoeFetch(q: EntsoeQuery): Promise<{ ok: boolean; xml?: string; error?: string }> {
  const token = process.env.ENTSOE_API_KEY
  if (!token) {
    return { ok: false, error: 'no_token' }
  }
  const params = new URLSearchParams({
    securityToken: token,
    ...Object.fromEntries(
      Object.entries(q).filter(([, v]) => v !== undefined) as [string, string][],
    ),
  })
  try {
    const r = await fetch(`${ENTSOE_API}?${params}`, {
      headers: { Accept: 'application/xml' },
      next: { revalidate: 3600 },
    } as RequestInit)
    if (r.status === 401 || r.status === 403) {
      return { ok: false, error: `unauthorized HTTP ${r.status}` }
    }
    if (r.status === 429) return { ok: false, error: 'rate_limited' }
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
    const text = await r.text()
    return { ok: true, xml: text }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 160) }
  }
}

/**
 * Parser simple para extraer Points de un XML ENTSO-E.
 * Estructura típica: <TimeSeries> <Period> <timeInterval> <start/> <end/> </timeInterval>
 *                    <resolution>PT60M</resolution> <Point> <position/> <quantity|price.amount/> </Point>...
 */
interface ParsedPoint {
  position: number
  value: number
  timestamp?: string
  psrType?: string
}

function extractPoints(xml: string, valueTag: 'quantity' | 'price.amount'): ParsedPoint[] {
  const points: ParsedPoint[] = []
  // Extraer cada TimeSeries por separado para asociar psrType
  const tsRegex = /<TimeSeries>([\s\S]*?)<\/TimeSeries>/g
  let tsMatch: RegExpExecArray | null
  while ((tsMatch = tsRegex.exec(xml)) !== null) {
    const tsBody = tsMatch[1]
    const psrMatch = /<psrType>([^<]+)<\/psrType>/.exec(tsBody)
    const psrType = psrMatch?.[1]
    const startMatch = /<start>([^<]+)<\/start>/.exec(tsBody)
    const startIso = startMatch?.[1]
    const resMatch = /<resolution>PT(\d+)M<\/resolution>/.exec(tsBody)
    const stepMin = resMatch ? parseInt(resMatch[1], 10) : 60
    const startMs = startIso ? Date.parse(startIso) : 0

    const pointRegex = /<Point>\s*<position>(\d+)<\/position>\s*<(?:quantity|price\.amount)>([\d.-]+)<\/(?:quantity|price\.amount)>\s*<\/Point>/g
    void valueTag // we accept either tag in regex
    let pMatch: RegExpExecArray | null
    while ((pMatch = pointRegex.exec(tsBody)) !== null) {
      const position = parseInt(pMatch[1], 10)
      const value = parseFloat(pMatch[2])
      const ts = startMs ? new Date(startMs + (position - 1) * stepMin * 60_000).toISOString() : undefined
      points.push({ position, value, timestamp: ts, psrType })
    }
  }
  return points
}

function emptyStateNoToken(action: string) {
  return NextResponse.json({
    ok: false,
    data_quality: quality(
      'missing',
      'ENTSO-E Transparency',
      'ENTSOE_API_KEY no configurada · contactar transparency@entsoe.eu',
    ),
    action,
    activation_steps: [
      '1. Cuenta creada en transparency.entsoe.eu (politeianalitica@gmail.com) ✓',
      '2. File Library accesible vía username+password ✓',
      '3. ⏳ Web API token NO activado · escribir a transparency@entsoe.eu solicitando',
      '   Web API access. Plantilla email en /datos categoría "energia" entrada "entsoe".',
      '4. Cuando llegue el security token, pegar en Vercel env ENTSOE_API_KEY y este',
      '   endpoint pasará de empty state a LIVE automáticamente.',
    ],
    file_library_available: !!process.env.ENTSOE_USERNAME && !!process.env.ENTSOE_PASSWORD,
  })
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]
  const hasToken = !!process.env.ENTSOE_API_KEY

  // /api/entsoe/health
  if (action === 'health') {
    if (!hasToken) {
      return NextResponse.json({
        ok: false,
        web_api_status: 'token_not_configured',
        has_username: !!process.env.ENTSOE_USERNAME,
        has_password: !!process.env.ENTSOE_PASSWORD,
        has_api_key: false,
        file_library_creds: 'ready',
        web_api_creds: 'pending · contact transparency@entsoe.eu',
      })
    }
    // probe simple: precios próximas 24h
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 3600_000)
    const probe = await entsoeFetch({
      documentType: 'A65',
      in_Domain: EIC.ES,
      out_Domain: EIC.ES,
      processType: 'A01',
      periodStart: fmtPeriodUTC(now),
      periodEnd: fmtPeriodUTC(tomorrow),
    })
    return NextResponse.json({
      ok: probe.ok,
      web_api_status: probe.ok ? 'live' : 'error',
      has_api_key: true,
      probe_result: probe.ok ? 'OK · XML received' : probe.error,
    })
  }

  if (!hasToken) {
    return emptyStateNoToken(action)
  }

  // /api/entsoe/spain-prices
  if (action === 'spain-prices') {
    const days = parseInt(url.searchParams.get('days') || '7', 10)
    const periodEnd = new Date()
    periodEnd.setUTCHours(periodEnd.getUTCHours() + 23, 0, 0, 0)
    const periodStart = new Date(periodEnd.getTime() - days * 24 * 3600_000)
    const data = await entsoeFetch({
      documentType: 'A44', // Day-ahead prices
      in_Domain: EIC.ES,
      out_Domain: EIC.ES,
      periodStart: fmtPeriodUTC(periodStart),
      periodEnd: fmtPeriodUTC(periodEnd),
    })
    if (!data.ok) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ENTSO-E', data.error),
      })
    }
    const points = extractPoints(data.xml || '', 'price.amount')
    const values = points.map((p) => p.value).filter((v) => !isNaN(v))
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
    const max = values.length ? Math.max(...values) : null
    const min = values.length ? Math.min(...values) : null
    return NextResponse.json({
      ok: true,
      country: 'ES',
      days,
      data_quality: quality('live', 'ENTSO-E · Day-ahead prices'),
      n_points: points.length,
      stats: {
        avg_eur_mwh: avg ? +avg.toFixed(2) : null,
        max_eur_mwh: max,
        min_eur_mwh: min,
      },
      points: points.slice(0, 200),
    })
  }

  // /api/entsoe/spain-generation
  if (action === 'spain-generation') {
    const days = parseInt(url.searchParams.get('days') || '1', 10)
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - days * 24 * 3600_000)
    const data = await entsoeFetch({
      documentType: 'A75', // Actual generation per type
      in_Domain: EIC.ES,
      processType: 'A16', // Realised
      periodStart: fmtPeriodUTC(periodStart),
      periodEnd: fmtPeriodUTC(periodEnd),
    })
    if (!data.ok) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ENTSO-E', data.error),
      })
    }
    const points = extractPoints(data.xml || '', 'quantity')
    // Agrupa por psrType, suma MWh
    const byPsr: Record<string, number> = {}
    for (const p of points) {
      if (!p.psrType) continue
      byPsr[p.psrType] = (byPsr[p.psrType] || 0) + p.value
    }
    const breakdown = Object.entries(byPsr)
      .map(([psr, mwh]) => ({
        psr_type: psr,
        label: PSR_TYPE_LABELS[psr] || psr,
        mwh: +mwh.toFixed(1),
      }))
      .sort((a, b) => b.mwh - a.mwh)
    return NextResponse.json({
      ok: true,
      country: 'ES',
      days,
      data_quality: quality('live', 'ENTSO-E · Actual generation per type'),
      n_points: points.length,
      breakdown,
      total_mwh: breakdown.reduce((a, b) => a + b.mwh, 0),
    })
  }

  // /api/entsoe/spain-load
  if (action === 'spain-load') {
    const days = parseInt(url.searchParams.get('days') || '1', 10)
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - days * 24 * 3600_000)
    const data = await entsoeFetch({
      documentType: 'A65', // System total load
      processType: 'A16',
      out_Domain: EIC.ES,
      periodStart: fmtPeriodUTC(periodStart),
      periodEnd: fmtPeriodUTC(periodEnd),
    })
    if (!data.ok) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ENTSO-E', data.error),
      })
    }
    const points = extractPoints(data.xml || '', 'quantity')
    return NextResponse.json({
      ok: true,
      country: 'ES',
      days,
      data_quality: quality('live', 'ENTSO-E · Actual load'),
      n_points: points.length,
      points: points.slice(0, 200),
    })
  }

  // /api/entsoe/cross-border?neighbor=PT|FR|MA
  if (action === 'cross-border') {
    const neighbor = (url.searchParams.get('neighbor') || 'FR').toUpperCase() as keyof typeof EIC
    if (!EIC[neighbor] || neighbor === 'ES') {
      return NextResponse.json({ ok: false, error: 'neighbor must be PT, FR, or MA' })
    }
    const days = parseInt(url.searchParams.get('days') || '1', 10)
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - days * 24 * 3600_000)
    const [esOut, esIn] = await Promise.all([
      entsoeFetch({
        documentType: 'A11', // Physical flows
        in_Domain: EIC[neighbor],
        out_Domain: EIC.ES,
        periodStart: fmtPeriodUTC(periodStart),
        periodEnd: fmtPeriodUTC(periodEnd),
      }),
      entsoeFetch({
        documentType: 'A11',
        in_Domain: EIC.ES,
        out_Domain: EIC[neighbor],
        periodStart: fmtPeriodUTC(periodStart),
        periodEnd: fmtPeriodUTC(periodEnd),
      }),
    ])
    if (!esOut.ok && !esIn.ok) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ENTSO-E', esOut.error || esIn.error),
      })
    }
    const flowOut = extractPoints(esOut.xml || '', 'quantity')
    const flowIn = extractPoints(esIn.xml || '', 'quantity')
    const sumOut = flowOut.reduce((a, p) => a + p.value, 0)
    const sumIn = flowIn.reduce((a, p) => a + p.value, 0)
    return NextResponse.json({
      ok: true,
      neighbor,
      days,
      data_quality: quality('live', 'ENTSO-E · Physical flows'),
      es_export_mwh: +sumOut.toFixed(1),
      es_import_mwh: +sumIn.toFixed(1),
      net_balance_mwh: +(sumOut - sumIn).toFixed(1),
      net_direction: sumOut > sumIn ? `ES → ${neighbor}` : `${neighbor} → ES`,
      sample_export_points: flowOut.slice(0, 24),
      sample_import_points: flowIn.slice(0, 24),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/entsoe/health',
        'GET /api/entsoe/spain-prices?days=7',
        'GET /api/entsoe/spain-generation?days=1',
        'GET /api/entsoe/spain-load?days=1',
        'GET /api/entsoe/cross-border?neighbor=PT|FR|MA&days=1',
      ],
    },
    { status: 404 },
  )
}
