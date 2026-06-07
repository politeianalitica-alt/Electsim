'use client'
/**
 * OrgShared · Tercer Sector v3 · TercerSectorShell · Sprint TS4 (Organizaciones)
 *
 * Primitivas compartidas por los sub-componentes `Org*` de la vista
 * «Organizaciones» (directorio dinámico de ONGs). Centraliza:
 *   - Tipos del payload de `/api/tercer-sector/organizaciones` (envelope
 *     `{ ok, data, ... }` → `OrgsData`), calcados del shape del route handler.
 *   - Etiquetas humanas de tipo/sector/CCAA: se REUTILIZAN las taxonomías de
 *     `lib/tercer-sector/shared` (fuente única de verdad; la API sirve CLAVES,
 *     la UI las traduce). Importar de lib es de solo lectura — no se edita.
 *   - Helpers de formato es-ES null-safe (importes en €, miles, fechas) y
 *     paleta de acento del sector.
 *
 * Regla CLAUDE.md: cero emojis (Unicode geométrico) · honestidad con nulos
 * (importes no publicados → «n/d», nunca inventados).
 */
import {
  ORG_AMBITO_LABEL,
  ORG_TIPO_LABEL,
  CCAA_BY_KEY,
  sectorLabel as sectorLabelLib,
  type OrgAmbito,
  type OrgTipo,
} from '@/lib/tercer-sector/shared'

// ─────────────────────────────────────────────────────────────────────────
// Paleta del sector (verde, igual que el resto de Tercer Sector v3)
// ─────────────────────────────────────────────────────────────────────────
export const ACCENT = '#16A34A'
export const ACCENT_DARK = '#15803D'
export const ACCENT_SOFT = 'rgba(22,163,74,0.10)'

/** Paleta categórica estable para los mini-gráficos de distribución. */
export const CAT_COLORS = [
  '#16A34A', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EF4444',
  '#14B8A6', '#EC4899', '#84CC16', '#6366F1', '#F97316',
  '#06B6D4', '#A855F7', '#22C55E', '#EAB308', '#64748B',
]

// ─────────────────────────────────────────────────────────────────────────
// Shape del payload (calcado del route handler organizaciones/route.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Una entidad tal y como la sirve el endpoint (base catálogo + posibles enrich). */
export interface OrgRow {
  slug: string
  nombre: string
  nif?: string | null
  tipo: OrgTipo
  sector: string
  ambito: OrgAmbito
  ccaa?: string | null
  ingresos_eur?: number | null
  empleados?: number | null
  irpf_07?: boolean
  website?: string | null
  fuente: string
  fecha_ref: string
}

/** Faceta {clave,conteo} de una dimensión (tipo/sector/ccaa). */
export interface Faceta {
  key: string
  count: number
}

/** `data` del endpoint de organizaciones. */
export interface OrgsData {
  organizaciones: OrgRow[]
  total: number
  page: number
  page_size: number
  catalogo_total: number
  facetas: {
    tipos: string[]
    sectores: string[]
    ccaa: string[]
  }
  source?: string
}

/** Envelope Politeia. */
export interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at?: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Etiquetas (reutilizan la taxonomía de lib/tercer-sector/shared)
// ─────────────────────────────────────────────────────────────────────────

export function tipoLabel(key: string): string {
  return ORG_TIPO_LABEL[key as OrgTipo] ?? key.replace(/_/g, ' ')
}

export function ambitoLabel(key: string): string {
  return ORG_AMBITO_LABEL[key as OrgAmbito] ?? key.replace(/_/g, ' ')
}

export function sectorLabel(key: string): string {
  return sectorLabelLib(key)
}

export function ccaaLabel(key: string | null | undefined): string {
  if (!key) return '—'
  return CCAA_BY_KEY[key]?.name ?? key.replace(/-/g, ' ')
}

// ─────────────────────────────────────────────────────────────────────────
// Formato es-ES null-safe
// ─────────────────────────────────────────────────────────────────────────

/** Número entero/decimal localizado, o '—' si null. */
export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: decimals })
}

/**
 * Importe en euros con escala compacta (€, k€, M€, B€) o «n/d» si null.
 * Honesto con nulos: NO inventa importes no publicados.
 */
export function fmtEur(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'n/d'
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} B€`
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} M€`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k€`
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`
}

/** Importe completo con separadores de miles + sufijo €, o 'n/d'. */
export function fmtEurFull(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'n/d'
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`
}

/** Formatea una fecha-ref (YYYY o YYYY-MM-DD) de forma legible. */
export function fmtFecha(v: string | null | undefined): string {
  if (!v) return '—'
  const s = String(v).trim()
  if (/^\d{4}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' })
}

/**
 * Deriva el iati-identifier de reporting org de una entidad cuando es plausible
 * que reporte a IATI: ONGD o ámbito internacional con NIF/CIF verificado. El
 * patrón estándar es `ES-CIF-<CIF>`. Devuelve null si no aplica (no forzamos).
 */
export function deriveIatiRef(o: OrgRow): string | null {
  if (!o.nif) return null
  const reportingLikely = o.tipo === 'ongd' || o.ambito === 'internacional'
  if (!reportingLikely) return null
  const cif = o.nif.trim().toUpperCase()
  // CIF español: letra inicial + 7 dígitos + control. Filtro laxo.
  if (!/^[A-Z]\d{7}[A-Z0-9]$/.test(cif)) return null
  return `ES-CIF-${cif}`
}

// ─────────────────────────────────────────────────────────────────────────
// UI átomos compartidos (chips, badge de fuente)
// ─────────────────────────────────────────────────────────────────────────

/** Pequeño chip de etiqueta (tipo/sector/ámbito) coloreado suave. */
export function OrgChip({
  children,
  tone = 'neutral',
  title,
}: {
  children: React.ReactNode
  tone?: 'accent' | 'neutral' | 'amber' | 'violet'
  title?: string
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    accent: { bg: ACCENT_SOFT, fg: ACCENT_DARK },
    neutral: { bg: '#F1F5F9', fg: '#475569' },
    amber: { bg: 'rgba(245,158,11,0.12)', fg: '#B45309' },
    violet: { bg: 'rgba(139,92,246,0.12)', fg: '#6D28D9' },
  }
  const t = tones[tone] ?? tones.neutral
  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.4,
        padding: '2px 8px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/**
 * Badge fuente + fecha de referencia del dato económico (cita CLAUDE.md). Se
 * pinta en cada fila/ficha para que el usuario sepa de dónde sale y a qué año.
 */
export function FuenteBadge({
  fuente,
  fecha,
  compact = false,
}: {
  fuente: string
  fecha: string
  compact?: boolean
}) {
  return (
    <span
      title={`${fuente} · referencia ${fecha}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: compact ? 9.5 : 10.5,
        color: '#94a3b8',
        maxWidth: compact ? 180 : undefined,
      }}
    >
      <span aria-hidden="true" style={{ color: ACCENT, opacity: 0.7 }}>◈</span>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: compact ? 130 : 240,
        }}
      >
        {fuente}
      </span>
      <span style={{ color: '#cbd5e1' }}>·</span>
      <span style={{ fontWeight: 700, color: '#64748b' }}>{fmtFecha(fecha)}</span>
    </span>
  )
}

/** Empty-state sobrio para los sub-paneles. */
export function OrgEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0', lineHeight: 1.5 }}>
      {children}
    </p>
  )
}
