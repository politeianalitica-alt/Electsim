'use client'
import type { SanctionsScreenResult } from '@/types/ports'

const STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  CLEAR: { bg: '#dcfce7', fg: '#166534', label: 'Sin coincidencias' },
  LOW: { bg: '#f0f9ff', fg: '#075985', label: 'Riesgo bajo' },
  MEDIUM: { bg: '#fef3c7', fg: '#92400e', label: 'Atención · revisión manual' },
  HIGH: { bg: '#fee2e2', fg: '#991b1b', label: 'HIT · sanciones detectadas' },
}

export function SanctionsBadge({ result }: { result?: SanctionsScreenResult }) {
  if (!result) return null
  if (!result.ok) {
    return (
      <div
        style={{
          padding: '6px 10px',
          background: '#f3f4f6',
          color: '#6b7280',
          fontSize: 12,
          borderRadius: 6,
          display: 'inline-block',
        }}
      >
        Screening no disponible: {result.error ?? 'desconocido'}
      </div>
    )
  }
  const lv = STYLE[result.risk_level] ?? STYLE.LOW
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: lv.bg,
        color: lv.fg,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
    >
      <span style={{ fontSize: 11 }}>SANCIONES</span>
      <strong>{result.risk_level}</strong>
      <span style={{ fontWeight: 500 }}>· {lv.label}</span>
      <span style={{ fontWeight: 500, color: lv.fg, opacity: 0.7 }}>· score {result.risk_score}/100</span>
    </div>
  )
}

export default SanctionsBadge
