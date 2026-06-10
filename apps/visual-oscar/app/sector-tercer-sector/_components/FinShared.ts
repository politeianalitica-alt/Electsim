/**
 * FinShared · Tercer Sector v3 · vista Financiación (Sprint TS6)
 *
 * Tipos del payload de `/api/tercer-sector/financiacion` (eco de los tipos del
 * dominio en `lib/tercer-sector/bdns.ts` y `lib/.../licitaciones/types.ts`, que
 * NO se importan desde componentes 'use client') + formatadores compartidos por
 * los sub-componentes `Fin*`. Mantener alineado con la route handler. Sin estado,
 * sin JSX: solo tipos y funciones puras. Cero emojis.
 */

// ── Shapes del payload (subset consumido por la vista) ────────────────────

/** Concesión BDNS — espejo de `BdnsConcesion` (lib/tercer-sector/bdns.ts). */
export interface FinConcesion {
  id: string
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  instrumento: string | null
  convocatoria: string | null
  nivel: string | null
  territorio: string | null
  organo: string | null
  fecha: string | null
  es_tercer_sector: boolean
  match: string
}

/** Convocatoria BDNS — espejo de `BdnsConvocatoria` (lib/tercer-sector/bdns.ts). */
export interface FinConvocatoria {
  id: string
  numero: string | null
  titulo: string
  fecha: string | null
  nivel: string | null
  territorio: string | null
  organo: string | null
  mrr: boolean
  es_tercer_sector: boolean
  match: string
}

/** Grant UE — subset de `LicitacionNormalizada` (conector SEDIA). */
export interface FinGrantUe {
  id: string
  titulo: string
  comprador: string
  valor_eur: number | null
  cpv: string | null
  plazo: string | null
  fecha_pub: string | null
  url: string
}

export interface FinIrpf07 {
  ejercicio: number
  recaudacion_estimada_meur: number
  beneficiarias_aprox: number
  fuente: string
  fuente_url: string
  fecha_ref: string
  nota: string
}

export interface FinResumen {
  n_convocatorias: number
  n_concesiones: number
  n_concesiones_ts?: number
  n_grants_ue: number
  /** Nº de grandes beneficiarios del ejercicio (BDNS /grandesbeneficiarios). */
  n_grandes_beneficiarios?: number
  /** Nº de ayudas de Estado recientes (BDNS /ayudasestado). */
  n_ayudas_estado?: number
  /** Ejercicio fiscal usado para el ranking de grandes beneficiarios. */
  ejercicio_grandes?: number | null
  total_concedido_eur: number | null
  /** Total concedido solo a entidades del tercer sector (NIF+keyword). */
  total_concedido_ts_eur?: number | null
}

/** Gran beneficiario de subvenciones por ejercicio (BDNS /grandesbeneficiarios). */
export interface FinGranBeneficiario {
  id: string
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  ejercicio: number | null
  es_tercer_sector: boolean
  match: string
}

/** Ayuda de Estado reciente (BDNS /ayudasestado). */
export interface FinAyudaEstado {
  id: string
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  instrumento: string | null
  convocatoria: string | null
  nivel: string | null
  territorio: string | null
  organo: string | null
  fecha: string | null
  es_tercer_sector: boolean
}

export interface FinFuenteError {
  fuente: string
  error: string
}

/** Concesion enriquecida por bdns-enrichment (NIF classification, territory). */
export interface FinConcesionEnriched {
  codigo: string
  beneficiario: string
  nif: string | null
  nif_tipo: string | null
  importe_eur: number | null
  organo: string
  es_tercer_sector: boolean
  ccaa: string | null
  nivel: string
}

/** Financiador activo pre-computado por el endpoint (group by organo). */
export interface FinanciadorActivoRow {
  organo: string
  count: number
  total_eur: number
  nivel: string
}

/** Desglose territorial pre-computado por el endpoint. */
export interface TerritorioFinRow {
  count: number
  total_eur: number
}

export interface FinPayload {
  convocatorias: FinConvocatoria[]
  concesiones: FinConcesion[]
  /** Concesiones filtradas a tercer sector + enriquecidas (NIF, CCAA). */
  concesiones_ts?: FinConcesionEnriched[]
  grants_ue: FinGrantUe[]
  irpf_07: FinIrpf07
  /** Top 20 financiadores activos pre-computados por el endpoint. */
  financiadores_activos?: FinanciadorActivoRow[]
  /** Ranking top 20 beneficiarios TS pre-computado por el endpoint. */
  ranking_beneficiarios?: RankItem[]
  /** Desglose territorial (CCAA -> count+total_eur). */
  por_territorio?: Record<string, TerritorioFinRow>
  /** Grandes beneficiarios del ejercicio (BDNS /grandesbeneficiarios). */
  grandes_beneficiarios?: FinGranBeneficiario[]
  /** Ayudas de Estado recientes (BDNS /ayudasestado). */
  ayudas_estado?: FinAyudaEstado[]
  resumen: FinResumen
  fuentes_error: FinFuenteError[]
}

