/**
 * Cliente ENTSO-E Transparency Platform · web-api.tp.entsoe.eu/api · S3
 *
 * Datos oficiales de la red eléctrica europea (todos los TSOs UE) en
 * granularidad horaria: precios mayoristas day-ahead, flujos físicos
 * transfronterizos, generación por tecnología y demanda.
 *
 * ── API REAL (confirmada vía entsoe-py mappings/parsers · 2026-06-02) ──────
 *   Base    : https://web-api.tp.entsoe.eu/api
 *   Auth    : query param `securityToken=<TOKEN>`.
 *             ⚠ El token es el **Web API Security Token** que el usuario genera
 *             en la web de ENTSO-E (My Account Settings → Web API Security
 *             Token). NO es la contraseña. En Vercel hoy solo hay
 *             ENTSOE_USERNAME + ENTSOE_PASSWORD (sirven para la File Library,
 *             no para la Web API). Mientras no se añada el token, el cliente
 *             degrada limpio con un error claro pidiendo configurarlo.
 *   Formato : XML. Precios/flujos → <Publication_MarketDocument>; generación/
 *             carga → <GL_MarketDocument>. Este cliente lo parsea a JSON con un
 *             parser por regex acotado a la estructura TimeSeries/Period/Point
 *             (sin dependencias nuevas: el repo no tiene parser XML y DOMParser
 *             no está disponible en el runtime Node de los route handlers).
 *   docType : A44 day-ahead prices · A11 cross-border physical flow ·
 *             A75 actual generation per type · A65 total load.
 *   period  : `periodStart`/`periodEnd` en formato yyyyMMddHHmm (UTC).
 *
 * ── Diseño defensivo (patrón ESIOS/Ember) ─────────────────────────────────
 *   - Degradación: token ausente o fallo → `{ ok:false, error, fetched_at }`.
 *     NUNCA lanza ni inventa datos. El caso "solo user/pass, falta token"
 *     produce un error explícito (`token_missing`).
 *   - Caché en memoria TTL 1h: los datos horarios no necesitan ser inmediatos
 *     y ENTSO-E aplica rate limits (400 req/min). Clave SIN el token.
 *   - El XML de ENTSO-E ante error trae <Acknowledgement_MarketDocument> con
 *     <Reason><text> — lo detectamos y reportamos como error legible.
 *
 * IMPORTANTE: el token es server-side (Vercel env). NUNCA exponer al cliente;
 * estas funciones se llaman desde route handlers (app/api/entsoe/*).
 *
 * NOTA · convivencia: existe `app/api/entsoe/[...path]/route.ts` (legacy, S1)
 * que llama a ENTSO-E con su propio fetch+regex y lee `ENTSOE_API_KEY`. Este
 * cliente tipado es la fuente de verdad de S3 en adelante y lee tanto
 * `ENTSOE_SECURITY_TOKEN` (nombre del spec) como `ENTSOE_API_KEY` (legacy), de
 * modo que cualquiera de los dos que el usuario configure funciona.
 *
 * Docs: https://transparency.entsoe.eu · token: My Account Settings.
 */
import type {
  EntsoePoint,
  EntsoePrices,
  EntsoeFlow,
  EntsoeCrossBorder,
  EntsoeGeneration,
  EntsoeGenerationItem,
  EntsoeResponse,
} from '@/lib/energia/types'
// Import relativo con extensión .ts (convención del repo en lib/, ver
// classify-semantic.ts) para que el runtime de los tests Node
// (--experimental-strip-types) resuelva el valor `resolveZone`. Next.js lo
// soporta vía tsconfig allowImportingTsExtensions + moduleResolution bundler.
import { resolveZone, type EntsoeZoneCode } from './zones.ts'

const BASE = 'https://web-api.tp.entsoe.eu/api'
/** Base URL del Web API · exportada para fetchers especiales (outages ZIP). */
export const ENTSOE_BASE = BASE
const PUBLIC_URL = 'https://transparency.entsoe.eu'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 3600_000 // 1h

