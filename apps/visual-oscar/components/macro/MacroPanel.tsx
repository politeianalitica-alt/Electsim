'use client'
/**
 * `<MacroPanel />` · Wrapper de sección con header + badge LIVE/STALE/MISSING.
 *
 * Si recibe `aiAnalysis`, AUTO-CARGA el análisis Groq al montar (sin botón).
 * El bloque IA aparece directamente debajo del body con headline,
 * trend/why/consequences/risks/watchlist + opción "Regenerar IA".
 */
import { ReactNode } from 'react'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'
// Sprint N5: AIChartAnalysisButton retirado del render (una sola IA por página).
// Import comentado para conservar referencia si decidimos reintroducirlo.
// import { AIChartAnalysisButton } from './AIChartAnalysisButton'

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
  /** Si se pasa, renderiza botón "◆ Explicar con IA" + panel inline. */
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
      {/* Sprint N5 (2026-05-23): IA por gráfica deshabilitada. El usuario pidió
          una sola explicación IA por página (HeroEjecutivo arriba). El prop
          aiAnalysis se mantiene en la interfaz para compatibilidad pero el
          botón ya no se renderiza aquí. Para análisis específico de un
          indicador → click en la card → IndicatorDetailLayout tiene tab "Groq". */}
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
