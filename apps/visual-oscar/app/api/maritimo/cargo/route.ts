/**
 * GET /api/maritimo/cargo?reporter=ESP&year=
 *
 * Capa de CARGO / MERCANCÍAS · qué se transporta por mar.
 *
 * Cruza el comercio declarado real (UN Comtrade · capítulos HS2 del reporter)
 * con un catálogo curado de tipos de carga marítima (contenedor, granel seco,
 * crudo, productos petrolíferos, GNL, GLP, químicos, ro-ro, reefer…).
 *
 * Envelope: { ok, data:{ por_categoria[], top_productos[], catalogo[] },
 *             error, fetched_at, source_url }
 *
 * Degradación honesta: HTTP 200 SIEMPRE.
 *
 * RECUPERACIÓN DE FLUJOS (fix exportaciones a 0): el endpoint con clave de
 * Comtrade (`/data/v1/get`) limita peticiones por segundo y al pedir X y M en
 * paralelo uno de los dos flujos puede volver vacío (en producción: imports OK,
 * TODOS los exports a 0 — un cero presentado como dato real). Si un flujo llega
 * vacío, este route lo recupera del endpoint público `public/v1/preview` de
 * UN Comtrade (sin clave, verificado con curl: ESP 2025 → X 433B$, M 502B$).
 * Si ni así hay dato, el lado ausente va como `null` (el front pinta «—») con
 * `data_quality.note` explícito — nunca un 0$ silencioso.
 *
 * Cache 12h (datos oficiales de baja frecuencia); 10 min si la respuesta quedó
 * parcial, para que sane sola en el siguiente ciclo.
 */
import { NextResponse } from 'next/server'
import {
  fetchCargoFlows,
  classifyHs2,
  CARGO_CATALOG,
  type CargoCategoryKey,
  type CargoFlowsResult,
  type CargoProduct,
  type CargoQuality,
} from '@/lib/maritimo/cargo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// ─────────────────────────────────────────────────────────────────
// Recuperación vía endpoint público "preview" de UN Comtrade (sin clave)
// ─────────────────────────────────────────────────────────────────

const COMTRADE_PREVIEW = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS'

/**
 * Agregado por categoría con lados posiblemente NO disponibles.
 * `null` = "no hay dato del upstream" (el front lo pinta como «—»);
 * 0 queda reservado para un cero real declarado.
 */
interface AggregadoHonesto {
  key: CargoCategoryKey
  label: string
  label_en: string
  glyph: string
  export_usd: number | null
  import_usd: number | null
  total_usd: number
  total_fmt: string
  share_pct: number
  n_chapters: number
}

