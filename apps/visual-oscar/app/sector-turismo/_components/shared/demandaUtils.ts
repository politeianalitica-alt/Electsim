/**
 * demandaUtils.ts · Turismo v3 · Sprint T4 (Demanda y mercados emisores)
 *
 * Tipos + helpers PUROS para los sub-componentes <Demanda*>. SOLO consume el
 * data layer vía los endpoints `/api/turismo/{frontur,egatur,residentes,
 * estacionalidad}` (no importa nada de lib/turismo: la vista vive desacoplada
 * de la capa de datos, como pide la regla del sprint).
 *
 * Los tipos reflejan el contrato JSON de esos endpoints (envelope Politeia
 * `{ ok, data, fetched_at, source_url, partial? }`). Degradación honesta: todos
 * los valores numéricos pueden ser `null`; los helpers de formato devuelven '—'.
 *
 * Cero emojis · Unicode geométrico donde haga falta.
 */

// ─────────────────────────────────────────────────────────────────────────
// Envelope común (igual que TurismoEnvelope del data layer, redefinido aquí
// para no acoplar la vista a lib/turismo).
// ─────────────────────────────────────────────────────────────────────────

export interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at: string
  source_url: string
  partial?: boolean
}

/** Punto temporal normalizado de una serie INE. */
export interface SeriePoint {
  /** "YYYY-MM" (mensual), "YYYY-Qn" (trimestral) o "YYYY" (anual). */
  period: string
  year: number
  value: number | null
}

// ── FRONTUR ────────────────────────────────────────────────────────────────

export interface FronturPais {
  pais: string
  turistas: number | null
  cuota_pct: number | null
  yoy_pct: number | null
}

export interface FronturData {
  serie_total: SeriePoint[]
  por_pais: FronturPais[]
  last: SeriePoint | null
  yoy_pct: number | null
  last_period: string | null
}

// ── EGATUR ───────────────────────────────────────────────────────────────

export interface EgaturMetric {
  serie: SeriePoint[]
  last: SeriePoint | null
  yoy_pct: number | null
  unit: string
}

export interface EgaturData {
  gasto_total: EgaturMetric
  gasto_medio_persona: EgaturMetric
  gasto_medio_diario: EgaturMetric
  estancia_media: EgaturMetric
  last_period: string | null
}

// ── ETR (residentes) ──────────────────────────────────────────────────────

export interface ResidentesDestino {
  viajes: number | null
  pernoctaciones: number | null
  gasto_total: number | null
  duracion_media: number | null
  cuota_pct: number | null
}

export interface ResidentesData {
  serie_viajes: SeriePoint[]
  serie_pernoctaciones: SeriePoint[]
  last_period: string | null
  total: { viajes: number | null; pernoctaciones: number | null; gasto_total: number | null }
  destino: { interno: ResidentesDestino; emisor: ResidentesDestino }
}

// ── Estacionalidad ────────────────────────────────────────────────────────

export interface SeasonMonth {
  mes: number
  mes_nombre: string
  indice_turismo: number
  temp_media?: number | null
}

export interface EstacionalidadData {
  meses: SeasonMonth[]
  pico: { mes: number; mes_nombre: string; indice_turismo: number }
  valle: { mes: number; mes_nombre: string; indice_turismo: number }
  ratio_pico_valle: number
  ccaa_clima: string
  clima_source: 'aemet' | 'unavailable'
  nota: string
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch helper (envelope-aware, nunca lanza)
// ─────────────────────────────────────────────────────────────────────────

/** GET `url` y devuelve el envelope. Si la red o el JSON fallan, ok:false. */
export async function fetchEnvelope<T>(url: string): Promise<Envelope<T>> {
  try {
    const r = await fetch(url)
    if (!r.ok) {
      return { ok: false, data: null, error: `http_${r.status}`, fetched_at: new Date().toISOString(), source_url: url }
    }
    const j = (await r.json()) as Envelope<T>
    return j
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: String((e as Error)?.message ?? e).slice(0, 120),
      fetched_at: new Date().toISOString(),
      source_url: url,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Formato (es-ES) · degradación honesta a '—'
// ─────────────────────────────────────────────────────────────────────────

/** Número con separador de miles es-ES. null → '—'. */
export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })
}

/** Variación con signo. null → '—'. */
export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}%`
}

/** Compacta a millones (de unidades). 12_500_000 → "12,5M". */
export function fmtMillones(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: decimals })}M`
}

/** Compacta a miles. 12_500 → "12,5k". */
export function fmtMiles(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: decimals })}k`
}

/**
 * Etiqueta de eje legible para un periodo INE.
 *   "2026-04" → "abr 26" · "2025-Q4" → "4T 25" · "2025" → "2025"
 */
export function periodTick(period: string): string {
  const mMonth = period.match(/^(\d{4})-(\d{2})$/)
  if (mMonth) {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const mi = parseInt(mMonth[2], 10) - 1
    return `${meses[mi] ?? mMonth[2]} ${mMonth[1].slice(2)}`
  }
  const mQ = period.match(/^(\d{4})-Q(\d)$/)
  if (mQ) return `${mQ[2]}T ${mQ[1].slice(2)}`
  return period
}

/**
 * Color por crecimiento interanual (YoY). Verde fuerte/medio para subidas,
 * rojo para caídas, gris si no hay dato. Paleta sobria coherente con el repo.
 */
export function yoyColor(yoy: number | null | undefined): string {
  if (yoy == null || !Number.isFinite(yoy)) return '#9CA3AF' // gris · sin dato
  if (yoy >= 8) return '#15803D' // verde fuerte
  if (yoy >= 2) return '#22C55E' // verde
  if (yoy >= -2) return '#EAB308' // ámbar · plano
  if (yoy >= -8) return '#F97316' // naranja
  return '#DC2626' // rojo · caída fuerte
}

/** Recharts tooltip · estilo del repo (tarjeta blanca, sombra suave). */
export const TOOLTIP_STYLE = {
  background: '#fff',
  border: '1px solid #ECECEF',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
} as const

export const ACCENT = '#0EA5E9'
export const ACCENT_DARK = '#075985'
