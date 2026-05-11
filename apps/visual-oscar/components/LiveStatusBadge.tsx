'use client'
import { useEffect, useState } from 'react'
import type { DataSource } from '@/lib/api/types'

interface Props {
  /** ISO timestamp del último fetch */
  updatedAt: string | null
  /** 'backend' = datos reales · 'mock' = fallback · 'fallback' = caché · 'error' = fallo · null = cargando */
  source: DataSource | null
  /** Intervalo de auto-refresh en segundos (solo display) */
  refreshIntervalSec?: number
  /** Callback opcional para forzar refresh */
  onRefresh?: () => void
  /** Avisos no fatales — se muestran en tooltip */
  warnings?: string[] | null
}

/**
 * Badge inline que muestra "EN VIVO · hace 12s · backend conectado"
 * o equivalente en modo mock. Se actualiza automáticamente cada segundo
 * para que el contador "hace Xs" avance.
 */
export default function LiveStatusBadge({ updatedAt, source, refreshIntervalSec = 30, onRefresh, warnings }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null
  const ageS = ageMs !== null ? Math.max(0, Math.floor(ageMs / 1000)) : null
  const fresh = ageS !== null && ageS < refreshIntervalSec + 5

  const isBackend = source === 'backend'
  const isMock = source === 'mock' || source === 'fallback'
  const isError = source === 'error'
  const dotColor = isBackend ? '#10b981' : isError ? '#ef4444' : (isMock ? '#f59e0b' : '#9ca3af')
  const labelText = isBackend
    ? 'BACKEND CONECTADO'
    : isError
      ? 'ERROR DE CONEXIÓN'
      : (isMock ? 'DATOS DE DEMO' : 'CONECTANDO…')

  function fmtAge(s: number | null): string {
    if (s === null) return '—'
    // Si los datos se refrescaron en los últimos 30 s consideramos que están al día.
    if (s < 30) return 'actualizado'
    if (s < 60) return `hace ${s}s`
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`
    return `hace ${Math.floor(s / 3600)} h`
  }

  const warningsTooltip = warnings && warnings.length > 0
    ? `Avisos: ${warnings.join(' · ')}`
    : onRefresh ? 'Click para refrescar manualmente' : undefined
  const bg = isBackend
    ? 'rgba(16,185,129,0.10)'
    : isError ? 'rgba(239,68,68,0.10)'
    : isMock ? 'rgba(245,158,11,0.10)'
    : 'rgba(156,163,175,0.10)'
  const borderCol = isBackend
    ? 'rgba(16,185,129,0.30)'
    : isError ? 'rgba(239,68,68,0.30)'
    : isMock ? 'rgba(245,158,11,0.30)'
    : 'rgba(156,163,175,0.30)'
  return (
    <span
      onClick={onRefresh}
      title={warningsTooltip}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 10px', borderRadius: 999,
        background: bg,
        border: `1px solid ${borderCol}`,
        fontSize: 10.5, fontFamily: 'inherit', fontWeight: 600,
        letterSpacing: '0.04em', color: dotColor,
        cursor: onRefresh ? 'pointer' : 'default',
        userSelect: 'none',
        verticalAlign: 'middle',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: dotColor,
        animation: fresh ? 'liveStatusPulse 1.6s ease-in-out infinite' : undefined,
        boxShadow: fresh ? `0 0 8px ${dotColor}` : undefined,
      }}/>
      <span>{labelText}</span>
      <span style={{ opacity: 0.6, fontWeight: 400 }}>· {fmtAge(ageS)}</span>
      <style>{`
        @keyframes liveStatusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </span>
  )
}
