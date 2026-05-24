/**
 * /api/aemet/[...path] · AEMET · OpenData clima España.
 *
 * Sprint N15 · Fuente: opendata.aemet.es
 * Requiere API key gratuita (registro instantáneo · 1 año validez).
 * Env var: AEMET_API_KEY
 *
 * AEMET API tiene patrón 2-step:
 *  1. GET endpoint con header api_key → devuelve {datos: URL, metadatos: URL}
 *  2. GET URL de `datos` → JSON con los valores reales
 *
 * Rutas implementadas:
 *   GET /api/aemet/health
 *   GET /api/aemet/precipitacion-ccaa?ccaa=AND  → últimos 30 días por CCAA
 *   GET /api/aemet/temperatura-ccaa?ccaa=AND    → últimas tmax/tmin
 *   GET /api/aemet/spi?ccaa=AND                 → SPI proxy (precip 12m)
 *
 * Sin API key: degradación silenciosa con status missing.
 */
import { NextResponse } from 'next/server'

export const revalidate = 21600
export const runtime = 'nodejs'

const AEMET_BASE = 'https://opendata.aemet.es/opendata/api'

// CCAA → códigos de provincia AEMET (1 representativa por CCAA)
const CCAA_PROVINCIAS: Record<string, string> = {
  AND: '04',   // Almería
  ARA: '50',   // Zaragoza
  AST: '33',   // Asturias
  BAL: '07',   // Baleares
  CAN: '35',   // Las Palmas
  CTB: '39',   // Cantabria
  CYL: '47',   // Valladolid
  CLM: '13',   // Ciudad Real
  CAT: '08',   // Barcelona
  CVA: '46',   // Valencia
  EXT: '10',   // Cáceres
  GAL: '15',   // A Coruña
  MAD: '28',   // Madrid
  MUR: '30',   // Murcia
  NAV: '31',   // Navarra
  PV:  '48',   // Bizkaia
  RIO: '26',   // La Rioja
}

async function aemetFetch(path: string): Promise<any> {
  const key = process.env.AEMET_API_KEY
  if (!key) return { error: 'AEMET_API_KEY missing' }
  try {
    const r = await fetch(`${AEMET_BASE}${path}`, {
      headers: { api_key: key, Accept: 'application/json' },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const meta = await r.json()
    if (!meta.datos) return { error: 'no_datos_url', meta }
    // step 2: fetch actual data
    const r2 = await fetch(meta.datos, { next: { revalidate: 21600 } } as RequestInit)
    if (!r2.ok) return { error: `HTTP step2 ${r2.status}` }
    return await r2.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    return NextResponse.json({
      ok: Boolean(process.env.AEMET_API_KEY),
      auth_required: true,
      api_key_present: Boolean(process.env.AEMET_API_KEY),
      registration_url: 'https://opendata.aemet.es/centrodedescargas/altaUsuario',
      base_url: AEMET_BASE,
      provincias_map: CCAA_PROVINCIAS,
    })
  }

  // /api/aemet/precipitacion-ccaa?ccaa=AND&days=30
  if (action === 'precipitacion-ccaa') {
    const ccaa = (url.searchParams.get('ccaa') || 'MAD').toUpperCase()
    const provincia = CCAA_PROVINCIAS[ccaa]
    if (!provincia) {
      return NextResponse.json({ ok: false, error: `ccaa ${ccaa} sin mapeo provincial` })
    }
    // climatologías mensuales últimos años (no requiere fecha en path)
    // Sprint N19: ampliado rango 2010-2025 para serie ~15 años (era 2020-2024).
    // AEMET tolera ventanas hasta 20 años; aceptamos delay de ~500ms extra
    // a cambio de tendencias estructurales visibles (calentamiento + sequías históricas).
    const data = await aemetFetch(
      `/valores/climatologicos/mensualesanuales/datos/anioini/2010/aniofin/2025/provincia/${provincia}`
    )
    if (data?.error) {
      return NextResponse.json({
        ok: false,
        error: data.error,
        ccaa,
        provincia,
        note: process.env.AEMET_API_KEY ? 'AEMET API error · ver fetch logs' : 'AEMET_API_KEY no configurada en Vercel',
      })
    }
    const items = Array.isArray(data) ? data : []
    return NextResponse.json({
      ok: items.length > 0,
      ccaa,
      provincia,
      n_items: items.length,
      items: items.slice(0, 60),
      source: 'AEMET OpenData · climatologías',
    })
  }

  return NextResponse.json({
    ok: false,
    available_endpoints: [
      'GET /api/aemet/health',
      'GET /api/aemet/precipitacion-ccaa?ccaa=AND',
    ],
  }, { status: 404 })
}
