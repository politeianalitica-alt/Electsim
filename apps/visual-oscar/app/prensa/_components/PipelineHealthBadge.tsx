'use client'
/**
 * PipelineHealthBadge · Sprint 0.5
 *
 * Chip compacto que muestra el ConfidenceScore del pipeline canónico:
 *   · score ≥ 0.7  → verde · "ok"
 *   · score ≥ 0.5  → ámbar · "degraded"
 *   · score < 0.5  → rojo  · "critical"
 *
 * Tooltip con los 4 componentes (clasificación / entidades / dedup / tier 1-2).
 */
import { useMediaPulso } from '../_hooks/useMediaPulso'

export function PipelineHealthBadge() {
  const { data, loading } = useMediaPulso('72h', 'PLURAL')

  if (loading || !data) {
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 4,
          background: '#eee',
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        pipeline · loading
      </span>
    )
  }

  const score = data.confidence?.score ?? 0
  const color = score >= 0.7 ? '#16a34a' : score >= 0.5 ? '#f59e0b' : '#dc2626'
  const label = score >= 0.7 ? 'ok' : score >= 0.5 ? 'degraded' : 'critical'
  const c = data.confidence?.components
  const tooltip = c
    ? [
        `Clasificación: ${(c.classificationCoverage * 100).toFixed(0)}%`,
        `Entidades: ${(c.entityCoverage * 100).toFixed(0)}%`,
        `Dedup: ${(c.deduplicationRate * 100).toFixed(0)}%`,
        `Tier 1-2: ${(c.tier12Proportion * 100).toFixed(0)}%`,
      ].join(' · ')
    : 'sin componentes'

  return (
    <span
      title={tooltip}
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        background: color,
        color: '#fff',
        fontSize: 11,
        fontFamily: 'monospace',
      }}
    >
      pipeline · {label} · {(score * 100).toFixed(0)}%
    </span>
  )
}