// Mapeo de PSR Types (Power System Resource) a etiquetas humanas en español.
// Fuente: entsoe-py PSRTYPE_MAPPINGS.
// Exportado para que `lib/entsoe/extended.ts` (capacidad, outages, generación
// por unidad) reutilice las mismas etiquetas sin duplicarlas.
export const PSR_TYPE_LABELS: Record<string, string> = {
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

// ─────────────────────────────────────────────────────────────────────────
// Token: lee el nombre del spec primero, luego el legacy.
// ─────────────────────────────────────────────────────────────────────────
function getToken(): string {
  return process.env.ENTSOE_SECURITY_TOKEN || process.env.ENTSOE_API_KEY || ''
}

/** Token del Web API · exportado para fetchers especiales (outages ZIP en extended.ts). */
export function getEntsoeToken(): string {
  return getToken()
}

/** ¿Hay token de Web API configurado? (distinto de user/pass). */
export function hasEntsoeToken(): boolean {
  return getToken().length > 0
}

/** ¿Solo hay credenciales de File Library (user/pass) pero falta el token? */
export function onlyFileLibraryCreds(): boolean {
  return (
    !hasEntsoeToken() &&
    !!process.env.ENTSOE_USERNAME &&
    !!process.env.ENTSOE_PASSWORD
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 1h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  expires: number
  value: { ok: boolean; xml?: string; error?: string }
}
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearEntsoeCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Formato de periodo yyyyMMddHHmm (UTC)
// ─────────────────────────────────────────────────────────────────────────
function fmtPeriodUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
}

/** Ventana [start,end] de los últimos `days` días, alineada a la hora actual UTC. */
export function periodForDays(days: number): { periodStart: string; periodEnd: string } {
  const end = new Date()
  const start = new Date(end.getTime() - days * 24 * 3600_000)
  return { periodStart: fmtPeriodUTC(start), periodEnd: fmtPeriodUTC(end) }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo XML con auth + degradación + caché
// ─────────────────────────────────────────────────────────────────────────
// Exportado para `lib/entsoe/extended.ts` (nuevos documentType: A65 carga,
// A69/A71 previsiones, A68 capacidad, A77/A80 indisponibilidades, A72 embalses,
// A09/A61 intercambios programados, A85 desvíos). Campos opcionales añadidos
// (businessType, docStatus, psrType, contract_MarketAgreement.type) cubren las
// queries que esos doc-types requieren sin romper las existentes.
export interface EntsoeRawQuery {
  documentType: string
  in_Domain?: string
  out_Domain?: string
  /** Para outages/balancing/capacity que usan un único dominio de control. */
  controlArea_Domain?: string
  biddingZone_Domain?: string
  /** Carga total A65 (real/previsión): ENTSO-E exige outBiddingZone_Domain. */
  outBiddingZone_Domain?: string
  periodStart: string
  periodEnd: string
  processType?: string
  businessType?: string
  psrType?: string
  docStatus?: string
  'contract_MarketAgreement.type'?: string
}

/**
 * Fetch crudo de ENTSO-E para CUALQUIER documentType. Exportado para que el
 * módulo `extended.ts` añada nuevos tipos de documento reutilizando auth,
 * caché TTL 1h, manejo de Acknowledgement y degradación. NUNCA lanza.
 */
export async function entsoeFetchRaw(
  q: EntsoeRawQuery,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ ok: boolean; xml?: string; error?: string }> {
  const token = getToken()
  if (!token) {
    const why = onlyFileLibraryCreds()
      ? 'token_missing · hay ENTSOE_USERNAME/PASSWORD (File Library) pero falta el Web API Security Token. Genéralo en transparency.entsoe.eu → My Account Settings → Web API Security Token y configúralo como ENTSOE_SECURITY_TOKEN en Vercel.'
      : 'token_missing · configura ENTSOE_SECURITY_TOKEN (Web API Security Token de transparency.entsoe.eu) en Vercel env vars.'
    return { ok: false, error: why }
  }

  // Clave de caché SIN el token.
  const cacheKey = JSON.stringify(q)
  const hit = _cache.get(cacheKey)
  if (hit && Date.now() <= hit.expires) return hit.value

  const params = new URLSearchParams({ securityToken: token })
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) params.set(k, String(v))
  }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(`${BASE}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/xml' },
      next: { revalidate: 3600 },
    } as RequestInit)
    clearTimeout(t)

    if (r.status === 401 || r.status === 403) {
      // No cacheamos errores de auth (el usuario puede arreglar el token).
      return { ok: false, error: `unauthorized · HTTP ${r.status} · token inválido o sin permisos Web API` }
    }
    if (r.status === 429) {
      return { ok: false, error: 'rate_limited · ENTSO-E 400 req/min' }
    }
    if (!r.ok) {
      return { ok: false, error: `http_${r.status}` }
    }

    const xml = await r.text()
    // ENTSO-E responde 200 con un Acknowledgement document ante errores lógicos.
    const ack = extractAckReason(xml)
    if (ack) {
      const result = { ok: false as const, error: `entsoe_error · ${ack}` }
      // No cacheamos: el error puede ser por rango sin datos aún publicados.
      return result
    }

    const result = { ok: true as const, xml }
    _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
    return result
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Parser XML → JSON (regex acotado a la estructura ENTSO-E)
//
// La estructura es regular y acotada:
//   <TimeSeries>
//     [<MktPSRType><psrType>B16</psrType></MktPSRType>]   (solo A75)
//     <Period>
//       <timeInterval><start>ISO</start><end>ISO</end></timeInterval>
//       <resolution>PT60M</resolution>
//       <Point><position>1</position><price.amount>42.5</price.amount></Point>
//       ...
//     </Period>
//   </TimeSeries>
// Notas de robustez:
//   - Puede haber varios <Period> por TimeSeries (cambios de resolución/día).
//   - ENTSO-E NO repite posiciones cuyo valor no cambia (A11/A75): rellenamos
//     huecos con el último valor conocido (forward-fill) hasta `position`.
//   - Tags de valor: <price.amount> (A44) o <quantity> (A11/A75/A65).
// ─────────────────────────────────────────────────────────────────────────

/** Detecta un documento de error y devuelve el texto de la razón, o null. */
function extractAckReason(xml: string): string | null {
  if (!/Acknowledgement_MarketDocument/.test(xml) && !/<Reason>/.test(xml)) {
    return null
  }
  const code = /<code>([^<]+)<\/code>/.exec(xml)?.[1]
  const text = /<text>([^<]*)<\/text>/.exec(xml)?.[1]
  if (!code && !text) return null
  return [code, text].filter(Boolean).join(' · ').slice(0, 200)
}

function tag(body: string, name: string): string | undefined {
  // name puede contener '.', lo escapamos.
  const esc = name.replace(/[.]/g, '\\.')
  const m = new RegExp(`<${esc}>([^<]*)<\\/${esc}>`).exec(body)
  return m?.[1]
}

interface ParsedSeries {
  psrType?: string
  resolutionMin: number
  startMs: number
  points: EntsoePoint[]
}

/**
 * Parsea TODAS las TimeSeries de un XML ENTSO-E.
 * @param valueTag tag del valor a extraer ('price.amount' | 'quantity').
 */
export function parseTimeSeries(
  xml: string,
  valueTag: 'price.amount' | 'quantity',
): ParsedSeries[] {
  const out: ParsedSeries[] = []
  if (!xml) return out

  const tsRe = /<TimeSeries\b[^>]*>([\s\S]*?)<\/TimeSeries>/g
  let tsM: RegExpExecArray | null
  while ((tsM = tsRe.exec(xml)) !== null) {
    const tsBody = tsM[1]
    const psrType = tag(tsBody, 'psrType')

    // Cada TimeSeries puede tener varios Period.
    const perRe = /<Period\b[^>]*>([\s\S]*?)<\/Period>/g
    let perM: RegExpExecArray | null
    while ((perM = perRe.exec(tsBody)) !== null) {
      const perBody = perM[1]
      const startIso = tag(perBody, 'start')
      const resStr = tag(perBody, 'resolution') // ej. "PT60M"
      const resolutionMin = parseResolutionMin(resStr)
      const startMs = startIso ? Date.parse(startIso) : NaN
      if (!Number.isFinite(startMs) || !resolutionMin) continue

      const points = parsePoints(perBody, valueTag, startMs, resolutionMin)
      if (points.length > 0) {
        out.push({ psrType, resolutionMin, startMs, points })
      }
    }
  }
  return out
}

/** Convierte "PT60M" / "PT15M" / "P1D" / "PT1H" a minutos. 0 si no se reconoce. */
function parseResolutionMin(res: string | undefined): number {
  if (!res) return 0
  const h = /PT(\d+)H/.exec(res)
  if (h) return parseInt(h[1], 10) * 60
  const m = /PT(\d+)M/.exec(res)
  if (m) return parseInt(m[1], 10)
  const d = /P(\d+)D/.exec(res)
  if (d) return parseInt(d[1], 10) * 24 * 60
  return 0
}

/**
 * Extrae los Point de un Period con forward-fill de posiciones omitidas.
 * ENTSO-E omite puntos consecutivos con el mismo valor en A11/A75; reconstruimos
 * la serie completa hasta la última posición presente.
 */
function parsePoints(
  perBody: string,
  valueTag: string,
  startMs: number,
  resolutionMin: number,
): EntsoePoint[] {
  const esc = valueTag.replace(/[.]/g, '\\.')
  const ptRe = new RegExp(
    `<Point>\\s*<position>(\\d+)<\\/position>\\s*<${esc}>([\\d.eE+-]+)<\\/${esc}>\\s*<\\/Point>`,
    'g',
  )
  const raw: Array<{ position: number; value: number }> = []
  let m: RegExpExecArray | null
  while ((m = ptRe.exec(perBody)) !== null) {
    const position = parseInt(m[1], 10)
    const value = parseFloat(m[2])
    if (Number.isFinite(position) && Number.isFinite(value)) {
      raw.push({ position, value })
    }
  }
  if (raw.length === 0) return []

  raw.sort((a, b) => a.position - b.position)
  const lastPos = raw[raw.length - 1].position
  const byPos = new Map(raw.map((p) => [p.position, p.value]))

  const points: EntsoePoint[] = []
  let lastValue = raw[0].value
  for (let pos = 1; pos <= lastPos; pos++) {
    if (byPos.has(pos)) lastValue = byPos.get(pos)!
    const ts = new Date(startMs + (pos - 1) * resolutionMin * 60_000).toISOString()
    points.push({ position: pos, value: lastValue, timestamp: ts })
  }
  return points
}

// ─────────────────────────────────────────────────────────────────────────
// API pública del cliente
// ─────────────────────────────────────────────────────────────────────────

/**
 * Precios day-ahead (A44) de una zona, en €/MWh, con estadísticos.
 */
export async function fetchDayAheadPrices(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoePrices>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A44',
    in_Domain: zone.eic,
    out_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'price.amount')
  const points = mergeSeriesPoints(series)
  if (points.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  const values = points.map((p) => p.value)
  const avg = values.reduce((a, b) => a + b, 0) / values.length

  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      resolution_min: series[0]?.resolutionMin ?? 60,
      points,
      avg_eur_mwh: round2(avg),
      max_eur_mwh: round2(Math.max(...values)),
      min_eur_mwh: round2(Math.min(...values)),
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

/**
 * Flujos físicos cross-border (A11) bidireccionales entre dos zonas + saldo.
 */
export async function fetchCrossBorderFlows(
  fromCode: EntsoeZoneCode | string,
  toCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeCrossBorder>> {
  const fetched_at = new Date().toISOString()
  const from = resolveZone(fromCode)
  const to = resolveZone(toCode)
  if (!from || !to) {
    return { ok: false, error: `zona_desconocida · ${fromCode}/${toCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const [fwdRaw, revRaw] = await Promise.all([
    entsoeFetchRaw({ documentType: 'A11', in_Domain: to.eic, out_Domain: from.eic, periodStart, periodEnd }),
    entsoeFetchRaw({ documentType: 'A11', in_Domain: from.eic, out_Domain: to.eic, periodStart, periodEnd }),
  ])

  // Si ambos sentidos fallan, degradamos.
  if (!fwdRaw.ok && !revRaw.ok) {
    return { ok: false, error: fwdRaw.error || revRaw.error, fetched_at, source_url: PUBLIC_URL }
  }

  const forward = buildFlow(from.code, to.code, fwdRaw.ok ? fwdRaw.xml || '' : '')
  const reverse = buildFlow(to.code, from.code, revRaw.ok ? revRaw.xml || '' : '')
  const net = forward.total_mwh - reverse.total_mwh

  return {
    ok: true,
    data: {
      from: from.code,
      to: to.code,
      forward,
      reverse,
      net_mwh: round1(net),
      net_direction: net >= 0 ? `${from.code} → ${to.code}` : `${to.code} → ${from.code}`,
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

function buildFlow(from: string, to: string, xml: string): EntsoeFlow {
  const series = parseTimeSeries(xml, 'quantity')
  const points = mergeSeriesPoints(series)
  const total = points.reduce((a, p) => a + p.value, 0)
  return { from, to, points, total_mwh: round1(total) }
}

/**
 * Generación por tipo (A75) de una zona, agregada por tecnología (MWh).
 */
export async function fetchGeneration(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeGeneration>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A75',
    in_Domain: zone.eic,
    processType: 'A16', // Realised
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  if (series.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  // Suma MWh por psrType.
  const byPsr = new Map<string, number>()
  for (const s of series) {
    if (!s.psrType) continue
    const sum = s.points.reduce((a, p) => a + p.value, 0)
    byPsr.set(s.psrType, (byPsr.get(s.psrType) || 0) + sum)
  }

  const by_type: EntsoeGenerationItem[] = Array.from(byPsr.entries())
    .map(([psr, mwh]) => ({ psr_type: psr, label: PSR_TYPE_LABELS[psr] || psr, mwh: round1(mwh) }))
    .sort((a, b) => b.mwh - a.mwh)

  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      by_type,
      total_mwh: round1(by_type.reduce((a, b) => a + b.mwh, 0)),
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Fusiona los puntos de varias TimeSeries/Period en una sola serie ordenada por
 * timestamp, deduplicando por timestamp (último gana). Útil cuando la API
 * parte la serie en varios Period (días/cambios de resolución).
 */
function mergeSeriesPoints(series: ParsedSeries[]): EntsoePoint[] {
  const byTs = new Map<string, number>()
  for (const s of series) {
    for (const p of s.points) byTs.set(p.timestamp, p.value)
  }
  return Array.from(byTs.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([timestamp, value], i) => ({ position: i + 1, value, timestamp }))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
