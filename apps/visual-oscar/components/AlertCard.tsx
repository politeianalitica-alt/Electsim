'use client'

/**
 * AlertCard · componente compartido para mostrar alertas con el diseño de
 * la página /alertas (Sala de Control).
 *
 * Usado en:
 *   · /alertas        · listado completo con filtros
 *   · /dashboard      · top-5 en el panel ejecutivo (home única)
 *
 * La animación pulse para alertas críticas requiere los keyframes
 * `alertPulse`, `alertDot`, `alertCard` · usa <AlertKeyframes/> al menos
 * una vez por página para inyectarlos.
 */

export type AlertLevel = 'amarillo' | 'naranja' | 'rojo' | 'rojo-parpadeante'
export type AlertCategory = 'Mercados' | 'Gobierno' | 'Parlamento' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Riesgo'

export interface AlertaItem {
  id: string
  level: AlertLevel
  category: AlertCategory
  title: string
  description: string
  source: string
  ts: string
}

export const LEVEL_META: Record<AlertLevel, { label: string; color: string; bg: string; ring: string; pulse?: boolean }> = {
  'amarillo':         { label: 'BAJA',    color: '#EAB308', bg: 'rgba(234,179,8,0.10)',  ring: 'rgba(234,179,8,0.45)' },
  'naranja':          { label: 'MEDIA',   color: '#F97316', bg: 'rgba(249,115,22,0.10)', ring: 'rgba(249,115,22,0.50)' },
  'rojo':             { label: 'ALTA',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)',  ring: 'rgba(220,38,38,0.50)' },
  'rojo-parpadeante': { label: 'CRÍTICA', color: '#7F1D1D', bg: 'rgba(127,29,29,0.16)',  ring: 'rgba(127,29,29,0.7)', pulse: true },
}

export const LEVELS_ORDER: AlertLevel[] = ['rojo-parpadeante', 'rojo', 'naranja', 'amarillo']

interface AlertCardProps {
  alert: AlertaItem
  onDetailClick?: () => void
  compact?: boolean   // true para vistas embebidas (paddings reducidos)
}

export default function AlertCard({ alert, onDetailClick, compact = false }: AlertCardProps) {
  const m = LEVEL_META[alert.level]
  return (
    <article style={{
      display: 'grid', gridTemplateColumns: '6px 110px 1fr auto', gap: 14, alignItems: 'center',
      padding: compact ? '10px 14px 10px 0' : '14px 18px 14px 0', borderRadius: 14,
      background: m.bg, border: `1px solid ${m.ring}`,
      position: 'relative', overflow: 'hidden',
      animation: m.pulse ? 'alertCard 1.6s ease-in-out infinite' : undefined,
    }}>
      <div style={{
        background: m.color, height: '100%',
        boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
      }}/>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
          color: '#fff', background: m.color,
          padding: '3px 8px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          animation: m.pulse ? 'alertPulse 1.2s ease-in-out infinite' : undefined,
          boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
        }}>
          {m.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'alertDot 1s ease-in-out infinite' }}/>}
          {m.label}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em' }}>{alert.category.toUpperCase()}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: compact ? 13.5 : 15, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f' }}>{alert.title}</h3>
        <p style={{ margin: '3px 0 6px', fontSize: compact ? 11.5 : 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>{alert.description}</p>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>{alert.source} · <span style={{ fontWeight: 600 }}>{alert.ts}</span></span>
      </div>
      <button onClick={onDetailClick} style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
        padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>Detalle →</button>
    </article>
  )
}

/** Inyecta los keyframes globales de animación · usar 1 vez por página. */
export function AlertKeyframes() {
  return (
    <style>{`
      @keyframes alertPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.92); } }
      @keyframes alertDot   { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      @keyframes alertCard  { 0%, 100% { box-shadow: 0 0 0 0 rgba(185,28,28,0); } 50% { box-shadow: 0 0 22px -2px rgba(185,28,28,0.45); } }
    `}</style>
  )
}
