'use client'
import { useEffect, useState } from 'react'

interface Props {
  /** ISO timestamp del último fetch */
  updatedAt: string | null
  /** 'backend' = datos reales · 'mock' = fallback · null = aún cargando */
  source: 'backend' | 'mock' | null
  /** Intervalo de auto-refresh en segundos (solo display) */
  refreshIntervalSec?: number
  /** Callback opcional para forzar refresh */
  onRefresh?: () => void
}

/**
 * Badge inline que muestra "EN VIVO · hace 12s · backend conectado"
 * o equivalente en modo mock. Se actualiza automáticamente cada segundo
 * para que el contador "hace Xs" avance.
 */
export default function LiveStatusBadge({ updatedAt, source, refreshIntervalSec = 30, onRefresh }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null
  const ageS = ageMs !== null ? Math.max(0, Math.floor(ageMs / 1000)) : null
  const fresh = ageS !== null && ageS < refreshIntervalSec + 5

  const isBackend = source === 'backend'
  const isMock = source === 'mock'
  const dotColor = isBackend ? '#10b981' : (isMock ? '#f59e0b' : '#9ca3af')
  const labelText = isBackend ? 'BACKEND CONECTADO' : (isMock ? 'DATOS DE DEMO' : 'CONECTANDO…')

  function fmtAge(s: number | null): string {
    if (s === null) return '—'
    if (s < 60) return `hace ${s}s`
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`
    return `hace ${Math.floor(s / 3600)} h`
  }

  return (
    <span
      onClick={onRefresh}
      title={onRefresh ? 'Click para refrescar manualmente' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 10px', borderRadius: 999,
        background: isBackend ? 'rgba(16,185,129,0.10)' : (isMock ? 'rgba(245,158,11,0.10)' : 'rgba(156,163,175,0.10)'),
        border: `1px solid ${isBackend ? 'rgba(16,185,129,0.30)' : (isMock ? 'rgba(245,158,11,0.30)' : 'rgba(156,163,175,0.30)')}`,
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
