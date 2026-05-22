'use client'
/**
 * `<MacroPanel />` · Wrapper de sección con header + badge LIVE/STALE/MISSING.
 *
 * Si recibe `aiAnalysis`, renderiza un botón "✦ Explicar con IA" en el
 * header (rightSlot) que dispara `/api/macro/ai/analyze-chart` y muestra
 * el análisis estructurado debajo del body del panel.
 */
import { ReactNode } from 'react'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'
import { AIChartAnalysisButton } from './AIChartAnalysisButton'

export function MacroPanel({
  accent,
  title,
  subtitle,
  status = 'idle',
  rightSlot,
  aiAnalysis,
  children,
}: {
  accent: string
  title: string
  subtitle?: string
  status?: 'idle' | 'live' | 'cache' | 'stale' | 'missing' | 'loading'
  rightSlot?: ReactNode
  /** Si se pasa, renderiza botón "✦ Explicar con IA" + panel inline. */
  aiAnalysis?: ChartAnalysisInput
  children: ReactNode
}) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${accent}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: accent, fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
            {title}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{subtitle}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {status !== 'idle' && <StatusBadge status={status} accent={accent} />}
          {rightSlot}
        </div>
      </header>
      {children}
      {aiAnalysis && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <AIChartAnalysisButton input={aiAnalysis} accent={accent} inline={true} />
        </div>
      )}
    </section>
  )
}

function StatusBadge({ status, accent }: { status: string; accent: string }) {
  void accent
  const map: Record<string, { bg: string; color: string; label: string }> = {
    live: { bg: '#dcfce7', color: '#166534', label: 'LIVE' },
    cache: { bg: '#dbeafe', color: '#1e40af', label: 'CACHE' },
    stale: { bg: '#fef3c7', color: '#92400e', label: 'STALE' },
    missing: { bg: '#fee2e2', color: '#991b1b', label: 'NO DATA' },
    loading: { bg: '#f1f5f9', color: '#64748b', label: 'CARGANDO' },
  }
  const cfg = map[status] || { bg: '#f1f5f9', color: '#64748b', label: status }
  return (
    <span style={{
      fontSize: 9, padding: '3px 8px', background: cfg.bg, color: cfg.color, borderRadius: 4,
      fontWeight: 700, letterSpacing: 0.4,
    }}>
      {cfg.label}
    </span>
  )
}

export default MacroPanel
