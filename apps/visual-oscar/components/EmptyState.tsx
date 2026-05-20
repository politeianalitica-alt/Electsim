'use client'

/**
 * EmptyState · estado informativo y accionable cuando un módulo está vacío,
 * cargando, con error o sin conexión.
 *
 * Sustituye mensajes genéricos ("Sin datos", "Loading…", "CONNECTING…")
 * por una explicación profesional:
 *   - Qué falta
 *   - Por qué puede estar ocurriendo
 *   - Última actualización o intento
 *   - Fuente o conector afectado
 *   - Acción recomendada (botón primario + secundario diagnóstico)
 *
 * Severity controla el acento visual:
 *   neutral  · vacío natural (no es error)
 *   warning  · degradación parcial · falta alguna fuente
 *   error    · fallo completo · backend caído
 *   success  · vacío bueno · "no hay alertas" = está todo bien
 */

import type { CSSProperties } from 'react'

export type EmptyStateSeverity = 'neutral' | 'warning' | 'error' | 'success'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
  loading?: boolean
}

export interface EmptyStateProps {
  /** Título corto · 3-7 palabras · en español ejecutivo */
  title: string
  /** Descripción ampliada · 1-2 frases */
  description?: string
  /** Causa probable · una frase técnica */
  reason?: string
  /** Última actualización · ISO datetime o frase relativa */
  lastUpdated?: string | null
  /** Fuente o conector afectado · ej. "Banco Mundial WDI" */
  source?: string
  /** Acción primaria · azul */
  primaryAction?: EmptyStateAction
  /** Acción secundaria · grey diagnóstico */
  secondaryAction?: EmptyStateAction
  /** Color base · default neutral */
  severity?: EmptyStateSeverity
  /** Compact · padding reducido para usar dentro de cards pequeñas */
  compact?: boolean
  /** Override de estilo del contenedor */
  style?: CSSProperties
}

const SEVERITY_META: Record<EmptyStateSeverity, { color: string; bg: string; iconBg: string; iconStroke: string; icon: 'info' | 'warn' | 'error' | 'check' }> = {
  neutral: { color: '#6e6e73', bg: '#FAFAFA',                iconBg: '#F0F0F2',   iconStroke: '#6e6e73', icon: 'info'  },
  warning: { color: '#B45309', bg: 'rgba(245,158,11,0.06)',  iconBg: '#FEF3C7',   iconStroke: '#B45309', icon: 'warn'  },
  error:   { color: '#B91C1C', bg: 'rgba(220,38,38,0.06)',   iconBg: '#FEE2E2',   iconStroke: '#B91C1C', icon: 'error' },
  success: { color: '#15803D', bg: 'rgba(22,163,74,0.06)',   iconBg: '#DCFCE7',   iconStroke: '#15803D', icon: 'check' },
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  if (!/^\d{4}-/.test(iso)) return iso // ya es texto relativo
  try {
    const d = new Date(iso).getTime()
    if (!Number.isFinite(d)) return iso
    const diffMin = Math.round((Date.now() - d) / 60000)
    if (diffMin < 1) return 'hace <1 min'
    if (diffMin < 60) return `hace ${diffMin} min`
    const h = Math.round(diffMin / 60)
    if (h < 24) return `hace ${h} h`
    const days = Math.round(h / 24)
    return `hace ${days} d`
  } catch { return iso }
}

function IconBubble({ kind, color, bg, stroke }: { kind: 'info' | 'warn' | 'error' | 'check'; color: string; bg: string; stroke: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'info'  && (<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="0.5" fill={stroke}/></>)}
        {kind === 'warn'  && (<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill={stroke}/></>)}
        {kind === 'error' && (<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>)}
        {kind === 'check' && (<><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>)}
      </svg>
      <style>{`/* keep eslint happy on color var */ .${color.length}`}</style>
    </div>
  )
}

export default function EmptyState({
  title, description, reason, lastUpdated, source,
  primaryAction, secondaryAction,
  severity = 'neutral', compact = false, style,
}: EmptyStateProps) {
  const meta = SEVERITY_META[severity]
  const showMetaLine = !!(source || lastUpdated)
  return (
    <div style={{
      background: meta.bg,
      border: `1px solid ${severity === 'neutral' ? '#ECECEF' : meta.color + '33'}`,
      borderRadius: 14,
      padding: compact ? '16px 18px' : '22px 26px',
      display: 'flex', gap: compact ? 12 : 16, alignItems: 'flex-start',
      ...style,
    }}>
      <IconBubble kind={meta.icon} color={meta.color} bg={meta.iconBg} stroke={meta.iconStroke}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          margin: 0, fontFamily: 'var(--font-display)',
          fontSize: compact ? 14 : 15.5, fontWeight: 600,
          letterSpacing: '-0.01em', color: '#1d1d1f',
        }}>{title}</h3>
        {description && (
          <p style={{
            margin: '6px 0 0', fontSize: compact ? 12.5 : 13.5,
            color: '#3a3a3d', lineHeight: 1.5,
          }}>{description}</p>
        )}
        {reason && (
          <p style={{
            margin: '8px 0 0', fontSize: 12, color: meta.color,
            lineHeight: 1.4, fontWeight: 500,
          }}>
            <span style={{ fontWeight: 700 }}>Causa probable · </span>{reason}
          </p>
        )}
        {showMetaLine && (
          <div style={{
            marginTop: 10, display: 'flex', gap: 14, fontSize: 11.5,
            color: '#86868b', flexWrap: 'wrap',
          }}>
            {source && (
              <span><span style={{ fontWeight: 600, color: '#6e6e73' }}>Fuente</span> · {source}</span>
            )}
            {lastUpdated && (
              <span><span style={{ fontWeight: 600, color: '#6e6e73' }}>Última actualización</span> · {relativeTime(lastUpdated)}</span>
            )}
          </div>
        )}
        {(primaryAction || secondaryAction) && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {primaryAction && (
              <ActionButton action={primaryAction} variant="primary"/>
            )}
            {secondaryAction && (
              <ActionButton action={secondaryAction} variant="secondary"/>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({ action, variant }: { action: EmptyStateAction; variant: 'primary' | 'secondary' }) {
  const baseStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
    cursor: action.loading ? 'wait' : 'pointer',
    opacity: action.loading ? 0.6 : 1,
    transition: 'background 150ms, border-color 150ms',
    textDecoration: 'none',
    ...(variant === 'primary'
      ? { background: '#0071e3', color: '#fff', border: '1px solid #0071e3' }
      : { background: '#fff', color: '#3a3a3d', border: '1px solid #ECECEF' }),
  }
  if (action.href) {
    return (
      <a href={action.href} target={action.href.startsWith('http') ? '_blank' : undefined}
         rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
         style={baseStyle}>
        {action.loading && <Spinner/>}
        {action.label}
      </a>
    )
  }
  return (
    <button onClick={action.onClick} disabled={action.loading} style={{ ...baseStyle, border: baseStyle.border as string }}>
      {action.loading && <Spinner/>}
      {action.label}
    </button>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 11, height: 11, border: '2px solid currentColor',
      borderTopColor: 'transparent', borderRadius: '50%',
      display: 'inline-block', animation: 'emptyStateSpin 800ms linear infinite',
    }}>
      <style>{`@keyframes emptyStateSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}
