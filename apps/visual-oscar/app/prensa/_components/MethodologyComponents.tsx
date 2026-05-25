'use client'
/**
 * MethodologyComponents · Sprint M1.
 *
 * Pequeños componentes UI auditables para mostrar la metodología detrás
 * de cada insight del módulo Medios. Sin librerías nuevas · sólo SVG/inline.
 *
 * Exports:
 *   - <SourceMethodologyCard /> · resumen de fuentes seleccionadas/balance
 *   - <ConfidenceBadge />       · badge 0..1 con color y tooltip
 *   - <ActorImpactPill />       · pill beneficial/harmful/neutral
 *   - <MethodologyWarnings />   · lista de advertencias con icono
 *   - <SourceBalanceMiniChart />· barras horizontales sin libs
 */

import React from 'react'

// ──────────────────────────────────────────────────────────────────────
// 1 · ConfidenceBadge
// ──────────────────────────────────────────────────────────────────────

export function ConfidenceBadge({ value, label = 'confianza', size = 'sm', reasons }: {
  value: number               // 0..1
  label?: string
  size?: 'xs' | 'sm' | 'md'
  reasons?: string[]
}) {
  const pct = Math.round(value * 100)
  const color = value >= 0.7 ? '#16a34a' : value >= 0.5 ? '#f59e0b' : '#dc2626'
  const bg = value >= 0.7 ? '#dcfce7' : value >= 0.5 ? '#fef3c7' : '#fee2e2'
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 10 : 11
  const padding = size === 'xs' ? '2px 6px' : size === 'sm' ? '3px 8px' : '4px 10px'
  const title = reasons && reasons.length > 0 ? `${label}: ${pct}% · ${reasons.join(' · ')}` : `${label}: ${pct}%`
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize, fontWeight: 700, letterSpacing: 0.4,
      padding, borderRadius: 4,
      background: bg, color, border: `1px solid ${color}40`,
      fontFamily: 'ui-monospace, monospace',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {label} {pct}%
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────
// 2 · ActorImpactPill
// ──────────────────────────────────────────────────────────────────────

export function ActorImpactPill({ actor, impact, confidence, reason }: {
  actor: string
  impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
  confidence: number
  reason?: string
}) {
  const meta = {
    beneficial: { color: '#16a34a', bg: '#dcfce7', label: 'beneficia' },
    harmful:    { color: '#dc2626', bg: '#fee2e2', label: 'perjudica' },
    neutral:    { color: '#475569', bg: '#f1f5f9', label: 'neutral' },
    uncertain:  { color: '#94a3b8', bg: '#f8fafc', label: 'incierto' },
  }[impact]
  const title = reason ? `${actor} · ${meta.label} (conf ${(confidence * 100).toFixed(0)}%) · ${reason}` : `${actor} · ${meta.label}`
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 10, padding: '2px 8px', borderRadius: 4,
      background: meta.bg, border: `1px solid ${meta.color}40`,
    }}>
      <span style={{ fontWeight: 700, color: meta.color, fontSize: 9, letterSpacing: 0.3 }}>{meta.label.toUpperCase()}</span>
      <span style={{ color: '#0f172a' }}>{actor}</span>
      <span style={{ fontSize: 8, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
        {(confidence * 100).toFixed(0)}%
      </span>
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────
// 3 · MethodologyWarnings
// ──────────────────────────────────────────────────────────────────────

export function MethodologyWarnings({ warnings, title = 'Advertencias metodológicas' }: {
  warnings: string[]
  title?: string
}) {
  if (!warnings || warnings.length === 0) return null
  return (
    <div style={{
      background: '#fef3c7',
      border: '1px solid #fde68a',
      borderLeft: '3px solid #f59e0b',
      borderRadius: 4,
      padding: '8px 12px',
      fontSize: 11,
      color: '#92400e',
    }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: '#b45309', textTransform: 'uppercase', marginBottom: 4 }}>
        ! {title}
      </p>
      <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
        {warnings.map((w, i) => (
          <li key={i} style={{ marginBottom: 2, lineHeight: 1.4 }}>{w}</li>
        ))}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// 4 · SourceBalanceMiniChart · barras horizontales sin libs
// ──────────────────────────────────────────────────────────────────────

export function SourceBalanceMiniChart({ data, color = '#1F4E8C', height = 100, labelWidth = 110 }: {
  data: Array<{ label: string; value: number; color?: string }>
  color?: string
  height?: number
  labelWidth?: number
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: height, overflowY: 'auto' }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} style={{
          display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 40px`, gap: 6, alignItems: 'center', fontSize: 10,
        }}>
          <span style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ background: '#f1f5f9', borderRadius: 2, height: 10, position: 'relative' }}>
            <div style={{
              background: d.color || color,
              height: '100%', borderRadius: 2,
              width: `${(d.value / max) * 100}%`,
            }} />
          </div>
          <span style={{ color: d.color || color, fontFamily: 'ui-monospace, monospace', fontWeight: 700, textAlign: 'right' }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// 5 · SourceMethodologyCard
// ──────────────────────────────────────────────────────────────────────

interface SourceMethodologyData {
  selected_sources: number
  eligible_sources: number
  catalog_total: number
  balance_mode: string
  ideological_distribution: Record<string, number>
  territorial_distribution: Record<string, number>
  media_type_distribution: Record<string, number>
  group_distribution: Array<{ group: string; count: number; share: number }>
  ideological_balance_score: number
  territorial_balance_score: number
  type_balance_score: number
  credibility_avg: number
  audience_total_M: number
  warnings: string[]
  copy_for_hero?: string
}

const IDEO_COLORS: Record<string, string> = {
  left: '#dc2626', 'center-left': '#f97316', center: '#94a3b8', 'center-right': '#0891b2', right: '#1e40af',
}
const TERR_COLORS: Record<string, string> = {
  nacional: '#1F4E8C', regional: '#16a34a', local: '#84cc16', europeo: '#7c3aed', internacional: '#a855f7', sectorial: '#10b981',
}

export function SourceMethodologyCard({ data, compact = false }: { data: SourceMethodologyData; compact?: boolean }) {
  if (!data) return null
  const ideoData = Object.entries(data.ideological_distribution).map(([k, v]) => ({
    label: k, value: v, color: IDEO_COLORS[k] || '#64748b',
  }))
  const terrData = Object.entries(data.territorial_distribution).filter(([, v]) => v > 0).map(([k, v]) => ({
    label: k, value: v, color: TERR_COLORS[k] || '#64748b',
  }))
  const groupData = data.group_distribution.slice(0, 8).map((g) => ({
    label: g.group, value: g.count,
  }))

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #475569',
      borderRadius: 10,
      padding: 14,
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#475569', textTransform: 'uppercase' }}>
            ◆ Metodología de fuentes
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0f172a' }}>
            <strong>Catálogo:</strong> {data.catalog_total} medios · <strong>Elegibles:</strong> {data.eligible_sources} ·{' '}
            <strong>Analizados ahora:</strong> {data.selected_sources}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
            Modo: <strong style={{ color: '#0f172a' }}>{data.balance_mode}</strong> · audiencia total {data.audience_total_M.toFixed(1)}M ·
            credibilidad media {data.credibility_avg}/100
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ConfidenceBadge value={data.ideological_balance_score} label="balance ideo" size="xs" />
          <ConfidenceBadge value={data.territorial_balance_score} label="balance terr" size="xs" />
          <ConfidenceBadge value={data.type_balance_score} label="balance tipo" size="xs" />
        </div>
      </header>

      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
              Distribución ideológica
            </p>
            <SourceBalanceMiniChart data={ideoData} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
              Ámbito territorial
            </p>
            <SourceBalanceMiniChart data={terrData} />
          </div>
          {groupData.length > 0 && (
            <div>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>
                Grupos mediáticos top
              </p>
              <SourceBalanceMiniChart data={groupData} color="#475569" labelWidth={130} />
            </div>
          )}
        </div>
      )}

      {data.warnings.length > 0 && <MethodologyWarnings warnings={data.warnings} />}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// 6 · NarrativeEvidenceDrawer (placeholder ligero · expand on demand)
// ──────────────────────────────────────────────────────────────────────

export function NarrativeEvidence({ evidence }: {
  evidence: Array<{ title: string; medium: string; url: string; ideology?: string }>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
      {evidence.map((e, i) => (
        <a key={i} href={e.url} target="_blank" rel="noopener noreferrer" style={{
          padding: '4px 8px', background: '#f8fafc', borderLeft: '2px solid #cbd5e1', borderRadius: 3,
          textDecoration: 'none', color: 'inherit', fontSize: 10,
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: 0.4, marginRight: 6 }}>
            {(e.ideology || '?').toUpperCase()}
          </span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{e.medium}</span>
          <span style={{ color: '#475569', marginLeft: 6 }}>· {e.title}</span>
        </a>
      ))}
    </div>
  )
}
