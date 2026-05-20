'use client'

/**
 * Badge "fuente de datos" — muestra si la pantalla está consumiendo datos
 * reales del backend, datos en caché, modo demo, o ha fallado.
 *
 * Uso:
 * <DataSourceBadge source={meta?.source} ts={meta?.ts} warnings={meta?.warnings} />
 *
 * El operador NUNCA debe confundir demo con producción — este badge es la
 * última línea de defensa visual.
 */

import type { DataSource } from '@/lib/api/types'

interface Props {
  source?: DataSource | null
  ts?: string
  warnings?: string[]
  /** Compacto = solo punto + texto; expanded = pill con borde. */
  variant?: 'compact' | 'pill'
}

const STYLES: Record<DataSource, { label: string; bg: string; fg: string; dot: string }> = {
  backend:  { label: 'EN VIVO',  bg: 'rgba(16,185,129,0.10)', fg: '#059669', dot: '#10b981' },
  mock:     { label: 'DEMO',     bg: 'rgba(245,158,11,0.10)', fg: '#b45309', dot: '#f59e0b' },
  fallback: { label: 'CACHE',    bg: 'rgba(99,102,241,0.10)', fg: '#4f46e5', dot: '#6366f1' },
  error:    { label: 'ERROR',    bg: 'rgba(239,68,68,0.10)',  fg: '#dc2626', dot: '#ef4444' },
}

function fmtTs(ts?: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const now = Date.now()
    const diff = (now - d.getTime()) / 1000
    if (diff < 60) return 'hace unos segundos'
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
    return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function DataSourceBadge({ source, ts, warnings, variant = 'compact' }: Props) {
  if (!source) return null
  const s = STYLES[source]
  const tsLabel = fmtTs(ts)
  const hasWarnings = warnings && warnings.length > 0
  const title = hasWarnings ? warnings.join(' · ') : `Actualizado ${tsLabel}`

  if (variant === 'pill') {
    return (
 <span
        title={title}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 999,
          background: s.bg, color: s.fg,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          border: `1px solid ${s.fg}33`,
        }}
      >
 <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, boxShadow: source === 'backend' ? `0 0 0 0 ${s.dot}` : 'none', animation: source === 'backend' ? '_pulseDot 2s ease-in-out infinite' : 'none' }} />
        {s.label}
        {tsLabel && <span style={{ opacity: 0.7, fontWeight: 400 }}>· {tsLabel}</span>}
 <style>{`@keyframes _pulseDot{0%,100%{box-shadow:0 0 0 0 ${s.dot}88}50%{box-shadow:0 0 0 4px ${s.dot}00}}`}</style>
 </span>
    )
  }

  // compact
  return (
 <span
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: s.fg, fontWeight: 600 }}
    >
 <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />
      {s.label}
      {tsLabel && <span style={{ opacity: 0.6, fontWeight: 400 }}> · {tsLabel}</span>}
 </span>
  )
}
