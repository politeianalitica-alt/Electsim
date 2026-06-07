'use client'
/**
 * AlojShared · Turismo v3 · Sprint T5 · primitivas internas de Alojamiento
 *
 * Tipos + helpers compartidos por los sub-componentes Aloj* (tarjetas, series,
 * rentabilidad). Todo lo que sea "fuente de verdad" del shape lo importamos de
 * lib/turismo/ocupacion (sin tocar lib): aquí solo añadimos color por tipo,
 * formateadores es-ES y micro-componentes de UI (badge degradado, celda de
 * métrica, empty-state honesto). Cero emojis · Unicode geométrico.
 */
import type { ReactNode } from 'react'

// ── Shape de respuesta de /api/turismo/ocupacion (envelope { ok, data, … }) ──
// Reusamos el contrato del data layer (lib/turismo/ocupacion.ts). No lo
// re-derivamos a mano: cualquier campo nuevo allí se refleja aquí al tipar.
export type {
  AlojamientoTipo,
  OcupacionTipo,
  OcupacionData,
} from '@/lib/turismo/ocupacion'
import type { OcupacionData } from '@/lib/turismo/ocupacion'

/** Envelope del endpoint (HTTP 200 incluso al degradar). */
export interface OcupacionEnvelope {
  ok: boolean
  data: OcupacionData | null
  error?: string
  fetched_at?: string
  source_url?: string
  partial?: boolean
}

export const ACCENT = '#0EA5E9'
export const ACCENT_DARK = '#075985'

export const INE_OCUPACION_URL =
  'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176863'

/** Color estable por tipo de alojamiento (consistente en cards + series). */
export const TIPO_COLOR: Record<string, string> = {
  hoteles: '#0EA5E9', // azul (cyan) · el grande
  apartamentos: '#7C3AED', // violeta
  campings: '#16A34A', // verde
  rural: '#F59E0B', // ámbar
}

/** Glyph Unicode (no emoji) por tipo, para encabezar tarjetas. */
export const TIPO_GLYPH: Record<string, string> = {
  hoteles: '▤',
  apartamentos: '⊞',
  campings: '△',
  rural: '◇',
}

// ── Formateadores es-ES ──────────────────────────────────────────────────────

/** Número entero/decimal con separadores es-ES. `null` → '—'. */
export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: decimals })
}

/** Pernoctaciones compactas (millones con 2 dec si ≥1M, miles si menor). */
export function fmtPernoct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 2 })}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}k`
  return v.toLocaleString('es-ES')
}

/** Porcentaje con 1 decimal. `null` → '—'. */
export function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`
}

/** Euros con 2 decimales. `null` → '—'. */
export function fmtEur(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`
}

/** "2026-04" → "abr 2026"; "2026-Q1" → "1T 2026"; "2026" → "2026". */
export function fmtPeriod(p: string | null | undefined): string {
  if (!p) return '—'
  const mq = /^(\d{4})-Q([1-4])$/.exec(p)
  if (mq) return `${mq[2]}T ${mq[1]}`
  const mm = /^(\d{4})-(\d{2})$/.exec(p)
  if (mm) {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const i = parseInt(mm[2], 10) - 1
    if (i >= 0 && i < 12) return `${meses[i]} ${mm[1]}`
  }
  return p
}

// ── Micro-componentes de UI ──────────────────────────────────────────────────

/** Chip "datos parciales" para tipos cuya fuente degradó alguna métrica. */
export function DegradedBadge({ label = 'Datos parciales' }: { label?: string }) {
  return (
    <span
      title="Alguna métrica esperada de este tipo no llegó de la fuente INE; se muestra lo disponible."
      style={{
        fontSize: 8.5,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 5,
        background: '#FEF3C7',
        color: '#92400E',
        whiteSpace: 'nowrap',
      }}
    >
      ! {label}
    </span>
  )
}

/** Celda de métrica: etiqueta + valor (con '—' honesto si null). */
export function MetricCell({
  label,
  value,
  color = '#1d1d1f',
  sub,
}: {
  label: string
  value: ReactNode
  color?: string
  sub?: string
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#86868b',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

/** Empty-state honesto (no se inventa contenido · CLAUDE.md). */
export function AlojEmpty({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: '#86868b',
        lineHeight: 1.5,
        padding: '18px 4px',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}