export interface FinEnvelope {
  ok: boolean
  data: FinPayload | null
  fetched_at?: string
  source_url?: string
}

// ── Paleta (tercer sector = verde) ────────────────────────────────────────

export const ACCENT = '#16A34A'
export const ACCENT_DARK = '#15803D'

/** Color por nivel administrativo del convocante (consistente en barras/tabla). */
export const NIVEL_COLOR: Record<string, string> = {
  ESTADO: '#16A34A',
  AUTONOMICA: '#0EA5E9',
  LOCAL: '#F59E0B',
  OTROS: '#94A3B8',
}

export function nivelColor(nivel: string | null | undefined): string {
  return NIVEL_COLOR[(nivel || 'OTROS').toUpperCase()] ?? NIVEL_COLOR.OTROS
}

// ── Formatadores ──────────────────────────────────────────────────────────

/** Importe en euros compacto y honesto: 1.2 M€, 340 k€, 980 € o '—'. */
export function fmtEur(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M€`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k€`
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`
}

/** Importe en millones de euros (número), para KPIs hero. */
export function toMeur(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return v / 1_000_000
}

/** Fecha "YYYY-MM-DD" → "DD/MM/YYYY" (o '—'). */
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const s = String(iso).slice(0, 10)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Días entre hoy y un plazo ISO (positivo = futuro). null si no parseable. */
export function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(String(iso).slice(0, 10))
  if (Number.isNaN(t)) return null
  const ms = t - Date.now()
  return Math.round(ms / 86_400_000)
}

/** Suma de importes de concesiones (ignora null). Pura. */
export function sumImportes(concesiones: FinConcesion[]): number {
  return concesiones.reduce((s, c) => s + (c.importe_eur ?? 0), 0)
}

export interface RankItem {
  nombre: string
  nif: string | null
  total_eur: number
  num: number
  nivel: string | null
}

/** Ranking de beneficiarios por importe total. Pura, testeable localmente. */
export function rankBeneficiarios(concesiones: FinConcesion[], limit = 12): RankItem[] {
  const byKey = new Map<string, RankItem>()
  for (const c of concesiones) {
    const key = (c.beneficiario_nif || c.beneficiario_nombre || '').toUpperCase()
    if (!key) continue
    const cur =
      byKey.get(key) ??
      {
        nombre: c.beneficiario_nombre || c.beneficiario_nif || '—',
        nif: c.beneficiario_nif,
        total_eur: 0,
        num: 0,
        nivel: c.nivel,
      }
    cur.total_eur += c.importe_eur ?? 0
    cur.num += 1
    byKey.set(key, cur)
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.total_eur - a.total_eur)
    .slice(0, Math.max(1, limit))
}

/** Agregado de importe concedido por nivel administrativo. Pura. */
export function importePorNivel(
  concesiones: FinConcesion[],
): { nivel: string; total_eur: number; num: number }[] {
  const out = new Map<string, { nivel: string; total_eur: number; num: number }>()
  for (const c of concesiones) {
    const k = (c.nivel || 'OTROS').toUpperCase()
    const cur = out.get(k) ?? { nivel: k, total_eur: 0, num: 0 }
    cur.total_eur += c.importe_eur ?? 0
    cur.num += 1
    out.set(k, cur)
  }
  // Orden canónico ESTADO → AUTONOMICA → LOCAL → OTROS, por estabilidad visual.
  // Niveles desconocidos van al final (rank grande).
  const order = ['ESTADO', 'AUTONOMICA', 'LOCAL', 'OTROS']
  const rank = (n: string) => {
    const i = order.indexOf(n)
    return i === -1 ? order.length : i
  }
  return Array.from(out.values()).sort((a, b) => rank(a.nivel) - rank(b.nivel))
}

/** Etiqueta legible del nivel administrativo. */
export function nivelLabel(nivel: string | null | undefined): string {
  const k = (nivel || '').toUpperCase()
  if (k === 'ESTADO') return 'Estado'
  if (k === 'AUTONOMICA') return 'Autonómica'
  if (k === 'LOCAL') return 'Local'
  return nivel || 'Otros'
}