/** Formato compacto USD (espejo del helper no exportado de la lib). */
function fmtUSD(v: number): string {
  if (!v || isNaN(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(0)
}

/**
 * Capítulos HS2 de un flujo desde el preview público de Comtrade.
 * Campos verificados con curl: data[].cmdCode, cmdDesc (con includeDesc=true),
 * flowCode, primaryValue, period. Devuelve [] si falla (nunca lanza).
 */
async function fetchPreviewRows(
  reporterIso: string,
  period: string,
  flowCode: 'X' | 'M',
): Promise<any[]> {
  const qs = new URLSearchParams({
    reporterCode: reporterIso,
    partnerCode: '0', // World agregado
    cmdCode: 'AG2', // todos los capítulos HS2
    flowCode,
    motCode: '0',
    customsCode: 'C00',
    partner2Code: '0',
    period,
    includeDesc: 'true',
  })
  try {
    const r = await fetch(`${COMTRADE_PREVIEW}?${qs}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 43200 }, // 12h
    } as RequestInit)
    if (!r.ok) return []
    const data = await r.json()
    return Array.isArray(data?.data) ? data.data : []
  } catch {
    return []
  }
}

const LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  CARGO_CATALOG.map((e) => [e.key, e.label]),
)

/** Normaliza filas del preview → productos (espejo de la lógica de la lib). */
function rowsToProducts(rows: any[], flow: 'export' | 'import'): CargoProduct[] {
  const products = rows
    .map((r) => {
      const hs2 = String(r.cmdCode || '').padStart(2, '0').slice(0, 2)
      const value = Number(r.primaryValue) || 0
      const category = classifyHs2(hs2)
      return {
        hs2,
        hs2_desc: r.cmdDesc || '',
        flow,
        value_usd: value,
        value_fmt: fmtUSD(value),
        category,
        category_label: LABEL_BY_KEY[category] ?? category,
        share_pct: 0,
      } as CargoProduct
    })
    .filter((p) => p.value_usd > 0 && /^\d{2}$/.test(p.hs2))
  const total = products.reduce((s, p) => s + p.value_usd, 0)
  for (const p of products) {
    p.share_pct = total > 0 ? Math.round((p.value_usd / total) * 1000) / 10 : 0
  }
  return products
}

/** Lado de un flujo: valor por categoría + capítulos vistos. */
interface FlowSide {
  byCat: Map<CargoCategoryKey, number>
  chapters: Map<CargoCategoryKey, Set<string>> | null
  total: number
}

function sideFromProducts(products: CargoProduct[]): FlowSide | null {
  if (products.length === 0) return null
  const byCat = new Map<CargoCategoryKey, number>()
  const chapters = new Map<CargoCategoryKey, Set<string>>()
  let total = 0
  for (const p of products) {
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + p.value_usd)
    if (!chapters.has(p.category)) chapters.set(p.category, new Set())
    chapters.get(p.category)!.add(p.hs2)
    total += p.value_usd
  }
  return { byCat, chapters, total }
}

/** Lado reconstruido desde los agregados originales de la lib (flujo que sí llegó). */
function sideFromOriginal(
  porCategoria: CargoFlowsResult['por_categoria'],
  lado: 'export' | 'import',
): FlowSide | null {
  const byCat = new Map<CargoCategoryKey, number>()
  let total = 0
  for (const c of porCategoria) {
    const v = lado === 'export' ? c.export_usd : c.import_usd
    if (v > 0) {
      byCat.set(c.key, v)
      total += v
    }
  }
  if (total <= 0) return null
  return { byCat, chapters: null, total }
}

/** Combina ambos lados en agregados por categoría. `null` en lado ausente. */
function buildCategorias(
  exp: FlowSide | null,
  imp: FlowSide | null,
  origNChapters: Map<CargoCategoryKey, number>,
): AggregadoHonesto[] {
  const grandTotal = (exp?.total ?? 0) + (imp?.total ?? 0)
  return CARGO_CATALOG.map((entry) => {
    const e = exp ? exp.byCat.get(entry.key) ?? 0 : null
    const i = imp ? imp.byCat.get(entry.key) ?? 0 : null
    const total = (e ?? 0) + (i ?? 0)
    const seen = new Set<string>()
    exp?.chapters?.get(entry.key)?.forEach((c) => seen.add(c))
    imp?.chapters?.get(entry.key)?.forEach((c) => seen.add(c))
    return {
      key: entry.key,
      label: entry.label,
      label_en: entry.label_en,
      glyph: entry.glyph,
      export_usd: e,
      import_usd: i,
      total_usd: total,
      total_fmt: fmtUSD(total),
      share_pct: grandTotal > 0 ? Math.round((total / grandTotal) * 1000) / 10 : 0,
      n_chapters: Math.max(seen.size, origNChapters.get(entry.key) ?? 0),
    }
  })
    .filter((agg) => agg.total_usd > 0)
    .sort((a, b) => b.total_usd - a.total_usd)
}

interface DatosSalida {
  ok: boolean
  year: number
  por_categoria: AggregadoHonesto[]
  top_productos: CargoProduct[]
  data_quality: CargoQuality
  error: string | null
  /** true si quedó un flujo sin dato (cache corto para que sane). */
  parcial: boolean
}

/**
 * Intenta completar el/los flujo(s) ausente(s) vía preview público.
 * Devuelve null si no hay nada que mejorar respecto al resultado original.
 */
async function recuperarFlujos(
  result: CargoFlowsResult,
  expTotal0: number,
  impTotal0: number,
): Promise<DatosSalida | null> {
  // Preview del año pedido; si está vacío (año aún no publicado), año anterior.
  // SECUENCIAL a propósito: dos llamadas simultáneas a Comtrade es justo lo
  // que tira un flujo entero en el endpoint con clave (causa raíz del bug).
  let expRows: any[] = []
  let impRows: any[] = []
  let usedYear = result.year
  for (const y of [result.year, result.year - 1]) {
    expRows = await fetchPreviewRows(result.reporter_iso, String(y), 'X')
    impRows = await fetchPreviewRows(result.reporter_iso, String(y), 'M')
    if (expRows.length > 0 || impRows.length > 0) {
      usedYear = y
      break
    }
  }

  // Reintento puntual del flujo que quedó vacío: el preview a veces
  // rate-limita una llamada suelta; un segundo intento espaciado suele bastar.
  if (expRows.length === 0 && impRows.length > 0) {
    await new Promise((r) => setTimeout(r, 800))
    expRows = await fetchPreviewRows(result.reporter_iso, String(usedYear), 'X')
  } else if (impRows.length === 0 && expRows.length > 0) {
    await new Promise((r) => setTimeout(r, 800))
    impRows = await fetchPreviewRows(result.reporter_iso, String(usedYear), 'M')
  }

  const expPrev = rowsToProducts(expRows, 'export')
  const impPrev = rowsToProducts(impRows, 'import')
  const mismoAnio = usedYear === result.year

  // Por flujo: preferimos preview; si no hay, el dato original con valor (solo
  // si es del mismo año — nunca mezclamos años distintos en una misma tabla).
  const expSide =
    sideFromProducts(expPrev) ??
    (mismoAnio && expTotal0 > 0 ? sideFromOriginal(result.por_categoria, 'export') : null)
  const impSide =
    sideFromProducts(impPrev) ??
    (mismoAnio && impTotal0 > 0 ? sideFromOriginal(result.por_categoria, 'import') : null)

  if (!expSide && !impSide) return null // nada recuperado: se mantiene el original

  const origN = new Map<CargoCategoryKey, number>(
    mismoAnio ? result.por_categoria.map((c) => [c.key, c.n_chapters]) : [],
  )
  const por_categoria = buildCategorias(expSide, impSide, origN)

  // Top productos: preview por flujo; si un flujo vino del original, reusamos
  // sus top_productos (productos reales del endpoint con clave).
  const topExp = expPrev.length > 0
    ? expPrev
    : mismoAnio ? result.top_productos.filter((p) => p.flow === 'export') : []
  const topImp = impPrev.length > 0
    ? impPrev
    : mismoAnio ? result.top_productos.filter((p) => p.flow === 'import') : []
  const top_productos = [...topExp, ...topImp]
    .sort((a, b) => b.value_usd - a.value_usd)
    .slice(0, 24)

  const parcial = !expSide || !impSide
  const ladoAusente = !expSide ? 'exportaciones' : 'importaciones'
  const viaPreview = expPrev.length > 0 || impPrev.length > 0

  const note = parcial
    ? `Datos oficiales año ${usedYear}, pero las ${ladoAusente} no están disponibles en UN Comtrade ahora mismo: se muestran con «—» (no es un cero real). Se reintenta automáticamente.`
    : viaPreview
      ? `Comercio declarado oficial año ${usedYear} · capítulos HS2 mapeados a tipos de carga marítima. Flujos recuperados vía endpoint público de UN Comtrade tras respuesta incompleta del endpoint principal.`
      : `Comercio declarado oficial año ${usedYear} · capítulos HS2 mapeados a tipos de carga marítima.`

  return {
    ok: true,
    year: usedYear,
    por_categoria,
    top_productos,
    data_quality: {
      source_type: 'live',
      source_name: 'UN Comtrade',
      note,
    },
    error: parcial ? `flujo de ${ladoAusente} no disponible en upstream` : null,
    parcial,
  }
}

// ─────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reporter = (url.searchParams.get('reporter') || 'ESP').toUpperCase()
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : undefined

  const fetched_at = new Date().toISOString()

  try {
    const result = await fetchCargoFlows(reporter, Number.isNaN(year as number) ? undefined : year)

    // Detección del bug de producción: un flujo entero a 0 con ok=true
    // (p. ej. TODOS los export_usd a 0 con imports correctos) o ningún dato.
    const expTotal0 = result.por_categoria.reduce((s, c) => s + (c.export_usd || 0), 0)
    const impTotal0 = result.por_categoria.reduce((s, c) => s + (c.import_usd || 0), 0)
    const cojo = !result.ok || expTotal0 <= 0 || impTotal0 <= 0

    let salida: DatosSalida = {
      ok: result.ok,
      year: result.year,
      por_categoria: result.por_categoria as unknown as AggregadoHonesto[],
      top_productos: result.top_productos,
      data_quality: result.data_quality,
      error: result.ok ? null : result.error ?? 'sin datos',
      parcial: false,
    }

    if (cojo) {
      const recuperado = await recuperarFlujos(result, expTotal0, impTotal0)
      if (recuperado) salida = recuperado
    }

    return NextResponse.json(
      {
        ok: salida.ok,
        data: {
          reporter: result.reporter,
          reporter_iso: result.reporter_iso,
          year: salida.year,
          por_categoria: salida.por_categoria,
          top_productos: salida.top_productos,
          catalogo: result.catalogo,
          data_quality: salida.data_quality,
        },
        error: salida.error,
        fetched_at,
        source_url: result.source_url,
      },
      {
        headers: {
          // Cache corto si quedó parcial o sin datos, para que sane solo
          'Cache-Control': salida.ok && !salida.parcial
            ? 'public, s-maxage=43200, stale-while-revalidate=86400'
            : 'public, s-maxage=600, stale-while-revalidate=1800',
        },
      },
    )
  } catch (e: any) {
    // HTTP 200 incluso en error inesperado · degrada honesto
    // (el catálogo es seed sin red: siempre va, la caja nunca queda vacía)
    return NextResponse.json(
      {
        ok: false,
        data: {
          reporter,
          year: year ?? null,
          por_categoria: [],
          top_productos: [],
          catalogo: CARGO_CATALOG,
          data_quality: {
            source_type: 'seed',
            source_name: 'UN Comtrade',
            note: 'Error inesperado consultando UN Comtrade; solo disponible el catálogo curado de tipos de carga.',
          } satisfies CargoQuality,
        },
        error: String(e?.message ?? e).slice(0, 200),
        fetched_at,
        source_url: 'https://comtradeplus.un.org/',
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
      },
    )
  }
}
