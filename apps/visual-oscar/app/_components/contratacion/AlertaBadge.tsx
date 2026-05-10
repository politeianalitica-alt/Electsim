'use client'
import React from 'react'

type NivelAlerta = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO' | 'URGENTE' | 'PRÓXIMO' | 'PROGRAMADO'

export function AlertaBadge({ nivel, children }: { nivel: NivelAlerta; children?: React.ReactNode }) {
  const c: Record<NivelAlerta, string> = {
    'CRÍTICO':    '#DC2626',
    'URGENTE':    '#DC2626',
    'ALTO':       '#F97316',
    'PRÓXIMO':    '#F97316',
    'MEDIO':      '#EAB308',
    'PROGRAMADO': '#EAB308',
    'BAJO':       '#0EA5E9',
  }
  const color = c[nivel] ?? '#6e6e73'
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.08em',
      padding: '2px 7px',
      borderRadius: 4,
      background: color,
      color: '#fff',
    }}>
      {children ?? nivel}
    </span>
  )
}
