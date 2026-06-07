'use client'
/**
 * <TSGlobal*> · helpers compartidos · Tercer Sector v3 · Sprint TS3 (Visión Global)
 *
 * Primitivas de presentación que reúsan las tarjetas-snapshot del cuadro
 * ejecutivo de la Visión Global. NO hacen fetch (lo hace cada snapshot) y NO
 * dependen de la lógica de negocio: solo cromo + formato.
 *
 * Principio de diseño (igual que la Visión Global de Energía/Turismo): SNAPSHOT,
 * NO detalle. Cada tarjeta da titulares y un enlace «ver detalle →» que cambia
 * de pestaña dentro del shell (sin recargar). Degradación honesta (CLAUDE.md):
 * valores `null` → '—', nunca se inventan cifras. Cero emojis · Unicode geométrico.
 */
import type { TercerSectorTab } from './TercerSectorShell'

export const TS_ACCENT = '#16A34A'
export const TS_ACCENT_DARK = '#15803D'

// ─────────────────────────────────────────────────────────────────────────
// Formato monetario / numérico (es-ES) · degradación honesta
// ─────────────────────────────────────────────────────────────────────────

/** Entero abreviado para titulares (es-ES). `null` → '—'. */
export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('es-ES')
}

/**
 * Euros abreviados a la escala natural (€/k/M/mil M). `null` → '—'.
 * No inventa decimales falsos: redondea con sensatez según magnitud.
 */
export function fmtEur(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil M€`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M€`
  if (abs >= 1_000) return `${(n / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k€`
  return `${Math.round(n).toLocaleString('es-ES')} €`
}

// ─────────────────────────────────────────────────────────────────────────
// Niveles de licitación · etiquetas legibles (multinivel CCAA→org. internac.)
// ─────────────────────────────────────────────────────────────────────────

export const NIVEL_LABEL: Record<string, string> = {
  ccaa: 'CCAA / local',
  nacional_es: 'Estado (ES)',
  ue: 'Unión Europea',
  pais_extranjero: 'País extranjero',
  regional_extranjero: 'Regional extranjero',
  org_internacional: 'Org. internacional',
}

export const NIVEL_COLOR: Record<string, string> = {
  ccaa: '#16A34A',
  nacional_es: '#0EA5E9',
  ue: '#6366F1',
  pais_extranjero: '#F59E0B',
  regional_extranjero: '#EC4899',
  org_internacional: '#8B5CF6',
}

// ─────────────────────────────────────────────────────────────────────────
// Tarjeta-snapshot · cromo común (cabecera + cuerpo + pie «ver detalle →»)
// ─────────────────────────────────────────────────────────────────────────

/** Chip pequeño para un par etiqueta+valor dentro de una snapshot. */
export function SnapStat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '9px 11px', minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#64748B',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: color ?? '#0f172a',
          lineHeight: 1.1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

/**
 * Contenedor de tarjeta-snapshot del cuadro ejecutivo: título + subtítulo +
 * badge de fuente + cuerpo + pie con enlace «ver detalle →» que conmuta de
 * pestaña en el shell (vía `onNavigate`). El detalle NO se replica aquí.
 */
export function SnapshotCard({
  title,
  subtitle,
  sourceLabel,
  sourceUrl,
  detalleTab,
  detalleLabel,
  onNavigate,
  loading,
  degradedNote,
  children,
}: {
  title: string
  subtitle?: string
  sourceLabel?: string
  sourceUrl?: string
  detalleTab: TercerSectorTab
  detalleLabel: string
  onNavigate: (tab: TercerSectorTab) => void
  loading?: boolean
  degradedNote?: string | null
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.012em',
              color: '#1d1d1f',
            }}
          >
            {title}
          </h3>
          {subtitle && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73', lineHeight: 1.4 }}>{subtitle}</p>}
        </div>
        {sourceUrl && sourceLabel && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            title={`Abrir ${sourceLabel}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color: '#1F4E8C',
              textDecoration: 'none',
              padding: '3px 9px',
              borderRadius: 999,
              background: '#F5F8FC',
              border: '1px solid #D8E5F4',
              whiteSpace: 'nowrap',
            }}
          >
            {sourceLabel}
            <span aria-hidden="true" style={{ fontSize: 9, opacity: 0.85 }}>↗</span>
          </a>
        )}
      </header>

      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando…</p>
        ) : (
          children
        )}
      </div>

      {degradedNote && !loading && (
        <p style={{ fontSize: 10.5, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 9px', margin: '12px 0 0', lineHeight: 1.4 }}>
          {degradedNote}
        </p>
      )}

      <footer style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', textAlign: 'right' }}>
        <button
          type="button"
          onClick={() => onNavigate(detalleTab)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11.5,
            fontWeight: 700,
            color: TS_ACCENT_DARK,
            letterSpacing: '0.01em',
            padding: 0,
          }}
        >
          {detalleLabel} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  )
}

/** Barra horizontal de proporción (para distribuciones por nivel/categoría). */
export function MiniBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
      <span style={{ flex: '0 0 130px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </span>
      <span style={{ flex: '0 0 56px', textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
        {count.toLocaleString('es-ES')}
      </span>
    </div>
  )
}
